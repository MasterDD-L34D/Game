// TKT-M14-B Phase B — Conviction dialogue loader.
//
// Reads YAML branches from data/core/dialogue/conviction_branches/*.yaml.
// Returns parsed objects + eligibility filtering for runtime trigger.
//
// Schema inline per-branch (NO contracts touch — Phase B keeps YAML self-contained):
//   id: string (unique branch id)
//   title: string
//   description_it / description_en: string
//   trigger:
//     encounter_id: string|null (match scope; null = global)
//     axis_threshold: { utility?, liberty?, morality? } | null
//   choices: Array<{
//     id: string
//     text_it / text_en: string
//     delta: { utility?, liberty?, morality? }
//     consequence: string (narrative outcome)
//   }>
//
// PURE module: cache lazy at first call; reload() esposto per test.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'core',
  'dialogue',
  'conviction_branches',
);

let cache = null;
let cacheDir = null;

function _readAll(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'));
  const branches = [];
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const parsed = yaml.load(content);
      if (parsed && parsed.id && Array.isArray(parsed.choices)) {
        branches.push(parsed);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[dialogueLoader] skipped malformed branch ${file}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[dialogueLoader] failed parse ${file}: ${err.message}`);
    }
  }
  return branches;
}

/**
 * Load all conviction dialogue branches. Cached after first call.
 *
 * @param {object} [opts]
 * @param {string} [opts.dir] - override directory (test/inject)
 * @param {boolean} [opts.force] - force reload bypass cache
 * @returns {Array<object>} list of parsed branches
 */
function loadConvictionBranches(opts = {}) {
  const dir = opts.dir || DEFAULT_DIR;
  if (!opts.force && cache && cacheDir === dir) return cache;
  cache = _readAll(dir);
  cacheDir = dir;
  return cache;
}

/**
 * Get a single branch by id.
 * @returns {object|null}
 */
function getBranch(branchId, opts = {}) {
  if (!branchId) return null;
  const branches = loadConvictionBranches(opts);
  return branches.find((b) => b.id === branchId) || null;
}

/**
 * Filter branches eligible for given conviction state + optional encounter scope.
 *
 * Eligibility rules:
 *   - branch.trigger.encounter_id: if set, must match encounterId arg
 *   - branch.trigger.axis_threshold: each axis specified must be >= snapshot
 *
 * @param {object} convictionSnapshot - { utility, liberty, morality }
 * @param {object} [scope]
 * @param {string} [scope.encounter_id] - current encounter id
 * @returns {Array<object>} list of branches matching
 */
function findEligible(convictionSnapshot, scope = {}) {
  if (!convictionSnapshot || typeof convictionSnapshot !== 'object') return [];
  const branches = loadConvictionBranches();
  const encounterId = scope.encounter_id || null;
  return branches.filter((branch) => {
    const trigger = branch.trigger || {};
    if (trigger.encounter_id && trigger.encounter_id !== encounterId) return false;
    const threshold = trigger.axis_threshold;
    if (threshold && typeof threshold === 'object') {
      for (const axis of ['utility', 'liberty', 'morality']) {
        const min = Number(threshold[axis]);
        if (Number.isFinite(min) && Number(convictionSnapshot[axis]) < min) {
          return false;
        }
      }
    }
    return true;
  });
}

/**
 * Find a specific choice within a branch by id.
 * @returns {object|null}
 */
function getChoice(branchId, choiceId, opts = {}) {
  const branch = getBranch(branchId, opts);
  if (!branch) return null;
  return branch.choices.find((c) => c.id === choiceId) || null;
}

/**
 * Reset cache (test helper).
 */
function _resetCache() {
  cache = null;
  cacheDir = null;
}

module.exports = {
  DEFAULT_DIR,
  loadConvictionBranches,
  getBranch,
  getChoice,
  findEligible,
  _resetCache,
};
