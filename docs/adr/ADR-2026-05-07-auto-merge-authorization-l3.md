---
title: 'ADR-2026-05-07 Auto-merge authorization L3 — blanket Claude PR auto-merge with safety gates'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-07
source_of_truth: true
language: it
review_cycle_days: 90
related:
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/adr/ADR-2026-05-07-abort-web-quickwins-reincarnate-godot.md
tags: [adr, policy, auto-merge, claude-code, governance, contribution-gates]
---

# ADR-2026-05-07 — Auto-merge authorization L3 (blanket) for Claude-shipped PRs

## Status

ACCEPTED 2026-05-07.

## Context

Pre-2026-05-07 policy (CLAUDE.md "Contribution gates"): _"Master DD approval must be documented (link a comment/issue) before merging."_ → ogni PR Claude-shipped richiedeva master-dd merge button manual. Sessione 2026-05-07 dimostra:

- Claude-shipped PR queue >3 in flight contemporanei (es. #2101 Game/ + #208 + #209 Godot v2)
- Codex review iterations multiple round (P2 + P3) richiedono push fix → wait → push fix
- Master-dd context-switch overhead per merge button × N PR = bottleneck pipeline
- Claude-shipped PR scope quasi sempre file-disjoint, low blast radius (doc-only o single-system surface wire), CI verde + Codex round risolto pre-merge ready

Cumulative friction: Phase A monitoring window 2026-05-07 → 2026-05-14 richiede CI hygiene check daily + rapid bug regression fix capability. Master-dd manual gate per ogni PR = bottleneck non sostenibile.

User explicit authorization 2026-05-07: _"hai la mia autorizzazione formale a modificare le policy e fare i merge futuri."_

## Decision

**Adopt L3 blanket auto-merge authorization** per Claude-shipped PR su `MasterDD-L34D/Game` + `MasterDD-L34D/Game-Godot-v2`, vincolata a 6 safety gates obbligatori.

### Safety gate checklist (TUTTI mandatory pre-merge)

1. **CI 100% verde**: `gh pr checks <num>` mostra ZERO `fail` o `pending`. Skipping job (paths-filter exclude) accettato.
2. **Codex review resolved**: zero outstanding `requested_changes` o critical comment unaddressed. Codex `COMMENTED` state OK se ultimo commit reviewed o nessuna nuova osservazione post-fix.
3. **Format + governance verde**: `npx prettier --check` + `python tools/check_docs_governance.py --strict` (Game/) o `gdformat --check` + `gdlint` (Godot v2) — tutti zero error.
4. **Test baseline preserved**: `node --test tests/ai/*.test.js` ≥382/382 verde Game/, GUT >1877 Godot v2 (post-#204 baseline).
5. **No forbidden paths touched**: ZERO file in `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`, `services/rules/` (deprecated comunque).
6. **No 50-line violation fuori `apps/backend/`**: per CLAUDE.md "Regola 50 righe" Sprint context.
7. **No nuove dipendenze npm/pip**: per CLAUDE.md "Nuove dipendenze approvazione esplicita richiesta".

### Auto-merge invocation

Pattern canonical:

```bash
# Pre-merge final check
gh pr view <num> --json reviewDecision,mergeStateStatus,mergeable

# If decision OK + mergeable CLEAN + all gates verified
gh pr merge <num> --squash --auto --delete-branch
```

Squash strategy default. `--auto` waits for CI + branch protection rules. `--delete-branch` cleanup post-merge.

### Failure modes + escalation

- **Gate failure**: ANY gate red → STOP auto-merge, escalate to user with explicit gate violation report.
- **Post-merge regression**: discovered post auto-merge → IMMEDIATE revert via `git revert <merge-sha>` + new PR documenting RCA. NO history rewrite (`--force` su main).
- **Stop-line authorize comment**: ANY new authoritative comment (Codex requested_changes, master-dd review block, security warning) post-fix → freeze auto-merge + escalate user.

## Consequences

### Pros

- **Pipeline speed**: ~2-3x faster Claude-shipped cluster merge (eliminate master-dd manual gate × N).
- **Phase A monitoring efficiency**: rapid CI hygiene fix shipping during 7gg window.
- **Codex iteration loop tightening**: push fix → CI verde → auto-merge same turn (no overnight wait master-dd attention).
- **Scope creep prevention**: 7 safety gates kill premature merge of risky changes.

### Cons

- **Trust delegation**: Claude makes merge decision autonomously su PR Claude-shipped. Master-dd preserve veto via post-merge revert OR explicit "stop auto-merge" comment.
- **Audit trail load**: every auto-merge logged via PR thread + commit message + memory save ritual. Master-dd reviews log async vs realtime gate.
- **Edge case risk**: novel error modes (e.g., flaky CI mascherato verde) potrebbero pass safety gates. Mitigation: post-merge revert always available, low cost.

### Scope explicit

**IN scope**:

- PR Claude-shipped (autore = MasterDD-L34D via Claude o subagent)
- File-disjoint cross-PR queue
- Doc-only OR test-only OR single-system surface wire OR CI hygiene fix

**OUT of scope** (require master-dd manual approval):

- PR multi-author OR external contributor
- File touch in forbidden path list (gate 5)
- Schema breaking change packages/contracts senza ADR
- Migration o `prisma/migrations/` change
- New npm/pip dep (gate 7)
- ANY PR su `main` directly (must always go through PR + CI)

## Rollback

Trigger user explicit revert:

- "stop auto-merge" comment on any PR thread
- "revert auto-merge policy" message
- New ADR formal supersede

Master-dd always retains:

- Per-PR force-revert via `git revert`
- Branch protection rule update (limit `auto_merge` to specific labels)
- This ADR supersede via new ADR formal

## References

- ADR cutover Phase A: [`ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md`](ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md)
- ADR plan v3.2 ABORT web quickwins: [`ADR-2026-05-07-abort-web-quickwins-reincarnate-godot.md`](ADR-2026-05-07-abort-web-quickwins-reincarnate-godot.md)
- CLAUDE.md "Contribution gates" section (updated this commit)
- User authorization: session 2026-05-07 chat log explicit
