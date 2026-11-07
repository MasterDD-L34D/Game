#!/usr/bin/env node
/**
 * Evo-Tactics — Play CLI (RESEARCH_TODO sprint "far partire il gioco")
 *
 * Interactive session runner. Consuma /api/session/* via HTTP.
 * Input sintassi canonica (FRICTION #1 resolution):
 *
 *   <actor_id>: move [x,y]
 *   <actor_id>: atk <target_id>
 *   <actor_id>: ability <ability_id> [target=<target_id>]
 *   end                           # termina turno corrente
 *   state                         # refresh state
 *   help                          # lista comandi
 *   quit                          # exit
 *
 * Usage:
 *   node tools/js/play.js [--url http://localhost:3334] [--scenario enc_tutorial_01]
 *
 * Prerequisito: backend attivo (npm run start:api).
 */

const readline = require('node:readline');
const { argv, exit, stdout, stdin } = require('node:process');

// ─────────────────────────────────────────────────────────────────
// Config + args
// ─────────────────────────────────────────────────────────────────

function parseArgs(args) {
  const out = { url: 'http://localhost:3334', scenario: 'enc_tutorial_01' };
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) out.url = args[++i];
    else if (args[i] === '--scenario' && args[i + 1]) out.scenario = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(
        'Usage: node tools/js/play.js [--url URL] [--scenario ID]\n\n' +
          'Env:\n  PLAY_URL        override --url\n  PLAY_SCENARIO   override --scenario',
      );
      exit(0);
    }
  }
  if (process.env.PLAY_URL) out.url = process.env.PLAY_URL;
  if (process.env.PLAY_SCENARIO) out.scenario = process.env.PLAY_SCENARIO;
  return out;
}

// ─────────────────────────────────────────────────────────────────
// ANSI color (minimal, no deps)
// ─────────────────────────────────────────────────────────────────

const COLOR = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

const c = (txt, col) => `${COLOR[col] || ''}${txt}${COLOR.reset}`;

// ─────────────────────────────────────────────────────────────────
// API client (fetch-based, Node 18+)
// ─────────────────────────────────────────────────────────────────

function createClient(baseUrl) {
  async function request(method, path, body) {
    const url = `${baseUrl}${path}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  }
  return {
    getScenario: (id) => request('GET', `/api/tutorial/${id}`),
    start: (units) => request('POST', '/api/session/start', { units }),
    state: (sessionId) =>
      request('GET', `/api/session/state?session_id=${encodeURIComponent(sessionId)}`),
    action: (body) => request('POST', '/api/session/action', body),
    endTurn: (sessionId) => request('POST', '/api/session/turn/end', { session_id: sessionId }),
  };
}

// ─────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────

function unitGlyph(u) {
  if (u.hp <= 0) return c('☠', 'gray');
  if (u.controlled_by === 'player') return c(u.id.slice(0, 2), 'cyan');
  return c(u.id.slice(0, 2), 'red');
}

function renderGrid(state) {
  const w = state.grid?.width || 8;
  const h = state.grid?.height || 8;
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));

  for (const u of state.units || []) {
    if (!u.position) continue;
    const { x, y } = u.position;
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    cells[y][x] = unitGlyph(u);
  }

  const header = '    ' + Array.from({ length: w }, (_, i) => String(i).padEnd(3)).join('');
  const rows = [];
  for (let y = h - 1; y >= 0; y--) {
    const row = cells[y].map((cell) => cell.padEnd(cell.length > 1 ? 3 : 3)).join('');
    rows.push(`${String(y).padStart(2)}  ${row}`);
  }
  return [header, ...rows].join('\n');
}

function renderUnits(state) {
  const lines = [];
  for (const u of state.units || []) {
    const hpRatio = u.hp / (u.max_hp || u.hp || 1);
    const hpColor = hpRatio < 0.3 ? 'red' : hpRatio < 0.6 ? 'yellow' : 'green';
    const hpText = c(`${u.hp}/${u.max_hp || u.hp}`, hpColor);
    const apText = c(`AP ${u.ap_remaining ?? u.ap}/${u.ap}`, 'magenta');
    const pos = u.position ? `[${u.position.x},${u.position.y}]` : '—';
    const faction = u.controlled_by === 'player' ? c('PG', 'cyan') : c('SIS', 'red');
    const job = u.job ? c(u.job, 'dim') : '';
    const active = u.id === state.active_unit ? c('▶ ', 'yellow') : '  ';
    const dead = u.hp <= 0 ? c(' DEAD', 'gray') : '';
    lines.push(
      `${active}${u.id.padEnd(12)} ${faction} ${hpText.padEnd(16)} ${apText} ${pos} ${job}${dead}`,
    );
  }
  return lines.join('\n');
}

function renderState(state) {
  const header = c(`━━━ Turn ${state.turn} · active: ${state.active_unit || '—'} ━━━`, 'bold');
  return [header, '', renderGrid(state), '', renderUnits(state), ''].join('\n');
}

// ─────────────────────────────────────────────────────────────────
// Parser input
// ─────────────────────────────────────────────────────────────────

// Match: <actor>: <verb> <rest>
const CMD_RE = /^([a-z0-9_]+):\s*(\w+)(.*)$/i;
const COORD_RE = /\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/;
const KV_RE = /([a-z_]+)=([a-z0-9_]+)/gi;

function parseInput(raw) {
  const line = raw.trim();
  if (!line) return { kind: 'noop' };
  const lower = line.toLowerCase();
  if (lower === 'end' || lower === 'end-turn' || lower === 'fine') return { kind: 'end' };
  if (lower === 'state' || lower === 'stato') return { kind: 'state' };
  if (lower === 'help' || lower === '?') return { kind: 'help' };
  if (lower === 'quit' || lower === 'exit' || lower === 'q') return { kind: 'quit' };

  const m = CMD_RE.exec(line);
  if (!m) return { kind: 'error', msg: `Comando non parsato: "${line}"` };

  const [, actor, verbRaw, restRaw] = m;
  const verb = verbRaw.toLowerCase();
  const rest = restRaw.trim();

  if (verb === 'move' || verb === 'mv') {
    const cm = COORD_RE.exec(rest);
    if (!cm) return { kind: 'error', msg: 'move richiede [x,y]' };
    return { kind: 'move', actor_id: actor, position: { x: +cm[1], y: +cm[2] } };
  }
  if (verb === 'atk' || verb === 'attack' || verb === 'attacca') {
    const targetId = rest.split(/\s+/)[0];
    if (!targetId) return { kind: 'error', msg: 'atk richiede target_id' };
    return { kind: 'attack', actor_id: actor, target_id: targetId };
  }
  if (verb === 'ability' || verb === 'ab') {
    const parts = rest.split(/\s+/);
    const abilityId = parts[0];
    if (!abilityId) return { kind: 'error', msg: 'ability richiede <ability_id>' };
    const kv = {};
    let m2;
    while ((m2 = KV_RE.exec(rest)) !== null) kv[m2[1]] = m2[2];
    return {
      kind: 'ability',
      actor_id: actor,
      ability_id: abilityId,
      target_id: kv.target || null,
    };
  }
  return { kind: 'error', msg: `verbo non supportato: "${verb}"` };
}

// ─────────────────────────────────────────────────────────────────
// Help
// ─────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(
    [
      c('\nComandi disponibili:', 'bold'),
      '  <actor_id>: move [x,y]                  — muovi actor a coordinate',
      '  <actor_id>: atk <target_id>             — attacca target',
      '  <actor_id>: ability <id> target=<tid>   — usa ability (es. dash_strike)',
      '  end                                     — termina turno',
      '  state                                   — refresh stato',
      '  help                                    — questo messaggio',
      '  quit                                    — esci',
      '',
    ].join('\n'),
  );
}

// ─────────────────────────────────────────────────────────────────
// Main loop
// ─────────────────────────────────────────────────────────────────

async function main() {
  const { url, scenario } = parseArgs(argv);
  const client = createClient(url);

  console.log(c(`\n🦴 Evo-Tactics — Play CLI`, 'bold'));
  console.log(c(`Backend: ${url}`, 'dim'));
  console.log(c(`Scenario: ${scenario}`, 'dim'));

  const sc = await client.getScenario(scenario);
  if (!sc.ok) {
    console.error(c(`\n❌ Scenario load failed (${sc.status}): ${JSON.stringify(sc.data)}`, 'red'));
    console.error(c(`   Verifica backend attivo: npm run start:api`, 'yellow'));
    exit(1);
  }

  const startRes = await client.start(sc.data.units);
  if (!startRes.ok) {
    console.error(c(`\n❌ Session start failed: ${JSON.stringify(startRes.data)}`, 'red'));
    exit(1);
  }

  const sid = startRes.data.session_id;
  console.log(c(`\n✓ Session started: ${sid.slice(0, 8)}...`, 'green'));

  let state = startRes.data.state;
  let stopped = false;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  rl.on('close', () => {
    stopped = true;
  });

  function prompt() {
    if (stopped) return;
    rl.question(c('> ', 'magenta'), async (line) => {
      const parsed = parseInput(line);
      try {
        switch (parsed.kind) {
          case 'noop':
            break;
          case 'help':
            printHelp();
            break;
          case 'quit':
            console.log(c('\n🦴 caveman dire: Master finire turno. ugh bunga.\n', 'yellow'));
            stopped = true;
            rl.close();
            return;
          case 'error':
            console.error(c(`❌ ${parsed.msg}`, 'red'));
            break;
          case 'state': {
            const r = await client.state(sid);
            if (r.ok) {
              state = r.data;
              console.log(renderState(state));
            } else console.error(c(`state failed: ${JSON.stringify(r.data)}`, 'red'));
            break;
          }
          case 'end': {
            const r = await client.endTurn(sid);
            if (r.ok) {
              state = r.data.state || state;
              console.log(c(`\n⏭  Turno terminato. SIS agisce...`, 'yellow'));
              const s2 = await client.state(sid);
              if (s2.ok) state = s2.data;
              console.log(renderState(state));
            } else console.error(c(`end failed: ${JSON.stringify(r.data)}`, 'red'));
            break;
          }
          case 'move':
          case 'attack':
          case 'ability': {
            const body = {
              session_id: sid,
              action_type: parsed.kind === 'attack' ? 'attack' : parsed.kind,
              actor_id: parsed.actor_id,
            };
            if (parsed.kind === 'move') body.position = parsed.position;
            if (parsed.kind === 'attack') body.target_id = parsed.target_id;
            if (parsed.kind === 'ability') {
              body.ability_id = parsed.ability_id;
              if (parsed.target_id) body.target_id = parsed.target_id;
            }
            const r = await client.action(body);
            if (r.ok) {
              state = r.data.state || state;
              const s2 = await client.state(sid);
              if (s2.ok) state = s2.data;
              console.log(renderState(state));
              if (r.data.resolution)
                console.log(c(`  → ${JSON.stringify(r.data.resolution)}`, 'dim'));
            } else {
              console.error(c(`❌ action failed: ${r.data?.error || r.status}`, 'red'));
            }
            break;
          }
          default:
            console.error(c(`❌ unknown command kind`, 'red'));
        }
      } catch (err) {
        console.error(c(`❌ error: ${err.message}`, 'red'));
      }
      if (!stopped) prompt();
    });
  }

  console.log(renderState(state));
  printHelp();
  prompt();
}

// ─────────────────────────────────────────────────────────────────
// Export for tests (when required) + run as CLI
// ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  main().catch((err) => {
    console.error(c(`\n💥 fatal: ${err.message}`, 'red'));
    exit(1);
  });
}

module.exports = { parseInput, createClient, renderGrid, renderUnits, renderState };
