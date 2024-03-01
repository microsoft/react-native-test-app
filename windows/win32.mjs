// @ts-check
import * as path from "node:path";
import { importTargets } from "./project.mjs";

/** @type {import("../scripts/types").MSBuildProjectConfigurator} */
export function configureForWin32(
  { bundle, nugetDependencies, versionNumber },
  _options
) {
  return {
    projDir: "Win32",
    projectFileName: "ReactApp.vcxproj",
    projectFiles: [
      ["AutolinkedNativeModules.g.cpp"],
      ["Images"],
      ["Main.ico"],
      ["Main.rc"],
      ["Main.small.ico"],
      ["Package.appxmanifest"],
      ["ReactApp.Package.wapproj"],
      [
        "ReactApp.vcxproj",
        {
          "REACT_NATIVE_VERSION=1000000000;": `REACT_NATIVE_VERSION=${versionNumber};`,
          "<!-- ReactTestApp asset items -->": bundle.assetItems,
          "<!-- ReactTestApp additional targets -->":
            importTargets(nugetDependencies),
          ...(typeof bundle.singleApp === "string"
            ? { "ENABLE_SINGLE_APP_MODE=0;": "ENABLE_SINGLE_APP_MODE=1;" }
            : undefined),
        },
      ],
      [
        "ReactApp.vcxproj.filters",
        {
          "<!-- ReactTestApp asset item filters -->": bundle.assetItemFilters,
          "<!-- ReactTestApp asset filters -->": bundle.assetFilters,
        },
      ],
      ["resource.h"],
    ],
    solutionTemplatePath: path.join(
      "templates",
      "cpp-app",
      "windows",
      "MyApp.sln"
    ),
  };
}
