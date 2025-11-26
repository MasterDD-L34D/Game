# Patchset 03A – Rollback rapido

## Snapshot di riferimento
- Freeze precedente: `reports/backups/2025-11-25_freeze/`
  - core_snapshot_2025-11-25.tar.gz (sha256 `f42ac8a30fffafa4a6178602cf578474fe2c0c03b6c26a664fec5dc04aeabe17`)
  - derived_snapshot_2025-11-25.tar.gz (sha256 `e9552e270b16af35731156dc04888df4d590f6677624fc9a9232e0e3c43b675b`)
  - incoming_backup_2025-11-25.tar.gz (sha256 `44fca4ef9f02871394f3b57fa665998aa748a169f32fb3baac93ef97f373a626`)
  - docs_incoming_backup_2025-11-25.tar.gz (sha256 `c6f6cf435f7ce22326e8cbfbb34f0ee8029daa5f4ff55b6ee41a468f904840c`)

## Procedura (testata in dry-run)
1. **Ripristino dataset core/derived**
   ```bash
   tar -xzf /path/to/core_snapshot_2025-11-25.tar.gz -C /workspace/Game --overwrite
   tar -xzf /path/to/derived_snapshot_2025-11-25.tar.gz -C /workspace/Game --overwrite
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
   tar -xzf /path/to/incoming_backup_2025-11-25.tar.gz -C /workspace/Game --overwrite
   tar -xzf /path/to/docs_incoming_backup_2025-11-25.tar.gz -C /workspace/Game --overwrite
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
