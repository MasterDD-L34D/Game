# REF_CORE_DERIVED_MATRIX – Matrice 01B (core vs derived)

Versione: 0.3 (APPROVATA)
Data: 2025-04-09 (via libera Master DD, finestra 01B 2025)
Scope: specie e trait legati alla gap list 01A 2025 aggiornata con handoff 01A → 01B
Owner operativo: species-curator (lead 01B) con trait-curator per nomenclatura/mapping trait
Delta vs calendario 2026: anticipato il go-live al 07/12/2025 (rispetto alla finestra 2026-04) e riallineate le milestone di triage/approvazione per evitare slittamenti sui pack derivati.

---

## Contesto

- Input: gap list 01A approvata in `docs/planning/REF_INCOMING_CATALOG.md` (2025-02-07) e handoff 01A → 01B.
- Obiettivo: proporre una matrice core/derived **senza applicare patch** ai pack, con note di rischio e ticket di riferimento.
- Validazione: species-curator e trait-curator hanno validato le proposte riportate qui sotto, lasciando note di rischio dove servono ulteriori check.
- Routing 01B: segue `REF_REPO_MIGRATION_PLAN` (species-curator lead, trait-curator supporto; balancer on-call per priorità P0/P1/P2).

---

## Matrice core/derived (preliminare)

<!-- prettier-ignore -->
| Asset (gap 01A + ticket) | Proposta core/derived | Rationale + fixture (rif. REF_REPO_SOURCES_OF_TRUTH) | Co-triage / owner (flag borderline) |
| --- | --- | --- | --- |
| `incoming/ancestors_*` CSV / `Ancestors_Neurons_*` (**[TKT-01A-002]**) | **Derived** (nessuna patch ai core specie) | Non allineato ai core canonici `data/core/species.yaml`/`data/core/species/aliases.json`; schema e dati sensibili da sanificare prima di qualsiasi promozione. Fixture richiesta: dump versionato post-sanitizzazione con checksum e log comando. **Handoff 01B:** dump sanificato pubblicato in `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv` con checksum associato. | species-curator (lead) + archivist/dev-tooling per verifica schema/privacy (**borderline** etico, prerequisito: OK legal) con escalation a Master DD per uso esteso. |
| `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip`, `evo_tactics_tables_v8_3.xlsx` (**[TKT-01A-003]**) | **Derived/fixture** (tooling parametri) | Tabelle legacy da usare solo come confronto contro i trait canonici `data/core/traits/glossary.json` e pool `data/core/traits/biome_pools.json`; nessun dato core nuovo. Fixture: esecuzione controllata dei validatori con log e checksum. **Handoff 01B:** controlli integrità/sha256 registrati in `reports/audit/2025-12-03_param_validator.md` (nessuna esecuzione interattiva dei validator legacy). | dev-tooling + balancer (co-triage su coerenza parametri; prerequisito: validatori aggiornati al dataset 01B) con trait-curator in supporto se emergono rename trait. |
| `incoming/lavoro_da_classificare/*` (**[TKT-01A-001]**) | **Derived/triage chiuso** | Materiale eterogeneo senza mapping verso core `data/core/**`; rischio di import di asset fuori roadmap. Triage completato con assegnazioni species-curator/trait-curator e log in `logs/agent_activity.md`; da mantenere in uso controllato finché non approvati i mapping di dominio. | coordinator + species-curator/trait-curator per triage; Master DD deve nominare owner di dominio (**borderline** per rischio scope; prerequisito: ticket 01A-001 aperto e checklist approvata). |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py` (**[TKT-01A-004]**) | **Derived** (consultivo, no patch) | Binding non riallineati alle sorgenti di verità engine `data/core/game_functions.yaml` / `data/core/telemetry.yaml`; usare solo come reference storico finché non verificati. Fixture: diff degli ID engine rispetto ai core prima di ogni riuso. **Handoff 01B:** scan eventi/stat attuale in `reports/temp/engine_ids/incoming_scan.json` con riepilogo in `reports/audit/2025-12-03_engine_id_diff.md`. | dev-tooling owner; co-triage con balancer/species-curator se i trigger toccano trait/specie (**borderline** per compatibilità eventi; prerequisito: snapshot ID engine aggiornato). |
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md` (**[TKT-01A-005]**) | **Derived** (documentazione di lavorazione) | Piano senza legame a patchset/ticket; non sostituisce i riferimenti canonici su specie/trait (`data/core/traits/**`, `data/core/species.yaml`). Fixture: checklist aggiornata solo dopo approvazione Master DD. **Scadenza go-live 07/12/2025:** note di integrazione riallineate a triage 01B e pubblicate. | coordinator + archivist; trait-curator in review se riemergono checklist trait (nessun flag borderline attivo; prerequisito: approvazione Master DD sulle checklist). |

---

### Readiness 01B (finestra 2025)

- Triage completati: ticket [TKT-01A-001] chiuso con assegnazioni species-curator/trait-curator loggate; [TKT-01A-002] e [TKT-01A-003] coperti da fixture aggiornate (dump sanificato + log parametri).
- Fixture/log aggiornati: dump sanificato `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv` con checksum, controllo integrità pacchetti parametri in `reports/audit/2025-12-03_param_validator.md`, scan ID engine in `reports/temp/engine_ids/incoming_scan.json` + diff `reports/audit/2025-12-03_engine_id_diff.md`.
- Verifica 2025-12-04: riletti i tre fixture (ancestors_sanitized, param_validator, engine_id_diff) confermando checksum/alias invariati e nessun nuovo blocco da aggiungere alla matrice 01B.
- Handoff 01A → 01B: consegne documentate in `logs/agent_activity.md`; pronto passaggio 01B con materiale derived bloccato da policy (nessuna patch ai core) e validatori legacy marcati report-only.

### Note operative

- La matrice resta **preliminare**: nessuna modifica ai pack core/derived finché i ticket 01A non sono formalmente aperti e approvati da Master DD.
- Ogni variazione o nuova voce derivata dal triage deve aggiornare questo file insieme a `incoming/README.md` e `docs/incoming/README.md`, seguendo il log in `logs/agent_activity.md`.
- I casi contrassegnati `Pending` richiedono triage dedicato: bloccare l’uso di materiale finché species-curator/trait-curator non chiudono la classificazione.
- Quando un asset passa da derived/pending a core, registrare la decisione (owner, ticket) e includere nota su fixture critiche e compatibilità con validator.
- Borderline = richiede co-triage (trait-curator/balancer/archivist) e validazione Master DD prima di promozione.
- Punto di ingresso post-rebaseline: usare `incoming/README.md` per aggiornare i cataloghi e registrare ogni attività correlata in `logs/agent_activity.md` con riferimento ai ticket 01B.
- Allineamento pending/borderline 2026-09-09: confermato blocco licenza `ancestors_*` (TKT-01B-001, species-curator lead), mantenuto blocco hook/event-map v2.3 (`scan_engine_idents.py`, TKT-01C-002, dev-tooling owner) e handoff `lavoro_da_classificare` (TKT-01A-001 → 01B) in carico archivist con controllo species/trait-curator; note sincronizzate con `REF_INCOMING_CATALOG` e log centrale.
