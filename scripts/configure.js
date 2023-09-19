#!/usr/bin/env node
// @ts-check
"use strict";

require("./link")(module);

const chalk = require("chalk");
const fs = require("node:fs");
const path = require("node:path");
const semver = require("semver");
const { parseArgs } = require("../scripts/parseargs");
const {
  findNearest,
  getPackageVersion,
  readJSONFile,
  toVersionNumber,
  v,
} = require("./helpers");
const {
  appManifest,
  buildGradle,
  podfileIOS,
  podfileMacOS,
  reactNativeConfigAndroidFlat,
  reactNativeConfigAppleFlat,
  reactNativeConfigWindowsFlat,
  serialize,
  settingsGradle,
} = require("./template");

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
 *   templatePath?: string;
 *   testAppPath: string;
 *   targetVersion: string;
 *   platforms: Platform[];
 *   flatten: boolean;
 *   force: boolean;
 *   init: boolean;
 * }} ConfigureParams;
 *
 * @typedef {{
 *   android?: { sourceDir: string; };
 *   ios?: { sourceDir: string; };
 *   windows?: { sourceDir: string; solutionFile: string; };
 * }} ProjectConfig
 *
 * @typedef {{
 *   android: {
 *     sourceDir: string;
 *     manifestPath: string;
 *   };
 *   ios: {
 *     sourceDir?: string;
 *     project?: string;
 *   };
 *   windows: {
 *     sourceDir: string;
 *     solutionFile: string;
 *     project: { projectFile: string; };
 *   };
 * }} ProjectParams
 */

/** @type {{ encoding: "utf-8" }} */
const utf8 = { encoding: "utf-8" };

/**
 * Prints an error message to the console.
 * @param {string} message
 */
function error(message) {
  console.error(chalk.red(`[!] ${message}`));
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
  const shouldFlatten = flatten && platforms.length === 1;
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
 * Returns the version number of `@react-native-community/cli-platform-ios`.
 * @param {string} reactNativeDir
 * @returns {number}
 */
const cliPlatformIOSVersion = (() => {
  /** @type {number} */
  let version;
  /** @type {(reactNativeDir: string) => number} */
  return (reactNativeDir) => {
    if (!version) {
      version = toVersionNumber(
        getPackageVersion(
          "@react-native-community/cli-platform-ios",
          reactNativeDir
        )
      );
    }
    return version;
  };
})();

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
 * @param {string} sourceDir
 * @returns {string}
 */
function androidManifestPath(sourceDir) {
  return path.relative(
    sourceDir,
    path.join(
      path.dirname(require.resolve("../package.json")),
      "android",
      "app",
      "src",
      "main",
      "AndroidManifest.xml"
    )
  );
}

/**
 * @param {string} sourceDir
 * @returns {string | undefined}
 */
function iosProjectPath(sourceDir) {
  const rnDir = path.dirname(require.resolve("react-native/package.json"));
  const needsDummyProject = cliPlatformIOSVersion(rnDir) < v(5, 0, 2);
  if (needsDummyProject) {
    // Prior to @react-native-community/cli-platform-ios v5.0.0, `project` was
    // only used to infer `sourceDir` and `podfile`.
    return path.join(sourceDir, "ReactTestApp-Dummy.xcodeproj");
  }

  const needsProjectPath = cliPlatformIOSVersion(rnDir) < v(8, 0, 0);
  if (needsProjectPath) {
    // `sourceDir` and `podfile` detection was fixed in
    // @react-native-community/cli-platform-ios v5.0.2 (see
    // https://github.com/react-native-community/cli/pull/1444).
    return "node_modules/.generated/ios/ReactTestApp.xcodeproj";
  }

  return undefined;
}

/**
 * @param {string} sourceDir
 * @returns {ProjectParams["windows"]["project"]}
 */
function windowsProjectPath(sourceDir) {
  return {
    projectFile: path.relative(
      sourceDir,
      path.join(
        "node_modules",
        ".generated",
        "windows",
        "ReactTestApp",
        "ReactTestApp.vcxproj"
      )
    ),
  };
}

/**
 * @param {ProjectConfig} configuration
 * @returns {Partial<ProjectParams>}
 */
function configureProjects({ android, ios, windows }) {
  const reactNativeConfig = findNearest("react-native.config.js");
  if (!reactNativeConfig) {
    throw new Error("Failed to find `react-native.config.js`");
  }

  /** @type {Partial<ProjectParams>} */
  const config = {};
  const projectRoot = path.dirname(reactNativeConfig);

  if (android) {
    config.android = {
      sourceDir: android.sourceDir,
      manifestPath: androidManifestPath(
        path.resolve(projectRoot, android.sourceDir)
      ),
    };
  }

  if (ios) {
    // `ios.sourceDir` was added in 8.0.0
    // https://github.com/react-native-community/cli/commit/25eec7c695f09aea0ace7c0b591844fe8828ccc5
    const rnDir = path.dirname(require.resolve("react-native/package.json"));
    if (cliPlatformIOSVersion(rnDir) >= v(8, 0, 0)) {
      config.ios = ios;
    }
    const project = iosProjectPath(path.basename(ios.sourceDir));
    if (project) {
      config.ios = config.ios ?? {};
      config.ios.project = project;
    }
  }

  if (windows && fs.existsSync(windows.solutionFile)) {
    config.windows = {
      sourceDir: windows.sourceDir,
      solutionFile: path.relative(windows.sourceDir, windows.solutionFile),
      project: windowsProjectPath(path.resolve(projectRoot, windows.sourceDir)),
    };
  }

  return config;
}

/**
 * Returns the appropriate `react-native.config.js` for specified parameters.
 * @param {ConfigureParams} params
 * @returns {string | FileCopy}
 */
function reactNativeConfig({ name, testAppPath, platforms, flatten }) {
  const shouldFlatten = flatten && platforms.length === 1;
  if (shouldFlatten) {
    switch (platforms[0]) {
      case "android":
        return reactNativeConfigAndroidFlat();

      case "ios":
      case "macos":
        return reactNativeConfigAppleFlat();

      case "windows":
        return reactNativeConfigWindowsFlat(name);

      default:
        throw new Error(`Unknown platform: ${platforms[0]}`);
    }
  }

  const config = path.join(testAppPath, "example", "react-native.config.js");
  return fs.readFileSync(config, utf8).replace(/Example/g, name);
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
    /** @type {Platform} */ platform,
    disableCache = false
  ) => {
    if (disableCache || typeof configuration === "undefined") {
      const { name, templatePath, testAppPath, flatten, init } = params;

      // `.gitignore` files are only renamed when published.
      const gitignore = ["_gitignore", ".gitignore"].find((filename) => {
        return fs.existsSync(path.join(testAppPath, "example", filename));
      });
      if (!gitignore) {
        throw new Error("Failed to find `.gitignore`");
      }

      const rnDir = path.dirname(require.resolve("react-native/package.json"));
      const projectPathFlag =
        flatten && cliPlatformIOSVersion(rnDir) < v(8, 0, 0)
          ? " --project-path ."
          : "";
      const testAppRelPath = projectRelativePath(params);
      const templateDir =
        templatePath ||
        path.relative(
          process.cwd(),
          path.dirname(require.resolve("react-native/template/package.json"))
        );

      configuration = {
        common: {
          files: {
            ".gitignore": {
              source: path.join(testAppPath, "example", gitignore),
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
                  // starting with RN 0.71, App.js is no longer in the template
                  ...(fs.existsSync(path.join(templateDir, "App.tsx"))
                    ? {
                        "App.tsx": {
                          source: path.join(templateDir, "App.tsx"),
                        },
                      }
                    : {
                        "App.js": { source: path.join(templateDir, "App.js") },
                      }),
                  "app.json": appManifest(name),
                  "index.js": {
                    source: path.join(templateDir, "index.js"),
                  },
                  "package.json": fs
                    .readFileSync(path.join(templateDir, "package.json"), utf8)
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
            "build.gradle": buildGradle(testAppRelPath),
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
            "settings.gradle": settingsGradle(name, testAppRelPath),
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
            Podfile: podfileIOS(name, testAppRelPath),
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
            Podfile: podfileMacOS(name, testAppRelPath),
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
              source: path.join(testAppPath, "example", "windows", gitignore),
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
function gatherConfig(params, disableCache = false) {
  const { flatten, platforms } = params;
  const shouldFlatten = flatten && platforms.length === 1;
  const options = { ...params, flatten: shouldFlatten };
  const config = (() => {
    return platforms.reduce(
      (config, platform) => {
        const { getDependencies, ...platformConfig } = getConfig(
          options,
          platform,
          disableCache
        );

        const dependencies = getDependencies && getDependencies(params);
        if (!dependencies) {
          /* node:coverage ignore next */
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

  return mergeConfig(getConfig(options, "common", disableCache), config);
}

/**
 * Retrieves app name from the app manifest.
 * @param {string} packagePath
 * @returns {string}
 */
function getAppName(packagePath, fs = require("node:fs")) {
  try {
    const { name } = readJSONFile(path.join(packagePath, "app.json"), fs);
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
function isDestructive(
  packagePath,
  { files, oldFiles },
  fs = require("node:fs")
) {
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
function removeAllFiles(files, destination, fs = require("node:fs/promises")) {
  const options = { force: true, maxRetries: 3, recursive: true };
  return Promise.all(
    files.map((filename) => fs.rm(path.join(destination, filename), options))
  );
}

/**
 * Returns the package manifest with additions for react-native-test-app.
 * @param {fs.PathLike} path
 * @param {Configuration} config
 * @returns {Record<string, unknown>}
 */
function updatePackageManifest(
  path,
  { dependencies, scripts },
  fs = require("node:fs")
) {
  const manifest = readJSONFile(path, fs);

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
function writeAllFiles(files, destination, fs = require("node:fs/promises")) {
  const options = { recursive: true, mode: 0o755 };
  return Promise.all(
    Object.keys(files).map(async (filename) => {
      const content = files[filename];
      if (!content) {
        return;
      }

      const file = path.join(destination, filename);
      await fs.mkdir(path.dirname(file), options);
      if (typeof content === "string") {
        await fs.writeFile(file, content);
      } else {
        try {
          await fs.copyFile(content.source, file);
        } catch (e) {
          if (path.basename(content.source) !== ".gitignore") {
            throw e;
          }

          // This is a special case for `.gitignore` files. On CI, and only
          // during testing, there is some sort of race condition that causes
          // the files to be renamed _after_ `getConfig()` is called, even
          // though the renaming should've happened during `npm pack`, long
          // before this script is ever called.
          const sourceDir = path.dirname(content.source);
          await fs.copyFile(path.join(sourceDir, "_gitignore"), file);
        }
      }
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

exports.androidManifestPath = androidManifestPath;
exports.configure = configure;
exports.configureProjects = configureProjects;
exports.error = error;
exports.gatherConfig = gatherConfig;
exports.getAppName = getAppName;
exports.getConfig = getConfig;
exports.getPlatformPackage = getPlatformPackage;
exports.iosProjectPath = iosProjectPath;
exports.isDestructive = isDestructive;
exports.mergeConfig = mergeConfig;
exports.projectRelativePath = projectRelativePath;
exports.reactNativeConfig = reactNativeConfig;
exports.readJSONFile = readJSONFile;
exports.removeAllFiles = removeAllFiles;
exports.sortByKeys = sortByKeys;
exports.updatePackageManifest = updatePackageManifest;
exports.warn = warn;
exports.windowsProjectPath = windowsProjectPath;
exports.writeAllFiles = writeAllFiles;

if (require.main === module) {
  /** @type {Platform[]} */
  const platformChoices = ["android", "ios", "macos", "windows"];
  const defaultPlatforms = platformChoices.join(", ");

  /** @type {(input: string | string[]) => Platform[] } */
  const validatePlatforms = (input) => {
    const platforms = Array.isArray(input) ? input : [input];
    for (const p of platforms) {
      switch (p) {
        case "android":
        case "ios":
        case "macos":
        case "windows":
          break;
        default:
          throw new Error(`Unknown platform: ${p}`);
      }
    }
    return /** @type {Platform[]} */ (platforms);
  };

  parseArgs(
    "Configures React Test App in an existing package",
    {
      flatten: {
        description:
          "Flatten the directory structure (when only one platform is selected)",
        type: "boolean",
        default: false,
      },
      force: {
        description: "Allow destructive operations",
        type: "boolean",
        short: "f",
        default: false,
      },
      init: {
        description: "Initialize a new project",
        type: "boolean",
        default: false,
      },
      package: {
        description:
          "Path of the package to modify (defaults to current directory)",
        type: "string",
        default: ".",
      },
      platforms: {
        description: `Platforms to configure (defaults to [${defaultPlatforms}])`,
        type: "string",
        multiple: true,
        short: "p",
        default: platformChoices,
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
      process.exitCode = configure({
        name: typeof name === "string" && name ? name : getAppName(packagePath),
        packagePath,
        testAppPath: path.dirname(require.resolve("../package.json")),
        targetVersion: getPackageVersion("react-native"),
        platforms: validatePlatforms(platforms),
        flatten,
        force,
        init,
      });
    }
  );
}
