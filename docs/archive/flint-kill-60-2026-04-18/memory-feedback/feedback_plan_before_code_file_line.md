---
name: Piano file:line prima di scrivere codice
description: Feature che tocca >1 file o >50 LOC → piano file:line dettagliato PRIMA di edit, attendi "go"
type: feedback
---

Utente ha scelto "(a) piano dettagliato con file:line prima di toccare codice" alla prima decisione tecnica sessione 2026-04-18. Pattern: utente valuta piano in 30s, approva con "procedi" o corregge mirato.

**Rule**: prima di Edit/Write per feature non-trivial, produci piano con format:

```markdown
## Step N — <titolo>

**File**: [path/file.js:line](path/file.js:line)
**Modifica**: <descrizione 1-2 righe>
**Motivo**: <perché>
**Rischi**: <breaking API, test update>
**Effort**: S (<50 LOC) / M (mezza gg) / L (1+ gg)
```

Poi: **Sequenza commit** numerata + **Test impact** + "Procedo con Step N?".

**Trigger obbligatorio**:

- Feature tocca >1 file
- Diff stimato >50 LOC fuori `apps/backend/` (regola 50 righe)
- Modifica interfaccia pubblica
- Refactor (rename, split, extract)

**Skip piano**:

- Bug fix 1-file localized
- Formatting
- Test aggiuntivo
- Utente esplicito "just do it"

**Why**: piano file:line = contratto con utente, elimina ping-pong "non era questo". Ripple scoperto a review costa 10x del piano.

**How to apply**:

- Usa Read/Grep per individuare line numbers REALI PRIMA di scrivere piano
- Piano 200-400 parole max, tabulato
- Chiudi con "Procedo con Step N?" o "(a) piano / (b) impl diretta"
- Max 5 step per piano (>5 = split in sprint multi-PR)

**Esempio riuscito**: Fase A round simultaneo — 5 step file:line → utente "procedi" → 7 PR merged senza rollback in giornata.

---

**[ARCHIVED 2026-04-18]** Consolidato in `feedback_claude_workflow_consolidated.md` sezione 6.
