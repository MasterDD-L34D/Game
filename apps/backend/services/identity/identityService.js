// =============================================================================
// identityService -- SPEC-Q M-2 (DF-levels L1, identity-earned).
//
// Name emergence by lifecycle stage (QF2 ratified = auto da lifecycle):
//   Hatchling = anonima -> Juvenile = nome -> Apex = nome + MBTI reveal -> Legacy.
// Scar-as-identity reuse = SPEC-J woundedPerma (narrative layer, separate).
//
// GOVERNANCE SPLIT (FP->VC pattern):
//   - MECHANISM (objective, tested): stage-gating + deterministic name pick +
//     creature_named chronicle emit.
//   - CONTENT (subjective): the name pool lives in data/core/identity/name_pool.yaml,
//     flagged PROPOSED -- ratify by editing the data file (not code).
//
// Lifecycle TRIGGER (where emergeIdentity is called at runtime) = follow-up: the
// creature lifecycle stage is not yet a coded field; wire when it exists.
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { appendEvent } = require('../chronicle/chronicleStore');

const DEFAULT_POOL_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'core',
  'identity',
  'name_pool.yaml',
);

// Stages that earn a name (Hatchling stays anonymous).
const NAMED_STAGES = new Set(['juvenile', 'apex', 'legacy']);
const REVEAL_STAGES = new Set(['apex', 'legacy']);

function loadNamePool(opts = {}) {
  if (Array.isArray(opts.pool)) return opts.pool;
  const p = opts.poolPath || DEFAULT_POOL_PATH;
  try {
    const doc = yaml.load(fs.readFileSync(p, 'utf8'));
    return Array.isArray(doc && doc.names) ? doc.names : [];
  } catch {
    return [];
  }
}

// Deterministic string hash (FNV-ish, no Date/random) -> stable name per creature.
function hashStr(s) {
  let h = 0;
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pickName(pool, seed) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  return pool[hashStr(seed) % pool.length];
}

/**
 * Derive the emergent identity for a creature at a lifecycle stage.
 * Pure: deterministic by creature.id (name stays stable across stage advances).
 * @param creature { id, species?, sentience_tier? }
 * @param opts     { stage, pool? | poolPath? }
 * @returns { stage, anonymous, name, mbti_reveal, legacy? }
 */
function emergeIdentity(creature, opts = {}) {
  const stage = opts.stage;
  if (!NAMED_STAGES.has(stage)) {
    return { stage: stage || 'hatchling', anonymous: true, name: null, mbti_reveal: false };
  }
  const pool = Array.isArray(opts.pool) ? opts.pool : loadNamePool(opts);
  const seed = (creature && creature.id) || '';
  const name = pickName(pool, seed);
  // Empty/unloadable pool -> no name emerged: identity stays anonymous
  // (never {anonymous:false, name:null}).
  if (name == null) {
    return { stage, anonymous: true, name: null, mbti_reveal: false };
  }
  const identity = {
    stage,
    anonymous: false,
    name,
    mbti_reveal: REVEAL_STAGES.has(stage),
  };
  if (stage === 'legacy') identity.legacy = true;
  return identity;
}

/**
 * Emit a creature_named chronicle event when a name has emerged (no-op if anonymous).
 * @param runId    chronicle run/branco id (campaign_id)
 * @param info     { actor_id, identity }
 * @param opts     { baseDir? }
 */
function emitCreatureNamed(runId, info, opts = {}) {
  const identity = info && info.identity;
  if (!identity || identity.anonymous || !identity.name) return { ok: false, error: 'no_name' };
  return appendEvent(
    runId,
    {
      type: 'creature_named',
      actor_id: (info && info.actor_id) || null,
      tier: 'public',
      payload: {
        name: identity.name,
        stage: identity.stage,
        mbti_reveal: !!identity.mbti_reveal,
      },
    },
    { baseDir: opts.baseDir },
  );
}

module.exports = {
  NAMED_STAGES,
  REVEAL_STAGES,
  DEFAULT_POOL_PATH,
  loadNamePool,
  pickName,
  emergeIdentity,
  emitCreatureNamed,
};
