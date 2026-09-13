---
title: Games Source Index — catalogo completo giochi-fonte + ricerche
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: '2026-06-06'
source_of_truth: true
language: it-en
review_cycle_days: 180
---

# Games Source Index — catalogo completo giochi-fonte + ricerche

> **Scope**: catalogo unico di TUTTI i giochi (e fonti GDD/postmortem/academic) studiati come ispirazione, donor di pattern, anti-reference o persona origin per Evo-Tactics. Per ogni voce: studio+anno, feature estratte, pilastro mappato, profondità ricerca, path canonical della doc/research/museum card relativa.
>
> **Quando usare**:
>
> - Onboarding nuovo agent/contributor → entry-point veloce a "cosa abbiamo già studiato"
> - Prima di nuova ricerca esterna → check overlap (museum-first protocol)
> - PR review → link rapido alla doc canonical del gioco citato
> - Sprint planning → trovare reuse path da pattern già curati
>
> **Aggiornamento**: on-demand quando aggiungi/elimini source. Nuova entry richiede:
>
> 1. Riga in tabella tier appropriato
> 2. Path canonical (research / museum card / planning) con link relativo
> 3. Update [LIBRARY.md](../../LIBRARY.md) tabella "Repo esterni studiati" se feature donor S/A-tier

---

> **Applicazione lore-gen**: i pattern procedurali per la lore (Wildermyth layered, Caves of Qud replacement-grammar generate-then-narrate + Markov, grammar-constrained LLM decoding, HITL review-gate) sono codificati in pipeline operativa -- vedi [`procedural-lore-generation.md`](procedural-lore-generation.md) (SoT del metodo + workflow autoriale + riferimenti cross-repo).

## Indice

- [Convenzioni](#convenzioni)
- [Implementation Status Overlay](#implementation-status-overlay)
- [Tier S — Pilastri donor (deep-dive transfer plan)](#tier-s--pilastri-donor-deep-dive-transfer-plan)
- [Tier A — Feature donor specifici](#tier-a--feature-donor-specifici)
- [Tier B — Postmortem tactical/coop genere affine](#tier-b--postmortem-tacticalcoop-genere-affine)
- [Tier C — HUD/UI references](#tier-c--hudui-references)
- [Tier D — Narrative authoring](#tier-d--narrative-authoring)
- [Tier E — Methodology / infrastruttura / academic](#tier-e--methodology--infrastruttura--academic)
- [Anti-reference (cosa NON copiare)](#anti-reference-cosa-non-copiare)
- [Persona origin_games](#persona-origin_games)
- [GDD pubblici riferimento](#gdd-pubblici-riferimento)
- [Repo open-source extraction map](#repo-open-source-extraction-map)
- [Cross-cutting — museum cards + agent illuminator owner](#cross-cutting--museum-cards--agent-illuminator-owner)
- [Mappa pilastri → top-3 source per pillar](#mappa-pilastri--top-3-source-per-pillar)
- [Maintenance protocol](#maintenance-protocol)

---

## Convenzioni

**Pilastri Evo-Tactics**:

- **P1** Tattica leggibile (FFT-style turn-based grid)
- **P2** Evoluzione emergente (Spore-like creature/build evolution)
- **P3** Identità Specie × Job (archetypes + class system)
- **P4** Temperamenti MBTI/Ennea (personality-driven gameplay)
- **P5** Co-op vs Sistema (multiplayer co-op vs AI/world)
- **P6** Fairness (asymmetric balance, calibration, telemetry)

**Profondità ricerca**:

- 🔬 **deep-dive** — research doc dedicato + museum card + transfer plan + pattern shipped
- 📋 **pattern-extracted** — multi-pattern curati in agent illuminator + planning doc
- 📌 **referenced** — citazione singola doc (hub, ADR, planning) senza research dedicato
- 🚫 **anti-ref** — esplicitamente "NON copiare" — lezione di cosa evitare

---

## Implementation Status Overlay

> Overlay operativo 2026-06-06: questa tabella non sostituisce i tier donor.
> Serve a distinguere ricerca, runtime, surface player-facing e presenza nel loop
> campagna/Nido. Quando un pattern diventa centrale per build planning, deve avere
> almeno una evidenza runtime o una spec/ticket che ne dichiari il gate.

Legenda status:

- `LIVE`: codice/data model esiste ed e' collegato.
- `PARTIAL`: esiste una parte runtime o surface, ma manca un pezzo rilevante.
- `DESIGN`: direzione/spec esiste, ma non e' ancora runtime player-facing.
- `GATED`: intenzionale ma bloccato da decisione o milestone successiva.
- `MUSEUM`: reference curata, non ancora adottata.
- `ANTI`: pattern da non copiare o da usare come warning.

| pattern_id                    | donor                                                 | pillar   | runtime_status | surface_status | campaign_status | loop_metric                                | evidence / next_action                                                                                |
| ----------------------------- | ----------------------------------------------------- | -------- | -------------- | -------------- | --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| tv_round_plan_sequence        | Frozen Synapse + WEGO family                          | P1+P5    | PARTIAL        | PARTIAL        | DESIGN          | completion_rate, readable_replay           | replay/event viewer esiste; serve TV post-commit comune via SPEC-A/SPEC-K                             |
| device_asymmetric_lens        | Jackbox/RoJ + NS2                                     | P5       | DESIGN         | PARTIAL        | DESIGN          | route_vote_entropy, info_filter_coverage   | phone controller esiste; serve device authority + info filtrata per creatura/ruolo/sensi              |
| spore_part_pack_runtime       | Spore                                                 | P2       | LIVE           | PARTIAL        | PARTIAL         | roster_composition, mutation_spend         | mutation runtime, slot gating, MP, bingo e Nido tab presenti                                          |
| gene_grid_bingo               | Monster Hunter Stories + Spore                        | P2+P3    | PARTIAL        | PARTIAL        | PARTIAL         | lineage_diversity, offspring_viability     | gene slots/offspring esistono; manca griglia 3x3 leggibile                                            |
| nido_recruit_mating_offspring | Niche + Wildermyth + Spore                            | P2+P3+P4 | PARTIAL        | PARTIAL        | PARTIAL         | relationship_progress, offspring_viability | full-loop runner copre recruit/mating/offspring seam; serve party-select/offspring-to-combat          |
| body_parts_wounds_scars       | Wildermyth + DF                                       | P2+P4    | PARTIAL        | DESIGN         | DESIGN          | roster_attrition, scar_persistence         | permanent flags presenti; serve ferite per parte del corpo + resa visuale                             |
| mbti_form_pulse               | Disco Elysium + Triangle Strategy                     | P4       | PARTIAL        | PARTIAL        | PARTIAL         | mbti_signal_density, conviction_shift      | phased reveal e dialogue/debrief vivi; serve input continuo device piu' completo                      |
| support_relation_arcs         | Fire Emblem + Wildermyth                              | P3+P4    | PARTIAL        | PARTIAL        | PARTIAL         | relationship_progress                      | recruit/affinity presenti; support conversation ricorrenti da specificare                             |
| ai_progress_pressure          | AI War                                                | P5+P6    | LIVE           | LIVE           | PARTIAL         | ai_pressure_delta                          | backend + UI pressure gauge collegati; Ermes deve restare bounded/legible                             |
| pact_difficulty_menu          | Hades + Monster Train + AI War                        | P6       | PARTIAL        | GATED          | GATED           | completion_rate, economy_flow              | scenario overrides esistono; manca pact menu player-facing                                            |
| xp_budget_fairness            | Pathfinder                                            | P6       | LIVE           | PARTIAL        | LIVE            | completion_rate, economy_flow              | xpBudget engine/config/session wire presenti                                                          |
| telemetry_duckdb_jsonl        | DuckDB + Riot analytics                               | P6       | LIVE           | PARTIAL        | LIVE            | governance_drift, sim_report_quality       | analyze_telemetry.py con DuckDB optional + fallback                                                   |
| slay_itb_intent_forecast      | Slay the Spire + Into the Breach                      | P1+P6    | LIVE           | PARTIAL        | LIVE            | hit_pct, expected_damage_accuracy          | threat tile, hit_pct, expected_damage e move arrows presenti                                          |
| tactics_ogre_hud              | Tactics Ogre Reborn                                   | P1 UI    | LIVE           | LIVE           | LIVE            | combat_readability                         | HP numerico/bar + AP pip renderizzati                                                                 |
| charm_boss_recruit            | Tactics Ogre + FE                                     | P3+P4    | PARTIAL        | PARTIAL        | DESIGN          | recruit_conversion                         | recruit post-combat esiste; charm/dialogue boss non completo                                          |
| commander_asymmetry           | Natural Selection 2                                   | P5       | DESIGN         | GATED          | GATED           | coop_load_balance                          | possibile espansione 5p+; non base live                                                               |
| df_l0_l5_stack                | Dwarf Fortress                                        | cross    | GATED          | DESIGN         | DESIGN          | chronicle_density, failure_as_lore         | ADR direction confermata; identity/worldstate/chronicle non tutti runtime                             |
| custodi_export_resync         | Dragon's Dogma pawn + Tamagotchi-like companions      | P4+P5    | DESIGN         | DESIGN         | DESIGN          | custodian_return_delta                     | da formalizzare in SPEC-B: export, incontri, resync e ritorno campagna                                |
| godot_device_authority        | Jackbox/RoJ                                           | P5       | DESIGN         | PARTIAL        | DESIGN          | surface_authority_coverage                 | SPEC-K: TV mirror only; phone/browser actions; host fallback solo dev/offline                         |
| aliena_enforcement            | AI safety/game master enforcement + narrative lore    | P5+P6    | DESIGN         | DESIGN         | GATED           | rule_violation_prevented                   | promossa a enforcement; seguire draft-narrative-lore + gate esplicito                                 |
| form_runtime_identity         | Hades aspects + Caves of Qud morphotypes              | P3+P4    | LIVE           | PARTIAL        | PARTIAL         | form_identity_delta                        | `formStatApplier`, `formInnataTrait`, `applyJobAffinityBonus` sono runtime; surface da chiarire       |
| combat_resource_gates         | FFT resource discipline + fighting super-meter        | P1+P6    | LIVE           | PARTIAL        | LIVE            | economy_flow, invalid_action_rate          | SG/PP/PT gates in `abilityExecutor`; serve surface leggibile costi/pool                               |
| symbiont_minion_jobs          | Dragon's Dogma pawn + summoner/companion RPG patterns | P3+P5    | LIVE           | PARTIAL        | PARTIAL         | roster_composition, companion_survival     | `symbiontBond`, shared HP pool, summon/pack_command/minion revive live                                |
| lifecycle_ws_drains           | Jackbox phone authority                               | P5       | LIVE           | PARTIAL        | PARTIAL         | intent_ack_rate, phase_stall_rate          | `world_vote`, `mating_vote`, `lineage_choice`, `form_pulse_submit`, `next_macro` drainati server-side |
| foodweb_cross_events          | Caves of Qud ecology + RimWorld seasonal pressure     | P2+P5+P6 | LIVE           | PARTIAL        | PARTIAL         | eco_pressure_delta, spawn_role_fit         | foodweb spawn, cross-event pressure e seasonal loop esistono; surface/flag da chiarire                |
| sensory_private_intel         | Into the Breach telegraph + Cogmind sensor info       | P1+P5    | LIVE           | PARTIAL        | DESIGN          | info_filter_coverage                       | `senseReveal` e `telepathicReveal` devono alimentare device-as-lens, non TV input                     |
| codex_diary_memory            | Tunic codex + Dwarf Fortress chronicle                | P4+P5    | LIVE           | PARTIAL        | DESIGN          | chronicle_density, custodian_return_delta  | Codex glyphs e diaryStore sono base per Custodi esportabili e memoria per-creatura                    |

---

## Tier S — Pilastri donor (deep-dive transfer plan)

| Gioco                           | Studio · Anno         | Genere                          | Feature estratte                                                                                                                                                                                                                               | Pilastro             | Depth | Doc canonical                                                                                                                                                                                                              |
| ------------------------------- | --------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Triangle Strategy**           | Square Enix · 2022    | Tactical RPG                    | Conviction 3-axis system + recruit gating + terrain elev/facing + CT bar + AI threat preview + 3 Proposals MBTI surface (phased reveal / dialogue color / recruit gating)                                                                      | P1+P3+P4             | 🔬    | [research](../research/triangle-strategy-transfer-plan.md) · [museum M-009](../museum/cards/personality-triangle-strategy-transfer.md)                                                                                     |
| **Spore**                       | Maxis · 2008          | Sim emergente                   | Emergent evolution part/trait pack — fonte primaria Pilastro 2                                                                                                                                                                                 | P2                   | 📌    | [LIBRARY](../../LIBRARY.md) — M12 Form engine inspiration                                                                                                                                                                  |
| **Final Fantasy Tactics (FFT)** | Square · 1997         | SRPG                            | CT bar + Wait action + facing crit + job grid                                                                                                                                                                                                  | P1                   | 📌    | LIBRARY — tradition reference                                                                                                                                                                                              |
| **Tactics Ogre Reborn**         | Square Enix · 2022    | SRPG                            | HP bar floating sopra sprite ⭐⭐⭐⭐⭐ HUD reference + post-battle conversations pattern                                                                                                                                                      | P1 UI + P3           | 📋    | [44-HUD-LAYOUT-REFERENCES](../core/44-HUD-LAYOUT-REFERENCES.md)                                                                                                                                                            |
| **Fire Emblem** (serie)         | Intelligent Systems   | SRPG                            | Permadeath + support conversations                                                                                                                                                                                                             | P3                   | 📌    | LIBRARY                                                                                                                                                                                                                    |
| **Wesnoth**                     | Open-source · 2003+   | Tactical hex                    | Hex grid + unit advancement + recruit/retain economy + content/balance separation + telemetria                                                                                                                                                 | P1+P3+P6             | 📋    | [SoT v4 deep dive](../planning/SoT-v4)                                                                                                                                                                                     |
| **AncientBeast**                | FreezingMoon          | Tactical hex                    | Hex axial + reaction system                                                                                                                                                                                                                    | P1                   | 📋    | [ADR-2026-04-16 grid hex](../adr/ADR-2026-04-16-grid-type-hex-axial.md)                                                                                                                                                    |
| **XCOM EU/EW**                  | Firaxis · 2012-13     | Tactical                        | Perk-pair 7 lvl × 2 (84 perks shipped M13.P3)                                                                                                                                                                                                  | P3                   | 🔬    | M13 ProgressionEngine + perks.yaml                                                                                                                                                                                         |
| **XCOM Long War 2**             | Pavonis · 2017        | Tactical mod                    | Mission timer + supply/intel + pod activation > HP philosophy                                                                                                                                                                                  | P6                   | 🔬    | M13.P6 hardcore 07 + ADR-2026-04-21                                                                                                                                                                                        |
| **Jackbox / XCOM 2 online**     | Jackbox / Firaxis     | Party / Tactical online         | Host-auth room-code coop + phone-as-controller + Jack Principles UX                                                                                                                                                                            | P5                   | 🔬    | [ADR-2026-04-20 M11 Phase A](../adr/ADR-2026-04-20-m11-jackbox-phase-a.md)                                                                                                                                                 |
| **Disco Elysium**               | ZA/UM · 2019          | RPG narrative                   | Thought cabinet diegetic + skill checks + micro-reactivity + portraits                                                                                                                                                                         | P4                   | 🔬    | V1 onboarding 60s shipped (PR #1726)                                                                                                                                                                                       |
| **AI War: Fleet Command**       | Arcen Games · 2009    | Co-op RTS vs AI                 | Asymmetric AI rules + AI Progress meter + decentralized unit AI + ongoing-support model                                                                                                                                                        | P5+P6                | 🔬    | memory `reference_tactical_postmortems.md` + [external-references E](external-references.md)                                                                                                                               |
| **Fallout Tactics**             | Micro Forte · 2001    | Tactical squad                  | Single combat mode invariant + encounter authoring CLI + design spec numeric detail + vertical slice playtest                                                                                                                                  | P1+P6                | 🔬    | memory `reference_tactical_postmortems.md`                                                                                                                                                                                 |
| **Wildermyth**                  | Worldwalker · 2021    | Tactical narrative              | Layered handcrafted+procedural narrative + portraits stratificati + permanent visible change                                                                                                                                                   | narrative + creature | 📋    | [narrative-design-illuminator](../../.claude/agents/narrative-design-illuminator.md) + [creature-aspect-illuminator](../../.claude/agents/creature-aspect-illuminator.md)                                                  |
| **Voidling Bound**              | Hatchery Games · 2026 | TPS + monster collector         | Rarity-gated ability CLASS unlock + element path-lock + Spliced terminal endpoint + 3-currency separation + element-faction archetype affinity + visual change every tier                                                                      | P2+P3                | 🔬    | [research 2026-04-26](../research/2026-04-26-voidling-bound-evolution-patterns.md) · [museum M-2026-04-26-001](../museum/cards/evolution_genetics-voidling-bound-patterns.md)                                              |
| **Niche**                       | Team Niche · 2017     | Turn-based + genetica roguelike | Eredità Mendeliana DISCRETA (2 alleli/gene, dom/rec, 50% pass, fenotipo = allele dominante = leggibile) — comparable più vicino al nostro `inheritGeneSlots` 2-parent + espressione epigenome DISCRETA (no stat-drift continuo)                | P2                   | 📋    | [epigenome research §2.4](../research/2026-05-27-epigenome-params-research.md) · [D-HEIR spec §Layer-3](../superpowers/specs/2026-05-26-repro-heir-genetic-model-design.md)                                                |
| **Dwarf Fortress**              | Bay 12 Games · 2006+  | Sim colonia emergente           | Modello **L0-L5** (simulazione -> identita individuale -> memoria-mondo -> eredita/artefatti -> narrativa -> "losing is fun"); regola: ogni sprint DF risponde SI ad >=1 livello; greenfield services/{identity,eventlog,worldstate,chronicle} | cross (P2+P5+P6)     | 🔬    | [ADR-2026-05-18 DF-levels](../adr/ADR-2026-05-18-df-levels-integration-direction.md) (direction confermata, **draft pending verdetto master-dd**) + 3 vault A5 (RECONCILIATION/PHASE-PLAN/GAME-ANALYSIS reasoning archive) |

---

## Tier A — Feature donor specifici

> Patterns curati in agent illuminator (`.claude/agents/*-illuminator.md`). Single-feature transfer.

| Gioco                      | Studio · Anno                   | Feature estratta                                                                                                                                     | Agent owner                                                                                                         | Pillar       |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| **Slay the Spire**         | Mega Crit · 2017                | Intent preview UI (telegraph deterministico) + gold/relic/potion economy                                                                             | ui-design + economy-design                                                                                          | P1 UI + P6   |
| **Hades**                  | Supergiant · 2020               | Multi-currency meta + aspect reveal codex + Codex archive UX (museum-first)                                                                          | economy-design + repo-archaeologist                                                                                 | P2 + cross   |
| **Monster Train**          | Shiny Shoe · 2020               | Pact shards meta currency tier                                                                                                                       | economy-design                                                                                                      | P6           |
| **Into the Breach**        | Subset Games · 2018             | Telegraph rule (everything visible) + handmade+randomized grid                                                                                       | ui-design + pcg-level-design                                                                                        | P1+P5        |
| **Dead Cells**             | Motion Twin · 2018              | Concept graph PCG                                                                                                                                    | pcg-level-design                                                                                                    | P2 PCG       |
| **Caves of Qud**           | Freehold · 2015+                | Morphotype gating creatures                                                                                                                          | creature-aspect                                                                                                     | P2+P3        |
| **Monster Hunter Stories** | Capcom · 2016/21                | Gene grid creature genetics                                                                                                                          | creature-aspect                                                                                                     | P2           |
| **Crusader Kings 3**       | Paradox · 2020                  | DNA chains                                                                                                                                           | creature-aspect                                                                                                     | P2           |
| **Subnautica**             | Unknown Worlds · 2018           | Habitat lifecycle (Skiv canonical creature pattern)                                                                                                  | creature-aspect                                                                                                     | P2 + Skiv    |
| **Spelunky**               | Mossmouth · 2008/12             | 4x4 grid PCG                                                                                                                                         | pcg-level-design                                                                                                    | P5 PCG       |
| **Dead Space**             | Visceral · 2008                 | Diegetic UI (HUD on character)                                                                                                                       | ui-design                                                                                                           | P1 UI        |
| **Pokemon Pokopia**        | Game Freak / Omega Force · 2026 | Housing-as-primary-loop + base persistente sempre-accessibile + unlock diegetico via biome-arc (no level-gate) + companion abilita world-interaction | nido pattern ([report](../reports/2026-04-26-nido-pokopia-housing-pattern.md)) + `apps/play/src/nestHub.js` shipped | P2 nido/base |

---

## Tier B — Postmortem tactical/coop genere affine

> Source: [external-references.md sez E](external-references.md) + [tactical-lessons.md](../planning/tactical-lessons.md). 5 deep-dive in tactical-lessons.md, 12 totali catalogati.

| Gioco                   | Studio · Anno          | Lesson estratta                                                                              | Pilastro | Depth                                                                                                                                 |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Halfway**             | Robotality · 2014      | Leggibilità griglia + show ALL numbers + varietà nemici critica + scope discipline 2-dev     | P1+P5    | 🔬 [tactical-lessons §1](../planning/tactical-lessons.md)                                                                             |
| **Frozen Synapse**      | Mode 7 · 2011          | Simultaneous-turn Plan→Prime→Execute + replay cinematico + what-if preview                   | P1       | 🔬 [tactical-lessons §3](../planning/tactical-lessons.md) + [ADR-2026-04-18 plan-reveal](../adr/ADR-2026-04-18-plan-reveal-round.md)  |
| **Cogmind**             | Grid Sage · 2015+      | Component modulari + "identity = equipment" + emergent gameplay da combo                     | P2+P3    | 🔬 [tactical-lessons §5](../planning/tactical-lessons.md)                                                                             |
| **Balatro**             | LocalThunk · 2024      | Iterazione meccaniche + balance emergente + community testing                                | P6       | 📌 [external-references E](external-references.md)                                                                                    |
| **Magicka**             | Arrowhead · 2011       | Spell combo coop + sinergie elementali (trait mixing reference)                              | P2       | 📌 [external-references E](external-references.md)                                                                                    |
| **Natural Selection 2** | Unknown Worlds · 2012  | Asimmetria coop (commander + FPS) + ruoli diversi stessa partita                             | P5       | 📌 [external-references E](external-references.md)                                                                                    |
| **Binding of Isaac**    | Edmund McMillen · 2011 | Build variety procedurale + sinergie item non pianificate                                    | P2       | 📌 [external-references E](external-references.md)                                                                                    |
| **SpaceChem**           | Zachtronics · 2011     | Complessità emergente da regole semplici + soluzioni aperte                                  | P6       | 📌 [external-references E](external-references.md)                                                                                    |
| **System Shock 2**      | Irrational · 1999      | Immersive sim RPG systems + emergent gameplay da interazioni sistema                         | P2+P3    | 📌 [external-references E](external-references.md)                                                                                    |
| **Baldur's Gate II**    | BioWare · 2000         | Tactical RPG party identity + companion identity + encounter design                          | P1+P3    | 📌 [external-references E](external-references.md)                                                                                    |
| **Battle Brothers**     | Overhype · 2017        | Initiative timeline ATB + tactical depth + permadeath roster                                 | P1       | 📌 [44-HUD §3](../core/44-HUD-LAYOUT-REFERENCES.md)                                                                                   |
| **FF7 Remake**          | Square Enix · 2020     | Initiative timeline ATB modernized                                                           | P1 HUD   | 📌 [44-HUD](../core/44-HUD-LAYOUT-REFERENCES.md)                                                                                      |
| **Hades (postmortem)**  | Supergiant · 2020      | Loop progressione + build variety + "come giochi modella ciò che diventi" (visione progetto) | P2       | 📌 [external-references E](external-references.md) — [GDC talk](https://www.gdcvault.com/play/1026975/Breathing-Life-into-Greek-Myth) |
| **Wargroove**           | Chucklefish · 2019     | Tactical hex + commander unit                                                                | P1       | 📌 referenced docs/planning/                                                                                                          |
| **Songs of Conquest**   | Lavapotion · 2024      | Strategic-tactical hybrid hex                                                                | P1       | 📌 referenced docs/planning/                                                                                                          |

---

## Tier C — HUD/UI references

> Source: [docs/core/44-HUD-LAYOUT-REFERENCES.md](../core/44-HUD-LAYOUT-REFERENCES.md). HUD comparison + anti-pattern guide.

|    Rank    | Gioco               | Pattern                                  |          Verdict           |
| :--------: | ------------------- | ---------------------------------------- | :------------------------: |
| ⭐⭐⭐⭐⭐ | Tactics Ogre Reborn | HP bar floating sopra sprite, no sidebar |           ADOPT            |
|  ⭐⭐⭐⭐  | Into the Breach     | Intent telegraph deterministico          |     ADOPT (già wired)      |
|   ⭐⭐⭐   | FF7 Remake          | Initiative timeline ATB                  |          OBSERVE           |
|   ⭐⭐⭐   | Battle Brothers     | Initiative timeline + skull markers      |          OBSERVE           |
|     ❌     | Gloomhaven Digital  | Async coop turn (no TV share)            |    REJECT (incompat P5)    |
|     🚫     | Destiny early       | HP bar color unico                       | ANTI-REF (colorblind fail) |

---

## Tier D — Narrative authoring

> Pattern shipped in Skiv stack 2026-04-25 (PR #1849). Inline Python zero npm deps.

| Source                                       | License    | Pattern shipped                                             | Adopted as                                                                        | Doc                                                       |
| -------------------------------------------- | ---------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **ink / inkle**                              | MIT        | Branching narrative weave                                   | `inkjs` dep installed + `narrativeEngine.js` + `narrativeRoutes.js`               | LIBRARY                                                   |
| **Yarn Spinner**                             | MIT        | Node editor dialoghi                                        | reference (Unity-centric)                                                         | [external-references G](external-references.md)           |
| **Arrow** (mhgolkar)                         | MIT        | Visual VCS-friendly authoring                               | reference (standalone app)                                                        | [external-references G](external-references.md)           |
| **Tracery** (galaxykate)                     | Apache 2.0 | Story-grammar + seeded RNG                                  | `tools/py/skiv_tracery.py` 218 LOC inline — **131→662 voci combinatorial**        | [research](../research/2026-04-25-skiv-online-imports.md) |
| **SimpleQBN** (videlais)                     | MIT        | Quality-Based Narrative storylets YAML + salience tie-break | `tools/py/skiv_qbn.py` + `data/core/narrative/skiv_storylets.yaml` — 14 storylets | [research](../research/2026-04-25-skiv-online-imports.md) |
| **Fallen London** (Emily Short QBN paradigm) | n/a        | QBN paradigm reference                                      | research influence (no code)                                                      | LIBRARY                                                   |
| **ChoiceScript**                             | MIT        | FairMath progressione                                       | reference (Pilastro 4 candidate)                                                  | LIBRARY                                                   |
| **Conventional Commits spec**                | Public     | `<type>[(scope)][!]: <desc>` regex + breaking change        | `parse_conventional_commit()` in `tools/py/skiv_monitor.py`                       | [LIBRARY](../../LIBRARY.md)                               |

---

## Tier E — Methodology / infrastruttura / academic

| Source                                         | Tipo        | Pattern                                                                                                                                                                                                                                 | Adopted in                                                                                                                                                                                                                            | Doc                                                                                                          |
| ---------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Stockfish** (chess engine)                   | tooling     | SPRT statistical balance test                                                                                                                                                                                                           | balance-illuminator calibration mode                                                                                                                                                                                                  | `.claude/agents/balance-illuminator.md`                                                                      |
| **Hearthstone** (Fontaine 2019)                | academic    | Map-Elites Deck Spaces ([arxiv 1904.10656](https://arxiv.org/abs/1904.10656))                                                                                                                                                           | balance MAP-Elites archive                                                                                                                                                                                                            | [docs/balance/2026-04-25-map-elites-archive.md](../balance/2026-04-25-map-elites-archive.md)                 |
| **Wave Function Collapse**                     | algorithm   | Constraint PCG (mxgmn/WaveFunctionCollapse)                                                                                                                                                                                             | pcg-level-design-illuminator                                                                                                                                                                                                          | `.claude/agents/pcg-level-design-illuminator.md`                                                             |
| **Pathfinder TTRPG**                           | tabletop    | XP budget + Encounter Building + Bestiary scaling; **Bestiary 1e import: 1211 creature normalizzate su 9 assi trait (threat/defense/mobility/perception/magic/social/stealth/environment/versatility) + genetic_traits/visual/biology** | pcg-level-design-illuminator; ETL `tools/importers/pathfinder_bestiary.py` -> `data/external/pathfinder_bestiary_1e.json` (test `test_pathfinder_bestiary_import.py`) consumato da `species_builder.py` -- **DORMANT dal 2025-10-29** | [pcg-agent](../../.claude/agents/pcg-level-design-illuminator.md) + `tools/importers/pathfinder_bestiary.py` |
| **ASP constraint solvers**                     | algorithm   | PCG declarative                                                                                                                                                                                                                         | pcg-level-design-illuminator                                                                                                                                                                                                          | same                                                                                                         |
| **MAP-Elites Quality-Diversity**               | algorithm   | Disruptive balance discovery                                                                                                                                                                                                            | balance-illuminator research mode                                                                                                                                                                                                     | `.claude/agents/balance-illuminator.md`                                                                      |
| **MCTS smart playout policies**                | algorithm   | Smart Monte Carlo Tree Search                                                                                                                                                                                                           | balance-illuminator                                                                                                                                                                                                                   | same                                                                                                         |
| **LLM-as-critic**                              | methodology | Bayesian knob-tuning + critique                                                                                                                                                                                                         | balance-illuminator                                                                                                                                                                                                                   | same                                                                                                         |
| **Tufte sparklines + small multiples**         | viz theory  | Compact telemetry viz                                                                                                                                                                                                                   | telemetry-viz-illuminator                                                                                                                                                                                                             | `.claude/agents/telemetry-viz-illuminator.md`                                                                |
| **Grafana**                                    | tooling     | Dashboard heatmap + sparklines                                                                                                                                                                                                          | telemetry-viz-illuminator                                                                                                                                                                                                             | same                                                                                                         |
| **Riot / Valorant analytics**                  | industry    | Heatmap spatial + funnel + retention + Sankey player flow                                                                                                                                                                               | telemetry-viz-illuminator                                                                                                                                                                                                             | same                                                                                                         |
| **deck.gl hex WebGL**                          | library     | Hex spatial viz                                                                                                                                                                                                                         | telemetry-viz-illuminator                                                                                                                                                                                                             | same                                                                                                         |
| **DuckDB JSONL pipelines**                     | tooling     | Telemetry analytics pipeline                                                                                                                                                                                                            | telemetry-viz-illuminator                                                                                                                                                                                                             | same                                                                                                         |
| **Machinations.io**                            | tooling     | Visual economy simulation                                                                                                                                                                                                               | economy-design-illuminator                                                                                                                                                                                                            | [docs/balance/MACHINATIONS_MODELS.md](../balance/MACHINATIONS_MODELS.md)                                     |
| **Game Design Patterns Wiki (Chalmers)**       | academic    | Action Point Allowance + Rock-Paper-Scissors + Asymmetric Abilities + Team Combos pattern catalog                                                                                                                                       | reference cross-pillar                                                                                                                                                                                                                | [external-references C](external-references.md)                                                              |
| **Game Programming Patterns** (Robert Nystrom) | book        | State Machine + Observer + Command + Component                                                                                                                                                                                          | session engine refactor reference                                                                                                                                                                                                     | [external-references D](external-references.md)                                                              |
| **Overwatch ECS GDC Talk** (Timothy Ford)      | talk        | ECS architecture composition vs inheritance                                                                                                                                                                                             | grid spatial + combat pipeline                                                                                                                                                                                                        | [external-references D](external-references.md)                                                              |
| **Software Archaeology** (Hermann/Caimito)     | methodology | Buried-idea excavation pattern                                                                                                                                                                                                          | repo-archaeologist excavate mode                                                                                                                                                                                                      | `.claude/agents/repo-archaeologist.md`                                                                       |
| **Dublin Core Provenance**                     | metadata    | Provenance metadata schema                                                                                                                                                                                                              | museum cards frontmatter                                                                                                                                                                                                              | `docs/museum/cards/*.md`                                                                                     |
| **git pickaxe** (`git log -S`)                 | tool        | Buried code archaeology                                                                                                                                                                                                                 | repo-archaeologist                                                                                                                                                                                                                    | same                                                                                                         |

---

## Anti-reference (cosa NON copiare)

> Lezioni esplicite di cosa **evitare**. Stessa importanza di "cosa adottare".

| Gioco / Source                      | Anti-pattern                                               | Perché rejected                                                                                                                                                               | Doc                                                                                  |
| ----------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Pokémon** (cute style)            | Disney/Pokémon-cute aesthetic                              | Banned in art direction (target audience adult-leaning)                                                                                                                       | [41-ART-DIRECTION](../core/41-ART-DIRECTION.md):26                                   |
| **Pokémon evolution by level**      | Linear stat-bump on level                                  | Troppo lineare per tactical d20, no player agency                                                                                                                             | [mutation-system-design](../planning/2026-04-25-mutation-system-design.md):207       |
| **Pokémon doubles 6on6**            | 6-on-6 scale                                               | Scale > 4-coop limit della nostra topology                                                                                                                                    | [jobs-expansion-design](../planning/2026-04-25-jobs-expansion-design.md):168         |
| **Disney cartoon style**            | Cute cartoon                                               | Anti-reference art direction                                                                                                                                                  | [41-ART-DIRECTION](../core/41-ART-DIRECTION.md)                                      |
| **Diablo (rare drop)**              | Random drop = no player agency                             | Player feels powerless vs RNG                                                                                                                                                 | [mutation-system-design](../planning/2026-04-25-mutation-system-design.md):209       |
| **Diablo 4 necromancer 7+ pets**    | Beastmaster overscale                                      | Cognitive load + readability collapse                                                                                                                                         | [jobs-expansion-design](../planning/2026-04-25-jobs-expansion-design.md):170         |
| **Mass Effect paragon/renegade**    | Binary morality axis                                       | Triangle Strategy 3-axis preferred (more dimensions)                                                                                                                          | [triangle-strategy-transfer-plan](../research/triangle-strategy-transfer-plan.md):87 |
| **D&D 5e alignment grid** (9-cell)  | 9-cell alignment                                           | Too coarse vs Triangle 3-axis                                                                                                                                                 | same                                                                                 |
| **Octopath Traveler boost**         | Job boost variant                                          | Reference solo, non adopted                                                                                                                                                   | [jobs-expansion-design](../planning/2026-04-25-jobs-expansion-design.md)             |
| **Path of Exile** (ailment ratio)   | Chill+freeze chain ratio system                            | Too complex per onboarding 60s                                                                                                                                                | [status-effects-roadmap](../planning/2026-04-25-status-effects-roadmap.md):258       |
| **Destiny early HP bar**            | HP color unico                                             | Colorblind fail (anti-pattern)                                                                                                                                                | [44-HUD anti-ref](../core/44-HUD-LAYOUT-REFERENCES.md):156                           |
| **Gloomhaven Digital** (async coop) | Async turn coop                                            | Incompat con P5 TV-share Jackbox model                                                                                                                                        | [44-HUD](../core/44-HUD-LAYOUT-REFERENCES.md):78                                     |
| **Pokémon-style cute creature**     | "Cattureggiabili" cute                                     | Evo-Tactics target = creature liminali, non collezionabili kawaii                                                                                                             | [41-ART-DIRECTION](../core/41-ART-DIRECTION.md)                                      |
| **Creatures** (norn neural-sim)     | Apprendimento ereditabile via sim neurale CONTINUA pesante | P2 rifiuta sim continuo (idea epigenome OK, ma espressione = unlock DISCRETO pack-style proven Wesnoth/AI-War); il VC-bias resta substrato interno, output discreto leggibile | [epigenome research §2.4](../research/2026-05-27-epigenome-params-research.md)       |

---

## Persona origin_games

> Source: [docs/planning/personas/player-personas-validation.md](../planning/personas/player-personas-validation.md). Giochi citati come "what these players already love" per tarare onboarding, UX, difficulty.

| Persona                                | Origin games                                               | Notes                                              |
| -------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Il Direttore** (Persona 3 archetype) | Persona 3                                                  | Time-management + party identity + emotional depth |
| **Strategist RPG**                     | D&D 5e, Pathfinder, Baldur's Gate 3, Solasta               | Rules-heavy + party tactics + character building   |
| **Speedrunner-precisionist**           | Celeste, Hollow Knight, Into the Breach, FTL               | Tight feedback + mastery curve + perma-loss        |
| **Tactical RPG-veteran**               | BG3, Darkest Dungeon, XCOM, D&D                            | Squad management + permadeath + emergent stories   |
| **ARPG completionist**                 | Path of Exile, Diablo 3, Elden Ring, Grim Dawn, Last Epoch | Build depth + loot economy + endgame grind         |
| **Audiophile** (audio direction)       | Hollow Knight                                              | Ambient atmospheric leitmotif specie               | [ADR-2026-04-18-audio](../adr/ADR-2026-04-18-audio-direction-placeholder.md) |
| **Symbiont/Beastmaster job-design**    | FFXIV Scholar Fairy, Pokémon doubles, Octopath Traveler    | Pet/companion design lessons                       | [jobs-expansion-design](../planning/2026-04-25-jobs-expansion-design.md)     |

---

## GDD pubblici riferimento

> Source: [external-references F](external-references.md). Storical GDD studiati per struttura+pitch.

| Documento                         | Studio                   | Utilità                                                              |
| --------------------------------- | ------------------------ | -------------------------------------------------------------------- |
| **Diablo 1 — Pitch doc**          | Condor                   | Pitch struct per sistema complesso + progression loop + loot economy |
| **Deus Ex — Design doc annotato** | Ion Storm (Spector)      | Design doc interconnected systems + emergent build                   |
| **GTA — Original GDD**            | Rockstar                 | GDD storico open-world systems                                       |
| **GDDMarkdownTemplate**           | LazyHatGuy (open-source) | 13-section template + audit matrix vs `docs/core/`                   |

---

## Repo open-source extraction map

> Source: `reference_external_repos.md` + `reference_tier0_deep_dive.md` (Claude memory, archiviati 2026-05-27 in codemasterdd `docs/ryzen-memory-archive/Game-Desktop-old/` -- erano path Ryzen-locale morto, ora preservati in git). 37 repo curati, 4 tier per impatto architetturale.

### Tier 0 — Analisi immediata

| Repo                                                                     | Stars | Da estrarre                                                                          |
| ------------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------ |
| [boardgame.io](https://github.com/boardgameio/boardgame.io)              | 12.3k | Round flow + state authority + phases + AI bots + deterministic sim + event log      |
| [xstate](https://github.com/statelyai/xstate)                            | 27.5k | Statecharts + actor model — `statusEffectsMachine.js` + `roundStatechart.js` shipped |
| [wesnoth](https://github.com/wesnoth/wesnoth)                            | 5.6k  | Separazione gameplay/contenuti/bilanciamento, telemetria partita                     |
| [awesome-game-design](https://github.com/Roobyx/awesome-game-design)     | —     | Hub GDD pubblici + template + postmortem benchmark                                   |
| [GDDMarkdownTemplate](https://github.com/LazyHatGuy/GDDMarkdownTemplate) | —     | Audit matrix vs `docs/core/`                                                         |
| [playwright](https://github.com/microsoft/playwright)                    | 68k+  | E2E + tracing + codegen + test isolation (già in uso)                                |

### Tier 1 — Architettura tattica / engine

| Repo                                                        | Stars | Da estrarre                                                           |
| ----------------------------------------------------------- | ----- | --------------------------------------------------------------------- |
| [OpenRA](https://github.com/OpenRA/OpenRA)                  | 15k   | Content pipeline + modding + data-driven design                       |
| [colyseus](https://github.com/colyseus/colyseus)            | 6.8k  | Node.js authoritative + state sync + serializer (M11 fallback tier-2) |
| [open_spiel](https://github.com/google-deepmind/open_spiel) | 5.1k  | MCTS + game theory + simulation balance                               |
| [godot](https://github.com/godotengine/godot)               | 93k   | Tooling + demos + docs organization reference                         |
| [bevy](https://github.com/bevyengine/bevy)                  | 37k   | ECS data-oriented + modularità sistemi                                |
| [MonoGame](https://github.com/MonoGame/MonoGame)            | 11.8k | Sample + loop + cross-platform organization                           |

### Tier 2 — Narrative + content authoring

| Repo                                                          | Stars | Da estrarre                              |
| ------------------------------------------------------------- | ----- | ---------------------------------------- |
| [ink](https://github.com/inkle/ink)                           | 4.2k  | Narrazione ramificata + briefing/debrief |
| [YarnSpinner](https://github.com/YarnSpinnerTool/YarnSpinner) | 2.4k  | Dialoghi interattivi                     |
| [Arrow](https://github.com/mhgolkar/Arrow)                    | 1.5k  | Authoring narrativo visuale + nonlinear  |

### Tier 3 — Documentation + DSL + AI + grid

| Repo                                                                                   | Stars | Da estrarre                           |
| -------------------------------------------------------------------------------------- | ----- | ------------------------------------- |
| [mermaid](https://github.com/mermaid-js/mermaid)                                       | 87k   | Docs-as-code flowchart/sequence/state |
| [langium](https://github.com/eclipse-langium/langium)                                  | 1.8k  | DSL builder + parser + LSP            |
| [yuka](https://github.com/Mugen87/yuka)                                                | 1.3k  | Game AI JS — steering + goal-driven   |
| [easystarjs](https://github.com/prettymuchbryce/easystarjs)                            | 1.9k  | A\* async JS griglia                  |
| [AncientBeast](https://github.com/FreezingMoon/AncientBeast)                           | 1.8k  | Tactical combat creatures hex         |
| [rpg_tactical_fantasy_game](https://github.com/Grimmys/rpg_tactical_fantasy_game)      | 503   | Tactical RPG Python                   |
| [libtcod](https://github.com/libtcod/libtcod)                                          | 1.2k  | FOV + pathfinding Python              |
| [GOApy](https://github.com/jameswilliamknight/GOApy)                                   | 50    | GOAP Python                           |
| [gdx-ai](https://github.com/libgdx/gdx-ai)                                             | 1.3k  | Formation + behavior trees            |
| [rlcard](https://github.com/datamllab/rlcard)                                          | 3.4k  | RL framework strategy                 |
| [aitoolkit](https://github.com/lgrammel/aitoolkit)                                     | 517   | FSM + BT + utility AI + GOAP toolkit  |
| [utility-ai](https://github.com/pschroeder89/utility-ai)                               | 19    | Utility AI Node.js drop-in            |
| [godot-tactical-rpg](https://github.com/GDQuest/godot-tactical-rpg)                    | 891   | FFT-style reference                   |
| [von-grid](https://github.com/vonWolfeworthy/von-grid)                                 | 393   | Hex grid renderer                     |
| [HexGridUtilities](https://github.com/mkiael/HexGridUtilities)                         | 148   | Hex FOV + pathfinding                 |
| [pathfinding (Rust)](https://github.com/samueltardieu/pathfinding)                     | 1.1k  | High-perf benchmark                   |
| [LockstepEngine](https://github.com/JiepengTan/LockstepEngine)                         | 947   | Deterministic multiplayer sync        |
| [ReGoap](https://github.com/luxkun/ReGoap)                                             | 1.1k  | GOAP C# architecture                  |
| [game-design-doc-generator](https://github.com/potnoodledev/game-design-doc-generator) | —     | GDD JSON generator                    |

### Meta-resources

| Repo                                                                          | Stars | Note                                       |
| ----------------------------------------------------------------------------- | ----- | ------------------------------------------ |
| [magictools](https://github.com/ellisonleao/magictools)                       | 16.5k | Meta-list massiva gamedev — browse per gap |
| [awesome-game-engine-dev](https://github.com/stevinz/awesome-game-engine-dev) | 1.3k  | Engine dev resources                       |
| [awesome-game-ai](https://github.com/datamllab/awesome-game-ai)               | 953   | Multi-agent RL + imperfect info            |
| [ai-game-devtools](https://github.com/simoninithomas/ai-game-devtools)        | 1.1k  | AI tools tracker                           |
| [2DGD_F0TH](https://github.com/2DGD-F0TH/2DGD_F0TH)                           | 450   | Ebook 500+ pp game dev theory              |

### Theory & community

- **The Art of Game Design** (Jesse Schell) — "lenti" framework
- **A Theory of Fun** (Raph Koster) — pattern di apprendimento
- **Lost Garden** (Daniel Cook) — game loops + arcs
- **The Door Problem** (Liz England) — game designer role
- **Game Maker's Toolkit** (Mark Brown) — design analysis YT
- **Designer Notes** (Soren Johnson) — Civilization IV systems
- **GDC Vault** — full archive talk
- **r/gamedesign Wiki** — community curated

---

## Cross-cutting — museum cards + agent illuminator owner

### Museum cards (`docs/museum/cards/`)

> 12 card curate post 2026-04-26. Lifecycle: `excavated → curated → reviewed → revived | rejected`. Solo `repo-archaeologist` scrive, tutti gli illuminator leggono.

| ID               | Card                                                                                                        | Domain             | Pillar | Score | Status  |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------------ | ------ | :---: | :-----: |
| M-2026-04-25-001 | [ancestors-neurons-dump-csv](../museum/cards/ancestors-neurons-dump-csv.md)                                 | ancestors          | P2+P3  |  5/5  | curated |
| M-2026-04-25-002 | [enneagramma-mechanics-registry](../museum/cards/enneagramma-mechanics-registry.md)                         | personality        | P4     |  5/5  | revived |
| M-2026-04-25-003 | [enneagramma-dataset-9-types](../museum/cards/enneagramma-dataset-9-types.md)                               | personality        | P4     |  5/5  | curated |
| M-2026-04-25-004 | [architecture-biome-memory-trait-cost](../museum/cards/architecture-biome-memory-trait-cost.md)             | architecture       | cross  |  4/5  | curated |
| M-2026-04-25-005 | [cognitive_traits-sentience-tiers-v1](../museum/cards/cognitive_traits-sentience-tiers-v1.md)               | cognitive_traits   | P3     |  4/5  | curated |
| M-2026-04-25-006 | [enneagramma-enneaeffects-orphan](../museum/cards/enneagramma-enneaeffects-orphan.md)                       | personality        | P4     |  4/5  | revived |
| M-2026-04-25-007 | [mating_nido-canvas-nido-itinerante](../museum/cards/mating_nido-canvas-nido-itinerante.md)                 | mating_nido        | P2+P5  |  4/5  | curated |
| M-2026-04-25-008 | [mating_nido-engine-orphan](../museum/cards/mating_nido-engine-orphan.md)                                   | mating_nido        | P2+P5  |  4/5  | curated |
| M-2026-04-25-009 | [personality-triangle-strategy-transfer](../museum/cards/personality-triangle-strategy-transfer.md)         | personality        | P4+P5  |  5/5  | curated |
| M-2026-04-25-010 | [personality-mbti-gates-ghost](../museum/cards/personality-mbti-gates-ghost.md)                             | personality        | P4     |  4/5  | curated |
| M-2026-04-25-011 | [old_mechanics-magnetic-rift-resonance](../museum/cards/old_mechanics-magnetic-rift-resonance.md)           | old_mechanics      | P3+P6  |  4/5  | revived |
| M-2026-04-26-001 | [evolution_genetics-voidling-bound-patterns](../museum/cards/evolution_genetics-voidling-bound-patterns.md) | evolution_genetics | P2+P3  |  4/5  | curated |

Index canonico museum: [docs/museum/MUSEUM.md](../museum/MUSEUM.md).

### Agent illuminator (`.claude/agents/`)

| Agent                                                                                | Mode                    | Owner di                                                                                           |
| ------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------- |
| [creature-aspect-illuminator](../../.claude/agents/creature-aspect-illuminator.md)   | audit \| research       | Wildermyth + Caves of Qud + MHS + CK3 + Subnautica + Voidling Bound creature pattern               |
| [narrative-design-illuminator](../../.claude/agents/narrative-design-illuminator.md) | audit \| research       | ink/inkle + Yarn Spinner + Disco Elysium + Wildermyth + Tracery + ChoiceScript + Fallen London QBN |
| [pcg-level-design-illuminator](../../.claude/agents/pcg-level-design-illuminator.md) | audit \| research       | ItB + Dead Cells + WFC + Spelunky + Pathfinder + ASP + LLM-agentic PCG 2024                        |
| [economy-design-illuminator](../../.claude/agents/economy-design-illuminator.md)     | audit \| research       | Slay the Spire + Hades + Monster Train + Machinations + ItB reward + XCOM Long War supply/intel    |
| [balance-illuminator](../../.claude/agents/balance-illuminator.md)                   | calibration \| research | Stockfish SPRT + MAP-Elites + MCTS + Bayesian + LLM-as-critic + Hearthstone academic               |
| [ui-design-illuminator](../../.claude/agents/ui-design-illuminator.md)               | audit \| research       | ItB telegraph + StS intent + Jackbox Jack Principles + XCOM HUD + Dead Space diegetic + 10-foot TV |
| [telemetry-viz-illuminator](../../.claude/agents/telemetry-viz-illuminator.md)       | audit \| research       | Tufte + Grafana + heatmap + funnel + Sankey + deck.gl + DuckDB + Riot/Valorant analytics           |
| [repo-archaeologist](../../.claude/agents/repo-archaeologist.md)                     | excavate \| curate      | Software Archaeology + Dublin Core + git pickaxe + Hades Codex archive UX                          |

---

## Mappa pilastri → top-3 source per pillar

> Quick lookup: per ogni pilastro, top-3 source più rilevanti per consultation.

| Pilastro          | #1 source                           | #2 source                                        | #3 source                                 |
| ----------------- | ----------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| **P1 Tattica**    | FFT (tradition)                     | Halfway (postmortem) + Tactics Ogre Reborn (HUD) | Frozen Synapse (planning-first)           |
| **P2 Evoluzione** | Spore (vision)                      | Voidling Bound (patterns) + Hades (loop)         | Cogmind (modular)                         |
| **P3 Specie×Job** | XCOM EU/EW (perks)                  | Triangle Strategy (recruit gating)               | Wesnoth (advancement)                     |
| **P4 MBTI/Ennea** | Disco Elysium (thought cabinet)     | Triangle Strategy (Conviction 3-axis)            | Wildermyth (layered narrative)            |
| **P5 Co-op**      | Jackbox / XCOM 2 online (room-code) | AI War: Fleet Command (asymmetric AI)            | Natural Selection 2 (commander asymmetry) |
| **P6 Fairness**   | XCOM Long War 2 (timer + pod)       | AI War (AI Progress meter)                       | Stockfish SPRT + Balatro iter             |

---

## Maintenance protocol

### Quando aggiungere

- Nuovo gioco studiato (research doc OR transfer plan OR museum card)
- Nuovo agent illuminator pattern donor
- Nuovo postmortem letto + lessons estratte
- Nuova fonte academic / industry pattern adottata

### Come aggiungere — workflow

1. **Identifica tier** (S deep-dive / A feature donor / B postmortem / C HUD / D narrative / E methodology / Anti-ref / Persona)
2. **Aggiungi riga tabella tier** con: gioco · studio+anno · feature · pilastro · depth · doc canonical link
3. **Path canonical**: research doc OR museum card OR planning doc — link relativo da `docs/guide/games-source-index.md`
4. **Update [LIBRARY.md](../../LIBRARY.md)** tabella "Repo esterni studiati" se S/A-tier
5. **Update [MUSEUM.md](../museum/MUSEUM.md)** se card museum aggiunta
6. **Memory update** (`reference_voidling_bound_research.md` pattern) se ricerca > 30min
7. **Run governance**: `python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict`

### Quando rimuovere / spostare

- Gioco studiato ma scope-out post-decision → move a "Anti-reference" con motivo
- Pattern adoption fallita → mark `[deprecated]` riga + flag in research doc
- Source obsoleto (gioco delisted, repo unmaintained) → mark `[archived]` ma NON delete (audit trail)

### Review cycle

- **90 giorni** per `last_verified` frontmatter
- Trigger review: nuovo pilastro stato change (🔴→🟡→🟢) → re-check top-3 source per pillar relevance

---

## Relazione con SoT governato

Questo catalogo e' **source-of-truth governato** (registrato in
`docs/governance/docs_registry.json`, `source_of_truth: true`, review-cycle 90gg): la
lista giochi-fonte non e' piu' un doc laterale che va stale (drift 2026-05-29: Pokopia

- Dwarf Fortress mancanti = root-cause maintenance-protocol non seguito). Relazioni:

* **DF-Levels matrix** ([ADR-2026-05-18-df-levels](../adr/ADR-2026-05-18-df-levels-integration-direction.md)):
  aggiunge la dimensione **L0-L5 + verdetto governato** (SHIPPED/GATED/GREENFIELD/REF/ANTI).
  De-dup: studio+feature+pilastro+depth = QUI (catalogo SoT); DF-level + verdetto-di-build = li'.
* **Metodo playtest**: validazione dei pattern adottati = [playtest AI-driven canonico](../process/CANONICAL-AI-PLAYTEST.md)
  (gate riproducibile multi-policy N=40), NON playtest umano.
* **Mirror sovereign**: vault `Atlas/evo-tactics-*-moc.md` + `Cards/deep-research-evo-tactics/` = copia sovereign design-notes.

Maintenance: nuovo gioco -> riga qui (protocollo sotto) E, se tocca direzione DF, riga
nella matrix ADR. Currency check nel review-cycle 90gg (registry-tracked = niente piu' drift silenzioso).

## Riferimenti incrociati

- [LIBRARY.md](../../LIBRARY.md) — sistemi esterni + tools + API + skills
- [MUSEUM.md](../museum/MUSEUM.md) — museum cards index
- [PROJECT_BRIEF.md](../../PROJECT_BRIEF.md) — identità progetto + visione
- [DECISIONS_LOG.md](../../DECISIONS_LOG.md) — index 30 ADR
- [SAFE_CHANGES.md](../../.claude/SAFE_CHANGES.md) — whitelist cambi
- Memory: [`reference_external_repos.md`](../../C--Users-VGit-Desktop-Game/memory/reference_external_repos.md) + [`reference_tactical_postmortems.md`](../../C--Users-VGit-Desktop-Game/memory/reference_tactical_postmortems.md) + [`reference_voidling_bound_research.md`](../../C--Users-VGit-Desktop-Game/memory/reference_voidling_bound_research.md)
