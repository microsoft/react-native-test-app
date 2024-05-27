// @ts-check
/** @typedef {import("webdriverio").RemoteOptions["logLevel"]} LogLevel */
/** @typedef {import("webdriverio").RemoteOptions["runner"]} Runner */

function getAvailableSimulators(search = "iPhone") {
  const { spawnSync } = require("node:child_process");
  const { error, status, stderr, stdout } = spawnSync(
    "xcrun",
    ["simctl", "list", "--json", "devices", search, "available"],
    { encoding: "utf-8" }
  );
  if (status !== 0) {
    console.error(stderr);
    throw error ?? new Error("Failed to get available iPhone simulators");
  }

  const { devices } = JSON.parse(stdout);
  return Object.keys(devices)
    .sort()
    .reduce((filtered, runtime) => {
      const simulators = devices[runtime];
      if (simulators.length > 0) {
        filtered[runtime] = simulators;
      }
      return filtered;
    }, /** @type {Record<string, { name: string }[]>} */ ({}));
}

const findLatestAndroidEmulatorVersion = (() => {
  /** @type {string} */
  let result;
  return () => {
    if (!result) {
      const { spawnSync } = require("node:child_process");
      const { error, status, stderr, stdout } = spawnSync(
        `${process.env["ANDROID_HOME"]}/cmdline-tools/latest/bin/avdmanager`,
        ["list", "avd"],
        { encoding: "utf-8" }
      );
      if (status !== 0) {
        console.error(stderr);
        throw error ?? new Error("Failed to get available Android emulators");
      }

      const m = stdout.match(/Path: (.*?)\.avd/);
      if (!m) {
        throw new Error("Failed to find an eligible Android emulator");
      }

      const avdPath = m[1];
      const ini = fs.readFileSync(avdPath + ".ini", { encoding: "utf-8" });
      const n = ini.match(/target=android-(\d+)/);
      if (!n) {
        throw new Error("Failed to determine Android API Level");
      }

      const target = Number.parseInt(n[1]);
      result = {
        34: "14.0",
        33: "13.0",
        32: "12L",
        31: "12.0",
        30: "11.0",
        29: "10.0",
        28: "9.0",
        27: "8.1",
        26: "8.0",
        25: "7.1.1",
        24: "7.0",
        23: "6.0",
      }[target];
    }
    return result;
  };
})();

const findLatestIPhoneSimulator = (() => {
  /** @type {[string, string]} */
  let result;
  return () => {
    if (!result) {
      const devices = getAvailableSimulators();
      const runtimes = Object.keys(devices);
      const latestRuntime = runtimes[runtimes.length - 1];
      const sims = devices[latestRuntime];
      const simulator = sims.find(({ name }) => name.includes("Pro"));
      result = [
        simulator?.name ?? "iPhone 15 Pro",
        latestRuntime
          .substring("com.apple.CoreSimulator.SimRuntime.iOS-".length)
          .replace(/-/g, "."),
      ];
    }
    return result;
  };
})();

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
      "react:concurrent": flags.includes("fabric"),
    };

    switch (targetPlatform) {
      case "android":
        return {
          platformName: "Android",
          "appium:app": "./android/app/build/outputs/apk/debug/app-debug.apk",
          "appium:deviceName": "Android GoogleAPI Emulator",
          "appium:platformVersion": findLatestAndroidEmulatorVersion(),
          "appium:automationName": "UiAutomator2",
          ...features,
        };
      case "ios": {
        const [deviceName, platformVersion] = findLatestIPhoneSimulator();
        return {
          platformName: "iOS",
          "appium:app": "com.microsoft.ReactTestApp",
          "appium:deviceName": deviceName,
          "appium:platformVersion": platformVersion,
          "appium:automationName": "XCUITest",
          ...features,
        };
      }
      default:
        throw new Error(`Unknown platform: ${targetPlatform}`);
    }
  })(),
  logLevel: /** @type {LogLevel} */ ("info"),
  waitforTimeout: 60000,
  specFileRetries: 3,
};

exports.iosSimulatorName = () => {
  const [deviceName, platformVersion] = findLatestIPhoneSimulator();
  return `${deviceName} (${platformVersion})`;
};
