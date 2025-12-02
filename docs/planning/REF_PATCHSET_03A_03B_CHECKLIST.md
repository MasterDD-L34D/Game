# PATCHSET 03A → 03B – Checklist esecutiva e criteri di blocco

Versione: 0.1
Data: 2025-11-25
Owner: coordinator (supporto: archivist, dev-tooling)
Stato: PIANO OPERATIVO – task granulari per 03A/03B e controlli pre/post merge

## Scope e premesse

- Sequenza target: `patch/03A-core-derived` → `patch/03B-incoming-cleanup` → `main`.
- Strict mode: applicare ogni step come azione esplicita e loggata; nessun merge senza validatori verdi.
- Log obbligatorio in `logs/agent_activity.md` prima/dopo ogni macro-step con: branch, owner, file toccati, comandi lanciati, esiti, ticket.

## Sequenza branch/patch e deliverable

- [x] **Baseline di partenza**: conferma snapshot `backup/2025-11-25/<timestamp>` puntato allo stato pre-patch; registrare hash e storage.
- [ ] **03A – core/derived**: applicare patch minime sui pacchetti core/derived mantenendo scope controllato; produrre changelog+rollback.
- [ ] **Transizione**: rebase `patch/03B-incoming-cleanup` su 03A aggiornato; verificare che il backup incoming sia leggibile.
- [ ] **03B – incoming/cleanup**: eseguire cleanup/redirect su incoming; nessun tocco su core/derived.
- [ ] **Merge finale su main**: solo dopo validator verdi post-merge e conferma che backup rimanga intatto.

## Validator e smoke – pre/post merge

- **Pre-merge su 03A e 03B (prima del PR)**
- [x] `COMANDO: CHECK_SCHEMA_E_SLUG_FRATTURA_ABISSALE`
- [x] `COMANDO: CHECK_COHERENZA_TRAIT_SPECIE_BIOMA_FRATTURA_ABISSALE`
- [x] `COMANDO: CHECK_TEST_E_PIPELINE_FRATTURA_ABISSALE` (include smoke rapidi)
- [x] Annotare output sintetico nel log con link ai report CI.
- **Post-rebase con main (PR ready)**
  - [x] Rieseguire gli stessi tre comandi; se falliscono, bloccare merge e rientrare in patch.
- **Post-merge su main**
  - [x] Rieseguire la triade di comandi su `main`.
  - [x] Se fallimento: apertura `hotfix/<ticket>` da main o rollback dell’ultimo merge.

## Backup e snapshot (2025-11-25)

- [x] Creare/aggiornare branch `backup/2025-11-25/<timestamp>` ancorato allo snapshot indicato.
- [x] Conservare manifest di `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**` e checksum associati.
- [x] Validare ripristino: dry-run di restore su ambiente di test prima di procedere ai merge.
- [x] In caso di rollback post-merge: reset hard di `main` al commit di snapshot e ripristino redirect/backup incoming.

## Criteri di stop/rollback

- [x] Stop immediato se uno dei tre validator fallisce o se smoke test segnala regressioni critiche.
- [x] Bloccare merge se >10 file toccati fuori scope (core/derived/incoming) o se cambiano formati dati core senza approvazione.
- [x] Rollback pre-merge: reset branch al commit precedente e ripetere pipeline dopo fix.
- [x] Rollback post-merge: revert ultimo merge su main o ripristino da branch `backup/2025-11-25/<timestamp>`.
- [x] Kill-switch manuale: richiedere review umana (Master DD) quando rischio medio/alto identificato dai log o dal router.

## Command Library – comandi da usare

- [ ] `COMANDO: PIPELINE_DESIGNER` per orchestrare varianti di sequenza se servono deviazioni controllate.
- [ ] `COMANDO: PIPELINE_EXECUTOR` o `COMANDO: PIPELINE_SIMULATOR` per dry-run/esecuzione degli step documentati.
- [ ] `COMANDO: CHECK_SCHEMA_E_SLUG_FRATTURA_ABISSALE` per validare schemi/slug.
- [ ] `COMANDO: CHECK_COHERENZA_TRAIT_SPECIE_BIOMA_FRATTURA_ABISSALE` per coerenza trait/specie/bioma.
- [ ] `COMANDO: CHECK_TEST_E_PIPELINE_FRATTURA_ABISSALE` per test CI e smoke rapidi.

## Registrazione e file da toccare

- [ ] `logs/agent_activity.md` – loggare ogni step (pre/post validator, backup, merge, rollback).
- [ ] `docs/planning/` – questo documento e eventuali appendici di dettaglio per patch/validator.
- [ ] `reports/audit/**` – allegare report finali e manifest backup quando disponibili.

## Aggiornamento validator 2025-12-02T1344Z (report-only)

- dev-tooling (firma Master DD) ha rieseguito la triade 02A + Frattura Abissale in modalità report su `patch/03A-core-derived` e mirror `patch/03B-incoming-cleanup`: schema-only PASS (10 controlli, 0 avvisi), trait_audit PASS con skip jsonschema atteso, trait_style PASS (0 suggerimenti), pipeline Frattura Abissale PASS (schema/coerenza + tooling evaluate/sync in dry-run, nessuna modifica dati; warn npm http-proxy noto). Log in `reports/temp/patch-03A-core-derived/2025-12-02T134447Z/` e copia specchiata in `reports/temp/patch-03B-incoming-cleanup/2025-12-02T134447Z/`; entry registrata in `logs/agent_activity.md`.
