# Incoming – Stato e triage (PATCHSET-01)

Tabella di sintesi per `incoming/**`. Stati ammessi: **INTEGRATO**, **DA_INTEGRARE**, **STORICO**. Vedi catalogo completo in `docs/planning/REF_INCOMING_CATALOG.md`. Owner 01A (catalogo): Laura B.

Linee guida minime:

- Etichetta ogni nuova fonte con uno degli stati sopra e mantieni coerenza con `docs/planning/REF_INCOMING_CATALOG.md` (nessuno spostamento/rinomina nello staging).
- Quando cambi stato o aggiungi note di triage, registra l’update in `logs/agent_activity.md` citando 01A e l’owner responsabile.

| Fonte / descrizione                               | Percorso                                                                                                                                       | Stato        | Note / next-step                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| Pack baseline `evo_pacchetto_minimo*.zip` (v1–v8) | `incoming/evo_pacchetto_minimo*.zip`                                                                                                           | DA_INTEGRARE | Consolidare versione; <=v4 candidati legacy dopo diff.                          |
| Pack unificati + tool                             | `incoming/evo-tactics-unified-*`                                                                                                               | DA_INTEGRARE | Etichettare <2.0 come legacy; verificare sovrapposizioni con core.              |
| Pack bioma/espansioni                             | `incoming/evo-tactics-badlands*`, `evo_tactics_ecosystem_badlands.zip`, `evo_tactics_ecosystems_pack.zip`                                      | DA_INTEGRARE | Validare con maintainer biomi; evitare doppioni con pack ufficiali.             |
| Backup/bundle repo                                | `incoming/evo-tactics-final*`, `EvoTactics_FullRepo_v1.0.zip`, `EvoTactics_DevKit.zip`, `evo-tactics-merged*`, `evo-tactics.zip`               | STORICO      | Tenere immutati; candidati archive_cold per evitare reimport.                   |
| Tool/validatori parametri                         | `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `evo_tactics_tables_v8_3.xlsx`                           | DA_INTEGRARE | Rieseguire validazioni; marcare legacy se la pipeline bilanciamento è avanzata. |
| Dataset ancestors / reti neurali                  | `incoming/ancestors_*`, `ancestors_neurons_dump*`, `Ancestors_Neurons_*`                                                                       | DA_INTEGRARE | Validare schema/licenza e consolidare versioni pubblicabili.                    |
| Pack sentience e trait                            | `incoming/evo_sentience_branch_layout_v0_1.zip`, `evo_sentience_rfc_pack_v0_1.zip`, `sensienti_traits_v0.1.yaml`, `sentience_traits_v1.0.yaml` | DA_INTEGRARE | Allineare nomenclatura trait con trait-curator prima di promozione.             |
| Dataset enneagramma e addon                       | `incoming/Ennagramma/`, `evo_enneagram_addon_v1.zip`                                                                                           | DA_INTEGRARE | Sincronizzare con doc `docs/incoming/Ennagramma` e valutare legacy.             |
| Asset grafici MBTI                                | `incoming/Img/*.svg`                                                                                                                           | DA_INTEGRARE | Confermare licenza e liberatorie prima dell’uso.                                |
| Draft specie e schemi                             | `incoming/species/*.json`, `incoming/templates/*.schema.json`                                                                                  | DA_INTEGRARE | Validare con species-curator; verificare obsolescenza schemi.                   |
| Moduli JSON (meccaniche)                          | `incoming/personality_module.v1.json`, `enneagramma_mechanics_registry.template.json`                                                          | DA_INTEGRARE | Verificare compatibilità e versioning con moduli attivi.                        |
| Idee e template ecosistemi                        | `incoming/idea_catalog.csv`, `IDEA-001_ecosistema_template.yaml`, `recon_meccaniche.json`                                                      | DA_INTEGRARE | Collegare a ticket/patchset design e decidere legacy se superati.               |
| Hook/script engine                                | `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py`                                                              | DA_INTEGRARE | Allineare con engine corrente; scartare binding non compatibili.                |
| Script backlog/validazione                        | `incoming/scripts/*.sh`, `incoming/scripts/*.py`                                                                                               | DA_INTEGRARE | Testare in ambiente isolato e decidere integrazione o legacy.                   |
| Lavoro da classificare                            | `incoming/lavoro_da_classificare/*`                                                                                                            | DA_INTEGRARE | Owner non definito; chiarire scope roadmap e decisione legacy/integrato.        |
| Report/pacchetti sito                             | `incoming/idea_intake_site_package.zip`, `generator.html`, `index*.html`, `last_report.*`, `logs_48354746845.zip`                              | STORICO      | Rumore da reportistica; archiviare freddo con checksum.                         |
| Inventari / mappe precedenti                      | `incoming/incoming_inventory.json`, `compat_map*.json`, `game_repo_map.json`, `pack_biome_jobs_v8_alt.json`                                    | STORICO      | Riferimenti storici; candidare archive_cold dopo diff con catalogo nuovo.       |
| Estrazioni pack                                   | `incoming/decompressed/*`                                                                                                                      | STORICO      | Derivati non canonici; rigenerare da archivi originali, non usare direttamente. |

Note:

- Nessuno spostamento o archiviazione applicato in questo step; i candidati `legacy`/`archive_cold` sono solo proposte.
- Usare lo stesso stato sia qui sia in `docs/incoming/README.md` per tenere sincronizzato il triage.
