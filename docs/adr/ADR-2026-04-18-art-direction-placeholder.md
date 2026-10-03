---
title: 'ADR 2026-04-18 — Art Direction canonical (naturalistic stylized)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-18
source_of_truth: false
language: it
review_cycle_days: 90
supersedes: []
related:
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/planning/draft-art-direction.md'
---

# ADR-2026-04-18 · Art Direction canonical

**Stato**: 🟢 ACCEPTED — direzione canonicizzata sprint M3.6
**Canonical doc**: [`docs/core/41-ART-DIRECTION.md`](../core/41-ART-DIRECTION.md)
**UI style guide**: [`docs/core/42-STYLE-GUIDE-UI.md`](../core/42-STYLE-GUIDE-UI.md)
**Issue tracker**: GDD audit gap critico #1 (asset visivi assenti) — ora unblock

## Contesto

GDD audit (`reference_gdd_audit` supermemory) identifica **3 gap critici**:

1. **Levels** — parzialmente coperto post sprint 17/04 (encounter 01-06 + screen flow promoted)
2. **Art direction** — **gap totale**: zero asset visivi, zero styleguide, zero mood board
3. **Audio** — gap totale (vedi `ADR-2026-04-18-audio-direction-placeholder.md`)

Open Questions GDD (28 totali, sessione SoT v4) ha 7 BLOCKED — di cui **3 sono Art Direction**:

- Q-OPEN-15: stile visivo creature (cartoon vs realistico vs astratto)
- Q-OPEN-19: palette biomi (saturazione + key colors per ecosistema)
- Q-OPEN-22: UI visual language (skeumorphic vs flat vs glassmorphism)

Senza decisione direzione, **ogni asset commission è bloccato** e il game loop digitale resta wireframe-only (canvas 2D placeholder shapes).

## Decisione (provvisoria)

**Direzione MVP**: stile **"naturalistic stylized"** ispirato a:

- **Slay the Spire** (UI carte + mood scuro, target TV + leggibile a distanza)
- **Into the Breach** (pixel-art tattico, leggibilità grid)
- **Wildermyth** (creature painted illustration, narrativo)
- **Don't Starve** (silhouette forte + palette limitata)

**Non**: Disney cartoon, no Pokemon-style cute, no full-3D realistic.

**Pillars visivi**:

1. **Leggibilità tattica** > estetica (pilastro 1 FFT) — silhouette unit distinguibili a 2m TV
2. **Specie come carattere** (pilastro 3) — ogni specie 1 silhouette unica + 1 palette identitaria
3. **Biomi atmosferici** (pilastro 2 evoluzione emergente) — biomi sentibili tramite palette + texture grid
4. **TV-first** (pilastro 5 co-op TV) — alto contrasto, font ≥18px, no thin lines

**Non-MVP**: animazioni in-game (statiche per ora), VFX particellari, day/night cycle.

## Conseguenze

- **Pro**: unblock asset commission MVP, definisce vocabolary "stile" per chiamare illustratori freelance, riduce scope hell
- **Contra**: decisione presa pre-playtest visivo (rischio rework), nessun art lead onboard ancora
- **Neutrale**: canvas 2D corrente resta valido come placeholder, no rewrite engine richiesto

## Roadmap (aggiornata post-M3.6 close)

| Step                                                                      | Owner                 | Stima |      Stato      |
| ------------------------------------------------------------------------- | --------------------- | ----- | :-------------: |
| 1. Mood board (10 ref + 5 anti-ref) canonicizzata                         | Master DD             | 2h    |  ✅ done (ADR)  |
| 2. Palette canonica per 9 biomi (savana, caverna, foresta, frattura, ...) | art-curator           | 1d    | ✅ done (41-AD) |
| 3. Silhouette language specie (job-to-shape mapping)                      | illustrator freelance | 3d    |  ✅ spec done   |
| 4. UI design tokens canonici (colors, typography, spacing, icon grid)     | UI designer           | 2d    | ✅ done (42-SG) |
| 5. Style guide canonica consolidata                                       | art-curator           | 1d    | ✅ done (42-SG) |
| 6. Encounter visual_mood field + retrofit 9 scenari                       | claude-agent          | 0.5d  |  ✅ done (#P4)  |
| 7. Styleguide lint tool (`tools/py/styleguide_lint.py`)                   | claude-agent          | 0.5d  |  ✅ done (#P5)  |
| 8. Asset commission (freelance illustrator + UI designer)                 | budget holder         | TBD   |   🔴 blocked    |
| 9. Moodboard visivo + 4 key art reference                                 | art lead              | 1w    |   🔴 blocked    |

Step 1-7 sbloccati dal sprint M3.6 (docs/spec only). Step 8-9 richiedono budget esterno + commission.

## Open Questions chiuse da questo ADR

- Q-OPEN-15: ✅ "naturalistic stylized" (vedi reference list)
- Q-OPEN-19: 🟡 in via di chiusura (palette per biome → step 2)
- Q-OPEN-22: ✅ flat + alto contrasto, TV-first

## Rollback

ADR DRAFT — rollback = elimina file. Nessun asset committed sotto `assets/` o `apps/play/public/` da preservare. Canvas 2D placeholder restano funzionali per playtest digitale.

## Riferimenti

- supermemory `reference_gdd_audit` — gap critici GDD
- supermemory `project_gdd_open_questions` — 28 open questions (7 blocked)
- `docs/core/00-SOURCE-OF-TRUTH.md` §pilastro 5 (TV co-op)
- `docs/frontend/styleguide.md` (target post step 5)
