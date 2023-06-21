#!/bin/bash
set -eo pipefail

export GIT_IGNORE_FILE=".gitignore"

PACKAGE_MANAGER=yarn
VERSION=${1}

scripts_dir=$(cd -P "$(dirname "$0")" && pwd)

function build_and_run {
  ${PACKAGE_MANAGER} $1 --no-packager
}

function pod_install {
  rm -fr $1/Podfile.lock $1/Pods $1/build
  pod install --project-directory=$1
}

function prepare {
  terminate_dev_server
  git checkout .
  npm run set-react-version ${VERSION}
  npm run clean -- --exclude='example/*.png'
  ${PACKAGE_MANAGER} install
  pushd example 1> /dev/null
  start_appium_server
  start_dev_server
}

function run_tests {
  "$scripts_dir/test-e2e.sh" $@
}

function start_appium_server {
  run_tests prepare
  if ! nc -z 127.0.0.1 4723; then
    echo "*** Please start Appium server in a separate terminal"
    echo
    echo "	cd example"
    echo "	${PACKAGE_MANAGER} appium"
    wait_for_user
  fi
}

function start_dev_server {
  echo "*** Starting Metro dev server in the background (logs go to '$(pwd)/metro.server.log')"
  ${PACKAGE_MANAGER} start &> metro.server.log &
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

build_and_run android
run_tests android hermes

echo
echo "┌─────────────┐"
echo "│  Build iOS  │"
echo "└─────────────┘"
echo

pod_install ios
build_and_run ios
run_tests ios

echo
echo "┌─────────────────────────┐"
echo "│  Build iOS with Hermes  │"
echo "└─────────────────────────┘"
echo

sed -i '' 's/:hermes_enabled => false/:hermes_enabled => true/' ios/Podfile
pod_install ios
build_and_run ios
run_tests ios hermes

echo
echo "┌──────────────────────────────┐"
echo "│  Clean up for Fabric builds  │"
echo "└──────────────────────────────┘"
echo

popd 1> /dev/null
prepare
# `react-native-safe-area-context` doesn't support latest New Arch changes
git apply ../scripts/disable-safe-area-context.patch
sed -i '' 's/"react-native-safe-area-context": ".[.0-9]*",//' package.json

echo
echo "┌─────────────────────────────┐"
echo "│  Build Android with Fabric  │"
echo "└─────────────────────────────┘"
echo

sed -i '' 's/#newArchEnabled=true/newArchEnabled=true/' android/gradle.properties
pushd android 1> /dev/null
popd 1> /dev/null
build_and_run android
run_tests android hermes fabric

echo
echo "┌─────────────────────────┐"
echo "│  Build iOS with Fabric  │"
echo "└─────────────────────────┘"
echo

sed -i '' 's/:turbomodule_enabled => false/:turbomodule_enabled => true/' ios/Podfile
pod_install ios
build_and_run ios
run_tests ios fabric

echo
echo "┌──────────────────────────────────┐"
echo "│  Build iOS with Fabric + Hermes  │"
echo "└──────────────────────────────────┘"
echo

sed -i '' 's/:hermes_enabled => false/:hermes_enabled => true/' ios/Podfile
pod_install ios
build_and_run ios
run_tests ios hermes fabric

popd 1> /dev/null

echo
echo "┌─────────────────────┐"
echo "│  Initialize new app │"
echo "└─────────────────────┘"
echo

${PACKAGE_MANAGER} react-native init-test-app \
  --destination template-example \
  --name TemplateExample \
  --platform android,ios
