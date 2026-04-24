# BACKLOG — Evo-Tactics

> **Scope**: backlog prioritizzato ticket aperti + residui sprint.
> **Sorgente canonical**: CLAUDE.md sezione "Sprint context" + sprint doc in `docs/process/`.
> **Aggiornamento**: on-demand quando chiudi/apri un ticket. Sprint close aggiorna anche CLAUDE.md summary.
> **Ref template**: `04_BOOTSTRAP_KIT/BACKLOG.md` archivio.

---

## 🔴 Priorità alta (bloccanti o sbloccanti)

### Userland (richiede azione umana)

- [ ] **TKT-M11B-06** — Playtest live 2-4 amici post PR #1730. Unico bloccante P5 🟢 definitivo. Seguire `docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md`. ~2-4h sessione.
- [ ] **Playtest round 2** — retest post PR #1730 con browser Ctrl+Shift+R (cache bust). Residuo: narrative log prose feature M18+ (gap non-bug).

### Autonomous (Claude Code può fare)

- [ ] **M13 P3 Phase B** — balance pass N=10 post XP grant hook. ~3h. Chiude Pilastro 3 🟢 definitivo.
- [ ] **M13 P6 Phase B calibration** — N=10 hardcore 07 via `tools/py/batch_calibrate_hardcore07.py`. ~2h (parte userland). Chiude Pilastro 6 🟢 definitivo.

---

## 🟡 Priorità media

### Bug / tech debt identificati

- [ ] **TKT-06** — `predict_combat` ignora `unit.mod` stat → damage 0 pattern falsi positivi
- [ ] **TKT-07** — Tutorial sweep #2 N=10/scenario post telemetry fix (blocked by TKT-06)
- [ ] **TKT-08** — Backend stability under batch (morì run #14 batch N=30)
- [ ] **TKT-09** — `ai_intent_distribution` non emessa via `/round/execute` response
- [ ] **TKT-10** — Harness retry+resume incrementale (JSONL write per-run)
- [ ] **TKT-11** — `predict_combat` 8p aggregate sanity boss vs full party

### Triangle Strategy transfer (design-driven, new)

Da `docs/research/triangle-strategy-transfer-plan.md` — 10 meccaniche identificate, rollout 3 sprint slice:

- [ ] **M14-A** — Mechanic 3 (elevation + facing) + Mechanic 4 (terrain chain reactions fire/ice/water/lightning). Effort M. ~8h. Target Pilastro 1 Tattica.
- [ ] **M14-B** — Mechanic 1 (Conviction → MBTI axis reveal) + Mechanic 2 (Scales of Conviction → M18 world_setup upgrade). Effort L. ~12h. Target Pilastro 4 MBTI.
- [ ] **M15** — Mechanic 7 (Initiative CT bar / Wait action) + Mechanic 6 (class promotion XCOM-style). Effort L. ~15h. Target Pilastro 3 Specie×Job.

### Sprint 3 archivio (chiude readiness 24/24)

- [x] BACKLOG.md file root (questo)
- [x] OPEN_DECISIONS.md root (vedi file)
- [ ] Master orchestrator decision formalizzata (deferred a sessione successiva via ADR o note inline)

---

## 🟢 Priorità bassa

### Research / exploratory

- [ ] **P1 skills install** — seguire `docs/guide/claude-code-setup-p1-skills.md` (filesystem/git/github MCP + superpowers + serena). ~35 min userland.
- [ ] **Cherry-pick `wshobson/agents`** bundle — valutare skill specifiche (NON bulk install, context bloat risk).
- [ ] **`Game Balance & Economy Tuning` skill** install (mcpmarket.com) — fit diretto Pilastro 6 calibration, post-playtest round 2.

### Deferred (post-MVP)

- [ ] **V3 Mating/Nido** system — ~20h, post-MVP. Vedi `docs/core/Mating-Reclutamento-Nido.md`.
- [ ] **V6 UI TV dashboard polish** — ~6h, post-playtest live.
- [ ] **M12+ P2 Form evoluzione completa** Spore-core — ~35h, deferred (CLAUDE.md sprint roadmap).

### Tech debt long-term

- [ ] **Python rules engine Phase 2/3** removal — ADR-2026-04-19 kill-python. Phase 2 feature freeze + Phase 3 removal pending (services/rules/).
- [ ] **Prisma room persistence** (Phase C opzionale, default in-memory). Attiva solo se deploy pubblico.
- [ ] **Rate-limit / DoS hardening** (Phase D). Solo se deploy pubblico.
- [ ] **Alt B Game-Database HTTP runtime** attivazione (flag-OFF attuale, vedi `ADR-2026-04-14-game-database-topology.md`).

---

## 🚫 Bloccato da

- **TKT-07** ← TKT-06 (predict_combat fix prima di sweep #2)
- **V6 UI polish** ← TKT-M11B-06 playtest (serve feedback real per priorità UI)
- **M15 Triangle Strategy** ← M14-A + M14-B completati (sequenza rollout)
- **Alt B HTTP runtime** ← Game-Database sibling repo availability + deployment pubblico

---

## Primo sprint consigliato post-merge PR #1732

**Obiettivo**: chiudere Pilastri 5 + 6 🟢 definitivi tramite playtest live.

- **Task 1** (userland, 2-4h): **TKT-M11B-06** playtest live 2-4 amici
- **Task 2** (autonomous post-playtest, ~2h): invoke agent `playtest-analyzer` sui telemetry raccolti
- **Task 3** (autonomous, ~3h): **M13 P3 Phase B balance pass N=10** + **M13 P6 calibration hardcore 07**

**Definition of Done**:

- Playtest completato senza crash
- Analysis report in `docs/playtest/YYYY-MM-DD-playtest-round-2-analysis.md`
- Pilastri 5 + 6 aggiornati a 🟢 (o 🟢c con gap minori documentati) in CLAUDE.md
- TKT-06..11 aggiornati (chiusi o re-prioritizzati con evidenza)

---

## Ref

- CLAUDE.md sezione "Sprint context" e "Pilastri" = dettagli completi stato
- ADR storici: `DECISIONS_LOG.md`
- Sprint doc: `docs/process/sprint-*.md`
- Vision + roadmap: `docs/core/` + `PROJECT_BRIEF.md`
- Triangle Strategy: `docs/research/triangle-strategy-transfer-plan.md`
- Readiness audit: `docs/reports/2026-04-24-repo-autonomy-readiness-audit.md`

## Policy backlog

- **Non ridondare con CLAUDE.md**: questo file è il registro operativo; CLAUDE.md narra sprint chiusi. Evita duplicazioni.
- **Chiusura ticket**: aggiorna qui + sposta in CLAUDE.md "milestone sessione YYYY-MM-DD" quando lo sprint close (via skill `sprint-close`).
- **Apertura ticket**: minimo richiesto = titolo + priorità + scope (autonomous/userland) + blocker se presente.
- **Eccessi da evitare**: non aggiungere ticket senza ownership o criterio di successo. "Refactor X quando possibile" ≠ ticket.
