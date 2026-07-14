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
| `data/derived/analysis/trait_coverage_report.json` | `7be99fb5f83aa69c0d9e53b3bed1d0f74658d09830ddae2a739b2dfdfb64d6bb` |
| `data/derived/analysis/trait_coverage_matrix.csv` | `4c4005bbfbd67212b7a00f88267f355f050a1f809276ef2798a3c4482162f784` |
| `data/derived/analysis/trait_gap_report.json` | `a0ef558023bba99f39cdd6c8c173c7e77d60a8ede00b16cf4225a7ad693227c2` |
| `data/derived/analysis/trait_baseline.yaml` | `029076d96a7ee93dcab610d77a64be4ff9ab0e0b317af72b5666f23b808c78f5` |
| `data/derived/analysis/trait_env_mapping.json` | `8b0c0e07c8fca118707efe948092992d2dece80996ad9c270a6a56b3ba851ddc` |
| `data/derived/analysis/progression/skydock_siege_xp.json` | `71abfef29be8df51f6ea7534de92b3d7a4b829057bb9a054da4d51ab22cf8ae9` |
| `data/derived/analysis/progression/skydock_siege_xp_summary.csv` | `b80cca96f619946293a3600c1a42245f8a9996f6c4a1c518b3249db16bd781b9` |
| `data/derived/analysis/progression/skydock_siege_xp_profiles.csv` | `94e20f0b13c2c03be69b81ad1292f25bd485f1cc259e7f4f38c5db3ab07493cd` |
