import { equal, ok } from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";
import {
  isBridgelessEnabled,
  isHermesEnabled,
  isNewArchEnabled,
} from "../../ios/features.mjs";
import { v } from "../../scripts/helpers.js";

describe("isBridgelessEnabled()", () => {
  // Bridgeless mode is first publicly available in 0.73
  const firstAvailableVersion = v(0, 73, 0);

  // Bridgeless mode is enabled by default starting with 0.74
  const defaultVersion = v(0, 74, 0);

  before(() => {
    delete process.env["RCT_NEW_ARCH_ENABLED"];
  });

  afterEach(() => {
    delete process.env["RCT_NEW_ARCH_ENABLED"];
  });

  it("returns true only when new architecture is enabled", () => {
    ok(!isBridgelessEnabled(0, {}));
    ok(!isBridgelessEnabled(firstAvailableVersion, {}));

    const options = { bridgelessEnabled: true, fabricEnabled: true };

    ok(!isBridgelessEnabled(v(0, 72, 999), options));
    ok(isBridgelessEnabled(firstAvailableVersion, options));
  });

  it("returns true by default starting with 0.74", () => {
    // Bridgeless mode is enabled by default starting with 0.74 unless opted-out of
    ok(isBridgelessEnabled(defaultVersion, { fabricEnabled: true }));
    ok(
      !isBridgelessEnabled(defaultVersion, {
        bridgelessEnabled: false,
        fabricEnabled: true,
      })
    );
  });

  it("does not return true just because `RCT_NEW_ARCH_ENABLED` is set", () => {
    // `RCT_NEW_ARCH_ENABLED` does not enable bridgeless on older versions
    process.env["RCT_NEW_ARCH_ENABLED"] = "1";

    ok(!isBridgelessEnabled(v(0, 72, 999), {}));
    ok(!isBridgelessEnabled(firstAvailableVersion, {}));
    ok(isBridgelessEnabled(defaultVersion, {}));
    ok(!isBridgelessEnabled(defaultVersion, { bridgelessEnabled: false }));
  });
});

describe("isHermesEnabled()", () => {
  function resetEnvironmentVariables() {
    delete process.env["USE_HERMES"];
  }

  before(resetEnvironmentVariables);

  afterEach(resetEnvironmentVariables);

  for (const platform of ["ios", "macos", "visionos"] as const) {
    it(`[${platform}] is disabled by default`, () => {
      ok(!isHermesEnabled(platform, v(0, 79, 0), {}));
    });

    it(`[${platform}] returns true when enabled`, () => {
      ok(isHermesEnabled(platform, v(0, 79, 0), { hermesEnabled: true }));
    });

    it(`[${platform}] returns true if 'USE_HERMES=1'`, () => {
      process.env["USE_HERMES"] = "1";
      ok(isHermesEnabled(platform, v(0, 79, 0), {}));
    });

    it(`[${platform}] returns false if 'USE_HERMES=0'`, () => {
      process.env["USE_HERMES"] = "0";
      ok(!isHermesEnabled(platform, v(0, 79, 0), { hermesEnabled: true }));
    });

    it(`[${platform}] always returns true from 0.80 on`, () => {
      ok(isHermesEnabled(platform, v(0, 80, 0), {}));

      process.env["USE_HERMES"] = "0";

      ok(isHermesEnabled(platform, v(0, 80, 0), {}));
    });
  }

  it("[visionos] builds from source when necessary", () => {
    const options = { hermesEnabled: true };

    equal(isHermesEnabled("visionos", v(0, 75, 0), options), "from-source");
    equal(isHermesEnabled("visionos", v(0, 76, 0), options), true);

    process.env["USE_HERMES"] = "1";

    equal(isHermesEnabled("visionos", v(0, 75, 0), {}), "from-source");
    equal(isHermesEnabled("visionos", v(0, 76, 0), {}), true);
  });
});

describe("isNewArchEnabled()", () => {
  // New architecture is first publicly available in 0.68, but we'll require 0.71
  const firstAvailableVersion = v(0, 71, 0);

  before(() => {
    delete process.env["RCT_NEW_ARCH_ENABLED"];
  });

  afterEach(() => {
    delete process.env["RCT_NEW_ARCH_ENABLED"];
  });

  it("returns true if New Architecture is available and enabled", () => {
    ok(!isNewArchEnabled(0, {}));
    ok(!isNewArchEnabled(firstAvailableVersion, {}));

    // New architecture is first publicly available in 0.68, but we'll require 0.71
    ok(!isNewArchEnabled(v(0, 70, 999), { fabricEnabled: true }));
    ok(isNewArchEnabled(firstAvailableVersion, { fabricEnabled: true }));
    ok(isNewArchEnabled(firstAvailableVersion, { newArchEnabled: true }));
  });

  it("returns true if `RCT_NEW_ARCH_ENABLED=1`", () => {
    process.env["RCT_NEW_ARCH_ENABLED"] = "1";

    ok(!isNewArchEnabled(v(0, 70, 999), {}));
    ok(isNewArchEnabled(firstAvailableVersion, {}));
  });

  it("returns false if `RCT_NEW_ARCH_ENABLED=0`", () => {
    process.env["RCT_NEW_ARCH_ENABLED"] = "0";

    ok(!isNewArchEnabled(v(0, 70, 999), {}));
    ok(!isNewArchEnabled(firstAvailableVersion, {}));
    ok(!isNewArchEnabled(firstAvailableVersion, { fabric_enabled: true }));
  });
});
