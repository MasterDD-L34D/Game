---
title: Sprint G v3 Legacy Collection asset swap — visual smoke 2026-04-29
workstream: ops-qa
status: active
owner: master-dd
last_review: 2026-04-29
tags: [sprint-g-v3, visual, legacy-collection, ansimuz, asset-swap, smoke]
---

# Sprint G v3 Legacy Collection asset swap — visual smoke 2026-04-29

PR: `feat/sprint-g-v3-legacy-asset-swap-2026-04-29`. Pre TKT-M11B-06 playtest userland.

## Context

Sprint Fase 1 task #3 (sequential post Action 5+7+ADR research). User feedback playtest informal 2026-04-28: _"griglia pre-2000 feel"_ + _"grafica vecchia"_. Sprint G v3 risolve gap visivo via Legacy Collection (Ansimuz CC0) selettivo subset + wire renderer.

## Subset estratto

Source: `~/Desktop/Legacy Collection.zip` (20MB user-provided, license CC0).
Tool: `tools/py/extract_legacy_subset.py` (filter idempotente, dry-run support).
Output: `apps/play/public/assets/legacy/` — 345 KB cumulativi (vs 20MB source = 1.7% slice).

**47 file PNG** organizzati in:

| Dir                      | Conta             | Use case                                                                                       |
| ------------------------ | ----------------- | ---------------------------------------------------------------------------------------------- |
| `creatures/<archetype>/` | 7 + 6 boss        | Battle Sprite per job (vanguard/skirmisher/warden/artificer/invoker/ranger/harvester + 3 boss) |
| `tiles/<bioma>/`         | 5 biomi × 1-3 PNG | Tileset bioma (savana/foresta_acida/caverna/tundra/town)                                       |
| `parallax/`              | 6 layer           | Sky/clouds/mountains/back per board bg drama                                                   |
| `vfx/<type>/`            | 8 VFX type        | hit (3 frame seq) + death (8 frame seq) + explosion/slash/fireball/electro/bolt (sheet)        |

Total budget: **0.34 MB** (massiccio under 20MB cap target).

## Asset wire summary

**G.2 — Tile bioma** (`apps/play/src/render.js`):

- `LEGACY_BIOMA_TILES` map (5 biomi → tileset path).
- `_loadLegacyTileset(bioma)` cache + onload notifier (Sprint F asset-loaded event).
- `resolveTileImg()` priorità Legacy → Sprint D procedural → null fallback.
- Crop deterministic via hash (gx,gy) % (cols×rows) per spread visivo senza flicker.
- `drawCell()` esteso supporta sia `HTMLImageElement` (Sprint D) sia `{img,sx,sy,sw,sh}` (Legacy crop) — drawImage 9-arg variant.

**G.3 — Creature sprite + Skiv override**:

- `LEGACY_CREATURE_PATHS` map (8 archetype → sheet PNG).
- `_loadLegacyCreatureSprite()` cache parallel a `_loadCreatureSprite` (Sprint E).
- `resolveCreatureSprite()` priorità Legacy → Sprint E → null. Static-frame ship (multi-frame anim deferred Sprint Q — sheet metadata non-uniforme richiede authoring custom).
- `_legacyFrameRect()` heuristic frame size = `min(naturalH, naturalW/round(naturalW/naturalH))` per crop top-left frame.
- **Skiv canonical override**: `species_id === 'dune_stalker'` → forza Sprint E LPC sprite, skip Legacy. Preserva identità narrativa stabile (ref `docs/skiv/CANONICAL.md`).
- 4 jobs orfani (warden/artificer/invoker/harvester) ora hanno Battle Sprite proprio invece di silhouette JOB_TO_ARCHETYPE fallback (Slime/Sentinel/Wizard/Mummy).

**G.4 — Parallax bg** (`apps/play/src/style.css`):

- 4-layer CSS `.board { background-image: url(sky/clouds/mountains/back) }` con `cover` + `repeat-x` cloud + posizioni stratificate.
- Animation `parallax-clouds 90s linear infinite` per slow drift cielo notturno.
- `prefers-reduced-motion` media query disabilita anim (a11y rispetto).
- Canvas opaque copre cell durante gameplay → parallax visibile su `.board` padding/sidebar gap (drama atmosfera senza interferire grid).

**G.5 — VFX wire** (`apps/play/src/anim.js` + `main.js`):

- `VFX_ATLAS` map 8 types con mode='sheet' (single PNG strip horizontal) o mode='sequence' (file per frame).
- `spawnVFX(type, gx, gy, options)` push entry in `vfxList` + pre-warm cache.
- `drawVFX(ctx, cellSize, gridH)` chiamato dopo drawRays in render loop. Frame index = `floor(elapsedMs/1000 * fps)` clamped.
- `hasActiveAnims()` extended con `vfxList.length > 0` → render loop continua finché VFX attivo.
- Wire `main.js handleDamageEvent`: `dmg > 0 → spawnVFX('hit', target.x, target.y)` + `dmg > 0 && target.hp - dmg <= 0 → spawnVFX('death', ...)`.

**G.6 — Credit + LICENSE**:

- `apps/play/index.html` footer: `<small class="credit-line">Pixel art: Luis Zuno (Ansimuz) — CC0 · UI: own SVG MIT</small>`.
- `apps/play/public/assets/legacy/LICENSE.txt` autogenerato dallo script con CC0 attribution + source URL.

## Smoke procedure

```bash
# 1. Estrazione (idempotente)
python tools/py/extract_legacy_subset.py "~/Desktop/Legacy Collection.zip"
# → "Copied: 47/47 files / Size: 235.4 KB"

# 2. Test regressione zero
node --test tests/ai/*.test.js
# → 382/382 verde

# 3. Format check
npx prettier --check apps/play/src/render.js apps/play/src/anim.js apps/play/src/main.js apps/play/src/style.css apps/play/index.html
# → All matched files use Prettier code style!

# 4. Schema lint
npm run schema:lint
# → All schemas passed structural validation.

# 5. Docs governance
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
# → errors=0 warnings=20 (warnings pre-esistenti, no nuovi)
```

## Visual delta atteso (pre/post)

**Pre Sprint G v3** (post Sprint F):

- Tile bioma: PNG procedurale Sprint D 32×32 generato Python (3 variant per bioma). Look "geometric pattern" non realistico.
- Creature: Sprint E procedurale single 32×32 RGBA per archetype + fallback shape geometric drawUnitBody (W8M).
- 4 jobs orfani (warden/artificer/invoker/harvester): silhouette comune per archetype simile (controller/healer/mage/skirmisher).
- BG canvas: solid `var(--cell)` color #1a1d24 plain.
- VFX: solo flash unit + popup + ray (no sprite-based).

**Post Sprint G v3**:

- Tile bioma: tileset reale Ansimuz pixel art per 5 biomi (savana=Top-Down-Forest, foresta_acida=HauntedForest, caverna=caverns-files-web, tundra=TinyRPG-Mountain, town=Top-Down-Town). Look 16-bit RPG canonico.
- Creature: spritesheet reale (Ogre/Frog/Slime/Sentinel/Wizard/Centaur/Mummy) per archetype + boss tier (Hell-Beast/Dragon/Ogre attack).
- 4 jobs orfani: visual identity dedicata per ogni job (Slime/Sentinel/Wizard/Mummy).
- BG board: parallax 4-layer (sky/clouds/mountains/back) drift slow.
- VFX: sprite-based hit (3 frame) + death (8 frame) + explosion/slash/fireball/electro/bolt anim su impact/death.
- Skiv (dune_stalker): preservato sprite LPC originale.

## Known limits + follow-up Sprint Q

1. **Multi-frame anim creature deferred**: spritesheet Legacy hanno layout non-uniformi per archetype (es. Ogre 640×128 5 frame square vs Frog 378×68 frames irregolari). Heuristic `_legacyFrameRect` ricava frame 0 statico = MVP visivo. Multi-frame anim per state (idle/walk/attack/hurt) richiede authoring metadata JSON per sheet → Sprint Q follow-up.
2. **Audio Kenney CC0 deferred**: zip user-provided contiene solo PNG, no audio. Step G.5b skipped — wire audio richiede pack separato Kenney + audio.js NEW (Sprint H candidate).
3. **Boss VFX sprite-only idle**: hell_beast_idle/breath + dragon_idle/breath + ogre_attack/walk extracted ma non wired automaticamente. Wire boss-specific spawnVFX su trigger ability disponibile Sprint Q.

## DoD checklist

- [x] Smoke test: extract idempotente verde 47/47 files, asset budget 0.34 MB << 20 MB cap.
- [x] Regression: `node --test tests/ai/*.test.js` 382/382 verde zero regression.
- [x] Format: `npx prettier --check apps/play/` verde all clean.
- [x] Schema lint: `npm run schema:lint` verde all schemas pass.
- [x] Docs governance: `python tools/check_docs_governance.py --strict` errors=0.
- [x] Asset budget ≤ 20 MB: 345 KB.
- [x] License compliance: `LICENSE.txt` (CC0 attribution + source URL Ansimuz) + footer credit-line visible.
- [x] Diff scope: solo `apps/play/{index.html,src/{render,anim,main,style}}` + `apps/play/public/assets/legacy/` + `tools/py/extract_legacy_subset.py` + `docs/playtest/2026-04-29-sprint-g-v3-screenshots.md`.
- [x] Skiv override preservato (LPC sprite per `dune_stalker`).
- [x] Commit lowercase prefix `feat(visual):`.

## Reference

- Master plan: `docs/planning/2026-04-28-master-execution-plan.md` §Sprint G v3.
- Asset strategy: `docs/planning/2026-04-28-asset-sourcing-strategy.md` §Tier 1 Legacy Collection.
- Skiv canonical override: `docs/skiv/CANONICAL.md`.
- Pillar P1 stato: 🟢++ post Sprint G v3 (visual + temporal legibility entrambi shipped post Action 7 #1998).
