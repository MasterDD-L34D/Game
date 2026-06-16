---
title: 'A2 pressure_tier_floor -- N=40 band-verify (flag-ON vs baseline)'
date: 2026-06-16
type: calibration-evidence
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-16'
source_of_truth: false
language: it
tags: [evo-tactics, pressure-tier, sistema, n40, band-verify, calibration, flag-gated, combat, cross-stack]
related: 2026-06-16-pressure-tier-floor-backend-mirror
---

# A2 pressure_tier_floor -- N=40 band-verify (2026-06-16)

Evidenza per il "Gate balance" (owner-gated, BLOCCANTE) della spec A2
(`docs/design/2026-06-16-pressure-tier-floor-backend-mirror.md`). PR #2773 ha
shippato il mirror backend di `encounter.pressure_tier_floor` flag-gated OFF
(`PRESSURE_TIER_FLOOR_ENABLED`). Questo documento RIPORTA l'esito N=40 del
confronto flag-ON vs baseline flag-OFF sui 10 encounter con floor 1-4.

**Posture L-069: il documento riporta, il flip e' un verdetto master-dd.** Il
probe non flippa mai il flag; i valori floor restano "educated guesses, not
calibrated" (TKT) finche' master-dd non ratifica.

## TL;DR (verdetto sintetico)

- **Meccanismo: VERIFICATO end-to-end (anti-pattern #14).** Il fire-check mostra
  che il floor alza il tier Sistema attraverso il backend reale su tutti e 10
  gli encounter: floor 1 -> Calm (no-op), floor 2 -> Alert (25), floor 3 ->
  Escalated (50), floor 4 -> Critical (75). Flag OFF = sempre Calm (0).
- **Balance: SAFE nel N=40 AI-sim.** I delta WR ON-vs-OFF per classe stanno
  DENTRO il noise floor (off2-off): tutorial ~0, standard ~0, hardcore -0.02.
  Nessun cratering OOB. Flag-OFF byte-identico al pre-A2 (no regression M1).
- **Inconcludente sul target human del TKT.** L'AI-sim greedy satura gli
  encounter authored (WR sopra le bande calibrate), quindi NON puo' confermare
  il target playtest-#2 "hardcore WR 40-60%" -- conferma SICUREZZA e
  back-compat, non la magnitudine ottimale dei valori floor.
- **Effetto "piu' difficile" robusto solo su `enc_hardcore_reinf_01`**
  (l'unico encounter con `reinforcement_pool`): ON attiva i rinforzi
  (spawn 0 -> 4), allunga i combattimenti (round su, defeat -> timeout). E' il
  floor che fa il suo lavoro di design sul caso dove c'e' qualcosa da fare.
- **Raccomandazione**: vedi sez. "Raccomandazione" -- flip-ON e' a basso rischio
  per l'AI-sim; la ratifica della MAGNITUDINE dei floor verso il target human
  e' meglio gated sul playtest Godot #2 (l'AI-sim non raggiunge quella banda).

## Harness + protocollo

- Probe nuovo: `tools/sim/pressure-floor-probe.js` (mirror del pattern
  ratify-grade di `spec-i-gates-probe.js` / `overcharge-probe.js`).
- App in-process (`createApp({databasePath:null})`), listener persistente
  127.0.0.1 (L-074), `fetch` keep-alive. Encounter caricato via `encounter_id`
  (session.js:2099 plumba `pressure_tier_floor` -> session). Combat guidato da
  `combat-adapter` (player policy greedy `combat-policy`, sistema auto-resolve
  via `/turn/end` -> `declareSistemaIntents` con intent-cap floored).
- **Arms** (flag pinnato ESPLICITAMENTE per arm): `off` / `off2` (noise floor =
  replica di off) / `on`. **Un processo per (scenario, arm)** poi `--aggregate`:
  il modulo combat ha stato globale (pseudoRng miss-streak) che contamina arm
  sequenziali nello stesso processo (saga ER6 +0.20 fantasma). N=40/arm, seed
  paired tra arm.
- **Bande**: `data/core/balance/damage_curves.yaml` `encounter_classes.*.target_bands`
  (verdict GREEN/AMBER/RED, ±0.05 amber, mirror di `batch_calibrate_hardcore06.py`).
- **Due configurazioni** (vedi "Caveat saturazione"):
  - **Config A -- authored**: probe roster `strong` (2x skirmisher hp30 mod20
    range2), scaling `{}`. Faithful agli encounter reali ma SATURA (roster
    sovradimensionato vs wave-1).
  - **Config B -- de-saturated**: probe roster `weak` (2x hp16 mod5 range1) +
    overlay `{countAdd:3, modAdd:3}` (measurement-point choice L-069, NON una
    ratifica di banda) cosi' il baseline OFF e' competitivo e il delta WR del
    floor e' misurabile.

## Fire check (anti-pattern #14): il floor alza il tier Sistema

Identico nelle due config (il tier dipende dal floor, non dal roster). Prova
che il plumbing + `effectivePressure` + il flag funzionano end-to-end:

| encounter | class | floor | min atteso | tier OFF (pressione) | tier ON (pressione) |
| --- | --- | --- | --- | --- | --- |
| enc_tutorial_01 | tutorial | 1 | 0 | Calm (0) | Calm (0) |
| enc_tutorial_02 | tutorial | 1 | 0 | Calm (0) | Calm (0) |
| enc_savana_01 | standard | 2 | 25 | Calm (0) | Alert (25) |
| enc_caverna_02 | standard | 2 | 25 | Calm (0) | Alert (25) |
| enc_capture_01 | standard | 2 | 25 | Calm (0) | Alert (25) |
| enc_escort_01 | standard | 2 | 25 | Calm (0) | Alert (25) |
| enc_survival_01 | hardcore | 3 | 50 | Calm (0) | Escalated (50) |
| enc_savana_skiv_solo_vs_pack | hardcore | 3 | 50 | Calm (0) | Escalated (50) |
| enc_hardcore_reinf_01 | hardcore | 4 | 75 | Calm (0) | Critical (75) |
| enc_frattura_03 | hardcore | 4 | 75 | Calm (0) | Critical (75) |

floor 1 (tutorial) = no-op confermato (FLOOR_MIN[1]=0). Floor 2/3/4 alzano il
tier esattamente come da mapping. Flag OFF = sempre Calm.

## Config A -- authored (roster strong, scaling {}): per-classe pooled

Noise floor (off2-off) = 0.00 ovunque (roster forte -> vittorie deterministiche).

| classe | banda WR | OFF WR | ON WR | OFF defeat | ON defeat | delta WR |
| --- | --- | --- | --- | --- | --- | --- |
| tutorial (n=80) | 0.60-0.80 | 100% | 100% | 0% | 0% | 0.00 |
| standard (n=160) | 0.35-0.55 | 75% | 50% | 25% | 50% | -0.25 |
| hardcore (n=160) | 0.15-0.25 | 100% | 100% | 0% | 0% | 0.00 |

Il -0.25 standard ON e' guidato INTERAMENTE da `enc_caverna_02` (vedi sotto);
gli altri standard sono piatti. Hardcore satura (roster forte vince sempre) ma
il meccanismo e' attivo (`enc_hardcore_reinf_01` ON: round 19 -> 32.5, spawn
0 -> 4).

### Config A -- note per-encounter chiave

- **`enc_caverna_02` (capture_point, floor 2): OFF 100% -> ON 0% (flip 40/40
  W->L), round 15.6 -> 96.7.** L'encounter ha zona piccola (2x2) e NESSUN
  `time_limit`: ON (Alert, intent-cap 1 -> 2) il doppio di nemici agisce per
  round, la zona resta contesa, l'hold non si completa, il fight degenera in
  attrito lungo finche' i PG muoiono. **NON robusto: in Config B (de-sat) NON
  si riproduce (100% entrambe le arm).** = artefatto del path strong-roster /
  no-time-limit, non un bug di valore floor. Authoring note: caverna_02 manca
  di `loss_conditions.time_limit` (capture_01 ce l'ha e regge).
- **`enc_hardcore_reinf_01` (floor 4): ON spawn 0 -> 4, round 19 -> 32.5.** I
  rinforzi si attivano (Critical >= min_tier Alert). WR resta 100% (roster
  forte) ma il floor lavora.
- **`enc_escort_01`: defeat al round 1 in entrambe le arm.** L'obiettivo escort
  non e' staged correttamente nel sim (target escort) -> degenerato, floor
  irrilevante. Limite harness, non del floor.

## Config B -- de-saturated (roster weak + {countAdd:3,modAdd:3}): per-classe pooled

Noise floor reale (off2-off ±0.05-0.10): roster debole -> varianza vera.

| classe | banda WR | OFF WR | ON WR | OFF defeat | ON defeat | ON timeout | delta WR | vs noise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tutorial (n=80) | 0.60-0.80 | 95% | 95% | 5% | 5% | 0% | 0.00 | noise -0.05 |
| standard (n=160) | 0.35-0.55 | 46.3% | 46.3% | 53.8% | 53.8% | 0% | 0.00 | noise -0.02 |
| hardcore (n=160) | 0.15-0.25 | 76.9% | 75.0% | 23.1% | 16.9% | 8.1% | -0.02 | noise 0.00 |

**Tutti i delta WR per-classe stanno dentro il noise floor.** Il floor e'
balance-NEUTRO sul win-rate ai punti di misura del sim. La sola firma robusta:
hardcore ON sposta defeat -> timeout (8.1% timeout) = i fight si allungano
(rinforzi), non un cambio di WR.

### Config B -- note per-encounter chiave

- **`enc_hardcore_reinf_01` (floor 4): OFF 7.5% -> ON 0.0%, defeat 92.5% ->
  67.5%, timeout 0% -> 32.5%, round 68 -> 94, spawn 0 -> 4.** Qui il floor MORDE
  in modo robusto: i rinforzi + Critical allungano i combattimenti oltre
  maxRounds per il party debole (timeout), WR -7.5pp. E' l'unico encounter dove
  il floor produce un effetto "piu' difficile" chiaro e atteso.
- Elimination/survival (`savana_01`, `survival_01`, `skiv_solo_vs_pack`,
  `frattura_03`): delta ~0 (la policy aggressiva chiude prima che la pressione
  morda; survival e' vinto banalmente).
- `capture_01` / `escort_01`: floored a 0% in entrambe le arm (capture: zona
  persa per time_limit/wipe col party debole; escort: degenerato). No margine
  per leggere il delta.
- `caverna_02`: 100% entrambe le arm (il flip di Config A non si riproduce).

## Sintesi

1. **Il floor funziona** (fire-check, 10/10, due config). Plumbing + helper +
   flag end-to-end OK.
2. **Sul win-rate il floor e' approssimativamente neutro nell'AI-sim** (delta
   per-classe dentro il noise floor). Non spinge gli esiti OOB-catastrofici ->
   flip a basso rischio sull'asse balance.
3. **Il sim SOTTO-esercita il floor.** La policy greedy aggressiva supera la
   pressione aggiunta su elimination; survival e' banale; l'effetto si concentra
   su rinforzi + hold-difensivo lungo. L'effetto "early-harder" voluto dal TKT
   (front-load pressione, feel human) e' poco osservabile dal sim.
4. **Le bande canoniche `damage_curves` NON sono direttamente verificabili con
   questo probe** (roster/policy/harness diversi dal setup che le ha calibrate:
   `batch_calibrate` smart-channel + turn_limit + scenario tutorial_06). Il
   segnale ratificabile e' il DELTA paired + il fire-check, non il match
   assoluto di banda (per questo i verdict in tabella sono prevalentemente RED
   e vanno letti col caveat di saturazione/roster).
5. **Una fragilita' non-robusta** (caverna_02, solo Config A): un hold senza
   `time_limit` puo' degenerare in attrito sotto il floor. Authoring note su
   caverna_02, non un difetto del valore floor 2.

## Raccomandazione (gated master-dd -- design-call)

L'evidenza N=40 supporta il **flip-ON come opzione a basso rischio**, ma NON
puo' ratificare la magnitudine dei floor verso il target human. Due path:

- **Opzione A (raccomandata): FLIP-ON ora.** Motivi: (a) meccanismo verificato
  end-to-end; (b) balance-safe nel N=40 AI-sim (delta WR dentro noise, nessun
  cratering OOB); (c) back-compat byte-identica con flag OFF (no regression M1);
  (d) parita' cross-stack -- Godot ha gia' shippato il floor (PR #221), il flip
  chiude il gap. La magnitudine dei floor resta "conservativa + safe" (non
  prova-di-ottimale): rivisitare verso il target "hardcore 40-60%" DOPO il
  playtest Godot #2, che e' il punto di misura giusto (l'AI-sim satura sopra
  quella banda).
- **Opzione B: HOLD il flip** finche' il playtest Godot #2 (human) non valida la
  magnitudine. Costa parita' cross-stack ma evita di attivare valori non
  human-validati. Nessun rischio balance dimostrato che lo giustifichi
  nell'AI-sim.

Su entrambe le opzioni: **NON c'e' evidenza per ri-tarare i floor verso il
BASSO** (nessun OOB-hard robusto; l'unico flip -- caverna_02 -- non si riproduce
ed e' confondibile con l'authoring no-time-limit). Se mai, il sim suggerisce che
i floor sono CONSERVATIVI (mordono poco col party-sim), quindi un eventuale
tuning sarebbe verso l'ALTO -- ma quel tuning va gated sul playtest human, non
sull'AI-sim.

Azione separata suggerita (non bloccante): aggiungere `loss_conditions.time_limit`
a `enc_caverna_02` (allineamento con `enc_capture_01`) per evitare l'hold
infinito, indipendentemente dal flip.

## Limiti (onesti)

- Roster probe != roster di calibrazione delle bande canoniche -> match assoluto
  di banda non significativo (segnale = delta paired).
- `scenario-enemies` stage solo la WAVE-1 (le wave successive authored non sono
  messe in campo) -> il sim sottostima la pressione totale degli encounter
  multi-wave.
- Il floor de-sat (Config B, `{countAdd:3,modAdd:3}` + roster weak) e' un
  measurement-point arbitrario (L-069), scelto per de-saturare elimination; non
  de-satura uniformemente tutti gli obiettivi (survival resta facile, capture
  floored).
- TKT-SIM-PROBE-ENTROPY (2026-06-11): esiste entropia process-level non-seedata;
  qui il noise floor (off2-off) e' riportato e i delta sono letti contro di esso.

## Riproduzione

```
# Config A (authored / strong roster):
OUT=reports/sim/a2-pressure-n40-2026-06-16
for enc in enc_tutorial_01 enc_tutorial_02 enc_savana_01 enc_caverna_02 \
  enc_capture_01 enc_escort_01 enc_survival_01 enc_savana_skiv_solo_vs_pack \
  enc_hardcore_reinf_01 enc_frattura_03; do
  for arm in off off2 on; do
    node tools/sim/pressure-floor-probe.js --scenario $enc --arm $arm \
      --runs 40 --seed-base 60000 --out $OUT
  done
done
node tools/sim/pressure-floor-probe.js --aggregate --out $OUT

# Config B (de-saturated / weak roster + overlay): add
#   --roster weak --scaling '{"countAdd":3,"modAdd":3}' --seed-base 70000
#   --out reports/sim/a2-pressure-n40-desat-2026-06-16
# (pass the same --roster/--scaling to the --aggregate call too).
```

## Riferimenti

- Spec A2: `docs/design/2026-06-16-pressure-tier-floor-backend-mirror.md`.
- Implementazione: PR #2773 (`apps/backend/routes/sessionHelpers.js`
  `effectivePressure`/`computeSistemaTier`, `services/ai/aiProgressMeter.js`,
  `services/ai/declareSistemaIntents.js`, `services/combat/reinforcementSpawner.js`,
  plumbing `session.js:2099`).
- Test: `tests/ai/pressureTierFloor.test.js`.
- Probe: `tools/sim/pressure-floor-probe.js`.
- Bande: `data/core/balance/damage_curves.yaml`.
- Godot canonical: `Game-Godot-v2/docs/godot-v2/design/tkt-pressure-tier-encounter.md` (PR #221).
- Pattern N=40 ratify-grade: `docs/reports/2026-06-11-spec-i-er6-overrun-n40-evidence.md`.
