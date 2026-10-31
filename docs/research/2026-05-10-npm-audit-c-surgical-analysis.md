---
title: 'npm audit C Surgical Analysis — Sera 2026-05-10'
date: 2026-05-10
type: research
status: live
workstream: ops-qa
slug: 2026-05-10-npm-audit-c-surgical-analysis
tags: [npm, audit, security, deps, surgical, vulnerabilities, master-dd-review]
author: claude-autonomous
---

# npm audit C Surgical Analysis — 2026-05-10 sera

V13 verdict C surgical (~3-4h maintenance window). Master-dd grant cascade approval session sera "3+4". Full per-dep risk analysis + selective semver-compat fix shipped + major upgrades deferred ADR window.

## Pre-analysis state

Post #2191 (npm audit fix non-force batch 27→9 shipped 2026-05-10 sera early).

Root `npm audit`:

- Total: **9 vulnerabilities** (6 moderate + 3 high + 0 low + 0 critical)

## Vulnerability cluster breakdown

### Cluster A: AngularJS legacy (apps/trait-editor)

| Pkg                | Severity | Fix path                                         |                       Risk                        |
| ------------------ | :------: | ------------------------------------------------ | :-----------------------------------------------: |
| `angular`          |   high   | **NO FIX**                                       | 🔴 stuck — AngularJS 1.8.3 EOL, no upstream patch |
| `angular-sanitize` | moderate | **fix=isSemVerMajor** to 1.3.0 (downgrade weird) |                        🟡                         |

**Verdict cluster A**: STUCK. AngularJS 1.x EOL Jan 2022. Solo 2 paths:

1. Replace AngularJS app entirely (apps/trait-editor) — high effort ~10-20h refactor a Vue/React/Svelte
2. Accept residue indefinitely + isolate via CSP / sandbox

**Recommendation**: defer to apps/trait-editor migration ADR (NOT this session).

### Cluster B: Vite/Vitest stack (apps/mission-console + apps/play + apps/trait-editor)

| Pkg              | Severity | Current             | Fix path                     |
| ---------------- | :------: | ------------------- | ---------------------------- |
| `vite`           | moderate | ^5.4.x              | vite 8.0.11 (3 major bumps)  |
| `esbuild`        | moderate | (transitive vite)   | via vite 8.0.11              |
| `vitest`         | moderate | ^2.1.x              | vitest 4.1.5 (2 major bumps) |
| `@vitest/mocker` | moderate | (transitive vitest) | via vitest 4.1.5             |
| `vite-node`      | moderate | (transitive vitest) | via vitest 4.1.5             |

**Verdict cluster B**: major version bumps (vite 5→8, vitest 2→4). Risk:

- Vite 5→6 changed Node.js minimum + plugins API
- Vite 6→7 stripped CommonJS support
- Vite 7→8 (latest)
- Vitest 2→3 changed config schema + reporter API
- Vitest 3→4 (latest)

Used in 3 frontend apps + tests.

**Recommendation**: bundle Vite + Vitest joint upgrade in dedicated PR ~3-5h:

1. Branch `chore/vite-vitest-major-upgrade-2026-05-10`
2. Update apps/mission-console → vite^8 + vitest^4
3. Update apps/play → vite^8 (no vitest)
4. Update apps/trait-editor → vite^8 + vitest^4
5. Run all test suites + dev servers smoke
6. Fix migration breakage per upgrade guide
7. Ship if 100% verde, defer/abort se broken

### Cluster C: ajv-cli (root)

| Pkg               | Severity | Current              | Fix path                     |
| ----------------- | :------: | -------------------- | ---------------------------- |
| `ajv-cli`         |   high   | ^5.0.0               | ajv-cli 0.6.0 (major DOWN??) |
| `fast-json-patch` |   high   | (transitive ajv-cli) | via ajv-cli 0.6.0            |

**Verdict cluster C**: ajv-cli 5.0.0 → 0.6.0 = downgrade. Probabile npm audit suggesting older safe version. Investigate ajv-cli registry per latest stable version before upgrade.

Current usage: `npm run schema:lint` → `tools/scripts/lint-schemas.mjs` (?) — verify.

**Recommendation**: investigate ajv-cli alternatives (maybe `ajv-validate-cli` or direct `ajv` CLI usage). Effort ~30min-1h.

## Action shipped this session

### Selective semver-compat fix (apps/trait-editor)

`npm audit fix` non-force in `apps/trait-editor/`:

- package-lock.json updated (151+/106- LOC)
- Trait-editor audit: 9 vulns (3 high → 1 high) = -2 high
- Tests verde 15/15 vitest

**Diff scope**: `apps/trait-editor/package-lock.json` only. Zero `package.json` change.

### Apps/play + apps/mission-console

`npm audit fix` non-force = no semver-compat fixes available. Cluster B major required. Skipped.

## Residue master-dd action queue

| Cluster             |  Effort   |   Risk    | Decision                               |
| ------------------- | :-------: | :-------: | -------------------------------------- |
| A AngularJS legacy  |  ~10-20h  |  🔴 high  | Defer apps/trait-editor migration ADR  |
| B Vite+Vitest major |   ~3-5h   | 🟡 medium | Bundle PR dedicated maintenance window |
| C ajv-cli           | ~30min-1h |  🟢 low   | Investigate alternatives next session  |

**Total residue effort**: ~14-26h cumulative deferred.

## Auto-merge L3 candidate

Diff scope solo `apps/trait-editor/package-lock.json` (151+/106-). Zero forbidden path. Zero new dep. Test baseline preserved.

## BACKLOG entry residue

3 ticket nuovi residue post-V13 surgical:

```
TKT-DEPS-VITE-VITEST-MAJOR: ~3-5h — bundle vite 5→8 + vitest 2→4 cross-app upgrade
TKT-DEPS-AJV-CLI-INVESTIGATE: ~30min-1h — verify ajv-cli alternatives + selective upgrade
TKT-TRAIT-EDITOR-MIGRATION-ADR: ~10-20h research + decision — AngularJS replace target framework
```

Tutti deferred prossima maintenance window dedicata.

## Caveat anticipated judgment (CLAUDE.md)

Surgical analysis Claude autonomous. Major upgrade decisions = master-dd review pending per:

- Cluster B impact assessment cross-app vite/vitest config breakage
- Cluster A migration target framework choice (Vue 3 / React 18 / Svelte 5)

Current ship preserved zero behavior change (trait-editor only lock file updates, tests verde).

## Cross-references

- PR #2191 (npm audit fix 27→9 baseline shipped earlier session sera)
- BACKLOG entry "9 npm audit residue (--force breaking changes)" deferred
- Sprint Q+ closure ADR-2026-05-10 §10 refs
