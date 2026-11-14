# SAFE_CHANGES — Evo-Tactics

> **Scope**: cosa Claude Code può cambiare senza approvazione esplicita vs cosa richiede checkpoint.
> **Sorgente**: `07_CLAUDE_CODE_OPERATING_PACKAGE/SAFE_CHANGES_ONLY.md` archivio, adattato con guardrail Evo-Tactics.
> **Integrazione**: complementa CLAUDE.md "Guardrail sprint" + "Regola 50 righe" + 4-gate DoD.
> **Regola pratica**: se dubbi, documenta + proponi default + apri discussione, non fermare.

---

## 🟢 CHE PUÒ FARE senza approvazione (safe)

### Documentazione operativa

- Creare o aggiornare file in `docs/` con frontmatter valido
- Aggiornare `PROJECT_BRIEF.md`, `COMPACT_CONTEXT.md`, `DECISIONS_LOG.md` (bootstrap root)
- Aggiornare `BACKLOG` references in CLAUDE.md
- Aggiungere nuovi ADR in `docs/adr/` (nuova decisione documentata)
- Creare playtest/QA report in `docs/playtest/` o `docs/qa/`
- Creare planning doc in `docs/planning/`
- Aggiornare `MEMORY.md` index + aggiungere nuovi memory file

### Struttura di supporto

- Aggiungere sottocartelle in `docs/` (reports, plans, sprints) se mancano
- Normalizzare frontmatter esistente
- Creare template in `docs/guide/templates/`
- Aggiungere `.claude/prompts/*.prompt.md` (prompt templates riusabili)

### Refactor locali a basso rischio

- Estrarre funzioni pure (no side-effect)
- Separare simulation/presentation su boundary locale
- Migliorare naming locale se non rompe contract esterno
- Aggiungere test attorno a logica esistente (TDD-on-existing)
- Isolare stato o logica deterministic-friendly
- **Limite**: <50 LOC nuove totali e 1 file o fino a 3 file connessi

### Sicurezza e manutenzione

- Rimuovere codice morto chiaramente non referenziato (grep verifica 0 ref)
- Aggiungere commenti strutturali SOLO se WHY non-obvious (vedi CLAUDE.md regola commenti)
- Creare baseline test o smoke check per modulo senza coverage
- Documentare debito tecnico in `docs/planning/` o ADR

### Skill + agent locali

- Creare nuovi file `.claude/skills/*.md` (se passano 4-gate DoD)
- Creare nuovi file `.claude/agents/*.md` (se passano 4-gate DoD)
- Aggiornare skill/agent esistenti per fix (path drift, typo, anti-pattern)

### Formatting e lint

- Prettier `--write` sui file che tocchi
- Fix warning `docs-governance` minori (frontmatter typo, tag sbagliato)

---

## 🟡 CHE RICHIEDE CHECKPOINT (user approval)

### Gameplay core

- Cambiare round flow (`apps/backend/services/roundOrchestrator.js`)
- Cambiare initiative/reaction logic
- Cambiare win/loss conditions (`apps/backend/services/combat/objectiveEvaluator.js`)
- Cambiare informazioni visibili ai giocatori (fog of war, threat preview)
- Cambiare struttura decisioni interessanti (AP budget, reaction cap, SG pool)
- Cambiare VC scoring (`apps/backend/services/vcScoring.js`)
- Cambiare AI policy (`apps/backend/services/ai/`)

### Architettura a rischio alto

- Spostare molti moduli contemporaneamente (>3 file mossi)
- Introdurre nuovi layer astratti non giustificati
- Riscrivere core systems senza piano di migrazione (ADR)
- Cancellare sistemi ancora ambigui ma forse centrali

### Product / scope

- Cambiare priorità roadmap (CLAUDE.md "Pilastri di design")
- Tagliare feature centrali senza ADR
- Trasformare prototipo in direzione diversa dalla vision corrente (docs/core/01-VISIONE.md)

### Performance / breaking

- Cambiare schema `packages/contracts/` (ripple su backend + mock + dashboard)
- Modificare endpoint pubblici esistenti (`/api/...`) in modo incompatibile
- Cambiare port default backend (attuale 3334, ADR-2026-04-14)

---

## 🔴 VIETATO senza approvazione esplicita (hard gate)

### Guardrail sprint (CLAUDE.md non negoziabili)

- `.github/workflows/` — CI/CD pipelines
- `migrations/` — schema DB
- `packages/contracts/` — schema condivisi (ripple grande)
- `services/generation/` — generatore specie, pipeline separata

### Dipendenze

- Nuove deps npm (`package.json` + `package-lock.json`)
- Nuove deps Python (`tools/py/requirements*.txt`)
- Upgrade major version (Node, Python, Prisma, xstate, ecc.)

### Git destructive

- `git push --force` su qualsiasi branch
- `git reset --hard` non solo per scartare uncommitted
- `git rebase -i` interactive
- `git commit --amend` su commit pushati
- `git branch -D` (force delete)
- `rm -rf` o `git clean -f` su paths non tmp
- `git push` qualsiasi, senza richiesta esplicita user

### Sensitive data

- Committare `.env`, credentials, token, chiavi API
- Committare file in `reports/backups/**` (archive esterno, vedi `docs/planning/REF_BACKUP_AND_ROLLBACK.md`)
- Committare file `logs/demo-*.log`, `tmp/`, memory files personali

### Settings

- Modificare `.claude/settings.json` o `settings.local.json` senza skill `update-config` + OK user
- Modificare `~/.claude/settings.json` (global, affects all sessions)
- Installare plugin/MCP server senza OK
- Cambiare keybindings global senza OK

---

## Regola pratica (decision tree)

Il cambiamento è:

- **Locale** (1-3 file, scope ristretto)?
- **Reversibile** (`git revert` pulito, no data migration)?
- **Testabile** (ha test oppure aggiungo test minimo)?
- **Coerente** con file canonici (CLAUDE.md, ADR, contracts)?
- **Ad alto leverage** (fix bug reale, non speculativo)?

**5/5 SÌ → SAFE, procedi.**

Se anche uno solo è:

- **Ampio** (>50 LOC nuove, >3 file)
- **Irreversibile** (migration, contract breaking)
- **Poco testabile** (manual QA only)
- **Vision-sensitive** (tocca roadmap/pilastri)
- **Effetti secondo ordine** (breaking consumer a valle)

**→ NON SAFE senza gate. Checkpoint user + ADR + piano.**

---

## Azione in caso di dubbio

**NON fermarti subito.** Flow preferito:

1. **Documenta l'ambiguità** in plan doc o inline
2. **Proponi default migliore** con reasoning (1 sentence)
3. **Continua su parti non bloccate** (altri task parallel)
4. **Apri `OPEN_DECISIONS.md`** (template in archivio `07_CLAUDE_CODE_OPERATING_PACKAGE/OPEN_DECISIONS.template.md`) o issue su GitHub
5. **Segnala a user** con 2-3 opzioni + raccomandazione

**Eccezione**: se dubbio è su azione destructive (push, delete, schema migration), **ferma e chiedi**. Auto mode non autorizza distruttività.

---

## Ref

- CLAUDE.md: sezione "Guardrail sprint (non negoziabili)" + "Regola 50 righe"
- Policy 4-gate DoD: memory `feedback_smoke_test_agents_before_ready.md`
- Archivio template: `07_CLAUDE_CODE_OPERATING_PACKAGE/SAFE_CHANGES_ONLY.md`
- Decision shortcuts user: memory `feedback_user_decision_shortcuts.md`
