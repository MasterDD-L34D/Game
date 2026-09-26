---
title: 'Handoff maintenance + hygiene (Ryzen 2026-06-09 sessione B)'
date: 2026-06-09
type: session-handoff
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-09'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, handoff, prettier, biome-wounded, health-sweep, eol, godot, gut]
---

# Handoff maintenance + hygiene -- Ryzen 2026-06-09 (sessione B)

Segue il closure delle 10 PR reconstruction (`2026-06-09-reconstruction-residuals-closure-handoff.md`,
#2678 / v51). Questa sessione = SPEC-P PA3 surface web + igiene repo (Prettier debt) + health
sweep 3 repo + chiusura 2 residui sweep. 5 PR mergiate su 3 repo.

## TL;DR

- **biomeChip "bioma ferito" telegraph** LIVE su web (SPEC-P PA3, consuma `biome_wounded` di #2677).
- **Game Prettier-clean al 100%** (debito 115->0, workflow forbidden incluso con consenso).
- **Health sweep 3 repo**: nessun fallimento CI-gating (Game/DB WARN-only, Godot GREEN).
- **2 residui sweep chiusi** (eol DB + autofree-race Godot), entrambi harsh-reviewed APPROVE.
- Next unblock owner-gated: item-1 doc-flip SPEC-N/L `review_needed`->`active`.

## PR mergiati (5)

| PR    | Repo          | Scope                                                      | Squash      | Test                       |
| ----- | ------------- | ---------------------------------------------------------- | ----------- | -------------------------- |
| #2681 | Game          | biomeChip wounded telegraph (SPEC-P PA3, surface di #2677) | `73c7699ff` | +7 (tests/play 36/36)      |
| #2682 | Game          | debito Prettier azzerato -- 112 file (forbidden escluso)   | `ddf3efeda` | tests/ai 500/500, build OK |
| #2684 | Game          | workflow `sot-drift-sentinel.yml` (forbidden, consenso DD) | `01267f13d` | format:check 0 dirty       |
| #178  | Game-Database | `.gitattributes eol=lf` schema-reference (CRLF cross-OS)   | `fbe3b7b1b` | `schema:doc:check` exit 0  |
| #457  | Game-Godot-v2 | autofree-race fix (test, no product change)                | `1d8f13b37` | GUT 5/5 clean (no ERROR)   |

## Cosa NON era da fare (catch / no-op)

- **CRLF Game-Database**: NON era un fix-di-file (l'index era gia' LF; il `--check` falliva solo nel
  working-tree Windows per `core.autocrlf=true`). Fix corretto = `.gitattributes eol=lf`, non `--renormalize`.
- **Guard Godot**: fix nel TEST, non nel product. L'unico caller (`composer_transition_runner.gd:37`)
  passa callback vuoto, non await-a, nodo persistente -> nessun race reale. Product hardening
  (`emit.call_deferred`) = over-fix con rischio regressione (confermato da harsh-review).
- **Prettier**: `prettier --list-different .` aggancia anche file UNTRACKED -> il `git add` della lista
  rischiava di committare un `.md` untracked SENZA frontmatter (avrebbe rotto governance CI). Rimosso
  pre-push. Lezione: stage esplicito + escludi forbidden-path a monte (mai `prettier --write .` cieco).

## Health sweep (report: `reports/2026-06-09-routine-health-sweep.md`)

| Repo          | Verdetto  | Unico rosso (non-bloccante)                            |
| ------------- | --------- | ------------------------------------------------------ |
| Game          | WARN-ONLY | (risolto da #2682/#2684 -> ora 0)                      |
| Game-Database | WARN-ONLY | schema-doc CRLF locale (risolto #178); tsc 94 non-gate |
| Game-Godot-v2 | GREEN     | (autofree ERROR risolto #457)                          |

## Blockers residui (non bloccanti)

- [ ] **item-1 doc-flip** SPEC-N/L `review_needed` -> **`active`** (NON `accepted`, invalid_doc_status).
      Owner-gated: tuo giudizio "done = fondazione i18n?" (PR-5 split + EN forward-work). Readiness map #2672.
- [ ] **Lenovo item3 Godot surfaces**: Form Pulse UX keystone, Memory-mode chronicle viewer (#452), char-creation.
- [ ] **Lenovo #2674**: Form Pulse backend link (`run.id==campaign.id` gap, sblocca 3 engine dormienti).
- [ ] (cosmetico) Game-Godot-v2 main locale Ryzen dietro origin (working-tree `.import`/`.uid` reimport churn).

## Next entry point

1. **First action**: decisione master-dd su item-1 flip (SPEC-N + SPEC-L). Se OK -> registry-sync atomico
   (frontmatter .md + `docs_registry.json`, `tools/docs_governance_migrator.py`) + `check_docs_governance --strict`.
2. **Reference**: `docs/planning/2026-06-09-item1-spec-readiness-map.md` (#2672) + closure #2678.
3. **Estimated effort**: item-1 flip ~30min (per spec azionabile); Godot/Form-Pulse = Lenovo, multi-h.

## Memory candidates

- [x] `feedback_recap_sempre_italiano` (gia' salvato questa sessione).
- [ ] `project_session_2026_06_09b`: 5 PR + 3 catch metodologici (eol vs renormalize, prettier untracked
      trap, GUT autofree-during-emit fix-in-test). Proposto -- conferma per save.
