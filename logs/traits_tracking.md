# Monitoraggio Inventario Trait

## Checklist
- [x] Inventario aggiornato (`docs/catalog/traits_inventory.json`, 2025-10-27T10:47:13Z)
- [x] Classificati 18 specie e 4 eventi nei dataset `packs/evo_tactics_pack/data/species`
- [x] Annotate fonti reference core (`trait_reference`, `env_traits`, glossari)
- [ ] Consolidare il prototipo `data/species.yaml` nel catalogo principale
- [ ] Promuovere o rigenerare i dataset analitici mock (`data/analysis/*`) con coperture reali
- [ ] Validare/integrare gli output mock in `packs/evo_tactics_pack/out/patches`

## Aree mancanti da includere
- Le tabelle di copertura (`trait_coverage_report.json`, `trait_coverage_matrix.csv`) riportano 0 specie collegate: servono dati di pairing specie/trait.
- `data/analysis/trait_baseline.yaml` e `trait_env_mapping.json` restano generati automaticamente: richiedono revisione designer per diventare core.
- Nessuna fonte in `appendici/` contiene ancora riferimenti a trait: valutare se aggiungere appendici di design dedicate.
- Output patch (`out/patches`) hanno solo suggerimenti generici: integrare parametri encounter completi o rimuoverli se obsoleti.
