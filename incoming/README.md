# Incoming – Stato e triage (PATCHSET-00)

Versione: 0.6 (riallineato al repo aggiornato post-conflitto; verifica contro main prima di 01A)
Owner: Laura B. | Logging: aggiornare `logs/agent_activity.md` per ogni avanzamento
Stato: PROPOSTA – in attesa approvazione 01A (nessuno spostamento file)

Questa tabella prepara il censimento delle fonti in `incoming/**`. Stati:

- **INTEGRATO**: materiale già riversato nei core o in pack ufficiali.
- **DA_INTEGRARE**: materiale da valutare/prioritizzare nelle prossime patch.
- **STORICO**: materiale legacy/archivio che non deve interferire con i core.

| Fonte / descrizione                   | Percorso                                                                  | Stato        | Note / next-step                                             |
| ------------------------------------- | ------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------ |
| Site tools unificati (v2.0.0, v2.0.1) | `incoming/evo_tactics_unified-v2.0.*site*.zip`                            | DA_INTEGRARE | Confrontare con pack ufficiali; tenere solo ultima versione. |
| Ecosistemi unificati (v1.9.7–1.9.8)   | `incoming/evo_tactics_unified-v1.9.*ecosistema*.zip`                      | DA_INTEGRARE | Valutare come snapshot o archivio; verificare coerenza core. |
| Pack Badlands IT                      | `incoming/evo_tactics_badlands*_IT*.zip`                                  | DA_INTEGRARE | Mappare con ecosistemi core; possibile duplicato di pack.    |
| Serie "pacchetto minimo" (v1–v8)      | `incoming/evo_pacchetto_minimo*.zip`                                      | STORICO      | Versioni legacy; selezionare solo una copia di riferimento.  |
| Ancestors repo pack                   | `incoming/evo_tactics_ancestors_repo_pack_v1.0*.zip`                      | STORICO      | Duplicati; mantenere 1 copia come riferimento storico.       |
| Template ecosistema e catalogo idee   | `incoming/IDEA-001_ecosistema_template.yaml`, `incoming/idea_catalog.csv` | DA_INTEGRARE | Validare con schema (02A) prima di eventuale import.         |
| Cartella da classificare              | `incoming/lavoro_da_classificare/`                                        | DA_INTEGRARE | Review manuale, assegnare stato.                             |

Note operative:

- Branch dedicato per 01A; citare esplicitamente la fase (es. “01A approvata”).
- Nessuno spostamento o archiviazione in PATCHSET-00; solo etichettatura e note.
- Coordinare il censimento con `docs/planning/REF_INCOMING_CATALOG.md` e con il README di `docs/incoming/`.
