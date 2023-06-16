#!/bin/bash
set -eox pipefail

workspace=$1
action=$2
shift 2

platform=$(grep -o '\w\+/ReactTestApp.xcodeproj' "$workspace/contents.xcworkspacedata")

if [[ $platform == ios/* ]]; then
  if [[ $action == 'test' || $action == 'test-without-building' ]]; then
    device_name=${1:-'iPhone 13'}
    device=$(xcrun simctl list devices "${device_name}" available | grep "${device_name} (")
    re='\(([-0-9A-Fa-f]+)\)'
    [[ $device =~ $re ]] || exit 1
    shift || true
    destination="-destination \"platform=iOS Simulator,id=${BASH_REMATCH[1]}\""
  else
    destination='-destination "generic/platform=iOS Simulator"'
  fi

  skip_testing='-skip-testing:ReactTestAppTests/ReactNativePerformanceTests'
elif [[ $platform == macos/* ]]; then
  destination=''
  skip_testing=''
else
  echo "Cannot detect platform: $workspace"
  exit 1
fi

build_cmd=$(
  echo xcodebuild \
    -workspace "$workspace" \
    -scheme ReactTestApp \
    "$destination" \
    -derivedDataPath $(dirname $workspace)/build \
    "$skip_testing" \
    CODE_SIGNING_ALLOWED=NO \
    COMPILER_INDEX_STORE_ENABLE=NO \
    "$action" \
    "$@" \

)

if [[ "$CCACHE_DISABLE" != "1" ]]; then
  if ! command -v ccache 1> /dev/null; then
    brew install ccache
  fi

  CCACHE_HOME=$(dirname $(dirname $(which ccache)))/opt/ccache

  export CCACHE_DIR="$(git rev-parse --show-toplevel)/.ccache"

  export CC="${CCACHE_HOME}/libexec/clang"
  export CXX="${CCACHE_HOME}/libexec/clang++"
  export CMAKE_C_COMPILER_LAUNCHER=$(which ccache)
  export CMAKE_CXX_COMPILER_LAUNCHER=$(which ccache)

  ccache --zero-stats 1> /dev/null
fi

eval "$build_cmd"

if [[ "$CCACHE_DISABLE" != "1" ]]; then
  ccache --show-stats --verbose
fi
