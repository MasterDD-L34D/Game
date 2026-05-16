// Envelope A — A1: playtest #2 telemetry bridge.
//
// Transforms the deterministic AI-vs-AI sim batch JSONL (kind-keyed,
// emitted by tests/smoke/ai-driven-sim.js + tools/sim/batch-ai-runner.js)
// into the analyzer schema consumed by tools/py/playtest_2_analyzer.py
// (one event/line, grouped by session_id).
//
// Input  : a batch dir (default: newest /tmp/ai-sim-runs/batch-*) OR
//          explicit --in <dir>. Reads every <batchdir>/runs/run-*.jsonl.
// Output : <batchdir>/playtest-2-telemetry.jsonl (override via --out).
//
// Mapping (source `kind` → analyzer event):
//   config                → derives session_id (run_label || seed || file)
//   vc_capture (rich)      → {event_type:"vc_snapshot", per_actor:{...}}
//                            uses per_actor mbti_type / ennea_archetypes /
//                            conviction_axis / sentience.tier as actually
//                            present in the run JSONL (A2 enriches these).
//   player_action (attack) → {action_type:"attack", actor_id,
//                             command_latency_ms} when a REST/rest dur is
//                             attributable to that action.
//   rest                   → command_latency_ms carrier for the next attack.
//   promotion (passthru)   → {action_type:"promotion", ...} if harness emits.
//   trait_effects/pressure → passed through when present on player_action.
//   skiv_pulse_fired       → {event_type:"skiv_pulse_fired", ...} passthru.
//   rewind                 → {action_type:"rewind", ...} passthru.
//
// Defensive contract:
//   - malformed JSONL line → skipped (counted, not fatal)
//   - NO fabrication: a field is emitted only if it is really present in
//     the source run. Missing 4-layer fields simply yield a sparser
//     vc_snapshot (analyzer degrades gracefully — that is by design).
//
// Cross-ref:
//   tests/smoke/ai-driven-sim.js     (source log() shapes)
//   tools/sim/batch-ai-runner.js     (batch dir layout)
//   tools/py/playtest_2_analyzer.py  (target schema)
//
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = { in: null, out: null };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok === '--in') args.in = argv[++i];
    else if (tok === '--out') args.out = argv[++i];
    else console.warn(`unknown arg: ${tok}`);
  }
  return args;
}

// Resolve batch dir: explicit --in, else newest /tmp/ai-sim-runs/batch-*.
function resolveBatchDir(explicit) {
  if (explicit) return explicit;
  const root = '/tmp/ai-sim-runs';
  if (!fs.existsSync(root)) {
    console.error(`FATAL: no --in and ${root} does not exist`);
    process.exit(2);
  }
  const batches = fs
    .readdirSync(root)
    .filter((d) => d.startsWith('batch-'))
    .map((d) => path.join(root, d))
    .filter((p) => fs.statSync(p).isDirectory())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (batches.length === 0) {
    console.error(`FATAL: no batch-* dirs under ${root} (pass --in <dir>)`);
    process.exit(2);
  }
  return batches[0];
}

// Defensive JSONL reader — skips malformed lines, returns {events, skipped}.
function readJsonl(file) {
  const events = [];
  let skipped = 0;
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    console.warn(`WARN: cannot read ${file}: ${err.message}`);
    return { events, skipped };
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      skipped += 1;
    }
  }
  return { events, skipped };
}

// Derive a stable session_id for a run from its config event or filename.
function deriveSessionId(events, file) {
  const cfg = events.find((e) => e && e.kind === 'config');
  if (cfg) {
    if (cfg.run_label) return String(cfg.run_label);
    if (cfg.run_seed != null) return `seed-${cfg.run_seed}`;
  }
  // Fallback: filename stem (run-<id>-<label>.jsonl).
  return path.basename(file).replace(/\.jsonl$/, '');
}

// Normalize ennea_archetypes into the analyzer-expected dict {<arch>: bool}.
// vcScoring.computeEnneaArchetypes returns an ARRAY of {id, triggered};
// the synthetic fixture uses a dict. Accept both, emit dict. No invention:
// only entries actually present are kept.
function normalizeEnnea(ennea) {
  if (!ennea) return undefined;
  if (Array.isArray(ennea)) {
    const out = {};
    for (const item of ennea) {
      if (item && item.id != null) out[String(item.id)] = Boolean(item.triggered);
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof ennea === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(ennea)) {
      // value may be bool or {triggered}
      if (v && typeof v === 'object' && 'triggered' in v) out[k] = Boolean(v.triggered);
      else out[k] = Boolean(v);
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

// Build a vc_snapshot per_actor map from a rich vc_capture event. Emits
// ONLY the sub-fields that are really present (no fabrication).
function buildVcSnapshotPerActor(vcEv) {
  const per = vcEv.per_actor || vcEv.vc_per_actor || null;
  if (!per || typeof per !== 'object') return null;
  const out = {};
  for (const [uid, actor] of Object.entries(per)) {
    if (!actor || typeof actor !== 'object') continue;
    const entry = {};
    if (actor.mbti_type) entry.mbti_type = actor.mbti_type;
    const ennea = normalizeEnnea(actor.ennea_archetypes);
    if (ennea) entry.ennea_archetypes = ennea;
    if (actor.conviction_axis && typeof actor.conviction_axis === 'object') {
      const ca = actor.conviction_axis;
      const conv = {};
      for (const axis of ['utility', 'liberty', 'morality']) {
        if (typeof ca[axis] === 'number') conv[axis] = ca[axis];
      }
      if (Object.keys(conv).length) entry.conviction_axis = conv;
    }
    // sentience may be {tier} object or a bare tier string.
    if (actor.sentience && typeof actor.sentience === 'object') {
      if (actor.sentience.tier) entry.sentience = { tier: actor.sentience.tier };
    } else if (typeof actor.sentience_tier === 'string') {
      entry.sentience = { tier: actor.sentience_tier };
    }
    if (Object.keys(entry).length) out[uid] = entry;
  }
  return Object.keys(out).length ? out : null;
}

function transformRun(events, sessionId) {
  const out = [];
  // Pending latency from the most recent rest/REST action-call, attributed
  // to the next attack-type player_action (A2 maps REST dur → latency).
  let pendingLatencyMs = null;

  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue;
    const kind = ev.kind;

    if (kind === 'rest' && typeof ev.dur_ms === 'number') {
      pendingLatencyMs = ev.dur_ms;
      continue;
    }

    if (kind === 'player_action') {
      const isAttack = ev.action === 'attack' || ev.action_type === 'attack';
      const obj = {
        session_id: sessionId,
        action_type: isAttack ? 'attack' : ev.action || ev.action_type || 'action',
        actor_id: ev.actor || ev.actor_id || null,
      };
      // command_latency_ms: prefer explicit field, else the action's own
      // round-trip dur, else a pending rest dur. Emit only if real.
      const lat =
        typeof ev.command_latency_ms === 'number'
          ? ev.command_latency_ms
          : typeof ev.dur_ms === 'number'
            ? ev.dur_ms
            : pendingLatencyMs;
      if (typeof lat === 'number' && lat > 0) obj.command_latency_ms = lat;
      pendingLatencyMs = null;
      // Passthrough OD-024 / P6 fields when the harness emits them.
      if (Array.isArray(ev.trait_effects)) obj.trait_effects = ev.trait_effects;
      if (ev.pressure_tier != null) obj.pressure_tier = ev.pressure_tier;
      out.push(obj);
      continue;
    }

    if (kind === 'vc_capture') {
      const perActor = buildVcSnapshotPerActor(ev);
      if (perActor) {
        out.push({
          session_id: sessionId,
          event_type: 'vc_snapshot',
          per_actor: perActor,
        });
      }
      continue;
    }

    if (kind === 'promotion') {
      const obj = {
        session_id: sessionId,
        action_type: 'promotion',
        actor_id: ev.actor_id || ev.actor || null,
      };
      if (ev.job_id != null) obj.job_id = ev.job_id;
      if (ev.applied_tier != null) obj.applied_tier = ev.applied_tier;
      else if (ev.target_tier != null) obj.applied_tier = ev.target_tier;
      out.push(obj);
      continue;
    }

    if (kind === 'rewind') {
      const obj = { session_id: sessionId, action_type: 'rewind', actor_id: ev.actor_id || null };
      if (typeof ev.command_latency_ms === 'number') {
        obj.command_latency_ms = ev.command_latency_ms;
      }
      out.push(obj);
      continue;
    }

    if (kind === 'skiv_pulse_fired') {
      out.push({
        session_id: sessionId,
        event_type: 'skiv_pulse_fired',
        actor_id: ev.actor_id || null,
        target_biome_id: ev.target_biome_id || '',
      });
      continue;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const batchDir = resolveBatchDir(args.in);
  const runsDir = path.join(batchDir, 'runs');
  if (!fs.existsSync(runsDir)) {
    console.error(`FATAL: ${runsDir} not found (expected batch-*/runs/run-*.jsonl)`);
    process.exit(2);
  }
  const runFiles = fs
    .readdirSync(runsDir)
    .filter((f) => f.startsWith('run-') && f.endsWith('.jsonl'))
    .map((f) => path.join(runsDir, f));
  if (runFiles.length === 0) {
    console.error(`FATAL: no run-*.jsonl in ${runsDir}`);
    process.exit(2);
  }

  const outPath = args.out || path.join(batchDir, 'playtest-2-telemetry.jsonl');
  const outLines = [];
  let totalSkipped = 0;
  const sessionIds = new Set();

  for (const file of runFiles) {
    const { events, skipped } = readJsonl(file);
    totalSkipped += skipped;
    if (events.length === 0) continue;
    const sessionId = deriveSessionId(events, file);
    sessionIds.add(sessionId);
    for (const transformed of transformRun(events, sessionId)) {
      outLines.push(JSON.stringify(transformed));
    }
  }

  fs.writeFileSync(outPath, outLines.join('\n') + (outLines.length ? '\n' : ''));
  console.log(`[telemetry-bridge] batch dir : ${batchDir}`);
  console.log(`[telemetry-bridge] run files : ${runFiles.length}`);
  console.log(`[telemetry-bridge] sessions  : ${sessionIds.size}`);
  console.log(`[telemetry-bridge] events    : ${outLines.length}`);
  console.log(`[telemetry-bridge] skipped   : ${totalSkipped} malformed line(s)`);
  console.log(`[telemetry-bridge] output    : ${outPath}`);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { transformRun, normalizeEnnea, buildVcSnapshotPerActor, deriveSessionId };
