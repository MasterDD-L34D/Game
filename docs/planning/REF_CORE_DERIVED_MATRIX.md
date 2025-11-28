# REF_CORE_DERIVED_MATRIX – Matrice 01B (core vs derived)

Versione: 0.2 (APPROVATA)
Data: 2026-04-09 (via libera Master DD)
Scope: specie e trait legati alla gap list 01A aggiornata
Owner operativo: species-curator (lead 01B) con trait-curator per nomenclatura/mapping trait

---

## Contesto

- Input: gap list 01A approvata in `docs/planning/REF_INCOMING_CATALOG.md` (2026-02-07) e handoff 01A → 01B.
- Obiettivo: proporre una matrice core/derived **senza applicare patch** ai pack, con note di rischio e ticket di riferimento.
- Validazione: species-curator e trait-curator hanno validato le proposte riportate qui sotto, lasciando note di rischio dove servono ulteriori check.
- Routing 01B: segue `REF_REPO_MIGRATION_PLAN` (species-curator lead, trait-curator supporto; balancer on-call per priorità P0/P1/P2).

---

## Matrice core/derived (preliminare)

<!-- prettier-ignore -->
| Asset (gap 01A + ticket) | Proposta core/derived | Rationale + fixture (rif. REF_REPO_SOURCES_OF_TRUTH) | Co-triage / owner (flag borderline) |
| --- | --- | --- | --- |
| `incoming/ancestors_*` CSV / `Ancestors_Neurons_*` (**[TKT-01A-002]**) | **Derived** (nessuna patch ai core specie) | Non allineato ai core canonici `data/core/species.yaml`/`data/core/species/aliases.json`; schema e dati sensibili da sanificare prima di qualsiasi promozione. Fixture richiesta: dump versionato post-sanitizzazione con checksum e log comando. | species-curator (lead) + archivist/dev-tooling per verifica schema/privacy (**borderline** etico); escalation a Master DD per uso esteso. |
| `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `evo_tactics_tables_v8_3.xlsx` (**[TKT-01A-003]**) | **Derived/fixture** (tooling parametri) | Tabelle legacy da usare solo come confronto contro i trait canonici `data/core/traits/glossary.json` e pool `data/core/traits/biome_pools.json`; nessun dato core nuovo. Fixture: esecuzione controllata dei validatori con log e checksum. | dev-tooling + balancer (co-triage su coerenza parametri); trait-curator in supporto se emergono rename trait. |
| `incoming/lavoro_da_classificare/*` (**[TKT-01A-001]**) | **Derived/Pending** (blocco all’uso) | Materiale eterogeneo senza mapping verso core `data/core/**`; rischio di import di asset fuori roadmap. Richiede triage per separare specie/trait/asset prima di qualsiasi derivazione. | coordinator + species-curator/trait-curator per triage; Master DD deve nominare owner di dominio (**borderline** per rischio scope). |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py` (**[TKT-01A-004]**) | **Derived** (consultivo, no patch) | Binding non riallineati alle sorgenti di verità engine `data/core/game_functions.yaml` / `data/core/telemetry.yaml`; usare solo come reference storico finché non verificati. Fixture: diff degli ID engine rispetto ai core prima di ogni riuso. | dev-tooling owner; co-triage con balancer/species-curator se i trigger toccano trait/specie (**borderline** per compatibilità eventi). |
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md` (**[TKT-01A-005]**) | **Derived** (documentazione di lavorazione) | Piano senza legame a patchset/ticket; non sostituisce i riferimenti canonici su specie/trait (`data/core/traits/**`, `data/core/species.yaml`). Fixture: checklist aggiornata solo dopo approvazione Master DD. | coordinator + archivist; trait-curator in review se riemergono checklist trait (nessun flag borderline attivo). |

---

### Note operative

- La matrice resta **preliminare**: nessuna modifica ai pack core/derived finché i ticket 01A non sono formalmente aperti e approvati da Master DD.
- Ogni variazione o nuova voce derivata dal triage deve aggiornare questo file insieme a `incoming/README.md` e `docs/incoming/README.md`, seguendo il log in `logs/agent_activity.md`.
- I casi contrassegnati `Pending` richiedono triage dedicato: bloccare l’uso di materiale finché species-curator/trait-curator non chiudono la classificazione.
- Quando un asset passa da derived/pending a core, registrare la decisione (owner, ticket) e includere nota su fixture critiche e compatibilità con validator.
- Borderline = richiede co-triage (trait-curator/balancer/archivist) e validazione Master DD prima di promozione.
