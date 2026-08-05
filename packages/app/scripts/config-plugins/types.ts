import type { BaseMods, ModPlatform } from "@expo/config-plugins";
import type {
  BaseModProviderMethods,
  ForwardedBaseModOptions,
} from "@expo/config-plugins/build/plugins/createBaseMod";

export type CustomModProvider = <
  ModType,
  Props extends ForwardedBaseModOptions,
>(
  original: BaseModProviderMethods<ModType, Props>,
  file: string
) => BaseModProviderMethods<ModType, Props>;

export type IosModFileProviders = ReturnType<
  typeof BaseMods.getIosModFileProviders
> &
  // oxlint-disable-next-line typescript/no-explicit-any
  Record<string, BaseModProviderMethods<any, any>>;

export type JSONValue =
  | string
  | number
  | boolean
  | JSONArray
  | JSONObject
  | null;

export type JSONArray = JSONValue[];
export type JSONObject = { [key: string]: JSONValue | undefined };

export type ProjectInfo = {
  projectRoot: string;
  platforms: ModPlatform[];
  packageJsonPath: string;
  appJsonPath: string;
};
