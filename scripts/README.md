# Script Node

## `build_trait_index.js`

```bash
node scripts/build_trait_index.js [--traits-dir <percorso>] [--output <file>] [--format json|csv]
```

- Genera l'indice rapido dei trait (`index.json`/`index.csv`) e calcola i flag di completezza.
- Aggiunge controlli formali su naming (`label` i18n o stringhe ripulite, `famiglia_tipologia` nel
  formato `<Macro>/<Sotto>`), slug (`biome_tags`, `usage_tags`, `data_origin`) e campi
  `species_affinity` (slug con trattini e ruoli `^[a-z0-9_]+$`).
- Verifica i valori UCUM in `metrics[].unit` e gli URI ENVO in `applicability.envo_terms`.
- L'opzione `--traits-dir` consente di validare directory alternative (fixture/test) senza modificare
  `data/traits/`; il comando fallisce se viene rilevata una violazione.
