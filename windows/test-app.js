//@ts-check
const path = require("path");
const fs = require("fs");

const windowsDir = "windows";
const reactNativeModulePath = findClosestPathTo(
  path.join("node_modules", "react-native-windows")
);
const testAppNodeModulePath = findClosestPathTo(
  path.join("node_modules", "react-native-test-app")
);
const srcRootPath = path.join(testAppNodeModulePath, windowsDir);
const destPath = path.resolve("");

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

function walk(current) {
  if (!fs.lstatSync(current).isDirectory()) {
    return [current];
  }

  const files = fs
    .readdirSync(current)
    .map((child) => walk(path.join(current, child)));
  return [current, ...files.flat()];
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
function copyAndReplace(
  srcPath,
  destPath,
  relativeDestPath,
  replacements = {}
) {
  const fullDestPath = path.join(destPath, relativeDestPath);
  if (fs.lstatSync(srcPath).isDirectory()) {
    if (!fs.existsSync(fullDestPath)) {
      fs.mkdirSync(fullDestPath);
    }
    return;
  }

  const extension = path.extname(srcPath);
  if (binaryExtensions.indexOf(extension) !== -1) {
    // Binary file
    fs.copyFile(srcPath, fullDestPath, (err) => {
      if (err) {
        throw err;
      }
    });
  } else {
    // Text file
    const srcPermissions = fs.statSync(srcPath).mode;
    const content = resolveContents(srcPath, replacements);
    fs.writeFile(
      fullDestPath,
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

function copyAndReplaceAll(
  srcPath,
  destPath,
  relativeDestDir,
  replacements = {}
) {
  return Promise.all(
    walk(srcPath).map((absoluteSrcFilePath) => {
      const filename = path.relative(srcPath, absoluteSrcFilePath);
      const relativeDestPath = path.join(relativeDestDir, filename);
      return copyAndReplace(
        absoluteSrcFilePath,
        destPath,
        relativeDestPath,
        replacements
      );
    })
  );
}

const cppSourceFilesExtensions = [".h", ".cpp", ".idl", ".xaml"];

function linkSourceFiles(srcPath, destPath, relativeDestDir) {
  return Promise.all(
    walk(srcPath).map((absoluteSrcFilePath) => {
      if (
        cppSourceFilesExtensions.indexOf(path.extname(absoluteSrcFilePath)) !=
        -1
      ) {
        const filename = path.relative(srcPath, absoluteSrcFilePath);
        const fullDestPath = path.join(destPath, relativeDestDir, filename);

        //Avoid creating links when they already exist
        if (!fs.existsSync(fullDestPath)) {
          fs.link(absoluteSrcFilePath, fullDestPath, (err) => {
            if (err) {
              throw err;
            }
          });
        }
      }
    })
  );
}

function copyProjectTemplateAndReplace(
  srcRootPath,
  destPath,
  reactNativeModulePath,
  testAppNodeModulePath
) {
  if (!srcRootPath) {
    throw new Error("Need a path to copy from");
  }

  if (!destPath) {
    throw new Error("Need a path to copy to");
  }

  if (!reactNativeModulePath) {
    throw new Error("react-native-windows node module is not installed");
  }

  if (!testAppNodeModulePath) {
    throw new Error("react-native-test-app node module is not installed");
  }

  const projDir = "ReactTestApp";

  fs.mkdirSync(path.join(destPath, windowsDir, projDir, "Bundle"), {
    recursive: true,
  });

  const manifestFilePath = findClosestPathTo("app.json");

  //Read path to resources from manifest and copy them
  fs.readFile(manifestFilePath, (error, content) => {
    let resourcesPaths = JSON.parse(content.toString()).resources;
    resourcesPaths =
      (resourcesPaths && resourcesPaths.windows) || resourcesPaths;
    if (!Array.isArray(resourcesPaths)) {
      return;
    }
    for (const resource of resourcesPaths) {
      copyAndReplaceAll(
        path.relative(path.dirname(manifestFilePath), resource),
        destPath,
        path.join(windowsDir, projDir, "Bundle", path.basename(resource))
      );
    }
  });

  const projectFilesReplacements = {
    "\\$\\(ManifestRootPath\\)": path.relative(
      path.join(destPath, windowsDir, projDir),
      path.dirname(manifestFilePath)
    ),
    "\\$\\(ReactNativeModulePath\\)": path.relative(
      path.join(destPath, windowsDir, projDir),
      reactNativeModulePath
    ),
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
    to: path.join(windowsDir, projDir, file),
  }));

  for (const mapping of projectFilesMappings) {
    copyAndReplace(
      mapping.from,
      destPath,
      mapping.to,
      projectFilesReplacements
    );
  }

  const solutionFileReplacements = {
    "\\$\\(ReactNativeModulePath\\)": path.relative(
      path.join(destPath, windowsDir),
      reactNativeModulePath
    ),
  };

  copyAndReplace(
    path.join(srcRootPath, "ReactTestApp.sln"),
    destPath,
    path.join(windowsDir, "ReactTestApp.sln"),
    solutionFileReplacements
  );

  copyAndReplaceAll(
    path.join(srcRootPath, projDir, "Assets"),
    destPath,
    path.join(windowsDir, projDir, "Assets")
  );

  linkSourceFiles(
    path.join(srcRootPath, projDir),
    destPath,
    path.join(windowsDir, projDir)
  );
}

copyProjectTemplateAndReplace(
  srcRootPath,
  destPath,
  reactNativeModulePath,
  testAppNodeModulePath
);
