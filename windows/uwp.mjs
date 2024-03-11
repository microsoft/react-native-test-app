// @ts-check
import * as path from "node:path";
import { importTargets } from "./project.mjs";

/** @type {import("../scripts/types.js").MSBuildProjectConfigurator} */
export function configureForUWP({
  bundle,
  nugetDependencies,
  version,
  versionNumber,
}) {
  /** @type {import("../scripts/types.js").MSBuildProjectParams["projectFiles"]} */
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
        "\\$\\(ReactNativeWindowsVersionNumber\\)": versionNumber.toString(),
        "REACT_NATIVE_VERSION=1000000000;": `REACT_NATIVE_VERSION=${versionNumber};`,
        "\\$\\(ReactTestAppPackageManifest\\)": bundle.appxManifest,
        "\\$\\(ReactNativeWindowsNpmVersion\\)": version,
        "<!-- ReactTestApp asset items -->": bundle.assetItems,
        "<!-- ReactTestApp additional targets -->":
          importTargets(nugetDependencies),
        ...(typeof bundle.singleApp === "string"
          ? { "ENABLE_SINGLE_APP_MODE=0;": "ENABLE_SINGLE_APP_MODE=1;" }
          : undefined),
        ...(bundle.packageCertificate
          ? {
              "<AppxPackageSigningEnabled>false</AppxPackageSigningEnabled>":
                bundle.packageCertificate,
            }
          : undefined),
      },
    ],
    [
      "ReactTestApp.vcxproj.filters",
      {
        "<!-- ReactTestApp asset item filters -->": bundle.assetItemFilters,
        "<!-- ReactTestApp asset filters -->": bundle.assetFilters,
        "\\$\\(ReactTestAppPackageManifest\\)": bundle.appxManifest,
      },
    ],
  ];

  return {
    projDir: "UWP",
    projectFileName: "ReactTestApp.vcxproj",
    projectFiles,
    solutionTemplatePath: path.join("template", "cpp-app", "proj", "MyApp.sln"),
  };
}
