---
title: TKT-C6 Game Balance & Economy Tuning skill — install instructions
date: 2026-05-11
owner: master-dd
workstream: ops-qa
status: pending-manual-install
tags: [skill, mcpmarket, balance, calibration, autonomous-mode]
related:
  - docs/planning/2026-05-11-big-items-scope-tickets-bundle.md
  - BACKLOG.md
  - OPEN_DECISIONS.md
---

# TKT-C6 — Game Balance & Economy Tuning skill install instructions

**Verdict**: ACCEPT batch 2026-05-11 (override OD-005 deferred). Effort ~30min userland manual install.

## Why install-doc instead of direct install

Claude agent in autonomous session **lacks mcpmarket runtime access** (no MCP tool exposed to query/install mcpmarket-hosted skills). Per scope ticket §9 Risks: fallback path = scope doc canonical preserved + master-dd executes manual install. This doc fulfills the canonical preservation requirement.

## Install steps (master-dd manual, any PC)

1. **Open Claude Code** in `C:/Users/VGit/Desktop/Game/` (any worktree).
2. **Invoke mcpmarket UI**:
   - Slash command `/plugin` or settings panel (CLI: `claude plugin install <name>`).
   - Search skill: `Game Balance & Economy Tuning`.
3. **Install + auto-register**: confirm prompt → mcpmarket should auto-update `.claude/settings.json` (or user-level `~/.claude/settings.json`) with skill registration entry. Verify diff post-install.
4. **Reload Claude Code session** to register skill in available-skills list.

## Acceptance criteria (smoke test post-install)

1. **Invocation test**:
   - Skill tool: `Skill` with name matching `game-balance-economy-tuning` (or whatever slug mcpmarket assigns) — should NOT error "skill not found".
2. **Sample-data smoke**:
   - Feed skill sample `docs/playtest/2026-04-19-hardcore-iter1.md` + `iter7-RED.md`.
   - Expected output: skill produces concrete balance suggestion (e.g., damage curve adjustment, multiplier knob delta, status duration tweak, AP cost rebalance).
3. **Adoption test**:
   - Run skill against `data/core/balance/trait_mechanics.yaml` deltas vs baseline.
   - Expected: skill surfaces drift candidate + suggests recalibration.

## Docs landing post-install

After successful install + smoke test, master-dd update:

- `BACKLOG.md`: close TKT-C6 entry, link this doc + skill verification.
- `OPEN_DECISIONS.md`: OD-005 from `deferred` → `closed (mcpmarket installed YYYY-MM-DD)`.
- `MEMORY.md`: add 1-line entry `[Skill installed YYYY-MM-DD: game-balance-economy-tuning](skill_install_<date>.md)`.
- `docs/guide/asset-creation-workflow.md` or analogous skill catalog (if exists): document recipe `/<skill-trigger> dataset=<path>`.

## Anti-pattern check

- ❌ Do NOT hand-edit `.claude/settings.json` to fake skill registration — mcpmarket lifecycle owns the entry. Fake entries break update lifecycle.
- ❌ Do NOT proxy/wrap skill via Python script — skill MUST be invocable natively via `Skill` tool, otherwise loses caveman context + tool-use parallelism.
- ✅ DO log skill versions installed per session in `MEMORY.md` (for cross-PC parity audit).

## Resume trigger phrase (next session post-install)

> _"Skill game-balance-economy-tuning installed, run smoke test su hardcore-iter1+iter7 calibration data, report suggestion accuracy"_

## Pillar impact

Workflow efficiency cross-pillar. Non sblocca pillar diretto, ma automatizza calibration iter 1-7 hardcore + Sprint Q+ T4 species balance + future fairness tuning. ~30min install → multi-session recurring time savings.

---

**Status post-2026-05-11**: scope canonical preserved, awaiting master-dd manual install execution. Effort: ~30min userland.
