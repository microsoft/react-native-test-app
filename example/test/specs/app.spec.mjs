// @ts-check
import { equal } from "node:assert/strict";
import * as fs from "node:fs";
import { after, before, describe, it } from "node:test";
import { remote } from "webdriverio";
import { findNearest } from "../../../scripts/helpers.js";
import { config } from "./wdio.config.js";

/**
 * @typedef {Awaited<ReturnType<typeof import("webdriverio").remote>>} Browser
 */
const prefix = "react:";

/**
 * @param {Browser} client
 * @param {string} featureName
 * @returns {"Off" | "On"}
 */
function getFeature(client, featureName) {
  // @ts-expect-error — TS cannot know that our config includes this capability
  const capability = client.capabilities[prefix + featureName];
  return capability ? "On" : "Off";
}

/**
 * @param {Browser} client
 * @returns {Promise<Buffer>}
 */
function saveScreenshot(client) {
  const prefixLength = prefix.length;

  const { capabilities } = client;
  // @ts-expect-error — TS cannot know that our config includes `platformName`
  const platformName = capabilities["platformName"];
  const filename = ["Screenshot", platformName];

  for (const key of Object.keys(capabilities)) {
    // @ts-expect-error — TS cannot know that our config includes this capability
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
    return version;
  })();

  /** @type {Browser} */
  let client;

  /**
   * @param {string} id
   * @returns {string}
   */
  function byId(id) {
    // @ts-expect-error — TS cannot know that our config includes `platformName`
    const platform = client.capabilities["platformName"];
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
    // @ts-expect-error — TS cannot know that our config includes `platformName`
    const platform = client.capabilities["platformName"];
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
    equal(await hermes.getText(), getFeature(client, "hermes"));

    const fabric = await client.$(byId("fabric-value"));
    equal(await fabric.getText(), getFeature(client, "fabric"));

    const concurrent = await client.$(byId("concurrent-react-value"));
    equal(await concurrent.getText(), getFeature(client, "concurrent"));

    await saveScreenshot(client);
  });
});
