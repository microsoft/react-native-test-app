# React Native Test App

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/microsoft/react-native-test-app)
[![build](https://github.com/microsoft/react-native-test-app/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/react-native-test-app/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/react-native-test-app)](https://www.npmjs.com/package/react-native-test-app)

- [Quick Start](#quick-start)
- [Configuring the Test App](#configuring-the-test-app)
- [Known Issues](#known-issues)

React Native Test App provides test apps for all platforms as a package. It
handles the native bits for you so you can focus on what's important: your
product.

If you want to learn how RNTA is used at Microsoft, and see a demo of how to add
it to an existing library - you can watch the
["Improve all the repos – exploring Microsoft’s DevExp"](https://youtu.be/DAEnPV78rQc?t=499)
talk by @kelset and @tido64 from React Native Europe 2021.

For more about
[the motivation](https://github.com/microsoft/react-native-test-app/wiki#motivation)
and [the design](https://github.com/microsoft/react-native-test-app/wiki/Design)
of this tool, you can refer to the wiki.

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
