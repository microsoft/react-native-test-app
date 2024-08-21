#!/usr/bin/env node
// @ts-check
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";
import { configure, getDefaultPlatformPackageName } from "./configure.mjs";
import { memo, readJSONFile, toVersionNumber, v } from "./helpers.js";
import * as colors from "./utils/colors.mjs";
import { downloadPackage, fetchPackageMetadata } from "./utils/npm.mjs";
import { parseArgs } from "./utils/parseargs.mjs";

/**
 * Returns the installed `react-native` manifest, if present.
 * @returns {string | null}
 */
const getInstalledReactNativeManifest = memo(() => {
  const require = createRequire(import.meta.url);
  const options = { paths: [process.cwd()] };
  try {
    return require.resolve("react-native/package.json", options);
  } catch (_) {
    return null;
  }
});

/**
 * Returns the installed `react-native` version, if present.
 * @returns {string | null}
 */
const getInstalledVersion = memo(() => {
  const manifestPath = getInstalledReactNativeManifest();
  if (manifestPath) {
    const { version } = readJSONFile(manifestPath);
    if (typeof version === "string") {
      return version;
    }
  }

  return null;
});

/**
 * Returns the desired `react-native` version.
 *
 * Checks the following in order:
 *
 *   - Command line flag, e.g. `--version 0.70`
 *   - Currently installed `react-native` version
 *   - Latest version from npm
 *
 * @param {import("./types.js").Platform[]} platforms
 * @returns {Promise<string>}
 */
async function getVersion(platforms) {
  const index = process.argv.lastIndexOf("--version");
  if (index >= 0) {
    const m = process.argv[index + 1].match(/(\d+\.\d+[-.0-9a-z]*)/);
    if (!m) {
      throw new Error(
        "Expected version number of the form <major>.<minor>.<patch>-<prerelease> (where patch and prerelease are optional)"
      );
    }
    return m[1];
  }

  /** @type {(version: string, reason: string) => void} */
  const logVersion = (version, reason) => {
    const bVersionFlag = colors.bold("--version");
    const bTarget = colors.bold(version);
    console.log(
      `Using ${bTarget} because ${reason} (use ${bVersionFlag} to specify another version)`
    );
  };

  const version = getInstalledVersion();
  if (version) {
    logVersion(version, "the current project uses it");
    return version;
  }

  console.log("No version was specified; fetching available versions...");

  let maxSupportedVersion = Number.MAX_VALUE;
  for (const p of platforms) {
    const pkgName = getDefaultPlatformPackageName(p);
    if (!pkgName) {
      continue;
    }

    const info = await fetchPackageMetadata(pkgName, "latest");
    const [major, minor] = info.version.split(".");
    const v = Number(major) * 1000 + Number(minor);
    if (v < maxSupportedVersion) {
      maxSupportedVersion = v;
    }
  }

  const major = Math.trunc(maxSupportedVersion / 1000);
  const minor = maxSupportedVersion % 1000;

  const target = major + "." + minor;
  logVersion(target, "it supports all specified platforms");

  return target;
}

/**
 * Returns the React Native version and path to the template.
 * @param {import("./types.js").Platform[]} platforms
 * @returns {Promise<[string, string]>}
 */
async function fetchTemplate(platforms) {
  const version = await getVersion(platforms);
  const useTemplatePackage = toVersionNumber(version) >= v(0, 75, 0);
  if (!useTemplatePackage && getInstalledVersion() === version) {
    const rnManifest = getInstalledReactNativeManifest();
    if (rnManifest) {
      return [version, path.join(path.dirname(rnManifest), "template")];
    }
  }

  const template = useTemplatePackage
    ? "@react-native-community/template"
    : "react-native";
  const output = await downloadPackage(template, version);
  return [version, path.join(output, "template")];
}

/**
 * @param {import("./types.js").Platform} platform
 * @returns {string}
 */
function instructionsFor(platform) {
  switch (platform) {
    case "android":
      return [
        `  • Build and run the ${colors.bold("Android")} app`,
        "",
        "\tnpm run android",
        "",
        "",
      ].join("\n");

    case "ios":
    case "macos":
    case "visionos":
      return [
        `  • Build and run the ${colors.bold(platform.slice(0, -2) + "OS")} app`,
        "",
        `\tpod install --project-directory=${platform}`,
        `\tnpm run ${platform}`,
        "",
        "",
      ].join("\n");

    case "windows":
      return [
        `  • Build and run the ${colors.bold("Windows")} app`,
        "",
        "\tnpx install-windows-test-app",
        "\tnpm run windows",
        "",
        "",
      ].join("\n");
  }

  throw new Error(`Unknown platform: ${platform}`);
}

function main() {
  return new Promise((resolve) => {
    parseArgs(
      "Initializes a new app project from template",
      {
        name: {
          description: "Name of the app",
          type: "string",
        },
        platform: {
          description:
            "Platform to configure; can be specified multiple times e.g., `-p android -p ios`",
          type: "string",
          multiple: true,
          short: "p",
        },
        destination: {
          description: "Destination path for the app",
          type: "string",
        },
        version: {
          description: "React Native version",
          type: "string",
          short: "v",
        },
      },
      async (args) => {
        prompts.override({
          name: args.name,
          platforms:
            typeof args.platform === "string" ? [args.platform] : args.platform,
          packagePath: args.destination,
        });

        /**
         * @type {{
         *   name?: string;
         *   packagePath?: string;
         *   platforms?: import("./types.js").Platform[];
         * }}
         */
        const { name, packagePath, platforms } = await prompts([
          {
            type: "text",
            name: "name",
            message: "What is the name of your app?",
            initial: "Example",
            validate: Boolean,
          },
          {
            type: "multiselect",
            name: "platforms",
            message: "Which platforms do you need test apps for?",
            choices: [
              { title: "Android", value: "android", selected: true },
              { title: "iOS", value: "ios", selected: true },
              { title: "macOS", value: "macos", selected: true },
              {
                title: "visionOS (Experimental)",
                value: "visionos",
                selected: false,
              },
              { title: "Windows", value: "windows", selected: true },
            ],
            min: 1,
          },
          {
            type: "text",
            name: "packagePath",
            message: "Where should we create the new project?",
            initial: "example",
            validate: Boolean,
          },
        ]);

        if (!name || !packagePath || !platforms) {
          resolve(1);
          return;
        }

        const [targetVersion, templatePath] = await fetchTemplate(platforms);
        const result = configure({
          name,
          packagePath,
          templatePath,
          testAppPath: fileURLToPath(new URL("..", import.meta.url)),
          targetVersion,
          platforms,
          flatten: true,
          force: true,
          init: true,
        });

        console.log(
          [
            "",
            "Your React Native project is now ready.",
            "",
            "Quick start instructions:",
            "",
            "  • Install npm dependencies using your preferred package manager (the following instructions are for npm):",
            "",
            `\tcd ${packagePath}`,
            "\tnpm install",
            "",
            "",
            ...platforms.sort().map((platform) => instructionsFor(platform)),
            "  • Start the dev server",
            "",
            "\tnpm run start",
            "",
            "",
            "Check out the wiki for more information:",
            "\thttps://github.com/microsoft/react-native-test-app/wiki/Quick-Start",
            "",
          ].join("\n")
        );

        resolve(result);
      }
    );
  });
}

main().then((result) => {
  process.exitCode = result;
});
