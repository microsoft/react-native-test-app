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
          template: JSON.stringify(
            {
              name,
              displayName: name,
              components: {
                [name]: {
                  displayName: name,
                },
              },
              resources: [
                "dist/res",
                "dist/assets",
                "dist/main.jsbundle"
              ],
            },
            undefined,
            2
          ),
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
          templateFile: require.resolve(
            "react-native/template/metro.config.js"
          ),
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
            const devDependencies = {
              ...packageJson.devDependencies,
              [testAppPackageName]: testAppPackageVersion,
              mkdirp: "^1.0.0",
              // TODO(tido64): Remove these when https://github.com/microsoft/react-native-test-app/pull/17 is merged
              "@react-native-community/cli": "^4.3.0",
              "@react-native-community/cli-platform-android": "^4.3.0",
              "@react-native-community/cli-platform-ios": "^4.3.0",
              "@react-native-community/eslint-config": "^0.0.5",
            };
            return JSON.stringify(
              {
                ...packageJson,
                name,
                scripts: {
                  "build:android":
                    "mkdirp dist/res && react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.jsbundle --assets-dest dist/res --reset-cache",
                  "build:ios":
                    "mkdirp dist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.jsbundle --assets-dest dist --reset-cache",
                  ...packageJson.scripts,
                },
                devDependencies: Object.keys(devDependencies)
                  .sort()
                  .reduce(
                    (deps, key) => ({ ...deps, [key]: devDependencies[key] }),
                    {}
                  ),
              },
              undefined,
              2
            );
          },
        },
      ];

      const exclusive = platforms !== "all";

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
          transform: (template) => template.replace(/5\.4\.1/, "5.6.4"),
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
            `apply from: file("${exclusive ? "" : "../"}node_modules/react-native-test-app/test-app.gradle")`,
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
            "use_test_app!(__dir__)",
            "",
          ].join("\n"),
        });
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

      return actions;
    },
  });
};
