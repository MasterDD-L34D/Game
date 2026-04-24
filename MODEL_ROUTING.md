# MODEL_ROUTING — Evo-Tactics

> **Scope**: quale AI/modello/tool usare per quale fase. Evita duplicazioni, tool sbagliati, cloud-on-private.
> **Sorgente template**: `04_BOOTSTRAP_KIT/MODEL_ROUTING.md` archivio, compilato con scelte reali del progetto.
> **Aggiornamento**: manuale quando cambia lo stack AI o emerge pattern nuovo.
> **Regola madre**: **Fonte → Comprensione → Compressione → Decisione → Esecuzione → Compact → Archivio**.

---

## Profilo progetto

- **Nome**: Evo-Tactics
- **Tipo**: co-op tactical game (d20, hex) + modular evolutionary progression + polyglot monorepo (Node + Python + YAML + Prisma + Vue)
- **Contesto primario**: repo-heavy (700K+ LOC) con dataset + documentazione estesa + ricerca esterna (Triangle Strategy, Wesnoth, XCOM, Jackbox, ecc.)
- **Vincoli privacy**: zero secrets nel cloud. Dataset public-safe. Codice pubblico (GitHub). Conversazioni personali NO.
- **Vincoli costo**: zero budget infra. Claude Pro/Team OK. API paid only se giustificato.
- **Vincoli hardware**: Windows 11 Home, nessuna GPU grossa (non usiamo Ollama/modelli locali per ora).
- **Vincoli velocità**: sessioni ~4h autonomous + ~2h userland. Kill-60 limit.
- **Priorità**: **qualità + integrazione repo** > velocità > costo.

---

## Stack attivo

### Strumenti

- ✅ **Claude Code** (CLI desktop) — principale per implementazione + QA + docs
- ✅ **ChatGPT** (web) — brainstorm early-phase, esplorazione idee
- ✅ **NotebookLM** — analisi corpus research esterno (PDF, transcripts, docs 20-50)
- ✅ **Codex (GitHub)** — bot daily tracker refresh (automated)
- ❌ OpenCode / Ollama / Modelli locali — non in uso (no GPU grossa, no secret-heavy content)

### Accessi

- ✅ Locale puro (repo git, file dataset, .claude/ config)
- ✅ Cloud integrato (GitHub, Anthropic, OpenAI, Google NotebookLM)
- ❌ API provider esterni personali — non in uso
- ✅ Repo aperto in Claude Code (sempre)
- ✅ Fonti documentali caricate in NotebookLM quando pertinenti

---

## Routing per fase (tabella canonical)

| Fase                         | Obiettivo                                                       | Strumento   | Modello              | Perché                                                    | Output atteso                                       | Passaggio successivo                        |
| ---------------------------- | --------------------------------------------------------------- | ----------- | -------------------- | --------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------- |
| **Comprensione fonti**       | Digest research esterna (Triangle Strategy, PDF tactical, docs) | NotebookLM  | -                    | Corpus multi-fonte, summarize + citation grounding nativo | Sintesi + citation + quotes                         | Trasferisci sintesi a ChatGPT o Claude Code |
| **Sintesi / compressione**   | Trasforma sintesi + idee in brief operativo                     | ChatGPT     | GPT-5 / o3           | Brainstorm + narrative framing + role-play System Prompt  | PROJECT_BRIEF draft, BACKLOG proposal, options tree | Carica in Claude Code via commit o file     |
| **Planning / strutturato**   | Scrivere piano implementativo multi-file                        | Claude Code | Opus 4.7 (1M)        | Contesto 1M, Agent tool, diretto read/write repo          | Plan doc in `docs/planning/`, ADR, TodoWrite        | Approvazione user → Esecuzione              |
| **Repo map / audit**         | Capire architettura e dipendenze esistenti                      | Claude Code | Opus 4.7 + Explore   | Agent subagenti (schema-ripple, sot-planner), grep veloce | Report in `docs/` con file:line                     | Trigger fix o refactor                      |
| **Coding / implementazione** | Modificare codice runtime (backend, services, ecc.)             | Claude Code | Opus 4.7             | Contesto repo, edit+test+lint chain, 4-gate DoD policy    | Diff + test verdi + commit                          | PR verso main                               |
| **Review / audit security**  | Security + simplify + diff review pre-PR                        | Claude Code | Sonnet 4.6 (economy) | Skills `security-review` + `simplify` built-in            | Audit report + suggested fix                        | Applicare correzioni                        |
| **Compact / archivio**       | Handoff session → future session                                | Claude Code | Opus 4.7             | Skill `/compact` locale, memory write access              | `COMPACT_CONTEXT.md` + memory files                 | Next session parte da compact               |

---

## Routing per scenario comune

### Se ho molte fonti eterogenee (PDF, YouTube transcripts, blog post)

- **Strumento**: NotebookLM
- **Perché**: citation-native, multi-source summarize, no prompt-engineering serve
- **Output atteso**: sintesi con link a sorgenti + quotes + domande aperte
- **Poi passa a**: ChatGPT per narrative framing o direttamente Claude Code per scrittura doc

### Se devo capire e toccare il repo

- **Strumento**: Claude Code (Opus 4.7, 1M context)
- **Perché**: unico tool con accesso diretto al filesystem, Agent + Grep + Edit in un flow, Husky + test runner integrati
- **Output atteso**: diff + test verdi + doc aggiornato
- **Modalità**: sempre in auto mode per task locale/reversible; checkpoint per gameplay-core o contract changes

### Se devo scrivere documenti, backlog, decision log, prompt

- **Strumento**: Claude Code (Opus 4.7) per docs nel repo; ChatGPT per bozze early-stage non ancora committate
- **Perché**: Claude Code = write diretto al repo + frontmatter governance + prettier automatico. ChatGPT = iterazione veloce in browser senza commit
- **Output atteso**: doc in `docs/` (Claude) o markdown sandbox (ChatGPT)

### Se devo lavorare in locale per privacy

- **Niente**: tutto il progetto è pubblico. No use case privacy.
- **Eccezione**: credenziali personali / chat private → NO cloud, solo memoria / file locali non tracciati

### Se devo usare il cloud

- **Strumento**: Claude Code + ChatGPT
- **Perché**: cloud è la norma per questo progetto, no dati sensitivi
- **Cosa NON mandare**: memory file personali (`~/.claude/projects/.../memory/feedback_*.md` sono ok share-safe ma non farli uscire dal repo config)

---

## Policy locale / cloud

### Locale prima? **No**.

- Progetto è open-source, tutto pubblico. Cloud-first default.
- Locale = solo memory files, settings privati, credenziali git.

### Quando il locale basta

- Edit di memoria cross-session (`feedback_*.md`)
- Settings personali (`~/.claude/settings.json`)
- File tmp (`tmp/`, `logs/demo-*.log`) — gitignored

### Quando il cloud è giustificato

- Tutto il lavoro sul repo (codice, docs, dataset)
- Research corpus (NotebookLM) — fonti già pubbliche
- PR + code review (GitHub)

### Materiali che NON vanno in cloud

- Credenziali, secrets, `.env`, `credentials.json`
- Memory files personali — restano in `~/.claude/`
- `reports/backups/**` — esclusi da repo policy (vedi `docs/planning/REF_BACKUP_AND_ROLLBACK.md`)

---

## Modelli attivi (ruoli chiari, no overlap)

| Modello                  | Runtime     | Ruolo                                            | Quando usare                               | Quando NON usare                        |
| ------------------------ | ----------- | ------------------------------------------------ | ------------------------------------------ | --------------------------------------- |
| **Claude Opus 4.7** (1M) | Claude Code | Implementation + planning + deep research repo   | Task >50 LOC, multi-file, 1M context serve | Task triviale (typo) o exploration only |
| **Claude Sonnet 4.6**    | Claude Code | Review + simplify + security-review agent model  | Review + audit + security                  | Task gen-purpose coding complesso       |
| **GPT-5 / o3**           | ChatGPT web | Brainstorm + narrative + role-play prompts       | Early-phase exploration, no commit needed  | Write diretto al repo (usa Claude Code) |
| **NotebookLM**           | Web         | Corpus digest multi-fonte con citation grounding | 20+ docs/PDF/transcripts da sintetizzare   | 1-2 fonti (Claude legge direttamente)   |

**Regola**: pochi modelli con ruoli chiari. Niente Ollama/local non c'è caso d'uso. Niente Codex interactive (solo bot scheduled).

---

## Scelte operative minime

- **Modello cloud principale**: Claude Opus 4.7 (1M context). Implementazione + planning.
- **Modello cloud economy**: Claude Sonnet 4.6. Review + simplify + agent model per scope-limited tasks.
- **Modello fallback**: ChatGPT GPT-5. Quando Claude non è disponibile o serve narrative/brainstorm senza repo access.
- **Modello locale**: nessuno (niente GPU, niente privacy use case).

---

## Prompt ponte tra strumenti

- **NotebookLM → ChatGPT**: vedi `.claude/prompts/04_research_bridge.prompt.md`
- **ChatGPT → Claude Code**: vedi `.claude/prompts/05_claude_code_brief.prompt.md`
- **Claude Code → archivio esterno**: skill `/compact` produce `COMPACT_CONTEXT.md`, archivio esterno legge quel file

### File da aggiornare dopo ogni passaggio importante

- ✅ `COMPACT_CONTEXT.md` (snapshot sessione) — ogni session
- ✅ `DECISIONS_LOG.md` (solo se nuova ADR) — on demand
- ✅ `docs/adr/` (ADR nuova) — on gameplay/architecture decisione
- ✅ `CLAUDE.md` sprint context — a fine sprint importante
- ✅ Memory files (`~/.claude/projects/.../memory/*.md`) — quando emergono pattern cross-session

---

## Regole anti-caos

- ❌ Non fare la stessa cosa in 3 strumenti (pick one per fase)
- ❌ Non mandare fonti grezze (20 PDF) direttamente a Claude Code — prima digest via NotebookLM
- ❌ Non accumulare modelli "per sicurezza" — se non usi il modello 2x nello stesso mese, cancellalo dal routing
- ❌ Non tenere implicito il routing — se non è scritto qui, non esiste
- ❌ Non usare Opus 4.7 per task triviali (typo fix, rename) — Sonnet 4.6 va bene
- ✅ Se un passaggio aumenta caos invece di ridurlo, fermati e consolida in nuovo ADR o update questo file

---

## Decisione finale corrente

- **Workflow primario**: NotebookLM (research) → Claude Code Opus (planning + code + docs) → GitHub (PR + CI) → memory + /compact (handoff)
- **Strumento principale comprensione**: NotebookLM per research, Claude Code Explore agent per repo
- **Strumento principale esecuzione**: Claude Code Opus 4.7 (1M context)
- **Strumento principale archivio/orchestrazione**: Claude Code + memory files + archivio esterno
- **Prossimo test routing**: quando Triangle Strategy transfer plan si trasforma in ticket backlog → misurare se NotebookLM → ChatGPT → Claude Code chain rimane efficiente o serve snellire

---

## Eccezioni note

- **Design brainstorm collaborativo** (game mechanics con Eduardo presente) → ChatGPT è OK perché iterazione veloce senza commit pressure
- **Post-playtest analysis** (userland feedback 2-4 amici) → Claude Code agent `playtest-analyzer` diretto, no bridge
- **Urgent security hotfix** → Claude Code + skill `security-review` diretto, no NotebookLM digest

---

## Ref

- Template sorgente: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/04_BOOTSTRAP_KIT/MODEL_ROUTING.md`
- Skill installata: `anthropic-skills:multi-ai-routing` (triggerabile con "quale strumento uso", "routing dei modelli", ecc.)
- ADR correlati: `ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md` (scelta tool production)
