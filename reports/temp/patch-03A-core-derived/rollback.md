# Patchset 03A – Rollback rapido

## Snapshot di riferimento
- Freeze precedente: `reports/backups/2025-11-25T2028Z_masterdd_freeze/`
  - core_snapshot_2025-11-25T2028Z.tar.gz (sha256 `77b3e95abc1e5c2376251c8aa59670d6dd52aa4b52ce36e110e3954262c141f2`)
  - derived_snapshot_2025-11-25T2028Z.tar.gz (sha256 `1caee01ccc871cd7daf1a585456d1d0f8a89b2669ab312668dec6d196768e03a`)
  - incoming_backup_2025-11-25T2028Z.tar.gz (sha256 `aa0bdcce913fd31e5caf6caa189327770f31ba135ab7a0e614b3ae632e8f2268`)
  - docs_incoming_backup_2025-11-25T2028Z.tar.gz (sha256 `4154ad3326340203052a0f6b770ae71549859525856a1affe98ea36b8d0a9236`)

## Procedura (testata in dry-run)
1. **Ripristino dataset core/derived**
   ```bash
   tar -xzf /path/to/core_snapshot_2025-11-25T2028Z.tar.gz -C /workspace/Game --overwrite
   tar -xzf /path/to/derived_snapshot_2025-11-25T2028Z.tar.gz -C /workspace/Game --overwrite
   git checkout -- data/core/biomes.yaml data/traits/index.json \
     data/traits/locomotivo/ali_fono_risonanti.json \
     data/traits/offensivo/cannone_sonico_a_raggio.json \
     data/traits/difensivo/campo_di_interferenza_acustica.json \
     data/traits/sensoriale/occhi_cinetici.json \
     locales/it/traits.json \
     reports/temp/patch-03A-core-derived/trait_style.md
   ```
2. **Ripristino incoming/docs** (se necessario)
   ```bash
   tar -xzf /path/to/incoming_backup_2025-11-25T2028Z.tar.gz -C /workspace/Game --overwrite
   tar -xzf /path/to/docs_incoming_backup_2025-11-25T2028Z.tar.gz -C /workspace/Game --overwrite
   ```
3. **Verifica**
   ```bash
   python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack
   python scripts/trait_audit.py --check
   node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error
   ```
4. **Comunicazione**
   - Loggare il rollback in `logs/agent_activity.md` citando gli archivi usati.
   - Mantenere freeze 03A/03B finché Master DD non riapre il gate.

## Note
- Gli archivi sono off-repo: aggiornare i percorsi reali in base allo storage utilizzato.
- La procedura non tocca pack/incoming se non richiesto; per un rollback parziale limitarsi a `git checkout -- <file>`.
- Verifica schema-only 2026-05-01: i log `schema_only_2026-05-01.log` e `schema_only_2026-05-01_gate.log` confermano che il rollback non è stato necessario; mantengono la stessa sequenza di 14 controlli / 3 avvisi pack.
- Verifica schema-only 2026-05-02: i log `schema_only_2026-05-02.log` e `schema_only_2026-05-02_gate.log` (sha256 `805d6a88ae39f76fc1ad9dd9a7f26cbe26a91019c63c9bdf32aba74390cb59ec`) confermano coerenza con la baseline precedente; rollback non attivato.
- Dry-run 2025-12-02: rehearsal senza estrarre archivi S3, usando solo `git checkout` sui file 03A indicati sopra per validare la procedura; manifest di riferimento riletti (`reports/backups/2025-11-25_freeze/manifest.txt`, `reports/backups/2025-11-29T0525Z_freeze_03A-03B/manifest.txt`).
