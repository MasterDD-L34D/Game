---
title: 'ADR 2026-04-21b — Onboarding narrativo 60s (3 scelte identitarie pre-Act 0)'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-21'
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/core/51-ONBOARDING-60S.md
  - docs/adr/ADR-2026-04-21-campaign-save-persistence.md
  - data/core/campaign/default_campaign_mvp.yaml
  - docs/planning/2026-04-21-triage-exploration-notes.md
---

# ADR-2026-04-21b · Onboarding narrativo 60s

**Stato**: 🟢 ACCEPTED (user direction + Prompt 3 triage approval)
**Chiude**: L05 P0 narrative arc framework (audit 4-agent 2026-04-20)
**Trigger**: exploration-note deck v2 Nota 3 + user Prompt 3 choice (a) issue P0 design doc

## Contesto

Pre-Act 0 (enc_tutorial_01) non c'è nessun beat narrativo. Player apre gioco e entra direttamente in match. Zero identità espressa, zero promessa narrativa.

Audit 4-agent consolidated (2026-04-20) classifica "Narrative arc framework" come **P0 blocking**. Agent 1 structural gap #2. Prompt 3 triage exploration-note (2026-04-21) rileva "Onboarding narrativo 60s" come proposta più matura tra le 3 note deck v2:

- **BiomeMemory** → parcheggiata (scope creep ALTO)
- **Costo ambientale trait** → pilot 4×3 (P0 pilot)
- **Onboarding 60s** → **questa ADR** (P0 design)

## Decisione

**Shippa onboarding 60s canonical come spec design A3** (doc + YAML extension + ADR). **NON implementazione frontend in questo PR** — deferred M11+ post-Jackbox.

### Spec canonical (da `docs/core/51-ONBOARDING-60S.md`)

1. **Timing hard cap 60 secondi**. Briefing 10s + deliberation 30s + transition 10s + 10s buffer.
2. **Esattamente 3 scelte identitarie** (Descent pattern parallelism con ADR-04-21 branching):
   - Opzione A: zampe_a_molla (mobilità)
   - Opzione B: pelle_elastomera (defense)
   - Opzione C: denti_seghettati (bleeding)
3. **Trait applicato a TUTTO il branch** (identità condivisa, non singolo PG)
4. **Permanent per campagna** (no respec MVP)
5. **Auto-select opzione A** on timeout deliberation (tutorial gentle default)

### YAML schema

Esteso `data/core/campaign/default_campaign_mvp.yaml` con `onboarding:` root section. Schema version 1.0.

## Conseguenze

### Positive

- **Chiude L05 P0** audit gap (P2 di 5 P0 blocking M9 closure — o 80% P0 closed now cumulative)
- **Zero complessità backend**: reuse `/api/campaign/start` con nuovo field `initial_trait_choice`
- **Zero nuovo content**: 3 trait già esistenti in `data/core/traits/active_effects.yaml`
- **Paralleli branching pattern** ADR-04-21 campaign (Descent 1-2 choice per atto) = design consistency
- **Kill-60 Flint compliance**: spec + YAML + ADR, zero impl code M10-scope

### Negative

- **Spec sola**: player demo vedranno Phase B solo M11+ (frontend picker UI)
- **No voice-over / animation**: 3 card + audio line 10s = minimalist. Potrebbe sentirsi "povero" vs Vertical Slice HTML reference.
- **Permanent trait**: se player regrets choice, no respec. Solo replay campagna.

### Rollback

- Delete `docs/core/51-ONBOARDING-60S.md`
- Rimuovi `onboarding:` section da `default_campaign_mvp.yaml`
- Revert ADR → DEPRECATED.
- Campaign default: `next_encounter = enc_tutorial_01` direct (stato pre-onboarding).

## Scope creep guards

1. **NON** lore extra oltre 3 narrative lines per choice
2. **NON** tutorial interattivo in 60s (Freeze §6: tutorial ≤10min ≠ 60s onboarding)
3. **NON** DAG branching — 3 choice flat, output = 1 trait pre-slot
4. **NON** respec M11+ senza ADR dedicata
5. **NON** animation elaborate — 3 card statiche basta MVP

## Implementation phase tracking

- **Phase A** (questo PR, ~4-8h): doc + YAML + ADR. Shippable oggi.
- **Phase B** (M11+, ~6-10h): `apps/play/src/onboardingPanel.js` + backend `/api/campaign/start` accept `initial_trait_choice`. Frontend choice picker.
- **Phase C** (post-Jackbox, ~2h): co-op sync — host fa choice vincolante per roster multi-player. Deferred M12+.

## Criteri successo

Post-Phase B playtest (M11+):

- ≥80% player completano onboarding in ≤60s (auto-select <20%)
- ≥60% player ricordano choice al debrief finale (intervista Master DM)
- ≤1/3 player confusi da regole in chapter 1 primi 3 turn

Se criteri falliti: re-design pre-flight, non ship degradato.

## Autori

- Master DD (direction 2026-04-21 via P0 Q batch + Prompt 3 choice a)
- Claude Opus 4.7 (ADR + doc 51 + YAML extend)
- Concept exploration deck v2 §Nota 3 (trigger inspiration)
- Flint advisor (kill-60 "Phase A doc only, impl deferred")

## Riferimenti

- `docs/core/51-ONBOARDING-60S.md` — canonical full spec
- `docs/adr/ADR-2026-04-21-campaign-save-persistence.md` — campaign branching parent
- `docs/planning/2026-04-20-design-audit-consolidated.md` §1 gap #2 narrative arc
- `docs/planning/2026-04-21-triage-exploration-notes.md` §Issue Draft 3
- GitHub issue #1675 — closed by this PR
