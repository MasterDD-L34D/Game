---
title: Mission Console source recovery — TKT-BOND-HUD-SURFACE unblock
status: actionable-master-dd
date: 2026-05-10
type: planning
audience: master-dd
priority: high
related:
  - docs/mission-console/
  - docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md
  - docs/planning/2026-05-10-tkt-bond-hud-surface-frontend-handoff.md
  - BACKLOG.md TKT-BOND-HUD-SURFACE
---

# Mission Console source recovery — TKT-BOND-HUD-SURFACE unblock

## Major finding 2026-05-10

User verdict #3 ("devi cercarlo tu tra i miei repo e su questo pc") → repo-archaeologist agent excavation rivela:

**Mission Console source vive nella git history di questo repo (Game/), commit `42d1d6f3` (2025-11-02).**

ADR-2026-04-14 line 95 affermava _"source e' considerato perso"_ — **partially incorrect**. Source recoverable via:

```bash
git show 42d1d6f3:webapp/src/ --
git archive 42d1d6f3 webapp/src webapp/package.json webapp/vite.config.ts | tar -xv
```

## Source structure (commit `42d1d6f3`)

```
webapp/
├── package.json          # name: "idea-engine-webapp", Vue 3.5.11 + Vite 5.4.8
├── vite.config.ts        # base: './', build.outDir: 'dist'
└── src/
    ├── layouts/
    │   └── ConsoleLayout.vue       → ConsoleLayout-C3A9mirf.js
    ├── views/
    │   ├── FlowShellView.vue       → FlowShellView-wFxa7PdS.js
    │   ├── atlas/Atlas*.vue        → atlas-CoNIwjfj.js
    │   ├── nebula/*.vue            → (nebula chunks)
    │   └── NotFound.vue
    └── (router, stores, etc.)
```

## Timeline ricostruito

- **2025-11-02** commit `42d1d6f3` — Vue 3 source attivo in `webapp/src/` (last working state)
- **2025-11-21** commit `465d531c` — `webapp/` rinominato → `apps/dashboard/`, `src/` swappato a AngularJS scaffold (Vue source NON migrato, semplicemente abbandonato in-place)
- **2026-04-15** PR #1343 — `apps/dashboard/` AngularJS scaffold deleted
- **2026-05-10** — agent recovers source from git history

Vue source **mai migrato** dopo Nov 2025 — abandoned in place + overwritten by AngularJS rename. 6 mesi di drift.

## Build pipeline

- `npm run build` (in `webapp/`) → `webapp/dist/`
- Dist manualmente copiato → `docs/mission-console/` (pubblicato GitHub Pages)
- **Nessun CI workflow** wirava build → mission-console (manual master-dd)

## Anti-canonical check filesystem

Scansionato `C:/Users/VGit/Documents/GitHub/`:

- Solo `Game-Database`, `Game-Database-1`, `Game.zip`, `Game;C` (corrupt)
- **NO** `mission-console`, `evo-tactics-frontend`, `idea-engine-webapp`, Vue-only repos

Nessun separate external repo — Mission Console era SEMPRE in `webapp/` di questo Game/.

## Recovery plan proposal

### Phase A — Restore source (~30min, autonomous)

1. Branch `claude/mission-console-source-restore`
2. `git checkout 42d1d6f3 -- webapp/` → restore tree
3. Rename `webapp/` → `apps/mission-console/` (cleaner location, evita confusion con dashboard scaffold defunct)
4. Update root `package.json` workspaces aggiungere `apps/mission-console`
5. Update `vite.config.ts` outDir → `../../docs/mission-console/` (auto-publish path)
6. `npm install` + `npm run build` smoke test
7. PR + master-dd review

### Phase B — Wire bond_reaction toast (~2-3h post Phase A)

1. New component `apps/mission-console/src/components/BondReactionToast.vue`
2. Subscribe a action response websocket `useSessionStore` integration
3. Toast renders `bond_reaction.triggered=true` entro 200ms
4. Smoke E2E Playwright: utente vede bond fire entro 60s gameplay
5. Acceptance criteria TKT-BOND-HUD-SURFACE handoff doc

### Phase C — CI pipeline build (~1h post Phase A)

1. New workflow `.github/workflows/mission-console-build.yml`
2. Trigger su push `apps/mission-console/**`
3. Build + commit `docs/mission-console/` automatico
4. Deprecate manual master-dd build process

## Effort estimate aggregate

| Phase                 | Effort    | Owner      | Gate                           |
| --------------------- | --------- | ---------- | ------------------------------ |
| A — Source restore    | ~30min    | autonomous | low risk                       |
| B — Bond toast        | ~2-3h     | autonomous | post Phase A                   |
| C — CI build pipeline | ~1h       | autonomous | forbidden path master-dd grant |
| **Total Phase A+B+C** | **~3-5h** | mixed      |                                |

## Master-dd verdict needed

- **Q1**: Phase A restore — proceed autonomous OR master-dd dry-run pre-restore?
- **Q2**: Path location — `apps/mission-console/` (recommend) OR `webapp/` (preserve original) OR `apps/dashboard/` (overwrite scaffold)?
- **Q3**: Phase C CI build — ship in same PR OR separate post Phase A merge?
- **Q4**: ADR-2026-04-14 superseded by recovery — write new ADR-2026-05-10-mission-console-recovery superseding ADR-04-14?

## Out of scope this doc

- Sprite/asset coord per Mission Console post-recovery
- Component re-design (preserve original Vue 3.5.11 + Vite 5.4.8 stack)
- Migration to Vue 3.6+ / Vite 6+ (separate scope se ship)
- Mobile responsive tweaks (TKT-MOBILE-CONSOLE separate)

## Resume trigger

> _"recover Mission Console source — Phase A restore from commit 42d1d6f3 to apps/mission-console/, smoke build, then ship Phase B bond toast"_

## Cross-ref

- Original ADR (partially superseded): [ADR-2026-04-14](docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md)
- Frontend handoff: [TKT-BOND-HUD-SURFACE handoff](docs/planning/2026-05-10-tkt-bond-hud-surface-frontend-handoff.md)
- BACKLOG TKT-BOND-HUD-SURFACE entry
