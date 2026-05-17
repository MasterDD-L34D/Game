---
title: 42 — Style Guide UI canonical
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-18
source_of_truth: true
language: it
review_cycle_days: 90
related:
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/adr/ADR-2026-04-18-art-direction-placeholder.md'
  - 'docs/frontend/styleguide.md'
  - 'docs/frontend/accessibility-deaf-visual-parity.md'
---

# 42 — Style Guide UI canonical

> Design tokens + component patterns canonici per tutte le interfacce (Mission Console + Trait Editor + future). Complement a `41-ART-DIRECTION.md` (visual identity) — questo doc è l'implementazione UI-code-side.

## Design tokens — Colors

### Semantic color tokens

Vincolati a `41-ART-DIRECTION.md §colori funzionali universali`.

| Token                      | Hex         | Uso                             | Contrast vs bg-primary |
| -------------------------- | ----------- | ------------------------------- | :--------------------: |
| `--color-faction-player`   | `#4a8ad4`   | Outline unit player, highlight  |         4.8:1          |
| `--color-faction-sistema`  | `#d44a4a`   | Outline unit sistema, nemico    |         4.6:1          |
| `--color-faction-neutral`  | `#e8c040`   | Outline unit NPC reclutabile    |         8.1:1          |
| `--color-selection-active` | `#f0f0f4`   | Glow + inner shadow selezione   |         14.2:1         |
| `--color-aoe-overlay`      | `#d44a4a80` | Zona AoE tile overlay 50%       |    4.6:1 (su fill)     |
| `--color-path-preview`     | `#40d4a8`   | Path preview linea tratteggiata |         5.1:1          |
| `--color-status-buff`      | `#4ad488`   | Icona status positivo           |         5.8:1          |
| `--color-status-debuff`    | `#d4884a`   | Icona status negativo           |         4.9:1          |
| `--color-crit-flash`       | `#f0d040`   | Flash critical hit 200ms        |         10.2:1         |
| `--color-heal-flash`       | `#88d444`   | Flash heal 200ms                |         7.4:1          |

### Surface color tokens

Per background UI (Mission Console evogene-deck stile scuro).

| Token                   | Hex         | Uso                       |
| ----------------------- | ----------- | ------------------------- |
| `--bg-primary`          | `#030912`   | Sfondo schermo principale |
| `--bg-surface-soft`     | `#0a1420`   | Panel background          |
| `--bg-surface-elevated` | `#142030`   | Modal, tooltip, card      |
| `--bg-overlay`          | `#030912cc` | Overlay fullscreen 80%    |
| `--border-subtle`       | `#1a2836`   | Divider tra section       |
| `--border-emphasized`   | `#2a3a4a`   | Border card interactive   |

### Text color tokens

| Token              | Hex                         | Contrast vs bg-primary | Uso              |
| ------------------ | --------------------------- | :--------------------: | ---------------- |
| `--text-primary`   | `#f2f8ff`                   |         17.8:1         | Testo principale |
| `--text-secondary` | `rgba(242, 248, 255, 0.7)`  |         12.4:1         | Testo secondario |
| `--text-tertiary`  | `rgba(242, 248, 255, 0.55)` |         9.8:1          | Caption, hint    |
| `--text-disabled`  | `rgba(242, 248, 255, 0.35)` |         6.2:1          | Disabled button  |

### State feedback tokens

| Token             | Hex       | Uso                             |
| ----------------- | --------- | ------------------------------- |
| `--state-success` | `#4ad488` | Badge operativo, success toast  |
| `--state-warning` | `#e8c040` | Badge attenzione, warning toast |
| `--state-danger`  | `#d44a4a` | Badge errore, danger toast      |
| `--state-info`    | `#4a8ad4` | Badge info, info toast          |

## Design tokens — Typography

### Font stack v1 (base TV-safe, fallback)

```css
--font-ui: 'Inter', 'Noto Sans', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Consolas', monospace;
```

**Rationale**: Inter + Noto Sans sono TV-safe (renderedd bene su ClearType + FreeType), supportano esteso set Unicode + pesantezza variabile.

### Font stack v2 — Tactical display (visual upgrade 2026-04-28)

Override del v1 per `apps/play/` dopo feedback user "sembra app telefono / sito Flash". Tier display + body + mono dedicato a tactical RPG feel.

```css
--font-display: 'Cinzel', 'Trajan Pro', 'Georgia', serif;
--font-body-tactical: 'IM Fell English', 'Georgia', 'Cambria', serif;
--font-mono-game: 'VT323', 'SF Mono', 'Menlo', 'Consolas', ui-monospace, monospace;
```

| Tier      | Font            | Uso                                                   | Reference                                    |
| --------- | --------------- | ----------------------------------------------------- | -------------------------------------------- |
| Display   | Cinzel          | h1/h2 + headers panel + ability titles + endgame card | FFT WotL serif maiuscole, Tactics Ogre LUCT  |
| Body      | IM Fell English | body text + descrizioni + dialogue + tooltip          | Disco Elysium aesthetic, manuscript oldstyle |
| Mono game | VT323           | event log + coord + stat numerici + bar value         | Terminal CRT diegetic, XCOM 2 console        |

**Rationale**: Inter è TV-safe ma "corporate webapp" — non comunica "tactical RPG". Cinzel maiuscole + tracking positivo evoca FFT/Tactics Ogre. IM Fell English oldstyle figures = manuscript fantasy. VT323 mono CRT = combat log diegetic. **Fallback graceful** mantiene leggibilità se Google Fonts CDN down.

**Anti-pattern**:

- ❌ NON usare Press Start 2P body (illeggibile <20px su TV → 10-foot fail)
- ❌ NON mescolare 4+ font display (Cinzel + IM Fell + VT323 = 3 max)
- ❌ NON applicare display tier al body principale (Cinzel <18px = blob illeggibile)

**Wire**: `apps/play/src/style.css` :root + body + h1/h2 override (commit 2026-04-28).

### Scale TV-first (equivalente 1080p a 3m)

| Token         | Size | Line-height | Uso                           |
| ------------- | :--: | :---------: | ----------------------------- |
| `--text-xs`   | 14px |     1.4     | Caption, legal, minimap label |
| `--text-s`    | 16px |     1.5     | Body secondary, tooltip       |
| `--text-m`    | 20px |     1.5     | Body primary (default)        |
| `--text-l`    | 24px |     1.4     | Section heading, unit name    |
| `--text-xl`   | 32px |     1.3     | Page title, modal heading     |
| `--text-xxl`  | 48px |     1.2     | Hero, damage numbers          |
| `--text-hero` | 72px |     1.1     | Main menu title               |

**Minimum 16px** per qualsiasi testo leggibile; **24px** default per Mission Console TV.

### Font weight scale

| Token               | Weight | Uso                        |
| ------------------- | :----: | -------------------------- |
| `--weight-regular`  |  400   | Body text                  |
| `--weight-medium`   |  500   | Emphasis, label            |
| `--weight-semibold` |  600   | Section heading            |
| `--weight-bold`     |  700   | Page title, damage numbers |

**Ban**: weight <400 (thin/light) — illeggibile su TV.

## Design tokens — Spacing

Base unit 4px. Scale consistent con Tailwind-compatible.

| Token        | Size | Uso                         |
| ------------ | :--: | --------------------------- |
| `--space-0`  |  0   | Flush                       |
| `--space-1`  | 4px  | Gap micro (icon + label)    |
| `--space-2`  | 8px  | Gap small (inline elements) |
| `--space-3`  | 12px | Padding compact button      |
| `--space-4`  | 16px | Padding card compact        |
| `--space-5`  | 20px | Padding card default        |
| `--space-6`  | 24px | Margin section              |
| `--space-8`  | 32px | Margin-bottom heading       |
| `--space-10` | 40px | Safe zone TV minimum        |
| `--space-12` | 48px | Page padding top-level      |
| `--space-16` | 64px | Safe zone TV comfortable    |

**TV safe-zone**: padding ≥5% di viewport (≥54px su 1080p) da ogni bordo — no UI critico oltre questo.

## Design tokens — Radius

| Token           | Size  | Uso                     |
| --------------- | :---: | ----------------------- |
| `--radius-none` |   0   | Sprite pixel, grid tile |
| `--radius-s`    |  4px  | Button small, badge     |
| `--radius-m`    |  8px  | Button default, input   |
| `--radius-l`    | 12px  | Card, modal             |
| `--radius-xl`   | 16px  | Panel, tooltip          |
| `--radius-full` | 999px | Avatar, circular button |

## Design tokens — Shadows

Bassa elevazione per mantenere TV-first mood scuro.

| Token                     | Value                        | Uso                     |
| ------------------------- | ---------------------------- | ----------------------- |
| `--shadow-subtle`         | `0 1px 2px rgba(0,0,0,0.3)`  | Hover card              |
| `--shadow-medium`         | `0 4px 8px rgba(0,0,0,0.4)`  | Elevated card, dropdown |
| `--shadow-strong`         | `0 8px 16px rgba(0,0,0,0.5)` | Modal, tooltip          |
| `--shadow-glow-selection` | `0 0 12px #f0f0f480`         | Glow selezione attiva   |
| `--shadow-glow-player`    | `0 0 8px #4a8ad480`          | Unit player outline     |
| `--shadow-glow-sistema`   | `0 0 8px #d44a4a80`          | Unit sistema outline    |

## Icon grid

- **Size standard**: 16px (inline), 24px (standalone), 32px (action primary), 48px (avatar)
- **Stroke width**: 2px (mai <2px per leggibilità TV)
- **Pixel-art icon**: 16×16 o 24×24 integer-scaled, palette indexed
- **Vector icon**: SVG, palette token-based (no hardcoded hex)
- **Icon set**: Lucide (primary), Heroicons (fallback), custom per game-specific

## Component patterns

### Button

```
Padding: --space-3 --space-5 (12px 20px)
Border-radius: --radius-m (8px)
Font: --text-m / --weight-medium
Focus: outline 2px --color-faction-player, offset 2px
States: default / hover (+opacity) / active / disabled / loading
```

Varianti: `primary` (bg faction-player), `secondary` (border only), `danger` (bg faction-sistema), `ghost` (no bg).

### Card

```
Padding: --space-5 (20px)
Border-radius: --radius-l (12px)
Background: --bg-surface-soft
Border: 1px --border-subtle
Shadow: --shadow-subtle
Heading: h3 / --text-l / --weight-semibold
```

### Tooltip

```
Padding: --space-2 --space-3 (8px 12px)
Border-radius: --radius-m (8px)
Background: --bg-surface-elevated
Font: --text-s
Max-width: 320px
Delay: 400ms show, 0ms hide
```

### Modal

```
Background: --bg-surface-elevated
Border-radius: --radius-xl (16px)
Padding: --space-8 (32px)
Overlay: --bg-overlay (backdrop 80%)
Close button: top-right, icon 24px
Focus trap: obbligatorio
```

### Unit card (specie in party picker)

```
Size: 180×240px (TV portrait ratio)
Padding: --space-3
Border: 2px --color-faction-{faction}
Background: --bg-surface-soft
Portrait: 96×96px top, pixel-art sprite
Name: --text-l --weight-semibold
Stats: 3-row grid (HP/AP/DC)
```

## Accessibility (gate obbligatorio)

Derivato da `docs/frontend/accessibility-deaf-visual-parity.md` + WCAG 2.1 AA.

### Contrast gates

- Text body: ≥4.5:1 (WCAG AA)
- Text large (≥24px bold OR ≥18.66px semibold): ≥3:1
- UI components (border, icon): ≥3:1
- Critical info: ≥7:1 (WCAG AAA) — target raccomandato

### Semantic HTML

- `role="status"` per unit live updates
- `role="group"` + `aria-label` per badge collection
- `aria-live="polite"` per log mission
- `aria-labelledby` / `aria-describedby` per form composto
- `<button>` mai `<div onclick>` per azioni
- Heading hierarchy valida (h1 → h2 → h3) no skip

### Keyboard navigation

- **Tab order**: logical, no tabindex > 0
- **Focus-visible**: outline 2px `--color-faction-player`, offset 2px — sempre visibile
- **Escape**: chiude modal/tooltip/dropdown
- **Enter/Space**: activate button, checkbox, menu item
- **Arrow keys**: navigate grid tile, select unit list, slider

### Screen reader parity

Per ogni stato visivo critico, fornire testo alternativo:

- Unit HP bar: `aria-label="HP 7/10"` + `role="progressbar"`
- Status icon: `aria-label="Stunned, 2 turns remaining"`
- Grid tile: `aria-label="Tile (3,4), hazard damage 2, covered by unit dune_stalker"`

### Color-blind safe

Per ogni distinzione critica accoppiare:

- Faction: colore + icon shape (player = triangolo, sistema = rombo, neutral = esagono)
- Status: colore + pattern (buff = gradient up, debuff = gradient down)
- Zone: colore + texture (AoE = hash, path = dashed)

## Responsive breakpoints

Mission Console è TV-first ma adapta a monitor/tablet per development.

| Breakpoint | Width       | Target             |
| ---------- | ----------- | ------------------ |
| `mobile`   | <640px      | Not supported MVP  |
| `tablet`   | 640-1024px  | Degraded dev-only  |
| `desktop`  | 1024-1919px | Dev primary        |
| `tv-1080p` | 1920-2559px | **MVP target**     |
| `tv-4k`    | ≥2560px     | Scaling integer 2x |

## Motion & animation

- **Duration**:
  - Micro (button hover): 150ms
  - Short (tooltip show): 200ms
  - Medium (modal open): 300ms
  - Long (page transition): 500ms
- **Easing**:
  - `ease-out` default (enter)
  - `ease-in` exit
  - `cubic-bezier(0.4, 0, 0.2, 1)` smooth default
- **Reduced motion**: rispetta `prefers-reduced-motion` — disable transitions, keep instant
- **Frame-limited animation**: 2-8 frame per sprite (vedi `41-ART-DIRECTION.md §pixel art`)

## Z-index scale

| Token                | Value | Uso                 |
| -------------------- | :---: | ------------------- |
| `--z-base`           |   0   | Sfondo              |
| `--z-grid-overlay`   |  10   | Highlight tile      |
| `--z-units`          |  20   | Unit sprites        |
| `--z-hud`            |  100  | HUD bordi           |
| `--z-tooltip`        |  200  | Tooltip             |
| `--z-dropdown`       |  300  | Dropdown, menu      |
| `--z-modal-backdrop` |  400  | Overlay modal       |
| `--z-modal`          |  410  | Modal content       |
| `--z-toast`          |  500  | Toast notifications |

## Existing implementation reference

Mission Console implementa un sottoinsieme di questi token in:

- `webapp/src/styles/evogene-deck.css` — `--evogene-deck-*` tokens (vedi `docs/frontend/styleguide.md`)
- `docs/frontend/accessibility-deaf-visual-parity.md` — regole parità screen reader

**Gap riconosciuto**: la Mission Console (pre-built Vue bundle in `docs/mission-console/`) è NOT source-in-repo. Token canonici qui documentati sono **spec per future implementazione** — non tutti presenti oggi nel bundle shipping.

## Q-OPEN chiuse

- Q-OPEN-22 (UI visual language): ✅ flat + alto contrasto + TV-first
- Q-OPEN-26 (typography scale): ✅ 8 token text-xs..text-hero
- Q-OPEN-27 (spacing system): ✅ base 4px, 11 token

## Q-OPEN residue

- Q-OPEN-26b: icon set definitivo (Lucide vs custom) — attesa artist onboard
- Q-OPEN-27b: dark mode vs light mode — MVP dark only, light deferred

## Riferimenti

- `docs/core/41-ART-DIRECTION.md` — visual identity (palette, silhouette, biomi)
- `docs/adr/ADR-2026-04-18-art-direction-placeholder.md` — ADR ACCEPTED
- `docs/frontend/styleguide.md` — EvoGene Deck UI legacy guide (superseded by this)
- `docs/frontend/accessibility-deaf-visual-parity.md` — screen reader parity
- `docs/core/30-UI_TV_IDENTITA.md` — UI carte + albero evolutivo
- WCAG 2.1 AA — accessibility baseline
