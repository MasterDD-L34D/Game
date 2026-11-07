---
title: PR Summaries — Auto-generated archive
doc_status: generated
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# PR Summaries — Auto-generated archive

Questa directory contiene i **daily PR summary** generati automaticamente da
`tools/py/daily_pr_report.py` (schedulato via GitHub Actions) e gli snapshot
sync in `local/` e `notes/`.

## Struttura

- `daily-pr-summary-YYYY-MM-DD.md` — 168 file, da 2025-10-26 a 2026-04-12. Ogni
  file contiene una tabella con le PR mergiate in quel giorno e i loro
  summary + diff sintetici.
- `2025-10-23.md` / `2025-10-23.diff` — snapshot bootstrap iniziale (formato diverso).
- `local/YYYY-MM-DD/` — snapshot locali esportati da `scripts/sync_chatgpt.sh` (`snapshot-*-local-export.*`).
- `notes/YYYY-MM-DD/` — snapshot daily notes (`snapshot-*-daily-notes.*`).

## Scopo

Archivio cronologico dei merge del repo. Sostituisce il bisogno di aprire
GitHub per cercare "cosa è stato mergiato il giorno X". Utile per:

- Ricostruire una timeline di feature/fix
- Revisione settimanale (cross-reference con roadmap)
- Audit delle modifiche fatte dagli agent AI

## Policy governance

Questi file sono **auto-generati** e esclusi dalla validazione frontmatter
strict dal `AUTOGEN_PATH_PATTERNS` di `tools/docs_governance_migrator.py`
(prefisso `docs/generated/pr-summaries/`). Il `doc_status` effettivo è
`generated` e il review cycle è 30 giorni (estesi rispetto ai 14 standard).

## Come viene aggiornata

- Script: `tools/py/daily_pr_report.py --output-dir docs/generated/pr-summaries`
- Schedule: daily via `.github/workflows/*` (cercare il workflow che invoca
  `scripts/daily_tracker_refresh.py` o `tools/py/daily_pr_report.py`)
- Non editare a mano: ogni run sovrascrive il file del giorno corrispondente.

## Retention

Nessuna rotazione automatica. Se la dimensione diventa problematica, valutare
roll-up mensili/trimestrali o pruning dei file più vecchi di 6 mesi.
