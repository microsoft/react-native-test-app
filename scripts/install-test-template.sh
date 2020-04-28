#!/bin/bash
set -eo pipefail

platform=$1
version=$(node -e 'console.log(require("./package.json").version)')

# Use tarballs to ensure that published packages are consumable
npm pack

yarn
yarn plop --dest template-example TemplateExample $platform

pushd template-example 1> /dev/null
yarn add ../react-native-test-app-$version.tgz --dev
yarn
