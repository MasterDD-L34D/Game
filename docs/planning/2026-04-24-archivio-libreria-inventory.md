---
title: Archivio Libreria Operativa — Inventario per Evo-Tactics
workstream: cross-cutting
status: draft
owners:
  - eduardo
created: 2026-04-24
updated: 2026-04-24
audience:
  - claude-code-users
  - project-leads
tags:
  - archive
  - inventory
  - integration-plan
  - bootstrap-kit
  - prompt-library
summary: >
  Deep-scan inventario di `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/`
  (7 subdir, 40+ file) classificati per rilevanza sul monorepo Evo-Tactics. Identifica
  asset pronti da adottare, gap critici (PROJECT_BRIEF/COMPACT_CONTEXT/DECISIONS_LOG mancanti),
  piano d'integrazione in 3 sprint (~10-13h totali). Non installa niente — richiede approvazione utente.
---

# Archivio Libreria Operativa — Inventario per Evo-Tactics

**Scope**: inventariare l'archivio operativo (`C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/`) e mapparlo sui bisogni concreti del monorepo Evo-Tactics (`C:/Users/edusc/Desktop/gioco/Game/`). L'archivio è una "libreria operativa universale" costruita in chat per sostenere workflow multi-AI (NotebookLM → ChatGPT → Claude Code) e refactoring game repo.

**Status**: **READY TO ADOPT** — materiale production-ready, niente da sviluppare, solo copiare + adattare.

**Decisione pendente**: approvazione integrazione in 3 sprint sequenziali. Nessun file creato in Evo-Tactics prima di OK utente.

---

## Executive Summary (30-second read)

- **7 subdir** esplorate: 00_START_HERE, 01_MASTER_INDEX, 02_LIBRARY (6 moduli), 03_REFERENCE, 04_BOOTSTRAP_KIT (9 file), 05_TEMPLATE_REALI_PROMPTATI (9 file), 06_WORKFLOWS_AND_CHECKLISTS, 07_CLAUDE_CODE_OPERATING_PACKAGE (9 file).
- **3 file critici mancanti in Evo-Tactics**: `PROJECT_BRIEF.md`, `COMPACT_CONTEXT.md`, `DECISIONS_LOG.md` (da 04_BOOTSTRAP_KIT/). Aggiungeranno il 70% del valore con ~3h setup.
- **Pattern ricorrente**: ogni subdir ha un suo `00_START_HERE.md` + `01_*_INDEX.md` + moduli numerati. Replicabile.
- **Filosofia**: "Autonomia alta, libertà distruttiva bassa" — `07_CLAUDE_CODE_OPERATING_PACKAGE/` allinea esattamente la nostra esigenza Auto Mode + guardrail CLAUDE.md.
- **ROI**: ogni file bootstrap-kit salva 2-3h per future sessioni Codex.

---

## Top 10 Asset da Integrare (ranked by impact)

| #   | Asset (archivio)                                              | Destinazione Evo-Tactics                  | Tipo      | Copy-ready | Effort |
| --- | ------------------------------------------------------------- | ----------------------------------------- | --------- | ---------- | ------ |
| 1   | `04_BOOTSTRAP_KIT/COMPACT_CONTEXT.md`                         | Root `/COMPACT_CONTEXT.md`                | Bootstrap | 🔥 YES     | 30 min |
| 2   | `04_BOOTSTRAP_KIT/PROJECT_BRIEF.md`                           | Root `/PROJECT_BRIEF.md`                  | Bootstrap | 🔥 YES     | 1 h    |
| 3   | `04_BOOTSTRAP_KIT/DECISIONS_LOG.md`                           | Root `/DECISIONS_LOG.md` (link docs/adr/) | Bootstrap | 🔥 YES     | 1 h    |
| 4   | `07_CLAUDE_CODE_OPERATING_PACKAGE/CLAUDE_OPERATING_RULES.md`  | `.claude/OPERATING_RULES.md`              | Rules     | 🔥 YES     | 30 min |
| 5   | `07_CLAUDE_CODE_OPERATING_PACKAGE/TASK_EXECUTION_PROTOCOL.md` | `.claude/TASK_PROTOCOL.md`                | Protocol  | 🔥 YES     | 30 min |
| 6   | `07_CLAUDE_CODE_OPERATING_PACKAGE/SAFE_CHANGES_ONLY.md`       | `.claude/SAFE_CHANGES.md`                 | Whitelist | 🔥 YES     | 30 min |
| 7   | `02_LIBRARY/03_First_Principles_Repo_Game_Claude_Code.md`     | Link in `CLAUDE.md` "Reference" section   | Protocol  | 📋 LINK    | 15 min |
| 8   | `05_TEMPLATE_REALI_PROMPTATI/*.prompt.md` (9 file)            | `.claude/prompts/`                        | Prompts   | 🔥 YES     | 1 h    |
| 9   | `04_BOOTSTRAP_KIT/MODEL_ROUTING.md`                           | Root `/MODEL_ROUTING.md`                  | Routing   | 🔥 YES     | 1.5 h  |
| 10  | `06_WORKFLOWS_AND_CHECKLISTS/*`                               | `.claude/workflows/`                      | Workflow  | 🔥 YES     | 30 min |

**Totale stimato**: ~8-10h spalmate su 3 sprint.

---

## Inventario per subdirectory

### 00_START_HERE + 01_MASTER_INDEX (entrypoint)

| File                 | Scopo (1 riga)                                           | Azione Evo-Tactics                 |
| -------------------- | -------------------------------------------------------- | ---------------------------------- |
| `00_START_HERE.md`   | Guida d'ingresso con ordine di lettura consigliato       | 📚 Reference. Link in `CLAUDE.md`. |
| `01_MASTER_INDEX.md` | TOC completo dei 6 moduli library + bootstrap + template | 📚 Reference. Link in `CLAUDE.md`. |

### 02_LIBRARY — Manuale operativo (6 moduli, ~2200 righe)

| File                                                           | Contenuto principale                                                                                                       | Azione Evo-Tactics                                                                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `01_Foundation_and_System.md` (4.5 KB)                         | Principi guida, struttura cartelle, file base, prompt madre, mappa decisionale                                             | 📚 Reference. Già implicito in CLAUDE.md.                                                                                   |
| `02_Modules_Starter_Packs_and_Best_Of.md` (10.7 KB)            | Moduli verticali, starter pack, prompt best-of, varianti IT                                                                | 📋 Cherry-pick 2-3 starter pack utili                                                                                       |
| `03_First_Principles_Repo_Game_Claude_Code.md` (13.5 KB)       | 🔥 Protocollo first-principles per refactoring repo game (preflight, vincoli, prompt, iter, anti-pattern, template output) | 🔥 Link diretto in CLAUDE.md sezione "Process"; già allineato con `anthropic-skills:first-principles-game` skill installata |
| `04_MultiAI_Routing_NotebookLM_ChatGPT_Claude_Code.md` (12 KB) | 🔥 Routing NotebookLM/ChatGPT/Claude Code, prompt ponte, workflow completi                                                 | 🔥 Link in CLAUDE.md, copia in `docs/process/multi-ai-routing.md`                                                           |
| `05_Prompt_Library_and_Reference_System.md` (21 KB)            | Prompt estratti catalogati, sistema archiviazione reference                                                                | 📋 Cherry-pick prompt rilevanti → `.claude/prompts/`                                                                        |
| `06_OpenCode_Ollama_Local_Cloud_Workflow.md` (4.6 KB)          | Setup OpenCode + Ollama, routing locale/cloud, regole per modelli                                                          | 📚 Reference (fuori scope attuale: non usiamo OpenCode/Ollama)                                                              |

**Top pick**: file `03` + `04` — protocolli già testati, direttamente adottabili.

### 03_REFERENCE — Materiale sorgente

| File                                            | Contenuto                                  | Azione                                                              |
| ----------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| `01_Trascrizione_Completa_Screenshot.md`        | Trascrizione sorgente screenshot originali | 📚 Reference-only                                                   |
| `02_Prompt_Estratti_Catalogati.md`              | Prompt OCR da screenshot, catalogati       | 📋 Cherry-pick rilevanti                                            |
| `03_OCR_RAW/`                                   | OCR grezzi                                 | 🗑️ Skip                                                             |
| `04_SCREENSHOTS_ORIGINALI/`                     | PNG/JPG originali                          | 🗑️ Skip                                                             |
| `07_Trascrizione_Screen_OpenCode_Ollama.md`     | Screen OpenCode/Ollama                     | 🗑️ Skip (fuori scope)                                               |
| `08_OpenCode_Ollama_Model_Routing_Extracted.md` | Routing estratto                           | 🗑️ Skip                                                             |
| `09_First_Principles_Game_Design_Analysis.md`   | Analisi game design first-principles       | 📋 Cherry-pick se rilevante (rischio duplicato con `02_LIBRARY/03`) |

### 04_BOOTSTRAP_KIT — 🔥 I 7+2 file base di ogni progetto

Questo è l'asset più prezioso dell'archivio. Struttura pensata per essere adottata blocco. I 9 file:

| File (bootstrap)     | Scopo                                                        | Presente in Evo-Tactics?                                      | Azione                             |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------- |
| `PROJECT_BRIEF.md`   | Identità progetto: visione, scope, scadenze, stakeholder     | ❌ NO (pezzi sparsi in CLAUDE.md + `docs/core/01-VISIONE.md`) | 🔥 **Creare** (Sprint 0, P0)       |
| `COMPACT_CONTEXT.md` | Snapshot compresso: stato attuale, prossime 3 mosse, blocchi | ❌ NO                                                         | 🔥 **Creare** (Sprint 0, P0)       |
| `DECISIONS_LOG.md`   | Decisioni chiave con data/contesto/alternative scartate      | ⚠️ Parziale (`docs/adr/*` ma scattered)                       | 🔥 **Creare index** (Sprint 0, P0) |
| `MASTER_PROMPT.md`   | Prompt madre riutilizzabile per far partire sessioni         | ⚠️ Implicito in CLAUDE.md                                     | 📋 Estrarre se utile               |
| `MODEL_ROUTING.md`   | Quale AI per quale fase (NotebookLM/ChatGPT/Claude/Codex)    | ❌ NO                                                         | 🔥 **Creare** (Sprint 1, P1)       |
| `BACKLOG.md`         | Ticket aperti + priorità P0/P1/P2                            | ⚠️ Parziale (CLAUDE.md "Backlog ticket aperti")               | 📋 Estrarre + sync                 |
| `CHECKLIST.md`       | Definition of Done riutilizzabile                            | ✅ Esiste (CLAUDE.md "Definition of Done")                    | 📚 Reference                       |
| `INDEX.md`           | TOC progetto                                                 | ✅ Esiste (`docs/00-INDEX.md`)                                | 📚 Skip                            |
| `LIBRARY.md`         | Link a asset esterni + reference                             | ❌ NO                                                         | 📋 Creare (Sprint 2, P2)           |

**Gap critico**: mancano `PROJECT_BRIEF`, `COMPACT_CONTEXT`, `DECISIONS_LOG`. Questi 3 file risolvono il problema #1 di ogni sessione Codex: "che cos'è questo progetto, dove siamo, cosa abbiamo deciso?".

### 05_TEMPLATE_REALI_PROMPTATI — 9 prompt pronti da usare

Prompt battle-tested per scenari ricorrenti. Formato `.prompt.md` = file copiabile direttamente in ChatGPT/Claude/Codex.

| File                                           | Scenario                           | Valore per Evo-Tactics                                            |
| ---------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| `01_Bootstrap_Nuovo_Progetto.prompt.md`        | Avvio progetto nuovo               | 🗑️ Skip (abbiamo già Evo-Tactics)                                 |
| `02_Refactoring_Repo_Esistente.prompt.md`      | Refactoring repo                   | 🔥 Riusabile (token optimization sprint, session.js split)        |
| `03_Game_Design_First_Principles.prompt.md`    | Audit design da zero               | 🔥 Usato già via skill `first-principles-game`                    |
| `04_MultiAI_Workflow.prompt.md`                | Flow NotebookLM → ChatGPT → Claude | 📋 Utile per research phases (Triangle Strategy, pattern esterni) |
| `05_Sprint_Planning.prompt.md`                 | Prompt sprint planning             | 🔥 Integra con `sprint-close` skill                               |
| `06_Code_Review_Structured.prompt.md`          | Review PR sistematica              | 📋 Cherry-pick in `.claude/prompts/`                              |
| `07_Documentation_Authoring.prompt.md`         | Scrittura docs guidata             | 📋 Ridondante con `doc-coauthoring` design plugin                 |
| `08_Research_Synthesis.prompt.md`              | Sintesi corpus research            | 📋 Ridondante con `research-synthesis` skill                      |
| `09_First_Principles_Game_Checklist.prompt.md` | Checklist first-principles game    | 🔥 Adotta in `docs/guide/first-principles-checklist.md`           |

**Top pick**: `02`, `04`, `05`, `09`. Copia in `.claude/prompts/` come file `.prompt.md` invocabili.

### 06_WORKFLOWS_AND_CHECKLISTS — Workflow compatti

(3 file, contenuto esatto da verificare al momento dell'integrazione)

- Workflow rapido game repo (prob. collegato a `02_LIBRARY/03`)
- Workflow multi-AI completo (prob. collegato a `02_LIBRARY/04`)
- Checklist operative

**Azione**: adotta se non duplica già `07_CLAUDE_CODE_OPERATING_PACKAGE/`. Pre-check prima di copiare.

### 07_CLAUDE_CODE_OPERATING_PACKAGE — 🔥 Operating package

Questo è il pezzo più immediatamente utilizzabile. Filosofia: "autonomia alta, libertà distruttiva bassa". Perfettamente aderente al nostro Auto Mode + guardrail CLAUDE.md.

| File                                                 | Scopo                                                                 | Gap Evo-Tactics                                            | Azione                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `00_START_HERE.md`                                   | Entrypoint pacchetto                                                  | n/a                                                        | 📚 Reference                              |
| `CLAUDE_OPERATING_RULES.md` (2.8 KB)                 | Regole operative Claude Code                                          | ⚠️ Implicite in CLAUDE.md, non estratte                    | 🔥 Estrai in `.claude/OPERATING_RULES.md` |
| `TASK_EXECUTION_PROTOCOL.md` (2.4 KB)                | Protocollo 7-fasi per task                                            | ❌ NO                                                      | 🔥 Adotta in `.claude/TASK_PROTOCOL.md`   |
| `SAFE_CHANGES_ONLY.md` (2.2 KB)                      | Whitelist cambi sicuri (docs/refactor OK, gameplay/arch = checkpoint) | ⚠️ Parziale (CLAUDE.md "Guardrail sprint non negoziabili") | 🔥 Adotta in `.claude/SAFE_CHANGES.md`    |
| `CHANGE_BUDGET.md` (2.1 KB)                          | Budget massimo modifiche per task (50 righe rule)                     | ✅ Esiste (CLAUDE.md "Regola 50 righe")                    | 📚 Reference, già codificato              |
| `CLAUDE_CODE_MASTER_ORCHESTRATOR.prompt.md` (2.7 KB) | Prompt orchestratore multi-agent                                      | 📋 Interessante per spawn_task pattern                     | 📋 Cherry-pick                            |
| `SPRINT_00_BOOTSTRAP.md` (1.7 KB)                    | Template sprint 0                                                     | 🗑️ Skip (siamo a Sprint 20+)                               |
| `OPEN_DECISIONS.template.md` (829 B)                 | Template decisioni aperte                                             | 📋 Utile per tracking Open Questions                       |
| `REPO_AUTONOMY_READINESS_CHECKLIST.md` (1.9 KB)      | Checklist "è pronto per autonomia?"                                   | 🔥 Run-once verifica gap                                   |

**Top pick**: `CLAUDE_OPERATING_RULES`, `TASK_EXECUTION_PROTOCOL`, `SAFE_CHANGES_ONLY`. Triade che formalizza ciò che già facciamo implicitamente.

---

## Gap Critici in Evo-Tactics

Mappa file archivio → presenza nel progetto. 🔴 = mancante critico, 🟡 = parziale, ✅ = ok.

| File bootstrap                   | Stato Evo-Tactics | Impatto missing                                                                          | Priorità |
| -------------------------------- | ----------------- | ---------------------------------------------------------------------------------------- | -------- |
| **PROJECT_BRIEF.md**             | 🔴 MANCA          | Identità progetto frammentata su 3+ file (CLAUDE.md, docs/core/01-VISIONE.md, README)    | 🔴 P0    |
| **COMPACT_CONTEXT.md**           | 🔴 MANCA          | Ogni sessione Claude/Codex ripete onboarding da zero                                     | 🔴 P0    |
| **DECISIONS_LOG.md**             | 🟡 PARZIALE       | `docs/adr/*` esiste ma no index cronologico / no "alternatives rejected"                 | 🔴 P0    |
| **MODEL_ROUTING.md**             | 🔴 MANCA          | Routing implicito, nuovo dev non sa quando usare ChatGPT vs Codex vs Claude              | 🟡 P1    |
| **OPERATING_RULES.md**           | 🟡 PARZIALE       | Regole sparse in CLAUDE.md                                                               | 🟡 P1    |
| **TASK_PROTOCOL.md**             | 🔴 MANCA          | No 7-step esplicito (analizza → piano → budget → eseguo → verifico → documento → commit) | 🟡 P1    |
| **SAFE_CHANGES.md**              | 🟡 PARZIALE       | "Guardrail sprint" + "50 righe" ma no whitelist esplicita per categoria                  | 🟡 P1    |
| **LIBRARY.md** (reference index) | 🔴 MANCA          | Reference esterne sparse (questo archivio, SoT doc, repo esterni studiati)               | 🟢 P2    |
| **PROMPT_LIBRARY.md** root       | 🔴 MANCA          | Prompt pattern sparsi in `.claude/`                                                      | 🟢 P2    |

---

## Piano d'integrazione (3 sprint, ~10-13h)

### Sprint 0 — NOW (3-4h)

Obiettivo: risolvere il 70% del gap con 3 file root + 3 file `.claude/`.

1. ✅ Inventario completato (questo doc)
2. 📝 Creare `/PROJECT_BRIEF.md` (1h) — adatta template da `04_BOOTSTRAP_KIT/`, popola con contenuto da:
   - CLAUDE.md (Project overview, Sprint context)
   - `docs/core/01-VISIONE.md`
   - `README.md`
3. 📝 Creare `/COMPACT_CONTEXT.md` (30 min) — estratto top-level stato attuale: sprint in corso, ultimi 5 PR, prossime 3 mosse, blocchi aperti. Target: leggibile in 30 secondi.
4. 📝 Creare `/DECISIONS_LOG.md` (1h) — index cronologico di tutti gli `docs/adr/*.md` con 1-line summary per ciascuno. Auto-generabile via script (tools/py/docs_governance_migrator.py pattern).
5. 📝 Creare `.claude/OPERATING_RULES.md` (30 min) — copia `07_CLAUDE_CODE_OPERATING_PACKAGE/CLAUDE_OPERATING_RULES.md`, adatta a guardrail nostri.
6. 📝 Link in CLAUDE.md sezione "Reference":
   - `PROJECT_BRIEF.md`, `COMPACT_CONTEXT.md`, `DECISIONS_LOG.md`
   - Archivio esterno: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/`

### Sprint 1 — NEXT (4-5h)

Obiettivo: formalizzare protocolli operativi.

7. 📝 Creare `.claude/TASK_PROTOCOL.md` (1h) — adotta `TASK_EXECUTION_PROTOCOL.md` adattato ai nostri pattern (TodoWrite + Agent spawn + DoD).
8. 📝 Creare `.claude/SAFE_CHANGES.md` (30 min) — whitelist esplicita:
   - ✅ docs/, tests/, format/prettier — auto OK
   - ⚠️ apps/backend/services/, packages/contracts/ — checkpoint
   - 🔴 .github/workflows/, migrations/, services/generation/ — veto
9. 📝 Creare `/MODEL_ROUTING.md` (1.5h) — cosa usare per cosa:
   - NotebookLM → analisi corpus research esterno
   - ChatGPT → brainstorm early-phase design
   - Claude Code → implementazione + QA
   - Codex → CI bot commit (tracker refresh)
10. 📝 Creare `.claude/prompts/` dir + copia 4 template `.prompt.md` rilevanti (02, 04, 05, 09) (1h)
11. 📝 Link in CLAUDE.md.

### Sprint 2 — LATER (3-4h)

Obiettivo: chiusura gap secondari.

12. 📝 Creare `/LIBRARY.md` (1h) — index reference esterne: archivio, SoT, repo studiati (wesnoth, xcom, jackbox, long-war, triangle-strategy, ancientbeast, colyseus, utility-ai).
13. 📝 Creare `/PROMPT_LIBRARY.md` (1h) — entrypoint verso `.claude/prompts/` + link a prompt library archivio.
14. 📝 Run `REPO_AUTONOMY_READINESS_CHECKLIST.md` (30 min) — verifica gap residui.
15. 📝 Update `.claude/settings.json` se serve (hooks, allowlist) via skill `update-config`.

### ROI atteso

- **Sprint 0** completato → 70% del valore. Ogni sessione futura parte da COMPACT_CONTEXT in 30 secondi.
- **Sprint 1** completato → 90%. Protocolli formalizzati, safe-changes eliminano rischio distruttivo.
- **Sprint 2** completato → 100%. Library index + prompt library utilizzabili da team allargato.

---

## Anti-pattern da evitare

- **Non copiare tutto in bulk** — l'archivio ha 40+ file; la metà è generica o duplicato. Solo Top 10 + Gap Critici.
- **Non duplicare CLAUDE.md** — PROJECT_BRIEF è un file separato, non un copy-paste di CLAUDE.md. CLAUDE.md linka a PROJECT_BRIEF.
- **Non rifare i protocolli da zero** — adotta testo archivio, adatta solo nomi file/paths.
- **Non toccare docs/adr/** — DECISIONS_LOG è index, non sostituto di ADR singoli.

---

## Raccomandazione finale

**Partire da Sprint 0 ora**: 3-4h di lavoro → 70% del valore. Tutti i file bootstrap sono copy-ready, nessuna decisione architetturale richiesta.

**Prossima azione proposta**: creare `PROJECT_BRIEF.md` + `COMPACT_CONTEXT.md` + `DECISIONS_LOG.md` in un PR dedicato con titolo `chore(bootstrap): adotta archivio libreria operativa (Sprint 0)`.

**In attesa di OK utente per procedere.**
