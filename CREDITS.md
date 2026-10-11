# Credits — Evo-Tactics

> Attribution + provenance log per asset + software + community contribution. Canonical per compliance legal (US Copyright Office, EU AI Act, Steam AI disclosure policy). Aggiornato sprint M3.7.

## Team

- **Game design + code**: Master DD (solo-dev)
- **AI curator + pair programming**: Claude Code (Anthropic)

Pipeline collaborativa documentata in `docs/core/43-ASSET-SOURCING.md` + `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md`.

## Software stack

| Categoria        | Tool                | Licenza    | Uso                            |
| ---------------- | ------------------- | ---------- | ------------------------------ |
| Language runtime | Node.js ≥22         | MIT        | Backend express                |
| Language runtime | Python ≥3.10        | PSF        | CLI + validator + rules engine |
| Framework        | Express             | MIT        | REST API                       |
| Framework        | Prisma              | Apache-2.0 | ORM Postgres                   |
| Test runner      | Node.js test runner | MIT        | Backend tests                  |
| Test runner      | Pytest              | MIT        | Python tests                   |
| Test runner      | Playwright          | Apache-2.0 | E2E tests                      |
| Linter           | Prettier            | MIT        | Format                         |
| Validator        | AJV                 | MIT        | JSON Schema validation         |
| YAML parser      | PyYAML              | MIT        | Python YAML                    |
| YAML parser      | js-yaml             | MIT        | Node YAML                      |

## Asset attribution

### UI icons

#### Custom human-authored (© 2026 Master DD)

Shape geometrici semplici authored in SVG manuale (no AI, no community derivative). Palette derivata da `docs/core/42-STYLE-GUIDE-UI.md`. License: MIT (stesso del repo).

| Asset           | Path                                 | Shape           | Color token              | Uso                     |
| --------------- | ------------------------------------ | --------------- | ------------------------ | ----------------------- |
| faction_player  | `data/art/icons/faction_player.svg`  | Triangolo       | `#4a8ad4` player blue    | Outline unit player     |
| faction_sistema | `data/art/icons/faction_sistema.svg` | Rombo           | `#d44a4a` sistema red    | Outline unit sistema    |
| faction_neutral | `data/art/icons/faction_neutral.svg` | Esagono         | `#e8c040` neutral yellow | Outline NPC reclutabile |
| action_attack   | `data/art/icons/action_attack.svg`   | Slash diagonale | `#d44a4a` sistema red    | Attack action button    |
| action_move     | `data/art/icons/action_move.svg`     | Freccia destra  | `#40d4a8` path cyan      | Move action button      |
| action_skip     | `data/art/icons/action_skip.svg`     | Pause 2-bar     | `#6a6e78` neutral gray   | Skip/end-turn button    |
| status_stunned  | `data/art/icons/status_stunned.svg`  | Fulmine         | `#d4884a` debuff orange  | Status icon sopra unit  |

Totale: **7 icon** committed 2026-04-18 sprint M3.9 (first real assets, Flint kill-60 enforcement).

#### Community sources (TBD quando usati)

- **Lucide** (ISC / MIT-like) — https://lucide.dev — base UI generic
- **Game-icons.net** (CC-BY 3.0) — https://game-icons.net — ability/status tactical (attribution obbligatoria per-icon)
- **Heroicons** (MIT) — https://heroicons.com — fallback UI

### Typography

- **Inter** (OFL) — https://fonts.google.com/specimen/Inter — UI primary
- **Noto Sans** (OFL) — https://fonts.google.com/noto/specimen/Noto+Sans — fallback multilingua
- **Press Start 2P** (OFL) — https://fonts.google.com/specimen/Press+Start+2P — pixel header (titoli only)

### Tileset (procedural Python — © 2026 Master DD)

Custom algorithm human-authored via `tools/py/art/generate_tile.py`. Palette locked a sub-palette bioma da `docs/core/41-ART-DIRECTION.md`. Licenza: MIT (stesso del repo). Zero AI, zero community derivative. Deterministic RNG hash-based → output riproducibile.

| Asset                            | Path                                                 | Pattern                  | Biome palette               |
| -------------------------------- | ---------------------------------------------------- | ------------------------ | --------------------------- |
| savana/grass_01.png              | `data/art/tilesets/savana/grass_01.png`              | grass tufts + dirt       | ocra + verde secco          |
| caverna_sotterranea/stone_01.png | `data/art/tilesets/caverna_sotterranea/stone_01.png` | cracks + bioluminescenza | basalto + cyan              |
| foresta_acida/moss_01.png        | `data/art/tilesets/foresta_acida/moss_01.png`        | moss + spore accent      | verde veleno + giallo spore |

Totale: **3 tile procedurali** committed 2026-04-18 sprint M3.10 (first real tileset).

Genera nuovo: `python3 tools/py/art/generate_tile.py --biome <b> --variant <grass|stone|moss>`.

### Tileset + sprite (community CC0)

- **Kenney.nl** (CC0) — https://kenney.nl/assets
  - _[to be populated con pack specifici usati per bioma]_
- **OpenGameArt.org** — https://opengameart.org
  - _[list contributors + license per asset singolo]_
- **Buch** (OGA, CC0) — https://opengameart.org/users/buch
- **Surt** (OGA, CC0 mostly) — https://opengameart.org/users/surt
- **PixelFrog** (itch, CC0 per free pack) — https://pixelfrog-assets.itch.io

### Tileset + sprite (itch.io CUSTOM)

- **ansimuz** (CUSTOM) — https://ansimuz.itch.io
  - _[asset specifici + license check per ognuno]_

## AI-Generated Content Disclosure

Questo prodotto include asset visivi generati parzialmente con strumenti di AI image synthesis. Tutti gli output AI sono stati successivamente **editati, composti e rifiniti manualmente** da curator umano usando Libresprite (GPL), garantendo un human authorship layer significativo.

### Pipeline AI (documentazione compliance)

1. **Generazione iniziale** via AI tool approvato (vedi lista sotto)
2. **Palette lock** a palette master Evo-Tactics (32 colori indexed)
3. **Libresprite cleanup manuale**: ridisegno edge, rimozione artifact AI, refinement pixel
4. **Compositional decision**: placement, tile boundary, integer alignment
5. **Provenance log**: entry in questo file con tool + prompt + data

### Tool AI usati

_[to be populated quando asset AI generati + integrati]_

| Asset ID      | Tool            | Prompt summary                   | Data generazione | Post-edit hours |
| ------------- | --------------- | -------------------------------- | ---------------- | :-------------: |
| _placeholder_ | Retro Diffusion | "savana tile pixel art 32x32..." | YYYY-MM-DD       |      \_N_h      |

### Ethical commitments

- ❌ **NO style replication**: nessun output AI usato che imiti lo stile di artisti viventi identificati
- ❌ **NO training data concerns**: tool approvati hanno training data licensed o claim etico (vedi `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md §Tool approvati`)
- ✅ **Human authorship layer**: ogni asset AI ha editing manuale documentato
- ✅ **Disclosure compliant**: Steam AI policy (Jan 2024), EU AI Act (Ago 2024-2025)

### Tool approvati per AI generation

| Tool                                                            | Uso                     |                    License output commerciale                     |
| --------------------------------------------------------------- | ----------------------- | :---------------------------------------------------------------: |
| **Retro Diffusion** (https://www.retrodiffusion.ai)             | Primary pixel-art 32×32 | Premium $10-25/mo commercial + no watermark (verified 2026-04-18) |
| **Adobe Firefly** (https://www.adobe.com/products/firefly.html) | Fallback non-pixel      |                       Indemnification Adobe                       |
| **Stable Diffusion XL + LoRA local** (https://stability.ai)     | Custom offline          |                       Open model + LoRA CC0                       |
| **Flux Pro** (https://blackforestlabs.ai)                       | Alta qualità non-pixel  |                     Licenza commercial chiara                     |

**NON USATI**: Midjourney (default), PixelLab.ai (training undisclosed), Suno/Udio (audio, lawsuits pending).

## Music + SFX

_Audio direction deferred post-MVP (ADR-2026-04-18-audio-direction-placeholder DRAFT). Placeholder: silent backend._

Quando attivo, stack pianificato:

- **freesound.org** (CC0/CC-BY) — https://freesound.org
- **OpenGameArt audio** (CC0/CC-BY) — https://opengameart.org/art-search?field_art_type_tid[]=13
- **Incompetech (Kevin MacLeod)** (CC-BY 4.0) — https://incompetech.com
- **Bfxr/sfxr/Chiptone** (free tools) — generator SFX retro

## External libraries + services

### Documentation

- **Markdown**: CommonMark
- **Frontmatter**: YAML
- **Schema validation**: JSON Schema Draft 2020-12 via AJV
- **Docs governance**: `tools/check_docs_governance.py` (custom)

### Game engine foundation

- **Express** (MIT): HTTP server
- **roundOrchestrator** (custom, workstream combat)
- **resolver.py** (custom d20 rules engine)
- **reinforcementSpawner.js + objectiveEvaluator.js** (custom, ADR-2026-04-19 + 04-20)

## Inspirations (reference only, no derivative use)

Evo-Tactics design si ispira concettualmente a (nessun asset o codice copiato):

- **Final Fantasy Tactics** — Pilastro 1 "tattica leggibile"
- **Spore** — Pilastro 2 "evoluzione emergente"
- **Slay the Spire**, **Into the Breach**, **Wildermyth**, **Don't Starve**, **AncientBeast** — art direction reference (vedi `docs/core/41-ART-DIRECTION.md`)
- **AI War**, **Fallout Tactics** — AI + level design patterns

## Legal notices

- **Copyright**: © 2026 Master DD. Asset licenza per asset (vedi sezioni sopra). Codice game engine: vedi `LICENSE` (TBD).
- **AI disclosure US**: US Copyright Office AI Guidance compliant (Marzo 2023 + update 2024-2025).
- **AI disclosure EU**: EU AI Act compliant (Agosto 2024, provisioni generative Agosto 2025).
- **Steam submission**: "Contains AI-generated content" will be checked + descrizione workflow quando pubblicato.
- **itch.io / other platforms**: AI disclosure shown in game description + in-game credits.

## Verifica periodica

Questo file deve essere aggiornato:

1. **Ad ogni asset aggiunto** (attribution + provenance log)
2. **Ogni 90 giorni** — verifica licenze community + ToS AI SaaS
3. **Prima di ogni release publica** — audit completo compliance

Ultimo aggiornamento: **2026-04-18** (sprint M3.7).

## Contact

Per questions su attribution o report copyright violation: _[contact TBD]_.
