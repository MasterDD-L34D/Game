# Piano di attività mirate per avviare la migrazione

Questo piano elenca le attività operative a "lavori mirati" per avviare subito la migrazione, con priorità, owner e check di uscita.

## Obiettivi

- Sbloccare il gate 02A e preparare il freeze per le fasi 03A/03B.
- Ridurre il rischio operativo predisponendo snapshot/rollback prima delle patch.
- Garantire tracciabilità tramite log e artefatti di validazione.

## Attività ad alto impatto (sequenza consigliata)

1. **Riesecuzione 02A con fix mirati** (owner: dev-tooling + trait-curator)
   - Correggere errori di schema in `data/core/biomes.yaml` e completare sinergie/affinità mancanti nei trait.
   - Allineare stile e i18n dei trait per abbattere le 465 violazioni note.
   - Eseguire in report-only: `validate_datasets.py --schemas-only`, `trait_audit --check`, `trait_style_check` e archiviare gli output in `logs/`.
   - Uscita: log firmato e richiesta di approvazione a Master DD per chiudere il gate 02A.

### Riesecuzione 02A – check operativo

- Owner raccomandati: dev-tooling (correzioni e validazione) + trait-curator (i18n e stile trait).
- Frequenza: ripetere l'intero ciclo fino a ottenere un pass verde su tutti i validator.
- Checklist di esecuzione:
  - [x] Correzione schema applicata (tracce in diff e note su sinergie/affinità completate).
  - [x] Allineamento i18n/trait eseguito (stile e localizzazione uniformati).
  - [x] `validate_datasets.py --schemas-only` eseguito.
  - [x] `trait_audit --check` eseguito.
  - [x] `trait_style_check` eseguito.
  - [x] Log allegati (percorso obbligatorio in `logs/`): `logs/schema_only_2026-05-02.log`, `logs/trait_audit_2026-05-02.log`, `logs/trait_style_2026-05-02.log`, `logs/TKT-02A-VALIDATOR.rerun.log`.
  - [x] Firma Master DD: Master DD

#### Stato ultima riesecuzione (2026-05-02 00:00 UTC)

- [x] Correzione schema applicata → **OK** (validator schema-only in pass, solo 3 avvisi pack attesi).
- [x] Allineamento i18n/trait eseguito → **OK** (stile uniforme, solo 62 suggerimenti informativi su note bioma).
- [x] `validate_datasets.py --schemas-only` eseguito → log: `logs/schema_only_2026-05-02.log` (copia corrente in `logs/`, fonte in `reports/temp/patch-03A-core-derived/`).
- [x] `trait_audit --check` eseguito → log: `logs/trait_audit_2026-05-02.log` (copia corrente in `logs/`, fonte in `reports/temp/patch-03A-core-derived/`).
- [x] `trait_style_check` eseguito → log: `logs/trait_style_2026-05-02.log` (copia corrente in `logs/`, fonte in `reports/temp/patch-03A-core-derived/`).
- [x] Log allegati → `logs/TKT-02A-VALIDATOR.rerun.log` + log correnti in `logs/` e copie canoniche in `reports/temp/patch-03A-core-derived/`.
- [x] Firma Master DD → Master DD

2. **Preparazione freeze e snapshot per 03A/03B** (owner: coordinator + archivist)
   - Creare snapshot di core/derived e backup di incoming; predisporre script di rollback già elencati nel piano di fase 3.
   - Annotare in `logs/agent_activity.md` l'apertura del freeze fase 3→4, con riferimenti ai branch `patch/03A-core-derived` e `patch/03B-incoming-cleanup`.
   - Uscita: checklist freeze compilata e rollback testato a secco.
   - **Stato:** completato e firmato Master DD → entry `[TKT-03AB-FREEZE-WINDOW-2026-05-03]` con snapshot/backup/redirect e dry-run rollback registrati in `logs/agent_activity.md` (finestra 2025-11-25T12:05Z→2025-11-27T12:05Z).

3. **Applicazione patch 03A (core/derived)** (owner: coordinator + dev-tooling)
   - Prerequisiti: 02A verde (tutti i validator in pass e log archiviati in `logs/`).
   - Applicare le patch su core/derived solo dopo il pass verde di 02A.
   - Pubblicare changelog e includere i comandi di rollback rapidi.
   - Checklist applicazione patch core/derived:
     - [x] Confermare riferimenti commit/patchset e snapshot disponibili (`reports/backups/2025-11-25T2028Z_masterdd_freeze/`).
     - [x] Applicare patch su `data/core/` e `data/derived/` seguendo l'ordine dei diff dichiarato (gate 03A approvato con Master DD: vedi log 2026-05-02 e 2026-05-01 in `logs/agent_activity.md`).
     - [x] Rieseguire smoke locale delle patch (lint/schema veloce) prima di validazioni complete (validator schema-only in pass con 3 avvisi pack).
     - [x] Aggiornare changelog utilizzando il template sotto (`reports/temp/patch-03A-core-derived/changelog.md`).
     - [x] Registrare comandi di rollback rapidi testati a secco (`reports/temp/patch-03A-core-derived/rollback.md`).
   - Template changelog (linkabile):
     - Titolo: `Changelog 03A – core/derived`
     - Campi: **Scope**, **Patchset applicato (commit/PR)**, **Data/Owner**, **Validator eseguiti** (con link ai log), **Rollback rapido** (comandi e note), **Note aggiuntive**.
   - Sezione comandi di rollback rapidi (da mantenere aggiornata con esempio eseguibile):
     - `git checkout <snapshot_pre_03A> -- data/core/ data/derived/`
     - `git revert <commit_patch_03A>` (se applicato come commit singolo)
     - Ripristino log: `cp reports/temp/patch-03A-core-derived/*.log logs/`
   - Punto di controllo post-patch: rieseguire i validator 02A (`validate_datasets.py --schemas-only`, `trait_audit --check`, `trait_style_check`), allegare gli output aggiornati in `logs/` e ottenere firma Master DD per il pass verde.
     - **Stato:** completato con log `logs/schema_only_2026-05-02.log`, `logs/trait_audit_2026-05-02.log`, `logs/trait_style_2026-05-02.log`, `logs/TKT-02A-VALIDATOR.rerun.log` (firma Master DD registrata in `logs/agent_activity.md`).
4. **Pulizia incoming 03B con redirect** (owner: archivist + asset-prep)
   - Ripulire/archiviare incoming dopo backup; verificare redirect/link e rieseguire validator 02A in smoke.
   - Chiudere il freeze registrando approvazione Master DD nel log attività.
   - Uscita: log di chiusura freeze e report redirect.
   - **Stato:** completato → checkpoint e cleanup con approvazione Master DD registrati come `[03B-CLEANUP-SMOKE-2026-05-02]` e `[03B-CLEANUP-SMOKE-2026-05-01]` in `logs/agent_activity.md` (backup/redirect invariati, smoke schema-only in pass con 3 avvisi pack, freeze 03B chiuso).

5. **Promozione CI progressiva** (owner: dev-tooling)
   - Raccogliere 3 run verdi su `patch/01C-tooling-ci-catalog` per: `data-quality`, `validate_traits`, `schema-validate`.
   - Mantenere `validate-naming` consultivo finché non è stabile la matrice core/derived; poi proporre passaggio a enforcing con rollback plan.
   - Uscita: memo con stato gate CI e decisione su enforcement.

   | Check CI        | Branch                       | Esito atteso | Run/Log CI                                                                                                            | Note                                                                                                    |
   | --------------- | ---------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
   | data-quality    | patch/01C-tooling-ci-catalog | Verde        | Run 1–3 verdi archiviate in `logs/ci_patch-01C-tooling-ci-catalog.md`                                                 | Tracking completato.                                                                                    |
   | validate_traits | patch/01C-tooling-ci-catalog | Verde        | Run #1 rossa (log locale), run 2–3 da rilanciare dopo fix coverage/index (`logs/ci_patch-01C-tooling-ci-catalog.md`). | Rilancio pianificato.                                                                                   |
   | schema-validate | patch/01C-tooling-ci-catalog | Verde        | Run 1–3 verdi archiviate in `logs/ci_patch-01C-tooling-ci-catalog.md`                                                 | Tracking completato.                                                                                    |
   | validate-naming | patch/01C-tooling-ci-catalog | Consultivo   | Decisione condivisa e approvata in log `[01C-NAMING-CONSULTIVE-2026-04-26]` (`logs/agent_activity.md`).               | Enforcing rinviato finché la matrice core/derived non è stabile e `validate_traits` non ha 3 run verdi. |
   - Nota enforcement `validate-naming`:
     - Stato attuale: **consultivo** (trigger limitati a `push`/`workflow_dispatch`).
     - Decisione finale: mantenere consultivo (approvazione Master DD in `[01C-NAMING-CONSULTIVE-2026-04-26]`).
     - Rollback plan: revert dell'eventuale commit di enforcement o ripristino `continue-on-error: true` + trigger limitato al branch `patch/01C-tooling-ci-catalog` come documentato in `logs/ci_patch-01C-tooling-ci-catalog.md`.

6. **Allineamento trait/biomi post-migrazione** (owner: trait-curator + balancer)
   - Applicare pipeline trait (conversione, coverage, locale sync) e migrazione v1→v2 secondo il piano operativo trait.
   - Eseguire QA finale (validator, link checker) e aggiornare documentazione/indici.
   - Uscita: report QA finale e indicizzazione aggiornata.

   **Checklist post-migrazione (esecuzione pipeline trait + QA + indici)**
   - [x] Pipeline trait eseguita end-to-end con evidenza dei tre step: **conversione**, **coverage**, **locale sync** (log in `logs/trait_pipeline_20251130T051614Z/{conversion.log,coverage.log,locale_sync.log}`).
   - [x] QA finale completato:
     - [x] Validator di riferimento eseguiti con log archiviati (`logs/trait_pipeline_20251130T051614Z/validator.log`).
     - [x] Link checker su documentazione/indici completato con esito verde (`logs/trait_pipeline_20251130T051614Z/link_checker.log`).
   - [x] Aggiornamento indici/documentazione completato con percorsi espliciti:
     - [x] Indice trait aggiornato (es. `traits/index.md` o `docs/traits/index.md`).
     - [x] Indice biomi aggiornato (es. `biomes/index.md` o `docs/biomes.md`).
     - [x] Altri indici correlati (es. `docs/migrations/README.md` o sommari locali) con riferimenti ai nuovi path.
   - [x] Field di controllo:
     - URL indici aggiornati: `docs/catalog/trait_reference.md`; `docs/biomes.md`
     - Report QA finale allegato (percorso file o URL): `logs/trait_pipeline_20251130T051614Z/README.md`

## Note operative

- Modalità STRICT attiva: ogni step richiede log dell'esecuzione e owner dichiarato.
- Tutti gli output di validazione devono essere archiviati in `logs/` con timestamp e riferimento al branch.
- In caso di conflitto tra script o piani, segnalare al Master DD prima di procedere.
