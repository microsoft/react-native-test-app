A name-value pair for an item of additional, arbitrary data that can be supplied to the application.

Equivalent to
[`<service>`](https://developer.android.com/guide/topics/manifest/service-element).

Example:

```xml
<application>
  <service
      android:name="com.example.locationService"
      android:exported="true"
      android:foregroundServiceType="location" />
</application>
```

becomes

```json
{
  "android": {
    "services": [
      {
        "android:name": "com.example.locationService",
        "android:exported": true,
        "android:foregroundServiceType": "location"
      }
    ],
  }
}
```

<details>
