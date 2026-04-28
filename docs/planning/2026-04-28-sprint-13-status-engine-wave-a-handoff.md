---
title: 'Sprint 13 — Status engine wave A (passive ancestor producer wire)'
description: 'Sprint 13 autonomous shipped: producer side wire per 7 statuses Wave A (linked/fed/healing/attuned/sensed/telepatic_link/frenzy). Recupera 297 ancestor batch ROI dormant. Producer/consumer separation chiusa.'
authors:
  - claude-code
created: 2026-04-28
updated: 2026-04-28
status: published
tags:
  - sprint-handoff
  - status-engine
  - ancestors
  - p6-fairness
  - producer-consumer
workstream: backend
related:
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/reports/PILLAR-LIVE-STATUS.md
  - docs/planning/2026-04-28-sprint-12-mating-lifecycle-handoff.md
---

# Sprint 13 — Status engine wave A — passive ancestor producer wire

**Data**: 2026-04-28 · **Branch**: `claude/sprint-13-status-engine-wave-a` · **Pattern**: Producer/consumer separation closure

## ⚡ TL;DR (30s read)

Pre-Sprint 13 stato:

- **Consumer side LIVE** in `apps/backend/services/combat/statusModifiers.js`: `computeStatusModifiers` + `applyTurnRegen` mappano 7 statuses (linked/fed/healing/attuned/sensed/telepatic_link/frenzy) a effetti meccanici quando `unit.status[stato] > 0`.
- **Producer side DEAD**: `apps/backend/services/traitEffects.js:226` `passesBasicTriggers` blocca `action_type: passive` → 297 ancestor batch traits con `effect.kind=apply_status` MAI eseguono → `unit.status[stato]` sempre 0 → consumer non si attiva mai → ROI batch ancestor dormant.

Sprint 13 chiude la asymmetria producer/consumer wirando il producer + frontend visibility. Helper pure `passiveStatusApplier.js` fa lo scan, wire al `/start` + round-end refresh, frontend `STATUS_ICONS` registry esteso.

## §1 — Cosa è cambiato

### Backend producer

**NEW** [`apps/backend/services/combat/passiveStatusApplier.js`](../../apps/backend/services/combat/passiveStatusApplier.js) (~145 LOC, pure):

- `applyPassiveAncestors(unit, registry)` — scan `unit.traits`, per ogni passive apply_status entry con Wave A status, set `unit.status[stato] = effect.turns || 99` (default permanent vs decay loop).
- `applyPassiveAncestorsToRoster(units, registry)` — itera roster.
- `passiveStatusSpec(definition)` — pure validator: passive + apply_status + Wave A + non-blocklist → spec, else null.
- `collectTraitIds(unit)` — tolerates string OR `{id}` array.
- **Filter `WAVE_A_STATUSES`**: 7 canonical (linked, fed, healing, attuned, sensed, telepatic_link, frenzy) — only those with consumer wired.
- **Filter `PASSIVE_BLOCKLIST`**: `frenzy` excluded (rage variant 2-turn canonical, no auto-permanent — preserve balance).
- **Idempotent max-policy**: re-apply non lower current value, refresh upward when below spec.

### Wire backend

[`apps/backend/routes/session.js`](../../apps/backend/routes/session.js) `/start`:

- Insert dopo lineage inheritance + prima session commit
- `applyPassiveAncestorsToRoster(units, traitRegistry)` — initial wave applies to all units at session start
- Best-effort try/catch (non blocca /start)

[`apps/backend/routes/sessionRoundBridge.js`](../../apps/backend/routes/sessionRoundBridge.js) `applyEndOfRoundSideEffects`:

- Insert dopo bleeding, prima HP regen ticks
- Re-apply `applyPassiveAncestorsToRoster` su roster — refresh wave per traits gained mid-encounter (mating offspring/recruit/evolve)
- Lazy `loadActiveTraitRegistry()` cached
- Best-effort

### Frontend visibility

[`apps/play/src/render.js`](../../apps/play/src/render.js) `STATUS_ICONS` registry esteso con 7 nuove entry. `drawStatusIcons` esistente auto-itera l'oggetto, picks up the new entries automatically:

| Status         | Glyph | Bg color |  Shape  | Semantica                  |
| -------------- | :---: | :------: | :-----: | -------------------------- |
| linked         |   ∞   | #fdd835  | circle  | kin connection (gold)      |
| fed            |   ◍   | #8d6e63  | circle  | satiation (brown)          |
| healing        |   ✚   | #4caf50  | circle  | regen (green)              |
| attuned        |   ⌬   | #26c6da  | circle  | biome resonance (cyan)     |
| sensed         |   ⊙   | #ab47bc  | circle  | psychic awareness (purple) |
| telepatic_link |   ⚹   | #7e57c2  |  star   | mind-meld (violet)         |
| frenzy         |   ᛞ   | #ef5350  | diamond | rage variant (red)         |

Shape coding: circle=persistent kin/sense, star=high-tier rare, diamond=combat-trigger.

---

## §2 — Test budget

**27/27 nuovi** (`tests/services/passiveStatusApplier.test.js`):

- `WAVE_A_STATUSES` + `PASSIVE_BLOCKLIST` constants (3)
- `collectTraitIds` (4 cases)
- `passiveStatusSpec` (7 cases)
- `applyPassiveAncestors` (10 cases)
- `applyPassiveAncestorsToRoster` (3 cases)

**Regression baseline**:

- AI baseline 382/382 ✓ zero regression
- statusModifiers existing 13/13 ✓ baseline preserved
- **Total 422/422 ✓**
- Format prettier verde
- Governance check 0 errors

---

## §3 — End-to-end integration verification

Direct node script proves producer→consumer chain works on real ancestor data:

```bash
node -e "
const { applyPassiveAncestorsToRoster } = require('./apps/backend/services/combat/passiveStatusApplier');
const { computeStatusModifiers } = require('./apps/backend/services/combat/statusModifiers');
const { loadActiveTraitRegistry } = require('./apps/backend/services/traitEffects');

const registry = loadActiveTraitRegistry();
const units = [
  { id: 'u_test', hp: 10, controlled_by: 'player', traits: ['ancestor_comunicazione_cinesica_cm_01'], position: { x: 2, y: 1 }, status: {} },
  { id: 'u_ally', hp: 10, controlled_by: 'player', traits: [], position: { x: 1, y: 1 }, status: {} },
];
applyPassiveAncestorsToRoster(units, registry);
const target = { id: 'enemy', hp: 10, position: { x: 3, y: 1 }, status: {} };
const mods = computeStatusModifiers(units[0], target, [...units, target]);
console.log(mods);
"
```

Output:

```
[trait-effects] 458 trait attivi caricati
unit.status: { linked: 2 }
mods: { attackDelta: 1, log: [{ status: 'linked', side: 'actor', effect: '+1 attack_mod (ally adjacent)' }] }
```

**Real ancestor trait** `ancestor_comunicazione_cinesica_cm_01` (Ancestors wiki CM 01 source) ora produce surface meccanico nel runtime. Pre-Sprint 13: silenzioso.

---

## §4 — Pillar score delta

| Pilastro    | Pre-Sprint 13 | Post-Sprint 13 | Delta                                          |
| ----------- | :-----------: | :------------: | ---------------------------------------------- |
| P6 Fairness |      🟢       |       🟢       | Status engine extension recupera 297 batch ROI |
| Altri       |   unchanged   |   unchanged    | —                                              |

**ROI moltiplicativo**: ogni passive ancestor authored in `data/core/traits/active_effects.yaml` con un Wave A status ora produce surface meccanico immediatamente. 297 traits batch da OD-011 v07 wiki recovery (CM/AB/MT/SW/DE/IN/OM/MB/ST/PM/TM/Senses branches) usabili.

---

## §5 — Anti-pattern guardrail rispettati

- ✅ Producer/consumer separation: helper pure, side-effect contained, no abstraction speculativa
- ✅ Frenzy in `PASSIVE_BLOCKLIST` per preservare balance 2-turn canonical
- ✅ Refresh idempotent max-policy: non lowera mai status già attivo
- ✅ Best-effort try/catch su entrambi i wire site (non blocca session/start o round-end se applier missing)
- ✅ Frontend extension via existing `STATUS_ICONS` registry pattern (no new module, zero scaffolding)
- ✅ Format prettier verde + governance 0 errors
- ✅ AI baseline 382/382 zero regression

---

## §6 — Wave B+ scope (next session candidates)

Wave A wire 7 statuses con consumer LIVE. Statuses ulteriori esistono in YAML ma consumer DEAD:

### Wave B candidati (consumer side da implementare ~3-5h ciascuno)

- **awareness** (predator detection, FOV expansion) — `data/core/traits/active_effects.yaml` line 3290 lista come "runtime-inert until M-future"
- **terrified** (fear status, AP penalty)
- **bonded** (kin pair-bond mechanical, distinct semantica da `linked` general)
- **stalked** (predator targeting penalty)
- **focused-on-miss** (compensatory bonus after miss)

### Wave C ambizione (autoring batch + balance)

Tag-gating: ogni passive ancestor ha tag `branch` (Senses/AB/MT/SW/DE/IN/OM/MB/ST/PM/TM). Una potential Wave C: assegnare passive ancestors a species default tier-aware (es. predator species inherit Senses branch, scout species inherit AB) → reuse 297 batch automatic.

### Tooltip surface frontend (Wave D ~2h)

Status icons ora rendono ma player non vede il significato. Wave D: hover unit → tooltip mostra status name + duration + effect summary (mirror existing tooltip 3-tier pattern Sprint α).

---

## §7 — Memory writes (suggested)

```markdown
- **Sprint 13 producer/consumer separation pattern**: quando consumer LIVE ma producer DEAD, helper pure scan + wire al call site giusto (init + refresh) chiude asymmetria. Pattern reusable per altri batch dormant. Nessuna abstraction speculativa: solo scan + transform + set. Frontend visibility via existing registry extension (no new module se possibile).
- **Worktree-path mismatch limitazione preview** (Sprint 12+13): Vite dev server da preview_start serve repo principale, non worktree path. Workaround standard: direct node integration test su producer→consumer chain con real registry data.
- **PASSIVE_BLOCKLIST pattern**: anche se YAML autora un trait permissivo, l'engine può proteggere balance via blocklist (frenzy = rage 2-turn, mai auto-permanent). Decisione design > YAML data quando conflict.
```

---

## §8 — Final state snapshot

- **Files added**: 3 (1 helper backend + 1 test suite + 1 handoff doc)
- **Files modified**: 5 (session.js wire + sessionRoundBridge wire + render.js STATUS_ICONS + COMPACT v17 + BACKLOG closure)
- **LOC delta**: ~450 added (helper + test + wire + handoff + STATUS_ICONS extension)
- **Test budget**: 27 new + 13 statusModifiers baseline + 382 AI baseline = 422/422 ✓
- **Pillar**: P6 🟢 consolidato (status engine recupera 297 ancestor batch ROI)
- **Recovery**: 297 ancestor batch traits ora reachable runtime via 7 Wave A statuses

Pattern producer/consumer separation closure applicato. Wave B+C+D scope opzionale next session.
