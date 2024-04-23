import type { ModPlatform } from "@expo/config-plugins";
import type {
  BaseModProviderMethods,
  ForwardedBaseModOptions,
} from "@expo/config-plugins/build/plugins/createBaseMod";

export type CustomModProvider = <ModType, Props extends ForwardedBaseModOptions>(
  original: BaseModProviderMethods<ModType, Props>,
  file: string
) => BaseModProviderMethods<ModType, Props>;

export type ProjectInfo = {
  projectRoot: string;
  platforms: ModPlatform[];
  packageJsonPath: string;
  appJsonPath: string;
};
