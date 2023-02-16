#!/bin/bash
set -eo pipefail

GIT_IGNORE_FILE=".gitignore"
PACKAGE_MANAGER=yarn
VERSION=${1}

function pod_install {
  rm -fr $1/Podfile.lock $1/Pods $1/build
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
  [[ -z "$(jobs -p)" ]] || kill $(jobs -p) || true
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
  export CMAKE_C_COMPILER_LAUNCHER=$ANDROID_CCACHE
  export CMAKE_CXX_COMPILER_LAUNCHER=$ANDROID_CCACHE
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

yarn android --no-packager
wait_for_user "Android app is ready for testing"

echo
echo "┌─────────────┐"
echo "│  Build iOS  │"
echo "└─────────────┘"
echo

pod_install ios
yarn ios --no-packager
wait_for_user "iOS app is ready for testing"

echo
echo "┌─────────────────────────┐"
echo "│  Build iOS with Hermes  │"
echo "└─────────────────────────┘"
echo

sed -i '' 's/:hermes_enabled => false/:hermes_enabled => true/' ios/Podfile
pod_install ios
yarn ios --no-packager
wait_for_user "iOS app with Hermes is ready for testing"

echo
echo "┌──────────────────────────────┐"
echo "│  Clean up for Fabric builds  │"
echo "└──────────────────────────────┘"
echo

popd 1> /dev/null
prepare
# `react-native-safe-area-context` doesn't support latest New Arch changes
sed -i '' 's/"react-native-safe-area-context": ".[.0-9]*",//' package.json

echo
echo "┌─────────────────────────────┐"
echo "│  Build Android with Fabric  │"
echo "└─────────────────────────────┘"
echo

sed -i '' 's/#newArchEnabled=true/newArchEnabled=true/' android/gradle.properties
pushd android 1> /dev/null
popd 1> /dev/null
yarn android --no-packager
wait_for_user "Android app with Fabric is ready for testing"

echo
echo "┌─────────────────────────┐"
echo "│  Build iOS with Fabric  │"
echo "└─────────────────────────┘"
echo

sed -i '' 's/:turbomodule_enabled => false/:turbomodule_enabled => true/' ios/Podfile
pod_install ios
yarn ios --no-packager
wait_for_user "iOS app with Fabric is ready for testing"

echo
echo "┌──────────────────────────────────┐"
echo "│  Build iOS with Fabric + Hermes  │"
echo "└──────────────────────────────────┘"
echo

sed -i '' 's/:hermes_enabled => false/:hermes_enabled => true/' ios/Podfile
pod_install ios
yarn ios --no-packager
wait_for_user "iOS app with Fabric + Hermes is ready for testing"

popd 1> /dev/null

echo
echo "┌─────────────────────┐"
echo "│  Initialize new app │"
echo "└─────────────────────┘"
echo

yarn react-native init-test-app --destination template-example --name TemplateExample --platform android,ios
