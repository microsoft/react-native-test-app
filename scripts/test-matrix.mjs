// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as util from "node:util";
import { green, red, yellow } from "./colors.mjs";
import { readTextFile } from "./helpers.js";
import { setReactVersion } from "./set-react-version.mjs";
import { getIOSSimulatorName, installPods } from "./test-apple.mjs";
import { $, $$, test } from "./test-e2e.mjs";

/**
 * @typedef {import("./types.js").BuildConfig} BuildConfig
 * @typedef {import("./types.js").PlatformConfig} PlatformConfig
 * @typedef {import("./types.js").TargetPlatform} TargetPlatform
 */

const DEFAULT_PLATFORMS = ["android", "ios"];
const TEST_VARIANTS = /** @type {const} */ (["paper", "fabric"]);

/** @type {Record<TargetPlatform, PlatformConfig>} */
const PLATFORM_CONFIG = {
  android: {
    name: "Android",
    engines: ["hermes"],
    isAvailable: ({ engine }) => engine === "hermes",
    prebuild: ({ variant }) => {
      if (variant === "fabric") {
        const properties = "android/gradle.properties";
        const content = readTextFile(properties);
        fs.writeFileSync(
          properties,
          content.replace("#newArchEnabled=true", "newArchEnabled=true")
        );
      }
      return Promise.resolve();
    },
  },
  ios: {
    name: "iOS",
    engines: ["jsc", "hermes"],
    isAvailable: () => process.platform === "darwin",
    prebuild: installPods,
  },
  macos: {
    name: "macOS",
    engines: ["jsc", "hermes"],
    isAvailable: () => false,
    prebuild: installPods,
  },
  visionos: {
    name: "visionOS",
    engines: ["jsc", "hermes"],
    isAvailable: () => false,
    prebuild: installPods,
  },
  windows: {
    name: "Windows",
    engines: ["hermes"],
    isAvailable: () => false,
    prebuild: () => Promise.resolve(),
  },
};

const PACKAGE_MANAGER = "yarn";
const TAG = "┃";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

function log(message = "", tag = TAG) {
  console.log(tag, message);
}

/**
 * Invokes `npm run` and redirects stdout/stderr to specified file.
 * @param {string} script
 * @param {string} logPath
 */
function run(script, logPath) {
  const fd = fs.openSync(logPath, "a", 0o644);
  const proc = spawn(PACKAGE_MANAGER, ["run", script], {
    stdio: ["ignore", fd, fd],
  });
  return proc;
}

/**
 * @param {string} message
 */
function showBanner(message) {
  log();
  log(message, "┗━━▶");
  log("", "");
}

/**
 * Starts Appium server.
 */
function startAppiumServer(logPath = "appium.log") {
  log(`Appium log path: ${logPath}`);
  return run("appium", logPath);
}

/**
 * Starts Metro dev server.
 */
function startDevServer(logPath = "metro.server.log") {
  log(`Metro log path: ${logPath}`);
  return run("start", logPath);
}

/**
 * @param {string[]} platforms
 * @returns {TargetPlatform[]}
 */
function validatePlatforms(platforms) {
  /** @type {TargetPlatform[]} */
  const filtered = [];
  for (const platform of platforms) {
    switch (platform) {
      case "android":
      case "ios":
        filtered.push(platform);
        break;

      case "macos":
      case "visionos":
      case "windows":
        log(yellow(`⚠ Unsupported platform: ${platform}`));
        break;

      default:
        log(yellow(`⚠ Unknown platform: ${platform}`));
        break;
    }
  }
  return filtered;
}

/**
 * @param {string[]} args
 */
function parseArgs(args) {
  const { values, positionals } = util.parseArgs({
    args,
    options: {
      android: {
        description: "Test Android",
        type: "boolean",
      },
      ios: {
        description: "Test iOS",
        type: "boolean",
      },
    },
    strict: true,
    allowPositionals: true,
    tokens: false,
  });

  const flags = Object.keys(values);
  return {
    version: positionals[0],
    platforms: validatePlatforms(
      flags.length === 0 ? DEFAULT_PLATFORMS : flags
    ),
  };
}

function prestart() {
  return !process.stdin.isTTY
    ? Promise.resolve()
    : new Promise((resolve) => {
        const stdin = process.stdin;
        const rawMode = stdin.isRaw;
        const encoding = stdin.readableEncoding || undefined;
        stdin.setRawMode(true);
        stdin.setEncoding("utf-8");
        stdin.resume();
        stdin.once("data", (key) => {
          process.stdout.write("\n");
          stdin.pause();
          stdin.setEncoding(encoding);
          stdin.setRawMode(rawMode);
          if (typeof key === "string" && key === "\u0003") {
            showBanner("❌ Canceled");
            // eslint-disable-next-line local/no-process-exit
            process.exit(1);
          }
          resolve(true);
        });
        process.stdout.write(
          `${TAG} Before continuing, make sure all emulators/simulators and Appium/Metro instances are closed.\n${TAG}\n${TAG} Press any key to continue...`
        );
      });
}

/**
 * Invokes `react-native run-<platform>`.
 * @param {TargetPlatform} platform
 */
function buildAndRun(platform) {
  switch (platform) {
    case "ios": {
      const simulator = getIOSSimulatorName();
      $(PACKAGE_MANAGER, platform, "--simulator", simulator, "--no-packager");
      break;
    }
    default: {
      $(PACKAGE_MANAGER, platform, "--no-packager");
      break;
    }
  }
}

/**
 * @param {BuildConfig} config
 */
async function buildRunTest({ platform, variant }) {
  const setup = PLATFORM_CONFIG[platform];
  if (!setup) {
    log(yellow(`⚠ Unknown platform: ${platform}`));
    return;
  }

  for (const engine of setup.engines) {
    const configWithEngine = { platform, variant, engine };
    if (!setup.isAvailable(configWithEngine)) {
      continue;
    }

    showBanner(`Build ${setup.name} [${variant}, ${engine}]`);
    await setup.prebuild(configWithEngine);
    buildAndRun(platform);
    await test(platform, [variant, engine]);
  }
}

/**
 * @param {string} rootDir
 */
function reset(rootDir) {
  log("Resetting...");

  process.chdir(rootDir);

  try {
    $$(process.platform === "win32" ? "tskill" : "killall", "watchman");
    $$("watchman", "watch-del-all", rootDir);
  } catch (_) {
    // Watchman may not be installed
  }

  $("git", "checkout", "--quiet", ".");
  $(
    "git",
    "clean",
    "-dfqx",
    "--exclude=.yarn/cache",
    "--exclude=example/*.png"
  );
}

/**
 * Invokes callback within the context of specified React Native version.
 * @param {string} version
 * @param {() => Promise<void>} action
 */
async function withReactNativeVersion(version, action) {
  reset(rootDir);

  if (version) {
    await setReactVersion(version, true);
  } else {
    log();
  }

  $(PACKAGE_MANAGER, "install");
  log();

  let appiumServer;
  let devServer;
  try {
    process.chdir("example");
    appiumServer = startAppiumServer();
    devServer = startDevServer();
    await action();
  } finally {
    appiumServer?.kill();
    devServer?.kill();
  }
}

const { version, platforms } = parseArgs(process.argv.slice(2));
if (platforms.length === 0) {
  process.exitCode = 1;
  showBanner(red("No valid platforms were specified"));
} else {
  TEST_VARIANTS.reduce((job, variant) => {
    return job.then(() =>
      withReactNativeVersion(version, async () => {
        for (const platform of platforms) {
          await buildRunTest({ platform, variant });
        }
      })
    );
  }, prestart())
    .then(() => {
      showBanner(`Initialize new app`);
      $(
        PACKAGE_MANAGER,
        "init-test-app",
        "--destination",
        "template-example",
        "--name",
        "TemplateExample",
        "--platform",
        "android",
        "--platform",
        "ios"
      );
    })
    .then(() => {
      showBanner(green("✔ Pass"));
    });
}
