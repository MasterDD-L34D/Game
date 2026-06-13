---
title: Vertical Slice Playtest Plan
doc_status: active
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Vertical Slice Playtest Plan

Pattern origine: Fallout Tactics postmortem (Micro Forte, 2001) — la focus group session sulla demo Christmas 2000 catturò problemi combat critici **3 mesi prima dello ship**. Il postmortem chiama questo "major save". Replicato qui come milestone formale.

Riferimento: [`memory/reference_tactical_postmortems.md` §B.4](../../memory/reference_tactical_postmortems.md).

## Obiettivo

Eseguire un **playtest end-to-end della slice verticale** prima di qualsiasi feature freeze o design lock. Obiettivo = intercettare regressioni di leggibilità, bilanciamento e AI in un contesto realistico — non in CI, non in unit test.

## Scope

La slice verticale minima include **3 encounter canonici** già presenti:

1. [`docs/planning/encounters/enc_tutorial_01.yaml`](../planning/encounters/enc_tutorial_01.yaml) — 2v2 savana, difficulty 1/5, didactic focus: movement + MoS
2. [`docs/planning/encounters/enc_tutorial_02.yaml`](../planning/encounters/enc_tutorial_02.yaml) — 2v3 asimmetrico, difficulty 2/5, introduce cacciatore corazzato
3. [`docs/planning/encounters/enc_caverna_02.yaml`](../planning/encounters/enc_caverna_02.yaml) OR [`enc_tutorial_03.yaml`](../planning/encounters/enc_tutorial_03.yaml) quando disponibile — difficulty 3/5, introduce hazard tiles

Rationale: coprono curva difficoltà graduale (1→3), 3 biomi distinti, meccaniche introdotte one-at-a-time.

## Pre-requisiti

- [ ] Mission Console bundle aggiornato (`docs/mission-console/`)
- [ ] Backend stabile su main, last commit verde in CI
- [ ] `sistema_pressure` default Calm (0) — reset stato AI
- [ ] 3 encounter YAML validati da `tests/scripts/encounterSchema.test.js`
- [ ] Round model ON (ADR-2026-04-16, default)
- [ ] Logging session abilitato (`logs/session_*.json`)

## Protocollo sessione

Per ogni encounter:

1. **Start**: `POST /api/session/start` con units da encounter.
2. **Play**: 2+ giocatori umani, no Mission Control AI assist. Target: completare encounter entro `estimated_turns * 1.5` round.
3. **Record**: log events serializzati in `logs/session_YYYYMMDD_HHMMSS.json`.
4. **Debrief post-sessione**: 5 minuti di feedback verbale + note in `docs/playtest/SESSION-YYYY-MM-DD.md` (usare `SESSION-template.md`).
5. **VC snapshot**: `GET /api/session/:id/vc` per estrarre indici MBTI/Ennea.

Esegui i 3 encounter back-to-back nella stessa sessione (~45 minuti totali).

## Pass criteria

Una sessione vertical slice **passa** se:

| Criterio                              | Soglia                                           |
| ------------------------------------- | ------------------------------------------------ |
| Encounter 1 completato                | ≤ 9 round (estimated 6 × 1.5)                    |
| Encounter 2 completato                | ≤ 12 round                                       |
| Encounter 3 completato                | ≤ 15 round                                       |
| Hit rate player                       | 40–70% (rispecchia `predict_combat.py` output)   |
| SIS intents/round                     | match `intentsCapForPressure(pressure)` expected |
| Zero crashes                          | backend non lancia 500                           |
| VC snapshot popolato                  | almeno 4/6 indici EMA con dati validi            |
| Nessun focus_fire combo "impossibile" | `last_round_combos` consistente                  |

Sessione **fallisce** se: crash backend, UI bloccata >5s, AI stuck in loop infinito, formula d20 produce output fuori range.

## Protocollo di confronto (regression)

Dopo ogni change significativo a `services/rules/`, `apps/backend/services/ai/`, o `packs/evo_tactics_pack/data/balance/`:

1. Rerun completa la slice.
2. Diff VC snapshot vs baseline precedente (archiviata in `docs/playtest/SESSION-*`).
3. Flag anomalie >15% drift come regression candidate.

## Cadenza

- **Monthly** durante sprint development
- **Weekly** nelle 4 settimane pre-freeze
- **Pre-PR** per cambi che toccano formule combat o AI policy

## Deliverable

Ogni playtest produce:

- File `docs/playtest/SESSION-YYYY-MM-DD.md` (usa template)
- Log sessione JSON archiviato in `logs/`
- VC snapshot JSON allegato
- Lista bug/regression aperti (ticket github)

## Antecedenti

- Halfway (Robotality) postmortem — indie tattici a turni: leggibilità griglia richiede test continuo con gamer non-dev.
- AI War 4yr postmortem (Park) — "ongoing playtesting, non pre-launch burst" → cadenza mensile stretch goal.

## Non-scope

- Sostituto di unit test: vertical slice **integra**, non rimpiazza, `tests/ai/*.test.js`.
- Localization testing: fuori scope (rimandato post balance-freeze per "Localization Gate", vedi `docs/process/`).
- Long-form campaign: slice verticale copre 45min max, non full campaign.

## Riferimenti

- Pattern origine: `memory/reference_tactical_postmortems.md` §B.4
- Template sessione: [`SESSION-template.md`](SESSION-template.md)
- Schema encounter: [`schemas/evo/encounter.schema.json`](../../schemas/evo/encounter.schema.json)
- VC scoring: [`apps/backend/services/vcScoring.js`](../../apps/backend/services/vcScoring.js)
- Invarianti combat: [`docs/hubs/combat.md`](../hubs/combat.md) §Invarianti di design combat
