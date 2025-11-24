# REF_INCOMING_CATALOG – PATCHSET-00

Versione: 0.5 (riallineato al repo aggiornato, 01A ready post-conflitto)
Data: 2025-11-23
Owner: Laura B. (supporto: coordinator)
Stato: DRAFT – inventario mirato pronto per approvazione 01A

---

## Scopo

Catalogare le fonti in `incoming/**` e `docs/incoming/**`, assegnando stato (INTEGRATO / DA_INTEGRARE / STORICO) e priorità di triage, come da `REF_REPO_SCOPE` (§2.3, §6.1).

## Inventario mirato (01A)

| Percorso / gruppo                                                | Tipo asset                    | Stato proposto | Rischi / note chiave                                                   | Next-step (01A)                                            |
| ---------------------------------------------------------------- | ----------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `incoming/evo_tactics_unified-v2.0.0/2.0.1-site-tools.zip`       | Pack/site tools (zip)         | DA_INTEGRARE   | Versioni multiple; possibile sovrapposizione con pack ufficiali.       | Confronto con pack ufficiale, tenere solo ultimo.          |
| `incoming/evo_tactics_unified-v1.9.7/1.9.8-ecosistema*.zip`      | Pack ecosistema (zip)         | DA_INTEGRARE   | Snapshot precedenti; rischio duplicato con pack unificati più recenti. | Valutare se archiviare come storico o ricampionare.        |
| `incoming/evo_tactics_ancestors_repo_pack_v1.0*.zip`             | Pack legacy (zip)             | STORICO        | Duplicati (`(1)`); contenuto potenzialmente superato.                  | Deducplicare; tenere solo 1 copia per riferimento.         |
| `incoming/evo_tactics_badlands*_IT*.zip`                         | Pack bioma (zip)              | DA_INTEGRARE   | Richiede verifica coerenza con ecosistemi core.                        | Collegare a mapping core/pack (01B).                       |
| `incoming/evo_pacchetto_minimo*.zip`                             | Bundle minimali (zip, v1–v8)  | STORICO        | Serie versionata; probabili snapshot di lavoro.                        | Catalogare versioni principali; candidare archivio.        |
| `incoming/idea_catalog.csv`, `IDEA-001_ecosistema_template.yaml` | CSV/YAML template ecosistemi  | DA_INTEGRARE   | Possibile fonte di nuovi ecosistemi; va validata rispetto a schema.    | Allineare con 02A (schema) prima di import.                |
| `incoming/lavoro_da_classificare/`                               | Misc note/script              | DA_INTEGRARE   | Contenuto non categorizzato.                                           | Review manuale, proporre stato.                            |
| `docs/incoming/FEATURE_MAP_EVO_TACTICS.md`                       | Doc mapping feature           | DA_INTEGRARE   | Potrebbe duplicare documentazione generale.                            | Collegare a core/doc ufficiali o archiviare.               |
| `docs/incoming/GAME_COMPAT_README.md`                            | Guida compatibilità           | DA_INTEGRARE   | Contenuti sovrapponibili a README principali.                          | Validare riferimenti attuali; decidere integrazione.       |
| `docs/incoming/README_INTEGRAZIONE_MECCANICHE.md`                | Guida integrazione meccaniche | DA_INTEGRARE   | Necessita allineamento con Golden Path e schema ALIENA.                | Collegare a pipeline GOLDEN_PATH; decidere merge/archivio. |
| `docs/incoming/archive/`                                         | Storico                       | STORICO        | Deve restare isolato, nessun movimento in PATCHSET-00.                 | Verificare che non venga referenziato altrove.             |
| `docs/incoming/lavoro_da_classificare/`                          | Misc note                     | DA_INTEGRARE   | Non catalogato.                                                        | Censire e assegnare stato.                                 |

## Linee guida operative

- Nessuno spostamento o archiviazione effettiva in PATCHSET-00: solo censimento e proposta di stato.
- Etichettare gli elementi chiave usando la tabella sopra e aggiungere righe dedicate per file/pack critici durante 01A.
- Coordinare aggiornamenti con i README in `incoming/` e `docs/incoming/` per le istruzioni di etichettatura e logging.

## Collegamenti

- Triage collegato a `REF_PACKS_AND_DERIVED.md` (relazioni con pack/derived).
- Esiti 01A alimentano 02A (validazioni) e 02B (allineamento core/pack).

## Changelog

- v0.5 – Riallineamento con il repo aggiornato post-conflitto: confermati asset reali, governance (branch/log) e ready-state 01A.
- v0.4 – Inventario mirato con riferimenti a file concreti di `incoming/` e `docs/incoming/` per attivare 01A; confermati owner e governance (branch dedicati, logging).
- v0.3 – Inventario preliminare aggiunto, owner Laura B., governance (branch dedicati, logging) richiamata; stato 01A in attesa di approvazione.
- v0.2 – Report 0.2 recepito (design completato, perimetro documentazione).
- v0.1 – Struttura iniziale del catalogo incoming.
