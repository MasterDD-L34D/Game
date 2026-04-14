# Daily PR Summary — 2025-11-15

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR                                                     | Titolo                             | Autore         | Merged (UTC)         |
| ------------------------------------------------------ | ---------------------------------- | -------------- | -------------------- |
| [#697](https://github.com/MasterDD-L34D/Game/pull/697) | Normalize Evo seed catalog imports | @MasterDD-L34D | 2025-11-15T00:49:01Z |

## #697 — Normalize Evo seed catalog imports

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-15T00:49:01Z
- Link: https://github.com/MasterDD-L34D/Game/pull/697

> ## Summary
>
> - normalize the Evo seeding script to derive repo-relative manifest and foodweb paths from catalog JSON and meta-network YAML data
> - extend the unit tests to cover trait catalog parity and biome path normalization for network-provided nodes
> - document the additional meta-network sources across the MongoDB handbook and data inventory references
>
> ## Testing
>
> - pytest tests/scripts/test_seed_evo_generator.py
> - python scripts/db/seed_evo_generator.py --dry-run
>
> ---
>
> Codex Task (riferimento interno)
