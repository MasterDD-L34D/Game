---
title: 'Gallery worldgen — sistema ecologico sepolto'
doc_status: active
doc_owner: repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-26
source_of_truth: false
language: it
review_cycle_days: 90
---

# Gallery worldgen — sistema ecologico sepolto

> Aggregato di 7 card domain `worldgen`. Excavated 2026-04-26. Narrativa collegante + gap analysis + reuse path consolidato.

---

## Narrativa: il mondo dimenticato

Evo-Tactics è descritto come "rotazione di mappe" da Claude quando legge solo il session engine e il round model. La realtà documentata nel repo è radicalmente diversa.

Tra ottobre e novembre 2025 (`8ee399e8` → `6b07b18e`), MasterDD-L34D ha costruito un modello worldgen a **4 livelli sovrapposti**:

1. **Bioma** (`data/core/biomes.yaml`) — pacchetto gameplay+fiction completo: difficulty, affixes, hazard, StressWave, npc_archetypes, tono, hooks.
2. **Ecosistema** (`packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml`) — 5 ecosistemi con struttura trofica completa, validatori, link specie.
3. **Meta-ecosistema** (`meta_network_alpha.yaml`) — 5 nodi + 12 edge tipizzati + bridge_species_map + regole `at_least`.
4. **Cross-eventi** (`cross_events.yaml`) — 3 eventi con propagation rules, effetti gameplay concreti.

Poi gli sprint hanno girato verso combat, forms, jobs, WS lobby, VC scoring — sprint M6 → M20, 2026-04. Il worldgen è rimasto intatto nei dati ma invisibile nel runtime.

**Il solo raccordo runtime** è `biomeSpawnBias.js` (PR #1726, 2026-04-24): consuma `affixes` dal bioma (livello 1) per modificare spawn weight. Non consuma nulla dei livelli 2-3-4.

---

## Timeline costruzione (git provenance verificata)

| Data       | SHA        | Cosa                                                 |
| ---------- | ---------- | ---------------------------------------------------- |
| 2025-10-25 | `8ee399e8` | Schema v2.0 + prime foodweb + ecosistema pack tools  |
| 2025-10-27 | `1775c547` | Align species biomes canonical registry              |
| 2025-10-28 | `61fe6079` | Cross-events + meta-network aligned                  |
| 2025-10-29 | `b36bfa35` | Foodweb + trophic_roles validator + biome_pools.json |
| 2025-10-31 | `5a06b64b` | SoT tri_sorgente + ecosistema schema docs            |
| 2025-11-29 | `6b07b18e` | Ultimo touch meta-network (validator rerun log)      |
| 2026-04-16 | `d2838e77` | Bilingual labels foodweb (nominale)                  |
| 2026-04-24 | `0d501169` | biomeSpawnBias.js — UNICO wire runtime (affix only)  |

**Mesi di silenzio**: 2025-12 → 2026-04 = ~5 mesi. Nessun PR tocca il modello worldgen nel runtime.

---

## Gap analysis: dataset vs runtime

| Layer                        | Dataset                 | Validator                    | Runtime                                        |
| ---------------------------- | ----------------------- | ---------------------------- | ---------------------------------------------- |
| Bioma affixes                | ✅ completo             | -                            | ✅ biomeSpawnBias                              |
| Bioma hazard/StressWave      | ✅ completo             | -                            | ❌ zero                                        |
| Bioma diff_base/mod_biome    | ✅ completo             | -                            | ❌ zero                                        |
| Ecosistema struttura trofica | ✅ 5 file               | ✅ trophic_roles.py          | ❌ zero                                        |
| Foodweb archi/nodi           | ✅ 5 file               | ✅ foodweb.py                | ❌ zero (solo `/api/quality`)                  |
| Meta-network edges/nodes     | ✅ completo             | ✅ network rules             | ❌ zero                                        |
| Cross-events propagation     | ✅ 3 eventi             | ✅ collect_event_propagation | ❌ zero                                        |
| Bridge species               | ✅ 3 specie nel pack    | ✅ bridge missing check      | ❌ non in data/core/species.yaml               |
| role_templates (biome_pools) | ✅ 489 righe            | -                            | ❌ caricato da catalog.js, non esposto a spawn |
| Forme d12 bias               | ✅ form_pack_bias.yaml  | -                            | ✅ formPackRecommender.js                      |
| starter_bioma pack           | ✅ dichiarato (stringa) | -                            | ❌ contenuto undefined                         |
| Forme MBTI → bioma link      | ❌ non esistente        | -                            | ❌ non progettato                              |

**Sintesi**: 12 componenti worldgen, 3 pienamente wired, 1 parzialmente wired (biome affixes), 8 zero runtime.

---

## Card inventory worldgen (7 card, session 2026-04-26)

| ID               | Card                                                                                                                  | Score | Status  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ----- | ------- |
| M-2026-04-26-012 | [Stack 4-livelli bioma→ecosistema→foodweb→network](../cards/worldgen-bioma-ecosistema-foodweb-network-stack.md)       | 5/5   | curated |
| M-2026-04-26-013 | [Emergenza specie da ecosistema: role_templates + biome_pools](../cards/worldgen-species-emergence-from-ecosystem.md) | 4/5   | curated |
| M-2026-04-26-014 | [Cross-bioma event propagation: tempesta ferrosa](../cards/worldgen-cross-bioma-events-propagation.md)                | 4/5   | curated |
| M-2026-04-26-015 | [Bridge species: echo-wing, ferrocolonia, archon-solare](../cards/worldgen-bridge-species-network-glue.md)            | 3/5   | curated |
| M-2026-04-26-016 | [Ruoli trofici: validator-time completo, runtime zero](../cards/worldgen-trophic-roles-validator-not-runtime.md)      | 4/5   | curated |
| M-2026-04-26-017 | [16 Forme MBTI come seed evolutivi: d12 bias + PI vs VC](../cards/worldgen-forme-mbti-as-evolutionary-seed.md)        | 4/5   | curated |
| M-2026-04-26-018 | [Bioma come pacchetto gameplay+fiction](../cards/worldgen-biome-as-gameplay-fiction-package.md)                       | 5/5   | curated |

---

## Reuse path consolidato (priority order)

Basato su score + blast radius + pillar impact. Tutte effort POST-blast-radius-multiplier.

### Tier 1 — Quick wins (autonomamente procedibili, ~3-6h ciascuno)

1. **Bioma diff_base + hazard → pressure modifier** (card M-018, ~3h): `sessionHelpers.js` + biomes.yaml → scala HP enemy + StressWave iniziale. Chiude gap P6 senza nuovi nemici. Blast ×1.3.
2. **starter_bioma trait definition** (card M-017, ~3h): definisci per ogni bioma un `starter_bioma_trait` slug → `formPackRecommender.js` lo risolve. Chiude campo YAML undefined. Blast ×1.3.
3. **role_templates biome_pools → biomeSpawnBias** (card M-013, ~6h): estendi `biomeSpawnBias.js` per leggere `role_templates` da `biome_pools.json`. Spawn enemy con role ecologico corretto. Blast ×1.5.

### Tier 2 — Medium effort (richiede review, ~8-15h)

4. **Cross-event come StressWave modifier** (card M-014, ~12h): `crossEventService.js` + random roll inizio sessione + pressure modifier. P6 boost senza spawn aggiuntivi.
5. **Trophic role resolver Node-native** (card M-016, ~15h): porta `trophic_roles.py` alias map a `trophicRoleResolver.js` + constraint wave generation. P3 boost.

### Tier 3 — Richiede ADR + user decision

6. **Bridge species canonical** (card M-015): ADR su tipo (enemy/NPC/event). Poi ~10h.
7. **Meta-network full wire** (card M-012 full path): ~34-42h. ADR. Sprint dedicato.

---

## Anti-pattern gallery worldgen

- ❌ **"Il gioco usa rotazione di mappe"** — falso. La rotazione di mappe è il runtime. Il design intent è la rete ecologica.
- ❌ **Usare foodweb come meccanica player-visible** — SoT §4 esplicito: impatto basso come meccanica esplicita. È motore invisibile.
- ❌ **Wire cross-events senza quantificare gli effetti** — i YAML hanno descrizioni narrative (`"penalità visibilità/gear metallico"`) non numeri. Serve design decision prima di wire.
- ❌ **Promuovere bridge species senza risolvere ambiguità species/resource** — `ferrocolonia-magnetotattica` è sia `species` che `resource` nel foodweb. Definire prima.
- ❌ **Port Python validator al runtime** — ADR-2026-04-19 ha killed il Python rules engine. Portare a Node-native, non usare il bridge Python esistente per hot path.
- ❌ **Ignorare questo museum** — il rischio principale: sprint futuro costruisce "biome pressure system" ex-novo senza sapere che `StressWave` in `biomes.yaml` + `cross_events.yaml` + `trophic_roles.py` esistono già.

---

## Note per altri agent

- **balance-illuminator**: `hazard.stress_modifiers` + `diff_base` sono knob di bilanciamento non usati. Calibration harness potrebbe esporli.
- **pcg-level-design-illuminator**: `biome_pools.json:role_templates` è PCG layer pronto. `meta_network_alpha.yaml` è il level design graph del meta-game.
- **narrative-design-illuminator**: `tono narrativo` + `hooks` in `biomes.yaml` sono il brief per narrative engine (inkjs).
- **species-reviewer**: bridge species (`echo-wing`, `ferrocolonia-magnetotattica`, `archon-solare`) non sono in `data/core/species.yaml`. Da promuovere o ignorare esplicitamente.
- **sot-planner**: se vuoi chiudere la catena worldgen completa, proponi ADR "Worldgen Runtime Integration" che copre tier 1 + tier 2 sopra. Non richiedere ADR per quick wins tier 1.
