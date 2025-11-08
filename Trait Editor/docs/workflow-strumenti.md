# Workflow & strumenti

> Copia adattata di `docs/traits-manuale/05-workflow-strumenti.md`.
> Revisionata per l'utilizzo dentro il pacchetto standalone.

Questa sezione raccoglie il flusso operativo consolidato e i comandi principali da eseguire durante la manutenzione del catalogo. I riferimenti puntano ai file del monorepo quando richiesto e alla documentazione locale quando disponibile.

## Percorso manuale consigliato

1. **Allineare il glossario**
   - Aggiorna `../data/core/traits/glossary.json` con label/description approvate.
   - Valida il JSON con `python -m json.tool` prima di procedere.
   - Riferimento: `README_HOWTO_AUTHOR_TRAIT.md` nel monorepo.
2. **Compilare/aggiornare il trait**
   - Segui lo schema e popola slot, tier, sinergie, conflitti.
   - Consulta `docs/traits_template.md` e le linee guida in `docs/contributing/traits.md`.
3. **Verificare l'anteprima nel Trait Editor standalone**
   - Avvia `npm run dev` da `Trait Editor/`.
   - Imposta `VITE_TRAIT_DATA_SOURCE=remote` e `VITE_TRAIT_DATA_URL=../data/traits/index.json`.
   - Approfondimento: [STANDALONE Trait Editor](standalone-trait-editor.md).
4. **Sincronizzare i report**
   - Esegui `python tools/py/collect_trait_fields.py` per aggiornare `reports/trait_fields_by_type.json` e `reports/trait_texts.json`.
   - Propaga le localizzazioni con `python scripts/sync_trait_locales.py`.
5. **Rigenerare indice, baseline e coverage**
   - `node scripts/build_trait_index.js --output data/traits/index.csv`.
   - `python tools/py/build_trait_baseline.py` e `python tools/py/report_trait_coverage.py` per aggiornare `data/derived/analysis/`.
6. **Eseguire gli audit finali**
   - `python3 scripts/trait_audit.py --check`.
   - Archivia i log in `logs/` come parte della PR.
7. **Compilare la checklist PR**
   - Rivedi flag di completezza, localizzazioni, impatti su coverage/baseline.
   - Segui le checklist riportate in `README_HOWTO_AUTHOR_TRAIT.md` e `docs/contributing/traits.md`.

## Strumenti e comandi principali

| Obiettivo | Comando | Output |
| --- | --- | --- |
| Validazione schema trait | `python tools/py/trait_template_validator.py --summary` | Verifica campi obbligatori e restituisce riepiloghi per tipologia. |
| Report campi & glossario | `python tools/py/collect_trait_fields.py --output reports/trait_fields_by_type.json --glossary-output reports/trait_texts.json` | Aggiorna report per famiglia e testi approvati. |
| Sync localizzazioni | `python scripts/sync_trait_locales.py --language it --glossary data/core/traits/glossary.json` | Allinea `locales/<lingua>/traits.json`. |
| Ricostruzione indice | `node scripts/build_trait_index.js --output data/traits/index.csv` | Genera indice con flag di completezza e metadati. |
| Baseline & coverage | `python tools/py/build_trait_baseline.py ...` + `python tools/py/report_trait_coverage.py ...` | Aggiorna `data/derived/analysis/` e fallisce in strict se mancano collegamenti. |
| Audit completo | `python3 scripts/trait_audit.py --check` | Produce/valida `logs/trait_audit.md` e pipeline di verifica finale. |
| Anteprima editor standalone | `npm run dev` (da `Trait Editor/`, con `VITE_TRAIT_DATA_SOURCE`, `VITE_TRAIT_DATA_URL`) | Interfaccia AngularJS con sync remoto e fallback mock automatico. |
| Verifica TraitDataService | `node scripts/simulate-trait-source.mjs` | Simula un fetch remoto riuscito e un fallimento forzato, mostrando il ritorno ai mock. |

## Checklist rapida

- [ ] Glossario e report (`reports/trait_fields_by_type.json`, `reports/trait_texts.json`) aggiornati.
- [ ] `data/traits/index.json` allineato con specie/eventi/ambiente.
- [ ] Coverage e baseline rigenerate (`data/derived/analysis/trait_coverage_report.json`, `data/derived/analysis/trait_baseline.yaml`).
- [ ] Log di audit salvati (`logs/trait_audit.md`).
- [ ] Trait Editor standalone configurato sul dataset ufficiale (`VITE_TRAIT_DATA_SOURCE=remote`, `VITE_TRAIT_DATA_URL=../data/traits/index.json`).
- [ ] Collegamenti cross-dataset aggiornati quando necessario (`docs/traits-manuale/04-collegamenti-cross-dataset.md`).

Per esplorare ulteriori analisi (gap, coverage storica, baseline PI) consulta la directory `data/derived/analysis/` e i report JSON/CSV generati dagli script ETL. Mantieni i link aggiornati nelle note PR quando vengono rigenerati.

## Test del datasource remoto

- Il servizio [`TraitDataService`](../src/services/trait-data.service.ts) legge la configurazione da `import.meta.env`.
  - Se `VITE_TRAIT_DATA_SOURCE=remote`, delega il recupero a `resolveTraitSource`, passando l'eventuale override definito in `VITE_TRAIT_DATA_URL`.
  - Qualunque eccezione genera un `console.error('Impossibile caricare i tratti:', error)` e popola la cache locale con i mock (`getSampleTraits`).
- Il modulo [`resolveTraitSource`](../src/data/traits.sample.ts) tenta il fetch e, in caso di risposta non ok o di errore runtime, logga `console.warn('Falling back to sample traits after remote fetch failure:', error)` prima di restituire i mock.
- Puoi validare il comportamento senza avviare Vite eseguendo:
  ```bash
  cd "Trait Editor"
  node scripts/simulate-trait-source.mjs
  ```
  L'esecuzione produce un caso di successo con payload mock e un fallimento forzato (`503`) che conferma il fallback alla lista sample (`fallback traits length: 4`, matching sugli ID). Questo riflette esattamente ciò che accade in runtime quando l'endpoint remoto non risponde.
