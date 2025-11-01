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
- Verifica che `metrics[].unit` utilizzi stringhe UCUM valide e che `metrics[].name` sia privo di spazi ai
  bordi.
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
  puntano a specie non presenti nel repository o se i ruoli associati non rispettano lo slug richiesto.
- In presenza di `--strict` rimangono attivi i controlli sulle soglie di copertura (`traits_with_species`
  e `rules_missing_species_total`).
- Stampa warning dedicati quando il catalogo specie non è disponibile (PyYAML mancante) o non contiene
  elementi utili alla validazione.
