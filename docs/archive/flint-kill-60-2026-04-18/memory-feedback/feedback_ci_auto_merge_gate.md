---
name: CI auto-merge gate per PR sicure
description: CI verde + small scope + non-destructive → merge senza chiedere. "Non aspettare, valuta, mergia".
type: feedback
---

Utente direttiva esplicita (input 15 sessione 2026-04-18): "non aspettare controlla la fine delle ci poi se tutto va bene (valuta) e mergia".

**Rule**: merge autonomo se TUTTE:

- CI 100% verde (governance + stack-quality + site-audit + paths-filter; skipping ammessi)
- Branch autore = te stesso in questa sessione
- Diff < 200 LOC
- Nessun file in cartelle guardrail (`.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`)
- Nessun breaking change API
- Master DD non ha aperto conversazione sul PR

**Eccezioni = CHIEDI prima merge**:

- Diff > 200 LOC
- Tocchi guardrail cartelle
- Rebase conflict non-trivial (>3 file)
- CI parziale/pending
- Pressure sull'irrevocabile (tag release, force push main)

**Why**: valore parallelismo + velocità. Chiedere ogni merge = rompere flow. Trust guadagnato via quality gate.

**How to apply**:

- Check CI via `gh pr checks <N> --watch` in background
- Quando CI completa → `grep -v skipping` → se tutto pass → `gh pr merge <N> --squash --delete-branch`
- Se rebase needed: rebase locale + `--force-with-lease`, re-trigger CI, wait, merge
- Dopo merge: `git checkout main && git pull --ff-only`

**NON auto-mergere**:

- PR di altri utenti
- PR ibride (AI-authored + human review pending)
- PR con Master DD check richiesto esplicito

---

**[ARCHIVED 2026-04-18]** Consolidato in `feedback_claude_workflow_consolidated.md` sezione 4.
