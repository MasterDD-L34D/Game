---
title: 43 — Asset Sourcing canonical (zero-cost + AI pipeline)
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-18
source_of_truth: true
language: it
review_cycle_days: 90
related:
  - 'docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md'
  - 'docs/adr/ADR-2026-04-18-art-direction-placeholder.md'
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
---

# 43 — Asset Sourcing canonical

> Pipeline zero-cost per asset art + audio Evo-Tactics. Implementa ADR-2026-04-18 zero-cost-asset-policy. Team = solo-dev + AI curator, no budget, MVP-first per attrarre investitori.

## Strategia riassunto

**70% Foundation** = community CC0 + MIT (Kenney, OpenGameArt, Lucide, Game-icons)
**30% Gap-fill** = AI-generated + human authorship layer obbligatorio (Retro Diffusion + Libresprite)
**Fallback**: user hands-on pixel art (Libresprite/Piskel free) per custom niche

## Libraries matrix (community asset)

### Art foundation

| #   | Fonte                      | URL                                            | Licenza                             | Volume                | Attribution | Uso Evo-Tactics                            |
| --- | -------------------------- | ---------------------------------------------- | ----------------------------------- | --------------------- | :---------: | ------------------------------------------ |
| 1   | **Kenney.nl**              | https://kenney.nl/assets                       | CC0                                 | 40k+ asset, 180+ pack |     No      | Tileset base savana/caverna, UI generic    |
| 2   | **OpenGameArt.org**        | https://opengameart.org                        | CC0/CC-BY/CC-BY-SA (filter per CC0) | 50k+                  |    Varia    | Tutti biomi, filter CC0 prima              |
| 3   | **itch.io free pixel-art** | https://itch.io/game-assets/free/tag-pixel-art | Varia (CUSTOM)                      | migliaia              |  Spesso sì  | Niche biomi, verifica licenza singolo pack |
| 4   | **Lucide**                 | https://lucide.dev                             | ISC/MIT-like                        | 1500+ icon            |     No      | UI primary (menu, buttons, toggle)         |
| 5   | **Game-icons.net**         | https://game-icons.net                         | CC-BY 3.0                           | 4000+ icon            |   **Sì**    | Ability/status/combat (tactical fit)       |
| 6   | **Heroicons**              | https://heroicons.com                          | MIT                                 | 300+ icon             |     No      | UI fallback                                |
| 7   | **Google Fonts**           | https://fonts.google.com                       | OFL                                 | 1500+ font            |     No      | Inter, Noto Sans, Press Start 2P           |
| 8   | **Buch (OGA)**             | https://opengameart.org/users/buch             | CC0                                 | prolific              |     No      | Foresta, caverna tileset                   |
| 9   | **Surt (OGA)**             | https://opengameart.org/users/surt             | CC0 mostly                          | 100+ pack             |     No      | Dungeon/rovine                             |
| 10  | **PixelFrog (itch)**       | https://pixelfrog-assets.itch.io               | CC0 per free pack                   | ~20 pack              |     No      | Caverna/platformer                         |
| 11  | **ansimuz (itch)**         | https://ansimuz.itch.io                        | CUSTOM free + paid                  | ~30 pack              |    Varia    | Foresta, misc backgrounds                  |
| 12  | **ambientCG**              | https://ambientcg.com                          | CC0                                 | textures HD           |     No      | Texture source (post-process to pixel)     |

### Art BANNED (reference only)

- ❌ **LPC (Liberated Pixel Cup)** — CC-BY-SA 3.0 viral, contamina progetto commerciale
- ❌ **Spriters Resource** — fan-ripped, NO uso commerciale
- ❌ **Pixel Joint community gallery** — per-artist copyright default

## AI-generated pipeline (gap-fill)

### Tool approvati

| Tool                                 | URL                                         | Uso                     |                      Licenza output commerciale                       |          Fit 32×32 pixel           |
| ------------------------------------ | ------------------------------------------- | ----------------------- | :-------------------------------------------------------------------: | :--------------------------------: |
| **Retro Diffusion**                  | https://www.retrodiffusion.ai               | Primary pixel-art 32×32 | ✅ Premium $10-25/mo (commercial + no watermark, verified 2026-04-18) |             ⭐⭐⭐⭐⭐             |
| **Adobe Firefly**                    | https://www.adobe.com/products/firefly.html | Legal-safe fallback     |                      ✅ (indemnification Adobe)                       |       ⭐⭐ (no pixel native)       |
| **Stable Diffusion XL + LoRA local** | https://stability.ai + https://civitai.com  | Custom offline          |                 ✅ (open model) + LoRA CC0 verificare                 | ⭐⭐⭐⭐ (con LoRA "pixel-art-xl") |
| **Flux Pro**                         | https://blackforestlabs.ai                  | Alta qualità non-pixel  |                          ✅ (licenza chiara)                          |                ⭐⭐                |

### Tool NON usabili (senza review esplicita)

- **Midjourney**: LAION contested, no indemnification default
- **DALL-E 3**: OK generic ma no pixel native
- **PixelLab.ai**: training data undisclosed
- **Suno / Udio**: RIAA lawsuits 2024 pending → rinvia audio post-MVP

### Prompt template pixel art 32×32

```
[subject], pixel art, 32x32, limited palette 16 colors,
naturalistic biology, organic tactical game sprite,
top-down 3/4 view, clean outlines, no anti-aliasing,
retro aesthetic, stylized pixel
```

**DIVIETI** (hardcoded nel workflow):

- ❌ "in the style of [nome artista]"
- ❌ reference artista vivente
- ❌ scraped reference non-PD

**ACCETTATI**:

- ✅ "inspired by [genre/era]" (es. "inspired by 90s JRPG pixel art")
- ✅ "retro pixel aesthetic"
- ✅ "limited palette 16 colors"

### Human authorship layer (OBBLIGATORIO)

Ogni AI output DEVE passare:

1. **Palette lock** a palette master Evo-Tactics (32 colori indexed)
2. **Aseprite/Libresprite cleanup**: ridisegno edge, rimozione artifact AI, refinement pixel manuale
3. **Compositional decision**: placement, tile boundary, integer alignment
4. **Provenance log**: entry in `CREDITS.md` con tool + prompt + data generazione + hash output originale

Senza questi step, asset NON è committable. Human layer = prova authorship per copyright defense.

## Palette master Evo-Tactics

TODO canonicizzare file `data/art/palette_master.png` (32 colori indexed) + sub-palette per bioma.

Base master derivata da 41-ART-DIRECTION.md §Palette matrix 9 biomi shipping:

### Colori funzionali universali (10, da 42-SG)

- `#4a8ad4` player blue
- `#d44a4a` sistema red
- `#e8c040` neutral yellow
- `#f0f0f4` selection white
- `#40d4a8` path cyan
- `#4ad488` buff green
- `#d4884a` debuff orange
- `#f0d040` crit yellow
- `#88d444` heal green
- `#d44a4a80` AoE semi-trasparente

### Sub-palette per bioma (da 41-AD)

- **savana**: `#b8935a` + `#8b6b3d` + `#6e7a3f` + `#e8d5a8`
- **caverna_sotterranea**: `#3d3d42` + `#4a5e3d` + `#40c8d4`
- **foresta_acida**: `#5a7a3a` + `#3d2a15` + `#c4a628`
- **foresta_miceliale**: `#6b4a7a` + `#e8e0d4` + `#c87a9a`
- **rovine_planari**: `#5e5a52` + `#b8935a` + `#4a6a8a`
- **frattura_abissale_sinaptica**: `#0d1e3d` + `#40d4e8` + `#3d1e5a`
- **reef_luminescente**: `#1e6a7a` + `#e8a8c4` + `#f0e040`
- **abisso_vulcanico**: `#c83a1e` + `#1e1e22` + `#f06a28`
- **steppe_algoritmiche**: `#6a6e78` + `#40c860` + `#f0f0f4`

Totale palette master: ~32-40 colori. File canonico `data/art/palette_master.ase` (Aseprite format) da generare manualmente user + commit.

## Tool editing free

| Tool                         | URL                           | Uso                                | Licenza                       |
| ---------------------------- | ----------------------------- | ---------------------------------- | ----------------------------- |
| **Libresprite**              | https://libresprite.github.io | Aseprite fork desktop              | GPL                           |
| **Piskel**                   | https://www.piskelapp.com     | Pixel editor online                | Free                          |
| **Aseprite** (opzionale $20) | https://www.aseprite.org      | Pixel pro editor                   | Paid or build from source GPL |
| **Krita**                    | https://krita.org             | Paint/pixel open source            | GPL                           |
| **GIMP**                     | https://www.gimp.org          | Image processing                   | GPL                           |
| **ImageMagick**              | https://imagemagick.org       | CLI batch palette lock             | Apache-like                   |
| **upscayl**                  | https://upscayl.org           | AI upscale (solo integer 2x/3x/4x) | MIT                           |

### Batch palette lock (CLI)

```bash
# Convert PNG to indexed palette via ImageMagick
convert input.png -dither None -remap palette_master.png output.png

# Batch lock all PNGs in a directory
for f in ./raw/*.png; do
  convert "$f" -dither None -remap palette_master.png "./locked/$(basename $f)"
done
```

## Roadmap asset acquisition 9 biomi + 20 icon

Priorità MVP slice (**stimati 25h solo-dev + AI**):

|   P    | Item                                        | Fonte                                   | Tempo | Blocker                       |
| :----: | ------------------------------------------- | --------------------------------------- | :---: | ----------------------------- |
| **P0** | Palette master 32 colori Evo-Tactics `.ase` | User manuale                            |  3h   | Style canonical docs ready ✅ |
| **P0** | UI icon 20+ ability/status                  | Game-icons.net (CC-BY)                  |  2h   | Attribution in CREDITS.md     |
| **P1** | Savana tileset 32×32                        | Kenney "Roguelike/RPG Pack" + OGA Buch  |  2h   | -                             |
| **P1** | Caverna_sotterranea tileset                 | Kenney + PixelFrog (CC0)                |  2h   | -                             |
| **P1** | Foresta_acida tileset                       | OGA "toxic forest" + AI gap-fill        |  4h   | Palette lock                  |
| **P2** | Foresta_miceliale tileset                   | AI (Retro Diffusion) + Libresprite edit |  6h   | Prompt iter                   |
| **P2** | Rovine_planari tileset                      | Szadi (verifica CUSTOM) + OGA + AI      |  4h   | License check                 |
| **P2** | Reef_luminescente tileset                   | AI primary (niche)                      |  8h   | Coerenza palette subacqua     |
| **P3** | Frattura_abissale_sinaptica                 | AI full custom                          |  10h  | Originality proof             |
| **P3** | Abisso_vulcanico tileset                    | OGA lava + AI magma fx                  |  6h   | -                             |
| **P3** | Steppe_algoritmiche                         | AI full sci-fi glitch                   |  10h  | Concept art prima             |
| **P4** | Enemy sprite set per bioma                  | AI + Libresprite                        | 20h+  | Post tileset done             |
| **P4** | Player character sprite 4 specie            | AI + Libresprite (NO LPC)               | 15h+  | Silhouette language da 41-AD  |

**MVP slice (P0+P1+20 icon)**: ~14h
**Full 9 biomi + sprite**: ~100h

### Blocker principali

1. **SaaS lock-in Retro Diffusion**: verifica ToS current before commit batch
2. **Coerenza palette AI**: iter manuale palette lock ~30% budget tempo
3. **Originality proof biomi custom** (frattura/steppe): documenta workflow in `CREDITS.md` per future dispute

## Audio stub (deferred)

Audio direction = GDD gap #3, ADR-2026-04-18-audio-direction-placeholder DRAFT, deferred post-MVP.

Risorse gratuite primarie quando sblocca:

| Fonte                       | URL                                                        | Licenza          | Uso                        |
| --------------------------- | ---------------------------------------------------------- | ---------------- | -------------------------- |
| freesound.org               | https://freesound.org                                      | CC0/CC-BY mix    | SFX foundation             |
| OpenGameArt audio           | https://opengameart.org/art-search?field_art_type_tid[]=13 | CC0 + CC-BY      | Music + SFX                |
| Zapsplat                    | https://zapsplat.com                                       | CUSTOM free tier | SFX (attribution required) |
| Incompetech (Kevin MacLeod) | https://incompetech.com                                    | CC-BY 4.0        | Music                      |

**AI audio tool** (post RIAA lawsuits resolution): Suno, Udio — **deferred**, review 2026-2027.

**Generator SFX retro free**: Bfxr (http://www.bfxr.net), sfxr (http://drpetter.se/project_sfxr.html), Chiptone (https://sfbgames.itch.io/chiptone)

**Music chiptune online**: Beepbox (https://www.beepbox.co) — free, output licenziabile.

## Disclaimer template (ready-to-use)

Vedi `CREDITS.md` + `README.md` per template canonico.

### README excerpt

```markdown
## Asset Attribution & AI Disclosure

### Attribution

- UI icons from Game-icons.net (CC-BY 3.0): [list authors in CREDITS.md]
- Base tileset from Kenney.nl (CC0)
- Additional community assets from OpenGameArt.org — see CREDITS.md

### AI-Generated Content Disclosure

Some visual assets generated using AI image synthesis tools
(Retro Diffusion / Stable Diffusion + pixel-art LoRA) and subsequently
edited, composited, and refined by human artists using Libresprite.
All AI-generated outputs received significant human authorship contribution
(palette application, manual cleanup, compositional decisions) prior to
inclusion. No AI-generated output depicting or replicating the style of
specific living artists was used.

AI tools: Retro Diffusion (https://www.retrodiffusion.ai) Premium tier
($10-25/mo), terms of service permit commercial use + no watermark
(verified 2026-04-18). Training data: licensed assets from Astropulse +
other pixel artists with consent (ethical claim per company statement).
```

### Steam store submission (quando pubblicato)

- Spunta "Contains AI-generated content" ✓
- Descrivi in store page: "Visual assets combine community-licensed CC0/MIT resources with AI-generated elements refined through human pixel-art editing. Full attribution in in-game credits."

## Verifica periodica

Review ogni **90 giorni** (last_verified frontmatter):

1. **ToS SaaS tool** (Retro Diffusion, Firefly): licensing output commerciale
2. **Legal landscape**: US Copyright Office + EU AI Act update
3. **Platform policies**: Steam, itch.io, Epic AI disclosure
4. **Community libraries**: link rot, license change
5. **RIAA lawsuits** (Suno/Udio): outcome per unblock audio AI

Log verifica in `reports/asset_sourcing_audit_YYYY-MM-DD.md` se review rivela change.

## Riferimenti

- `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md` — policy canonica
- `docs/adr/ADR-2026-04-18-art-direction-placeholder.md` — direction canonical
- `docs/core/41-ART-DIRECTION.md` — palette matrix + silhouette language
- `docs/core/42-STYLE-GUIDE-UI.md` — design tokens UI + icon spec
- US Copyright Office AI Guidance: https://www.copyright.gov/ai/
- EU AI Act: https://artificialintelligenceact.eu
- Steam AI Disclosure Policy (Jan 2024): https://store.steampowered.com
