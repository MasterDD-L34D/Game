---
title: 2026-04-29 ERMES + Sprint Fase 1 cleanup handoff — resume next session canonical
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-29
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - docs/planning/2026-04-29-ermes-integration-plan.md
  - docs/planning/2026-04-29-ermes-codex-execution-brief.md
  - docs/playtest/2026-04-29-bg3-lite-spike-rubric.md
  - docs/playtest/2026-04-29-playbook-90min.md
  - docs/reports/2026-04-29-utility-ai-oscillation-bug.md
  - docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md
  - docs/adr/ADR-2026-04-28-deep-research-actions.md
  - docs/adr/ADR-2026-04-28-grid-type-square-final.md
  - COMPACT_CONTEXT.md
  - BACKLOG.md
---

# Handoff cross-session 2026-04-29 — ERMES + Sprint Fase 1 cleanup + rubric pending

## Resume trigger phrase canonical

> _"leggi docs/planning/2026-04-29-ermes-cleanup-handoff.md, verifica stato main + master-dd ha eseguito rubric session Spike POC verdict X/Y/N → procedi A1 OR Sprint G.2b OR ERMES E7"_

## 1. Stato main (post ondata 4 PR 2026-04-29)

**HEAD attuale**: `6a9bcc43` (origin/main).

**PR shipped post Sprint Fase 1 closure** (sessione 2026-04-29 follow-up):

| PR    | Squash commit | Topic                                                           |
| ----- | ------------- | --------------------------------------------------------------- |
| #2008 | `83f26050`    | fix(ai): preserve ai_profile in normaliseUnit (PR #1495 bot P1) |
| #2009 | `2259634e`    | feat(ermes): drop-in self-install — prototype lab E0-E6         |
| #2010 | `8b5d4ab9`    | chore(governance): registry add ERMES planning docs             |
| #2011 | `8acc7389`    | docs(guide): asset-creation-workflow 3-path canonical           |
| #2013 | `0fdd2853`    | fix(ai): utilityBrain oscillation root cause — re-enable        |
| #2014 | `6a9bcc43`    | docs(guide): Workspace locale (out-of-repo) section             |

**Plus ondata 3+ shipped 2026-04-28/29** (Sprint Fase 1 100% autonomous):

| PR    | Squash commit | Topic                                                                |
| ----- | ------------- | -------------------------------------------------------------------- |
| #1996 | `16fdebb7`    | Deep research SRPG/strategy synthesis + 5 ADR + 9 deferred Q         |
| #1997 | `5884e50f`    | Action 4 Sprint M.7 doc re-frame DioField                            |
| #1998 | `bf9b39ff`    | Action 7 CT bar visual lookahead 3 turni FFT-style                   |
| #1999 | `252593b3`    | Action 5 BB hardening — severity 3-tier + slow_down trigger          |
| #2000 | `246e1369`    | Action 2 tactical AI archetype templates                             |
| #2001 | `28eeb71a`    | Action 1 SRPG engine reference codebase extraction                   |
| #2002 | `d6f04300`    | Sprint G v3 Legacy Collection asset swap (Ansimuz CC0)               |
| #2003 | `c6587ce5`    | Spike POC BG3-lite Tier 1 (gate decision binary)                     |
| #2004 | `dcba8295`    | Action 6 ambition Skiv-Pulverator alleanza                           |
| #2005 | `88a4fded`    | Action 3 Sprint N gate row + N.7 spec                                |
| #2006 | `9ba3a265`    | Memory ritual update v19                                             |
| #2007 | `be07ebae`    | Rubric launcher desktop suite (4 .lnk + .bat + PowerShell installer) |

**Total**: 17 PR mergiati main 2026-04-28/29.

## 2. Test baseline post-fix

- AI utility 23/23 verde (post fix oscillation bug)
- AI baseline 384/384 verde (era 382, +2 nuovi test post utility fix)
- Format + governance + paths-filter + python-tests + dataset-checks verdi

## 3. Pillar status finale post-wave-3+4

| Pilastro                   | Stato                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| P1 Tattica leggibile (FFT) | 🟢++ (visual upgrade Legacy + CT bar lookahead 3 turni + BG3-lite Tier 1 toggle live)       |
| P2 Evoluzione emergente    | 🟢++ (mating engine + Spore S1-S6 + ambition Skiv-Pulverator alleanza wired)                |
| P3 Identità Specie × Job   | 🟢ⁿ (35 ability r1-r4 + Beast Bond + 4 jobs orfani Battle Sprite assigned)                  |
| P4 Temperamenti MBTI/Ennea | 🟡++ (T_F full + thought cabinet UI + thoughts ritual G3 + tactical AI archetype templates) |
| P5 Co-op vs Sistema        | 🟢 candidato (long-arc goal closes "combat isolated" risk + M11 lobby/ws + ambition HUD)    |
| P6 Fairness                | 🟢 candidato (BB attrition severity stack + slow_down trigger + status engine wave A)       |

**5/6 🟢++/🟢 candidato** + 1/6 🟡++ (P4). Demo-ready.

## 4. Bottleneck residuo — Master-dd action pending

### A1 — Rubric session Spike POC BG3-lite (PRIMARY blocker)

**Stato**: 🚫 **NOT executed**. File `docs/playtest/2026-04-29-bg3-lite-spike-rubric.md` shipped placeholder PR #2003. Tabella scores TBD/? per 4 tester.

**Action richiesta master-dd**:

1. Reclutamento 4 amici tester **DIVERSI da TKT-M11B-06 pool**
2. Stack avvio via desktop icons (workflow zero-terminal, vedi §6 sotto)
3. Side-by-side test toggle A (classic) ↔ toggle B (BG3-lite Tier 1) per ogni tester
4. Score 4 criteri 1-5 per modalità (movement smooth + range readability + 2024 RPG feel + Skiv echolocation lore-faithful)
5. Aggregate scores in rubric placeholder + verdict
6. Threshold pass: media B ≥3.5 + zero score 1 + zero criterio rigetto unanime

**Effort**: ~1-2h userland.

**Output decision binary**:

- ✅ PASS → Sprint G.2b BG3-lite Plus full ~10-12g (Tier 2 backend cherry-pick: sub-tile float + vcScoring area_covered + flanking 5-zone angle)
- ❌ FAIL → abort BG3-lite Plus, ship Sprint I TKT-M11B-06 playtest current state

### Sprint G.2b BG3-lite Plus (post A1 PASS)

**Bloccante**: A1 verdict pass.

**Effort**: ~10-12g (~2-2.5 settimane).

**Spec canonical**: `docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md` Tier 2.

### ERMES E7 Future runtime candidate (long-deferred)

**Stato attuale**: E0-E6 shipped PR #2009 (prototype lab isolated).

**Roadmap completion** (`docs/planning/2026-04-29-ermes-integration-plan.md` §Roadmap):

| Stato | Fase | Task                         | Output                                               |
| ----- | ---- | ---------------------------- | ---------------------------------------------------- |
| ☑    | E0   | Doc integration              | `docs/planning/2026-04-29-ermes-integration-plan.md` |
| ☑    | E1   | Prototype isolated           | `prototypes/ermes_lab/`                              |
| ☑    | E2   | CLI + deterministic sim      | `ermes_sim.py`                                       |
| ☑    | E3   | Dashboard optional           | `ermes_dashboard.py`                                 |
| ☑    | E4   | JSON export                  | `latest_eco_pressure_report.json`                    |
| ☑    | E5   | Experiment loop              | `scoring.py`                                         |
| ☑    | E6   | Codex validation             | tests + README                                       |
| ☐     | E7   | **Future runtime candidate** | crossEventEngine design only                         |
| ☐     | E8   | **Future foodweb candidate** | ecosystemLoader design only                          |

**E7 trigger**: post playtest gate + ADR dedicata + test regression. **NON urgente** — defer post Sprint I TKT-M11B-06.

## 5. Recent fixes / errors audit

### Bug 1 — AI ai_profile dropped (PR #1495 bot P1)

**Fix**: PR #2008 (`83f26050`) — `normaliseUnit` preserva `ai_profile` field. Pre-fix: bot P1 review flag su PR #1495. Post-fix: ai_profile correttamente passato a Utility AI engine.

### Bug 2 — Utility AI oscillation (kill-switch)

**Repro**: tutorial_05 BOSS FIGHT, Apex `aggressive` profile oscilla R1=5, R2=4, R3=5, R4=4 — never closes.

**Root cause** (3 problemi compounding, vedi `docs/reports/2026-04-29-utility-ai-oscillation-bug.md`):

1. **Faction key mismatch** (PRIMARY) — `enumerateLegalActions` filtra via `team !== team`, session units usano `controlled_by` → zero enemies enumerati → only retreat available
2. **Multiplicative scoring annihilation** (SECONDARY) — `score *= weighted + 0.01` annichila score
3. **Action-agnostic considerations** (TERTIARY) — TargetHealth/SelfHealth no differentiation per action type

**Fix**: PR #2013 (`0fdd2853`) — fix all 3 + re-enable `aggressive.use_utility_brain: true`. Tests 384/384 verde + utility 23/23 verde.

### Bug 3 — fix dependent

PR #2008 (ai_profile preserve) **expose** Bug 2 bug latente (unreachable senza ai_profile pass). Risolti insieme PR #2008 + #2013.

## 6. Desktop icons + routine canonical (zero terminal)

**Shipped PR #2007** (`be07ebae`). 4 icone desktop pronte cliccabili.

### Icone su `C:\Users\VGit\Desktop\`

| Icona                               | Function                                                             | Click order |
| ----------------------------------- | -------------------------------------------------------------------- | :---------: |
| 🔄 **Evo-Tactics-Sync-Main**        | Pre-rubric: git pull main + npm install se package.json drift        |     Pre     |
| 🚀 **Evo-Tactics-Demo**             | Backend + ngrok pubblico + auto-open browser + clipboard URL         |     1°      |
| ⚙️ **Evo-Tactics-Toggle-A-Classic** | Set ui*config.json all bg3lite*\*: false (modalità A grid square)    |     2°      |
| ⚙️ **Evo-Tactics-Toggle-B-BG3lite** | Set ui*config.json all bg3lite*\*: true (modalità B BG3-lite Tier 1) |     3°      |

### Routine rubric session 90min

```
PRE — Master-dd setup (5 min):
  1. Doppio clic "Evo-Tactics-Sync-Main"
     → git pull origin main + npm install se drift
     → aspetta "PRONTO per rubric session"

  2. Doppio clic "Evo-Tactics-Demo"
     → banner mostra ngrok URL pubblico
     → URL auto-copiato clipboard
     → browser locale auto-apre

  3. Incolla ngrok URL in DM/Discord/WhatsApp ai 4 amici tester DIVERSI

LIVE — A/B test (60-90 min):
  4. Doppio clic "Evo-Tactics-Toggle-A-Classic"
     → config aggiornata modalità A grid classic
     → Di' agli amici: "fate Ctrl+Shift+R (hard-reload) nel browser"
     → Amici giocano encounter "tutorial_01" ~5-10 min
     → Annota score 4 criteri 1-5 per ognuno tester

  5. Doppio clic "Evo-Tactics-Toggle-B-BG3lite"
     → config aggiornata modalità B BG3-lite Tier 1
     → Di' agli amici: "fate Ctrl+Shift+R (hard-reload)"
     → Amici giocano STESSO encounter ~5-10 min
     → Annota score 4 criteri 1-5 per ognuno tester

POST — Aggregate (15 min):
  6. Apri docs/playtest/2026-04-29-bg3-lite-spike-rubric.md
  7. Compila tabella scores §6 (T1-T4 × 4 criteri × modalità A+B)
  8. Calcola media aggregata + verifica threshold pass §4

STOP:
  9. Chiudi finestra nera "Evo-Tactics-Demo" launcher
     → backend + ngrok stopped clean

VERDICT — Comunica Claude:
  10. Apri nuova sessione Claude Code + paste trigger phrase canonical:
      "leggi docs/planning/2026-04-29-ermes-cleanup-handoff.md,
       verifica stato main + master-dd ha eseguito rubric session
       Spike POC verdict X/Y/N → procedi A1 OR Sprint G.2b OR ERMES E7"
```

### Cross-PC support

Su nuovo PC post `git clone`:

- Doppio clic `Evo-Tactics-Install-Desktop-Shortcuts.bat` (in repo root)
- 4 icone create automatic su Desktop di quel PC
- Path repo root rilevato dinamicamente

## 7. Sprint Fase 1 effort delta cumulativo

**Plan v2 → v3**: ~+109-127h aggiunti (~+19-23% base 14 sett, justified data-driven post tester feedback informal 2026-04-28).

**Sprint Fase 1 ondata 3+ closure**: 17 PR mergiati main in ~36h. 100% autonomous shipped + 1 launcher suite zero-terminal.

## 8. Next session decision tree

```
Master-dd ha eseguito rubric session?
├── NO → A1 PRIMARY (1-2h userland: reclutamento + setup + score)
│        Resume: doppio clic Evo-Tactics-Sync-Main → Evo-Tactics-Demo → Toggle A/B → score
│
├── PASS → Sprint G.2b BG3-lite Plus chip spawn (~10-12g)
│           Tier 2 backend: sub-tile float + vcScoring area_covered + flanking 5-zone
│           Spec: docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md §Tier 2
│           Branch: feat/sprint-g-2b-bg3-lite-plus-2026-XX-XX
│
└── FAIL → Abort Sprint G.2b + ship Sprint I TKT-M11B-06 playtest current state
            Sprint I = playtest live 4 amici (post Spike abort, scope corrente sufficient)
            Spec: docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md
            Branch: feat/sprint-i-tkt-m11b-06-prep
```

**ERMES E7 path**: defer fino post-Sprint I (qualunque sia il path). E7 = future runtime candidate (crossEventEngine design only). Non bloccante.

## 9. Anti-pattern guards

- **NO** rubric session SE 4 amici NON disponibili — defer 7 giorni max, OR ridurre a 2-3 tester (zero score 1 threshold mantenuto)
- **NO** Sprint G.2b spawn senza verdict A1 PASS esplicito (gate decision binary)
- **NO** ERMES E7 implementation senza ADR + playtest + test regression (per ERMES integration plan §Runtime gate)
- **NO** force-push branch (per CLAUDE.md policy)

## 10. Pending items deferred (citation only)

| #   | Item                                          | Trigger                                         |
| --- | --------------------------------------------- | ----------------------------------------------- |
| 1   | TKT-FUTURE-REPLAY-INFRASTRUCTURE M12+         | Post Sprint G.2b ship + post-playtest analysis  |
| 2   | OD-014 TO rewind P6 ammortizer                | Post-playtest se wounded_perma feels punitive   |
| 3   | OD-015 Brigandine seasonal P2 macro-loop      | M12+ campaign-wide feature                      |
| 4   | OD-016 Midnight Suns thoughts ritual citation | Closed citation-only (next thoughts-ritual ADR) |
| 5   | Action 1 expand 7-9 archetype Beehave         | Post-playtest se "robot prevedibile" feedback   |

## 11. References quick

- Master plan v2: `docs/planning/2026-04-28-master-execution-plan.md`
- Sprint G v3 spec: `docs/planning/2026-04-28-master-execution-plan.md §Sprint G v3` (shipped #2002)
- Spike rubric placeholder: `docs/playtest/2026-04-29-bg3-lite-spike-rubric.md` (TBD scores)
- BG3-lite Plus ADR: `docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md`
- ERMES integration plan: `docs/planning/2026-04-29-ermes-integration-plan.md`
- Playbook 90min: `docs/playtest/2026-04-29-playbook-90min.md`
- Utility AI bug report: `docs/reports/2026-04-29-utility-ai-oscillation-bug.md`
- COMPACT_CONTEXT.md v20 (after this commit)
- BACKLOG.md (Sprint Fase 1 closed, A1 BLOCKED)

---

**Status doc**: ACTIVE. Next session entrypoint canonical.
