---
title: Cross-game tier matrices synthesis — Tier S/A/B/E donor patterns shipped vs pending
doc_status: proposed
doc_owner: platform-research
workstream: cross-cutting
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, synthesis, tier-matrices, donor-games, pillar-mapping, roi-ranking]
related:
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/research/2026-04-26-tier-a-extraction-matrix.md
  - docs/research/2026-04-26-tier-b-extraction-matrix.md
  - docs/research/2026-04-26-tier-e-extraction-matrix.md
  - docs/guide/games-source-index.md
---

# Cross-game tier matrices synthesis

> Aggregato 4 extraction matrices (Tier S 13 giochi + Tier A 11 + Tier B 15 + Tier E 20 tech voices = 59 fonti). Mappatura pillar Evo-Tactics × shipped/pending × ROI. Effort tier S=≤4h · M=≤16h · L=≤40h.

---

## 1. TOP 15 highest-impact patterns

Ranked per (impact pillar × inverse effort × status delta proximity). Fonte = matrix di origine.

| #   | Pattern                                  | Source (Tier)            | Pillar       | Steal (1-line)                                              | Effort |
| --- | ---------------------------------------- | ------------------------ | ------------ | ----------------------------------------------------------- | :----: |
| 1   | Wait/Hold action +20% speed              | FFT (S)                  | P1           | Skip turno → riapparire prima nella queue                   |   S    |
| 2   | Color-coded MBTI tag debrief             | Disco Elysium (S)        | P4           | Tag axis dominante per round narrative log                  |   S    |
| 3   | Time-of-day modifier 3-4 stati           | Wesnoth (S)              | P6           | Lawful/chaotic shift via 1 enum + formula                   |   S    |
| 4   | AI Progress meter 0-100 canonical        | AI War (S)               | P5+P6        | Numero unico tier-gate refactor pressure                    |   S    |
| 5   | Subnautica habitat lifecycle per stage   | Subnautica (A)           | P2 + Skiv    | biome_affinity_per_stage YAML wire spawn bias               |   S    |
| 6   | ITB telegraph push/pull arrows           | Into the Breach (A)      | P1 + P5      | Render arrow overlay già computed da predictCombat          |   S    |
| 7   | StS intent damage forecast               | Slay the Spire (A)       | P1 UI        | Numero damage inline su intent icon enemy                   |   S    |
| 8   | Pathfinder XP budget per encounter       | Pathfinder TTRPG (E)     | P6           | xp_budget_table.yaml deterministic difficulty               |   S    |
| 9   | DuckDB JSONL telemetry pipeline          | DuckDB (E)               | P6 ops       | SQL nativo su logs/session-telemetry-*.jsonl                |   S    |
| 10  | HP bar floating sopra sprite             | Tactics Ogre Reborn (S)  | P1 UI        | Refactor sidebar HUD → overlay sprite                       |   M    |
| 11  | MHS gene grid 3×3 set bonus              | Monster Hunter Stories (A)| P2          | 9 slot mutation + bingo align bonus                         |   M    |
| 12  | Hades Pact menu modificatori opt-in      | Hades / Monster Train (S/A/B)| P6        | Menu shard composable, reward scaling proporzionale         |   M    |
| 13  | Cogmind tooltip stratificati             | Cogmind (B)              | P2 + P3      | Trade-off espliciti expand-on-hover                         |   S    |
| 14  | Officer Training School meta perks       | XCOM EW (S)              | P3           | Campaign-gated 6-8 meta perk slot                           |   M    |
| 15  | Thought Cabinet UI panel + cooldown      | Disco Elysium (S)        | P4           | Slot mentali equip-per-N-round → unlock effetto             |   M    |

Quick-win combo (#1+#2+#3+#4+#7+#8 = ~21h totali) chiude P1 telegraph + P4 surfacing + P6 fairness in ~3 working days.

---

## 2. Patterns ALREADY SHIPPED

Cross-reference matrix flag + recent PR (#1869-#1901 range visible).

**Tier S già canonical**:

- **Hex axial coordinate** (Wesnoth + AncientBeast) → `hexGrid.js` ADR-2026-04-16
- **Round model + initiative formula** (FFT base) → `roundOrchestrator.js` (M2)
- **Form-pack additivo + bias 16×3** (Spore) → `packRoller.js` + `form_pack_bias.yaml` (M12.B PR #1690)
- **XCOM EU/EW perk-pair** → 84 perks `data/core/progression/perks.yaml` + `ProgressionEngine` (M13.P3 PR #1697)
- **Long War 2 mission timer + pod activation** → `missionTimer.js` + `reinforcementSpawner.js` (M13.P6 PR #1698)
- **Jackbox host-auth + 4-letter consonant code + reconnect** → M11 Phase A-C PR #1680/#1682/#1684/#1685/#1686
- **Disco Elysium 3-stage onboarding overlay** → V1 PR #1726 (`onboardingPanel.js`)
- **Wesnoth content/balance separation** → `data/core/` + `packs/evo_tactics_pack/`
- **AI War asymmetric AI rules** (data-driven) → `ai_intent_scores.yaml` + `utilityBrain.js`

**Tier A shipped/partial**:

- **Slay the Spire intent preview HUD** (#1) → 🟢 partial (gap = damage forecast number)
- **Into the Breach telegraph rule** (#4) → 🟢 partial via `predictCombat()` deterministic
- **Subnautica Skiv lifecycle** (#9) → 🟡 shipped per dune_stalker, per-stage biome_affinity TODO

**Recent PRs visible matching matrix items** (#1869-#1901 range):

- `fft-wait-action #1896` → matrix Tier S #2 row 2 (Wait/Hold +20% speed) **SHIPPED**
- `disco-mbti #1897` → matrix Tier S #9 row 3 (color-coded MBTI tag debrief) **SHIPPED**
- `ai-progress-meter #1898` → matrix Tier S #10 row 1 (AI Progress 0-100 canonical) **SHIPPED**
- `pathfinder-xp-budget #1894` → matrix Tier E #4 (XP budget table) **SHIPPED**
- `encounter-yaml-loader #1873` → primitive layer per Dead Cells/Spelunky concept graph
- `voidling-bound research #1883` → branch source originario tier-A matrix

**Tier B shipped/partial**:

- focus_fire combo (Magicka extension base) wired M2 sessione 17/04
- Pack roll d20+BIAS (Isaac variety pattern) M12.B
- HUD ATB initiative timeline ref (Battle Brothers / FF7R) docs/core/44-HUD
- VC scoring "come giochi modella" (Hades alignment GDC)

**Tier E shipped (methodology)**:

- Game Design Patterns Chalmers (#15) — Action Point + RPS + Asymmetric + Team Combos integrati implicitamente
- Game Programming Patterns Nystrom (#16) — State Machine xstate + Observer + Command pattern in session engine
- Software Archaeology + Dublin Core + git pickaxe (#18-#20) — `repo-archaeologist` agent + 11 museum cards live

---

## 3. Patterns PENDING (high-priority pickup)

Top 10 NOT shipped, ranked ROI = (impact_pillar × inverse_effort × status_proximity).

| Rank | Pattern                                       | Source              | Pillar       | Effort | Why now                                                 |
| ---- | --------------------------------------------- | ------------------- | ------------ | :----: | ------------------------------------------------------- |
| 1    | StS damage forecast number su intent icon     | Slay the Spire      | P1 UI        |   S    | Estende intent SIS HUD shipped, predictCombat già ready |
| 2    | ITB push/pull arrows + kill probability badge | Into the Breach     | P1 + P5      |   S    | predictCombat output unused per render overlay          |
| 3    | Subnautica per-stage biome_affinity wire      | Subnautica          | P2 + Skiv    |   S    | Hook YAML già esiste, biomeSpawnBias.js consumer ready  |
| 4    | DuckDB telemetry analytics pipeline           | DuckDB tech voice   | P6 ops       |   S    | V7 telemetry endpoint live, zero analytics layer        |
| 5    | HP bar floating sopra sprite refactor         | Tactics Ogre Reborn | P1 UI        |   M    | docs/core/44-HUD ⭐⭐⭐⭐⭐ già targetato              |
| 6    | MHS gene grid 3×3 + bingo set bonus           | Monster Hunter Stories | P2       |   M    | formsPanel pattern reusable, sinergia V4 PI-pacchetti   |
| 7    | Hades/Monster Train Pact opt-in difficulty    | Hades + MT          | P6           |   M    | Hardcore-07 calibration synergy player-controlled       |
| 8    | Cogmind tooltip stratificati base+expand      | Cogmind             | P2 + P3      |   S    | Allinea M12 Form layer, ~4-6h effort                    |
| 9    | Frozen Synapse replay cinematico 3-5s         | Frozen Synapse      | P1 TV-play   |   M    | Gap concreto TV-shared, post-resolution loop            |
| 10   | Stockfish SPRT calibration early-stop         | Stockfish           | P6 ops       |   S    | Chiude eyeball iter manual, scipy.stats wrapper         |

**Bonus high-value M effort**:

- Officer Training School meta perks (XCOM EW, P3, ~10h)
- Liberation region map macro layer (XCOM LW2, P6, ~15h)
- Wildermyth layered storylets pool (narrative, ~10-15h)
- Charm/recruit boss post-battle (Tactics Ogre, P3, ~8h)

---

## 4. Anti-patterns / explicit deferrals

Cross-matrix consensus su NOT-COPY:

- **Cinematic blocking transitions 30s+** (Spore stage, AI War tutorial, Fallout intro) — anti-pattern co-op (blocca tutti)
- **Permadeath senza recovery** (FE classico, XCOM rage) — anti-pattern co-op offline player not-fault
- **Opaque RNG % display** (FE 1%-True-Hit, FFT zodiac, Wildermyth aging hidden) — anti-pattern Halfway lesson
- **Single session 8+ ore** (AI War, FE, FFT campaign) — anti-pattern roguelike compact 1-2h target
- **15+ class subdivision** (LW2 sniper-tree) — bilanciamento single-dev impossibile
- **Audience mode 100+ spectator** (Jackbox) — out of scope co-op tactical 4-8 cap
- **6-on-6 Pokémon scale** (Tier B reconfirm da NS2) — 4-coop + 1 commander è soft cap
- **Pure PvP-only multiplayer** (AncientBeast, Wesnoth MP-only) — non match P5 jackbox/TV-shared
- **Crafting deep equipment system** (Tactics Ogre) — Evo-Tactics è creature-focused, scope creep
- **JP grinding cross-job 100+ ore** (FFT) — taglio a 7 livelli XCOM gia shipped
- **Real-time mode toggle** (Fallout Tactics) — complessità combinatoria UX, round-based only
- **Spore civ + space stage** scope creep — Evo-Tactics resta tactical-only, no city-builder
- **Marriage / cinematic narrative panel** (FE Fates, Wildermyth) — out scope sociale + asset cost
- **Stat allocation 8+ point system SPECIAL-clone** (Fallout Tactics) — manteniamo job + perk XCOM
- **DLC class lockout / IAP gating** (XCOM EU + Jackbox) — anti-pattern free-to-play
- **Microphone passthrough audience-vote** (Jackbox audience) — text/intent only

**Hard deferrals (decision pending)**:

- **CK3 DNA chains lineage** → bloccato OD-001 V3 Mating verdict (Path A/B/C user input)
- **Dead Space diegetic UI** → conflict resolution con Tactics Ogre HUD canonical (⭐⭐⭐⭐⭐)
- **ASP solver clingo + Grafana** → new dep approval gate
- **deck.gl hex WebGL** → blocked finché Mission Console source non ricostruito

**Big content investment defer post-MVP**:

- Dead Cells concept graph (24h Full, richiede 50+ tiles/biome)
- Hades full 7-currency (overwhelming MVP players)
- Wargroove commander unit (20-25h L, ADR pre-implementation)
- NS2 Strategist async role 5p+ (25-30h L)

---

## 5. Cross-tier convergence (3+ games same pattern = robust signal)

**Convergenza forte (4+ giochi)**:

- **UI Telegraph / info-on-entity philosophy**: StS (intent icon) + ITB (telegraph rule full) + Tactics Ogre (HP bar floating) + Halfway (decision numbers) + Cogmind (tooltip stratificati) + FFT (CT bar) + Battle Brothers (initiative timeline) — **7 fonti**. Pattern canonical: tutti i numeri decisionali pre-action visibili. Tension diegetic vs overlay (Dead Space contraria) = scelta esplicita Evo-Tactics → overlay-rich (telegraph wins).
- **Mutation/genetics layered pipeline**: CoQ (morphotype gating static at creation) → MHS (3×3 grid snapshot accumulation) → Subnautica (per-stage biome lifecycle) → CK3 (DNA chains lineage temporale) → Wildermyth (battle-scar permanent) — **5 fonti**. Stack proposto: CoQ@creation + MHS@accumulation + Subnautica@stage + CK3@V3-mating.
- **Opt-in difficulty modifier composable**: Hades Heat/Pact + Monster Train Pact Shards + AI War AI Progress meter + XCOM LW2 timer/supply — **4 fonti**. Pattern: player-controlled scaling + reward proporzionale + difficulty stack composable, NOT monolithic preset.

**Convergenza media (3 giochi)**:

- **PCG hand+random hybrid**: ITB (handmade island + random spawn) + Dead Cells (concept graph) + Spelunky (4×4 grid topology) — 3 fonti. Lowest-effort first = Spelunky 4×4 (~4h Min).
- **Permanent visible aspect change post-event**: Wildermyth (battle-scar sprite) + Subnautica (stage migration) + Spore (silhouette swap per part) — 3 fonti. Match M12 Form evolution shipped, estensione battle-scar registry.
- **Weapon triangle / RPS leggibile**: Fire Emblem (sword>axe>lance) + AncientBeast (6 elementi) + Wargroove (rock-paper-scissors counter) — 3 fonti. Match `species_resistances.yaml` shipped, gap = HUD attack preview display.
- **Replay determinism + seed**: Wesnoth (replay file deterministic) + Frozen Synapse (cinematico round) + ITB (deterministic player decisions) — 3 fonti. Endpoint `/api/session/:id/replay` candidate (~8h).
- **Currency split run vs meta**: StS (single-run gold/relic) + Hades (multi-currency 7-axis) + Monster Train (Pact Shards meta) — 3 fonti. Light-meta MVP scope (PE-run + Shards-meta + PI-pack).
- **Companion lifecycle / aging**: Wildermyth (cross-campaign aging) + Battle Brothers (roster persistence cross-mission) + BG2 (companion arc milestone) — 3 fonti. Aging counter cross-session candidate.
- **Episode/day pacing narrative**: Disco Elysium (day/time milestone) + Wildermyth (chapter structure) + Tactics Ogre WORLD (rewind chapter) — 3 fonti. M14 campaign advance flavor copy ~2h cosmetic win.

**Convergenza weak (2 giochi, signal-but-fragile)**:

- Charm/recruit boss post-battle (Tactics Ogre + AncientBeast Beast Bond) — 2 fonti
- Officer/meta-class research-gated (XCOM EW + LW2 Haven recruit) — 2 fonti
- Internal voice MBTI surface (Disco Elysium + Wildermyth narrative) — 2 fonti

---

## Synthesis takeaway

**Stato pillars post-shipped**: 1/6 🟢 (P1) + 3/6 🟢 candidato (P2/P3/P6 calibration userland) + 2/6 🟡 (P4/P5 playtest gating). Quick-win Sprint successivo (~21h, 6 patterns S-tier matrix #1-#9 high-priority) chiude 4/6 telegraph+surfacing gap.

**Convergenza signal**: UI Telegraph (7 fonti) e Mutation pipeline (5 fonti) sono pattern robustissimi cross-tier — qualsiasi investment qui è low-risk. Opt-in difficulty (4 fonti) sblocca P6 endgame engagement post-MVP.

**Bloccanti non-tech**:

1. OD-001 V3 Mating verdict (CK3 DNA chains gated)
2. TKT-M11B-06 playtest live userland (P5 🟢 final)
3. Hardcore-07 calibration N=10 userland (P6 🟢 final)
4. Dead Space vs Tactics Ogre HUD design call (low priority)

**Biggest scope-creep risks**: Dead Cells concept graph (50+ tiles), Hades 7-currency, NS2 Strategist async role, Wargroove commander, ECS strict refactor — tutti L-tier defer post-MVP.

---

## Maintenance hooks

- Update trigger: nuovo Tier* matrix entry → riga sintesi qui (top 15 + convergenza ricalibra).
- Status verifica: ogni 90 giorni cross-check shipped column vs PR landed.
- Convergenza promotion: se nuovo gioco 3+esimo conferma pattern → promote a museum card via `repo-archaeologist`.

## Riferimenti

- [docs/research/2026-04-26-tier-s-extraction-matrix.md](../research/2026-04-26-tier-s-extraction-matrix.md) — 13 giochi deep-dive
- [docs/research/2026-04-26-tier-a-extraction-matrix.md](../research/2026-04-26-tier-a-extraction-matrix.md) — 11 giochi single-feature
- [docs/research/2026-04-26-tier-b-extraction-matrix.md](../research/2026-04-26-tier-b-extraction-matrix.md) — 15 giochi postmortem
- [docs/research/2026-04-26-tier-e-extraction-matrix.md](../research/2026-04-26-tier-e-extraction-matrix.md) — 20 tech voices
- [docs/guide/games-source-index.md](../guide/games-source-index.md) — source catalog canonical
- [docs/museum/MUSEUM.md](../museum/MUSEUM.md) — 11 cards Dublin-Core curate
