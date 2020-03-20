#!/bin/bash
set -eo pipefail

workspace=$1
action=${2:-build-for-testing}
device_name=${3:-'iPhone 11'}

device=$(instruments -s devices 2> /dev/null | grep "${device_name} (")
re='\(([0-9]+[.0-9]*)\)'
[[ $device =~ $re ]] || exit 1

xcodebuild \
  -workspace $workspace \
  -scheme ReactTestApp \
  -destination "platform=iOS Simulator,name=${device_name},OS=${BASH_REMATCH[1]}" \
  -skip-testing:ReactTestAppTests/ReactNativePerformanceTests \
  CODE_SIGNING_ALLOWED=NO \
  COMPILER_INDEX_STORE_ENABLE=NO \
  $action \
  | xcpretty
