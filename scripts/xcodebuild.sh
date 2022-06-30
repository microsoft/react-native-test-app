#!/bin/bash
set -eo pipefail

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
  ccache_libexec="/usr/local/opt/ccache/libexec"
  if [[ ! -d "$ccache_libexec" ]]; then
    brew install ccache
  fi

  export CC="$(git rev-parse --show-toplevel)/scripts/clang"
  export CCACHE_DIR="$(git rev-parse --show-toplevel)/.ccache"

  ccache --zero-stats 1> /dev/null
fi

eval "$build_cmd"

if [[ "$CCACHE_DISABLE" != "1" ]]; then
  ccache --show-stats --verbose
fi
