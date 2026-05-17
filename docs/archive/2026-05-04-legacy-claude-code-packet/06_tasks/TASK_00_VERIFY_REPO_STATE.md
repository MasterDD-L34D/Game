# TASK 00 - Verify Repo State

## Obiettivo

Stabilire lo stato reale dei repo locali prima di usare il materiale legacy.

## Passi

1. Individua repo `Game` e `Game-Godot-v2` nella workspace.
2. In ciascun repo esegui:
   - `git status --short`
   - `git branch --show-current`
   - `git log -1 --oneline`
3. Leggi file di avvio disponibili:
   - `README.md`
   - `AGENTS.md`
   - `CLAUDE.md`
   - docs rilevanti in `docs/godot-v2/`
4. Segnala eventuale drift tra README e stato PR/CLAUDE/docs.
5. Non modificare file.

## Output

Tabella:

| Repo | Branch | Last commit | Dirty? | Docs principali letti | Note drift |
| ---- | ------ | ----------- | ------ | --------------------- | ---------- |

## Stop condition

Se manca uno dei repo, chiedi all'utente dove si trova o lavora solo in modalita' audit docs, senza codice.
