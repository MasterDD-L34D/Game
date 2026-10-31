---
name: sot-plan
description: Analyze Source of Truth vs external repos, produce gap matrix + sequenced integration plan
user_invocable: true
trigger: "piano SoT", "source of truth plan", "sot plan", "sot gap", "cosa manca al SoT", "analizza source of truth", "integration plan", "piano integrazione"
---

# Source of Truth Integration Planner

Analyze the Evo-Tactics Source of Truth against external repo patterns and produce a prioritized integration plan.

## What this skill does

1. **Gap matrix**: cross-references each SoT section (§1-§19) against external repo patterns, memory files, and open questions to find actionable gaps
2. **Dependency graph**: maps section dependencies to determine safe execution order
3. **3-wave plan**: immediate tasks → dependent tasks → blocked/long-term items

## Execution

Launch the `sot-planner` agent to perform the heavy analysis:

```
Use the Agent tool with subagent_type="sot-planner" to run the full analysis.

Prompt for the agent:
"Run the full SoT integration analysis. Read the Source of Truth sections,
external references, tactical patterns, memory files, and open questions.
Produce the gap matrix, dependency graph, and 3-wave integration plan.
Report in under 400 lines."
```

After the agent returns, present results to the user with:

- Gap matrix table (compact)
- Top 3 recommendations highlighted
- Ask user which wave/items to start working on

## Token budget

This skill uses a subagent to protect the main context. The agent reads ~15 files but uses targeted grep + offset/limit to stay under 30K tokens input. Output target: ~200 lines.
