---
title: CHANGELOG — Evo-Tactics
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# 📜 CHANGELOG — Evo-Tactics

> Format: [Keep-a-Changelog](https://keepachangelog.com/en/1.1.0/) + adattamento per milestone-based release model.
> Source of truth per release notes user-visible. Per planning interno vedi [`docs/planning/changelog.md`](docs/planning/changelog.md). Per QA reports vedi [`docs/reports/qa-changelog.md`](docs/reports/qa-changelog.md).

## [Unreleased]

In flight (vedi [`BACKLOG.md`](BACKLOG.md) per stato dettagliato):

- **TKT-M11B-06** — Playtest live ngrok 2-4 player (P5 🟢 gating)
- **M14-A residual** — Resolver wire completion + facing system enhancements (~3-4h)
- **M14-B** — Conviction + MBTI Scales upgrade (Triangle Strategy Mechanic 1+2, ~12h)
- **M15** — Initiative CT bar + Class Promotion XCOM-style (TS Mechanic 6+7, ~15h)
- **V6 UI polish** — Dashboard + visual identity post-playtest (~6h)

---

## [M14-A] — 2026-04-25

### Added

- **Coop hardening F-1/F-2/F-3** ([PR #1736](https://github.com/MasterDD-L34D/Game/pull/1736), commit `b7abfe39`)
  - F-1: host transfer rebroadcast `phase_change` + `character_ready_list` post-promotion ([`apps/backend/services/network/wsSession.js:586`](apps/backend/services/network/wsSession.js))
  - F-2: stuck-phase escape hatch `POST /api/coop/run/force-advance` host-only ([`apps/backend/routes/coop.js:206`](apps/backend/routes/coop.js) + `coopOrchestrator.js:269`)
  - F-3: `submitCharacter` membership check con `player_not_in_room` error ([`apps/backend/services/coop/coopOrchestrator.js:115`](apps/backend/services/coop/coopOrchestrator.js))
- **M14-A elevation + terrain reactions helpers** (PR #1736 partial)
  - `elevationDamageMultiplier` in [`hexGrid.js:235`](apps/backend/services/grid/hexGrid.js) (delta>=1 → 1.30, delta<=-1 → 0.85)
  - `terrainReactions.js` con `reactTile` (fire+ice→steam, fire+water→evaporate, lightning+water→electrified) + `chainElectrified` BFS cap 5
  - `terrain_defense.yaml` attack_damage_bonus 0.30/-0.15
  - Spec: [`docs/planning/2026-04-25-M14-A-elevation-terrain.md`](docs/planning/2026-04-25-M14-A-elevation-terrain.md)

### Changed

- **BACKLOG.md drift fix #3** (commit `4ee9e30f`, [PR #1820](https://github.com/MasterDD-L34D/Game/pull/1820)) — F-1/F-2/F-3/M14-A closures sincronizzate con stato reale del codice (helpers shipped + testati, resolver wire residuo ~3-4h non bloccante)

### Notes

- M14-A è marcato `[🟡] PARTIAL` in [`BACKLOG.md:72`](BACKLOG.md): pure helpers shipped, resolver wire (chiamata in damage step) residuo. Non blocca playtest TKT-M11B-06.

---

## [M13 P6] — 2026-04-25

### Added

- **Hardcore Timeout + Timer HUD** ([PR #1698](https://github.com/MasterDD-L34D/Game/pull/1698))
  - HUD timer countdown
  - Auto-timeout outcome in difficulty hardcore
  - Spec: [`docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md`](docs/adr/ADR-2026-04-24-p6-hardcore-timeout.md)

---

## [M13 P3] — 2026-04-25

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

## [M12] — 2026-04-24

### Added

- **Form Evolution + Campaign** ([PR #1693](https://github.com/MasterDD-L34D/Game/pull/1693))
  - Squad breeding at nest post-battle
  - Trait inheritance da genitori
  - Mutations generati da bioma
  - Memoria tattica ereditata
- **TKT-MUSEUM-SWARM-SKIV** ✅ closed (PR #1774, #1779) — magnetic_rift_resonance T2 trait

### Reference

- [`docs/core/27-MATING_NIDO.md`](docs/core/27-MATING_NIDO.md), [`data/core/mating.yaml`](data/core/mating.yaml)

---

## [M11] — 2026-04-21

### Added

- **Co-op NetCode Baseline** (M11 series, multiple PRs)
  - WebSocket M11 Jackbox-style: in-memory Room store, 4-letter consonant codes, host-authoritative
  - Reconnection token persistence
  - 6-phase coop orchestrator: lobby → character_creation → world_setup → combat → debrief → ended
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
