# Daily PR Summary — 2025-11-13

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR                                                     | Titolo                                             | Autore         | Merged (UTC)         |
| ------------------------------------------------------ | -------------------------------------------------- | -------------- | -------------------- |
| [#693](https://github.com/MasterDD-L34D/Game/pull/693) | Update documentation for CLI subcommands and usage | @MasterDD-L34D | 2025-11-13T00:04:02Z |
| [#694](https://github.com/MasterDD-L34D/Game/pull/694) | Update CLI smoke logging options and documentation | @MasterDD-L34D | 2025-11-13T19:08:18Z |

## #693 — Update documentation for CLI subcommands and usage

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-13T00:04:02Z
- Link: https://github.com/MasterDD-L34D/Game/pull/693

> ## Summary
>
> - align CLI documentation in the FAQ, support template, tutorial, and ADR with the current subcommands and flags, including the global profile option
> - extend the main README and incoming guide with up-to-date `investigate` usage examples and notes on JSON/HTML outputs
>
> ## Testing
>
> - n/a
>
> ---
>
> Codex Task (riferimento interno)

## #694 — Update CLI smoke logging options and documentation

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-13T19:08:18Z
- Link: https://github.com/MasterDD-L34D/Game/pull/694

> ## Summary
>
> - add `--label` and `--log-subdir` options to `scripts/cli_smoke.sh` so smoke runs can target predictable filenames and folders
> - capture labeled snapshots alongside the timestamped log output and surface the new paths in the CLI message
> - align README, ADRs, FAQs, roadmap, onboarding, and support templates with the generated log locations and usage guidance
>
> ## Testing
>
> - ./scripts/cli_smoke.sh --help
>
> ---
>
> Codex Task (riferimento interno)
