/*****************
 * configure.mjs *
 *****************/

export type FileCopy = { source: string };

export type Configuration = {
  files: Record<string, string | FileCopy>;
  oldFiles: string[];
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
};

export type PlatformConfiguration = {
  common: Configuration;
  android: Configuration;
  ios: Configuration;
  macos: Configuration;
  visionos: Configuration;
  windows: Configuration;
};

export type PlatformPackage =
  | "react-native"
  | "react-native-macos"
  | "react-native-windows"
  | "@callstack/react-native-visionos";

export type Platform = keyof PlatformConfiguration;

export type ConfigureParams = {
  name: string;
  packagePath: string;
  templatePath?: string;
  testAppPath: string;
  targetVersion: string;
  platforms: Platform[];
  flatten: boolean;
  force: boolean;
  init: boolean;
};

export type ProjectConfig = {
  android?: { sourceDir: string };
  ios?: { sourceDir: string };
  windows?: { sourceDir: string; solutionFile: string };
};

export type ProjectParams = {
  android: {
    sourceDir: string;
    manifestPath: string;
  };
  ios: {
    sourceDir?: string;
    project?: string;
  };
  windows: {
    sourceDir: string;
    solutionFile: string;
    project: { projectFile: string };
  };
};

/*****************
 * parseargs.mjs *
 *****************/

type Option = {
  description: string;
  type: "string" | "boolean";
  multiple?: boolean;
  short?: string;
  default?: string | boolean | string[];
};

export type Options = { [key: string]: Option };

type InferredOptionType<O> = O extends { type: "boolean" }
  ? boolean
  : O extends { type: "string"; multiple: true }
    ? string[]
    : string;

type InferredOptionTypes<O> = { [key in keyof O]: InferredOptionType<O[key]> };

export type Args<O> = InferredOptionTypes<O> & { _: string[] };

/***********************
 * windows/project.mjs *
 ***********************/

export type AppxBundle = {
  appName: string;
  appxManifest: string;
  assetItems: string;
  assetItemFilters: string;
  assetFilters: string;
  packageCertificate: string;
  singleApp?: string;
};

export type MSBuildProjectOptions = {
  autolink: boolean;
  useFabric?: boolean;
  useHermes?: boolean;
  useNuGet: boolean;
};

export type MSBuildProjectParams = {
  projDir: string;
  projectFileName: string;
  projectFiles: [string, Record<string, string>?][];
  solutionTemplatePath: string;
};

export type ProjectInfo = {
  version: string;
  versionNumber: number;
  bundle: AppxBundle;
  hermesVersion: string | false | null;
  nugetDependencies: [string, string][];
  useExperimentalNuGet: boolean;
  useFabric: boolean;
  usePackageReferences: boolean;
  xamlVersion: string;
};

export type MSBuildProjectConfigurator = (
  info: ProjectInfo,
  options: MSBuildProjectOptions
) => MSBuildProjectParams;

/************************
 * windows/test-app.mjs *
 ************************/

type Resources = string[] | { windows?: string[] };

export type AssetItems = {
  assetItems: string[];
  assetItemFilters: string[];
  assetFilters: string[];
};

export type Assets = {
  assetItems: string;
  assetItemFilters: string;
  assetFilters: string;
};

export type AppManifest = {
  name?: string;
  singleApp?: string;
  resources?: Resources;
  windows?: {
    appxManifest?: string;
    certificateKeyFile?: string;
    certificatePassword?: string;
    certificateThumbprint?: string;
  };
};

/****************
 * affected.mjs *
 ****************/

type MatchChangedFiles = { "any-glob-to-any-file": string[] };

export type Match = { "changed-files": MatchChangedFiles[] };

/*************************
 * generate-manifest.mjs *
 *************************/

export type Language = {
  options: {
    indent: string;
    level: number;
    footer?: string;
    header?: string;
  };
  arrayProperty: (name: string, type: string, required: boolean) => string;
  objectProperty: (name: string, required: boolean) => string;
  stringProperty: (name: string, required: boolean) => string;
  structBegin: (name: string) => string;
  structEnd: string;
};

/**************
 * schema.mjs *
 **************/

export type Docs = {
  introduction: string;
  bundleRoot: string;
  components: string;
  resources: string;
  singleApp: string;
  version: string;
  "android.icons": string;
  "android.signingConfigs": string;
  "android.versionCode": string;
  "ios.buildNumber": string;
  "ios.codeSignEntitlements": string;
  "ios.codeSignIdentity": string;
  "ios.developmentTeam": string;
  "ios.icons": string;
  "ios.icons.primaryIcon": string;
  "ios.icons.alternateIcons": string;
  "ios.privacyManifest": string;
  "macos.applicationCategoryType": string;
  "macos.humanReadableCopyright": string;
  "windows.appxManifest": string;
  "windows.certificateKeyFile": string;
  "windows.certificatePassword": string;
  "windows.certificateThumbprint": string;
};

/*************************
 * set-react-version.mjs *
 *************************/

export type Manifest = Partial<{
  name: string;
  version: string;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string | undefined>;
  resolutions: Record<string, string | undefined>;
  defaultPlatformPackages: Record<string, PlatformPackage | undefined>;
}>;
