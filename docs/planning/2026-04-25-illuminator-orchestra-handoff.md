---
title: Illuminator Orchestra — Next Session Handoff (preserva approccio)
workstream: cross-cutting
category: handoff
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 14
tags:
  - handoff
  - next-session
  - illuminator
  - agent-orchestra
  - workflow
related:
  - .claude/agents/balance-illuminator.md
  - .claude/agents/ui-design-illuminator.md
  - .claude/agents/pcg-level-design-illuminator.md
  - .claude/agents/telemetry-viz-illuminator.md
  - .claude/agents/narrative-design-illuminator.md
  - .claude/agents/economy-design-illuminator.md
  - docs/qa/2026-04-26-balance-illuminator-smoke.md
---

# 🚀 NEXT SESSION HANDOFF — Illuminator Orchestra

**Data handoff**: 2026-04-25
**Per**: Claude Code prossima sessione (autonoma o user-driven)
**Status**: 🟢 6 agent live + 6 runtime apply + workflow validated 6×
**Imperativo**: NON perdere l'approccio agent-driven research-first.

---

## 🎯 Scopo di questo doc

Far ripartire la prossima sessione dall'**ottimo punto** raggiunto in questa, **senza ri-derivare** lo stack agent-driven da zero. Tutte le memory salvate, tutti i pattern indicizzati, tutti gli agent invokabili.

**Se questa è la tua prima sessione dopo il 2026-04-25**: leggi PROJECT_BRIEF.md → COMPACT_CONTEXT.md → questo doc → MEMORY.md (auto-loaded). Sei pronto in <90s.

---

## 🤖 Agent Orchestra (6 attivi)

```bash
# Tutti invokabili immediatamente, nessuna setup richiesto:
Agent({ subagent_type: "balance-illuminator",          prompt: "..." })  # ENTJ/ENTP
Agent({ subagent_type: "ui-design-illuminator",        prompt: "..." })  # ISTP/ENFP
Agent({ subagent_type: "pcg-level-design-illuminator", prompt: "..." })  # INTJ/INTP
Agent({ subagent_type: "telemetry-viz-illuminator",    prompt: "..." })  # ISTJ/INTP
Agent({ subagent_type: "narrative-design-illuminator", prompt: "..." })  # INFJ/INFP
Agent({ subagent_type: "economy-design-illuminator",   prompt: "..." })  # ENTJ/ENTP
```

Ogni agent ha **2 modalità**:

- `--mode audit` (default, 10-20 min) — review esistente, decision tree, checklist
- `--mode research` (30-60 min) — disruptive hunt, 8-16 WebSearch + WebFetch

**Spec files**: `.claude/agents/<agent-name>.md` (370+ LOC ciascuno).
**Smoke tests**: `docs/qa/2026-04-26-<agent>-illuminator-smoke.md`.

---

## 📚 Workflow validato 6× (NON deviare)

**Pattern: research-first + smoke-tested + runtime-apply separato**.

Vedi memoria persistente:

- [`feedback_agent_illuminator_workflow.md`](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_agent_illuminator_workflow.md) — 5 step process
- [`feedback_parallel_research_batches_pattern.md`](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_parallel_research_batches_pattern.md) — 8 WebSearch parallel cache-warm
- [`project_agent_illuminator_set_2026-04-26.md`](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/project_agent_illuminator_set_2026-04-26.md) — roster 6 agent + 70+ pattern

### Quick reference workflow

1. **Research batch** (60 min): 8 WebSearch parallel in 1 message + opzionale 8 altri + 2-4 WebFetch deep-dive
2. **Agent draft** (~30 min): MBTI dual-mode + pattern library P0/P1/P2+frontier + anti-pattern blocklist + escalation path
3. **Smoke test dry-run** (~15 min): invoke mentally su surface reale → verdict USABLE post line-level fix
4. **Commit + PR** (~20 min): branch `claude/<agent>-agent`, format check, governance, CI verde, merge
5. **Runtime apply** (separato): invoke agent → findings → implementation PR

---

## 🎨 Cosa abbiamo (asset persistent)

### Knowledge base (70+ pattern indexed primary-sourced)

- **Balance** (14): SPRT/Fishtest, MCTS, Restricted Play Jaffe 2012, MAP-Elites, Bayes, LLM-critic + design patterns Creatures/MHS2/Palworld/DQM/Viva Piñata/Pokopia
- **UI** (10): ITB telegraph, StS intent, FE threat zone, Jackbox, 10-foot, Dead Space diegetic, microinteraction, Disco thought, BG3 dice
- **PCG** (13): ITB hand-made, Dead Cells concept, WFC, Spelunky, Dormans grammar, ASP, Pathfinder XP, Tracery, DF fractal, Agentic LLM-PCG
- **Telemetry** (13): Tufte sparkline, heatmap, funnel, Sankey, DuckDB, Grafana, Observable Plot, D3, deck.gl
- **Narrative** (10): ink weave, QBN Fallen London, Disco Elysium voices, Thought Cabinet, Wildermyth, ChoiceScript, Yarn Spinner, Tracery, Citizen Sleeper
- **Economy** (11): Machinations, StS gold+relic+potion, Hades 7-currency, MT Pact Shards, ITB reward matrix, XCOM LW2, roguelite spectrum

**Anti-pattern blocklist universale** (in ogni agent):

- ❌ AI content farms: emergentmind.com, grokipedia.com, medium.com/\*, towardsdatascience.com — solo per discovery, mai primary

### Runtime infrastructure

- `tools/py/telemetry_analyze.py` — stdlib aggregation pipeline (15 pytest)
- `tools/py/restricted_play.py` — Jaffe 2012 multi-policy harness (13 pytest)
- `apps/analytics/index.html` — Observable Plot dashboard CDN ESM
- Backend telemetry hooks: `tutorial_start` + `tutorial_complete` auto-log
- `apps/play/lobby.html` WCAG 2.1 AA compliant

---

## ⚠️ Cose da NON fare (lessons learned)

1. **NON deviare dal workflow agent illuminator**: ogni nuovo dominio richiede agent + smoke test + apply (no shortcuts).
2. **NON saltare smoke test**: 4-gate G2 obbligatorio. Senza dry-run, agent risk path outdated/broken (lezione coop-phase-validator pre-fix).
3. **NON usare content farm come primary**: emergentmind/grokipedia/medium/towardsdatascience solo discovery, verifica arxiv/GDC/wiki originali.
4. **NON drift verso single-greedy harness**: Jaffe 2012 + Politowski 2023 hanno rejected questa pratica, usa Restricted Play multi-policy.
5. **NON aggiungere deps senza approval**: stdlib Python + CDN ESM bastano (validated 6 volte).
6. **NON commettere governance violations**: ogni nuovo `.md` in `docs/` richiede frontmatter + entry in `docs_registry.json`.
7. **NON modificare guardrail sprint**: `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/` (segnala prima).

---

## 🎯 Prossimi candidati naturali

### Agent residuali (se serve nuovo dominio)

- `art-direction-illuminator` (style guide curator + GDC art post-mortems)
- `audio-design-illuminator` (Bossfight Studio FMOD pattern, dynamic music)
- `localization-illuminator` (i18n + cultural adaptation)
- `accessibility-illuminator` (estensione UI a screen-reader specifici, motion sensitivity)

Use ONLY if dominio non coperto da agenti esistenti.

### P0 residuali agent esistenti

| Agent                        | P0 residual                                 | Effort |
| ---------------------------- | ------------------------------------------- | :----: |
| balance-illuminator          | MCTS smart policy (state clone API)         |  ~4h   |
| balance-illuminator          | SPRT sequential early-stop                  |  ~2h   |
| balance-illuminator          | MAP-Elites lightweight implementation       |  ~6h   |
| ui-design-illuminator        | Intent preview floating-icon wire           |  ~4h   |
| ui-design-illuminator        | Threat zone toggle phone                    |  ~3h   |
| pcg-level-design-illuminator | Objective variety (rescue/timer/extraction) |  ~8h   |
| pcg-level-design-illuminator | XP budget encounter builder                 |  ~6h   |
| narrative-design-illuminator | Quality-Based Narrative MBTI gating         |  ~6h   |
| narrative-design-illuminator | Tutorial briefing ink variation             |  ~4h   |
| economy-design-illuminator   | Machinations diagram artifact               |  ~3h   |
| economy-design-illuminator   | Source→sink macro-economy formal model      |  ~4h   |

### Big rocks (userland-bound o BIG effort)

- **TKT-M11B-06 playtest live** (userland only, chiude P5 🟢) — 4 amici 90min
- **M14-D pincer follow-up queue** (ADR #1741 ready) — ~6h
- **V3 nido/mating/housing** — design ready (Creatures/MHS2/Palworld/DQM/VivaPiñata patterns), implementation ~20h post-MVP

---

## 🚦 Test baseline

- AI regression `tests/ai/*.test.js` → **307/307 verde**
- Services `tests/services/*.test.js` → **177/177 verde**
- New tests aggregate: 57+ (telemetry 20 + restricted-play 13 + funnel 4 + altri)
- Format check: verde
- Governance strict: 0 errors

**Pre-flight prossima sessione**:

```bash
node --test tests/ai/*.test.js
node --test tests/services/*.test.js
npm run format:check
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
```

---

## 📋 Prossima sessione kickoff template

Quando inizi nuova sessione:

```
1. Read this handoff doc (90s)
2. Read MEMORY.md (auto-loaded)
3. Check user request:
   - "audit X" → invoke matching illuminator --mode audit
   - "research Y" → invoke matching illuminator --mode research
   - "extend agent set" → workflow agent-illuminator (5 step)
   - "apply agent finding" → runtime PR separato
   - "playtest TKT-M11B-06" → userland only, dimmi data + invoke playtest-analyzer post
4. Pre-flight tests (vedi sopra)
5. Branch + work + PR + merge (pattern già validato)
```

---

## 🔗 File critici da non toccare senza ragione

- `.claude/agents/*-illuminator.md` (6 agent specs) — knowledge-base persistent
- `~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/*.md` (memory) — workflow + roster
- `docs/qa/2026-04-26-*-illuminator-smoke.md` (6 smoke tests) — verdict USABLE
- `tools/py/telemetry_analyze.py` + `tools/py/restricted_play.py` — runtime infrastructure
- `apps/analytics/index.html` — dashboard
- Anti-pattern blocklist consistente: emergentmind/grokipedia/medium/towardsdatascience → primary verification mandatory

---

## 🎮 Quick win pattern (next session)

**Se hai 1h e vuoi shippare qualcosa concreto**:

1. Pick P0 residual da tabella sopra (es. SPRT sequential ~2h)
2. Invoke matching illuminator `--mode audit` per scope refinement
3. Implement seguendo agent decision tree
4. Test + format + governance
5. PR + CI verde + merge

**Se hai 2-3h e vuoi creare nuovo dominio agent**:

1. Identifica gap dominio (no current agent coverage)
2. Workflow 5-step (research → draft → smoke → commit → register)
3. Save memory entry in `project_agent_illuminator_set_*.md`

**Se hai 4-6h e vuoi research-driven feature design**:

1. Invoke `--mode research` su 1-2 illuminator agents
2. Synthesize findings → ADR draft
3. PR ADR + agent invocation report

---

## 💎 Asset più prezioso da preservare

L'**approccio**, non il code:

> "Research-first via 8 WebSearch parallel + smoke-tested agent + runtime apply separato → 20 PR shipped in 8h, 0 regression, 0 dep nuovi."

Questo workflow è il vero unlock. Code lo puoi rifare. Workflow + knowledge-base + memory persistent = compound interest cross-session.

**Replica questo, non re-inventare.**

---

## 🆘 Escalation se qualcosa va storto

- Test fail → revert PR, identify root cause prima di re-tentare
- Agent non disponibile → check `.claude/agents/<name>.md` esiste + tooling `Agent` tool registrato
- Memory non auto-load → check `~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/MEMORY.md` first 200 lines
- Workflow drift (agent senza smoke test, o single-greedy harness, o content farm citation) → STOP, re-leggi questo handoff

---

## ✨ TL;DR

- **6 agent illuminator pronti** all'uso (audit + research mode)
- **70+ pattern indicizzati** primary-sourced
- **Workflow validato 6×**: research → draft → smoke → commit → apply
- **Memory persistent** salvata (3 new files in 2026-04-25)
- **Test suite verde** + governance 0 errors + format pulito
- **Anti-pattern blocklist** universale: content farm vietato come primary

**Continua da qui senza perdere l'approccio.**

— Claude Code, sessione 2026-04-24/25 (notte)
