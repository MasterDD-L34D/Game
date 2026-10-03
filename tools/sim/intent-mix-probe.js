'use strict';
// Intent-mix probe: conta la COMPOSIZIONE delle decisioni Sistema in un fight reale
// (attack / approach / retreat / skip-da-cap), per arm di flag.
//
// Perche' esiste: le bande N=40 misurano completion/pace/liveness ma NON dicono cosa
// il Sistema STA FACENDO. Due negative result (roster-scaling #3231, per-unit-actions
// 2026-07-10) hanno mostrato che aumentare le ATTIVAZIONI non muove la win-rate: serviva
// uno strumento che guardasse dentro il round. Evidence:
// docs/research/2026-07-10-sistema-cap-falsification.md
//
// Metodo: patch del module-cache di declareSistemaIntents PRIMA che app.js lo richieda,
// cosi' il conteggio e' sul percorso di decisione REALE (nessun mock, nessun fork della
// logica). Il probe non muta la sessione e non cambia l'esito.
//
// Uso:
//   node tools/sim/intent-mix-probe.js --encounter <enc_id> [--seed 1] [--pressure 50]
//   SISTEMA_PER_UNIT_ACTIONS_ENABLED=true node tools/sim/intent-mix-probe.js --encounter <id>
// Output: stdout = SOLO una riga JSON (jsonl-friendly: `... >> runs.jsonl` e' safe).
//
// stdout JSON-only (Codex P2 su PR #3246): i moduli del backend loggano su console.log
// al require-time ([prisma], [jobs], [trait-effects], [xpBudget audit], ...). Se stdout
// li raccoglie, il .jsonl del batch nasce corrotto. Rimappiamo console.* su stderr PRIMA
// di qualunque require del backend: la diagnostica resta visibile (e redirigibile con
// 2>), stdout resta un canale dati puro. Il risultato finale va su process.stdout.write.
for (const level of ['log', 'info', 'debug']) {
  const orig = console[level].bind(console);
  console[level] = (...a) => {
    if (process.env.INTENT_MIX_KEEP_STDOUT === 'true') return orig(...a);
    process.stderr.write(a.map(String).join(' ') + '\n');
  };
}

const path = require('node:path');
const fs = require('node:fs');

const DECL = path.resolve(
  __dirname,
  '..',
  '..',
  'apps',
  'backend',
  'services',
  'ai',
  'declareSistemaIntents',
);
const declMod = require(DECL);
const origFactory = declMod.createDeclareSistemaIntents;

const tally = { attack: 0, approach: 0, retreat: 0, skip: 0, other: 0, rounds: 0, capped: 0 };
declMod.createDeclareSistemaIntents = function instrumented(deps) {
  const inner = origFactory(deps);
  return function declareAndCount(session) {
    const r = inner(session);
    tally.rounds += 1;
    for (const d of r.decisions || []) {
      if (d.rule === 'PRESSURE_CAP') tally.capped += 1;
      const k = String(d.intent || 'other');
      if (Object.prototype.hasOwnProperty.call(tally, k)) tally[k] += 1;
      else tally.other += 1;
    }
    return r;
  };
};

process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
process.env.IDEA_ENGINE_STUB_ORCHESTRATOR = '1';

const yaml = require('js-yaml');
const request = require('supertest');
const { createApp } = require('../../apps/backend/app');
const { runEncounter } = require('./combat-adapter');

const ENCOUNTER_DIR = path.resolve(__dirname, '..', '..', 'docs', 'planning', 'encounters');
const TIER_HP = { base: 7, elite: 10, apex: 14 };
const TIER_MOD = { base: 1, elite: 2, apex: 4 };
const TIER_DC = { base: 11, elite: 12, apex: 14 };

function parseArgs(argv) {
  const args = { encounter: null, seed: 1, pressure: 50, partyScenario: 'enc_badlands_pilot_01' };
  for (let i = 2; i < argv.length; i += 1) {
    const tok = argv[i];
    const next = () => argv[(i += 1)];
    if (tok === '--encounter') args.encounter = next();
    else if (tok === '--seed') args.seed = Number(next());
    else if (tok === '--pressure') args.pressure = Number(next());
    else if (tok === '--party-scenario') args.partyScenario = next();
    else if (tok.startsWith('--')) console.warn(`unknown arg: ${tok}`);
  }
  if (!args.encounter) {
    console.error('usage: node tools/sim/intent-mix-probe.js --encounter <enc_id> [--seed N]');
    process.exit(2);
  }
  return args;
}

// Mirror di grid-band-probe.js (stessa tier table -> numeri comparabili).
function enemiesFromYaml(enc) {
  const wave1 = [...enc.waves].sort((a, b) => (a.turn_trigger || 0) - (b.turn_trigger || 0))[0];
  const sp = wave1.spawn_points;
  const out = [];
  let i = 0;
  for (const def of wave1.units) {
    for (let k = 0; k < (def.count || 1); k += 1) {
      const tier = def.tier || 'base';
      const pos = sp[i % sp.length];
      i += 1;
      out.push({
        id: `sis_${i}`,
        species: def.species,
        species_id: def.species,
        hp: TIER_HP[tier],
        max_hp: TIER_HP[tier],
        ap: 2,
        ap_max: 2,
        mod: TIER_MOD[tier],
        dc: TIER_DC[tier],
        attack_range: 1,
        damage: { min: 1, max: 3 },
        initiative: 10,
        position: { x: pos[0], y: pos[1] },
        ai_profile: def.ai_profile,
        controlled_by: 'sistema',
        status: {},
      });
    }
  }
  return out;
}

async function fetchParty(partyScenario, playerSpawn) {
  const { app, close } = createApp({ databasePath: null });
  try {
    const r = await request(app).get(`/api/tutorial/${partyScenario}`);
    if (r.status !== 200) throw new Error(`canon party fetch ${r.status}`);
    return (r.body.units || [])
      .filter((u) => u.controlled_by === 'player')
      .map((u, i) => {
        const spawn = playerSpawn[i % playerSpawn.length];
        return { ...u, hp: u.max_hp ?? u.hp, status: {}, position: { x: spawn[0], y: spawn[1] } };
      });
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const enc = yaml.load(
    fs.readFileSync(path.join(ENCOUNTER_DIR, `${args.encounter}.yaml`), 'utf8'),
  );
  const party = await fetchParty(args.partyScenario, enc.player_spawn);

  const { app, close } = createApp({ databasePath: null });
  let res;
  try {
    const http = {
      post: (p, b) =>
        request(app)
          .post(p)
          .send(b)
          .then((r) => ({ status: r.status, body: r.body })),
      get: (p, q) =>
        request(app)
          .get(p)
          .query(q || {})
          .then((r) => ({ status: r.status, body: r.body })),
    };
    res = await runEncounter(http, {
      roster: party,
      enemies: enemiesFromYaml(enc),
      scenarioId: enc.encounter_id,
      seed: args.seed,
      maxRounds: 40,
      pressureStart: args.pressure,
      allPlayersActPerRound: true,
      endSession: true,
    });
  } finally {
    if (typeof close === 'function') await close().catch(() => {});
  }

  const acted = tally.attack + tally.approach + tally.retreat;
  // process.stdout.write, non console.log: quest'ultimo e' rimappato su stderr sopra.
  process.stdout.write(
    JSON.stringify({
      arm: process.env.SISTEMA_PER_UNIT_ACTIONS_ENABLED === 'true' ? 'uncapped' : 'control',
      encounter: args.encounter,
      seed: args.seed,
      outcome: res.outcome,
      rounds: res.rounds,
      attack: tally.attack,
      approach: tally.approach,
      retreat: tally.retreat,
      capped: tally.capped,
      acted,
      attack_pct: acted ? Number(((100 * tally.attack) / acted).toFixed(1)) : 0,
    }) + '\n',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
