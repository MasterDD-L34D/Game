# TASK_PROTOCOL — Evo-Tactics

> **Scope**: ordine standard con cui Claude Code lavora su ogni task non banale.
> **Sorgente template**: `07_CLAUDE_CODE_OPERATING_PACKAGE/TASK_EXECUTION_PROTOCOL.md` archivio, adattato a Evo-Tactics.
> **Quando saltare**: task triviali (typo, rename <5 occurrences, 1-line fix). Altrimenti segui.
> **Integrazione**: questo protocollo è il "come" del 4-gate DoD (vedi CLAUDE.md "DoD nuovi agent / skill / feature").

---

## Sequenza base (7 fasi)

### Fase 0 — Orientamento (30 sec)

- Working dir verificata (prompt iniziale + `pwd` se dubbi)
- Branch corrente + sync `git status --short` + `git log --oneline -3`
- Archivio operativo identificato (`C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/`) — quando rilevante
- File canonici identificati (PROJECT_BRIEF, COMPACT_CONTEXT, DECISIONS_LOG, CLAUDE.md)

### Fase 1 — Lettura minima obbligatoria

Ogni task consulta **almeno** questi file prima di iniziare (con offset/limit se grossi):

- `CLAUDE.md` — guardrail, DoD, sprint context (sempre già in contesto via claudeMd)
- `COMPACT_CONTEXT.md` — stato sessione (cosa è stato fatto di recente)
- `PROJECT_BRIEF.md` — solo se task è strategico / vision-sensitive
- `DECISIONS_LOG.md` — solo se task tocca area con ADR esistenti
- `MEMORY.md` (in `~/.claude/projects/.../memory/`) — caricata auto a inizio sessione
- File/area specifica del task (via grep + Read con offset)

Se mancano file canonici: segnala + crea versione iniziale se il task lo richiede (vedi Sprint 0 adozione archivio 2026-04-24).

### Fase 2 — Mappa del task

Per ogni task, prima di toccare codice, chiarisci internamente:

- **Obiettivo reale**: cosa deve funzionare a fine task (metrica success)
- **Livello coinvolto**: game (design) / system (backend/runtime) / repo (docs/config/CI)
- **File e moduli toccati**: lista esatta, via grep preventivo
- **Rischio**: locale/reversibile (green) / contract/guardrail (yellow) / runtime/gameplay-core (red)
- **Test/verifiche necessarie**: prettier, governance, AI tests, smoke test (per agent/skill)
- **Regola 50 righe**: se >50 LOC nuove fuori da `apps/backend/` → **ferma, segnala, aspetta**

### Fase 3 — Analisi (prima di cambiare)

Domande minime (answer mentally or in plan doc):

- Cosa regge davvero questo pezzo nel runtime corrente?
- Quale vincolo CLAUDE.md / ADR / contract supporta?
- È simulation / orchestration / adapter / presentation layer? (separazione architetturale)
- Il cambiamento è locale o propaga? (ripple analysis via schema-ripple agent se contracts)
- Esiste già un punto migliore in cui intervenire? (evita aggiungere quando puoi modificare esistente)

### Fase 4 — Piano minimo

Prima di toccare codice o file critici, scrivi un micro-piano. Formato:

```markdown
## Piano task [nome]

1. **Cosa cambio**: path file + sezione
2. **Perché lo cambio**: ref ADR/ticket/vincolo
3. **Cosa NON tocco**: scope cut esplicito (guardrail sprint)
4. **Come verifico**: test/command specifico
```

Per task >50 LOC o multi-file: usa TodoWrite per tracciare fasi. Mark in_progress uno alla volta.

### Fase 5 — Esecuzione

- Applica solo il cambiamento necessario (no refactor ampio nella stessa run)
- Un cambio per commit quando possibile (atomic, revertable)
- Parallelize Read/Grep/Bash indipendenti in singola message (tool use in parallelo)
- Non usare `git add -A` o `git add .` — sempre file espliciti
- Husky hook applica prettier auto al commit (non devi forzare)

### Fase 6 — Verifica (DoD gate)

Ogni task "done" deve passare almeno:

1. ✅ `npx prettier --check <file>` verde
2. ✅ `python tools/check_docs_governance.py --strict` 0 errors (se touch docs/)
3. ✅ `node --test tests/ai/*.test.js` 307/307 (se touch AI/session)
4. ✅ `git status --short` pulito post-commit
5. ✅ Smoke test eseguito (se nuovo agent/skill — policy 4-gate DoD)
6. ✅ Agent `schema-ripple` consultato (se touch `packages/contracts/`)

Se touch `vcScoring.js` o `policy.js` → aggiorna `docs/architecture/ai-policy-engine.md`.
Se touch `services/rules/` → aggiorna `docs/hubs/combat.md`.

### Fase 7 — Aggiornamento memoria

Dopo ogni task significativo, aggiorna:

- `COMPACT_CONTEXT.md` — snapshot stato corrente (sempre)
- `DECISIONS_LOG.md` — solo se nuova ADR mergiata
- Memory files (`~/.claude/projects/.../memory/`) — se emerso pattern cross-session
- `CLAUDE.md` sprint context — a fine sprint (via skill `sprint-close`)

---

## Protocolli speciali

### Task di refactor

1. Mappa il confine del refactor (grep + diff preview)
2. Identifica se tocca gameplay assumptions (simulation layer) → checkpoint user
3. Se sì, apri ADR o plan doc prima di toccare codice
4. Crea report in `docs/reports/refactor-YYYY-MM-DD-<slug>.md`
5. Esegui solo il primo boundary ad alto leverage (non tutto in un colpo)

### Task di design-repo (gioco + repo)

Se il task riguarda gameplay + architettura insieme:

1. Estrai **game truths** (da PROJECT_BRIEF + `docs/core/*`)
2. Estrai **system truths** (da ADR + `apps/backend/services/`)
3. Verifica se il repo serve le truths o le tradisce (skill `first-principles-game`)
4. Solo dopo, modifica il repo

### Task di sprint

Per avviare nuovo sprint:

1. Conferma obiettivo sprint (linka ticket/vision-gap)
2. Conferma file attesi (deliverable list)
3. Conferma DoD (test verdi, prettier, governance)
4. Spezza in task piccoli (TodoWrite)
5. Esegui un task alla volta (one in_progress)
6. A fine sprint: skill `sprint-close` per DoD completo + update CLAUDE.md

### Task di nuovo agent/skill/feature

Policy 4-gate DoD mandatoria (CLAUDE.md + memory):

1. **Gate 1 — Research**: grep real paths, prior art, use case
2. **Gate 2 — Smoke test**: general-purpose agent con critique USABLE/NEEDS-FIX/REWRITE
3. **Gate 3 — Tuning**: apply critique line-by-line
4. **Gate 4 — Optimization**: context efficiency + prompt density + anti-pattern guards

Vedi `~/.claude/projects/.../memory/feedback_smoke_test_agents_before_ready.md` per dettagli + eccezioni.

---

## Anti-patterns (da CLAUDE.md + lessons)

- ❌ Non committare amend a commit già pubblicati
- ❌ Non push senza richiesta esplicita (blast radius esterno)
- ❌ Non touch `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/` senza segnalare
- ❌ Non aggiungere deps npm/pip senza approvazione
- ❌ Non hardcodare trait logic nel resolver — solo in `data/core/traits/active_effects.yaml`
- ❌ Non `git add -A` — sempre file espliciti (protegge da commit accidentale di secrets/binari)
- ❌ Non saltare smoke test per nuovi agent (policy 4-gate DoD)
- ❌ Non assumere path files da CLAUDE.md — grep sempre per verificare (lesson coop-phase-validator 2026-04-24)

---

## Ref

- Sorgente: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/07_CLAUDE_CODE_OPERATING_PACKAGE/TASK_EXECUTION_PROTOCOL.md`
- Policy 4-gate DoD: `CLAUDE.md` sezione "DoD nuovi agent / skill / feature"
- Safe changes whitelist: `.claude/SAFE_CHANGES.md`
- Model routing: `MODEL_ROUTING.md`
