# Daily PR Summary — 2025-11-20

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#699](https://github.com/MasterDD-L34D/Game/pull/699) | Reorganize monorepo into backend and dashboard apps | @MasterDD-L34D | 2025-11-20T23:56:34Z |

## #699 — Reorganize monorepo into backend and dashboard apps

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-20T23:56:34Z
- Link: https://github.com/MasterDD-L34D/Game/pull/699

> ## Summary
> - move the Express backend into apps/backend with its own workspace manifest and shared contract dependency paths
> - relocate the dashboard to apps/dashboard, sharing UI styling through a new packages/ui package and updated imports
> - refresh orchestration scripts and CI filters to point to the new app layout and data locations
> ## Testing
> - npm install
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_691fa6c7190c832880557f897ec9568c)
