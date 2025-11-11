# Monitoraggio inventario trait

## 2025-11-18 — Canvas A sync & copertura core

- Allineato il `dune-stalker` con le note del Canvas A aggiungendo `sacche_galleggianti_ascensoriali`,
  `criostasi_adattiva` e le sinergie `focus_frazionato`/`risonanza_di_branco`/`tattiche_di_branco` sia
  nel file specie sia nella patch ambientale (`out/patches`).
- Aggiornato l'inventario trait (`docs/catalog/traits_inventory.json`) con il set core di 29 etichette e
  promosso `trait_baseline.yaml` e `trait_coverage_report.json` a stato core, includendo la nuova matrice
  CSV.
- Rigenerati i dataset con
  `python tools/py/build_trait_baseline.py packs/evo_tactics_pack/docs/catalog/env_traits.json data/traits/index.json --trait-glossary data/core/traits/glossary.json --out data/derived/analysis/trait_baseline.yaml`
  e
  `python tools/py/report_trait_coverage.py --env-traits packs/evo_tactics_pack/docs/catalog/env_traits.json --trait-reference data/traits/index.json --species-root packs/evo_tactics_pack/data/species --trait-glossary data/core/traits/glossary.json --out-json data/derived/analysis/trait_coverage_report.json --out-csv data/derived/analysis/trait_coverage_matrix.csv --strict`.
  Il riepilogo conferma `traits_with_species = 172` e nessun gap per il subset core (30/30).
- Validazione QA: `python tools/py/game_cli.py validate-ecosystem-pack` (nessun errore) e
  `python tools/py/traits_validator.py --inventory docs/catalog/traits_inventory.json`.

## 2025-11-14 — Incoming synergy & dedupe snapshot

- `reports/incoming/sessione-2025-11-14/report.html` evidenzia i pacchetti `v8.3-synergy-tuning-table` e `v8.1-deduped` con export markdown privi di heading (`docs/appendici/migrated/mating*.md`).
- Confermata la presenza di asset Idea Intake (`README_IDEAS.md`, `assets/style.css`, `docs/ideas/index.html`) nel batch corrente: verificare l'allineamento delle tassonomie trait ↔ idea submission.
- Nota: il report JSON associato elenca soltanto i path, quindi mantenere la sorgente HTML come riferimento finché non viene rigenerato lo snapshot strutturato.
- Follow-up: aggiungere heading/frontmatter ai markdown migrati prima di reimportare i trait bridging nel pack e allegare il diff nel prossimo `trait_coverage_report.json`.

## 2025-11-16 — Badlands trait sync & QA

- Allineati i file specie Badlands (`packs/evo_tactics_pack/data/species/badlands/*.yaml`) con blocchi `genetic_traits` coerenti
  rispetto a matrice e reference (`core/optional/synergy`). Focus su magneto-ridge-hunter, dune-stalker, echo-wing,
  ferrocolonia-magnetotattica, nano-rust-bloom, rust-scavenger, sand-burrower, slag-veil-ambusher e sull'evento "Tempesta Ferrosa".
- Aggiornata la matrice [`docs/catalog/species_trait_matrix.json`](../docs/catalog/species_trait_matrix.json) e il quicklook CSV
  per riflettere i nuovi pairing trait↔ruolo; verificata la tassonomia foodweb con i conteggi nel report.
- Eseguito `python tools/py/report_trait_coverage.py --env-traits packs/evo_tactics_pack/docs/catalog/env_traits.json --trait-reference data/traits/index.json --species-root packs/evo_tactics_pack/data/species --trait-glossary data/core/traits/glossary.json --out-json data/derived/analysis/trait_coverage_report.json --out-csv data/derived/analysis/trait_coverage_matrix.csv`:
  il riepilogo conferma `traits_with_species = 27/29`, `rules_missing_species_total = 0` e soglie foodweb rispettate per i ruoli
  monitorati.

## 2025-11-11T02:11:59Z · game_cli.py validation sweep

- Eseguiti `python3 tools/py/game_cli.py validate-datasets` e `python3 tools/py/game_cli.py validate-ecosystem-pack` per aggiornare i log incoming.
- `validate-datasets`: pack `evo_tactics_pack` con 14 controlli completati e 3 avvisi, nessun errore bloccante registrato nei log incoming. 【F:reports/incoming/validation/evo_tactics_ecosystems_pack-20251030-133350/validate-datasets.log†L1-L2】
- `validate-ecosystem-pack`: il validator cross foodweb segnala bridge species mancanti per gli archi `ROVINE_PLANARI→FORESTA_TEMPERATA`, `ROVINE_PLANARI→DESERTO_CALDO` e `DESERTO_CALDO→ROVINE_PLANARI`; gli altri moduli passano senza errori. 【F:reports/incoming/validation/evo_tactics_ecosystems_pack-20251030-133350/validate-ecosystem-pack.log†L1-L64】
- Follow-up: notificare il team ecosistemi per integrare specie ponte sui percorsi indicati o confermare l'eccezione prevista.

## 2025-10-29 — Trait ↔ Specie rollout prioritario

- Rigenerata la matrice di copertura (`python tools/py/report_trait_coverage.py --species-root packs/evo_tactics_pack/data/species --out-csv data/derived/analysis/trait_coverage_matrix.csv`), con esito `traits_with_species = 27/29` e `rules_missing_species_total = 0`.
- Batch Badlands: verificato `dune-stalker` su dorsale termale tropicale (smoke test CLI `validate-ecosystem-pack`) confermando la sinergia tra `artigli_sette_vie`/`struttura_elastica_amorfa` e gli encounter Elite.
- Batch Foresta miceliale: validato `lupus-temperatus` con focus su `tattiche_di_branco`/`empatia_coordinativa`, nessun warning nei log del validator.
- Batch Cryosteppe: validato `aurora-gull` verificando `criostasi_adattiva` e `sonno_emisferico_alternato` nei profili di spawn; il bilanciamento VC resta entro i limiti previsti.
- Quicklook aggiornato: `docs/catalog/species_trait_quicklook.csv` funge da indice rapido per i pairing core/opzionali dei biomi prioritari.

## 2025-10-28

### Checklist inventario
- [x] Aggiornato `docs/catalog/traits_inventory.json` con risorse da `data/derived/analysis`, `data/core/traits` e telemetria.
- [x] Mappati i cataloghi `docs/catalog/` e `packs/evo_tactics_pack/docs/catalog/` con stato core/mock.
- [x] Registrate specie ed eventi `packs/evo_tactics_pack/data/species/**` con type coerente.
- [x] Integrare eventuali trait provenienti da `docs/appendici/` (ricerca `rg "trait" docs/appendici` ancora senza match, monitoraggio programmato giornalmente).
- [x] Validare ulteriori pack oltre `evo_tactics_pack` e dataset runtime (ricerche CLI attivate, pending conferma team QA).

### Aree da includere
- Documentazione narrativa in `docs/appendici/` quando conterrà sezioni trait-specifiche.
- Eventuali pack futuri (`packs/**`) con trait generati o manuali fuori da `evo_tactics_pack`.
- Script generatori in `tools/` che esportano trait per ambienti o scenari live.

## 2025-10-27

### Checklist
- [x] Inventario aggiornato (`docs/catalog/traits_inventory.json`, 2025-10-27T10:47:13Z)
- [x] Classificati 18 specie e 4 eventi nei dataset `packs/evo_tactics_pack/data/species`
- [x] Annotate fonti reference core (`trait_reference`, `env_traits`, glossari)
- [ ] Consolidare il prototipo `data/core/species.yaml` nel catalogo principale
- [ ] Promuovere o rigenerare i dataset analitici mock (`data/derived/analysis/*`) con coperture reali
- [ ] Validare/integrare gli output mock in `packs/evo_tactics_pack/out/patches`

### Aree mancanti da includere
- Le tabelle di copertura (`trait_coverage_report.json`, `trait_coverage_matrix.csv`) riportano 0 specie collegate: servono dati di pairing specie/trait.
- `data/derived/analysis/trait_baseline.yaml` e `trait_env_mapping.json` restano generati automaticamente: richiedono revisione designer per diventare core.
- Nessuna fonte in `docs/appendici/` contiene ancora riferimenti a trait: valutare se aggiungere appendici di design dedicate.
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

## 2025-11-02T00:56:10Z · traits_validator.py
- Inventario: `docs/catalog/traits_inventory.json`
- Risorse totali: 36 (core: 29/29, mock: 7/7)
- Nessun avviso registrato.
- ✅ Nessun errore critico.

## 2025-11-02T00:56:25Z · traits_validator.py
- Inventario: `docs/catalog/traits_inventory.json`
- Risorse totali: 36 (core: 29/29, mock: 7/7)
- Nessun avviso registrato.
- ✅ Nessun errore critico.

## 2025-11-02T20:27:12Z · traits_validator.py
- Inventario: `docs/catalog/traits_inventory.json`
- Risorse totali: 36 (core: 32/32, mock: 4/4)
- Nessun avviso registrato.
- ✅ Nessun errore critico.

## 2025-11-02T20:39:23Z · traits_validator.py
- Inventario: `docs/catalog/traits_inventory.json`
- Risorse totali: 36 (core: 32/32, mock: 4/4)
- Nessun avviso registrato.
- ✅ Nessun errore critico.

## 2025-11-02T20:39:37Z · traits_validator.py
- Inventario: `docs/catalog/traits_inventory.json`
- Risorse totali: 36 (core: 32/32, mock: 4/4)
- Nessun avviso registrato.
- ✅ Nessun errore critico.

## 2025-11-02T20:39:39Z · run_deploy_checks.sh
- scripts/run_deploy_checks.sh
- Snapshot sync: fallback locale usato (`data/flow-shell/atlas-snapshot.json`).
- Inventario valido: core 30/30, mock 4/4.
- Trait generator: core=30, enriched_species=12, nessun trait mancante rispetto all'inventario.
- Bundle statico verificato con smoke test HTTP locale (tools/ts/dist presente).
