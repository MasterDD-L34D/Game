# Trait pipeline 2025-11-30 (UTC)

- Conversione: `python tools/py/import_external_traits.py --appendix-dir docs/appendici --incoming incoming/sentience_traits_v1.0.yaml --output-dir data/traits/_drafts` → vedi `conversion.log`.
- Coverage: `python tools/py/report_trait_coverage.py --env-traits packs/evo_tactics_pack/docs/catalog/env_traits.json --trait-reference data/traits/index.json --species-root packs/evo_tactics_pack/data/species --trait-glossary data/core/traits/glossary.json --out-json data/derived/analysis/trait_coverage_report.json --out-csv data/derived/analysis/trait_coverage_matrix.csv --strict` → vedi `coverage.log`.
- Locale sync: `python scripts/sync_trait_locales.py --traits-dir data/traits --locales-dir locales --language it` → vedi `locale_sync.log`.
- Validator di riferimento: `python tools/py/trait_template_validator.py --summary` → vedi `validator.log`.
- Link checker: `npm run docs:lint` → vedi `link_checker.log`.

Esito: tutti i passi completati con successo; validator e link checker in pass.
