// @ts-check
jest.retryTimes(3);

/**
 * @typedef {Awaited<ReturnType<typeof import("webdriverio").remote>>} Browser
 */

/**
 * @param {Browser} client
 * @param {string} featureName
 * @returns {"Off" | "On"}
 */
function getFeature(client, featureName) {
  return client.capabilities[`react:${featureName}`] ? "On" : "Off";
}

/**
 * @param {Browser} client
 * @returns {Promise<Buffer>}
 */
function saveScreenshot(client) {
  const prefix = "react:";
  const prefixLength = prefix.length;

  const { capabilities } = client;
  const filename = ["Screenshot", capabilities["platformName"]];

  for (const key of Object.keys(capabilities)) {
    if (key.startsWith(prefix) && capabilities[key]) {
      filename.push(key.slice(prefixLength));
    }
  }
  return client.saveScreenshot(`${filename.join("-")}.png`);
}

describe("App", () => {
  const { remote } = require("webdriverio");

  /** @type {Browser} */
  let client;

  /**
   * @param {string} id
   * @returns {string}
   */
  function byId(id) {
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

  beforeAll(async () => {
    client = await remote(require("./wdio.config"));
  });

  afterAll(async () => {
    await client.deleteSession();
  });

  it("does not crash on startup", async () => {
    const appButton = await client.$(byLabel("App"));
    await appButton.click();

    const { version } = require("react-native/package.json");
    const reactNative = await client.$(byId("react-native-value"));
    expect(await reactNative.getText()).toBe(version);

    const hermes = await client.$(byId("hermes-value"));
    expect(await hermes.getText()).toBe(getFeature(client, "hermes"));

    const fabric = await client.$(byId("fabric-value"));
    expect(await fabric.getText()).toBe(getFeature(client, "fabric"));

    const concurrent = await client.$(byId("concurrent-react-value"));
    expect(await concurrent.getText()).toBe(getFeature(client, "concurrent"));

    await saveScreenshot(client);
  });
});
