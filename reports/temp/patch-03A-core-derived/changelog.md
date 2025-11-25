# Patchset 03A – Changelog (report-only)

## Riferimenti
- Branch: `patch/03A-core-derived`
- Baseline precedente: snapshot freeze 2025-11-25 (`reports/backups/2025-11-25_freeze/*` per core/derived/incoming).
- Validator 02A rieseguiti in modalità report-only (schema-only, trait audit, trait style).

## Modifiche applicate
1. **Schema biomi** – riesecuzione validator schema-only su `data/core/biomes.yaml` (nessun errore, 3 avvisi pack) per chiudere i rilievi 02A.
2. **Sinergie trait cluster sonoro** – sinergie rese pienamente reciproche per `ali_fono_risonanti`, `cannone_sonico_a_raggio`, `campo_di_interferenza_acustica`, `occhi_cinetici` sia nei payload JSON sia in `data/traits/index.json`.
3. **i18n/stile** – aggiornato il validator stile per riconoscere `fattore_mantenimento_energetico` come campo non localizzato e ripristinati i valori testuali (Basso/Medio) nel cluster sonoro, mantenendo usage tags/slot_profile e sinergie reciproche nei payload e nell'indice.

## Validator 02A (report-only)
- `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → **OK** (3 avvisi pack). Log: `reports/temp/patch-03A-core-derived/schema_only.log`.
- `python scripts/trait_audit.py` → **OK** (nessun blocco, solo warning sul modulo jsonschema mancante). Log: `reports/temp/patch-03A-core-derived/trait_audit.log`.
- `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-core-derived/trait_style.json --fail-on error` → **OK** (0 errori; 172 warning, 62 info). Log: `reports/temp/patch-03A-core-derived/trait_style.log`.

## Note operative
- Nessun artefatto generato fuori da `reports/temp/patch-03A-core-derived/`.
- Freeze 03A/03B invariato; via libera finale da Master DD richiesto prima del merge.
