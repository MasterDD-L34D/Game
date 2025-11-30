# REF_REPO_MIGRATION_PLAN – Sequenza patchset

Versione: 0.6
Data: 2026-05-08
Owner: **Master DD (owner umano)** con agente coordinator (supporto: archivist, dev-tooling)
Stato: PATCHSET-00 PROPOSTA – gap list 01A catalogata e approvata; gate 01B/01C approvati (log 2026-04-11/12 su branch `patch/01B-core-derived-matrix`); gate 02A chiuso e approvato da Master DD (log 2025-11-30 su branch `patch/03A-core-derived`) con rerun schema/trait/style archiviato; gate 03A/03B sbloccati (log 2026-05-01/02) con freeze 03A/03B già chiuso a log 2026-05-02 (cfr. `logs/agent_activity.md`).

---

## Obiettivi

- Allineare i patchset alla GOLDEN_PATH: Fase 0 già completata (scope), Fasi 1–2 per analisi/catalogo, Fase 3 per tooling/validazione, Fase 4 per applicazione patch.
- Definire per ogni sotto-patch owner, prerequisiti, criteri di successo, rollback e rischi principali.
- Ridurre conflitti tra incoming, core/derived e tooling/CI, mantenendo rollback chiari per ogni passaggio.

## Riferimenti GOLDEN_PATH

- **Fase 0 – Scope (completata):** perimetro e patch neutrale (`REF_REPO_SCOPE`, `REF_REPO_PATCH_PROPOSTA`).
- **Fase 1–2 – Analisi e Catalogo:** mappatura incoming, core vs derived, fixture e dipendenze.
- **Fase 3 – Tooling e Validazione:** introdurre strumenti e CI di verifica, senza ancora applicare patch destructive.
- **Fase 4 – Applicazione patch:** esecuzione patch su dati/core/derived/incoming con controlli di regressione.

## Sequenza patchset

### Tracking responsabilità (01A–01C)

<!-- prettier-ignore -->
| Deliverable | Owner (responsabile) | Due-date | Stato |
| --- | --- | --- | --- |
| Log attività 01A ([logs/agent_activity.md](../../logs/agent_activity.md)) | archivist + coordinator (approvazione Master DD) | **2026-04-11** (log approvazione gate 01B, base calendario 2026 condivisa con Master DD) | Allineato ai log di maggio 2026: gap list 01A catalogata; gate 01B approvato (log 2026-04-11) e 03A–03B registrati con freeze 03A/03B come dipendenza esplicita. |
| Gap list 01A approvata ([REF_INCOMING_CATALOG](./REF_INCOMING_CATALOG.md#gap-list-01a-bozza-in-attesa-di-approvazione-master-dd)) | Master DD (approvazione) + coordinator/archivist | **2026-05-05** (entry log approvazione 2026-05-05 collegata ai gate 01B/03A–03B) | Gap list 01A catalogata e approvata a log (entry 2026-05-05); finestra 02A completata e registrata con log su branch validator. |
| Gate operativo 02A – validator report-only (log su `patch/03A-core-derived`) | dev-tooling (owner), coordinator + balancer/archivist (supporto) | **Finestra 2026-05-01 → 2026-05-02** (rerun schema-only già loggati) → **Chiuso 2025-11-30** | Gate chiuso: validator schema-only/trait audit/style check in pass (log specchiati) e approvazione Master DD registrata; 03A/03B sbloccati. |
| Readiness 01B/01C ([nota readiness](#nota-readiness-01b01c-2026-02-07)) | species-curator (lead 01B), trait-curator, balancer, archivist, coordinator | Dopo gap list approvata | On-call registrata il 2026-02-07; gate 01B approvato (log 2026-04-11 su `patch/01B-core-derived-matrix`), 01C attivato e pronto a seguire con 02A. |
| Inventario tooling/CI 01C ([REF_TOOLING_AND_CI](./REF_TOOLING_AND_CI.md#inventario-workflowscript-modalita-report-only--2026-02-07)) | dev-tooling (lead 01C) + coordinator | Successivo a via libera 01A/01B | Attivato (log 2026-04-12) con inventario CI/script pubblicato; pronta l’esecuzione report/enforcing secondo gating 02A. |

> Condividere la tabella con Master DD e gli owner indicati per confermare responsabilità e scadenze prima di avanzare; date e finestra operative sopra sono state già sincronizzate con Master DD sui log di aprile/maggio 2026.

### Gate numerati con entry/exit criteria, trigger e rollback (01A–03B)

| Gate                                | Entry criteria (ingresso)                                                                                                 | Exit criteria (uscita)                                                                                                               | Trigger di avanzamento                                                                                   | Checklist di rollback                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **01A – Catalogo incoming**         | PATCHSET-00 approvato; finestra di freezing incoming concordata con Master DD; accesso completo a `REF_INCOMING_CATALOG`. | Tabella incoming consolidata con gap list 01A firmata da coordinator; ingressi congelati documentati.                                | Master DD approva gap list 01A e la chiusura della tabella incoming nel log attività.                    | Ripristino tabella incoming precedente; riapertura ingressi congelati; annullamento link e alias temporanei introdotti.                       |
| **01B – Core vs Derived**           | Gap list 01A approvata/loggata; `REF_REPO_SOURCES_OF_TRUTH` validato; soglie P0/P1/P2 confermate con balancer.            | Matrice core/derived preliminare pubblicata in branch dedicato con ticket e owner; log di pubblicazione in `logs/agent_activity.md`. | Master DD approva la matrice preliminare e autorizza la validazione finale/01C.                          | Revert della matrice core/derived pubblicata; rimozione flag temporanei; ripristino tag core/derived precedenti nei documenti di riferimento. |
| **01C – Inventario tooling/CI**     | 01A–01B loggati con approvazione; inventario workflow esistente raccolto; slot CI prenotato per test report-only.         | Catalogo tooling/CI pubblicato con controlli mancanti e piano di rollout progressivo (report-only); owner e priorità esplicite.      | Master DD con coordinator abilitano l’esecuzione report-only e chiudono il gate 01C nel log attività.    | Ripristino configurazioni CI precedenti; disattivazione di hook pilota; rollback di pipeline sperimentali non promosse.                       |
| **02A – Validator report-only**     | Matrice 01B consolidata; inventario 01C pronto; branch validator con fixture/baseline aggiornate.                         | Validator eseguito in modalità report-only con log archiviato; esiti condivisi con owner 03A.                                        | Master DD approva l’esito del validator e autorizza l’apertura del freeze 03A/03B.                       | Revert delle modifiche del branch validator; ripristino fixture/baseline precedenti; sospensione dell’apertura freeze.                        |
| **03A – Patch core/derived**        | Freeze fase 3→4 attivo; validator 02A in pass; branch `patch/03A-core-derived` pronto con changelog/rollback script.      | Patch core/derived mergeata con validator in pass; snapshot core/derived archiviato; freeze ancora attivo per 03B.                   | Master DD approva il merge 03A e conferma il mantenimento del freeze per procedere a 03B.                | Esecuzione script di revert generati; ripristino snapshot core/derived; disabilitazione del validator nuovo se blocca il deploy.              |
| **03B – Pulizia incoming/archivio** | Freeze confermato post-03A; backup/snapshot incoming etichettato; mapping incoming ↔ core/derived stabile.               | Incoming ripulito/archiviato con redirect verificati; checklist post-pulizia registrata; freeze chiuso.                              | Master DD approva il merge `patch/03B-incoming-cleanup` e registra l’uscita dal freeze nel log attività. | Ripristino backup incoming; rollback redirect e entry di archivio aggiunte; riesecuzione validator 02A (smoke) per confermare stabilità.      |

**Stato gate (log maggio 2026, aggiornato al rerun 2025-11-30):**

- **01A:** gap list catalogata e approvata (log 2026-05-05 in `logs/agent_activity.md`).
- **01B:** approvato da Master DD (log 2026-04-11) su branch `patch/01B-core-derived-matrix`.
- **01C:** inventario tooling/CI approvato e attivato (log 2026-04-12), supporta i rerun 02A.
- **02A:** chiuso con validatori schema/trait/style in pass e approvazione Master DD (log 2025-11-30 su `patch/03A-core-derived`).
- **03A:** approvato con validator in pass (log 2026-05-01 e 2026-05-02, firma Master DD) e ora sbloccato dalla chiusura 02A.
- **03B:** approvato e freeze 03A/03B chiuso con smoke schema-only (log 2026-05-02), monitoraggio post-merge in corso.

### Fase 1–2 (analisi/catalogo)

**PATCHSET-01A – Catalogo incoming**

- **Owner:** archivist (supporto: asset-prep per reperimento asset e metadati).
- **Prerequisiti:** approvazione PATCHSET-00; accesso all’elenco completo incoming (`REF_INCOMING_CATALOG`); finestra di freezing approvata da Master DD per evitare ingressi durante il censimento.
- **Criteri di successo (Fase 1):**
  - Tabella incoming consolidata con stato (usato/duplicato/da archiviare) e link alla fonte, firmata da coordinator.
  - Gap list per elementi senza mapping verso core/derived con owner proposti per la presa in carico.
- **Prossimo step operativo:** usare routing automatico: coordinator → esegue freeze già approvato con Master DD e chiude gap list con ticket/owner; archivist → aggiorna tabelle/README durante il freeze; dev-tooling/asset-prep → supportano checksum/metadati. Loggare in `logs/agent_activity.md` ogni batch approvato (freeze + gap list) prima di sbloccare 01B/01C.
- **Rollback:** ripristino tabella incoming precedente + annullamento link se il catalogo introduce ambiguità; riattivazione di eventuali ingressi congelati.
- **Note rischio (Fase 1):** rischio conflitti di nomenclatura e drifting durante il censimento → usare alias temporanei documentati e snapshot quotidiani.

**PATCHSET-01B – Core vs Derived**

- **Owner:** species-curator (supporto: trait-curator per mapping dei trait e archivist per fonti storiche).
  - **Prerequisiti:** completamento 01A; `REF_REPO_SOURCES_OF_TRUTH` validato; definizione soglie P0/P1/P2 concordate con balancer.
  - **Criteri di successo (Fase 2):**
    - Matrice core/derived aggiornata con dipendenze, priorità P0/P1/P2 e nota su fixture critiche.
    - Lista fixture che devono restare “core” e quelle promuovibili a “derived”, con rationale sintetico.
- **Prossimo step operativo:** avvio 01B in STRICT MODE con species-curator: raccogliere la gap list 01A approvata da Master DD, definire la matrice core/derived preliminare (senza applicare patch) e loggare in `logs/agent_activity.md` l’avvio con ticket collegati; ogni voce borderline deve riportare owner e nota su fixture critiche prima di passare alla validazione finale.
  - **Checklist operativa 01B (STRICT MODE):**
    1. **Kickoff**: species-curator riceve la gap list 01A approvata (con ticket/owner) e conferma il perimetro di lavoro in `logs/agent_activity.md` (citando i ticket). Owner umano: Master DD.
    2. **Raccolta input**: collegare `REF_REPO_SOURCES_OF_TRUTH` e materiale incoming stabile, marcando in tabella le fonti che richiedono triage condiviso con trait-curator/balancer.
    3. **Matrice preliminare**: compilare una matrice core/derived **senza patch** con tre colonne minime: `asset`, `proposta core/derived`, `rationale + rischio/fixture`. Segnalare i casi borderline con flag temporaneo e owner di dominio.
    4. **Gate di uscita 01B (Fase 2)**: loggare in `logs/agent_activity.md` la matrice preliminare pubblicata (link al commit/branch) e il via libera Master DD per procedere a validazione finale/01C. Nessuna modifica ai pack in questa fase.
  - **Routing agenti 01B:** species-curator (lead) per la matrice; trait-curator per i trait condivisi/derivati; balancer per priorità P0/P1/P2 e fixture critiche; archivist per cross-check con catalogo 01A; coordinator per governance/gate.
  - **Rollback:** reintegro matrice precedente; revert dei tag core/derived nei file di riferimento e rimozione di flag temporanei.
  - **Note rischio (Fase 2):** incoerenze tra pack legacy e definizioni core → prevedere flag temporanei per i casi borderline e richiesta di arbitration al coordinator.

**PATCHSET-01C – Catalogo tooling/CI (baseline)**

- **Owner:** dev-tooling (supporto: coordinator per priorità e sequenziamento).
- **Prerequisiti:** 01A–01B chiusi; inventario workflow esistenti (CI, lint, generatori); slot CI prenotato per prove non bloccanti.
- **Criteri di successo (Fase 2 → 3):**
  - Mappa dei job CI e script locali con input/output, ownership e impatti sui pack.
  - Elenco controlli mancanti per derived/incoming e decisione su dove inserirli (CI vs script locale), con piano di rollout progressivo.
- **Rollback:** ripristino configurazioni CI precedenti e rollback di eventuali esperimenti di hook non promossi; rimozione di pipeline pilota.
- **Note rischio (Fase 2 → 3):** modifiche premature ai workflow potrebbero bloccare pipeline esistenti → usare branch isolati e flag di sicurezza (report-only).

### Nota readiness 01B/01C (2026-02-07)

- **On-call 01B (core/derived):** species-curator (lead), trait-curator (nomenclature/trait mapping), balancer (priorità P0/P1/P2), archivist (cross-check catalogo 01A), coordinator (gate/log). Input di kickoff: gap list 01A approvata con ticket **[TKT-01A-LDC]**, **[TKT-01A-ANC]**, **[TKT-01A-PARAM]**, **[TKT-01A-ENGINE]**, **[TKT-01A-DOCS]** registrati nei README incoming.
- **On-call 01C (tooling/CI):** dev-tooling (lead) con coordinator per priorità; readiness limitata a inventario e modalità **report-only**. Nessun rollout abilitato finché 01A–01B non sono loggati con approvazione Master DD.
- **Ticket attivi/placeholder:** **[TKT-01A-*]** da aprire/formalizzare; usare gli stessi ID nel log di `logs/agent_activity.md`, in `docs/planning/REF_INCOMING_CATALOG.md`, `incoming/README.md` e `docs/incoming/README.md` per mantenere il tracciamento coerente.
- **Rischi aperti:** freeze non riattivato (nuova approvazione richiesta), possibile desincronizzazione tra catalogo e README se si aggiungono batch senza loggare; mantenere allineati i log 02A/03A/03B per evitare drift tra runbook e branch.

#### Readiness 01B – estrazione gap list (report-only)

| Entità candidata (gap 01B)                                                           | Proposta core/derived    | Motivazione sintetica                                                                          | Dipendenze                                                            | Owner tecnico                        | Blocchi aperti / stato                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `incoming/lavoro_da_classificare/*`                                                  | Derived (pending)        | Contenuto eterogeneo senza dominio definito; rischio di inglobare materiale fuori roadmap.     | Triage domini (specie/trait/asset) con aggiornamento README incoming. | coordinator + owner da nominare      | **provvisorio** — in attesa di assegnare owner; legato al gap [`REF_INCOMING_CATALOG#gap-list-01a-bozza-in-attesa-di-approvazione-master-dd`](./REF_INCOMING_CATALOG.md#gap-list-01a-bozza-in-attesa-di-approvazione-master-dd).              |
| `incoming/ancestors_*`, `Ancestors_Neurons_*`                                        | Derived                  | Dataset sperimentale e sensibile; schema non allineato a `data/core/species`.                  | Sanitizzazione schema + privacy, confronto con species core.          | species-curator (lead) + dev-tooling | Necessario risultato validazione schema prima di eventuale promozione; blocco aperto sul ticket **[TKT-01A-ANC]**.                                                                                                                            |
| `incoming/evo_tactics_validator-pack_v1.5.zip`, `evo_tactics_param_synergy_v8_3.zip` | Derived (fixture)        | Tabelle legacy di validazione non sincronizzate con trait core; usabili solo come riferimento. | Allineamento con trait canonici e tool di bilanciamento.              | balancer + dev-tooling               | Blocco: riconciliare parametri prima di qualsiasi import; collegato al gap **[TKT-01A-PARAM]**.                                                                                                                                               |
| `incoming/hook_bindings.ts`, `engine_events.schema.json`, `scan_engine_idents.py`    | Derived (consultivo)     | Bindings engine potenzialmente obsoleti; servono solo come reference.                          | ID engine aggiornati + mapping trigger/trait.                         | dev-tooling                          | Blocco: riallineare gli ID engine; in attesa di revisione gap **[TKT-01A-ENGINE]**.                                                                                                                                                           |
| `docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`                           | Derived (documentazione) | Note di processo senza link a patchset/ticket; non abilitano modifiche operative.              | Aggiornamento con patchset 01B o archiviazione concordata.            | coordinator + archivist              | **provvisorio** — decisione aperta su mantenimento/archivio; legato al gap [`REF_INCOMING_CATALOG#gap-list-01a-bozza-in-attesa-di-approvazione-master-dd`](./REF_INCOMING_CATALOG.md#gap-list-01a-bozza-in-attesa-di-approvazione-master-dd). |

### Fase 3 (tooling/validazione)

**PATCHSET-02A – Tooling di validazione**

- **Owner:** dev-tooling (supporto: balancer per dati numerici e archivist per log dei casi noti).
- **Prerequisiti:** 01C approvato; schemi attuali consolidati (`REF_TOOLING_AND_CI`); ambienti di staging disponibili per dry-run (chiusi al 2025-11-30 con log su branch `patch/03A-core-derived`).
- **Criteri di successo (Fase 3):**
  - Validator per core/derived/incoming eseguibile in locale e in CI (smoke + report differenze) con documentazione di setup.
  - Fixture di test minime per rilevare regressioni su pack derivati + baseline di risultati attesa.
- **Rollback:** disabilitare nuovo validator e ripristinare pipeline precedente; conservare log per diagnosi e issue di follow-up sui falsi positivi.
- **Note rischio (Fase 3):** falsi positivi possono bloccare release; prevedere modalità “report-only” nella prima esecuzione e whitelisting temporaneo.

### Fase 4 (applicazione patch)

**PATCHSET-03A – Applicazione patch core/derived**

- **Owner:** coordinator (supporto: species-curator per core, trait-curator per derived e balancer per verifiche numeriche critiche).
- **Prerequisiti:** 02A attivo in modalità report-only; approvazione owner umano per modifiche ad alto impatto; finestra di freeze per merge paralleli.
- **Criteri di successo (Fase 4):**
  - Patch applicate a core/derived con validator in pass; changelog e rollback script generati e pubblicati in `logs/`.
  - Nessuna regressione sui pack ufficiali secondo suite smoke e confronti numerici puntuali.
- **Rollback:** eseguire script di revert generati + disabilitare validator nuovo se blocca il deploy; ripristinare snapshot dei pack interessati.
- **Note rischio (Fase 4):** conflitti con branch paralleli → congelare merge di feature non correlate durante l’esecuzione e attivare codice di compatibilità temporaneo dove necessario.

**PATCHSET-03B – Pulizia incoming/archivio**

- **Owner:** archivist (supporto: asset-prep per migrazione asset e redirect).
- **Prerequisiti:** 03A completato; mapping incoming ↔ core/derived stabile; backup snapshot etichettato.
- **Criteri di successo (Fase 4 conclusiva):**
  - Incoming ripulito/archiviato con log per elementi rimossi o spostati e tag per data di archiviazione.
  - Aggiornamento indicizzazioni e redirect per evitare riferimenti orfani, verificati con scan automatico dei link.
- **Rollback:** ripristino snapshot incoming pre-pulizia; rollback delle entry di archivio aggiunte; ripristino redirect originari.
- **Note rischio (Fase 4 conclusiva):** perdita di referenze storiche → mantenere copia read-only del catalogo precedente e checklist post-pulizia.

#### Freeze fase 3→4 e unlock 03A/03B

- **Finestra di freeze proposta (approvazione Master DD obbligatoria):** blocco merge non urgenti su `core/**`, `derived/**`, `incoming/**` e `docs/incoming/**` per la durata del rollout 03A–03B. Attivazione con avviso in `logs/agent_activity.md`, fine prevista dopo chiusura checklist 03B.
- **Condizioni di sblocco (trigger fase 3→4 della matrice):**
  - Validator 02A rieseguito in modalità **report-only** su branch `patch/03A-core-derived` con fixture/baseline aggiornate e log archiviato.
  - Snapshot dei pack core/derived e backup incoming etichettato prima di qualsiasi merge, con percorso di ripristino documentato.
  - Approvazione esplicita di Master DD sui due branch dedicati (`patch/03A-core-derived`, `patch/03B-incoming-cleanup`) e sull’uscita dal freeze.

#### Checklist di merge (03A core/derived → 03B cleanup incoming)

1. **Pre-merge 03A**
   - Validator 02A in pass (report-only) con log allegato al merge request.
   - Changelog e script di rollback generati per i pack toccati; snapshot core/derived registrato.
   - Master DD approva il merge del branch `patch/03A-core-derived`.
2. **Transizione verso 03B**
   - Backup/snapshot di `incoming/**` effettuato e referenziato per eventuale revert.
   - Redirect e indicizzazioni preparati in bozza (nessuna rimozione finché il backup non è confermato leggibile).
3. **Merge 03B e uscita freeze**
   - Verifica post-merge link/redirect e riesecuzione rapida validator 02A (smoke) per rilevare regressioni sulle dipendenze incoming ↔ core/derived.
   - Master DD registra via libera allo sblocco e chiusura della finestra di freeze in `logs/agent_activity.md`.

#### Criteri di successo e rollback 03A/03B (Fase 4)

- **Successo 03A:** patch core/derived applicate con validator 02A in pass, changelog e rollback script pubblicati; freeze ancora attivo per passare a 03B.
- **Rollback 03A:** revert via script + ripristino snapshot core/derived precedente; se il validator 02A segnala regressioni, sospendere merge 03B e tornare a stato post-02A.
- **Successo 03B:** incoming ripulito con log di elementi spostati/archiviati, redirect verificati e backup accessibile; checklist post-pulizia archiviata.
- **Rollback 03B:** ripristino backup incoming pre-pulizia e riattivazione redirect originali; riesecuzione validator 02A (smoke) per confermare ritorno allo stato stabile.

---

## Matrice dipendenze e trigger di fase

| Patchset | Dipende da | Sblocco per        | Trigger di fase (GOLDEN_PATH)                                                  | Note                                                     |
| -------- | ---------- | ------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 01A      | 00 (scope) | 01B, 01C           | Chiusura catalogo incoming con gap list approvata → chiude Fase 1.             | Congelare nuovi ingressi durante il censimento.          |
| 01B      | 01A        | 01C, 02A           | Matrice core/derived validata + priorità P0/P1/P2 → completa Fase 2 lato dati. | Dipende dal catalogo per classificare core/derived.      |
| 01C      | 01A, 01B   | 02A                | Inventario tooling/CI con controlli mancanti e piano rollout → apre Fase 3.    | Richiede matrice core/derived per configurare controlli. |
| 02A      | 01B, 01C   | 03A                | Validator in modalità report-only con fixture e baseline → consente Fase 4.    | Validator necessita cataloghi e matrice consolidata.     |
| 03A      | 02A        | 03B                | Prima ondata di patch core/derived con validator in pass → avanza Fase 4.      | Applicazione patch deve avere validator stabile.         |
| 03B      | 03A        | Conclusione fase 4 | Incoming ripulito + redirect verificati → chiude Fase 4.                       | Pulizia finale su incoming dopo patch core/derived.      |

Compatibilità GOLDEN_PATH: la sequenza mantiene allineamento con le Fasi 1–4 (analisi/catalogo → tooling/validazione → applicazione patch), senza introdurre attività delle Fasi 5–7. I trigger espliciti evitano di avanzare di fase senza evidenza di readiness.

### Trigger di passaggio fase (riassunto)

- **Passaggio Fase 1 → 2:** Master DD approva la gap list 01A e la chiusura della tabella incoming; congelamento ingressi formalizzato e loggato.
- **Passaggio Fase 2 → 3:** Master DD approva la matrice core/derived 01B e il catalogo tooling/CI 01C (modalità report-only) con owner e gate incrociati registrati nel log attività.
- **Passaggio Fase 3 → 4:** Master DD valida l’esecuzione del validator 02A (report-only) con fixture/baseline aggiornate e apre la finestra di freeze.
- **Completamento Fase 4:** Master DD approva i merge 03A e 03B, verifica redirect e log aggiornati in `logs/agent_activity.md` e registra l’uscita dal freeze.

---

## Prerequisiti generali prima di procedere

- Conferma owner umano per i patchset 02A+ (tooling) e 03A+ (patch applicative) e per l’attivazione di ogni passaggio di fase; Master DD approva e registra gli sblocchi 01A–01C.
- Branch dedicati per ogni patchset, gate di review incrociato tra agenti (coordinator + owner di fase) e piano di freeze per ridurre conflitti.
- Log centralizzato in `logs/agent_activity.md` per tracking di rischi, rollback e approvazioni, aggiornato a ogni trigger di fase.

---

## Checklist di rollback 01A–03B (operativa)

- **01A:** ripristinare la tabella incoming precedente, riaprire gli ingressi congelati, annullare alias temporanei e link introdotti durante il censimento.
- **01B:** ripristinare i tag core/derived precedenti nei documenti di riferimento, rimuovere flag temporanei e revert della matrice pubblicata nel branch dedicato.
- **01C:** disattivare hook pilota, ripristinare configurazioni CI precedenti, rimuovere pipeline sperimentali o script report-only non promossi.
- **02A:** revert del branch validator, ripristino delle fixture/baseline precedenti e sospensione dell’apertura freeze se aperta condizionatamente.
- **03A:** eseguire gli script di revert generati, ripristinare lo snapshot core/derived e disabilitare il validator nuovo se blocca il deploy.
- **03B:** ripristinare il backup incoming pre-pulizia, rollback di redirect e entry di archivio aggiunte, rieseguire il validator 02A (smoke) per confermare la stabilità.

---

## Audit e conferme finali

- **Log attività:** tutte le approvazioni, trigger di fase e pubblicazioni di branch devono essere registrate in `logs/agent_activity.md` con riferimento ai ticket (`TKT-01A-*`, branch 03A/03B, esecuzioni 02A) e agli snapshot eseguiti.
- **Documenti collegati:** richiamare `docs/planning/REF_INCOMING_CATALOG.md` per la gap list 01A, `docs/planning/REF_REPO_SOURCES_OF_TRUTH.md` per le fonti core/derived e `docs/planning/REF_TOOLING_AND_CI.md` per l’inventario 01C.
- **Conferma Master DD:** richiedere conferma finale a Master DD dopo il merge di 03B e la verifica dei redirect, usando il log attività come audit trail definitivo prima di chiudere la fase 4.

---

## Changelog

- 2026-05-09: formalizzate le due-date 01A (log 2026-04-11) e gap list 01A (entry 2026-05-05) con finestra operativa 02A (2026-05-01→05-02) condivise con Master DD e dipendenze verso freeze 03A/03B; aggiunta riga operativa 02A in tabella responsabilità.
- 2026-05-08: aggiornato l’header con versione/data 2026 e stato gate (01A/01B/01C e 03A/03B approvati, 02A unico aperto) in coerenza con i log 2026-04-11/12 (`patch/01B-core-derived-matrix`) e 2026-05-01/02 (gate 03A/03B, chiusura freeze in `logs/agent_activity.md`).
- 2026-05-07: allineato lo stato 01B/01C ai log del 2026-04-11/12 (`logs/agent_activity.md`), con referenza al branch `patch/01B-core-derived-matrix` e aggiornamento delle dipendenze verso 02A/03A/03B sugli ultimi log.
- 2025-11-30: recepita la chiusura del gate 02A (validator schema/trait/style in pass con approvazione Master DD) e lo sblocco conseguente dei gate 03A/03B; aggiunti riferimenti ai log su `patch/03A-core-derived` e ai run mirror in `reports/temp/patch-03A-core-derived/rerun-2025-11-30/`.
- 2026-05-06: allineato lo stato 01A–03B agli update log di maggio 2026 (`logs/agent_activity.md`), marcando le approvazioni di gate 03A/03B e la catalogazione gap list 01A con note di avanzamento e attività ancora aperte.
- 2025-12-30: versione 0.5 – intestazione aggiornata al report v0.5, confermate le dipendenze 01A–03B e i trigger di fase GOLDEN_PATH senza variazioni alla sequenza.
- 2025-12-17: versione 0.4 – matrice dipendenze con trigger di fase GOLDEN_PATH, criteri/rollback/rischi allineati per 01A–03B e prerequisiti generali ampliati (branch dedicati, gate incrociati, logging fase per fase).
- 2025-12-17: versione 0.3 – design completato e perimetro documentazione consolidato per PATCHSET-00, numerazione 01A–03B bloccata con richiamo alle fasi GOLDEN_PATH e prerequisiti di governance ribaditi (owner umano, branch dedicati, logging in `logs/agent_activity.md`).
- 2025-11-24: versione 0.3 – raffinata sequenza 01A–03B, aggiunta matrice dipendenze e nota compatibilità GOLDEN_PATH Fasi 1–4.
- 2025-11-23: versione 0.2 – sequenza patchset per Fasi 1–4 con owner, prerequisiti, successo e rollback.
- 2025-11-23: bozza di piano di migrazione basato su `REF_REPO_SCOPE` (coordinator).
