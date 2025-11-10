---
title: Placeholder storico Evo-Tactics
description: Testo originale conservato dopo la normalizzazione DOC-01.
tags:
  - evo-tactics
  - archivio
archived: true
updated: 2025-11-10
---

# Integrazione Evo-Tactics

Questa directory ospiterà la documentazione Markdown convertita dal pacchetto
Evo-Tactics presente in `incoming/lavoro_da_classificare/`. Le guide originali
sono fornite in formato DOCX/PDF e verranno progressivamente normalizzate in
Markdown seguendo il piano di integrazione.

## Struttura prevista

- `guides/` — conversione delle guide principali (`Game_EvoTactics_Guida_Pacchetto`,
  guide trait, policy operative).
- `reports/` — riepiloghi sintetici e log di revisione.
- `security/` — documenti di sicurezza collegati al pacchetto.
- `changelog/` — note di avanzamento per l'integrazione.

Le sottocartelle verranno create durante i batch `documentation` e `ops_ci`.

## Checklist di atterraggio

1. Convertire ogni sorgente DOCX/PDF con `pandoc` assicurando frontmatter
   coerente (`title`, `description`, `tags`).
2. Collegare le nuove pagine all'indice generale aggiornando `docs/README.md`.
3. Archiviare i sorgenti originali nella cartella `incoming/archive/documents/`
   annotando `inventario.yml`.
4. Verificare i link interni con `npm run docs:lint` prima del merge.

Tutti i progressi devono essere tracciati in `incoming/lavoro_da_classificare/TASKS_BREAKDOWN.md`
e nel relativo `tasks.yml`.
