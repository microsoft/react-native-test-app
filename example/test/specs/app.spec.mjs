// @ts-check
import { equal } from "node:assert/strict";
import * as fs from "node:fs";
import { after, before, describe, it } from "node:test";
import { remote } from "webdriverio";
import { findNearest } from "../../../scripts/helpers.js";
import { config } from "./wdio.config.js";

/**
 * @typedef {Awaited<ReturnType<typeof import("webdriverio").remote>>} Browser
 * @typedef {keyof typeof config.capabilities} Capability
 */

/**
 * @param {Capability} name
 * @returns {"Off" | "On"}
 */
function getCapability(name) {
  return config.capabilities[name] ? "On" : "Off";
}

/**
 * @param {Browser} client
 * @returns {Promise<Buffer>}
 */
function saveScreenshot(client) {
  const prefix = "react:";
  const prefixLength = prefix.length;

  const { capabilities } = config;
  const filename = ["Screenshot", capabilities["platformName"]];

  for (const key of /** @type {Capability[]} */ (Object.keys(capabilities))) {
    if (key.startsWith(prefix) && capabilities[key]) {
      filename.push(key.slice(prefixLength));
    }
  }
  return client.saveScreenshot(`${filename.join("-")}.png`);
}

describe("App", () => {
  const reactNativeVersion = (() => {
    const rnPath = findNearest("node_modules/react-native/package.json");
    if (!rnPath) {
      throw new Error("Could not find 'react-native'");
    }

    const manifest = fs.readFileSync(rnPath, { encoding: "utf-8" });
    const { version } = JSON.parse(manifest);
    return version.replace("-nightly-", "-nightly\n");
  })();

  /** @type {Browser} */
  let client;

  /**
   * @param {string} id
   * @returns {string}
   */
  function byId(id) {
    const platform = config.capabilities["platformName"];
    switch (platform) {
      case "Android":
        return `//*[@resource-id="${id}"]`;

      case "iOS":
        return `~${id}`;

      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  /**
   * @param {string} id
   * @returns {string}
   */
  function byLabel(id) {
    const platform = config.capabilities["platformName"];
    switch (platform) {
      case "Android":
        return `//*[@text="${id}"]`;

      case "iOS":
        return `//*[@name="${id}"]`;

      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  before(async () => {
    client = await remote(config);
  });

  after(async () => {
    await client.deleteSession();
  });

  it("does not crash on startup", async () => {
    const appButton = await client.$(byLabel("App"));
    await appButton.click();

    const reactNative = await client.$(byId("react-native-value"));
    equal(await reactNative.getText(), reactNativeVersion);

    const hermes = await client.$(byId("hermes-value"));
    equal(await hermes.getText(), getCapability("react:hermes"));

    const fabric = await client.$(byId("fabric-value"));
    equal(await fabric.getText(), getCapability("react:fabric"));

    const concurrent = await client.$(byId("concurrent-react-value"));
    equal(await concurrent.getText(), getCapability("react:concurrent"));

    await saveScreenshot(client);
  });
});
