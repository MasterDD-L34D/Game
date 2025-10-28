# Monitoraggio inventario trait

## 2025-10-28

### Checklist inventario
- [x] Aggiornato `docs/catalog/traits_inventory.json` con risorse da `data/analysis`, `data/traits` e telemetria.
- [x] Mappati i cataloghi `docs/catalog/` e `packs/evo_tactics_pack/docs/catalog/` con stato core/mock.
- [x] Registrate specie ed eventi `packs/evo_tactics_pack/data/species/**` con type coerente.
- [ ] Integrare eventuali trait provenienti da `appendici/` (nessun match `rg "trait"` individuato).
- [ ] Validare ulteriori pack oltre `evo_tactics_pack` e dataset runtime.

### Aree da includere
- Documentazione narrativa in `appendici/` quando conterrà sezioni trait-specifiche.
- Eventuali pack futuri (`packs/**`) con trait generati o manuali fuori da `evo_tactics_pack`.
- Script generatori in `tools/` che esportano trait per ambienti o scenari live.

## 2025-10-27

### Checklist
- [x] Inventario aggiornato (`docs/catalog/traits_inventory.json`, 2025-10-27T10:47:13Z)
- [x] Classificati 18 specie e 4 eventi nei dataset `packs/evo_tactics_pack/data/species`
- [x] Annotate fonti reference core (`trait_reference`, `env_traits`, glossari)
- [ ] Consolidare il prototipo `data/species.yaml` nel catalogo principale
- [ ] Promuovere o rigenerare i dataset analitici mock (`data/analysis/*`) con coperture reali
- [ ] Validare/integrare gli output mock in `packs/evo_tactics_pack/out/patches`

### Aree mancanti da includere
- Le tabelle di copertura (`trait_coverage_report.json`, `trait_coverage_matrix.csv`) riportano 0 specie collegate: servono dati di pairing specie/trait.
- `data/analysis/trait_baseline.yaml` e `trait_env_mapping.json` restano generati automaticamente: richiedono revisione designer per diventare core.
- Nessuna fonte in `appendici/` contiene ancora riferimenti a trait: valutare se aggiungere appendici di design dedicate.
- Output patch (`out/patches`) hanno solo suggerimenti generici: integrare parametri encounter completi o rimuoverli se obsoleti.
