// @ts-check
import { XMLParser } from "fast-xml-parser";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { v5 as uuidv5 } from "uuid";
import * as colors from "../scripts/colors.mjs";
import {
  findNearest,
  getPackageVersion,
  memo,
  readJSONFile,
  readTextFile,
  requireTransitive,
  toVersionNumber,
  v,
} from "../scripts/helpers.js";
import { fileURLToPath } from "node:url";

/**
 * @typedef {import("../scripts/types").AppManifest} AppManifest
 * @typedef {import("../scripts/types").AppxBundle} AppxBundle
 * @typedef {import("../scripts/types").AssetItems} AssetItems;
 * @typedef {import("../scripts/types").Assets} Assets;
 * @typedef {import("../scripts/types").MSBuildProjectOptions} MSBuildProjectOptions;
 * @typedef {import("../scripts/types").ProjectInfo} ProjectInfo;
 */

const uniqueFilterIdentifier = "e48dc53e-40b1-40cb-970a-f89935452892";

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
 * Equivalent to invoking `react-native config`.
 * @param {string} rnWindowsPath
 */
export const loadReactNativeConfig = memo((rnWindowsPath) => {
  /** @type {import("@react-native-community/cli")} */
  const { loadConfig } = requireTransitive(
    ["@react-native-community/cli"],
    rnWindowsPath
  );
  return loadConfig();
});

/**
 * @param {string} message
 */
function warn(message) {
  const tag = colors.yellow(colors.bold("warn"));
  console.warn(tag, message);
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
  fs = nodefs
) {
  const { assetFilters, assetItemFilters, assetItems } = assets;
  for (const resource of resources) {
    const resourcePath = path.isAbsolute(resource)
      ? path.relative(projectPath, resource)
      : resource;
    if (!fs.existsSync(resourcePath)) {
      warn(`Resource not found: ${resource}`);
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
 * Finds NuGet dependencies.
 *
 * Visual Studio (?) currently does not download transitive dependencies. This
 * is a workaround until `react-native-windows` autolinking adds support.
 *
 * @see {@link https://github.com/microsoft/react-native-windows/issues/9578}
 * @param {string} rnWindowsPath
 * @returns {[string, string][]}
 */
function getNuGetDependencies(rnWindowsPath, fs = nodefs) {
  const pkgJson = findNearest("package.json", undefined, fs);
  if (!pkgJson) {
    return [];
  }

  const dependencies = Object.values(
    loadReactNativeConfig(rnWindowsPath).dependencies
  );

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
      const proj = xml.parse(readTextFile(vcxproj, fs));
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
  const config = fileURLToPath(new URL("UWP/packages.config", import.meta.url));
  const matches = readTextFile(config, fs).matchAll(/package id="(.+?)"/g);
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
export function importTargets(refs) {
  return refs
    .map(
      ([id, version]) =>
        `<Import Project="$(SolutionDir)packages\\${id}.${version}\\build\\native\\${id}.targets" Condition="Exists('$(SolutionDir)packages\\${id}.${version}\\build\\native\\${id}.targets')" />`
    )
    .join("\n    ");
}

/**
 * Returns a NuGet package entry for specified package id and version.
 * @param {string} id NuGet package id
 * @param {string} version NuGet package version
 * @returns {string}
 */
export function nugetPackage(id, version) {
  return `<package id="${id}" version="${version}" targetFramework="native"/>`;
}

/**
 * @param {string[] | { windows?: string[] } | undefined} resources
 * @param {string} projectPath
 * @returns {Assets}
 */
export function parseResources(resources, projectPath, fs = nodefs) {
  if (!Array.isArray(resources)) {
    if (resources?.windows) {
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
 * Reads manifest file and and resolves paths to bundle resources.
 * @param {string | null} manifestFilePath Path to the closest manifest file.
 * @returns {AppxBundle} Application name, and paths to directories and files to include.
 */
export function getBundleResources(manifestFilePath, fs = nodefs) {
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
          windows?.appxManifest || defaultAppxManifest
        ),
        packageCertificate: generateCertificateItems(
          windows || {},
          projectPath
        ),
        ...parseResources(resources, projectPath, fs),
      };
    } catch (e) {
      if (isErrorLike(e)) {
        warn(`Could not parse 'app.json':\n${e.message}`);
      } else {
        throw e;
      }
    }
  } else {
    warn("Could not find 'app.json' file.");
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
export function getHermesVersion(rnwPath, fs = nodefs) {
  const jsEnginePropsPath = path.join(
    rnwPath,
    "PropertySheets",
    "JSEngine.props"
  );
  const props = readTextFile(jsEnginePropsPath, fs);
  const m = props.match(/<HermesVersion.*?>(.+?)<\/HermesVersion>/);
  return m && m[1];
}

/**
 * @param {MSBuildProjectOptions} options
 * @param {string} rnWindowsPath
 * @param {string} destPath
 * @returns {ProjectInfo}
 */
export function projectInfo(
  { useFabric, useHermes, useNuGet },
  rnWindowsPath,
  destPath,
  fs = nodefs
) {
  const version = getPackageVersion("react-native-windows", rnWindowsPath, fs);
  const versionNumber = toVersionNumber(version);

  const newArch =
    Boolean(useFabric) && (versionNumber === 0 || versionNumber >= v(0, 74, 0));
  if (useFabric && !newArch) {
    warn("New Architecture requires `react-native-windows` 0.74+");
  }

  return {
    version,
    versionNumber,
    bundle: getBundleResources(findNearest("app.json", destPath, fs), fs),
    hermesVersion:
      (newArch || (useHermes ?? versionNumber >= v(0, 73, 0))) &&
      getHermesVersion(rnWindowsPath, fs),
    nugetDependencies: getNuGetDependencies(rnWindowsPath),
    useExperimentalNuGet: !newArch && useNuGet,
    useFabric: newArch,
    usePackageReferences: versionNumber === 0 || versionNumber >= v(0, 68, 0),
    xamlVersion:
      versionNumber === 0 || versionNumber >= v(0, 73, 0)
        ? "2.8.0"
        : versionNumber >= v(0, 67, 0)
          ? "2.7.0"
          : "2.6.0",
  };
}
