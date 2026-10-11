# Redirect config inventory (archive-less)

Policy: Binary tar/zip archives discontinued. Use deterministic text assets and hashes below for restore/verification.

## Components
- config/data_path_redirects.json — SHA256 `1a1cac0594b4fccde2639b0d0a1ac0ed57d3435db2737fc2d9d51e6b22df45ff` (redirect mapping source of truth).
- docs/planning/REF_REDIRECT_PLAN_STAGING.md — reference plan for mapping/rollback (no archive required).

## Verification steps
1) Confirm the working copy matches the hash for `config/data_path_redirects.json`.
2) Re-run `python scripts/redirect_smoke_test.py --host http://localhost:8000 --environment staging --output reports/redirects/redirect-smoke-staging.json` and attach the report to tickets #1203/#1206.
3) Record the timestamp, hash confirmation, and smoke report path in logs/agent_activity.md under the latest `[BACKUP-VERIFY-*]` step.

## Restore notes
- To restore, deploy `config/data_path_redirects.json` from repo with the hash above and validate via smoke test. No tar/zip extraction is required.
