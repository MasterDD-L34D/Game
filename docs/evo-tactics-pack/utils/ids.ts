/**
 * @typedef {import('./types.ts').RandomIdGenerator} RandomIdGenerator
 */

/**
 * @param {string} [prefix='synt']
 * @returns {string}
 */
export function randomId(prefix = 'synt') {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${suffix}`;
}
