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
