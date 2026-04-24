---
title: Triangle Strategy → Evo-Tactics Transfer Plan
workstream: cross-cutting
status: draft
owners:
  - eduardo
created: 2026-04-24
updated: 2026-04-24
tags:
  - triangle-strategy
  - design-reference
  - transfer-plan
  - tactical-rpg
summary: >
  Research-backed analysis of Triangle Strategy (Square Enix 2022) mechanics
  with concrete transfer proposals for Evo-Tactics, tied to existing runtime
  surfaces (vcScoring, hexGrid, roundOrchestrator, phaseMachine, objectiveEvaluator).
---

# Triangle Strategy → Evo-Tactics Transfer Plan

**Author**: Eduardo Scarpelli · **Date**: 2026-04-24 · **Status**: draft (research-backed, not yet approved)

**Scope**: reverse-engineer high-ROI design mechanics from _Triangle Strategy_ (Square Enix, Artdink, 2022) and translate them into concrete proposals for **Evo-Tactics** — co-op tactical d20 on hex grid, six Pilastri (tattica leggibile FFT, evoluzione emergente Spore, specie × job, MBTI/Ennea, co-op vs AI "Sistema", fairness).

**Method**: started from a YouTube unit-guide video ([Triangle Strategy COMPLETE Unit Guide](https://www.youtube.com/watch?v=kOnxfP5zRIM)) that was not transcript-accessible, then triangulated via reviews, wikis, and walkthrough sites. Every claim is cited inline. Runtime file paths in this repo are used to pin each proposal to an existing surface so the effort is never "from scratch".

---

## Executive Summary — Top 10 steals, ranked by ROI

1. **Scales of Conviction voting = co-op debate on branching decisions**. Triangle Strategy turns narrative forks into a cabinet vote where each party member casts a weighted ballot and Serenoa persuades holdouts ([Kotaku](https://kotaku.com/triangle-strategy-square-enix-scales-of-conviction-vote-1848657909)). Evo-Tactics already has a `world_setup` co-op vote phase (M18). Layering **per-player Conviction weight** on top of it converts a flat 1-player-1-vote into a negotiation mini-game. **ROI: very high — zero new systems, only re-wire an existing phase.** Effort **M**.
2. **Three-axis Conviction (Utility / Morality / Liberty)** as _player-diegetic_ surface for our **MBTI axes**. TS surfaces the axes visibly in dialogue color codes and persuasion gates ([Pro Game Guides](https://progameguides.com/project-triangle-strategy/utility-morality-and-liberty-explained-how-to-choose-the-right-answers-in-triangle-strategy/), [Game Rant](https://gamerant.com/triangle-strategy-convictions-choices-scale-morality-utility-liberty/)); Evo-Tactics currently **accrues** MBTI in `vcScoring.js` but almost never shows it. **ROI: high — directly closes Pilastro 4 🟡 → 🟢 without new math.** Effort **S**.
3. **Pincer / follow-up attack** on opposite-side adjacency. TS auto-triggers a second strike when two allies flank the same enemy ([RPG Site](https://www.rpgsite.net/review/12464-triangle-strategy-review), [Nintendo Life](https://www.nintendolife.com/guides/triangle-strategy-tips-and-battle-tactics-walkthrough-tactical-points-phases-kudos-quietuses-guide)). Evo-Tactics already has `squadSync` focus_fire combo (+1 dmg) and a facing-rear crit. Formalize **pincer = auto follow-up** and it becomes the most readable co-op primitive on the board. **ROI: high — one combat resolver hook, teaches positioning in 1 turn.** Effort **S**.
4. **Elevation = flat +30% damage advantage** from high ground ([Grokipedia](https://grokipedia.com/page/Triangle_Strategy), [Fextralife](https://fextralife.com/triangle-strategy-beginner-guide-pc-release/)). Evo-Tactics has `terrain_defense.yaml` with 3 elevation levels but the bonus is mostly CD (defense) flavored. Mirror TS's **attacker-side bonus** and you get a legible "climb the hill" heuristic any new player reads in the first round. Effort **S**.
5. **Elemental terrain chain reactions** — fire melts ice → water → lightning shocks everyone standing in the puddle ([VGKami](https://vgkami.com/triangle-strategy-all-terrain-effects/), [Game8 terrain](https://game8.co/games/Triangle-Strategy/archives/369610)). This is the single highest "tactical emergence" multiplier in TS and maps perfectly onto our channel resistance engine (fire/water/lightning already exist). **ROI: very high — 3 status effects + 1 tick-spreader covers it.** Effort **M**.
6. **Push / knockback → fall damage off ledges**. TS rewards wind/bash abilities that shove enemies off cliffs ([GameFAQs fall damage](https://gamefaqs.gamespot.com/boards/313526-triangle-strategy/79932600)). Evo-Tactics has `attack_push` as an effect_type but no terrain consequence beyond movement. Wire **elevation delta ≥ 2 → damage** in `hexGrid.js` + `resolveAttack` and positioning gains a whole new axis. Effort **S**.
7. **Wait / speed-20%-boost hold-turn mechanic**. In TS, skipping action raises next-turn speed by ~20% ([Game8 basics](https://game8.co/games/Triangle-Strategy/archives/368789)). Maps 1:1 onto our `initiative + action_speed - status_penalty` formula. A **"Guard / Hold"** action that trades this turn for +20% initiative next round teaches tempo without new UI. Effort **S**.
8. **Class promotion + signature TP-spending abilities** (Benedict "Twofold Turn", Julio "Moment of Truth", etc.) ([GameSkinny class promotion](https://www.gameskinny.com/tips/triangle-strategy-class-promotion-system-explained/), [Game Rant best to promote](https://gamerant.com/triangle-strategy-best-units-to-promote/)). Our XCOM EU/EW pattern (7 Jobs × 6 Levels × 2 Perks) already exists — **TS-style "capstone signature"** at rank 6 (a single named ability that reshapes play) is the final identity hook Pilastro 3 needs. Effort **M**.
9. **Information gathering unlocks persuasion dialogue**. Exploring the hub lets you find evidence that **unlocks new dialogue options** at the vote ([Game8 persuasion](https://game8.co/games/Triangle-Strategy/archives/369430)). Evo-Tactics debrief (M19) currently shows a narrative log; this becomes the hub where **found evidence = Conviction argument tokens** for the next `world_setup` vote. Effort **M**.
10. **Objective variety beyond "kill all"** — escort, seize, survive N turns, protect VIP, interactive map props (minecart, bridge, zipline) ([Nintendo Life tactical tips](https://www.nintendolife.com/guides/triangle-strategy-tips-and-battle-tactics-walkthrough-tactical-points-phases-kudos-quietuses-guide), [Game Informer review](https://gameinformer.com/review/triangle-strategy/powerful-conviction-shines-over-dark-times)). `objectiveEvaluator.js` already has a polymorphic interface — we just need 4 more objective types to dissolve the current "N=30 win rate" playtest trap. Effort **M**.

> **Headline**: 7 of 10 items land in Effort **S/M**, three cluster of them (Conviction surfacing + voting + info-unlock) form a single coherent "narrative layer" PR that closes Pilastro 4 _and_ reinforces Pilastro 5. This is where I'd start.

---

## Table of contents

1. [Method & sources note](#method--sources-note)
2. [Mechanic 1 — Conviction system (Utility / Morality / Liberty)](#mechanic-1--conviction-system-utility--morality--liberty)
3. [Mechanic 2 — Scales of Conviction (party vote + persuasion)](#mechanic-2--scales-of-conviction-party-vote--persuasion)
4. [Mechanic 3 — Tactical combat: elevation, facing, flanking, follow-up](#mechanic-3--tactical-combat-elevation-facing-flanking-follow-up)
5. [Mechanic 4 — Terrain interaction & weather (fire/ice/water/lightning)](#mechanic-4--terrain-interaction--weather-fireicewaterlightning)
6. [Mechanic 5 — Push / knockback & fall damage](#mechanic-5--push--knockback--fall-damage)
7. [Mechanic 6 — Character classes & promotion system](#mechanic-6--character-classes--promotion-system)
8. [Mechanic 7 — Initiative / turn order (Wait / CT / Speed)](#mechanic-7--initiative--turn-order-wait--ct--speed)
9. [Mechanic 8 — AI behavior & readability](#mechanic-8--ai-behavior--readability)
10. [Mechanic 9 — Level design & objective variety](#mechanic-9--level-design--objective-variety)
11. [Mechanic 10 — Information gathering → unlock persuasion](#mechanic-10--information-gathering--unlock-persuasion)
12. [Risk register & what _not_ to copy](#risk-register--what-not-to-copy)
13. [Suggested rollout — 3 sprint slices](#suggested-rollout--3-sprint-slices)
14. [Pilastri impact matrix](#pilastri-impact-matrix)
15. [Sources](#sources)

---

## Method & sources note

The user-provided YouTube URL ([kOnxfP5zRIM](https://www.youtube.com/watch?v=kOnxfP5zRIM)) is a community unit guide titled _"Triangle Strategy COMPLETE Unit Guide - All Recruitments, Skills and Weapon Trees Explained!"_. WebFetch only returned the page chrome (no transcript), so this plan was built from **12 independent authoritative sources** instead — Nintendo, Square Enix dev interviews, Fandom wiki, Game8 walkthrough, RPGSite review, Nintendo Life tips, Digital Trends, Kotaku, Game Informer, Fextralife, Pro Game Guides, Neoseeker.

Where a claim about a numeric value appears in only one source (e.g. frozen tile movement cost 1.2, accuracy −10%), it is tagged as _"single-source; verify before shipping"_ in the corresponding mechanic section.

The plan deliberately **does not modify code** — it only maps TS mechanics onto Evo-Tactics runtime files that already exist. The file paths used (`apps/backend/services/...`) were verified via the repo's current tree; line numbers are not pinned because the point here is design, not refactor.

---

## Mechanic 1 — Conviction system (Utility / Morality / Liberty)

### Mechanic

Triangle Strategy tracks three hidden numeric values on the protagonist Serenoa — **Utility** (logic, self-preservation), **Morality** (ethical correctness), **Liberty** (freedom, risk) — raised by dialogue picks across the game. The axes are **color-coded** in every dialogue (yellow / green / red) so the player reads them in real time, and thresholds in each axis **unlock both recruitable characters and persuasion dialogue options** at branch points ([Fandom Conviction](https://triangle-strategy.fandom.com/wiki/Conviction), [Pro Game Guides](https://progameguides.com/project-triangle-strategy/utility-morality-and-liberty-explained-how-to-choose-the-right-answers-in-triangle-strategy/), [iMore](https://www.imore.com/triangle-strategy-conviction-how-gain-points-morality-utility-and-liberty)).

There are **30 recruitable characters across 4 playthroughs** and **4 endings**, with the endings gated on which axis dominates plus a Golden Route that requires specific flags ([Gameranx recruitment](https://gameranx.com/features/id/291896/article/triangle-strategy-how-to-unlock-all-the-bonus-characters-conviction-guide/), [Game8 Golden Route](https://game8.co/games/Triangle-Strategy/archives/370301)).

### Why it works in Triangle Strategy

The three axes are **small enough to remember** (vs Mass Effect's paragon/renegade binary it adds one dimension; vs D&D's 9-cell alignment grid it removes seven) and they are **visible at every choice**, so the player builds an identity they can actually narrate back. The hidden numeric values plus the **"you can only check your scores in NG+"** rule force first-playthrough commitment instead of save-scumming ([The Gamer strengthen](https://www.thegamer.com/triangle-strategy-strengthen-raise-convictions-guide/)).

### Transfer to Evo-Tactics

Evo-Tactics already has **4 MBTI axes + Ennea slot** computed in [`apps/backend/services/vcScoring.js`](../../apps/backend/services/vcScoring.js), with YAML at [`data/core/thoughts/mbti_thoughts.yaml`](../../data/core/thoughts/mbti_thoughts.yaml) and [`data/core/forms/mbti_forms.yaml`](../../data/core/forms/mbti_forms.yaml). Audit from 2026-04-20 marks Pilastro 4 🟡 because **axes accrue but the player barely sees them** — we ship a dimension the user never experiences.

**Proposal A — TS-style color-coded axis reveal (Effort S)**:

- At every player choice that feeds `vcScoring` (combat intents, debrief dialogue, pack roll), emit a **diegetic badge** (E/I, S/N, T/F, J/P, plus Ennea) on the UI. Reuse the existing Thought Cabinet pattern from Disco Elysium (already researched in `docs/planning/EVO_FINAL_DESIGN_*.md`).
- Gate **1-2 form options in `formsPanel.js` per axis threshold** (identical to TS recruitment gates). This turns `FormEvolutionEngine.evaluate()` in `apps/backend/services/forms/formEvolution.js` from a pure math check into a narrative reveal.

**Proposal B — "First-playthrough commitment" rule (Effort S)**:

- Keep numeric axis totals **hidden until `campaign.outcome === 'ended'`** (end of run). Show a qualitative tier ("Calm / Tense / Driven") during play. Post-run, reveal exact numbers in the debrief — this mirrors TS's NG+ reveal and dramatically raises re-play motivation.

**Proposal C — recruit gating on MBTI thresholds (Effort M)**:

- Hook character-unlock logic in `formSessionStore.js` to accept `requires.mbti.{axis}.{min|max}` shape in the form YAML. Example: the **"Campione Liberista"** form requires `liberty >= threshold_high` (from TS's Liberty-locked recruits).

### Effort

- Proposal A: **S** (<4h) — UI badge + YAML mapping.
- Proposal B: **S** (<4h) — gate one API response field.
- Proposal C: **M** (4-16h) — schema change + 3 forms re-tagged + test.

### Risk

- **Over-exposure**: if every choice flashes a badge, players start min-maxing instead of role-playing. Mitigation: TS only colorizes **narrative** choices, not combat. Keep `vcScoring` emissions from _combat intents_ internal; only surface at **debrief prompts and pack rolls**.
- **MBTI is 4 axes not 3**: TS is 3 axes on purpose (ternary scales). Our 4 axes + Ennea risk overwhelm; Proposal A should **phase the reveal** (one axis per chapter for the first 4 chapters — Disco Elysium does this exact pacing).
- **Gate exclusion frustration**: if a form is permanently locked by a single bad choice, players resent it. TS softens this with New Game+ carryover; we should follow suit via `campaign` meta-progression (already scaffolded in M12 Phase D).

---

## Mechanic 2 — Scales of Conviction (party vote + persuasion)

### Mechanic

At major story forks, TS stages a **Scales of Conviction** meeting where **seven core companions cast votes** on a binary choice (go to Aesfrost vs Hyzante, etc.). The protagonist **does not vote**, but can **break ties** and **persuade holdouts in dialogue** before the count ([Kotaku](https://kotaku.com/triangle-strategy-square-enix-scales-of-conviction-vote-1848657909), [Game Rant Scales](https://gamerant.com/triangle-strategy-scales-of-conviction-mechanic-explained/), [Fandom Voting](https://triangle-strategy.fandom.com/wiki/Voting)).

Persuasion attempts:

- Each holdout offers a 3-option dialogue; **picking the option aligned with the companion's dominant Conviction** plus **having enough Serenoa Conviction score** succeeds.
- Some options are **locked** until you gathered specific **Information** in exploration (see Mechanic 10).
- **One-shot per companion** — you cannot retry after a failed attempt ([Game8 persuasion](https://game8.co/games/Triangle-Strategy/archives/369430), [Neoseeker voting](https://www.neoseeker.com/triangle-strategy/tips/Voting_Basics)).

The system surfaces the social layer of a tactical RPG as **its own mini-game** — arguably _the_ defining mechanic of Triangle Strategy.

### Why it works in Triangle Strategy

It solves the JRPG "silent protagonist" problem diegetically (he does not vote because he respects the council), it **makes story branching feel earned** (you literally negotiated it), and it **amplifies the Conviction system** by giving it an obvious, dramatic output. The one-shot rule creates tension instead of save-scumming.

### Transfer to Evo-Tactics

**We already have 80% of this infrastructure**.

- **M18 `world_setup` phase** already collects votes in `apps/play/src/worldSetup.js` + phase machine (see [`docs/process/sprint-2026-04-26-M16-M20-close.md`](../process/sprint-2026-04-26-M16-M20-close.md)). Current model: each player casts 1 vote, majority wins.
- **Co-op is 2–8 players** (`data/core/party.yaml`), so the cabinet metaphor maps directly onto Jackbox-style phone voting (M11 network stack already live — `apps/backend/services/network/wsSession.js`).

**Proposal — "Scales of Conviction" upgrade to world_setup (Effort M)**:

1. **Weighted vote by Conviction alignment**. Each player-character carries a dominant MBTI/Ennea tag. A motion tagged `utility`/`morality`/`liberty` (re-labeled E_I/S_N/T_F for Evo-Tactics) gets **+0.5 vote weight** when the player's dominant axis matches. The protagonist-equivalent in co-op (host) can be granted **tie-breaker** authority by config (`party.yaml` toggle).
2. **Persuasion sub-phase** (pre-vote, 60-second timer). Each player sees the other players' declared stances. One player may attempt **one persuasion DM** directed at one holdout — the holdout's client shows a 3-option dialogue; if the picker choice matches the holdout's Ennea, the holdout **flips vote**. This is the exact TS flow, running over the existing `LobbyClient` intent channel.
3. **Information gating**. Before world_setup, M19 debrief already shows a **narrative log**. Tag narrative events with `info_flag:*` and stash on the player's `campaignStore.infoFlags`. When a persuasion dialogue option requires `info_flag:x` and the persuader's character owns it, **unlock the option**. Exactly the TS pattern ([Game8 information](https://game8.co/games/Triangle-Strategy/archives/369345)).

**Pseudocode anchor**:

```js
// apps/backend/services/session/worldSetupVote.js (new)
function tallyWeightedVotes(votes, motion, players) {
  return votes.reduce((sum, v) => {
    const p = players[v.playerId];
    const align = p.mbti.dominant === motion.axis ? 0.5 : 0;
    return sum + (v.choice === 'yes' ? 1 + align : -1 - align);
  }, 0);
}
```

3. **One-shot rule** — once a persuasion is made on a target, lock retry for that motion (TS copy-paste). Store in `session.persuasionAttempts[motionId][targetId]`.

### Effort

- **M** (4-16h). Breakdown: 2h weighted vote, 4h persuasion UI (phone popup + host dispatch), 2h info_flag wiring, 2-4h tests (voting correctness + timer timeout).

### Risk

- **Democracy fatigue**: 3+ vote phases per session risk slowing the game. Limit to **1 vote per campaign chapter** (TS does one per chapter). Use [`apps/backend/services/campaign/campaignEngine.js`](../../apps/backend/services/campaign/campaignEngine.js) for gating.
- **Sore-loser problem**: voted-down players sulk. Mitigate with **defeated-side XP bonus** ("the argument was convincing, you learn from it") — copy Tactics Ogre's post-battle conversations pattern.
- **One-shot rule vs co-op miscommunication**: in Jackbox-style play it is easy to misclick. Add **2-second confirm tap** before finalizing persuasion pick.
- **Weight tuning**: +0.5 alignment bonus is the single most balance-sensitive number. Calibrate with 10-game batch via `tools/py/batch_calibrate_*.py` pattern.

---

## Mechanic 3 — Tactical combat: elevation, facing, flanking, follow-up

### Mechanic

Four layers of positional math, all visible on the board at all times:

- **Elevation**: attacking from higher elevation grants **+30% damage** (and archers gain range advantage from height) ([Grokipedia](https://grokipedia.com/page/Triangle_Strategy), [Fextralife](https://fextralife.com/triangle-strategy-beginner-guide-pc-release/)).
- **Facing**: hitting an enemy from **behind guarantees a critical**; flank (side) attack is also boosted ([Nintendo Life](https://www.nintendolife.com/guides/triangle-strategy-tips-and-battle-tactics-walkthrough-tactical-points-phases-kudos-quietuses-guide), [Digital Trends](https://www.digitaltrends.com/gaming/triangle-strategy-beginner-guide/)).
- **Pincer / follow-up**: if two allies occupy **opposite-side adjacent tiles** of an enemy, the first attack triggers a **free follow-up** from the other ally ([RPG Site](https://www.rpgsite.net/review/12464-triangle-strategy-review), [Fanbyte tips](https://www.fanbyte.com/legacy/triangle-strategy-tips-guide-things-the-game-doesnt-tell-you), [GameFAQs principle of combat](https://gamefaqs.gamespot.com/switch/313526-triangle-strategy/faqs/79838/principle-of-combat)).
- **Mutual application**: enemies use the same math against the player — if you get flanked, you take the crit.

### Why it works in Triangle Strategy

The four rules are **legible within one turn** (a new player infers them from the tooltip after their first attack). The combined math makes **positioning the primary form of damage**, rather than leveling or equipment — FFT's core insight, re-stated cleanly. The symmetric "enemies do it too" rule turns every formation into a double-edged choice.

### Transfer to Evo-Tactics

Current state of our combat stack:

- **Hex grid**: `apps/backend/services/grid/hexGrid.js` already has axial coords, LOS, A\*, flood-fill.
- **Facing**: not yet modeled (units are omnidirectional). Rear-crit is implemented in the rules engine for _some_ abilities but not as a positional default.
- **Flanking**: `squadSync focus_fire` gives +1 damage when 2+ players target the same enemy in a round — conceptually close but **not position-aware**.
- **Elevation**: `packs/evo_tactics_pack/data/balance/terrain_defense.yaml` has 3 levels, used as defense modifier in `resistanceEngine.js`. No attack-side bonus.

**Proposal A — elevation as symmetric attacker bonus (Effort S)**:

Add `elevation_attack_bonus: 0.30` to [`terrain_defense.yaml`](../../packs/evo_tactics_pack/data/balance/terrain_defense.yaml). In `apps/backend/services/combat/resistanceEngine.js` (or the Node attack resolver), compute `attacker.hex.elevation - target.hex.elevation >= 1 ? dmg * 1.30 : dmg`. Single-digit change in 2 files, 3 test cases.

**Proposal B — pincer = auto follow-up (Effort S)**:

Add a `detectPincer(attackerHex, targetHex, allies)` helper in `hexGrid.js`. Opposite-side rule on hex: pick the 3 antipodal-pair directions (in axial, the pairs are ±q, ±r, ±(q+r)). For each pair, check if an ally sits on the "opposite" tile from attacker relative to target. If yes, append a **follow-up attack intent** to the round queue via `roundOrchestrator.pushFollowup()`.

This closes TKT-09 too — a follow-up attack naturally emits `ai_intent_distribution` because it appears in the queue as a real intent.

**Proposal C — facing & rear crit (Effort M)**:

Adding facing means every unit has a `facing: 0..5` (hex has 6 directions). Mutations:

- `roundOrchestrator` sets `facing = direction_moved` after each `move_*` action. Idle units keep previous facing.
- `resolveAttack(attacker, target)`: `relative = (atk_to_tgt_dir - target.facing + 6) % 6`. `relative === 3` → rear → auto-crit; `relative in [2, 4]` → flank → +15% dmg.
- UI: `apps/play/src/` render a small arrow on each token. Pre-built Mission Console bundle will need a fallback SVG overlay until bundle is rebuilt.

### Effort

- Proposal A: **S**.
- Proposal B: **S**.
- Proposal C: **M** (biggest cost is UI; backend is maybe 3h).

### Risk

- **Double-dipping**: pincer + rear crit + elevation all at once creates 2.3× damage spikes that one-shot units. Cap with a multiplicative ceiling (`min(stacked_mult, 2.0)`) or make them **alternatives** not stackers (TS-style: pincer prevents elevation bonus because the follow-up attacker is adjacent, usually same elevation — emergent balance).
- **Facing & AI readability**: enemies on "Apex" pressure tier will start rotating to face threats, which may feel unfair. Add a pre-round **facing telegraph** in the TV view (show each enemy's facing arrow clearly). TS achieves this because its AT bar also shows facing implicitly via the portrait orientation.
- **Pincer on hex**: hex has 6 directions not 4; "opposite side" is **unambiguous** (only 3 antipodal pairs). Actually _easier_ than TS's square grid where flanking-diagonally is edge-cased.
- **Rear-crit feels unfair** to AI-controlled Sistema which has imperfect positioning. Disable rear-crit _against_ Sistema enemies for the first 2 chapters; introduce at Chapter 3 ("Calibration" pressure tier) like TS ramps up difficulty in Chapter 5+.

---

## Mechanic 4 — Terrain interaction & weather (fire/ice/water/lightning)

### Mechanic

Terrain in TS is an **active combat surface**:

- **Fire tiles** damage anyone standing/passing.
- **Frozen tiles** reduce movement and accuracy (**-10% hit, movement cost 1.2** — single-source, verify) ([VGKami terrain](https://vgkami.com/triangle-strategy-all-terrain-effects/)).
- **Water puddles** are neutral _until_ lightning hits them — then they **chain-damage everyone standing in water**, including allies ([Game8 terrain](https://game8.co/games/Triangle-Strategy/archives/369610)).
- **Elemental conversions**: fire melts ice → creates water; fire on water → evaporates; lightning on water → shock chain ([Nintendo tactical tips](https://www.nintendo.com/au/news-and-articles/ten-tactical-tips-for-triangle-strategy-tm/)).
- **Weather**: rain suppresses fire damage, some scenarios change weather mid-battle ([Grokipedia](https://grokipedia.com/page/Triangle_Strategy)).
- **Divine Protections**: equipment grants elemental affinity that interacts with the tile system.

### Why it works in Triangle Strategy

Elemental interaction is **the highest-leverage emergent tactic** in TS: a 3-step combo (melt → electrify → shove enemy into puddle) can delete an encounter. Crucially, the chain reactions are **player-initiated**, not script-driven, so every encounter is a **physics sandbox** rather than a scripted puzzle.

### Transfer to Evo-Tactics

Our channel resistance engine (`apps/backend/services/combat/resistanceEngine.js`) already models fire/water/lightning/ice as damage types. What is missing is **the tile state** and **state transitions**.

**Proposal — Tile State Machine (Effort M)**:

1. Add a `tileState` map keyed by hex coord, stored per session in `hexGrid` state:
   ```
   tileState[q,r] = { type: 'normal' | 'fire' | 'ice' | 'water' | 'electrified' | 'hazard',
                      ttl: integer_rounds, source_actor: id }
   ```
2. Elemental abilities set tile state on their target hex. Example: `archetype=cryo` AoE → 3 tiles `ice`, ttl=2.
3. **Transition rules** (new file, `apps/backend/services/combat/tileReactions.js`):
   - `fire` on `ice` → `water`, apply 1 dmg to occupants (steam burst).
   - `fire` on `water` → `normal` (evaporate), no damage.
   - `lightning` on `water` → `electrified`, apply shock to all occupants of connected water tiles (BFS via `hexGrid.flood()`).
   - `fire` on `normal_grass` → `fire` (burn tile), 1 dmg/round to occupants.
4. **Weather** as **global tile modifier** (session-level flag). `weather: 'rain'` halves fire damage, extends water tile lifetime, boosts lightning chain range. Reuse `biomeSpawnBias.js` pattern: YAML-driven weather × biome table.
5. **Friendly fire on shock chain**: copy TS explicitly ("even from ally caster"). This is the key design commitment — it forces real teamwork and turns lightning from "free nuke" to "plan it".

### Effort

- **M** (4-16h). Biggest cost: chain-reaction BFS + the `tileState` persistence (round-end TTL decrement, must hook `sessionRoundBridge.handleTurnEndViaRound`).

### Risk

- **Emergent griefing** in co-op: one player electrifies the puddle their teammate is standing in. This is a **feature** (teamwork required) but needs UI telegraphing — show a **"will shock: Ally A, Ally B, Enemy C"** tooltip before confirm, exactly as TS does.
- **Fire + forest biome**: if fire spreads forever we get TotK bombisher runaway. Cap: **fire tiles do not propagate**; only the direct target hex ignites. TS does the same.
- **Balance**: electrified-water AoE + pincer stacking is the "infinite damage" meta of TS itself ([RPG Site](https://www.rpgsite.net/review/12464-triangle-strategy-review) calls this out). Cap chain to **5 tiles** via BFS depth limit.
- **Status effect YAML sprawl**: new tile states require 6-10 YAML entries. Put them in a single `data/core/balance/tile_reactions.yaml` file with schema in `packages/contracts/schemas/tile.schema.json` — avoid fragmentation across biome/trait files.
- **Rule of 50**: this is >50 LOC. Per CLAUDE.md guardrail, this must be split across explicit PRs (state + transitions + weather + UI = 4 slices).

---

## Mechanic 5 — Push / knockback & fall damage

### Mechanic

TS has ability categories that **displace** targets:

- **Wind abilities** push targets N tiles in a direction ([GameFAQs push cliff](https://gamefaqs.gamespot.com/boards/313526-triangle-strategy/79932600)).
- **Fall damage**: pushed off a ledge → damage scaled by fall height. Additionally **collision damage** if rammed into a wall or another unit, including friendly fire ([Fanbyte tips](https://www.fanbyte.com/legacy/triangle-strategy-tips-guide-things-the-game-doesnt-tell-you)).
- **Synergies**: combine push with pre-placed traps for multi-step combos.

### Why it works in Triangle Strategy

Positioning graduates from "2D adjacency" to "3D vector". The combo of **push + pre-placed lava/ice/trap** creates a **one-move kill window** that feels FFT-esque. Also levels the playing field against tanky late-game enemies: a cliff negates all HP math.

### Transfer to Evo-Tactics

We already have `effect_type: attack_push` in abilities (M2 sprint shipped 18/18 effect types, see session context). Missing: **terrain consequence**.

**Proposal — ledge damage + collision damage (Effort S)**:

1. In `apps/backend/services/grid/hexGrid.js`, expose `resolvePush(fromHex, direction, distance) → { finalHex, fallDamage, collisionBlocked }`. Algorithm: step tile-by-tile; if elevation drops ≥ 2 between step N and N+1, **stop at N+1** with `fallDamage = (elevationDelta - 1) * baseFallDmg`. If step N+1 is occupied or impassable → `collision`, stop at step N with `collisionDamage = remainingDistance * baseColDmg` applied to **both** colliders.
2. In combat resolver, after `attack_push` effect fires, call `resolvePush`; append `fallDamage` to the damage event, emit `status_event: collision` for any second collider.
3. Reuse `terrain_defense.yaml` for `elevation` field; add new file `data/core/balance/push_rules.yaml` with `baseFallDmg`, `baseColDmg`, `ledge_threshold`.

### Effort

- **S** (<4h). Helpers pure, tested without backend.

### Risk

- **Boss cheese**: pushing a boss off the only ledge wins the fight in one turn — TS has this issue (push Avlora off in Chapter 17 bypasses the fight). Mitigation: flag boss units `immune_to_push` on datasheet (TS does this for late-game elite units).
- **Frozen-in-place units**: abilities that push allies into a wall then kill them via collision is a legit combo but catastrophic on a misclick. Add a **2-second confirmation** if push would place an _ally_ in collision damage ≥ 30% hp.
- **Hex push direction**: unlike TS squares (4 cardinals), hex has 6. Push direction should be **"away from attacker"** (project attacker→target ray onto nearest of 6 hex directions). Test with edge cases (attacker orthogonal to target).

---

## Mechanic 6 — Character classes & promotion system

### Mechanic

TS has **~20 playable classes**, each with 2 promotion tiers (Elite → Advanced → Master-tier via **Medals of Valor/Bravery** bought with Kudos at the Sundry shop) ([GameSkinny class promotion](https://www.gameskinny.com/tips/triangle-strategy-class-promotion-system-explained/), [Game Rant best to promote](https://gamerant.com/triangle-strategy-best-units-to-promote/), [Screen Rant best abilities](https://screenrant.com/triangle-strategy-best-abilities-unlock-first-guide/)).

Each class has:

- **Stat growth curves** (Str/Mag/Def/MDef/Spd/HP).
- **Ability tree** unlocked by weapon upgrade level (materials: stone, timber, fiber farmed from battles) ([GameSkinny weapons](https://www.gameskinny.com/tips/triangle-strategy-how-to-upgrade-weapons/)).
- **Signature capstone abilities** at top rank (Benedict → _Twofold Turn_ = ally acts twice; Julio → _Moment of Truth_ = TP generator; Trish → _Treasure and TP_ passive).

TP (Tactical Points) economy: **+1 TP per turn**, basic attacks free, skills cost 1-4 TP, heavy ultimates cost 6+ TP accumulated across turns ([Fextralife](https://fextralife.com/triangle-strategy-beginner-guide-pc-release/)).

### Why it works in Triangle Strategy

- **Identity-forming**: each class has **one capstone that reshapes play**. Benedict's Twofold Turn is the reason you pick Benedict — it is _the_ definition of a game-warping ability.
- **Growth visible**: materials + promotions are an active choice lever, not a passive level-up. Feels XCOM.
- **TP economy is the clock**: forces you to plan 3-4 turns ahead.

### Transfer to Evo-Tactics

We already shipped **7 Jobs × 6 Levels × 2 Perks = 84 perks** (M13 P3, `apps/backend/services/progression/progressionEngine.js`, [`data/core/progression/perks.yaml`](../../data/core/progression/perks.yaml)). This is already an XCOM EU/EW-style system. What is **missing**:

- **Signature capstone abilities** at level 6 rank (currently level 6 perks are additive bonuses, not reshaping abilities).
- **TP-equivalent economy**. Evo-Tactics uses `action_points` (AP, 2/turn); this is healthy but flat. No accumulating resource.

**Proposal A — Capstone signature ability at rank 6 (Effort M)**:

Add a new field `signature_ability_id: "..."` to the level-6 perk slot in [`perks.yaml`](../../data/core/progression/perks.yaml). Example signatures (brainstormed per our 7 jobs):

| Job     | Signature               | Effect                                                 |
| ------- | ----------------------- | ------------------------------------------------------ |
| Bulwark | _Adamant Call_          | Once/battle: all adjacent allies gain shield 5hp 2rd.  |
| Striker | _Twin Lightning_        | After a kill, immediate follow-up attack on any enemy. |
| Hunter  | _Concealed Volley_      | Attack ignores cover + LOS for 1 turn.                 |
| Mender  | _Consecrate Hex_        | Place a 3-round heal-aura tile (3hp/round).            |
| Mystic  | _Elemental Convergence_ | Cast any 3 elements this turn as a single combo cast.  |
| Scout   | _Phase Run_             | Move 2× range, ignoring terrain and OA.                |
| Warden  | _Overwatch Net_         | Reaction on any enemy moving within 3 tiles for 1 rd.  |

Signatures should **cost 1 SG** (Strategy Gauge, 2026-04-26 Vision Gap V5 system) so they feel ultimate and scarce. SG already caps at 3 with mixed earn formula — a once-per-battle signature is the perfect sink.

**Proposal B — TP-like accumulating resource as "SG but personal" (Effort L)**:

This is bigger — introduce **CP (Combat Points)** per unit, accumulating 1/turn, cap 3, reset on KO. Signature abilities cost 2 CP, standard abilities cost 1 CP, basic attacks free. Supersedes current AP model partially.

**This is a large refactor** (touches every ability, every test, every UI) and is not worth it if the current AP=2 model works. **Recommend B deferred** until end-of-M13 playtest signals AP is flat — SG + AP may be enough.

### Effort

- Proposal A: **M** (8-12h, includes 7 signature abilities written + 7 × 2 tests).
- Proposal B: **L** (16+h, full economy overhaul).

### Risk

- **Capstone balance = the game**: signatures _are_ the identity. One overpowered signature (Twin Lightning stacking with pincer + elevation) breaks balance. Calibrate with `batch_calibrate_hardcore_*.py` pattern, target win rate 30-50% on hardcore 06/07.
- **Reading the signatures** in co-op: 7 jobs × 1 signature = 7 unique "big buttons". Fine on phones. Add a pre-battle briefing card in M16 character_creation phase.
- **TS signatures are 30 classes not 7**: we have fewer jobs, so our signatures **must be more distinct**. No two signatures should share a keyword.

---

## Mechanic 7 — Initiative / turn order (Wait / CT / Speed)

### Mechanic

TS uses a **speed-driven AT Bar** (Action Turn Bar) at the bottom of the screen, same tradition as FFT's CT system:

- Each unit has a **Speed stat**. Units with higher speed act sooner and more often ([GameFAQs turn order](https://gamefaqs.gamespot.com/boards/313526-triangle-strategy/79936713)).
- The **AT Bar is fully visible**: upcoming N turns telegraphed ([Game8 basics](https://game8.co/games/Triangle-Strategy/archives/368789)).
- **Wait action**: if you do not move/act, **next turn comes ~20% sooner** (speed × 1.2 for one cycle) — a tempo-shift tool.
- Turn economy: **2 actions/turn** (move + attack typically) ([Grokipedia](https://grokipedia.com/page/Triangle_Strategy)).
- Spells/heavy arts have **no charge-time delay** in TS (unlike FFT's CT-cost spells) — a simpler model.

### Why it works in Triangle Strategy

Full AT Bar visibility is a **readability masterstroke**: players **see** when the boss will act next and plan 3-4 turns ahead. The Wait-for-speed-boost tempo lever rewards patience and creates "save my turn for next round" micro-decisions.

### Transfer to Evo-Tactics

Our round orchestrator computes `initiative + action_speed - status_penalty` (per CLAUDE.md round model). Three gaps vs TS:

1. **AT Bar is not fully surfaced**. We have per-turn order but the "next 8 activations" future is not drawn in the UI.
2. **No Wait/Guard action** that trades action for speed.
3. **Charge-time spells** (FFT legacy) not modeled — we resolve all abilities instantly.

**Proposal A — AT Bar visualization (Effort S, UI-only)**:

Surface in `apps/play/src/` (main.js + canvas) the **next 8 turn slots** as a horizontal ribbon with unit portraits. `GET /api/session/round/preview` endpoint exposes the next N activations (already implicit in `roundOrchestrator`). Pure UI, no backend schema change.

**Proposal B — Wait / Guard action (Effort S)**:

Add a new `action_type: "wait"` intent. On resolution in `roundOrchestrator`:

- Unit does nothing this turn.
- Unit's next-round initiative gets **+20%** bonus (one-shot, clears after that activation).
- Additionally, unit is `status: guarded` for this round → incoming damage −20%. (Double-reward to make it worth skipping.)

This makes the **pressure tier** stakes more interesting: Sistema at Apex pressure will interrupt, so a player waiting gains speed AND defense but concedes tempo — genuine trade.

**Proposal C — Charge-time spells / Overwatch ramp (Effort M)**:

For heavy abilities (cost ≥ 3 of our new CP or ≥ 1 SG), introduce a **charge phase**:

- Turn T: declare. Unit enters `status: charging`, ability effect queued.
- Turn T+1 (at unit's next activation): effect resolves. Can be **interrupted** by damage received above threshold.

This is the FFT spell-charge pattern. Higher risk/reward. Only worth it for **a handful of abilities** (probably 2-3 per job).

### Effort

- A: **S** (<4h).
- B: **S** (<4h).
- C: **M** (8-12h, includes interrupt system).

### Risk

- **AT Bar spoils strategy**: some roguelikes / tactics games (Into the Breach) show _enemy_ intents, which is the real clarity. TS shows order only; intents remain hidden. Follow TS here (our `declareSistemaIntents.js` already stays private to AI).
- **Wait-meta**: in TS, a "wait-wait-wait-big ultimate" loop is sometimes optimal, feels degenerate. Cap: same unit cannot Wait two rounds in a row.
- **Charge-interrupt** adds complexity. Skip unless playtest signals tempo is flat.

---

## Mechanic 8 — AI behavior & readability

### Mechanic

TS's AI is **notably predictable**, which is a double-edged design choice:

- **Targets lowest-defense unit in range** ([Steam 100% Conviction Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2984474233)).
- **Does not use status-only abilities** (only uses status if the ability also deals damage).
- **Does not heavily punish separation** — it tends to dogpile the same target.
- **Difficulty comes from numeric advantage** (more enemies, higher level, pre-buffed), not AI intelligence.

Critics have noted this explicitly: "AI easily downs fighters that get separated, but loses comprehensively when the same group works as a unit" ([GameFAQs enemy AI](https://gamefaqs.gamespot.com/boards/313526-triangle-strategy/79937601), [GameSkinny review](https://www.gameskinny.com/xp6sd/triangle-strategy-review-triple-threat)).

### Why it works (or does not) in Triangle Strategy

Predictability = readability = **player fairness**. Triangle Strategy trades AI sophistication for **transparent threat assessment** — new players can learn "protect your mage" in one battle. The AT Bar + predictable AI together make the tactical layer legible. The downside: veterans feel underchallenged on Hard difficulty.

### Transfer to Evo-Tactics

We have a more sophisticated AI already:

- `declareSistemaIntents.js` generates multiple candidate intents.
- `utilityBrain.js` (sessione 2026-04-20) with 7 considerations × 3 difficulty profiles.
- `ai_intent_scores.yaml` data-driven.
- Pressure tier gates (Calm → Apex).

**Proposal A — "Visible threat highlight" à la TS (Effort S)**:

Keep our AI logic, but **pre-commit and display** on the TV view a **"Target threat preview"**: for each enemy, show their **likely target next turn** (via a cheap heuristic: lowest-defense-in-range target of the likely intent). This is **readability not dumbing-down** — full utility score remains hidden, only the top-1 target is telegraphed.

Implementation: `roundOrchestrator.previewThreats() → [{ enemy_id, likely_target_id, confidence }]`. Expose via `/api/session/state` alongside existing `warning_signals`.

**Proposal B — Difficulty tier = hide-or-show the threat preview (Effort S)**:

- Easy: show 100% of threat previews, clear icons.
- Normal: show for enemies on "Calm" or "Tense" pressure only; Apex enemies hide their target.
- Hard: hide all threat previews. Compensate with stronger AI (already have utility brain profile `hard`).

This mirrors Into the Breach's difficulty model (always-visible intents, difficulty comes from emergent composition not info hiding) on Easy/Normal, but falls back to FFT-style fog on Hard.

**Proposal C — Predictability as identity for Sistema archetypes (Effort M)**:

Per `ai_profiles.yaml` assign each Sistema archetype a **narrative AI behavior** that matches its designed flaw — e.g. "Apex Boss always targets the player who hit it last" (revenge profile), "Swarm units always cluster" (vulnerable to AoE on purpose), etc. Players learn to exploit each archetype's tell — a design lesson TS teaches by accident.

### Effort

- A: **S** (<4h backend + UI stub).
- B: **S** (config toggle).
- C: **M** (author ~6 archetype behaviors).

### Risk

- **Gameified vs realistic AI**: telegraphing reduces the AI's emergent unpredictability. Acceptable trade-off in co-op where 2-8 humans already have coordination chaos; they don't need AI chaos too.
- **Auto-targeting exploit**: if AI always targets lowest defense, players stack everyone behind a Bulwark. That is fine (TS plays this way) as long as positioning still matters (elevation, pincer, facing). Combines well with other proposals.

---

## Mechanic 9 — Level design & objective variety

### Mechanic

TS maps offer:

- **Objective variety**: _defeat boss_, _survive N turns_, _seize area_, _protect NPC_, _escort_, _lower a bridge_, _clear a path_ ([Nintendo Life](https://www.nintendolife.com/guides/triangle-strategy-tips-and-battle-tactics-walkthrough-tactical-points-phases-kudos-quietuses-guide), [RPGFan review](https://www.rpgfan.com/review/triangle-strategy/)).
- **Verticality**: multi-level maps (mine, cathedral, fortress).
- **Interactive props**: zipline between two boats, minecart tracks, destructible bridges, switches ([Game Informer review](https://gameinformer.com/review/triangle-strategy/powerful-conviction-shines-over-dark-times)).
- **Fog/vision** not heavily used; most TS maps are fully visible.
- **Kudos+Quietus bonus objectives** per battle (optional).

### Why it works in Triangle Strategy

Objective variety prevents the "N=30 win rate" loop and **rewards different team compositions** on different maps (escort missions need healers; survive missions need Bulwarks). Interactive props give a **per-map mechanic** — each battle has its own gimmick — which is memorable even if the gimmick is one-shot.

### Transfer to Evo-Tactics

We already have [`apps/backend/services/combat/objectiveEvaluator.js`](../../apps/backend/services/combat/objectiveEvaluator.js) as a pluggable interface. Today most scenarios use `defeat_all`. Vision Gap audit did not flag objectives explicitly, but the hardcore iter1 96.7% win-rate deadlock is partly a symptom: **with only "kill all" as the win condition, the calibration knob is limited**.

**Proposal — implement 4 additional objective types (Effort M total, S each)**:

1. `survive_n_rounds` — win if party alive at round N. Already partially exists in `missionTimer.js` scaffolding.
2. `protect_vip` — a specific unit must survive. If it dies, loss. Use `sessionHelpers.getVipId(session)`.
3. `seize_hex` — at least one player must occupy a specific hex at end of round N+. Easy with `hexGrid`.
4. `escort_to_hex` — like seize but the target unit is slow and vulnerable (escort).

Each as a new evaluator in `objectiveEvaluator`, returning `{ state: 'ongoing' | 'victory' | 'defeat', remaining, flags }`. Schema in `packages/contracts/schemas/encounter.schema.json` (already AJV-validated).

**Interactive props** (deferred, Effort L):

- `prop_switch`: unit uses action to toggle, opens a bridge/door.
- `prop_explosive`: shot with fire/lightning → AoE damage in N hex radius.
- `prop_zipline`: costs 0 AP, traverses 5+ hex.

Ship props after the 4 core objective types land.

### Effort

- Core 4 objectives: **M** (4h × 4 = 12-16h).
- Interactive props: **L** (16+h, deferred).

### Risk

- **Co-op objective mismatch**: in 8-player co-op, "protect VIP" feels tyrannical (one player drops the ball → everyone loses). Mitigation: multi-VIP escort (1 VIP per 2 players) on 6p/8p modulations; scale via `party.yaml` preset.
- **Balance pass cost**: new objective → new calibration harness. Budget 2h per new objective for win-rate tuning.
- **UI explosion**: each objective needs a readable HUD element. Standardize a top-bar "objective tracker" component before shipping any.

---

## Mechanic 10 — Information gathering → unlock persuasion

### Mechanic

In TS, the **Exploration phase** between battles lets the player walk a hub, talk to NPCs, inspect items, and collect **Information tokens** ([Game8 Exploration](https://game8.co/games/Triangle-Strategy/archives/368857), [Game8 All Information Locations](https://game8.co/games/Triangle-Strategy/archives/369345)).

- Each Information token is tagged to a topic (e.g. "The salt trade", "Svarog's past").
- At vote time, certain persuasion dialogue options are **grayed out** unless the player owns the matching Information token.
- A **"Secret Chapter 10" path** requires a specific evidence set gathered during exploration ([Gameranx secret chapter](https://gameranx.com/features/id/292112/article/triangle-strategy-how-to-unlock-the-secret-chapter-10-path-evidence-guide/)).

### Why it works in Triangle Strategy

It makes **exploration mechanically meaningful** (not just flavor text). It rewards **players who care about the story** with **mechanical persuasion power**. And it provides a narrative check on railroading — you cannot persuade Frederica by "spamming Liberty" alone; you need the right receipt.

### Transfer to Evo-Tactics

M19 **debrief phase** is our hub-equivalent. Currently it shows an outcome + narrative log + ready broadcast. We already emit **narrative events** tagged to combat outcomes (kills, losses, reveals). Tagging these events with `info_flag:<topic>` costs almost nothing.

**Proposal — Info Flags as Persuasion Unlocks (Effort M, composes with Mechanic 2)**:

1. Tag narrative events in `debriefPanel` emission with `info_flag` field. Source: combat log hooks (e.g. "Mender revived 3 allies" → `info_flag:mender_sacrifice`).
2. Store per-player in `campaignStore.infoFlags[playerId][flagId] = { seen_at_round, chapter }`.
3. In the `world_setup` persuasion sub-phase (Mechanic 2), server-side filter persuasion dialogue options by `requires_info_flag` in the motion definition YAML. UI grays out options the player doesn't own.
4. Expose `GET /api/campaign/info_flags` so the debrief panel can show "Info found: [X of Y possible]" as a collectible counter — directly copying TS's "Info screen" UX.

**Evidence collection mini-game** (deferred polish, Effort S after core):

Add **exploration events** in debrief: 2-3 optional prompts per chapter like "talk to the medic", "inspect the battlefield". Each grants an `info_flag` on a random topic.

### Effort

- **M** (4-16h). Includes YAML schema for motions with `requires_info_flag[]`, UI gray-out, test cases.

### Risk

- **Tracking fatigue**: if players have 40+ flags per run, nobody reads them. Cap at **~12 flags per chapter**, surface them with emoji + one-line tooltip.
- **Missing flags is frustrating**: in TS, the Golden Route requires very specific flags collected across 10+ chapters. If a player misses one they are locked out until NG+. Mitigation: make **alternate flag paths** (e.g. flag X OR flag Y both work for the same persuasion option) — dual-source every unlock.
- **Info flags + world_setup persuasion = complex**: requires Mechanic 2 shipped first. Sequence: (a) weighted vote, (b) persuasion sub-phase with hardcoded options, (c) info_flag gating. Three sprint slices.

---

## Risk register & what _not_ to copy

1. **Do not copy TS's pacing** — 40+ hour JRPG with long cutscene blocks. Evo-Tactics is **co-op 2-8 players online**, sessions are probably 60-120 min. Every narrative beat must be **under 2 minutes** or it kills the co-op flow.
2. **Do not copy 4-playthrough recruit gating** at shipping scale. TS has 30 characters; we have ~10 unique forms + 7 jobs. Gating too hard = content the player never sees. Use **NG+ carryover with soft re-roll** so no form is permanently missed.
3. **Do not copy TS's save-scum-defeating systems** (hidden numeric values forever) literally. Co-op lacks the single-player agency that makes obscurity feel meaningful. Reveal qualitative tiers (Calm/Tense/Driven) during play; reveal numerics at campaign end.
4. **Do not copy TS's AI sloppiness**. We already have a smarter AI. Only copy the **readability layer** (threat preview, telegraphing). Keep our utility brain on for the "intelligence" axis.
5. **Do not copy friendly fire in every elemental chain**. TS makes lightning-on-water hurt allies; for co-op that is good tension. But copy this rule for **lightning only**, not every element. Fire damages everyone on the fire tile, but fire spread is capped so it is not a blanket AOE.
6. **Do not copy TS's lack of permadeath**. Our model is round-based, ally KO has stakes via Strategy Gauge. Keep our system — TS's "all recoverable after battle" erases tension in the final fight. FFT's permadeath is the better reference for a co-op hardcore mode.
7. **Do not copy TS's fog-of-war absence universally**. Some of our objectives (escort, seize) benefit from partial fog (see Mechanic 9). Don't flat-copy "fully revealed maps".
8. **Do not copy the 3-axis exclusivity**. TS forces Utility/Morality/Liberty as the _only_ social axes. We have 4 MBTI + Ennea; the reveal should **phase** one axis per chapter, not collapse to 3.
9. **Do not make Conviction votes the only branching point**. TS is overwhelmingly gated by Scales votes. For Evo-Tactics (replayability via evolution, not story routes), keep votes to **1-2 per campaign** — let evolution be the main replay lever.

---

## Suggested rollout — 3 sprint slices

Ordered by ROI and low-risk-first. Each slice is ~1 sprint (~25h) and ships a coherent "layer".

### Slice A — Positional combat layer (Sprint M14-A, ~15h)

1. Elevation attacker bonus (Mechanic 3A).
2. Pincer / follow-up attack (Mechanic 3B).
3. Push + fall damage + collision (Mechanic 5).
4. AT Bar visualization + Wait action (Mechanic 7A + 7B).

**Why first**: zero narrative dependency, pure combat feel upgrade. Chiude Pilastro 1 🟢 → 🟢+ (legibility), Pilastro 5 🟢 (playtest live unlock).

### Slice B — Environmental combat layer (Sprint M14-B, ~20h)

5. Tile state machine + fire/ice/water (Mechanic 4).
6. Lightning-on-water chain + friendly fire (Mechanic 4 tail).
7. Weather × biome (Mechanic 4).
8. 4 objective types (Mechanic 9 core).

**Why second**: builds on positional layer; adds the "emergent tactics" Pilastro 1 is missing. Unlocks new calibration knobs for hardcore 06/07.

### Slice C — Narrative/social layer (Sprint M15, ~25h)

9. Conviction axis reveal (Mechanic 1A + 1B).
10. Scales of Conviction vote + persuasion (Mechanic 2).
11. Info Flags unlock persuasion (Mechanic 10).
12. Facing + rear crit (Mechanic 3C, finishes positional).
13. Capstone signatures at rank 6 (Mechanic 6A).

**Why third**: requires narrative hub polish (debrief ≥ M19 shipped) + co-op flow stable (M11 live). Chiude Pilastro 4 🟡 → 🟢 and Pilastro 3 🟢 → 🟢+.

Total: ~60h across 3 slices = 3-4 weeks of single-dev work. Reasonable for an M14-M15 mega-arc.

---

## Pilastri impact matrix

| Pilastro                        | Current state | Mechanics that move it | Post-transfer target                   |
| ------------------------------- | :-----------: | :--------------------- | :------------------------------------- |
| 1. Tattica leggibile (FFT)      |      🟢       | 3, 4, 5, 7, 9          | 🟢+ (new depth axes, readable)         |
| 2. Evoluzione emergente (Spore) | 🟢 candidato  | 6 (capstones)          | 🟢 (signatures = identity lock)        |
| 3. Specie × Job identity        | 🟢 candidato  | 6, 8 (AI archetypes)   | 🟢+ (distinct signatures per job)      |
| 4. MBTI/Ennea                   |     🟡++      | 1, 2, 10               | 🟢 (finally surfaced + used for votes) |
| 5. Co-op vs Sistema             | 🟢 candidato  | 2 (voting layer)       | 🟢+ (debate-driven decisions)          |
| 6. Fairness                     | 🟢 candidato  | 3, 4, 9 (obj variety)  | 🟢 (new calibration knobs)             |

**Expected score** after full rollout: **5/6 🟢+ and 1/6 🟢** (zero 🟡 outstanding). Matches the 2026-04-20 roadmap "≥4/6 🟢 by M15" target, exceeds it.

---

## Sources

### Primary video (transcript unavailable)

- [Triangle Strategy COMPLETE Unit Guide — All Recruitments, Skills and Weapon Trees Explained! (YouTube)](https://www.youtube.com/watch?v=kOnxfP5zRIM) — original prompt source; transcript not available via WebFetch, content reconstructed via cross-referenced wikis below.

### Core mechanic references

- [Conviction — Triangle Strategy Wiki (Fandom)](https://triangle-strategy.fandom.com/wiki/Conviction)
- [Utility, Morality, and Liberty Explained (Pro Game Guides)](https://progameguides.com/project-triangle-strategy/utility-morality-and-liberty-explained-how-to-choose-the-right-answers-in-triangle-strategy/)
- [How to gain points for Morality, Utility, and Liberty (iMore)](https://www.imore.com/triangle-strategy-conviction-how-gain-points-morality-utility-and-liberty)
- [Convictions and Choices Guide (Game Rant)](https://gamerant.com/triangle-strategy-convictions-choices-scale-morality-utility-liberty/)
- [How To Strengthen Serenoa's Convictions (The Gamer)](https://www.thegamer.com/triangle-strategy-strengthen-raise-convictions-guide/)
- [How To Raise Conviction Values (Neoseeker)](https://www.neoseeker.com/triangle-strategy/tips/Raising_Conviction_Values)
- [100% Conviction Achievement Guide (Steam Community)](https://steamcommunity.com/sharedfiles/filedetails/?id=2984474233)
- [Conviction Points in Project Triangle Strategy (GameRiv)](https://gameriv.com/what-are-conviction-points-in-project-triangle-strategy/)
- [How to Increase Conviction (Game8)](https://game8.co/games/Triangle-Strategy/archives/370009)

### Scales of Conviction / voting

- [Voting — Triangle Strategy Wiki (Fandom)](https://triangle-strategy.fandom.com/wiki/Voting)
- [How To Win Votes And Influence People in Triangle Strategy (Kotaku)](https://kotaku.com/triangle-strategy-square-enix-scales-of-conviction-vote-1848657909)
- [What You Need To Know About The Scales Of Conviction (Game Rant)](https://gamerant.com/triangle-strategy-scales-of-conviction-mechanic-explained/)
- [Chapter 3: How To Win The Vote (The Gamer)](https://www.thegamer.com/triangle-strategy-chapter-3-part-1-wither-the-river-flows-walkthrough/)
- [Voting Basics: Guide To Persuading Allies (Neoseeker)](https://www.neoseeker.com/triangle-strategy/tips/Voting_Basics)
- [Tips For Scales Of Conviction Voting (Kotaku via Game Frill)](https://gamefrill.com/news/tips-for-triangle-strategys-scales-of-conviction-voting-system-kotaku/)
- [How to Influence Choices: Persuasion Guide (Game8)](https://game8.co/games/Triangle-Strategy/archives/369430)

### Combat, elevation, flanking, terrain

- [Principle of Combat — Walkthrough & Guide (GameFAQs)](https://gamefaqs.gamespot.com/switch/313526-triangle-strategy/faqs/79838/principle-of-combat)
- [Triangle Strategy Tips And Battle Tactics (Nintendo Life)](https://www.nintendolife.com/guides/triangle-strategy-tips-and-battle-tactics-walkthrough-tactical-points-phases-kudos-quietuses-guide)
- [Triangle Strategy Beginner Guide (Fextralife)](https://fextralife.com/triangle-strategy-beginner-guide-pc-release/)
- [Triangle Strategy — Grokipedia](https://grokipedia.com/page/Triangle_Strategy)
- [Triangle Strategy — Wikipedia](https://en.wikipedia.org/wiki/Triangle_Strategy)
- [Types of Terrain and Effects (Game8)](https://game8.co/games/Triangle-Strategy/archives/369610)
- [Triangle Strategy: All Terrain Effects Explained (VGKami)](https://vgkami.com/triangle-strategy-all-terrain-effects/)
- [Ten tactical tips for Triangle Strategy (Nintendo AU)](https://www.nintendo.com/au/news-and-articles/ten-tactical-tips-for-triangle-strategy-tm/)
- [Triangle Strategy tips and tricks (iMore)](https://www.imore.com/triangle-strategy-tips-and-tricks-beginners)
- [Beginner's Combat Guide (Game8)](https://game8.co/games/Triangle-Strategy/archives/368789)
- [Triangle Strategy Tips Guide — 12 Things the Game Doesn't Tell You (Fanbyte)](https://www.fanbyte.com/legacy/triangle-strategy-tips-guide-things-the-game-doesnt-tell-you)
- [Tactical RPG with fall damage (GameFAQs)](https://gamefaqs.gamespot.com/boards/313526-triangle-strategy/79932600)
- [Digital Trends beginner guide](https://www.digitaltrends.com/gaming/triangle-strategy-beginner-guide/)

### Classes, promotion, weapons, abilities

- [Class Promotion System Explained (GameSkinny)](https://www.gameskinny.com/tips/triangle-strategy-class-promotion-system-explained/)
- [Best Units To Promote (Game Rant)](https://gamerant.com/triangle-strategy-best-units-to-promote/)
- [List of All Abilities (Game8)](https://game8.co/games/Triangle-Strategy/archives/369676)
- [Best Units to Promote First / Class Promotion (Game8)](https://game8.co/games/Triangle-Strategy/archives/369838)
- [How to Upgrade Weapons (GameSkinny)](https://www.gameskinny.com/tips/triangle-strategy-how-to-upgrade-weapons/)
- [Best Abilities to Unlock First (Screen Rant)](https://screenrant.com/triangle-strategy-best-abilities-unlock-first-guide/)
- [Skills and Abilities (Samurai Gamers)](https://samurai-gamers.com/triangle-strategy/skills-and-abilities/)

### Turn order / speed

- [What determines turn order? (GameFAQs)](https://gamefaqs.gamespot.com/boards/313526-triangle-strategy/79936713)
- [Unit Details and Stats Explained (Game8)](https://game8.co/games/Triangle-Strategy/archives/369287)
- [Triangle Strategy beginner's guide (Digital Trends)](https://www.digitaltrends.com/gaming/triangle-strategy-beginner-guide/)

### Level design, objectives, environmental

- [Triangle Strategy Review (RPGFan)](https://www.rpgfan.com/review/triangle-strategy/)
- [Triangle Strategy Review (RPGSite)](https://www.rpgsite.net/review/12464-triangle-strategy-review)
- [Triangle Strategy Review — Powerful Conviction Shines Over Dark Times (Game Informer)](https://gameinformer.com/review/triangle-strategy/powerful-conviction-shines-over-dark-times)
- [Square Enix's best tactical RPG in 25 years (Inverse)](https://www.inverse.com/gaming/triangle-strategy-review)
- [Review: Triangle Strategy (Destructoid)](https://www.destructoid.com/reviews/review-triangle-strategy/)
- [Complete Triangle Strategy Guide — Recruitment, Combat & Progression (ZyberVR)](https://zybervr.com/blogs/news/complete-triangle-strategy-guide-recruitment-combat-progression)
- [Triangle Strategy Review (RPGamer)](https://rpgamer.com/review/triangle-strategy-review/)

### AI behavior

- [Enemy AI on Hard (GameFAQs board)](https://gamefaqs.gamespot.com/boards/313526-triangle-strategy/79937601)
- [Triangle Strategy Review: Triple Threat (GameSkinny)](https://www.gameskinny.com/xp6sd/triangle-strategy-review-triple-threat)
- [Triangle Strategy review — Fun tactics, when it lets you play (Digital Trends)](https://www.digitaltrends.com/gaming/triangle-strategy-review/)

### Recruitment & endings

- [How To Unlock All The Bonus Characters (Gameranx)](https://gameranx.com/features/id/291896/article/triangle-strategy-how-to-unlock-all-the-bonus-characters-conviction-guide/)
- [List of Characters and How to Recruit (Game8)](https://game8.co/games/Triangle-Strategy/archives/368856)
- [How To Recruit Every Unit (The Gamer)](https://www.thegamer.com/triangle-strategy-recruitment-character-guide/)
- [How to Recruit All Characters (GameSkinny)](https://www.gameskinny.com/tips/triangle-strategy-how-to-recruit-all-characters/)
- [Route Breakdown: Full Chapter Split Guide (My Gaming Tutorials)](https://mygamingtutorials.com/2025/05/15/triangle-strategy-route-breakdown-full-chapter-split-guide-choices-and-character-recruitment-paths/)
- [How to Get the Golden Route — Endings Guide (Game8)](https://game8.co/games/Triangle-Strategy/archives/370301)
- [Route Guide: All Branching Paths and True Ending (My Gaming Tutorials)](https://mygamingtutorials.com/2025/05/15/triangle-strategy-route-guide-all-branching-paths-major-decisions-and-how-to-unlock-the-true-ending/)
- [How to Unlock or Recruit Every Character (ClutchPoints)](https://clutchpoints.com/gaming/triangle-strategy-unlock-recruit-every-character-guide)
- [Character Recruitment Guide (Neoseeker)](https://www.neoseeker.com/triangle-strategy/guides/Character_Recruitment_Guide)

### Exploration & information gathering

- [Things to Do During Exploration (Game8)](https://game8.co/games/Triangle-Strategy/archives/368857)
- [All Information Locations (Game8)](https://game8.co/games/Triangle-Strategy/archives/369345)
- [How To Unlock The Secret Chapter 10 Path — Evidence Guide (Gameranx)](https://gameranx.com/features/id/292112/article/triangle-strategy-how-to-unlock-the-secret-chapter-10-path-evidence-guide/)

### Developer interviews / design commentary

- [Triangle Strategy devs hint at HD-2D remake plans (Inverse)](https://www.inverse.com/gaming/triangle-strategy-interview-hd2d-remakes)
- [Making TRIANGLE STRATEGY in VR — Launch Interview (Square Enix)](https://www.square-enix-games.com/en_US/news/triangle-strategy-meta-quest-launch-interview)
- [Producers talk HD-2D, storytelling, and no permadeath (Destructoid)](https://www.destructoid.com/triangle-strategy-interview-producers-asano-arai-square-enix-hd-2d-tactics-rpg/)

### Repo-internal cross-references (for implementors)

- `apps/backend/services/vcScoring.js` — MBTI axis scoring
- `apps/backend/services/grid/hexGrid.js` — hex math, LOS, A\*, flood
- `apps/backend/services/roundOrchestrator.js` — `initiative + action_speed - status_penalty`
- `apps/backend/services/combat/resistanceEngine.js` — channel resistances
- `apps/backend/services/combat/objectiveEvaluator.js` — objective interface
- `apps/backend/services/combat/reinforcementSpawner.js` — biome-aware spawn
- `apps/backend/services/combat/missionTimer.js` — timer scaffolding
- `apps/backend/services/combat/sgTracker.js` — Strategy Gauge (M20 Vision Gap V5)
- `apps/backend/services/progression/progressionEngine.js` — 7 Jobs × 6 Levels × 2 Perks (XCOM EU/EW)
- `apps/backend/services/forms/formEvolution.js` — form gating engine
- `apps/backend/services/campaign/campaignEngine.js` — campaign advance + info flags candidate
- `apps/backend/routes/session.js` / `sessionRoundBridge.js` — round model wire
- `apps/backend/services/network/wsSession.js` — M11 Jackbox WebSocket (for per-phone votes/persuasion)
- `apps/play/src/worldSetup.js` + `phaseCoordinator.js` — M18 world_setup phase host
- `apps/play/src/formsPanel.js` — evolution UI (for Conviction-gated forms)
- `packs/evo_tactics_pack/data/balance/terrain_defense.yaml` — 3 elevation levels, add `elevation_attack_bonus`
- `data/core/forms/mbti_forms.yaml` + `data/core/thoughts/mbti_thoughts.yaml` — MBTI data
- `data/core/progression/perks.yaml` — 84 perks, add `signature_ability_id` at rank 6
- `docs/process/sprint-2026-04-26-M16-M20-close.md` — M18 vote phase details
- `docs/adr/ADR-2026-04-26-sg-earn-formula.md` — SG spend pattern (signature abilities sink)

---

_End of document._
