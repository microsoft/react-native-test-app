#!/bin/bash
set -eo pipefail

platform=$1
version=$(node -e 'console.log(require("./package.json").version)')

# Use tarballs to ensure that published packages are consumable
npm pack

yarn
yarn plop --dest template-example TemplateExample $platform

pushd template-example 1> /dev/null

script="s/\"react-native-test-app\": \".*\"/\"react-native-test-app\": \"..\/react-native-test-app-$version.tgz\"/"
if sed --version &> /dev/null; then
  sed -i'' "$script" package.json
else
  sed -i '' "$script" package.json
fi

yarn
