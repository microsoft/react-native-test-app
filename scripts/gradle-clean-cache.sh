#!/bin/sh
GRADLE_USER_HOME=${GRADLE_USER_HOME:-~/.gradle}

if [[ ! $CI ]]; then
  echo "This script is only meant to be used on CI"
  exit 0
fi

./gradlew clean cleanBuildCache
./gradlew --quiet --stop
npx --quiet rimraf $GRADLE_USER_HOME/caches/transforms*/
npx --quiet rimraf $GRADLE_USER_HOME/wrapper/dists/gradle-*-all/*/gradle-*/
du -hs $GRADLE_USER_HOME/caches $GRADLE_USER_HOME/wrapper
