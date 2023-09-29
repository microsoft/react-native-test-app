// @ts-check
/**
 * @typedef {import("webdriverio").RemoteOptions["logLevel"]} LogLevel;
 * @typedef {import("webdriverio").RemoteOptions["runner"]} Runner;
 */
exports.config = {
  runner: /** @type {Runner} */ ("local"),
  port: 4723,
  specs: ["**/*.spec.js"],
  capabilities: (() => {
    const args = process.env["TEST_ARGS"]?.toLowerCase() ?? "";
    const [targetPlatform, ...flags] = args.split(" ");

    const features = {
      "react:hermes": flags.includes("hermes"),
      "react:fabric": flags.includes("fabric"),
      "react:concurrent": flags.includes("concurrent"),
    };

    switch (targetPlatform) {
      case "android":
        return {
          platformName: "Android",
          "appium:app": "./android/app/build/outputs/apk/debug/app-debug.apk",
          "appium:deviceName": "Android GoogleAPI Emulator",
          "appium:platformVersion": "13.0",
          "appium:automationName": "UiAutomator2",
          ...features,
        };
      case "ios":
        return {
          platformName: "iOS",
          "appium:app": "com.microsoft.ReactTestApp",
          "appium:deviceName": "iPhone 15 Pro",
          "appium:platformVersion": "17.0",
          "appium:automationName": "XCUITest",
          ...features,
        };
      default:
        throw new Error(`Unknown platform: ${targetPlatform}`);
    }
  })(),
  logLevel: /** @type {LogLevel} */ ("info"),
  waitforTimeout: 60000,
  specFileRetries: 3,
};
