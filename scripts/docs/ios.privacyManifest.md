The privacy manifest is a property list that records the information regarding
the types of data collected and the required reasons APIs your app or
third-party SDK use.

- The types of data collected by your app or third-party SDK must be provided on
  all platforms.
- The required reasons APIs your app or third-party SDK uses must be provided on
  iOS, iPadOS, tvOS, visionOS, and watchOS.

By default, a `PrivacyInfo.xcprivacy` is always generated with the following
values:

```json
{
  "NSPrivacyTracking": false,
  "NSPrivacyTrackingDomains": [],
  "NSPrivacyCollectedDataTypes": [],
  "NSPrivacyAccessedAPITypes": [
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
      "NSPrivacyAccessedAPITypeReasons": ["C617.1"]
    },
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategorySystemBootTime",
      "NSPrivacyAccessedAPITypeReasons": ["35F9.1"]
    },
    {
      "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
      "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
    }
  ]
}
```

For more details, read Apple's documentation on
[Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files).
