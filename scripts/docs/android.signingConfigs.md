Use this to set the
<a href='https://developer.android.com/studio/publish/app-signing'>signing
configurations</a> for the app.

The JSON schema follows the Gradle DSL very closely. Below is what one would add
for the debug and release flavors:

```javascript
{
  "android": {
    "signingConfigs": {
      "debug": {                          // optional
        "keyAlias": "androiddebugkey",    // defaults to "androiddebugkey"
        "keyPassword": "android",         // defaults to "android
        "storeFile": "debug.keystore",    // required
        "storePassword": "android"        // defaults to "android
      },
      "release": {                        // optional
        "keyAlias": "androiddebugkey",    // defaults to "androiddebugkey"
        "keyPassword": "android",         // defaults to "android
        "storeFile": "release.keystore",  // required
        "storePassword": "android"        // defaults to "android
      }
    }
  }
}
```

Introduced in
[0.11.0](https://github.com/microsoft/react-native-test-app/releases/tag/0.11.0).
