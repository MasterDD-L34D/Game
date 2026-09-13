---
title: 2026-04-28 Asset sourcing strategy — multi-source pipeline
doc_status: draft
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-28
language: it
review_cycle_days: 30
related:
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/core/43-ASSET-SOURCING.md'
  - 'docs/planning/2026-04-28-godot-migration-strategy.md'
---

# Asset sourcing strategy — multi-source pipeline (Sprint G + Fase 2 Godot)

## Context

User feedback iterativo: piano migrazione Godot va "dettagliato completo". Aggiunge sources potenziali:

- **Legacy Collection** (Ansimuz CC0, ~80MB, 1613 PNG, fornito user via zip) — primary fantasy/sci-fi pixel art
- **itch.io free tag-godot** — community asset packs gratuiti (CC0/CC-BY/free for commercial)
- **Godot Asset Library** — plugin/script/template/shader integrati editor Godot

Pipeline asset finale: **multi-tier sourcing** con priority + license + integration phase.

## Tier 1 — Legacy Collection (primary, immediato Sprint G)

**Fonte**: Luis Zuno (Ansimuz) — `Legacy Collection.zip` fornito user 2026-04-28.

**License**: **CC0 Creative Commons Zero** — no attribution required, commercial OK, modification OK, redistribution OK. MIT-compatible.

**Inventory totale**: 1613 PNG, ~80MB extracted.

### Sub-collections rilevanti Evo-Tactics

| Collection                                                | Path                                                              | Contenuto                                                                                                                    | Wire target                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **TinyRPG/Battle Sprites**                                | `Assets/TinyRPG/Battle Sprites/`                                  | Combat sprite multi-frame                                                                                                    | Sprite archetype 8× core (idle/walk/attack/hurt/die)                                     |
| **TinyRPG/Top-Down-16-bit-fantasy**                       | `Assets/TinyRPG/Characters/`                                      | Top-down character anim                                                                                                      | Grid combat top-down view canonical                                                      |
| **TinyRPG/Overworld**                                     | `Assets/TinyRPG/Environments/Overworld/`                          | Tile world map                                                                                                               | Bioma savana/foresta base                                                                |
| **TinyRPG/Top-Down-Forest**                               | `Assets/TinyRPG/Environments/Top-Down-Forest/`                    | Forest tiles                                                                                                                 | Bioma foresta acida                                                                      |
| **TinyRPG/Top-Down-Town**                                 | `Assets/TinyRPG/Environments/Top-Down-Town/`                      | Town tiles                                                                                                                   | Bioma encounter civilization                                                             |
| **TinyRPG/single-dungeon-crawler**                        | `Assets/TinyRPG/Environments/single-dungeon-crawler/`             | Dungeon tiles                                                                                                                | Bioma caverna                                                                            |
| **TinyRPG/Tiny RPG Mountain Files**                       | `Assets/TinyRPG/Environments/Tiny RPG Mountain Files/`            | Mountain tiles                                                                                                               | Bioma tundra                                                                             |
| **TinyRPG/parallax_forest_pack web**                      | `Assets/TinyRPG/Environments/parallax_forest_pack web/`           | Parallax bg layers (4-6 layer)                                                                                               | Background atmospheric depth dietro grid                                                 |
| **Gothicvania/Characters**                                | `Assets/Gothicvania/Characters/`                                  | Ogre/WereWolf/Knight/Demon/Hell-Beast/Hell-Hound/flying-eye-demon/mutant-toad/meerman/crow/death/Nightmare/Ghost/Dragon-boss | Creature SISTEMA dark fantasy + boss tier 4                                              |
| **Gothicvania/Environments**                              | `Assets/Gothicvania/Environments/`                                | Gothic tiles (dark biome)                                                                                                    | Bioma vulcanico/abissale                                                                 |
| **Warped/Characters**                                     | `Assets/Warped/Characters/`                                       | cyberpunk-detective/mech-unit/space-marine-lite/alien-walking/alien-flying/spaceship/tank/top-down-boss                      | Sci-fi alternative archetype (deferred Fase 2+)                                          |
| **Warped/Environments**                                   | `Assets/Warped/Environments/`                                     | Sci-fi tiles                                                                                                                 | Bioma celeste (sci-fi flavour)                                                           |
| **Explosions and Magic/Hit**                              | `Assets/Explosions and Magic/Hit/Sprites/`                        | Hit impact frames                                                                                                            | Wire `anim.js` drawHitFlash (replace simple ray)                                         |
| **Explosions and Magic/EnemyDeath**                       | `Assets/Explosions and Magic/EnemyDeath/Sprites/`                 | Death anim                                                                                                                   | Wire `anim.js` drawDeath (replace fade-out)                                              |
| **Explosions and Magic/Explosions pack** (7 variants a-g) | `Assets/Explosions and Magic/Explosions pack/explosion-1-{a..g}/` | Explosion frames                                                                                                             | Wire `anim.js` drawExplosion (AOE effects)                                               |
| **Explosions and Magic/Grotto-escape-2-FX**               | `Assets/Explosions and Magic/Grotto-escape-2-FX/sprites/`         | electro-shock, enemy-death, energy-field, energy-smack, fire-ball, slash-circular, slash-horizontal, slash-upward            | Wire abilities VFX (channel-specific: psionic→energy-field, fire→fire-ball, melee→slash) |
| **Explosions and Magic/Ground Explosion**                 | `Assets/Explosions and Magic/Ground Explosion/sprites/`           | Ground explosion                                                                                                             | AOE telegraph (aoePreview Sprint 4 §II)                                                  |
| **Explosions and Magic/Warped shooting fx/Bolt**          | `Assets/Explosions and Magic/Warped shooting fx/Bolt/sprites/`    | Sci-fi bolt                                                                                                                  | Ranged ability VFX                                                                       |
| **Explosions and Magic/Water splash**                     | `Assets/Explosions and Magic/Water splash/`                       | Water splash                                                                                                                 | Bioma palude/abissale specific VFX                                                       |
| **Misc/colorful-tileset**                                 | `Assets/Misc/colorful-tileset/`                                   | Generic tileset                                                                                                              | Tile complement                                                                          |
| **Misc/gems**                                             | `Assets/Misc/gems/`                                               | Gem icons                                                                                                                    | UI inventory/loot indicator                                                              |
| **Misc/Characters/sunny-\***                              | `Assets/Misc/Characters/sunny-{mushroom,dragon,froggy,bunny}/`    | Cute creature sprites                                                                                                        | Skiv lifecycle alternative skins                                                         |

### Filter strategy (anti-bloat repo)

**Problema**: 80MB estratti → repo bloat se commit tutto. Filter selettivo wire-ready.

**Estratto in repo `apps/play/public/assets/legacy/`**:

- TinyRPG Battle Sprites + Top-Down-16-bit-fantasy: 8 archetype × 4-state anim ≈ **5MB**
- TinyRPG Environments selected (Overworld + Top-Down-Forest + Top-Down-Town + single-dungeon-crawler + Mountain): ~3-4 tile + parallax layer ≈ **8MB**
- Gothicvania Characters tier-4 boss + 5 enemy: ≈ **3MB**
- Explosions and Magic VFX selected (Hit + EnemyDeath + 1 Explosion + 4 slash + fire-ball + electro-shock + Bolt): ≈ **2MB**
- License + credit: 1KB
- **TOTALE in-repo**: ~18-20MB filtered (vs 80MB full). Acceptable.

**Excluded**: Warped sci-fi (defer Fase 2+ alternative theme), gems (no inventory ora), full parallax pack other biome, sunny-\* (Skiv use-case future).

### License compliance

```
apps/play/public/assets/legacy/LICENSE.txt:
  Pixel art assets in this directory by Luis Zuno (Ansimuz).
  Released under Creative Commons Zero (CC0) — public domain.
  No attribution required, commercial use permitted, modification OK.
  Source: https://ansimuz.itch.io/
  Courtesy credit (not required): Pixel art by Luis Zuno (Ansimuz)
```

Footer attrib courtesy (NON required CC0): `apps/play/index.html` footer aggiungi 1 riga "Pixel art: Ansimuz (CC0)".

---

## Tier 2 — itch.io free tag-godot (Sprint G complement / Fase 2)

**Fonte**: https://itch.io/game-assets/free/tag-godot

**Note**: Cloudflare bot challenge blocca direct fetch. Riferimento community knowledge top free packs.

### Top free packs commonly known (verifica manuale link prima usage)

| Pack                              | Author          |       License       | Tipo                                | Wire target Evo-Tactics                       |
| --------------------------------- | --------------- | :-----------------: | ----------------------------------- | --------------------------------------------- |
| **Pixel Adventure 1**             | Pixel Frog      |         CC0         | Side-view char + tile               | Skirmisher/scout alternative anim             |
| **Dungeon Tileset II**            | 0x72            |         CC0         | Dungeon top-down tile + 16x16 chars | Bioma caverna alternative + 16x16 sprite tier |
| **Penzilla Platformer Pack**      | Penzilla        |        Free         | Side-view environment               | Bg parallax alternative                       |
| **Pixel Boy Top-Down Pack**       | Pixel Boy       |        Free         | Top-down characters                 | Archetype alternative if Ansimuz scarce       |
| **Fantasy Minimal Pixel Art GUI** | Veyroa          |         CC0         | UI elements                         | UI border/button alternative Kenney           |
| **Pixel Crawler**                 | Cup Nooble      | Free non-commercial | Dungeon character + tile            | Reference only (license restrictive)          |
| **Mini Pixel Pack**               | Sven Vinkemeier |         CC0         | Multi-purpose                       | Filler asset                                  |
| **Calciumtrice Animations**       | Calciumtrice    |      CC-BY 3.0      | Character anim spritesheets         | Anim cycle reference (attrib requested)       |
| **Trixie Tiny RPG sprites**       | Trixie          |         CC0         | RPG sprites                         | Sprite alternative                            |
| **Time Fantasy**                  | PIXEL-BOY & AAA | Premium (free demo) | Fantasy chars + tiles               | Demo only                                     |

### Decision tree itch.io usage

1. **Sprint G Fase 1**: usa SOLO Legacy Collection (already provided + Ansimuz quality high). Skip itch.io ora — bandwidth focus.
2. **Sprint G post-playtest**: SE gap visivo specifico (es. UI border non in Legacy) → cherry-pick itch.io 1-2 pack mirati.
3. **Fase 2 Godot R&D**: itch.io asset Godot-tagged direttamente importabili (TileMap-ready, Aseprite-format). Use per vertical slice MVP.
4. **License screening**: SOLO CC0 / CC-BY (footer attrib OK) / free-commercial. Skip non-commercial / royalty-required.

### Manual fetch protocol

Cloudflare challenge → fetch automated bloccato. Process:

1. User apre itch.io browser, cerca pack rilevante per gap
2. Copia URL pack + verifica license tab
3. Download manuale ZIP, extract in `apps/play/public/assets/itch-<pack-name>/`
4. License txt copy in stessa dir
5. Footer credit se CC-BY

**NO automation possibile via Claude Code** per itch.io download (Cloudflare).

---

## Tier 3 — Godot Asset Library (Fase 2 Godot R&D ONLY)

**Fonte**: https://godotassetlibrary.com/ + integrato editor Godot AssetLib tab

**Categorie totali**:

| Categoria | Asset count | Relevance Evo-Tactics |
| --------- | :---------: | :-------------------: |
| 2D Tools  |     438     |         ★★★★★         |
| Tools     |    1743     |          ★★★          |
| Scripts   |     859     |          ★★★          |
| 3D Tools  |     671     |   ★ (no 3D nostro)    |
| Demos     |     497     |    ★★ (reference)     |
| Shaders   |     160     |         ★★★★★         |
| Templates |     130     |          ★★           |
| Projects  |     112     |          ★★           |
| Misc      |     390     |          ★★           |
| Materials |     29      |           ★           |

### Top plugin/asset critici Fase 2 Godot R&D

| Plugin                         | Cosa fa                                                           | Wire target                                          |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------- |
| **Aseprite Wizard**            | Import .ase/.aseprite → AnimationPlayer + SpriteFrames automatico | Sprite anim authoring pipeline (vs manual atlas)     |
| **Dialogue Manager 2**         | Yarn Spinner-like editor dialogue branching in-engine             | Narrative system (Disco Elysium dialogue replicate)  |
| **GdPlanningAI**               | GOAP-based AI behavior planner                                    | SISTEMA AI replace `policy.js` declareSistemaIntents |
| **LimboAI**                    | Behavior tree + state machine + HSM combo                         | Combat AI orchestration alternative                  |
| **Beehave**                    | Behavior tree visual editor                                       | AI per archetype (vanguard/healer/boss specific BT)  |
| **Phantom Camera 2D**          | Camera2D advanced (cinematic, zoom, follow, shake)                | Tactical camera grid combat                          |
| **GodSVG editor**              | SVG import + edit in-engine                                       | UI icon real-time edit (vs export Inkscape loop)     |
| **LDtk import**                | LDtk levels → Godot TileMap nativo                                | Encounter level authoring (替代 YAML manual)         |
| **TileSetEditor improvements** | TileSet authoring better                                          | Tile bioma authoring polish                          |
| **Phoenix Tween**              | Tween advanced + sequence + parallel                              | UI anim micro replace Tween built-in                 |
| **Godot Steering Behaviors**   | Boids/flocking/seek/flee                                          | Movement nemico advanced (oltre A\*)                 |
| **Hex grid plugin**            | Hex tile system                                                   | SE pivot a hex grid (currently square — defer)       |
| **AudioStreamPlayer pool**     | Audio mixer pool + bus management                                 | Sound design pipeline                                |
| **Inspector Plus**             | Inspector editor extension                                        | Dev productivity                                     |
| **Auto Tile**                  | Auto-tile rule generation                                         | Tile authoring speed-up                              |

### Shader category top picks

| Shader                       | Effect                                      | Wire target                                                  |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| **CRT scanline shader**      | Scanline + curvature + chromatic aberration | Replace nostro CSS scanline (better quality)                 |
| **Pixel-perfect outline**    | Sprite outline + selection ring             | Selected unit highlight (replace Canvas stroke)              |
| **Dissolve / dither shader** | Pixel dissolve effect                       | Death/spawn anim                                             |
| **Water shader 2D**          | Animated water surface                      | Bioma palude/abissale                                        |
| **Fog of war shader**        | Tile reveal masking                         | Echolocation Skiv (already V2 PR #1977 echolocation overlay) |
| **Bloom 2D**                 | Glow effect                                 | Critical hit / ability cast highlight                        |
| **Tilt / parallax shader**   | Camera-relative parallax                    | Depth bg layer                                               |

### License default Godot Asset Library

- Platform AGPLv3 (irrelevante — non importi piattaforma codice)
- Asset individuali: license dichiarata per asset, **prevalentemente MIT**, alcuni CC-BY o GPL. Filter MIT/CC0/CC-BY only.

### Process integrazione

1. Godot editor → AssetLib tab (built-in)
2. Search categoria/keyword
3. Download → auto-install in `addons/<plugin-name>/`
4. Project Settings → Plugins → enable
5. Restart editor (alcuni plugin)

**Vantaggio rispetto itch.io**: zero browser scraping, zero Cloudflare. Native pipeline Godot.

---

## Strategia integrata multi-tier

### Sprint G (Fase 1, ~1 settimana) — Web stack

**Primary**: Legacy Collection (Tier 1 only).

**Asset plan**:

| Step                                                                                             | Asset source                                                   | Effort |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | :----: |
| Filter Legacy Collection 80MB → 18-20MB selected                                                 | Legacy Collection Tier 1                                       |   1h   |
| Wire `resolveTileImg` switch a `/assets/legacy/tiles/<bioma>/`                                   | Battle Sprites + Overworld + Top-Down-Forest + dungeon-crawler |   2h   |
| Wire `resolveCreatureSprite` switch a `/assets/legacy/creatures/<archetype>/` (multi-frame anim) | Battle Sprites 8 archetype 4-state                             |   2h   |
| Multi-frame anim in render.js (idle/walk/attack/hurt) — replace static PNG                       | Loop frame timer ms-based                                      |   2h   |
| Parallax bg layer CSS (1 layer behind canvas)                                                    | parallax_forest_pack                                           |   1h   |
| VFX wire anim.js (hit, death, explosion, slash)                                                  | Explosions and Magic                                           |   2h   |
| Footer credit + LICENSE.txt                                                                      | License compliance                                             | 15min  |
| Test regression + format + commit                                                                |                                                                |   1h   |

**Effort totale**: ~12h (~1.5 giorni). Risolve **80% gap "flat"** restante.

### Fase 1 post-Sprint G (gap-fill puntuale, 2-4h)

SE gap UI specifico (border ornament, button frame) → cherry-pick itch.io 1 pack:

- **Veyroa Fantasy Minimal Pixel Art GUI CC0** (UI border alt Kenney)
- O **Penzilla** UI elements

### Visual Map setup (post-playtest, ~3-5 giorni)

**Tool**: Obsidian (MIT-friendly, markdown-first, git-compat).

**Vault**: `kb/` directory in repo (git-tracked).

**Plugin Obsidian recommended**:

- Excalidraw (sketching, MIT-equivalent)
- Mind Map (Markmap, BSD-3)
- Dataview (query frontmatter, MIT)
- Kanban (sprint board, MIT)

**ETL**:

- 49 ADR → `kb/adr/`
- 11 museum cards → `kb/museum/`
- ~150 memory file → `kb/memory/` (filter relevant)
- 4 art direction core (41/42/43/44) → `kb/art-bible/`
- Sprint timeline → mind map dedicato `kb/maps/sprint-timeline.canvas`
- Agent ecosystem → mind map `kb/maps/agent-graph.canvas`
- Repo dependency → mind map `kb/maps/repo-deps.canvas`

### Fase 2 Godot R&D (~4-8 settimane)

**Asset sourcing**:

| Tier | Source                               | Use                                                                                                                                           |
| ---- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Legacy Collection (already filtered) | Re-import in Godot project (TileSet + AnimatedSprite2D + AtlasTexture import)                                                                 |
| 2    | itch.io tag-godot manual download    | Gap-fill specifico (es. boss tier 4 secondary, sci-fi alternative)                                                                            |
| 3    | **Godot Asset Library**              | Plugin (Aseprite Wizard, Dialogue Manager 2, GdPlanningAI, Beehave, Phantom Camera 2D, LDtk import, Pixel-perfect outline shader, CRT shader) |

**Plugin priority install ordine**:

1. **Aseprite Wizard** (sprite anim pipeline) — settimana 1
2. **LDtk import** (encounter level authoring) — settimana 1
3. **Phantom Camera 2D** (camera grid combat) — settimana 1
4. **Beehave** (AI behavior tree) — settimana 2
5. **Dialogue Manager 2** (narrative dialogue) — settimana 3
6. **GdPlanningAI** (SISTEMA AI GOAP) — settimana 3-4
7. **Shader pack** (CRT + outline + dissolve) — settimana 4-5
8. **GUT framework** (test) — settimana 5-6

---

## Anti-pattern da evitare

| Anti-pattern                                                     | Mitigation                                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Asset bloat repo (commit 80MB Legacy full)                       | Filter selettivo 18-20MB Sprint G                                          |
| Mix top-down + side-view stesso encounter                        | Decision: top-down primary (grid combat). Side-view solo Skiv lifecycle bg |
| Ignorare license verify                                          | LICENSE.txt obbligatorio per ogni asset dir                                |
| itch.io non-commercial pack                                      | Filter SOLO CC0 / CC-BY / free-commercial                                  |
| Plugin Godot AssetLib outdated (Godot 3.x)                       | Filter Godot 4.x compat                                                    |
| Doppione Tier 1 + Tier 2 (Legacy + itch.io stesso pack)          | Tier 1 primary, itch.io solo gap-fill                                      |
| Asset sovrapposizione Skiv canon (sunny-\* invece di lizard LPC) | Skiv resta LPC Drakes/Lizardfolk (canonical 2026-04-26). sunny-\* skip     |
| AGPL viral asset import code                                     | Asset license verify tab — skip GPL/AGPL asset code (asset PNG safe)       |

---

## Decision points pending

1. **Sprint G top-down vs side-view**: top-down (grid combat preferred) → conferma SÌ default
2. **Filter Legacy in repo**: 18-20MB subset → conferma SÌ default
3. **itch.io Sprint G**: skip ora (Legacy sufficient) → conferma SÌ default
4. **Visual Map post-playtest**: Obsidian vault `kb/` → conferma SÌ default
5. **Fase 2 plugin Godot priority order**: Aseprite Wizard → LDtk → Phantom Camera 2D → Beehave → Dialogue Manager 2 → GdPlanningAI → shader → GUT. Conferma ordine.
6. **Skiv LPC canonical preserved**: SÌ (no swap a sunny-\*)

---

## Next steps

1. **Ora (auto mode)**: avvia Sprint G v2 con Legacy Collection
   - Filter + copy subset → `apps/play/public/assets/legacy/`
   - Wire resolveTileImg + resolveCreatureSprite path nuovo
   - Multi-frame anim render.js
   - Parallax bg CSS
   - VFX anim.js
   - License + credit footer
2. **Post-Sprint G**: TKT-M11B-06 playtest userland setup
3. **Post-playtest**: Visual Map Obsidian vault + Fase 2 setup
4. **Fase 2**: clone Donchitos template + Godot Asset Library plugin priority install + vertical slice MVP

**Status doc**: DRAFT pending user OK su 6 decision point. Dopo OK → `doc_status: active`.
