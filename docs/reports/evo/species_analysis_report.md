# Species analysis – checkpoint 2026-02-20

## Sintesi dataset
- **Origine dati:** `data/external/evo/species` (10 specie, 20 ecotipi)【F:docs/reports/evo/species_summary.md†L5-L12】.
- **Validazione recente:** nessun file specie in `incoming/` durante l’ultima esecuzione AJV; 5 trait validati come sanity check【F:docs/reports/evo/qa/dataset.log†L1-L17】.
- **Copertura biomi:** 9 classi bioma totali, con combinazione di ambienti acquatici, sotterranei e terrestri【F:docs/reports/evo/species_summary.md†L9-L10】.

## Evidenze chiave
- Le specie attuali mantengono **ecotipo doppio** (2 per ciascuna) con trait adjustments modesti (1–2 per ecotipo)【F:docs/reports/evo/species_summary.md†L12-L48】.
- Il pacchetto è stabile: nessuna regressione o nuova specie introdotta nel batch, solo verifica di consistenza.

## Gap e follow-up
1. Mantenere il monitoraggio su nuove importazioni: l’assenza di specie in `incoming` suggerisce che il prossimo batch dovrà portare nuovi YAML per estendere la copertura.
2. Validare la coerenza ecotipo/bioma quando verranno aggiunte nuove specie, riusando `species_summary_script.py` per rigenerare il CSV/MD.
3. Aggiornare la mappa ecotipi↔biomi se i nuovi inserimenti alterano la copertura attuale delle 9 classi.
