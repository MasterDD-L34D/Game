---
title: 'Sprint 6 Beast Bond reaction trigger — handoff 2026-04-27'
date: 2026-04-27
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, sprint, autonomous, tier-s, ancientbeast, reaction, trait, P1]
related:
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/planning/2026-04-27-sprint-1-5-autonomous-handoff.md
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - CLAUDE.md
---

# Sprint 6 — Beast Bond reaction trigger handoff

## §1 Why

AncientBeast (FreezingMoon) Tier S #6 residuo. Reference matrix
[`docs/research/2026-04-26-tier-s-extraction-matrix.md`](../research/2026-04-26-tier-s-extraction-matrix.md) §6
line 230. Pattern in target: "quando una bestia adiacente attacca, il portatore
del trait riceve un bonus". In Evo-Tactics il pattern adjacency esisteva già
ma globale e player-only (`squadCombo` focus_fire +1 dmg sul 2°/3° attacco
stesso target). La gap era estendere a per-creature trait con filtro specie
configurabile e durata variabile.

Pillar match: **P1 Tattica leggibile (🟢)** — più reattività in combat senza
nuovi sistemi pesanti, sfrutta status engine esistente (decay
`status[*_buff] → bonus = 0`) e formato YAML standard.

## §2 What shipped

### §2.1 Schema trait YAML

Nuova classe trait in `data/core/traits/active_effects.yaml` con campo
`triggers_on_ally_attack`:

```yaml
triggers_on_ally_attack:
  range: <int> # Manhattan max ally→holder, default 1
  species_filter: # 'same' | 'any' | 'pack:<species_id>'
  atk_delta: <int> # delta a holder.attack_mod_bonus
  def_delta: <int> # delta a holder.defense_mod_bonus
  duration: <int> # turni status[*_buff] (decay sessionRoundBridge)
  log_tag: <string> # opzionale, log surface
```

3 trait esempio (T2, comportamentali):

| trait_id             | range | species_filter          | atk | def | duration |
| -------------------- | :---: | ----------------------- | :-: | :-: | :------: |
| `legame_di_branco`   |   1   | `same`                  |  1  |  1  |    1     |
| `spirito_combattivo` |   1   | `any`                   |  1  |  0  |    1     |
| `pack_tactics`       |   1   | `pack:predatori_nomadi` |  1  |  1  |    2     |

### §2.2 Engine

`apps/backend/services/combat/beastBondReaction.js` — modulo puro 3 funzioni:

- `checkBeastBondReactions(actor, units, traitRegistry)` — read-only scan, ritorna array reaction descriptors
- `applyBeastBondReactions(reactions)` — muta `holder.attack_mod_bonus|defense_mod_bonus` + arma `status[*_buff]` per decay
- `buildBeastBondEvents(reactions, attacker, session)` — costruisce raw event list ready per `appendEvent`

### §2.3 Wire

**Split check / apply per round-bridge sync compatibility**:

1. `apps/backend/routes/session.js:performAttack` — fa il check read-only post-resolveAttack, surface `beast_bond_reactions[]` su return.
2. `apps/backend/routes/sessionRoundBridge.js:handleLegacyAttackViaRound` — applica le mutazioni AFTER `syncStatusesFromRoundState` (altrimenti il sync wipe del round orchestrator azzera i nuovi `status[*_buff]` non tracciati nello `roundState.units[].statuses`). Emit raw event `action_type='beast_bond_triggered'` per ogni reaction. Attacca `beast_bond_reactions` all'attackEvent + al return wrapper.

### §2.4 Surface (Engine LIVE Surface DEAD killer)

- API response `/api/session/action` (action_type=attack) → `body.beast_bond_reactions[]` (array sempre presente, vuoto se nessun trigger)
- Raw event `beast_bond_triggered` nello stream `/api/session/state.events[]`
- `unit.attack_mod_bonus` / `defense_mod_bonus` visibili nello state pubblico
- `unit.status.attack_mod_buff` / `defense_mod_buff` visibili (decay 1/round)

## §3 Tests

| Suite                                              | Count   |
| -------------------------------------------------- | ------- |
| `tests/services/beastBondReaction.test.js` (unit)  | 11      |
| `tests/api/beastBondInPerformAttack.test.js` (E2E) | 3       |
| AI baseline (`tests/ai/*`)                         | 353/353 |
| `tests/api/abilityExecutor.test.js`                | 35/35   |
| `tests/api/roundExecute.test.js`+`atlasLive`       | 367/367 |

Zero regression. Format check verde.

## §4 Files touched

- `apps/backend/services/combat/beastBondReaction.js` — NEW (~155 LOC)
- `apps/backend/routes/session.js` — wire import + read-only check in performAttack + return field
- `apps/backend/routes/sessionRoundBridge.js` — capture reactions + apply post-sync + emit raw events + surface in response
- `data/core/traits/active_effects.yaml` — 3 nuovi trait + commento schema
- `tests/services/beastBondReaction.test.js` — NEW (11 test)
- `tests/api/beastBondInPerformAttack.test.js` — NEW (3 test)
- `CLAUDE.md` — sprint context bump
- `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` — §B.1.5 + §C.1 marking 🟢
- `docs/planning/2026-04-27-sprint-6-beast-bond-handoff.md` — NEW (questo doc)

## §5 Pattern applicato (per riuso futuro)

### Round-bridge sync trap → split check/apply

Quando una mutazione di `unit.status` deve sopravvivere `syncStatusesFromRoundState`
(che reconcile contro `roundState.units[].statuses`), apply DOPO il sync, non
dentro `performAttack`. Pattern:

1. In `performAttack`: read-only check + surface descriptors via return field.
2. In `sessionRoundBridge.handleLegacyAttackViaRound`: dopo `syncStatusesFromRoundState`, re-resolve holder per id + chiama l'apply mutation.
3. Emit raw events nello stesso punto (post-sync, post-apply).

Già osservato in altri pattern: `applyEnneaToStatus`, `propagateLineage`,
`applyArchetypeDR` — tutti applicati in fasi specifiche del flow per non
collidere con il sync.

## §6 Backlog futuro (related)

Da §B.1.5 stato-arte:

- 🔴 **3 nuovi elementi** (earth/wind/dark) (~6h con balance pass).
- 🔴 **Ability r3/r4 tier** (~10h) — estende `abilities.yaml` r1/r2 esistente.

Da considerare per spec questo schema:

- Estensione `triggers_on_target_attacks` (defensive bond: trigger quando holder è target di attacco)
- Wire `triggers_on_ally_kill` (chain glory pattern Bayonetta-style)
- Cap totale per duration (mirror `STATUS_DURATION_CAPS`) per prevenire stack abuse
- Roster ampliato (catalog 45 specie) — popolare i trait su 3-5 specie canoniche

## §7 Memory updates

- Memory file aggiornato: `feedback_round_bridge_sync_trap_pattern.md` (NEW) — round-bridge sync wipe + split check/apply rescue pattern.

## §8 Commit + PR

Branch: `claude/sprint-6-beast-bond` (branched off `origin/main` `f74c1da3`).
Commit single + PR: `feat(sprint-6): Beast Bond reaction trigger — AncientBeast Tier S #6 residuo`.
