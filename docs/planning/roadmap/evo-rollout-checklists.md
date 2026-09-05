---
title: Checklist di consegna Evo-Tactics
updated: 2025-12-20
authors:
  - evo-rollout
---

# Checklist di consegna per consumer Evo-Tactics

Le checklist derivano dai gap rilevati in `reports/evo/rollout/documentation_gap.md`, `reports/evo/rollout/traits_gap.csv` e `reports/evo/rollout/species_ecosystem_gap.md` e servono a orchestrare un rollout coordinato.

## API interne (Atlas, Telemetria, Slot Legacy)

- **Responsabile:** Gameplay Ops (referente: atlas@internal)
- **Prerequisiti:**
  - Merge di `ROL-06` con fallback slot e campo `sentience_index` su `server/services/nebulaTelemetryAggregator.js` e `server/controllers/atlasController.js`.
  - Dataset specie aggiornato (`reports/evo/rollout/species_ecosystem_matrix.csv`) pubblicato nel bucket dati condiviso.
- **Verifiche QA:**
  - `npm run test:telemetry -- --filter=Evo` con fixture aggiornate.
  - Smoke test `make evo-validate` per assicurare compatibilità schema eventi.
- **Artefatti da produrre:**
  - Log QA in `reports/evo/qa/telemetry-rollout.log`.
  - Verbale review `docs/meeting-notes/evo-telemetry-rollout.md`.

## Generator e tool di content (Trait/Species Generators)

- **Responsabile:** Gameplay Data (referente: generators@internal)
- **Prerequisiti:**
  - Chiusura task `ROL-04` per sincronizzare i trait `missing_in_index` nel glossario.
  - Export `reports/evo/rollout/traits_external_sync.csv` prodotto da `ROL-05` e consegnato ai partner.
- **Verifiche QA:**
  - `python tools/generators/run_trait_matrix.py --dataset=evo` per validare combinazioni.
  - Diff automatizzato `make evo-backlog` per garantire assenza di regressioni.
- **Artefatti da produrre:**
  - Report QA `reports/evo/qa/trait-generators.log`.
  - Snapshot generator `data/exports/evo/trait_matrix_<YYYYMMDD>.json`.

## Tool interni e documentazione operativa

- **Responsabile:** Documentazione & DevRel (referente: docs@internal)
- **Prerequisiti:**
  - Completamento `ROL-01` (backfill frontmatter) e `ROL-02` (anchor map) per uniformare i riferimenti.
  - Archiviazione playbook (`ROL-03`) con changelog allegato.
- **Verifiche QA:**
  - `npm run docs:lint` e `markdownlint docs/evo-tactics/**/*.md`.
  - Verifica manuale anchor set (`docs/evo-tactics/anchors-map.csv`) contro i link nelle pagine Notion.
- **Artefatti da produrre:**
  - Report QA `reports/evo/qa/docs-rollout.log`.
  - Aggiornamento `reports/evo/rollout/documentation_gap.md` con sezione "Status rollout".
