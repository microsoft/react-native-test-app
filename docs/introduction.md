We use `app.json` to configure what gets bundled with the app and declare all
the entry points on the home screen. The manifest must be bundled together with
all your JS assets. It is usually found in `res/raw/` in the APK, and in
`assets/` in the `.app` bundle.

Example `app.json` file:

```json
{
  "name": "Example",
  "displayName": "Example",
  "bundleRoot": "main",
  "components": [
    {
      "appKey": "Example",
      "displayName": "App"
    }
  ],
  "resources": {
    "android": [
      "dist/res",
      "dist/main.android.jsbundle"
    ],
    "ios": [
      "dist/assets",
      "dist/main.ios.jsbundle"
    ],
    "macos": [
      "dist/assets",
      "dist/main.macos.jsbundle"
    ],
    "windows": [
      "dist/assets",
      "dist/main.windows.bundle"
    ]
  },
  "android": {
    "package": "com.react.reacttestapp"
  },
  "ios": {
    "bundleIdentifier": "com.react.ReactTestApp"
  },
  "macos": {
    "bundleIdentifier": "com.react.ReactTestApp"
  },
  "windows": {
    "appxManifest": "windows/Package.appxmanifest"
  }
}
```
