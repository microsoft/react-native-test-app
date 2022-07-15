The app version shown to users. The required format is three period-separated
integers, such as 1.3.11.

- **Android**: Equivalent to setting
  [`versionName`](https://developer.android.com/studio/publish/versioning#appversioning).
- **iOS**: This is the same as setting
  [`CFBundleShortVersionString`](https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring)
  in `Info.plist`.
- **macOS**: This is the same as setting
  [`CFBundleShortVersionString`](https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring)
  in `Info.plist`.
- **Windows**: Please see [`windows.appxmanifest`](#windows.appxmanifest) for
  how to use a custom
  [app package manifest](https://docs.microsoft.com/en-us/uwp/schemas/appxpackage/appx-package-manifest)
  instead.
