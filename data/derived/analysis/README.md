# Derived analysis

Report derivati rigenerabili dal core e dal pack Evo Tactics.

## Prerequisiti e fonti (vedi `docs/planning/REF_PACKS_AND_DERIVED.md`)
- Patchset di riferimento: **PATCHSET-01A** (catalogo incoming) e **PATCHSET-02A** (tooling di validazione) per garantire input core validati.
- Input canonici: `data/core/traits/*.json`, `data/core/species.yaml`, `data/core/missions/skydock_siege.yaml`, configurazioni pack (`packs/evo_tactics_pack/tools/config/*.yaml`) quando richieste dagli script.
- Validatori consigliati prima/dopo la rigenerazione: `python tools/py/validate_datasets.py --schemas-only --core-root data/core --pack-root packs/evo_tactics_pack` e `python scripts/trait_audit.py --check`.

## Ultima rigenerazione
- Comando: `python tools/analysis/trait_gap_report.py --etl-report data/derived/analysis/trait_coverage_report.json --trait-reference data/traits/index.json --trait-glossary data/core/traits/glossary.json --out data/derived/analysis/trait_gap_report.json`
- Commit sorgente: `b13c11d4a3632abd28852530b0cdc536ee2193f3`
- Manifest con checksum: `data/derived/analysis/manifest.json`
- Log operativo: `logs/agent_activity.md` → `[TRAIT-GAP-SUMMARY-FIX]`

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
| `data/derived/analysis/trait_coverage_report.json` | `c9639c4ae1a5217dc30267bd491e33a1bc4d41dc396ac3626c5f931356696340` |
| `data/derived/analysis/trait_coverage_matrix.csv` | `1afc7d635ddc7266c7f1c1311a8992205e027005aed331f0dfc0600930d04bd8` |
| `data/derived/analysis/trait_gap_report.json` | `214c9115d38f53ccbec3758e3c4817b8a8ab0e0457f828b49e399628fe5138e6` |
| `data/derived/analysis/trait_baseline.yaml` | `cffcc2bfdda2989d7168af898b899c6f4f33e06da7311400906a38751925e07a` |
| `data/derived/analysis/trait_env_mapping.json` | `8b0c0e07c8fca118707efe948092992d2dece80996ad9c270a6a56b3ba851ddc` |
| `data/derived/analysis/progression/skydock_siege_xp.json` | `8f3014f01c7124dec2599e1bb3fa07375def5f95336ba269cceaba3cb035243d` |
| `data/derived/analysis/progression/skydock_siege_xp_summary.csv` | `a07044f6391a1958cd1b7042bd9a37b78c73f8934d537d1f05d0a0434f53f3d6` |
| `data/derived/analysis/progression/skydock_siege_xp_profiles.csv` | `fbf28f3e1f07430b475f47138aea4400c7f5f3184bc8569420a26c2460457d9f` |
