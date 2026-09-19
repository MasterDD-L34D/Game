---
name: compact
description: Compress the current conversation into a 5-7 bullet handoff optimized for a future Claude reading cold. Preserves code verbatim + open questions. Drops exploration tangents.
user_invocable: true
trigger: "/compact", "comprimere sessione", "riassumi sessione", "handoff per prossima sessione", "cold handoff", "session summary"
---

# /compact — Cold Handoff Skill

Compress the current conversation into a tight summary that a fresh Claude Code session can pick up without re-reading the transcript. Source: @okaashish TikTok "7 Hacks To Cut Claude's Token Usage By 80%" #6.

## Why

Long sessions accumulate exploration deadends, backtracks, failed approaches, and redundant context. A cold-read Claude wastes tokens re-understanding what was already decided. `/compact` produces a **context handoff** that:

- Captures final decisions (not deliberation path)
- Preserves code/diffs/paths verbatim (future session must act on them)
- Lists open questions/blockers (so next session knows what to do)
- Drops superseded ideas (eliminate noise)

## Output format

Write to `COMPACT_CONTEXT.md` at repo root (or `docs/planning/YYYY-MM-DD-compact-<topic>.md` if topical subset), using this exact structure:

````markdown
# COMPACT_CONTEXT — <project>

**Compacted**: YYYY-MM-DD session covering <topic>
**Decisions preserved**: N
**Open questions carried forward**: M

## 1. What we decided (final)

- [decision 1 in 1 sentence, with rationale if non-obvious]
- [decision 2]
- ...

## 2. What we built/changed

- `path/to/file.ext:line` — [1-sentence purpose]
- ...

## 3. Code snippets worth keeping verbatim

```<lang>
<paste any 5-20 line snippet that future session must reference>
```
````

## 4. Open questions / blockers

- ❓ [question 1] — [who can answer / what to check]
- 🚫 [blocker 1] — [reason blocked, unblock path]
- ...

## 5. Next 3 concrete actions

1. [specific action with file:line and/or command]
2. [action 2]
3. [action 3]

## 6. What we're NOT doing (scope cut)

- [explicit non-goal]
- ...

## 7. Reference pointers

- `docs/path/to/related.md` — why relevant
- Commit <sha> — what landed

```

## Rules for what to include

- **Include**: final decisions, code diffs actually applied, open questions, next steps, file paths with line numbers
- **Exclude**: failed attempts (unless failure itself is a decision → mention + why rejected), back-and-forth deliberation, tool call noise, verbose prose
- **Preserve verbatim**: code blocks, commands, file paths, commit SHAs, ADR IDs, PR numbers
- **Compress**: discussions → 1-sentence decisions; multi-step reasoning → outcome + rationale

## Length targets

- Section 1 (decisions): 3-10 bullets
- Section 2 (files): match what was actually touched (can be 0 if only research)
- Section 3 (code): 0-3 snippets, only if future session must see them exactly
- Section 4 (open): 1-5 items
- Section 5 (next): exactly 3 actions, most actionable first
- Section 6 (scope cut): 0-5 items
- Section 7 (refs): 2-8 links

**Total target**: 150-400 lines. If > 500 lines, something is wrong — compact harder.

## Anti-patterns

- **Don't list every tool call** — future session doesn't need to replay exploration
- **Don't paraphrase file contents** — link to `path:line` instead
- **Don't include pleasantries** ("I successfully...", "Great question!") — drop them
- **Don't dump full diffs** — summarize the diff in 1 line, link to commit if needed
- **Don't repeat CLAUDE.md content** — assume future session has access to CLAUDE.md

## When to invoke manually

- End of session: "let me run /compact before closing"
- After big decisions land: lock them in writing
- Before context window pressure: if approaching 70%+ context, compact aggressively
- Before handoff to teammate or future-self

## Variant: topical compact

If compacting only a subtopic (not whole session), write to `docs/planning/YYYY-MM-DD-compact-<slug>.md` instead of root. Frontmatter YAML required (title, workstream, status: draft, created, tags).

## Related skills

- `consolidate-memory` (Anthropic official) — for memory file cleanup, different scope
- `meta-checkpoint` (local) — for reflective pause + session audit, broader
- `sprint-close` (local) — for end-of-sprint DoD, not session compaction

## Anti-overlap

`/compact` is **per-session**. It does NOT:
- Update CLAUDE.md (that's sprint-close)
- Update memory files (that's consolidate-memory)
- Close sprints (that's sprint-close)
- Produce PR descriptions (that's pr-prepare)

Use only for **session handoff compression**.
```
