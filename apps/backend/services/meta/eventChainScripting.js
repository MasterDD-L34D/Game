// Sprint δ Meta Systemic — Pattern 2 (Stellaris event chain scripting).
//
// Lightweight YAML-driven event chain engine. Conditions evaluated against
// session state (vcSnapshot axes / session.* fields). Supports linear
// chain walks + conditional branching (next_event_id selection).
//
// Gate 5 exemption (2026-05-05 audit): triggerEventChain() is plumbed in
// narrativeEngine.js but no live session path calls it yet. Engine is
// design-complete infrastructure; narrative trigger wiring deferred to
// narrative sprint (M18+ scope). Surface will be combat log + debrief panel
// when wired.
//
// Pattern source: docs/research/2026-04-27-strategy-games-tech-extraction.md §2
// (Stellaris event chains) — Paradox uses scripted scripted_triggers + on_actions
// to build narrative cascades. We do simplified version: chain = ordered list
// of events; each event has optional condition gate + next_event_id pointer.
//
// Schema YAML (data/core/narrative/event_chains/<chain_id>.yaml):
//   chain_id: string
//   events:
//     - id: string
//       text_it: string
//       text_en?: string
//       condition: { vc_axis, threshold, op } | null
//       next_event_id: string | null

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const CHAINS_DIR = path.resolve(__dirname, '../../../../data/core/narrative/event_chains');

const _chainCache = new Map(); // chain_id → parsed chain

const CONDITION_OPS = {
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
};

/**
 * Load chain YAML by chain_id (cached).
 *
 * @param {string} chain_id
 * @param {object} [options]
 * @param {string} [options.chainsDir] — override default dir
 * @param {boolean} [options.bypassCache=false]
 * @returns {object|null}
 */
function loadChain(chain_id, options = {}) {
  if (!chain_id || typeof chain_id !== 'string') return null;
  if (!options.bypassCache && _chainCache.has(chain_id)) {
    return _chainCache.get(chain_id);
  }
  const chainsDir = options.chainsDir || CHAINS_DIR;
  const targetPath = path.join(chainsDir, `${chain_id}.yaml`);
  try {
    const raw = fs.readFileSync(targetPath, 'utf-8');
    const parsed = yaml.load(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.events)) return null;
    if (!options.bypassCache) _chainCache.set(chain_id, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Reset chain cache (test helper).
 */
function _resetCache() {
  _chainCache.clear();
}

/**
 * Validate chain shape (used during load testing).
 *
 * @param {object} chain
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateChain(chain) {
  const errors = [];
  if (!chain || typeof chain !== 'object') {
    return { valid: false, errors: ['chain_not_object'] };
  }
  if (!chain.chain_id || typeof chain.chain_id !== 'string') {
    errors.push('chain_id_missing_or_not_string');
  }
  if (!Array.isArray(chain.events)) {
    errors.push('events_not_array');
    return { valid: false, errors };
  }
  const ids = new Set();
  for (const event of chain.events) {
    if (!event.id || typeof event.id !== 'string') {
      errors.push(`event_missing_id`);
      continue;
    }
    if (ids.has(event.id)) errors.push(`duplicate_event_id:${event.id}`);
    ids.add(event.id);
    if (event.condition && typeof event.condition === 'object') {
      const op = event.condition.op || '>';
      if (!CONDITION_OPS[op]) errors.push(`unsupported_op:${op}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Evaluate a condition against session context.
 *
 * Condition shape: { vc_axis: 'T_F', threshold: 0.5, op: '>' }
 * - Reads session.vcSnapshot.axes[vc_axis] (or session.vc_snapshot or null)
 * - Returns true when condition matches; null condition → always true
 *
 * @param {object|null} condition
 * @param {object} session
 * @returns {boolean}
 */
function evalCondition(condition, session) {
  if (!condition || typeof condition !== 'object') return true;
  const { vc_axis, threshold, op } = condition;
  const opFn = CONDITION_OPS[op || '>'];
  if (!opFn) return false;
  const axes = session?.vcSnapshot?.axes || session?.vc_snapshot?.axes || session?.axes || {};
  const value = Number(axes[vc_axis]);
  if (Number.isNaN(value)) return false;
  return opFn(value, Number(threshold));
}

/**
 * Trigger a chain at chain_id, optionally starting from a specific event.
 * Returns the resolved event sequence walked + final event_id.
 *
 * Walk algorithm:
 *  1. Start at start_event_id (or first event in chain).
 *  2. Eval current event condition. If true → emit + walk to next_event_id.
 *  3. If condition false → halt walk on that event (returned in `halted_at`).
 *  4. Cap depth at 50 to prevent loops.
 *
 * @param {string} chain_id
 * @param {object} session
 * @param {object} [options]
 * @param {string} [options.start_event_id]
 * @param {object} [options.chainsDir]
 * @returns {{ ok: boolean, chain_id, walked_events: object[], halted_at: string|null, reason: string|null }}
 */
function triggerEvent(chain_id, session, options = {}) {
  const chain = loadChain(chain_id, { chainsDir: options.chainsDir });
  if (!chain) {
    return {
      ok: false,
      chain_id,
      walked_events: [],
      halted_at: null,
      reason: 'chain_not_found',
    };
  }
  const eventsById = new Map();
  for (const e of chain.events) eventsById.set(e.id, e);
  const startId = options.start_event_id || chain.events[0]?.id;
  if (!startId || !eventsById.has(startId)) {
    return {
      ok: false,
      chain_id,
      walked_events: [],
      halted_at: null,
      reason: 'start_event_not_found',
    };
  }
  const walked = [];
  let currentId = startId;
  let safety = 50;
  while (currentId && eventsById.has(currentId) && safety > 0) {
    const event = eventsById.get(currentId);
    if (!evalCondition(event.condition, session)) {
      return {
        ok: true,
        chain_id,
        walked_events: walked,
        halted_at: event.id,
        reason: 'condition_false',
      };
    }
    walked.push({
      id: event.id,
      text_it: event.text_it || '',
      text_en: event.text_en || null,
    });
    currentId = event.next_event_id || null;
    safety--;
  }
  return {
    ok: true,
    chain_id,
    walked_events: walked,
    halted_at: null,
    reason: walked.length > 0 ? 'chain_complete' : 'empty_walk',
  };
}

module.exports = {
  loadChain,
  validateChain,
  evalCondition,
  triggerEvent,
  _resetCache,
  CHAINS_DIR,
  CONDITION_OPS,
};
