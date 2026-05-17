---
title: Narrative Design Illuminator Agent — Smoke Test (4-gate DoD G2)
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
  - narrative-design-illuminator
  - 4-gate-dod
related:
  - .claude/agents/narrative-design-illuminator.md
  - .claude/agents/ui-design-illuminator.md
---

# Smoke Test: `narrative-design-illuminator`

**Data**: 2026-04-26
**Target**: dry-run `--mode audit --surface "onboardingPanel + tutorial briefings"`

## Input

- `apps/play/src/onboardingPanel.js` (170 LOC, Disco Elysium-style V1)
- `apps/play/src/thoughtsPanel.js` (407 LOC, Thought Cabinet V1)
- `services/narrative/narrativeEngine.js` (inkjs wrapper shipped)
- `services/narrative/narrativeRoutes.js` (`/api/v1/narrative` endpoints)
- `apps/backend/services/{tutorialScenario,hardcoreScenario}.js` (briefing_pre/post hardcoded)

## Execution trace

### Step 1: Identify surface

Surface mista: onboarding runtime + tutorial briefing static + thought panel UI. Dominio: Disco Elysium style, Thought Cabinet partial, NO quality-based narrative wired.

### Step 2: Player experience trace

- **Entry emotion**: curioso (onboarding 60s Disco-style reveals stat spheres)
- **Exit emotion**: informato ma passivo (briefing = lore dump, no agency)
- **Agency surface**: onboarding ha 3 scelte iniziali; tutorial briefing 0 choices

### Step 3: Quality checklist

| Check                          |   Status   | Evidence / Fix                                    |
| ------------------------------ | :--------: | ------------------------------------------------- |
| Player agency preserved        | 🟡 PARTIAL | Onboarding OK, tutorial briefing 0 choices        |
| State reactive (prior choice)  | 🔴 MISSING | Nessun mention di MBTI/ennea/choice pre-briefing  |
| Failure valid path             |   ⚠ NA    | No skill check nei briefing (combat only)         |
| Pacing (not combat-interrupt)  |   🟢 OK    | Briefing pre-combat, Thought reveal out-of-combat |
| Voice/tone consistent          |   🟢 OK    | Tono tecnico-militare in tutto                    |
| Accessibility (readable, skip) | 🟡 PARTIAL | Skip button OK, no TTS                            |

### Step 4: Pattern recommendation (P0)

1. **ink weave** per tutorial briefing variation (inkjs già dep, usare `.ink` file compilato)
2. **Quality-Based Narrative** — wire MBTI axes (T_F, S_N, E_I, J_P) come qualities → briefing variant selection
3. **Micro-reactivity** — briefing commenta choice precedente (es. "ricordi la pantera? torna ora")
4. **Skill check + inner voices** (Disco Elysium) — durante briefing, voice del job attivo commenta

### Step 5: Report output

Dry-run genererebbe `docs/planning/2026-04-26-onboarding-briefing-narrative-audit.md` con:

- Player experience trace (entry/exit/agency)
- Quality checklist 6-point
- Pattern recommendation P0/P1/P2
- Quote specifiche text passages da file esistenti
- Fonte primary citata

## Verdict

### 🟢 USABLE

**Strengths**:

- Quality checklist 6-point centrato su player experience (non solo code structure)
- Decision tree pattern-picker concreto
- Escalation path verso altri agent (ui-design, balance, schema-ripple)
- Anti-pattern blocklist content farm esplicito
- MBTI dual-mode (INFJ audit + INFP research) coerente per narrative domain

**Non toccato** (nice-to-have):

- LLM-grounded narrative integration (Hidden Door/Intra lessons) — deferred frontier
- Localization/i18n concerns — out of scope MVP

## Gate compliance

- **G1 Research**: ✅ 8 web searches, primary sources: Emily Short blog, inklestudios, Failbetter, Disco Elysium wiki, Wildermyth Vice, Choice of Games, Yarn Spinner, Tracery GitHub
- **G2 Smoke**: ✅ dry-run completato verdict USABLE
- **G3 Tuning**: ✅ path references verified (`services/narrative/narrativeRoutes.js` + `pluginLoader.js` narrative plugin)
- **G4 Optimization**: ✅ caveman + empatia, decision tree numbered, escalation path esplicita

## Next action

Agent pronto. Commit + PR merge.

## Sources

- Agent spec: `.claude/agents/narrative-design-illuminator.md`
- Research primary: [Emily Short Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/), [ink inklestudios](https://www.inklestudios.com/ink/), [Failbetter StoryNexus](https://www.failbettergames.com/news/narrative-snippets-storynexus-tricks), [Thought Cabinet Devblog](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet), [Wildermyth Vice](https://www.vice.com/en/article/pkbz78/wildermyth-review)
