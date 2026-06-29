// @ts-check
import { resolveCommunityCLI } from "@rnx-kit/tools-react-native/context";
import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "node:crypto";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import {
  findNearest,
  getPackageVersion,
  memo,
  readJSONFile,
  readTextFile,
  toVersionNumber,
  v,
} from "../scripts/helpers.js";
import * as colors from "../scripts/utils/colors.mjs";

/**
 * @import { Config } from "@react-native-community/cli-types"
 * @import {
 *   AppManifest,
 *   AppxBundle,
 *   AssetItems,
 *   Assets,
 *   MSBuildProjectOptions,
 *   ProjectInfo,
 * } from "../scripts/types.js";
 */

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
 * @type {(rnWindowsPath: string) => Promise<Config>}
 */
export const loadReactNativeConfig = memo((rnWindowsPath) => {
  const rncli = "file://" + resolveCommunityCLI(rnWindowsPath);
  return import(rncli).then(async (cli) => {
    const { loadConfig, loadConfigAsync } = cli?.default ?? cli;
    if (!loadConfigAsync) {
      // The signature of `loadConfig` changed in 14.0.0:
      // https://github.com/react-native-community/cli/commit/b787c89edb781bb788576cd615d2974fc81402fc
      return loadConfig.length === 1 ? loadConfig({}) : loadConfig();
    }

    return await loadConfigAsync({});
  });
});

/**
 * @param {string} message
 */
function warn(message) {
  console.warn(colors.warnTag, message);
}

/**
 * @param {string[]} resources
 * @param {string} projectPath
 * @param {AssetItems} assets
 * @param {string} currentFilter
 * @param {string} source
 * @returns {AssetItems}
 */
function generateAssetItems(
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
      assetFilters.push(
        `<Filter Include="${filter}">`,
        `  <UniqueIdentifier>{${randomUUID()}}</UniqueIdentifier>`,
        `</Filter>`
      );

      const files = fs
        .readdirSync(resourcePath)
        .map((file) => path.join(resource, file));
      generateAssetItems(
        files,
        projectPath,
        assets,
        filter,
        source || path.dirname(resource),
        fs
      );
    } else {
      const assetPath = normalizePath(resourcePath);
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
 * @param {string[]} resources
 * @param {string} projectPath
 * @param {string=} currentDir
 * @param {string=} destination
 * @param {string[]=} result
 * @returns {string[]}
 */
function generateContentItems(
  resources,
  projectPath,
  currentDir = ".",
  destination = "Bundle",
  result = [],
  fs = nodefs
) {
  for (const res of resources) {
    const assetPath = path.isAbsolute(res)
      ? path.relative(projectPath, res)
      : path.join(currentDir, res);
    if (!fs.existsSync(assetPath)) {
      warn(`Resource not found: ${res}`);
      continue;
    }

    const link = `${destination}\\${path.basename(assetPath)}`;
    if (fs.statSync(assetPath).isDirectory()) {
      generateContentItems(
        fs.readdirSync(assetPath),
        projectPath,
        assetPath,
        link,
        result,
        fs
      );
    } else {
      result.push(
        `<Content Include="$(ProjectRootDir)\\${normalizePath(assetPath)}">`,
        `  <Link>${link}</Link>`,
        `  <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>`,
        `</Content>`
      );
    }
  }
  return result;
}

/**
 * Finds NuGet dependencies.
 *
 * Visual Studio (?) currently does not download transitive dependencies. This
 * is a workaround until `react-native-windows` autolinking adds support.
 *
 * @see {@link https://github.com/microsoft/react-native-windows/issues/9578}
 * @param {string} rnWindowsPath
 * @returns {Promise<[string, string][]>}
 */
async function getNuGetDependencies(rnWindowsPath, fs = nodefs) {
  const pkgJson = findNearest("package.json", undefined, fs);
  if (!pkgJson) {
    return [];
  }

  const config = await loadReactNativeConfig(rnWindowsPath);
  const dependencies = Object.values(config.dependencies);

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
  const vcxprojUrl = new URL("UWP/ReactTestApp.vcxproj", import.meta.url);
  const vcxproj = readTextFile(fileURLToPath(vcxprojUrl), fs);
  const matches = vcxproj.matchAll(/PackageReference Include="(.+?)"/g);
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
 * @param {string[] | { windows?: string[] } | undefined} resources
 * @param {string} projectPath
 * @param {Pick<ProjectInfo, "useFabric">} options
 * @returns {Assets}
 */
export function parseResources(resources, projectPath, options, fs = nodefs) {
  if (!Array.isArray(resources)) {
    if (resources?.windows) {
      return parseResources(resources.windows, projectPath, options, fs);
    }
    return {
      assetItems: "",
      assetItemFilters: "",
      assetFilters: "",
      contentItems: "",
    };
  } else if (!options.useFabric) {
    const { assetItems, assetItemFilters, assetFilters } = generateAssetItems(
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
      contentItems: "",
    };
  }

  return {
    assetItems: "",
    assetItemFilters: "",
    assetFilters: "",
    contentItems: generateContentItems(
      resources,
      projectPath,
      /** currentDir */ undefined,
      /** destination */ undefined,
      /** result */ undefined,
      fs
    ).join("\n    "),
  };
}

/**
 * Reads manifest file and and resolves paths to bundle resources.
 * @param {string | null} manifestFilePath Path to the closest manifest file.
 * @param {Pick<ProjectInfo, "useFabric">} options
 * @returns {AppxBundle} Application name, and paths to directories and files to include.
 */
export function getBundleResources(manifestFilePath, options, fs = nodefs) {
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
        ...parseResources(resources, projectPath, options, fs),
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
    contentItems: "",
    packageCertificate: "",
  };
}

/**
 * @param {MSBuildProjectOptions} options
 * @param {string} rnWindowsPath
 * @param {string} destPath
 * @returns {Promise<ProjectInfo>}
 */
export async function projectInfo(
  options,
  rnWindowsPath,
  destPath,
  fs = nodefs
) {
  const version = getPackageVersion("react-native-windows", rnWindowsPath, fs);
  const versionNumber = toVersionNumber(version);
  const manifestFilePath = findNearest("app.json", destPath, fs);
  const useFabric = options.useFabric ?? versionNumber >= v(0, 80, 0);

  return {
    version,
    versionNumber,
    bundle: getBundleResources(manifestFilePath, { useFabric }, fs),
    nugetDependencies: await getNuGetDependencies(rnWindowsPath),
    useExperimentalNuGet: useFabric || options.useNuGet,
    useFabric,
  };
}
