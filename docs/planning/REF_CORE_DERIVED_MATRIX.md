# REF_CORE_DERIVED_MATRIX – Matrice preliminare 01B (core vs derived)

Versione: 0.1
Data: 2026-02-07
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
| Fonte (gap 01A) | Dominio | Proposta core/derived | Rationale + rischio/fixture | Owner & ticket | Validazione specie-curator | Validazione trait-curator |
| --- | --- | --- | --- | --- | --- | --- |
| `incoming/ancestors_*` CSV / `Ancestors_Neurons_*` | Specie (dataset esperimentale) | **Derived** (no patch ai pack core finché schema non stabilizzato) | Dataset non allineato a `data/core/species`; schema e sensitività dati da sanificare. Borderline su etichettamento etico → richiesta sanitizzazione e versioning prima di eventuale promozione. | species-curator (lead) + dev-tooling; **[TKT-01A-ANC]** | ✅ Revisione preliminare: mantiene derived fino a verifica schema contro core e privacy. | ⚠️ Non applicabile (nessun trait diretto), ma richiesto check nomenclatura se emergono tratti implicitamente modellati. |
| `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip` | Trait / parametri | **Derived** (tooling/fixture, non fonte core) | Tabelle di parametri legacy usate per validazione; rischio di divergenza dai trait core correnti. Da usare solo come riferimento di confronto. | balancer + dev-tooling; **[TKT-01A-PARAM]** | ⚠️ Non applicabile lato specie. | ✅ Validazione preliminare: classificati come derived/fixture; richiede sync con trait canonici prima di qualsiasi import. |
| `incoming/lavoro_da_classificare/*` | Misto (specie/trait/asset) | **Pending** → default derived finché non assegnato dominio | Contenuto eterogeneo senza mapping; rischio alto di portare materiale fuori roadmap. Necessario triage per separare specie vs trait vs asset. | coordinator + owner dominio da nominare; **[TKT-01A-LDC]** | ✅ Ha richiesto trattare tutto come derived/pending e bloccare uso fino a triage completato. | ✅ Concorda sul flag derived/pending; richiede review nomenclature per eventuali trait estratti. |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py` | Engine (supporto trait/trigger) | **Derived** (consultivo, niente patch) | Bindings non allineati agli ID engine correnti; usabili solo come reference storico finché non riallineati. | dev-tooling; **[TKT-01A-ENGINE]** | ⚠️ Non applicabile lato specie. | ⚠️ Non applicabile lato trait diretto; nota: eventuali trigger trait vanno rimappati dopo revisioning. |
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md` | Processo (note su specie/trait) | **Derived** (documentazione di lavorazione) | Piano privo di legame a patchset/ticket; usarlo solo come storico finché non riallineato a 01B. | coordinator + archivist; **[TKT-01A-DOCS]** | ✅ Segnala che riferimenti a specie restano consultivi, nessuna promozione ai core. | ✅ Conferma che eventuali checklist trait sono da rivedere prima di applicarle. |

---

### Note operative

- La matrice resta **preliminare**: nessuna modifica ai pack core/derived finché i ticket 01A non sono formalmente aperti e approvati da Master DD.
- Ogni variazione o nuova voce derivata dal triage deve aggiornare questo file insieme a `incoming/README.md` e `docs/incoming/README.md`, seguendo il log in `logs/agent_activity.md`.
- I casi contrassegnati `Pending` richiedono triage dedicato: bloccare l’uso di materiale finché species-curator/trait-curator non chiudono la classificazione.
- Quando un asset passa da derived/pending a core, registrare la decisione (owner, ticket) e includere nota su fixture critiche e compatibilità con validator.
