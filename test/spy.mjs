/* node:coverage disable */

/**
 * @typedef {{ mock: { calls: { arguments: string[] }[] }}} Mock
 * @param {unknown} obj
 * @returns {Mock["mock"]}
 */
export function spy(obj) {
  return /** @type {Mock} */ (obj).mock;
}
