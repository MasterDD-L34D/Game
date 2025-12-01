# PATCHSET-02A – Baseline validator (report-only)

## Contesto e criteri di successo

- Fase 3 del piano di migrazione (`PATCHSET-02A` in `REF_REPO_MIGRATION_PLAN`): esecuzione consultiva dei validator per core/pack senza modifiche ai workflow.
- Branch attivo: `work` (dedicato a validator/report-only). Owner umano: **Master DD**; agente: **dev-tooling**.
- Scopo: raccogliere baseline locale in modalità report-only per sbloccare il gate verso 03A, senza committare artefatti.

## Comandi eseguiti (report-only)

1. **Schema-only (core + pack)**
   - Comando: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`
   - Input: `schemas/**`, `data/core/**`, `packs/evo_tactics_pack/**` (solo validazione schema).
   - Output principale: errori schema su `data/core/biomes.yaml` (chiavi mancanti e tipi non mappa per vari biomi).【e45b4f†L1-L36】
2. **Trait audit (catalogo core/pack, check-only)**
   - Comando: `python scripts/trait_audit.py --check`
   - Input: dataset trait di default (core/pack) in sola lettura.
   - Output principale: sinergie non definite per 23 trait; segnalato report mancante (`logs/trait_audit.md`) perché non generato in modalità check-only.【f54bdd†L1-L24】
3. **Trait style check (lint stile i18n)**
   - Comando: `node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error`
   - Input: `data/traits/**` con namespace i18n.
   - Output principale: 465 suggerimenti (276 errori, 127 warning, 62 info) su 225 file; esempio di errori su campi `fattore_mantenimento_energetico` e i18n assente.【404e2b†L1-L12】

## Baseline e note operative

- Tutti i comandi eseguiti in modalità **report-only** senza generare o committare artefatti (output temporaneo in `/tmp`).
- Gli esiti negativi costituiscono la baseline 02A: servono correzioni su `data/core/biomes.yaml`, sinergie mancanti nei trait e allineamento i18n/stile.
- Nessun workflow CI modificato; i risultati sono pronti per essere rieseguiti in CI in modalità consultiva.
- Richiesto via libera di **Master DD** per procedere al gate 03A (patch applicative) dopo la revisione di questa baseline.

## Remediation plan (pre-03A)

- **Errori schema (biomi core)** — owner: **dev-tooling**.
  - Fix richiesti: completare chiavi obbligatorie e normalizzare i tipi mappa in `data/core/biomes.yaml`.
  - Branch/ticket: aggiornare `patch/03A-core-derived` con MR legato a ticket di schema-fix; acceptance: validator schema in **pass** su core/pack.
  - Scadenza: prima del ciclo di integrazione 03A (gate schema).
- **Sinergie mancanti (trait)** — owner: **trait-curator**.
  - Fix richiesti: definire o rimuovere le 23 sinergie mancanti rilevate da `trait_audit`, con report aggiornato.
  - Branch/ticket: collegare ticket a `patch/03B-incoming-cleanup` con criteri di accettazione: rerun `trait_audit --check` senza missing synergies e log aggiornato.
  - Scadenza: pre-03A per sblocco del gate trait.
- **Debito di style i18n (trait)** — owner: **balancer** per il coordinamento dei naming e della consistenza.
  - Fix richiesti: ridurre errori/warning dal lint i18n (`trait_style_check`) con priorità su campi `fattore_mantenimento_energetico` e namespace mancanti.
  - Branch/ticket: aprire ticket collegato a `patch/03B-incoming-cleanup` con acceptance: errori ridotti (0 blocker) e warning residui documentati.
  - Scadenza: entro la finestra pre-03A per riallineare stile e localizzazione.

## Piano rerun validator (report-only)

- Obiettivo: rieseguire i tre validator (schema/trait/style) in modalità report-only per confermare le correzioni e sbloccare il gate 03A.
- Comandi previsti: stessi comandi baseline con output indirizzato a `reports/02A_validator_rerun.md`.
- Log atteso: per ciascun validator, stato `PASS` oppure elenco errori residui con timestamp; il file di log sarà archiviato in `reports/02A_validator_rerun.md` e referenziato da questo documento.
