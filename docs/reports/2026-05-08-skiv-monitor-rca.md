---
title: 'Skiv Monitor scheduled fail RCA — 2026-05-08'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-08
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - .github/workflows/skiv-monitor.yml
  - docs/skiv/CANONICAL.md
  - docs/skiv/MONITOR.md
tags: [rca, skiv, ci, github-actions, cosmetic-fail]
---

# Skiv Monitor scheduled fail RCA

Phase A Day 2/7 monitoring window 2026-05-08. Cosmetic CI fail noted handoff Day 1 ([docs/planning/2026-05-07-phase-a-handoff-next-session.md §"Phase A guard verified"](../planning/2026-05-07-phase-a-handoff-next-session.md)). RCA forensic + fix proposal master-dd action menu.

## 1. Symptom

Workflow `Skiv Monitor` (`.github/workflows/skiv-monitor.yml`) fail status `failure` su tutti gli ultimi 30 run schedule cron `0 */4 * * *`. Ultimo successo merge auto PR `#1836` 2026-04-25, fail iniziato dopo quel point.

| Metric                  | Value                                |
|-------------------------|--------------------------------------|
| Fail rate last 30 runs  | **30/30 = 100%**                     |
| Last successful PR auto | [#1836](https://github.com/MasterDD-L34D/Game/pull/1836) `2026-04-25T21:38Z` |
| Last fail run           | `2026-05-07T21:02:35Z`               |
| Cron cadence            | every 4h                             |
| Estimated fail count    | ~12 days × 6 runs/day ≈ 72 fail noti |

## 2. Root cause

Run log step "Commit Skiv state + monitor doc":

```
[skiv-monitor] no state change → skip OK
git push → SUCCESS (branch auto/skiv-monitor-update updated)
gh pr create → FAIL
   GraphQL: GitHub Actions is not permitted to create or approve pull requests (createPullRequest)
##[error]Process completed with exit code 1.
```

**Decisione root**: GitHub repo settings `Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"` checkbox **disabled** (toggled off post 2026-04-25, prima abilitato).

Conferma:

- Branch `auto/skiv-monitor-update` HEAD `44190549` updated `2026-05-07T21:03:02Z` ✅ push OK
- Last merged PR `#1836` 2026-04-25 = pre-toggle-off (= setting era attivo)
- Workflow permissions check fail su `pull-requests: write` per GH Actions bot specifically (separato da repo `pull-requests: write` permission grant in YAML)

## 3. Impact assessment

### Funzionale

- ✅ Skiv Monitor poll Python state engine LIVE (`tools/py/skiv_monitor.py`)
- ✅ Branch `auto/skiv-monitor-update` updated ogni 4h
- ❌ PR auto NON aperto → master-dd manual review/merge gap
- ❌ State changes NON propagate a `main` automaticamente

### Cosmetic

- ❌ CI badge / GH Actions UI = continuous red badge sul repo
- ❌ Notification noise master-dd email/dashboard ogni 4h
- ❌ Falsifica cosmetic monitoring Phase A "CI verde" assertion (handoff doc)

### Rischio

- 🟡 **Nullo se master-dd merge manuale entro N giorni** del branch `auto/skiv-monitor-update` (state preserved)
- 🟡 12-giorni-stale state branch = drift potenziale in `data/derived/skiv_monitor/feed.jsonl` rispetto repo activity

## 4. Fix proposals — master-dd action menu

### Option A — Repo setting toggle (1-click, RECOMMENDED)

**Master-dd action**: Settings → Actions → General → Workflow permissions → check **"Allow GitHub Actions to create and approve pull requests"**.

Effort: 30 secondi.
Risk: 🟢 LOW (re-enabling pre-2026-04-25 state, comportamento storicamente verde 6+ mesi).
Outcome: workflow next run successful, PR auto opens, master-dd review-merge resume normale.

### Option B — Workflow graceful fallback (autonomous-fixable, requires forbidden path edit)

**Code change**: rendi `gh pr create` non-fatal (exit 0 anche se perm denied). Branch update preservato, workflow status verde, master-dd può aprire PR manualmente quando vuole.

Diff proposed `.github/workflows/skiv-monitor.yml` step "Commit Skiv state + monitor doc":

```diff
@@ -67,12 +67,18 @@
           if gh pr list --head "$BRANCH" --state open --json number --jq '.[0].number' | grep -q .; then
             echo "[skiv-monitor] PR already open for $BRANCH"
           else
-            gh pr create \
+            if ! gh pr create \
               --base main \
               --head "$BRANCH" \
               --title "chore(skiv-monitor): auto-update stato + feed creatura" \
               --body "🦎 Auto-update da workflow \`skiv-monitor.yml\` (cron 4h). Merge sicuro: solo file in \`data/derived/skiv_monitor/\` + \`docs/skiv/MONITOR.md\`." \
-              --label "automation,skiv"
+              --label "automation,skiv"; then
+              echo "[skiv-monitor] PR create skipped (likely repo setting 'Allow Actions to create PRs' disabled)"
+              echo "[skiv-monitor] Branch $BRANCH updated. Master-dd can open PR manually:"
+              echo "[skiv-monitor]   https://github.com/${GITHUB_REPOSITORY}/compare/main...${BRANCH}?expand=1"
+              exit 0
+            fi
           fi
```

**Forbidden path**: `.github/workflows/` — CLAUDE.md guardrail "Non toccare senza segnalare". Auto-merge L3 BLOCKED. Master-dd manual review required.

Effort: ~10min impl + master-dd review.
Risk: 🟡 LOW-MED (workflow logic intact, only error swallow on PR create step).
Outcome: workflow status verde permanent. Master-dd opens PR manually via web UI quando convenient.

### Option C — Branch notification only (autonomous-fixable, requires forbidden path edit)

Skip `gh pr create` entirely. Push branch + emit GH Actions warning con link compare URL. Master-dd workflow = check warning → manual PR open.

```diff
-          if gh pr list --head "$BRANCH" --state open --json number --jq '.[0].number' | grep -q .; then
-            echo "[skiv-monitor] PR already open for $BRANCH"
-          else
-            gh pr create ...
-          fi
+          echo "::notice title=Skiv Monitor::Branch $BRANCH updated. Open PR: https://github.com/${GITHUB_REPOSITORY}/compare/main...${BRANCH}?expand=1"
```

Forbidden path edit. Master-dd review.

### Option D — PAT secret + workflow auth swap (heavier)

Replace `GITHUB_TOKEN` with master-dd PAT secret (with `pull-requests: write` scope). PAT bypassing the bot restriction.

Effort: master-dd action (create PAT classic w/ `repo` scope or fine-grained PR scope) + secret add `SKIV_MONITOR_PAT` + workflow edit.
Risk: 🔴 MED-HIGH (PAT secret rotation burden, larger blast radius if leaked).

Anti-pattern check: PAT secret per single workflow ≠ canonical path `~/.config/api-keys/keys.env` (locale dev). PAT in GH secret è OK ma adds maintenance.

## 5. Recommendation

**Option A** raccomandato. 30-second master-dd action, zero code change, restore pre-2026-04-25 verde.

Option B fallback se A non possibile (es. organization policy lock il setting).

Option C+D scope creep — skip salvo emergenza.

## 6. Verify post-fix

Post Option A enable:

```bash
# Trigger manual run + watch
gh workflow run "Skiv Monitor" --repo MasterDD-L34D/Game
sleep 60
gh run list --repo MasterDD-L34D/Game --workflow "Skiv Monitor" --limit 1

# Expected: conclusion=success + new PR opened auto/skiv-monitor-update
gh pr list --repo MasterDD-L34D/Game --head auto/skiv-monitor-update --state open
```

## 7. Cross-ref

- Workflow: [`.github/workflows/skiv-monitor.yml`](../../.github/workflows/skiv-monitor.yml)
- Skill canonical Skiv: [`docs/skiv/CANONICAL.md`](../skiv/CANONICAL.md)
- Monitor doc: [`docs/skiv/MONITOR.md`](../skiv/MONITOR.md)
- Branch updated: [auto/skiv-monitor-update HEAD `44190549`](https://github.com/MasterDD-L34D/Game/tree/auto/skiv-monitor-update)
- Last successful auto PR: [#1836](https://github.com/MasterDD-L34D/Game/pull/1836)
- Handoff Phase A Day 1 note: [docs/planning/2026-05-07-phase-a-handoff-next-session.md §"Phase A guard verified"](../planning/2026-05-07-phase-a-handoff-next-session.md)

## 8. Status

**SPEC RCA completo**. Master-dd action verdict (Option A | B | C | D) richiesto pre-Phase-A-monitoring-Day-7-end (2026-05-14).
