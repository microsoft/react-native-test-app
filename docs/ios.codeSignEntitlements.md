Declare entitlements for capabilities used by the app.

Example:

```json
{
  "ios": {
    "codeSignEntitlements": {
      "com.apple.developer.game-center": true
    }
  }
}
```

For more details, read Apple's documentation on
[Entitlements](https://developer.apple.com/documentation/bundleresources/entitlements).

Alternatively, specify a path to a custom `.entitlements` file. The path should
be relative to `app.json`. This is equivalent to setting
`CODE_SIGN_ENTITLEMENTS` in Xcode.

<details>
<summary>History</summary>

- [[3.7.0](https://github.com/microsoft/react-native-test-app/releases/tag/3.7.0)]
  Declare entitlements in app manifest
- [[0.9.7](https://github.com/microsoft/react-native-test-app/releases/tag/0.9.7)]
  Added

</details>
