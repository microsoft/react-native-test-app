// @ts-check
import * as path from "node:path";
import { importTargets, nugetPackage } from "./project.mjs";

/** @type {import("../scripts/types").MSBuildProjectConfigurator} */
export function configureForUWP(
  {
    bundle,
    hermesVersion,
    nugetDependencies,
    usePackageReferences,
    version,
    versionNumber,
    xamlVersion,
  },
  { useNuGet }
) {
  return {
    projDir: "UWP",
    projectFileName: "ReactTestApp.vcxproj",
    projectFiles: [
      ["Assets"],
      ["AutolinkedNativeModules.g.cpp"],
      ["AutolinkedNativeModules.g.props"],
      ["AutolinkedNativeModules.g.targets"],
      ["Package.appxmanifest"],
      ["PropertySheet.props"],
      [
        "ReactTestApp.vcxproj",
        {
          "REACT_NATIVE_VERSION=1000000000;": `REACT_NATIVE_VERSION=${versionNumber};`,
          "\\$\\(ReactTestAppPackageManifest\\)": bundle.appxManifest,
          "\\$\\(ReactNativeWindowsNpmVersion\\)": version,
          "<!-- ReactTestApp asset items -->": bundle.assetItems,
          "<!-- ReactTestApp additional targets -->":
            importTargets(nugetDependencies),
          ...(typeof bundle.singleApp === "string"
            ? { "ENABLE_SINGLE_APP_MODE=0;": "ENABLE_SINGLE_APP_MODE=1;" }
            : undefined),
          ...(useNuGet
            ? {
                "<WinUI2xVersionDisabled />": `<WinUI2xVersion>${xamlVersion}</WinUI2xVersion>`,
              }
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
      [
        "packages.config",
        {
          '<package id="Microsoft.UI.Xaml" version="0.0.0" targetFramework="native"/>':
            nugetPackage("Microsoft.UI.Xaml", xamlVersion),
          "<!-- additional packages -->": nugetDependencies
            .map(([id, version]) => nugetPackage(id, version))
            .join("\n  "),
          ...(useNuGet && !usePackageReferences
            ? {
                '<!-- package id="Microsoft.ReactNative" version="1000.0.0" targetFramework="native"/ -->':
                  nugetPackage("Microsoft.ReactNative", version),
                '<!-- package id="Microsoft.ReactNative.Cxx" version="1000.0.0" targetFramework="native"/ -->':
                  nugetPackage("Microsoft.ReactNative.Cxx", version),
              }
            : undefined),
          ...(hermesVersion && !usePackageReferences
            ? {
                '<!-- package id="ReactNative.Hermes.Windows" version="0.0.0" targetFramework="native"/ -->':
                  nugetPackage("ReactNative.Hermes.Windows", hermesVersion),
              }
            : undefined),
        },
      ],
    ],
    solutionTemplatePath: path.join("template", "cpp-app", "proj", "MyApp.sln"),
  };
}
