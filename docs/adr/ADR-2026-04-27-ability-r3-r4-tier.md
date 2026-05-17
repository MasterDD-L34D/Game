---
title: 'ADR-2026-04-27: Ability r3/r4 tier progressive — Sprint 8 final closure Tier S #6'
doc_status: active
doc_owner: combat-design
workstream: cross-cutting
last_verified: 2026-05-05
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - data/core/jobs.yaml
  - data/core/jobs_expansion.yaml
  - apps/backend/services/jobsLoader.js
  - apps/backend/services/abilityExecutor.js
  - tests/api/jobs.test.js
  - tests/api/abilityExecutor.test.js
  - docs/adr/ADR-2026-04-27-creature-bond-reactions.md
  - docs/balance/2026-04-27-numeric-reference-canonical.md
---

# ADR-2026-04-27: Ability r3/r4 tier progressive

- **Data**: 2026-04-27
- **Stato**: Accepted
- **Owner**: Combat Design / Master DD
- **Pattern source**: AncientBeast Tier S #6 ability rank progression (r1/r2 attuali → r3/r4 + costing scaling).
- **Sprint**: 8 (chiusura definitiva 4/4 Tier S #6 AncientBeast).

## 1. Contesto

Pre Sprint 8: `data/core/jobs.yaml` shippa **21 ability totali** (7 base job × 3 ability) distribuite su 2 rank:

- **r1** (×14): cost_pi 3, cost_ap 0-2, utility o single-target base
- **r2** (×7): cost_pi 8, cost_ap 1-2, capstone parziale (focus_blast / blade_flurry / cataclysm / ...)

Mancante: **late-game progression**. Master DM e player non hanno reward post-r2 unlock — campagne lunghe non aggiungono complessità tattica. AncientBeast Tier S #6 extraction matrix (Sprint 1-5 research, vedi `docs/research/2026-04-26-cross-game-extraction-MASTER.md`) flagga "Ability rank progression r1→r4 con costing ladder canonical" come pattern proven Tier S.

3/4 Tier S #6 chiusi (channel resistance Sprint 6 PR #1964 + Beast Bond Sprint 7 PR #1971 + Beast Showcase wiki #1937). Sprint 8 chiude 4/4.

## 2. Decisione

Estendere `data/core/jobs.yaml` da 21 → **35 ability** (7 base job × 5 ability ciascuno). Ogni job riceve:

- **r3** (mid-tier upgrade): cost_pi 14, cost_ap 1-2, scaling intermedio sopra r2 (+1 damage_step / 1 turno extra duration / range +1).
- **r4** (capstone): cost_pi 22, cost_ap 2-3, signature ultimate (+3-5 damage_step / AoE 3x3-4x4 / stress_reset / conditional_status).

**Cost ladder canonical**: r1=3 / r2=8 / r3=14 / r4=22 cost_pi (curva quasi-quadratica per scoraggiare rush + reward late investment).

**Vincolo runtime**: tutte le 14 ability nuove **riusano i 18 effect_type esistenti** in `abilityExecutor.js` (move_attack, multi_attack, buff, aoe_buff, aoe_debuff, ranged_attack, surge_aoe, team_buff, team_heal, drain_attack, execution_attack, debuff). **Zero nuovi effect_type runtime**, zero modifica all'executor.

### 14 ability nuove (per job)

| Job        | r3             | effect_type   | r4                | effect_type      |
| ---------- | -------------- | ------------- | ----------------- | ---------------- |
| skirmisher | phantom_step   | move_attack   | dervish_whirlwind | multi_attack     |
| vanguard   | aegis_stance   | buff          | bulwark_aegis     | aoe_buff         |
| warden     | chain_shackles | aoe_debuff    | void_collapse     | aoe_debuff       |
| artificer  | arcane_renewal | team_heal     | convergence_wave  | team_buff        |
| invoker    | arcane_lance   | ranged_attack | apocalypse_ray    | surge_aoe        |
| ranger     | hunter_mark    | debuff        | headshot          | execution_attack |
| harvester  | vital_drain    | drain_attack  | lifegrove         | team_heal        |

### Resource gating

r3/r4 inheritano i resource_usage primary del job (PP/PT/SG/Seed). Capstone r4 hanno gate alto:

- skirmisher.dervish_whirlwind: cost_pp 10
- vanguard.bulwark_aegis: cost_pt 8
- warden.void_collapse: cost_pt 10
- artificer.convergence_wave: cost_pp 10
- invoker.apocalypse_ray: cost_sg 100 (max gauge)
- ranger.headshot: cost_pp 12
- harvester.lifegrove: cost_pt 10

### Version bump

`jobs.yaml` `version: "0.1.0" → "0.2.0"` per signal-trigger downstream consumer (Game-Database catalog import + Mission Console pre-built bundle).

## 3. Conseguenze

### Positive

- **P3 Specie × Job** sale: late-game tactical depth + reward curve coerente. Player con 22 PI investiti accede a capstone signature (apocalypse_ray, void_collapse, lifegrove).
- **Encounter design**: scenario meta-economy ora ha range progressione PI 3→22 per slot ability (8× spread). Mid-campaign unlock target chiaro.
- **AncientBeast Tier S #6 closure 4/4** (100%): channel resist (#1964) + Beast Bond (#1971) + wiki cross-link (#1937) + r3/r4 progression (this PR).
- **Zero runtime change**: extends data + tests + docs only. abilityExecutor untouched (18/18 effect_type sufficienti). Risk minimale.

### Negative / mitigations

- **Test churn**: 2 esistenti hardcodavano `abilities.length === 3` su skirmisher/vanguard. Updated a 5 + nuovi test cost ladder canonical + naming uniqueness + version bump.
- **Front-end consumer**: `apps/play/src/abilityPanel.js` + `codexPanel.js` iterano array dinamicamente — verificato no breakage. Mission Console bundle auto-rispecchia via JSON.
- **Balance non playtest**: cost ladder + damage scaling **non** validato via N=10 batch. Documentato come "balance pass deferred a calibration sprint successivo" — schema/cost integrity verificati, runtime smoke (phantom_step e2e) verde.
- **Game-Database sync**: `jobs.yaml` v0.2.0 richiederà `npm run sync:evo-pack` + `npm run evo:import` lato Game-Database per propagare. Trigger documentato in handoff §7.

### Pillar delta

- **P3 Specie × Job**: 🟢c++ → 🟢ⁿ (rank progression complete, reward curve canonical).

## 4. AncientBeast Tier S #6 — chiusura 4/4

Post Sprint 8: **100% Tier S #6** chiuso.

| #   | Pattern                            | Sprint | PR                | Status |
| --- | ---------------------------------- | ------ | ----------------- | ------ |
| 1   | 3 nuovi channel (earth/wind/dark)  | 6      | #1964             | ✅     |
| 2   | Beast Bond reaction trigger        | 7      | #1971             | ✅     |
| 3   | Beast Showcase wiki cross-link     | 3      | #1937             | ✅     |
| 4   | **Ability r3/r4 tier progressive** | **8**  | **(this ADR PR)** | ✅     |

## 5. Riferimenti

- jobs.yaml extension: `data/core/jobs.yaml` v0.2.0 (35 base + 12 expansion = 47 ability totali)
- Loader: `apps/backend/services/jobsLoader.js` `extractAbilities` sort by rank ascending
- Executor: `apps/backend/services/abilityExecutor.js` (18/18 effect_type — invariato)
- Test enforcement: `tests/api/jobs.test.js` (14 test, +5 nuovi su Sprint 8)
- Sprint 7 handoff: `docs/planning/2026-04-27-sprint-7-beast-bond-handoff.md`
- Numeric reference: `docs/balance/2026-04-27-numeric-reference-canonical.md` §12

## 6. Expansion roster gap-fill (Sprint 8.1, 2026-05-05)

Audit 2026-05-05 ha rilevato 4 expansion job orphan (`data/core/jobs_expansion.yaml`): Stalker, Symbiont, Beastmaster, Aberrant — solo r1/r2 wired. Sprint 8 originale chiudeva i 7 base; expansion roster restava parziale.

**Decisione**: estendere stesso cost ladder canonical (r3=14 / r4=22 cost_pi) ai 4 expansion job. Stesso vincolo runtime (effect_type ∈ 18/18 supportati). 8 ability nuove (4 job × 2 tier).

| Job         | r3                  | effect_type | r4                 | effect_type      | Resource gate r4 |
| ----------- | ------------------- | ----------- | ------------------ | ---------------- | ---------------- |
| stalker     | shadow_mark         | debuff      | shadow_assassinate | execution_attack | PP ≥ 10          |
| symbiont    | bond_amplify        | team_buff   | unity_surge        | team_heal        | PT ≥ 8           |
| beastmaster | feral_dominion      | aoe_buff    | apex_pack          | aoe_buff         | PT ≥ 10          |
| aberrant    | stabilized_mutation | buff        | perfect_mutation   | surge_aoe        | SG ≥ 80          |

**Version bump**: `jobs_expansion.yaml` v0.2.0 → v0.3.0 per signal Game-Database catalog import.

**Outcome**: roster 11/11 job (7 base + 4 expansion) con r1→r4 wired. Pillar 3 (Identità Specie × Job) consolida 🟢ⁿ → 🟢++. Test coverage uplift: jobs.test +4 (expansion ladder + naming + version) = 18 test totali; abilityExecutor.test +5 r4 smoke (dervish/headshot/apocalypse/lifegrove + shadow_assassinate expansion) = 41 test totali. AI baseline 382/382 invariato (zero regression).

**Out of scope**: balance playtest expansion (deferred a calibration sprint successivo), frontend (auto-respect via JSON catalog), nuovi effect_type runtime (vincolo PR #1978 preservato).
