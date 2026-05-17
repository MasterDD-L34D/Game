---
title: enneaEffects.js — orphan canonical 93 LOC (REVIVED via PR #1825 + #1827 + #1830)
museum_id: M-2026-04-25-006
type: architecture
domain: enneagramma
provenance:
  found_at: apps/backend/services/enneaEffects.js
  git_sha_first: 61b20873
  git_sha_last: b27a612c # 2026-04-25 sera, PR #1830 9/9 mechanical
  last_modified: 2026-04-25
  last_author: claude-code
  buried_reason: abandoned
relevance_score: 4
reuse_path: COMPLETED — sessionRoundBridge applyEndOfRoundSideEffects hook via PR #1825 (#1827 9/9 + #1830 3 stat consumers)
related_pillars: [P4]
status: revived
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
revived_on: 2026-04-25
last_verified: 2026-04-25
revival_pr_chain:
  - https://github.com/MasterDD-L34D/Game/pull/1825 # 6/9 wire mechanical+log_only
  - https://github.com/MasterDD-L34D/Game/pull/1827 # 9/9 archetype coverage
  - https://github.com/MasterDD-L34D/Game/pull/1830 # 3 stat consumer move/stress/evasion → 9/9 mechanical
---

> **🎉 REVIVED 2026-04-25 sera** — Card chiusa via PR chain 3 commit consecutivi. enneaEffects.js da 93 LOC orfana → 9/9 archetipi runtime mechanical live. P4 🟡 → 🟢 candidato definitivo. Reuse_path implementation: `sessionRoundBridge.applyEndOfRoundSideEffects` lazy-invoke `buildVcSnapshot(session, telemetryConfig)` post status decay (gate `session.turn > 1`, KO-skip, telemetry config caching static field). 311/311 AI baseline preserved + 31 NEW tests in `enneaEffectsWire.test.js`. Card preservata come reference excavate-revive lifecycle.

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

## ⚠️ Scoperta architecture (2026-04-25 wire-attempt)

Card originale stimava Minimal wire ~2h. **Audit pre-wire scopre architecture mismatch**:

- File path corretto: `apps/backend/routes/sessionRoundBridge.js` (route, NON service)
- **`vcSnapshot` è computato solo end-of-session** ([routes/session.js:1828](../../../apps/backend/routes/session.js)) via `buildVcSnapshot(session, telemetryConfig)`. Nessuna computazione per-round.
- **`unit.ennea_archetypes` NON è popolato** sui units state. Vive solo in `vcSnapshot.per_actor[uid].ennea_archetypes`.
- Function signatures reali in `enneaEffects.js`: `resolveEnneaEffects(activeArchetypes[])` + `applyEnneaBuffs(actor, effects)` (NON `applyEnneaEffects(unit, vcSnapshot)` come card assumeva).

**Effort reale rivisto**:

- ~2-3h refactoring vcSnapshot per round-aware computation + caching
- ~1h wire in `routes/sessionRoundBridge.js` post-resolveRound
- ~1h regression test (307/307 baseline + nuovi unit test)
- ~1h documentation + handoff
- **Total ~5-6h**, NON 2h. Hot path combat = high blast radius.

## Concrete reuse paths (rivisti post-audit)

1. **Minimal — wire post-resolveRound in route layer (P0, ~5-6h)**

   ```js
   // apps/backend/routes/sessionRoundBridge.js
   const { resolveEnneaEffects, applyEnneaBuffs } = require('../services/enneaEffects');
   const { buildVcSnapshot } = require('../services/vcScoring');

   // dopo resolveRoundPure() + syncStatusesFromRoundState():
   const vcRoundSnapshot = buildVcSnapshot(session, telemetryConfig); // round-aware variant TBD
   for (const unit of session.roundState.units || []) {
     if ((unit.hp?.current || 0) <= 0) continue;
     const archetypes = vcRoundSnapshot?.per_actor?.[unit.id]?.ennea_archetypes || [];
     const effects = resolveEnneaEffects(archetypes);
     applyEnneaBuffs(unit, effects);
   }
   ```

   - **Pre-req**: `buildVcSnapshot` deve supportare per-round mode (oggi solo end-session).
   - Test: `node --test tests/api/sessionRoundBridge.test.js`
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
