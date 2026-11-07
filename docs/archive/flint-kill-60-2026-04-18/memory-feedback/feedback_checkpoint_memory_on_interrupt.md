---
name: Checkpoint memory su meta-pause utente
description: Quando utente fa meta-pause ("a che punto", "prima di procedere", "ricorda per dopo"), salva stato progetto in memory PRIMA di eseguire richiesta
type: feedback
---

**Rule**: ogni volta che utente dice:

- "a che punto sei?" / "a che punto eravamo"
- "ricorda per dopo"
- "prima di procedere"
- "fermiamoci"
- "analizza ..." / "valuta ..."

→ PRIMA di rispondere/analizzare, scrivi un memory file `project_<sprint_slug>_progress.md` con:

1. PR aperte + stato (CI pending/merged)
2. Prossimo step proposto
3. Cosa salti e perché
4. Test count attuale

**Why**: utente usa supermemory + richiede codifica = valuta persistenza. Interrompere flow senza salvare = rientro costoso rebuild mentale.

**How to apply**:

- Apri risposta con `## Punto di ritorno` o `## Stato salvato`
- Scrivi memory file, aggiorna MEMORY.md index nella stessa risposta
- Dopo save, procedi con richiesta utente
- Al rientro ("torna al lavoro"), leggi memory file e riprendi esatto

**Esempio riuscito**: input 18 sessione 2026-04-18, salvato `project_round_simultaneo_ui_sprint.md` prima di meta-analisi. Mantenuto "proposta (B) cell highlight + (D) keyboard shortcuts" come next step.

---

**[ARCHIVED 2026-04-18]** Consolidato in `feedback_claude_workflow_consolidated.md` sezione 3.
