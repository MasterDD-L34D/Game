---
title: Skiv webhook receiver — octokit npm dep proposal
doc_status: draft
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [skiv, webhook, octokit, npm-dep, proposal]
---

# Skiv webhook receiver — octokit npm dep proposal

> **Status**: PROPOSAL pending Master DD approval (CLAUDE.md vincolo "Nuove dipendenze npm/pip: approvazione esplicita richiesta").

## Why

`apps/backend/routes/skiv.js` `buildFeedEntryFromWebhook()` ha 100 LOC di switch + property access manuale per parse pull_request/issues/workflow_run payloads. HMAC verify inline ~10 LOC. Funziona MA:

- ❌ No type safety (manual `payload.pull_request.merged_at` access)
- ❌ Limited event coverage (PR/issues/workflow_run only — manca push, release, deployment, check_run, etc)
- ❌ Fragile su payload schema changes (GitHub aggiorna spesso senza preavviso)

## Proposal

Add 2 npm deps:

```json
"@octokit/webhooks": "^13.4.0",
"@octokit/webhooks-types": "^7.6.1"
```

**Bundle size**: ~50KB combined (gzipped), 2 transitive deps total.
**License**: MIT (compatibile project).
**Maintenance**: Octokit official Anthropic-blessed (used by GitHub Actions internally).

## Refactor preview

```javascript
// BEFORE — manual switch (100 LOC)
function buildFeedEntryFromWebhook(eventType, payload) {
  if (eventType === 'pull_request') {
    const action = payload.action;
    const pr = payload.pull_request || {};
    if (action === 'closed' && pr.merged) {
      const labels = (pr.labels || []).map((l) => l.name);
      // ... 30 more LOC ...
    }
  }
  // ... ditto for issues, workflow_run ...
}
```

```javascript
// AFTER — typed handlers (40 LOC)
import { Webhooks } from '@octokit/webhooks';
import type { PullRequestClosedEvent, IssuesOpenedEvent } from '@octokit/webhooks-types';

const webhooks = new Webhooks({ secret: process.env.SKIV_WEBHOOK_SECRET });

webhooks.on('pull_request.closed', ({ payload }: { payload: PullRequestClosedEvent }) => {
  if (!payload.pull_request.merged) return;
  appendFeed(mapPrToSkivEntry(payload.pull_request)); // typed!
});

webhooks.on('issues.opened', ({ payload }: { payload: IssuesOpenedEvent }) => {
  appendFeed(mapIssueToSkivEntry(payload.issue));
});

webhooks.on(['workflow_run.completed'], ({ payload }) => {
  if (!['success', 'failure'].includes(payload.workflow_run.conclusion)) return;
  appendFeed(mapWfToSkivEntry(payload.workflow_run));
});

// HMAC verify automatic via createNodeMiddleware:
app.use('/api/skiv/webhook', createNodeMiddleware(webhooks));
```

**Net delta**: -60 LOC + type safety + 50KB bundle + auto-verify HMAC.

## Tests

- 11 existing skiv route tests preserve (hand-rolled HMAC verify still works as fallback)
- Add 5 new tests using octokit `webhooks.verifyAndReceive()` API
- Backward compat: keep manual `buildFeedEntryFromWebhook` exported for legacy users

## Decision matrix

| Criterion          |     Inline (current)      |   Octokit (proposed)   |
| ------------------ | :-----------------------: | :--------------------: |
| LOC                |           ~100            |          ~40           |
| Type safety        |            ❌             |           ✅           |
| Event coverage     |          3 types          | All GitHub event types |
| HMAC verify        |       manual 10 LOC       |          auto          |
| Bundle cost        |             0             |          50KB          |
| Maintenance        | manual GitHub schema sync |  Octokit auto-updated  |
| Replay determinism |         preserved         |       preserved        |

## Recommendation

**Approve npm dep**. ROI 3/5 (correctness + future-proofing). Cost minimal (50KB) vs benefit (60 LOC -, type safety, broader coverage).

## Alternative

Reject + accept current inline. Skiv webhook works today without dep. Trade-off: maintenance cost compounding when GitHub updates payload schemas.

## Action

Pending Master DD verdict on this PR. If approved:

1. `npm install --save @octokit/webhooks @octokit/webhooks-types --workspace apps/backend`
2. Refactor `apps/backend/routes/skiv.js` per above pseudo-code
3. Update tests/api/skivRoute.test.js
4. Update `docs/research/2026-04-25-skiv-online-imports.md` "Deferred" → "Adopted"
5. Update `LIBRARY.md` move row from Deferred to inline-shipped (now npm dep)
