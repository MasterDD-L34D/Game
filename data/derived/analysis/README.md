# Derived analysis

Report derivati rigenerabili dal core e dal pack Evo Tactics.

## Prerequisiti e fonti (vedi `docs/planning/REF_PACKS_AND_DERIVED.md`)
- Patchset di riferimento: **PATCHSET-01A** (catalogo incoming) e **PATCHSET-02A** (tooling di validazione) per garantire input core validati.
- Input canonici: `data/core/traits/*.json`, `data/core/species.yaml`, `data/core/missions/skydock_siege.yaml`, configurazioni pack (`packs/evo_tactics_pack/tools/config/*.yaml`) quando richieste dagli script.
- Validatori consigliati prima/dopo la rigenerazione: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` e `python scripts/trait_audit.py --check`.

## Ultima rigenerazione
- Comando: `python scripts/generate_derived_analysis.py --core-root /workspace/Game/data/core --pack-root /workspace/Game/packs/evo_tactics_pack --log-tag PIPELINE-EVO-PACK-2025-11-30-R2 --update-readme`
- Commit sorgente: `a16f7e96e9def7d9f593a99f043ec87df96c28d1`
- Manifest con checksum: `data/derived/analysis/manifest.json`
- Log operativo: `logs/agent_activity.md` → `[PIPELINE-EVO-PACK-2025-11-30-R2]`

## Output attesi
- `trait_coverage_report.json`
- `trait_coverage_matrix.csv`
- `trait_gap_report.json`
- `trait_baseline.yaml`
- `trait_env_mapping.json`
- `progression/skydock_siege_xp.json`
- `progression/skydock_siege_xp_summary.csv`
- `progression/skydock_siege_xp_profiles.csv`

## Checksum (sha256)
| File | sha256 |
| --- | --- |
| `data/derived/analysis/trait_coverage_report.json` | `a2068172cd13636b53e8871ca6716726c096300efc74dcb2a34997e38c453d9c` |
| `data/derived/analysis/trait_coverage_matrix.csv` | `0cd248b081aa784343a8d5a60a67354eb64529c014c4abb8e776e14ff0237d54` |
| `data/derived/analysis/trait_gap_report.json` | `a62142bc9ae5211b46ffea3d9485124adcd6cc3a0dca91443479cbab9af51d93` |
| `data/derived/analysis/trait_baseline.yaml` | `cffcc2bfdda2989d7168af898b899c6f4f33e06da7311400906a38751925e07a` |
| `data/derived/analysis/trait_env_mapping.json` | `8b0c0e07c8fca118707efe948092992d2dece80996ad9c270a6a56b3ba851ddc` |
| `data/derived/analysis/progression/skydock_siege_xp.json` | `8f3014f01c7124dec2599e1bb3fa07375def5f95336ba269cceaba3cb035243d` |
| `data/derived/analysis/progression/skydock_siege_xp_summary.csv` | `a07044f6391a1958cd1b7042bd9a37b78c73f8934d537d1f05d0a0434f53f3d6` |
| `data/derived/analysis/progression/skydock_siege_xp_profiles.csv` | `fbf28f3e1f07430b475f47138aea4400c7f5f3184bc8569420a26c2460457d9f` |
