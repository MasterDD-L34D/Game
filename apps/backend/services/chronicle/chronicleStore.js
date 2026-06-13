// =============================================================================
// Chronicle Store -- SPEC-Q M-7 (DF-levels L4, narrative depth).
//
// Per-BRANCO cross-session narrative event-store, SOPRA il combat event-log
// (sessionRoundBridge = per-round; diaryStore = per-unit). Distinto da entrambi
// per SCOPE: la cronaca e' la storia condivisa del tavolo/branco (Memory-mode).
// JSONL append-only per run_id -- cheap rotation + grep-friendly, no DB dep.
//
// Schema event (SPEC-Q sez.4):
//   { ts, type, actor_id, run_id, tier, payload }
//
// type whitelist: eventi narrativi salienti (M-1..M-7 + A3/A13 keystone).
// tier: public/private/secret (eredita SPEC-B sez.10).
//
// Storage: `data/derived/chronicles/<sanitised_run_id>.jsonl` (gitignored).
// QF1-A ratificato (2026-06-08): nuovo servizio per-branco (diaryStore resta
// per-unit; no double-store). No LLM -- gli emitter passano payload gia' pronti.
// =============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_BASE_DIR = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'data',
  'derived',
  'chronicles',
);

const ALLOWED_EVENT_TYPES = new Set([
  'creature_named', // M-2 identity-earned (name emergence)
  'creature_death',
  'mutation_acquired',
  'scar_earned', // SPEC-J wound -> narrative layer
  'legacy_formed', // M-2 legacy figure
  'run_failed', // A3 failure-as-lore (SPEC-P)
  'biome_wound', // A13 biome-wound cross-run (SPEC-P)
  'heirloom_created', // M-1 named heirloom (FFT)
  'mutation_lineage', // M-3 named-mutation lineage (Wildermyth/Godot)
  'run_epilogue', // SPEC-P sez.4 failure epilogue (run-end lore payload)
  'codex_update', // SPEC-P sez.5 Codex discovery hook on failure (B14/Hades)
]);

const ALLOWED_TIERS = new Set(['public', 'private', 'secret']);

const RUN_ID_PATTERN = /^[A-Za-z0-9_\-]+$/;

function sanitiseRunId(runId) {
  if (typeof runId !== 'string') return null;
  if (!RUN_ID_PATTERN.test(runId)) return null;
  if (runId.length === 0 || runId.length > 96) return null;
  return runId;
}

function chroniclePath(runId, baseDir = DEFAULT_BASE_DIR) {
  const safe = sanitiseRunId(runId);
  if (!safe) return null;
  return path.join(baseDir, `${safe}.jsonl`);
}

function ensureBaseDir(baseDir = DEFAULT_BASE_DIR) {
  fs.mkdirSync(baseDir, { recursive: true });
}

/**
 * Append a chronicle event. Validates run_id + type (whitelist) + tier.
 * Returns { ok, event?, error?, detail? }. Never throws on bad input.
 */
function appendEvent(runId, event, opts = {}) {
  const baseDir = opts.baseDir || DEFAULT_BASE_DIR;
  const safe = sanitiseRunId(runId);
  if (!safe) return { ok: false, error: 'invalid_run_id' };
  if (!event || typeof event !== 'object') return { ok: false, error: 'invalid_event' };
  const type = event.type;
  if (!ALLOWED_EVENT_TYPES.has(type)) {
    return { ok: false, error: 'invalid_event_type', detail: { type } };
  }
  const tier = event.tier == null ? 'public' : event.tier;
  if (!ALLOWED_TIERS.has(tier)) {
    return { ok: false, error: 'invalid_tier', detail: { tier } };
  }
  const stamped = {
    ts: typeof event.ts === 'string' ? event.ts : new Date().toISOString(),
    type,
    actor_id: typeof event.actor_id === 'string' ? event.actor_id : null,
    run_id: safe,
    tier,
    payload: event.payload && typeof event.payload === 'object' ? event.payload : {},
  };
  ensureBaseDir(baseDir);
  const filepath = path.join(baseDir, `${safe}.jsonl`);
  fs.appendFileSync(filepath, JSON.stringify(stamped) + '\n', 'utf8');
  return { ok: true, event: stamped };
}

/**
 * Read chronicle for a run (chronological). opts.actor_id / opts.type filter.
 * Returns [] if no file. Malformed lines silently skipped.
 */
function getChronicle(runId, opts = {}) {
  const baseDir = opts.baseDir || DEFAULT_BASE_DIR;
  const safe = sanitiseRunId(runId);
  if (!safe) return [];
  const filepath = path.join(baseDir, `${safe}.jsonl`);
  if (!fs.existsSync(filepath)) return [];
  const raw = fs.readFileSync(filepath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  const out = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (!parsed || typeof parsed !== 'object') continue;
      if (opts.actor_id && parsed.actor_id !== opts.actor_id) continue;
      if (opts.type && parsed.type !== opts.type) continue;
      out.push(parsed);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}

/**
 * Tail N events (default 50). reverse=true => most-recent first.
 * Used by the Memory-mode viewer / debrief (SPEC-K/D consumer).
 */
function tailChronicle(runId, opts = {}) {
  const limit = Number.isFinite(Number(opts.limit))
    ? Math.max(1, Math.min(500, Number(opts.limit)))
    : 50;
  const reverse = Boolean(opts.reverse);
  const all = getChronicle(runId, opts);
  const tail = all.slice(-limit);
  return reverse ? tail.slice().reverse() : tail;
}

/**
 * Aggregate: total + counts per type + counts per tier + first/last ts.
 */
function summary(runId, opts = {}) {
  const all = getChronicle(runId, { baseDir: opts.baseDir });
  if (all.length === 0) {
    return { run_id: runId, total: 0, by_type: {}, by_tier: {}, first_seen: null, last_seen: null };
  }
  const byType = {};
  const byTier = {};
  for (const ev of all) {
    byType[ev.type] = (byType[ev.type] || 0) + 1;
    if (ev.tier) byTier[ev.tier] = (byTier[ev.tier] || 0) + 1;
  }
  return {
    run_id: runId,
    total: all.length,
    by_type: byType,
    by_tier: byTier,
    first_seen: all[0].ts || null,
    last_seen: all[all.length - 1].ts || null,
  };
}

/**
 * Test helper -- wipe the chronicle file for a run. NOT exposed via route.
 */
function _resetChronicleForTest(runId, opts = {}) {
  const baseDir = opts.baseDir || DEFAULT_BASE_DIR;
  const safe = sanitiseRunId(runId);
  if (!safe) return;
  const filepath = path.join(baseDir, `${safe}.jsonl`);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
}

module.exports = {
  ALLOWED_EVENT_TYPES,
  ALLOWED_TIERS,
  DEFAULT_BASE_DIR,
  sanitiseRunId,
  chroniclePath,
  ensureBaseDir,
  appendEvent,
  getChronicle,
  tailChronicle,
  summary,
  _resetChronicleForTest,
};
