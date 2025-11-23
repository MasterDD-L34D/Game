---
title: Gap documentazione Evo-Tactics
description: Report di confronto tra copie consolidate e archivio storico con impatti e priorità di rollout.
tags:
  - evo-tactics
  - documentation
  - rollout
updated: 2025-12-19
---

# Gap documentazione Evo-Tactics

## Documenti importati e destinazioni

| Sorgente inventario | Destinazione consolidata | Note |
| --- | --- | --- |
| `Game_EvoTactics_Guida_Pacchetto_v2.md` | `docs/incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/Game_EvoTactics_Guida_Pacchetto_v2.md` | Duplicato archiviato post bonifica 19/12/2025 |
| `INTEGRAZIONE_GUIDE.md` | `docs/incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/INTEGRAZIONE_GUIDE.md` | Duplicato archiviato post bonifica 19/12/2025 |
| `../archive/documents/Guida Ai tratti 1.docx` | `docs/evo-tactics/guida-ai-tratti-1.md` | Conversione DOCX → Markdown normalizzato |
| `../archive/documents/Guida Ai tratti 2.docx` | `docs/evo-tactics/guida-ai-tratti-2.md` | Conversione DOCX → Markdown normalizzato |
| `../archive/documents/Guida Ai tratti 3 Evo tact.docx` | `docs/evo-tactics/guida-ai-tratti-3-evo-tactics.md` | Conversione DOCX → Markdown normalizzato |
| `../archive/documents/Guida Ai tratti 3 database.docx` | `docs/evo-tactics/guida-ai-tratti-3-database.md` | Conversione DOCX → Markdown normalizzato |
| `../archive/documents/Integrazioni V2.docx` | `docs/evo-tactics/integrazioni-v2.md` | Conversione DOCX → Markdown normalizzato |

L’elenco completo degli asset inventariati con le rispettive destinazioni è stato serializzato in `reports/evo/rollout/documentation_diff.json` per consentire filtri aggiuntivi e correlazioni future con i batch di rollout.【F:incoming/lavoro_da_classificare/inventario.yml†L216-L260】【F:reports/evo/rollout/documentation_diff.json†L1094-L1149】

## Diff metadati/frontmatter e ancore

L’automazione `scripts/evo_tactics_metadata_diff.py` confronta le copie consolidate con le controparti archiviate e produce una matrice di differenze (`reports/evo/rollout/documentation_diff.json`). I principali scostamenti emersi sono:

- Le versioni archiviate in `docs/incoming/archive/2025-12-19_inventory_cleanup/` non contengono frontmatter YAML (`title`, `description`, `tags`, `updated`), mentre le copie consolidate sì.【F:reports/evo/rollout/documentation_diff.json†L1096-L1118】
- Le guide consolidate hanno introdotto ancore semantiche esplicite (`{#...}`) per tutte le sezioni e sottosezioni, assenti nelle controparti archiviate. Il diff registra oltre 20 nuove ancore per ciascuna guida principale, facilitando i deep-link nelle wiki interne.【F:reports/evo/rollout/documentation_diff.json†L1119-L1149】
- Tre documenti operativi (`guides/security-ops.md`, `guides/template-ptpf.md`, `guides/visione-struttura.md`) non hanno ancora un match nell’archivio storicizzato: il dato emerge nella sezione `unmatched` del report JSON, indicando che non esiste una copia legacy con cui confrontare metadati e ancore.【F:reports/evo/rollout/documentation_diff.json†L1366-L1369】

## Gap e impatti sui consumer

1. **Ricerca e indicizzazione** – L’assenza di frontmatter nei documenti storici impedisce ai motori di ricerca interni (docs hub, wiki, Obsidian) di esporre i contenuti Evo-Tactics via filtri per tag o date. I team che ancora consultano gli archivi rischiano di utilizzare versioni non aggiornate o di non trovare il documento corretto.
2. **Deep-link e navigazione** – Senza ancore stabili, i link da dashboard Notion/wiki puntano a sezioni non deterministiche, causando errori 404 in strumenti di documentazione che generano slug automaticamente. I consumer (design, QA, telemetria) non possono condividere riferimenti precisi alle checklist operative.
3. **Copertura incompleta** – L’assenza di controparti archiviate per i playbook (Security & Ops, Template PTPF, Visione) lascia un buco di conformità: i team di sicurezza e PMO non hanno uno storico da confrontare per audit o regressioni di processo.

## Priorità di rollout

| Priorità | Intervento | Owner suggerito | Note operative |
| --- | --- | --- | --- |
| Alta | Retrofit del frontmatter nei documenti archivio più consultati (README, guide trait, integrazioni) | Documentazione | Usare `scripts/evo_tactics_metadata_diff.py` per estrarre i campi mancanti e aggiornare l’archivio con metadati minimi |
| Media | Generare dump statico delle ancore consolidate e reindirizzamenti nei wiki legacy | Ops/DevRel | Aggiornare i link nelle pagine Notion/Confluence per puntare ai nuovi ID sezione |
| Media | Creare snapshot archivio per i playbook mancanti (Security & Ops, Template PTPF, Visione) | Security & PMO | Convertire le versioni correnti in archivio storico, includendo changelog per audit |
| Bassa | Validare che gli script consumer (QA telemetry, automation) leggano i nuovi path consolidati | QA Automation | Programmare smoke-test settimanale su `make update-tracker` e CLI correlate |

Il monitoraggio delle attività può essere agganciato al board roadmap aggiungendo gli output JSON/Markdown come artefatti collegati alle card di rollout.【F:reports/evo/rollout/documentation_diff.json†L1094-L1369】
