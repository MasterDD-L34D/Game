# Trait Data Reference & Workflow

Questa guida riassume dove risiedono i dati dei tratti e quali script utilizzare per mantenerli coerenti. È pensata come riferimento rapido durante l'aggiornamento dei registri o la creazione di nuovi tratti.

## Struttura dei file

| Percorso                                                                                         | Contenuto                                                                                                                                                                       | Note                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/core/traits/glossary.json`                                                                 | Glossario condiviso con label ufficiali, descrizioni sintetiche e collegamento al reference principale.                                                                         | Usato da strumenti ETL e validazione.                                                                                                                                                    |
| `data/traits/index.json`                                                                         | Sorgente autorevole per tier, slot, sinergie, requisiti ambientali e metadati PI.                                                                                               | Duplicato in `docs/evo-tactics-pack/trait-reference.json` (web) e `packs/evo_tactics_pack/docs/catalog/trait_reference.json` (bundle pack); **tutte le copie vanno aggiornate insieme**. |
| `data/traits/index.csv`                                                                          | Indice rapido dei file trait con label, categoria/tipo, percorso, flag di completezza e nuovi campi `data_origin`, `biome_tags`, `usage_tags`, `has_biome`, `has_species_link`. | Generato da `node scripts/build_trait_index.js` per facilitare audit e inventari.                                                                                                        |
| `packs/evo_tactics_pack/docs/catalog/env_traits.json`                                            | Mappa le condizioni ambientali (biomi, hazard, ecc.) ai tratti disponibili.                                                                                                     | Necessario per report di coverage.                                                                                                                                                       |
| `logs/trait_audit.md`                                                                            | Output dell'audit di coerenza; deve essere privo di warning prima di aprire una PR.                                                                                             | Generato da `scripts/trait_audit.py`.                                                                                                                                                    |
| `data/derived/analysis/trait_baseline.yaml` & `data/derived/analysis/trait_coverage_report.json` | Baseline e report di coverage aggiornati dagli script ETL.                                                                                                                      | Utili per verificare la copertura sui nove assi.                                                                                                                                         |
| `data/traits/_drafts/*.json`                                                                     | Bozze generate automaticamente da fonti esterne.                                                                                                                                | Popolate da `python tools/py/import_external_traits.py`; contengono `completion_flags.external_source = true`.                                                                           |

## Vincoli sui campi trait

- I campi localizzati (`label`, `mutazione_indotta`, `fattore_mantenimento_energetico`, `uso_funzione`,
  `spinta_selettiva`, `debolezza`) devono essere riferimenti `i18n:` oppure stringhe senza spazi di bordo.
- `famiglia_tipologia` mantiene il formato `<Macro>/<Sotto>` con caratteri alfanumerici, spazi o trattini
  (`Supporto/Logistico`, `Offensivo/Assalto`, ...).
- I tag (`biome_tags`, `usage_tags`) e `data_origin` utilizzano slug `^[a-z0-9_]+$`.
- `metrics[].unit` accetta esclusivamente stringhe UCUM (es. `m/s`, `Cel`, `1`) e `metrics[].name` deve
  essere già ripulito.
- Le entry `species_affinity` validano sia il formato dello slug (`species_id` supporta trattini) sia i
  ruoli (`roles[]` con slug `^[a-z0-9_]+$`).
- `applicability.envo_terms` richiede URI ENVO canonici (`http://purl.obolibrary.org/obo/ENVO_…`).

## Import da fonti esterne

Per monitorare gli asset consegnati nei canvas e nei drop YAML è disponibile lo script `tools/py/import_external_traits.py`. Il parser utilizza:

- **Appendici** (`appendici/*.txt`): front matter YAML per metadati e bullet `- **<sezione Tier N>**: ...` per estrarre i nomi dei tratti.
- **Manifest sentience** (`incoming/sentience_traits_v1.0.yaml`): loader YAML definitivo con milestone sensoriali/motorie T1…T6 e hook interocettivi da cui derivare descrizioni e gating ufficiali.

Esecuzione standard:

```bash
python tools/py/import_external_traits.py \
  --appendix-dir appendici \
  --incoming incoming/sentience_traits_v1.0.yaml \
  --output-dir data/traits/_drafts
```

Il comando sovrascrive la directory di destinazione generando bozze conformi allo schema trait, già etichettate con `data_origin` e `completion_flags.external_source = true`. Gli identificatori `data_origin` vengono normalizzati in slug (`^[a-z0-9_]+$`), ad esempio `incoming_sentience_traits_v1_0_t3_emergente`, così da rispettare il vincolo imposto dallo schema. Le bozze vanno poi integrate manualmente nel catalogo principale o scartate dopo la revisione.

Per includere il controllo nel workflow di audit è possibile avviare:

```bash
python scripts/trait_audit.py --import-external-drafts
```

Lo step richiama l'importer prima di eseguire le verifiche esistenti, così da produrre sempre l'elenco aggiornato dei draft.

## Workflow di aggiornamento

### Editor schema-driven

Per modifiche iterative è disponibile l'editor React ospitato nella mission console (`/console/traits`). Il modulo monta un form dinamico generato da `config/schemas/trait.schema.json` e valida ogni modifica sia lato client (AJV) sia lato server.

1. Avviare l'API locale esportando un token di scrittura (obbligatorio in produzione):
   ```bash
   export TRAIT_EDITOR_TOKEN="<token-segreto>"
   npm run start:api
   ```
2. In una seconda shell, avviare la webapp:
   ```bash
   npm --prefix webapp install   # solo al primo avvio
   npm --prefix webapp run dev
   ```
3. Aprire `http://localhost:5173/console/traits` e inserire il token nel pannello laterale. Tutte le richieste inviano sia `X-Trait-Editor-Token` sia `Authorization: Bearer` con il valore fornito.
4. Ogni salvataggio crea una copia della versione precedente in `data/traits/_versions/<trait_id>/<timestamp>.json` prima di sovrascrivere il file canonico.

### Percorso manuale

1. **Allineare il glossario** – aggiungere o aggiornare le voci in `data/core/traits/glossary.json`, assicurandosi che `trait_reference` punti a `data/traits/index.json`.
2. **Aggiornare il trait reference** – editare `data/traits/index.json` e sincronizzare le copie in `docs/evo-tactics-pack/trait-reference.json` **e** `packs/evo_tactics_pack/docs/catalog/trait_reference.json`.
   - Popolare i campi obbligatori: `tier`, `slot`, `slot_profile`, `sinergie`, `conflitti`, `requisiti_ambientali`, `mutazione_indotta`, `uso_funzione`, `spinta_selettiva`, `debolezza`.
   - Ogni sinergia deve essere **reciproca**: se il tratto A elenca il tratto B, anche B deve elencare A.
3. **Rigenerare l'indice rapido** – creare/aggiornare `data/traits/index.csv` per l'audit dei file:
   ```bash
   node scripts/build_trait_index.js --output data/traits/index.csv
   ```
   Il comando supporta anche `--format json` se serve produrre un riepilogo alternativo e `--traits-dir`
   per validare dataset di test senza toccare `data/traits/`. Il processo termina con errore se vengono
   rilevati slug non conformi, UCUM errati o `species_affinity` con specie inesistenti.
4. **Aggiornare le regole ambientali** – se necessario, associare il tratto in `packs/evo_tactics_pack/docs/catalog/env_traits.json`.
5. **Rigenerare la baseline** – eseguire:
   ```bash
   python tools/py/build_trait_baseline.py \
     packs/evo_tactics_pack/docs/catalog/env_traits.json \
     packs/evo_tactics_pack/docs/catalog/trait_reference.json \
     --trait-glossary data/core/traits/glossary.json
   ```
   Questo aggiorna `data/derived/analysis/trait_baseline.yaml`.
6. **Aggiornare i report di coverage** – eseguire:
   ```bash
   python tools/py/report_trait_coverage.py \
     --env-traits packs/evo_tactics_pack/docs/catalog/env_traits.json \
     --trait-reference packs/evo_tactics_pack/docs/catalog/trait_reference.json \
     --trait-glossary data/core/traits/glossary.json \
     --out-json data/derived/analysis/trait_coverage_report.json \
     --out-csv data/derived/analysis/trait_coverage_matrix.csv
   ```
   Lo script esce con codice diverso da zero se le entry `species_affinity` del catalogo fanno
   riferimento a specie non presenti nel repository o se i ruoli non rispettano lo slug richiesto.
7. **Analizzare i gap rispetto ai dati ETL** – usare:
   ```bash
   python tools/analysis/trait_gap_report.py \
     --trait-reference data/traits/index.json \
     --trait-glossary data/core/traits/glossary.json \
     --etl-report data/derived/mock/prod_snapshot/analysis/trait_coverage_report.json \
     --out data/derived/analysis/trait_gap_report.json
   ```
8. **Validare naming e integrità** – controllare che i registri restino coerenti:
   ```bash
   python tools/py/validate_registry_naming.py \
     --trait-glossary data/core/traits/glossary.json \
     --trait-reference data/traits/index.json \
     --project-index config/project_index.json \
     --env-rules packs/evo_tactics_pack/tools/config/registries/env_to_traits.yaml \
     --hazards packs/evo_tactics_pack/tools/config/registries/hazards.yaml \
     --biomes packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml \
     --species-root packs/evo_tactics_pack/data/species
   ```
9. **Eseguire l'audit finale** – rigenerare `logs/trait_audit.md` e assicurarsi che non ci siano warning o errori:
   ```bash
   python3 scripts/trait_audit.py
   python3 scripts/trait_audit.py --check
   ```

## Validazione automatica e riproduzione locale

I workflow CI `data-quality` e `validate-traits` installano le dipendenze Node.js e Python dichiarate in `package.json` e `requirements-dev.txt`, ricostruiscono l'indice dei tratti e generano il report di coverage in modalità strict. Per riprodurre lo stesso flusso in locale:

```bash
npm ci
python -m pip install -r requirements-dev.txt
python -m pip install jsonschema
node scripts/build_trait_index.js
python tools/py/report_trait_coverage.py --strict
```

Il comando `report_trait_coverage.py --strict` fallisce se il numero di tratti coperti dalle specie scende sotto 27 oppure se esistono combinazioni regola→bioma prive di specie collegate (`rules_missing_species_total > 0`). I report principali vengono aggiornati in `data/derived/analysis/` (coverage JSON/CSV) e i riepiloghi pronti per la consultazione rimangono in `reports/`, gli stessi file che la CI archivia come artifact post-build.

## Suggerimenti

- Le modifiche ai tratti spesso impattano più file; usa questo flusso come checklist per evitare omissioni.
- Mantieni le liste (`sinergie`, `conflitti`, `requisiti_ambientali`) ordinate alfabeticamente per ridurre i diff rumorosi.
- Quando aggiungi nuovi tratti, valida anche gli asset PI correlati in `packs/evo_tactics_pack/data/species` se presenti.
