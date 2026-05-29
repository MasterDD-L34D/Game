---
title: 'Git PR workflow templates -- Conventional Commits + draft PR helpers'
last_verified: 2026-05-29
status: live
language: it
---

# Git PR workflow templates

Template riusabili estratti dai 4 `_*.cmd` ad-hoc generati durante PR #2393 / PR #2394 Fase-1 Spore reconciliation (2026-05-26). Quei file erano "una-tantum, safe-to-delete dopo merge" ed effettivamente sono stati cancellati post-merge. Qui resta solo il pattern, parametrizzato.

## Pattern coperto

1. Rimozione lock stantio (`.git/index.lock`) se presente.
2. Checkout main + pull + creazione branch dedicato.
3. Esecuzione test mirati con cattura output su file temp + status code.
4. Replace sed-like in markdown via PowerShell (sezione `<PENDING>` -> output reale).
5. Stage file specifici (mai `git add -A`).
6. Commit multi-line in Conventional Commits con piu' `-m` (titolo + body + ref).
7. Push branch + creazione PR draft via `gh pr create --body-file`.
8. Trailer attribution ADR-0011 (Coding-Agent + Trace-Id, NON Co-Authored-By).
9. Error handling `:err` + pause per debug manuale.

## File

| File | Scopo |
|---|---|
| `branch-and-pr.cmd` | Template parametrico: branch nuovo + test run + commit + push + draft PR |
| `commit-multiline-example.cmd` | Esempio di commit multi-line Conventional Commits (5 sezioni `-m`) |

## Convenzioni assunte

- Branch naming: `<type>/<topic>-2026-MM-DD` (preferito `chore/` o `feat/` per work Claude Code).
- Single-PR-per-branch (no umbrella, pattern verified `git log --merges` 2026-05).
- husky lint-staged auto-format on pre-commit (Prettier).
- Convention encoding ADR-0021: ASCII-first body prose nei commit message.
- `prisma generate` richiesto pre-test se i test toccano Prisma routes (vedi caso `_fix-prisma-and-rerun-recon-01.cmd` 2026-05-26).
- `chcp 65001` per UTF-8 console (anti-mojibake).
- `set "RECON01_TMP=%TEMP%\<unique>.txt"` per capture output isolato per ticket.

## Anti-pattern noti (da `_fix-prisma-and-rerun-recon-01.cmd`)

- PowerShell sed-like replace via `[regex]::Replace` con pattern multi-riga `(?s)## 3\..*?(?=## 4\. )`: funziona ma fragile su markdown con caratteri non-ASCII. Preferibile rigenerare il blocco da template Python piuttosto che fare regex su markdown.
- `git push origin <branch>` senza `-u` su prima creazione: non setta upstream. Usare `git push -u origin <branch>` la prima volta.
- `pause` finale: utile per debug interattivo Eduardo-side, NON usare in CI / hook.

## Quando usare i template

- Quando hai una sequenza ripetitiva di "creare branch + run test + commit + draft PR" per N ticket simili (es. wave-by-wave RECON-01..06 o TKT-CL-02..08).
- NON usare per task one-off semplice (una modifica + commit diretto): basta `git add file && git commit -m '...'`.

## Pulizia file ad-hoc

I `_*.cmd` in root Game sono pattern da evitare in futuro: troppo facile lasciarli post-merge come noise. Convenzione:

- Se serve un cmd ad-hoc per un singolo ticket, mettilo qui in `tools/scripts/git-pr-workflow/` con prefix del numero ticket (es. `tkt-cl-06-ship-easy-batch.cmd`).
- Se invece il pattern e' davvero generico, parametrizzalo e aggiornare `branch-and-pr.cmd`.
- Mai lasciare in root repo con prefisso `_` -- diventano orphan.

## Cross-link

- PR #2393 plan / PR #2394 RECON-01 baseline (storico, merged 2026-05-26).
- ADR-0011 commit attribution policy (Coding-Agent / Trace-Id).
- ADR-0021 encoding policy ASCII-first.
- `Game CLAUDE.md` Stack installato -- guard rail chain husky + git hooks.
