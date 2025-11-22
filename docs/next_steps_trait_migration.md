# Piano operativo prossimo ciclo (trait e documentazione)

## Accesso rapido

- [Scheda operativa trait](traits_scheda_operativa.md) — requisiti minimi, flusso end-to-end e comandi rapidi.
- [Guida Evo Tactics Pack v2](Guida_Evo_Tactics_Pack_v2.md) — mapping `trait_code → id`/label i18n e plus opzionali.
- [Guida autori trait](README_HOWTO_AUTHOR_TRAIT.md) — checklist PR e pipeline operativa.

Questo piano elenca le attività prioritarie dopo il completamento delle integrazioni attuali. Ogni area indica obiettivi, output attesi e strumenti/comandi da usare, seguendo la guida `docs/Guida_Evo_Tactics_Pack_v2.md` e la scheda operativa (`docs/traits_scheda_operativa.md`).

## 1) Conversione e copertura dei tratti

- **Obiettivo:** convertire tutti i trait del pack al formato del repository usando il mapping `trait_code → id` snake_case e i riferimenti i18n.
- **Attività:**
  - Allineare glossario (`data/core/traits/glossary.json`) con label/description IT/EN per ogni nuovo `id`.
  - Aggiornare/creare i JSON in `data/traits/<categoria>/` con i campi obbligatori (id, label i18n, data_origin, famiglia_tipologia, fattore_mantenimento_energetico, tier, slot, sinergie, conflitti, mutazione_indotta, uso_funzione, spinta_selettiva).
  - Valutare l’aggiunta dei campi opzionali Evo v2 (`metrics` UCUM, `cost_profile`, `testability`) dove disponibili.
- **Comandi:**
  - `python tools/py/trait_template_validator.py data/traits/<categoria>/<id>.json`
  - `python tools/py/collect_trait_fields.py --output reports/trait_fields_by_type.json --glossary data/core/traits/glossary.json --glossary-output reports/trait_texts.json`
  - `python scripts/sync_trait_locales.py --traits-dir data/traits --locales-dir locales --language it --glossary data/core/traits/glossary.json`

## 2) Riorganizzazione documentazione in `docs/`

- **Obiettivo:** spostare i markdown ancora in root o in percorsi non standard dentro `docs/`, rispettando lo SSoT documentale.
- **Attività:**
  - Mappare i file da spostare (es. guide operative, metriche UCUM, QA) alle sottocartelle target indicate in `INTEGRAZIONE_GUIDE.md`.
  - Aggiornare eventuali indici (`docs/INDEX.md` o equivalenti) dopo i movimenti.
- **Verifica automatica:** eseguire un controllo link (es. `npx markdown-link-check docs/**/*.md` o script equivalente) per intercettare riferimenti rotti.

## 3) Allineamento link e compatibilità Evo v2 ↔ repo

- **Obiettivo:** garantire coerenza tra `docs/Guida_Evo_Tactics_Pack_v2.md`, `docs/traits_scheda_operativa.md`, `README_HOWTO_AUTHOR_TRAIT.md` e gli altri reference.
- **Attività:**
  - Correggere eventuali link relativi errati (specialmente in sezioni “Accesso rapido”).
  - Aggiornare la guida Evo con il promemoria sui campi obbligatori del repo e sul mapping `trait_code` → `id`, mantenendo i plus Evo v2 come opzionali.
  - Inserire rimandi incrociati (scheda operativa ↔ guida Evo ↔ template) per ridurre duplicazioni.

## 4) Migrazione v1 → v2 (specie/trait esistenti)

- **Obiettivo:** applicare la pipeline di migrazione del pacchetto Evo v2 su specie e tratti legacy.
- **Attività:**
  - Normalizzare naming, UCUM e versioning nei file esistenti.
  - Aggiornare alias/aggregati (`traits_aggregate.json`, cataloghi specie) dopo la migrazione.
- **Controlli:** eseguire validator/sync come in sezione 1 e, se necessario, `scripts/validate.sh`/`ajv` per pacchetti esterni prima dell’import.

## 5) Checklist finale e QA

- **Output atteso:**
  - Glossario e JSON dei trait validati, report rigenerati, localizzazioni sincronizzate.
  - Documentazione riallineata in `docs/` con link funzionanti.
- **QA:**
  - Rieseguire i validator del repo dopo ogni batch.
  - Eseguire il link checker sulla documentazione e rivedere i diff in `reports/` e `locales/`.

## Note operative

- Usa `docs/traits_scheda_operativa.md` e `README_HOWTO_AUTHOR_TRAIT.md` come fonte canonica per i requisiti minimi del repository.
- Tratta `docs/Guida_Evo_Tactics_Pack_v2.md` come estensione: mappa sempre `trait_code` → `id` snake_case e inserisci i plus Evo v2 solo come opzionali nei JSON del repo.
