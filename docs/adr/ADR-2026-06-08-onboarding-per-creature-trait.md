---
title: 'ADR 2026-06-08 -- Onboarding: trait per-creatura + branco emergente (supersede 51-ONBOARDING-60S, MA1)'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/core/51-ONBOARDING-60S.md'
  - 'docs/design/evo-tactics-onboarding-identity-flow.md'
  - 'apps/backend/routes/campaign.js'
  - 'apps/backend/services/coop/coopOrchestrator.js'
  - 'data/core/campaign/default_campaign_mvp.yaml'
---

# ADR-2026-06-08 -- Onboarding: trait per-creatura + branco emergente (supersede 51-ONBOARDING-60S)

**Stato**: ACCEPTED (Eduardo 2026-06-08, fork MA1 di SPEC-M onboarding-identity-flow).

**Trigger**: MA1 (modello onboarding per-player) ratificato = ibrido (opzione C): trait
personale per-creatura + trait-branco emergente dall'aggregato. La parte per-creatura SUPERA
il canon A3 `51-ONBOARDING-60S` (1 trait condiviso di branco, `source_of_truth:true`); MA1
richiede esplicitamente questo ADR come prerequisito non-negoziabile PRIMA dell'implementazione
(un doc `review_needed` non puo' sovrascrivere silenziosamente un A3 `source_of_truth:true`).

## Contesto

- **Canon A3 `51-ONBOARDING-60S`** (`source_of_truth:true`): prima di Act 0, il branco compie
  1 scelta identitaria in 60s -> 1 trait pre-assegnato a TUTTO il branco. Timing (budget 60s,
  briefing 10s, deliberazione 30s, auto-select A) = canon.
- **Device-authority (ADR-2026-06-07)** + **per-player onboarding (#2638, `coopOrchestrator`)**:
  ogni device ha una scelta. MA1 chiede: a CHI si applica il trait scelto?
- **Data-model attuale**: `POST /api/campaign/start` applica UN solo `acquiredTraits=[traitId]`
  condiviso (`campaign.js`:176) + `campaign.onboardingChoice` singolo.

## Decisione

1. **Modello**: ibrido (MA1 opzione C). Ogni player sceglie il trait identitario della PROPRIA
   creatura (per-creatura, party eterogeneo) + un trait-branco EMERGENTE dall'aggregato delle
   scelte (Form Pulse). Le due componenti sono distinte e bilanciate separatamente.
2. **Supersede di `51-ONBOARDING-60S`**: il principio "1 trait condiviso di branco" e'
   sostituito da "1 trait per-creatura + 1 trait-branco emergente". RESTANO canon (invariati):
   budget 60s, briefing 10s, deliberazione 30s, auto-select A, no-regole-in-minute-0, 3 opzioni
   A/B/C. Cambia SOLO la semantica "a chi si applica il trait".
3. **Data-model**: `acquiredTraits` (singolo condiviso) -> struttura per-creatura (mappa
   `{ unitId|playerId: traitId }`) + il trait-branco emergente separato. Migrazione
   backward-compatible (il single-trait legacy = caso degenere 1-trait/branco).

## Conseguenze

- **Follow-up GATED (Eduardo)**: l'edit effettivo di `51-ONBOARDING-60S` (A3 SoT) per
  riflettere il modello per-creatura NON e' in questo ADR. L'ADR REGISTRA la decisione (il gate
  richiesto da MA1); l'edit dell'A3 SoT resta owner-gated.
- **Impl GATED**: la modifica data-model campaign (`campaign.js` + `default_campaign_mvp.yaml`
  - `tests/api/campaignRoutes.test.js`) + il wiring per-creatura (il `coopOrchestrator` e' gia'
    per-player #2638) = follow-up implementativi separati.
- **Canon-compatibile** la parte "trait-branco emergente" (aggregato, gia' previsto dal Form
  Pulse / bias Custode ADR-2026-06-07 punto 4); SOLO la parte "per-creatura" supera l'A3.
- **MA1 sbloccato**: con questo ADR ACCEPTED, l'acceptance #2 di SPEC-M e' soddisfatta per la
  parte governance (supersede + data-model approvati); restano i follow-up implementativi.

## Alternative scartate

- **MA1 opzione B (per-player vote -> 1 trait branco)**: canon-compatibile (nessun ADR), ma
  Eduardo ha scelto l'ibrido (per-creatura) per piena device-authority + diversita' di party.
- **Status quo (branco-shared)**: incompatibile con la device-authority per-player ratificata.
