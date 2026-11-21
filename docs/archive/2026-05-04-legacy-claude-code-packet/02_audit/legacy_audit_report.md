# Audit legacy `evo_tactics_param_synergy_v8_3` vs `Game` + `Game-Godot-v2`

Data audit: 2026-05-04.

## Fonti analizzate

- Legacy pack locale: `/mnt/data/evo_tactics_param_synergy_v8_3.zip`
- Godot snapshot locale: `/mnt/data/Game-Godot-v2.zip`, estratto selettivamente senza `.git`, `.godot`, worktree Claude
- GitHub live: `MasterDD-L34D/Game` e `MasterDD-L34D/Game-Godot-v2`

Nota: `/mnt/data/EvoTactics_FullRepo_v1.0.zip` non risulta una copia utile del repo `Game` aggiornato: contiene soprattutto prompt/devkit/telemetry e non il backend canonico completo. Per `Game` aggiornato l'audit usa GitHub.

## Stato canonico

- `Game` = sorgente canonica per backend, dataset YAML, servizi Express/WS, ADR e logica cross-stack.
- `Game-Godot-v2` = client Godot operativo, phone composer, UI, runtime GDScript e test GUT.
- `evo_tactics_param_synergy_v8_3` = archivio legacy di regole/dati/prototipi. Non va importato direttamente in Godot.

## Conteggi Godot snapshot

| Dataset Godot                        |              Conteggio |
| ------------------------------------ | ---------------------: |
| `data/traits/active_effects.json`    |              458 trait |
| `data/biomes/biomes.json`            |               20 biomi |
| `data/lifecycle/lifecycles.json`     |    15 specie lifecycle |
| `data/encounters/encounters.json`    |           14 encounter |
| `data/companion/archetype_pool.json` | 5 biome pool companion |
| File Godot selezionati per audit     |                    594 |

## Sommario legacy per categoria

| Categoria       | File analizzati | Esito dominante                                             |
| --------------- | --------------: | ----------------------------------------------------------- |
| Specie          |               5 | 1 match diretto, 4 non mappate                              |
| Morph           |              12 | 7 match semantici/tradotti, 5 non mappati                   |
| Job             |               6 | 6 match esatti/asset, ma non necessariamente regole runtime |
| Biomi           |               4 | 2 match diretti, 1 match semantico, 1 non mappato           |
| Rules           |              17 | design reference, molti moduli playtest-needed              |
| Social/Nest     |               4 | design reference; mating parzialmente assorbito             |
| Ennea/Form      |              16 | design reference; alcune tracce in VC/Form Pulse            |
| Director/NPG    |              11 | design reference; spawn legacy non canonici                 |
| Surge/Tags/Gear |             10+ | quasi tutto non mappato come sistema runtime                |
| Spawn packs     |               3 | non mappati; da archiviare come fixture/sandbox             |

## Matrice decisionale sintetica

| Sistema legacy                                                                                              | Stato rispetto al progetto vivo                            | Decisione consigliata                                                 |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `species/dune_stalker.yaml`                                                                                 | Presente in lifecycle Godot/Game                           | Già assorbito: non reimportare                                        |
| `sand_burrower`, `echo_wing`, `rust_scavenger`                                                              | Non trovati come specie runtime Godot                      | Valutare come candidati specie future solo dopo design review         |
| `spring_legs`, `elastomer_skin`, `echolocate`, `ferrous_carapace`, `mag_sense`, `glide_wings`, `acid_gland` | Assorbiti/parzialmente tradotti in active effects o codice | Usare solo come confronto semantico, non come fonte dati              |
| `burst_anaerobic`, `burrow_claws`, `iron_spine`, `aero_exchange`, `rust_ingest`                             | Non mappati                                                | Backlog idee trait/morph future                                       |
| 6 job legacy                                                                                                | Nomi presenti in asset/sprite frames                       | Recuperare identità fantasy/meccanica, ma progettare runtime moderno  |
| `rules/synergies.yaml`                                                                                      | Non canonico runtime                                       | Recuperare come idea per sistema sinergie futura                      |
| `rules/stances.yaml`, checks/proficiency/units_grid/tuning                                                  | Dichiarati playtest-needed nel legacy                      | Non promuovere ora; richiedono design pass                            |
| Gear/tag/surge                                                                                              | Non portato come sistema vivo                              | Buon candidato Sprint futuro, dopo combat economy review              |
| MBTI gates/job affinities                                                                                   | Esiste pipeline Form/VC più moderna                        | Usare come reference solo se aiuta Form Pulse/character creation      |
| Enneagramma                                                                                                 | Ricco ma non runtime canonico completo                     | Declassare a archivio personality layer futuro                        |
| Mating/Nest                                                                                                 | Concetto assorbito da lineage/mating trigger               | Confrontare requisiti legacy con `LineagePropagator` e campaign field |
| Regista/NPG/spawn pack                                                                                      | Superato da encounter runtime + companion/backend services | Archiviare come fixture VTT/sandbox, non canonico                     |

## Prossimi passi consigliati

1. Creare cartella `legacy_archive/evo_tactics_param_synergy_v8_3/` o etichetta equivalente, con nota `NON_CANONICAL_DESIGN_REFERENCE`.
2. Aprire un task/issue `Legacy triage: job + gear/tag/surge + unmapped morph`.
3. Importare solo tramite pipeline: legacy idea -> design review -> `Game` canonical dataset/spec -> ETL/port Godot.
4. Non copiare direttamente YAML legacy in `Game-Godot-v2`.
5. Primo sprint utile: recuperare i 6 job come identità meccanica moderna, perché sono il punto più leggibile e meno pericoloso.

## Allegati

- `legacy_to_godot_matrix.csv`: matrice file-per-file.
- `summary.json`: conteggi e riepilogo macchina.
