---
name: Probe before batch — N=1 prima di N≥5
description: Prima di batch calibration / scraping / eval set — sempre N=1 probe + schema dump per validare metrica shape PRIMA di inferenza distribuzione.
type: feedback
---

**Rule**: prima di batch runs (N≥5) su endpoint/script nuovo:

1. **N=1 probe** — esegui 1 run singolo, full output
2. **Schema dump** — stampa raw JSON response / output shape
3. **Verify metric name** — nome campo atteso esiste? formato corretto?
4. **Verify range** — valore nel range atteso? unità giusta?
5. **Re-probe post-restart** — se cambia backend stack/version, re-probe
6. **Opzione `--probe` in batch runner** — sempre disponibile
7. **Dump raw run 0** in log permanente (disk, non solo stdout)

**Why**: batch = inference su distribuzione (assume modello metrico giusto). Discovery = identificare il modello. Confondere i due = bruciare minuti/ore su metric sbagliato.

Esempio lesson learned: hardcore06 calibration PR 1498 serie — 30 min bruciati su metric nome errato prima di probe.

**How to apply**:

- Opzione CLI `--probe-only` / `--dry-run` in ogni batch script
- Log file `probe.json` separato da `batch-run-N.jsonl`
- README del tool documenta sempre probe-first pattern
- Se batch fallisce con errore metric → suggerisci "hai fatto probe?"

**NON applicare**:

- Re-run identico batch già validato
- Endpoint completamente stabile (v1 API documentata)
- N=1 non disponibile (streaming-only, etc)

---

**[ARCHIVED 2026-04-18]** Consolidato in `feedback_claude_workflow_consolidated.md` sezione 8.
