#!/bin/bash
set -eo pipefail

workspace=$1
action=$2
shift 2

platform=$(grep -o '\w\+/ReactTestApp.xcodeproj' "$workspace/contents.xcworkspacedata")

if [[ $platform == ios/* ]]; then
  device_name=${1:-'iPhone 11'}
  device=$(xcrun simctl list devices "${device_name}" available | grep "${device_name} (")
  re='\(([-0-9A-Fa-f]+)\)'
  [[ $device =~ $re ]] || exit 1
  shift || true

  destination="-destination \"platform=iOS Simulator,id=${BASH_REMATCH[1]}\""
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
    "$skip_testing" \
    CODE_SIGNING_ALLOWED=NO \
    COMPILER_INDEX_STORE_ENABLE=NO \
    "$action" \
    "$@" \

)

eval "$build_cmd"
