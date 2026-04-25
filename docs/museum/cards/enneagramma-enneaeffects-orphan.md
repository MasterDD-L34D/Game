---
title: enneaEffects.js — orphan canonical 93 LOC mai wired (P4 status drift)
museum_id: M-2026-04-25-006
type: architecture
domain: enneagramma
provenance:
  found_at: apps/backend/services/enneaEffects.js
  git_sha_first: 61b20873
  git_sha_last: 61b20873
  last_modified: 2026-04-16
  last_author: MasterDD-L34D
  buried_reason: abandoned
relevance_score: 4
reuse_path: apps/backend/services/sessionRoundBridge.js (import + onRoundEnd hook ~2h)
related_pillars: [P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# enneaEffects.js — orphan canonical (93 LOC, mai wired)

## Summary (30s)

- **93 LOC scritte 2026-04-16 PR #1433**: mappa archetipi Ennea → buff combat (`stat_ops`, timing `round_end`, scope `self`)
- **Zero `require/import`**: `grep "enneaEffects" apps/backend/` ritorna solo 1 hit (definizione stessa). Il modulo è ORFANO
- **SOURCE-OF-TRUTH §13.4 dichiara "Operativo P4 completo"**: drift docs vs runtime. P4 status reale ≈ 🟡 (stesso di prima del PR), non 🟡+ come sostenuto

## What was buried

`apps/backend/services/enneaEffects.js` 93 LOC, struttura:

```js
const ENNEA_EFFECTS = {
  Coordinatore: {
    /* type 1 */
    on: 'round_end',
    apply: (unit) => ({ attack_mod: +1, accuracy: +1 }),
  },
  Conquistatore: {
    /* type 8 */
    on: 'engage',
    apply: (unit) => ({ defense_mod: -1, attack_mod: +2 }),
  },
  Esploratore: {
    /* type 7 */ on: 'move',
    apply: (unit) => ({ move_speed: +1 }),
  },
  // 3 archetipi più, totale 6
};

function applyEnneaEffects(unit, vcSnapshot) {
  const archetype = vcSnapshot.ennea_archetypes?.[0];
  if (!ENNEA_EFFECTS[archetype]) return null;
  return ENNEA_EFFECTS[archetype].apply(unit);
}

module.exports = { applyEnneaEffects, ENNEA_EFFECTS };
```

Coverage: 6/9 archetipi (mancano 1 Reformer, 4 Individualist, 6 Loyalist).

## Why it was buried

- PR #1433 (2026-04-16) "P4 Temperamenti MBTI/Ennea — axes, forms, PF endpoint, effects" introduce 5 nuovi files contemporanei. Tutti gli altri sono import-ati da `app.js` o route registry, MA `enneaEffects.js` no
- Probable cause: post-PR fix tests passing su MBTI side, `enneaEffects` left "for next iter" → mai integrato
- SOURCE-OF-TRUTH §13.4 update ha dichiarato "Operativo P4 completo" perché file esiste, MA non ha verificato require/import chain → false claim canonical
- Audit 2026-04-20 deep-dive ha confermato P4 🟡 ma non ha trovato questo specifico orphan

## Why it might still matter

- **Pillar P4 MBTI/Ennea 🟡 → 🟡+ candidato**: 6/9 archetipi base + wire = primo step verso runtime live
- **Combo con M-2026-04-25-002 registry**: registry ha 16 hook + 9 archetipi. Wire `enneaEffects.js` è step 1, registry è step 2 → P4 🟢 candidato in ~5h totali
- **Skiv Sprint C**: voice palette + ennea buff combat → identità RPG forte ("type 5 Investigator combat buff = +1 stat awareness round_end")
- **SOURCE-OF-TRUTH integrity**: card serve come correzione drift docs vs runtime, anti-pattern "claim canonical senza verify wire"

## Concrete reuse paths

1. **Minimal — wire in `sessionRoundBridge.js` (P0, ~2h)**

   ```js
   const { applyEnneaEffects } = require('./enneaEffects');

   // in onRoundEnd handler:
   const enneaBuff = applyEnneaEffects(unit, vcSnapshot);
   if (enneaBuff) {
     unit.attack_mod_bonus += enneaBuff.attack_mod || 0;
     unit.defense_mod_bonus += enneaBuff.defense_mod || 0;
     unit.accuracy_bonus += enneaBuff.accuracy || 0;
   }
   ```

   - Test: `node --test tests/api/sessionRoundBridge.test.js` (regress baseline)
   - Test: `node --test tests/ai/*.test.js` (307/307 verde)
   - Output: P4 status 🟡+ verificabile

2. **Moderate — extend coverage 9/9 archetipi (P1, ~5h)**
   - Add 1 Reformer, 4 Individualist, 6 Loyalist
   - Use Card M-2026-04-25-003 dataset 9 tipi come source
   - Wire registry M-2026-04-25-002 16 hooks via `applyHookEffects(unit, vcSnapshot, hookId)`
   - Output: P4 🟢 candidato

3. **Full — Ennea-aware AI policy + UI badge (P2, ~12h)**
   - `aiPolicy/utilityBrain.js` consideration per ennea archetype
   - UI HUD `<archetype>` badge sopra unit (read da `vcSnapshot.ennea_archetypes[0]`)
   - Telemetry emit `ennea_buff_applied` per balance audit
   - Pass a `balance-illuminator` per buff weighting calibration

## Sources / provenance trail

- Found at: [apps/backend/services/enneaEffects.js:1](../../../apps/backend/services/enneaEffects.js)
- Git history: `61b20873` (2026-04-16, PR #1433 "P4 Temperamenti MBTI/Ennea")
- Bus factor: 1 (MasterDD-L34D)
- Related claim: `docs/core/00-SOURCE-OF-TRUTH.md §13.4` — "Operativo P4 completo" (FALSE)
- Related canonical incomplete: [apps/backend/services/vcScoring.js:774](../../../apps/backend/services/vcScoring.js) `computeEnneaArchetypes` (6/9)
- Related future-trio: M-2026-04-25-002 (registry 16 hooks) + M-2026-04-25-003 (dataset 9 tipi)
- Inventory: [docs/museum/excavations/2026-04-25-enneagramma-inventory.md](../excavations/2026-04-25-enneagramma-inventory.md)

## Risks / open questions

- ❓ Wire breaks regression baseline 307/307? Probabilità bassa (additive only), ma test obbligatorio
- ⚠️ `vcSnapshot.ennea_archetypes` shape dipende da `vcScoring.js` output. Verifica live: `node -e "console.log(require('./services/vcScoring').computeEnneaArchetypes(...))"` pre-wire
- ⚠️ SOURCE-OF-TRUTH §13.4 va corretta DOPO wire, non prima (audit-driven update)
- ✅ enneaEffects.js sintatticamente clean — `node --check apps/backend/services/enneaEffects.js`

## Next actions

- **P4 unblock kickoff**: Minimal wire (2h) → P4 🟡+ verifiable
- **Sprint C dependency**: Skiv voice palette + combat buff = identità double-down
- **Audit**: `coop-phase-validator` agent run su `apps/backend/services/` per altri orphan files (pattern detection)
- **SOURCE-OF-TRUTH update**: §13.4 "Operativo P4 completo" → "P4 wire pending (M-2026-04-25-006)" finché Minimal non shipped
