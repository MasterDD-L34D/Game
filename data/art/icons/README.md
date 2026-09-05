# Evo-Tactics UI Icons

Custom human-authored SVG icons. Palette + stroke spec da `docs/core/42-STYLE-GUIDE-UI.md`.

## Inventario

### Faction markers (3)

| File | Shape | Color |
|------|-------|-------|
| `faction_player.svg` | Triangolo punta-alto | `#4a8ad4` |
| `faction_sistema.svg` | Rombo | `#d44a4a` |
| `faction_neutral.svg` | Esagono | `#e8c040` |

### Action buttons (3)

| File | Shape | Color |
|------|-------|-------|
| `action_attack.svg` | Slash diagonale + hilt | `#d44a4a` |
| `action_move.svg` | Freccia destra | `#40d4a8` |
| `action_skip.svg` | Pause 2-bar | `#6a6e78` |

### Status icons (1, starter)

| File | Shape | Color |
|------|-------|-------|
| `status_stunned.svg` | Fulmine | `#d4884a` |

## Spec comune

- **viewBox**: `0 0 16 16`
- **Size default**: 16px inline, 24px/32px standalone (integer scale)
- **Stroke width**: ≥2px (leggibilità TV, 42-SG requirement)
- **Format**: SVG 1.1 con `aria-label` per accessibility screen reader
- **License**: MIT (stesso del repo, © 2026 Master DD)
- **Authorship**: custom geometric shapes, no AI, no community derivative

## Usage

Load in UI component via direct SVG embed o CSS mask:

```html
<img src="/data/art/icons/faction_player.svg" alt="Player unit" width="16" height="16">
```

O inline:

```html
<svg viewBox="0 0 16 16" width="16" height="16">
  <path d="M8 2 L14 13 L2 13 Z" fill="var(--color-faction-player)" />
</svg>
```

## Follow-up icon set

Post-MVP expansion da:
- **Game-icons.net** (CC-BY 3.0) per ability/status complex (poison, bleeding, buff complex) — attribution required
- **Lucide** (MIT) per UI generic (menu, settings, close)
- Custom authored se gap specifico

## Provenance log

Vedi `CREDITS.md §UI icons §Custom human-authored`.
