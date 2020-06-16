/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @typedef {{
 *   name: string;
 *   platforms: "all" | "android" | "ios" | "macos" | "windows";
 * }} InputData
 */

const chalk = require("chalk");

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
 * @param {{ [key: string]: unknown }} obj
 * @return {string}
 */
function serialize(obj) {
  return JSON.stringify(obj, undefined, 2) + "\n";
}

/**
 * Sort the keys in specified object.
 * @param {{ [key: string]: unknown }} obj
 */
function sortByKeys(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => ({ ...sorted, [key]: obj[key] }), {});
}

/** @type {(plop: import('plop').NodePlopAPI) => void} */
module.exports = (plop) => {
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
        name: "platforms",
        message: "Which platforms do you need test apps for?",
        choices: ["all", "android", "ios", "macos", "windows"],
      },
    ],
    actions: (/** @type {InputData} */ { name, platforms }) => {
      const path = require("path");

      const exclusive = platforms !== "all";
      const includeMacOS =
        (!exclusive || platforms === "macos") &&
        isInstalled("react-native-macos", exclusive);

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
          transform: (template) => {
            const {
              name: testAppPackageName,
              version: testAppPackageVersion,
            } = require("./package.json");
            const packageJson = JSON.parse(template);
            return serialize({
              ...packageJson,
              name,
              scripts: sortByKeys({
                ...(!exclusive || platforms === "android"
                  ? {
                      "build:android":
                        "mkdirp dist/res && react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.android.jsbundle --assets-dest dist/res --reset-cache",
                    }
                  : undefined),
                ...(!exclusive || platforms === "ios"
                  ? {
                      "build:ios":
                        "mkdirp dist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist --reset-cache",
                    }
                  : undefined),
                ...(includeMacOS
                  ? {
                      "build:macos":
                        "mkdirp dist && react-native bundle --entry-file index.js --platform macos --dev true --bundle-output dist/main.macos.jsbundle --assets-dest dist --reset-cache --config=metro.config.macos.js",
                      "start:macos":
                        "react-native start --config=metro.config.macos.js",
                    }
                  : undefined),
                ...(platforms !== "macos"
                  ? { start: "react-native start" }
                  : undefined),
                ...packageJson.scripts,
              }),
              dependencies: sortByKeys({
                ...packageJson.dependencies,
                ...(includeMacOS
                  ? { "react-native-macos": "0.61.39" }
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

      if (!exclusive || platforms === "android") {
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
          transform: (template) =>
            template.replace(/5\.4\.1/, "5.6.4").replace(/5\.5/, "5.6.4"),
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
      }

      if (!exclusive || platforms === "ios") {
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
              `      project: "${prefix}ReactTestApp-Dummy.xcodeproj"`,
              "    }",
              "  }",
              "};",
              "",
            ].join("\n"),
          });
        }
      }

      if (!exclusive || platforms === "macos") {
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
          actions.push({
            type: "add",
            path: "metro.config.macos.js",
            templateFile: require.resolve(
              "react-native-macos/local-cli/generator-macos/templates/metro.config.macos.js"
            ),
          });
          if (exclusive) {
            actions.push({
              type: "add",
              path: "react-native.config.js",
              template: [
                'if (process.argv.includes("--config=metro.config.macos.js")) {',
                "  module.exports = {",
                '    reactNativePath: "node_modules/react-native-macos",',
                "  };",
                "} else {",
                "  module.exports = {",
                "    project: {",
                "      ios: {",
                '        project: "ReactTestApp-Dummy.xcodeproj",',
                "      },",
                "    },",
                "  };",
                "}",
                "",
              ].join("\n"),
            });
          }
        } else {
          console.warn(
            chalk.yellow("[WARN] ") +
              "Cannot find module 'react-native-macos'; skipping macOS target"
          );
        }
      }

      return actions;
    },
  });
};
