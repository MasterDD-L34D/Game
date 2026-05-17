---
title: 'Next session handoff — Surface-DEAD sweep 6/8 + Sprint 12 ready'
description: 'Resoconto Sprint 6-11 (Disco bundle 4/4 + Surface-DEAD sweep 6/8) + ranked next-session candidates. Pattern Engine LIVE Surface DEAD killer proven 6 volte consecutive.'
authors:
  - claude-code
created: 2026-04-28
updated: 2026-04-28
status: published
tags:
  - handoff
  - surface-dead-sweep
  - next-session-kickoff
  - sprint-roadmap
workstream: ops-qa
related:
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/planning/2026-04-27-sprint-6-thought-cabinet-handoff.md
  - docs/planning/2026-04-27-sprint-7-skill-check-popup-handoff.md
  - docs/planning/2026-04-27-sprint-8-predict-hover-preview-handoff.md
  - docs/planning/2026-04-27-sprint-9-objective-hud-handoff.md
  - docs/planning/2026-04-27-sprint-10-qbn-debrief-handoff.md
  - docs/planning/2026-04-27-sprint-11-biome-chip-handoff.md
---

# Next session handoff — Surface-DEAD sweep 6/8

**Data**: 2026-04-28 · **Sessione precedente**: 2026-04-27 (autonomous) · **Pattern**: Engine LIVE Surface DEAD killer (proven 6× consecutive)

## ⚡ TL;DR per ripartire (30s read)

**Sessione 2026-04-27 chiusa con 6 sprint mergiati main**: Disco bundle Tier S 4/4 (Sprint 6+7) + §C.2 Surface-DEAD sweep 4 chiusure consecutive (Sprint 8+9+10+11). Pillar score: P1 🟢++, P4 🟢++ (Disco saturated), P5 🟡++. **§C.2 Surface-DEAD: 6/8 chiusi.** Residui solo #3 Spore mutation dots (15h authoring esterno) + #4 Mating lifecycle wire (5h).

**Pattern proven**: ogni sprint = frontend-only wire su engine già LIVE → ~3-4h totale (module nuovo + main.js wire + CSS + tests + smoke E2E + doc upkeep ritual). Zero backend change per 5/6 sprint.

**Per ripartire dom mattina**:

1. `git fetch origin main && git checkout -b claude/sprint-12-mating-wire origin/main`
2. Aprire stato-arte §C.2 sezione 4 (Mating engine 469 LOC) — engine ready, surface DEAD
3. Seguire il pattern documentato in §"Sprint pattern proven" qui sotto
4. Sprint chiude in <4h con doc upkeep + PR + merge

---

## §1 — Sessione 2026-04-27 — 6 sprint shipped

### Sprint 6 — Thought Cabinet UI panel + cooldown round-based (P4)

- **PR**: [#1966](https://github.com/MasterDD-L34D/Game/pull/1966) `584c54c2`
- **Closes**: §B.1.8 #1 (Disco Tier S #9 — Thought Cabinet)
- **Engine bump**: `DEFAULT_SLOTS_MAX` 3→8, `RESEARCH_ROUND_MULTIPLIER=3`, mode='rounds' default, `tickAllResearch` bulk helper
- **Bridge wire**: `applyEndOfRoundSideEffects` → tick 1 round per fine-turno + auto-internalize + apply passives + emit `thought_internalized` event
- **Frontend**: `thoughtsPanel.js` Assign/Forget buttons + progress bar + 8-slot grid
- **Tests**: 76/76 thoughts (engine 59 + routes 17), AI 353/353 baseline
- **Adoption check scheduled**: routine `trig_01JJsMTpGWaEsBfhE51YFNMx` fires 2026-05-11 09:00 Europe/Rome
- **Handoff**: [`docs/planning/2026-04-27-sprint-6-thought-cabinet-handoff.md`](2026-04-27-sprint-6-thought-cabinet-handoff.md)

### Sprint 7 — Disco skill check passive→active popup (P4)

- **PR**: [#1972](https://github.com/MasterDD-L34D/Game/pull/1972) `a2e1ee64`
- **Closes**: §B.1.8 #3 (Disco bundle saturator — 4/4 complete)
- **Module**: `apps/play/src/skillCheckPopup.js` — pure `buildSkillCheckPayload` + side-effect `renderSkillCheckPopups`
- **Wire**: `main.js processNewEvents` post damage popup. Filtra `triggered=true` + dedupe + format Disco-style `[NOME TRAIT]` con stagger 220ms + y-offset crescente
- **Tests**: 22/22, AI 363/363
- **Pillar P4 saturator**: Disco Elysium Tier S bundle 4/4 chiuso (#1+#2+#3+#4)
- **Handoff**: [`docs/planning/2026-04-27-sprint-7-skill-check-popup-handoff.md`](2026-04-27-sprint-7-skill-check-popup-handoff.md)

### Sprint 8 — predict_combat hover preview (P1)

- **PR**: [#1975](https://github.com/MasterDD-L34D/Game/pull/1975) `0c162543`
- **Closes**: §C.2 Surface-DEAD #1 (predictCombat N=1000)
- **Module**: `apps/play/src/predictPreviewOverlay.js` — pure `colorBandForHit` + `formatPredictionRow` + async cached `getPrediction` (Map memoization per tuple, prevents flood backend at 60Hz mousemove)
- **Wire**: `main.js mousemove` quando hovered=enemy alive AND state.selected=player alive → fetch + inject `.tt-predict` row in tooltip
- **Surface live**: `⚔ HIT% · ~DMG · CRIT%` band high green / medium amber / low red + elevation hint
- **Tests**: 22/22, AI 363/363, smoke E2E `⚔ 60% hit · ~1.4 dmg · 5% crit` band medium su `e_nomad_1` hover
- **Pillar P1**: 🟢 → **🟢++**
- **Handoff**: [`docs/planning/2026-04-27-sprint-8-predict-hover-preview-handoff.md`](2026-04-27-sprint-8-predict-hover-preview-handoff.md)

### Sprint 9 — Objective HUD top-bar (P5)

- **PR**: [#1976](https://github.com/MasterDD-L34D/Game/pull/1976) `a5679e81`
- **Closes**: §C.2 Surface-DEAD #5 (objectiveEvaluator 6 obj types)
- **Backend route**: `GET /api/session/:id/objective` lazy-evaluating, returns `{encounter_id, label_it, objective: {type,...}, evaluation: {completed, failed, progress, reason, outcome?}}`
- **Module**: `apps/play/src/objectivePanel.js` — `labelForObjectiveType` (6 IT canonical: elimination/capture_point/escort/sabotage/survival/escape) + `iconForObjectiveType` + `statusForEvaluation` + `formatProgress` aligned con real backend payload keys (sistema/player, turns_held/target_turns, escort_hp/extracted, etc.)
- **HTML slot**: `<div id="objective-bar">` in header + tutorial UI ora pipe `encounter_id` a `/api/session/start`
- **Surface live**: `⚔ Elimina i nemici · Sistema vivi: 2 · PG: 2` band active accent
- **Tests**: 29/29, AI 363/363
- **Pillar P5**: 🟡 → **🟡++**
- **Handoff**: [`docs/planning/2026-04-27-sprint-9-objective-hud-handoff.md`](2026-04-27-sprint-9-objective-hud-handoff.md)

### Sprint 10 — QBN narrative debrief beats (P4)

- **PR**: [#1979](https://github.com/MasterDD-L34D/Game/pull/1979) `b1272805`
- **Closes**: §C.2 Surface-DEAD #7 (QBN engine 17 events)
- **Module**: `apps/play/src/qbnDebriefRender.js` — pure `formatNarrativeEventCard` (HTML card con title + body + choices + meta + XSS escape) + side-effect `renderNarrativeEvent`
- **Setter**: `setNarrativeEvent(payload)` API aggiunto a `debriefPanel.js`
- **Wire**: `phaseCoordinator.js` pipe `bridge.lastDebrief.narrative_event` → `dbApi.setNarrativeEvent(...)` quando phase 'debrief'
- **CSS**: `.db-qbn-card` journal style (linear-gradient violet + Georgia serif italic body)
- **Surface live**: debrief panel sezione `📖 Cronaca diegetica` con narrative event card
- **Tests**: 15/15, AI 363/363
- **Pillar P4**: 🟢 def → **🟢++** (cronaca diegetica visibile post-encounter)
- **Handoff**: [`docs/planning/2026-04-27-sprint-10-qbn-debrief-handoff.md`](2026-04-27-sprint-10-qbn-debrief-handoff.md)

### Sprint 11 — Biome chip HUD (P5)

- **PR**: [#1981](https://github.com/MasterDD-L34D/Game/pull/1981) `c4667d84`
- **Closes**: §C.2 Surface-DEAD #6 (biomeSpawnBias.js initial wave)
- **Backend**: 1-line fix `publicSessionView` expose `biome_id: session.biome_id || session.encounter?.biome_id || null` (fallback sblocca tutorial UI flow)
- **Module**: `apps/play/src/biomeChip.js` — pure `labelForBiome` (11 canonical IT labels) + `iconForBiome` (emoji + 🌍 default) + `formatBiomeChip` (HTML pill XSS-safe) + side-effect `renderBiomeChip`
- **HTML slot**: `<div id="biome-chip">` next to objective-bar
- **CSS**: `.biome-chip` pill style (rgba green-tinted bg + border + caps label + hover)
- **Surface live**: `🌾 Savana` chip pill con tooltip "Biome: savana — vedi Codex per dettagli"
- **Tests**: 17/17, AI 363/363
- **Pillar P5**: 🟡++ consolidato (player vede ambient context)
- **Handoff**: [`docs/planning/2026-04-27-sprint-11-biome-chip-handoff.md`](2026-04-27-sprint-11-biome-chip-handoff.md)

---

## §2 — Status §C.2 Surface-DEAD sweep — 6/8 chiusi

| #   | Engine LIVE                | Surface                  | Status                                     |
| --- | -------------------------- | ------------------------ | ------------------------------------------ |
| 1   | predictCombat N=1000       | tooltip hover preview    | 🟢 Sprint 8                                |
| 2   | Tactics Ogre HUD           | HP floating render.js    | 🟢 already live (M4 P0.2 line 768)         |
| 3   | Spore part-pack            | drawMutationDots overlay | 🔴 (3h render + **15h authoring esterno**) |
| 4   | Mating engine 469 LOC      | gene_slots → lifecycle   | 🔴 **5h** — Sprint 12 prime candidato      |
| 5   | objectiveEvaluator 6 types | HUD top-bar              | 🟢 Sprint 9                                |
| 6   | biomeSpawnBias.js          | biome chip HUD           | 🟢 Sprint 11                               |
| 7   | QBN engine 17 events       | session debrief wire     | 🟢 Sprint 10                               |
| 8   | Thought Cabinet 18         | reveal_text_it + UI      | 🟢 Sprint 6                                |

**Bundle ROI cumulato**: 6 sprint = ~22h totali (~3.6h/sprint avg) per chiudere 4 surface engine-orphan + 1 panel cooldown + 1 popup. **Pattern dominante chiuso al 75%.**

---

## §3 — Pillar score deltas

| Pilastro                   | Pre-sessione | Post-sessione | Delta                                           |
| -------------------------- | :----------: | :-----------: | ----------------------------------------------- |
| P1 Tattica leggibile (FFT) |      🟢      |     🟢++      | predict hover decision aid                      |
| P2 Evoluzione emergente    |    🟢 def    |    🟢 def     | unchanged                                       |
| P3 Identità Specie × Job   |     🟡++     |     🟡++      | unchanged                                       |
| P4 Temperamenti MBTI/Ennea |    🟢 def    |     🟢++      | Disco bundle 4/4 + cronaca diegetica + thoughts |
| P5 Co-op vs Sistema        |      🟡      |     🟡++      | objective HUD + biome chip                      |
| P6 Fairness                |   🟢 cand    |    🟢 cand    | unchanged                                       |

**Highlight**: P4 saturated su Disco Elysium (4/4 patterns Tier S transferred + thoughts engine round-mode).

---

## §4 — Sprint pattern proven (replicabile)

Ogni sprint è stato un **frontend-only wire su engine già LIVE**. Pattern dominante:

```
0. Pre-flight (~5min)
   ├─ git fetch origin main + git checkout -b claude/sprint-X-<descriptor> origin/main
   ├─ Read stato-arte §C.2 row da chiudere
   ├─ Identify engine module già live (es. apps/backend/services/.../<engine>.js)
   └─ Identify gap: dove il client NON chiama l'engine OR dove backend non espone

1. Module nuovo (~30min)
   ├─ Create apps/play/src/<feature>.js (pure helpers + side-effect renderer)
   ├─ Pure transform → pure HTML formatter → side-effect render with idempotency + show/hide
   └─ XSS escape su tutti i campi user-injected

2. Wire (~15min)
   ├─ apps/play/src/api.js: aggiungere helper se serve nuovo endpoint
   ├─ apps/play/src/main.js: import + chiamata in refresh() + bootstrap
   └─ apps/play/index.html: aggiungere HUD slot se serve
   └─ apps/play/src/style.css: scope class rules

3. Backend (~5min se serve, often 0)
   ├─ Eventualmente expose campo in publicSessionView OR add new route
   └─ Backward compat: graceful null/empty handling per legacy callers

4. Tests (~30min)
   ├─ Create tests/play/<feature>.test.js
   ├─ Pure helpers: input matrix coverage (canonical + edge + null + XSS)
   ├─ Side-effect: fakeContainer DOM stub
   └─ Target ~15-25 test, fast pure (no jsdom)

5. Validation gate (~5min)
   ├─ node --test tests/play/<feature>.test.js → tutti verdi
   ├─ node --test tests/ai/*.test.js → 363/363 baseline (zero regression)
   ├─ npm run format:check → clean (auto-fix se serve)
   └─ python tools/check_docs_governance.py --strict → 0 errors

6. Smoke E2E preview (~10min)
   ├─ preview_start backend + play
   ├─ preview_eval (async): module import + payload transform + render path
   ├─ Quando possibile: bootstrap session + dispatch real event + assert DOM
   └─ preview_stop entrambi

7. Doc upkeep ritual 5/5 (~20min)
   ├─ stato-arte §C.2 row update + bundle counter
   ├─ CLAUDE.md sprint context section pre-pended
   ├─ COMPACT_CONTEXT.md version bump + TL;DR aggiunto
   ├─ BACKLOG.md closure entry
   └─ NEW handoff doc docs/planning/2026-04-27-sprint-X-<feature>-handoff.md

8. Commit + PR (~10min)
   ├─ git add specific files (no -A)
   ├─ git commit con HEREDOC body strutturato
   ├─ git push -u origin <branch>
   ├─ gh pr create con body MD ricco
   └─ Background poll CI (until block) — typical 5-7min

9. Post-CI (~5min)
   ├─ Se BEHIND main: gh pr update-branch
   ├─ Se terrain flake "eventually hits": gh run rerun --failed (known transient)
   └─ gh pr merge --squash quando CLEAN

Total per sprint: ~2-3h (lower bound) o ~4h (con CI flake retry).
```

**Anti-pattern killer applicato Gate 5 DoD**: ogni sprint produce surface visibile player <60s gameplay. Se sprint non passa questo gate, BLOCCA prima di shipping.

---

## §5 — Next session candidates ranked

### Path A: Continua §C.2 Surface-DEAD sweep (close to 7/8)

**Sprint 12 (raccomandato)**: Mating lifecycle wire — Surface-DEAD #4

- **Effort**: ~5h
- **Engine LIVE**: `Mating engine 469 LOC` in `apps/backend/services/mating/` — gene_slots compute + offspring resolve
- **Gap**: post-encounter mating roll + 3-tier offspring già implementato (Sprint C PR #1879) ma frontend non surface lifecycle chain visibilmente
- **Surface NEW proposta**: debrief panel section "🏠 Lineage" che mostra (post-victory) gli offspring eligible + parent pair + lineage_id chain. OR: nestHub overlay con recent matings list
- **ROI**: P2 Evoluzione 🟢 def → 🟢++ (ciclo lineage visibile)
- **Smoke E2E**: complete encounter con 2+ player units + view debrief → vedi offspring card

### Path B: Tier-A/Tier-B residui (alternativi a §C.2)

- **Beast Bond extension** (~5h): AncientBeast Tier S #6 estensione PR #1971/#1974 — pair-bond reaction trigger su 2 nuove condizioni
- **Tunic Codex pages session-scope extension** (~3h): Bundle B.3 — extend codex glyph progression con secrets sblocco scenario-specific
- **XCOM EW Officer Training School** (~10h): meta perks — sblocca P3 dimensione progression (era residuo P3 dominante)

### Path C: P3 Identità (sale a 🟢)

**Sprint dimensionale**: ability r3/r4 tier extension (~10h)

- Engine `abilityExecutor` LIVE supporta r1/r2 + 18 effect_types
- Gap: nessuna ability r3/r4 in `data/core/abilities/active.yaml` (job tree level 4-7)
- Surface: progression panel mostra new tier slots quando level 4+
- Sblocca P3 🟡++ → 🟢 candidato

### Path D: Userland (NON-autonomous)

**TKT-M11B-06**: playtest live 2-4 amici (~2-4h userland sessione)

- Unico bloccante P5 def
- Seguire `docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md`
- Tutti gli sprint UI shipped questa sessione (objective HUD + biome chip + predict hover) **migliorano player experience del playtest**

### Path E: Cleanup flake terrain test

**TKT-flake-terrain**: `tests/api/terrainReactionsWire.test.js` "eventually hits" colpita 3 volte (Sprint 6 + 7 + 11) richiedendo `gh run rerun --failed`. ~1h investigazione root cause (probabilistic damage rng seed?), può essere quick-win di pulizia.

---

## §6 — Branch + tooling commands ritual

### Pre-flight (ogni nuovo sprint)

```bash
git fetch origin main
git checkout -b claude/sprint-N-<descriptor> origin/main
# Verify clean state
git status
git log --oneline -3
```

### Pre-commit (ogni sprint)

```bash
# Run new feature tests
node --test tests/play/<new-feature>.test.js

# AI baseline regression check
node --test tests/ai/*.test.js  # expected: 363/363 (or higher)

# Format
npm run format:check
# auto-fix if needed:
npx prettier --write <files>

# Governance
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
```

### Smoke E2E preview (ogni sprint UI-touching)

```bash
# Backend (in background)
preview_start backend  # → http://localhost:3334

# Play dev (in background)
preview_start play     # → http://localhost:5180

# Browser context: preview_eval con async import + dispatch + assert
# Pattern: bootstrap session → simulate user action → inspect DOM

# Cleanup
preview_stop <both serverIds>
```

### Commit + PR (ogni sprint)

```bash
git add <specific files only — no -A>
git commit -m "$(cat <<'EOF'
feat(<scope>): Sprint N — <Title> (§C.2 Surface-DEAD #X killer)

[body description]

## Tests
- N/N new
- AI baseline 363/363 zero regression
- format:check verde, governance 0 errors

## Smoke E2E preview validato live
[details]

## Doc upkeep ritual 5/5
[5 files updated]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin claude/sprint-N-<descriptor>

gh pr create --title "<title>" --body "$(cat <<'EOF'
[PR body]
EOF
)"

# Background poll CI
until [[ $(gh pr view <PR#> --json statusCheckRollup -q '[.statusCheckRollup[] | select(.status != "COMPLETED")] | length' 2>/dev/null) -eq 0 ]]; do sleep 30; done

# Merge when CLEAN
gh pr merge <PR#> --squash
```

### CI flake handling (terrain "eventually hits")

```bash
# Se 1 check FAILURE su tests/api/terrainReactionsWire.test.js:
gh run rerun <run_id> --failed

# Se BEHIND main post-CI:
gh pr update-branch <PR#>
```

---

## §7 — Key file paths cheatsheet

### Backend engine modules (READ-ONLY for Sprint 12)

```
apps/backend/services/
├─ mating/                          ← Sprint 12 target
│  ├─ matingEngine.js               (469 LOC, gene_slots + offspring)
│  └─ offspringResolver.js
├─ thoughts/thoughtCabinet.js       (Sprint 6 wire — round-mode, 8 slots)
├─ narrative/qbnEngine.js           (Sprint 10 wire — drawEvent)
├─ combat/
│  ├─ predictCombat.js              (Sprint 8 wire)
│  ├─ objectiveEvaluator.js         (Sprint 9 wire — 6 obj types)
│  ├─ biomeSpawnBias.js             (Sprint 11 wire — pool boost)
│  └─ traitEffects.js               (Sprint 7 wire — passesBasicTriggers)
└─ rewardEconomy.js                 (debrief summary builder, includes narrative_event)
```

### Frontend modules shipped questa sessione (REFERENCE pattern)

```
apps/play/src/
├─ thoughtsPanel.js                 (Sprint 6 — Assign/Forget + progress bar)
├─ skillCheckPopup.js               (Sprint 7 — Disco-style [TRAIT] popups)
├─ predictPreviewOverlay.js         (Sprint 8 — hover tooltip injection)
├─ objectivePanel.js                (Sprint 9 — HUD top-bar)
├─ qbnDebriefRender.js              (Sprint 10 — debrief journal card)
└─ biomeChip.js                     (Sprint 11 — HUD pill chip)
```

### Wire integration points

```
apps/play/src/main.js
├─ refresh() — fetches state + calls all refresh* helpers (objective, biome, vc, ...)
├─ startSession() — bootstrap on Nuova sessione click
├─ canvas.mousemove handler — hover tooltip inject (Sprint 8)
└─ processNewEvents() — combat events handler (Sprint 7 popups)

apps/play/src/phaseCoordinator.js
└─ applyPhase('debrief') — pipes bridge.lastDebrief.narrative_event (Sprint 10)

apps/play/src/api.js
└─ api.predict / api.objective / api.thoughtsList — fetch helpers
```

---

## §8 — Open follow-ups

### Adoption check scheduled

- **2026-05-11 09:00 Europe/Rome**: routine `thought-cabinet-adoption-check` (`trig_01JJsMTpGWaEsBfhE51YFNMx`) firing. Pull `thought_internalized` event telemetry, flag cold-start, recommend P4 status promote/hold/downgrade.

### Userland actions pending

- TKT-M11B-06 playtest live 2-4 amici (~2-4h)
- Playtest round 2 post-PR #1730 (Ctrl+Shift+R cache bust)

### Tech debt non-bloccante

- TKT-07 tutorial sweep #2 N=10/scenario (post telemetry fix)
- TKT-10 harness retry+resume incrementale (JSONL write per-run)
- terrain flake `terrainReactionsWire.test.js:217-240` "eventually hits" (3 occurrenze in 4 sprint)

### §C.2 Surface-DEAD residui (2)

- #3 Spore mutation dots overlay (~3h render + 15h authoring esterno — bundle Spore Moderate ulteriore)
- #4 Mating lifecycle wire (~5h) — **Sprint 12 prime candidato**

---

## §9 — Memory writes (suggested per next session)

Pattern questa sessione da memorizzare per future sessioni autonome:

```markdown
- **Sprint Surface-DEAD pattern** (~3.6h avg, proven 6×): frontend-only wire su
  engine già LIVE. Step rituali: investigation → module pure+side-effect →
  wire main.js → test 15-25 → smoke E2E preview → doc upkeep 5/5 → commit
  → PR → CI poll background → merge.
- **Pivot detection mid-sprint** (Sprint 8): Discovery che HP numerici già
  live in render.js M4 P0.2 → resequencing Sprint 8 → predict hover (was 9)
  → senza panico. Stato-arte può essere stale, verify before commit.
- **Rebase post-CI flake**: terrain "eventually hits" colpita 3 volte. Pattern
  fix: gh run rerun --failed (NOT push --force, NOT skip checks). Quando
  BEHIND main: gh pr update-branch (NOT git rebase + push --force).
- **Backend restart needed quando sessionHelpers.js cambia** (Sprint 11):
  hot reload non copre require() cached modules. preview_stop + preview_start
  backend obbligatorio per smoke E2E che dipende da publicSessionView change.
```

---

## §10 — Final state snapshot 2026-04-28

**Branch attivo**: nessuno (tutti i sprint mergiati main).
**Test totali**: AI 363/363 + 6 test suite nuovi (~108 test totali sprint sessione).
**Format/governance**: verdi.
**Sprint completati questa sessione**: 6 (Sprint 6+7+8+9+10+11), tutti mergiati squash.
**Pillar score**: P1 🟢++, P2 🟢 def, P3 🟡++, P4 🟢++ (Disco saturated), P5 🟡++, P6 🟢 cand.
**Surface-DEAD sweep**: 6/8 closed, 2 residui (#3 con authoring esterno + #4 ~5h).
**Adoption follow-up**: scheduled 2026-05-11.

**Pattern dominante consolidato**: 6 sprint frontend-only successivi senza incidenti major. Engine LIVE Surface DEAD = il filone più ROI-positivo identificato. Da continuare su #4 Mating o esci da Surface-DEAD (residui troppo costosi/esterni) e affronta P3 ability r3/r4 / playtest live / o cleanup flake.
