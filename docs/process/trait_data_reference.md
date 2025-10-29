# Trait Data Reference & Workflow

Questa guida riassume dove risiedono i dati dei tratti e quali script utilizzare per mantenerli coerenti. È pensata come riferimento rapido durante l'aggiornamento dei registri o la creazione di nuovi tratti.

## Struttura dei file

| Percorso | Contenuto | Note |
| --- | --- | --- |
| `data/traits/glossary.json` | Glossario condiviso con label ufficiali, descrizioni sintetiche e collegamento al reference principale. | Usato da strumenti ETL e validazione. |
| `packs/evo_tactics_pack/docs/catalog/trait_reference.json` | Sorgente autorevole per tier, slot, sinergie, requisiti ambientali e metadati PI. | Duplicato in `docs/evo-tactics-pack/trait-reference.json` per distribuzione web. |
| `packs/evo_tactics_pack/docs/catalog/env_traits.json` | Mappa le condizioni ambientali (biomi, hazard, ecc.) ai tratti disponibili. | Necessario per report di coverage. |
| `logs/trait_audit.md` | Output dell'audit di coerenza; deve essere privo di warning prima di aprire una PR. | Generato da `scripts/trait_audit.py`. |
| `data/analysis/trait_baseline.yaml` & `data/analysis/trait_coverage_report.json` | Baseline e report di coverage aggiornati dagli script ETL. | Utili per verificare la copertura sui nove assi. |

## Workflow di aggiornamento

1. **Allineare il glossario** – aggiungere o aggiornare le voci in `data/traits/glossary.json`, assicurandosi che `trait_reference` punti al file del pack.
2. **Aggiornare il trait reference** – editare `packs/evo_tactics_pack/docs/catalog/trait_reference.json` (e sincronizzare la copia in `docs/evo-tactics-pack/trait-reference.json`).
   - Popolare i campi obbligatori: `tier`, `slot`, `slot_profile`, `sinergie`, `conflitti`, `requisiti_ambientali`, `mutazione_indotta`, `uso_funzione`, `spinta_selettiva`, `debolezza`.
   - Ogni sinergia deve essere **reciproca**: se il tratto A elenca il tratto B, anche B deve elencare A.
3. **Aggiornare le regole ambientali** – se necessario, associare il tratto in `packs/evo_tactics_pack/docs/catalog/env_traits.json`.
4. **Rigenerare la baseline** – eseguire:
   ```bash
   python tools/py/build_trait_baseline.py \
     packs/evo_tactics_pack/docs/catalog/env_traits.json \
     packs/evo_tactics_pack/docs/catalog/trait_reference.json \
     --trait-glossary data/traits/glossary.json
   ```
   Questo aggiorna `data/analysis/trait_baseline.yaml`.
5. **Aggiornare i report di coverage** – eseguire:
   ```bash
   python tools/py/report_trait_coverage.py \
     --env-traits packs/evo_tactics_pack/docs/catalog/env_traits.json \
     --trait-reference packs/evo_tactics_pack/docs/catalog/trait_reference.json \
     --trait-glossary data/traits/glossary.json \
     --out-json data/analysis/trait_coverage_report.json \
     --out-csv data/analysis/trait_coverage_matrix.csv
   ```
6. **Analizzare i gap rispetto ai dati ETL** – usare:
   ```bash
   python tools/analysis/trait_gap_report.py \
     --trait-reference packs/evo_tactics_pack/docs/catalog/trait_reference.json \
     --trait-glossary data/traits/glossary.json \
     --etl-report data/mock/prod_snapshot/analysis/trait_coverage_report.json \
     --out data/analysis/trait_gap_report.json
   ```
7. **Validare naming e integrità** – controllare che i registri restino coerenti:
   ```bash
   python tools/py/validate_registry_naming.py \
     --trait-glossary data/traits/glossary.json \
     --trait-reference packs/evo_tactics_pack/docs/catalog/trait_reference.json \
     --project-index config/project_index.json \
     --env-rules packs/evo_tactics_pack/tools/config/registries/env_to_traits.yaml \
     --hazards packs/evo_tactics_pack/tools/config/registries/hazards.yaml \
     --biomes packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml \
     --species-root packs/evo_tactics_pack/data/species
   ```
8. **Eseguire l'audit finale** – rigenerare `logs/trait_audit.md` e assicurarsi che non ci siano warning o errori:
   ```bash
   python3 scripts/trait_audit.py
   python3 scripts/trait_audit.py --check
   ```

## Suggerimenti

- Le modifiche ai tratti spesso impattano più file; usa questo flusso come checklist per evitare omissioni.
- Mantieni le liste (`sinergie`, `conflitti`, `requisiti_ambientali`) ordinate alfabeticamente per ridurre i diff rumorosi.
- Quando aggiungi nuovi tratti, valida anche gli asset PI correlati in `packs/evo_tactics_pack/data/species` se presenti.
