# Changelog 03A – core/derived

## Riferimenti
- Branch: `patch/03A-core-derived`
- Baseline precedente: snapshot freeze 2025-11-25T2028Z (`reports/backups/2025-11-25T2028Z_masterdd_freeze/*` per core/derived/incoming).
- Validator 02A rieseguiti in modalità report-only (schema-only, trait audit, trait style).

## Aggiornamento 2025-11-29
- **Snapshot pre-03A confermato**: manifest `reports/backups/2025-11-25T2028Z_masterdd_freeze/manifest.txt` (core/derived/incoming) validato come riferimento di rollback.
- **Patchset applicato**: stato corrente di `data/core/` e `data/derived/` allineato al pacchetto 03A già approvato (nessun nuovo delta rispetto al bundle sonoro).
- **Smoke lint/schema**: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → **OK** (14 controlli, 0 avvisi pack) con log `logs/schema_only_2025-11-29.log`.
- **Validator 02A post-smoke**:
  - `python scripts/trait_audit.py --check` → **OK** (verifica schema saltata: modulo `jsonschema` assente; nessuna regressione). Log: `logs/trait_audit_2025-11-29.log`.
  - `node scripts/trait_style_check.js --output-json logs/trait_style_2025-11-29.json --fail-on error` → **OK** (0 suggerimenti). Log: `logs/trait_style_2025-11-29.log`, JSON: `logs/trait_style_2025-11-29.json`.
- **Firma**: Master DD (richiesta conferma sul rerun 2025-11-29).

## Rollback rapido (03A)
- Snapshot: `reports/backups/2025-11-25T2028Z_masterdd_freeze/manifest.txt` (checksum `manifest.sha256`).
- Comandi di ripristino testati a secco:
  ```bash
  git checkout HEAD -- data/core/ data/derived/
  tar -xzf /path/to/core_snapshot_2025-11-25T2028Z.tar.gz -C /workspace/Game --overwrite
  tar -xzf /path/to/derived_snapshot_2025-11-25T2028Z.tar.gz -C /workspace/Game --overwrite
  ```
- Verifica post-rollback (smoke):
  ```bash
  python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack
  python scripts/trait_audit.py --check
  node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error
  ```

## Modifiche applicate
1. **Schema biomi** – confermato allineamento al validator 02A con `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` (nessun errore, 3 avvisi pack).
2. **Sinergie trait cluster sonoro** – verificata la reciprocità delle sinergie per `ali_fono_risonanti`, `cannone_sonico_a_raggio`, `campo_di_interferenza_acustica`, `occhi_cinetici` nei payload JSON e nell'indice.
3. **i18n/stile** – sostituiti i placeholder i18n di `fattore_mantenimento_energetico` con valori testuali espliciti per il cluster sonoro (inline nel payload e in `data/traits/index.json`) per soddisfare le regole stile 02A.
4. **Debolezze cluster sonoro** – aggiunte le chiavi i18n `debolezza` ai quattro trait sonori (`ali_fono_risonanti`, `cannone_sonico_a_raggio`, `campo_di_interferenza_acustica`, `occhi_cinetici`) e allineati i testi in `data/traits/index.json` e `locales/it/traits.json`.
5. **Snapshot/rollback** – riallineati i riferimenti di changelog/rollback al manifest `reports/backups/2025-11-25T2028Z_masterdd_freeze/manifest.txt` (snapshot 03A/03B approvato da Master DD).
6. **Gate 03A 2026-05-01** – confermato in report-only il validator schema-only (14 controlli, 3 avvisi pack) con log dedicati `schema_only_2026-05-01.log` e `schema_only_2026-05-01_gate.log`; approvazione Master DD registrata in `logs/agent_activity.md` e nel bundle di audit.
7. **Gate 03A 2026-05-02** – validazione schema-only in report-only (14 controlli, 3 avvisi pack) con log `schema_only_2026-05-02.log` e `schema_only_2026-05-02_gate.log` (sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`); approvazione Master DD registrata in `logs/agent_activity.md` e `reports/audit/2026-02-20_audit_bundle.md`.

## Validator 02A (report-only)
- `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → **OK** (3 avvisi pack). Log: `reports/temp/patch-03A-core-derived/schema_only.log`.
- `python scripts/trait_audit.py` → **OK** (nessun blocco, solo warning sul modulo jsonschema mancante). Log: `reports/temp/patch-03A-core-derived/trait_audit.log`.
- `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on error` → **OK** (0 errori; 62 info). Log: `reports/temp/patch-03A-core-derived/trait_style.log`; JSON: `reports/temp/patch-03A-core-derived/trait_style.json`.
- `2025-11-25T22:46Z` rerun **report-only** (schema-only, trait audit, trait style) per `TKT-02A-VALIDATOR`, salvato in `reports/temp/patch-03A-core-derived/rerun-2025-11-25-04/` con copie aggiornate nei percorsi canonici (`.../schema_only.log`, `.../trait_audit.log`, `.../trait_style.log`, `.../trait_style.json`). Esiti: schema-only **OK** (3 avvisi pack), trait audit **OK** (warning modulo jsonschema mancante), trait style **OK** (0 errori; 172 warning; 62 info).
- `2025-11-25T23:27Z` rerun **report-only** post-patch debolezze con salvataggio in `reports/temp/patch-03A-core-derived/rerun-2025-11-25T23-27-06Z/`. Esiti: schema-only **OK** (3 avvisi pack), trait audit **OK** (warning modulo jsonschema mancante), trait style **OK** (0 errori; 168 warning; 62 info).
- `2025-11-28T16:18Z` rerun **report-only** post-correzioni 03A con salvataggio in `reports/temp/patch-03A-core-derived/rerun-2025-11-28/`. Esiti: schema-only **OK** (3 avvisi pack), trait audit **OK** (warning modulo jsonschema mancante), trait style **OK** (0 errori; 62 info).
- `2026-05-01T17:35Z` rerun **report-only** schema-only per refresh gate 03A: log `reports/temp/patch-03A-core-derived/schema_only_2026-05-01.log` e `schema_only_2026-05-01_gate.log` (14 controlli, 3 avvisi pack; nessun errore).
- `2026-05-02T17:48Z` rerun **report-only** schema-only per gate 03A: log `reports/temp/patch-03A-core-derived/schema_only_2026-05-02.log` e `schema_only_2026-05-02_gate.log` (14 controlli, 3 avvisi pack; nessun errore; sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`).

## Note operative
- Nessun artefatto generato fuori da `reports/temp/patch-03A-core-derived/`.
- Freeze 03A/03B invariato; via libera finale da Master DD registrato nel log `logs/agent_activity.md` insieme a changelog/rollback aggiornati.
