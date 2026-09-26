---
title: Ideas Index
doc_status: active
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-19
source_of_truth: true
language: it-en
review_cycle_days: 30
---

# Ideas Index

> Registro canonico idee parked durante sessioni intensive. Aggiornato sessione 2026-04-19 (Sprint M4 Wave 4-7 shipped + run4 playtest bug report + Wave 8 visual research).
>
> **Regola**: ogni idea = trigger re-open esplicito + classificazione 4D (valore/applicabilità/stato/re-open cost).
>
> Cross-ref: `~/.claude/projects/.../memory/project_parked_ideas_2026_04_18.md` (quick-reference Claude Code).

## Sezione 1 — Round simultaneo follow-up (8 parked)

Post ADR-2026-04-15 + PR #1537–#1552. Round model ON by default (M17 complete), ma questi restano aperti per playtest reale.

| #   | Idea                                                       | Trigger re-open                                    | Classificazione                 |
| --- | ---------------------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| 1   | Round undo/redo (rollback pre-commit)                      | Playtest reale rivela error-correction frustration | 🟢 gamedev · experimental · M   |
| 2   | **Fase C reazioni first-class** (reactions before resolve) | ADR follow-up #1 aperto, core gameplay             | 🟢 evo-only · draft · L         |
| 3   | **Fog of intent server-side** (hidden SIS intents)         | Networking Fase 2 prerequisite                     | 🟢 evo-only · draft · L         |
| 4   | Round timer UI (visual countdown per player)               | Playtest reveals pacing issues multi-player        | 🟡 gamedev · draft · S          |
| 5   | Per-player action queue (2+ actions batch)                 | AP economy extension request                       | 🟡 evo-only · experimental · M  |
| 6   | **Action preview panel** (damage forecast UI)              | UX reale giocatore richiede feedback               | 🟢 gamedev · draft · M          |
| 7   | Round replay export (CSV/JSON trace)                       | Debugging multi-round sessions                     | 🟡 universal · experimental · S |
| 8   | **5v5+ scenari stress test**                               | Multi-player scalability validation                | 🟢 evo-only · draft · M         |

## Sezione 2 — Flint v0.3 roadmap (6 parked, gate 30gg dal 2026-04-18)

Post kill-60 (PR #1556+#1558), Flint = Python CLI Typer+Rich con classifier + stdlib fallback. v0.2 stable. v0.3 = diagnostica credibile.

| #   | Idea                                              | Trigger re-open                                                        | Classificazione            |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| 9   | Classifier confidence score (0-1 per commit)      | v0.3 gate 2026-05-18                                                   | 🟢 solo-dev · draft · M    |
| 10  | Commit pattern library expandable (YAML external) | Custom pattern request                                                 | 🟡 solo-dev · draft · S    |
| 11  | **Eval set classifier** (200 commit labeled)      | Prerequisite v0.3 credibility                                          | 🟢 solo-dev · draft · M    |
| 12  | Flint web dashboard (optional, off by default)    | User request explicit + mandate                                        | 🔴 solo-dev · draft · L    |
| 13  | Multi-repo flint aggregator                       | 2+ adopter Flint user                                                  | 🔴 single-user · draft · L |
| 14  | ~~Achievement progress Flint~~ 🔴                 | **KILL-60 enforcement**: gamification backfire (Liberty/NTNU research) | 🔴 killed · draft · N/A    |

## Sezione 3 — Flint v1.0 adopter-gated (6 parked)

Richiedono 1+ adopter esterno prima di investire. No speculative development.

| #   | Idea                                                  | Trigger re-open                           | Classificazione           |
| --- | ----------------------------------------------------- | ----------------------------------------- | ------------------------- |
| 15  | Flint template-as-a-service (multi-project bootstrap) | 1+ adopter esterno con feedback           | 🟡 universal · draft · L  |
| 16  | Plugin architecture (custom classifiers)              | Adopter con specific domain need          | 🟡 universal · draft · L  |
| 17  | Flint GitHub Action (CI integration)                  | Adopter con CI pipeline                   | 🟡 universal · draft · M  |
| 18  | Flint metrics dashboard (team-level)                  | 2+ adopter team                           | 🔴 universal · draft · XL |
| 19  | Flint LLM-assisted classification                     | Adopter feedback classifier accuracy <80% | 🔴 universal · draft · L  |
| 20  | Flint i18n (3+ lingue oltre IT/EN)                    | Adopter non-English                       | 🔴 universal · draft · M  |

## Sezione 4 — Lean chat divergence (4 parked)

Idee emerse nella chat Lean (altro Claude) ma non applicate al codice reale. ⚠️ 1 viola kill-60 policy.

| #   | Idea                                                        | Trigger re-open                                       | Classificazione          |
| --- | ----------------------------------------------------------- | ----------------------------------------------------- | ------------------------ |
| 21  | 4 Anime archetipi (Arbitro/Bestiario/Archivista/Sentinella) | User explicit request + sample validation             | 🟡 gamedev · draft · L   |
| 22  | 3 lingue persona (IT/EN/ES grammatica rotta)                | User request + i18n adopter                           | 🔴 universal · draft · M |
| 23  | Persona switching (1 class + 4 persona.md)                  | 1+ adopter vuole persona diverse                      | 🟡 universal · draft · M |
| 24  | ~~Hook post-commit auto-speak~~ 🔴                          | **KILL-60 enforcement**: friction (Stackdevflow 2026) | 🔴 killed · draft · N/A  |

## Sezione 5 — Infrastruttura single-user (4 parked)

Host-specific, doc-only. Non portabili senza adopter context.

| #   | Idea                                                       | Trigger re-open                           | Classificazione                 |
| --- | ---------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| 25  | Idea Engine backend populate (apps/backend/ storage vuoto) | 2+ idee entrano da source non-doc         | 🟡 single-user · draft · M      |
| 26  | `/meta-checkpoint` extension (pattern librarian)           | 3+ sessione con research-critique pattern | 🟡 single-user · production · S |
| 27  | Cross-session memory sync (Linear/Notion)                  | User richiede tool integration            | 🔴 single-user · draft · L      |
| 28  | Claude Code CLAUDE.md auto-update (post-session)           | Safe heuristic validated                  | 🔴 single-user · draft · M      |

## Sezione 6 — Completate sessione 2026-04-18 (7 items, non parked)

Codificati in memory + commit. Riferimento cross-session.

| #   | Item                                                             | PR / File                                           |    Stato     |
| --- | ---------------------------------------------------------------- | --------------------------------------------------- | :----------: |
| C1  | `/meta-checkpoint` slash command (pattern research-critique)     | PR #1553                                            |  ✅ merged   |
| C2  | Research-critique workflow (2 parallel agents + sources + vote)  | `feedback_claude_workflow_consolidated.md` §9       |  ✅ memoria  |
| C3  | Classification framework 4D riusabile                            | `flint/archive-template/MANIFEST-template.md`       | ✅ template  |
| C4  | Archive preservation pattern                                     | `docs/archive/flint-kill-60-2026-04-18/MANIFEST.md` | ✅ applicato |
| C5  | Flint rename evo-caveman → flint (separazione upstream)          | PR #1556 + #1558                                    |  ✅ merged   |
| C6  | Flint self-contained portable (install.py + claude-integration/) | `flint/INSTALL.md`                                  |    ✅ doc    |
| C7  | PROJECT.md canonical definition (10 sezioni + Appendix A/B/C)    | `flint/PROJECT.md`                                  | ✅ canonical |

## Sezione 6b — Completate sessione 2026-04-18/19 Sprint M4 Wave (5 items)

Sprint A P0 Wave stack su branch `feat/play-sprint-a-p0-hud-v2`.

| #   | Item                                                       | Commit / PR           |   Stato   |
| --- | ---------------------------------------------------------- | --------------------- | :-------: |
| W2  | Wave 2 HUD cosmetic (help+fullscreen+FX+colors+tooltip)    | PR #1607 / `bac64f5e` | ✅ merged |
| W3  | Wave 3 range overlay + FX wire + simultaneous default      | PR #1608 / `01917041` | ✅ merged |
| W4  | Wave 4 round feedback layer (5 items ADR-2026-04-15)       | `14c3cba3`            | ✅ merged |
| W5  | Wave 5 preflight polish (speed label + events tail + eval) | `6dd6274b`            | ✅ merged |
| W6  | Wave 6 planning control + per-PG HUD (4 bug run3)          | `c28e6581`            | ✅ merged |
| W7  | Wave 7 planning preview + per-PG abilities + def reset     | `fb927f60`            | ✅ merged |

**Wave 8 in-flight** — branch `feat/play-sprint-a-p0-wave8-visual-base-typo-icons`. Scope originale: typography Inter + SVG status icons. **Scope rivisitato** post run4 playtest 2026-04-19: Opzione A fix-first → W8-emergency (3 P0 bug) → W8b visual → W9 UX → W10 polish.

## Top-5 priority re-open (se Evo-Tactics torna attivo)

1. **#2 Fase C reazioni first-class** — core gameplay, ADR follow-up #1 aperto
2. **#3 Fog of intent server-side** — networking Fase 2 prerequisite
3. **#6 Action preview panel** — UX reale giocatore
4. **#8 5v5+ scenari** — stress test multi-player
5. **#11 Eval set classifier** — Flint v0.3 diagnostica credibile

## Anti-pattern kill-60 enforcement

Idee 🔴 killed che ri-aprire senza motivo validato violerebbe policy:

- **#14** Achievement progress Flint (gamification backfire)
- **#24** Hook post-commit auto-speak (friction)

Se utente chiede queste → prima rileggere `reference_flint_optimization_guide.md` + chiedere sample validation.

## Come aggiungere nuova idea

1. Appendi riga in sezione appropriata con trigger re-open esplicito
2. Classifica 4D (valore 🟢🟡🔴 · applicabilità · stato · re-open cost XS/S/M/L/XL)
3. Aggiorna `last_verified` frontmatter
4. Se idea completata → sposta in Sezione 6
