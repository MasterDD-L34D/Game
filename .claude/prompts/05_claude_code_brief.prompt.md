# Prompt 05 — Brief Tecnico per Claude Code (Evo-Tactics)

**Fonte**: `05_TEMPLATE_REALI_PROMPTATI/05_Claude_Code_Brief_Tecnico.prompt.md` archivio.

## Quando usarlo

- Hai brief consolidato da ChatGPT/NotebookLM/design session
- Vuoi passarlo a Claude Code per implementation o audit repo
- Esempio: post-Triangle Strategy research (731 righe doc), vuoi ticket implementativi

## Target tool

**Claude Code** (Opus 4.7 1M context). Essendo già dentro il repo, può leggere contracts + test suite + session engine direttamente.

## Campi da compilare

- **Nome progetto**: Evo-Tactics (default)
- **Obiettivo core del task**: es. "implementa Mechanic 3 elevation/facing da Triangle Strategy"
- **Vincoli hard**: ADR esistenti, contract da non rompere, test da tenere verdi
- **Unità minima funzionante**: metric di success (test N verdi, endpoint responds, UI renders)
- **Brief tecnico**: paste del doc ChatGPT o research output

## Prompt pronto

```text
Ti passo il brief tecnico consolidato per un task su Evo-Tactics (co-op
tactical game d20, monorepo polyglot Node + Python + YAML, branch main su
github.com/MasterDD-L34D/Game).

Agisci come Principal Engineer + Systems Architect.

Prima leggi questo brief come fonte di verità operativa del task.
Poi analizza il repo rispettando questi vincoli + obiettivi.
Infine dimmi:

1. Dove il repo attuale supporta bene il task (riuso possibile)
2. Dove lo tradisce (vincolo, gap, refactor necessario)
3. Quale primo modulo o confine architetturale stabilizzare
4. Proposta implementativa in 3-step (Read → Plan → Code) con effort S/M/L
5. DoD 4-gate applicabile (research done? smoke test mandatory? tuning/optimization iterations?)

Prima di scrivere codice, produci un piano (TodoWrite) e aspetta OK user.
Per ogni file che toccherai, conferma via grep che il path esiste.
Rispetta guardrail sprint (CLAUDE.md "non negoziabili") e regola 50 righe.

Nome progetto: Evo-Tactics

Obiettivo core:
[COMPILA]

Vincoli hard (ADR rilevanti, contract da tenere, test da mantenere):
[COMPILA]

Unità minima funzionante (metric success):
[COMPILA]

Brief tecnico consolidato:
[INCOLLA QUI]
```

## Output atteso

- TodoWrite popolata con fasi
- Plan doc in `docs/planning/YYYY-MM-DD-<topic>.md`
- Conferma path via grep (no path drift)
- Analisi 5-punti sopra
- Attesa OK user prima di coding (salvo auto mode esplicito)
