#!/bin/bash
set -eo pipefail

PACKAGE_MANAGER=yarn
VERSION=${1}

function pod_install {
  rm -fr $1/Podfile.lock $1/Pods
  pod install --project-directory=$1
}

function prepare {
  terminate_dev_server
  git checkout .
  npm run set-react-version ${VERSION}
  npm run clean
  ${PACKAGE_MANAGER} install
  pushd example 1> /dev/null
  start_dev_server
}

function start_dev_server {
  echo "*** Starting Metro dev server in the background (logs go to '$(pwd)/metro.server.log')"
  yarn start &> metro.server.log &
}

function terminate_dev_server {
  [[ -z "$(jobs -p)" ]] || kill $(jobs -p)
}

function wait_for_user {
  echo
  if [[ -n "$1" ]]; then
    echo "*** $1 ***"
    echo
  fi
  read -n 1 -r -s -p "Press any key to continue..."
  echo
}

trap terminate_dev_server EXIT

if command -v ccache 1> /dev/null; then
  export USE_CCACHE=1
  export ANDROID_CCACHE=$(which ccache)
  export CCACHE_DIR=$HOME/.cache/ccache
  export PATH=$(dirname $(dirname $ANDROID_CCACHE))/opt/ccache/libexec:$PATH
  mkdir -p $CCACHE_DIR
fi

pushd $(git rev-parse --show-toplevel) 1> /dev/null
prepare

echo
echo "┌─────────────────┐"
echo "│  Build Android  │"
echo "└─────────────────┘"
echo

npm run android --no-packager
wait_for_user "Android app is ready for testing"

echo
echo "┌─────────────┐"
echo "│  Build iOS  │"
echo "└─────────────┘"
echo

pod_install ios
npm run ios --no-packager
wait_for_user "iOS app is ready for testing"

echo
echo "┌─────────────────────────┐"
echo "│  Build iOS with Hermes  │"
echo "└─────────────────────────┘"
echo

sed -i '' 's/:hermes_enabled => false/:hermes_enabled => true/' ios/Podfile
pod_install ios
npm run ios --no-packager
wait_for_user "iOS app with Hermes is ready for testing"

echo
echo "┌──────────────────────────────┐"
echo "│  Clean up for Fabric builds  │"
echo "└──────────────────────────────┘"
echo

popd 1> /dev/null
prepare

echo
echo "┌─────────────────────────────┐"
echo "│  Build Android with Fabric  │"
echo "└─────────────────────────────┘"
echo

sed -i '' 's/#newArchEnabled=true/newArchEnabled=true/' android/gradle.properties
pushd android 1> /dev/null
# Due to a bug in Gradle, we need to run this task separately
./gradlew packageReactNdkDebugLibs
popd 1> /dev/null
npm run android --no-packager
wait_for_user "Android app with Fabric is ready for testing"

echo
echo "┌─────────────────────────┐"
echo "│  Build iOS with Fabric  │"
echo "└─────────────────────────┘"
echo

sed -i '' 's/:turbomodule_enabled => false/:turbomodule_enabled => true/' ios/Podfile
pod_install ios
npm run ios --no-packager
wait_for_user "iOS app with Fabric is ready for testing"

echo
echo "┌──────────────────────────────────┐"
echo "│  Build iOS with Fabric + Hermes  │"
echo "└──────────────────────────────────┘"
echo

sed -i '' 's/:hermes_enabled => false/:hermes_enabled => true/' ios/Podfile
pod_install ios
npm run ios --no-packager
wait_for_user "iOS app with Fabric + Hermes is ready for testing"

popd 1> /dev/null
