#!/usr/bin/env python3
"""Seed `data/core/tickets/proposed/` with 73 cross-game extraction residual tickets.

Source: docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md §B
Architecture: docs/research/2026-04-26-ticket-auto-gen-architecture-D.md

One-shot bootstrap. Re-run idempotent (overwrites existing files).
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROPOSED = ROOT / "data" / "core" / "tickets" / "proposed"
PROPOSED.mkdir(parents=True, exist_ok=True)

# Common defaults
SOURCE_DOC = "docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md"
TODAY = "2026-04-27"
CREATED_BY = "claude-code"

# (id, title, pillar, effort, donor_name, tier, matrix_anchor, agent_owner, reuse_level, summary, museum_card_optional)
TICKETS = [
    # ===== Tier S residual (38 pattern) =====
    # FFT (4)
    ("TKT-P1-FFT-CT-BAR-VISUAL", "FFT CT bar visual overlay (charge time per unit)", "P1", 4, "Final Fantasy Tactics", "S", "#2-final-fantasy-tactics-square-1997--p1-tattica", "ui-design-illuminator", "minimal", "Render barre charge time per ogni unit, riempie secondo speed. Backend `initiative` formula esiste, manca UI HUD overlay.", None),
    ("TKT-COMBAT-FFT-FACING-CRIT-3-ZONE", "FFT facing crit 3-zone (front/side/rear, +50%/+25%)", "P1", 4, "Final Fantasy Tactics", "S", "#2-final-fantasy-tactics-square-1997--p1-tattica", "balance-illuminator", "minimal", "Estende squad focus_fire +1 a `facing_modifier` in `resolveAttack`. 3 zone con bonus differenziato.", None),
    ("TKT-COMBAT-FFT-JP-CROSS-JOB", "FFT JP cross-job ability inheritance", "P3", 10, "Final Fantasy Tactics", "S", "#2-final-fantasy-tactics-square-1997--p1-tattica", "balance-illuminator", "moderate", "Switch job tiene abilita imparate. Bookmark, NOT priority. Estende `progressionStore` + `perks.yaml`.", None),
    # Tactics Ogre Reborn (3, exclude WORLD rewind defer)
    ("TKT-UI-TACTICS-OGRE-HP-FLOATING", "Tactics Ogre HP bar floating sopra sprite", "P1", 6, "Tactics Ogre Reborn", "S", "#3-tactics-ogre-reborn-square-enix-2022--p1-ui--p3", "ui-design-illuminator", "minimal", "Refactor render.js HUD da sidebar a overlay sprite (breaking change cosmetic). Doc 44-HUD ranking 5/5.", None),
    ("TKT-NARRATIVE-TACTICS-OGRE-CHARM", "Tactics Ogre Charm/recruit boss via dialogue", "P3", 8, "Tactics Ogre Reborn", "S", "#3-tactics-ogre-reborn-square-enix-2022--p1-ui--p3", "narrative-design-illuminator", "moderate", "Debrief dialogue trigger + roster add. Aggiunge unit a roster post-battle via dialogue success.", None),
    ("TKT-UI-TACTICS-OGRE-AUTO-BATTLE", "Tactics Ogre auto-battle quick simulation button", "P1", 3, "Tactics Ogre Reborn", "S", "#3-tactics-ogre-reborn-square-enix-2022--p1-ui--p3", "ui-design-illuminator", "minimal", "UI button auto-resolve su `predict_combat()` esistente. Backend N=1000 sim live, manca surface.", None),
    # Fire Emblem (4)
    ("TKT-NARRATIVE-FIRE-EMBLEM-SUPPORT-CONV", "Fire Emblem support conversations (proximity tracking)", "P3", 10, "Fire Emblem", "S", "#4-fire-emblem-serie-intelligent-systems--p3", "narrative-design-illuminator", "moderate", "`proximity_count[unitA][unitB]` tracking + 5-6 conversation content + adjacency stat bonus.", None),
    ("TKT-UI-FIRE-EMBLEM-WEAPON-TRIANGLE", "Fire Emblem weapon triangle advantage display", "P3", 4, "Fire Emblem", "S", "#4-fire-emblem-serie-intelligent-systems--p3", "balance-illuminator", "minimal", "Consume `species_resistances.yaml` + display advantage in HUD attack preview. Channel resistance leggibile.", None),
    ("TKT-P3-FIRE-EMBLEM-PROMOTION-ITEM", "Fire Emblem promotion item (master seal)", "P3", 6, "Fire Emblem", "S", "#4-fire-emblem-serie-intelligent-systems--p3", "balance-illuminator", "moderate", "Item-gated tier upgrade. Reward-card concreto Disco Elysium thought cabinet style. M13.P3 perk-pair gating.", None),
    ("TKT-P3-FIRE-EMBLEM-DANCER-CLASS", "Fire Emblem Dancer/Refresher class canonical", "P3", 5, "Fire Emblem", "S", "#4-fire-emblem-serie-intelligent-systems--p3", "creature-aspect-illuminator", "moderate", "Promuovi trait `coscienza_d_alveare_diffusa` analog a job canonical Refresher in jobs.yaml. Unit ridona action ad ally.", None),
    # Wesnoth (5)
    ("TKT-ECONOMY-WESNOTH-RECRUIT-RECALL", "Wesnoth recruit + recall economy", "P6", 5, "Wesnoth", "S", "#5-wesnoth-open-source-2003--p1p3p6", "economy-design-illuminator", "minimal", "`recall_cost` formula con tier scaling roster overlay. Veterana cara ma stat tier-up vs nuova recruit.", None),
    ("TKT-BALANCE-WESNOTH-TIME-OF-DAY", "Wesnoth time-of-day modifier (lawful/chaotic)", "P6", 3, "Wesnoth", "S", "#5-wesnoth-open-source-2003--p1p3p6", "balance-illuminator", "minimal", "1 enum dawn/day/dusk/night + formula resolveAttack. Modifier per orario/allineamento creature.", None),
    ("TKT-PCG-WESNOTH-RANDOM-MAP", "Wesnoth random map generator weighted noise + symmetry", "P5", 15, "Wesnoth", "S", "#5-wesnoth-open-source-2003--p1p3p6", "pcg-level-design-illuminator", "moderate", "PCG balanced multiplayer maps. Beyond hand-authored encounter. weighted noise + symmetry constraint.", None),
    ("TKT-COMBAT-WESNOTH-REPLAY-DETERMINISTIC", "Wesnoth replay file deterministic (seed + actions log)", "P1", 8, "Wesnoth", "S", "#5-wesnoth-open-source-2003--p1p3p6", "session-debugger", "moderate", "Endpoint `/api/session/:id/replay` ricostruzione battle. vcSnapshot + raw_events + seed = base.", None),
    ("TKT-UI-WESNOTH-ERA-SELECTOR-LOBBY", "Wesnoth era system pack-as-era lobby UI", "P5", 4, "Wesnoth", "S", "#5-wesnoth-open-source-2003--p1p3p6", "ui-design-illuminator", "minimal", "Promuovi `pack_manifest.yaml` registry to era selector in lobby UI cosmetic.", None),
    # AncientBeast (4)
    ("TKT-COMBAT-ANCIENTBEAST-BEAST-BOND", "AncientBeast Beast Bond reaction trigger adjacency", "P1", 5, "AncientBeast", "S", "#6-ancientbeast-freezingmoon--p1-hex", "creature-aspect-illuminator", "minimal", "Pattern adjacency trigger per-creature trait. Es. ally specie X adiacente attacca → +1 dmg.", None),
    ("TKT-BALANCE-ANCIENTBEAST-ELEMENTI", "AncientBeast 3 nuovi elementi (earth/wind/dark)", "P1", 6, "AncientBeast", "S", "#6-ancientbeast-freezingmoon--p1-hex", "balance-illuminator", "minimal", "Estende channel resistance fire/water/lightning a 6 totali con balance pass.", None),
    ("TKT-COMBAT-ANCIENTBEAST-ABILITY-R3-R4", "AncientBeast ability r3/r4 tier per job", "P3", 10, "AncientBeast", "S", "#6-ancientbeast-freezingmoon--p1-hex", "balance-illuminator", "moderate", "Estende `abilities.yaml` r1/r2 esistente a 4 tier (M2). Costing scaling per tier.", None),
    ("TKT-UI-ANCIENTBEAST-WIKI-CROSS-LINK", "AncientBeast wiki cross-link runtime", "cross-cutting", 3, "AncientBeast", "S", "#6-ancientbeast-freezingmoon--p1-hex", "ui-design-illuminator", "minimal", "Cross-link tra `packs/evo_tactics_pack/docs/catalog/` + runtime via slug. Showcase generator.", None),
    # XCOM EW (1)
    ("TKT-P3-XCOM-EW-OFFICER-SCHOOL", "XCOM EW Officer Training School meta perks", "P3", 10, "XCOM EU/EW", "S", "#7-xcom-euew-firaxis-2012-13--p3-perks", "balance-illuminator", "moderate", "Campaign-gated 6-8 meta perk slot. Endpoint `/api/campaign/officer-perks`. Research-gated.", None),
    # XCOM Long War 2 (3)
    ("TKT-ECONOMY-LW2-SUPPLY-INTEL", "LW2 Supply/intel currency separation", "P6", 8, "XCOM Long War 2", "S", "#8-xcom-long-war-2-pavonis-2017--p6-timer", "economy-design-illuminator", "moderate", "Meta-resource gating mission availability. PE/PT esistono, intel discovery non wired.", None),
    ("TKT-PCG-LW2-LIBERATION-MAP", "LW2 Liberation campaign region map macro", "P6", 15, "XCOM Long War 2", "S", "#8-xcom-long-war-2-pavonis-2017--p6-timer", "pcg-level-design-illuminator", "moderate", "Region grid + liberation% counter. Macro strategic layer above tactical. M14 campaign engine ext.", None),
    ("TKT-ECONOMY-LW2-HAVEN-RADIO", "LW2 Haven recruitment radio passive growth", "P6", 6, "XCOM Long War 2", "S", "#8-xcom-long-war-2-pavonis-2017--p6-timer", "economy-design-illuminator", "minimal", "Pool growth tick over campaign turns. M11 lobby roster + passive recruit pool.", None),
    # Disco Elysium (4)
    ("TKT-UI-DISCO-THOUGHT-CABINET", "Disco Elysium Thought Cabinet UI panel + cooldown", "P4", 8, "Disco Elysium", "S", "#9-disco-elysium-zaum-2019--p4-thought-cabinet", "ui-design-illuminator", "moderate", "N slot mentali equip-per-N-round → unlock effetto. UI panel Thoughts. Già P0 residuo synthesis.", None),
    ("TKT-NARRATIVE-DISCO-INTERNAL-VOICE", "Disco Elysium 4-MBTI internal voice axes", "P4", 10, "Disco Elysium", "S", "#9-disco-elysium-zaum-2019--p4-thought-cabinet", "narrative-design-illuminator", "moderate", "Narrative log debrief con voce-per-axis MBTI durante combat hint. 4 voci basic.", None),
    ("TKT-NARRATIVE-DISCO-SKILL-CHECK-POPUP", "Disco Elysium skill check passive→active popup", "P4", 4, "Disco Elysium", "S", "#9-disco-elysium-zaum-2019--p4-thought-cabinet", "narrative-design-illuminator", "minimal", "Surface trigger via popup notification. `passesBasicTriggers` esistente + ancestors trigger system.", None),
    ("TKT-NARRATIVE-DISCO-DAY-PACING", "Disco Elysium day/time pacing flavor copy", "P4", 2, "Disco Elysium", "S", "#9-disco-elysium-zaum-2019--p4-thought-cabinet", "narrative-design-illuminator", "minimal", "Cosmetic flavor 'Giorno N di Aurora' nei debrief M14 campaign.", None),
    # AI War (3)
    ("TKT-META-AI-WAR-ASYMMETRIC-DOC", "AI War asymmetric rules registry doc", "P5", 2, "AI War: Fleet Command", "S", "#10-ai-war-fleet-command-arcen-2009--p5p6", "balance-illuminator", "minimal", "Codify pattern AI ha rule diverse. Lock asymmetria come canonical pattern. `ai_intent_scores.yaml` data-driven già live.", None),
    ("TKT-META-AI-WAR-DECENTRALIZED-DOC", "AI War decentralized unit AI doc reference", "P5", 1, "AI War: Fleet Command", "S", "#10-ai-war-fleet-command-arcen-2009--p5p6", "coop-phase-validator", "minimal", "Reference utility brain `utilityBrain.js`. Per-unit decision locally, no central planner.", None),
    ("TKT-COMBAT-AI-WAR-DEFENDERS-ADVANTAGE", "AI War Defender's advantage modifier", "P6", 3, "AI War: Fleet Command", "S", "#10-ai-war-fleet-command-arcen-2009--p5p6", "balance-illuminator", "minimal", "+50% AI defensive vs player aggressive. 1 modifier in resolveAttack quando entity_type=ai + role=defender.", None),
    # Fallout Tactics (3)
    ("TKT-PCG-FALLOUT-ENCOUNTER-CLI", "Fallout Tactics encounter authoring CLI YAML extension", "P5", 6, "Fallout Tactics", "S", "#11-fallout-tactics-micro-forte-2001--p1p6", "pcg-level-design-illuminator", "moderate", "`tools/py/master_dm.py` REPL → YAML generator + validator. Encounter editor custom.", None),
    ("TKT-BALANCE-FALLOUT-NUMERIC-REF-DOC", "Fallout Tactics balance numeric reference doc", "P6", 3, "Fallout Tactics", "S", "#11-fallout-tactics-micro-forte-2001--p1p6", "balance-illuminator", "minimal", "Doc canonical 'balance numeric reference' consolidato `data/core/balance/*.yaml`.", None),
    ("TKT-UI-FALLOUT-FORMATION-PRESET", "Fallout Tactics squad command formation preset", "P5", 5, "Fallout Tactics", "S", "#11-fallout-tactics-micro-forte-2001--p1p6", "ui-design-illuminator", "moderate", "Overlay 4-8 unit roster con formation preset selector. M11 lobby base extension.", None),
    # Wildermyth (5)
    ("TKT-NARRATIVE-WILDERMYTH-STORYLETS", "Wildermyth layered storylets pool campaign", "P4", 10, "Wildermyth", "S", "#12-wildermyth-worldwalker-2021--narrative--creature", "narrative-design-illuminator", "moderate", "Extend pattern Skiv storylets a campaign narrative. Pool handcrafted hooks + procedural fillers.", None),
    ("TKT-CREATURE-WILDERMYTH-BATTLE-SCAR", "Wildermyth permanent visible aspect/battle-scar registry", "P3", 12, "Wildermyth", "S", "#12-wildermyth-worldwalker-2021--narrative--creature", "creature-aspect-illuminator", "moderate", "Mid-fight events alterano sprite long-term. M12 Form evolve già base, estendi a battle-scar registry.", None),
    ("TKT-CREATURE-WILDERMYTH-PORTRAIT-LAYERED", "Wildermyth portrait stratificati layered overlay", "P3", 15, "Wildermyth", "S", "#12-wildermyth-worldwalker-2021--narrative--creature", "creature-aspect-illuminator", "full", "Face + scar + age + clothes via canvas/PIL compositing. render.js attuale è sprite swap.", None),
    ("TKT-CREATURE-WILDERMYTH-AGING", "Wildermyth companion lifecycle aging cross-session", "P3", 10, "Wildermyth", "S", "#12-wildermyth-worldwalker-2021--narrative--creature", "creature-aspect-illuminator", "moderate", "Aging counter cross-session. Roster M11 + Skiv canonical creature lifecycle.", None),
    ("TKT-NARRATIVE-WILDERMYTH-CHOICE-FLAG", "Wildermyth choice → permanent consequence flag", "P4", 4, "Wildermyth", "S", "#12-wildermyth-worldwalker-2021--narrative--creature", "narrative-design-illuminator", "minimal", "Permanent flag in campaign state. M19 debrief narrative log → consequence persist.", None),
    # Jackbox (2)
    ("TKT-UI-JACKBOX-PRINCIPLES-TOAST", "Jackbox Jack Principles guidance toast per phase", "P5", 5, "Jackbox", "S", "#13-jackbox--xcom-2-online-jackbox--firaxis--p5", "ui-design-illuminator", "moderate", "V1 onboarding shipped, estendi a phase-by-phase player guidance toast.", None),
    ("TKT-UI-XCOM-2-POINTS-BUY", "XCOM 2 multi points-buy pre-game allocation", "P5", 8, "XCOM 2 multiplayer", "S", "#13-jackbox--xcom-2-online-jackbox--firaxis--p5", "balance-illuminator", "moderate", "Point budget shared per build squad. Lobby pre-game character creation extension.", None),

    # ===== Tier A residual (11 pattern) =====
    ("TKT-UI-STS-DAMAGE-FORECAST", "Slay the Spire damage forecast inline su intent icon", "P1", 4, "Slay the Spire", "A", "#1-slay-the-spire-mega-crit--2017", "ui-design-illuminator", "minimal", "Estende `predictCombat()` output con damage number sopra enemy. Intent SIS già parziale.", None),
    ("TKT-ECONOMY-HADES-MULTI-CURRENCY", "Hades multi-currency split (PE-run + Shards-meta + PI)", "P2", 6, "Hades", "A", "#2-hades-supergiant--2020", "economy-design-illuminator", "minimal", "Split PE singolo in 3 currency. Tight-loop run + long-loop meta. Codex schema spec'd già.", None),
    ("TKT-P6-MONSTER-TRAIN-PACT-SHARDS", "Monster Train Pact Shards opt-in scaling", "P6", 5, "Monster Train", "A", "#3-monster-train-shiny-shoe--2020", "economy-design-illuminator", "minimal", "Player-controlled difficulty knob N tiers. `pact_shards: 0..5` param /api/campaign/start. Hardcore synergy.", None),
    ("TKT-UI-ITB-PUSH-PULL-ARROWS", "Into the Breach push/pull arrows + kill probability badge", "P1", 3, "Into the Breach", "A", "#4-into-the-breach-subset-games--2018", "ui-design-illuminator", "minimal", "Render arrow overlay già computed da predictCombat. Visual blast cone before attack.", None),
    ("TKT-PCG-DEAD-CELLS-CONCEPT-GRAPH", "Dead Cells concept graph PCG", "P5", 8, "Dead Cells", "A", "#5-dead-cells-motion-twin--2018", "pcg-level-design-illuminator", "moderate", "`encounter_concepts.yaml` schema constraint spec + composer. biomeSpawnBias V7 = primitive layer.", None),
    ("TKT-CREATURE-COQ-MORPHOTYPE", "Caves of Qud morphotype gating mutation pool", "P2", 6, "Caves of Qud", "A", "#6-caves-of-qud-freehold--2015", "creature-aspect-illuminator", "minimal", "`morphotype_pool` field a mutation YAML. Char creation single critical choice. Decision: hard gate vs soft bias.", None),
    ("TKT-CREATURE-MHS-GENE-GRID", "Monster Hunter Stories gene grid 3×3 + bingo set bonus", "P2", 4, "Monster Hunter Stories", "A", "#7-monster-hunter-stories-capcom--201621", "creature-aspect-illuminator", "minimal", "9 slot mutation + bingo align bonus. UI overlay panel pattern formsPanel. Spore S6 dependency.", None),
    ("TKT-CREATURE-CK3-DNA-CHAINS", "CK3 DNA chains geneEncoder lineage", "P2", 6, "Crusader Kings 3", "A", "#8-crusader-kings-3-paradox--2020", "creature-aspect-illuminator", "moderate", "`services/generation/geneEncoder.js` (NEW). Encode/decode 32-bit string → trait list. BLOCKED OD-001 verdict.", None),
    ("TKT-CREATURE-SUBNAUTICA-LIFECYCLE", "Subnautica habitat lifecycle 5-stage Skiv wire", "P2", 3, "Subnautica", "A", "#9-subnautica-unknown-worlds--2018", "creature-aspect-illuminator", "minimal", "`biome_affinity_per_stage` YAML extend Skiv lifecycle + biomeSpawnBias bias per stage.", None),
    ("TKT-PCG-SPELUNKY-4X4-GRID", "Spelunky 4×4 grid PCG path-guaranteed", "P5", 4, "Spelunky", "A", "#10-spelunky-mossmouth--200812", "pcg-level-design-illuminator", "minimal", "`services/generation/spelunkyGrid.js` (NEW). 3×3 mission map generator + 4 room types + dice path.", None),
    ("TKT-UI-DEAD-SPACE-DIEGETIC", "Dead Space diegetic UI HP visualization", "P1", 5, "Dead Space", "A", "#11-dead-space-visceral--2008", "ui-design-illuminator", "minimal", "HP visualization via creature sprite tinting (low HP = pulsing red) invece di health bar overlay. Conflict Tactics Ogre HUD design call.", None),

    # ===== Tier B residual (11 pattern, 4 archive escluded) =====
    ("TKT-UI-HALFWAY-ALL-NUMBERS", "Halfway UI surface ALL decision numbers", "P1", 5, "Halfway", "B", "#1-halfway-2014", "ui-design-illuminator", "moderate", "Tutti numeri decisionali pre-azione: hit% + danno range + durata status + cooldown + soglie MoS. Niente nascosto.", None),
    ("TKT-UI-FROZEN-SYNAPSE-REPLAY-CINEMATICO", "Frozen Synapse replay cinematico round 3-5s", "P1", 12, "Frozen Synapse", "B", "#2-frozen-synapse-2011", "ui-design-illuminator", "moderate", "Replay cinematico round risolto post-resolution. TV play 3-5s loop visualizza outcome simultaneo squad+SIS.", None),
    ("TKT-UI-COGMIND-TOOLTIP-STRATIFICATI", "Cogmind tooltip stratificati trait/ability (base+expand)", "P2", 5, "Cogmind", "B", "#3-cogmind-2015", "ui-design-illuminator", "minimal", "Trait `cost_ap` esteso a multi-cost (slot/energia/vulnerabilità). Tooltip stratificati expand on hover.", None),
    ("TKT-BALANCE-BALATRO-JOKER-FAMILY", "Balatro joker family tagging combo discovery", "P6", 7, "Balatro", "B", "#4-balatro-2024", "balance-illuminator", "moderate", "Tagging trait per joker family (trigger archetype). Combo discovery + balance sweep MAP-Elites archive.", None),
    ("TKT-COOP-MAGICKA-3-ELEMENT-COMBO", "Magicka 3+ element combo extension", "P2", 10, "Magicka", "B", "#5-magicka-2011", "coop-phase-validator", "moderate", "Trait combo system 2-step → 3+ element chain trigger. focus_fire combo già wired (M2).", None),
    ("TKT-COOP-NS2-STRATEGIST-ROLE", "NS2 Strategist role 5p+ async coop", "P5", 28, "Natural Selection 2", "B", "#6-natural-selection-2-2012", "coop-phase-validator", "full", "Modulation 5p+: 1 player Strategist (vista atlas + pressure overlay + intent suggest), altri tactical 4p classic.", None),
    ("TKT-BALANCE-ISAAC-ANOMALY-TRAIT", "Binding of Isaac Anomaly Trait pool raro 1/20", "P2", 5, "Binding of Isaac", "B", "#7-binding-of-isaac-2011", "balance-illuminator", "minimal", "Pack roll d20+BIAS estesa a Anomaly Trait raro 1/20 con effetto trasformativo cross-pillar.", None),
    ("TKT-META-BATTLE-BROTHERS-ATB-ROSTER", "Battle Brothers initiative timeline ATB + roster persistence", "P1", 16, "Battle Brothers", "B", "#11-battle-brothers-2017", "balance-illuminator", "moderate", "Initiative timeline ATB visual già HUD ref. Estensione: roster persistence cross-mission + XP transfer parziale on death.", None),
    ("TKT-UI-FF7R-CRITICAL-JUICE", "FF7 Remake critical hit juice (zoom + slow-mo)", "P1", 4, "FF7 Remake", "B", "#12-ff7-remake-2020", "ui-design-illuminator", "minimal", "Animation juice critical: zoom 200ms + slow-mo. Hit shake 80ms + flash 60ms già parziale.", None),
    ("TKT-P6-HADES-PACT-MENU", "Hades Pact menu modificatori opt-in difficoltà", "P6", 14, "Hades GDC", "B", "#13-hades-gdc-2020", "balance-illuminator", "moderate", "Difficulty = menu modificatori opt-in (Sistema +1 pressure tier, trait pool ridotto), non slider piatto.", None),
    ("TKT-CREATURE-WARGROOVE-COMMANDER", "Wargroove commander unit groove ability + aura", "P3", 22, "Wargroove", "B", "#14-wargroove-2019", "creature-aspect-illuminator", "full", "Commander unit (1 per squad): unique ability cooldown 5-8 round + aura passive +1 ATK adjacent. Capstone P3.", None),

    # ===== Tier E residual (13 pattern, 4 blocked dep noted) =====
    ("TKT-BALANCE-STOCKFISH-SPRT", "Stockfish SPRT calibration early-stop", "P6", 4, "Stockfish", "E", "#1-stockfish-sprt", "balance-illuminator", "minimal", "SPRT loop H0 vs H1 alpha/beta=0.05 stop early. Wrapper su `tools/py/batch_calibrate_*.py`. scipy.stats.", None),
    ("TKT-BALANCE-HEARTHSTONE-MAP-ELITES", "Hearthstone Map-Elites deck space exploration", "P6", 14, "Hearthstone (Fontaine 2019)", "E", "#2-hearthstone-map-elites-fontaine-2019", "balance-illuminator", "full", "Feature descriptor 2D + elite per cella + mutation+crossover. Form/perk combo discovery oltre meta.", None),
    ("TKT-PCG-WAVE-FUNCTION-COLLAPSE", "Wave Function Collapse encounter PCG", "P5", 22, "WFC mxgmn", "E", "#3-wave-function-collapse", "pcg-level-design-illuminator", "full", "Tile dictionary + adjacency YAML + WFC solver Node port. Integration encounterLoader. Beyond hand-authored.", None),
    ("TKT-PCG-ASP-CONSTRAINT-SOLVER", "ASP constraint solvers (clingo) encounter authoring", "P5", 28, "ASP / clingo", "E", "#5-asp-constraint-solvers-answer-set-programming", "pcg-level-design-illuminator", "full", "BLOCKED dep approval. Designer scrive constraint, ASP enumera valid layouts. clingo Python binding.", None),
    ("TKT-BALANCE-MAP-ELITES-ENGINE", "MAP-Elites Quality-Diversity engine", "P6", 14, "MAP-Elites QD", "E", "#6-map-elites-quality-diversity", "balance-illuminator", "full", "Archive multidimensionale di elite per ogni cella feature space. Spec doc live, runtime engine pending.", None),
    ("TKT-AI-MCTS-SMART-PLAYOUT", "MCTS smart playout AI Sistema decision-making", "P5", 18, "MCTS", "E", "#7-mcts-smart-playout-policies", "balance-illuminator", "full", "Replace random rollout in `predictCombat` con policy-guided. Top-K candidate intent + smart playout.", None),
    ("TKT-BALANCE-LLM-AS-CRITIC", "LLM-as-critic balance loop auto-iterativo", "P6", 5, "LLM-as-critic", "E", "#8-llm-as-critic", "balance-illuminator", "minimal", "Prompt template + harness orchestrator chiamando LLM API tra batch run. Sostituisce manuale calibration eyeball.", None),
    ("TKT-TELEMETRY-TUFTE-SPARKLINES", "Tufte sparklines + small multiples HTML dashboard", "P6", 7, "Tufte sparklines", "E", "#9-tufte-sparklines--small-multiples", "telemetry-viz-illuminator", "minimal", "Dashboard statico micro-charts inline + griglie ripetute. /api/session/telemetry JSONL output viz layer.", None),
    ("TKT-TELEMETRY-GRAFANA", "Grafana ops monitoring playtest dashboard", "P6", 11, "Grafana", "E", "#10-grafana", "telemetry-viz-illuminator", "full", "BLOCKED dep approval. Docker-compose Grafana + JSON datasource plugin + 3-5 dashboard. Telemetry endpoint live.", None),
    ("TKT-TELEMETRY-RIOT-VALORANT-VIZ", "Riot/Valorant analytics 4 viz canonical", "P6", 18, "Riot Games / Valorant analytics", "E", "#11-riot--valorant-analytics", "telemetry-viz-illuminator", "full", "Hex heatmap kill positions + funnel tutorial T01→T05 + retention D1/D7/D30 + Sankey state machine.", None),
    ("TKT-TELEMETRY-DECK-GL", "deck.gl hex WebGL replay analyzer", "P6", 12, "deck.gl Uber", "E", "#12-deckgl-hex-webgl", "telemetry-viz-illuminator", "full", "BLOCKED Mission Console source. Hex grid encounter render → density overlay (kills/AI moves/status).", None),
    ("TKT-TELEMETRY-DUCKDB-JSONL", "DuckDB JSONL pipelines analytics", "P6", 4, "DuckDB", "E", "#13-duckdb-jsonl-pipelines", "telemetry-viz-illuminator", "minimal", "`tools/py/analyze_telemetry.py` legge logs/session-telemetry-*.jsonl via DuckDB SQL. ~10x sqlite.", None),
    ("TKT-ECONOMY-MACHINATIONS-MODELLI", "Machinations.io 4 modelli build economy simulation", "P6", 9, "Machinations.io", "E", "#14-machinationsio", "economy-design-illuminator", "minimal", "Build 4 modelli (d20 attack + PT economy + damage cap + status feedback) su web tool. Pre-validation.", None),
]


def main() -> int:
    written = 0
    for (tid, title, pillar, effort, donor_name, tier, anchor, owner, reuse, summary, museum) in TICKETS:
        ticket = {
            "id": tid,
            "title": title,
            "pillar": pillar,
            "effort_hours": effort,
            "donor_game": {
                "name": donor_name,
                "tier": tier,
                "matrix_anchor": f"docs/research/2026-04-26-tier-{tier.lower()}-extraction-matrix.md{anchor}",
            },
            "agent_owner": owner,
            "status": "proposed",
            "reuse_level": reuse,
            "audit_source_doc": SOURCE_DOC,
            "created_at": TODAY,
            "created_by_agent": CREATED_BY,
            "summary": summary,
        }
        if museum:
            ticket["museum_card"] = museum
        # Mark blocked for explicit dep blockers
        if "BLOCKED" in summary:
            ticket["status"] = "blocked"
            if "OD-001" in summary:
                ticket["blockers"] = ["OD-001 V3 Mating verdict pending"]
            elif "Mission Console" in summary:
                ticket["blockers"] = ["Mission Console source not in repo"]
            elif "dep approval" in summary:
                ticket["blockers"] = ["new dependency approval required"]

        out = PROPOSED / f"{tid}.json"
        out.write_text(json.dumps(ticket, indent=2, ensure_ascii=False), encoding="utf-8")
        written += 1

    print(f"Seeded {written} proposed tickets in {PROPOSED}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
