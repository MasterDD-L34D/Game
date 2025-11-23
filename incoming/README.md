# Incoming – Stato e triage (PATCHSET-01)

Tabella di sintesi per `incoming/**`. Stati ammessi: **INTEGRATO**, **DA_INTEGRARE**, **STORICO**. Vedi catalogo completo in `docs/planning/REF_INCOMING_CATALOG.md`.

| Fonte / descrizione                                       | Percorso                                                                                                             | Stato                                                               | Note / next-step                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Pack baseline `evo_pacchetto_minimo*.zip` (v1–v8)         | `incoming/evo_pacchetto_minimo*.zip`                                                                                 | DA_INTEGRARE                                                        | Consolidare versione; <=v4 candidati `incoming/legacy` dopo diff.           |
| Pack unificati + tools                                    | `incoming/evo-tactics-unified-*`                                                                                     | DA_INTEGRARE                                                        | Etichettare <2.0 come legacy; verificare sovrapposizioni con core.          |
| Backup/bundle repo                                        | `incoming/evo-tactics-(final                                                                                         | merged)\*`, `EvoTactics_FullRepo_v1.0.zip`, `EvoTactics_DevKit.zip` | STORICO                                                                     | Tenere immutati; candidati `archive_cold` per evitare reimport. |
| Tool/validatori parametri                                 | `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `evo_tactics_tables_v8_3.xlsx` | DA_INTEGRARE                                                        | Integrare o marcare legacy dopo revisione pipeline bilanciamento.           |
| Dataset specializzati (ancestors, sentience, enneagramma) | `incoming/ancestors_*`, `*sentience*`, `Ennagramma/`                                                                 | DA_INTEGRARE                                                        | Validare schema e licenza; alcune versioni potrebbero passare a legacy.     |
| Inventari storici / mappe compat                          | `incoming/incoming_inventory.json`, `compat_map*.json`, `game_repo_map.json`                                         | STORICO                                                             | Riferimenti storici; candidare `archive_cold` dopo diff con nuovo catalogo. |

Note:

- Nessuno spostamento o archiviazione applicato in questo step; i candidati `legacy`/`archive_cold` sono solo proposte.
- Usare lo stesso stato sia qui sia in `docs/incoming/README.md` per tenere sincronizzato il triage.
