import type { XmlBuilderOptions } from "fast-xml-parser";

export type JSONValue =
  | string
  | number
  | boolean
  | JSONArray
  | JSONObject
  | null;

export type JSONArray = JSONValue[];
export type JSONObject = { [key: string | symbol]: JSONValue };

/********************************
 * android/android-manifest.mjs *
 ********************************/

export type AndroidConfig = {
  android?: {
    packages?: string;
    features?: {
      "android:name": string;
      "android:required"?: "true" | "false";
      "android:glEsVersion"?: string;
    }[];
    permissions?: {
      "android:name": string;
      "android:maxSdkVersion"?: string;
    }[];
    metaData?: {
      "android:name": string;
      "android:value": string;
    }[];
  };
};

export type AndroidManifest = {
  "uses-feature": Record<string, string>[];
  "uses-permission": Record<string, string>[];
  application: {
    "meta-data": Record<string, string>[];
  };
};

/************************
 * android/autolink.mjs *
 ************************/

export type AndroidDependency = {
  projectDir: string;
  configurations: string[];
};

export type AndroidDependencies = Record<string, AndroidDependency>;

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
  force: boolean;
  init: boolean;
};

export type ProjectParams = {
  android: {
    sourceDir: string;
    manifestPath: string;
    packageName?: string;
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

export type ProjectConfig = {
  android?: Pick<ProjectParams["android"], "sourceDir" | "packageName">;
  ios?: Pick<ProjectParams["ios"], "sourceDir">;
  windows?: Pick<ProjectParams["windows"], "sourceDir" | "solutionFile">;
};

/***************************
 * ios/privacyManifest.mjs *
 ***************************/

export type PrivacyManifest = {
  NSPrivacyTracking: boolean;
  NSPrivacyTrackingDomains: JSONValue[];
  NSPrivacyCollectedDataTypes: JSONValue[];
  NSPrivacyAccessedAPITypes: JSONValue[];
};

/*****************
 * ios/xcode.mjs *
 *****************/

export type ProjectConfiguration = {
  xcodeprojPath: string;
  reactNativePath: string;
  reactNativeVersion: number;
  reactNativeHostPath: string;
  communityAutolinkingScriptPath?: string;
  singleApp?: string;
  useHermes: boolean | "from-source";
  useNewArch: boolean;
  useBridgeless: boolean;
  buildSettings: Record<string, string | string[]>;
  testsBuildSettings: Record<string, string>;
  uitestsBuildSettings: Record<string, string>;
  resources?: string[];
};

export type XmlOptions = Pick<
  Required<XmlBuilderOptions>,
  "attributeNamePrefix" | "ignoreAttributes" | "format" | "indentBy"
>;

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

/************************
 * windows/app.mjs *
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
  msbuildprops?: string;
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
  nugetDependencies: [string, string][];
  useExperimentalNuGet: boolean;
  useFabric: boolean;
};

export type MSBuildProjectConfigurator = (
  info: ProjectInfo
) => MSBuildProjectParams;

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
  "android.features": string;
  "android.icons": string;
  "android.package": string;
  "android.permissions": string;
  "android.metaData": string;
  "android.signingConfigs": string;
  "android.versionCode": string;
  "ios.buildNumber": string;
  "ios.bundleIdentifier": string;
  "ios.codeSignEntitlements": string;
  "ios.codeSignIdentity": string;
  "ios.developmentTeam": string;
  "ios.icons": string;
  "ios.icons.primaryIcon": string;
  "ios.icons.alternateIcons": string;
  "ios.metalAPIValidation": string;
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
  repository: {
    type: "git";
    url: string;
  };
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string | undefined>;
  resolutions: Record<string, string | undefined>;
  defaultPlatformPackages: Record<string, PlatformPackage | undefined>;
}>;

/***************************
 * testing/test-matrix.mts *
 ***************************/

export type ApplePlatform = "ios" | "macos" | "visionos";
export type TargetPlatform = ApplePlatform | "android" | "windows";

export type BuildConfig = {
  version: string;
  platform: TargetPlatform;
  variant: "fabric" | "paper";
  engine?: "hermes" | "jsc";
};
