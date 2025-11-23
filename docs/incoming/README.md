# Docs Incoming – Stato e triage (PATCHSET-01)

Schema di tracciamento per `docs/incoming/**`. Stati: **INTEGRATO**, **DA_INTEGRARE**, **STORICO**. Dettaglio completo in `docs/planning/REF_INCOMING_CATALOG.md`.

Linee guida minime:

- Applica le stesse etichette di stato del catalogo e mantieni i percorsi invariati durante il triage.
- Ogni aggiornamento di stato o nota va loggato in `logs/agent_activity.md` con riferimento 01A e owner assegnato.

| Fonte / descrizione                | Percorso                                                                             | Stato        | Note / next-step                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------- |
| Mappe compat/feature               | `docs/incoming/FEATURE_MAP_EVO_TACTICS.md`, `GAME_COMPAT_README.md`                  | DA_INTEGRARE | Aggiornare rispetto ai pack correnti; allineare con catalogo incoming.       |
| Linee guida integrazione/stat scan | `docs/incoming/README_INTEGRAZIONE_MECCANICHE.md`, `README_SCAN_STAT_EVENTI.md`      | DA_INTEGRARE | Sincronizzare con pipeline QA e doc ufficiale; se superate, marcare STORICO. |
| Documenti enneagramma              | `docs/incoming/Ennagramma/README_ENNEAGRAMMA.md`                                     | DA_INTEGRARE | Collegare al dataset in `incoming/Ennagramma/`; valutare legacy dopo merge.  |
| Archivio/estrazioni                | `docs/incoming/decompressed/README.md`, `docs/incoming/archive/INDEX.md`             | STORICO      | Log/indice storico; candidati archive_cold dopo snapshot.                    |
| Piani backlog                      | `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`, `.../TASKS_BREAKDOWN.md` | DA_INTEGRARE | Identificare owner; se non più in roadmap spostare in `incoming/legacy`.     |
| Script backlog                     | `docs/incoming/lavoro_da_classificare/scripts/README.md`                             | DA_INTEGRARE | Verificare dipendenze prima di riesecuzione.                                 |

Note:

- Nessuno spostamento o rinomina applicato; le azioni legacy/archive_cold restano da pianificare.
- Tenere la tabella sincronizzata con `incoming/README.md` e il catalogo di pianificazione.
