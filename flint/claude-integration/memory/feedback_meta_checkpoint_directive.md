---
name: Meta-checkpoint directive per codificare behaviors emergenti
description: Quando utente chiede analisi/pausa riflessiva/codifica workflow, spawn 2 agent paralleli (audit infra + pattern ispiratori) e proponi Z-tight. Auto-trigger su "analizza", "fermati", "ricorda", "è rimasto qualcosa", "come lavoriamo", "checkpoint", "meta-check".
type: feedback
originSessionId: ad7b4c38-9ddd-4c07-a3cf-09b519e075e8
---

Sessione 2026-04-18 input 18 ha innescato codifica di 7 feedback memory files + CLAUDE.md workflow section via pattern ripetibile.

**Rule**: quando utente chiede meta-analisi o pausa riflessiva con trigger phrase:

- "analizza come lavoriamo" / "come ti ho detto di comportarti"
- "serve una ricerca" / "prima di procedere"
- "ricorda a che punto eravamo" / "ricorda per dopo"
- "è rimasto qualcosa?" / "controlla se è appeso"
- "che altro ho usato" / "studio completo"
- "meta-check" / "checkpoint" / "/meta-checkpoint"

→ attiva workflow 5-step:

**Step 1 — Save checkpoint**: scrivi memory file `project_<slug>_progress.md` con PR aperte (stato CI), step proposto (ultimo su tabella opzioni), cosa salti e perché, test count attuale.

**Step 2 — Self-analyze last 15-20 user inputs**: trascrivi numerati + categorizza per style / frequency / decision pattern / errors / implicit preferences. Tabella parole-chiave con count. Identifica pattern ripetuti che rivelano preferenze implicite.

**Step 3 — Spawn 2 agent paralleli** (singola Agent tool call con multiple invocations):

- `general-purpose #1`: audit infrastruttura già codificata (CLAUDE.md + memory + skills + agents + hooks + commands) per evitare duplicati. Output mappa completa.
- `general-purpose #2`: trova pattern ispiratori nel repo e ovunque (AGENTS.md, .ai/BOOT_PROFILE.md, skills Anthropic installate, CLAUDE.md strutture) come template. Output abbozzo frontmatter candidato.

**Step 4 — Synthesize**: tabella comportamenti AI usati × utente reinforce? × già codificato?. Gap list. Proponi Z-tight (= minimo vitale: feedback memory files brevi + eventuale CLAUDE.md section update, NO skill complessa salvo necessità provata dal gap).

**Step 5 — Apply on "procedi"**: aspetta conferma utente. Dopo applicazione, torna al punto Step 1 salvato.

**Why**: behaviors emergenti scompaiono a fine sessione se non codificati. Utente ha richiesto esplicito ("per non doverli ripetere sempre a ogni sessione"). Memory files auto-caricati via MEMORY.md = costo zero prossima volta. Senza checkpoint periodico, ogni sessione reinventa workflow.

**How to apply**:

- Max 1 meta-checkpoint per sessione (overkill se fatto ogni 3 PR)
- Se utente continua task tecnico dopo N PR senza meta-pause, proporre tu stesso: "Vuoi meta-checkpoint prima di procedere?"
- Output format: tabelle dense, no fluff. Testo in italiano caveman mode se attivo.
- Gate codifica: solo pattern osservati 3+ volte in sessione OR con direttiva esplicita utente
- Evita over-engineering: preferisci 5 memory files brevi a 1 skill complessa
- Command equivalente: `.claude/commands/meta-checkpoint.md` (invocazione esplicita via `/meta-checkpoint`)

**Esempio riuscito**: sessione 2026-04-18 input 18 → checkpoint salvato (`project_round_simultaneo_ui_sprint.md`) → 2 agent audit+pattern → 6 feedback files + CLAUDE.md section committed PR #1547. Tempo totale ~45 min. Beneficio: prossima sessione preload workflow patterns.

**NON attivare**:

- Dopo singola task conclusa (troppo piccolo scope)
- Se utente sta chiedendo stato sprint tecnico (usare skill `evo-tactics-monitor`)
- Se già fatto meta-checkpoint in questa sessione
