# Come scrivere o aggiornare un trait

Questa guida operativa raccoglie il vademecum aggiornato per ideare, modellare e
consegnare un trait nel catalogo del gioco. È pensata come riferimento rapido
per autori e reviewer e integra la documentazione tecnica presente in `docs/`.

## 1. Prima di iniziare

1. Identifica il ruolo narrativo e tattico del trait (slot, tier, macro-tipologia).
2. Recupera i riferimenti dal [template dati](docs/traits_template.md) e dai
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
