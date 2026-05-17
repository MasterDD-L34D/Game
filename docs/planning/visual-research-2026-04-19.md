---
title: Visual research 2026-04-19 — 15 refs + 4 archetypes + gap vs 41-AD
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-19'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/core/43-ASSET-SOURCING.md'
---

# Visual research 2026-04-19 — 15 refs + 4 archetypes + gap analysis

Post user playtest run3 + 7 Wave HUD/FX stack shipped. User pivot: research visual base → moodboard → progressive capability activation keeping Wave 2-7 mechanics.

> **Update 2026-04-19 post run4 playtest**: user report rivela 8 bug (3 P0 blocker — commit-round crash + abilità non attivabili/visibili). Wave 8 scope originale (typography + icons) preserved ma **posticipato**. Sequenza aggiornata raccomandata (Opzione A fix-first):
>
> | Wave             | Scope                                                                           | Priority |
> | ---------------- | ------------------------------------------------------------------------------- | :------: |
> | **W8-emergency** | Bug P0: #5 crash `/round/execute` + #1/#8 abilità affordance/visibility         |    🔴    |
> | **W8b**          | Visual base originale (typography Inter + SVG status icons)                     |    🟡    |
> | **W9**           | P1 UX: #4 action affordance + #2 result persistent + #6 kill chain              |    🟡    |
> | **W10**          | P2 polish: #3 enemy inspect + #7 unit card legend                               |    🟢    |
> | W11+             | Moodboard HTML + palette-lock + creature silhouette + tileset (originale W9-13) |    🟢    |
>
> Cross-ref bug report: `~/.claude/projects/.../memory/project_sprint_M4_wave4_7_shipped.md`.

## Executive summary

Spec canonica 41-AD + 42-SG = architecturally sound. Target "tactical readability over decoration" (Into the Breach + AncientBeast). Current `apps/play/src/style.css` = solid functional baseline MA utilitarian (dark palette, 8-12px monospace, grid-centric). **Gap = visual polish + mood coherence**, not design.

## 15 reference games (matrix)

| #   | Game                          | Year | Grid/Readability | Palette                 | What to steal                                            |
| --- | ----------------------------- | ---- | ---------------- | ----------------------- | -------------------------------------------------------- |
| 1   | **Into the Breach**           | 2018 | Perfect 32×32    | Neutral + faction       | Silhouette hierarchy, scale variance, particle restraint |
| 2   | **Slay the Spire**            | 2017 | N/A card         | Dark purple + gold      | Dark bg, semi-trans overlay, card HUD                    |
| 3   | **Wildermyth**                | 2021 | Good hex         | Earth tones             | Creature personality, multi-layer identity               |
| 4   | **AncientBeast**              | 2014 | Excellent hex    | Dark + jewel            | Unit card inline stats, faction color, turn timer        |
| 5   | **Fell Seal: Arbiter's Mark** | 2019 | Good hex         | Dark brown + factions   | Character-centric, leveled detail hierarchy              |
| 6   | **Wargroove**                 | 2019 | Excellent square | Pastel + faction        | Clean pixel outlines, 16×16 sprites, anim restraint      |
| 7   | **Duelyst**                   | 2016 | Good 8×5         | Faction primary         | Card-to-board cohesion, status glow, resource bars       |
| 8   | **Invisible, Inc.**           | 2014 | Excellent iso    | B+W + neon              | High contrast > decoration, minimal unit icons           |
| 9   | **Songs of Conquest**         | 2022 | Good hex         | Painterly earth         | Sub-tile detail, parallax, faction color-harmony         |
| 10  | **Chimera Sweep**             | 2023 | Excellent grid   | 16-color VGA            | Palette discipline, scanline post-process                |
| 11  | **Divinity: Original Sin II** | 2017 | Medium iso       | Saturated fantasy       | Environmental storytelling, surface feedback             |
| 12  | **Chained Echoes**            | 2023 | Good square      | Pastel + party          | Expressive sprite (4-8 frame), job color                 |
| 13  | **Hades**                     | 2020 | Real-time        | Dark + gold amber       | Glow-layer, silhouette contrast, scale/color variety     |
| 14  | **Inscryption**               | 2021 | Good card-grid   | Desaturated + blood red | Diegetic UI, 32×32 detail, mystery via contrast          |
| 15  | **Cosmic Star Heroine**       | 2023 | Excellent grid   | Neon + dark space       | Minimal UI chrome, inline status icons                   |

## Pattern estratti

- **Grid clarity priority**: 11/15 (73%)
- **Dark backgrounds**: 70%+ (mood + unit contrast)
- **Faction color > decorative color**: 13/15 (funzionale separato da painterly)
- **Minimal animation**: 2-8 frame per tactical
- **Painted vs pixel dichotomy**: card games (Slay/Duelyst/Inscryption) split painted cards + minimal grid UI

## 4 archetipi Evo-Tactics

### Archetype A — "Into the Breach Minimalism" ⭐ MVP RECOMMENDED

- **Pitch**: Grid clarity pura, silhouette-driven unit ID, sfondo zero-noise
- **Pros**: Instantly readable, TV-friendly, animation-cheap, biome mood via palette-swap
- **Cons**: Cold aesthetic, low character investment, less emotional vs Wildermyth
- **Fit**: 8.5/10 — aligns 32×32 spec + tactical pillar, gap emotional arc co-op

### Archetype B — "Fell Seal Character-Centric"

- **Pitch**: Grid + painted portrait, unit card evolve per tier, dark surround + bright character focus
- **Pros**: Strong narrative, evolution _visual_, co-op bonding "my unit's unique look"
- **Cons**: Asset load +30%, portrait+sprite split overhead, less grid density
- **Fit**: 7/10 — exciting ma high-cost, portrait system non designed, sourcing gap

### Archetype C — "Wargroove Pixel-Art Cozy"

- **Pitch**: Pastel cheerful palette, smooth 8-bit, clean outlines, sub-16×16 units + large HUD text
- **Pros**: Distinctive (vs dark saturation), asset creation Libresprite-native, joyful mood
- **Cons**: Loses tactical weight, hard convey danger, pastel ≠ "naturalistic" (per spec)
- **Fit**: 5/10 — tone mismatch spec "Into the Breach + AncientBeast" not cozy

### Archetype D — "Songs of Conquest Painterly (Hybrid)"

- **Pitch**: Pixel-art + hand-painted detail layer, terrain-as-character, parallax depth, harmonious faction palettes
- **Pros**: High visual polish, biome personality, screen lived-in
- **Cons**: Solo-dev bottleneck (AI can't 2x painted details easily), asset fragmentation per biome
- **Fit**: 6.5/10 — ambitious, post-MVP direction se narrative focus grows

## Gap vs 41-AD canonical

| Spec element       | Canonical                        | Current CSS                  | Gap                                                  |   Severity   |
| ------------------ | -------------------------------- | ---------------------------- | ---------------------------------------------------- | :----------: |
| Palette discipline | 9 biomi × 4 col + 10 funz        | CSS vars (good)              | Master `.ase` missing, no palette-lock workflow      |     Med      |
| Typography         | Inter/Noto Sans 16-48px TV-first | Monospace 8-12px utilitarian | No headline hierarchy, font substitution unspec      |   **High**   |
| Grid clarity       | 32×32 tile, always visible       | Canvas-based (good)          | No tile hover highlight, pathfinding preview minimal |     Med      |
| Unit silhouettes   | Unique per species + job         | Placeholder emoji/text       | SVG incomplete, 0 creature art                       | **Critical** |
| Biome tilesets     | 9 shipping palette               | Placeholder solid colors     | 0 tileset asset committed (3 procedural only)        | **Critical** |
| Animation budget   | 10-16 frame per specie           | None static                  | Unimplemented (post-MVP OK)                          |     Low      |
| TV safe-zone       | 5% padding (54px @ 1080p)        | Partial (max env 2.5vw)      | Close enough                                         |     Low      |
| Status icons       | ≥16px, no color-only             | Text-only (debuff orange)    | No icons, colorblind fallback missing                |     Med      |
| HUD hierarchy      | 5-tier z-index doc'd             | Ad-hoc z-index               | Matches intent not structure                         |     Low      |

### Top gap priority

1. **Typography utilitarian not TV-first** — 8px body fails @3m viewing → Inter 16-20px min
2. **No creature art** — silhouette spec written, 0 pixel shipped
3. **Tileset colors placeholders** — palette matrix canonical but not applied
4. **Status/ability icons text-only** — viola WCAG + colorblind spec
5. **Dark mode only** — light-mode fallback non designed

## 3 actionable next steps

### Step 1 — Moodboard sprint (4h, S effort)

- Screenshot+annotate 3 ref games (Into the Breach, AncientBeast, Wargroove): grid clarity, unit scale, palette restraint, HUD placement
- HTML mockup overlaying Evo-Tactics color su Into the Breach layout
- Goal: visual PoC che 32×32 + 9-biome palettes work together

### Step 2 — Typography + UI overhaul CSS (6h, S effort) ⭐ WAVE 8 CANDIDATE

- Swap `font-family: 'SF Mono'` → `'Inter', 'Noto Sans'` (per 42-SG)
- Audit font sizes: body 16px min, heading 24px (current 8-12px)
- Status icon SVG layer (Game-icons.net CC-BY): icon + color per buff/debuff
- Result: CSS-only spec-compliant, no asset creation
- **Preserva Wave 2-7 mechanics**: HUD/round/FX/range/priority badge intact

### Step 3 — Creature silhouette library concept (6h, M effort)

- Hand-sketch or AI silhouette 7 jobs (vanguard/skirmisher/assassin/support/scout/controller/civilian) @ 32×32
- Lock 1-2 reference creature per biome (e.g., "desert scorpion vanguard") test palette+job-shape mapping
- Goal: unblock critical gap "unit silhouettes", valida job-color coding CSS already in `style.css`

## Raccomandazione

**Archetype A** (Into the Breach minimalism) come MVP path:

- Aligns spec intent
- Unlocks 32×32 art pipeline
- Scales co-op TV readably
- Lascia narrative evolution (portraits, painterly) post-playtest

**Sequenza progressive activation** (preserve Wave 2-7):

| Wave | Scope                                        | Mechanics preserved |
| ---- | -------------------------------------------- | :-----------------: |
| W8   | Typography Inter + status SVG icons          |   ✅ tutti W2-W7    |
| W9   | HTML moodboard + palette-lock master file    |    ✅ tutti + W8    |
| W10  | 7 creature silhouette placeholder            |   ✅ tutti + W8-9   |
| W11  | Tileset biome 9 palettes applied             |  ✅ tutti + W8-10   |
| W12  | Animation 4-frame sprite (top 3 specie)      |  ✅ tutti + W8-11   |
| W13+ | Narrative layer (portrait, painterly opt-in) |  ✅ tutti + W8-12   |

## Riferimenti

- Ref: Into the Breach (https://subsetgames.com/itb.html)
- Ref: AncientBeast (https://github.com/FreezingMoon/AncientBeast)
- Ref: Wargroove (https://chucklefish.org/games/wargroove)
- Canonical: [`docs/core/41-ART-DIRECTION.md`](../core/41-ART-DIRECTION.md)
- Canonical: [`docs/core/42-STYLE-GUIDE-UI.md`](../core/42-STYLE-GUIDE-UI.md)
- Canonical: [`docs/core/43-ASSET-SOURCING.md`](../core/43-ASSET-SOURCING.md)
- Sprint: [`docs/process/sprint-m3-6.md`](../process/sprint-m3-6.md)
