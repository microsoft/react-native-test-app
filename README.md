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
- **iOS**:
  - [Xcode](https://apps.apple.com/app/xcode/id497799835?mt=12) 11.3 or later
  - [CocoaPods](https://cocoapods.org/)

# Quick Start

Install `react-native-test-app` and `plop`. We will use
[Plop](https://plopjs.com/) to generate the test app:

```bash
yarn add plop react-native-test-app --dev
yarn plop --plopfile node_modules/react-native-test-app/plopfile.js --dest sample
```

`--dest` tells Plop where to generate the files. In this example, it will
generate files under `sample` folder. Choose the appropriate place to store your
test app, then answer a couple of questions:

```console
? What is the name of your test app? Sample
? Which platforms do you need test apps for? all
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

# Finally, open `sample/android` in
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
pod install

# Finally, open the Xcode workspace.
open Sample.xcworkspace
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

# Known Issues

## Invalid `Podfile` file: undefined method `[]' for nil:NilClass

This can occur if your package is iOS specific, i.e. it contains no `ios` folder
with an Xcode project. `react-native config` cannot detect your package if this
is missing. We can work around it by adding `react-native.config.js` at the root
of the package:

```js
module.exports = {
  project: {
    ios: {
      project: "ReactTestApp-Dummy.xcodeproj",
    },
  },
};
```

# Contributing

This project welcomes contributions and suggestions. Most contributions require
you to agree to a Contributor License Agreement (CLA) declaring that you have
the right to, and actually do, grant us the rights to use your contribution. For
details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g., status check,
comment). Simply follow the instructions provided by the bot. You will only need
to do this once across all repositories using our CLA.

This project has adopted the
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the
[Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any
additional questions or comments.
