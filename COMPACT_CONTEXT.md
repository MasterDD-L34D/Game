# COMPACT_CONTEXT — Evo-Tactics

> **Scope**: snapshot 30 secondi. Sessione successiva parte da qui.
> **Cambia ogni sessione significativa**. Aggiornamento manuale o via skill `/compact`.

---

## Progetto

- **Nome**: Evo-Tactics
- **Versione compact**: v1 (primo snapshot formale)
- **Ultimo aggiornamento**: 2026-04-24 (sessione adozione archivio + skills + Triangle Strategy research)

## Stato attuale

- Branch lavoro: `claude/distracted-volhard-2f84a5` (worktree) **2 ahead, 0 behind** `origin/main` (rebased 2026-04-24)
- Ultimo PR merged main: **#1731** `docs(sprint): playtest prep 2026-04-24 sprint close + CLAUDE.md + registry` (82206464)
- Sprint **2026-04-24 playtest prep** chiuso in main: 4 PR consecutivi (#1728-#1731) — fix V5 SG pool, launcher rewrite preflight+health+QR+ngrok, playtest-UI fix round 1, sprint close doc
- Sprint 2026-04-26 Vision Gap V1-V7 chiuso (6/7, V3 deferred), PR #1726 merged
- Sprint M16-M20 co-op MVP chiuso (PR #1721-#1725, state machine lobby→debrief live)
- Test suite: **AI 307/307** verdi (DoD gate #1 post-rebase). Altri: round model 60+, lobby 26, M12 57, M13 progression 24, timer 17, vision-gap 65 — aggregate 411+/411
- Playtest round 2 pendente (userland, post #1730)

## Obiettivo di questa fase

- Adottare archivio operativo esterno (`C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/`) → bootstrap-kit integrato nel repo
- Aggiungere 2 subagent P0: `playtest-analyzer`, `coop-phase-validator`
- Codificare skill `/compact` (hack @okaashish) + memory session-timing-reset
- Preparare ticket backlog da ricerca Triangle Strategy (10 meccaniche)

## Cosa è già stato fatto (ultimi 3 PR + sessione corrente)

- **#1727** (b9a6dc73): SG earn formula Opzione C wired in `abilityExecutor.js` (5 site), UI rewards/packs wires in `onboardingPanel.js`/`debriefPanel.js`/`characterCreation.js`
- **#1726** (0d501169): V1 onboarding 60s, V2 tri-sorgente reward API, V4 PI-pacchetti YAML 16×3, V5 SG tracker 5/8 formula, V7 biome-aware spawn bias, telemetry JSONL endpoint
- **#1725** (5fb94b99): M16-M20 sprint close docs + playtest playbook + CLAUDE.md update
- **Sessione 2026-04-24 (corrente — PR #1732 draft aperta)**:
  - 5 research docs scritti (2062 righe totali): skills shopping list, archivio inventory, agent roster, tiktok extraction, triangle-strategy transfer plan
  - **Sprint 0 archivio** (root): PROJECT_BRIEF.md, COMPACT_CONTEXT.md (questo), DECISIONS_LOG.md
  - **Sprint 1 archivio** (root + `.claude/`): MODEL_ROUTING.md, TASK_PROTOCOL.md, SAFE_CHANGES.md, 4 prompt template in `.claude/prompts/` (02_game_design, 04_research_bridge, 05_claude_code_brief, 09_first_principles_checklist)
  - **Sprint 2 archivio** (root + docs): LIBRARY.md (reference index), PROMPT_LIBRARY.md (entrypoint), docs/reports/2026-04-24-repo-autonomy-readiness-audit.md (score 21.5/24 = semi-autonomia reale), docs/guide/claude-code-setup-p1-skills.md (install guide P1), docs/planning/2026-04-24-pr-1732-gamer-summary.md (patch-notes per user approval)
  - 3 nuove memory (2026-04-24 sera): project_archivio_adoption_status (stato adoption), feedback_4gate_dod_application_pattern (template applicativo), MEMORY.md index esteso
  - 2 agent P0 creati + smoke-tested: `.claude/agents/playtest-analyzer.md` (USABLE), `.claude/agents/coop-phase-validator.md` (USABLE post-fix path rewrite)
  - 1 skill creata: `.claude/skills/compact.md`
  - 4 memory saved: session-timing, smoke-test-policy (4-gate DoD), user-decision-shortcuts, archivio-reference
  - Policy **4-gate DoD** codificata in CLAUDE.md — obbligatoria per ogni nuovo agent/skill/feature
  - Branch rebased onto origin/main post merge PR #1728-#1731 — zero conflitti
  - **PR #1732 draft** aperta con 3 commit (bootstrap Sprint 0 + policy 4-gate DoD + compact post-rebase)

## Decisioni prese

- **Archivio operativo → adozione Sprint 0 + Sprint 1**: 4 bootstrap file root (PROJECT_BRIEF, COMPACT_CONTEXT, DECISIONS_LOG, MODEL_ROUTING) + 3 file `.claude/` (TASK_PROTOCOL, SAFE_CHANGES, prompts/) + link in CLAUDE.md
- **Agent roster P0**: solo `playtest-analyzer` + `coop-phase-validator`. Vision-gap-tracker deferred (P1), game-database-bridge dormiente (Alt B flag-OFF), archivio-librarian deferred (P2)
- **Skills P0**: zero install NPM/MCP server in questa sessione (richiede approvazione utente setting). Solo skill locale `/compact` codificata
- **Triangle Strategy**: 10 meccaniche → ticket di backlog design, non commit automatico. Rollout proposto in 3 sprint slice M14-A/M14-B/M15 (documento ricerca)
- **Session timing reset**: comportamento salvato in memory (non codice), applicabile cross-session
- **Policy 4-gate DoD**: dichiarazione permanente — ogni nuovo agent/skill/feature richiede research + smoke test + tuning + optimization prima di "ready". Applicata retroattivamente su 2 agent P0 + /compact skill (smoke test eseguiti). Sprint 1 prompts = eccezione (one-off prompts = solo Gate 1).

## Vincoli hard

- **Regola 50 righe**: task >50 righe nuove fuori da `apps/backend/` → ferma, segnala, aspetta
- **Guardrail sprint**: no touch `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`
- **No nuove deps** senza approvazione esplicita
- **Docs italiano, code identifier inglese**
- **Master DD approval** prima di merge PR
- **Trait solo in** `data/core/traits/active_effects.yaml`

## Problemi aperti

- **TKT-M11B-06 playtest live** (userland, P0, chiude P5 🟢)
- **M13 P3 Phase B residuo**: balance N=10 sim post XP grant (3-5h)
- **M13 P6 Phase B residuo**: calibration harness N=10 hardcore 07 + HUD timer Phase B (3-5h)
- **Sprint V1-V7 residuo UI wire**: onboardingPanel in main.js, reward offer in debriefPanel, pack recommender in charCreation (userland)
- **V3 Mating/Nido deferred** (~20h post-MVP)
- **V6 UI TV polish deferred** (~6h post-playtest)

## File / output importanti (sessione corrente)

- `docs/planning/2026-04-24-claude-skills-shopping-list.md` (513 righe) — top 5 P0 MCP/skill
- `docs/planning/2026-04-24-archivio-libreria-inventory.md` (249 righe) — 7 subdir + piano 3 sprint
- `docs/planning/2026-04-24-agent-roster-linked-projects.md` (191 righe) — 6 esistenti + 5 proposti
- `docs/planning/2026-04-24-tiktok-screenshots-extraction.md` (378 righe) — 9 Claude-specific estratti
- `docs/research/triangle-strategy-transfer-plan.md` (731 righe) — 10 meccaniche, 64 fonti
- `PROJECT_BRIEF.md` (root, questa sessione)
- `COMPACT_CONTEXT.md` (root, questo file)
- `DECISIONS_LOG.md` (root, index 30 ADR)

## Prossimi 3 passi

1. **Accept + merge PR #1732** (user action, 0 effort) — 4 commit, Sprint 0+1+2 archivio + 2 agent + skill /compact + policy 4-gate DoD. Summary approvabile: `docs/planning/2026-04-24-pr-1732-gamer-summary.md`. Risk 🟢 zero.
2. **P1 skills install** (userland, ~35 min) — seguendo `docs/guide/claude-code-setup-p1-skills.md`: filesystem MCP + git/github MCP + superpowers plugin + serena semantic retrieval. Ambient Claude Code +30% efficienza.
3. **TKT-M11B-06 playtest live** (userland, 2-4h con 2-4 amici) — unico bloccante P5 🟢 definitivo. Post-playtest: invoke `playtest-analyzer` agent per crunchare dati.

**Deferred**: Sprint 3 archivio (~30-60 min: BACKLOG.md + OPEN_DECISIONS.md + decisione master orchestrator), M13 P3 Phase B balance pass, M13 P6 Phase B calibration hardcore 07, Sprint Triangle Strategy M14-A (elevation/facing + terrain chain reactions, ~8h).
