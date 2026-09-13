# Log archive note (binary zip files)

This repository does not keep the `_logs.zip` artifacts checked in, because binary attachments are blocked in PRs. The HTML logs for each run remain under `logs/ci_runs/` and `logs/incoming_smoke/`.

To rehydrate the zip bundles locally, rerun the harvester with a PAT (`CI_LOG_PAT` → `GH_TOKEN`) that has `actions:read` and `contents:write`:

```bash
GH_REPO=MasterDD-L34D/Game GH_TOKEN="$CI_LOG_PAT" scripts/ci_log_harvest.sh --config ops/ci-log-config.txt --force-zip
```

Removed zip filenames (from the latest sweep):
- ci_run20015313386_logs.zip
- daily-pr-summary_run20007758678_logs.zip
- daily-tracker-refresh_run20028621299_logs.zip
- data-quality_run20012320492_logs.zip
- deploy-test-interface_run20015313167_logs.zip
- e2e_run20017801531_logs.zip
- evo-batch_run19975432683_logs.zip
- evo-doc-backfill_run20017076602_logs.zip
- evo-rollout-status_run20018924687_logs.zip
- hud_run19975105999_logs.zip
- idea-intake-index_run19085416135_logs.zip
- lighthouse_run20016530033_logs.zip
- qa-export_run19975106001_logs.zip
- qa-kpi-monitor_run19989066630_logs.zip
- qa-reports_run20012320512_logs.zip
- schema-validate_run20012319591_logs.zip
- search-index_run19975106291_logs.zip
- telemetry-export_run19802070210_logs.zip
- traits-sync_run20018713323_logs.zip
- validate-naming_run20012320503_logs.zip
- validate_traits_run20012325923_logs.zip
- incoming-smoke_run20012779896_logs.zip
