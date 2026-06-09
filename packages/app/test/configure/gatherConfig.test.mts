import { describe, it } from "node:test";
import { gatherConfig as gatherConfigActual } from "../../scripts/configure.mjs";
import type { Configuration, ConfigureParams } from "../../scripts/types.ts";
import { templatePath } from "../template.mts";
import { mockParams } from "./mockParams.mts";

describe("gatherConfig()", () => {
  /**
   * Like `gatherConfig()`, but with normalized newlines and paths.
   *
   * Note that only paths that are used to read/write files are normalized.
   * File content should not be normalized because they should only contain
   * forward-slashes.
   */
  function gatherConfig(params: ConfigureParams): Configuration {
    const normalize = (p: string) => p.replaceAll("\\", "/");

    const config = gatherConfigActual({ ...params, templatePath }, true);
    config.files = Object.fromEntries(
      Object.entries(config.files).map(([key, value]) => [
        normalize(key),
        typeof value === "string"
          ? value.replaceAll("\r", "")
          : { source: normalize(value.source) },
      ])
    );
    config.oldFiles = config.oldFiles.map(normalize);
    return config;
  }

  const configurations: [string, Partial<ConfigureParams>][] = [
    ["returns configuration for all platforms", {}],
    ["returns common configuration", { platforms: ["common"] }],
    ["returns configuration for a single platform", { platforms: ["ios"] }],
    [
      "returns configuration for arbitrary platforms",
      { platforms: ["android", "ios"] },
    ],
  ];
  for (const [name, overrides] of configurations) {
    it(name, (t) => {
      t.assert.snapshot(gatherConfig(mockParams(overrides)));
    });
  }
});
