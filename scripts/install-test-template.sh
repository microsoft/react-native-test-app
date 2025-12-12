#!/bin/bash
set -eo pipefail

install=true
platforms=(all android ios macos visionos windows)
version=$(node --print 'require("./package.json").version')
tarball=react-native-test-app-$version.$(git rev-parse --short HEAD).tgz

current_dir="$(pwd)"
script_dir="$(cd -P "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" >/dev/null 2>&1 && pwd)"

function print_usage {
  echo "usage: $(basename "$0") [-u] <$(IFS=\|; echo "${platforms[*]}")>"
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
      if [[ ! " ${platforms[*]} " =~ " $1 " ]]; then
        [[ -n "$1" ]] && echo "invalid platform: $1"
        print_usage
        exit 1
      fi
      platform=$1
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
if [[ "$platform" == "all" ]]; then
  node packages/app/scripts/init.mjs \
    --destination template-example   \
    --name TemplateExample           \
    --platform android               \
    --platform ios                   \
    --platform macos                 \
    --platform visionos              \
    --platform windows               \
    --version $v
else
  node packages/app/scripts/init.mjs \
    --destination template-example   \
    --name TemplateExample           \
    --platform "$platform"           \
    --version $v
fi

pushd template-example 1> /dev/null
node "$script_dir/copy-yarnrc.mjs" ../.yarnrc.yml

# Workaround for NuGet publishing failures
if [[ "$platform" == "all" ]] || [[ "$platform" == "windows" ]]; then
  cp ../yarn.lock .
else
  touch yarn.lock
fi

script="s/\"react-native-test-app\": \".*\"/\"react-native-test-app\": \"..\/packages\/app\/$tarball\"/"
if sed --version &> /dev/null; then
  sed -i'' "$script" package.json
else
  sed -i '' "$script" package.json
fi

if $install; then
  yarn --no-immutable
fi
