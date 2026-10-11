#!/usr/bin/env node
// SPRINT_003 fase 4 — seed script deterministico.
//
// Esegue 3 scenari demo contro un backend gia' in running
// (default: http://127.0.0.1:3334) e rinomina i log generati in
// logs/session_seed_<name>.json cosi' che la DoD dello sprint possa
// verificarli (A) esistono, (B) contengono eventi kill, (C) hanno
// spese cap_pt, (D) il fairness reject e' stato visto, (E) il /vc
// ritorna almeno T_F numerico + Conquistatore(3) triggered.
//
// Determinismo: approccio "asserzioni su soglie, non valori esatti".
// Ogni scenario usa unit configs con dc bassi e mod alti cosi' il
// d20 converge quasi sempre agli esiti attesi. Le assertion
// validano PROPRIETA' strutturali (es. vc triggered=true).
//
// Deroga guardrail SPRINT_003: questo script vive in scripts/
// (fuori da apps/backend/) ma e' il delivery della fase 4.
// Documentato nel commit message + SPRINT_003.md.
//
// NESSUNA dipendenza npm: usa fetch built-in Node 18+.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.SEED_API_BASE || 'http://127.0.0.1:3334/api/session';
const REPO_ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.join(REPO_ROOT, 'logs');

async function post(urlPath, body, expectedStatus = 200) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status !== expectedStatus) {
    throw new Error(
      `[seed] POST ${urlPath} expected ${expectedStatus}, got ${res.status}: ${JSON.stringify(json)}`,
    );
  }
  return { status: res.status, body: json };
}

async function get(urlPath) {
  const res = await fetch(`${BASE_URL}${urlPath}`);
  const json = await res.json().catch(() => ({}));
  if (res.status !== 200) {
    throw new Error(
      `[seed] GET ${urlPath} expected 200, got ${res.status}: ${JSON.stringify(json)}`,
    );
  }
  return json;
}

function renameLog(fromPath, name) {
  const target = path.join(LOGS_DIR, `session_seed_${name}.json`);
  if (fs.existsSync(target)) fs.unlinkSync(target);
  fs.renameSync(fromPath, target);
  return target;
}

// ----------------------------------------------------------------------
// SCENARIO 1 — conquistatore
//
// Obiettivo: saturare `aggro` (attacks + first_blood + kill_pressure)
// e `risk` (damage_taken alto tramite contraattacchi IA) cosi' la
// condition `aggro>0.65 && risk>0.55` di Conquistatore(3) scatta.
// ----------------------------------------------------------------------
async function runConquistatore() {
  const units = [
    {
      id: 'unit_1',
      species: 'velox',
      job: 'skirmisher',
      traits: [],
      hp: 30,
      ap: 2,
      mod: 10,
      dc: 2,
      position: { x: 2, y: 2 },
      controlled_by: 'player',
    },
    {
      id: 'unit_2',
      species: 'carapax',
      job: 'vanguard',
      traits: [],
      hp: 10,
      ap: 2,
      mod: 10,
      dc: 2,
      position: { x: 2, y: 3 },
      controlled_by: 'sistema',
    },
  ];

  const startRes = await post('/start', { units });
  const sid = startRes.body.session_id;
  const logFile = startRes.body.log_file;

  // 3 round: player attacca, poi turn/end (IA contraataca)
  for (let round = 0; round < 4; round += 1) {
    try {
      await post('/action', {
        session_id: sid,
        actor_id: 'unit_1',
        action_type: 'attack',
        target_id: 'unit_2',
      });
    } catch (err) {
      // Se unit_2 e' morta, l'ulteriore attack puo' fallire — ok
      break;
    }
    await post('/turn/end', { session_id: sid });
  }

  const vc = await get(`/${sid}/vc`);
  const perActor = vc.per_actor?.unit_1 || {};
  const tf = perActor.mbti_axes?.T_F?.value;
  const conquistatore = (perActor.ennea_archetypes || []).find((a) => a.id === 'Conquistatore(3)');
  const aggroVal = perActor.aggregate_indices?.aggro?.value;
  const riskVal = perActor.aggregate_indices?.risk?.value;

  await post('/end', { session_id: sid });
  const target = renameLog(logFile, 'conquistatore');

  return {
    sid,
    logFile: target,
    vc_summary: {
      aggro: aggroVal,
      risk: riskVal,
      T_F: tf,
      conquistatore_triggered: conquistatore?.triggered || false,
    },
  };
}

// ----------------------------------------------------------------------
// SCENARIO 2 — fairness_reject
//
// Obiettivo: validare che il 2° POST /action con cost.cap_pt:1 ritorna
// 400. Il test e' on-fail-exit: se il backend non rispondesse 400
// lo script lancerebbe e uscirebbe con error.
// ----------------------------------------------------------------------
async function runFairnessReject() {
  const startRes = await post('/start', {
    units: [
      {
        id: 'unit_1',
        species: 'velox',
        job: 'skirmisher',
        position: { x: 2, y: 2 },
        hp: 30,
        mod: 10,
        dc: 2,
      },
      {
        id: 'unit_2',
        species: 'carapax',
        job: 'vanguard',
        position: { x: 2, y: 3 },
        hp: 30,
        dc: 2,
        controlled_by: 'sistema',
      },
    ],
  });
  const sid = startRes.body.session_id;
  const logFile = startRes.body.log_file;

  // 1st cap_pt spend: OK
  const first = await post('/action', {
    session_id: sid,
    actor_id: 'unit_1',
    action_type: 'attack',
    target_id: 'unit_2',
    cost: { cap_pt: 1 },
  });
  if (first.body.cap_pt_used !== 1) {
    throw new Error(
      `[seed] fairness_reject first spend: expected cap_pt_used=1, got ${first.body.cap_pt_used}`,
    );
  }

  // 2nd cap_pt spend: MUST be 400
  await post(
    '/action',
    {
      session_id: sid,
      actor_id: 'unit_1',
      action_type: 'attack',
      target_id: 'unit_2',
      cost: { cap_pt: 1 },
    },
    400,
  );

  const vc = await get(`/${sid}/vc`);
  await post('/end', { session_id: sid });
  const target = renameLog(logFile, 'fairness_reject');

  return {
    sid,
    logFile: target,
    vc_summary: {
      cap_pt_used: vc.meta?.cap_pt_used,
      cap_pt_max: vc.meta?.cap_pt_max,
    },
  };
}

// ----------------------------------------------------------------------
// SCENARIO 3 — mbti_baseline
//
// Obiettivo: mix bilanciato attack/move cosi' T_F e J_P sono entrambi
// calcolabili con valori non-degenere (non 0 e non 1 esatti).
// ----------------------------------------------------------------------
async function runMbtiBaseline() {
  const units = [
    {
      id: 'unit_1',
      species: 'velox',
      job: 'skirmisher',
      position: { x: 0, y: 0 },
      hp: 30,
      ap: 4,
      mod: 10,
      dc: 2,
    },
    {
      id: 'unit_2',
      species: 'carapax',
      job: 'vanguard',
      position: { x: 4, y: 4 },
      hp: 30,
      mod: 10,
      dc: 2,
      controlled_by: 'sistema',
    },
  ];
  const startRes = await post('/start', { units });
  const sid = startRes.body.session_id;
  const logFile = startRes.body.log_file;

  // alcune move prima del primo attack (setup_ratio + time_to_commit)
  await post('/action', {
    session_id: sid,
    actor_id: 'unit_1',
    action_type: 'move',
    position: { x: 2, y: 2 },
  });
  await post('/turn/end', { session_id: sid });

  await post('/action', {
    session_id: sid,
    actor_id: 'unit_1',
    action_type: 'move',
    position: { x: 3, y: 3 },
  });
  await post('/turn/end', { session_id: sid });

  // Ora attacca
  await post('/action', {
    session_id: sid,
    actor_id: 'unit_1',
    action_type: 'attack',
    target_id: 'unit_2',
  });
  await post('/turn/end', { session_id: sid });

  const vc = await get(`/${sid}/vc`);
  await post('/end', { session_id: sid });
  const target = renameLog(logFile, 'mbti_baseline');

  return {
    sid,
    logFile: target,
    vc_summary: {
      T_F: vc.per_actor?.unit_1?.mbti_axes?.T_F?.value,
      J_P: vc.per_actor?.unit_1?.mbti_axes?.J_P?.value,
    },
  };
}

async function main() {
  console.log(`[seed] backend base = ${BASE_URL}`);
  fs.mkdirSync(LOGS_DIR, { recursive: true });

  const results = [];

  console.log('[seed] running scenario 1: conquistatore');
  const r1 = await runConquistatore();
  console.log(`[seed]   -> ${r1.logFile}`);
  console.log(`[seed]   vc_summary = ${JSON.stringify(r1.vc_summary)}`);
  results.push(r1);

  console.log('[seed] running scenario 2: fairness_reject');
  const r2 = await runFairnessReject();
  console.log(`[seed]   -> ${r2.logFile}`);
  console.log(`[seed]   vc_summary = ${JSON.stringify(r2.vc_summary)}`);
  results.push(r2);

  console.log('[seed] running scenario 3: mbti_baseline');
  const r3 = await runMbtiBaseline();
  console.log(`[seed]   -> ${r3.logFile}`);
  console.log(`[seed]   vc_summary = ${JSON.stringify(r3.vc_summary)}`);
  results.push(r3);

  // DoD assertions
  const errors = [];
  if (!r1.vc_summary.conquistatore_triggered) {
    errors.push(
      `conquistatore scenario: Conquistatore(3) NOT triggered (aggro=${r1.vc_summary.aggro}, risk=${r1.vc_summary.risk})`,
    );
  }
  if (r1.vc_summary.T_F === null || r1.vc_summary.T_F === undefined) {
    errors.push('conquistatore scenario: T_F MBTI axis is null');
  }
  if (r2.vc_summary.cap_pt_used !== 1) {
    errors.push(
      `fairness_reject scenario: cap_pt_used expected 1, got ${r2.vc_summary.cap_pt_used}`,
    );
  }
  if (r3.vc_summary.T_F === null || r3.vc_summary.T_F === undefined) {
    errors.push('mbti_baseline scenario: T_F is null');
  }
  if (r3.vc_summary.J_P === null || r3.vc_summary.J_P === undefined) {
    errors.push('mbti_baseline scenario: J_P is null');
  }

  if (errors.length > 0) {
    console.error('[seed] DoD FAILED:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log('[seed] DoD OK: 3 sessioni generate, VC on demand verificato');
}

main().catch((err) => {
  console.error('[seed] errore fatale:', err.message || err);
  process.exit(1);
});
