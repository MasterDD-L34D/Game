# Freeze 03A/03B inventory (archive-less)

Policy: Freeze assets are tracked via deterministic text manifests and hashes; tar/zip archives are deprecated and must not be downloaded or validated.

## Components
- docs/planning/REF_CORE_DERIVED_MATRIX.md — SHA256 `364e642861bc4a5b61a345aafb853275bfe2bb74263b2046fa5db7a7f8158946` (core/derived scope, owners, and dataset notes for 03A/03B).
- reports/redirects/redirect-smoke-staging.json — redirect baseline for rollback (smoke PASS expected).
- logs/agent_activity.md — operational log for freeze/rollback readiness (latest entry must cite archive-less policy).

## Verification steps
1) Confirm the hash for `docs/planning/REF_CORE_DERIVED_MATRIX.md` matches the value above.
2) Re-run `python scripts/redirect_smoke_test.py --host http://localhost:8000 --environment staging --output reports/redirects/redirect-smoke-staging.json` and record outcome in logs/agent_activity.md.
3) For data sanity, review `reports/incoming/` fixtures referenced in REF_CORE_DERIVED_MATRIX.md (no binary restores). Document findings in logs/agent_activity.md.

## Restore notes
- Restore relies on refreshing the referenced text assets and re-running validators/smoke; no archive extraction is permitted.
- Ticket updates (#1203/#1206) should cite this inventory and the most recent log entry instead of archive download links.
