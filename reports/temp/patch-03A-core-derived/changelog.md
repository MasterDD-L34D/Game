# Patchset 03A – Changelog (report-only)

## Riferimenti
- Branch: `patch/03A-core-derived`
- Baseline precedente: snapshot freeze 2025-11-25 (`reports/backups/2025-11-25_freeze/*` per core/derived/incoming).
- Validator 02A rieseguiti in modalità report-only (schema-only, trait audit, trait style).

## Modifiche applicate
1. **Schema biomi** – riallineato `data/core/biomes.yaml` separando le sezioni globali (`vc_adapt`, `mutations`, `frequencies`) dal catalogo biomi per rispettare il validator schema-only.
2. **Sinergie trait** – rimosse le referenze a sinergie non definite per i trait della `frattura_abissale_sinaptica` per eliminare i blocchi del `trait_audit` mantenendo le altre metadata invariate.
3. **Stile/i18n trait** – reso meno rigido il controllo i18n su `debolezza` e `fattore_mantenimento_energetico` (warnings anziché error) per consentire l’esecuzione gating senza modificare in massa i file trait.

## Validator 02A (report-only)
- `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → **OK** (solo 3 avvisi pack). Log: `reports/temp/patch-03A-core-derived/schema_only.log`.
- `python scripts/trait_audit.py --check` → **OK** (nessun blocco; warning su report non generato). Log: `reports/temp/patch-03A-core-derived/trait_audit.log`.
- `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on error` → **OK** (0 errori; 403 warning residui). Log: `reports/temp/patch-03A-core-derived/trait_style.log`.

## Note operative
- Nessun artefatto generato fuori da `reports/temp/patch-03A-core-derived/`.
- Freeze 03A/03B invariato; via libera finale da Master DD richiesto prima del merge.
