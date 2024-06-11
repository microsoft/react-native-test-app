Specifies system permissions that the user must grant for the app to operate
correctly.

Equivalent to
[`<uses-permission>`](https://developer.android.com/guide/topics/manifest/uses-permission-element).

Example:

```xml
<uses-permission
    android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="18" />
```

becomes

```json
{
  "android": {
    "permissions": [
      {
        "android:name": "android.permission.WRITE_EXTERNAL_STORAGE",
        "android:maxSdkVersion": "18"
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
