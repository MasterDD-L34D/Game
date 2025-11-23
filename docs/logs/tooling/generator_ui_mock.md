# Generator UI mock · 2025-10-28
- **Dataset**: `data/derived/mock/prod_snapshot/` (override via `?data-root`), duplicato anche sotto `data/derived/mock/prod_snapshot/data/` per compatibilità con la dashboard.
- **Trait nuovi visibili**: il Dune Stalker mostra `Sensori Geomagnetici` nel blocco core e `Lamelle Termoforetiche` fra gli opzionali nella sezione "Trait plan prioritario" della dashboard.
- **Verifica automatica**: `npm --prefix tools/ts run test:web` (Playwright) ✓ — include lo scenario `trait plan mostra i nuovi core/optional` che allega lo screenshot come artefatto di test e aggiorna il log `logs/tooling/trait-plan-dashboard.log`.
- **Report collegati**: profilo generatore [`logs/tooling/generator_run_profile.json`](../../../logs/tooling/generator_run_profile.json) · output Playwright (artefatto CI, vedi [`tools/ts/scripts/run_playwright_tests.mjs`](../../../tools/ts/scripts/run_playwright_tests.mjs) per percorso e generazione).

```text
# Trait plan snapshot
source: data/derived/mock/prod_snapshot/
cards: 1

## Dune Stalker (dune_stalker)
- Core
  - Artigli Sette Vie [artigli_sette_vie] (core)
  - Struttura Elastica Amorfa [struttura_elastica_amorfa] (core)
  - Scheletro Idro Regolante [scheletro_idro_regolante] (core)
  - Sensori Geomagnetici [sensori_geomagnetici] (core)
- Opzionali
  - Coda Frusta Cinetica [coda_frusta_cinetica] (optional)
  - Sacche Galleggianti Ascensoriali [sacche_galleggianti_ascensoriali] (optional)
  - Criostasi Adattiva [criostasi_adattiva] (optional)
  - Lamelle Termoforetiche [lamelle_termoforetiche] (optional)
- Sinergie
  - Focus Frazionato [focus_frazionato] (synergy)
  - Risonanza Di Branco [risonanza_di_branco] (synergy)
  - Tattiche Di Branco [tattiche_di_branco] (synergy)
```

> Reminder: raccogli feedback entro **2025-11-22** e aggiorna questa pagina con eventuali regression o TODO emersi dalla dashboard.
