#!/usr/bin/env node
//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

const fs = require("fs");
const os = require("os");
const path = require("path");
const uuidv5 = (() => {
  try {
    // @ts-ignore uuid@3.x
    return require("uuid/v5");
  } catch (_) {
    // uuid@7.x and above
    const { v5 } = require("uuid");
    return v5;
  }
})();

/**
 * @typedef {{
 *   assetItems: string[];
 *   assetItemFilters: string[];
 *   assetFilters: string[];
 * }} AssetItems;
 *
 * @typedef {{
 *   assetItems: string;
 *   assetItemFilters: string;
 *   assetFilters: string;
 * }} Assets;
 */

const templateView = {
  name: "ReactTestApp",
  projectGuidUpper: "{B44CEAD7-FBFF-4A17-95EA-FF5434BBD79D}",
  useExperimentalNuget: false,
};

const uniqueFilterIdentifier = "e48dc53e-40b1-40cb-970a-f89935452892";

// Binary files in React Native Test App Windows project
const binaryExtensions = [".png"];

/** @type {{ recursive: true, mode: 0o755 }} */
const mkdirRecursiveOptions = { recursive: true, mode: 0o755 };

/** @type {{ encoding: "utf-8" }} */
const textFileReadOptions = { encoding: "utf-8" };

/** @type {{ encoding: "utf-8", mode: 0o644 }} */
const textFileWriteOptions = { encoding: "utf-8", mode: 0o644 };

/**
 * Copies the specified directory.
 * @param {string} src
 * @param {string} dest
 */
function copy(src, dest) {
  fs.mkdir(dest, mkdirRecursiveOptions, (err) => {
    rethrow(err);
    fs.readdir(src, { withFileTypes: true }, (err, files) => {
      rethrow(err);
      files.forEach((file) => {
        const source = path.join(src, file.name);
        const target = path.join(dest, file.name);
        file.isDirectory()
          ? copy(source, target)
          : fs.copyFile(source, target, rethrow);
      });
    });
  });
}

/**
 * Finds nearest relative path to a file or directory from current path.
 * @param {string} fileOrDirName Path to the file or directory to find.
 * @param {string=} currentDir The current working directory. Mostly used for unit tests.
 * @returns {string | null} Nearest path to given file or directory; null if not found
 */
function findNearest(fileOrDirName, currentDir = path.resolve("")) {
  const rootDirectory =
    process.platform === "win32"
      ? currentDir.split(path.sep)[0] + path.sep
      : "/";
  while (currentDir !== rootDirectory) {
    const candidatePath = path.join(currentDir, fileOrDirName);
    if (fs.existsSync(candidatePath)) {
      return path.relative("", candidatePath);
    }

    // Get parent folder
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Finds all Visual Studio projects in specified directory.
 * @param {string} projectDir
 * @param {{ path: string; name: string; guid: string; }[]=} projects
 * @returns {{ path: string; name: string; guid: string; }[]}
 */
function findUserProjects(projectDir, projects = []) {
  return fs.readdirSync(projectDir).reduce((projects, file) => {
    const fullPath = path.join(projectDir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      if (!["android", "ios", "macos", "node_modules"].includes(file)) {
        findUserProjects(fullPath, projects);
      }
    } else if (fullPath.endsWith(".vcxproj")) {
      const vcxproj = fs.readFileSync(fullPath, textFileReadOptions);
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
 * Returns whether specified object is Error-like.
 * @param {unknown} e
 * @returns {e is Error}
 */
function isErrorLike(e) {
  return typeof e === "object" && e !== null && "name" in e && "message" in e;
}

/**
 * Normalizes specified path.
 * @param {string} p
 * @returns {string}
 */
function normalizePath(p) {
  return p.replace(/[/\\]+/g, "\\");
}

/**
 * Returns a NuGet package entry for specified package id and version.
 * @param {string} id NuGet package id
 * @param {string} version NuGet package version
 * @returns {string}
 */
function nuGetPackage(id, version) {
  return `<package id="${id}" version="${version}" targetFramework="native" />`;
}

/**
 * @param {string[]} resources
 * @param {string} projectPath
 * @param {AssetItems} assets
 * @param {string} currentFilter
 * @param {string} source
 * @returns {AssetItems}
 */
function generateContentItems(
  resources,
  projectPath,
  assets = { assetFilters: [], assetItemFilters: [], assetItems: [] },
  currentFilter = "Assets",
  source = ""
) {
  const { assetFilters, assetItemFilters, assetItems } = assets;
  for (const resource of resources) {
    if (path.basename(resource) === "app.json") {
      // `app.json` is always included
      continue;
    }

    const resourcePath = path.relative(projectPath, resource);
    if (!fs.existsSync(resourcePath)) {
      console.warn(`warning: resource with path '${resource}' was not found`);
      continue;
    }

    if (fs.statSync(resourcePath).isDirectory()) {
      const filter =
        "Assets\\" +
        normalizePath(
          source ? path.relative(source, resource) : path.basename(resource)
        );
      const id = uuidv5(filter, uniqueFilterIdentifier);
      assetFilters.push(
        `<Filter Include="${filter}">`,
        `  <UniqueIdentifier>{${id}}</UniqueIdentifier>`,
        `</Filter>`
      );

      const files = fs
        .readdirSync(resourcePath)
        .map((file) => path.join(resource, file));
      generateContentItems(
        files,
        projectPath,
        assets,
        filter,
        source || path.dirname(resource)
      );
    } else {
      const assetPath = normalizePath(path.relative(projectPath, resourcePath));
      /**
       * When a resources folder is included in the manifest, the directory
       * structure within the folder must be maintained. For example, given
       * `dist/assets`, we must output:
       *
       *     `<DestinationFolders>$(OutDir)\\Bundle\\assets\\...</DestinationFolders>`
       *     `<DestinationFolders>$(OutDir)\\Bundle\\assets\\node_modules\\...</DestinationFolders>`
       *     ...
       *
       * Resource paths are always prefixed with `$(OutDir)\\Bundle`.
       */
      const destination =
        source &&
        `\\${normalizePath(path.relative(source, path.dirname(resource)))}`;
      assetItems.push(
        `<CopyFileToFolders Include="$(ProjectRootDir)\\${assetPath}">`,
        `  <DestinationFolders>$(OutDir)\\Bundle${destination}</DestinationFolders>`,
        "</CopyFileToFolders>"
      );
      assetItemFilters.push(
        `<CopyFileToFolders Include="$(ProjectRootDir)\\${assetPath}">`,
        `  <Filter>${currentFilter}</Filter>`,
        "</CopyFileToFolders>"
      );
    }
  }

  return assets;
}

/**
 * @param {string[] | { windows?: string[] } | undefined} resources
 * @param {string} projectPath
 * @param {string} vcxProjectPath
 * @returns {Assets}
 */
function parseResources(resources, projectPath, vcxProjectPath) {
  if (!Array.isArray(resources)) {
    if (resources && resources.windows) {
      return parseResources(resources.windows, projectPath, vcxProjectPath);
    }
    return { assetItems: "", assetItemFilters: "", assetFilters: "" };
  }

  const { assetItems, assetItemFilters, assetFilters } = generateContentItems(
    resources,
    projectPath
  );

  return {
    assetItems: assetItems.join("\n    "),
    assetItemFilters: assetItemFilters.join("\n    "),
    assetFilters: assetFilters.join("\n    "),
  };
}

/**
 * Replaces parts in specified content.
 * @param {string} content Content to be replaced.
 * @param {{ [pattern: string]: string }} replacements e.g. {'TextToBeReplaced': 'Replacement'}
 * @returns {string} The contents of the file with the replacements applied.
 */
function replaceContent(content, replacements) {
  return Object.keys(replacements).reduce(
    (content, regex) =>
      content.replace(new RegExp(regex, "g"), replacements[regex]),
    content
  );
}

/**
 * Rethrows specified error.
 * @param {Error | null} error
 */
function rethrow(error) {
  if (error) {
    throw error;
  }
}

/**
 * Returns a solution entry for specified project.
 * @param {{ path: string; name: string; guid: string; }} project
 * @param {string} destPath
 */
function toProjectEntry(project, destPath) {
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
 * @param {{ [pattern: string]: string }} replacements e.g. {'TextToBeReplaced': 'Replacement'}
 * @param {(error: Error | null) => void} callback Callback for when the copy operation is done.
 */
function copyAndReplace(
  srcPath,
  destPath,
  replacements = {},
  callback = rethrow
) {
  if (binaryExtensions.includes(path.extname(srcPath))) {
    // Treat as binary file
    fs.copyFile(srcPath, destPath, callback);
    return;
  }

  const stat = fs.statSync(srcPath);
  if (stat.isDirectory()) {
    copy(srcPath, destPath);
  } else {
    // Treat as text file
    fs.readFile(srcPath, textFileReadOptions, (err, data) => {
      if (err) {
        callback(err);
        return;
      }

      fs.writeFile(
        destPath,
        replaceContent(data, replacements),
        {
          encoding: "utf-8",
          mode: stat.mode,
        },
        callback
      );
    });
  }
}

/**
 * Reads manifest file and and resolves paths to bundle resources.
 * @param {string | null} manifestFilePath Path to the closest manifest file.
 * @param {string} projectFilesDestPath Resolved paths will be relative to this path.
 * @returns {{
 *   appName: string;
 *   appxManifest: string;
 *   assetItems: string;
 *   assetItemFilters: string;
 *   assetFilters: string;
 * }} Application name, and paths to directories and files to include.
 */
function getBundleResources(manifestFilePath, projectFilesDestPath) {
  // Default value if manifest or 'name' field don't exist.
  const defaultName = "ReactTestApp";

  // Default `Package.appxmanifest` path. The project will automatically use our
  // fallback if there is no file at this path.
  const defaultAppxManifest = "windows/Package.appxmanifest";

  if (manifestFilePath) {
    try {
      const content = fs.readFileSync(manifestFilePath, textFileReadOptions);
      const { name, resources, windows } = JSON.parse(content);
      return {
        appName: name || defaultName,
        appxManifest: (windows && windows.appxManifest) || defaultAppxManifest,
        ...parseResources(
          resources,
          path.dirname(manifestFilePath),
          projectFilesDestPath
        ),
      };
    } catch (e) {
      if (isErrorLike(e)) {
        console.warn(`Could not parse 'app.json':\n${e.message}`);
      } else {
        throw e;
      }
    }
  } else {
    console.warn("Could not find 'app.json' file.");
  }

  return {
    appName: defaultName,
    appxManifest: defaultAppxManifest,
    assetItems: "",
    assetItemFilters: "",
    assetFilters: "",
  };
}

/**
 * Returns the version of Hermes that should be installed.
 * @param {string} rnwPath Path to `react-native-windows`.
 * @returns {string | null}
 */
function getHermesVersion(rnwPath) {
  const jsEnginePropsPath = path.join(
    rnwPath,
    "PropertySheets",
    "JSEngine.props"
  );
  const props = fs.readFileSync(jsEnginePropsPath, textFileReadOptions);
  const m = props.match(/<HermesVersion.*?>(.+?)<\/HermesVersion>/);
  return m && m[1];
}

/**
 * Returns the version number the package at specified path.
 * @param {string} packagePath
 * @returns {string}
 */
function getPackageVersion(packagePath) {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(packagePath, "package.json"), textFileReadOptions)
  );
  return version;
}

/**
 * Returns a single number for the specified version, suitable as a value for a
 * preprocessor definition.
 * @param {string} version
 * @returns {number}
 */
function getVersionNumber(version) {
  const components = version.split("-")[0].split(".");
  const lastIndex = components.length - 1;
  return components.reduce(
    /** @type {(sum: number, value: string, index: number) => number} */
    (sum, value, index) => {
      return sum + parseInt(value) * Math.pow(100, lastIndex - index);
    },
    0
  );
}

/**
 * Generates Visual Studio solution.
 * @param {string} destPath Destination path.
 * @param {{ autolink: boolean; useHermes: boolean | undefined; useNuGet: boolean; }} options
 * @returns {string | undefined} An error message; `undefined` otherwise.
 */
function generateSolution(destPath, { autolink, useHermes, useNuGet }) {
  if (!destPath) {
    throw "Missing or invalid destination path";
  }

  const nodeModulesDir = "node_modules";

  const nodeModulesPath = findNearest(nodeModulesDir);
  if (!nodeModulesPath) {
    return "Could not find 'node_modules'";
  }

  const rnWindowsPath = findNearest(
    path.join(nodeModulesDir, "react-native-windows")
  );
  if (!rnWindowsPath) {
    return "Could not find 'react-native-windows'";
  }

  const rnTestAppPath = findNearest(
    path.join(nodeModulesDir, "react-native-test-app")
  );
  if (!rnTestAppPath) {
    return "Could not find 'react-native-test-app'";
  }

  const projDir = "ReactTestApp";
  const projectFilesDestPath = path.join(
    nodeModulesPath,
    ".generated",
    "windows",
    projDir
  );

  fs.mkdirSync(projectFilesDestPath, { recursive: true });
  fs.mkdirSync(destPath, { recursive: true });

  const manifestFilePath = findNearest("app.json");
  const { appName, appxManifest, assetItems, assetItemFilters, assetFilters } =
    getBundleResources(manifestFilePath, projectFilesDestPath);

  const rnWindowsVersion = getPackageVersion(rnWindowsPath);
  const rnWindowsVersionNumber = getVersionNumber(rnWindowsVersion);
  const hermesVersion = useHermes && getHermesVersion(rnWindowsPath);

  const projectFilesReplacements = {
    ...(hermesVersion
      ? {
          '<!-- package id="ReactNative.Hermes.Windows" version="0.0.0" targetFramework="native" / -->':
            nuGetPackage("ReactNative.Hermes.Windows", hermesVersion),
        }
      : undefined),
    ...(useNuGet
      ? {
          '<!-- package id="Microsoft.ReactNative" version="1000.0.0" targetFramework="native" / -->':
            nuGetPackage("Microsoft.ReactNative", rnWindowsVersion),
          '<!-- package id="Microsoft.ReactNative.Cxx" version="1000.0.0" targetFramework="native" / -->':
            nuGetPackage("Microsoft.ReactNative.Cxx", rnWindowsVersion),
          '<!-- package id="Microsoft.UI.Xaml" version="2.6.0" targetFramework="native" / -->':
            nuGetPackage("Microsoft.UI.Xaml", "2.6.0"),
          "<UseExperimentalNuget>false</UseExperimentalNuget>":
            "<UseExperimentalNuget>true</UseExperimentalNuget>",
          "<WinUI2xVersionDisabled />":
            "<WinUI2xVersion>2.6.0</WinUI2xVersion>",
        }
      : undefined),
    "1000\\.0\\.0": rnWindowsVersion,
    "REACT_NATIVE_VERSION=10000000;": `REACT_NATIVE_VERSION=${rnWindowsVersionNumber};`,
    "<!-- ReactTestApp asset items -->": assetItems,
    "<!-- ReactTestApp asset item filters -->": assetItemFilters,
    "<!-- ReactTestApp asset filters -->": assetFilters,
    "\\$\\(ReactTestAppPackageManifest\\)": path.normalize(
      path.relative(destPath, path.resolve(appxManifest))
    ),
  };

  const copyTasks = [
    "Assets",
    "AutolinkedNativeModules.g.cpp",
    "AutolinkedNativeModules.g.props",
    "AutolinkedNativeModules.g.targets",
    "Package.appxmanifest",
    "PropertySheet.props",
    "ReactTestApp.vcxproj",
    "ReactTestApp.vcxproj.filters",
    "packages.config",
  ].map((file) =>
    copyAndReplace(
      path.join(__dirname, projDir, file),
      path.join(projectFilesDestPath, file),
      projectFilesReplacements
    )
  );

  const additionalProjectEntries = findUserProjects(destPath)
    .map((project) => toProjectEntry(project, destPath))
    .join(os.EOL);

  // The mustache template was introduced in 0.63
  const solutionTemplatePath =
    findNearest(
      // In 0.64, the template was moved into `react-native-windows`
      path.join(
        nodeModulesDir,
        "react-native-windows",
        "template",
        "cpp-app",
        "proj",
        "MyApp.sln"
      )
    ) ||
    findNearest(
      // In 0.63, the template is in `@react-native-windows/cli`
      path.join(
        nodeModulesDir,
        "@react-native-windows",
        "cli",
        "templates",
        "cpp",
        "proj",
        "MyApp.sln"
      )
    );

  if (!solutionTemplatePath) {
    copyAndReplace(
      path.join(__dirname, "ReactTestApp.sln"),
      path.join(destPath, `${appName}.sln`),
      {
        "\\$\\(ReactNativeModulePath\\)": path.relative(
          destPath,
          rnWindowsPath
        ),
        "\\$\\(ReactTestAppProjectPath\\)": path.relative(
          destPath,
          projectFilesDestPath
        ),
        "\\$\\(AdditionalProjects\\)": additionalProjectEntries,
      }
    );
  } else {
    const mustache = require("mustache");
    const reactTestAppProjectPath = path.join(
      projectFilesDestPath,
      "ReactTestApp.vcxproj"
    );
    const solutionTask = fs.writeFile(
      path.join(destPath, `${appName}.sln`),
      mustache
        .render(fs.readFileSync(solutionTemplatePath, textFileReadOptions), {
          ...templateView,
          useExperimentalNuget: useNuGet,
        })
        // The current version of this template (v0.63.18) assumes that
        // `react-native-windows` is always installed in
        // `..\node_modules\react-native-windows`.
        .replace(
          /"\.\.\\node_modules\\react-native-windows\\/g,
          `"${path.relative(destPath, rnWindowsPath)}\\`
        )
        .replace(
          "ReactTestApp\\ReactTestApp.vcxproj",
          path.relative(destPath, reactTestAppProjectPath)
        )
        .replace(
          /EndProject\r?\nGlobal/,
          ["EndProject", additionalProjectEntries, "Global"].join(os.EOL)
        ),
      textFileWriteOptions,
      rethrow
    );

    copyAndReplace(
      path.join(__dirname, "ExperimentalFeatures.props"),
      path.join(destPath, "ExperimentalFeatures.props"),
      {
        ...(hermesVersion
          ? { "<UseHermes>false</UseHermes>": `<UseHermes>true</UseHermes>` }
          : undefined),
      }
    );

    if (useNuGet) {
      const nugetConfigPath =
        findNearest(
          // In 0.64, the template was moved into `react-native-windows`
          path.join(
            nodeModulesDir,
            "react-native-windows",
            "template",
            "shared-app",
            "proj",
            "NuGet.Config"
          )
        ) ||
        findNearest(
          // In 0.63, the template is in `@react-native-windows/cli`
          path.join(
            nodeModulesDir,
            "@react-native-windows",
            "cli",
            "templates",
            "shared",
            "proj",
            "NuGet.Config"
          )
        );
      if (nugetConfigPath) {
        fs.writeFile(
          path.join(destPath, "NuGet.Config"),
          mustache.render(
            fs.readFileSync(nugetConfigPath, textFileReadOptions),
            {}
          ),
          textFileWriteOptions,
          rethrow
        );
      }
    }
    if (autolink) {
      Promise.all([...copyTasks, solutionTask]).then(() => {
        const { spawn } = require("child_process");
        spawn(
          path.join(path.dirname(process.argv0), "npx.cmd"),
          [
            "react-native",
            "autolink-windows",
            "--proj",
            reactTestAppProjectPath,
          ],
          { stdio: "inherit" }
        ).on("close", (code) => {
          if (code !== 0) {
            process.exit(code || 1);
          }
        });
      });
    }
  }

  return undefined;
}

if (require.main === module) {
  require("../scripts/link")(module);

  require("yargs").usage(
    "$0 [options]",
    "Generate a Visual Studio solution for React Test App",
    {
      "project-directory": {
        alias: "p",
        type: "string",
        description: "Directory where solution will be created",
        default: "windows",
      },
      autolink: {
        type: "boolean",
        description: "Run autolink after generating the solution",
        default: true,
      },
      "use-hermes": {
        type: "boolean",
        description: "Use Hermes JavaScript engine (experimental)",
      },
      "use-nuget": {
        type: "boolean",
        description: "Use NuGet packages (experimental)",
        default: false,
      },
    },
    ({
      "project-directory": projectDirectory,
      autolink,
      "use-hermes": useHermes,
      "use-nuget": useNuGet,
    }) => {
      const error = generateSolution(path.resolve(projectDirectory), {
        autolink,
        useHermes,
        useNuGet,
      });
      if (error) {
        console.error(error);
        process.exit(1);
      }
    }
  ).argv;
} else {
  exports.copy = copy;
  exports.copyAndReplace = copyAndReplace;
  exports.findNearest = findNearest;
  exports.findUserProjects = findUserProjects;
  exports.generateSolution = generateSolution;
  exports.getBundleResources = getBundleResources;
  exports.getHermesVersion = getHermesVersion;
  exports.getPackageVersion = getPackageVersion;
  exports.getVersionNumber = getVersionNumber;
  exports.nuGetPackage = nuGetPackage;
  exports.parseResources = parseResources;
  exports.replaceContent = replaceContent;
  exports.toProjectEntry = toProjectEntry;
}
