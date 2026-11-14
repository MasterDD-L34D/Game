---
title: 'Runbook serata playtest owner -- K-07 + IMPRINT_BEAT + re-tune N5/N7/N8'
date: 2026-07-02
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-07-02'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [playtest, runbook, spec-k, k07, imprint, pressure-floor, interoception, dr2, owner-gated]
---

# Runbook serata playtest owner (2026-07-02)

> Checklist unica per il batch owner-gated a mani-fisiche: K-07 real-device smoke,
> IMPRINT_BEAT flip check, re-tune N5/N7/N8. Preparato dalla sessione closeout;
> fonti citate per riga. Ordine consigliato in fondo.

## 0. Guardrail comuni

- Prod 3334/3341 always-on: NON killare; test locali su `PORT=3400
LOBBY_WS_ENABLED=false` (lesson prod-host-ports). K-07 usa invece shared mode
  3334 via deploy-quick: e' l'eccezione prevista dal piano.
- Flag flip = keys.env canonico (`~/.config/api-keys/keys.env`, righe
  `export VAR=...`) + restart backend (`Start-ScheduledTask EvoTacticsBackend`);
  inerte fino a restart. MAI node nudo (perde flag+DB, incidente 2026-07-02).

## 1. K-07 real-device smoke (SPEC-K, 6/7 -> 7/7)

Piano SoT: `Game-Godot-v2/docs/godot-v2/qa/k07-real-device-smoke-plan-2026-06-06.md`;
stato BACKLOG (AI smoke 8/8 PASS #2890, real-device PENDING = criterio sez.9.9 di
`docs/design/evo-tactics-godot-device-authority-reconciliation.md`).

- **Device**: 2 telefoni (browser -> `/phone/`) + 1 TV/desktop browser (`/`).
- **Setup**: `cd C:/dev/Game-Godot-v2 && ./tools/deploy/deploy-quick.sh` -> builda
  phone+TV web, backend Game shared mode :3334, Cloudflare Quick Tunnel, stampa URL.
- **Flag per lo smoke**: `WORLD_CONFIRM_QUORUM_ENABLED=true` (il flip K-02 e' gated
  proprio su questo playtest; l'AI smoke girava flag-ON su :3400).
- **Checklist**:
  - [ ] join room 2 phone + TV
  - [ ] WS auth/resume (F5 telefono)
  - [ ] phase transitions visibili
  - [ ] route vote con 2 telefoni
  - [ ] world-confirm: host propone -> 2 voti device -> auto-confirm + broadcast
        `world_proposed`/`world_confirm_accepted`
  - [ ] Nido entry
  - [ ] recruit visibile nel roster (K-04 button GGv2 #481)
  - [ ] mating/offspring phone ritual
  - [ ] TV = zero input gameplay in co-op
- **Post**: verde -> K-07 DONE (SPEC-K 7/7) + flip `WORLD_CONFIRM_QUORUM_ENABLED`
  in prod keys.env (verdetto tuo).

## 2. IMPRINT_BEAT flip check (aa01 D2)

Gate: flip gated ONLY on co-op playtest + master-dd
(`docs/planning/2026-06-22-aa01-deferred-tracker.md` + register).

- **Flag**: `IMPRINT_BEAT_ENABLED=true` (default OFF; gate in
  `apps/backend/services/imprint/imprintBiomeWeights.js` + open-path in
  `coopOrchestrator.js` / `routes/coop.js`). NB `IMPRINT_TRAIT_GRANT_ENABLED` e'
  AND-gated ma vive nel bundle FORM_PULSE_TRAIT_V2 (gia' LIVE) -- non e' parte del
  check D2.
- **Checklist** (superfici D1 gia' DONE, GGv2 #531/#535):
  - [ ] il beat imprint SI APRE nel flow co-op (flag OFF = non si apre mai)
  - [ ] scelta imprint sul phone -> lean bioma prodotto (`imprintBiomeWeights`)
  - [ ] hint cosmetico visibile
  - [ ] nessuno stall all'advance post-beat
- **Post**: feel OK -> flip prod (keys.env + restart).

## 3. N5 -- A2 pressure-floor re-tune (upward-only)

A2 gia' LIVE (`PRESSURE_TIER_FLOOR_ENABLED=true`, magnitude RATIFIED-PROVISIONAL).

- **Osservare**: encounter che partono troppo calmi (tier percepito sotto il rating).
- **Knob**: `pressure_tier_floor` per-encounter nei YAML encounter (10 file). Solo
  verso l'ALTO; constraint hard intero [0,5] e `<= difficulty_rating`
  (`tools/js/validate_encounter_difficulty.js`, CI-wired).

## 4. N7 -- interoception re-tune (opzionale)

Flip gia' LIVE dal 06-22 (OD-024).

- **Osservare**: completion-rate missione (target ~0.6; oggi enemy-scaling troppo
  duro?); feel nocicezione (Ferito = azioni ritardate) + stamina sprint (-1 AP round
  successivo).
- **Knob**: `TIER_INTEROCEPTION_MAP` in
  `apps/backend/services/sentience/sentienceInteroceptionGrant.js` (ammorbidire il
  lato enemy = ridurre i grant ai tier sistema, D3 #2945).

## 5. N8 -- radici DR2=2 ratify

Valore RATIFIED-PROVISIONAL 2026-06-29: la banda held-DR non e' misurabile dalla
greedy-AI (mai ferma) -> serve player umano hold-capable.

- **Osservare**: carrier `radici_ancora_planare` fermo = status `ancorato` con DR2;
  un move rompe l'ancora. Carrier live = `ferrocolonia-magnetotattica` nel pilot
  badlands. Domanda: DR2 da fermo = nemico interessante-ma-battibile o degenera
  (turtling/irrilevante)?
- **Knob**: `const ANCHOR_DR = 2;` in `apps/backend/services/combat/anchorState.js`.
  Cambio = re-ratify (+ eventuale re-cal pilot badlands).

## Ordine consigliato

K-07 (setup tunnel una volta, e' il lungo) -> stesso ambiente co-op: accendi
IMPRINT_BEAT e fai il check D2 -> durante le missioni annota N5 (pressure feel) +
N7 (completion/fatica) -> encounter badlands dedicato per N8. Chiusura serata:
verdetti flip (WORLD_CONFIRM_QUORUM / IMPRINT_BEAT) + eventuali knob edit come PR.
