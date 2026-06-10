---
title: 'SPEC-I ER1 role-gap -- N=40 evidence party role-aware (gate sez.8)'
date: 2026-06-10
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-10'
source_of_truth: false
language: it
tags: [evo-tactics, spec-i, er1, ermes, role-gap, n40, ratification, flag-gate]
---

# SPEC-I ER1 role-gap -- N=40 evidence party role-aware (2026-06-10)

Evidence pack per il gate **SPEC-I sez.8** dell'effetto ER1 (#2704, flag
`ERMES_ROLE_GAP_ENABLED` default OFF): party senza un ruolo demanded dal bioma
(`BIOME_ROLE_DEMANDS`) -> +1 (step PROPOSED) su UNA stat dei nemici
(max-headroom tra i BIOME_ECO_FIELDS, dentro il cap ER2 +/-2 condiviso) a
/api/session/start.

Il sim full-loop usa job `skirmisher` (non-ruolo ERMES) -> ER1 era NO-OP in
ogni batch esistente. Questo probe e' il **harness party role-aware** richiesto
dalla lettera della spec (sez.8: "ON solo post N=40 con party role-aware"):
job canonici `guerriero`/`esploratore`/`custode`/`tessitore` sul roster probe.

Posture L-069: questo documento RIPORTA; il flip del flag e' verdetto
master-dd.

## Setup

- Harness: `tools/sim/spec-i-gates-probe.js --effect er1` (nuovo; pattern
  paired-arms fp-delta #2701 / overcharge #2713 + replica noise-floor).
  Adapter esteso TDD, default byte-identical: `captureFirstState` (proof
  eco-apply letto al PRIMO poll, pre-azioni -- lo stato post-run e' inquinato
  dai buff dinamici delle ability AI sullo stesso campo).
- Bioma: `badlands` (demand `{guerriero:1, esploratore:1}`, eco band med ->
  nessun delta eco di fondo: il +1 ER1 e' isolato e atterra su
  `attack_mod_bonus`, primo field max-headroom -> +1 to-hit nemico, asse
  reale: `resolveAttack` somma mod + attack_mod_bonus al d20).
- Scenario: `enc_hardcore_reinf_01` (elimination) con override
  `biome_id: badlands`. L'encounter authored badlands (`enc_sabotage_01`) e'
  win-by-clock: pilot WR 1.0 a QUALSIASI overlay (anche 12 nemici modAdd 15;
  survivors 2.0) -- l'asse di ER1 (to-hit nemico via ciclo pseudoRng
  miss-streak) ha bisogno di un fight LUNGO perche' i cicli streak atterrino.
  Scelta del punto di misura, documentata nel probe.
- Overlay difficolta' `{countAdd:7, hpAdd:5, modAdd:7, dcAdd:2}` -- pilot
  N=10: baseline off_gap 0.50, dentro la banda target. `pressure` resta 0
  (Calm) -> spawner mai attivo (niente rumore rinforzi, vedi anche #2724).
- Roster: 2x skirmisher-statline ap:2; SOLO il job string cambia tra armi
  (nessun consumo meccanico del job a /start oltre il filtro ER1 -> le armi
  paired differiscono SOLO nel flag/input ER1):
  - party GAP = `['guerriero','custode']` (manca esploratore -> gap negativo);
  - party FULL = `['guerriero','esploratore']` (demand coperta -> no step).
- 5 armi, stessi seed (er1-51000..51039), **un processo node per arm** +
  `--aggregate` (il primo batch same-process mostrava +0.20 tra armi
  meccanicamente identiche: stato modulo-globale combat -- es. pseudoRng
  miss-streak -- condiviso tra armi sequenziali; processi isolati -> floor
  simmetrico):
  - `off_gap` / `off_gap2` (replica = **noise floor**) / `on_gap`;
  - `off_full` / `on_full` (**no-op check**: flag ON ma demand coperta).
- Artifacts: `reports/sim/spec-i-er1-role-gap-n40-2026-06-10/`.

## Risultati

Banda WR di riferimento (gate task): badlands **[0.40, 0.60]**.

| arm | n | win rate (Wilson CI95) | in banda | rounds (tick) | survivors |
| --- | --- | --- | --- | --- | --- |
| off_gap | 40 | 0.425 [0.29, 0.58] | si | 99.1 +/- 18.7 | 0.85 |
| off_gap2 (floor) | 40 | 0.400 [0.26, 0.55] | si | 98.7 +/- 16.7 | 0.80 |
| on_gap | 40 | **0.400** [0.26, 0.55] | **si** | 102.7 +/- 20.0 | 0.80 |
| off_full | 40 | 0.325 [0.20, 0.48] | borderline | 99.8 +/- 18.2 | 0.65 |
| on_full | 40 | 0.350 [0.22, 0.50] | borderline | 103.5 +/- 19.2 | 0.70 |

Proof eco-apply (max `attack_mod_bonus` nemico al primo poll, media per arm):
`on_gap = 1.00 (40/40)`; tutte le altre armi `0.00`. L'effetto scatta SOLO con
flag ON + gap negativo (no-op conservativo verificato su party legacy gia' in
#2704 -- qui verificato sul party completo).

Paired per-seed (stessi 40 seed):

| pair | win-rate delta | rounds delta (CI95) | flips L->W / W->L |
| --- | --- | --- | --- |
| off_gap2 - off_gap (noise floor) | -0.025 | -0.4 [-8.4, 7.7] | 11 / 12 |
| on_gap - off_gap (ER1 effect) | **-0.025** | 3.6 [-2.9, 10.2] | **7 / 8** |
| on_full - off_full (no-op check) | **+0.025** | 3.7 [-3.6, 11.0] | 8 / 7 |

### Findings

- **F1 -- Harness role-aware costruito + effetto esercitato davvero
  (anti-#14)**: proof 40/40 su on_gap (enemy `attack_mod_bonus` 1.0 al primo
  poll), 0 su ogni altro arm. Il gap "ER1 no-op in sim" e' chiuso.
- **F2 -- WR resta in banda con flag ON, nessuna regressione**: on_gap 0.400
  [0.26, 0.55] dentro [0.40, 0.60] (bordo basso, CI spanna la banda -- nota
  N-sample sotto); paired delta -0.025 = identico al noise floor (-0.025),
  flips 7/8 vs floor 11/12. A step=1 l'effetto e' sotto la risoluzione del
  rumore per-seed a N=40.
- **F3 -- No-op check pulito**: on_full - off_full = +0.025 (~floor): col
  party completo il flag ON e' meccanicamente identico all'OFF, come da
  design (gap >= 0 -> nessuno step).
- **F4 -- Direzione micro coerente, non significativa**: survivors on_gap
  0.80 vs off_gap 0.85, rounds +3.6 (CI include 0): il +1 to-hit nemico
  allunga/inasprisce di un soffio, senza flippare esiti oltre il floor.
- **F5 -- Nota metodologica**: il confronto CROSS-roster (off_full 0.325 vs
  off_gap 0.425) NON e' paired (roster diversi) e i CI si sovrappongono per
  intero: non leggerlo come "il party completo e' piu' debole". I verdetti
  stanno nei paired delta dentro lo stesso roster.

## Domande per la ratifica (master-dd)

1. **Flip ON con effetto sotto-floor?** A step=1 ER1 e' "in banda + zero
   regressione" (gate GREEN in senso stretto) ma anche impercettibile a
   fidelity sim. Se l'intento e' il nudge soft anti-comp-degenerate della
   spec (pressione DOLCE, mai punitiva) -> flip safe-by-measurement. Se
   l'intento e' che il gap di ruolo si SENTA, step=1 su una stat non basta:
   serve step 2 o multi-stat (nuovo N=40 dopo ri-taratura).
2. **Step PROPOSED=1 ratificato as-built?** Questa evidence supporta "non
   rompe niente"; non puo' dimostrare "si percepisce". Re-validate su player
   data quando il tier arriva (pattern #2693)?
3. **Banda [0.40, 0.60]**: il CI a N=40 (mezza-larghezza ~0.15) spanna
   l'intera banda -- per un claim in-band STRETTO servirebbe N~150+
   (anti-pattern N-sample). Accettare il claim al livello "centro stimato in
   banda + delta paired al floor"?

## Caveat strutturali

- Policy sim = attacchi base + zone pursuit: floor conservativo del +1
  to-hit (player reali con DC piu' bassi del roster probe -- mod 20 -> DC 30
  -- vedrebbero hit-rate nemici piu' alti e un effetto relativo maggiore; il
  ciclo pseudoRng miss-streak domina contro DC alti).
- ER1 scrive `attack_mod_bonus` senza chiave status: il bonus persiste tutta
  la sessione MA una collisione con buff-expiry di altri sistemi sullo stesso
  campo lo azzererebbe (condiviso by design; vale anche in produzione).
- Wave-1 only (scenario-enemies non stagia le wave successive authored); le
  unit spawnate mid-fight non passano da applyBiomeEcoEffects (eco = solo
  /start), quindi su scenari con rinforzi attivi l'ER1 coprirebbe solo il
  roster iniziale.
- Cross-arm roster GAP vs FULL: nessun consumo meccanico del job a /start
  verificato (filtro ER1 only); eventuali consumer telemetrici (actor_job)
  non toccano l'esito.

## Riproduzione

```bash
for arm in off_gap off_gap2 on_gap off_full on_full; do
  GIT_COMMIT=be4f3af9f node tools/sim/spec-i-gates-probe.js --effect er1 \
    --runs 40 --seed-base 51000 --arms "$arm" \
    --scaling '{"countAdd":7,"hpAdd":5,"modAdd":7,"dcAdd":2}' \
    --out reports/sim/spec-i-er1-role-gap-n40-2026-06-10
done
GIT_COMMIT=be4f3af9f node tools/sim/spec-i-gates-probe.js --effect er1 \
  --runs 40 --seed-base 51000 \
  --scaling '{"countAdd":7,"hpAdd":5,"modAdd":7,"dcAdd":2}' \
  --out reports/sim/spec-i-er1-role-gap-n40-2026-06-10 --aggregate
```

## Stato gate

Harness party role-aware costruito (chiude il gap "job skirmisher -> ER1
no-op in sim") + N=40 paired eseguito: il gate sez.8 di SPEC-I per ER1 ha la
sua evidence. Il flip di `ERMES_ROLE_GAP_ENABLED` (e l'eventuale ri-taratura
dello step) resta verdetto master-dd sulle domande sopra. NESSUN flag
flippato da questa PR (L-069).
