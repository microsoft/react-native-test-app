# React Native Test App

![build](https://github.com/microsoft/react-native-test-app/workflows/build/badge.svg)
[![npm version](https://badgen.net/npm/v/react-native-test-app)](https://www.npmjs.com/package/react-native-test-app)

React Native Test App provides test apps for all platforms as a package. Bring
your own JS bundle, and let us manage the native bits.

This is a work in progress. You can read and discuss the RFC at
[React Native: Discussions and Proposals](https://github.com/react-native-community/discussions-and-proposals/pull/204).

For more details, please refer to the
[wiki](https://github.com/microsoft/react-native-test-app/wiki).

## Dependencies

`react-native-test-app` is published with source code only. You will still need
to compile the test apps yourself.

- **Android**:
  - [Android Studio](https://developer.android.com/studio) 3.6 or later
    - Android SDK Platform 29
    - Android SDK Build-Tools 29.0.3
    - To install the required SDKs, go into **Preferences** ❭ **Appearance &
      Behavior** ❭ **System Settings** ❭ **Android SDK**.
- **iOS/macOS**:
  - [Xcode](https://apps.apple.com/app/xcode/id497799835?mt=12) 11.3 or later
  - [CocoaPods](https://cocoapods.org/)
- **Windows**:
  - Ensure that
    [Developer Mode](https://docs.microsoft.com/en-us/windows/uwp/get-started/enable-your-device-for-development)
    is turned on in Windows Settings app
  - Install development dependencies as described in the
    [React Native for Windows documentation](https://microsoft.github.io/react-native-windows/docs/rnw-dependencies)
  - [Google Chrome](https://www.google.com/chrome/) (optional, but recommended
    for JS debugging)

# Quick Start

Install `react-native-test-app` as a dev dependency. We will use the wizard to
generate your test app:

```bash
yarn add react-native-test-app --dev
yarn init-test-app
```

In this example, we will create a project named "sample" in `sample` with test
apps for all platforms:

```console
✔ What is the name of your test app? … sample
? Which platforms do you need test apps for? ›
Instructions:
    ↑/↓: Highlight option
    ←/→/[space]: Toggle selection
    a: Toggle all
    enter/return: Complete answer
◉   Android
◉   iOS
◉   macOS
◉   Windows
✔ Where should we create the new project?? … sample
```

Run `yarn` inside the new project folder:

```bash
cd sample
yarn
```

Once the dependencies are installed, follow the platform specific instructions
below.

## Android

```bash
# Bundle the JS first so Gradle can find
# the assets.
yarn build:android
yarn android

# Instead of `yarn android`, you can
# also build and run `sample/android` in
# Android Studio.

# On macOS, you can open the project from
# the terminal:
open -a "Android Studio" android
```

## iOS

```bash
# Bundle the JS first so CocoaPods can
# find the assets.
yarn build:ios
pod install --project-directory=ios
yarn ios

# Instead of `yarn ios`, you can also
# build and run in Xcode.
open ios/Sample.xcworkspace
```

## macOS

```bash
# Bundle the JS first so CocoaPods can
# find the assets.
yarn build:macos
pod install --project-directory=macos
yarn macos

# Instead of `yarn macos`, you can also
# build and run in Xcode.
open macos/Sample.xcworkspace
```

## Windows

```bash
# Bundle the JS first so the assets can
# be included in the project.
yarn build:windows
yarn install-windows-test-app --use-nuget
yarn windows

# Instead of `yarn windows`, you can
# also build and run 'windows/Sample.sln'
# in Visual Studio.

# To run test app on your local machine,
# remember to set platform to x64 (it is
# set to ARM by default)
```

# Developing React Native Test App

Additional dependencies:

- [Node](https://nodejs.org/) 12 LTS
- [Yarn](https://classic.yarnpkg.com/docs/install)
- **macOS:** [Homebrew](https://brew.sh/)

We'll be using the Example app for all development of the React Native Test App.
Some platforms may require extra steps for the initial set up. Please follow the
steps below, then jump to the appropriate section(s) for the final steps.

Open a terminal and navigate to your clone of this repository:

```bash
cd react-native-test-app

# This step only needs to be done once,
# before we can install the Example app's
# dependencies. It is stored in
# `~/.config/yarn/link/react-native-test-app`.
# You can run `unlink` if you need to
# remove it later.
yarn link

# Install Example app's dependencies.
cd example
yarn

# Now we use the link we created earlier.
# This step needs to be run _after_
# `yarn` otherwise it will be
# overwritten.
yarn link "react-native-test-app"
```

## Android

```bash
# Bundle the JS first so Gradle can find
# the assets.
yarn build:android

# Finally, open the `android` folder in
# Android Studio.

# On macOS, you can open the project from
# the terminal:
open -a "Android Studio" android
```

## iOS

```bash
# Bundle the JS first so CocoaPods can
# find the assets.
yarn build:ios
pod install --project-directory=ios

# Finally, open the Xcode workspace.
open ios/Example.xcworkspace
```

## macOS

```bash
# Bundle the JS first so CocoaPods can
# find the assets.
yarn build:macos
pod install --project-directory=macos

# Finally, open the Xcode workspace.
open macos/Example.xcworkspace
```

## Windows

```bash
# Bundle the JS first so the assets can
# be included in the project.
yarn build:windows
yarn install-windows-test-app --use-nuget

# Finally, open 'Example.sln' in Visual
# Studio.

# To run test app on your local machine,
# remember to set platform to x64 (it is
# set to ARM by default)
```

# Known Issues

For a list of known issues and workarounds, please go to the
[Troubleshooting](https://github.com/microsoft/react-native-test-app/wiki/Troubleshooting)
page in the wiki.
