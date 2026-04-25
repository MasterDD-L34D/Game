---
title: Skiv prior art — virtual pet/bot GitHub commit gamification (web research)
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 90
tags: [skiv, research, prior-art, web]
---

# Skiv prior art — web research

## Scope

WebSearch query: "github bot creature pet monitor commits virtual assistant ASCII gamification 2025".

Goal: identificare progetti esistenti che combinano:

- Monitor commit/PR/issue GitHub
- Persona/creature ASCII visuale
- Gamification produttività (Tamagotchi-like)

## Findings

| Project                                                                            | Pattern                                     | Skiv similarity                       | Differentiation                                               |
| ---------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| [virtual-pet · GitHub Topics](https://github.com/topics/virtual-pet)               | Aggregator topic, ~150 progetti pet sim     | Generale, no commit-driven            | Skiv è git-event reactive, NON sim                            |
| [sfehlandt/pet-bot](https://github.com/sfehlandt/pet-bot)                          | Telegram bot tasks gamification             | Productivity-driven, no GitHub events | Different platform (Telegram vs in-game UI)                   |
| [lnvaldez/virtual-pet-bot](https://github.com/lnvaldez/virtual-pet-bot)            | Virtual pet bot generic                     | No commit awareness                   | Skiv è canonical creature di game design, non avatar generico |
| [liamrosenfeld/AnimalFarmBot](https://github.com/liamrosenfeld/AnimalFarmBot)      | Discord bot ASCII animals + custom messages | ASCII pattern simile                  | One-shot ASCII, no state persistence cross-event              |
| [desktop-pet · GitHub Topics](https://github.com/topics/desktop-pet?o=asc&s=forks) | Aggregator desktop sim pet                  | Idle/clicker                          | Skiv è event-reactive, NON idle                               |
| [JackRhodes/Virtual-Pet-Game](https://github.com/JackRhodes/Virtual-Pet-Game)      | Pet game classico                           | Tamagotchi pattern                    | Skiv è cross-PC via git repo, no save file                    |
| [nlpia/nlpia-bot](https://github.com/nlpia/nlpia-bot)                              | NLP virtual assistant                       | Helper pattern                        | Skiv è creatura di world (Evo-Tactics), NON assistant utility |

## Key insight

**Skiv è unico** nella combinazione:

1. Creatura **canonical** già esistente in design game (`Arenavenator vagans` in `data/core/species.yaml:71`)
2. Reazione **deterministic** (no LLM in-loop) a git events del repo che la genera
3. Lifecycle 5 fasi gating tied to game progression mechanics (level + mutations + thoughts + polarity)
4. **Cross-PC via git** (memory PC-local NON sync, hub canonical sì)
5. **Triple surface**: in-game overlay + Swarm dashboard + autogen MD card
6. Voice palette **multilingua italiana** + persona body-first INTP coerente

Nessun progetto rilevato combina tutti questi elementi. Skiv è category-creator.

## Anti-pattern (cosa NON adottare da prior art)

- ❌ **LLM-driven voice generation** (es. nlpia-bot): Skiv vincolo deterministic preserva replay-safe + zero costi inference
- ❌ **Idle/clicker mechanics** (Tamagotchi classico): Skiv è event-driven, non timer-driven
- ❌ **Single-platform UI** (Telegram/Discord only): Skiv triple-surface è scelta architetturale
- ❌ **Reset/death loop** classico Tamagotchi: Skiv è additive-only, fasi cumulative
- ❌ **Generic avatar customization** (most bot projects): Skiv canonical persona NON personalizzabile (vedi `docs/skiv/CANONICAL.md` rule)

## Pattern adottati / convergenti

- ✅ **ASCII art frame** (AnimalFarmBot pattern) — canonical Skiv ASCII tamagotchi card
- ✅ **Persistent state JSON** (most virtual pet) — `data/derived/skiv_monitor/state.json`
- ✅ **Event-driven update** (productivity bots) — git events trigger state delta
- ✅ **Cross-machine sync** (uncommon!) — Skiv via git repo è innovativo

## Effort residuo (post research)

Niente. Research conferma scelte architetturali. Nessun pattern blocking discovered che non sia già implementato.

## Cross-references

- Persona canonical: [docs/skiv/CANONICAL.md](../skiv/CANONICAL.md)
- 3 prior research agent (museum-aware): [docs/museum/excavations/2026-04-25-skiv-monitor-extension.md](../museum/excavations/2026-04-25-skiv-monitor-extension.md), [docs/research/2026-04-25-skiv-narrative-arc-research.md](2026-04-25-skiv-narrative-arc-research.md), [docs/research/2026-04-25-skiv-lifecycle-visual-research.md](2026-04-25-skiv-lifecycle-visual-research.md)
- Plan: [docs/planning/2026-04-25-skiv-monitor-plan.md](../planning/2026-04-25-skiv-monitor-plan.md)

🦎 _Sabbia segue. Ricerca conferma — Skiv è categoria nuova._
