---
title: 'ADR 2026-04-17 — Utility AI: Default Activation Decision'
doc_status: active
doc_owner: governance
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# ADR-2026-04-17 · Utility AI Default Activation

**Stato**: 🟢 ACCEPTED — Master DD 2026-04-17 (Q-001 T3.1) · Opzione C gradual rollout
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: G1.2 audit gap implementativo 2026-04-17
**Supersede (parziale)**: [ADR-2026-04-16 AI Utility Architecture](./ADR-2026-04-16-ai-architecture-utility.md) nella sola clausola "integrazione sprint futuro"

## Contesto

ADR-2026-04-16 ha formalizzato **Utility AI** come scelta architetturale per AI SIS. L'implementazione è presente:

- `apps/backend/services/ai/utilityBrain.js` — 310 LOC, 7 considerations, 6 curve, 3 difficulty profiles
- `apps/backend/services/ai/declareSistemaIntents.js:69` — flag `useUtilityAi = false` (default)
- `apps/backend/services/ai/declareSistemaIntents.js:142-144` — switch dispatcher
- `tests/ai/utilityBrain.test.js` — 14 test unit

**Stato attuale**: wired ma **opt-in**. Round orchestrator default → `selectAiPolicy` (legacy rules REGOLA_001-004). Zero encounter di produzione usa Utility AI.

**Problema**: ADR-2026-04-16 dichiara Utility AI come architettura ufficiale, ma il default-off rende lo statement ambiguo. Due interpretazioni possibili:

- **Interpretazione A**: "Utility AI è ready, attivarla è no-op" → flip default
- **Interpretazione B**: "Utility AI è prototype per valutazione, legacy rules restano production" → opt-in rimane

## Decisione proposta

**3 opzioni per Master DD:**

### Opzione A — Flip default ON

- Cambio `useUtilityAi = true` in `declareSistemaIntents.js:69`
- Nessun cambio tests esistenti (utilityBrain.test.js copre casi d'uso)
- Aggiungere smoke test end-to-end: session con Sistema che usa Utility AI
- **Pro**: allinea docs con codice, sblocca ADR-2026-04-16 status "Proposto" → "Accettato"
- **Contro**: tocca guardrail Pilastro 5 (Co-op vs Sistema). Behavioural change nei test di integrazione possibile

### Opzione B — Mantieni opt-in, documenta esplicitamente

- `useUtilityAi = false` resta
- Aggiornare ADR-2026-04-16 → status "Proposto — opt-in in valutazione"
- Documentare in `docs/architecture/ai-policy-engine.md` come attivare Utility AI per test
- **Pro**: zero rischio regression, preserva pilastro 5
- **Contro**: debt: ADR formalmente accettato ma non "live"

### Opzione C — Feature flag data-driven

- Nuova property in `data/core/ai_profiles.yaml`: `use_utility_brain: boolean` per profile (aggressive/balanced/cautious/patrol/flanking/support/territorial)
- Rimuove flag JS hardcoded, sposta decisione in dataset (auditabile, reversible)
- Default: un profile a true (es. aggressive) per smoke testing graduale, altri false
- **Pro**: gradual rollout, zero breaking change, balance team può A/B testare
- **Contro**: +1 campo YAML in 7 profile, aggiornamento 7 docs test cases

**Raccomandazione**: **Opzione C** — gradual rollout data-driven. Preserva pilastro 5, chiude gap doc-code, permette rollback immediato via YAML.

## Validazione richiesta

- `node --test tests/ai/*.test.js` → baseline pre-change (oggi: 115/115 pass)
- `node --test tests/ai/*.test.js` → post-change (target: 115/115 pass + nuovi smoke se Opzione A)
- Round model test su encounter reale (`enc_tutorial_01`, `enc_caverna_02`) → verificare AI non degrada
- VC scoring invariante: Sistema non deve "barare" (pillar 6 fairness)

## Piano esecuzione (Opzione C)

1. Aggiungere campo `use_utility_brain: false` a tutti 7 profile in `data/core/ai_profiles.yaml`
2. Modificare `declareSistemaIntents.js` per leggere flag da profile invece di param hardcoded
3. Flip 1 profile → `aggressive.use_utility_brain: true`
4. Run test suite → verificare no regression
5. Aggiornare ADR-2026-04-16 status → "Accettato (gradual rollout)"
6. PR separata per flip dei restanti 6 profile dopo playtest batch N=10

## Decisione Master DD (2026-04-17) — Q-001 T3.1

- Opzione scelta: **C** (feature flag data-driven in `ai_profiles.yaml` per profile, gradual rollout)
- Primo profile flip: **aggressive** (comportamento più osservabile per validation)
- Criterio rollout batch successivo: **metriche VC** (fairness invariante Pilastro 6 = gate)

### Piano esecuzione approvato

Branch feature dedicato: `feat/utility-ai-flip` (touches `services/ai/` guardrail → approval richiesta via questo ADR).

Sequenza:

1. Aggiungere campo `use_utility_brain: boolean` a tutti 7 profile in `data/core/ai_profiles.yaml` (default `false`)
2. Modificare `declareSistemaIntents.js:69-143` per leggere flag da profile invece di param hardcoded
3. Flip `aggressive.use_utility_brain: true`
4. Run test suite → baseline `node --test tests/ai/*.test.js` (141/141 attuale) + smoke VC fairness
5. Criterio rollout batch 2: se VC fairness metrics invariati su N=20 partite → flip prossimo profile
6. Ordine profile suggerito: aggressive → flanking → patrol → support → territorial → balanced → cautious

### Alternative parcheggiate

- **GOAP**: già rifiutato in ADR-2026-04-16
- **Behavior Tree**: già rifiutato in ADR-2026-04-16
- **Hybrid Yuka**: documentato come backup, non target
