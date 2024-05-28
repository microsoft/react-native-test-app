// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { memo, readTextFile } from "./helpers.js";
import { setReactVersion } from "./set-react-version.mjs";
import { $, test } from "./test-e2e.mjs";

/**
 * @typedef {"ios" | "macos" | "visionos"} ApplePlatform
 * @typedef {ApplePlatform | "android" | "windows"} Platform
 */

const PACKAGE_MANAGER = "yarn";
const TAG = "┃";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

const getIOSSimulatorName = memo(() => {
  const wdioConfig = new URL(
    "../example/test/specs/wdio.config.mjs",
    import.meta.url
  );
  const { status, stdout } = spawnSync(
    process.argv[0],
    [
      "--eval",
      `import("${fileURLToPath(wdioConfig)}").then((config) => console.log(config.iosSimulatorName()))`,
    ],
    {
      stdio: ["ignore", "pipe", "inherit"],
      env: { TEST_ARGS: "ios" },
      encoding: "utf-8",
    }
  );
  if (status !== 0) {
    throw new Error(
      "An error occurred while trying to evaluate 'wdio.config.mjs'"
    );
  }
  return stdout.trim();
});

function log(message = "", tag = TAG) {
  console.log(tag, message);
}

/**
 * Invokes `react-native run-<platform>`.
 * @param {Platform} platform
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
 * Configures app.
 * @param {Platform} platform
 * @param {{ hermes?: boolean; newArch?: boolean; }} config
 */
function configure(platform, { hermes, newArch }) {
  switch (platform) {
    case "android":
      // Hermes is always enabled on Android
      if (newArch) {
        const properties = "android/gradle.properties";
        const content = readTextFile(properties);
        fs.writeFileSync(
          properties,
          content.replace("#newArchEnabled=true", "newArchEnabled=true")
        );
      }
      break;
    case "ios": {
      const podfile = `${platform}/Podfile`;
      let content = readTextFile(podfile);
      if (hermes) {
        content = content.replace(
          ":hermes_enabled => false",
          ":hermes_enabled => true"
        );
      }
      if (newArch) {
        content = content.replace(
          ":fabric_enabled => false",
          ":fabric_enabled => true"
        );
      }
      fs.writeFileSync(podfile, content);
      break;
    }
  }
}

/**
 * Invokes `pod install` for specified platform.
 * @param {ApplePlatform} platform
 */
function installPods(platform) {
  const options = {
    force: true,
    maxRetries: 3,
    recursive: true,
    retryDelay: 500,
  };
  fs.rmSync(`${platform}/Podfile.lock`, options);
  fs.rmSync(`${platform}/Pods`, options);
  fs.rmSync(`${platform}/build`, options);
  $("pod", "install", `--project-directory=${platform}`);
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
 * Invokes callback within the context of specified React Native version.
 * @param {string} version
 * @param {() => Promise<void>} proc
 */
async function withReactNativeVersion(version, proc) {
  log("Resetting...");
  process.chdir(rootDir);
  $("git", "checkout", "--quiet", ".");
  $(
    "git",
    "clean",
    "-dfqx",
    "--exclude=.yarn/cache",
    "--exclude=example/*.png"
  );

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
    await proc();
  } finally {
    appiumServer?.kill();
    devServer?.kill();
  }
}

const start = !process.stdin.isTTY
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
          console.log("❌ Canceled");
          // eslint-disable-next-line local/no-process-exit
          process.exit(1);
        }
        resolve(true);
      });
      process.stdout.write(
        `${TAG} Before continuing, make sure all emulators/simulators and Appium/Metro instances are closed.\n${TAG}\n${TAG} Press any key to continue...`
      );
    });

const { [2]: version } = process.argv;
[{ newArch: false }, { newArch: true }]
  .reduce((job, config) => {
    return job.then(() =>
      withReactNativeVersion(version, async () => {
        const newArch = config.newArch ? "fabric" : "paper";

        showBanner(`Build Android [hermes, ${newArch}]`);

        configure("android", config);
        buildAndRun("android");
        await test("android", ["hermes", newArch]);

        if (process.platform === "darwin") {
          showBanner(`Build iOS [jsc, ${newArch}]`);

          configure("ios", config);
          installPods("ios");
          buildAndRun("ios");
          await test("ios", [newArch]);

          showBanner(`Build iOS [hermes, ${newArch}]`);

          configure("ios", { ...config, hermes: true });
          installPods("ios");
          buildAndRun("ios");
          await test("ios", ["hermes", newArch]);
        }
      })
    );
  }, start)
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
  });
