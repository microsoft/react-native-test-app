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

TODO

</details>
