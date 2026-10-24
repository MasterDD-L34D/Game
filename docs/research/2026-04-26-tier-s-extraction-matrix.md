---
title: Tier S extraction matrix — 13 pilastri donor giochi (cosa prendere / cosa NO)
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-04-26
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, tier-s, donor-games, extraction-matrix, pillar-mapping]
---

# Tier S extraction matrix — 13 pilastri donor giochi

> **Scope**: per ogni gioco Tier S del catalogo `docs/guide/games-source-index.md`, breakdown strutturato `cosa prendere / cosa NON prendere / reuse path / status / agent owner`. Skip: Triangle Strategy + Voidling Bound (research dedicati gia esistono).
>
> **Metodo**: ogni gioco mappa a 1+ Pilastro Evo-Tactics (P1-P6). Reuse path 3 livelli (Minimal/Moderate/Full) con effort stimato ore. Status runtime verifica ground-truth via repo (codice live vs. doc-only vs. mancante).
>
> **Caveat**: effort stime sono single-dev + Claude pair, NON team. Anti-pattern column derivata da risk register Triangle Strategy + tactical-postmortems.

---

## Indice

- [1. Spore (Maxis 2008) — P2 evoluzione](#1-spore-maxis-2008--p2-evoluzione)
- [2. Final Fantasy Tactics (Square 1997) — P1 tattica](#2-final-fantasy-tactics-square-1997--p1-tattica)
- [3. Tactics Ogre Reborn (Square Enix 2022) — P1 UI + P3](#3-tactics-ogre-reborn-square-enix-2022--p1-ui--p3)
- [4. Fire Emblem serie (Intelligent Systems) — P3](#4-fire-emblem-serie-intelligent-systems--p3)
- [5. Wesnoth (open-source 2003+) — P1+P3+P6](#5-wesnoth-open-source-2003--p1p3p6)
- [6. AncientBeast (FreezingMoon) — P1 hex](#6-ancientbeast-freezingmoon--p1-hex)
- [7. XCOM EU/EW (Firaxis 2012-13) — P3 perks](#7-xcom-euew-firaxis-2012-13--p3-perks)
- [8. XCOM Long War 2 (Pavonis 2017) — P6 timer](#8-xcom-long-war-2-pavonis-2017--p6-timer)
- [9. Disco Elysium (ZA/UM 2019) — P4 thought cabinet](#9-disco-elysium-zaum-2019--p4-thought-cabinet)
- [10. AI War: Fleet Command (Arcen 2009) — P5+P6](#10-ai-war-fleet-command-arcen-2009--p5p6)
- [11. Fallout Tactics (Micro Forte 2001) — P1+P6](#11-fallout-tactics-micro-forte-2001--p1p6)
- [12. Wildermyth (Worldwalker 2021) — narrative + creature](#12-wildermyth-worldwalker-2021--narrative--creature)
- [13. Jackbox / XCOM 2 online (Jackbox / Firaxis) — P5](#13-jackbox--xcom-2-online-jackbox--firaxis--p5)
- [Sintesi cross-game — top steals ranked](#sintesi-cross-game--top-steals-ranked)

---

## 1. Spore (Maxis 2008) — P2 evoluzione

**Pilastro mappato**: P2 (evoluzione emergente)
**Status Evo-Tactics**: parziale — Form engine M12 Phase A-D shipped, registry 16 MBTI form, packRoller + bias YAML live. Gap: full creature-editor visuale, mating cross-form, evolution branching.

### Cosa prendere

1. **Part-pack additivo** (creature editor): ogni parte = stat delta + behavior tag composto. **Match Evo-Tactics**: gia shipped via `packRoller.js` + `form_pack_bias.yaml` + abilita combinatoria.
2. **Stage-gating**: cell→creature→tribal→civ→space, ogni stage cambia loop ma riusa progress acquisita. **Transfer**: stage = forma evolutiva (16 MBTI), evolution gating via PE + cooldown gia in `formEvolution.js`.
3. **Visual permanent change** (Spore: ogni parte modifica silhouette). **Transfer**: `apps/play/src/render.js` deve rendere overlay forma corrente — gia previsto in V4 PI pacchetti, NOT wired.
4. **Mating viewer** (Spore: hybrid offspring preview). **Transfer**: M12 Phase E (deferred ~20h) — mating produce hybrid form preview con part-pack mix.
5. **Pack tematici per archetipo** (carnivoro/erbivoro/social): definiscono catalogo parti disponibili. **Match**: `form_pack_bias.yaml` 16x3 gia machine-readable.

### Cosa NON prendere

- **Stage transitions cinematic-locked** (Spore: cutscene 30s+ tra stage). Anti-pattern co-op: blocca tutti i player. Tieni transitions <2s o async.
- **Creature editor sandbox autonomo** (Spore PC version: editor a parte). Anti-pattern Evo-Tactics: editor deve essere diegetic (in-session via reward offer) NON modal sandbox.
- **Civ + Space stage** scope creep: Spore ha perso focus dopo creature stage. Evo-Tactics resta tactical-only, no city-builder.
- **Procedural animation rig** Spore-style: troppo costoso solo-dev. Tieni animazione 2D semplice + sprite swap per forma.

### Reuse path

- **Minimal (~6h)**: render overlay forma corrente in `render.js` (silhouette swap su evolve), gia abbiamo `formsPanel.js` overlay.
- **Moderate (~20h)**: M12 Phase E mating cross-form — engine + 1 endpoint + UI hint (deferred backlog).
- **Full (~50h)**: full creature editor diegetic + parts catalog visuale + stat delta preview live.

### Agent owner

`creature-aspect-illuminator` (canonical per evoluzione + mating) + `economy-design-illuminator` (pack pricing PE).

### Cross-card museum

Esistente: nessuna Spore-dedicated. **Proposta nuova**: `evolution_genetics-spore-part-pack-additive.md` — pattern part-pack additivo come canonical reference vs. Voidling Bound rarity-gated unlock (M-2026-04-26-001 gia curato).

---

## 2. Final Fantasy Tactics (Square 1997) — P1 tattica

**Pilastro mappato**: P1 (tattica leggibile)
**Status Evo-Tactics**: parziale — initiative formula live (`initiative + action_speed - status_penalty`), facing crit in resolveAttack, job grid via 7 jobs + 84 perks. Gap: CT bar visuale, Wait action canonical.

### Cosa prendere

1. **CT bar (Charge Time) visuale**: ogni unita ha barra che riempie secondo speed. Quando piena = turno. **Transfer**: gia hai `initiative` formula, manca solo render UI (3-4h overlay phase indicator).
2. **Wait/Hold action +20% speed next turn**: skip turno per riapparire prima nella queue. **Transfer**: 1 nuovo action_type "wait" + flag `+20% speed_bonus` nel turno successivo. ~3h.
3. **Facing crit (rear/side/front)**: backstab +50% dmg, side +25%. **Transfer**: gia parziale via squad focus_fire +1 dmg. Estendi a `facing_modifier` in `resolveAttack` con 3 zone (front/side/rear). ~4h.
4. **Job grid + JP (Job Points)**: spending nello stesso job sblocca abilita, switch job tiene abilita imparate. **Transfer**: nostro `progressionStore` + `perks.yaml` 84 = base; manca cross-job ability inheritance (~10h). Bookmark, non priority.
5. **Zodiac compatibility crit modifier** (FFT signature). **Skip o anti-ref**: troppo opaco, anti-pattern leggibilita.

### Cosa NON prendere

- **Random battle grind** FFT-style: out-of-context fight per leveling. Anti-pattern roguelike compact session.
- **JP grinding cross-job**: 100+ ore per maxare. Tagliamo a 7 livelli XCOM-style gia shipped.
- **Speed bug ben-noto** FFT (Speed = god stat): squilibrio. Cap speed_bonus per turno (es. max 1 per round).
- **Zodiac sistema**: opaco, non leggibile, design debt 1997. Non importare.

### Reuse path

- **Minimal (~3h)**: Wait action canonical + render CT bar HUD overlay (richiamare `apps/play/src/style.css` HUD slot).
- **Moderate (~10h)**: facing 3-zone (front/side/rear) + bonus diff per zona + render arrow indicator unita.
- **Full (~25h)**: cross-job ability inheritance + JP-style spending micro-economy.

### Agent owner

`balance-illuminator` (formula CT/Wait/facing) + `ui-design-illuminator` (CT bar render).

### Cross-card museum

Nessuna FFT-dedicated. **Proposta**: `combat-fft-ct-bar-wait-action.md` — CT bar + Wait come pattern canonical Pilastro 1.

---

## 3. Tactics Ogre Reborn (Square Enix 2022) — P1 UI + P3

**Pilastro mappato**: P1 UI (HP bar floating) + P3 (post-battle support conversation)
**Status Evo-Tactics**: parziale — `docs/core/44-HUD-LAYOUT-REFERENCES.md` gia ranking ⭐⭐⭐⭐⭐ ADOPT, ma render.js attuale ha sidebar HUD non floating. Post-battle conversation = M19 debrief shipped narrative log, ma NON support-style 1:1.

### Cosa prendere

1. **HP bar floating sopra sprite** (no sidebar): risparmia spazio, unit-centric. **Transfer**: refactor `render.js` HUD — sostituire sidebar HP con overlay sprite (~5-7h, breaking change cosmetic).
2. **Charm system** (recruit boss enemy via dialogue): aggiungi unit a roster post-battle. **Transfer**: M11 lobby + M16 roster gia struttura. Aggiungi `recruit_chance` + dialogue trigger nel debrief (~8h).
3. **Class change altare** (Tactics Ogre: in-town class swap): allinea con job switching gia roadmap.
4. **WORLD system (rewind)**: rivedi battle precedente con scelte diverse. **Skip o defer**: utile narrative ma costoso (replay state machine), NON priority M14.
5. **Auto-battle quick simulation** (Reborn add): batch resolve fight gia visto. **Match**: gia abbiamo `predict_combat()` N=1000 — questo e' la stessa idea backend, manca solo UI button "auto-resolve" (~3h).

### Cosa NON prendere

- **Card-based RNG** (Tactics Ogre Let Us Cling Together randomness pickup tile): troppo casuale, anti-pattern leggibilita.
- **Loyalty/morale meter opaco**: status interno non leggibile player. Anti-pattern parita Halfway lesson.
- **Crafting deep equipment system**: scope creep, Evo-Tactics e' creature-focused non equipment-focused.
- **70+ ore campaign**: sessione roguelike compact (1-2h), non porting JRPG length.

### Reuse path

- **Minimal (~5h)**: HP bar floating refactor `render.js` (gia targetato in 44-HUD).
- **Moderate (~15h)**: Charm/recruit boss post-battle + auto-battle button UI.
- **Full (~40h)**: WORLD rewind state machine + class change altare + recruit dialogue tree.

### Agent owner

`ui-design-illuminator` (HP floating + auto-battle button) + `narrative-design-illuminator` (Charm dialogue).

### Cross-card museum

Esistente: `44-HUD-LAYOUT-REFERENCES.md` ranking. **Proposta**: `combat-tactics-ogre-hp-floating-charm.md`.

---

## 4. Fire Emblem serie (Intelligent Systems) — P3

**Pilastro mappato**: P3 (identita Specie x Job) + tangenziale narrative
**Status Evo-Tactics**: parziale — permadeath assente (player puo respawn), support conversations assenti. Identita unita via job + perk (XCOM-style) gia shipped.

### Cosa prendere

1. **Support conversations**: 2 unita combattono adiacenti N volte → unlock dialogue scene + stat bonus quando affianchi. **Transfer**: leggera, additive. Tracking `proximity_count[unitA][unitB]` in vcSnapshot, threshold = unlock conversation. ~10h (incl. content scrittura 5-6 conv).
2. **Weapon triangle** (sword>axe>lance>sword): rock-paper-scissors leggibile. **Match**: nostro `species_resistances.yaml` + channel resistance (fire/water/lightning) gia espresso. Aggiungi advantage display in HUD attack preview (~4h).
3. **Promotion item** (master seal): item-gated tier upgrade. **Transfer**: M13.P3 perk-pair gia gating, ma promotion item come reward-card concreto = Disco Elysium thought cabinet style. ~6h.
4. **Dancer/refresh class**: unit che ridona action ad ally. **Match**: gia abbiamo trait `coscienza_d_alveare_diffusa` simili. Promuovi a job canonical "Refresher" nel jobs.yaml registry (~5h).
5. **Avoid stat (dodge percentage)**: chance schivare attacco. **Anti-pattern**: NON copiare percent display senza show-numbers (FE 1%-True-Hit drama). Se importi, mostra percentuali REALI calcolate.

### Cosa NON prendere

- **Permadeath roguelike-style** opaco: player perde unit acquisita 10h fa. Anti-pattern co-op (player offline non e' colpa sua). Tieni respawn debrief-gated.
- **RNG hit chance non true** (FE classico Single-RN/2-RN bug): mostra percentuali reali, evita "True Hit" drama.
- **Marriage system** Fates style: scope sociale fuori contesto tactical-only.
- **Permanent recruitment tied to dialogue choice opaque**: wait fino a scenario X per recruit Y. Anti-pattern session compact.

### Reuse path

- **Minimal (~4h)**: weapon triangle advantage display in HUD attack preview (consume `species_resistances.yaml`).
- **Moderate (~10h)**: support conversations tracking proximity + 5-6 conv content.
- **Full (~25h)**: promotion item + Refresher class canonical + advantage display + support pipeline.

### Agent owner

`narrative-design-illuminator` (support conv) + `balance-illuminator` (weapon triangle).

### Cross-card museum

Nessuna FE-dedicated. **Proposta**: `narrative-fire-emblem-support-conversations.md` (tangenziale a thought cabinet Disco Elysium).

---

## 5. Wesnoth (open-source 2003+) — P1+P3+P6

**Pilastro mappato**: P1 (hex) + P3 (advancement tree) + P6 (recruit/retain economy)
**Status Evo-Tactics**: shipped — hex grid axial via `hexGrid.js` (ADR-2026-04-16), unit advancement via M13 ProgressionEngine + perks 84, content/balance separation via `data/core/` + `packs/evo_tactics_pack/`.

### Cosa prendere

1. **Recruit + Recall economy**: gold spese per recruit nuova unit OR recall veterana (cara ma stat tier-up). **Transfer**: M13 progression XP gia base; aggiungi `recall_cost` formula con tier scaling in roster overlay (~5h).
2. **Time-of-day modifier**: lawful/chaotic/neutral unit dmg shift per orario. **Transfer**: `biome_aware_spawn` gia consuma context biome. Aggiungi `time_of_day` channel resistance modifier — 1 enum field encounter (~3h).
3. **Random map generator** (Wesnoth: balanced multiplayer maps PCG). **Match**: PCG gia roadmap `pcg-level-design-illuminator`, copy approach Wesnoth weighted noise + symmetry constraint (~15h moderate).
4. **Replay file deterministic**: replay = seed + actions log, riproduce battle. **Transfer**: nostro vcSnapshot + raw_events log + seed = base. Aggiungi endpoint `/api/session/:id/replay` ricostruzione (~8h).
5. **Era system** (Wesnoth: era = unit pack tematico). **Match**: gia abbiamo `pack_manifest.yaml` registry. Promuovi pack-as-era nel lobby UI (~4h cosmetic).

### Cosa NON prendere

- **Days-of-the-week granularita** time-of-day: troppo fine. Tieni 3-4 stati (dawn/day/dusk/night).
- **Unit advancement tree branchy 4+ deep**: troppe permutazioni. Tieni 7 livelli linear (XCOM EU style gia shipped).
- **Pure 2D pixel art mandatorio**: out of scope art direction. Tieni nostro adoption SVG procedural + sprite Kenney.
- **MP-only multiplayer model** (no shared screen): non match P5 jackbox/TV-shared.

### Reuse path

- **Minimal (~3h)**: time-of-day modifier (1 enum + 1 formula resolveAttack).
- **Moderate (~10h)**: recall economy + replay endpoint + era selector lobby.
- **Full (~30h)**: PCG random map balanced + symmetry constraint + biome-time-era stack full.

### Agent owner

`pcg-level-design-illuminator` (PCG map) + `balance-illuminator` (time-of-day) + `economy-design-illuminator` (recall cost).

### Cross-card museum

Esistente: SoT v4 deep dive + `worldgen-bioma-ecosistema-foodweb-network-stack.md`. **Proposta**: `combat-wesnoth-replay-determinism.md`.

---

## 6. AncientBeast (FreezingMoon) — P1 hex

**Pilastro mappato**: P1 (hex grid + reaction system)
**Status Evo-Tactics**: shipped — hex axial coord via `hexGrid.js` (ADR-2026-04-16), reaction system base via overwatch/intercept (M2 ability executor). Gap: reaction varietate <5 trigger, AncientBeast 20+.

### Cosa prendere

1. **Hex axial coordinate system**: gia adottato, validato AncientBeast come reference + Honeycomb-grid lib.
2. **Beast Bond reaction trigger**: quando beast adiacente attacca = +bonus. **Transfer**: pattern adjacency gia in squadCombo. Estendi a per-creature trait (es. "se ally specie X adiacente attacca → +1 dmg") (~5h).
3. **Material/Element classes** (AncientBeast: 6 elementi). **Match**: nostro channel resistance fire/water/lightning gia 3. Aggiungi 3 (earth/wind/dark) per parita varieta (~6h con balance pass).
4. **Ability tier 1-4** per creatura (4 ability per beast, tier-progressive). **Match**: nostro `abilities.yaml` per job ha r1/r2 (M2). Estendi a r3/r4 + costing scaling (~10h).
5. **Beast Showcase wiki style** (catalogo ufficiale). **Match**: `packs/evo_tactics_pack/docs/catalog/` gia shipped. Cross-link tra wiki + runtime via slug (~3h cosmetic).

### Cosa NON prendere

- **Browser-only Flash legacy** (AncientBeast: era Flash-era): out of scope.
- **PvP-only multiplayer**: non match P5 co-op vs Sistema.
- **Energy bar gestione opaca**: anti-pattern leggibilita. Tieni AP (Action Points) trasparente come gia shipped.
- **30+ creature roster**: troppe da bilanciare solo-dev. Tieni 7 jobs canonical.

### Reuse path

- **Minimal (~3h)**: cross-link wiki ↔ runtime slug + showcase generator.
- **Moderate (~12h)**: r3/r4 abilita per job + 3 nuovi elementi.
- **Full (~25h)**: Beast Bond trigger system + 20+ reaction triggers canonical.

### Agent owner

`creature-aspect-illuminator` (Beast Bond + abilita tier) + `balance-illuminator` (elementi).

### Cross-card museum

Esistente: ADR-2026-04-16 hex axial. **Proposta**: nessuna nuova (gia coperto).

---

## 7. XCOM EU/EW (Firaxis 2012-13) — P3 perks

**Pilastro mappato**: P3 (perk-pair progression)
**Status Evo-Tactics**: shipped — M13 ProgressionEngine + 84 perks (7 jobs x 6 levels x 2 perks) + Prisma write-through. Phase B XP grant + resolver wire shipped PR #1697.

### Cosa prendere — gia preso (canonical reference)

Tutto quello che valeva la pena e' gia shipped:

1. **Perk pair every level**: 2 perk choice mutual exclusive per livello. **Match**: gia 84 perks live in `data/core/progression/perks.yaml`.
2. **Class-specific perk tree**: ogni classe ha tree distinto. **Match**: 7 jobs x 6 levels = 42 livelli unici.
3. **Stat bonus implicito al level-up** (HP, aim, will): no choice, just bonus. **Match**: gia in `xp_curve.yaml` thresholds.
4. **Promotion title flavor** (Squaddie → Corporal → Sergeant). **Partial**: gia naming + 6 livelli, manca solo flavor copy nei livelli (~2h cosmetic).

### Cosa prendere — NON ancora preso

5. **Officer Training School** (XCOM EW: research-gated meta perks). **Transfer**: campaign meta progression — 1 endpoint `/api/campaign/officer-perks` + 6-8 meta perk slot (~10h).
6. **Genetic Mod / MEC Trooper hybrid class** (EW: pay PE per trasform). **Match**: nostro M12 Form evolution gia coverage simile, ma cross-class transform NON coperto. Bookmark M14+.

### Cosa NON prendere

- **Permadeath rage** XCOM-style senza recovery: anti-pattern co-op (player offline). Gia evitato.
- **Geoscape city panic** layer: out of scope tactical-only.
- **DLC class lockout**: tutto in main pack base.
- **Will/morale collapse cinematic**: anti-pattern leggibilita.

### Reuse path

- **Minimal (~2h)**: rank flavor copy nei 6 livelli per job.
- **Moderate (~10h)**: Officer Training School meta perks campaign-gated.
- **Full (~25h)**: cross-class hybrid transform M12 Form + MEC-style gear slot.

### Agent owner

`balance-illuminator` (perk balance) + `economy-design-illuminator` (Officer School cost).

### Cross-card museum

Esistente: M13 ProgressionEngine doc + ADR-2026-04-17 xp-cipher. **Status**: deep-dive completo, no nuove card needed.

---

## 8. XCOM Long War 2 (Pavonis 2017) — P6 timer

**Pilastro mappato**: P6 (mission timer + pod activation philosophy)
**Status Evo-Tactics**: shipped — `missionTimer.js` (M13.P6.A) + scenario 07 timer 10 + pod-rush, ADR-2026-04-21. Phase B HUD timer + auto-timeout shipped PR #1698.

### Cosa prendere — gia preso

1. **Mission timer countdown**: round limit hardcap. **Match**: shipped `missionTimer.js`.
2. **Pod activation > HP philosophy**: aggiungi enemy via reinforcement, non solo aumenta HP. **Match**: shipped `reinforcementSpawner.js`.
3. **Supply/intel currency separation**: meta-resource che gating mission availability. **Match**: parziale — abbiamo PE/PT gia 2 currency, ma "intel"-style discovery NON wired. (~8h follow-up).

### Cosa prendere — NON ancora preso

4. **Liberation campaign region map** (LW2: macro strategic layer above tactical). **Transfer**: M14 campaign engine gia base advance. Aggiungi region grid + liberation% counter (~15h moderate).
5. **Haven recruitment radio** (LW2: passive recruit pool grow over time). **Match**: abbiamo M11 lobby roster. Aggiungi pool growth tick over campaign turns (~6h).
6. **Infiltration timer** (mission scout phase, troops ready dopo N giorni). **Skip**: troppo complex per session compact 1-2h.

### Cosa NON prendere

- **15+ class subdivision** (LW2: Sniper → Marksman/Sharpshooter): troppi job, manteniamo 7.
- **Avenger flight time** strategic micromanagement: out of scope.
- **Fatigue mod** (LW2: unit out of rotation N giorni dopo missione): anti-pattern session compact, player vuole giocare units adesso non aspettare.
- **20+ enemy variety hard-bake**: bilanciamento single-dev impossibile a quel volume.

### Reuse path

- **Minimal (~3h)**: rank flavor copy + intel currency placeholder.
- **Moderate (~12h)**: liberation region map macro + haven radio recruit pool.
- **Full (~30h)**: campaign overworld region + haven + supply chain meta-economy.

### Agent owner

`pcg-level-design-illuminator` (liberation map) + `economy-design-illuminator` (intel currency).

### Cross-card museum

Esistente: M13.P6 hardcore 07 doc + ADR-2026-04-21. **Proposta**: nessuna nuova (deep-dive coverato).

---

## 9. Disco Elysium (ZA/UM 2019) — P4 thought cabinet

**Pilastro mappato**: P4 (MBTI/Ennea diegetic surfacing)
**Status Evo-Tactics**: parziale shipped — V1 onboarding 60s (PR #1726) ha 3-stage Disco Elysium overlay. MBTI accrual via `vcScoring.js` live, ma surfacing ridotto (gia thought-cabinet-lite via onboardingPanel).

### Cosa prendere

1. **Thought Cabinet diegetic reveal**: pensieri = item slot mentali, equip per N ore (giochi tempo) → unlock effetto. **Transfer**: nostro vcSnapshot MBTI accrual gia base. Aggiungi UI panel "Thoughts" con N slot + cooldown round-based (~8h, V4 follow-up).
2. **Internal voice skill checks**: Inland Empire/Authority/Volition parlano al player con voce diegetic. **Transfer**: narrative log debrief gia esiste. Promuovi ad voce-per-axis MBTI (4 voci basic) durante combat hint (~10h).
3. **Color-coded dialogue per skill**: ogni linea ha tag axis che la dice. **Transfer**: M19 debrief — color tag MBTI axis che ha dominato il round (~3h cosmetic).
4. **Skill check passive vs active**: skill triggera spontaneo quando soglia raggiunta. **Match**: nostro `passesBasicTriggers` + ancestors trigger system gia base. Wire surface al player via popup notification (~4h).
5. **Day/time pacing**: ogni day = milestone narrative. **Match**: M14 campaign advance gia base. Cosmetic flavor copy "Giorno 1/2/3 di Aurora" (~2h).

### Cosa NON prendere

- **Skill point spending grind**: anti-pattern session compact.
- **Tutti gli skill voice tutti i 24 axes** (DE: 24 skill voci): troppo overhead, tieni 4 MBTI axes only.
- **Pure walking sim no-combat**: scope completamente fuori. Tieni combat-first.
- **Photorealistic painted art**: out of scope solo-dev. Tieni SVG/Kenney.
- **Lengthy dialogues 5-pagine scroll**: anti-pattern co-op (player offline aspetta). Tieni log <3 frasi per beat.

### Reuse path

- **Minimal (~3h)**: color-coded MBTI tag in M19 debrief.
- **Moderate (~12h)**: Thought Cabinet UI panel slot + cooldown + reveal.
- **Full (~30h)**: 4 voci internal MBTI + popup notification + thought cabinet full + flavor day pacing.

### Agent owner

`narrative-design-illuminator` (voci + dialogue color) + `ui-design-illuminator` (Thought Cabinet panel).

### Cross-card museum

Esistente: V1 onboarding 60s shipped + `personality-mbti-gates-ghost.md`. **Proposta**: `narrative-disco-elysium-thought-cabinet-diegetic.md` — pattern canonical surfacing personality.

---

## 10. AI War: Fleet Command (Arcen 2009) — P5+P6

**Pilastro mappato**: P5 (co-op vs AI) + P6 (asymmetric AI)
**Status Evo-Tactics**: parziale — co-op M11 Phase A-C shipped, asymmetric AI Sistema (utility brain + intent scores YAML) shipped. Gap: AI Progress meter + ongoing-support model.

### Cosa prendere

1. **AI Progress meter** (single number 1-10000 che traccia "quanto hai svegliato AI"): ogni mossa player += progress, AI sblocca tier behavior. **Transfer**: gia `pressure tier 1-3` + `warning_signals` gia base. Promuovi a numero unico canonical 0-100 + tier gates (~5h refactor).
2. **Asymmetric rules** (AI ha rule diverse da player: produzione gratis, tech instant). **Match**: gia Sistema ha `ai_intent_scores.yaml` data-driven. Doc + lock asymmetria come canonical pattern (~2h doc).
3. **Decentralized unit AI** (no central planner, ogni unita decide locally). **Match**: Sistema utility brain gia per-unit. Doc reference (~1h).
4. **Ongoing support model** (Arcen: 10+ anni patch + community-driven). **Skip**: out of scope solo-dev, nostro pattern e' alternativo (release iterativi sprint).
5. **Defender's advantage**: AI difensivo +50% vs player aggressive. **Transfer**: 1 modifier in resolveAttack quando entity_type=ai + role=defender (~3h).

### Cosa NON prendere

- **8+ ore single session**: anti-pattern roguelike compact. Tieni 1-2h.
- **Galaxy map 80+ planets**: scope creep, tieni 1 mission per session.
- **Steep learning curve** (AI War: ore di tutorial): anti-pattern session compact onboarding.
- **Mod-first design**: out of scope solo-dev, tieni canonical content.

### Reuse path

- **Minimal (~3h)**: AI Progress meter canonical 0-100 (refactor pressure tier).
- **Moderate (~8h)**: Defender's advantage modifier + meter UI countdown HUD.
- **Full (~20h)**: full asymmetric rule registry doc + meter + defender + escalation tier.

### Agent owner

`balance-illuminator` (asymmetric rules) + `coop-phase-validator` (meter UI integration).

### Cross-card museum

Esistente: `reference_tactical_postmortems.md` (memory). **Proposta**: `combat-ai-war-asymmetric-progress-meter.md` — pattern canonical Pilastro 5+6.

---

## 11. Fallout Tactics (Micro Forte 2001) — P1+P6

**Pilastro mappato**: P1 (single combat mode) + P6 (encounter authoring)
**Status Evo-Tactics**: parziale — round model canonical (ADR-2026-04-15) shipped, encounter authoring CLI parziale via `tools/py/master_dm.py` (M2 sessione 17/04).

### Cosa prendere

1. **Single combat mode invariant** (FT: turn-based + real-time toggle, ma combat math identico). **Lesson per Evo-Tactics**: round simultaneo + sequential entrambi invocano stessa formula resolveAttack. **Match**: gia shipped (round orchestrator wraps sequential).
2. **Encounter authoring CLI** (FT: editor encounter custom). **Match**: `tools/py/master_dm.py` REPL gia base. Estendi a YAML encounter generator + validator (~6h).
3. **Design spec numeric detail** (FT: GDD pubblico con HP/dmg formula esplicita). **Match**: gia `data/core/balance/*.yaml` numeric. Promuovi a doc canonical "balance numeric reference" (~3h doc consolidation).
4. **Vertical slice playtest** (FT postmortem: 1 missione completa playable prima di scope-up). **Lesson**: M4 wave shipped gia segue questo pattern. Continua.
5. **Squad command UI** (FT: 6-unit squad control selectall+formation). **Match**: M11 lobby + roster gia 4-8 unit. Aggiungi formation preset overlay (~5h).

### Cosa NON prendere

- **Real-time mode toggle**: complessita combinatoria ux. Tieni round-based only.
- **8+ stat allocation point system** (FT: SPECIAL clone): troppo deep, manteniamo job + perk XCOM-style.
- **Drug/chem addiction system**: scope creep narrative.
- **Cinematic intro 5min**: anti-pattern session compact.

### Reuse path

- **Minimal (~3h)**: balance numeric reference doc consolidato.
- **Moderate (~10h)**: encounter authoring CLI estension + formation preset.
- **Full (~25h)**: full encounter editor + validator + squad command UI revamp.

### Agent owner

`balance-illuminator` (numeric reference) + `pcg-level-design-illuminator` (encounter authoring).

### Cross-card museum

Esistente: `reference_tactical_postmortems.md` (memory). **Proposta**: nessuna nuova (postmortem gia in memory).

---

## 12. Wildermyth (Worldwalker 2021) — narrative + creature

**Pilastro mappato**: tangenziale narrative + creature aspect change
**Status Evo-Tactics**: parziale — narrative engine inkjs shipped, creature aspect change M12 Form base. Gap: layered handcrafted+procedural narrative + portrait stratificati.

### Cosa prendere

1. **Layered narrative** (handcrafted hooks + procedural fillers). **Transfer**: narrative engine gia inkjs. Aggiungi pool storylets via `data/core/narrative/skiv_storylets.yaml` style — gia shipped per Skiv. Estendi pattern a campaign narrative (~10h).
2. **Permanent visible aspect change** (Wildermyth: ferita arto = sprite permanent change). **Match**: M12 Form evolve gia ha cosmetic shift. Estendi a "battle-scar" registry di mid-fight events che alterano sprite long-term (~12h).
3. **Portrait stratificati** (Wildermyth: portrait composto da N layer additivi): face + scar + age + clothes. **Transfer**: render.js attuale e' sprite swap. Layered overlay possibile via PIL/canvas compositing (~15h).
4. **Companion lifecycle** (Wildermyth: companions invecchiano/muoiono cross-campaign). **Match**: roster M11 + Skiv canonical creature lifecycle gia base. Estendi a aging counter cross-session (~10h).
5. **Choice → permanent consequence** narrative weave. **Match**: M19 debrief narrative log gia base. Promuovi a permanent flag in campaign state (~4h).

### Cosa NON prendere

- **Comic-book narrative panel** UI (Wildermyth signature): troppo costo asset.
- **3-stage adult/middle/elder hardcoded**: tieni continuous aging counter.
- **5-companion party hardcap**: tieni 4-8 modulation gia shipped.
- **Cross-campaign meta legacy**: scope creep, focus 1 campaign.

### Reuse path

- **Minimal (~4h)**: choice-permanent-flag in campaign state.
- **Moderate (~15h)**: layered storylets pool + battle-scar registry.
- **Full (~40h)**: portrait stratificato compositing + companion aging cross-session.

### Agent owner

`narrative-design-illuminator` (storylets layered + choice consequence) + `creature-aspect-illuminator` (battle-scar + portrait layering).

### Cross-card museum

Esistente: agent illuminator owner gia mappato (LIBRARY). **Proposta**: `narrative-wildermyth-storylets-layered.md` + `creature-wildermyth-battle-scar-portrait.md`.

---

## 13. Jackbox / XCOM 2 online (Jackbox / Firaxis) — P5

**Pilastro mappato**: P5 (host-auth coop room-code phone-controller)
**Status Evo-Tactics**: shipped — M11 Phase A-C completo (PR #1680/#1682/#1684/#1685/#1686), host-transfer FIFO, lobby + reconnect + spectator overlay. ADR-2026-04-20.

### Cosa prendere — gia preso

Quasi tutto:

1. **Room code 4-letter consonants**: gia shipped (no vocali, 160k spazio).
2. **Host-authoritative**: gia shipped.
3. **Phone-as-controller**: gia shipped (`apps/play/src/network.js`).
4. **Reconnect via stable token**: gia shipped.
5. **Spectator overlay TV-shared**: gia shipped (`lobbyBridge.js` + CSS extract PR #1688).

### Cosa prendere — NON ancora preso

6. **Jack Principles UX** (Jackbox: ogni momento player sa cosa fare/aspettare). **Match**: parziale — V1 onboarding 60s shipped. Estendi a phase-by-phase player guidance toast (~5h).
7. **Audience mode** (Jackbox: 100+ spectator vote): out of scope co-op tactical (4-8 player target). Skip.
8. **XCOM 2 Multiplayer points-buy** (Firaxis: pre-game allocation budget). **Transfer**: lobby pre-game character creation gia base. Aggiungi point budget shared ai player per build squad (~8h).
9. **Asymmetric roles in multiplayer**: 1 player = aliens, altri = XCOM. **Match**: nostro Sistema gia AI-driven. NOT match player-controlled Sistema. Skip o defer M14+ se feature richiesta.

### Cosa NON prendere

- **Audience-vote 100+ player**: out of scope.
- **Persistent ranking ladder competitive**: anti-pattern co-op vs AI.
- **In-game purchase gating room access**: anti-pattern free-to-play model.
- **Microphone passthrough**: scope creep, tieni text/intent only.

### Reuse path

- **Minimal (~3h)**: Jack Principles guidance toast per phase.
- **Moderate (~10h)**: XCOM 2 points-buy pre-game + Jack Principles toast full.
- **Full (~25h)**: Asymmetric player-as-Sistema mode + audience-lite spectator chat.

### Agent owner

`coop-phase-validator` (Jack Principles + state machine) + `ui-design-illuminator` (toast).

### Cross-card museum

Esistente: ADR-2026-04-20 M11 Phase A. **Status**: deep-dive coverato, no nuove card needed.

---

## Sintesi cross-game — top steals ranked

Top 10 steals ranked by **ROI = (impact pillar / effort hours) × (status delta closeness)**, ordinati per priorita di adozione next sprint.

| #   | Steal                               | Source        | Pilastro | Effort | Status delta            | Owner          |
| --- | ----------------------------------- | ------------- | -------- | ------ | ----------------------- | -------------- |
| 1   | HP bar floating sopra sprite        | Tactics Ogre  | P1 UI    | 5h     | parziale → shipped      | ui-design      |
| 2   | Wait/Hold action +20% speed         | FFT           | P1       | 3h     | mancante → shipped      | balance        |
| 3   | Color-coded MBTI tag debrief        | Disco Elysium | P4       | 3h     | parziale → shipped      | narrative      |
| 4   | Time-of-day modifier (3-4 stati)    | Wesnoth       | P6       | 3h     | mancante → shipped      | balance        |
| 5   | AI Progress meter canonical         | AI War        | P5+P6    | 5h     | parziale → shipped      | balance + coop |
| 6   | Weapon triangle advantage display   | Fire Emblem   | P3       | 4h     | parziale → shipped      | balance        |
| 7   | Beast Bond reaction trigger system  | AncientBeast  | P1       | 5h     | parziale → estensione   | creature       |
| 8   | Officer Training School meta perks  | XCOM EW       | P3       | 10h    | shipped → meta layer    | balance + econ |
| 9   | Liberation region map macro         | XCOM LW2      | P6       | 15h    | shipped → meta layer    | pcg + econ     |
| 10  | Thought Cabinet UI panel + cooldown | Disco Elysium | P4       | 12h    | parziale → full surface | narrative + ui |

**Quick wins (≤5h, ≥3 steals):** combina #1+#2+#3+#4+#5 = ~19h totali = **5 patterns shipped in ~2.5 working days**, chiude P1 UI gap + P4 surfacing + P6 fairness diversity.

**Dont-do list cross-game** (anti-pattern ricorrenti):

- Cinematic 30s+ blocking transitions (Spore stage, AI War tutorial, Fallout intro)
- Permadeath senza recovery (FE classico, XCOM rage) — anti-pattern co-op offline
- Opaque RNG % display (FE 1%-True-Hit, FFT zodiac, Wildermyth aging hidden) — anti-pattern Halfway lesson
- 8+ ore single session length (AI War, FE, FFT campaign) — anti-pattern roguelike compact 1-2h
- 15+ class subdivision (LW2 sniper-tree) — bilanciamento single-dev impossibile
- Audience mode 100+ spectator (Jackbox) — out of scope co-op tactical 4-8

---

## Maintenance protocol

- **Update trigger**: nuovo Tier S aggiunto in `games-source-index.md` → riga in questo doc.
- **Status verifica**: ogni 90 giorni (review_cycle_days), ground-truth runtime status colonna via repo grep.
- **Museum card promotion**: card "Proposta" sopra → curate solo se feature shipped o decisione product positiva.
- **Effort recalibration**: post-implementation di steal ranked, log delta stima vs. real.
