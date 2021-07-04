#!/bin/bash
set -eo pipefail

install=true
platforms=(all android ios macos windows)
version=$(node -e 'console.log(require("./package.json").version)')

function print_usage {
  echo "usage: $(basename $0) [-u] <$(IFS=\|; echo "${platforms[*]}")>"
}

while true; do
  case "$1" in
    -h|--help)
      print_usage
      exit 0
      ;;
    -u|--no-install)
      install=false
      shift
      ;;
    *)
      if [[ ! " ${platforms[@]} " =~ " $1 " ]]; then
        [[ ! -z "$1" ]] && echo "invalid platform: $1"
        print_usage
        exit 1
      fi
      platform=$1
      break
      ;;
  esac
done

# Use tarballs to ensure that published packages are consumable
npm pack

yarn ci
yarn react-native init-test-app --destination template-example --name TemplateExample --platform $platform
cp .yarnrc-offline template-example/.yarnrc

pushd template-example 1> /dev/null

script="s/\"react-native-test-app\": \".*\"/\"react-native-test-app\": \"..\/react-native-test-app-$version.tgz\"/"
if sed --version &> /dev/null; then
  sed -i'' "$script" package.json
else
  sed -i '' "$script" package.json
fi

if $install; then
  yarn --prefer-offline
fi
