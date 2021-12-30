#!/usr/bin/env node
//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

require("./link")(module);

const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const semver = require("semver");

/**
 * @typedef {{ source: string; }} FileCopy;
 *
 * @typedef {{
 *   files: Record<string, string | FileCopy>;
 *   oldFiles: string[];
 *   scripts: Record<string, string>;
 *   dependencies: Record<string, string>;
 *   getDependencies?: (params: ConfigureParams) => Record<string, string> | undefined;
 * }} Configuration;
 *
 * @typedef {{
 *   common: Configuration;
 *   android: Configuration;
 *   ios: Configuration;
 *   macos: Configuration;
 *   windows: Configuration;
 * }} PlatformConfiguration;
 *
 * @typedef {keyof PlatformConfiguration} Platform;
 *
 * @typedef {{
 *   name: string;
 *   packagePath: string;
 *   testAppPath: string;
 *   targetVersion: string;
 *   platforms: Platform[];
 *   flatten: boolean;
 *   force: boolean;
 *   init: boolean;
 * }} ConfigureParams;
 */

/**
 * Prints an error message to the console.
 * @param {string} message
 */
function error(message) {
  console.error(chalk.red(`[!] ${message}`));
}

/**
 * Returns whether the specified package is installed.
 * @param {string} pkg The target package, e.g. "react-native-macos"
 * @param {boolean=} isRequired Whether the package is required
 * @return {boolean}
 */
function isInstalled(pkg, isRequired = false) {
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
 * Joins all specified lines into a single string.
 * @param {...string} lines
 * @returns {string}
 */
function join(...lines) {
  return lines.join("\n");
}

/**
 * Merges specified configurations.
 * @param {Configuration} lhs
 * @param {Configuration} rhs
 * @returns {Configuration}
 */
function mergeConfig(lhs, rhs) {
  return {
    files: {
      ...lhs.files,
      ...rhs.files,
    },
    oldFiles: [...lhs.oldFiles, ...rhs.oldFiles],
    scripts: {
      ...lhs.scripts,
      ...rhs.scripts,
    },
    dependencies: {
      ...lhs.dependencies,
      ...rhs.dependencies,
    },
  };
}

/**
 * Merges two objects.
 * @param {unknown} lhs
 * @param {Record<string, unknown>} rhs
 * @returns {Record<string, unknown>}
 */
function mergeObjects(lhs, rhs) {
  return typeof lhs === "object"
    ? sortByKeys({ ...lhs, ...rhs })
    : sortByKeys(rhs);
}

/**
 * Returns the relative path to react-native-test-app depending on current
 * running mode.
 * @param {ConfigureParams} params
 * @returns {string}
 */
function projectRelativePath({
  packagePath,
  testAppPath,
  platforms,
  flatten,
  init,
}) {
  const shouldFlatten = platforms.length === 1 && flatten;
  if (init) {
    const prefix = shouldFlatten ? "" : "../";
    return `${prefix}node_modules/react-native-test-app`;
  }

  const normalizedPackagePath = packagePath.replace(/\\/g, "/");
  return path.posix.relative(
    shouldFlatten ? normalizedPackagePath : normalizedPackagePath + "/platform",
    testAppPath.replace(/\\/g, "/")
  );
}

/**
 * Reads and parses JSON file at specified path.
 * @param {fs.PathLike} path
 * @returns {Record<string, unknown>}
 */
function readJSONFile(path) {
  return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }));
}

/**
 * Returns whether installed package satisfies specified version range.
 * @param {string} pkg
 * @param {string} versionRange
 * @returns {boolean}
 */
function packageSatisfiesVersionRange(pkg, versionRange) {
  const { version } = require(`${pkg}/package.json`);
  return semver.satisfies(version, versionRange);
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
    .reduce((sorted, key) => {
      sorted[key] = obj[key];
      return sorted;
    }, /** @type {Record<string, unknown>} */ ({}));
}

/**
 * Prints a warning message to the console.
 * @param {string} message
 * @param {string=} tag
 */
function warn(message, tag = "[!]") {
  console.warn(chalk.yellow(`${tag} ${message}`));
}

/**
 * Returns platform package at target version if it satisfies version range.
 * @param {"react-native" | "react-native-macos" | "react-native-windows"} packageName
 * @param {string} targetVersion
 * @returns {Record<string, string> | undefined}
 */
function getPlatformPackage(packageName, targetVersion) {
  const v = semver.coerce(targetVersion);
  if (!v) {
    throw new Error(`Invalid ${packageName} version: ${targetVersion}`);
  }

  const { peerDependencies } = require("../package.json");
  const versionRange = peerDependencies[packageName];
  if (!semver.satisfies(v.version, versionRange)) {
    warn(
      `${packageName}@${v.major}.${v.minor} cannot be added because it does not exist or is unsupported`
    );
    return undefined;
  }

  return { [packageName]: `^${v.major}.${v.minor}.0` };
}

/**
 * Returns the appropriate `react-native.config.js` for specified parameters.
 * @param {ConfigureParams} params
 * @returns {string | FileCopy}
 */
function reactNativeConfig({ name, testAppPath, platforms, flatten }) {
  const shouldFlatten = platforms.length === 1 && flatten;
  if (shouldFlatten) {
    switch (platforms[0]) {
      case "android":
        return join(
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
          ""
        );

      case "macos":
      case "ios":
        return join(
          "const {",
          "  packageSatisfiesVersionRange,",
          '} = require("react-native-test-app/scripts/configure");',
          "module.exports = {",
          "  project: {",
          "    ios: {",
          "      project: packageSatisfiesVersionRange(",
          '        "@react-native-community/cli-platform-ios",',
          '        "<5.0.2"',
          "      )",
          '        ? "ReactTestApp-Dummy.xcodeproj"',
          '        : "node_modules/.generated/ios/ReactTestApp.xcodeproj",',
          "    }",
          "  }",
          "};",
          ""
        );

      case "windows":
        return join(
          'const path = require("path");',
          "",
          'const sourceDir = "windows";',
          "module.exports = {",
          "  project: {",
          "    windows: {",
          "      sourceDir,",
          `      solutionFile: "${name}.sln",`,
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
          ""
        );

      default:
        throw new Error(`Unknown platform: ${platforms[0]}`);
    }
  }

  const config = path.join(testAppPath, "example", "react-native.config.js");
  return fs
    .readFileSync(config, { encoding: "utf-8" })
    .replace(/Example/g, name);
}

/**
 * Returns a {@link Configuration} object for specified platform.
 *
 * A {@link Configuration} object consists of four main parts:
 *
 * - `files`: A filename/content map of files to create. The content of a file
 *   is either generated from {@link ConfigureParams}, or is copied from
 *   somewhere. If the file is copied, the content is a {@link FileCopy} object
 *   instead of a string.
 * - `oldFiles`: A list of files that will be deleted if found.
 * - `scripts`: Scripts that will be added to `package.json`.
 * - `getDependencies`: A function that returns dependencies that will be added
 *   to `package.json`. This function ensures that the returned dependencies are
 *   correct for the specified {@link ConfigureParams}, e.g.
 *   `react-native-macos`@^0.63 when the project is using `react-native`@0.63.4.
 *
 * There is a {@link Configuration} object for each supported platform.
 * Additionally, there is a common {@link Configuration} object that is always
 * included by {@link gatherConfig} during {@link configure}.
 */
const getConfig = (() => {
  /** @type {PlatformConfiguration} */
  let configuration;

  return (
    /** @type {ConfigureParams} */ params,
    /** @type {Platform} */ platform
  ) => {
    if (
      typeof configuration === "undefined" ||
      "JEST_WORKER_ID" in process.env // skip caching when testing
    ) {
      const { name, testAppPath, flatten, init } = params;
      const projectPathFlag = flatten ? " --project-path ." : "";
      const testAppRelPath = projectRelativePath(params);
      const templateDir = path.relative(
        process.cwd(),
        path.dirname(require.resolve("react-native/template/package.json"))
      );
      configuration = {
        common: {
          files: {
            ".gitignore": {
              source: path.join(testAppPath, "example", ".gitignore"),
            },
            ".watchmanconfig": {
              source: path.join(templateDir, "_watchmanconfig"),
            },
            "babel.config.js": {
              source: path.join(templateDir, "babel.config.js"),
            },
            "metro.config.js": {
              source: path.join(testAppPath, "example", "metro.config.js"),
            },
            "react-native.config.js": reactNativeConfig(params),
            ...(!init
              ? undefined
              : {
                  "App.js": {
                    source: path.join(templateDir, "App.js"),
                  },
                  "app.json": serialize({
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
                  "index.js": {
                    source: path.join(templateDir, "index.js"),
                  },
                  "package.json": fs
                    .readFileSync(path.join(templateDir, "package.json"), {
                      encoding: "utf-8",
                    })
                    .replace(/HelloWorld/g, name),
                }),
          },
          oldFiles: [],
          scripts: {
            start: "react-native start",
          },
          dependencies: {},
          getDependencies: () => ({}),
        },
        android: {
          files: {
            "build.gradle": join(
              "buildscript {",
              `    def androidTestAppDir = "${testAppRelPath}/android"`,
              '    apply(from: "${androidTestAppDir}/dependencies.gradle")',
              "",
              "    repositories {",
              "        mavenCentral()",
              "        google()",
              "    }",
              "",
              "    dependencies {",
              `        classpath "com.android.tools.build:gradle:$androidPluginVersion"`,
              `        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"`,
              "    }",
              "}",
              ""
            ),
            "gradle/wrapper/gradle-wrapper.jar": {
              source: path.join(
                testAppPath,
                "example",
                "android",
                "gradle",
                "wrapper",
                "gradle-wrapper.jar"
              ),
            },
            "gradle/wrapper/gradle-wrapper.properties": {
              source: path.join(
                testAppPath,
                "example",
                "android",
                "gradle",
                "wrapper",
                "gradle-wrapper.properties"
              ),
            },
            "gradle.properties": {
              source: path.join(
                testAppPath,
                "example",
                "android",
                "gradle.properties"
              ),
            },
            gradlew: {
              source: path.join(testAppPath, "example", "android", "gradlew"),
            },
            "gradlew.bat": {
              source: path.join(
                testAppPath,
                "example",
                "android",
                "gradlew.bat"
              ),
            },
            "settings.gradle": join(
              "pluginManagement {",
              "    repositories {",
              "        gradlePluginPortal()",
              "        mavenLocal()",
              "        google()",
              "    }",
              "}",
              "",
              `rootProject.name = "${name}"`,
              "",
              `apply(from: "${testAppRelPath}/test-app.gradle")`,
              "applyTestAppSettings(settings)",
              ""
            ),
          },
          oldFiles: [],
          scripts: {
            android: "react-native run-android",
            "build:android":
              "mkdirp dist/res && react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.android.jsbundle --assets-dest dist/res",
          },
          dependencies: {},
          getDependencies: () => ({}),
        },
        ios: {
          files: {
            Podfile: join(
              `require_relative '${testAppRelPath}/test_app'`,
              "",
              // Use a more recent version of Flipper to avoid build
              // break in Xcode 12.5.
              // See https://github.com/facebook/react-native/issues/31179.
              "use_flipper!({ 'Flipper' => '0.75.1', 'Flipper-Folly' => '2.5.3' })",
              "",
              `workspace '${name}.xcworkspace'`,
              "",
              `use_test_app!`,
              ""
            ),
          },
          oldFiles: [
            "Podfile.lock",
            "Pods",
            `${name}.xcodeproj`,
            `${name}.xcworkspace`,
          ],
          scripts: {
            "build:ios":
              "mkdirp dist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
            ios: `react-native run-ios${projectPathFlag}`,
          },
          dependencies: {},
          getDependencies: () => ({}),
        },
        macos: {
          files: {
            Podfile: join(
              `require_relative '${testAppRelPath}/macos/test_app'`,
              "",
              `workspace '${name}.xcworkspace'`,
              "",
              `use_test_app!`,
              ""
            ),
          },
          oldFiles: [
            "Podfile.lock",
            "Pods",
            `${name}.xcodeproj`,
            `${name}.xcworkspace`,
          ],
          scripts: {
            "build:macos":
              "mkdirp dist && react-native bundle --entry-file index.js --platform macos --dev true --bundle-output dist/main.macos.jsbundle --assets-dest dist",
            macos: `react-native run-macos --scheme ${name}${projectPathFlag}`,
          },
          dependencies: {},
          getDependencies: ({ targetVersion }) => {
            return getPlatformPackage("react-native-macos", targetVersion);
          },
        },
        windows: {
          files: {
            ".gitignore": {
              source: path.join(
                testAppPath,
                "example",
                "windows",
                ".gitignore"
              ),
            },
          },
          oldFiles: [
            `${name}.sln`,
            `${name}.vcxproj`,
            path.join(name, `${name}.vcxproj`),
          ],
          scripts: {
            "build:windows":
              "mkdirp dist && react-native bundle --entry-file index.js --platform windows --dev true --bundle-output dist/main.windows.bundle --assets-dest dist",
            windows: `react-native run-windows --sln windows/${name}.sln`,
          },
          dependencies: {},
          getDependencies: ({ targetVersion }) => {
            return getPlatformPackage("react-native-windows", targetVersion);
          },
        },
      };
    }
    return configuration[platform];
  };
})();

/**
 * Collects and returns configuration for all specified platforms.
 * @param {ConfigureParams} params
 * @returns Configuration
 */
function gatherConfig(params) {
  const { flatten, platforms } = params;
  const config = (() => {
    const shouldFlatten = platforms.length === 1 && flatten;
    const options = { ...params, flatten: shouldFlatten };
    return platforms.reduce(
      (config, platform) => {
        const { getDependencies, ...platformConfig } = getConfig(
          options,
          platform
        );

        const dependencies = getDependencies && getDependencies(params);
        if (!dependencies) {
          /* istanbul ignore next */
          return config;
        }

        return mergeConfig(config, {
          ...platformConfig,
          dependencies,
          files: shouldFlatten
            ? platformConfig.files
            : Object.fromEntries(
                // Map each file into its platform specific folder, e.g.
                // `Podfile` -> `ios/Podfile`
                Object.entries(platformConfig.files).map(
                  ([filename, content]) => [
                    path.join(platform, filename),
                    content,
                  ]
                )
              ),
          oldFiles: shouldFlatten
            ? platformConfig.oldFiles
            : platformConfig.oldFiles.map((file) => {
                return path.join(platform, file);
              }),
        });
      },
      /** @type {Configuration} */ ({
        scripts: {},
        dependencies: {},
        files: {},
        oldFiles: [],
      })
    );
  })();

  if (
    Object.keys(config.scripts).length === 0 &&
    Object.keys(config.dependencies).length === 0 &&
    Object.keys(config.files).length === 0 &&
    config.oldFiles.length === 0
  ) {
    return config;
  }

  return mergeConfig(getConfig(params, "common"), config);
}

/**
 * Retrieves app name from the app manifest.
 * @param {string} packagePath
 * @returns {string}
 */
function getAppName(packagePath) {
  try {
    const { name } = readJSONFile(path.join(packagePath, "app.json"));
    if (typeof name === "string" && name) {
      return name;
    }
  } catch (_) {
    // No name? Use fallback.
  }

  warn("Could not determine app name; using 'ReactTestApp'");
  return "ReactTestApp";
}

/**
 * Returns whether destructive operations will be required.
 * @param {string} packagePath
 * @param {Configuration} config
 * @returns {boolean}
 */
function isDestructive(packagePath, { files, oldFiles }) {
  const modified = Object.keys(files).reduce((result, file) => {
    const targetPath = path.join(packagePath, file);
    if (fs.existsSync(targetPath)) {
      result.push(targetPath);
    }
    return result;
  }, /** @type {string[]} */ ([]));

  const removed = oldFiles.reduce((result, file) => {
    const targetPath = path.join(packagePath, file);
    if (fs.existsSync(targetPath)) {
      result.push(targetPath);
    }
    return result;
  }, /** @type {string[]} */ ([]));

  if (modified.length > 0 || removed.length > 0) {
    if (modified.length > 0) {
      warn("The following files will be overwritten:");
      modified.sort().forEach((file) => warn(file, "    "));
    }
    if (removed.length > 0) {
      warn("The following files will be removed:");
      removed.sort().forEach((file) => warn(file, "    "));
    }
    return true;
  }

  return false;
}

/**
 * Removes all specified files on disk.
 * @param {Configuration["oldFiles"]} files
 * @param {string} destination
 * @returns {Promise<void[]>}
 */
function removeAllFiles(files, destination) {
  /** @type {(p: string, cb: (error?: Error | null) => void) => void} */
  const rimraf = require("rimraf");
  return Promise.all(
    files.map(
      /** @type {(filename: string) => Promise<void>} */
      (filename) =>
        new Promise((resolve, reject) => {
          rimraf(path.join(destination, filename), (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        })
    )
  );
}

/**
 * Returns the package manifest with additions for react-native-test-app.
 * @param {fs.PathLike} path
 * @param {Configuration} config
 * @returns {Record<string, unknown>}
 */
function updatePackageManifest(path, { dependencies, scripts }) {
  const manifest = readJSONFile(path);

  manifest["scripts"] = mergeObjects(manifest["scripts"], scripts);

  manifest["dependencies"] = mergeObjects(
    manifest["dependencies"],
    dependencies
  );

  const {
    name: reactTestAppName,
    version: reactTestAppVersion,
  } = require("../package.json");
  manifest["devDependencies"] = mergeObjects(manifest["devDependencies"], {
    [reactTestAppName]: `^${reactTestAppVersion}`,
    mkdirp: "^1.0.0",
  });

  return manifest;
}

/**
 * Writes all specified files to disk.
 * @param {Configuration["files"]} files
 * @param {string} destination
 * @returns {Promise<void[]>}
 */
function writeAllFiles(files, destination) {
  const options = { recursive: true, mode: 0o755 };
  return Promise.all(
    Object.keys(files).map((filename) => {
      const content = files[filename];
      if (!content) {
        return Promise.resolve();
      }

      const file = path.join(destination, filename);
      /** @type {Promise<void>} */
      const p = new Promise((resolve, reject) =>
        fs.mkdir(path.dirname(file), options, (error) => {
          // Calling `fs.mkdir()` when `path` is a directory that exists results
          // in an error only when `recursive` is false.
          if (error) {
            reject(error);
          } else {
            /** @type {(error: Error | null) => void} */
            const callback = (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            };
            if (typeof content === "string") {
              fs.writeFile(file, content, callback);
            } else {
              fs.copyFile(content.source, file, callback);
            }
          }
        })
      );
      return p;
    })
  );
}

/**
 * Configure specified package to use react-native-test-app.
 * @param {ConfigureParams} params
 * @returns {number}
 */
function configure(params) {
  const { force, packagePath } = params;
  const config = gatherConfig(params);

  if (!force && isDestructive(packagePath, config)) {
    error("Destructive file operations are required.");
    console.log(
      `Re-run with ${chalk.bold("--force")} if you're fine with this.`
    );
    return 1;
  }

  const { files, oldFiles } = config;

  writeAllFiles(files, packagePath).then(() => {
    const packageManifest = path.join(packagePath, "package.json");
    const newPackageManifest = updatePackageManifest(packageManifest, config);
    fs.writeFile(
      packageManifest,
      serialize(newPackageManifest),
      (/** @type {Error | null} */ error) => {
        if (error) {
          throw error;
        }
      }
    );
  });

  removeAllFiles(oldFiles, packagePath);

  return 0;
}

if (require.main === module) {
  /** @type {Platform[]} */
  const platformChoices = ["android", "ios", "macos", "windows"];
  const { version: targetVersion } = require("react-native/package.json");

  require("yargs").usage(
    "$0 [options]",
    "Configures React Test App in an existing package",
    {
      flatten: {
        default: false,
        description:
          "Flatten the directory structure (when only one platform is selected)",
        type: "boolean",
      },
      force: {
        alias: "f",
        default: false,
        description: "Allow destructive operations",
        type: "boolean",
      },
      init: {
        default: false,
        description: "Initialize a new project",
        type: "boolean",
      },
      package: {
        default: ".",
        description: "Path of the package to modify",
        type: "string",
      },
      platforms: {
        alias: "p",
        choices: platformChoices,
        default: platformChoices,
        description: "Platforms to configure",
        type: "array",
      },
    },
    ({
      _: { [0]: name },
      flatten,
      force,
      init,
      package: packagePath,
      platforms,
    }) => {
      const result = configure({
        name: typeof name === "string" && name ? name : getAppName(packagePath),
        packagePath,
        testAppPath: path.resolve(__dirname, ".."),
        targetVersion,
        platforms,
        flatten,
        force,
        init,
      });
      if (result !== 0) {
        process.exit(result);
      }
    }
  ).argv;
}

exports.configure = configure;
exports.error = error;
exports.gatherConfig = gatherConfig;
exports.getAppName = getAppName;
exports.getConfig = getConfig;
exports.getPlatformPackage = getPlatformPackage;
exports.isDestructive = isDestructive;
exports.isInstalled = isInstalled;
exports.join = join;
exports.mergeConfig = mergeConfig;
exports.packageSatisfiesVersionRange = packageSatisfiesVersionRange;
exports.projectRelativePath = projectRelativePath;
exports.reactNativeConfig = reactNativeConfig;
exports.readJSONFile = readJSONFile;
exports.removeAllFiles = removeAllFiles;
exports.sortByKeys = sortByKeys;
exports.updatePackageManifest = updatePackageManifest;
exports.warn = warn;
exports.writeAllFiles = writeAllFiles;
