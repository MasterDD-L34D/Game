---
name: Delega ricerche multi-query a sub-agent
description: Scope research >3 query o >5 file da leggere → spawn sub-agent (Explore/general-purpose/specifici) in parallelo
type: feedback
---

Utente direttiva (input 18 sessione 2026-04-18): "dovremo usare agent specifici per ricerche multiple per capire il da farsi e se c'è già materiale simile al quale ispirarsi".

**Rule**: se task richiede:

- > 3 query di ricerca (grep/glob/read)
- > 5 file da leggere per contesto
- Pattern cross-repo (repo locale + skills + memory + .claude)
- Analisi gap / inventory / audit

→ spawn sub-agent. Preferibilmente 2+ in PARALLELO (singola Agent tool call con multiple invocations in un messaggio).

**Tipologie disponibili**:

- `general-purpose` — ricerca aperta + sintesi
- `Explore` — codebase exploration (thoroughness: quick/medium/very thorough)
- `sot-planner` — SoT vs external + integration plan
- `balance-auditor` — combat balance data
- `schema-ripple` — packages/contracts consumers
- `session-debugger` — trace azione round→resolver→trait→VC
- `species-reviewer` — species JSON completeness
- `migration-planner` — DB migration Game + Game-Database

**Why**: main context budget limitato. Leggere 10+ file in main = saturazione. Sub-agent isolato = ricerca profonda + sintesi compressa.

**How to apply**:

- Prompt sub-agent **auto-contenuto** (no chat context)
- Output 1500-2500 parole
- Multipli agent = SINGOLA tool call con multiple invocations (parallelismo)
- Ricevuto report → sintesi breve all'utente (NO paste pieno)
- NON duplicare ricerca agent nel main context

**Esempio riuscito**: input 18 → 2 agent paralleli → sintesi tabulare → utente decide. Saved ~20 min search manuale.

**NON delegare**:

- Task <3 query specifiche (Grep/Read diretti più veloci)
- Modifiche file (agent = research, non write)
- Conversational (tabelle opzioni, proposte)

---

**[ARCHIVED 2026-04-18]** Consolidato in `feedback_claude_workflow_consolidated.md` sezione 5.
