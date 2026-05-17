---
title: 2026-04-28 Visual upgrade verification — Sprint A→D
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-04-28
language: it
review_cycle_days: 30
related:
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/adr/ADR-2026-04-18-art-direction-placeholder.md'
---

# Visual upgrade verification — Sprint A→D — 2026-04-28

## Context

User feedback diretto: _"sembra più un'app per telefono o un sito Flash che un Gioco"_. Audit convergente da 3 agent paralleli (Explore + repo-archaeologist + ui-design-illuminator) ha confermato: direzione artistica già canonicizzata (ADR 2026-04-18 ACCEPTED) ma esecuzione zero su asset reali (`tileImg = null` hardcoded, portrait MBTI emoji fallback, font Inter generic, no border-image, no atmospheric layer).

Plan eseguito: 4 sprint progressive ROI-ordered (~14h totali). Tutto wirato su `apps/play/` (production canonical), zero touch a `docs/mission-console/` (pre-built bundle READONLY) o backend/schema.

## Sprint A — Font + palette tactical

**Wire**: `apps/play/index.html` Google Fonts link + `apps/play/src/style.css` `:root` + body + h1/h2 override.

**Verifica DOM** (preview server `http://localhost:5180` via `preview_eval`):

| Property            | Pre-Sprint                                | Post-Sprint A                                       |
| ------------------- | ----------------------------------------- | --------------------------------------------------- |
| `h1.fontFamily`     | `Inter, Noto Sans, system-ui, ...`        | `Cinzel, "Trajan Pro", Georgia, serif`              |
| `h1.color`          | `#e8e8e8` (default fg)                    | `rgb(176, 163, 106)` = `#b0a36a` (grim-accent-gold) |
| `body.fontFamily`   | `Inter, Noto Sans, system-ui, sans-serif` | `"IM Fell English", Georgia, Cambria, serif`        |
| `text-transform` h1 | none                                      | `uppercase` (Cinzel maiuscole tracking)             |

**Asset CDN**: Google Fonts v2 link aggiunge Cinzel (400/600/700/900) + IM Fell English (regular + italic) + VT323 + preserve Inter/Noto fallback. Graceful degradation se CDN down.

## Sprint B — Border-image SVG frame + scanline + vignette

**Wire**:

- `apps/play/public/assets/ui/panel-frame.svg` (96×96, 9-slice, parchment+gold ornament, MIT own asset)
- `apps/play/src/style.css` `.tactical-frame` + `.scanline-overlay::before` (scanline 2px-on/2px-off opacity 0.12) + `.scanline-overlay::after` (vignette radial 55%→95% transparent→0.45 alpha)
- `apps/play/index.html` classi applicate a `#app.scanline-overlay`, `header.tactical-frame`, `aside.sidebar.tactical-frame`, `.feedback-card.tactical-frame`, `.endgame-card.tactical-frame`

**Verifica DOM**:

| Property                                     | Post-Sprint B                                               |
| -------------------------------------------- | ----------------------------------------------------------- |
| `#app.classList` contains `scanline-overlay` | `true`                                                      |
| `header.classList` contains `tactical-frame` | `true`                                                      |
| `header.borderImage`                         | `url("/assets/ui/panel-frame.svg") 32 fill / 1 / 0 stretch` |
| `fetch('/assets/ui/panel-frame.svg').status` | `200`                                                       |

**Effetto**: header HUD da `<div>` flat a frame parchment con corner ornament + ring gold. Scanline overlay CRT su intero viewport. Vignette radiale focus visivo su grid combat.

## Sprint C — SVG icon set + pixel rendering

**Wire**:

- 8 SVG icon procedurali in `apps/play/public/assets/icons/`: sword, shield, arrow, heal, move, fang, eye, spark (MIT own asset)
- `apps/play/src/style.css` rule globale `image-rendering: pixelated; crisp-edges; nearest-neighbor` su `canvas, img.sprite, .sprite-pixel`

**Verifica DOM**:

| Property                                  | Post-Sprint C |
| ----------------------------------------- | ------------- |
| `fetch('/assets/icons/sword.svg').status` | `200`         |
| Canvas `image-rendering` computed         | `pixelated`   |

**Effetto**: nessun bilinear blur su tile 32×32 ingranditi via CSS. Icon set pronto per swap label testo button (deferred a sprint integration successivo — surface attuale già usa Lucide-style SVG inline).

## Sprint D — Tile bioma + portrait MBTI

**Asset generati** via `tools/py/generate_visual_assets.py` (Python PIL procedural):

- 27 PNG tile (9 biomi × 3 varianti seed-stable) in `apps/play/public/assets/tiles/<bioma>/tile_<0..2>.png`
- 16 PNG portrait MBTI 64×64 (frame + inner ring + 4-letter label) in `apps/play/public/assets/portraits/<MBTI>.png`

**Wire runtime** in `apps/play/src/render.js`:

- `_loadTile(bioma, variant)` con cache module-scope (Map<key, HTMLImageElement|null>)
- `resolveTileImg(biomaId, gx, gy)` con hash xy → variant deterministico
- `render()` linea ~1099: rimosso `const tileImg = null` hardcoded → `const tileImg = resolveTileImg(biomaId, gx, yPx)`
- Back-compat preservato: missing asset → null → drawCell checkered fallback (zero rotture)

**Verifica DOM**:

| Property                                          | Post-Sprint D |
| ------------------------------------------------- | ------------- |
| `fetch('/assets/tiles/savana/tile_0.png').status` | `200`         |
| `fetch('/assets/portraits/INTJ.png').status`      | `200`         |
| Tutte 9 biome dirs popolate                       | `true`        |
| Tutte 16 MBTI portraits presenti                  | `true`        |

**Effetto runtime**: quando `state.encounter.biome_id` matcha una bioma pop ("savana", "caverna", "foresta_acida", etc.), grid combat smette di essere rettangolo Canvas piatto e mostra texture per-cell. Variante stabile per coord (no flicker su re-render).

## Test regression

```
$ node --test tests/ai/*.test.js
ℹ tests 382
ℹ pass 382
ℹ fail 0
ℹ duration_ms 392.0745
```

**Zero regression**. Cambio è additive-only (CSS vars + asset + helper resolveTileImg con fallback null preservato).

## Format check

```
$ npx prettier --check apps/play/src/style.css apps/play/src/render.js apps/play/index.html docs/core/42-STYLE-GUIDE-UI.md
All matched files use Prettier code style!
```

## Anti-pattern guards in place

- ❌ NON applicate scanline opacity >0.25 (corrente: 0.12, well under WCAG threshold)
- ❌ NON usato Press Start 2P body (Cinzel display tier only, IM Fell body)
- ❌ NON toccato `docs/mission-console/` (READONLY pre-built Vue bundle)
- ❌ NON aggiunte npm deps (vincolo CLAUDE.md)
- ❌ NON re-inventata direzione artistica: ADR-2026-04-18 ACCEPTED rispettato (palette grim-\* tokens additive, font v2 esplicitato come override v1 fallback-graceful)

## File modificati

| File                                                                                           | Sprint | Δ                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------- | :----: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [apps/play/index.html](../../apps/play/index.html)                                             |  A+B   | Google Fonts link tactical + classi `scanline-overlay` `tactical-frame`                                                                               |
| [apps/play/src/style.css](../../apps/play/src/style.css)                                       | A+B+C  | `:root` font tokens + GRIMDARK palette + body override + h1 Cinzel + `.tactical-frame` + `.scanline-overlay::before/::after` + `image-rendering` rule |
| [apps/play/src/render.js](../../apps/play/src/render.js)                                       |   D    | `resolveTileImg()` helper + cache + wire in `render()`                                                                                                |
| [apps/play/public/assets/ui/panel-frame.svg](../../apps/play/public/assets/ui/panel-frame.svg) |   B    | nuovo asset MIT (96×96 9-slice parchment+gold)                                                                                                        |
| [apps/play/public/assets/icons/](../../apps/play/public/assets/icons/)                         |   C    | 8 SVG icon (sword/shield/arrow/heal/move/fang/eye/spark)                                                                                              |
| [apps/play/public/assets/tiles/](../../apps/play/public/assets/tiles/)                         |   D    | 27 PNG (9 biomi × 3 varianti)                                                                                                                         |
| [apps/play/public/assets/portraits/](../../apps/play/public/assets/portraits/)                 |   D    | 16 PNG MBTI placeholder                                                                                                                               |
| [tools/py/generate_visual_assets.py](../../tools/py/generate_visual_assets.py)                 |   D    | nuovo script (~150 LOC, deterministic seed)                                                                                                           |
| [docs/core/42-STYLE-GUIDE-UI.md](../core/42-STYLE-GUIDE-UI.md)                                 |   A    | append §Typography v2 tactical (Cinzel/IM Fell/VT323)                                                                                                 |

## Next steps possibili (post-merge)

- **Sprint E** (deferred speculativo): PixiJS isometric board spike (~8h) — solo se feedback "ancora flat" post Sprint A-D
- **Wildermyth layered portrait** (museum card score 4/5, ~15h) — depend playtest feedback
- **`aspect_token` schema** per mutation visual tier-up (TKT-MUTATION-P6-VISUAL, ~2h) — ticket separato
- **Swap procedural tile → Kenney Roguelike RPG Pack** (CC0, ~2h download+wire) — quando user ok con direzione
- **Swap procedural icon → game-icons.net** (CC-BY 3.0 + footer attrib, ~1h) — quando user ok con direzione

## User acceptance gate

Aprire `http://localhost:5180/` (o equivalente production). Confronto pre/post:

- **Pre**: Inter sans corporate webapp, panel `<div>` flat dark mode, grid Excel-like, header generico
- **Post**: Cinzel Roman gold maiuscole header, IM Fell English serif body manuscript, panel parchment+gold ornamental frame, scanline CRT overlay, vignette radial focus, tile bioma texture procedural, atmosfera tactical RPG

Domanda gate: _"ancora app telefono?"_. Se NO → plan worked. Se SÌ → escalate a Sprint E.
