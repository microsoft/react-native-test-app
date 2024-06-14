Here you should declare all resources that should be bundled with the app. The
property can be a list of paths to resources:

```javascript
"resources": [
  "dist/assets",
  "dist/main.jsbundle"
]
```

Or you can declare platform specific resources using platform names as key:

```javascript
"resources": {
  "android": [
    "dist/res",
    "dist/main.android.jsbundle"
  ],
  "ios": [
    "dist/assets",
    "dist/main.ios.jsbundle"
  ],
  "macos": [
    "dist/assets",
    "dist/main.macos.jsbundle"
  ],
  "windows": [
    "dist/assets",
    "dist/main.windows.bundle"
  ]
}
```

A path must be relative to the path of `app.json`, and can point to both a file
or a directory.
