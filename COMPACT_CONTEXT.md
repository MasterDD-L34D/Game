# COMPACT_CONTEXT — Evo-Tactics

> **Scope**: snapshot 30 secondi. Sessione successiva parte da qui.
> **Cambia ogni sessione significativa**. Aggiornamento manuale o via skill `/compact`.

---

## Progetto

- **Nome**: Evo-Tactics
- **Versione compact**: v1 (primo snapshot formale)
- **Ultimo aggiornamento**: 2026-04-24 (sessione adozione archivio + skills + Triangle Strategy research)

## Stato attuale

- Branch lavoro: `claude/distracted-volhard-2f84a5` (worktree) allineato `origin/main` (0/0)
- Ultimo PR merged main: **#1727** `feat(wire): V5 SG earn in abilityExecutor + UI wires (rewards/packs)` (b9a6dc73)
- Sprint 2026-04-26 Vision Gap V1-V7 chiuso (6/7, V3 deferred), PR #1726 merged
- Sprint M16-M20 co-op MVP chiuso (PR #1721-#1725, state machine lobby→debrief live)
- Test suite: **411/411** verdi (AI 307 + round model 60+ + lobby 26 + M12 57 + M13 progression 24 + timer 17 + vision-gap 65)

## Obiettivo di questa fase

- Adottare archivio operativo esterno (`C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/`) → bootstrap-kit integrato nel repo
- Aggiungere 2 subagent P0: `playtest-analyzer`, `coop-phase-validator`
- Codificare skill `/compact` (hack @okaashish) + memory session-timing-reset
- Preparare ticket backlog da ricerca Triangle Strategy (10 meccaniche)

## Cosa è già stato fatto (ultimi 3 PR + sessione corrente)

- **#1727** (b9a6dc73): SG earn formula Opzione C wired in `abilityExecutor.js` (5 site), UI rewards/packs wires in `onboardingPanel.js`/`debriefPanel.js`/`characterCreation.js`
- **#1726** (0d501169): V1 onboarding 60s, V2 tri-sorgente reward API, V4 PI-pacchetti YAML 16×3, V5 SG tracker 5/8 formula, V7 biome-aware spawn bias, telemetry JSONL endpoint
- **#1725** (5fb94b99): M16-M20 sprint close docs + playtest playbook + CLAUDE.md update
- **Sessione 2026-04-24 (corrente)**:
  - 5 research docs scritti (2062 righe totali): skills shopping list, archivio inventory, agent roster, tiktok extraction, triangle-strategy transfer plan
  - 3 bootstrap file creati (root): PROJECT_BRIEF.md, COMPACT_CONTEXT.md (questo), DECISIONS_LOG.md
  - 2 agent P0 creati: `.claude/agents/playtest-analyzer.md`, `.claude/agents/coop-phase-validator.md`
  - 1 skill creata: `.claude/skills/compact.md`
  - 1 memory saved: `feedback_session_timing_reset.md`

## Decisioni prese

- **Archivio operativo → adozione Sprint 0**: 3 bootstrap file root + link in CLAUDE.md (fatto sessione corrente)
- **Agent roster P0**: solo `playtest-analyzer` + `coop-phase-validator`. Vision-gap-tracker deferred (P1), game-database-bridge dormiente (Alt B flag-OFF), archivio-librarian deferred (P2)
- **Skills P0**: zero install NPM/MCP server in questa sessione (richiede approvazione utente setting). Solo skill locale `/compact` codificata
- **Triangle Strategy**: 10 meccaniche → ticket di backlog design, non commit automatico. Rollout proposto in 3 sprint slice M14-A/M14-B/M15 (documento ricerca)
- **Session timing reset**: comportamento salvato in memory (non codice), applicabile cross-session

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

1. **TKT-M11B-06 playtest live** (userland, 2-4h sessione con 2-4 amici) — unico bloccante P5 🟢 definitivo
2. **M13 P3 Phase B balance pass N=10** (autonomous, ~3h) + **M13 P6 Phase B calibration N=10 hardcore 07** (autonomous, ~2h userland run)
3. **Sprint Triangle Strategy slice M14-A** (autonomous, ~8h): Mechanic 3 elevation/facing + Mechanic 4 terrain chain reactions (focus pilastro 1 Tattica, vedi `docs/research/triangle-strategy-transfer-plan.md` sezione "Suggested rollout")
