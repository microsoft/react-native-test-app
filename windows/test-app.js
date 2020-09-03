#!/usr/bin/env node

//@ts-check
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
 * @param srcPath Path to the source file.
 * @param replacements e.g. {'TextToBeReplaced': 'Replacement'}
 * @return The contents of the file with the replacements applied.
 */
function resolveContents(srcPath, replacements) {
    const content = fs.readFileSync(srcPath, "utf8");

    return Object.keys(replacements).reduce((content, regex) => {
        return content.replace(new RegExp(regex, "g"), replacements[regex]);
    }, content);
}

//Binary files in React Native Test App Windows project
const binaryExtensions = [".png", ".pfx"];

/**
 * Copy a file to given destination, replacing parts of its contents.
 * @param srcPath Path to a file to be copied.
 * @param destPath Destination path.
 * @param replacements: e.g. {'TextToBeReplaced': 'Replacement'}
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

function copyTestProject(
    testProjectFilePath,
    testProjectTemplateFile,
    srcRootPath,
    projDir,
    projectFilesDestPath
) {
    const testProjectFileReplacements = {
        "\\$\\(SourceFilesPath\\)": path.relative(
            testProjectFilePath,
            path.join(srcRootPath, projDir)
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

function copyProjectTemplateAndReplace(
  destPath,
  nodeModulesPath,
  reactNativeModulePath,
  testAppNodeModulePath
) {
    if (!destPath) {
        throw new Error("Need a path to copy to");
    }

    if (!reactNativeModulePath) {
        throw new Error("react-native-windows node module is not installed");
    }

    if (!testAppNodeModulePath) {
        throw new Error("react-native-test-app node module is not installed");
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

  //Read path to resources from manifest
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
      console.warn(`Could not parse \'app.json\': \n${e.message}`);
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
          let relativeResourcePath = path.relative(
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

  const projectFilesReplacements = {
    "\\$\\(ManifestRootPath\\)": manifestFilePath
      ? path.relative(projectFilesDestPath, path.dirname(manifestFilePath))
      : "",
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
            srcRootPath,
            projDir,
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
