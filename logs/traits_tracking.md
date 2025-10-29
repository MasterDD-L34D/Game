# Monitoraggio inventario trait

## 2025-11-16 — Badlands trait sync & QA

- Allineati i file specie Badlands (`packs/evo_tactics_pack/data/species/badlands/*.yaml`) con blocchi `genetic_traits` coerenti
  rispetto a matrice e reference (`core/optional/synergy`). Focus su magneto-ridge-hunter, dune-stalker, echo-wing,
  ferrocolonia-magnetotattica, nano-rust-bloom, rust-scavenger, sand-burrower, slag-veil-ambusher e sull'evento "Tempesta Ferrosa".
- Aggiornata la matrice [`docs/catalog/species_trait_matrix.json`](../docs/catalog/species_trait_matrix.json) e il quicklook CSV
  per riflettere i nuovi pairing trait↔ruolo; verificata la tassonomia foodweb con i conteggi nel report.
- Eseguito `python tools/py/report_trait_coverage.py --env-traits packs/evo_tactics_pack/docs/catalog/env_traits.json --trait-reference packs/evo_tactics_pack/docs/catalog/trait_reference.json --species-root packs/evo_tactics_pack/data/species --trait-glossary data/traits/glossary.json --out-json data/analysis/trait_coverage_report.json --out-csv data/analysis/trait_coverage_matrix.csv`:
  il riepilogo conferma `traits_with_species = 27/29`, `rules_missing_species_total = 0` e soglie foodweb rispettate per i ruoli
  monitorati.

## 2025-10-29 — Trait ↔ Specie rollout prioritario

- Rigenerata la matrice di copertura (`python tools/py/report_trait_coverage.py --species-root packs/evo_tactics_pack/data/species --out-csv data/analysis/trait_coverage_matrix.csv`), con esito `traits_with_species = 27/29` e `rules_missing_species_total = 0`.
- Batch Badlands: verificato `dune-stalker` su dorsale termale tropicale (smoke test CLI `validate-ecosystem-pack`) confermando la sinergia tra `artigli_sette_vie`/`struttura_elastica_amorfa` e gli encounter Elite.
- Batch Foresta miceliale: validato `lupus-temperatus` con focus su `tattiche_di_branco`/`empatia_coordinativa`, nessun warning nei log del validator.
- Batch Cryosteppe: validato `aurora-gull` verificando `criostasi_adattiva` e `sonno_emisferico_alternato` nei profili di spawn; il bilanciamento VC resta entro i limiti previsti.
- Quicklook aggiornato: `docs/catalog/species_trait_quicklook.csv` funge da indice rapido per i pairing core/opzionali dei biomi prioritari.

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

## 2025-10-28T20:49:51Z · traits_validator.py
- Inventario: `docs/catalog/traits_inventory.json`
- Risorse totali: 36 (core: 29/29, mock: 7/7)
- Nessun avviso registrato.
- ✅ Nessun errore critico.

## 2025-10-28T23:39:33Z · traits_validator.py
- Inventario: `docs/catalog/traits_inventory.json`
- Risorse totali: 36 (core: 29/29, mock: 7/7)
- Nessun avviso registrato.
- ✅ Nessun errore critico.

## 2025-10-28T23:40:02Z · traits_validator.py
- Inventario: `docs/catalog/traits_inventory.json`
- Risorse totali: 36 (core: 29/29, mock: 7/7)
- Nessun avviso registrato.
- ✅ Nessun errore critico.

## 2025-10-28T23:44:17Z · traits_validator.py
- Inventario: `docs/catalog/traits_inventory.json`
- Risorse totali: 36 (core: 29/29, mock: 7/7)
- Nessun avviso registrato.
- ✅ Nessun errore critico.
