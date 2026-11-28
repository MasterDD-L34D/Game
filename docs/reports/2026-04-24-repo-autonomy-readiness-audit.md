---
title: Repo Autonomy Readiness Checklist — Audit 2026-04-24
workstream: cross-cutting
status: draft
owners:
  - eduardo
created: 2026-04-24
tags:
  - audit
  - readiness
  - bootstrap
  - archivio
summary: >
  Audit dello stato di prontezza Evo-Tactics per semi-autonomia Claude Code,
  usando la checklist 24-item dall'archivio operativo
  (07_CLAUDE_CODE_OPERATING_PACKAGE/REPO_AUTONOMY_READINESS_CHECKLIST.md).
  Score corrente: 21.5/24 (90%) — "progetto vicino a semi-autonomia reale,
  gap minori". 3 gap residui da chiudere in Sprint 3 (~30-60 min totali).
---

# Repo Autonomy Readiness — Audit Evo-Tactics 2026-04-24

## Verdict sintetico

**Score**: **21.5/24 (90%)** → tier "**progetto vicino a semi-autonomia reale**" (scala archivio 18-24).

**Gap residui (3 item, ~30-60 min fix)**:

1. `BACKLOG.md` file dedicato al root (attualmente sezione dentro CLAUDE.md)
2. `OPEN_DECISIONS.md` template root (non esistente)
3. Decidere se adottare `CLAUDE_CODE_MASTER_ORCHESTRATOR.prompt.md` dall'archivio o marcarlo come "non necessario" (auto mode + TASK_PROTOCOL già coprono caso d'uso)

**Conclusione**: Evo-Tactics è **operabile in semi-autonomia Claude Code oggi**. I 3 gap sono nice-to-have, non blockanti. Post Sprint 2 adoption archivio, siamo al top della scala pratica.

---

## Checklist completa (5 sezioni, 24 item)

### A. Verità canoniche del progetto (3.5/5)

| Check | Status | Evidence |
| --- | :---: | --- |
| `PROJECT_BRIEF.md` utile e non vuoto | ✅ | 92 righe, popolato con identità Evo-Tactics (Sprint 0, commit `e189156d`) |
| `COMPACT_CONTEXT.md` aggiornato | ✅ | Aggiornato oggi (`b77531c2` + Sprint 1) con stato sessione corrente |
| `DECISIONS_LOG.md` con decisioni vere | ✅ | Index di 30 ADR organizzato per data + tag (Sprint 0) |
| `BACKLOG.md` prioritizzato | ⚠️ | Esiste sezione "Backlog ticket aperti" in CLAUDE.md (TKT-06..11 + vision gap residuo) ma no file dedicato. **Gap: creare `BACKLOG.md` root come sync** |
| `OPEN_DECISIONS.md` o template pronto | ❌ | Archivio ha `07_CLAUDE_CODE_OPERATING_PACKAGE/OPEN_DECISIONS.template.md` ma non copiato nel repo |

**Score sezione**: 3.5/5. **Fix proposto** (Sprint 3): estrai BACKLOG in file root + copia OPEN_DECISIONS template.

### B. Leggibilità del repo (5/5)

| Check | Status | Evidence |
| --- | :---: | --- |
| Repo map iniziale | ✅ | CLAUDE.md sezione "Repository layout (high-level)" + README |
| Moduli principali con responsabilità distinguibili | ✅ | `apps/backend/` + `services/` + `packages/contracts/` + `data/` + `docs/` — separation chiara |
| Simulazione non fusa con UI | ✅ | Runtime in `apps/backend/services/` + UI in `apps/play/` (sviluppo) + `docs/mission-console/` (bundle produzione). Boundary netto. |
| Punti di ingresso identificabili | ✅ | `apps/backend/index.js`, `apps/play/src/main.js`, `scripts/`, `tools/py/game_cli.py`, demo launcher `scripts/run-demo-tunnel.cjs` |
| Strategia test minima | ✅ | `node --test` + `pytest` + `playwright`, documentata in CLAUDE.md "Common commands" + CI |

**Score sezione**: **5/5 PERFETTO**.

### C. Prontezza operativa (4/5)

| Check | Status | Evidence |
| --- | :---: | --- |
| Regole operative Claude Code | ✅ | CLAUDE.md completo (~500 righe), Caveman mode, Guardrail, DoD, 4-gate DoD policy |
| Protocollo esecuzione task | ✅ | `.claude/TASK_PROTOCOL.md` 7-fasi (Sprint 1 `9de3ede2`) |
| Regole safe changes | ✅ | `.claude/SAFE_CHANGES.md` 🟢/🟡/🔴 categorizzato (Sprint 1) |
| Change budget | ✅ | CLAUDE.md "Regola 50 righe" + Kill-60 sprint pattern |
| Prompt orchestratore | ❌ | Archivio `07_CLAUDE_CODE_OPERATING_PACKAGE/CLAUDE_CODE_MASTER_ORCHESTRATOR.prompt.md` NON adottato. **Decisione**: necessario o no? Auto mode + TASK_PROTOCOL coprono il caso d'uso dell'orchestratore (task multi-step con checkpoint). Il prompt archivio aggiungerebbe un layer "start-session orchestrator prompt" che attualmente non serve. |

**Score sezione**: 4/5. **Raccomandazione**: segnare item "Prompt orchestratore" come **non applicabile** (coperto da auto mode + TASK_PROTOCOL) → effettivo score 4/4 = 5/5 relativo.

### D. Prontezza first principles (5/5)

| Check | Status | Evidence |
| --- | :---: | --- |
| Verità del gioco abbozzate | ✅ | `docs/core/01-VISIONE.md` + 6 Pilastri in CLAUDE.md + `docs/core/90-FINAL-DESIGN-FREEZE.md` |
| Verità del sistema | ✅ | 30 ADR (`docs/adr/`) + `docs/hubs/` (7 workstream entrypoints) |
| Verità del repo | ✅ | CLAUDE.md "Repository layout" + "Architecture notes" + `docs/planning/SoT-v4` |
| Checklist first-principles compilabile | ✅ | `.claude/prompts/09_first_principles_checklist.prompt.md` (Sprint 1) + skill `anthropic-skills:first-principles-game` installata |
| Strategia migrazione / ipotesi forte | ✅ | `docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md` + `ADR-2026-04-19-kill-python-rules-engine.md` (Phase 2/3 pianificate) + Triangle Strategy transfer plan (3-slice rollout M14-A/M14-B/M15) |

**Score sezione**: **5/5 PERFETTO**.

### E. Routing strumenti (4/4)

| Check | Status | Evidence |
| --- | :---: | --- |
| `MODEL_ROUTING.md` esistente | ✅ | Root, compilato per Evo-Tactics (Sprint 1 `9de3ede2`) |
| Chiaro quando usare NotebookLM / ChatGPT / Claude Code | ✅ | MODEL_ROUTING tabella "Routing per fase" + "Routing per scenario comune" |
| Chiaro locale vs cloud | ✅ | MODEL_ROUTING sezione "Policy locale / cloud" |
| Regole anti-caos | ✅ | MODEL_ROUTING sezione "Regole anti-caos" (5 regole esplicite) |

**Score sezione**: **4/4 PERFETTO**.

---

## Score totale: 21.5/24 (90%)

Interpretazione archivio (scala lineare):

- 0-9: non operabile ancora da Claude Code, serve Sprint 00
- 10-17: Claude Code aiuta ma serve guardrail forte
- **18-24: progetto è vicino a semi-autonomia reale** ← **siamo qui**
- 25+: semi-autonomia reale con supervisione minima (tier immaginario, scala max 24)

### Traduzione pratica

- ✅ Claude Code può lavorare in auto mode su task locali/reversibili senza supervision continua
- ✅ Decisioni gameplay/architettura richiedono ancora checkpoint (codificato in SAFE_CHANGES.md 🔴)
- ✅ Nuovi asset passano 4-gate DoD automatico (codificato in CLAUDE.md)
- ⚠️ Gap: 3 file nice-to-have (BACKLOG, OPEN_DECISIONS, orchestratore decisione)

### Sprint 3 proposto (deferred, ~30-60 min)

Se vuoi chiudere i 3 gap:

1. **`BACKLOG.md` root** (15 min) — estrai sezione "Backlog ticket aperti" di CLAUDE.md in file dedicato, mantieni CLAUDE.md con link
2. **`OPEN_DECISIONS.md` root** (10 min) — copia template `07_CLAUDE_CODE_OPERATING_PACKAGE/OPEN_DECISIONS.template.md`, popola con Open Questions attuali (Q52 P2 chiusa, V3/V6 deferred, ecc.)
3. **Decisione master orchestrator** (5 min) — ADR o nota in CLAUDE.md: "Master orchestrator coperto da auto mode + TASK_PROTOCOL, template archivio non adottato". Chiude il gap dichiarativamente.

**Totale Sprint 3**: ~30-60 min, porta a score 24/24. Non blockante.

---

## Conclusione

**Evo-Tactics è READY per semi-autonomia Claude Code OGGI**. La policy 4-gate DoD + SAFE_CHANGES + TASK_PROTOCOL forniscono il framework. I 3 gap minori sono perfetti per un future Sprint 3 quando avrai bandwidth.

**Raccomandazione**: accetta PR #1732 (Sprint 0 + 1 + 2 + policy + 2 agent + skill + research). Sprint 3 deferred, non urgente.

## Ref

- Checklist originale: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/07_CLAUDE_CODE_OPERATING_PACKAGE/REPO_AUTONOMY_READINESS_CHECKLIST.md`
- Bootstrap files: `PROJECT_BRIEF.md`, `COMPACT_CONTEXT.md`, `DECISIONS_LOG.md`, `MODEL_ROUTING.md`, `LIBRARY.md`, `PROMPT_LIBRARY.md`
- Operating: `.claude/TASK_PROTOCOL.md`, `.claude/SAFE_CHANGES.md`, `.claude/prompts/`
- Memory: `~/.claude/projects/.../memory/project_archivio_adoption_status.md`
