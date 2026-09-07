---
title: 'Sprint 12 — Mating lifecycle wire — Surface-DEAD #4 closure'
description: 'Sprint 12 autonomous shipped: mating eligibles surface in debrief panel post-victory. Engine LIVE in metaProgression (469 LOC) finally visible in player loop. §C.2 Surface-DEAD sweep 7/8 chiusi.'
authors:
  - claude-code
created: 2026-04-28
updated: 2026-04-28
status: published
tags:
  - sprint-handoff
  - surface-dead
  - mating
  - debrief
  - p2-evoluzione
workstream: backend
related:
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/planning/2026-04-28-next-session-handoff.md
  - docs/planning/2026-04-27-sprint-11-biome-chip-handoff.md
  - docs/planning/2026-04-27-sprint-10-qbn-debrief-handoff.md
---

# Sprint 12 — Mating lifecycle wire — Surface-DEAD #4 closure

**Data**: 2026-04-28 · **Branch**: `claude/sprint-12-mating-lifecycle-wire` · **Pattern**: Engine LIVE Surface DEAD killer (7° consecutivo)

## ⚡ TL;DR (30s read)

Engine LIVE pre-Sprint 12: `apps/backend/services/metaProgression.js` (469 LOC) — `rollMatingOffspring` + `canMate` + offspringRegistry shipped da PR #1879 (V3 canonical Path A). Surface DEAD: debrief panel post-encounter non emetteva mai pair-bond candidates → ciclo Nido→offspring→lineage_id invisibile in player loop normale.

Sprint 12 chiude wirando il debrief. Backend pure helper computa pair survivors player team (n-choose-2 capped 6); frontend rende card pair-bond gold con biome chip + offspring badge. Solo on victory (defeat = niente lineage). Pattern proven 7° volta consecutiva (~3.5h totale).

**§C.2 Surface-DEAD sweep**: 6/8 → **7/8 chiusi**. Residuo solo #3 Spore mutation dots (~15h authoring esterno).

---

## §1 — Cosa è cambiato

### Backend

**Helper nuovo** [`apps/backend/services/mating/computeMatingEligibles.js`](../../apps/backend/services/mating/computeMatingEligibles.js) (~120 LOC):

- Pure helper: zero side effects, zero IO
- API: `computeMatingEligibles(survivors, encounterBiomeId, options?)` → `Array<{parent_a_id, parent_b_id, parent_a_name, parent_b_name, biome_id, can_mate, expected_offspring_count, reason?}>`
- `filterPlayerSurvivors`: keep `controlled_by ∈ {player, ally}` OR `team ∈ {player, ally}` AND `hp > 0` AND `id` stabile
- `pairCombinations`: n-choose-2 (combinations, NOT permutations)
- Cap: `DEFAULT_MAX_PAIRS=6` (4 unit → 6 pair, 8 unit → 28 pair → cap a 6 mantiene UI leggibile)
- `DEFAULT_OFFSPRING_PER_PAIR=1` (rollMatingOffspring spec)
- Opzionale `options.metaTracker`: gate via `tracker.canMate(npcId)` per coppia (a AND b passano gate). Graceful: throw → fallback permissivo (entry.can_mate stays true).

**Wire** [`apps/backend/services/rewardEconomy.js`](../../apps/backend/services/rewardEconomy.js) `buildDebriefSummary`:

- Aggiunto field `mating_eligibles[]` solo on victory + best-effort require pattern (mirror QBN narrative event Sprint 10).
- Defeat / timeout / 0-1 survivor → empty array.
- Biome resolution via `session.encounter?.biome_id || session.encounter?.biome || session.biome_id || null`.

### Frontend

**Module nuovo** [`apps/play/src/lineagePanel.js`](../../apps/play/src/lineagePanel.js) (~90 LOC):

- Pure `formatLineageCard(entry)` → HTML pair card. XSS escape su tutti i campi user-injected (parent names, parent ids, biome label).
- Pure `formatLineageList(eligibles)` → concat cards skip malformed inline.
- Side-effect `renderLineageEligibles(sectionEl, listEl, eligibles)` idempotent + show/hide via `style.display`.
- Reuse `iconForBiome` + `labelForBiome` da `biomeChip.js` (Sprint 11 export).
- Plural offspring label: "+1 offspring" vs "+3 offsprings" quando count>1.
- Falsy/zero/negative offspring count → fallback 1.

**Wire** [`apps/play/src/debriefPanel.js`](../../apps/play/src/debriefPanel.js):

- Import `renderLineageEligibles` da `./lineagePanel.js`
- HTML slot in render template: `<div id="db-lineage-section">` con title `🏠 Lineage Eligibili` + `<div id="db-lineage-list">`
- State field nuovo: `state.matingEligibles = []`
- Setter API nuovo: `setLineageEligibles(payload)` accept array | null
- Render function nuovo: `renderLineage()` registered in main `render()` (gated `state.outcome !== 'defeat' && !== 'timeout'`)

**Wire** [`apps/play/src/phaseCoordinator.js`](../../apps/play/src/phaseCoordinator.js):

- In `applyPhase('debrief')` block: pipe `bridge?.lastDebrief?.mating_eligibles` → `dbApi.setLineageEligibles(...)` (mirror QBN narrative event pattern)
- Try-catch graceful: lineage optional, non blocca debrief

**CSS scope** [`apps/play/src/debriefPanel.css`](../../apps/play/src/debriefPanel.css):

- `.db-lineage-section`, `.db-lineage-card`, `.db-lineage-pair`, `.db-lineage-parent`, `.db-lineage-x`, `.db-lineage-meta`, `.db-lineage-offspring`, `.db-lineage-biome`
- Style: linear-gradient gold (#1f1a14 → #14110b) + serif italic body + 3px gold left-border (#ffd166) + offspring badge con border accent gold + biome chip caps con color #b9a87c
- Differente da Sprint 10 QBN journal (palette violet) per discriminare semantica diegetic vs lineage

---

## §2 — Test budget

**38/38 nuovi**:

- `tests/services/computeMatingEligibles.test.js` (19 test): filterPlayerSurvivors edge cases (alive+dead+enemy+ally aliases+null) / pairCombinations (n=0/1/2/4 cases) / computeMatingEligibles (victory path / single survivor / zero / null inputs / null biome / cap respect / default cap 6 / metaTracker gate true+false / metaTracker malformed graceful / parent name fallback)
- `tests/play/lineagePanel.test.js` (19 test): formatLineageCard (canonical / plural / null / missing parent ids / XSS escape parent names+ids / null biome / unknown biome fallback / falsy offspring count fallback / parent name fallback) / formatLineageList (empty / null / multiple / skip malformed) / renderLineageEligibles (visible / hidden / null payload / all malformed → hidden / idempotent / null refs defensive)

**AI baseline regression**: 382/382 verde zero regression.
**Format**: prettier check verde.
**Governance**: `tools/check_docs_governance.py --strict` errors=0 warnings=0.

---

## §3 — Smoke E2E (workaround)

**Limitazione preview**: Vite dev server preview risolve root da repo principale (non worktree path corrente). I file nuovi in worktree non sono raggiungibili via `/src/lineagePanel.js` HTTP — Vite serve SPA fallback HTML invece del module JS.

**Workaround validation**: direct node integration test su `buildDebriefSummary` con session mock:

```bash
node -e "
const { buildDebriefSummary } = require('./apps/backend/services/rewardEconomy');
const session = {
  session_id: 'sm-12', outcome: 'victory',
  encounter: { biome_id: 'savana' },
  units: [
    { id: 'pg_alice', name: 'Alice', hp: 8, controlled_by: 'player' },
    { id: 'pg_bob', name: 'Bob', hp: 5, controlled_by: 'player' },
    { id: 'e1', hp: 0, controlled_by: 'sistema' },
  ],
  events: [], damage_taken: {},
};
const r = buildDebriefSummary(session, { turns_played: 4, per_actor: {} }, { per_actor: {}, session_total: 6 });
console.log(JSON.stringify(r.mating_eligibles, null, 2));
"
```

Output verified:

```json
[
  {
    "parent_a_id": "pg_alice",
    "parent_b_id": "pg_bob",
    "parent_a_name": "Alice",
    "parent_b_name": "Bob",
    "biome_id": "savana",
    "can_mate": true,
    "expected_offspring_count": 1
  }
]
```

Defeat path verified: `outcome=defeat` → `mating_eligibles: []` (correct gate).

Frontend module imports validated transitively: `debriefPanel.js` imports `lineagePanel.js` and unit tests cover full render path with DOM stub.

---

## §4 — Pillar score delta

| Pilastro                | Pre-Sprint 12 | Post-Sprint 12 | Delta                                                 |
| ----------------------- | :-----------: | :------------: | ----------------------------------------------------- |
| P2 Evoluzione emergente |    🟢 def     |      🟢++      | Ciclo lineage visibile post-encounter (era invisible) |
| Altri pillars           |   unchanged   |   unchanged    | —                                                     |

**Highlight**: pair-bond candidates ora prima cosa che player vede in debrief (post mbti reveal + qbn diegetic). Connessione esplicita Nido↔encounter chiusa (era inferenziale).

---

## §5 — §C.2 Surface-DEAD sweep status

| #   | Engine LIVE                | Surface                  | Status                      |
| --- | -------------------------- | ------------------------ | --------------------------- |
| 1   | predictCombat N=1000       | tooltip hover preview    | 🟢 Sprint 8                 |
| 2   | Tactics Ogre HUD           | HP floating render.js    | 🟢 already live (M4 P0.2)   |
| 3   | Spore part-pack            | drawMutationDots overlay | 🔴 (~15h authoring esterno) |
| 4   | Mating engine 469 LOC      | gene_slots → lifecycle   | 🟢 **Sprint 12 (this)**     |
| 5   | objectiveEvaluator 6 types | HUD top-bar              | 🟢 Sprint 9                 |
| 6   | biomeSpawnBias.js          | biome chip HUD           | 🟢 Sprint 11                |
| 7   | QBN engine 17 events       | session debrief wire     | 🟢 Sprint 10                |
| 8   | Thought Cabinet 18         | reveal_text_it + UI      | 🟢 Sprint 6                 |

**Sweep**: 7/8 chiusi. Bundle ROI cumulato 7 sprint = ~25h totali (~3.6h/sprint avg). **Pattern dominante chiuso al 87.5%.**

---

## §6 — Anti-pattern guardrail rispettati

- ✅ Non spawnati ancestors / scope creep (lineage_id rolling rimane in `metaTracker.recordMating` — fuori scope, surface only)
- ✅ Non refactorato `nestHub.js` (esiste già Lineage tab da PR #1911 — questo è surface separato post-encounter)
- ✅ Non aggiunte new mating mechanics (engine canonical = #1879, non toccato)
- ✅ Backward compat: `mating_eligibles=[]` quando defeat / no helper / 0-1 survivor — section hidden, zero breaking change
- ✅ XSS escape su tutti i campi user/data injected
- ✅ Format prettier verde + governance 0 errors

---

## §7 — Next session candidates

### Path A: Continua §C.2 Surface-DEAD sweep (chiude 8/8)

**Sprint 13 — Spore mutation dots overlay** (~3h render + ~15h authoring esterno)

- Engine LIVE: `data/core/genome/parts/*.yaml` Spore-style part packs (catalog complete da PR #1782)
- Gap: nessun `drawMutationDots` overlay sulla unit canvas che mostri visivamente quale parte/mutation un'unità ha
- Effort split: 3h render-only (visual swap stub) + 15h authoring esterno per 30 mutation `aspect_token` + `visual_swap_it`

NOTA: **Path A = stuck su authoring esterno**. Sprint 13 render-only può essere shipped, ma surface invisibile fino a quando authoring batch non è completo. Decisione user-driven.

### Path B: Tier-A residui altrove

- **Beast Bond extension** (~5h)
- **XCOM EW Officer Training School** (~10h, P3 progression)
- **TKT-M11B-06 playtest live** (~2-4h userland — chiude P5 def)

### Path C: P3 Identità → 🟢

- Ability r3/r4 tier extension (~10h) — backlog Sprint 8 closure (Tier S #6 4/4)

### Path D: Cleanup flake terrain test

- terrainReactionsWire flake "eventually hits" investigation (~1h)

---

## §8 — Memory writes (suggested)

```markdown
- **Sprint 12 Surface-DEAD #4 closure (7/8)**: pattern proven 7° volta consecutiva. ~3.5h total. Engine LIVE Surface DEAD killer + best-effort require pattern (try/require/catch) + reuse pure helpers da Sprint sibling (biomeChip.iconForBiome+labelForBiome).
- **Worktree-path mismatch limitazione preview**: Vite dev server da preview_start serve repo principale, non worktree path. Workaround: direct node integration test su buildDebriefSummary mock session. AND unit test DOM stub per side-effect renderers.
```

---

## §9 — Commit + PR command ritual

```bash
git add apps/backend/services/mating/computeMatingEligibles.js \
        apps/backend/services/rewardEconomy.js \
        apps/play/src/lineagePanel.js \
        apps/play/src/debriefPanel.js \
        apps/play/src/debriefPanel.css \
        apps/play/src/phaseCoordinator.js \
        tests/services/computeMatingEligibles.test.js \
        tests/play/lineagePanel.test.js \
        docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md \
        CLAUDE.md COMPACT_CONTEXT.md BACKLOG.md \
        docs/planning/2026-04-28-sprint-12-mating-lifecycle-handoff.md

git commit -m "$(cat <<'EOF'
feat(p2): Sprint 12 — Mating lifecycle wire (§C.2 Surface-DEAD #4 killer, 7/8)

Engine LIVE in metaProgression (rollMatingOffspring + canMate + offspringRegistry da #1879)
era invisibile in player loop. Wire debrief panel post-victory con pair-bond candidates.

Backend:
- apps/backend/services/mating/computeMatingEligibles.js — pure helper
- apps/backend/services/rewardEconomy.js buildDebriefSummary — emette mating_eligibles[]

Frontend:
- apps/play/src/lineagePanel.js — pure formatLineageCard + render idempotent
- apps/play/src/debriefPanel.js — HTML slot + setLineageEligibles setter API
- apps/play/src/debriefPanel.css — gold pair-bond card style
- apps/play/src/phaseCoordinator.js — pipe bridge.lastDebrief.mating_eligibles

Tests: 38/38 (19 backend + 19 frontend) + AI 382/382 zero regression.
Format + governance verdi. Smoke validato via direct node integration.

§C.2 Surface-DEAD: 7/8 chiusi. P2 🟢 def → 🟢++.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push -u origin claude/sprint-12-mating-lifecycle-wire
gh pr create --title "feat(p2): Sprint 12 — Mating lifecycle wire (§C.2 Surface-DEAD #4 killer, 7/8)" \
             --body "[see handoff doc]"
```

---

## §10 — Final state snapshot

- **Files added**: 4 (1 backend helper + 1 frontend module + 2 test suites + 1 handoff doc)
- **Files modified**: 5 (rewardEconomy + debriefPanel.js + debriefPanel.css + phaseCoordinator + stato-arte + CLAUDE + COMPACT + BACKLOG)
- **LOC delta**: ~600 added (helper + module + tests + handoff)
- **Test budget**: 38 new + AI 382/382 baseline + format check + governance — all green
- **Pillar**: P2 🟢 def → 🟢++
- **Sweep counter**: §C.2 Surface-DEAD 6/8 → **7/8**

Pattern Engine LIVE Surface DEAD killer applicato consistentemente per la 7° sprint consecutiva. Singolo residuo §C.2 (#3 Spore mutation dots) bloccato su authoring esterno — decisione strategy out-of-scope autonomous.
