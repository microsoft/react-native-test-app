#!/usr/bin/env node
// @ts-check
import * as nodefs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import {
  findNearest,
  isMain,
  readTextFile,
  requireTransitive,
  v,
  writeTextFile,
} from "../scripts/helpers.js";
import * as colors from "../scripts/utils/colors.mjs";
import { parseArgs } from "../scripts/utils/parseargs.mjs";
import { loadReactNativeConfig, projectInfo } from "./project.mjs";
import { configureForUWP } from "./uwp.mjs";
import { configureForWin32 } from "./win32.mjs";

/**
 * @typedef {import("../scripts/types.js").MSBuildProjectOptions} MSBuildProjectOptions;
 */

const templateView = {
  packageGuidUpper: "{B44CEAD7-FBFF-4A17-95EB-FF5434BBD79D}", // .wapproj
  projectGuidUpper: "{B44CEAD7-FBFF-4A17-95EA-FF5434BBD79D}", // .vcxproj
  useExperimentalNuget: false,
};

/**
 * Finds all Visual Studio projects in specified directory.
 * @param {string} projectDir
 * @param {{ path: string; name: string; guid: string; }[]=} projects
 * @returns {{ path: string; name: string; guid: string; }[]}
 */
export function findUserProjects(projectDir, projects = [], fs = nodefs) {
  return fs.readdirSync(projectDir).reduce((projects, file) => {
    const fullPath = path.join(projectDir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      if (!["android", "ios", "macos", "node_modules"].includes(file)) {
        findUserProjects(fullPath, projects);
      }
    } else if (fullPath.endsWith(".vcxproj")) {
      const vcxproj = readTextFile(fullPath, fs);
      const guidMatch = vcxproj.match(
        /<ProjectGuid>({[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}})<\/ProjectGuid>/
      );
      if (guidMatch) {
        const projectNameMatch = vcxproj.match(
          /<ProjectName>(.*?)<\/ProjectName>/
        );
        projects.push({
          path: fullPath,
          name: projectNameMatch
            ? projectNameMatch[1]
            : path.basename(file, ".vcxproj"),
          guid: guidMatch[1],
        });
      }
    }
    return projects;
  }, projects);
}

/**
 * Replaces parts in specified content.
 * @param {string} content Content to be replaced.
 * @param {{ [pattern: string]: string }} replacements e.g. {'TextToBeReplaced': 'Replacement'}
 * @returns {string} The contents of the file with the replacements applied.
 */
export function replaceContent(content, replacements) {
  return Object.keys(replacements).reduce(
    (content, regex) =>
      content.replace(new RegExp(regex, "g"), replacements[regex]),
    content
  );
}

/**
 * Returns a solution entry for specified project.
 * @param {{ path: string; name: string; guid: string; }} project
 * @param {string} destPath
 */
export function toProjectEntry(project, destPath) {
  return [
    `Project("{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}") = "${
      project.name
    }", "${path.relative(destPath, project.path)}", "${project.guid}"`,
    "\tProjectSection(ProjectDependencies) = postProject",
    `\t\t${templateView.projectGuidUpper} = ${templateView.projectGuidUpper}`,
    "\tEndProjectSection",
    "EndProject",
  ].join(os.EOL);
}

/**
 * Copies a file to given destination, replacing parts of its contents.
 * @param {string} srcPath Path to the file to be copied.
 * @param {string} destPath Destination path.
 * @param {Record<string, string> | undefined} replacements e.g. {'TextToBeReplaced': 'Replacement'}
 * @returns {Promise<void>}
 */
export async function copyAndReplace(
  srcPath,
  destPath,
  replacements,
  fs = nodefs.promises
) {
  if (!replacements) {
    return fs.cp(srcPath, destPath, { recursive: true });
  }

  // Treat as text file
  const data = await fs.readFile(srcPath, { encoding: "utf-8" });
  return writeTextFile(destPath, replaceContent(data, replacements), fs);
}

/**
 * Generates Visual Studio solution.
 * @param {string} destPath Destination path.
 * @param {MSBuildProjectOptions} options
 * @returns {string | undefined} An error message; `undefined` otherwise.
 */
export function generateSolution(destPath, options, fs = nodefs) {
  if (!destPath) {
    return "Missing or invalid destination path";
  }

  const projectManifest = findNearest("package.json", undefined, fs);
  if (!projectManifest) {
    return "Could not find 'package.json'";
  }

  const nodeModulesDir = "node_modules";

  const rnWindowsPath = findNearest(
    path.join(nodeModulesDir, "react-native-windows"),
    undefined,
    fs
  );
  if (!rnWindowsPath) {
    return "Could not find 'react-native-windows'";
  }

  const info = projectInfo(options, rnWindowsPath, destPath, fs);
  const { projDir, projectFileName, projectFiles, solutionTemplatePath } =
    info.useFabric ? configureForWin32(info) : configureForUWP(info);

  const solutionTemplate = path.join(rnWindowsPath, solutionTemplatePath);
  if (!fs.existsSync(solutionTemplate)) {
    return "Could not find solution template";
  }

  const projectFilesDestPath = path.join(
    path.dirname(projectManifest),
    nodeModulesDir,
    ".generated",
    "windows",
    projDir
  );

  const mkdirRecursiveOptions = { recursive: true, mode: 0o755 };
  fs.mkdirSync(projectFilesDestPath, mkdirRecursiveOptions);
  fs.mkdirSync(destPath, mkdirRecursiveOptions);

  /** @type {typeof copyAndReplace} */
  const copyAndReplaceAsync = (src, dst, r) =>
    copyAndReplace(src, dst, r, fs.promises);

  const copyTasks = projectFiles.map(([file, replacements]) =>
    copyAndReplaceAsync(
      fileURLToPath(new URL(`${projDir}/${file}`, import.meta.url)),
      path.join(projectFilesDestPath, file),
      replacements
    )
  );

  const additionalProjectEntries = findUserProjects(destPath, undefined, fs)
    .map((project) => toProjectEntry(project, destPath))
    .join(os.EOL);

  /** @type {typeof import("mustache")} */
  const mustache = requireTransitive(
    ["@react-native-windows/cli", "mustache"],
    rnWindowsPath
  );
  const slnPath = path.join(destPath, `${info.bundle.appName}.sln`);
  const vcxprojPath = path.join(projectFilesDestPath, projectFileName);
  const vcxprojLocalPath = path.relative(destPath, vcxprojPath);
  copyTasks.push(
    writeTextFile(
      slnPath,
      mustache
        .render(readTextFile(solutionTemplate, fs), {
          ...templateView,
          name: path.basename(projectFileName, path.extname(projectFileName)),
          useExperimentalNuget: info.useExperimentalNuGet,
          rnwPathFromProjectRoot: path.relative(
            path.dirname(projectManifest),
            rnWindowsPath
          ),
        })
        // The current version of this template (v0.63.18) assumes that
        // `react-native-windows` is always installed in
        // `..\node_modules\react-native-windows`.
        .replace(
          /"\.\.\\node_modules\\react-native-windows\\/g,
          `"${path.relative(destPath, rnWindowsPath)}\\`
        )
        .replace("ReactApp\\ReactApp.vcxproj", vcxprojLocalPath) // Win32
        .replace(
          "ReactApp.Package\\ReactApp.Package.wapproj", // Win32
          vcxprojLocalPath.replace(
            "ReactApp.vcxproj",
            "ReactApp.Package.wapproj"
          )
        )
        .replace("ReactTestApp\\ReactTestApp.vcxproj", vcxprojLocalPath) // UWP
        .replace(
          /EndProject\r?\nGlobal/,
          ["EndProject", additionalProjectEntries, "Global"].join(os.EOL)
        ),
      fs.promises
    )
  );

  const experimentalFeaturesPropsFilename = "ExperimentalFeatures.props";
  const experimentalFeaturesPropsPath = path.join(
    destPath,
    experimentalFeaturesPropsFilename
  );
  if (fs.existsSync(experimentalFeaturesPropsPath)) {
    const props = path.relative(process.cwd(), experimentalFeaturesPropsPath);
    console.log(colors.cyan(colors.bold("info")), `'${props}' already exists`);
  } else {
    const { useHermes } = options;
    const { useExperimentalNuGet, useFabric, versionNumber } = info;
    const url = new URL(experimentalFeaturesPropsFilename, import.meta.url);
    copyAndReplaceAsync(fileURLToPath(url), experimentalFeaturesPropsPath, {
      "<UseFabric>false</UseFabric>": `<UseFabric>${useFabric}</UseFabric>`,
      "<UseHermes>true</UseHermes>": `<UseHermes>${useHermes == null ? versionNumber >= v(0, 73, 0) : useHermes}</UseHermes>`,
      "<UseWinUI3>false</UseWinUI3>": `<UseWinUI3>${useFabric}</UseWinUI3>`,
      "<UseExperimentalNuget>false</UseExperimentalNuget>": `<UseExperimentalNuget>${useExperimentalNuGet}</UseExperimentalNuget>`,
    });
  }

  if (info.useExperimentalNuGet) {
    // In 0.70, the template was renamed from `NuGet.Config` to `NuGet_Config`
    const nugetConfigPath0_70 = path.join(
      rnWindowsPath,
      "template",
      "shared-app",
      "proj",
      "NuGet_Config"
    );
    const nugetConfigPath = fs.existsSync(nugetConfigPath0_70)
      ? nugetConfigPath0_70
      : null;
    if (nugetConfigPath) {
      const nugetConfigDest = path.join(destPath, "NuGet.Config");
      const nugetConfigCopy = path.join(projectFilesDestPath, "NuGet.Config");
      if (fs.existsSync(nugetConfigDest)) {
        copyTasks.push(fs.promises.cp(nugetConfigDest, nugetConfigCopy));
      } else {
        const template = readTextFile(nugetConfigPath, fs);
        const nuGetADOFeed = info.version.startsWith("0.0.0-");
        const nugetConfig = mustache.render(template, { nuGetADOFeed });
        copyTasks.push(
          writeTextFile(nugetConfigDest, nugetConfig, fs.promises),
          writeTextFile(nugetConfigCopy, nugetConfig, fs.promises)
        );
      }
    }
  }

  if (options.autolink) {
    const projectRoot = path.resolve(path.dirname(projectManifest));
    Promise.all(copyTasks)
      .then(() => {
        // `react-native config` is cached by `@react-native-community/cli`. We
        // need to manually regenerate the Windows project config and inject it.
        const config = loadReactNativeConfig(rnWindowsPath);
        config.project.windows = config.platforms.windows.projectConfig(
          projectRoot,
          {
            sourceDir: path.relative(projectRoot, destPath),
            solutionFile: path.relative(destPath, slnPath),
            project: {
              projectFile: vcxprojLocalPath,
            },
          }
        );
        return config;
      })
      .then((config) => {
        const autolink = config.commands.find(
          ({ name }) => name === "autolink-windows"
        );
        autolink?.func([], config, { proj: vcxprojPath });
      });
  }

  return undefined;
}

if (isMain(import.meta.url)) {
  parseArgs(
    "Generate a Visual Studio solution for a React Native app",
    {
      "project-directory": {
        description:
          "Directory where solution will be created (default: “windows”)",
        type: "string",
        short: "p",
        default: "windows",
      },
      autolink: {
        description: `Run autolink after generating the solution (this is the default on Windows)`,
        type: "boolean",
        default: os.platform() === "win32",
      },
      "use-fabric": {
        description: "Use New Architecture [experimental] (supported on 0.73+)",
        type: "boolean",
      },
      "use-hermes": {
        description:
          "Use Hermes instead of Chakra as the JS engine (enabled by default on 0.73+)",
        type: "boolean",
      },
      "use-nuget": {
        description: "Use NuGet packages [experimental]",
        type: "boolean",
        default: false,
      },
    },
    ({
      "project-directory": projectDirectory,
      autolink,
      "use-fabric": useFabric,
      "use-hermes": useHermes,
      "use-nuget": useNuGet,
    }) => {
      const options = { autolink, useFabric, useHermes, useNuGet };
      const error = generateSolution(path.resolve(projectDirectory), options);
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    }
  );
}
