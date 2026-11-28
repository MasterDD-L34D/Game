# Freeze 2025-11-29 (03A/03B) – snapshot core/derived + backup incoming

## Scopo
Apertura freeze di sicurezza per i branch `patch/03A-core-derived` e `patch/03B-incoming-cleanup`, con snapshot allineati a `main` su `data/core`, `data/derived` e backup completo di `incoming/` prima di eventuali merge.

## Artefatti
- Archivi tar.gz generati in staging locale: `/tmp/2025-11-29T0525Z_freeze_03A-03B/`.
- Manifest con checksum/contatti: `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`.
- Nessun binario aggiunto al repository; copiare gli archivi su storage permanente (es. `s3://evo-backups/game/2025-11-29T0525Z_freeze_03A-03B/`) e aggiornare il campo Location se differisce.

## Dry-run rollback (report-only)
- `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` → OK (0 avvisi).
- `python scripts/trait_audit.py --check` → OK, schema skip per modulo `jsonschema` mancante.
- `node scripts/trait_style_check.js --output-json reports/temp/patch-03A-03B-freeze/trait_style.json --fail-on error` → OK (0 suggerimenti).
Log salvati in `reports/temp/patch-03A-03B-freeze/`.

## Ripristino
1. Recupera gli archivi elencati in `manifest.txt` (verifica percorso effettivo se spostati su S3/bucket esterno).
2. Esegui `sha256sum -c` sui file usando le checksum registrate prima di estrarre.
3. Ripristina prima `data/core/` e `data/derived/`, poi `incoming/` applicando eventuali redirect da `incoming/REDIRECTS.md`.
4. Rilancia i validator 02A (schema-only, trait audit, trait style) in modalità report-only per confermare la consistenza del rollback.

## Contatti
- Owner operativo: dev-tooling (backup/validator) + Master DD (approvatore umano freeze 03A/03B).
- On-call per restore: backups-oncall@game.internal (pager 4242).
