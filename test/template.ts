import * as path from "node:path";
import { findNearest } from "../scripts/helpers.js";

const templateDir = findNearest(
  "node_modules/@react-native-community/template"
);

if (!templateDir) {
  throw new Error("Cannot find module '@react-native-community/template'");
}

export const templatePath = path
  .join(templateDir, "template")
  .replaceAll("\\", "/");
