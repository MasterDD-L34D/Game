# Cataloghi e asset – Evo Tactics Pack

Scope: comandi riproducibili per cataloghi e asset del pack, con checksum e commit sorgente.

## Comandi supportati

- Pipeline completa (cataloghi + asset + manifest sha256 + log operativo):
  ```bash
  python scripts/evo_pack_pipeline.py \
    --core-root data/core \
    --pack-root packs/evo_tactics_pack \
    --log-activity \
    --log-tag PIPELINE-EVO-PACK-<YYYY-MM-DD>
  ```
  - Include: sync core→pack, derivazioni env/cross-biome, aggiornamento cataloghi, asset sync, build dist, validator pack.
  - Output checksum: `packs/evo_tactics_pack/out/catalog/catalog_checksums.sha256`.

- Rigenerazione cataloghi + asset con manifest sha256 (senza dist/validator):
  ```bash
  python scripts/evo_pack_pipeline.py \
    --core-root data/core \
    --pack-root packs/evo_tactics_pack \
    --skip-build --skip-validators \
    --log-activity \
    --log-tag PIPELINE-EVO-PACK-CATALOG-<YYYY-MM-DD>
  ```

## Manifest e checksum

- Il manifest viene scritto in `packs/evo_tactics_pack/out/catalog/catalog_checksums.sha256` e contiene:
  - timestamp UTC, percorso sorgente, commit git usato,
  - sha256 aggregato dell'intera directory `docs/catalog`,
  - elenco file con sha256 individuali (cataloghi JSON, asset multimediali, HTML di anteprima, ecc.).
- Il digest aggregato è anche riportato nel log operativo (`logs/agent_activity.md`) quando l'opzione `--log-activity` è abilitata.

## Mini-checklist operativa

### Pre-run
- Working tree pulito e dipendenze Node/Python installate.
- Core aggiornato (`data/core/**`) e coerente con il branch di lavoro.
- Scegli un `--log-tag` esplicito; assicurati che `packs/evo_tactics_pack/docs/catalog` sia scrivibile.

### Post-run
- Verifica che `out/catalog/catalog_checksums.sha256` sia presente e riporti il digest atteso.
- Se `--log-activity` è stato usato, controlla l'entry in `logs/agent_activity.md` per commit, tag e checksum.
- In caso di skip validator/build, annota l'eccezione nel log e valuta se eseguire un secondo passaggio completo.
