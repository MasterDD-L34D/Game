// FASE 2 T2.1 — Batch AI-vs-AI runner.
//
// Spawns N parallel `tests/smoke/ai-driven-sim.js` workers across
// archetype × scenario combinations and aggregates JSONL outputs into
// a single CSV + Markdown report.
//
// Usage:
//   TUNNEL=https://<host>.trycloudflare.com \
//     node tools/sim/batch-ai-runner.js \
//       --seed-count 100 \
//       --concurrency 4 \
//       --profiles aggressive,balanced,cautious \
//       --scenarios enc_tutorial_01 \
//       --max-rounds 25
//
// Defaults (no flags):
//   seeds=10  concurrency=4  profiles=balanced  scenarios=enc_tutorial_01
//
// Output:
//   /tmp/ai-sim-runs/batch-<ISO>/
//     ├── runs/run-N-<seed>-<profile>-<scenario>.jsonl   (per worker)
//     ├── summary.json                                    (aggregate)
//     ├── summary.csv                                     (one row per run)
//     └── report.md                                        (Markdown)
//
// Cross-ref:
//   tests/smoke/ai-driven-sim.js  (worker harness)
//   docs/playtest/2026-05-09-fase1-ai-driven-sim-harness.md
//   packs/evo_tactics_pack/data/balance/ai_profiles.yaml (profile keys)
//
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = {
    seedCount: 10,
    concurrency: 4,
    profiles: ['balanced'],
    scenarios: ['enc_tutorial_01'],
    maxRounds: 15,
    extraPlayers: 1,
    tunnel: process.env.TUNNEL || '',
    workerScript: 'tests/smoke/ai-driven-sim.js',
    loadYaml: process.env.AI_SIM_LOAD_YAML === '1',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[++i];
    switch (tok) {
      case '--seed-count':
        args.seedCount = Math.max(1, Number(next()));
        break;
      case '--concurrency':
        args.concurrency = Math.max(1, Math.min(16, Number(next())));
        break;
      case '--profiles':
        args.profiles = next()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case '--scenarios':
        args.scenarios = next()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case '--max-rounds':
        args.maxRounds = Math.max(1, Number(next()));
        break;
      case '--players':
        args.extraPlayers = Math.max(0, Number(next()));
        break;
      case '--tunnel':
        args.tunnel = next();
        break;
      case '--worker':
        args.workerScript = next();
        break;
      case '--load-yaml':
        args.loadYaml = true;
        break;
      default:
        console.warn(`unknown arg: ${tok}`);
    }
  }
  if (!args.tunnel) {
    console.error('FATAL: set TUNNEL=... or pass --tunnel <url>');
    process.exit(2);
  }
  return args;
}

function buildCombinations(args) {
  const combos = [];
  let runIdx = 0;
  for (const profile of args.profiles) {
    for (const scenario of args.scenarios) {
      for (let s = 0; s < args.seedCount; s += 1) {
        runIdx += 1;
        const seed = 1000 + runIdx; // deterministic, monotonic
        combos.push({
          run_id: runIdx,
          seed,
          profile,
          scenario,
          label: `${profile}_${scenario}_${seed}`,
        });
      }
    }
  }
  return combos;
}

function aggregateRun(jsonlPath, combo) {
  if (!fs.existsSync(jsonlPath)) {
    return { ...combo, ok: false, error: 'jsonl_missing' };
  }
  const lines = fs.readFileSync(jsonlPath, 'utf8').split('\n').filter(Boolean);
  const events = lines
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const config = events.find((e) => e.kind === 'config') || {};
  const outcomeEv = events.find((e) => e.kind === 'combat_outcome');
  const finalPhaseEv = events.find((e) => e.kind === 'final_phase');
  const vcEv = events.find((e) => e.kind === 'vc_capture');
  const restCount = events.filter((e) => e.kind === 'rest').length;
  const wsCount = events.filter((e) => e.kind === 'ws').length;
  const playerActionCount = events.filter((e) => e.kind === 'player_action').length;
  const phaseChanges = events
    .filter((e) => e.kind === 'ws' && e.type === 'phase_change')
    .map((e) => e.payload?.phase)
    .filter(Boolean);
  const tsFirst = events.length > 0 ? events[0].ts : 0;
  const tsLast = events.length > 0 ? events[events.length - 1].ts : 0;
  const wallMs = tsLast - tsFirst;

  return {
    ...combo,
    ok: finalPhaseEv?.phase === 'ended',
    outcome: outcomeEv?.outcome || 'unknown',
    rounds: outcomeEv?.rounds || 0,
    final_phase: finalPhaseEv?.phase || 'unknown',
    rest_count: restCount,
    ws_count: wsCount,
    player_actions: playerActionCount,
    wall_ms: wallMs,
    vc_mbti: vcEv?.mbti || null,
    vc_ennea: vcEv?.ennea || null,
    config_sistema_profile: config.sistema_profile || combo.profile,
    config_run_seed: config.run_seed,
    phase_progression: phaseChanges.join('→'),
    jsonl_path: jsonlPath,
  };
}

async function runWorker(combo, runDir, args) {
  return new Promise((resolve) => {
    // Per-worker isolated subdir → no JSONL filename collision when
    // concurrency > 1 (harness writes timestamped run-<ISO>.jsonl). Each
    // subdir holds exactly one file, then we rename to canonical batch
    // name for downstream aggregate.
    const workerDir = path.join(runDir, 'workers', `w-${combo.run_id}-${combo.label}`);
    fs.mkdirSync(workerDir, { recursive: true });
    const canonicalLog = path.join(runDir, 'runs', `run-${combo.run_id}-${combo.label}.jsonl`);
    const env = {
      ...process.env,
      TUNNEL: args.tunnel,
      AI_SIM_PLAYERS: String(args.extraPlayers),
      AI_SIM_MAX_ROUNDS: String(args.maxRounds),
      AI_SIM_SCENARIO: combo.scenario,
      AI_SIM_SISTEMA_PROFILE: combo.profile,
      AI_SIM_SEED: String(combo.seed),
      AI_SIM_RUN_LABEL: combo.label,
      AI_SIM_LOG_DIR: workerDir,
      AI_SIM_LOAD_YAML: args.loadYaml ? '1' : '',
    };
    const t0 = Date.now();
    const child = spawn('node', [args.workerScript], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b) => (stdout += b.toString()));
    child.stderr.on('data', (b) => (stderr += b.toString()));
    child.on('close', (code) => {
      // Find the JSONL file in the per-worker subdir + rename canonical.
      let actualLog = null;
      try {
        const logFiles = fs.readdirSync(workerDir).filter((f) => f.endsWith('.jsonl'));
        if (logFiles.length > 0) {
          actualLog = path.join(workerDir, logFiles[0]);
          fs.renameSync(actualLog, canonicalLog);
          // Cleanup worker subdir (now empty).
          fs.rmdirSync(workerDir);
        }
      } catch (err) {
        console.warn(`worker ${combo.run_id} log rename failed: ${err.message}`);
      }
      const result = aggregateRun(canonicalLog, combo);
      result.exit_code = code;
      result.duration_ms = Date.now() - t0;
      if (code !== 0) {
        result.stderr_tail = stderr.slice(-200);
      }
      resolve(result);
    });
  });
}

async function runBatch(combos, args, runDir) {
  fs.mkdirSync(path.join(runDir, 'runs'), { recursive: true });
  const results = [];
  let next = 0;
  let active = 0;
  let done = 0;

  return new Promise((resolve) => {
    const tick = () => {
      while (active < args.concurrency && next < combos.length) {
        const combo = combos[next++];
        active += 1;
        const startedAt = Date.now();
        runWorker(combo, runDir, args).then((res) => {
          results.push(res);
          done += 1;
          active -= 1;
          const tag = res.ok ? '✓' : '✗';
          process.stdout.write(
            `[${done}/${combos.length}] ${tag} ${res.label} ${res.outcome}/${res.rounds}r ${res.duration_ms}ms\n`,
          );
          if (done === combos.length) resolve(results);
          else tick();
        });
      }
    };
    tick();
  });
}

function buildSummary(results, args) {
  const total = results.length;
  const completed = results.filter((r) => r.ok).length;
  const byOutcome = results.reduce((acc, r) => {
    acc[r.outcome] = (acc[r.outcome] || 0) + 1;
    return acc;
  }, {});
  const byProfile = {};
  for (const r of results) {
    if (!byProfile[r.profile]) {
      byProfile[r.profile] = {
        runs: 0,
        ended: 0,
        victory: 0,
        defeat: 0,
        timeout: 0,
        unknown: 0,
        avg_rounds: 0,
        avg_wall_ms: 0,
      };
    }
    const p = byProfile[r.profile];
    p.runs += 1;
    if (r.ok) p.ended += 1;
    p[r.outcome] = (p[r.outcome] || 0) + 1;
    p.avg_rounds += r.rounds || 0;
    p.avg_wall_ms += r.wall_ms || 0;
  }
  for (const k of Object.keys(byProfile)) {
    const p = byProfile[k];
    if (p.runs > 0) {
      p.avg_rounds = +(p.avg_rounds / p.runs).toFixed(2);
      p.avg_wall_ms = Math.round(p.avg_wall_ms / p.runs);
    }
  }
  // Envelope B / B2 — profile×scenario cross-tab. `by_profile` aggregates
  // across scenarios (a known blind spot: a profile can pass overall while
  // failing one scenario). This non-breaking sibling keys on
  // "<profile>::<scenario>" so per-cell regressions are visible. Existing
  // `by_profile` stays for back-compat.
  const byProfileScenario = {};
  for (const r of results) {
    const cell = `${r.profile}::${r.scenario}`;
    if (!byProfileScenario[cell]) {
      byProfileScenario[cell] = {
        profile: r.profile,
        scenario: r.scenario,
        runs: 0,
        victory: 0,
        defeat: 0,
        timeout: 0,
        avg_rounds: 0,
      };
    }
    const c = byProfileScenario[cell];
    c.runs += 1;
    c[r.outcome] = (c[r.outcome] || 0) + 1;
    c.avg_rounds += r.rounds || 0;
  }
  for (const k of Object.keys(byProfileScenario)) {
    const c = byProfileScenario[k];
    if (c.runs > 0) c.avg_rounds = +(c.avg_rounds / c.runs).toFixed(2);
  }
  const avgRounds =
    total === 0 ? 0 : +(results.reduce((s, r) => s + (r.rounds || 0), 0) / total).toFixed(2);
  const avgWallMs =
    total === 0 ? 0 : Math.round(results.reduce((s, r) => s + (r.wall_ms || 0), 0) / total);
  return {
    args,
    total,
    completed,
    completion_rate: total === 0 ? 0 : +(completed / total).toFixed(3),
    by_outcome: byOutcome,
    by_profile: byProfile,
    by_profile_scenario: byProfileScenario,
    avg_rounds: avgRounds,
    avg_wall_ms: avgWallMs,
    started_at: results.length > 0 ? new Date().toISOString() : null,
  };
}

function buildCsv(results) {
  const headers = [
    'run_id',
    'seed',
    'profile',
    'scenario',
    'final_phase',
    'outcome',
    'rounds',
    'rest_count',
    'ws_count',
    'player_actions',
    'wall_ms',
    'duration_ms',
    'exit_code',
    'phase_progression',
  ];
  const rows = results.map((r) =>
    headers
      .map((h) => {
        const v = r[h];
        if (v == null) return '';
        if (typeof v === 'object') return JSON.stringify(v).replace(/,/g, ';');
        const s = String(v);
        return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function buildMarkdown(summary, results) {
  const lines = [];
  lines.push(`# Batch AI-vs-AI run — ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Tunnel: \`${summary.args.tunnel}\``);
  lines.push(
    `Total runs: **${summary.total}** | Completed: **${summary.completed}** | Rate: **${(summary.completion_rate * 100).toFixed(1)}%**`,
  );
  lines.push(`Avg rounds: ${summary.avg_rounds} | Avg wall: ${summary.avg_wall_ms}ms`);
  lines.push('');
  lines.push('## Outcome distribution');
  lines.push('');
  lines.push('| Outcome | Count |');
  lines.push('|---|---:|');
  for (const [k, v] of Object.entries(summary.by_outcome)) lines.push(`| ${k} | ${v} |`);
  lines.push('');
  lines.push('## Profile breakdown');
  lines.push('');
  lines.push('| Profile | Runs | Ended | Victory | Defeat | Timeout | Avg rounds | Avg wall ms |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const [k, p] of Object.entries(summary.by_profile)) {
    lines.push(
      `| ${k} | ${p.runs} | ${p.ended} | ${p.victory || 0} | ${p.defeat || 0} | ${p.timeout || 0} | ${p.avg_rounds} | ${p.avg_wall_ms} |`,
    );
  }
  lines.push('');
  lines.push('## Failed runs');
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    lines.push('_None_');
  } else {
    lines.push('');
    lines.push('| Run | Outcome | Final phase | Stderr tail |');
    lines.push('|---|---|---|---|');
    for (const r of failed) {
      lines.push(
        `| ${r.run_id} | ${r.outcome} | ${r.final_phase} | ${(r.stderr_tail || '').replace(/\|/g, '\\|')} |`,
      );
    }
  }
  lines.push('');
  return lines.join('\n');
}

(async () => {
  const args = parseArgs(process.argv);
  const combos = buildCombinations(args);
  console.log(
    `BATCH: ${combos.length} runs (${args.profiles.length} profile × ${args.scenarios.length} scenario × ${args.seedCount} seed) | concurrency=${args.concurrency}`,
  );

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join('/tmp/ai-sim-runs', `batch-${ts}`);
  fs.mkdirSync(runDir, { recursive: true });
  console.log(`Run dir: ${runDir}`);

  const t0 = Date.now();
  const results = await runBatch(combos, args, runDir);
  const wallSec = ((Date.now() - t0) / 1000).toFixed(1);

  const summary = buildSummary(results, args);
  const csv = buildCsv(results);
  const md = buildMarkdown(summary, results);

  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(runDir, 'summary.csv'), csv);
  fs.writeFileSync(path.join(runDir, 'report.md'), md);

  console.log('\n=== BATCH COMPLETE ===');
  console.log(`Total wall: ${wallSec}s`);
  console.log(`Run dir:    ${runDir}`);
  console.log(`Summary:    ${path.join(runDir, 'summary.json')}`);
  console.log(`CSV:        ${path.join(runDir, 'summary.csv')}`);
  console.log(`Report MD:  ${path.join(runDir, 'report.md')}`);
  console.log('');
  console.log(
    `Completion: ${summary.completed}/${summary.total} (${(summary.completion_rate * 100).toFixed(1)}%)`,
  );
  console.log(`Outcomes: ${JSON.stringify(summary.by_outcome)}`);

  process.exit(summary.completed === summary.total ? 0 : 1);
})().catch((e) => {
  console.error('BATCH FAIL:', e);
  process.exit(2);
});
