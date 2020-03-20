#!/bin/bash
set -eo pipefail

platform=${1:-All}
yarn plop --dest template-example TemplateExample $platform
pushd template-example 1> /dev/null
sed -e 's/"\(react-native-test-app\)": "[0-9][.0-9]*"/"\1": "..\/"/' -i '' package.json
yarn
