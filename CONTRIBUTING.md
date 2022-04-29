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

## Commit messages

This repository adheres to the
[conventional commit format](https://conventionalcommits.org) via
[commitlint](https://github.com/conventional-changelog/commitlint/#what-is-commitlint).
Commit messages must match the pattern:

```sh
type(scope?): subject  #scope is optional; multiple scopes are supported (current delimiter options: "/", "\" and ",")
```

Following this is necessary to pass CI.

## Additional Dependencies

- Node LTS (see [releases](https://nodejs.org/en/about/releases/) for specific
  versions)
- [Yarn Classic](https://classic.yarnpkg.com/)
- **macOS:** [Homebrew](https://brew.sh/)

## Building the Example App

We use the Example app for most (if not all) development of
`react-native-test-app`. Some platforms may require extra steps for the initial
set up. Please follow the steps below, then jump to the appropriate section(s)
for the final steps.

Open a terminal and navigate to your clone of this repository:

```sh
cd react-native-test-app
```

The first thing we have to do is to install the npm dependencies:

```sh
yarn
```

Once Yarn is done installing dependencies, we need to navigate to the `example`
folder:

```sh
cd example
```

Now we should be ready to start the app. Jump to the appropriate section below
for further instructions.

### Android

To start the Android app, run:

```sh
yarn android
```

Alternatively, you can also run the app within Android Studio by pointing it to
the `android` folder.

### iOS

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
open ios/Example.xcworkspace
```

> **Note:** If you made changes to `app.json` or any other assets, you should
> re-run `pod install` to make sure that the changes are included in the Xcode
> project.

### macOS

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
open macos/Example.xcworkspace
```

> **Note:** If you made changes to `app.json` or any other assets, you should
> re-run `pod install` to make sure that the changes are included in the Xcode
> project.

### Windows

Before you can run the Windows app, you must first generate it:

```sh
npx install-windows-test-app --use-nuget
```

To start the Windows app, run:

```sh
yarn windows
```

Alternatively, you can also run the app within Visual Studio by opening the
solution file:

```
start windows/Example.sln
```

If you choose to use Visual Studio, remember to first set the target platform to
`x64`. It is set to `ARM` by default.

> **Note:** If you made changes to `app.json` or any other assets, you should
> re-run `install-windows-test-app` to make sure that the changes are included
> in the Visual Studio project.

### Testing Other React Native Versions

`react-native-test-app` supports multiple versions of React Native. Use
`set-react-version` to set the version, e.g. to use 0.64:

```sh
yarn set-react-version 0.64
```

This will modify both `package.json` and `example/package.json` to use packages
that are compatible with specified React Native version.

To avoid issues, remember to clear out `node_modules` folders before you run
`yarn`:

```sh
yarn clean
yarn
```
