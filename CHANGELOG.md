---
title: CHANGELOG -- Evo-Tactics
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: '2026-06-22'
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# CHANGELOG -- Evo-Tactics

> Format: [Keep-a-Changelog](https://keepachangelog.com/en/1.1.0/) + adattamento per milestone-based release model.
> Source of truth per release notes user-visible. Per planning interno vedi [`docs/planning/changelog.md`](docs/planning/changelog.md). Per QA reports vedi [`docs/reports/qa-changelog.md`](docs/reports/qa-changelog.md).
>
> **Nota modello (2026-06-22):** dal milestone M14-A (2026-04) il modello di release
> e' passato da M-code a SPEC-A..Q + tracking per PR/ticket; nessun nuovo M-code
> coniato da maggio. Post pivot Godot (2026-04-29) il client web `apps/play` e'
> ritirato: le release notes player-facing vivono nel repo sibling
> [Game-Godot-v2](https://github.com/MasterDD-L34D/Game-Godot-v2). Questo CHANGELOG
> root traccia milestone **backend + data + design**.

## [Unreleased]

In flight (vedi [`BACKLOG.md`](BACKLOG.md) per stato dettagliato):

- **aa01 Sprint-Impronta reconciliation** -- Track A (CAP-06 elevation refactor + questo CHANGELOG adopt + README de-drift), Track B (CAP-07 terrain-bridge verdict), Track C (L'Impronta design spec, master-dd-gated). Plan: [`docs/planning/2026-06-22-aa01-impronta-reconciliation-plan.md`](docs/planning/2026-06-22-aa01-impronta-reconciliation-plan.md)
- **OD-024 sentience interoception** -- D7 flag flip gated su N=40 (flag OFF, band-neutral)
- **item-1 SPEC suite** -- runtime flag `LETHAL_MISSIONS_ENABLED` / HA1 restano OFF in attesa di N=40 + master-dd

---

## [2026-06 reconstruction suite + meta-loop] -- 2026-06-08 .. 2026-06-22

### Added

- **SPEC-A..Q reconstruction suite + backend engines** ([PR #2639-#2662](https://github.com/MasterDD-L34D/Game/pulls), 2026-06-08) -- Chronicle (`services/chronicle`), Form-Pulse -> VC, identity name-emergence, `biomeWound`, per-creature acquired traits, objective-driver, i18n loader. Knob soggettivi flag-gated `PROPOSED` (ratify N=40).
- **SPEC-J lethal-wounds backend end-to-end** (PR #2789/#2790/#2792/#2794/#2798/#2803, 2026-06-17) -- lethal death model + Nido ritual heal/transform + per-player consent state machine + auto-timer + Godot consent UI ([GGv2 #477](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/477)). Flag `LETHAL_MISSIONS_ENABLED` OFF.
- **SPEC-K device-authority** (PR #2871/#2879 + audit #2878, 2026-06-20) -- world-confirm device-quorum + next-mission ready quorum (flag `WORLD_CONFIRM_QUORUM_ENABLED` OFF).
- **SPEC-H Codex "Specie" surface** (PR #2828-#2835, 2026-06-18) -- entries API + frontend tab + unlock-through-play + HA2 validator + HA5 proxy. Secret-invariant (coherence score engine-only).
- **Creature dossier attachment endpoint** (PR #2856, 2026-06-18) -- `GET /api/creature/:run/:actor/dossier`, public-tier fail-closed.
- **SPEC-F Skiv crossbreed slices** (PR #2783/#2796, 2026-06-17) -- share + propose + confirm (commit + cooldown + rate-limit + seeded-preview-match).
- **OD-024 sentience interoception program** (PR #2932/#2936/#2937/#2945/#2950, 2026-06-22) -- producer + nocicezione action-timing + stamina/fatica + enemy-wire + D4 pipeline. Tutto flag-OFF / band-neutral.
- **Codex A.L.I.E.N.A. procedural lore** (PR #2906/#2930, 2026-06-22) -- generatore lore (Tracery, HITL gate) + voce IT curata + pilot encounter `enc_foresta_temperata_radici`.

### Changed

- **A2 pressure_tier_floor LIVE in prod** (PR #2769/#2773/#2800, 2026-06-17) -- floor difficolta' encounter (Calm@0 -> Critical@75), magnitude RATIFIED-PROVISIONAL upward-only + author-guard.
- **SPEC-I ER6/ER7 ecosystem engines default-ON** (PR #2712/#2723/#2725, 2026-06-10) -- StressWave event-trigger + population tick, post N=40 gates.
- **Meta-network live routing (GAP-C)** (PR #2582-#2597, 2026-06-03) -- 6-node graph (biomi canonici), branch 3-way, co-op route-vote WS. Flag `META_NETWORK_ROUTING` OFF (gated su Godot route-choice UI).
- **PHASEC job-perks 32/32 complete** (-> PR #2550, 2026-06-02) -- Cat F 7/7 + symbiont 7/7 + minion 8/8 + `shared_hp_pool` capstone.

### CI / Governance

- **Canon entity-grounding linter** vendored in CI (PR #2915, 2026-06-21) -- gate contenuti che citano entita' canonical vs canon corrente (hallucinate-by-association).
- **Docs-governance stale burn-down** 397 -> 0 (PR #2899-#2934, 2026-06-21) -- lifecycle status + cadenza tiered.

### Notes

- Suite reconstruction SPEC-A..Q = 17/17 `active` a doc-level; runtime flag soggettivi (LETHAL / HA1) restano OFF in attesa N=40 + master-dd.
- OD-058 chiuso 13/13 (2026-06-10); mega-session closure incl. fix spawner position drift (PR #2730).

---

## [M14-A] -- 2026-04-25

### Added

- **Coop hardening F-1/F-2/F-3** ([PR #1736](https://github.com/MasterDD-L34D/Game/pull/1736), commit `b7abfe39`)
  - F-1: host transfer rebroadcast `phase_change` + `character_ready_list` post-promotion ([`apps/backend/services/network/wsSession.js:586`](apps/backend/services/network/wsSession.js))
  - F-2: stuck-phase escape hatch `POST /api/coop/run/force-advance` host-only ([`apps/backend/routes/coop.js:206`](apps/backend/routes/coop.js) + `coopOrchestrator.js:269`)
  - F-3: `submitCharacter` membership check con `player_not_in_room` error ([`apps/backend/services/coop/coopOrchestrator.js:115`](apps/backend/services/coop/coopOrchestrator.js))
- **M14-A elevation + terrain reactions helpers** (PR #1736 partial)
  - `elevationDamageMultiplier` in [`hexGrid.js:235`](apps/backend/services/grid/hexGrid.js) (delta>=1 -> 1.30, delta<=-1 -> 0.85)
  - `terrainReactions.js` con `reactTile` (fire+ice->steam, fire+water->evaporate, lightning+water->electrified) + `chainElectrified` BFS cap 5
  - `terrain_defense.yaml` attack_damage_bonus 0.30/-0.15
  - Spec: [`docs/planning/2026-04-25-M14-A-elevation-terrain.md`](docs/planning/2026-04-25-M14-A-elevation-terrain.md)

### Changed

- **BACKLOG.md drift fix #3** (commit `4ee9e30f`, [PR #1820](https://github.com/MasterDD-L34D/Game/pull/1820)) -- F-1/F-2/F-3/M14-A closures sincronizzate con stato reale del codice (helpers shipped + testati, resolver wire residuo ~3-4h non bloccante)

### Notes

- M14-A e' marcato `[partial]` in [`BACKLOG.md:72`](BACKLOG.md): pure helpers shipped, resolver wire (chiamata in damage step) residuo. Non blocca playtest TKT-M11B-06.

---

## [M13 P6] -- 2026-04-25

### Added

- **Hardcore Timeout + Timer HUD** ([PR #1698](https://github.com/MasterDD-L34D/Game/pull/1698))
  - HUD timer countdown
  - Auto-timeout outcome in difficulty hardcore
  - Spec: [`docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md`](docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md)

---

## [M13 P3] -- 2026-04-25

### Added

- **Progression Engine + Perk UI** ([PR #1697](https://github.com/MasterDD-L34D/Game/pull/1697))
  - XP grant hook in resolver
  - 5 passive tags wired
  - Progression panel UI overlay
  - Spec: [`docs/adr/ADR-2026-04-24-p3-character-progression.md`](docs/adr/ADR-2026-04-24-p3-character-progression.md)
- **Calibration harness** N=10 hardcore_07 (target win rate 30-50%)

### Notes

- Score totale post-merge: 500+ test (baseline pre-merge: 464+).

---

## [M12] -- 2026-04-24

### Added

- **Form Evolution + Campaign** ([PR #1693](https://github.com/MasterDD-L34D/Game/pull/1693))
  - Squad breeding at nest post-battle
  - Trait inheritance da genitori
  - Mutations generati da bioma
  - Memoria tattica ereditata
- **TKT-MUSEUM-SWARM-SKIV** closed (PR #1774, #1779) -- magnetic_rift_resonance T2 trait

### Reference

- [`docs/core/27-MATING_NIDO.md`](docs/core/27-MATING_NIDO.md), [`data/core/mating.yaml`](data/core/mating.yaml)

---

## [M11] -- 2026-04-21

### Added

- **Co-op NetCode Baseline** (M11 series, multiple PRs)
  - WebSocket M11 Jackbox-style: in-memory Room store, 4-letter consonant codes, host-authoritative
  - Reconnection token persistence
  - 6-phase coop orchestrator: lobby -> character_creation -> world_setup -> combat -> debrief -> ended
  - Frontend `apps/play/src/network.js` LobbyClient con auto-reconnect exp backoff
  - Lobby UI + character creation overlay + debrief panel

### Reference

- ADR networking: [`docs/adr/ADR-2026-04-16-networking-colyseus.md`](docs/adr/ADR-2026-04-16-networking-colyseus.md)
- ADR coop scaling: [`docs/adr/ADR-2026-04-17-coop-scaling-4to8.md`](docs/adr/ADR-2026-04-17-coop-scaling-4to8.md)

---

## Pre-M11 history

Sprint 001-020 + iniziale M0..M10 non documentati in questo file. Per archeologia vedi:

- [`CLAUDE.md`](CLAUDE.md) §sprint-context per recap sprint chiusi
- `git log --merges main` per tutti i PR mergiati
- [`docs/adr/`](docs/adr/) per decisioni architetturali (20+ ADR datati)
- [`docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md`](docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md) per vision di lungo periodo

---

_File vivo. Aggiornare ad ogni milestone closure (M\*) o release con `npm run play:build` distribuito a player. Update cadence: ogni PR che chiude un M-code o un ticket P0/P1 user-visible._
