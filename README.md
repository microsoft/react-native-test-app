# React Native Test App

![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen)
[![Open in Visual Studio Code](https://img.shields.io/static/v1?logo=visualstudiocode&label=&message=Open%20in%20Visual%20Studio%20Code&color=007acc&labelColor=444444&logoColor=007acc)](https://vscode.dev/github/microsoft/react-native-test-app)
[![build](https://github.com/microsoft/react-native-test-app/actions/workflows/build.yml/badge.svg?event=push)](https://github.com/microsoft/react-native-test-app/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/react-native-test-app)](https://www.npmjs.com/package/react-native-test-app)

> React Native Test App (RNTA) provides test apps for all platforms as a
> package. It handles the native bits for you so you can focus on what's
> important: your product.

- [Quick Start ⚡](#quick-start-)
- [Migrate an Existing Test App 📖](https://github.com/microsoft/react-native-test-app/wiki/Migrate-an-Existing-Test-App)
- [Configuring the Test App 📖](https://github.com/microsoft/react-native-test-app/wiki/Manifest-%28app.json%29)
- [Upgrading the Test App 📖](https://github.com/microsoft/react-native-test-app/wiki/Upgrading)
- [Learn More 🔍](#learn-more-)
- [Libraries Using RNTA 📚](#libraries-using-rnta-)
- [Known Issues ⚠️](#known-issues-️)
- [Contributing 🤝](#contributing-)
- [License 📝](#license-)

## Quick Start ⚡

_If you want to migrate an existing test app for a library, follow the
[dedicated guide in the wiki](https://github.com/microsoft/react-native-test-app/wiki/Migrate-an-Existing-Test-App)._

You can generate a new project using `npx`:

```sh
npx --package react-native-test-app@latest init
```

In this example, we will create a project named "sample" in `sample` with apps
for all platforms:

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
◯   visionOS (Experimental)
◉   Windows
✔ Where should we create the new project? … sample
```

Install npm dependencies inside the new project folder:

**Yarn:**

```sh
cd sample
yarn
```

**npm:**

```sh
cd sample
npm install
```

Once the dependencies are installed, follow the
[platform specific instructions](https://github.com/microsoft/react-native-test-app/wiki/Quick-Start#platform-specific-instructions)
in the wiki.

## Learn More 🔍

- 🗣️ If you want to learn how RNTA is used at Microsoft, check out the following
  talks:
  - ["Improve all the repos – exploring Microsoft’s DevExp"](https://youtu.be/DAEnPV78rQc)
    by [@kelset](https://github.com/kelset) and
    [@tido64](https://github.com/tido64) from React Native Europe 2021.
  - ["Our Journey of Making React Native a Preferred Choice"](https://www.youtube.com/watch?v=PYMMxfttOug)
    by [@kelset](https://github.com/kelset) and
    [@tido64](https://github.com/tido64) from React Native Europe 2023.
- 📖 In the wiki, you can read more about
  [the motivation](https://github.com/microsoft/react-native-test-app/wiki#motivation)
  and
  [the design](https://github.com/microsoft/react-native-test-app/wiki/Design)
  of this tool.

## Libraries Using RNTA 📚

<!-- prettier-ignore -->
[microsoft/fluentui-react-native](https://github.com/microsoft/fluentui-react-native) &bull;
[microsoft/rnx-kit](https://github.com/microsoft/rnx-kit) &bull;
[BabylonReactNative](https://github.com/BabylonJS/BabylonReactNative) &bull;
[callstack/repack](https://github.com/callstack/repack) &bull;
[lottie-react-native](https://github.com/lottie-react-native/lottie-react-native) &bull;
[react-native-add-calendar-event](https://github.com/vonovak/react-native-add-calendar-event) &bull;
[react-native-apple-authentication](https://github.com/invertase/react-native-apple-authentication) &bull;
[react-native-async-storage](https://github.com/react-native-async-storage/async-storage) &bull;
[react-native-blur](https://github.com/Kureev/react-native-blur) &bull;
[react-native-clipboard](https://github.com/react-native-clipboard/clipboard) &bull;
[react-native-datetimepicker](https://github.com/react-native-datetimepicker/datetimepicker) &bull;
[react-native-google-signin](https://github.com/react-native-google-signin/google-signin) &bull;
[react-native-image-editor](https://github.com/callstack/react-native-image-editor) &bull;
[react-native-keychain](https://github.com/oblador/react-native-keychain) &bull;
[react-native-masked-view](https://github.com/react-native-masked-view/masked-view) &bull;
[react-native-menu](https://github.com/react-native-menu/menu) &bull;
[react-native-netinfo](https://github.com/react-native-netinfo/react-native-netinfo) &bull;
[react-native-pager-view](https://github.com/callstack/react-native-pager-view) &bull;
[react-native-segmented-control](https://github.com/react-native-segmented-control/segmented-control) &bull;
[react-native-video](https://github.com/TheWidlarzGroup/react-native-video) &bull;
[react-native-webview](https://github.com/react-native-webview/react-native-webview) &bull;
[realm-js](https://github.com/realm/realm-js) &bull;
[shopify/restyle](https://github.com/Shopify/restyle) &bull;
[sparkfabrik-react-native-idfa-aaid](https://github.com/sparkfabrik/sparkfabrik-react-native-idfa-aaid) &bull;
[react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context) &bull;
[and many more…](https://github.com/microsoft/react-native-test-app/network/dependents)

_Are you using RNTA? Submit a PR to add it to the list!_

## Known Issues ⚠️

For a list of known issues and workarounds, please refer to the
[Troubleshooting wiki](https://github.com/microsoft/react-native-test-app/wiki/Troubleshooting).

## Contributing 🤝

Thank you for your interest in this project! We welcome all contributions and
suggestions!

Take a look at [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License 📝

`react-native-test-app` is [MIT licensed](./LICENSE).
