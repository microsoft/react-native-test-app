The API Validation layer checks for code that calls the Metal API incorrectly,
including errors in creating resources, encoding Metal commands, and performing
other common tasks.

> **_NOTE:_** The API Validation layer has a small, but measureable, impact on
> CPU performance.

By default, a `PrivacyInfo.xcprivacy` is on,

For more details, read Apple's documentation on
[Validating your app’s Metal API usage](https://developer.apple.com/documentation/xcode/validating-your-apps-metal-api-usage/).

<details>
<summary>History</summary>
</details>
