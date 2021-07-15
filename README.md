# React Native Test App

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/microsoft/react-native-test-app)
![build](https://github.com/microsoft/react-native-test-app/workflows/build/badge.svg)
[![npm version](https://img.shields.io/npm/v/react-native-test-app)](https://www.npmjs.com/package/react-native-test-app)

React Native Test App provides test apps for all platforms as a package. It
handles the native bits for you so you can focus on what's important: Your
product.

## Motivation

Many of us have been there. We create a new React Native project with
`react-native init`, write a few test screens for our library, and everything is
seemingly fine and dandy. Until some time later, when a new version of React
Native gets published. "Awesome!", you think, but when you try to upgrade to the
latest version, something doesn't work. You need to look at
[React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/)
and comb through all the files that need to be changed. Eventually, you get it
working and everything is fine again. Then a new version of Xcode or iOS comes
out, or a new version of Gradle is required, and things stop working again. If
you're lucky, you get to do this N number of times for all the projects you
maintain.

`react-native-test-app` aims to take away a lot of these pains.

- We want to make it easy to get started. `react-native-test-app` should provide
  everything needed to get a cross-platform project set up and running in no
  time.
- We want to make it easy to upgrade and downgrade React Native without having
  to deal with project files for every supported platform. Just change the
  version numbers in `package.json`, and reinstall the dependencies.
  - So you can quickly switch between versions of React Native to test
    compatibility or reproduce difficult bugs.
  - So your next React Native upgrade is a lot more painless. Especially if you
    have to repeat the same process in a lot of projects.
- We want to make it easy to add support for and maintain additional platforms,
  such as macOS or Windows, without requiring the domain knowledge to do so.
- We want to give you a consistent developer experience across all the projects
  you maintain.

You can find the full design document in
[the wiki](https://github.com/microsoft/react-native-test-app/wiki/Design).

## Dependencies

`react-native-test-app` is published with source code only. You will still need
to compile the test apps yourself.

- **Android**:
  - [Android Studio](https://developer.android.com/studio) 4.2 or later
    - Android SDK Platform 29
    - Android SDK Build-Tools 30.0.3
    - To install the required SDKs, go into **Preferences** ❭ **Appearance &
      Behavior** ❭ **System Settings** ❭ **Android SDK**.
- **iOS/macOS**:
  - [Xcode](https://apps.apple.com/app/xcode/id497799835?mt=12) 12 or later
  - [CocoaPods](https://cocoapods.org/)
- **Windows**:
  - Ensure that
    [Developer Mode](https://docs.microsoft.com/en-us/windows/uwp/get-started/enable-your-device-for-development)
    is turned on in Windows Settings app
  - Install development dependencies as described in the
    [React Native for Windows documentation](https://microsoft.github.io/react-native-windows/docs/rnw-dependencies)
  - [Google Chrome](https://www.google.com/chrome/) (optional, but recommended
    for JS debugging)

## Quick Start

Install `react-native-test-app` as a dev dependency. We will use the wizard to
generate your test app:

```sh
yarn add react-native-test-app --dev
yarn init-test-app
```

In this example, we will create a project named "sample" in `sample` with test
apps for all platforms:

```
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

```sh
cd sample
yarn
```

Once the dependencies are installed, follow the platform specific instructions
below.

### Android

Bundle the JS code and assets by running:

```sh
yarn build:android
```

If you're going to use the development server, you can skip this step.

To start the Android app, run:

```sh
yarn android
```

Alternatively, you can also run the app within Android Studio by pointing it to
the `android` folder.

### iOS

Bundle the JS code and assets by running:

```sh
yarn build:ios
```

If you're going to use the development server, you can skip this step.

Before you can run the iOS app, you must first install its native dependencies:

```sh
pod install --project-directory=ios
```

This command is also responsible for generating the Xcode project. To start the
iOS app, run:

```sh
yarn ios
```

Alternatively, you can also run the app within Xcode by opening the Xcode
workspace:

```sh
open ios/Sample.xcworkspace
```

> **Note:** If you made changes to `app.json` or any other assets, you should
> re-run `pod install` to make sure that the changes are included in the Xcode
> project.

### macOS

Bundle the JS code and assets by running:

```sh
yarn build:ios
```

If you're going to use the development server, you can skip this step.

Before you can run the macOS app, you must first install its native
dependencies:

```sh
pod install --project-directory=macos
```

This command is also responsible for generating the Xcode project. To start the
macOS app, run:

```sh
yarn macos
```

Alternatively, you can also run the app within Xcode by opening the Xcode
workspace:

```sh
open macos/Sample.xcworkspace
```

> **Note:** If you made changes to `app.json` or any other assets, you should
> re-run `pod install` to make sure that the changes are included in the Xcode
> project.

### Windows

Bundle the JS code and assets by running:

```sh
yarn build:ios
```

Before you can run the Windows app, you must first generate it:

```sh
yarn install-windows-test-app --use-nuget
```

To start the Windows app, run:

```sh
yarn windows
```

Alternatively, you can also run the app within Visual Studio by opening the
solution file:

```
start windows/Sample.sln
```

If you choose to use Visual Studio, remember to first set the target platform to
`x64`. It is set to `ARM` by default.

> **Note:** If you made changes to `app.json` or any other assets, you should
> re-run `install-windows-test-app` to make sure that the changes are included
> in the Visual Studio project.

## Configuring the Test App

All configuration of the test app is done via `app.json` (otherwise known as the
manifest). You can learn more about that in
[the wiki](https://github.com/microsoft/react-native-test-app/wiki/Manifest-%28app.json%29).

Additionally, you can find platform specific documentation below:

- [Android](https://github.com/microsoft/react-native-test-app/wiki/Android-Specifics)
- [iOS/macOS](https://github.com/microsoft/react-native-test-app/wiki/iOS-and-macOS-Specifics)
- [Windows](https://github.com/microsoft/react-native-test-app/wiki/Windows-Specifics)

## Known Issues

For a list of known issues and workarounds, please go to the
[Troubleshooting](https://github.com/microsoft/react-native-test-app/wiki/Troubleshooting)
page in the wiki.
