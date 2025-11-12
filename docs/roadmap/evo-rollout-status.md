---
title: Evo-Tactics rollout status
updated: 2025-12-21
---

# Evo-Tactics rollout status

## Snapshot settimanale

- **Data riferimento:** 2025-12-21
- **Owner aggiornamento:** Gameplay Ops · Evo rollout crew
- **Status generale:** on-track
- **Ultimo report:** `reports/evo/rollout/species_ecosystem_gap.md`

## Avanzamento epiche ROL-\*

| Epic   | Stato    | Progress (%) | Note/Blocker                                                                                                                                                             |
| ------ | -------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ROL-01 | on-track |          100 | Frontmatter archivio aggiornato con `scripts/evo_tactics_metadata_diff.py --mode=backfill` (output verificato su `incoming/archive/2025-12-19_inventory_cleanup/`).      |
| ROL-02 | on-track |          100 | Mappa ancore generata in `docs/evo-tactics/anchors-map.csv` e notifiche inviate a DevRel per l'aggiornamento wiki.                                                       |
| ROL-03 | at-risk  |           30 | Snapshot playbook ancora da redigere; dipende dalla riconciliazione cambi doc legacy.                                                                                    |
| ROL-04 | on-track |           60 | Script `tools/traits/sync_missing_index.py` integrato nel workflow `.github/workflows/traits-sync.yml`; restano verifiche QA su descrizioni multilingua.                 |
| ROL-05 | on-track |           45 | Export partner `reports/evo/rollout/traits_external_sync.csv` pubblicato automaticamente su S3 (bucket partners) in attesa di approvazione Partner Success.              |
| ROL-06 | on-track |           55 | Telemetria arricchita con `sentience_index` e fallback slot applicato in `server/services/nebulaTelemetryAggregator.js`; restano fixture Atlas/telemetria da aggiornare. |

## Deliverable imminenti

- [ ] 2026-01-05 – Snapshot playbook security/PMO – Owner Security PMO – Artefatti `incoming/archive/2025-12-19_inventory_cleanup/playbook_*.md`
- [ ] 2026-01-12 – QA generatori trait Evo – Owner Gameplay Data – Artefatto `reports/evo/qa/trait-generators.log`
- [ ] 2026-01-19 – Demo telemetria specie (ROL-06) – Owner Gameplay Ops – Artefatti `reports/evo/rollout/species_ecosystem_gap.md`, log QA Atlas

## Rischi e mitigazioni

1. **Rischio:** Descrizioni inglesi mancanti per i trait sincronizzati automaticamente.
   - **Impatto:** Medio (export partner potrebbe richiedere revisione manuale).
   - **Mitigazione:** DevRel compilerà le traduzioni entro il QA del 12 gennaio; issue aperta in board ROL-04.
2. **Rischio:** Mock telemetria Atlas non ancora aggiornati ai nuovi campi `sentience_index` e fallback slot.
   - **Impatto:** Medio (possibili failure nei test end-to-end).
   - **Mitigazione:** task `ROL-06` prevede aggiornamento fixture e rerun `npm run test:telemetry` entro la prossima sprint.

## Decisioni e azioni

- **Decisione:** Automatizzare la sincronizzazione trait con il workflow `traits-sync` e pubblicare gli export su S3 condiviso.
  - **Data:** 2025-12-28
  - **Partecipanti:** Gameplay Ops, DevRel, Partner Success
  - **Riferimenti:** `.github/workflows/traits-sync.yml`, `docs/tooling/evo.md`, `reports/evo/rollout/documentation_gap.md`
- **Azione:** Aggiornare le fixture Atlas con payload `sentience_index` e fallback slot.
  - **Owner:** Gameplay Ops
  - **Scadenza:** 2026-01-10
  - **Link task:** ROL-06
