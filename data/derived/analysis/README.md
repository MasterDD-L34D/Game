# Derived analysis

Report derivati rigenerabili dal core e dal pack Evo Tactics.

## Ultima rigenerazione

- Comando: `python scripts/generate_derived_analysis.py --core-root data/core --pack-root packs/evo_tactics_pack --update-readme`
- Manifest con checksum: `data/derived/analysis/manifest.json`
- Log operativo: `logs/agent_activity.md` → `[(aggiungi in logs/agent_activity.md)]`

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
| `data/derived/analysis/trait_coverage_report.json` | `c659366c69b9acf81342865d740c8ffd2d106c575afd12dcc70ab66fb01e3d12` |
| `data/derived/analysis/trait_coverage_matrix.csv` | `ac2a66f39e09c981698e087033211b6b47f83386a1da32aacaca1ef587637a63` |
| `data/derived/analysis/trait_gap_report.json` | `a0ef558023bba99f39cdd6c8c173c7e77d60a8ede00b16cf4225a7ad693227c2` |
| `data/derived/analysis/trait_baseline.yaml` | `029076d96a7ee93dcab610d77a64be4ff9ab0e0b317af72b5666f23b808c78f5` |
| `data/derived/analysis/trait_env_mapping.json` | `8b0c0e07c8fca118707efe948092992d2dece80996ad9c270a6a56b3ba851ddc` |
| `data/derived/analysis/progression/skydock_siege_xp.json` | `71abfef29be8df51f6ea7534de92b3d7a4b829057bb9a054da4d51ab22cf8ae9` |
| `data/derived/analysis/progression/skydock_siege_xp_summary.csv` | `b80cca96f619946293a3600c1a42245f8a9996f6c4a1c518b3249db16bd781b9` |
| `data/derived/analysis/progression/skydock_siege_xp_profiles.csv` | `94e20f0b13c2c03be69b81ad1292f25bd485f1cc259e7f4f38c5db3ab07493cd` |
