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

const templateView = {
  name: "ReactTestApp",
  projectGuidUpper: "{B44CEAD7-FBFF-4A17-95EA-FF5434BBD79D}",
  useExperimentalNuget: false,
};

// Binary files in React Native Test App Windows project
const binaryExtensions = [".png", ".pfx"];

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
      const vcxproj = fs.readFileSync(fullPath, { encoding: "utf8" });
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
 * @param {string[] | { windows?: string[] } | undefined} resources
 * @param {string} projectPath
 * @param {string} vcxProjectPath
 * @returns {[string, string]} [bundleDirContent, bundleFileContent]
 */
function parseResources(resources, projectPath, vcxProjectPath) {
  if (!Array.isArray(resources)) {
    if (resources && resources.windows) {
      return parseResources(resources.windows, projectPath, vcxProjectPath);
    }
    return ["", ""];
  }

  let bundleDirContent = "";
  let bundleFileContent = "";
  for (const resource of resources) {
    const resourcePath = path.relative(projectPath, resource);
    if (!fs.existsSync(resourcePath)) {
      console.warn(`warning: resource with path '${resource}' was not found`);
      continue;
    }

    const relativeResourcePath = path.relative(vcxProjectPath, resourcePath);
    if (fs.statSync(resourcePath).isDirectory()) {
      bundleDirContent = bundleDirContent.concat(
        relativeResourcePath,
        "\\**\\*;"
      );
    } else {
      bundleFileContent = bundleFileContent.concat(relativeResourcePath, ";");
    }
  }

  return [bundleDirContent, bundleFileContent];
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
 * @param {{ [pattern: string]: string }=} replacements e.g. {'TextToBeReplaced': 'Replacement'}
 */
function copyAndReplace(srcPath, destPath, replacements = {}) {
  /** @type {(e: NodeJS.ErrnoException | null) => void} */
  const throwOnError = (e) => {
    if (e) {
      throw e;
    }
  };

  if (binaryExtensions.includes(path.extname(srcPath))) {
    // Binary file
    return fs.copyFile(srcPath, destPath, throwOnError);
  } else {
    // Text file
    return fs.writeFile(
      destPath,
      replaceContent(
        fs.readFileSync(srcPath, { encoding: "utf8" }),
        replacements
      ),
      {
        encoding: "utf8",
        mode: fs.statSync(srcPath).mode,
      },
      throwOnError
    );
  }
}

/**
 * Reads manifest file and and resolves paths to bundle resources.
 * @param {string | null} manifestFilePath Path to the closest manifest file.
 * @param {string} projectFilesDestPath Resolved paths will be relative to this path.
 * @return {[string, string, string]} Application name and paths to directories and files to include
 */
function getBundleResources(manifestFilePath, projectFilesDestPath) {
  // Default value if manifest or 'name' field doesn't exist
  const defaultName = "ReactTestApp";

  if (manifestFilePath) {
    try {
      const content = fs.readFileSync(manifestFilePath, { encoding: "utf8" });
      const { name, resources } = JSON.parse(content);
      const [bundleDirContent, bundleFileContent] = parseResources(
        resources,
        path.dirname(manifestFilePath),
        projectFilesDestPath
      );
      return [name || defaultName, bundleDirContent, bundleFileContent];
    } catch (e) {
      console.warn(`Could not parse 'app.json':\n${e.message}`);
    }
  } else {
    console.warn("Could not find 'app.json' file.");
  }

  return [defaultName, "", ""];
}

/**
 * Returns the version number the package at specified path.
 * @param {string} packagePath
 * @returns {string}
 */
function getPackageVersion(packagePath) {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(packagePath, "package.json"), {
      encoding: "utf8",
    })
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
  const components = version.split(".");
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
 * @param {boolean} [noAutolink] Skip autolinking.
 * @returns {string | undefined} An error message; `undefined` otherwise.
 */
function generateSolution(destPath, noAutolink) {
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
  const [appName, bundleDirContent, bundleFileContent] = getBundleResources(
    manifestFilePath,
    projectFilesDestPath
  );

  const rnWindowsVersion = getPackageVersion(rnWindowsPath);

  const projectFilesReplacements = {
    "REACT_NATIVE_VERSION=10000000;": `REACT_NATIVE_VERSION=${getVersionNumber(
      rnWindowsVersion
    )};`,
    "\\$\\(BundleDirContentPaths\\)": bundleDirContent,
    "\\$\\(BundleFileContentPaths\\)": bundleFileContent,
    "packages\\\\Microsoft\\.ReactNative\\.0\\.63\\.2\\\\build\\\\native\\\\Microsoft\\.ReactNative\\.targets": `packages\\Microsoft.ReactNative.${rnWindowsVersion}\\build\\native\\Microsoft.ReactNative.targets`,
    "packages\\\\Microsoft\\.ReactNative\\.Cxx\\.0\\.63\\.2\\\\build\\\\native\\\\Microsoft\\.ReactNative\\.Cxx\\.targets": `packages\\Microsoft.ReactNative.Cxx.${rnWindowsVersion}\\build\\native\\Microsoft.ReactNative.Cxx.targets`,
  };

  const copyTasks = [
    "AutolinkedNativeModules.g.cpp",
    "AutolinkedNativeModules.g.targets",
    "Package.appxmanifest",
    "PropertySheet.props",
    "ReactTestApp.vcxproj",
    "ReactTestApp.vcxproj.filters",
    "ReactTestApp_TemporaryKey.pfx",
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
  const solutionTemplatePath = findNearest(
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
        .render(
          fs.readFileSync(solutionTemplatePath, { encoding: "utf8" }),
          templateView
        )
        .replace(
          "ReactTestApp\\ReactTestApp.vcxproj",
          path.relative(destPath, reactTestAppProjectPath)
        )
        .replace(
          /EndProject\r?\nGlobal/,
          ["EndProject", additionalProjectEntries, "Global"].join(os.EOL)
        ),
      {
        encoding: "utf8",
        mode: 0o644,
      },
      (e) => {
        if (e) throw e;
      }
    );
    if (!noAutolink) {
      Promise.all([...copyTasks, solutionTask]).then(() => {
        const { spawn } = require("child_process");
        spawn(path.join(path.dirname(process.argv0), "npx.cmd"), [
          "react-native",
          "autolink-windows",
          "--proj",
          reactTestAppProjectPath,
        ]);
      });
    }
  }

  return undefined;
}

if (require.main === module) {
  // Add the `node_modules` path whence the script was invoked. Without it, this
  // script will fail to resolve any packages when `react-native-test-app` was
  // linked using npm or yarn link.
  const nodeModulesDir = process.argv[1].match(/(.*?[/\\]node_modules)[/\\]/);
  if (nodeModulesDir) {
    module.paths.push(nodeModulesDir[1]);
  }

  require("yargs").usage(
    "$0 [options]",
    "Generate a Visual Studio solution for React Test App",
    {
      projectDirectory: {
        alias: "p",
        type: "string",
        description: "Directory where solution will be created",
        default: "windows",
      },
      noAutolink: {
        type: "boolean",
        description: "Skip autolinking",
        default: false,
      },
    },
    ({ projectDirectory, noAutolink }) => {
      const error = generateSolution(
        path.resolve(projectDirectory),
        noAutolink
      );
      if (error) {
        console.error(error);
        process.exit(1);
      }
    }
  ).argv;
} else {
  exports["copyAndReplace"] = copyAndReplace;
  exports["findNearest"] = findNearest;
  exports["findUserProjects"] = findUserProjects;
  exports["generateSolution"] = generateSolution;
  exports["getBundleResources"] = getBundleResources;
  exports["getPackageVersion"] = getPackageVersion;
  exports["getVersionNumber"] = getVersionNumber;
  exports["parseResources"] = parseResources;
  exports["replaceContent"] = replaceContent;
  exports["toProjectEntry"] = toProjectEntry;
}
