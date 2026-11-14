---
title: "Deep Analysis — Narrative Surface Audit"
date: 2026-04-26
workstream: cross-cutting
category: report
doc_status: active
doc_owner: narrative-design-illuminator
tags: [narrative, audit, p4, mbti, ennea, thought-cabinet, qbn, ink]
---

# Narrative Audit — Evo-Tactics (2026-04-26)

> Mode: AUDIT. Surface: briefing + debrief + onboarding + QBN + Thought Cabinet + MBTI/Ennea reveal.
> Runtime cross-check: `services/narrative/`, `apps/backend/services/narrative/`, `data/narrative/`, `data/core/`.

---

## 1. Reactivity Coverage Gap — ink/QBN vs runtime

### What is wired

| Surface | Status | File | Notes |
|---|---|---|---|
| ink narrative engine | LIVE | `services/narrative/narrativeEngine.js` | inkjs Story, bind external functions, MBTI tag hook wired |
| Narrative router | LIVE via pluginLoader | `services/narrative/narrativeRoutes.js` | `/api/v1/narrative` + `/api/narrative` (dual mount) |
| QBN engine | LIVE | `apps/backend/services/narrative/qbnEngine.js` | 17 events, MBTI axis + Ennea + run-state gates, weighted pick |
| QBN event pack | LIVE | `data/narrative/qbn_events.yaml` | 17 events: T/F/N/S/E/I + 3 Ennea (3,5,8) + 2 run-milestones |
| Briefing variations | LIVE | `apps/backend/services/narrative/briefingVariations.js` | MBTI-gated picker over `tutorial_briefings.yaml` |
| Tutorial briefings YAML | PARTIAL | `data/narrative/tutorial_briefings.yaml` | Only `enc_tutorial_01` has variants (4 pre + 4 post). All other encounters: fallback to hardcoded strings |
| MBTI dialogue color tagging (Path B) | WIRED NO-OP | `narrativeEngine.js:148` + `mbtiPalette.js` | Tag extraction + wrapping live, but `mbtiPalette.js` is lazy-loaded. Frontend must read `<mbti axis="X">` tags to render. No confirmed frontend consumer found |
| Default ink briefing | MINIMAL | `data/narrative/briefing_default.ink` | 2 choices (assalto diretto / ricognizione), no VC reactivity, no external function calls |
| debrief_default.ink.json | UNKNOWN | `data/narrative/debrief_default.ink.json` | Not read this session — likely similar minimal structure |

### Gaps

**G1 — QBN not wired to debrief pipeline.** `qbnEngine.drawEvent()` is a pure function. `narrativeRoutes.js` exposes `POST /qbn/draw`, but nothing in `session.js` / `sessionRoundBridge.js` calls it automatically at debrief/campaign-advance. Player sente QBN ZERO — endpoint esiste, consumer no.

Fix: wire `qbnDrawEvent({ vcSnapshot, runState, history })` inside `/api/session/:id/end` debrief branch. History persisted in session state (or Prisma). Effort: ~3h. Pattern: same as `rewardOffer.js` fire-and-forget on campaign advance.

**G2 — Tutorial briefing coverage 1/N.** Only `enc_tutorial_01` has authored variants. Encounters 02-06, hardcore, wave encounter: hardcoded string fallback. Player plays 5-6 encounters post-tutorial with zero MBTI reactivity in briefings.

Fix: add `enc_tutorial_02..06` variant packs in `tutorial_briefings.yaml`. Minimum 2 variants each (default + one MBTI-gated). Authoring effort: ~2h.

**G3 — briefingVariations.js not wired to routes.** `selectBriefing()` is a pure function. No route in `narrativeRoutes.js` or `apps/backend/routes/` calls it. The module lives in `apps/backend/services/narrative/` but no consumer imports it. Structural gap: briefing variation engine is dead code.

Fix: add `GET /api/v1/narrative/briefing/:scenario_id?phase=pre&seed=<N>&mbti_t=<f>` route. Wire in `tutorialScenario.js` when building briefing response. Effort: ~2h.

**G4 — ink story zero reactivity.** `briefing_default.ink` does NOT call `getVCScore()`, `getUnitName()`, or `getSessionVar()` despite `bindSessionData()` being wired. The ink story is a static 2-choice script. Player sees the same text regardless of VC state.

Fix: add `VAR aggro_score = 0` + external function calls in `.ink` + recompile. Or: treat `briefing_default.ink` as template showcase only, and route actual briefings through `tutorial_briefings.yaml` (simpler path).

**G5 — Ennea gap in QBN pack.** 17 events cover Ennea types 3, 5, 8 only. Types 1, 2, 4, 6, 7, 9 = 0 events. QBN Ennea coverage is 3/9 (33%). Matches `vcScoring.js` gap (6/9 archetipi), but compounds it: even if Ennea expands to 9, no events exist for 6 of them.

Fix: add 6 more Ennea-gated events (one per missing type) to `qbn_events.yaml`. Each: ~1 paragraph authored. Effort: ~1.5h.

**Quality checklist**:

| Check | Status | Note |
|---|:---:|---|
| Player agency preserved | PARTIAL | QBN has choices, ink has choices, but neither fires at player-facing moments |
| State reactive (mentions prior choice) | FAIL | No choice memory surface visible to player in-game |
| Failure valid path | PASS | QBN `ev_first_loss` event handles failure gracefully |
| Pacing (not combat-interrupt) | PASS | QBN fires at debrief scope (design intent). Thought Cabinet fires on encounter tick — OK |
| Voice/tone consistent | PASS | QBN Italian prose is cohesive, empathic-tactical |
| Accessibility (skip option) | UNKNOWN | Ink story has no explicit skip. QBN events have no skip path surfaced |

---

## 2. Thought Cabinet Status (P4 MBTI/Ennea Disco-Elysium Reveal)

### What is wired

Thought Cabinet is the most complete narrative subsystem:

- `thoughtCabinet.js` engine: unlock, research, internalize, forget, passive bonuses
- `mbti_thoughts.yaml`: 18 thoughts covering 3 axes (E_I, S_N, J_P) × 2 directions × 3 tiers. T_F excluded (surfaced via Forms)
- Routes: `GET /:id/thoughts`, `POST /:id/thoughts/research`, `POST /:id/thoughts/forget`, `POST /:id/thoughts/tick`
- Biome resonance discount on research cost wired (`biomeResonance.js`)
- `updateThoughtPassives()` wired: forget → recompute passives → apply to live unit stats
- `onboardingPanel.js` (170 LOC): Disco Elysium card overlay for campaign start, 3-card grid, countdown timer, narrative reveal on pick

### Gaps

**G6 — Thought Cabinet reveals NOT narrative.** `mbti_thoughts.yaml` reveals stat effects (attack_mod, defense_dc, hp_max, etc.) but the `effect_bonus`/`effect_cost` content is mechanical. The "reveal text" per thought — the Disco Elysium diegetic payoff ("this thought has changed you: ...") — is NOT authored in the YAML. No `reveal_text` field exists in `thoughtCabinet.js` schema.

Player experience: player sees thought name + stat delta. Player does NOT experience the "breakthrough" narrative moment. The Disco Elysium effect is 80% missing.

Fix: add `reveal_text_it` field to `mbti_thoughts.yaml` thought schema. Populate 18 entries (2-3 sentences each, Italian, diegetic). Expose in `/:id/thoughts/tick` response when `cost_remaining` hits 0. Frontend renders reveal popup. Effort: ~3h (1h schema + 1.5h authoring + 0.5h route change).

**G7 — T_F axis has zero thoughts.** YAML comment says "T_F excluded: già surfacato via job_affinities nei Forms." But Forms are an evolution mechanic (formsPanel.js), not a narrative moment. Player playing T-dominant style: NEVER gets a Thought Cabinet unlock triggered by T_F behavior.

This is a DESIGN GAP: 4 axes → 3 in thoughts. The 4th (T_F) is the most legible axis in tactical play (analytical vs empathic choices). Skipping it means the axis that most visibly shapes behavior has no narrative mirror.

Fix: add 6 T_F thoughts (3 T-leaning + 3 F-leaning). Expand YAML. Effort: ~2h.

**G8 — Cabinet not triggered during campaign-advance.** `/:id/thoughts/tick` must be called manually. Nothing in campaign advance (`/api/campaign/advance`) calls tick automatically. Thoughts NEVER progress unless frontend explicitly calls tick endpoint. This is the equivalent of a Disco Elysium thought that never moves from "researching."

Fix: wire `tickThoughtResearch` call inside campaign advance handler. Effort: ~1h.

**G9 — onboardingPanel Thought Cabinet is campaign-start only.** The onboarding 3-card overlay fires once at campaign start (`/api/campaign/start`). No mechanism to show new thoughts acquired mid-campaign (e.g., after encounter 3 an axis threshold is crossed → new thought unlocked). The "ongoing discovery" of thoughts is invisible.

Fix: campaign-advance response includes `newly_unlocked_thoughts[]`. Frontend checks array: if non-empty, shows Thought Cabinet notification overlay. Effort: ~2h.

---

## 3. Skiv Narrative Arc — Actionable

Research doc (`docs/research/2026-04-25-skiv-narrative-arc-research.md`) already identifies top-2 patterns with full pseudocode. Status:

`data/core/narrative/skiv_storylets.yaml` EXISTS — file is present. Content unknown (not read this session). `data/core/personality/mbti_axis_palette.yaml` EXISTS.

**Top 2 ready to ship**:

**P5 — Thought Cabinet weekly reveal (effort ~3-4h)**. Trigger: every 7th log entry (narrative_log_size % 7 == 0). Output: `weekly_digest` field in `state.json` + `## Digestivo settimanale` section in `MONITOR.md`. No new deps. The `skiv_storylets.yaml` file likely provides the quality pool. Integrate `weekly_meditation()` into `skiv_monitor.py`.

**P2 — QBN quality-gated storylet (effort ~4-5h)**. state.json already has qualities: stress, composure, prs_merged, form_confidence, pressure_tier. These ARE the QBN qualities. Connect `skiv_storylets.yaml` to a Python QBN selector (already specced in research doc, lines 411-510). Zero new deps. Determinstic tie-break via salience sort.

**Anti-pattern warning**: research doc explicitly flags LLM-weekly-summary as anti-pattern (grounding loss, persona drift). No LLM in loop.

**Skiv × Ennea voice palette (P0 museum card M-2026-04-25-003, ~6h)**. `enneagramma_dataset.json` has `basic_fear` + `basic_desire` + `passion` per type = prêt-à-l'emploi Italian voice palette. Type 5 (Osservatore/Investigatore): stoic taxonomic voice. Type 7 (Entusiasta): chaotic playful voice. Switch via `vcSnapshot.ennea_archetypes[0]`. Dependency: vcScoring.js extend to 9/9 Ennea.

---

## 4. Quality-Based Narrative (Fallen London) Opportunity

QBN engine is already built and event pack has 17 authored events. This is P0 already shipped at engine layer. The opportunity is **surface wiring and content expansion**.

### Immediate wire (~3h)

Wire `drawEvent()` inside session end/debrief. Call signature:
```js
qbnDrawEvent({
  vcSnapshot: buildVcSnapshot(session, telemetryConfig),
  runState: { turns_played: session.turn, victories: session.wins || 0 },
  history: session.qbn_history || {},
  seed: session.session_id
})
```
Persist `history` in session state (or Prisma `qbn_history` JSON column).

### Content gap

17 events covers only: 4 MBTI axes (8 events) + 3 Ennea (3 events) + 2 run-milestones + 4 universal. Missing:
- Ennea 1, 2, 4, 6, 7, 9 (6 events)
- J_P axis (0 events — only T/F/N/S/E/I covered)
- Campaign arc milestones (e.g., "entered bioma X for first time", "survived 3 encounters in same biome")
- `requires_seen` chained events (only 1 event pair uses this: `ev_apex_threshold` after `min_victories: 3`)

Campaign arc via QBN is the Fallen London pattern: qualities accumulate over many sessions → rarer events unlock. This is P4 → P2 in pattern library priority. Budget: 10-15 more events, ~2h authoring.

### QBN vs ink — which for what

Per `qbnEngine.js` comment (accurate): "QBN excels at picking WHICH scene to play; ink excels at branching dialogue INSIDE a scene." Architecture is correct. The next surface where ink adds value: multi-turn debrief dialogue (commander + analyst voices reacting to VC state), NOT further expansion of the briefing variation pool.

---

## 5. Frontmatter Governance

Files audited against `docs/governance/docs_metadata.schema.json` required fields:

| File | Has frontmatter | `doc_status` | `workstream` | `doc_owner` | Issue |
|---|:---:|:---:|:---:|:---:|---|
| `docs/core/00-SOURCE-OF-TRUTH.md` | YES | active | cross-cutting | master-dd | OK |
| `docs/core/24-TELEMETRIA_VC.md` | YES | active | cross-cutting | platform-docs | OK — redirect only, no dedup yet |
| `docs/core/Telemetria-VC.md` | YES | active | cross-cutting | platform-docs | DEDUP PENDING (catalog H1) |
| `docs/research/2026-04-25-skiv-narrative-arc-research.md` | YES | draft | cross-cutting | narrative-design-illuminator | OK |
| `docs/planning/research/lore_concepts.md` | YES | draft | cross-cutting | platform-docs | OK |
| `docs/planning/research/enneagram-addon/README_INTEGRAZIONE_MECCANICHE_v2.md` | YES | draft | incoming | incoming-archivist | OK |
| `docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md` | YES | draft | incoming | incoming-archivist | OK |
| `docs/evo-tactics-pack/ennea-themes.md` | YES | draft | dataset-pack | data-pack-team | OK |

Runtime files (`narrativeEngine.js`, `qbnEngine.js`, `briefingVariations.js`) are code, not docs — governance exempt.

`docs/core/Telemetria-VC.md` + `docs/core/24-TELEMETRIA_VC.md` dedup: the former (57 LOC) is the content doc; the latter (18 LOC) is a redirect to it. Catalog item H1 confirms dedup pending. Recommendation: promote `24-TELEMETRIA_VC.md` as canonical stub (redirect), keep `Telemetria-VC.md` as full canvas. No change needed for governance compliance — both have valid frontmatter.

---

## 6. Pattern Decision Tree (applied)

```
Q: "briefing/debrief narrative with MBTI state?"
  → ink weave (P0) + QBN (P0) — BOTH already built. Wire missing (G1/G3).

Q: "campaign-scale events from player qualities?"
  → Quality-Based Narrative (Fallen London P0) — engine LIVE, surface not wired (G1).

Q: "passive unlock with narrative reveal?"
  → Thought Cabinet (P0) — wired, reveal text missing (G6), T_F axis gap (G7).

Q: "text variation for flavor?"
  → Tracery grammar (P2) — NOT needed. QBN + briefingVariations.js cover this already.
     Only add Tracery if briefing pool authoring becomes bottleneck.

Q: "character arc over time?"
  → Wildermyth layered (P1) — NOT yet. Deferred until campaign M10+ ships fully.
```

---

## 7. Priority Action List

| ID | Gap | Pattern | Effort | Pillar impact |
|---|---|---|---|---|
| **N-01** | Wire QBN to session debrief | QBN (P0) | ~3h | P4 🟡 → visible |
| **N-02** | Add `reveal_text_it` to mbti_thoughts.yaml (18 entries) | Thought Cabinet (P0) | ~3h | P4 breakthrough moment |
| **N-03** | Wire briefingVariations.js to scenario routes | ink/Tracery hybrid (P0) | ~2h | P4 micro-reactivity |
| **N-04** | Add T_F axis thoughts (6 entries) | Thought Cabinet (P0) | ~2h | P4 axis parity |
| **N-05** | Wire `/thoughts/tick` to campaign advance | Thought Cabinet (P0) | ~1h | P4 pacing |
| **N-06** | Skiv QBN storylet selector (P5+P2 research doc) | QBN + Thought Cabinet | ~3-4h | Skiv narrative arc |
| **N-07** | QBN Ennea event pack (6 missing types) | QBN (P0) | ~1.5h | P4 Ennea coverage |
| **N-08** | Tutorial briefings enc_02..06 variants | ink/Tracery hybrid (P0) | ~2h | P4 micro-reactivity |
| **N-09** | Ennea voice palette Skiv Type 5/7 | QBN + museum M-003 | ~6h | Skiv voice |

Total estimated: ~23-24h for N-01..N-09. **N-01 through N-05** are wire-only (no new architecture), ~11h, P4 visible to player post-wire.

---

## Sources

- [Emily Short Beyond Branching QBN](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- [Failbetter StoryNexus Tricks](https://www.failbettergames.com/news/narrative-snippets-storynexus-tricks)
- [Disco Elysium Thought Cabinet Devblog](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet)
- [Disco Elysium Micro-reactivity Game Developer](https://www.gamedeveloper.com/business/understanding-the-meaningless-micro-reactive-and-marvellous-writing-of-i-disco-elysium-i-)
- [ink inklestudios](https://www.inklestudios.com/ink/)
- Museum card M-2026-04-25-002 (Ennea registry 16 hooks)
- Museum card M-2026-04-25-003 (Ennea dataset 9 types)
- Museum card M-2026-04-25-009 (Triangle Strategy MBTI Transfer — Proposals A/B/C)
- Museum card M-2026-04-25-006 (enneaEffects.js revived PR #1825/#1827/#1830)
