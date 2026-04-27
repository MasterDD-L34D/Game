---
title: 'Status Effects v2 Phase A — handoff (5 stati Tier 1 completi)'
date: 2026-04-27
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
---

# Status Effects v2 Phase A — handoff

## Goal raggiunto

5 stati Tier 1 implementati come 5 mini-PR sequenziali indipendenti.
Pipeline completa: trait YAML → evaluateStatusTraits → apply → runtime effect → test.

## PR consegnati

| PR    | Branch                  | Stato | Trait                | Effetto                   | CI    |
| ----- | ----------------------- | ----- | -------------------- | ------------------------- | ----- |
| #1947 | feat/status-slowed      | draft | `tela_appiccicosa`   | -1 AP reset/T             | verde |
| #1948 | feat/status-marked      | draft | `marchio_predatorio` | +1 dmg next hit (consume) | verde |
| #1950 | feat/status-burning     | draft | `respiro_acido`      | DoT 2 PT/T                | verde |
| #1951 | feat/status-chilled     | draft | `aura_glaciale`      | -1 AP reset + -1 atk/T    | verde |
| #1953 | feat/status-disoriented | draft | `sussurro_psichico`  | -2 atk/T (1T cap)         | verde |

## Architettura implementata

### Apply path (uguale per tutti)

```
trait YAML (active_effects.yaml)
  → traitEffects.js: evaluateStatusTraits()
  → status_applies[]
  → performAttack: unit.status[stato] = min(cap, max(current, turns))
```

### Effect paths per stato

| Stato       | AP reset (applyApRefill) | Attack modifier (performAttack) | DoT (3 path) |
| ----------- | ------------------------ | ------------------------------- | ------------ |
| slowed      | -1 AP (max 1)            | —                               | —            |
| marked      | —                        | +1 dmg su hit (consume)         | —            |
| burning     | —                        | —                               | 2 PT/turno   |
| chilled     | -1 AP (max 1)            | -1 atk pre/revert               | —            |
| disoriented | —                        | -2 atk pre/revert               | —            |

### DoT 3 path (burning)

1. `advanceThroughAiTurns` (session.js) — `applyBurning` async closure
2. priority-queue inline (session.js ~line 1685)
3. `applyEndOfRoundSideEffects` (sessionRoundBridge.js) — loop dopo bleeding

### AP reset (slowed / chilled)

- **origin/main ~488da05**: inline in 3 posti (resetAp closure, pq inline, sessionRoundBridge)
- **origin/main ~5096d44+**: `applyApRefill` centralizzato in sessionHelpers.js — 1 sola modifica

> **Nota**: PR-1 (slowed) e PR-2 (marked) branciano da 488da05. PR-3/4/5 branciano da 5096d44.
> Quando PR-1/2 vengono mergiati post-rebase, usare il pattern `applyApRefill` della versione attuale.

### Duration caps

```javascript
STATUS_DURATION_CAPS = {
  // pre-esistenti
  rage: 5,
  frenzy: 5,
  panic: 4,
  stunned: 3,
  confused: 3,
  bleeding: 5,
  // Phase A nuovi
  slowed: 3, // PR-1
  marked: 2, // PR-2
  burning: 3, // PR-3
  chilled: 2, // PR-4
  disoriented: 1, // PR-5
};
```

## Test coverage

| PR    | File                        | Test count | Baseline totale |
| ----- | --------------------------- | ---------- | --------------- |
| #1947 | statusEffectsSlowed.test.js | 3          | 310/310         |
| #1948 | statusEffectsMarked.test.js | 3          | 313/313         |
| #1950 | statusEffectsPhaseA.test.js | 8          | 315/315         |
| #1951 | statusEffectsPhaseA.test.js | 10         | 321/321         |
| #1953 | statusEffectsPhaseA.test.js | 8          | 319/319         |

## Prossime fasi (Phase B — non bloccanti per playtest)

### Priority 1: policy.js consumption (~6-8h)

I 5 nuovi stati non influenzano ancora le decisioni dell'AI `declareSistemaIntents.js`.

- `slowed`: AI dovrebbe preferire inseguire unit slowed (movimento ridotto)
- `disoriented`: AI dovrebbe attaccare target disorientati (probabilità hit alta)
- `chilled`: AI considera target chilled come softer targets
- `burning`: AI non insegue target già in fiamme (DoT fa il lavoro)
- `marked`: AI coordina attacchi su target marked per consumare bonus

### Priority 2: HUD surface (~3-4h)

Gate 5 (Engine wired): nessuno dei 5 stati ha surface player-visible.

- Status icon sotto unit sprite (almeno emoji: 🔥🧊💫❄️🎯)
- Tooltip su hover con turns rimanenti
- Log entry nel combat panel quando applicato

### Priority 3: trait glossary sync

`aura_glaciale`, `tela_appiccicosa`, `marchio_predatorio`, `respiro_acido`, `sussurro_psichico`
non sono ancora in `data/traits/glossary.json`. Aggiungere con `trait-lint` skill.

### Priority 4: Phase B stati (medium effort ~15-20h)

- `burning` resistenza per specie acquatiche/acquatiche
- `chilled` → `frozen` upgrade se doppia applicazione stessa T
- Stacking rules: burning + chilled = annullamento (design call pendente)

## Entry point prossima sessione

```bash
# PR-1/2 su vecchio main — rebasing se necessario:
git log origin/main --oneline -3  # verifica SHA corrente
# Se SHA != 488da05, fare rebase PR-1/2 su nuovo main

# Approva e mergia tutti e 5 i PR:
# #1947 #1948 #1950 #1951 #1953 (in ordine, nessuna dipendenza — tutti da main)

# Poi HUD surface sprint:
# apps/play/src/statusHud.js  (nuovo)
# apps/play/index.html        (wire)
```

## Blockers

Nessun blocker tecnico. Decisione design pendente: stacking burning+chilled (annullamento vs somma).
