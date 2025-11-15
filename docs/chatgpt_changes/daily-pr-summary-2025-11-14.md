# Daily PR Summary — 2025-11-14

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR | Titolo | Autore | Merged (UTC) |
| --- | --- | --- | --- |
| [#695](https://github.com/MasterDD-L34D/Game/pull/695) | chore: sync evo tactics pack assets | @MasterDD-L34D | 2025-11-14T02:08:26Z |
| [#696](https://github.com/MasterDD-L34D/Game/pull/696) | Enable offline MongoDB migrations for development | @MasterDD-L34D | 2025-11-14T18:35:26Z |

## #695 — chore: sync evo tactics pack assets

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-14T02:08:26Z
- Link: https://github.com/MasterDD-L34D/Game/pull/695

> ## Summary
> - regenerate Evo Tactics pack catalog and species JSON by running the sync script
> - update generated_at and last_synced_at metadata across docs, pack, and public exports
> ## Testing
> - npm run sync:evo-pack
> ------
> [Codex Task](https://chatgpt.com/codex/tasks/task_e_69165005d69c8328bb3efb34621a89a4)

## #696 — Enable offline MongoDB migrations for development

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-14T18:35:26Z
- Link: https://github.com/MasterDD-L34D/Game/pull/696

> ## Summary
> - add mock-friendly client handling to the migration runner, including persistence when using mongomock URLs
> - provide a reusable mongomock-backed MongoDB config and make the first migration tolerant of mock backends
> - update tooling dependencies, ignore local state directories, and fix the ops helper script root detection
> ## Testing
> - python scripts/db/run_migrations.py status --config config/mongodb.mock.json
> - python scripts/db/run_migrations.py up --config config/mongodb.mock.json
> - python scripts/db/run_migrations.py status --config config/mongodb.mock.json
> - bash ops/mongodb/apply.sh config/mongodb.mock.json --skip-seed
> ------
