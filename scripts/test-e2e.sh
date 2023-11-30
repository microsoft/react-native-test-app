#!/bin/bash
set -eo

appium="$(pwd)/node_modules/.bin/appium"
rncli="$(pwd)/node_modules/.bin/react-native"

function check_appium_server {
  if ! nc -z 127.0.0.1 4723; then
    echo Could not find Appium server
    exit 1
  fi
}

function install_appium_driver {
  if [[ $($appium driver list --installed 2>&1) != *"$1"* ]]; then
    $appium driver install "$1"
  else
    $appium driver update "$1"
  fi
}

case $1 in
  'android')
    check_appium_server

    # Note: Ubuntu agents can't run Android emulators. See
    # https://github.com/actions/runner-images/issues/6253#issuecomment-1255952240
    android_image='system-images;android-30;google_atd;x86_64'
    adb="$ANDROID_HOME/platform-tools/adb"
    avdmanager="$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager"
    emulator="$ANDROID_HOME/emulator/emulator"
    sdkmanager="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

    if [[ -n $CI ]]; then
      # Accept all licenses so we can download an Android image
      yes 2> /dev/null | $sdkmanager --licenses
      $sdkmanager --install "$android_image"

      # Create an Android emulator and boot it up
      echo "no" | $avdmanager create avd --package "$android_image" --name Android_E2E
      $emulator @Android_E2E -delay-adb -partition-size 4096 -no-snapshot -no-audio -no-boot-anim -no-window -gpu swiftshader_indirect &
    fi

    # Wait for the emulator to boot up before we install the app
    $adb wait-for-device
    $adb install android/app/build/outputs/apk/debug/app-debug.apk
    ;;
  'ios')
    check_appium_server
    ;;
  'prepare')
    install_appium_driver uiautomator2
    install_appium_driver xcuitest
    exit 0
    ;;
  *)
    echo Unknown platform
    exit 1
esac

TEST_ARGS=$@ node --test $(git ls-files '*.spec.mjs')
