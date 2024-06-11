// @ts-check
"use strict";

/**
 * This script (and its dependencies) currently cannot be converted to ESM
 * because it is consumed in `react-native.config.js`.
 */
const nodefs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { isMain, readJSONFile, readTextFile } = require("../scripts/helpers.js");

/**
 * @param {Record<string, string>[]} entries
 * @param {string[]} names
 * @param {string[]} attributes
 * @param {string} attributeNamePrefix
 * @returns {Record<string, string>[]}
 */
function toXML(entries, names, attributes, attributeNamePrefix) {
  const xml = [];
  for (const e of entries) {
    const attrName = names.find((name) => name in e);
    if (!attrName) {
      continue;
    }

    const entry = { [attributeNamePrefix + attrName]: e[attrName] };
    for (const attr of attributes) {
      if (attr in e) {
        entry[attributeNamePrefix + attr] = e[attr].toString();
      }
    }

    xml.push(entry);
  }
  return xml;
}

/**
 * @param {string} appManifestPath
 * @param {string} manifestOutput
 * @returns {number}
 */
function generateAndroidManifest(appManifestPath, manifestOutput, fs = nodefs) {
  if (fs.existsSync(manifestOutput)) {
    const lastModifiedByUser = fs.statSync(appManifestPath).mtimeMs;
    const generationTime = fs.statSync(manifestOutput).mtimeMs;
    if (lastModifiedByUser <= generationTime) {
      return 0;
    }
  }

  const { XMLBuilder, XMLParser } = require("fast-xml-parser");

  /** @type {import("../scripts/types.js").AndroidConfig} */
  const appManifest = readJSONFile(appManifestPath, fs);
  const android = appManifest.android ?? {};

  const attributeNamePrefix = "@_";
  const xmlOptions = {
    attributeNamePrefix,
    ignoreAttributes: false,
    format: true,
    suppressBooleanAttributes: false,
  };
  const manifestSource = path.join(
    __dirname,
    "app",
    "src",
    "main",
    "AndroidManifest.xml"
  );
  const xml = new XMLParser(xmlOptions).parse(readTextFile(manifestSource, fs));

  /** @type {import("../scripts/types.js").AndroidManifest} */
  const manifest = xml["manifest"];

  // https://developer.android.com/guide/topics/manifest/uses-feature-element
  const features = android.features;
  if (Array.isArray(features)) {
    const names = ["android:name", "android:glEsVersion"];
    const attributes = ["android:required"];
    const entries = toXML(features, names, attributes, attributeNamePrefix);
    if (entries.length > 0) {
      manifest["uses-feature"] = entries;
    }
  }

  // https://developer.android.com/guide/topics/manifest/uses-permission-element
  const permissions = android.permissions;
  if (Array.isArray(permissions)) {
    const names = ["android:name"];
    const attributes = ["android:maxSdkVersion"];
    const entries = toXML(permissions, names, attributes, attributeNamePrefix);
    if (entries.length > 0) {
      manifest["uses-permission"] = entries;
    }
  }

  const builder = new XMLBuilder(xmlOptions);
  fs.mkdirSync(path.dirname(manifestOutput), { recursive: true, mode: 0o755 });
  fs.writeFileSync(manifestOutput, builder.build(xml));

  return 0;
}

exports.generateAndroidManifest = generateAndroidManifest;

if (isMain(pathToFileURL(__filename).toString())) {
  const [, , appManifestPath, manifestOutput] = process.argv;
  process.exitCode = generateAndroidManifest(appManifestPath, manifestOutput);
}
