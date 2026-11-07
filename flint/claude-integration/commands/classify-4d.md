---
name: classify-4d
description: Classifica un asset (code/memory/doc/skill) con framework Flint 4D prima di keep/kill/archive decision
user_invocable: true
---

# Classify 4D

Applica classification framework Flint 4D a un asset specifico. Output = tabella 4D + raccomandazione atomica (keep / kill / archive / refactor).

Vedi `reference_classification_4d.md` in memory per framework completo + esempi.

## Invocazione

```
/classify-4d <asset_path_or_name>
```

Esempi:

- `/classify-4d flint/src/flint/achievements.py`
- `/classify-4d feedback_old_pattern.md`
- `/classify-4d docs/adr/ADR-2026-04-XX.md`

## Steps

### 1. Identify asset

Leggi file o contesto. Se nome ambiguo (memory/doc/code), chiedi chiarimento.

Estrai: scope funzionale, dipendenze, test coverage, last modified, usage evidence.

### 2. Apply 4 axes

Per ciascuno, scegli valore + 1-riga motivazione:

**Valore scope** (🟢 alto · 🟡 medio · 🔴 basso)

- 🟢 = asset core (blocker rimuoverlo) / riusato 3+ posti / testcov >70%
- 🟡 = utile ma sostituibile / riusato 1-2 posti / testcov 30-70%
- 🔴 = dead code / nessun usage / testcov <30% / deprecated

**Applicabilità** (universal / gamedev / data-ops / solo-dev / single-user / `<project>`-only)

- universal = riusabile in qualsiasi progetto software
- `<project>`-only = hardcoded dependencies al dominio attuale
- single-user = legato a setup specifico (host, preferenze user)

**Stato sviluppo** (production / experimental / draft / deprecated / consolidated / killed)

- production = wirato + test + doc
- experimental = wirato ma feature-flag OFF default
- draft = scritto non wirato
- consolidated = merged da N file in 1 (post-refactor)

**Re-open cost** (XS / S / M / L / XL)

- XS = <30min (copy-paste from archive)
- S = ≤2h (reinstall + config)
- M = ≤1gg (re-wire + test)
- L = >1gg (refactor downstream)
- XL = >settimana (rewrite from scratch)

### 3. Output tabella

```
| Dimensione     | Valore           | Motivazione (≤10 parole)         |
|----------------|------------------|----------------------------------|
| Valore scope   | 🔴 basso         | dead code, 0 usage grep          |
| Applicabilità  | single-user      | hardcoded path user-specific     |
| Stato sviluppo | deprecated       | superseded da X in PR #YYYY      |
| Re-open cost   | XS               | copy da archive + 1 import       |
```

### 4. Raccomandazione atomica

Applica regole (vedi `reference_classification_4d.md`):

- 🔴 + single-user + draft + XS/S → **KILL** (archive + remove)
- 🔴 + universal + deprecated + M/L → **KILL GRADUAL** (deprecation warning 30gg)
- 🟢 + universal + production + L → **KEEP HARD** (no touch)
- 🟡 + gamedev + draft + M → **REFACTOR or PARK** (proponi trigger re-open)
- 🟢 + `<project>`-only + experimental + S → **PROMOTE** (codifica + docs)

### 5. Next step (se KILL)

Se raccomandazione = KILL:

1. Proponi creazione archive folder `docs/archive/<project>-<slug>-<date>/`
2. Usa `flint/archive-template/MANIFEST-template.md` come skeleton
3. Lista file da spostare + git mv commands
4. Aspetta "procedi" utente

Se raccomandazione = KEEP:

1. Identifica gap (test mancanti? doc stale? wired?)
2. Proponi 1-3 follow-up ticket atomici

### 6. Log decisione

Se keep/kill applicato → append entry a `IDEAS_INDEX.md` sezione appropriata (parked / completed) con classificazione 4D esplicita.

## Quando invocare

- Dopo research-critique con voto ≤5/10 (gate kill-60)
- Prima di eliminare code/doc non banale
- Durante archive session (post decision)
- Per parked ideas catalog (ogni idea = classificata)

## Quando NON invocare

- Asset trivial (singola costante, 1 riga)
- Classification ovvia senza ambiguità (dead code grep 0 → kill diretto)
- Già classificato in archive MANIFEST esistente
