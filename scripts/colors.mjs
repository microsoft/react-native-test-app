// @ts-check
import { WriteStream } from "node:tty";

const hasColors =
  WriteStream.prototype.hasColors() && process.env["NODE_ENV"] !== "test";

/** @type {(start: number, end: number) => (s: string) => string} */
const color = hasColors
  ? (start, end) => (s) => "\u001B[" + start + "m" + s + "\u001B[" + end + "m"
  : () => (s) => s;

export const bold = color(1, 22);
export const dim = color(2, 22);
export const red = color(31, 39);
export const yellow = color(33, 39);
export const cyan = color(36, 39);
