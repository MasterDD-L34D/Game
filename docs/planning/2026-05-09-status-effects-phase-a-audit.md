---
title: 'Status Effects v2 Phase A — Audit 2026-05-09'
date: 2026-05-09
doc_status: active
doc_owner: claude-code
workstream: combat
last_verified: '2026-05-09'
source_of_truth: false
language: it
review_cycle_days: 14
---

# Status Effects v2 Phase A — Audit 2026-05-09

> Sessione autonoma 2026-05-09. Obiettivo iniziale: implementare 5 stati Tier 1
> come 5 mini-PR sequenziali. Audit Phase 1 ha rilevato che il runtime è già
> **completo su main** (implementato tra 2026-04-25 e 2026-04-27, handoff
> `docs/planning/2026-04-27-status-effects-phase-a-handoff.md`).
> Questa sessione si focalizza sui **gap residui**.

## 1. Stato runtime su main (2026-05-09)

### 1.1 Consumer hooks — TUTTI presenti

| Stato       | File                          | Linea(e) | Effetto                          |
| ----------- | ----------------------------- | --------- | -------------------------------- |
| `slowed`    | `sessionHelpers.js`           | 698       | `applyApRefill`: -1 AP (min 1)  |
| `marked`    | `session.js`                  | 597–600   | +1 dmg next hit, mark consumato |
| `burning`   | `session.js`                  | 1217+     | DoT 2 PT/turno (3 path)         |
| `chilled`   | `session.js` + helpers        | 513–517 + 697 | -1 atk pre/revert + -1 AP   |
| `disoriented`| `session.js`                 | 518–522   | -2 atk pre/revert (1T)          |

### 1.2 STATUS_DURATION_CAPS — TUTTI presenti

`session.js:101–113`:
```javascript
slowed: 3, marked: 2, burning: 3, chilled: 2, disoriented: 1
```

### 1.3 Trait produttori (active_effects.yaml) — TUTTI presenti

| Trait               | Stato        | Linea YAML | Trigger            |
| ------------------- | ------------ | ---------- | ------------------ |
| `tela_appiccicosa`  | `slowed`     | ~9451      | hit any range      |
| `marchio_predatorio`| `marked`     | ~9471      | hit any range      |
| `respiro_acido`     | `burning`    | ~9430      | hit any range      |
| `aura_glaciale`     | `chilled`    | ~9386      | hit any range      |
| `sussurro_psichico` | `disoriented`| ~9408      | hit + min_mos 5    |

### 1.4 Test coverage — 42/42 PASS

| File                          | Tests |
| ----------------------------- | ----: |
| `statusEffectsSlowed.test.js` | 3     |
| `statusEffectsMarked.test.js` | 3     |
| `statusEffectsBurning.test.js`| 8     |
| `statusEffectsPhaseA.test.js` | 28    |
| **Totale**                    | **42**|

Baseline AI test totale: 220 pass / 10 fail (fail = infrastruttura: js-yaml +
supertest mancanti — pre-esistenti, non regressioni Phase A).

## 2. Gap residui (da April 27 handoff Priority 1+2+3)

### 2.1 Priority 3 — Glossary sync ⚠️ MANCANTE

I 5 trait produttori **non sono in `data/core/traits/glossary.json`** (grep 0 match).
Necessario per: trait-lint CI check, UI tooltip, catalog readiness.

Traits da aggiungere: `aura_glaciale`, `tela_appiccicosa`, `marchio_predatorio`,
`respiro_acido`, `sussurro_psichico`.

**Effort stimato**: ~20 min. **Rischio**: zero (additive).

### 2.2 Priority 1 — policy.js AI consumption ⚠️ MANCANTE

`declareSistemaIntents.js` e `policy.js` **non leggono** i 5 nuovi stati per
decisioni AI. Comportamento AI identico a unità sane.

Opportunità:
- `slowed` target → AI lo preferisce (mobilità ridotta, facile da raggiungere)
- `disoriented` target → AI lo attacca (probabilità hit aumentata per 1T)
- `marked` target → AI coordina attacchi su di esso per consumare il bonus
- `burning` attore → AI considera che DoT fa il lavoro, risparmia AP su altri
- `chilled` target → AI lo considera target soft (AP e atk ridotti)

**Effort stimato**: ~1-2h. **Rischio**: basso (additive in `checkEmotionalOverrides`
extension o `targetSelectionScore` weight — non tocca resolver, non tocca schema).

### 2.3 Priority 2 — Gate 5 HUD surface ⚠️ MANCANTE (out of scope sessione)

Nessuno dei 5 stati ha surface player-visible. Gate 5 violation.
- Status icon sprite/emoji sotto unit (Godot v2) o HUD overlay (web)
- Log entry panel quando applicato
- Tooltip turns rimanenti

**Scope**: frontend Godot v2 — fuori scope sessione backend Node. Deferred.

## 3. Pipeline completa verificata

```
trait YAML (active_effects.yaml, SPRINT_020)
  → evaluateStatusTraits (traitEffects.js:376)
  → status_applies[]
  → performAttack session.js:877 → unit.status[stato] = min(cap, max(current, turns))
  → Consumer effect:
      slowed/chilled → applyApRefill (sessionHelpers.js:698)
      marked → performAttack pre-damage (session.js:597)
      burning → end-of-round DoT (session.js:1217, roundBridge)
      chilled/disoriented → pre/revert attack mod (session.js:513-522)
  → Decay: handleTurnEnd status countdown (session.js:1254)
```

## 4. Priorità sessione 2026-05-09

| PR  | Scope                       | Effort   | Rischio |
| --- | --------------------------- | -------- | ------- |
| A   | Glossary sync (5 trait)     | ~20 min  | Zero    |
| B   | policy.js AI slowed/disoriented/marked | ~1-2h | Basso |

HUD surface → deferred sprint successivo (Gate 5 debt backlog).
