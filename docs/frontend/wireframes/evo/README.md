---
title: Mockup Evo-Tactics
doc_status: draft
doc_owner: atlas-team
workstream: atlas
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Mockup Evo-Tactics

Questa directory raccoglie la documentazione dei mockup confermati del pacchetto
Evo-Tactics. Gli asset approvati vengono conservati nel bucket condiviso
"evo-mockups" e sincronizzati nella cartella
`incoming/lavoro_da_classificare/mockup_evo_tactics.png`. Per evitare commit di
binari nel repository, non è presente una copia diretta del file in questa
directory.

Il mockup principale esportato dal team UX documenta la Mission Console con
drawer espanso, quick toolkit e le sezioni aggiornate Mission Control /
Ecosystem Pack.

## Note operative

- Gli asset definitivi vanno salvati in formato `.png` o `.svg`, mantenendo nel
  nome file il contesto (es. `mission-console-*`).
- Aggiungere o aggiornare la pagina descrittiva in `docs/frontend/mockups_evo.md`
  a ogni nuovo export.
- Quando il batch `frontend` viene aggiornato, ricordarsi di allineare
  `public/sitemap.xml` e la suite Playwright (`tests/playwright/evo`).
