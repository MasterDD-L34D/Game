---
title: UI Design Illuminator Agent — Smoke Test (4-gate DoD G2)
workstream: ops-qa
category: qa
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 90
tags:
  - agent
  - smoke-test
  - ui-design-illuminator
  - 4-gate-dod
related:
  - .claude/agents/ui-design-illuminator.md
  - .claude/agents/balance-illuminator.md
---

# Smoke Test: `ui-design-illuminator`

**Data**: 2026-04-26
**Target**: dry-run `--mode audit --surface "apps/play/lobby.html + lobbyBridge.js"`

## Input

- `apps/play/lobby.html` (357 LOC)
- `apps/play/src/lobbyBridge.js` (783 LOC)
- `apps/play/src/lobbyBridge.css` (615 LOC)
- `apps/play/src/network.js` (accessibility check)

## Execution trace

### Step 1: Read surface files

Letti via `grep` + `wc` per estrarre CSS values + aria coverage.

### Step 2: Clarity check (ITB rule)

Lobby è funzionale pre-playtest (room code + roster + start button), ma **zero intent preview in combat view** (fuori surface). Intent = P0 pattern recommendation.

### Step 3: Quality checklist

| Check                      |   Status    | Evidence                                                         | Fix                                 |
| -------------------------- | :---------: | ---------------------------------------------------------------- | ----------------------------------- |
| Font ≥24pt on TV           | 🔴 **FAIL** | `.chip font-size: 0.85rem ≈ 14px` (line 16), sidebar 0.9-0.95rem | Bump min a `1.5rem` per TV view     |
| Safe area ≥5%              | 🟡 PARTIAL  | Padding interno 14-24px, no `env(safe-area-inset)` CSS           | Add iOS/TV safe-area-inset          |
| Contrast ≥4.5:1            | ⚠ UNKNOWN  | Richiede verifica colori concreti                                | Run contrast-checker automated      |
| Color + symbol             | 🟡 PARTIAL  | Player status solo color dots (online/offline)                   | Add shape redundant (● ■ ▲)         |
| Intent preview             | 🔴 MISSING  | Lobby view = roster only                                         | Wire StS-style floating icon combat |
| Threat zone toggle         | 🔴 MISSING  | No L-press equivalent                                            | Phone button + WS broadcast         |
| Microinteraction 200-500ms | 🟡 PARTIAL  | CSS transitions ma duration non verified                         | Audit `transition-duration`         |
| Screen reader aria         | 🔴 **FAIL** | `lobby.html` + `lobbyBridge.js` + `network.js` = **0 aria-**     | Add aria-label all interactive      |

### Step 4: Pattern recommendation (P0)

1. **10-foot typography upgrade** (Microsoft + Fire TV + Adobe): bump font root a 24pt/1.5rem. Cascade componenti.
2. **Accessibility aria default-on** (Mattel 2024 + Helldivers 2): aggiungere `aria-label` a tutti button + `role="list"` roster + `aria-live="polite"` banner.
3. **Color + symbol redundancy** (color-blind guide): player status dots con shape shape + color.

### Step 5: Report output

Dry-run genererebbe `docs/frontend/2026-04-26-lobby-ui-audit.md` con:

- Header frontmatter YAML
- Checklist 8-point con status per ogni
- Diff-syntax patch suggestion per ogni fail
- Fonte citata per ogni rule applicata
- P0/P1/P2 priority ranking

## Verdict

### 🟢 USABLE (post-fix v2)

**Strengths**:

- Checklist 8-point genera audit deterministico (no ambiguità)
- Fonte primary citata per ogni rule (Microsoft docs, Adobe, Mattel, Helldivers)
- Diff-syntax patch suggestion in output
- Anti-pattern blocklist content farm esplicito (emergentmind, grokipedia, medium, towardsdatascience)

**NEEDS-FIX identificati + applicati (G2 → G3)**:

1. ✅ Step 2 "Read surface files" aggiunto con grep/Read commands concreti
2. ✅ Explicit warning NON toccare `docs/mission-console/` (già in DO NOT list)
3. ✅ Data source priority per Mission Console READONLY

**Non toccato** (nice-to-have):

- Contrast checker automation = P1 backlog (richiede tool Chrome DevTools / axe-core)
- Screen reader integration testing = P2 backlog

## Gate compliance

- **G1 Research**: ✅ 16 web searches + 3 WebFetch deep-dive (1 fail 403 ITB GDC PDF → fonti alternative)
- **G2 Smoke**: ✅ dry-run completato verdict USABLE post-fix
- **G3 Tuning**: ✅ spec rivisto, format:check verde
- **G4 Optimization**: ✅ caveman voice + empatia, checklist numbered, escalation path esplicita

## Next action

Agent pronto. Commit + PR merge.

## Sources

- Agent spec: `.claude/agents/ui-design-illuminator.md`
- Balance-illuminator (pattern precedente): `.claude/agents/balance-illuminator.md`
- Research primary: [ITB UI Clarity GameDeveloper](https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-), [Microsoft 10-foot](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/introduction-to-the-10-foot-experience-for-windows-game-developers), [Jackbox UX Built In Chicago](https://www.builtinchicago.org/articles/jackbox-games-party-pack-design-ux), [Mattel color-blind 2024](https://www.fastcompany.com/91146946/mattel-is-making-its-games-colorblind-accessible)
