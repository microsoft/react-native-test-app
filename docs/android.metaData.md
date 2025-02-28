A name-value pair for an item of additional, arbitrary data that can be supplied to the application.

Equivalent to
[`<meta-data>`](https://developer.android.com/guide/topics/manifest/meta-data-element).

Example:

```xml
<application>
  <meta-data
      android:name="com.google.android.gms.wallet.api.enabled"
      android:value="true" />
</application>
```

becomes

```json
{
  "android": {
    "metaData": [
      {
        "android:name": "com.google.android.gms.wallet.api.enabled",
        "android:value": "true"
      }
    ]
  }
}
```

<details>
<summary>History</summary>

- [[4.2.0](https://github.com/microsoft/react-native-test-app/releases/tag/4.2.0)]
  Added

</details>
