/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { URL, fileURLToPath } from "node:url";
import * as util from "node:util";
import { readTextFile, toVersionNumber, v } from "../helpers.js";
import { setReactVersion } from "../internal/set-react-version.mts";
import type { BuildConfig, TargetPlatform } from "../types.js";
import { green, red, yellow } from "../utils/colors.mjs";
import { rm_r } from "../utils/filesystem.mjs";
import { getIOSSimulatorName, installPods } from "./test-apple.mts";
import { $, $$, test } from "./test-e2e.mts";

type PlatformConfig = {
  name: string;
  engines: ReadonlyArray<"hermes" | "jsc">;
  isAvailable: (config: Required<BuildConfig>) => boolean;
  prebuild: (config: Required<BuildConfig>) => Promise<void>;
  additionalBuildArgs?: () => string[];
  requiresManualTesting?: boolean;
};

const DEFAULT_PLATFORMS = ["android", "ios"];
const PACKAGE_MANAGER = "yarn";
const TAG = "┃";
const TEST_VARIANTS = ["paper", "fabric"] as const;

function isVariantSupported({ version, variant }: Required<BuildConfig>) {
  return variant === "fabric" || toVersionNumber(version) < v(0, 82, 0);
}

function isAppleVariantSupported(config: Required<BuildConfig>) {
  if (process.platform !== "darwin") {
    return false;
  }

  const { version, engine } = config;
  if (engine === "jsc" && toVersionNumber(version) >= v(0, 80, 0)) {
    return false;
  }

  return isVariantSupported(config);
}

const PLATFORM_CONFIG: Record<TargetPlatform, PlatformConfig> = {
  android: {
    name: "Android",
    engines: ["hermes"],
    isAvailable: isVariantSupported,
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
    isAvailable: isAppleVariantSupported,
    prebuild: installPods,
    additionalBuildArgs: () => ["--device", getIOSSimulatorName()],
  },
  macos: {
    name: "macOS",
    engines: ["jsc", "hermes"],
    isAvailable: isAppleVariantSupported,
    prebuild: installPods,
    requiresManualTesting: true,
  },
  visionos: {
    name: "visionOS",
    engines: ["jsc", "hermes"],
    isAvailable: isAppleVariantSupported,
    prebuild: installPods,
    requiresManualTesting: true,
  },
  windows: {
    name: "Windows",
    engines: ["hermes"],
    isAvailable: () => process.platform === "win32",
    prebuild: ({ variant }) => {
      rm_r("windows/ExperimentalFeatures.props");
      const args = [
        "--msbuildprops",
        "WindowsTargetPlatformVersion=10.0.26100.0",
        "--use-nuget",
      ];
      if (variant === "fabric") {
        args.push("--use-fabric");
      }
      $(PACKAGE_MANAGER, "install-windows-test-app", ...args);
      return Promise.resolve();
    },
    requiresManualTesting: true,
  },
};

const rootDir = fileURLToPath(new URL("../..", import.meta.url));

function log(message = "", tag = TAG) {
  console.log(tag, message);
}

/**
 * Invokes `npm run` and redirects stdout/stderr to specified file.
 */
function run(script: string, logPath: string) {
  const fd = fs.openSync(logPath, "a", 0o644);
  const proc = spawn(PACKAGE_MANAGER, ["run", script], {
    stdio: ["ignore", fd, fd],
    shell: process.platform === "win32",
  });
  return proc;
}

function showBanner(message: string) {
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

function validatePlatforms(platforms: string[]): TargetPlatform[] {
  const filtered: TargetPlatform[] = [];
  for (const platform of platforms) {
    switch (platform) {
      case "android":
      case "ios":
      case "macos":
      case "visionos":
      case "windows":
        filtered.push(platform);
        break;

      default:
        log(yellow(`⚠ Unknown platform: ${platform}`));
        break;
    }
  }
  return filtered;
}

function parseArgs(args: string[]) {
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
      macos: {
        description: "Test macOS",
        type: "boolean",
      },
      visionos: {
        description: "Test visionOS",
        type: "boolean",
      },
      windows: {
        description: "Test Windows",
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

function waitForUserInput(message: string): Promise<void> {
  return !process.stdin.isTTY
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
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
            reject(1);
          } else {
            resolve();
          }
        });
        process.stdout.write(message);
      });
}

/**
 * Invokes `rnx-cli run --platform <platform>`.
 */
function buildAndRun(platform: TargetPlatform) {
  const { additionalBuildArgs } = PLATFORM_CONFIG[platform];
  if (additionalBuildArgs) {
    $(PACKAGE_MANAGER, platform, ...additionalBuildArgs());
  } else {
    $(PACKAGE_MANAGER, platform);
  }
}

async function buildRunTest({ version, platform, variant }: BuildConfig) {
  const setup = PLATFORM_CONFIG[platform];
  if (!setup) {
    log(yellow(`⚠ Unknown platform: ${platform}`));
    return;
  }

  for (const engine of setup.engines) {
    const configWithEngine = { version, platform, variant, engine };
    if (!setup.isAvailable(configWithEngine)) {
      continue;
    }

    showBanner(`Build ${setup.name} [${variant}, ${engine}]`);
    await setup.prebuild(configWithEngine);
    buildAndRun(platform);
    if (setup.requiresManualTesting) {
      await waitForUserInput(
        `${TAG}\n${TAG} ${yellow("⚠")} ${setup.name} requires manual testing. When you're done, press any key to continue...`
      );
    } else {
      await test(platform, [variant, engine]);
    }
  }
}

function reset(rootDir: string) {
  log("Resetting...");

  process.chdir(rootDir);

  try {
    $$(process.platform === "win32" ? "tskill" : "killall", "watchman");
    $$("watchman", "watch-del-all", rootDir);
  } catch (_) {
    // Watchman may not be installed
  }

  $("git", "checkout", "--quiet", ".");
  // We currently use circular symlinks for testing purposes
  // (e.g. `example/node_modules/react-native-test-app` points to `../..`).
  // On Windows, `git clean` will be significantly slower if we don't remove
  // this symlink first as it will try to crawl recursively into it.
  rm_r("example/node_modules/react-native-test-app");
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
 */
async function withReactNativeVersion(
  version: string,
  action: () => Promise<void>
) {
  reset(rootDir);

  if (version) {
    await setReactVersion(version, false);
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
  TEST_VARIANTS.reduce(
    (job, variant) => {
      return job.then(() =>
        withReactNativeVersion(version, async () => {
          for (const platform of platforms) {
            await buildRunTest({ version, platform, variant });
          }
        })
      );
    },
    waitForUserInput(
      `${TAG} Before continuing, make sure all emulators/simulators and Appium/Metro instances are closed.\n${TAG}\n${TAG} Press any key to continue...`
    )
  )
    .then(() => {
      showBanner("Initialize new app");
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
      showBanner("Reconfigure existing app");
      const args = [
        "configure-test-app",
        "-p",
        "android",
        "-p",
        "ios",
        "-p",
        "macos",
        "-p",
        "visionos",
        "-p",
        "windows",
      ];
      const { status } = spawnSync(PACKAGE_MANAGER, args, {
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      if (status !== 1) {
        throw new Error("Expected an error");
      }
    })
    .then(() => {
      showBanner(green("✔ Pass"));
    })
    .catch((e) => {
      if (typeof e === "number") {
        process.exitCode = e;
      } else {
        process.exitCode = 1;
        showBanner(`❌ ${e}`);
      }
    });
}
