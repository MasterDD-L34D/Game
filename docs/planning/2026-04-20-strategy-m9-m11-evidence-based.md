---
title: 'Strategia M9-M11 evidence-based — gap closing via proven patterns'
workstream: planning
category: roadmap
status: published
owner: master-dd
created: 2026-04-20
tags:
  - strategy
  - sprint-plan
  - evidence-based
  - kill-60
  - pilastri-unblock
related:
  - docs/planning/2026-04-20-pilastri-reality-audit.md
  - docs/core/02-PILASTRI.md
  - docs/core/PI-Pacchetti-Forme.md
  - docs/core/Mating-Reclutamento-Nido.md
---

# Strategia M9-M11 evidence-based

## TL;DR

**Nessun gap Pilastri è structural hard se re-framed con pattern già shippati da altri giochi**. Parallel-agent audit (3 agent: repo state + external strategies + sprint plan) ha confermato:

- P2 🔴 → 🟡: `metaProgression.js` già tracking in-memory. Gap = persistence + PI pack spender, non sim.
- P3 → XCOM EU/EW perk-pair YAML 7 livelli × 2 perks = **proven shippable**.
- P4 → T_F FULL già, E_I/S_N/J_P partial. Disco Elysium thought cabinet = reveal diegetic.
- P5 → **Jackbox room-code WebSocket** (3 OSS clones esistenti, 7-day spike pubblico).
- P6 → Long War mission timers + pod count > HP buffing.

**Roadmap** (single dev + AI pair, kill-60 per sprint):

| Sprint | Big rock                            | Effort | Demo impact                            |
| ------ | ----------------------------------- | ------ | -------------------------------------- |
| M9     | P6 timeout + P4 axes + P3 XP proof  | ~20h   | Hardcore playable, MBTI 4/4            |
| M10    | P2 PI pack runtime + P3 full levels | ~25h   | Trait acquisition campaign             |
| M11    | **P5 Jackbox co-op TV (LOCKED)**    | ~20h   | 4 amici + phones + TV = tactical co-op |
| M12+   | P2 full Form evoluzione             | ~35h   | Deferred — Spore-core ciclo next       |

## Revised Pilastri real (post repo audit)

|  #  | Pilastro             | Stated pre-audit | Audit 1 (first pass) | **Audit 2 (deep repo)** | Root cause                                     |
| :-: | -------------------- | :--------------: | :------------------: | :---------------------: | ---------------------------------------------- |
|  1  | Tattica leggibile    |        🟢        |          🟢          |           🟢            | OK                                             |
|  2  | Evoluzione emergente |        🟢        |          🔴          |         **🟡**          | metaProgression in-memory, persistence assente |
|  3  | Identità Specie×Job  |        🟢        |          🟡          |           🟡            | Level curves mancanti                          |
|  4  | Temperamenti         |        🟢        |          🟡          |           🟡            | T_F full, altri 3 axes partial                 |
|  5  | Co-op vs Sistema     |        🟢        |          🟡          |           🟡            | Focus-fire only, zero network                  |
|  6  | Fairness             |        🟢        |          🟡          |           🟡            | Hardcore deadlock strutturale                  |

Nuovo score: **1/6 🟢 + 5/6 🟡** (nessun 🔴).

## Evidence-based strategy per Pilastro

### P2 — Evoluzione emergente

**Non Spore sim. Wesnoth advancement tree + AI War pack unlock.**

**Proven patterns**:

1. **Wesnoth unit advancement** ([github.com/wesnoth/wesnoth](https://github.com/wesnoth/wesnoth)): unit hits XP threshold → promotes a 1-of-2-3 predefined forme. Zero continuous sim, solo transitions tagged. Compatible con 16 Forms YAML già esistente.
2. **AI War DLC postmortem** ([arcengames.com postmortem](https://arcengames.com/ai-war-first-four-years-postmortem-and-by-extension-arcen-history/)): PI packs come authored YAML bundles validati da `pack_manifest.yaml` (già scaffold Tier 0 deep dive). Unlock = "install pack at nest", non "simulate genome".
3. **Archetype layer Wesnoth `movetypes.cfg`**: 5-8 archetypi tra `trait_mechanics.yaml` e species. Riduce 84-species duplication.

**Runtime già esistente in repo**:

- `apps/backend/services/metaProgression.js` (LOC 31-178): tracking trust/affinity in-memory Map. Scaffold per level/form tracking.
- `apps/backend/routes/meta.js`: 6 endpoint wirati (recruit/mating/nest/affinity/trust). **Zero persistence** — muore su restart.
- `data/core/Mating-Reclutamento-Nido.md` + `PI-Pacchetti-Forme.md`: design canonical, consumed nowhere.

**Gap reale**:

- Persistence layer (Prisma NpcRelation schema — 4-6h)
- PI pack spender (/api/pi-shop POST — 3-4h)
- Form transition gate (XP→form via `mbti_forms.yaml` — 6-8h)

**Effort totale P2 minimum**: 15-20h (non 30-50h stimato). Audit 1 overestimate.

---

### P3 — Character progression

**XCOM EU/EW perk-pair YAML model = best fit.**

**Proven pattern** ([taw XCOM optimal build analysis](http://t-a-w.blogspot.com/2013/12/xcom-optimal-character-build-or-how-to-design-skill-trees.html)):

- Ogni level: +stat_bumps (HP, mod, crit) + choice 1-of-2 perks (a volte mandatory)
- Total ~7 livelli per job
- **1 YAML file per job × 7 livelli × 2 perks = ~100 data rows**. Zero tree UI.

**Battle Brothers fallback** ([dev blog #80](https://battlebrothersgame.com/dev-blog-80-progress-update-new-perk-system/)): perk tree + talent stars se XCOM perk-pair insufficient.

**Wesnoth minimum** ([wesnoth advancement](https://github.com/wesnoth/wesnoth)): linear advancement, zero player choice. Ship first, layer XCOM perk-pair after.

**Runtime già esistente**:

- `services/jobsLoader.js` (LOC 25-108): 7 jobs + abilities per rank r1/r2 già esistenti in `data/core/jobs.yaml`. Rank system è proto-level.
- `damage_curves.yaml` player_classes: hp_baseline, mod_baseline, dc_baseline definiti ma non applicati.

**Gap reale**:

- XP ledger service (`services/progression/xpLedger.js` — 4h)
- Level-up curve application (hook in session end — 3h)
- Perk pair YAML × 7 jobs (8h content + 2h wire)

**Effort totale P3**: 15-17h.

---

### P4 — Temperamenti MBTI/Ennea

**Disco Elysium thought cabinet pattern. Diegetic reveal.**

**Proven pattern**:

- [Disco Elysium](https://www.personality-database.com/profile?pid=2&cid=11&sub_cat_id=6071): skills (Logic, Empathy, etc.) NON sono MBTI axes scientifici. Sono bespoke traits mappati post-hoc. Player non vede raw score, reveal a debrief.
- [boardgame.io playerView](https://github.com/boardgameio/boardgame.io): private view per player (Tier 0 deep dive A1).

**Regola honest** (Fallout Tactics postmortem): **non shippare T_F/J_P altre axes senza focus group playtest** che confermi inferenza correla con self-reported type. Measurement problem, non design problem.

**Runtime già esistente**:

- `services/vcScoring.js` (LOC 456-514): 4 axes computation. T_F **FULL**, E_I/S_N/J_P partial (null fallback).
- `services/personalityProjection.js` (LOC 49-78): distance-match su `mbti_forms.yaml` 16 forms. Non consumato da ability executor.

**Gap reale**:

- E_I coverage (cohesion metric missing in logs — 2h)
- S_N coverage (pattern_entropy proxy — 2h)
- J_P promote partial→full (2h)
- Form reveal endpoint `/api/session/:id/form-debrief` (2h)

**Effort totale P4**: 8h minimum (skip J_P e T_F se già full).

---

### P5 — Co-op vs Sistema

**Jackbox room-code WebSocket. Proven pattern, 3 OSS clones pubblici.**

**Proven pattern**:

- Architecture: single host + TV display + player phones via 4-letter code
- **Phones** = active keyboard (private view), **TV** = shared spectator view
- [Jackbox writeup](https://www.abtach.ae/blog/how-to-build-a-game-like-jackbox/), [Daikon Games 7-day Jackbox clone](https://www.patreon.com/posts/free-radish-how-34077166)
- OSS reimpl: [hammre/party-box](https://github.com/hammre/party-box), [axlan/jill_box](https://github.com/axlan/jill_box), [InvoxiPlayGames/johnbox](https://github.com/InvoxiPlayGames/johnbox)

**Colyseus fallback** ([github.com/colyseus/colyseus](https://github.com/colyseus/colyseus)): se Jackbox "dumb clients" insufficient, Node.js authoritative state sync + reconnection. ADR-2026-04-14 già referenced.

**Skip lockstep engine** ([JiepengTan/LockstepEngine](https://github.com/JiepengTan/LockstepEngine)): solo per competitive ranked. Per co-op vs Sistema, authoritative host superior.

**Runtime esistente**: zero. `squadCoordination.js` focus-fire locale, grep WebSocket = 0 matches.

**Gap reale**:

- WebSocket server `services/network/wsSession.js` (8-10h)
- Lobby route + 4-letter code generator (3h)
- Client reconnect logic `apps/play/src/network.js` (4h)
- Tests 4-player sync (3h)

**Effort totale P5**: 18-20h (Jackbox pattern), non 20-30h.

---

### P6 — Fairness (hardcore)

**Long War 2 mission timers + pod count > HP multipliers.**

**Multiplier knob exhausted** (M7 iter7 RED). Nuovi knob:

**Proven patterns**:

1. **Long War 2 "Yellow Alert" pod coordination** ([UFOpaedia](<https://www.ufopaedia.org/index.php/Alien_Deployment_(Long_War)>)): SIS units gravitate verso last-known PG position a round-end. Pressure globale, decisione locale.
2. **XCOM 2 mission timers** ([Long War 2 tactics](https://xcom.substack.com/p/long-war-more-early-game-tactics)): N turns max, timeout = defeat. Player time budget = scarce resource. **Option F già flagged in iter7 report**.
3. **Pod size > stat multipliers** ([Long War Rebalance wiki](https://xcomlwr.miraheze.org/wiki/Main_Page)): "much harder to kill off a whole pod" via +2 minions non boss buff.

**Gap reale**:

- `sessionOutcomeResolver.js` timeout→defeat verdict (2-3h)
- Yellow alert movement hook in AI policy (3h)
- Hardcore-06 pod size redistribute (boss 40→26, +2 minion — 1h YAML)

**Effort totale P6**: 5-7h.

---

## Sprint roadmap

Single dev + AI pair. Kill-60 strict.

### Sprint M9 (2 settimane, ~20h) — "Unblock + complete cheap yellows"

**Big rock**: chiudere P6 RED + P4 partial axes + P3 XP proof.

**Deliverables** (4-5 PRs):

- PR A: `services/session/sessionOutcomeResolver.js` — timeout>=N → verdict defeat (2-3h). Fix verdict harness deadlock.
- PR B: `services/vcScoring.js` promote 3 axes partial→full + Ennea 3 missing types (6h).
- PR C: `services/progression/xpLedger.js` + `data/core/progression_curves.yaml` + session end hook (8h).
- PR D: Tests N=30 hardcore re-validate + vcScoring 4/4 axes (2h).
- PR E: CLAUDE.md + Pilastri status sync (1h).

**DoD**:

- Hardcore N=30 GREEN verdict (>20% defeat, <50% timeout)
- MBTI 4-letter type derivation 16-way snapshot test
- XP + level visible session-end HUD
- CLAUDE.md aggiornato senza inflation

**Demo visibility**: hardcore playable con distribution realistica. MBTI completo ENTJ/INFP invece di ENT?.

---

### Sprint M10 (2 settimane, ~25h) — "First evolution pulse"

**Big rock**: P2 runtime beachhead + P3 full progression.

**Deliverables** (5-6 PRs):

- PR A: `services/evolution/piShop.js` — consume PI reward post-session, roll pack d20, persist trait (10h). Reuses `data/packs.yaml`.
- PR B: Route `/api/pi-shop` + session end PI reward emit (3h).
- PR C: `services/partyState.js` — roster persistence (Prisma `PartyRoster` schema) — 6h.
- PR D: Level curves 2-5 applied via xpLedger.js (4h).
- PR E: Frontend "traits acquired campaign" widget (2h).

**DoD**:

- PI pack → trait acquired in 3 consecutive runs (determinism + persistence)
- Level 2-5 HP scaling per `player_classes.hp_baseline`
- Party roster persists across sessions
- P2 🟡 → 🟢-partial honest (runtime pulse, non full evolution)

**Demo visibility**: friend finisce session → roll animation trait. Next session trait active. Level 5 unit HP bar visibly più lungo.

---

### Sprint M11 (3 settimane, ~20h) — **P5 Jackbox co-op TV LOCKED**

**Decisione user 2026-04-20**: **P5 Jackbox network selected**. P2 full Form evoluzione deferred M12+.

**Rationale user** (player POV):

- Demo amici live su ngrok = leverage attuale
- "Serata coi 3 amici, pizza + TV + 4 phone. Tactical co-op vero" = esperienza sociale
- Spore-evoluzione può aspettare M12

**Scope M11**:

- `services/network/wsSession.js` — WebSocket server, 4-letter room code, host authoritative (~8-10h)
- `apps/play/src/network.js` — client reconnect logic (~4h)
- `apps/play/lobby.html` + TV dual-view (TV shared + phone private input) (~3h)
- Routes `/api/lobby/{create,join,close}` + tests (~3h)
- Integration test 4-player sync + reconnect edge cases (~2h)

**Proven reference**:

- Jackbox architecture pattern ([writeup](https://www.abtach.ae/blog/how-to-build-a-game-like-jackbox/))
- OSS clones: [hammre/party-box](https://github.com/hammre/party-box), [axlan/jill_box](https://github.com/axlan/jill_box), [InvoxiPlayGames/johnbox](https://github.com/InvoxiPlayGames/johnbox)
- Daikon Games 7-day spike ([writeup](https://www.patreon.com/posts/free-radish-how-34077166))

**Demo impact**: 4 amici, 4 phones, 1 TV. Planning phase tutti declarano, TV mostra animazioni resolve, chat vocale naturale. Pilastro 5 promessa "TV condivisa co-op" finalmente live.

**Fallback**: se Jackbox pattern insufficiente per reconnect robusto a 4-8p, switch a Colyseus ([github.com/colyseus/colyseus](https://github.com/colyseus/colyseus)) Node native authoritative state sync — 2x effort ma production-grade.

**Deferred M12+**: P2 full Form evoluzione (formEngine.js + Mating/Nido loop + Apex). M10 ha già PI pack runtime come primo piede, M12 estende a form transitions.

**DoD M11**:

- 4 clients connect to single host, declare intents simultaneously
- Reconnect survive 1 drop/player
- TV view shows resolve animation, phone view shows own unit actions
- Scorecard end M11: **5/6 🟢** (P1, P3, P4, P5, P6) + **1/6 🟡** (P2 in progress M12)
- Sprint close + CLAUDE.md sync + audit doc addendum

---

## Cross-cutting patterns (kill-60)

**Non spendere tempo su**:

- Pretending Spore runtime full sim (Wesnoth advancement basta)
- Custom netcode from scratch (Jackbox pattern + Colyseus fallback)
- Perk trees con respec UI (XCOM perk-pair basta)
- MBTI scientific pretense (Disco Elysium diegetic)
- Multiplier tune 3rd iter su hardcore (Long War knob shift)

**Pattern reusable**:

- YAML-driven content (packs, perks, forms) — già codice repo
- In-memory Map → Prisma persistence swap (pattern metaProgression)
- Feature flag rollback (`config/features.yaml` esteso)
- Probe-before-batch + verdict harness auto (validato M7)

## Riferimenti

### External (proven patterns)

- [wesnoth advancement](https://github.com/wesnoth/wesnoth)
- [boardgame.io](https://github.com/boardgameio/boardgame.io)
- [AI War postmortem](https://arcengames.com/ai-war-first-four-years-postmortem-and-by-extension-arcen-history/)
- [Fallout Tactics postmortem](https://www.gamedeveloper.com/design/postmortem-micro-forte-s-i-fallout-tactics-i-)
- [XCOM skill tree analysis](http://t-a-w.blogspot.com/2013/12/xcom-optimal-character-build-or-how-to-design-skill-trees.html)
- [Battle Brothers dev blog](https://battlebrothersgame.com/dev-blog-80-progress-update-new-perk-system/)
- [Jackbox architecture](https://www.abtach.ae/blog/how-to-build-a-game-like-jackbox/)
- [Long War Alien Deployment](<https://www.ufopaedia.org/index.php/Alien_Deployment_(Long_War)>)
- [Colyseus](https://github.com/colyseus/colyseus)

### Internal (curated memory)

- `reference_external_repos.md` — 40+ tiered repos
- `reference_tactical_postmortems.md` — AI War + Fallout Tactics patterns
- `reference_tier0_deep_dive.md` — boardgame.io + wesnoth actionable patterns
- `reference_gdd_audit.md` — GDD 13-section coverage

## Autori

- Master DD (user direction strategic pivot)
- Claude Opus 4.7 (parallel-agent orchestration)
- Explore agent (repo state deep audit)
- general-purpose agent (external pattern synthesis)
- Plan architect agent (roadmap drafting)
