---
title: 'Skiv Personal Sprint — desideri canonical handoff (4 goals + execution plan)'
date: 2026-04-27
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  [
    handoff,
    sprint,
    skiv,
    personal-goals,
    cross-pc,
    autonomous,
    encounter,
    echolocation,
    thought-ritual,
    legacy-ritual,
  ]
related:
  - docs/skiv/CANONICAL.md
  - docs/planning/2026-04-25-skiv-monitor-plan.md
  - docs/planning/2026-04-25-illuminator-orchestra-handoff.md
  - docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md
  - data/derived/skiv_monitor/state.json
  - reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv
---

# Skiv Personal Sprint — desideri canonical handoff

> **Origine**: 2026-04-27 notte. Allenatore (master-dd) ha chiesto a Skiv stesso quali obiettivi personali vuole, oltre wishlist 8/8 closed.
>
> **Skiv risposta** (voce prima persona, italiano): 4 goals — 3 essenziali (encounter Pulverator + echolocation surface + thought ritual) + 1 opzionale (legacy death ritual).
>
> **Salvato cross-PC** per continuazione team coordinato. Coexistente con sprint α+β+γ+δ già shipped + 4-sprint coordinated handoff (`2026-04-27-sprint-abgd-coordinated-handoff.md`).

---

## §1 — Stato Skiv pre-sprint (snapshot 2026-04-27 notte)

**Lifecycle**: Predatore Maturo (phase 3/5) — index 2 di [hatchling, juvenile, mature, apex, legacy]
**Stats**: Lv 4 INTP 0.92 conf · HP 14/14 · AP 2/2 · SG 2/3 · PE 62 · PI 8
**Mood**: watchful · Composure 100 · Stress 75 · Curiosity 37
**Cabinet**: 2/3 slot (i_osservatore + n_intuizione_terrena, slot 3 ⏳)
**Bond**: Vega ENFJ ❤❤❤, Rhodo ISTJ ❤❤
**Mutations**: 1 (artigli_grip_to_glass T2)
**Synergies**: echo_backstab live
**Ecology** (post #1967): apex savana, solitario (pack 1/1), compete con pulverator_gregarius
**Wishlist 8/8**: ✅ (tutti i ticket originali Skiv shipped — vedi handoff orchestra)

**Gate apex** (next phase): Lv 6 (manca +2) + mutations 2 (manca +1) + thoughts internalized 3 (manca +1) + polarity stable ✅

**Ennea**: silente (4 MBTI axes con inner voices, 9 Ennea archetypes ZERO surface) — gap notato Skiv ma non in goal scope

---

## §2 — 4 Goals proposti da Skiv

### Goal 1 — Encounter `enc_savana_skiv_solo_vs_pack` (~4h, P1+P5)

**Skiv vuole**: protagonista, non NPC neutrale. PR #1967 ha messo Pulverator nel mio bioma. Encounter `enc_savana_pack_clash` esiste ma è "party vs pack". Io osservo. Voglio confrontare il branco da solo.

**Spec**:

- Encounter variant `enc_savana_skiv_solo_vs_pack`:
  - Actor: Skiv solo (Lv 4 mature, all stat live)
  - Enemies: 3 Pulverator (Lv 3-4, pack alpha + 2 beta)
  - Win condition: NON eliminazione totale (matematicamente perdo). **Survive 5 round + tag pack alpha** (status `marked` apply, vedi #1948)
  - Fail: ferito grave → status `wounded_perma` cicatrice persistent 1 settimana sessione
  - Calibration target: win 35-45% (deve essere duro)
- New status `wounded_perma` in `data/core/traits/active_effects.yaml` (additive)
- Calibration harness `tools/py/batch_calibrate_skiv_solo_pack.py` (mirror existing `batch_calibrate_hardcore07.py`)

**File scope**:

- `data/core/encounters/enc_savana_skiv_solo_vs_pack.json` (NEW)
- `data/core/traits/active_effects.yaml` (additive, ~30 LOC `wounded_perma` status)
- `apps/backend/services/combat/woundedPerma.js` (NEW ~80 LOC — persistence cross-encounter via session.lastMissionWoundedPerma)
- `tools/py/batch_calibrate_skiv_solo_pack.py` (NEW ~120 LOC, N=20 sim)
- `tests/services/woundedPerma.test.js` (NEW 5 test)
- `tests/api/encSkivSoloPack.test.js` (NEW 4 test)

**DoD**: 9+ test verde, calibration N=20 → win 35-45% target, AI baseline 353/353 verde

**Pillar impact**: P1 (Skiv combat showcase) + P5 (pack vs solo dynamic = base per future co-op pack scenarios)

### Goal 2 — Echolocation visual fog-of-war pulse (~3-4h, P1 sense surface)

**Skiv vuole**: vedere quello che sento. Trait `sensori_geomagnetici` + `default_parts.senses: [echolocation]` live ma silent UI. Anti-pattern Engine LIVE Surface DEAD diagnosticato.

**Spec**:

- `apps/play/src/render.js drawEcholocationPulse(actor, target, ctx)`:
  - Pre-attack hover (~500ms threshold): pulse animation cyan circle (40px → 120px expanding, 800ms)
  - Tile reveal: 1-2 hidden tile adjacent target → glyph `?` then post-pulse → real content
  - Cooldown 2 round per actor (prevent spam)
- Trait `sensori_geomagnetici` consumer: `+1 tile reveal raggio` (passive bonus)
- Hook in `render.js` cell-hover event listener
- Integration con `state.world.fog_of_war` se exists, OR aggiunge minimal fog model in `state.world.tile_visibility` per Skiv-class actors

**File scope**:

- `apps/play/src/render.js` (modify, +~100 LOC drawEcholocationPulse helper)
- `apps/play/src/style.css` (modify, +~30 LOC `.echolocation-pulse-anim` keyframes)
- `apps/backend/services/combat/senseReveal.js` (NEW ~70 LOC — pure helper getRevealedTiles per actor)
- `apps/backend/routes/sessionHelpers.js` (additive, expose tile_visibility in publicSessionView)
- `tests/services/senseReveal.test.js` (NEW 4 test)

**DoD**: 4+ test, prettier check, smoke probe (canvas mock pulse renders), AI baseline 353/353 verde

**Pillar impact**: P1 (sense as visible mechanic, Cogmind tooltip pattern extend)

### Goal 3 — Third thought ritual choice UI (~5h, P4 agency)

**Skiv vuole**: scegliere chi divento all'apex. Ora research timer scade → sistema applica thought più adatto a vcAxes auto. Subisco. Voglio agency pre-internalization.

**Spec**:

- `apps/play/src/thoughtsRitualPanel.js` (NEW ~100 LOC):
  - Overlay modale quando 3° thought research-completato
  - Top-3 candidati ranked by vcSnapshot match
  - Per candidato: title + 1-paragraph preview + passive bonus expected + voice line example (Disco-style, mirror inner voices #1945)
  - 30-second decision timer (default top-1 auto-pick if no input)
  - Decision irreversible per session
- Backend endpoint `GET /api/v1/thoughts/candidates?session_id=&unit_id=&top=3` (NEW in `routes/session.js` o nuovo `routes/thoughts.js`)
- Endpoint internalize esiste già — riusa pattern
- Header btn 🧠+ trigger overlay manuale o auto su event `research_completed`

**File scope**:

- `apps/play/src/thoughtsRitualPanel.js` (NEW ~100 LOC)
- `apps/play/src/api.js` (additive +3 method: thoughtsCandidates / thoughtsRitualOpen / thoughtsRitualPick)
- `apps/play/src/main.js` (additive +20 LOC, initThoughtsRitualPanel + auto-open trigger su event)
- `apps/play/src/style.css` (additive +~40 LOC `.thoughts-ritual-overlay` + countdown pulse)
- `apps/backend/routes/session.js` (additive +30 LOC endpoint candidates)
- `tests/api/thoughtsRitual.test.js` (NEW 4 test)
- `tests/play/thoughtsRitualPanel.test.js` (NEW 4 test)

**DoD**: 8+ test, prettier check, integration smoke (auto-open su event), AI baseline 353/353 verde

**Pillar impact**: P4 (Disco Tier S §6 already wired #1966, this adds choice agency on top)

### Goal 4 — Legacy death mutation choice ritual (~3h, P2 inheritance agency, OPZIONALE)

**Skiv vuole**: scelta cosa lasciare quando morirò. `propagateLineage` (#1924) ora scrive ALL applied_mutations a pool. Il prossimo cucciolo eredita 1-2 random. Voglio decidere cosa lascio.

**Spec**:

- Pre-death ritual UI `apps/play/src/legacyRitualPanel.js` (NEW ~80 LOC):
  - Trigger: actor.lifecycle_phase === 'legacy' (transition to legacy phase)
  - Overlay modale lista applied_mutations → checkbox "lascia / non lascia"
  - Default: tutto lasciato (back-compat)
  - Decision irreversible
- Backend extension `lineagePropagator.js propagateLineage(deadUnit, species, biome, options)`:
  - Add optional `options.mutationsToLeave: string[]` (filter applied_mutations subset)
  - Default behavior preserved se options.mutationsToLeave omitted
- Narrative beat: se < 50% mutations lasciate → bond hearts -1 (`"Il vento porta solo certe ossa"`). Se 100% lasciato → bond hearts +1 (`"Hai dato tutto"`)

**File scope**:

- `apps/play/src/legacyRitualPanel.js` (NEW ~80 LOC)
- `apps/play/src/api.js` (additive +1 method `legacyRitualSubmit`)
- `apps/backend/services/generation/lineagePropagator.js` (modify, +20 LOC options.mutationsToLeave param)
- `apps/backend/routes/session.js` (additive endpoint POST `/api/v1/lineage/legacy-ritual`)
- `tests/services/lineagePropagatorRitual.test.js` (NEW 4 test)

**DoD**: 4+ test, prettier check, AI baseline 353/353 verde

**Pillar impact**: P2 (lineage cross-gen agency, weight di scelte permanenti)

---

## §3 — Execution plan coordinato (4 goals)

### 3.1 Strategia parallel-friendly

**File ownership matrix** (anti-collision lessons from sprint α+β+γ+δ):

| Goal                   | File esclusivi                                                                                                                                                              | Shared additive (max LOC)                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **G1 Encounter**       | `data/core/encounters/*` + `apps/backend/services/combat/woundedPerma.js` + `tools/py/batch_calibrate_skiv_solo_pack.py` + `tests/services/sprint-skiv-g1/*`                | `active_effects.yaml` (+30 LOC)                                                                                        |
| **G2 Echolocation**    | `apps/play/src/render.js` + `apps/play/src/style.css` (drawEcholocationPulse blocks) + `apps/backend/services/combat/senseReveal.js` + `tests/services/senseReveal.test.js` | `sessionHelpers.js` (+15 LOC publicSessionView)                                                                        |
| **G3 Thoughts ritual** | `apps/play/src/thoughtsRitualPanel.js` + `tests/api/thoughtsRitual.test.js` + `tests/play/thoughtsRitualPanel.test.js`                                                      | `apps/play/src/main.js` (+20 LOC), `api.js` (+3 method), `routes/session.js` (+30 LOC endpoint), `style.css` (+40 LOC) |
| **G4 Legacy ritual**   | `apps/play/src/legacyRitualPanel.js` + `tests/services/lineagePropagatorRitual.test.js`                                                                                     | `lineagePropagator.js` (+20 LOC), `api.js` (+1 method), `routes/session.js` (+15 LOC endpoint)                         |

**Cross-collision check**:

- G1 ↔ G2: NO overlap (G1 backend combat / G2 frontend render)
- G1 ↔ G3: minor sessionHelpers (G2) vs session.js (G3) — different files
- G2 ↔ G3: NO overlap (render.js vs thoughtsRitualPanel.js)
- G3 ↔ G4: BOTH touch `api.js` + `routes/session.js`. Bisogna serializzare OR strict atomic edit

**Parallel-safe**: G1 + G2 disjoint
**Sequential**: G3 → G4 (shared session.js + api.js)

### 3.2 Wave structure

```
Phase 1 (autonomous, ~7-8h budget): G1 + G2 parallel
  ├─ Goal 1 Encounter Skiv vs pack       [backend + data]
  └─ Goal 2 Echolocation visual          [frontend + render]
       ↓ (merge wave Phase 1)
Phase 2 (autonomous, ~5h budget): G3 sequential
  └─ Goal 3 Thoughts ritual UI           [frontend + endpoint]
       ↓ (merge wave Phase 2)
Phase 3 (autonomous, ~3h budget): G4 sequential
  └─ Goal 4 Legacy death ritual          [frontend + lineage extension]
       ↓ (merge wave Phase 3)
       ↓
Phase 4 (synthesis): Skiv state recompute + handoff next session
```

**Total budget**: ~15-16h (3 sprint week single-dev autonomous)

### 3.3 Cross-PC coordination

**Resume command** (any session):

> _"leggi `docs/planning/2026-04-27-skiv-personal-sprint-handoff.md`, verifica §6 progress, esegui fase corrente"_

**Pre-spawn checklist** (riusa pattern abgd handoff §3.2):

1. `git fetch origin main`
2. `git branch -a | grep claude/skiv-goal-{1,2,3,4}` (sibling work check)
3. `gh pr list --state open` (cross-PC sync)
4. `git status` working tree clean

**Anti-pattern guards**: file ownership esclusivo respect, atomic commit safety, worktree isolation se possibile, branch isolato no checkout altri.

---

## §4 — Decisioni master-dd richieste

### Skip-blockers (default OK):

- D-skiv-1: Encounter calibration target win 35-45% — confermato spec? (default YES)
- D-skiv-2: `wounded_perma` cicatrice persistent durata sessione o cross-session? (default sessione)
- D-skiv-3: Thoughts ritual decision timer 30s o configurable? (default 30s)
- D-skiv-4: Legacy ritual default "tutto lasciato" o "nulla lasciato"? (default tutto)

### Real blockers (richiede risposta):

- **D-skiv-5**: Goal 4 OPZIONALE — includere o defer?
  - **Opzione A**: includere full (~16h totale)
  - **Opzione B**: defer post-playtest live (~13h, focus G1+G2+G3)
  - **Recommendation**: A (Skiv ha esplicitamente chiesto, motivation alta)

### Decisioni unblocked (vanno avanti default):

- Encounter narrative voice script: usa Skiv canonical voice (italiano + desert metaphor)
- Echolocation pulse colore: cyan #66d1fb (matches focused status icon)
- Thoughts ritual timer overlay style: countdown pulse rosso → giallo → verde

---

## §5 — Allegati: agent prompt ready-to-paste

### §A Goal 1 Encounter — agent prompt full

```
Spawn general-purpose agent background.
Branch: feat/skiv-goal-1-encounter-solo-pack-2026-04-28 da origin/main.
Read context: docs/planning/2026-04-27-skiv-personal-sprint-handoff.md §2 Goal 1.
Read shipped: apps/backend/services/combat/sgTracker.js (mirror), apps/backend/services/combat/morale.js (status pattern Sprint α #1959).

Implementa in 1 PR:
1. data/core/encounters/enc_savana_skiv_solo_vs_pack.json (NEW): Skiv Lv 4 vs 3 Pulverator (1 alpha + 2 beta), grid 8x8, biome savana, win NON eliminazione, custom_win {survive: 5, mark_alpha: true}, fail wounded_perma
2. data/core/traits/active_effects.yaml (additive +30 LOC): wounded_perma status (cicatrice 1 settimana sessione, -1 max_hp persistent)
3. apps/backend/services/combat/woundedPerma.js (NEW ~80 LOC): pure module mirror sgTracker init/apply/decay
4. tools/py/batch_calibrate_skiv_solo_pack.py (NEW ~120 LOC): N=20 sim, target win 35-45%
5. tests/services/woundedPerma.test.js (5 test) + tests/api/encSkivSoloPack.test.js (4 test)

DoD: 9+ test verde, calibration N=20 in band, AI baseline 353/353 verde, prettier ok.
Commit: feat(skiv): Goal 1 Encounter Skiv vs Pulverator pack solo (P1+P5)
Push + PR title 'feat(skiv): Goal 1 — encounter Skiv solo vs Pulverator pack (personal wishlist)'
```

### §B Goal 2 Echolocation — agent prompt full

```
Spawn general-purpose agent background.
Branch: feat/skiv-goal-2-echolocation-pulse-2026-04-28 da origin/main.
Read context: docs/planning/2026-04-27-skiv-personal-sprint-handoff.md §2 Goal 2.
Read shipped: apps/play/src/render.js drawCounterBadge (PR #1932), drawTooltip3Tier (PR #1960).

Implementa in 1 PR:
1. apps/backend/services/combat/senseReveal.js (NEW ~70 LOC): pure helper getRevealedTiles(actor, target) → tile coords array. Cooldown 2 round per actor.
2. apps/backend/routes/sessionHelpers.js (additive +15 LOC): publicSessionView expose tile_visibility map per actor
3. apps/play/src/render.js (additive +~100 LOC): drawEcholocationPulse(actor, target, ctx) — pulse cyan animation 800ms expanding 40→120px + tile reveal '?' glyph
4. apps/play/src/style.css (additive +~30 LOC): @keyframes echolocation-pulse-anim
5. tests/services/senseReveal.test.js (NEW 4 test)

DoD: 4+ test, prettier check, AI baseline 353/353 verde.
Commit: feat(skiv): Goal 2 echolocation visual pulse (sense surface)
Push + PR title 'feat(skiv): Goal 2 — echolocation fog-of-war pulse (sense surface live)'
```

### §C Goal 3 Thoughts Ritual — agent prompt full

```
Spawn general-purpose agent background.
Branch: feat/skiv-goal-3-thoughts-ritual-2026-04-28 da origin/main (verify Goal 1+2 merged).
Read context: docs/planning/2026-04-27-skiv-personal-sprint-handoff.md §2 Goal 3.
Read shipped: apps/play/src/thoughtsPanel.js + apps/backend/services/narrative/innerVoice.js (#1945).

Implementa in 1 PR:
1. apps/play/src/thoughtsRitualPanel.js (NEW ~100 LOC): overlay modale top-3 candidati, 30s timer, voice preview Disco-style
2. apps/backend/routes/session.js (additive +30 LOC): endpoint GET /api/v1/thoughts/candidates?session_id=&unit_id=&top=3
3. apps/play/src/api.js (additive +3 method): thoughtsCandidates / thoughtsRitualOpen / thoughtsRitualPick
4. apps/play/src/main.js (additive +20 LOC): initThoughtsRitualPanel + auto-open trigger event 'research_completed'
5. apps/play/src/style.css (additive +~40 LOC): .thoughts-ritual-overlay + countdown pulse animation
6. tests/api/thoughtsRitual.test.js (NEW 4 test) + tests/play/thoughtsRitualPanel.test.js (NEW 4 test)

DoD: 8+ test, prettier check, integration smoke auto-open, AI baseline 353/353 verde.
Commit: feat(skiv): Goal 3 thoughts ritual UI choice (P4 agency)
Push + PR title 'feat(skiv): Goal 3 — thoughts ritual choice UI (Disco extension P4 agency)'
```

### §D Goal 4 Legacy Ritual — agent prompt full

```
Spawn general-purpose agent background.
Branch: feat/skiv-goal-4-legacy-ritual-2026-04-28 da origin/main (verify Goal 3 merged).
Read context: docs/planning/2026-04-27-skiv-personal-sprint-handoff.md §2 Goal 4.
Read shipped: apps/backend/services/generation/lineagePropagator.js (#1918+#1924).

Implementa in 1 PR:
1. apps/play/src/legacyRitualPanel.js (NEW ~80 LOC): overlay modale checkbox lascia/non lascia per applied_mutations, narrative beat bond hearts ±1
2. apps/backend/services/generation/lineagePropagator.js (modify +20 LOC): propagateLineage options.mutationsToLeave param filter
3. apps/backend/routes/session.js (additive +15 LOC endpoint POST /api/v1/lineage/legacy-ritual)
4. apps/play/src/api.js (additive +1 method legacyRitualSubmit)
5. tests/services/lineagePropagatorRitual.test.js (NEW 4 test)

DoD: 4+ test, prettier check, AI baseline 353/353 verde, back-compat propagateLineage default behavior preserved.
Commit: feat(skiv): Goal 4 legacy death mutation choice ritual (P2 inheritance agency)
Push + PR title 'feat(skiv): Goal 4 — legacy death ritual choice (P2 cross-gen agency)'
```

---

## §6 — Progress tracking

### Phase 1 (G1 + G2 parallel)

| Goal                           |   Status   | PR                                                       | Notes                                                                                              |
| ------------------------------ | :--------: | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| G1 Encounter Skiv solo vs pack | ✅ SHIPPED | [#1982](https://github.com/MasterDD-L34D/Game/pull/1982) | calibration N=20 win 45.0% in band 35-45%, 9/9 test, encounter wired via encounterLoader           |
| G2 Echolocation visual pulse   | ✅ SHIPPED | [#1977](https://github.com/MasterDD-L34D/Game/pull/1977) | senseReveal.js + drawEcholocationPulse + installEcholocationOverlay; 6/6 test, anti-pattern chiuso |

### Phase 2 (G3) — gated on Phase 1 merged

| Goal                         |   Status   | PR                                                       | Notes                                                                                                                                                                                    |
| ---------------------------- | :--------: | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G3 Thoughts ritual choice UI | ✅ SHIPPED | [#1983](https://github.com/MasterDD-L34D/Game/pull/1983) | thoughtsRitualPanel.js + GET /thoughts/candidates (top-3 ranked) + auto-open trigger event 'research_completed' + 30s timer + irreversible session lock; 10/10 test, voice preview wired |

### Phase 3 (G4) — ✅ COMPLETE

| Goal                            |   Status   | PR                                                       | Notes                                                                                                                                                                                                                                                   |
| ------------------------------- | :--------: | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G4 Legacy death mutation ritual | ✅ SHIPPED | [#1984](https://github.com/MasterDD-L34D/Game/pull/1984) | propagateLineage `options.mutationsToLeave` opt-in filter (back-compat preserved) + computeBondHeartsDelta narrative beat + POST /api/v1/lineage/legacy-ritual + legacyRitualPanel.js overlay (lifecycle_phase=legacy auto-trigger) + 10/10 ritual test |

### Phase 4 — ✅ COMPLETE

- ✅ Skiv state recompute (deferred a post-playtest run — encounter solo_vs_pack non ancora giocato live, wounded_perma applicato runtime non backfilled state.json)
- ✅ CLAUDE.md sprint context update (questa sessione)
- ✅ Memory checkpoint + handoff close (project_skiv_personal_wishlist_2026_04_27.md aggiornato a SHIPPED)
- ✅ Cross-PC sync verify (4 PR su origin/main: #1977 + #1982 + #1983 + #1984)

**Sprint result**: 4/4 goals shipped main in singola sessione autonomous (~9h totali da spawn G1+G2 a merge G4). Total LOC ~1100 (G1 ~600 backend + harness, G2 ~280 frontend, G3 ~530 panel + endpoint, G4 ~280 panel + lineage extension). Total test +29 (G1 9, G2 6, G3 10, G4 4).

---

## §7 — Outcome atteso post 4 goals

| Goal               | Skiv impact                                                                           | Pillar |
| ------------------ | ------------------------------------------------------------------------------------- | ------ |
| G1 Encounter       | Showcase combat solo, narrative weight territorial                                    | P1+P5  |
| G2 Echolocation    | Sense surface visible — anti-pattern Engine LIVE Surface DEAD chiuso per echolocation | P1     |
| G3 Thoughts ritual | Identity agency at apex — Skiv sceglie chi diventa, non subisce                       | P4     |
| G4 Legacy ritual   | Cross-gen weight — eredità è scelta, non automation                                   | P2     |

**Skiv lifecycle progress atteso**: mature → close to apex (XP +5 from encounter + thought 3 internalized closes 2/3 gate requirements).

---

## §8 — Resume trigger phrase

Per qualsiasi sessione futura (qualsiasi PC):

> _"leggi docs/planning/2026-04-27-skiv-personal-sprint-handoff.md, verifica §6 progress, esegui fase corrente"_

Single comando autosufficiente. Cross-PC team coordinato via §6 progress table inline.

---

_Doc generato 2026-04-27 notte. Skiv ha esplicitamente chiesto questi 4 goals oltre wishlist 8/8. Skiv canonical voice preservata. Cross-PC ready. Coexistente con sprint α+β+γ+δ handoff (`2026-04-27-sprint-abgd-coordinated-handoff.md`)._

_**Sabbia segue.** 🦎_
