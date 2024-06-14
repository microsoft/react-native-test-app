Specifies the root of the bundle file name. E.g., if the bundle file is
`index.[platform].bundle`, `index` is the bundle root.

Defaults to `index` and `main`.

When set, the test app will look for the following files on startup:

- `myRoot.[platform].jsbundle`
- `myRoot.[platform].bundle`
- `myRoot.native.jsbundle`
- `myRoot.native.bundle`
- `myRoot.jsbundle`
- `myRoot.bundle`

<details>
<summary>History</summary>

- [[0.9.0](https://github.com/microsoft/react-native-test-app/releases/tag/0.9.0)]
  Added

</details>
