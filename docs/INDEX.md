---
title: Indice Documentazione (DOC-02)
description: Mappa di navigazione aggiornata della documentazione principale con focus sui materiali Evo-Tactics.
tags:
  - documentazione
  - indice
updated: 2025-12-19
---

# Indice Documentazione

## Panoramica

- [00-INDEX.md](00-INDEX.md) — indice operativo storico e canvas.
- [README.md](README.md) — guida rapida a settori operativi, procedure e changelog.
- [archive/](archive/) — materiale storico e placeholder archiviati, incluso l'ex hub Evo-Tactics.

## Evo-Tactics

- [Hub documentale](evo-tactics/README.md) — panoramica aggiornata, strumenti correlati e accesso rapido all'archivio log.
- [Visione & Struttura (archivio)](archive/evo-tactics/guides/visione-struttura.md) — archiviato (ROL-03); conserva la visione di prodotto, i pilastri tattici e il workflow di integrazione.
- [Template PTPF (archivio)](archive/evo-tactics/guides/template-ptpf.md) — archiviato (ROL-03); usa il seed storico in `guides/ptpf-seed-template.md` se serve un canvas rapido.
- [Visione & Struttura (seed)](evo-tactics/guides/vision-and-structure-notes.md) — scaffold originale a supporto della guida consolidata.
- [Template PTPF seed](evo-tactics/guides/ptpf-seed-template.md) — versione originaria di riferimento rapido.
- [Codex seed](evo-tactics/guides/codex-readme.md) — indice veloce dei materiali Evo-Tactics e dei validator.
- [Security & Ops Playbook (archivio)](archive/evo-tactics/guides/security-ops.md) — archiviato (ROL-03); include workflow audit, rotazioni credenziali e incident response.
- [Integration Log (archivio)](archive/evo-tactics/integration-log.md) — cronologia DOC-01/DOC-02/DOC-03 conservata per riferimento storico.
- [Archivio storico](archive/evo-tactics/README.md) — testo introduttivo pre-normalizzazione conservato per contesto.

## Trait — workflow e reference

- [Scheda operativa trait](traits_scheda_operativa.md) — requisiti minimi, checklist automatica e flusso end-to-end.
- [Template dati](traits_template.md) — schema JSON canonico con esempi per tipologia.
- [Guida autori](README_HOWTO_AUTHOR_TRAIT.md) — percorso rapido glossario → file trait → validazioni.
- [Trait Reference & Glossario](catalog/trait_reference.md) — label/description approvate e sincronizzazione glossario/localizzazioni.
- [Trait Reference Manual (omnibus)](trait_reference_manual.md) — indice dei capitoli tematici in `docs/traits-manuale/`.

## Appendici

- [Appendici canoniche](appendici/) — canvas storici, prontuario UCUM e style guide naming.
- [Sandbox — concept/trait/bilanciamento (draft)](appendici/sandbox/README.md) — collegamento rapido ai concept narrativi in sandbox e alle note di trait/bilanciamento.

## Strumenti incoming & template

- [templates/obsidian_template.md](templates/obsidian_template.md) — vault suggerito per note locali.
- [incoming/docs/yaml_validator.py](../incoming/docs/yaml_validator.py) — validazione dataset telemetrici.
- [incoming/docs/bioma_encounters.yaml](../incoming/docs/bioma_encounters.yaml) — base encounter per sincronizzazione VC.
- [incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/security.yml](../incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/security.yml) — workflow CI per audit Bandit/npm audit/gitleaks.

## Ops & analytics

- [Analytics Toolkit](analysis/analytics-toolkit.md) — rigenerazione dashboard trait, note interpretative e monitor sentience.
- [Site audit](ops/site-audit.md) — checklist di verifica pagine statiche e fix di accessibilità.
- [Diff workflow](ops/workflow_diff.md) — comparativa pipeline staging/prod per individuare gap di deploy.
- [Playbook MongoDB](ops/handbook/mongodb.md) — linee guida operative per setup e manutenzione cluster Mongo.
- [Walkthrough demo VC](presentations/walkthrough-demo-vc.md) — guida narrata per presentazioni HUD/SquadSync/export telemetria.

Aggiorna questa pagina quando vengono aggiunti nuovi materiali o archiviati documenti esistenti, assicurandoti di mantenere coerenti i riferimenti incrociati.
