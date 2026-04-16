#!/bin/bash
set -eo pipefail

install=true
version=$(node --print 'require("./package.json").version')
tarball=react-native-test-app-$version.$(git rev-parse --short HEAD).tgz

current_dir="$(pwd)"
script_dir="$(cd -P "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" >/dev/null 2>&1 && pwd)"

function print_usage {
  echo "usage: $(basename "$0") [-u] ..."
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
      break
      ;;
  esac
done

# Use tarballs to ensure that published packages are consumable
pushd "$script_dir/../packages/app" 1> /dev/null
npm pack
mv react-native-test-app-$version.tgz $tarball
popd 1> /dev/null

yarn

v=$(cat packages/app/example/package.json | jq '.dependencies["react-native"]' | grep -o -E '[0-9]+\.[0-9]+')
node packages/app/scripts/init.mjs --destination template-example --name TemplateExample --version $v $@

pushd template-example 1> /dev/null
node "$script_dir/copy-yarnrc.mjs" ../.yarnrc.yml

# Workaround for NuGet publishing failures
cp ../yarn.lock .

script="s/\"react-native-test-app\": \".*\"/\"react-native-test-app\": \"..\/packages\/app\/$tarball\"/"
if sed --version &> /dev/null; then
  sed -i'' "$script" package.json
else
  sed -i '' "$script" package.json
fi

if $install; then
  yarn --no-immutable
fi
