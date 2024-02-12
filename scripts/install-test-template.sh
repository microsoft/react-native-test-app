#!/bin/bash
set -eo pipefail

install=true
platforms=(all android ios macos visionos windows)
version=$(node --print 'require("./package.json").version')
tarball=react-native-test-app-$version.$(git rev-parse --short HEAD).tgz

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
npm pack
mv react-native-test-app-$version.tgz $tarball

yarn
if [[ "$platform" == "all" ]]; then
  yarn init-test-app                \
    --destination template-example  \
    --name TemplateExample          \
    --platform android              \
    --platform ios                  \
    --platform macos                \
    --platform visionos             \
    --platform windows
else
  yarn init-test-app                \
    --destination template-example  \
    --name TemplateExample          \
    --platform "$platform"
fi

pushd template-example 1> /dev/null
node ../scripts/copy-yarnrc.mjs ../.yarnrc.yml

# Workaround for NuGet publishing failures
if [[ "$platform" == "all" ]] || [[ "$platform" == "windows" ]]; then
  cp ../yarn.lock .
else
  touch yarn.lock
fi

script="s/\"react-native-test-app\": \".*\"/\"react-native-test-app\": \"..\/$tarball\"/"
if sed --version &> /dev/null; then
  sed -i'' "$script" package.json
else
  sed -i '' "$script" package.json
fi

if $install; then
  yarn --no-immutable
fi
