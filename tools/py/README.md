# Tooling Python

La directory contiene gli script CLI utilizzati per validare e generare i dataset dei tratti. Di seguito
sono riportati i comandi aggiornati con i controlli introdotti in questa revisione.

## `trait_template_validator.py`

```bash
python tools/py/trait_template_validator.py [--traits-dir <percorso>] [--index <index.json>] [--summary]
```

- Convalida file e indice contro `config/schemas/trait.schema.json`.
- Blocca l'esecuzione se `label`, `mutazione_indotta`, `uso_funzione`, `spinta_selettiva`, `debolezza` o
  `famiglia_tipologia` non rispettano le convenzioni (`i18n:` o stringhe ripulite, formato `<Macro>/<Sotto>`).
- Verifica che `id` sia uno slug lower_snake_case allineato al nome file, che gli slot siano lettere
  singole e che `sinergie[]`/`conflitti[]` mantengano lo slug richiesto.
- Verifica che `metrics[].unit` utilizzi stringhe UCUM valide (senza spazi) e che `metrics[].name` sia
  privo di spazi ai bordi.
- Controlla che `species_affinity` utilizzi slug ammessi (`species_id` con trattini, `roles[]` in
  `^[a-z0-9_]+$`) e che `applicability.envo_terms` contenga URI ENVO.
- L'opzione `--summary` continua a produrre l'inventario dei campi per tipologia.

## `report_trait_coverage.py`

```bash
python tools/py/report_trait_coverage.py \
  --env-traits <env_traits.json> \
  --trait-reference <trait_reference.json> \
  --species-root <dir_specie> \
  --out-json <report.json> [--out-csv <matrice.csv>] [--strict]
```

- Rigenera il report di coverage (JSON/CSV) e fallisce se le entry `species_affinity` del catalogo
  puntano a specie non presenti nel repository, se gli identificativi non rispettano lo slug richiesto o
  se le metriche contengono unità UCUM non valide.
- In presenza di `--strict` rimangono attivi i controlli sulle soglie di copertura (`traits_with_species`
  e `rules_missing_species_total`).
- Stampa warning dedicati quando il catalogo specie non è disponibile (PyYAML mancante) o non contiene
  elementi utili alla validazione.

## `styleguide_compliance_report.py`

```bash
python tools/py/styleguide_compliance_report.py \
  [--traits-dir data/traits] \
  [--glossary data/core/traits/glossary.json] \
  [--out-markdown reports/styleguide_compliance.md] \
  [--out-json reports/styleguide_compliance.json] \
  [--history-file logs/trait_audit/styleguide_compliance_history.json] \
  [--sla-config config/styleguide_sla.json] \
  [--dashboard-bridge logs/qa/latest-dashboard-metrics.json] \
  [--dashboard-section styleguide] [--strict]
```

- Calcola i KPI di conformità dello styleguide (naming, descrizioni localizzate, unità UCUM) e aggiorna
  sia il report Markdown sia l'output JSON per l'automazione.
- Mantiene uno storico giornaliero per visualizzare trend e regressioni, generando alert quando i KPI
  scendono sotto le soglie definite in `config/styleguide_sla.json`.
- Con `--strict` esce con codice di errore se una delle metriche viola lo SLA, abilitando trigger
  automatici per l'apertura di issue.
- Aggiorna automaticamente il bridge `logs/qa/latest-dashboard-metrics.json` (se disponibile) con uno
  snapshot sintetico dei KPI, così da alimentare i dashboard esistenti senza step aggiuntivi.
