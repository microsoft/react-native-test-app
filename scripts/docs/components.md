All components that should be accessible from the home screen should be declared
under this property. Each component must have `appKey` set, i.e. the name that
you passed to `AppRegistry.registerComponent`.

```javascript
AppRegistry.registerComponent("Example", () => Example);
```

For each entry, you can declare additional (optional) properties:

```javascript
{
  "components": [
    {
      // The app key passed to `AppRegistry.registerComponent()`
      "appKey": "Example",

      // [Optional] Name to be displayed on home screen
      "displayName": "App",

      // [Optional] Properties that should be passed to your component
      "initialProperties": {
        "concurrentRoot": false
      },

      // [Optional] The style in which to present your component.
      // Valid values are: "modal"
      "presentationStyle": "",

      // [Optional] URL slug that uniquely identifies this component.
      // Used for deep linking.
      "slug": ""
    }
  ]
}
```

If you're on React Native 0.69 and want to enable
[Concurrent React](https://reactjs.org/blog/2022/03/29/react-v18.html#what-is-concurrent-react),
set `"concurrentRoot": true` in `initialProperties`.

<a name='android-adding-fragments' />

#### [Android] Adding Fragments

On Android, you can add fragments to the home screen by using their fully
qualified class names, e.g. `com.example.app.MyFragment`, as app key:

```javascript
"components": [
  {
    "appKey": "com.example.app.MyFragment",
    "displayName": "App"
  }
]
```

If you need to get the `ReactNativeHost` instance within `MyFragment`, you can
request it as a service from the context:

```java
@Override
@SuppressLint("WrongConstant")
public void onAttach(@NonNull Context context) {
    super.onAttach(context);

    ReactNativeHost reactNativeHost = (ReactNativeHost)
        context.getSystemService("service:reactNativeHostService");
    ReactInstanceManager reactInstanceManager =
        reactNativeHost.getReactInstanceManager();
}
```

<a name='ios-macos-adding-view-controllers' />

#### [iOS, macOS] Adding View Controllers

On iOS/macOS, you can have native view controllers on the home screen by using
their Objective-C names as app key (Swift classes can declare Objective-C names
with the
[`@objc`](https://docs.swift.org/swift-book/ReferenceManual/Attributes.html#objc)
attribute):

```javascript
"components": [
  {
    "appKey": "RTAMyViewController",
    "displayName": "App"
  }
]
```

The view controller must implement an initializer that accepts a `RCTBridge`
instance:

```objc
- (nonnull instancetype)initWithBridge:(nonnull RCTBridge *)bridge;
```
