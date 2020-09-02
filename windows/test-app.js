#!/usr/bin/env node

// @ts-check
const path = require("path");
const fs = require("fs");

const { argv } = require("yargs")
  .usage("Usage: $0 --projectDirectory=directory")
  .option("projectDirectory", {
    alias: "p",
    type: "string",
    description: "Directory where solution will be created",
    default: "windows",
  });

const destPath = path.resolve(argv.projectDirectory);

const nodeModulesDir = "node_modules";
const generatedDir = ".generated";
const windowsDir = "windows";
const closestNodeModules = findClosestPathTo(nodeModulesDir);
const reactNativeModulePath = findClosestPathTo(
  path.join(nodeModulesDir, "react-native-windows")
);
const testAppNodeModulePath = findClosestPathTo(
  path.join(nodeModulesDir, "react-native-test-app")
);

/**
 * Get relative closest path to a file or direcatory from current path.
 * @param {string} fileOrDirName Path to the file or directory to find.
 * @returns {string | null} closest path to given file or directory, null if it was not found
 */
function findClosestPathTo(fileOrDirName) {
  let basePath = path.resolve("");
  const rootDirectory = basePath.split(path.sep)[0] + path.sep;

  while (basePath !== rootDirectory) {
    const candidatePath = path.join(basePath, fileOrDirName);
    if (fs.existsSync(candidatePath)) {
      return path.relative("", candidatePath);
    }
    //Get parent folder
    basePath = path.dirname(basePath);
  }

  return null;
}

/**
 * Get a source file and replace parts of its contents.
 * @param {string} srcPath Path to the source file.
 * @param {{ [pattern: string]: string }} replacements e.g. {'TextToBeReplaced': 'Replacement'}
 * @returns {string} The contents of the file with the replacements applied.
 */
function resolveContents(srcPath, replacements) {
  const content = fs.readFileSync(srcPath, "utf8");

  return Object.keys(replacements).reduce((content, regex) => {
    return content.replace(new RegExp(regex, "g"), replacements[regex]);
  }, content);
}

// Binary files in React Native Test App Windows project
const binaryExtensions = [".png", ".pfx"];

/**
 * Copy a file to given destination, replacing parts of its contents.
 * @param {string} srcPath Path to a file to be copied.
 * @param {string} destPath Destination path.
 * @param {{ [pattern: string]: string }} replacements e.g. {'TextToBeReplaced': 'Replacement'}
 */
function copyAndReplace(srcPath, destPath, replacements = {}) {
  const extension = path.extname(srcPath);
  if (binaryExtensions.indexOf(extension) !== -1) {
    // Binary file
    fs.copyFile(srcPath, destPath, (err) => {
      if (err) {
        throw err;
      }
    });
  } else {
    // Text file
    const srcPermissions = fs.statSync(srcPath).mode;
    const content = resolveContents(srcPath, replacements);
    fs.writeFile(
      destPath,
      content,
      {
        encoding: "utf8",
        mode: srcPermissions,
      },
      (err) => {
        if (err) {
          throw err;
        }
      }
    );
  }
}

/**
 * Resolve and replace paths and copy from test project template.
 * @param {string} testProjectFilePath Directory where test project will be copied to.
 * @param {string} testProjectTemplateFile Name of test project template.
 * @param {string} srcFilesPath Path to source files.
 * @param {string} projectFilesDestPath Path to React Native Test App project file.
 */
function copyTestProject(
  testProjectFilePath,
  testProjectTemplateFile,
  srcFilesPath,
  projectFilesDestPath
) {
  const testProjectFileReplacements = {
    "\\$\\(SourceFilesPath\\)": path.relative(
      testProjectFilePath,
      srcFilesPath
    ),
    "\\$\\(ReactTestAppProjectPath\\)": path.relative(
      testProjectFilePath,
      projectFilesDestPath
    ),
  };

  copyAndReplace(
    path.join(testProjectFilePath, testProjectTemplateFile),
    path.join(testProjectFilePath, "ReactTestAppTests.vcxproj"),
    testProjectFileReplacements
  );
}

/**
 * Read manifest file and and resolve paths to bundle resources.
 * @param {string} manifestFilePath Path to the closest manifest file.
 * @param {string} projectFilesDestPath Resolved paths will be relative to this path.
 * @return {[string, string, string]} Application name and paths to directories and files to include
 */
function getPathsToBundleResources(manifestFilePath, projectFilesDestPath) {
  // Read path to resources from manifest
  let bundleDirContent = "";
  let bundleFileContent = "";
  let appName = "ReactTestApp"; //Default value if manifest or 'name' field doesn't exist

  if (manifestFilePath) {
    const content = fs.readFileSync(manifestFilePath);
    let resourcesPaths = {};
    try {
      const json = JSON.parse(content.toString());
      resourcesPaths = json.resources;
      appName = json.name || appName;
    } catch (e) {
      console.warn(`Couldn't parse 'app.json':\n${e.message}`);
    }
    resourcesPaths =
      (resourcesPaths && resourcesPaths.windows) || resourcesPaths;
    if (Array.isArray(resourcesPaths)) {
      for (const resource of resourcesPaths) {
        const resourceSrcPath = path.relative(
          path.dirname(manifestFilePath),
          resource
        );
        if (fs.existsSync(resourceSrcPath)) {
          const relativeResourcePath = path.relative(
            projectFilesDestPath,
            resourceSrcPath
          );
          if (fs.statSync(resourceSrcPath).isDirectory()) {
            bundleDirContent = bundleDirContent.concat(
              relativeResourcePath,
              "\\**\\*;"
            );
          } else {
            bundleFileContent = bundleFileContent.concat(
              relativeResourcePath,
              ";"
            );
          }
        } else {
          console.warn(`warning: resource with path ${resource} was not found`);
        }
      }
    }
  } else {
    console.warn("Could not find 'app.json' file. ");
  }

  return [appName, bundleDirContent, bundleFileContent];
}

function copyProjectTemplateAndReplace(
  destPath,
  nodeModulesPath,
  reactNativeModulePath,
  testAppNodeModulePath
) {
  if (!destPath) {
    console.error("Need a path to copy to");
    process.exit(1);
  }

  if (!nodeModulesPath) {
    console.error("node_modules folder is not found");
    process.exit(1);
  }

  if (!reactNativeModulePath) {
    console.error("react-native-windows is not installed");
    process.exit(1);
  }

  if (!testAppNodeModulePath) {
    console.error("react-native-test-app is not installed");
    process.exit(1);
  }

  const srcRootPath = path.join(testAppNodeModulePath, windowsDir);
  const projDir = "ReactTestApp";
  const projectFilesDestPath = path.join(
    nodeModulesPath,
    generatedDir,
    windowsDir,
    projDir
  );

  fs.mkdirSync(projectFilesDestPath, { recursive: true });
  fs.mkdirSync(destPath, { recursive: true });

  const manifestFilePath = findClosestPathTo("app.json");
  const [
    appName,
    bundleDirContent,
    bundleFileContent,
  ] = getPathsToBundleResources(manifestFilePath, projectFilesDestPath);

  const projectFilesReplacements = {
    "\\$\\(ManifestRootPath\\)": path.relative(
      projectFilesDestPath,
      path.dirname(manifestFilePath)
    ),
    "\\$\\(ReactNativeModulePath\\)": path.relative(
      projectFilesDestPath,
      reactNativeModulePath
    ),
    "\\$\\(SourceFilesPath\\)": path.relative(
      projectFilesDestPath,
      path.join(srcRootPath, projDir)
    ),
    "\\$\\(BundleDirContentPaths\\)": bundleDirContent,
    "\\$\\(BundleFileContentPaths\\)": bundleFileContent,
  };

  const projectFilesMappings = [
    "ReactTestApp.vcxproj",
    "PropertySheet.props",
    "Package.appxmanifest",
    "ReactTestApp.vcxproj.filters",
    "ReactTestApp_TemporaryKey.pfx",
    "packages.config",
  ].map((file) => ({
    from: path.join(srcRootPath, projDir, file),
    to: path.join(projectFilesDestPath, file),
  }));

  for (const mapping of projectFilesMappings) {
    copyAndReplace(mapping.from, mapping.to, projectFilesReplacements);
  }

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

    copyTestProject(
      testProjectFilePath,
      testProjectTemplateFile,
      path.join(srcRootPath, projDir),
      projectFilesDestPath
    );
  }

  const solutionFileReplacements = {
    "\\$\\(ReactNativeModulePath\\)": path.relative(
      destPath,
      reactNativeModulePath
    ),
    "\\$\\(ReactTestAppProjectPath\\)": path.relative(
      destPath,
      projectFilesDestPath
    ),
    "\\$\\(TestProject\\)": testProjectEntry,
  };

  copyAndReplace(
    path.join(srcRootPath, "ReactTestApp.sln"),
    path.join(destPath, `${appName}.sln`),
    solutionFileReplacements
  );
}

copyProjectTemplateAndReplace(
  destPath,
  closestNodeModules,
  reactNativeModulePath,
  testAppNodeModulePath
);
