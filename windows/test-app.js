#!/usr/bin/env node
// @ts-check
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  findNearest,
  getPackageVersion,
  readJSONFile,
  requireTransitive,
  toVersionNumber,
  v,
} = require("../scripts/helpers");
const { parseArgs } = require("../scripts/parseargs");

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
 *
 * @typedef {string[] | { windows?: string[] }} Resources;
 *
 * @typedef {{
 *   name?: string;
 *   singleApp?: string;
 *   resources?: Resources;
 *   windows?: {
 *     appxManifest?: string;
 *     certificateKeyFile?: string;
 *     certificatePassword?: string;
 *     certificateThumbprint?: string;
 *   };
 * }} AppManifest
 */

const templateView = {
  name: "ReactTestApp",
  projectGuidUpper: "{B44CEAD7-FBFF-4A17-95EA-FF5434BBD79D}",
  useExperimentalNuget: false,
};

const uniqueFilterIdentifier = "e48dc53e-40b1-40cb-970a-f89935452892";

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
function copy(src, dest, fs = require("fs")) {
  fs.mkdir(dest, mkdirRecursiveOptions, (err) => {
    rethrow(err);
    fs.readdir(src, { withFileTypes: true }, (err, files) => {
      rethrow(err);
      files.forEach((file) => {
        const source = path.join(src, file.name);
        const target = path.join(dest, file.name);
        file.isDirectory()
          ? copy(source, target, fs)
          : fs.copyFile(source, target, rethrow);
      });
    });
  });
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
 * Finds NuGet dependencies.
 *
 * Visual Studio (?) currently does not download transitive dependencies. This
 * is a workaround until `react-native-windows` autolinking adds support.
 *
 * @see {@link https://github.com/microsoft/react-native-windows/issues/9578}
 * @param {string} rnWindowsPath
 * @returns {[string, string][]}
 */
function getNuGetDependencies(rnWindowsPath) {
  const pkgJson = findNearest("package.json");
  if (!pkgJson) {
    return [];
  }

  /** @type {import("@react-native-community/cli")} */
  const { loadConfig } = requireTransitive(
    ["@react-native-community/cli"],
    rnWindowsPath
  );
  const dependencies = Object.values(loadConfig().dependencies);

  const { XMLParser } = require("fast-xml-parser");
  const xml = new XMLParser({
    ignoreAttributes: false,
    transformTagName: (tag) => tag.toLowerCase(),
  });

  const lowerCase = (/** @type{Record<string, string>} */ refs) => {
    for (const key of Object.keys(refs)) {
      refs[key.toLowerCase()] = refs[key];
    }
    return refs;
  };

  /** @type {Record<string, [string, string]>} */
  const packageRefs = {};

  for (const { root, platforms } of dependencies) {
    /** @type {{ projects?: Record<string, string>[]; sourceDir?: string; }?} */
    const windows = platforms?.["windows"];
    if (!windows || !Array.isArray(windows.projects)) {
      continue;
    }

    const projects = windows.projects.map(({ projectFile }) =>
      path.join(root, windows.sourceDir || ".", projectFile)
    );

    if (!Array.isArray(projects)) {
      continue;
    }

    // Look for `PackageReference` entries:
    //
    //     <Project>
    //         <ImportGroup>
    //             <PackageReference ... />
    //             <PackageReference ... />
    //         </ImportGroup>
    //     </Project>
    //
    for (const vcxproj of projects) {
      const proj = xml.parse(fs.readFileSync(vcxproj, textFileReadOptions));
      const itemGroup = proj.project?.itemgroup;
      if (!itemGroup) {
        continue;
      }

      const itemGroups = Array.isArray(itemGroup) ? itemGroup : [itemGroup];
      for (const group of itemGroups) {
        const pkgRef = group["packagereference"];
        if (!pkgRef) {
          continue;
        }

        const refs = Array.isArray(pkgRef) ? pkgRef : [pkgRef];
        for (const ref of refs) {
          // Attributes are not case-sensitive
          lowerCase(ref);

          const id = ref["@_include"];
          const version = ref["@_version"];
          if (!id || !version) {
            continue;
          }

          // Package ids are not case-sensitive
          packageRefs[id.toLowerCase()] = [id, version];
        }
      }
    }
  }

  // Remove dependencies managed by us
  const config = path.join(__dirname, "ReactTestApp", "packages.config");
  const matches = fs
    .readFileSync(config, textFileReadOptions)
    .matchAll(/package id="(.+?)"/g);
  for (const m of matches) {
    const id = m[1].toLowerCase();
    delete packageRefs[id];
  }

  return Object.values(packageRefs);
}

/**
 * Maps NuGet dependencies to `<Import>` elements.
 * @param {[string, string][]} refs
 * @returns {string}
 */
function importTargets(refs) {
  return refs
    .map(
      ([id, version]) =>
        `<Import Project="$(SolutionDir)packages\\${id}.${version}\\build\\native\\${id}.targets" Condition="Exists('$(SolutionDir)packages\\${id}.${version}\\build\\native\\${id}.targets')" />`
    )
    .join("\n    ");
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
  return `<package id="${id}" version="${version}" targetFramework="native"/>`;
}

/**
 * @param {Required<AppManifest>["windows"]} certificate
 * @param {string} projectPath
 * @returns {string}
 */
function generateCertificateItems(
  { certificateKeyFile, certificateThumbprint, certificatePassword },
  projectPath
) {
  const items = [];
  if (typeof certificateKeyFile === "string") {
    items.push(
      "<AppxPackageSigningEnabled>true</AppxPackageSigningEnabled>",
      `<PackageCertificateKeyFile>$(ProjectRootDir)\\${projectRelativePath(
        projectPath,
        certificateKeyFile
      )}</PackageCertificateKeyFile>`
    );
  }
  if (typeof certificateThumbprint === "string") {
    items.push(
      `<PackageCertificateThumbprint>${certificateThumbprint}</PackageCertificateThumbprint>`
    );
  }
  if (typeof certificatePassword === "string") {
    items.push(
      `<PackageCertificatePassword>${certificatePassword}</PackageCertificatePassword>`
    );
  }
  return items.join("\n    ");
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
  source = "",
  fs = require("fs")
) {
  const uuidv5 = (() => {
    try {
      // @ts-expect-error export only exists in uuid@3.x and older
      return require("uuid/v5");
    } catch (_) {
      // uuid@7.x and above
      const { v5 } = require("uuid");
      return v5;
    }
  })();

  const { assetFilters, assetItemFilters, assetItems } = assets;
  for (const resource of resources) {
    const resourcePath = path.isAbsolute(resource)
      ? path.relative(projectPath, resource)
      : resource;
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
        source || path.dirname(resource),
        fs
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
 * @returns {Assets}
 */
function parseResources(resources, projectPath, fs = require("fs")) {
  if (!Array.isArray(resources)) {
    if (resources && resources.windows) {
      return parseResources(resources.windows, projectPath, fs);
    }
    return { assetItems: "", assetItemFilters: "", assetFilters: "" };
  }

  const { assetItems, assetItemFilters, assetFilters } = generateContentItems(
    resources,
    projectPath,
    /* assets */ undefined,
    /* currentFilter */ undefined,
    /* source */ undefined,
    fs
  );

  return {
    assetItems: assetItems.join("\n    "),
    assetItemFilters: assetItemFilters.join("\n    "),
    assetFilters: assetFilters.join("\n    "),
  };
}

/**
 * Returns path to the specified asset relative to the project path.
 * @param {string} projectPath
 * @param {string} assetPath
 * @returns {string}
 */
function projectRelativePath(projectPath, assetPath) {
  return normalizePath(
    path.isAbsolute(assetPath)
      ? path.relative(projectPath, assetPath)
      : assetPath
  );
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
 * @param {Record<string, string> | undefined} replacements e.g. {'TextToBeReplaced': 'Replacement'}
 * @param {(error: Error | null) => void=} callback Callback for when the copy operation is done.
 */
function copyAndReplace(
  srcPath,
  destPath,
  replacements,
  callback = rethrow,
  fs = require("fs")
) {
  const stat = fs.statSync(srcPath);
  if (stat.isDirectory()) {
    copy(srcPath, destPath, fs);
  } else if (!replacements) {
    fs.copyFile(srcPath, destPath, callback);
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
 * @returns {{
 *   appName: string;
 *   appxManifest: string;
 *   assetItems: string;
 *   assetItemFilters: string;
 *   assetFilters: string;
 *   packageCertificate: string;
 *   singleApp?: string;
 * }} Application name, and paths to directories and files to include.
 */
function getBundleResources(manifestFilePath, fs = require("fs")) {
  // Default value if manifest or 'name' field don't exist.
  const defaultName = "ReactTestApp";

  // Default `Package.appxmanifest` path. The project will automatically use our
  // fallback if there is no file at this path.
  const defaultAppxManifest = "windows/Package.appxmanifest";

  if (manifestFilePath) {
    try {
      /** @type {AppManifest} */
      const manifest = readJSONFile(manifestFilePath, fs);
      const { name, singleApp, resources, windows } = manifest;
      const projectPath = path.dirname(manifestFilePath);
      return {
        appName: name || defaultName,
        singleApp,
        appxManifest: projectRelativePath(
          projectPath,
          (windows && windows.appxManifest) || defaultAppxManifest
        ),
        packageCertificate: generateCertificateItems(
          windows || {},
          projectPath
        ),
        ...parseResources(resources, projectPath, fs),
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
    packageCertificate: "",
  };
}

/**
 * Returns the version of Hermes that should be installed.
 * @param {string} rnwPath Path to `react-native-windows`.
 * @returns {string | null}
 */
function getHermesVersion(rnwPath, fs = require("fs")) {
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
 * Generates Visual Studio solution.
 * @param {string} destPath Destination path.
 * @param {{ autolink: boolean; useHermes: boolean | undefined; useNuGet: boolean; }} options
 * @returns {string | undefined} An error message; `undefined` otherwise.
 */
function generateSolution(
  destPath,
  { autolink, useHermes, useNuGet },
  fs = require("fs")
) {
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

  const rnTestAppPath = findNearest(
    path.join(nodeModulesDir, "react-native-test-app"),
    undefined,
    fs
  );
  if (!rnTestAppPath) {
    return "Could not find 'react-native-test-app'";
  }

  const projDir = "ReactTestApp";
  const projectFilesDestPath = path.join(
    path.dirname(projectManifest),
    nodeModulesDir,
    ".generated",
    "windows",
    projDir
  );

  fs.mkdirSync(projectFilesDestPath, mkdirRecursiveOptions);
  fs.mkdirSync(destPath, mkdirRecursiveOptions);

  require("../scripts/validate-manifest").validate("file", destPath);

  const manifestFilePath = findNearest("app.json", destPath, fs);
  const {
    appName,
    appxManifest,
    assetItems,
    assetItemFilters,
    assetFilters,
    packageCertificate,
    singleApp,
  } = getBundleResources(manifestFilePath, fs);

  const rnWindowsVersion = getPackageVersion(
    "react-native-windows",
    rnWindowsPath,
    fs
  );
  const rnWindowsVersionNumber = toVersionNumber(rnWindowsVersion);
  const hermesVersion = useHermes && getHermesVersion(rnWindowsPath, fs);
  const usePackageReferences =
    rnWindowsVersionNumber === 0 || rnWindowsVersionNumber >= v(0, 68, 0);
  const xamlVersion =
    rnWindowsVersionNumber > 0 && rnWindowsVersionNumber < v(0, 67, 0)
      ? "2.6.0"
      : "2.7.0";

  const nuGetDependencies = getNuGetDependencies(rnWindowsPath);

  /** @type {[string, Record<string, string>?][]} */
  const projectFiles = [
    ["Assets"],
    ["AutolinkedNativeModules.g.cpp"],
    ["AutolinkedNativeModules.g.props"],
    ["AutolinkedNativeModules.g.targets"],
    ["Package.appxmanifest"],
    ["PropertySheet.props"],
    [
      "ReactTestApp.vcxproj",
      {
        "REACT_NATIVE_VERSION=1000000000;": `REACT_NATIVE_VERSION=${rnWindowsVersionNumber};`,
        "\\$\\(ReactTestAppPackageManifest\\)": appxManifest,
        "\\$\\(ReactNativeWindowsNpmVersion\\)": rnWindowsVersion,
        "<!-- ReactTestApp asset items -->": assetItems,
        "<!-- ReactTestApp additional targets -->":
          importTargets(nuGetDependencies),
        ...(typeof singleApp === "string"
          ? { "ENABLE_SINGLE_APP_MODE=0;": "ENABLE_SINGLE_APP_MODE=1;" }
          : undefined),
        ...(useNuGet
          ? {
              "<UseExperimentalNuget>false</UseExperimentalNuget>":
                "<UseExperimentalNuget>true</UseExperimentalNuget>",
              "<WinUI2xVersionDisabled />": `<WinUI2xVersion>${xamlVersion}</WinUI2xVersion>`,
            }
          : undefined),
        ...(packageCertificate
          ? {
              "<AppxPackageSigningEnabled>false</AppxPackageSigningEnabled>":
                packageCertificate,
            }
          : undefined),
      },
    ],
    [
      "ReactTestApp.vcxproj.filters",
      {
        "<!-- ReactTestApp asset item filters -->": assetItemFilters,
        "<!-- ReactTestApp asset filters -->": assetFilters,
        "\\$\\(ReactTestAppPackageManifest\\)": appxManifest,
      },
    ],
    [
      "packages.config",
      {
        '<package id="Microsoft.UI.Xaml" version="0.0.0" targetFramework="native"/>':
          nuGetPackage("Microsoft.UI.Xaml", xamlVersion),
        "<!-- additional packages -->": nuGetDependencies
          .map(([id, version]) => nuGetPackage(id, version))
          .join("\n  "),
        ...(useNuGet && !usePackageReferences
          ? {
              '<!-- package id="Microsoft.ReactNative" version="1000.0.0" targetFramework="native"/ -->':
                nuGetPackage("Microsoft.ReactNative", rnWindowsVersion),
              '<!-- package id="Microsoft.ReactNative.Cxx" version="1000.0.0" targetFramework="native"/ -->':
                nuGetPackage("Microsoft.ReactNative.Cxx", rnWindowsVersion),
            }
          : undefined),
        ...(hermesVersion && !usePackageReferences
          ? {
              '<!-- package id="ReactNative.Hermes.Windows" version="0.0.0" targetFramework="native"/ -->':
                nuGetPackage("ReactNative.Hermes.Windows", hermesVersion),
            }
          : undefined),
      },
    ],
  ];

  const copyTasks = projectFiles.map(([file, replacements]) =>
    copyAndReplace(
      path.join(__dirname, projDir, file),
      path.join(projectFilesDestPath, file),
      replacements,
      undefined,
      fs
    )
  );

  const additionalProjectEntries = findUserProjects(destPath)
    .map((project) => toProjectEntry(project, destPath))
    .join(os.EOL);

  const solutionTemplatePath = findNearest(
    path.join(
      nodeModulesDir,
      "react-native-windows",
      "template",
      "cpp-app",
      "proj",
      "MyApp.sln"
    ),
    undefined,
    fs
  );
  if (!solutionTemplatePath) {
    throw new Error("Failed to find solution template");
  }

  /** @type {import("mustache")} */
  const mustache = requireTransitive(
    ["@react-native-windows/cli", "mustache"],
    rnWindowsPath
  );
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

  const experimentalFeaturesPropsFilename = "ExperimentalFeatures.props";
  const experimentalFeaturesPropsPath = path.join(
    destPath,
    experimentalFeaturesPropsFilename
  );
  if (!fs.existsSync(experimentalFeaturesPropsPath)) {
    copyAndReplace(
      path.join(__dirname, experimentalFeaturesPropsFilename),
      experimentalFeaturesPropsPath,
      {
        ...(hermesVersion
          ? { "<UseHermes>false</UseHermes>": `<UseHermes>true</UseHermes>` }
          : undefined),
      },
      undefined,
      fs
    );
  }

  // TODO: Remove when we drop support for 0.67.
  // Patch building with Visual Studio 2022. For more details, see
  // https://github.com/microsoft/react-native-windows/issues/9559
  if (rnWindowsVersionNumber < v(0, 68, 0)) {
    const dispatchQueue = path.join(
      rnWindowsPath,
      "Mso",
      "dispatchQueue",
      "dispatchQueue.h"
    );
    copyAndReplace(
      dispatchQueue,
      dispatchQueue,
      {
        "template <typename T>\\s*inline void MustBeNoExceptVoidFunctor\\(\\) {\\s*static_assert\\(false":
          "namespace details {\n  template <typename>\n  constexpr bool always_false = false;\n}\n\ntemplate <typename T>\ninline void MustBeNoExceptVoidFunctor() {\n  static_assert(details::always_false<T>",
      },
      undefined,
      fs
    );
  }

  // TODO: Remove when we drop support for 0.69.
  // Patch building with Visual Studio 2022. For more details, see
  // https://github.com/microsoft/react-native-windows/pull/10373
  if (rnWindowsVersionNumber < v(0, 70, 0)) {
    const helpers = path.join(
      rnWindowsPath,
      "Microsoft.ReactNative",
      "Utils",
      "Helpers.h"
    );
    copyAndReplace(
      helpers,
      helpers,
      {
        "inline typename T asEnum": "inline T asEnum",
      },
      undefined,
      fs
    );
  }

  if (useNuGet) {
    const nugetConfigPath =
      findNearest(
        // In 0.70, the template was renamed from `NuGet.Config` to `NuGet_Config`
        path.join(
          nodeModulesDir,
          "react-native-windows",
          "template",
          "shared-app",
          "proj",
          "NuGet_Config"
        ),
        undefined,
        fs
      ) ||
      findNearest(
        // In 0.64, the template was moved into `react-native-windows`
        path.join(
          nodeModulesDir,
          "react-native-windows",
          "template",
          "shared-app",
          "proj",
          "NuGet.Config"
        ),
        undefined,
        fs
      );
    const nugetConfigDestPath = path.join(destPath, "NuGet.Config");
    if (nugetConfigPath && !fs.existsSync(nugetConfigDestPath)) {
      fs.writeFile(
        nugetConfigDestPath,
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
        ["react-native", "autolink-windows", "--proj", reactTestAppProjectPath],
        { stdio: "inherit" }
      ).on("close", (code) => {
        if (code !== 0) {
          process.exitCode = code || 1;
        }
      });
    });
  }

  return undefined;
}

exports.copy = copy;
exports.copyAndReplace = copyAndReplace;
exports.findUserProjects = findUserProjects;
exports.generateSolution = generateSolution;
exports.getBundleResources = getBundleResources;
exports.getHermesVersion = getHermesVersion;
exports.nuGetPackage = nuGetPackage;
exports.parseResources = parseResources;
exports.replaceContent = replaceContent;
exports.toProjectEntry = toProjectEntry;

if (require.main === module) {
  require("../scripts/link")(module);

  parseArgs(
    "Generate a Visual Studio solution for React Test App",
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
        default: require("os").platform() === "win32",
      },
      "use-hermes": {
        description: "Use Hermes JavaScript engine (experimental)",
        type: "boolean",
        default: false,
      },
      "use-nuget": {
        description: "Use NuGet packages (experimental)",
        type: "boolean",
        default: false,
      },
    },
    ({
      "project-directory": projectDirectory,
      autolink,
      "use-hermes": useHermes,
      "use-nuget": useNuGet,
    }) => {
      const options = { autolink, useHermes, useNuGet };
      const error = generateSolution(path.resolve(projectDirectory), options);
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    }
  );
}
