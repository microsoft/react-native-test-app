// @ts-check
import { isMain } from "../scripts/helpers.js";
import { assertArray, assertObject } from "./utils.mjs";
import {
  CODE_SIGN_IDENTITY,
  DEVELOPMENT_TEAM,
  ENABLE_TESTING_SEARCH_PATHS,
  GCC_PREPROCESSOR_DEFINITIONS,
  openXcodeProject,
  WARNING_CFLAGS,
} from "./xcode.mjs";

/**
 * @import { JSONObject } from "./utils.mjs";
 * @typedef {ReturnType<typeof openXcodeProject>["targets"][number]} BuildTarget;
 */

const RCT_MODULES = [
  "RCT-Folly",
  "SocketRocket",
  "Yoga",
  "fmt",
  "glog",
  "libevent",
];

/**
 * @param {JSONObject} buildSettings
 * @param {string} key
 * @param {string} value
 */
function append(buildSettings, key, value, defaultValue = ["$(inherited)"]) {
  const setting = buildSettings[key] ?? defaultValue;
  if (Array.isArray(setting)) {
    setting.push(value);
    buildSettings[key] = setting;
  } else {
    buildSettings[key] = `${setting} ${value}`;
  }
}

/**
 * @param {JSONObject} options
 * @returns {Promise<void>}
 */
async function applyConfigPlugins(options) {
  const projectRoot = options["projectRoot"];
  if (typeof projectRoot !== "string") {
    throw new Error("Expected project root to be a string");
  }

  const platformTargets = options["platforms"];
  assertObject(platformTargets, "postinstall.platforms");

  const { main } = await import("../scripts/apply-config-plugins.mjs");
  await main(projectRoot, Object.keys(platformTargets).filter(Boolean));
}

/**
 * @param {BuildTarget} target
 * @returns {void}
 */
function applyReactFixes(target) {
  for (const { buildSettings } of target.buildConfigurations) {
    assertObject(buildSettings, "target.buildConfigurations[].buildSettings");

    // TODO: Drop `_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION` when
    //       we no longer support 0.72
    append(
      buildSettings,
      GCC_PREPROCESSOR_DEFINITIONS,
      "_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION=1"
    );

    append(buildSettings, WARNING_CFLAGS, "-w", []);
  }
}

/**
 * @param {BuildTarget} target
 * @returns {void}
 */
function applyReanimatedFixes(target) {
  // Reanimated tries to automatically install itself by swizzling a method in
  // `RCTAppDelegate`. We don't use it since it doesn't exist on older versions
  // of React Native. Redirect users to the config plugin instead. See
  // https://github.com/microsoft/react-native-test-app/issues/1195 and
  // https://github.com/software-mansion/react-native-reanimated/commit/a8206f383e51251e144cb9fd5293e15d06896df0.
  for (const { buildSettings } of target.buildConfigurations) {
    assertObject(buildSettings, "target.buildConfigurations[].buildSettings");

    append(
      buildSettings,
      GCC_PREPROCESSOR_DEFINITIONS,
      "DONT_AUTOINSTALL_REANIMATED"
    );
  }
}

/**
 * @param {BuildTarget} target
 * @param {JSONObject} options
 * @returns {void}
 */
function applyCodeSignFixes(target, options) {
  // Code signing of resource bundles was enabled in Xcode 14. Not sure if this
  // is intentional, or if there's a bug in CocoaPods, but Xcode will fail to
  // build when targeting devices. Until this is resolved, we'll just just have
  // to make sure it's consistent with what's set in `app.json`. See also
  // https://github.com/CocoaPods/CocoaPods/issues/11402.
  if (target.productType === "com.apple.product-type.bundle") {
    for (const { buildSettings } of target.buildConfigurations) {
      assertObject(buildSettings, "target.buildConfigurations[].buildSettings");

      buildSettings[CODE_SIGN_IDENTITY] ||= options["codeSignIdentity"];
      buildSettings[DEVELOPMENT_TEAM] ||= options["developmentTeam"];
    }
  }
}

/**
 * @param {BuildTarget} target
 * @returns {void}
 */
function applyTestFixes(target) {
  // Ensure `ENABLE_TESTING_SEARCH_PATHS` is always set otherwise Xcode may fail
  // to properly import XCTest
  for (const { buildSettings } of target.buildConfigurations) {
    assertObject(buildSettings, "target.buildConfigurations[].buildSettings");

    if (!(ENABLE_TESTING_SEARCH_PATHS in buildSettings)) {
      buildSettings[ENABLE_TESTING_SEARCH_PATHS] = "YES";
    }
  }
}

/**
 * @param {string} podsProject
 * @param {JSONObject} options
 * @returns {void}
 */
function postinstall(podsProject, options) {
  const testDependencies = options["testDependencies"];
  assertArray(testDependencies, "postinstall.testDependencies");

  const project = openXcodeProject(podsProject);
  for (const target of project.targets) {
    const { name: targetName } = target;
    if (typeof targetName !== "string") {
      continue;
    }

    if (targetName.startsWith("React") || RCT_MODULES.includes(targetName)) {
      applyReactFixes(target);
    } else if (targetName === "RNReanimated") {
      applyReanimatedFixes(target);
    } else if (testDependencies.includes(targetName)) {
      applyTestFixes(target);
    }

    applyCodeSignFixes(target, options);
  }

  project.save();
}

if (isMain(import.meta.url)) {
  const [, , podsProject, context = "{}"] = process.argv;
  const options = JSON.parse(context);
  postinstall(podsProject, options);
  applyConfigPlugins(options);
}
