// @ts-check
import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { npm } from "../scripts/helpers.js";

describe("npm pack", () => {
  // Ensure we include all files regardless of future changes in `npm-packlist`.
  // For more details, see https://github.com/npm/npm-packlist/issues/152.
  it("includes all files", () => {
    const { status, stdout } = npm("pack", "--silent", "--dry-run", "--json");

    equal(status, 0);

    const content = JSON.parse(stdout)[0]
      .files.map((/** @type {{ path: string; }} */ entry) => entry.path)
      .sort();

    deepEqual(content, [
      "CODE_OF_CONDUCT.md",
      "CONTRIBUTING.md",
      "LICENSE",
      "README.md",
      "ReactTestApp-DevSupport.podspec",
      "SECURITY.md",
      "android/app/build.gradle",
      "android/app/lint.xml",
      "android/app/src/camera/java/com/microsoft/reacttestapp/camera/MainActivityExtensions.kt",
      "android/app/src/camera/java/com/microsoft/reacttestapp/camera/QRCodeScannerFragment.kt",
      "android/app/src/devserverhelper-0.73/java/com/microsoft/reacttestapp/react/DevServerHelperCompat.kt",
      "android/app/src/devserverhelper-0.74/java/com/microsoft/reacttestapp/react/DevServerHelperCompat.kt",
      "android/app/src/devserverhelper-pre-0.73/java/com/microsoft/reacttestapp/react/DevServerHelperCompat.kt",
      "android/app/src/main/AndroidManifest.xml",
      "android/app/src/main/java/com/microsoft/reacttestapp/MainActivity.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/Session.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/component/ComponentActivity.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/component/ComponentBottomSheetDialogFragment.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/component/ComponentListAdapter.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/component/ComponentViewModel.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/manifest/Manifest.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/manifest/ManifestProvider.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/manifest/MoshiBundleAdapter.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/react/AppRegistry.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/react/ReactBundleNameProvider.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/react/TestAppReactNativeHost.kt",
      "android/app/src/main/java/com/microsoft/reacttestapp/react/ToReadableMap.kt",
      "android/app/src/main/jni/AppRegistry.cpp",
      "android/app/src/main/jni/AppRegistry.h",
      "android/app/src/main/jni/CMakeLists.txt",
      "android/app/src/main/jni/ComponentsRegistry.cpp",
      "android/app/src/main/jni/ComponentsRegistry.h",
      "android/app/src/main/jni/OnLoad.cpp",
      "android/app/src/main/jni/TurboModuleManagerDelegate.cpp",
      "android/app/src/main/jni/TurboModuleManagerDelegate.h",
      "android/app/src/main/res-launcher/drawable-v24/ic_launcher_foreground.xml",
      "android/app/src/main/res-launcher/drawable/ic_launcher_background.xml",
      "android/app/src/main/res-launcher/mipmap-anydpi-v26/ic_launcher.xml",
      "android/app/src/main/res-launcher/mipmap-anydpi-v26/ic_launcher_round.xml",
      "android/app/src/main/res-launcher/mipmap-hdpi/ic_launcher.png",
      "android/app/src/main/res-launcher/mipmap-hdpi/ic_launcher_round.png",
      "android/app/src/main/res-launcher/mipmap-mdpi/ic_launcher.png",
      "android/app/src/main/res-launcher/mipmap-mdpi/ic_launcher_round.png",
      "android/app/src/main/res-launcher/mipmap-xhdpi/ic_launcher.png",
      "android/app/src/main/res-launcher/mipmap-xhdpi/ic_launcher_round.png",
      "android/app/src/main/res-launcher/mipmap-xxhdpi/ic_launcher.png",
      "android/app/src/main/res-launcher/mipmap-xxhdpi/ic_launcher_round.png",
      "android/app/src/main/res-launcher/mipmap-xxxhdpi/ic_launcher.png",
      "android/app/src/main/res-launcher/mipmap-xxxhdpi/ic_launcher_round.png",
      "android/app/src/main/res/layout/activity_main.xml",
      "android/app/src/main/res/layout/camera_view.xml",
      "android/app/src/main/res/layout/recyclerview_item_component.xml",
      "android/app/src/main/res/menu/top_app_bar.xml",
      "android/app/src/main/res/values/colors.xml",
      "android/app/src/main/res/values/strings.xml",
      "android/app/src/main/res/values/styles.xml",
      "android/app/src/new-arch-0.73/java/com/microsoft/reacttestapp/compat/ReactNativeHostCompat.kt",
      "android/app/src/new-arch-0.73/java/com/microsoft/reacttestapp/fabric/ComponentsRegistry.kt",
      "android/app/src/new-arch-0.73/java/com/microsoft/reacttestapp/turbomodule/TurboModuleManagerDelegate.kt",
      "android/app/src/new-arch/java/com/microsoft/reacttestapp/compat/ReactNativeHostCompat.kt",
      "android/app/src/new-arch/java/com/microsoft/reacttestapp/fabric/ComponentsRegistry.kt",
      "android/app/src/new-arch/java/com/microsoft/reacttestapp/turbomodule/TurboModuleManagerDelegate.kt",
      "android/app/src/no-camera/java/com/microsoft/reacttestapp/camera/MainActivityExtensions.kt",
      "android/app/src/old-arch/java/com/microsoft/reacttestapp/compat/ReactNativeHostCompat.kt",
      "android/app/src/reactactivitydelegate-0.72/java/com/microsoft/reacttestapp/component/ComponentActivityDelegate.kt",
      "android/app/src/reactactivitydelegate-0.74/java/com/microsoft/reacttestapp/component/ComponentActivityDelegate.kt",
      "android/app/src/reactactivitydelegate-pre-0.72/java/com/microsoft/reacttestapp/component/ComponentActivityDelegate.kt",
      "android/app/src/reactapplication-0.73/java/com/microsoft/reacttestapp/TestApp.kt",
      "android/app/src/reactapplication-pre-0.73/java/com/microsoft/reacttestapp/TestApp.kt",
      "android/app/src/reactinstanceeventlistener-0.68/java/com/microsoft/reacttestapp/compat/ReactInstanceEventListener.kt",
      "android/app/src/reactinstanceeventlistener-pre-0.68/java/com/microsoft/reacttestapp/compat/ReactInstanceEventListener.kt",
      "android/dependencies.gradle",
      "android/settings.gradle",
      "android/support/build.gradle",
      "android/support/src/main/AndroidManifest.xml",
      "android/support/src/main/java/com/microsoft/reacttestapp/support/ReactTestAppLifecycleEvents.java",
      "android/test-app-util.gradle",
      "common/AppRegistry.cpp",
      "common/AppRegistry.h",
      "example/_gitignore",
      "example/android/gradle.properties",
      "example/android/gradle/wrapper/gradle-wrapper.jar",
      "example/android/gradle/wrapper/gradle-wrapper.properties",
      "example/android/gradlew",
      "example/android/gradlew.bat",
      "example/metro.config.js",
      "example/react-native.config.js",
      "example/windows/_gitignore",
      "ios/ReactTestApp.xcodeproj/project.pbxproj",
      "ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
      "ios/ReactTestApp/AppDelegate.swift",
      "ios/ReactTestApp/AppRegistryModule.h",
      "ios/ReactTestApp/AppRegistryModule.mm",
      "ios/ReactTestApp/Assets.xcassets/AppIcon.appiconset/Contents.json",
      "ios/ReactTestApp/Assets.xcassets/Contents.json",
      "ios/ReactTestApp/ContentView.swift",
      "ios/ReactTestApp/Info.plist",
      "ios/ReactTestApp/Manifest+Decoder.swift",
      "ios/ReactTestApp/Manifest.swift",
      "ios/ReactTestApp/Public/ReactTestApp-DevSupport-Bridging-Header.h",
      "ios/ReactTestApp/Public/ReactTestApp-DevSupport.h",
      "ios/ReactTestApp/QRCodeScannerViewController.swift",
      "ios/ReactTestApp/React+Compatibility.h",
      "ios/ReactTestApp/React+Compatibility.m",
      "ios/ReactTestApp/ReactInstance.swift",
      "ios/ReactTestApp/ReactTestApp-Bridging-Header.h",
      "ios/ReactTestApp/ReactTestApp-DevSupport.m",
      "ios/ReactTestApp/ReactTestApp.common.xcconfig",
      "ios/ReactTestApp/ReactTestApp.debug.xcconfig",
      "ios/ReactTestApp/ReactTestApp.entitlements",
      "ios/ReactTestApp/ReactTestApp.release.xcconfig",
      "ios/ReactTestApp/SceneDelegate.swift",
      "ios/ReactTestApp/Session.swift",
      "ios/ReactTestApp/UIViewController+ReactTestApp.h",
      "ios/ReactTestApp/UIViewController+ReactTestApp.m",
      "ios/ReactTestAppTests/Info.plist",
      "ios/ReactTestAppTests/ReactTestAppTests.swift",
      "ios/ReactTestAppUITests/Info.plist",
      "ios/ReactTestAppUITests/ReactTestAppUITests.swift",
      "ios/pod_helpers.rb",
      "ios/test_app.rb",
      "ios/use_react_native-0.64.rb",
      "ios/use_react_native-0.68.rb",
      "ios/use_react_native-0.70.rb",
      "ios/use_react_native-0.71.rb",
      "macos/Localizations/en.lproj/Main.strings",
      "macos/ReactTestApp.xcodeproj/project.pbxproj",
      "macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
      "macos/ReactTestApp/AppDelegate.swift",
      "macos/ReactTestApp/Assets.xcassets/AppIcon.appiconset/Contents.json",
      "macos/ReactTestApp/Assets.xcassets/Contents.json",
      "macos/ReactTestApp/Base.lproj/Main.storyboard",
      "macos/ReactTestApp/Info.plist",
      "macos/ReactTestApp/ReactTestApp.common.xcconfig",
      "macos/ReactTestApp/ReactTestApp.debug.xcconfig",
      "macos/ReactTestApp/ReactTestApp.entitlements",
      "macos/ReactTestApp/ReactTestApp.release.xcconfig",
      "macos/ReactTestApp/ViewController.swift",
      "macos/ReactTestAppTests/Info.plist",
      "macos/ReactTestAppTests/ReactTestAppTests.swift",
      "macos/ReactTestAppUITests/Info.plist",
      "macos/ReactTestAppUITests/ReactTestAppUITests.swift",
      "macos/test_app.rb",
      "package.json",
      "plugins/index.js",
      "plugins/reanimated.js",
      "react-native.config.js",
      "schema.json",
      "scripts/apply-config-plugins.mjs",
      "scripts/config-plugins/ExpoConfigPlugins.mjs",
      "scripts/config-plugins/apply.mjs",
      "scripts/config-plugins/index.mjs",
      "scripts/config-plugins/plugins/mod-compiler.mjs",
      "scripts/config-plugins/plugins/withAndroidBaseMods.mjs",
      "scripts/config-plugins/plugins/withInternal.mjs",
      "scripts/config-plugins/plugins/withIosBaseMods.mjs",
      "scripts/config-plugins/provider.mjs",
      "scripts/config-plugins/types.mjs",
      "scripts/configure-projects.js",
      "scripts/configure.mjs",
      "scripts/helpers.js",
      "scripts/init.mjs",
      "scripts/parseargs.mjs",
      "scripts/schema.js",
      "scripts/template.mjs",
      "scripts/validate-manifest.js",
      "test-app.gradle",
      "test_app.rb",
      "visionos/ReactTestApp.xcodeproj/project.pbxproj",
      "visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.solidimagestack/Back.solidimagestacklayer/Content.imageset/Contents.json",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.solidimagestack/Back.solidimagestacklayer/Content.imageset/back.jpg",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.solidimagestack/Back.solidimagestacklayer/Contents.json",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.solidimagestack/Contents.json",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.solidimagestack/Front.solidimagestacklayer/Content.imageset/Contents.json",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.solidimagestack/Front.solidimagestacklayer/Content.imageset/front.png",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.solidimagestack/Front.solidimagestacklayer/Contents.json",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.solidimagestack/Middle.solidimagestacklayer/Content.imageset/Contents.json",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.solidimagestack/Middle.solidimagestacklayer/Contents.json",
      "visionos/ReactTestApp/Assets.xcassets/Contents.json",
      "visionos/ReactTestApp/Info.plist",
      "visionos/ReactTestApp/ReactTestApp.common.xcconfig",
      "visionos/ReactTestApp/ReactTestApp.debug.xcconfig",
      "visionos/ReactTestApp/ReactTestApp.entitlements",
      "visionos/ReactTestApp/ReactTestApp.release.xcconfig",
      "visionos/ReactTestAppTests/Info.plist",
      "visionos/ReactTestAppTests/ReactTestAppTests.swift",
      "visionos/ReactTestAppUITests/Info.plist",
      "visionos/ReactTestAppUITests/ReactTestAppUITests.swift",
      "visionos/test_app.rb",
      "windows/ExperimentalFeatures.props",
      "windows/ReactTestApp/App.cpp",
      "windows/ReactTestApp/App.h",
      "windows/ReactTestApp/App.idl",
      "windows/ReactTestApp/App.xaml",
      "windows/ReactTestApp/Assets/LockScreenLogo.scale-200.png",
      "windows/ReactTestApp/Assets/SplashScreen.scale-200.png",
      "windows/ReactTestApp/Assets/Square150x150Logo.scale-200.png",
      "windows/ReactTestApp/Assets/Square44x44Logo.scale-200.png",
      "windows/ReactTestApp/Assets/Square44x44Logo.targetsize-24_altform-unplated.png",
      "windows/ReactTestApp/Assets/StoreLogo.png",
      "windows/ReactTestApp/Assets/Wide310x150Logo.scale-200.png",
      "windows/ReactTestApp/AutolinkedNativeModules.g.cpp",
      "windows/ReactTestApp/AutolinkedNativeModules.g.h",
      "windows/ReactTestApp/AutolinkedNativeModules.g.props",
      "windows/ReactTestApp/AutolinkedNativeModules.g.targets",
      "windows/ReactTestApp/MainPage.cpp",
      "windows/ReactTestApp/MainPage.h",
      "windows/ReactTestApp/MainPage.idl",
      "windows/ReactTestApp/MainPage.xaml",
      "windows/ReactTestApp/Manifest.cpp",
      "windows/ReactTestApp/Manifest.h",
      "windows/ReactTestApp/Package.appxmanifest",
      "windows/ReactTestApp/PropertySheet.props",
      "windows/ReactTestApp/ReactInstance.cpp",
      "windows/ReactTestApp/ReactInstance.h",
      "windows/ReactTestApp/ReactPackageProvider.cpp",
      "windows/ReactTestApp/ReactPackageProvider.h",
      "windows/ReactTestApp/ReactTestApp.vcxproj",
      "windows/ReactTestApp/ReactTestApp.vcxproj.filters",
      "windows/ReactTestApp/Session.h",
      "windows/ReactTestApp/ValidateManifest.targets",
      "windows/ReactTestApp/packages.config",
      "windows/ReactTestApp/pch.cpp",
      "windows/ReactTestApp/pch.h",
      "windows/test-app.mjs",
    ]);
  });
});
