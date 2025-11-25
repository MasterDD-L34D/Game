# Patchset 03A – Changelog (report-only)

## Riferimenti
- Branch: `patch/03A-core-derived`
- Baseline precedente: snapshot freeze 2025-11-25 (`reports/backups/2025-11-25_freeze/*` per core/derived/incoming).
- Validator 02A rieseguiti in modalità report-only (schema-only, trait audit, trait style).

## Modifiche applicate
1. **Sinergie trait** – rese reciproche tutte le sinergie bloccanti del `trait_audit` (es. `ectotermia_dinamica` ↔ `ipertrofia_muscolare_massiva`, `artigli_ipo_termici` ↔ `visione_multi_spettrale_amplificata`, catena `locomozione_miriapode_ibrida` ↔ `ermafroditismo_cronologico`/`sistemi_chimio_sonici`).
2. **Copertura i18n frattura_abissale_sinaptica** – aggiunti i campi descrittivi (`mutazione_indotta`, `uso_funzione`, `spinta_selettiva`) ai trait catalogati solo in `index.json` per eliminare i warning di completezza.
3. **Allineamento index** – `data/traits/index.json` sincronizzato con i dataset sorgente per sinergie e metadati, mantenendo lo schema invariato.

## Validator 02A (report-only)
- `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → **OK** (3 avvisi pack). Log: `reports/temp/patch-03A-core-derived/schema_only.log`.
- `python scripts/trait_audit.py` → **OK** (nessun blocco, solo warning sul modulo jsonschema mancante). Log: `reports/temp/patch-03A-core-derived/trait_audit.log`.
- `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on error` → **OK** (0 errori; 403 warning residui). Log: `reports/temp/patch-03A-core-derived/trait_style.log`.

## Note operative
- Nessun artefatto generato fuori da `reports/temp/patch-03A-core-derived/`.
- Freeze 03A/03B invariato; via libera finale da Master DD richiesto prima del merge.
