#!/bin/bash
name=${1:-'iPhone 11'}
device=$(instruments -s devices 2> /dev/null | grep "${name} (")
re='\(([0-9]+[.0-9]*)\)'
[[ $device =~ $re ]] && echo "platform=iOS Simulator,name=${name},OS=${BASH_REMATCH[1]}"
