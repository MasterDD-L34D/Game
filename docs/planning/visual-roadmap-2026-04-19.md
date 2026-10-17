---
title: Visual roadmap 2026-04-19 — Wave 8→13 progressive + W2-W7 review post-visual
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-19'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/planning/visual-research-2026-04-19.md'
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/core/43-ASSET-SOURCING.md'
---

# Visual roadmap 2026-04-19 — Wave 8→13 + Wave 2-7 review

Roadmap completa post visual research 2026-04-19. Obiettivo: 100% visual base prima di review mechanics Wave 2-7.

## Stack corrente

7 PR stack gameplay/HUD aperti (Wave 2→7 meccanica). Wave 8 = visual base primo layer.

## Wave 8 — Typography + Status SVG icons (SHIPPED PR #XXXX)

**Scope**: CSS-only overhaul typography + status SVG icons. Preserva Wave 2-7.

| Change                            | Effect                                              |
| --------------------------------- | --------------------------------------------------- |
| Google Fonts Inter + Noto Sans    | TV-first readability                                |
| html base 16px + h1 1.6rem (26px) | Headlines visible @ 3m                              |
| font-family monospace → Inter     | Titoli/label leggibili                              |
| `.mono` class per code/numeric    | HP/AP bars + event log preservati                   |
| 10 status SVG inline icons        | No more text-only, WCAG colorblind compliant, ≥14px |
| status-chip 0.82rem + flex align  | Icon+label readable                                 |

Gap chiusi: **Typography High severity** + **Status icons Med severity**.

Preservato 100%: Wave 2-7 (HUD cosmetic + range overlay + FX trigger + round feedback + per-PG HUD + planning preview).

## Wave 9 — HTML moodboard + palette master file

**Scope**: 4h. HTML static page `docs/visual/moodboard/index.html` con:

- 3 screenshot annotati (Into the Breach, AncientBeast, Wargroove) — fair use research
- Overlay Evo-Tactics palette su ITB grid
- Proof-of-concept: 9 biome palettes × 4 color HEX swatch
- Proof-of-concept: 10 functional colors (ally/enemy/neutral/select/AoE/path/buff/debuff/status-pos/status-neg) swatch

**Master palette file**: `data/art/palette/palette_master.ase` (Aseprite format) o `.pal` (GIMP) — palette-lock per asset generation cross-biome.

**Deliverable**: visual PoC palette matrix works on Into the Breach grid layout. Offline moodboard per art decisioni future.

Preservato: Wave 2-8. No code impact (docs/visual/ folder nuovo, zero apps/ touch).

## Wave 10 — 7 creature silhouette placeholder

**Scope**: 6h. 7 job silhouette SVG (32×32 upscaled 3x) in `data/art/creatures/silhouette/`:

- vanguard (body-shield posture)
- skirmisher (lean darting)
- scout (crouched alert)
- sniper (elongated ranged)
- healer (softer rounded)
- controller (ornate asymmetric)
- boss (scaled +50% + distinctive horns/spikes)

Fonte: hand-sketch OR AI silhouette (Retro Diffusion pipeline ADR-2026-04-18 zero-cost).

Wire: render.js drawUnit → usa SVG path per job quando disponibile, fallback a current circle+job color.

**Deliverable**: canvas mostra silhouette forma per job (ancora palette-based, no creature art specie). Gap critical "unit silhouettes" → PARTIAL CLOSED.

Preservato: Wave 2-9 + circle fallback logic.

## Wave 11 — Tileset biome 9 palettes applied

**Scope**: 8h. Per ognuno 9 shipping biome:

- 4 tile variant (grass/stone/moss/etc. per bioma) via `tools/py/art/generate_tile.py` extended
- Palette-lock enforcement da master file (W9)
- Wire: render.js drawCell → usa tile PNG invece di solid color quando scenario ha `biome_id`

Bioma shipping target (priority):

1. savana (procedural base done M3.10)
2. foresta_acida (moss procedural done M3.10)
3. caverna_sotterranea (stone procedural done M3.10)
4. **+6 nuovi**: deserto, palude, ghiaccio, lava, ruderi, laguna

**Deliverable**: 9 biome × 4 tile = 36 tile PNG. Gap critical "tileset placeholder colors" → CLOSED.

Preservato: Wave 2-10 + solid color fallback se biome_id missing.

## Wave 12 — Animation 4-frame sprite top 3 specie

**Scope**: 12h (biggest lift). 3 specie canonical shipping:

- dune_stalker (savana)
- carapax (foresta)
- velox (caverna)

4 frame per specie × 5 anim state (idle/walk/attack/hit/death) = **60 PNG** totali.

Fonte: Libresprite o Retro Diffusion output (base silhouette W10 + color pass per specie).

Wire: anim.js + render.js → animazione 8 FPS durante move/attack/hit.

**Deliverable**: 3 specie animate visibili durante gameplay. Gap low "animation budget" → PARTIAL (3/9 specie).

Preservato: Wave 2-11 + static fallback per altre 6 specie.

## Wave 13+ — Narrative layer (post-MVP opt-in)

**Scope**: M-L. Post-playtest feedback dipendente:

- **W13**: Portrait system (Fell Seal style) — 1 portrait PNG per specie × evolution tier
- **W14**: Painterly terrain layer (Songs of Conquest style) — parallax sub-tile detail
- **W15**: Environmental storytelling (Divinity OS II style) — hazard tile FX (lava glow, acid steam)
- **W16**: Day/night cycle (Q-OPEN-25 closure) — time-of-day light direction shift

Opt-in: user playtest valida MVP Wave 2-12 prima di investire narrative layer. Se feedback "troppo minimal" → W13-W16 attivati.

## Post-visual 100%: Wave 2-7 review plan

Dopo Wave 12 completato (core visual base committed), review Wave 2-7 mechanics in light of new visual foundation.

### Review scope per Wave

| Wave                          | Review focus                                                                                                   | Expected output                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Wave 2 HUD cosmetic**       | Help panel styling compatible con Inter + new icons?                                                           | Polish pass CSS                 |
| **Wave 3 range overlay + FX** | Range tile overlay visibile sopra nuovi tileset? AP cost label leggibile su biome palette?                     | Alpha tune + contrast fix       |
| **Wave 4 round feedback**     | Commit reveal overlay style coerente con 42-SG modal pattern? Priority badge leggibile su unit silhouette W10? | Style refactor + badge position |
| **Wave 5 preflight polish**   | Events tail UI in sidebar readable con new typography?                                                         | Font size adjust                |
| **Wave 6 planning control**   | Cancel ✕ btn + per-PG HUD layout rompe con tileset W11? Traits chip overlap nuovi sprites?                     | Layout audit                    |
| **Wave 7 planning preview**   | Priority rank badge readable su new unit silhouette + biome palette? Ability chips leggibili con Inter?        | Final polish                    |

### Review methodology

1. **Playtest run5 post-Wave 12**: capture gameplay screenshots + user feedback
2. **Visual audit**: systematic check each Wave 2-7 element contro new visual base
3. **Gap doc**: `docs/playtest/2026-04-XX-visual-review-W2-W7.md` lista mismatch
4. **Polish wave (W14 review)**: CSS/layout-only fix, zero logic change. Preservano TUTTE features W2-W7.

### Expected deliverables post-review

- CSS polish pass: rebranding visual base applicata a W2-W7 components
- Asset swap: SVG icons W8 → creature silhouette W10 dove applicabile
- Documentation update: CLAUDE.md sprint context riflettere visual 100%

## Timeline

| Wave                  |     Effort      | Target sessione  | Blocker                             |
| --------------------- | :-------------: | ---------------- | ----------------------------------- |
| W8                    |       2h        | NOW (shipped)    | ✅ none                             |
| W9                    |       4h        | Next session     | Tempo user moodboard                |
| W10                   |       6h        | +1 session       | Retro Diffusion OR hand-sketch time |
| W11                   |       8h        | +2 sessions      | Procedural generator extension      |
| W12                   |       12h       | +3-4 sessions    | Libresprite/AI pipeline validation  |
| **Visual 100%**       | **~32h totali** | **5-6 sessioni** | —                                   |
| W2-W7 review + polish |      4-6h       | Post-W12         | Visual base committed               |

Budget totale visual + review: **~38h** distribuiti 6-7 sessioni.

## Guardrail preservation Wave 2-7

Tutte le future waves (W9-W13+) MUST:

- Zero apps/backend touch (no contract/schema change)
- Zero mechanics logic change (round/FX/HUD state intact)
- CSS/asset/docs only (massimo code = render.js drawUnit swap sprite source)
- Fallback visivo se nuovo asset missing (circle color + text fallback current)

Se gap mechanics emerge durante visual work → segnala, NON fix inline. Queue backlog separato.

## Cross-ref

- Research: [`visual-research-2026-04-19.md`](visual-research-2026-04-19.md)
- Spec: [`41-ART-DIRECTION.md`](../core/41-ART-DIRECTION.md)
- Style: [`42-STYLE-GUIDE-UI.md`](../core/42-STYLE-GUIDE-UI.md)
- Asset pipeline: [`43-ASSET-SOURCING.md`](../core/43-ASSET-SOURCING.md)
- PR stack: #1606→#1607→#1608→#1609→#1610→#1611→#1612→#1613 (W8 visual base)
