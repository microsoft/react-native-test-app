#!/bin/bash
set -eo pipefail

yarn
yarn plop --dest template-example TemplateExample ${1:-All}
rm -rf node_modules

pushd template-example 1> /dev/null
sed -e 's/"\(react-native-test-app\)": "[0-9][.0-9]*"/"\1": "..\/"/' -i '' package.json
yarn
