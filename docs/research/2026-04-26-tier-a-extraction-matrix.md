---
title: Tier A extraction matrix — feature donor specifici (single-feature transfer)
doc_status: active
doc_owner: platform-research
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, transfer-plan, tier-a, donor-games, illuminator-source]
related:
  - docs/guide/games-source-index.md
  - .claude/agents/economy-design-illuminator.md
  - .claude/agents/ui-design-illuminator.md
  - .claude/agents/creature-aspect-illuminator.md
  - .claude/agents/pcg-level-design-illuminator.md
  - LIBRARY.md
---

# Tier A extraction matrix — feature donor specifici

> **Scope**: 11 giochi Tier A da `docs/guide/games-source-index.md` (branch `origin/feat/voidling-bound-research`). Single-feature transfer pattern. Per ogni gioco: feature precisa + cosa prendere + reuse path Minimal/Full + status Evo-Tactics + agent owner + cross-game refs.
>
> **Differenza vs Tier S**: niente full deep-dive transfer plan. Una feature, un agent, un reuse path concreto.
>
> **Convenzione status**:
>
> - 🟢 **shipped** — già live in repo
> - 🟡 **partial** — alcuni elementi shipped, gap residuo
> - 🔵 **planned** — backlog ticket esiste
> - ⚪ **not-started** — pattern catalogato, no wire

---

## Tabella sintesi

| #   | Gioco                  | Feature                                    | Pillar     | Status     | Effort Min/Full |
| --- | ---------------------- | ------------------------------------------ | ---------- | ---------- | --------------- |
| 1   | Slay the Spire         | Intent preview UI + gold/relic/potion econ | P1 UI + P6 | 🟢 partial | 4h / 12h        |
| 2   | Hades                  | Multi-currency meta + Codex aspect reveal  | P2 + cross | 🟡         | 6h / 20h        |
| 3   | Monster Train          | Pact Shards opt-in scaling                 | P6         | ⚪         | 5h / 14h        |
| 4   | Into the Breach        | Telegraph rule + handmade-random grid      | P1 + P5    | 🟢 partial | 3h / 10h        |
| 5   | Dead Cells             | Concept graph PCG                          | P2 PCG     | 🔵         | 8h / 24h        |
| 6   | Caves of Qud           | Morphotype gating                          | P2 + P3    | 🔵         | 6h / 18h        |
| 7   | Monster Hunter Stories | Gene grid 3×3                              | P2         | 🔵         | 4h / 12h        |
| 8   | Crusader Kings 3       | DNA chains                                 | P2         | ⚪         | 6h / 30h        |
| 9   | Subnautica             | Habitat lifecycle (Skiv pattern)           | P2 + Skiv  | 🟡         | 3h / 14h        |
| 10  | Spelunky               | 4×4 grid PCG                               | P5 PCG     | ⚪         | 4h / 12h        |
| 11  | Dead Space             | Diegetic UI                                | P1 UI      | ⚪         | 5h / 16h        |

---

## 1. Slay the Spire (Mega Crit · 2017)

**Feature estratta**
Intent preview UI (icona enemy mostra prossima azione + numero damage) + economia run-based gold/relic/potion senza meta-currency.

**Cosa prendere** (3 elementi)

- **Floating intent icon** sopra enemy sprite (icon = action_type, numero = damage forecast). Sempre visibile, deterministico, toccabile per tooltip.
- **Gold per encounter + shop tier**: drop fisso 10-20g/fight + shop ogni X room con prezzi range 50-200g.
- **Relic accretion (passive permanent)** vs **Potion (single-use consumable)**: split chiaro tra "permanent run buff" e "burst on-demand".

**Pillar mappato** P1 UI (intent telegraph) + P6 Fairness (econ visibility)

**Reuse path**

- **Minimal (4h)**: intent icon overlay già parziale (`apps/play/src/render.js` mostra azione SIS) — estendere con damage forecast inline (uses `predictCombat()` esistente).
- **Full (12h)**: gold/relic separation — relic = pickup persistente per run (reuse `formSessionStore` write-through), potion = consumable (reuse `rewardOffer.js` pool R/A/P).

**Status Evo-Tactics** 🟢 partial — intent SIS disclosed in HUD (M11), `pressure_tier` warning_signals live. Gap: damage forecast number sopra enemy + shop tier UI.

**Agent owner** `ui-design-illuminator` (intent preview) + `economy-design-illuminator` (gold/relic split)

**Cross-game refs**

- Into the Breach (catalog #4) telegraph rule è StS taken to extreme (everything, not solo enemy intent)
- Tactics Ogre Reborn HUD (Tier C, ⭐⭐⭐⭐⭐) HP bar floating sopra sprite — stesso paradigma "info attached to entity"
- Hades (catalog #2) Codex unlock via interaction = relic-style discovery

---

## 2. Hades (Supergiant · 2020)

**Feature estratta**
Multi-currency meta-progression (Darkness/Keys/Gems/Nectar/Ambrosia/Titan Blood/Diamonds — 7 currency separate) + Codex aspect reveal (entry sblocca progressively via interaction).

**Cosa prendere** (3 elementi)

- **Currency separation by progression axis**: tight-loop currency (Keys → unlock weapons questa run) vs long-loop (Diamonds → house renovations cross-run).
- **Codex tematico container**: sidebar list + entry view a sezioni espandibili + unlock progressive (locked entries visibili ma testo oscurato).
- **Gradual reveal mitigation**: 7 currency overwhelming → introdurre 1-2 alla volta tramite tutorial run.

**Pillar mappato** P2 Evoluzione (meta currency) + cross (Codex archive UX universale)

**Reuse path**

- **Minimal (6h)**: split PE singolo in 2 currency — `pe_run` (victory XP, spent on Form evolve) vs `shards` (meta-unlock, persists). Reuse `formSessionStore` per persistence.
- **Full (20h)**: full Hades 7-axis = overkill MVP. Target: 3 currency (PE-run, Shards-meta, PI-pack inventory). Wire Codex: `apps/play/src/codexPanel.js` già spec'd in `docs/design/2026-04-27-codex-aliena-hades-schema.md` — schema A.L.I.E.N.A. 6-dim per entry.

**Status Evo-Tactics** 🟡 — Codex schema spec'd 2026-04-27 (Wave 9, 11h totale). Currency single (PE) shipped, multi-axis non started. `repo-archaeologist` agent ha card M-005 stile Hades Codex per museum UX.

**Agent owner** `economy-design-illuminator` (currency split) + `repo-archaeologist` (Codex archive pattern)

**Cross-game refs**

- StS (catalog #1) = pure roguelike, NO meta. Hades = heavy meta. Spettro design.
- Monster Train (catalog #3) Pact Shards = Hades philosophy ma single currency, opt-in scaling
- Triangle Strategy (Tier S) recruit gating = soft "currency" via narrative interaction (Conviction)

---

## 3. Monster Train (Shiny Shoe · 2020)

**Feature estratta**
Pact Shards meta currency opt-in: player sceglie shard count pre-run, ogni shard aggiunge difficulty modifier + reward bonus. Player-controlled scaling.

**Cosa prendere** (3 elementi)

- **Opt-in difficulty knob** con N tiers visibili (Pact 0-25 in MT). Reward scaling proporzionale.
- **Difficulty modifier additive** (es. "+50% enemy HP", "−1 starting energy") — composable, non monolithic difficulty preset.
- **Reward tradeoff trasparente** — UI mostra esattamente "tu prendi X difficulty per Y reward boost".

**Pillar mappato** P6 Fairness (player-controlled difficulty + reward parity)

**Reuse path**

- **Minimal (5h)**: aggiungere `pact_shards: 0..5` param a `/api/campaign/start`, ogni shard = 1 modifier additivo (+10% enemy HP, +1 reinforcement). Reward multiplier proporzionale in `rewardOffer.js` softmax.
- **Full (14h)**: shard library YAML (`data/core/pact_shards.yaml`), UI picker pre-mission con preview totale, telemetry per shard configuration popularity.

**Status Evo-Tactics** ⚪ not-started. Match con M13.P6 hardcore mission timer philosophy ("pod count > HP" Long War 2 — Tier S #9). Sinergia evidente: hardcore scenarios + opt-in shards = endgame engagement.

**Agent owner** `economy-design-illuminator` (Q "difficulty/reward tradeoff opt-in?" → MT P1 catalogato)

**Cross-game refs**

- XCOM Long War 2 (Tier S #9) timer + supply/intel = MT hardcoded. MT version = player-chosen.
- Hades (catalog #2) Heat system = identical pattern (opt-in difficulty stack). MT chronologically prior + cleaner UI.
- AI War Fleet Command (Tier S Pillar 5) AI Progress meter = analog "chosen escalation".

---

## 4. Into the Breach (Subset Games · 2018)

**Feature estratta**
Telegraph rule "sacrifice cool for clarity, every time" (GDC 2019) — TUTTO è visibile prima del player turn: enemy actions, damage numbers, push direction, kill probability. Combinato con grid handmade+randomized (8×8 island maps autorate, enemy spawn random).

**Cosa prendere** (3 elementi)

- **Determinism rule**: zero RNG hidden post-player-decision. Player decisions consume forecast accurately.
- **Push/pull direction arrows** sovrapposte alla grid (visual blast cone before attack).
- **Hand-made island layout + procedural spawn**: 4 islands × 8 maps handcrafted, enemy types/positions randomized per run.

**Pillar mappato** P1 Tattica leggibile + P5 Co-op (shared visibility = co-op planning)

**Reuse path**

- **Minimal (3h)**: extender `predictCombat()` output con push direction + kill_probability già computed. Render arrow overlay in `apps/play/src/render.js`.
- **Full (10h)**: hand-curate 8 tutorial maps + 6 hardcore maps (~50 trait spawn pool randomized). `pcg-level-design-illuminator` ha P0 pattern catalogato.

**Status Evo-Tactics** 🟢 partial. ITB telegraph già adopted (HUD references ⭐⭐⭐⭐, `predictCombat()` deterministic). Gap: full visual overlay (push arrows, kill probability badge) + biome map authoring.

**Agent owner** `ui-design-illuminator` (telegraph) + `pcg-level-design-illuminator` (handmade+random P0)

**Cross-game refs**

- StS (catalog #1) intent preview = ITB pattern reduced (single enemy). ITB = full grid extension.
- Tactics Ogre Reborn (Tier C) HP bar floating = same "info on entity" philosophy
- Frozen Synapse (Tier B) Plan→Prime→Execute = telegraph + simultaneous reveal

---

## 5. Dead Cells (Motion Twin · 2018)

**Feature estratta**
Concept graph PCG — designer authors high-level "concept" (es. "biome con 3 chest, 1 elite, 2 path branches, exit nord-est") + room tiles handcrafted, runtime composer pesca tile per soddisfare concept constraints.

**Cosa prendere** (3 elementi)

- **Concept = constraint spec** (counts + adjacency + path), tile = primitive composable.
- **Hand-tile library** ≥50/biome richiesto per replayability senza ripetizione percepita.
- **Composer = constraint solver** semplice (greedy + backtrack), no full WFC.

**Pillar mappato** P2 PCG (encounter generation) — applicabile a biome-aware reinforcement spawn (V7 shipped) come next-gen layer.

**Reuse path**

- **Minimal (8h)**: definire `data/core/encounter_concepts.yaml` schema (count_min/max per archetype, adjacency rule, exit position) + 5 concept entries + composer Node che pesca da pool reinforcement esistente.
- **Full (24h)**: full hand-tile library 50+ encounter pieces × 4 biomi. Big content investment. Defer post-MVP.

**Status Evo-Tactics** 🔵 planned. `biomeSpawnBias.js` (V7) = primitive layer (affix+archetype weight). Dead Cells concept graph = layer sopra (constraint spec). Gap effort: ~24h full.

**Agent owner** `pcg-level-design-illuminator` (P0 catalogato — "hand-tile + concept hybrid")

**Cross-game refs**

- ITB (catalog #4) hand-made + random spawn = simpler version (no concept graph, manual map authoring)
- Spelunky (catalog #10) 4×4 grid = orthogonal approach (path guarantee via grid topology, not concept)
- Caves of Qud (catalog #6) WFC = full procgen alternative

---

## 6. Caves of Qud (Freehold · 2015+)

**Feature estratta**
Morphotype gating — al char creation player sceglie morphotype (Chimera/Esper/etc.), morphotype determina pool mutation disponibili (physical-only / mental-only / mixed).

**Cosa prendere** (3 elementi)

- **Morphotype = mutation pool tag**. Mutation senza tag = available a tutti (non-restrictive default).
- **Char creation = single critical choice** che restringe spazio decisione successivo (focus reduction).
- **Mutation surface as "Physical features" descriptive postfix** — diegetic, leggibile come narrative.

**Pillar mappato** P2 Evoluzione + P3 Specie×Job (job archetype = morphotype analog)

**Reuse path**

- **Minimal (6h)**: aggiungere `morphotype_pool: [physiological|behavioral|cognitive|...]` field a mutation YAML, default empty = universal. Char creation: select 1 morphotype → filter pool in `mutationOffer.js` (when V3 ships).
- **Full (18h)**: 4 morphotype canonical (Predator / Symbiont / Architect / Ghost) × ~30 mutation tagged + UI selector + tutorial path differente per morphotype.

**Status Evo-Tactics** 🔵 planned. MBTI personality choice in V1 onboarding (PR #1726) = analog soft (4 trait initial choice biased per personality). Caves of Qud = hard restriction. Decision pending: hard gate (CoQ) vs soft bias (V1 current).

**Agent owner** `creature-aspect-illuminator` (P0 catalogato "mutation pool by personality")

**Cross-game refs**

- MHS (catalog #7) gene grid = mutation surface + set bonus (CoQ has flat list, MHS organizes 3×3)
- CK3 (catalog #8) DNA chains = inheritance layer (CoQ has no lineage)
- Triangle Strategy (Tier S) recruit gating = orthogonal (gating by Conviction not mutation pool)

---

## 7. Monster Hunter Stories (Capcom · 2016/21)

**Feature estratta**
Gene grid 3×3 — creature ha 9 slot, ogni mutation occupa 1 slot, 3 mutation stessa categoria allineate (riga/colonna/diagonale) = "bingo" + set bonus narrativo.

**Cosa prendere** (3 elementi)

- **3×3 visual mutation slot** — UI overlay panel (pattern `formsPanel.js` shipped).
- **Set bonus on alignment** — 3 in row stessa `category` = bonus passive.
- **Cap mutations = 9** — design constraint deliberato (acceptable per Apex Skiv).

**Pillar mappato** P2 Evoluzione (mutation visualization + accumulation strategy)

**Reuse path**

- **Minimal (4h)**: schema `data/core/mutation_grid.yaml` (slot 0-8 → mutation_id) per creature, helper `checkBingo()` Node che ritorna set bonus list. UI overlay placeholder.
- **Full (12h)**: panel UI completo `apps/play/src/mutationGridPanel.js` (clone formsPanel pattern) + 30 mutation taggate per category + set bonus library 6-8 entries.

**Status Evo-Tactics** 🔵 planned. M-006 museum card "ancestors-22-trait-wire" già adopted matricial pattern simile. Synergy con M-007 PI-Pacchetti tematici (V4 shipped) — pacchetto = pre-rolled bingo set.

**Agent owner** `creature-aspect-illuminator` (P0 catalogato MHS gene grid)

**Cross-game refs**

- CoQ (catalog #6) morphotype = source (mutation pool), MHS = sink (mutation organization)
- CK3 (catalog #8) DNA chains = lineage temporale, MHS = snapshot spaziale 3×3
- StS (catalog #1) deck building = analog (3-card synergy in deck = set bonus)

---

## 8. Crusader Kings 3 (Paradox · 2020)

**Feature estratta**
DNA chains — string compatta encoding (gene index → value), trasmissibile parent→child + "level-uppable chains" (Attractive/Intelligence/Strength) → 50% probabilità upgrade se entrambi parent hanno alleli.

**Cosa prendere** (3 elementi)

- **DNA = string compatta** = cheap to store, compose, mutate.
- **Probabilistic inheritance** (50% upgrade if both parents share trait) — emergent lineage strength.
- **3-tier chains progression** (e.g. Quick → Quick → Genius) — narrative prestige + mechanical bump.

**Pillar mappato** P2 Evoluzione (lineage genetics) — connesso a V3 Mating/Nido (deferred big rock ~20h post-MVP).

**Reuse path**

- **Minimal (6h)**: `services/generation/geneEncoder.js` (NEW) — encode/decode 32-bit string → trait list. Test inheritance helper standalone, NO wire combat yet.
- **Full (30h)**: full V3 Mating/Nido shipping. Pre-req: M16 V3 design lock + frontend mating UI + lineage telemetry. **Bloccato OD-001 verdict** (Path A/B/C decision user input).

**Status Evo-Tactics** ⚪ not-started — bloccante user decision OD-001. `lineage_id` already in Skiv lifecycle YAML come hook.

**Agent owner** `creature-aspect-illuminator` (P1 catalogato CK3 DNA)

**Cross-game refs**

- MHS (catalog #7) gene grid = snapshot creature, CK3 DNA = inheritance temporale
- Subnautica (catalog #9) habitat lifecycle = single creature evolution, CK3 = multi-generation
- CoQ (catalog #6) morphotype = static char-creation choice, CK3 = dynamic inheritance

---

## 9. Subnautica (Unknown Worlds · 2018)

**Feature estratta**
Habitat lifecycle — creature (Ghost Leviathan) ha biome diversi per stage (juvenile in Lost River shallows, adult in Crater Edge deep). Migration = lore + spawn rule.

**Cosa prendere** (3 elementi)

- **Stage = biome affinity** (hatchling spawn-locked savana, juvenile → desert, mature → caverna).
- **Apex stage = roam multi-biome** (final form unbound).
- **Atlas visualization** — mappa "habitat shift" come UI feedback diegetico (player vede creature evolution come spatial event).

**Pillar mappato** P2 Evoluzione + Skiv canonical creature pattern

**Reuse path**

- **Minimal (3h)**: extend `data/core/skiv/lifecycle.yaml` con `biome_affinity_per_stage: {hatchling: savana, juvenile: desert, mature: caverna, apex: any}`. Wire `biomeSpawnBias.js` per applicare bias per stage.
- **Full (14h)**: 4 species canonical con full lifecycle YAML + Atlas UI map showing creature spatial evolution + `qbnEngine` storylet trigger su biome_resonance_crossed.

**Status Evo-Tactics** 🟡 partial. Skiv canonical creature shipped (`data/core/species.yaml` + `species/dune_stalker_lifecycle.yaml`). Biome migration concept presente ma `biomeSpawnBias` non lo consuma per stage. `creature-aspect-illuminator` ha P1 pattern catalogato.

**Agent owner** `creature-aspect-illuminator` (P1 Subnautica habitat) + canonical Skiv via `.claude/skills/skiv.md`

**Cross-game refs**

- CoQ (catalog #6) morphotype = static at creation, Subnautica = dynamic over time
- CK3 (catalog #8) DNA chains = generational, Subnautica = single-creature longitudinal
- Wildermyth (Tier S) permanent visible change = narrative parallel

---

## 10. Spelunky (Mossmouth · 2008/12)

**Feature estratta**
4×4 grid PCG con guaranteed playability — N×M room slots, starting room top, random path direction (1d5: 1-2 left, 3-4 right, 5 down). Room types {0 filler, 1 L↔R, 2 L↔R↔D, 3 L↔R↔U} guarantee path connectivity.

**Cosa prendere** (3 elementi)

- **Path-guaranteed grid topology** — exit reachable da qualsiasi seed.
- **Room type taxonomy** = small set (~4 types) di tile primitives composable.
- **Dice-driven path direction** — RNG semplicissimo, debuggable, replicabile.

**Pillar mappato** P5 Co-op PCG (mission map generation) + P1 Tattica (grid clarity)

**Reuse path**

- **Minimal (4h)**: `services/generation/spelunkyGrid.js` (NEW) — 3×3 mission map generator (smaller di 4×4 per scope party 4p), 4 room types + dice path. Test playability via BFS connectivity check.
- **Full (12h)**: hand-curate 20 room tiles per room type × 4 biomi (~80 tiles totali) + integrazione encounter system + Atlas mini-map render.

**Status Evo-Tactics** ⚪ not-started. Encounter scenarios attualmente hand-authored (tutorial 01-05 + hardcore 06-07). Spelunky pattern = procedural "between scenarios" connective tissue.

**Agent owner** `pcg-level-design-illuminator` (P0 catalogato Spelunky)

**Cross-game refs**

- ITB (catalog #4) hand+random = orthogonal (no procedural map structure)
- Dead Cells (catalog #5) concept graph = stesso problem, soluzione different (constraint vs grid topology)
- Caves of Qud (Tier S WFC) = full procgen, Spelunky = constrained procgen

---

## 11. Dead Space (Visceral · 2008)

**Feature estratta**
Diegetic UI — HUD integrato su character (RIG suit su back: HP bar + stasis + ammo) + holographic projection da weapon per inventory/menu. Zero overlay screen-space.

**Cosa prendere** (3 elementi)

- **HP/status su entity sprite** (es. luminescent veins su creature mostrano HP%).
- **No screen overlay** for in-world info — info attached to world objects.
- **Holographic projection** from caster per ability targeting (in-fiction tooltip).

**Pillar mappato** P1 UI (immersion + clarity unified)

**Reuse path**

- **Minimal (5h)**: HP visualization via creature sprite tinting (low HP = pulsing red) invece di health bar overlay. Reuse `apps/play/src/render.js` flashUnit pattern.
- **Full (16h)**: full diegetic HUD pass — ability targeting via in-world projection cone, status icons attached to creature feet, no top-screen UI strip. **Conflict potenziale con Tactics Ogre HUD reference (⭐⭐⭐⭐⭐ HP bar floating)** — design call needed.

**Status Evo-Tactics** ⚪ not-started. Catalogato `ui-design-illuminator` P1. Tension con HUD canonical (Tactics Ogre Reborn ⭐⭐⭐⭐⭐ adopted). Decision: diegetic = ambitious-stretch goal, NOT MVP.

**Agent owner** `ui-design-illuminator` (P1 catalogato Dead Space + Outer Wilds)

**Cross-game refs**

- Tactics Ogre Reborn (Tier C ⭐⭐⭐⭐⭐) HP floating bar = canonical adopted, **anti-pattern vs Dead Space** (Tactics Ogre = bar overlay, Dead Space = no overlay)
- StS (catalog #1) intent preview = floating UI overlay (NOT diegetic)
- ITB (catalog #4) telegraph = overlay-heavy. Dead Space = orthogonal philosophy.

---

## Cross-game patterns synthesis

### Cluster: "Currency / Economy"

StS (single-run gold/relic) ↔ Hades (multi-currency meta) ↔ Monster Train (opt-in shards). Spettro design: **pure run-based → light meta → heavy meta → opt-in scaling**. Decision Evo-Tactics: light meta (PE + Shards) coerent con MVP scope.

### Cluster: "Mutation / Genetics"

CoQ (morphotype gating static) ↔ MHS (3×3 grid snapshot) ↔ CK3 (DNA chains lineage) ↔ Subnautica (habitat lifecycle longitudinal). Stack possibile: **CoQ at char-creation + MHS for accumulation visualization + Subnautica for stage progression + CK3 for V3 mating** (latter pending OD-001).

### Cluster: "PCG"

ITB (hand-made + random spawn) ↔ Dead Cells (concept graph) ↔ Spelunky (4×4 grid) ↔ Caves of Qud (WFC, Tier S). **Lowest effort first**: Spelunky 4×4 (4h minimal) → ITB pattern (already partial) → Dead Cells concept graph (24h full) → WFC (research phase).

### Cluster: "UI Telegraph"

StS (intent icon) → ITB (telegraph rule full) → Dead Space (diegetic HUD anti-overlay). Design tension: telegraph (ITB) = overlay-rich vs diegetic (Dead Space) = overlay-zero. Tactics Ogre HUD (Tier C) = pragmatic middle.

---

## Prioritization recommendation

**Highest ROI per effort** (rank by reuse alignment):

1. **Subnautica habitat lifecycle** (3h Min) — unblocks Skiv biome migration, hooks already in repo
2. **ITB telegraph** (3h Min) — extends `predictCombat()`, fully aligned con HUD canonical
3. **StS intent preview damage forecast** (4h Min) — extends shipped intent SIS HUD
4. **MHS gene grid** (4h Min) — wires existing PI-Pacchetti V4 + matricial museum cards
5. **Spelunky 4×4 PCG** (4h Min) — opens encounter procgen pipeline

**Bloccati su decision pending**:

- CK3 DNA chains → OD-001 V3 Mating verdict
- Dead Space diegetic UI → conflict resolution con Tactics Ogre HUD canonical

**Big content investment** (defer post-MVP):

- Dead Cells concept graph (24h Full) — richiede 50+ tiles/biome
- Hades full 7-currency (20h Full) — overwhelming MVP players

---

## Maintenance hooks

- **Update trigger**: nuovo Tier A entry in `docs/guide/games-source-index.md` → aggiungere riga matrix + cross-game refs.
- **Status refresh**: ogni sprint che ship feature da matrix → aggiornare status emoji + link PR.
- **Cross-ref delta**: se nuovo museum card cita Tier A pattern → aggiornare "Cross-game refs" sezione gioco rilevante.
- **Review cycle**: 90 giorni `last_verified` (governance frontmatter).

---

## Riferimenti

- [docs/guide/games-source-index.md](../guide/games-source-index.md) — source catalog (419 LOC, branch `origin/feat/voidling-bound-research`)
- [.claude/agents/economy-design-illuminator.md](../../.claude/agents/economy-design-illuminator.md) — StS + Hades + MT pattern owner
- [.claude/agents/ui-design-illuminator.md](../../.claude/agents/ui-design-illuminator.md) — StS intent + ITB telegraph + Dead Space diegetic owner
- [.claude/agents/creature-aspect-illuminator.md](../../.claude/agents/creature-aspect-illuminator.md) — CoQ + MHS + CK3 + Subnautica owner
- [.claude/agents/pcg-level-design-illuminator.md](../../.claude/agents/pcg-level-design-illuminator.md) — ITB + Dead Cells + Spelunky owner
- [docs/research/triangle-strategy-transfer-plan.md](triangle-strategy-transfer-plan.md) — Tier S deep-dive reference template
- [docs/museum/MUSEUM.md](../museum/MUSEUM.md) — 12 card index (museum-first protocol)
- [LIBRARY.md](../../LIBRARY.md) — Repo esterni studiati canonical
