---
name: Always propose options table at milestone end
description: Fine di ogni sprint / merge / feature completata → tabella opzioni A/B/C con valore/effort/rischio + consiglio caveman finale
type: feedback
---

Quando completi un milestone (PR merged, sprint chiuso, test verdi, feature bloccata), **chiudi SEMPRE** con una tabella strutturata di proposte per il prossimo passo.

**Format obbligatorio**:

```markdown
| #   | Opzione |  Valore  | Effort |     Rischio      |
| --- | ------- | :------: | :----: | :--------------: |
| A   | ...     | 🟢/🟡/🔴 | S/M/L  | Basso/Medio/Alto |

...

## Consiglio caveman

**(X) <nome>** perché... (+ cosa salta/rinvia).
```

**Why**: utente Evo-Tactics risponde con scelte brevi ("a", "1", "b+a", "procedi") 5+ volte per sessione. Senza tabella opzioni, non ha punto di aggancio per decidere rapidamente.

**How to apply**:

- Sempre a fine turn dopo merge riuscito, PR aperta, feature verificata
- Max 5-7 opzioni
- Ultima riga = "STOP" esplicita
- Consiglio caveman include cosa SALTI
- Aspetta input, non auto-procedere

**Eccezione**: se utente delega totale ("segui i tuoi consigli"), esegui consigliato senza tabella ma dichiara scelta.

---

**[ARCHIVED 2026-04-18]** Consolidato in `feedback_claude_workflow_consolidated.md` sezione 1.
