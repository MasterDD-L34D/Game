---
status: accepted
date: 2026-05-10
deciders: master-dd, claude-autonomous
tags: [mission-console, frontend, gate-5, recovery]
supersedes: []
related:
  - apps/mission-console/
  - docs/mission-console/
  - docs/planning/2026-05-10-mission-console-source-recovery.md
  - PR #2169 (Phase A source restore)
---

# ADR-2026-05-10 — Mission Console Source Recovery

## Status

**ACCEPTED** 2026-05-10.

NOTE: CLAUDE.md references "ADR-2026-04-14-dashboard-scaffold-vs-mission-console" but no such file exists in `docs/adr/` repo (CLAUDE.md doc-only claim, never canonical ADR). This ADR codifies the recovery decision afresh.

## Context

CLAUDE.md sezione architecture notes affermava che "Mission Console source is NOT in this repo" — implying esterno OR perso. No canonical ADR formal su questo ma assunzione condivisa cross-session.

Audit cross-domain 2026-05-10 (TKT-BOND-HUD-SURFACE Phase A) via `repo-archaeologist` agent revealed that the source **vive in git history Game/** commit `42d1d6f3` (2025-11-02).

Timeline drift:

- **2025-11-02** commit `42d1d6f3` — Vue 3 source attivo in `webapp/src/` (last working state)
- **2025-11-21** commit `465d531c` — `webapp/` rinominato → `apps/dashboard/`, `src/` swappato a AngularJS scaffold (Vue source NON migrato, abandoned in-place)
- **2026-04-15** PR #1343 — `apps/dashboard/` AngularJS scaffold deleted
- **2026-05-10** — agent excavates source from git history; PR #2169 ships restore

## Decision

Recovered source restored a **`apps/mission-console/`** (per workspace `apps/*` convention, NOT `webapp/` original — evita confusion con dashboard scaffold defunct).

Stack restored as-is da commit `42d1d6f3`:

- Vue 3.5.11 + Vite 5.4.8
- @vitejs/plugin-vue + @vitejs/plugin-react (dual-stack support)
- rollup-plugin-visualizer (analyze mode)
- Vitest test suite
- Admin tools (events scheduler standalone HTML)

Workspace `package.json` aggiornato per includere `apps/mission-console`. `npm install` regenerates lockfile. Build pipeline `npm run build --workspace apps/mission-console` verde end-to-end (smoke test 2.55s 2026-05-10).

## Consequences

### Positive

- TKT-BOND-HUD-SURFACE **NO longer fully blocked** — Phase B bond toast wire ora autonomous shippable (~2-3h)
- Mission Console maintenance future via npm workspace standard (test, lint, build via canonical scripts)
- Frontend feature additions (HUD components, debrief views) ora possibili autonomous senza external repo coord
- Audit trail clean: archeology + recovery documented per future archeologist

### Negative

- 164 file restored = large diff (PR #2169 +36476 LOC)
- Stack vintage 2025-11 (Vue 3.5.11 + Vite 5.4.8) — non ultimissima versione (2026-05 latest = Vue 3.6.x + Vite 6.x). Migration deferred separate ticket
- 18 vulnerabilities post-install (1 critical, 7 high, 9 moderate, 1 low) — old deps. `npm audit fix` deferred careful review

### Neutral

- `docs/mission-console/` pre-built bundle preserved as ground-truth shipped artifact (GitHub Pages source)
- Build pipeline manual master-dd convention preserved (no CI workflow yet — Phase C deferred)

## Alternatives considered

1. **Rewrite Vue source from scratch** — REJECTED. Mass effort ~50-100h vs ~30min recovery from git. Ship only when archeology fails.
2. **Use existing `apps/play/` HTML5 instead** — REJECTED. Different scope (lobby/play-side vs Mission Console design canvas). No surface compatibility.
3. **Restore in `webapp/` original location** — REJECTED. Conflicts with deleted dashboard scaffold convention. `apps/*` workspace standard preferred.
4. **Keep Mission Console as pure pre-built bundle (no source)** — REJECTED. Gate 5 violation persistent (TKT-BOND-HUD-SURFACE blocked indefinitely). Source recovery low cost, high value.

## Implementation phases

| Phase                                 |   Status    | Effort |              PR               |
| ------------------------------------- | :---------: | :----: | :---------------------------: |
| **A — Restore source**                | ✅ ACCEPTED | ~30min |             #2169             |
| **A.1 — npm install + workspace add** | ✅ ACCEPTED | ~5min  |        #2171 (this PR)        |
| **B — Bond reaction toast wire**      |  DEFERRED   | ~2-3h  |           next wave           |
| **C — CI build pipeline workflow**    |  DEFERRED   |  ~1h   | post Phase B (forbidden path) |

## References

- PR #2169: source restore commit (Phase A)
- `docs/planning/2026-05-10-mission-console-source-recovery.md`: detailed recovery plan
- BACKLOG.md TKT-BOND-HUD-SURFACE entry
- Gate 5 policy: CLAUDE.md §"Gate 5 — Engine wired"
