# Come scrivere o aggiornare un trait

Questa guida operativa raccoglie il vademecum aggiornato per ideare, modellare e
consegnare un trait nel catalogo del gioco. È pensata come riferimento rapido
per autori e reviewer e integra la documentazione tecnica presente in `docs/`.

## 1. Prima di iniziare

- Consulta la [scheda operativa completa](./traits_scheda_operativa.md) per
  campi, vincoli e checklist; se ti serve il contesto completo su mapping
  Evo v2 ↔ repository, passa per la [Guida Evo Tactics Pack v2](./Guida_Evo_Tactics_Pack_v2.md)
  e il [template dati](./traits_template.md) invece di duplicare regole.
- Tieni a portata il [piano operativo prossimo ciclo](./next_steps_trait_migration.md) per seguire le priorità correnti su conversione tratti, riordino documentazione e QA.

### Compatibilità Evo Pack v2

Per importare o riallineare tratti provenienti da pacchetti Evo, fai riferimento a `traits_evo_pack_alignment.md`, che mappa i campi Evo (`trait_code`, `testability`, `cost_profile`, metriche UCUM) sui campi obbligatori del repo (`id` snake_case, `label` i18n, `data_origin`, `mutazione_indotta`, `uso_funzione`, `spinta_selettiva`, ecc.) e descrive il flusso glossario → file trait → validazioni (`trait_template_validator`, `collect_trait_fields`, `sync_trait_locales`, `validate.sh`/`ajv`).

1. Identifica il ruolo narrativo e tattico del trait (slot, tier, macro-tipologia).
2. Recupera i riferimenti dal [template dati](traits_template.md) e dai
   report correnti (`reports/trait_fields_by_type.json`, `reports/trait_texts.json`).
3. Allinea label e descrizioni con il team di design/localization prima di
   procedere agli update dei file.

## 2. Aggiornare il glossario

1. Apri `data/core/traits/glossary.json` e aggiungi (o aggiorna) la voce del
   trait con almeno:
   - `label_it` / `label_en`
   - `description_it` / `description_en`
2. Mantieni il testo conciso (≤ 160 caratteri) e coerente con il tono del gioco.
3. Esegui un lint veloce per validare la sintassi JSON:
   ```bash
   python -m json.tool data/core/traits/glossary.json > /tmp/trait_glossary.json
   mv /tmp/trait_glossary.json data/core/traits/glossary.json
   ```

## 3. Compilare il file trait

1. Duplica lo scheletro minimo dal template e salva in `data/traits/<tipologia>/<id>.json`.
2. Popola i campi obbligatori (`id`, `label`, `famiglia_tipologia`, `tier`,
   `mutazione_indotta`, `uso_funzione`, `spinta_selettiva`, `sinergie`, `conflitti`).
   - Per sinergie/conflitti usa solo gli `id` repository (nessun `trait_code`), come indicato nel box di esempio della [Guida Evo](./Guida_Evo_Tactics_Pack_v2.md#avvertenza-migrazione-pack--%E2%86%92-repository-game).
   - I campi aggiuntivi del pack (`metrics`, `cost_profile`, `testability`, ecc.) restano facoltativi: portali nel repository solo se compatibili con lo schema base.
3. Inserisci i testi come stringhe reali **solo** se stai creando il trait da
   zero; al termine eseguirai lo script di sincronizzazione che li convertirà in
   riferimenti `i18n:traits.<id>.<campo>`.
4. Valida il file con lo schema:
   ```bash
   python tools/py/trait_template_validator.py data/traits/<tipologia>/<id>.json
   ```

## 4. Sincronizzare localizzazioni e report

1. Genera il riepilogo dei campi e delle stringhe approvate:
   ```bash
   python tools/py/collect_trait_fields.py \
     --output reports/trait_fields_by_type.json \
     --glossary data/core/traits/glossary.json \
     --glossary-output reports/trait_texts.json
   ```
2. Propaga label e descrizioni approvate nelle localizzazioni (italiano di
   default, sostituisci `--language` se necessario):
   ```bash
   python scripts/sync_trait_locales.py \
     --traits-dir data/traits \
     --locales-dir locales \
     --language it \
     --glossary data/core/traits/glossary.json
   ```
3. Riesegui i generatori di indice/coverage se richiesto dalla checklist del
   team (`build_trait_index.js`, `report_trait_coverage.py`).

## 5. Checklist PR

- [ ] Glossario aggiornato con label/description nelle lingue supportate.
- [ ] File trait valido secondo lo schema e con riferimenti `i18n:`.
- [ ] `reports/trait_fields_by_type.json` e `reports/trait_texts.json` rigenerati
      (allega gli output o includi il comando nel log PR).
- [ ] `scripts/sync_trait_locales.py` eseguito (eventualmente in `--dry-run`) e
      diff `locales/<lingua>/traits.json` revisionato.
- [ ] Copertura e baseline aggiornate se il trait influisce su queste metriche.
- [ ] Changelog/rollout plan aggiornati con note operative se il trait introduce
      processi o naming nuovi.

Seguendo questi passaggi il team di revisione potrà validare rapidamente i
contenuti, mantenendo allineati glossario, localizzazioni e checklist operative.
