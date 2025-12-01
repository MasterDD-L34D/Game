# 02A validator rerun (report-only)

- **Modalità**: consultiva, nessuna modifica ai dataset.
- **Comandi previsti**:
  1. `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack`
  2. `python scripts/trait_audit.py --check`
  3. `node scripts/trait_style_check.js --output-json /tmp/trait_style.json --fail-on error`
- **Output atteso**:
  - Stato `PASS` per ogni comando dopo le fix pre-03A; se emergono errori residui, elencarli con timestamp e riferimento al ticket correlato.
  - Log archiviato qui e referenziato da `docs/planning/02A_validator_report.md`.
- **Note**: esecuzione pianificata prima del gate 03A per convalida schema/trait/style.
