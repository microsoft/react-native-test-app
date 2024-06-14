Declares hardware or software features that is used by the application.

Equivalent to
[`<uses-feature>`](https://developer.android.com/guide/topics/manifest/uses-feature-element).

Example:

```xml
<uses-feature android:name="android.hardware.camera.any" />
<uses-feature android:glEsVersion="0x00030002"
              android:required="true" />
```

becomes

```json
{
  "android": {
    "features": [
      {
        "android:name": "android.hardware.camera.any"
      },
      {
        "android:glEsVersion": "0x00030002",
        "android:required": "true"
      }
    ]
  }
}
```

<details>
<summary>History</summary>

- [[3.8.0](https://github.com/microsoft/react-native-test-app/releases/tag/3.8.0)]
  Added

</details>
