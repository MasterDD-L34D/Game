# Workflow & strumenti

Questa sezione raccoglie il flusso operativo consolidato e i comandi principali da eseguire durante la manutenzione del catalogo.

## Percorso manuale consigliato

1. **Allineare il glossario**: aggiornare `data/core/traits/glossary.json` con label/description approvate e validare il file con `python -m json.tool` prima di procedere.【F:README_HOWTO_AUTHOR_TRAIT.md†L15-L26】
2. **Compilare/aggiornare il trait** seguendo lo schema e assicurandosi di popolare tutti i campi obbligatori (slot, tier, sinergie, conflitti). Qualsiasi cambio di slug/id o struttura va concordato con il Trait Curator prima della PR.【F:README_HOWTO_AUTHOR_TRAIT.md†L28-L39】【F:docs/contributing/traits.md†L17-L30】
3. **Verificare l'anteprima nel Trait Editor standalone**: avviare `npm run dev` da `Trait Editor/`, collegare il datasource con `VITE_TRAIT_DATA_SOURCE=remote` e `VITE_TRAIT_DATA_URL=../data/traits/index.json`, quindi confermare che form e anteprime riflettano le modifiche appena introdotte.【F:Trait Editor/README.md†L12-L45】【F:docs/traits-manuale/06-standalone-trait-editor.md†L14-L41】
4. **Sincronizzare i report** generando `reports/trait_fields_by_type.json` e `reports/trait_texts.json` tramite `python tools/py/collect_trait_fields.py`, quindi propagare le localizzazioni con `scripts/sync_trait_locales.py`. Per sinergie/species_affinity coinvolgi lo Species Curator.【F:README_HOWTO_AUTHOR_TRAIT.md†L41-L58】【F:docs/contributing/traits.md†L34-L69】
5. **Rigenerare indice, baseline e coverage** per verificare coerenza con specie e regole ambientali (`build_trait_index.js`, `build_trait_baseline.py`, `report_trait_coverage.py`). Coordinare con Species Curator per i link specie-trait e con Biome & Ecosystem Curator per requisiti ambientali e `biome_tags`.【F:docs/contributing/traits.md†L36-L88】【F:docs/process/trait_data_reference.md†L91-L123】
6. **Eseguire gli audit finali** (`validate_registry_naming.py`, `scripts/trait_audit.py --check`) e archiviare i log in `logs/`.【F:docs/contributing/traits.md†L89-L142】【F:docs/process/trait_data_reference.md†L124-L167】
7. **Compilare la checklist PR** verificando flag di completezza, localizzazioni sincronizzate e impatti su coverage/baseline.【F:README_HOWTO_AUTHOR_TRAIT.md†L62-L75】

## Strumenti e comandi principali

| Obiettivo                   | Comando                                                                                                                         | Output                                                                          | Fonte                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Validazione schema trait    | `python tools/py/trait_template_validator.py --summary`                                                                         | Verifica campi obbligatori e restituisce riepilogo per tipologia.               | 【F:docs/README_TRAITS.md†L23-L32】【F:docs/traits_template.md†L26-L47】                                                                        |
| Report campi & glossario    | `python tools/py/collect_trait_fields.py --output reports/trait_fields_by_type.json --glossary-output reports/trait_texts.json` | Aggiorna report per famiglia e testi approvati.                                 | 【F:docs/contributing/traits.md†L34-L41】【F:docs/traits_template.md†L118-L157】                                                                |
| Sync localizzazioni         | `python scripts/sync_trait_locales.py --language it --glossary data/core/traits/glossary.json`                                  | Allinea i file `locales/<lingua>/traits.json`.                                  | 【F:docs/contributing/traits.md†L38-L69】                                                                                                       |
| Ricostruzione indice        | `node scripts/build_trait_index.js --output data/traits/index.csv`                                                              | Genera indice rapido con flag di completezza e metadati.                        | 【F:docs/process/trait_data_reference.md†L10-L13】【F:docs/contributing/traits.md†L71-L88】                                                     |
| Baseline & coverage         | `python tools/py/build_trait_baseline.py ...` + `python tools/py/report_trait_coverage.py ...`                                  | Aggiorna `data/derived/analysis/` e fallisce in strict se mancano collegamenti. | 【F:docs/contributing/traits.md†L75-L88】【F:docs/process/trait_data_reference.md†L107-L163】                                                   |
| Audit completo              | `python3 scripts/trait_audit.py --check`                                                                                        | Produce/valida `logs/trait_audit.md` e pipeline di verifica finale.             | 【F:docs/contributing/traits.md†L40-L42】【F:docs/process/trait_data_reference.md†L13-L15】【F:docs/process/trait_data_reference.md†L145-L163】 |
| Anteprima editor standalone | `npm run dev` (da `Trait Editor/`, con variabili `VITE_TRAIT_DATA_SOURCE`, `VITE_TRAIT_DATA_URL`)                               | Interfaccia AngularJS con sync remoto e fallback mock automatico.               | 【F:Trait Editor/README.md†L12-L45】【F:docs/traits-manuale/06-standalone-trait-editor.md†L14-L41】                                             |

## Checklist rapida

- [ ] Glossario, trait e report aggiornati (`reports/trait_fields_by_type.json`, `reports/trait_texts.json`).【F:README_HOWTO_AUTHOR_TRAIT.md†L62-L75】
- [ ] `data/traits/index.json` allineato con specie/eventi/ambiente (sinergie reciproche e flag aggiornati).【F:docs/process/trait_data_reference.md†L91-L124】
- [ ] Coverage e baseline rigenerate (`data/derived/analysis/trait_coverage_report.json`, `data/derived/analysis/trait_baseline.yaml`).【F:docs/process/trait_data_reference.md†L105-L123】【F:docs/process/trait_data_reference.md†L151-L163】
- [ ] Log di audit salvati (`logs/trait_audit.md`) e comandi eseguiti riportati nella PR.【F:docs/contributing/traits.md†L89-L142】
- [ ] Trait Editor standalone configurato sul dataset ufficiale (`VITE_TRAIT_DATA_SOURCE=remote`, `VITE_TRAIT_DATA_URL=../data/traits/index.json`) con anteprime verificate.【F:docs/traits-manuale/06-standalone-trait-editor.md†L26-L41】
- [ ] Nuove regole ambientali o specie collegate documentate nella sezione [Collegamenti cross-dataset](04-collegamenti-cross-dataset.md).

> **Warning:** non rigenerare baseline/coverage o modificare slug/id senza l'ok del Trait Curator; le modifiche a `species_affinity` richiedono il via dello Species Curator, mentre `requisiti_ambientali`/`biome_tags` vanno sempre validate con il Biome & Ecosystem Curator.

Per esplorare ulteriori analisi (gap, coverage storica, baseline PI) consultare la directory `data/derived/analysis/` e i report JSON/CSV generati dagli script ETL, mantenendo i link aggiornati nelle note PR quando vengono rigenerati.【F:docs/process/trait_data_reference.md†L10-L163】
