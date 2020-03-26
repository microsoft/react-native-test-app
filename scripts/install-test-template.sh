#!/bin/bash
set -eo pipefail

platform=$1

yarn
yarn plop --dest template-example TemplateExample $platform
rm -rf node_modules

pushd template-example 1> /dev/null
if [[ $(uname) == Darwin ]]; then
  sed -e 's/"\(react-native-test-app\)": "[0-9][.0-9]*"/"\1": "..\/"/' -i '' package.json
else
  sed -e 's/"\(react-native-test-app\)": "[0-9][.0-9]*"/"\1": "..\/"/' -i package.json
fi
yarn
