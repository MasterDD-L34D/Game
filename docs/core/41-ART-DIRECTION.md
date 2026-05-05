---
title: 41 — Art Direction canonical
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-18
source_of_truth: true
language: it
review_cycle_days: 90
related:
  - 'docs/adr/ADR-2026-04-18-art-direction-placeholder.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/core/02-PILASTRI.md'
  - 'docs/core/30-UI_TV_IDENTITA.md'
---

# 41 — Art Direction canonical

> Promosso da `docs/planning/draft-art-direction.md` post ADR-2026-04-18 ACCEPTED (sprint M3.6). Canonical per tutti gli asset art + UI. Pipeline acquisition zero-cost in `docs/core/43-ASSET-SOURCING.md` (ADR-2026-04-18 zero-cost-asset-policy, M3.7).

## Direzione sintetica

**Stile**: "naturalistic stylized" implementato in **pixel art tattico**.

- Reference positivi: **Slay the Spire** (mood UI scuro, TV-first), **Into the Breach** (leggibilità grid pixel), **Wildermyth** (creature painted narrative), **Don't Starve** (silhouette forte + palette limitata), **AncientBeast** (combat tattico turn-based)
- Anti-reference: Disney cartoon, Pokemon-style cute, full-3D realistic, anime shonen, military sci-fi patinato

## Pillars visivi (4)

### 1. Leggibilità tattica > estetica

Pilastro 1 (FFT) hard constraint.

- **Silhouette distinguibili a 2m TV**: ogni unit riconoscibile by shape, non by color
- **Griglia sempre visibile**: contorni tile, altezze via shadow/scale
- **Status icone above unit**: no tooltip-only — icon size ≥16px su TV 1080p
- **Figure vs sfondo**: contrast ratio ≥4.5:1 obbligatorio

### 2. Specie come carattere

Pilastro 3 (identità specie × job).

- **1 silhouette unica per specie**: dune_stalker ≠ carapax ≠ velox
- **1 palette identitaria**: 3-4 colori chiave per specie, coerente cross-evoluzione
- **Job-to-shape mapping** (sotto)
- **Evoluzione visiva**: tratti sbloccati = appendici/texture/glow addizionali, silhouette base preservata

### 3. Biomi atmosferici

Pilastro 2 (evoluzione emergente).

- **Palette per bioma** (matrix sotto): definisce atmosfera + leggibilità sfondo
- **Texture grid** specifica: sabbia, roccia, cristallo, acqua, meme
- **Light direction** semantica: calda dal basso = pericolo; fredda diffusa = neutralità; puntiforme bioluminescente = mistero
- **Particelle ambientali**: non puramente decorative — segnalano stress/calma/evento

### 4. TV-first

Pilastro 5 (co-op TV condivisa).

- **Alto contrasto**: testo ≥12:1 su bg, elementi UI ≥4.5:1
- **Font ≥18px** equivalente TV 1080p a 3m (vedi `42-STYLE-GUIDE-UI.md`)
- **No thin lines** (<2px): rendering TV degrada
- **Safe zone 5%**: zero UI critico nei bordi 5% dello schermo

## Implementazione: Pixel Art

**Decisione confermata 2026-04-16**, canonicizzata sprint M3.6.

| Aspetto            | Spec                                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| Risoluzione tile   | **32×32** (MVP) — upgrade a 48×48 post-playtest se leggibilità < 4/5       |
| Sprite sheet       | 4-8 frame: idle (2), walk (4), attack (2), hit (1), death (1)              |
| Palette bioma      | 16-24 colori limited (indexed PNG)                                         |
| Palette funzionale | 8 colori universali (alleato/nemico/neutro/selezione/AoE/path/buff/debuff) |
| Upscaling          | **Integer only** (2x, 3x, 4x) — mai filtri bilineari                       |
| Tool authoring     | Aseprite (sprite) + Pyxel Edit (tileset) + Figma (UI mockup)               |
| Export format      | PNG (palette indexed) per sprite, SVG per UI icon                          |

**Budget frame MVP** (per specie shipping):

- Specie base: 10 frame totali (idle×2 + walk×4 + attack×2 + hit×1 + death×1)
- Specie evoluta (T2-T3): +4 frame (glow overlay)
- Apex/BOSS: +6 frame (special animation 2 frame + particle layer)

## Creature silhouette language

Job-to-shape canonico (Pilastro 3).

| Job        | Silhouette            | Proporzioni           | Key shape                                  |
| ---------- | --------------------- | --------------------- | ------------------------------------------ |
| vanguard   | Massiccia, larga      | Low + wide            | Corazza frontale, artigli difensivi        |
| skirmisher | Snella, angolosa      | Tall + narrow         | Arti lunghi, postura dinamica              |
| assassin   | Piccola, nascosta     | Compact + angular     | Silhouette spezzata, low profile           |
| support    | Organica, simmetrica  | Medium + round        | Appendici curative/sensoriali, aura visiva |
| scout      | Piccola, aerodinamica | Compact + streamlined | Membrane volo/salto, postura agile         |
| controller | Tentacolata, etereo   | Medium + irregular    | Tentacoli/filamenti, bioluminescenza       |
| civilian   | Neutra, non-armata    | Variable + round      | No artigli/corazze, movimento lento        |

## Job-to-shape silhouette spec (Godot AnimatedSprite2D import)

> **Sprint M.3 addendum 2026-05-06** — gap audit P1.7 plan v3.3. 7 player job (`data/core/jobs.yaml`) mappati su creature archetype base + key visual marker. Sprint M.3 Godot import usa questa tabella per AnimatedSprite2D node setup (silhouette base layer + job-specific marker overlay).

| Job (player) | Archetype base | Key marker visual                         | Frame budget extra | Override scene              |
| ------------ | -------------- | ----------------------------------------- | ------------------ | --------------------------- |
| `skirmisher` | scout          | Lama curva +1 frame attack pose dynamic   | +2 frame           | `skirmisher_<species>.tres` |
| `vanguard`   | vanguard       | Scudo frontale +1 frame block pose        | +2 frame           | `vanguard_<species>.tres`   |
| `warden`     | controller     | Aura nera tentacle pulse +1 frame channel | +3 frame           | `warden_<species>.tres`     |
| `artificer`  | support        | Strumento esagonale +1 frame craft pose   | +2 frame           | `artificer_<species>.tres`  |
| `invoker`    | controller     | Glow runico arancio +1 frame channel      | +3 frame           | `invoker_<species>.tres`    |
| `ranger`     | scout          | Arco lungo + freccia ready pose           | +2 frame           | `ranger_<species>.tres`     |
| `harvester`  | support        | Falce curva +1 frame drain pose           | +2 frame           | `harvester_<species>.tres`  |

**Composition logic Godot Sprint M.3**:

1. Layer 0 = species archetype base (10 frame default — vedi §"Budget frame MVP")
2. Layer 1 = job marker overlay (2-3 frame extra)
3. Total budget species×job: 12-13 frame (well under 16-frame Godot AtlasTexture cap)

**Ranger vs skirmisher** entrambi mappano `scout` archetype: differenziazione via marker (arco lungo vs lama curva) + posture default (ranged stance vs melee dynamic). Tested visual readability requires playtest userland post Sprint M.3 import.

**Warden vs invoker** entrambi mappano `controller` archetype: differenziazione tramite aura color (nera vs arancio runico) + channel pose (telekinetic pull vs spell-cast).

**Civilian + assassin archetype** preservati per NPC + future enemy (NON player job). Total 7 job player + 2 archetype enemy = 9 silhouette canon.

**Scope esplicito**: questo addendum è **spec doc**, non implementation. Sprint M.3 Godot wire produrrà i `.tres` resource file effettivi. Se lo spec rivela contraddizioni post-import (es. ranger pose conflict skirmisher), Sprint M.3 può rivisitare via PR successivo.

## Palette matrix 9 biomi shipping

Biomi usati negli encounter correnti (data/core/biomes.yaml allinea ulteriori 11 biomi non-shipping):

| Bioma (id)                    | Palette dominante           | Accent 1               | Accent 2                     | Mood               | Luce                   |
| ----------------------------- | --------------------------- | ---------------------- | ---------------------------- | ------------------ | ---------------------- |
| `savana`                      | Ocra #b8935a, terra #8b6b3d | Verde secco #6e7a3f    | Cielo #e8d5a8                | Esposizione        | Alta, calda dall'alto  |
| `caverna_sotterranea`         | Grigio basalto #3d3d42      | Verde muschio #4a5e3d  | Bioluminescenza cyan #40c8d4 | Claustrofobia      | Bassa, puntiforme      |
| `foresta_acida`               | Verde veleno #5a7a3a        | Marrone scuro #3d2a15  | Giallo spore #c4a628         | Densità tossica    | Filtrata verdastra     |
| `foresta_miceliale`           | Viola fungo #6b4a7a         | Bianco osseo #e8e0d4   | Rosa spore #c87a9a           | Onirico, sporale   | Diffusa violacea       |
| `rovine_planari`              | Grigio pietra #5e5a52       | Oro sbiadito #b8935a   | Blu spettrale #4a6a8a        | Archeologico       | Fredda, obliqua        |
| `frattura_abissale_sinaptica` | Blu profondo #0d1e3d        | Cyan elettrico #40d4e8 | Viola profondo #3d1e5a       | Tensione, mistero  | Bassa, bioluminescente |
| `reef_luminescente`           | Teal #1e6a7a                | Rosa corallo #e8a8c4   | Giallo brillante #f0e040     | Vivacità acquatica | Chiaroscuro subacqueo  |
| `abisso_vulcanico`            | Rosso lava #c83a1e          | Basalto #1e1e22        | Arancio magma #f06a28        | Pericolo, calore   | Calda dal basso        |
| `steppe_algoritmiche`         | Grigio acciaio #6a6e78      | Verde matrix #40c860   | Bianco circuito #f0f0f4      | Astratto, digitale | Neutra diffusa         |

Palette extension (11 biomi non-shipping) deferred — AI gap-fill disponibile via pipeline `43-ASSET-SOURCING.md`, priorità post-MVP playtest.

## Colori funzionali universali

Indipendenti dal bioma, sovrapposti al rendering.

| Funzione                 | Colore hex              | Uso                               |
| ------------------------ | ----------------------- | --------------------------------- |
| Alleato (player)         | `#4a8ad4` blu           | Outline unit, highlight selezione |
| Nemico (sistema)         | `#d44a4a` rosso         | Outline unit, indicatore faction  |
| Neutro (NPC recruit)     | `#e8c040` giallo        | Outline + label reclutabile       |
| Selezione attiva         | `#f0f0f4` bianco bright | Glow + inner shadow               |
| Zona AoE                 | `#d44a4a80` rosso 50%   | Overlay tile                      |
| Path preview             | `#40d4a8` cyan trat.    | Linea tratteggiata 4px            |
| Status positivo (buff)   | `#4ad488` verde         | Icona sopra unit                  |
| Status negativo (debuff) | `#d4884a` arancio       | Icona sopra unit                  |
| Critical hit             | `#f0d040` giallo        | Flash 200ms + numero danno        |
| Heal                     | `#88d444` verde chiaro  | Flash 200ms + numero heal         |

## UI visual hierarchy (TV-first)

| Livello     | Elemento                    | Priorità visiva                     |
| ----------- | --------------------------- | ----------------------------------- |
| 1 (massima) | Unit + HP bar               | Sempre visibile, centro schermo     |
| 2           | Terreno griglia + coperture | Layer base, basso contrasto         |
| 3           | Intents/preview azioni      | Overlay temporaneo durante planning |
| 4           | HUD (AP, PT, turno, status) | Bordi schermo, sempre leggibile     |
| 5           | Log testuale                | Laterale, scrollabile, opzionale    |
| 6           | Minimap                     | Angolo, toggle on/off               |

## Accessibility canonical

Gate obbligatori per ogni schermata UI (vedi `42-STYLE-GUIDE-UI.md §accessibility`).

- **Colorblind mode**: shape/pattern oltre al colore per ogni distinzione critica (faction, status, zone)
- **High contrast mode**: bordi rinforzati +2px, sfondi opacizzati 90% sotto testo
- **Scalabilità font**: 3 livelli (S=16px, M=20px, L=24px equivalente TV 1080p)
- **No color-only information**: icone + colore sempre accoppiati
- **Screen reader parity**: ogni elemento visivo critico ha `aria-label` (vedi `docs/frontend/accessibility-deaf-visual-parity.md`)

## Asset acquisition spec (pipeline zero-cost)

**IMPORTANTE**: Evo-Tactics usa pipeline **zero-cost** (ADR-2026-04-18 zero-cost-asset-policy + `docs/core/43-ASSET-SOURCING.md`). NO freelance commission.

**Deliverable MVP** (shipping encounter 01-06):

| Asset                                                  | Quantità | Fonte primaria         | Fonte secondaria     | Format              | Spec                                    |
| ------------------------------------------------------ | :------: | ---------------------- | -------------------- | ------------------- | --------------------------------------- |
| Tileset bioma (9 biomi shipping)                       |    9     | Kenney/OGA CC0         | AI (Retro Diffusion) | PNG palette indexed | 32×32 tile, 16-24 colori bioma          |
| Sprite sheet specie shipping (4 base + 4 evo + 2 BOSS) |    10    | AI + Libresprite edit  | OGA CC0 base         | PNG palette indexed | 32×32, 10-16 frame per specie           |
| Icon status (8 functional + 12 traits)                 |    20    | Game-icons.net (CC-BY) | Lucide (MIT)         | SVG                 | 16×16, palette funzionale               |
| UI mockup 1 schermata combat HUD                       |    1     | Krita/GIMP + user      | AI wireframe         | PNG + spec          | 1920×1080, token `42-STYLE-GUIDE-UI.md` |
| Particelle ambientali (9 biomi)                        |    9     | AI + Libresprite       | OGA CC0              | PNG sprite sheet    | 8×8 particle, 4 frame loop              |

**Workflow canonico**: vedi `docs/core/43-ASSET-SOURCING.md §human authorship layer`. Palette lock + Libresprite cleanup + provenance log in `CREDITS.md` OBBLIGATORI.

**Fuori scope MVP** (post-playtest visual):

- Animazioni VFX complesse (particelle multi-layer, distortion)
- Day/night cycle per bioma
- Cutscene briefing/debrief art painted (keep Ink text-only MVP)
- Portrait specie alta risoluzione (dialogue panel)

## Q-OPEN chiuse

- Q-OPEN-15 (stile creature): ✅ naturalistic stylized pixel art
- Q-OPEN-19 (palette biomi): ✅ matrix 9 biomi shipping canonicizzata sopra
- Q-OPEN-22 (UI visual language): ✅ flat + alto contrasto + TV-first

## Q-OPEN residue (post-M3.6)

- Q-OPEN-15b: budget frame specie evoluta T3 (10+4 o 10+8?) — decision post-MVP playtest (pipeline zero-cost permette iter, ma coerenza richiede decisione canonica)
- Q-OPEN-19b: palette 11 biomi non-shipping — AI gap-fill disponibile (43-ASSET-SOURCING), priorità post-MVP playtest
- Q-OPEN-25: Day/night cycle post-MVP — blocked su playtest visual

## Riferimenti

- `docs/adr/ADR-2026-04-18-art-direction-placeholder.md` (ACCEPTED)
- `docs/core/30-UI_TV_IDENTITA.md` — UI carte + albero evolutivo
- `docs/core/02-PILASTRI.md` — "tattica leggibile" Pilastro 1
- `docs/core/42-STYLE-GUIDE-UI.md` — design tokens + component patterns
- `docs/frontend/accessibility-deaf-visual-parity.md` — screen reader parity
- `docs/planning/draft-art-direction.md` — draft originale (superseded da questo doc)
- Chris Taylor GDD Template — sezione Art Bible
