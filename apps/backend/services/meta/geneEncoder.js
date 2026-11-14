// Sprint δ Meta Systemic — Pattern 1 (CK3 DNA encoding).
//
// Encode/decode lineage genome as deterministic SHA1 hash chain.
// Each generation links to parent_dna for cross-generation lineage chain.
//
// Pattern source: docs/research/2026-04-27-strategy-games-tech-extraction.md §6
// (CK3 DNA encoding) — Crusader Kings III represents character genome as
// deterministic gene string; offspring inherits chain link to parent DNA.
//
// Wire: metaProgression.rollMatingOffspring optional gene chain hook
// (additive opt-in via context.useGeneEncoder=true).

'use strict';

const crypto = require('node:crypto');

const VERSION = 1;
const HASH_ALGO = 'sha1';
const CHAIN_PREFIX = 'gn';

/**
 * Encode lineage + applied mutations into deterministic DNA chain.
 *
 * Shape of returned chain: `gn1:<parent_dna_hash_or_root>:<self_hash>`
 * - parent_dna: previous-gen DNA chain (null/'root' = first generation)
 * - self_hash: SHA1(lineage_id + sorted(applied_mutations).join(','))
 *
 * Deterministic: same inputs always → same hash.
 *
 * @param {object} params
 * @param {string} params.lineage_id — required
 * @param {string[]} [params.applied_mutations=[]] — set of mutation_ids
 * @param {string|null} [params.parent_dna=null] — previous-gen DNA chain
 * @returns {string} DNA chain string
 */
function encode({ lineage_id, applied_mutations = [], parent_dna = null } = {}) {
  if (!lineage_id || typeof lineage_id !== 'string') {
    throw new Error('encode: lineage_id required (string)');
  }
  const mutations = Array.isArray(applied_mutations) ? [...applied_mutations] : [];
  // Sort for determinism (set semantics, ignore insertion order)
  mutations.sort();
  const payload = `${lineage_id}|${mutations.join(',')}`;
  const selfHash = crypto.createHash(HASH_ALGO).update(payload).digest('hex').slice(0, 16);
  const parentSegment = parent_dna || 'root';
  const parentHash = parentSegment === 'root' ? 'root' : _extractSelfHash(parentSegment);
  return `${CHAIN_PREFIX}${VERSION}:${parentHash}:${selfHash}`;
}

/**
 * Decode DNA chain into structured metadata.
 *
 * @param {string} dna_chain
 * @returns {{ version: number, parent_hash: string, self_hash: string, is_root: boolean } | null}
 */
function decode(dna_chain) {
  if (typeof dna_chain !== 'string') return null;
  const match = dna_chain.match(/^gn(\d+):([a-f0-9]+|root):([a-f0-9]{16})$/);
  if (!match) return null;
  const [, version, parentHash, selfHash] = match;
  return {
    version: Number(version),
    parent_hash: parentHash,
    self_hash: selfHash,
    is_root: parentHash === 'root',
  };
}

/**
 * Compute mutation diff between two DNA chains (their unit mutation sets).
 *
 * Note: requires the original applied_mutations arrays — DNA chain alone
 * is one-way hashed and cannot be inverted. This helper compares mutation
 * sets symbolically (caller must pass arrays).
 *
 * @param {string[]} mutations_a
 * @param {string[]} mutations_b
 * @returns {{ added: string[], removed: string[], unchanged: string[] }}
 */
function diffMutations(mutations_a = [], mutations_b = []) {
  const a = new Set(Array.isArray(mutations_a) ? mutations_a : []);
  const b = new Set(Array.isArray(mutations_b) ? mutations_b : []);
  const added = [];
  const removed = [];
  const unchanged = [];
  for (const m of b) {
    if (a.has(m)) unchanged.push(m);
    else added.push(m);
  }
  for (const m of a) {
    if (!b.has(m)) removed.push(m);
  }
  added.sort();
  removed.sort();
  unchanged.sort();
  return { added, removed, unchanged };
}

/**
 * Verify that childDna chain links to parentDna chain.
 *
 * @param {string} parentDna
 * @param {string} childDna
 * @returns {boolean}
 */
function isChildOf(parentDna, childDna) {
  const parent = decode(parentDna);
  const child = decode(childDna);
  if (!parent || !child) return false;
  return child.parent_hash === parent.self_hash;
}

/**
 * Extract self_hash from a DNA chain (internal helper).
 */
function _extractSelfHash(dna_chain) {
  const decoded = decode(dna_chain);
  if (!decoded) return 'root';
  return decoded.self_hash;
}

/**
 * Compute lineage generation depth by walking chain history.
 * Caller must provide `chainResolver(parent_hash)` → previous DNA chain.
 * Useful when persistence layer stores chain history.
 *
 * @param {string} dna_chain
 * @param {function(string): string|null} chainResolver
 * @param {number} [maxDepth=100]
 * @returns {number} generation (0 = root, +1 per parent link)
 */
function computeGeneration(dna_chain, chainResolver, maxDepth = 100) {
  let current = decode(dna_chain);
  if (!current) return 0;
  let depth = 0;
  let safety = maxDepth;
  while (current && !current.is_root && safety > 0) {
    const previous = chainResolver(current.parent_hash);
    if (!previous) break;
    current = decode(previous);
    depth++;
    safety--;
  }
  return depth;
}

module.exports = {
  encode,
  decode,
  diffMutations,
  isChildOf,
  computeGeneration,
  VERSION,
  CHAIN_PREFIX,
};
