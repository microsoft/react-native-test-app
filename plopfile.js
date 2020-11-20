//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

/**
 * @typedef {"android" | "ios" | "macos" | "windows"} Platform
 */

/**
 * Returns whether the target platform is included.
 * @param {"all" | Platform} platform
 * @param {Platform} target
 */
function includesPlatform(platform, target) {
  const exclusive = platform !== "all";
  return (
    (!exclusive || platform === target) &&
    (target === "android" ||
      target === "ios" ||
      isInstalled(`react-native-${target}`, exclusive))
  );
}

/**
 * Returns whether the specified package is installed.
 * @param {string} pkg The target package, e.g. "react-native-macos"
 * @param {boolean} isRequired Whether the package is required
 * @return {boolean}
 */
function isInstalled(pkg, isRequired) {
  try {
    return Boolean(require.resolve(pkg));
  } catch (error) {
    if (isRequired) {
      throw error;
    }
    return false;
  }
}

/**
 * Converts an object or value to a pretty JSON string.
 * @param {Record<string, unknown>} obj
 * @return {string}
 */
function serialize(obj) {
  return JSON.stringify(obj, undefined, 2) + "\n";
}

/**
 * Sort the keys in specified object.
 * @param {Record<string, unknown>} obj
 */
function sortByKeys(obj) {
  return Object.keys(obj)
    .sort()
    .reduce(
      /** @type {(sorted: Record<string, unknown>, key: string) => Record<string, unknown>} */
      (sorted, key) => {
        sorted[key] = obj[key];
        return sorted;
      },
      {}
    );
}

/**
 * Returns scripts for specified platform.
 * @param {string} name
 * @param {"all" | Platform} targetPlatform
 * @returns {Record<string, string?>}
 */
function getScripts(name, targetPlatform) {
  /** @type {(platform: string, bundle: string, assetsDest: string) => string} */
  const rnBundle = (platform, bundle, assetsDest) =>
    `mkdirp ${assetsDest} && react-native bundle --entry-file index.js --platform ${platform} --dev true --bundle-output dist/main.${platform}.${bundle} --assets-dest ${assetsDest} --reset-cache`;

  const allScripts = {
    android: {
      android: "react-native run-android",
      "build:android": rnBundle("android", "jsbundle", "dist/res"),
      start: "react-native start",
    },
    ios: {
      "build:ios": rnBundle("ios", "jsbundle", "dist"),
      ios:
        "react-native run-ios" +
        (targetPlatform === "all" ? "" : " --project-path ."),
      start: "react-native start",
    },
    macos: {
      "build:macos": rnBundle("macos", "jsbundle", "dist"),
      macos:
        `react-native run-macos --scheme ${name}` +
        (targetPlatform === "all" ? "" : " --project-path ."),
      "start:macos": "react-native start",
    },
    windows: {
      "build:windows": `${rnBundle(
        "windows",
        "bundle",
        "dist"
      )} --config=metro.config.windows.js`,
      "start:windows": "react-native start --config=metro.config.windows.js",
      windows: `react-native run-windows --sln ${
        targetPlatform === "all" ? "windows" : ""
      }${name}.sln`,
    },
  };

  /** @type {(keyof allScripts)[]} */
  // @ts-ignore `Object.keys()` returns `string[]`
  const keys = Object.keys(allScripts);

  return keys.reduce(
    /** @type {(scripts: Record<string, string?>, platform: Platform) => Record<string, string?>} */
    (scripts, platform) => {
      if (includesPlatform(targetPlatform, platform)) {
        return {
          ...scripts,
          ...allScripts[platform],
        };
      }
      return scripts;
    },
    {}
  );
}

module.exports = (/** @type {import("plop").NodePlopAPI} */ plop) => {
  plop.setGenerator("app", {
    description: "ReactTestApp configuration",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of your test app?",
        validate: (name) => Boolean(name.trim()),
        transformer: (name) => name.replace(/[^-\w]/g, ""),
      },
      {
        type: "list",
        name: "platform",
        message: "Which platforms do you need test apps for?",
        choices: ["all", "android", "ios", "macos", "windows"],
      },
    ],
    /** @type {(answers?: { name: string; platform: "all" | Platform }) => import("node-plop").Actions} **/
    // @ts-ignore tsc seems to think `answers` is missing properties `name` and `platform`
    actions: (answers) => {
      if (!answers) {
        return [];
      }

      const chalk = require("chalk");
      const path = require("path");

      const { name, platform } = answers;

      const templateDir = path.dirname(
        require.resolve("react-native/template/package.json")
      );
      const actions = [
        {
          type: "add",
          path: ".watchmanconfig",
          templateFile: path.join(templateDir, "_watchmanconfig"),
        },
        {
          type: "add",
          path: "App.js",
          templateFile: require.resolve("react-native/template/App.js"),
        },
        {
          type: "add",
          path: "app.json",
          template: serialize({
            name,
            displayName: name,
            components: [
              {
                appKey: name,
                displayName: name,
              },
            ],
            resources: {
              android: ["dist/res", "dist/main.android.jsbundle"],
              ios: ["dist/assets", "dist/main.ios.jsbundle"],
              macos: ["dist/assets", "dist/main.macos.jsbundle"],
              windows: ["dist/assets", "dist/main.windows.bundle"],
            },
          }),
        },
        {
          type: "add",
          path: "babel.config.js",
          templateFile: require.resolve(
            "react-native/template/babel.config.js"
          ),
        },
        {
          type: "add",
          path: "index.js",
          templateFile: require.resolve("react-native/template/index.js"),
        },
        {
          type: "add",
          path: "metro.config.js",
          templateFile: path.join(__dirname, "example", "metro.config.js"),
        },
        {
          type: "add",
          path: "package.json",
          templateFile: require.resolve("react-native/template/package.json"),
          transform: (/** @type {string} */ template) => {
            const {
              name: testAppPackageName,
              version: testAppPackageVersion,
            } = require("./package.json");
            const packageJson = JSON.parse(template);
            return serialize({
              ...packageJson,
              name,
              scripts: sortByKeys({
                ...packageJson.scripts,
                ...getScripts(name, platform),
              }),
              dependencies: sortByKeys({
                ...packageJson.dependencies,
                ...(includesPlatform(platform, "macos")
                  ? { "react-native-macos": "0.63.1" }
                  : undefined),
                ...(includesPlatform(platform, "windows")
                  ? { "react-native-windows": "0.63.10" }
                  : undefined),
              }),
              devDependencies: sortByKeys({
                ...packageJson.devDependencies,
                [testAppPackageName]: testAppPackageVersion,
                mkdirp: "^1.0.0",
              }),
            });
          },
        },
      ];

      const exclusive = platform !== "all";
      if (!exclusive) {
        actions.push({
          type: "add",
          path: "react-native.config.js",
          templateFile: path.join(
            __dirname,
            "example",
            "react-native.config.js"
          ),
        });
      }

      if (!exclusive || platform === "android") {
        const prefix = exclusive ? "" : "android/";
        const androidTemplateDir = path.join(templateDir, "android");
        actions.push({
          type: "add",
          path: `${prefix}gradle/wrapper/gradle-wrapper.jar`,
          templateFile: path.join(
            androidTemplateDir,
            "gradle",
            "wrapper",
            "gradle-wrapper.jar"
          ),
        });
        actions.push({
          type: "add",
          path: `${prefix}gradle/wrapper/gradle-wrapper.properties`,
          templateFile: path.join(
            androidTemplateDir,
            "gradle",
            "wrapper",
            "gradle-wrapper.properties"
          ),
        });
        actions.push({
          type: "add",
          path: `${prefix}gradle.properties`,
          templateFile: path.join(androidTemplateDir, "gradle.properties"),
        });
        actions.push({
          type: "add",
          path: `${prefix}gradlew`,
          templateFile: path.join(androidTemplateDir, "gradlew"),
        });
        actions.push({
          type: "add",
          path: `${prefix}gradlew.bat`,
          templateFile: path.join(androidTemplateDir, "gradlew.bat"),
        });
        actions.push({
          type: "add",
          path: `${prefix}settings.gradle`,
          template: [
            "rootProject.name='example'",
            "",
            `apply from: file("${
              exclusive ? "" : "../"
            }node_modules/react-native-test-app/test-app.gradle")`,
            "applyTestAppSettings(settings)",
            "",
          ].join("\n"),
        });
        if (exclusive) {
          actions.push({
            type: "add",
            path: "react-native.config.js",
            template: [
              'const path = require("path");',
              "module.exports = {",
              "  project: {",
              "    android: {",
              '      sourceDir: ".",',
              "      manifestPath: path.relative(",
              "        __dirname,",
              "        path.join(",
              '          path.dirname(require.resolve("react-native-test-app/package.json")),',
              '          "android",',
              '          "app",',
              '          "src",',
              '          "main",',
              '          "AndroidManifest.xml"',
              "        )",
              "      ),",
              "    },",
              "  },",
              "};",
              "",
            ].join("\n"),
          });
        }
      }

      if (!exclusive || platform === "ios") {
        const prefix = exclusive ? "" : "ios/";
        actions.push({
          type: "add",
          path: `${prefix}Podfile`,
          template: [
            `require_relative '${
              exclusive ? "" : "../"
            }node_modules/react-native-test-app/test_app.rb'`,
            "",
            "workspace '{{name}}.xcworkspace'",
            "",
            "use_test_app!",
            "",
          ].join("\n"),
        });
        if (exclusive) {
          actions.push({
            type: "add",
            path: "react-native.config.js",
            template: [
              "module.exports = {",
              "  project: {",
              "    ios: {",
              `      project: "ReactTestApp-Dummy.xcodeproj"`,
              "    }",
              "  }",
              "};",
              "",
            ].join("\n"),
          });
        }
      }

      if (!exclusive || platform === "macos") {
        if (isInstalled("react-native-macos", exclusive)) {
          const prefix = exclusive ? "" : "macos/";
          actions.push({
            type: "add",
            path: `${prefix}Podfile`,
            template: [
              `require_relative '${
                exclusive ? "" : "../"
              }node_modules/react-native-test-app/macos/test_app.rb'`,
              "",
              "workspace '{{name}}.xcworkspace'",
              "",
              "use_test_app!",
              "",
            ].join("\n"),
          });
          if (exclusive) {
            actions.push({
              type: "add",
              path: "react-native.config.js",
              template: [
                "module.exports = {",
                "  project: {",
                "    ios: {",
                '      project: "ReactTestApp-Dummy.xcodeproj",',
                "    },",
                "  },",
                "};",
                "",
              ].join("\n"),
            });
          }
        } else {
          console.warn(
            `${chalk.yellow(
              "[WARN]"
            )} Cannot find module 'react-native-macos'; skipping macOS target`
          );
        }
      }

      if (!exclusive || platform === "windows") {
        if (isInstalled("react-native-windows", exclusive)) {
          actions.push({
            type: "add",
            path: "metro.config.windows.js",
            templateFile: require.resolve(
              "@react-native-windows/cli/templates/metro.config.js"
            ),
          });
          if (exclusive) {
            actions.push({
              type: "add",
              path: "react-native.config.js",
              template: [
                'const path = require("path");',
                "",
                'const sourceDir = "windows";',
                "module.exports = {",
                "  project: {",
                "    windows: {",
                "      sourceDir,",
                "      project: {",
                "        projectFile: path.relative(",
                "          path.join(__dirname, sourceDir),",
                "          path.join(",
                '            "node_modules",',
                '            ".generated",',
                '            "windows",',
                '            "ReactTestApp",',
                '            "ReactTestApp.vcxproj"',
                "          )",
                "        ),",
                "      },",
                "    },",
                "  },",
                '  reactNativePath: "node_modules/react-native-windows",',
                "};",
                "",
              ].join("\n"),
            });
          }
        } else {
          console.warn(
            `${chalk.yellow(
              "[WARN]"
            )} Cannot find module 'react-native-windows'; skipping Windows target`
          );
        }
      }

      return actions;
    },
  });

  return {
    includesPlatform,
    isInstalled,
    sortByKeys,
    getScripts,
  };
};
