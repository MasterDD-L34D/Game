---
title: 'Difficulty Integration — Implementation Spec'
doc_status: active
doc_owner: backend-team
workstream: flow
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Difficulty Integration — Implementation Spec

**Stato**: 🟢 ACTIVE — approvato Master DD 2026-04-17 (Q-001 T2.3)
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: A3 (SoT §15.4 formula non implementata)

## Contesto

SoT §15.4 definisce formula difficulty:

```
raw_score       = (enemy_count × avg_enemy_tier) + terrain_penalty + hazard_count × 2
biome_mult      = biomes[biome_id].difficulty_base
objective_mult  = objective_multipliers[objective.type]
difficulty      = clamp(raw_score × biome_mult × objective_mult, 1, 5)
```

Plus player-facing scaling wesnoth-pattern: Easy=0.7×, Normal=1.0×, Hard=1.3× sul `enemy_count`.

**Stato attuale**: formula esiste solo come testo in §15.4. Encounter YAML hanno `difficulty_rating: <int>` hardcoded dal designer, non calcolato. Player non ha setting per scegliere profilo.

## Deliverables proposti (split PR)

### PR-1 · Data + Schema (NO CODE, in Q-001) ✅ fatto in questo branch

- `data/core/difficulty.yaml` — tier_weights, terrain_penalty, objective_multipliers, 4 player_difficulty_profiles, ai_profile_mapping, rating_display
- `schemas/evo/difficulty.schema.json` — validazione AJV

### PR-2 · Calculator module (post-approval, branch dedicato)

Crea `services/difficulty/difficultyCalculator.js` (~100 LOC) — **triggera regola 50 righe, serve approval**:

```javascript
function calculateRawScore(encounter) {
  // enemy_count × avg_tier + terrain + hazard
}

function calculateDifficultyRating(encounter, biomeData, config) {
  const raw = calculateRawScore(encounter);
  const biomeMult = biomeData.difficulty_base ?? 1.0;
  const objMult = config.objective_multipliers[encounter.objective.type] ?? 1.0;
  return Math.max(1, Math.min(5, Math.round(raw * biomeMult * objMult)));
}

function applyPlayerProfile(encounter, profileId, config) {
  const profile = config.player_difficulty_profiles[profileId];
  return {
    ...encounter,
    waves: encounter.waves.map((wave) => ({
      ...wave,
      units: wave.units.map((u) => ({
        ...u,
        count: Math.round(u.count * profile.enemy_count_multiplier),
        // stat multipliers applied at runtime by resolver
      })),
    })),
    _difficultyProfile: profile,
  };
}
```

### PR-3 · Integration (post-PR-2)

- Modifica `apps/backend/routes/session.js` start handler (guardrail!):
  - Accetta `difficulty_profile: 'easy'|'normal'|'hard'|'nightmare'` come input
  - Applica `applyPlayerProfile()` all'encounter prima di spawnar wave
  - Default: `normal`
- Aggiungi endpoint `GET /api/v1/difficulty/profiles` → ritorna profiles da difficulty.yaml
- Test: session start con ogni profile, verifica enemy_count scalato

### PR-4 · Validation CI

- Script `tools/py/validate_encounter_difficulty.py` — per ogni encounter in `docs/planning/encounters/*.yaml`, calcola difficulty e verifica corrispondenza con `difficulty_rating` field (±1 star tolerance)
- Warning su drift > 1

### PR-5 · UI Settings (frontend, post-M4)

- Settings → Difficulty → dropdown 4 profili
- Display label + description da YAML (localized)
- Salva in profile utente
- Applica su new session

## Schema AJV proposta

Creo `schemas/evo/difficulty.schema.json` nello stesso Q-001? **O separato?**

Proposta: creo ora lo schema minimo per validare `data/core/difficulty.yaml`, coerente con tutti gli altri schema evo. Schema sotto.

## Effort stimato

| Step               | LOC      | Effort  | Branch                      |
| ------------------ | -------- | ------- | --------------------------- |
| PR-1 YAML + schema | +200     | S       | Q-001 (qui)                 |
| PR-2 Calculator    | +100     | S       | feat/difficulty-calc        |
| PR-3 Integration   | +80      | M       | feat/difficulty-integration |
| PR-4 Validation CI | +60      | S       | feat/difficulty-ci          |
| PR-5 UI Settings   | +120     | M       | feat/difficulty-ui          |
| **Totale**         | **+560** | **M-L** | 5 PR                        |

## Vincoli

- **Guardrail 50 righe**: PR-2/3/4 fuori da `apps/backend/` → servono approval Master DD
- **PR-3** tocca `apps/backend/routes/session.js` — richiede coordinamento con team AI (già quarantine Q-001)
- **Backward compat**: encounter YAML esistenti hanno `difficulty_rating` hardcoded. Calculator opera in add-on, non sovrascrive: solo validation CI segnala drift. No breaking change.

## Decisione Master DD (2026-04-17) — Q-001 T2.3

- 5-PR split: **SI**
- PR-1 (YAML + schema) merge in Q-001: **SI**
- Nightmare profile: **UNLOCK** post-clear (New Game+ retention hook P1/P2)
- Default profile: **NORMAL**
- Side-effect `_difficultyProfile` session state: **SI** (additive, no break)

Follow-up branch sequenza: `feat/difficulty-calc` → `feat/difficulty-integration` → `feat/difficulty-ci` → `feat/difficulty-ui`.

**Nightmare unlock logic**: flag `player_progress.nightmare_unlocked: boolean` triggerato su first campaign victory (gate M6).

## Cross-reference

- SoT §15.4 (formula)
- SoT §18.2 (accessibility — difficulty regolabile)
- SoT §19 Q15 (✅ chiusa su formula scelta)
- data/core/ai_profiles.yaml (mapping AI difficulty)
- schemas/evo/encounter.schema.json (campo `difficulty_rating`)
