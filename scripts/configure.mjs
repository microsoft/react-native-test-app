#!/usr/bin/env node
// @ts-check
import * as nodefs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import semverCoerce from "semver/functions/coerce.js";
import semverSatisfies from "semver/functions/satisfies.js";
import { cliPlatformIOSVersion } from "./configure-projects.js";
import {
  getPackageVersion,
  isMain,
  memo,
  readJSONFile,
  readTextFile,
  toVersionNumber,
  v,
} from "./helpers.js";
import {
  appManifest,
  buildGradle,
  podfile,
  reactNativeConfigAndroidFlat,
  reactNativeConfigAppleFlat,
  reactNativeConfigWindowsFlat,
  serialize,
  settingsGradle,
} from "./template.mjs";
import * as colors from "./utils/colors.mjs";
import { downloadPackage } from "./utils/npm.mjs";
import { parseArgs } from "./utils/parseargs.mjs";

/**
 * @typedef {import("./types.js").Configuration} Configuration
 * @typedef {import("./types.js").ConfigureParams} ConfigureParams
 * @typedef {import("./types.js").FileCopy} FileCopy
 * @typedef {Required<import("./types.js").Manifest>} Manifest
 * @typedef {import("./types.js").PlatformConfiguration} PlatformConfiguration
 * @typedef {import("./types.js").PlatformPackage} PlatformPackage
 * @typedef {import("./types.js").Platform} Platform
 */

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

/** @type {() => Manifest} */
const readManifest = memo(() =>
  readJSONFile(new URL("../package.json", import.meta.url))
);

/**
 * Prints an error message to the console.
 * @param {string} message
 */
export function error(message) {
  console.error(colors.red(`[!] ${message}`));
}

/**
 * @param {string} targetVersion
 * @returns {Promise<string | undefined>}
 */
async function findTemplateDir(targetVersion) {
  if (toVersionNumber(targetVersion) < v(0, 75, 0)) {
    // Let `getConfig` try to find the template inside `react-native`
    return undefined;
  }

  const [major, minor = 0] = targetVersion.split(".");
  const output = await downloadPackage(
    "@react-native-community/template",
    `${major}.${minor}`,
    true
  );
  return path.join(output, "template");
}

/**
 * Merges specified configurations.
 * @param {Configuration} lhs
 * @param {Configuration} rhs
 * @returns {Configuration}
 */
export function mergeConfig(lhs, rhs) {
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
 * Sort the keys in specified object.
 * @param {Record<string, unknown>} obj
 */
export function sortByKeys(obj) {
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
export function warn(message, tag = "[!]") {
  console.warn(colors.yellow(`${tag} ${message}`));
}

/**
 * Returns the default npm package name for the specified platform.
 * @param {Platform} platform
 * @returns {PlatformPackage}
 */
export function getDefaultPlatformPackageName(platform) {
  if (platform === "common") {
    return "react-native";
  }

  const { defaultPlatformPackages } = readManifest();
  const pkgName = defaultPlatformPackages[platform];
  if (!pkgName) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return pkgName;
}

/**
 * Returns platform package at target version if it satisfies version range.
 * @param {Platform} platform
 * @param {string} targetVersion
 * @returns {Record<string, string> | undefined}
 */
export function getPlatformPackage(platform, targetVersion) {
  const packageName = getDefaultPlatformPackageName(platform);
  if (packageName === "react-native") {
    return {};
  }

  const v = semverCoerce(targetVersion);
  if (!v) {
    throw new Error(`Invalid ${packageName} version: ${targetVersion}`);
  }

  const { peerDependencies } = readManifest();
  const versionRange = peerDependencies[packageName];
  if (!semverSatisfies(v.version, versionRange)) {
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
export function reactNativeConfig(
  { name, testAppPath, platforms, flatten },
  fs = nodefs
) {
  const shouldFlatten = flatten && platforms.length === 1;
  if (shouldFlatten) {
    switch (platforms[0]) {
      case "android":
        return reactNativeConfigAndroidFlat();

      case "ios":
      case "macos":
      case "visionos":
        return reactNativeConfigAppleFlat();

      case "windows":
        return reactNativeConfigWindowsFlat(name);

      default:
        throw new Error(`Unknown platform: ${platforms[0]}`);
    }
  }

  const config = path.join(testAppPath, "example", "react-native.config.js");
  return readTextFile(config, fs).replaceAll("Example", name);
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
 *
 * There is a {@link Configuration} object for each supported platform.
 * Additionally, there is a common {@link Configuration} object that is always
 * included by {@link gatherConfig} during {@link configure}.
 */
export const getConfig = (() => {
  /** @type {PlatformConfiguration} */
  let configuration;
  return (
    /** @type {ConfigureParams} */ params,
    /** @type {Platform} */ platform,
    disableCache = false,
    fs = nodefs
  ) => {
    if (disableCache || typeof configuration === "undefined") {
      const { name, templatePath, testAppPath, targetVersion, flatten, init } =
        params;

      // `.gitignore` files are only renamed when published.
      const gitignore = ["_gitignore", ".gitignore"].find((filename) => {
        return fs.existsSync(path.join(testAppPath, "example", filename));
      });
      if (!gitignore) {
        throw new Error("Failed to find `.gitignore`");
      }

      const require = createRequire(import.meta.url);
      const projectPathFlag =
        flatten && cliPlatformIOSVersion() < v(8, 0, 0)
          ? " --project-path ."
          : "";
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
                  // TODO: We will no longer need to consider `App.js` when we
                  // drop support for 0.70
                  ...(fs.existsSync(path.join(templateDir, "App.tsx"))
                    ? {
                        "App.tsx": {
                          source: path.join(templateDir, "App.tsx"),
                        },
                        "tsconfig.json": {
                          source: path.join(templateDir, "tsconfig.json"),
                        },
                      }
                    : {
                        "App.js": { source: path.join(templateDir, "App.js") },
                      }),
                  "app.json": appManifest(name),
                  "index.js": {
                    source: path.join(templateDir, "index.js"),
                  },
                  "package.json": readTextFile(
                    path.join(templateDir, "package.json"),
                    fs
                  ).replaceAll("HelloWorld", name),
                }),
          },
          oldFiles: [],
          scripts: {
            // TODO: Remove this script when we drop support for 0.72
            // https://github.com/react-native-community/cli/commit/48d4c29bba4e8b16cbc8307bd1b4c5349f3651d8
            mkdist: `node -e "require('node:fs').mkdirSync('dist', { recursive: true, mode: 0o755 })"`,
            start: "react-native start",
          },
          dependencies: {},
        },
        android: {
          files: {
            "build.gradle": buildGradle(),
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
            "gradle/wrapper/gradle-wrapper.properties": (() => {
              const gradleWrapperProperties = path.join(
                testAppPath,
                "example",
                "android",
                "gradle",
                "wrapper",
                "gradle-wrapper.properties"
              );
              const props = readTextFile(gradleWrapperProperties);
              if (toVersionNumber(targetVersion) < v(0, 73, 0)) {
                return props.replace(
                  /gradle-[.0-9]*-bin\.zip/,
                  "gradle-7.6.4-bin.zip"
                );
              }
              return props;
            })(),
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
            "settings.gradle": settingsGradle(name),
          },
          oldFiles: [],
          scripts: {
            android: "react-native run-android",
            "build:android":
              "npm run mkdist && react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.android.jsbundle --assets-dest dist/res",
          },
          dependencies: {},
        },
        ios: {
          files: {
            Podfile: podfile(name, ""),
          },
          oldFiles: [
            "Podfile.lock",
            "Pods",
            `${name}.xcodeproj`,
            `${name}.xcworkspace`,
          ],
          scripts: {
            "build:ios":
              "npm run mkdist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
            ios: `react-native run-ios${projectPathFlag}`,
          },
          dependencies: {},
        },
        macos: {
          files: {
            Podfile: podfile(name, "macos/"),
          },
          oldFiles: [
            "Podfile.lock",
            "Pods",
            `${name}.xcodeproj`,
            `${name}.xcworkspace`,
          ],
          scripts: {
            "build:macos":
              "npm run mkdist && react-native bundle --entry-file index.js --platform macos --dev true --bundle-output dist/main.macos.jsbundle --assets-dest dist",
            macos: `react-native run-macos --scheme ${name}${projectPathFlag}`,
          },
          dependencies: {},
        },
        visionos: {
          files: {
            Podfile: podfile(name, "visionos/"),
          },
          oldFiles: [
            "Podfile.lock",
            "Pods",
            `${name}.xcodeproj`,
            `${name}.xcworkspace`,
          ],
          scripts: {
            "build:visionos":
              "npm run mkdist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.visionos.jsbundle --assets-dest dist",
            visionos: "react-native run-visionos",
          },
          dependencies: {},
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
              "npm run mkdist && react-native bundle --entry-file index.js --platform windows --dev true --bundle-output dist/main.windows.bundle --assets-dest dist",
            windows: `react-native run-windows --sln ${flatten ? "" : "windows/"}${name}.sln`,
          },
          dependencies: {},
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
export function gatherConfig(params, disableCache = false) {
  const { flatten, platforms, targetVersion } = params;
  const shouldFlatten = flatten && platforms.length === 1;
  const options = { ...params, flatten: shouldFlatten };
  const config = (() => {
    return platforms.reduce(
      (config, platform) => {
        const platformConfig = getConfig(options, platform, disableCache);
        const dependencies = getPlatformPackage(platform, targetVersion);
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
export function getAppName(packagePath, fs = nodefs) {
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
export function isDestructive(packagePath, { files, oldFiles }, fs = nodefs) {
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
export function removeAllFiles(files, destination, fs = nodefs.promises) {
  const options = { force: true, maxRetries: 3, recursive: true };
  return Promise.all(
    files.map((filename) => fs.rm(path.join(destination, filename), options))
  );
}

/**
 * Returns the package manifest with additions for react-native-test-app.
 * @param {import("node:fs").PathLike} path
 * @param {Configuration} config
 * @returns {Record<string, unknown>}
 */
export function updatePackageManifest(
  path,
  { dependencies, scripts },
  fs = nodefs
) {
  const manifest = readJSONFile(path, fs);

  manifest["scripts"] = mergeObjects(manifest["scripts"], scripts);

  manifest["dependencies"] = mergeObjects(
    manifest["dependencies"],
    dependencies
  );

  const { name: rntaName, version: rntaVersion } = readManifest();
  manifest["devDependencies"] = mergeObjects(manifest["devDependencies"], {
    "@rnx-kit/metro-config": "^2.0.0",
    [rntaName]: `^${rntaVersion}`,
  });

  return manifest;
}

/**
 * Writes all specified files to disk.
 * @param {Configuration["files"]} files
 * @param {string} destination
 * @returns {Promise<void[]>}
 */
export function writeAllFiles(files, destination, fs = nodefs.promises) {
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
export function configure(params, fs = nodefs) {
  const { force, packagePath } = params;
  const config = gatherConfig(params);

  if (!force && isDestructive(packagePath, config)) {
    error("Destructive file operations are required.");
    console.log(
      `Re-run with ${colors.bold("--force")} if you're fine with this.`
    );
    return 1;
  }

  const { files, oldFiles } = config;

  writeAllFiles(files, packagePath).then(() => {
    const packageManifest = path.join(packagePath, "package.json");
    if (!fs.existsSync(packageManifest)) {
      // We cannot assume that the app itself is an npm package. Some libraries
      // have an 'example' folder inside the package.
      warn(
        `skipped modifying 'package.json' because it was not found in path '${packagePath}'`
      );
      return;
    }

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

if (isMain(import.meta.url)) {
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
        case "visionos":
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
    async ({
      _: { [0]: name },
      flatten,
      force,
      init,
      package: packagePath,
      platforms,
    }) => {
      const targetVersion = getPackageVersion("react-native");
      process.exitCode = configure({
        name: typeof name === "string" && name ? name : getAppName(packagePath),
        packagePath,
        templatePath: await findTemplateDir(targetVersion),
        testAppPath: fileURLToPath(new URL("..", import.meta.url)),
        targetVersion,
        platforms: validatePlatforms(platforms),
        flatten,
        force,
        init,
      });
    }
  );
}
