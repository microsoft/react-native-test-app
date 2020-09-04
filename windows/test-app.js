#!/usr/bin/env node

// @ts-check
const path = require("path");
const fs = require("fs");

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
 * Copies a file to given destination, replacing parts of its contents.
 * @param {string} srcPath Path to the file to be copied.
 * @param {string} destPath Destination path.
 * @param {{ [pattern: string]: string }=} replacements e.g. {'TextToBeReplaced': 'Replacement'}
 */
function copyAndReplace(srcPath, destPath, replacements = {}) {
  /** @type {(e?: Error) => void} */
  const throwOnError = (e) => {
    if (e) {
      throw e;
    }
  };

  if (binaryExtensions.includes(path.extname(srcPath))) {
    // Binary file
    fs.copyFile(srcPath, destPath, throwOnError);
  } else {
    // Text file
    fs.writeFile(
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
 * @param {string} manifestFilePath Path to the closest manifest file.
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
 * Generates Visual Studio solution.
 * @param {string} destPath Destination path.
 * @returns {string | undefined} An error message; `undefined` otherwise.
 */
function generateSolution(destPath) {
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

  const projectFilesReplacements = {
    "\\$\\(ManifestRootPath\\)": path.relative(
      projectFilesDestPath,
      path.dirname(manifestFilePath)
    ),
    "\\$\\(ReactNativeModulePath\\)": path.relative(
      projectFilesDestPath,
      rnWindowsPath
    ),
    "\\$\\(SourceFilesPath\\)": path.relative(
      projectFilesDestPath,
      path.join(__dirname, projDir)
    ),
    "\\$\\(BundleDirContentPaths\\)": bundleDirContent,
    "\\$\\(BundleFileContentPaths\\)": bundleFileContent,
  };

  [
    "Package.appxmanifest",
    "packages.config",
    "PropertySheet.props",
    "ReactTestApp_TemporaryKey.pfx",
    "ReactTestApp.vcxproj.filters",
    "ReactTestApp.vcxproj",
  ].forEach((file) =>
    copyAndReplace(
      path.join(__dirname, projDir, file),
      path.join(projectFilesDestPath, file),
      projectFilesReplacements
    )
  );

  const testProjectFilePath = path.join(destPath, "ReactTestAppTests");
  const testProjectTemplateFile = "ReactTestAppTestsTemplate.vcxproj";
  let testProjectEntry = "";

  if (fs.existsSync(path.join(testProjectFilePath, testProjectTemplateFile))) {
    testProjectEntry =
      'Project("{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}") = "ReactTestAppTests", "ReactTestAppTests\\ReactTestAppTests.vcxproj", "{D2B221C0-0781-4D20-8BF1-D88684662A5D}"\n' +
      "\tProjectSection(ProjectDependencies) = postProject\n" +
      "\t\t{B44CEAD7-FBFF-4A17-95EA-FF5434BBD79D} = {B44CEAD7-FBFF-4A17-95EA-FF5434BBD79D}\n" +
      "\tEndProjectSection\n" +
      "EndProject";
    copyAndReplace(
      path.join(testProjectFilePath, testProjectTemplateFile),
      path.join(testProjectFilePath, "ReactTestAppTests.vcxproj"),
      {
        "\\$\\(SourceFilesPath\\)": path.relative(
          testProjectFilePath,
          path.join(__dirname, projDir)
        ),
        "\\$\\(ReactTestAppProjectPath\\)": path.relative(
          testProjectFilePath,
          projectFilesDestPath
        ),
      }
    );
  }

  copyAndReplace(
    path.join(__dirname, "ReactTestApp.sln"),
    path.join(destPath, `${appName}.sln`),
    {
      "\\$\\(ReactNativeModulePath\\)": path.relative(destPath, rnWindowsPath),
      "\\$\\(ReactTestAppProjectPath\\)": path.relative(
        destPath,
        projectFilesDestPath
      ),
      "\\$\\(TestProject\\)": testProjectEntry,
    }
  );

  return undefined;
}

if (require.main === module) {
  const { argv } = require("yargs")
    .usage("Usage: $0 --projectDirectory=directory")
    .option("projectDirectory", {
      alias: "p",
      type: "string",
      description: "Directory where solution will be created",
      default: "windows",
    });
  const error = generateSolution(path.resolve(argv.projectDirectory));
  if (error) {
    console.error(error);
    process.exit(1);
  }
} else {
  exports["copyAndReplace"] = copyAndReplace;
  exports["findNearest"] = findNearest;
  exports["generateSolution"] = generateSolution;
  exports["getBundleResources"] = getBundleResources;
  exports["parseResources"] = parseResources;
  exports["replaceContent"] = replaceContent;
}
