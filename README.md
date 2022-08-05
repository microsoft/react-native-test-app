# React Native Test App

![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen) [![Open in Visual Studio Code](https://img.shields.io/static/v1?logo=visualstudiocode&label=&message=Open%20in%20Visual%20Studio%20Code&color=007acc&labelColor=444444&logoColor=007acc)](https://vscode.dev/github/microsoft/react-native-test-app)
[![build](https://github.com/microsoft/react-native-test-app/actions/workflows/build.yml/badge.svg?event=push)](https://github.com/microsoft/react-native-test-app/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/react-native-test-app)](https://www.npmjs.com/package/react-native-test-app)

- [Quick Start](https://github.com/microsoft/react-native-test-app/wiki/Quick-Start)
- [Configuring the Test App](#configuring-the-test-app)
- [Migrate an Existing Test App](https://github.com/microsoft/react-native-test-app/wiki/Migrate-an-Existing-Test-App)
- [Known Issues](#known-issues)

React Native Test App (RNTA) provides test apps for all platforms as a package. It
handles the native bits for you so you can focus on what's important: your
product.

If you want to learn how RNTA is used at Microsoft, and see a demo of how to add
it to an existing library - you can watch the
["Improve all the repos – exploring Microsoft’s DevExp"](https://youtu.be/DAEnPV78rQc?t=499)
talk by [@kelset](https://github.com/kelset) and [@tido64](https://github.com/tido64) from React Native Europe 2021.

In the wiki, you can read more about
[the motivation](https://github.com/microsoft/react-native-test-app/wiki#motivation)
and [the design](https://github.com/microsoft/react-native-test-app/wiki/Design)
of this tool.

## Quick Start

*If you want to migrate an existing test app for a library, follow the [dedicated guide in the wiki](https://github.com/microsoft/react-native-test-app/wiki/Migrate-an-Existing-Test-App).*

Install `react-native-test-app` as a dev dependency. We will use the wizard to
generate your test app:

```sh
yarn add react-native-test-app --dev
yarn init-test-app
```

In this example, we will create a project named "sample" in `sample` with test
apps for all platforms:

```sh
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

Once the dependencies are installed, follow the [platform specific instructions](https://github.com/microsoft/react-native-test-app/wiki/Quick-Start#platform-specific-instructions) in the wiki.

## Configuring the Test App

All configuration of the test app is done via `app.json` (otherwise known as the
manifest). You can learn more about that
[in the dedicated wiki section](https://github.com/microsoft/react-native-test-app/wiki/Manifest-%28app.json%29).

Additionally, you can find platform specific documentation below:

- [Android](https://github.com/microsoft/react-native-test-app/wiki/Android-Specifics)
- [iOS/macOS](https://github.com/microsoft/react-native-test-app/wiki/iOS-and-macOS-Specifics)
- [Windows](https://github.com/microsoft/react-native-test-app/wiki/Windows-Specifics)

## Known Issues

For a list of known issues and workarounds, please refer to the
[Troubleshooting wiki](https://github.com/microsoft/react-native-test-app/wiki/Troubleshooting).

## Contributing

Thank you for your interest in this project! We welcome all contributions and suggestions!

Take a look at [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

`react-native-test-app` is [MIT licensed](./LICENSE).
