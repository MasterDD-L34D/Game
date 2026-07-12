---
title: 43 — Asset Sourcing canonical (zero-cost + AI pipeline)
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-07-12
source_of_truth: true
language: it
review_cycle_days: 180
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

## Audio shortlist (Fase 2 studio-track, 2026-07-12)

Sblocca lo stub storico (ADR-2026-04-18-audio-direction-placeholder): criteri, classi
e budget quantitativo sono in `docs/planning/draft-audio-design.md` (esteso 2026-07-10,
Fase 1). Vincolo hard licenze: SOLO CC0 o CC-BY (SA e NC esclusi), piu' le eccezioni
owner documentate sotto. Ogni licenza e' stata VERIFICATA sulla pagina del candidato
(2026-07-12, deep-research + fetch diretto). Nessun download fino ad autorizzazione
owner sul manifest (vedi sezione Manifest).

### SFX combat organici (target ~30)

| Pack                                | Fonte/Autore     | Licenza             | URL                                                              | Note fit                                                                                                                           |
| ----------------------------------- | ---------------- | ------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 80 CC0 creature SFX                 | OGA / rubberduck | CC0 (verif. 3-0)    | https://opengameart.org/content/80-cc0-creature-sfx              | 80 versi OGG (6 alien, 5 hurt, 7 monster, 3 roar, 4 eat, 3 spit); vocali+filtri = organico puro; escludere i ~10 "cute" (anti-fit) |
| Squish Sounds Effects               | OGA / EZduzziteh | CC0 (verif. 3-0)    | https://opengameart.org/content/squish-sounds-effects            | 8 MP3 squish/splat "aliens, gore, fleshy"; layer impatto carne                                                                     |
| Impact                              | OGA / qubodup    | CC0 (verif. 3-0)    | https://opengameart.org/content/impact                           | Impatti tag meat/flesh/wound/wet; chain diritti pulita (fonti freesound dell'autore stesso)                                        |
| Punches hits and squishes (riserva) | OGA / multi      | MISTA CC0+CC-BY 3.0 | https://opengameart.org/content/punches-hits-swords-and-squishes | Solo se servono extra: richiede tracking licenza PER-FILE                                                                          |

### SFX UI soft-organic (target ~15)

| Pack                 | Fonte/Autore     | Licenza          | URL                                                                             | Note fit                                                                                           |
| -------------------- | ---------------- | ---------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 51 UI sound effects  | OGA / Kenney     | CC0 (verif.)     | https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks | MATCH MIGLIORE: 51 WAV "all organic sounds" (foley reale bottoni/switch)                           |
| Interface Sounds     | Kenney.nl        | CC0 (verif. 3-0) | https://kenney.nl/assets/interface-sounds                                       | 100 OGG puliti moderni, no beep anni-90                                                            |
| UI Audio             | Kenney.nl        | CC0 (verif.)     | https://kenney.nl/assets/ui-audio                                               | 50 suoni complemento; esiste packaging Godot (github.com/Calinou/kenney-ui-audio)                  |
| Interface SFX Pack 1 | itch / ObsydianX | CC0 (verif.)     | https://obsydianx.itch.io/interface-sfx-pack-1                                  | 200+ WAV+OGG confirm/back/cursor/error; tono "upbeat PSX-RPG" = AUDIZIONE anti-beep prima dell'uso |

### Ambience bioma (target ~12)

| Pack                      | Fonte/Autore         | Licenza                         | URL                                                       | Note fit                                                   |
| ------------------------- | -------------------- | ------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Cave Ambience Loop        | freesound / hushless | CC0 (verif.)                    | https://freesound.org/people/hushless/sounds/770379/      | WAV 32-bit stereo 1:17, loop nato per videogioco; caverna  |
| Loopable Dungeon Ambience | OGA / JaggedStone    | CC0 (verif.)                    | https://opengameart.org/content/loopable-dungeon-ambience | OGG vento LF + gocce; caverna alternativa                  |
| CC0 Background Ambience   | OGA / FGResources    | CC0 collection, VERIFY per-item | https://opengameart.org/content/cc0-background-ambience   | Nature beds savana/foresta; verifica per-item obbligatoria |

**GAP dichiarato**: savana e foresta tossica senza candidato verificato -- hunt mirata
freesound (filtro licenza CC0) in fase download, stesso vincolo hard.

### Musica (target 6-8 tracce)

| Pack                             | Fonte/Autore             | Licenza                        | URL                                                    | Note fit                                                                                                       |
| -------------------------------- | ------------------------ | ------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Dark Sci-Fi Audio Pack           | OGA / SRG774             | CC0 (verif.)                   | https://opengameart.org/content/dark-sci-fi-audio-pack | ANCORA: 5 tracce + title, MP3+OGG; Pulse (heartbeat organico), Urgent (turno critico), Sector (ambient alieno) |
| Incompetech feel Unnerving/Dark  | Kevin MacLeod            | CC-BY 4.0 (attribution string) | https://incompetech.com                                | Slot mancanti (vittoria/sconfitta/evoluzione); selezione track-by-track, verifica per-traccia                  |
| Dystopian Ambient Pack (riserva) | itch / ImperialDawnAudio | CC0-tagged, VERIFY su pagina   | https://itch.io/game-assets/tag-cc0/tag-music          | Dark ambient free, tone-fit forte; licenza da confermare prima dell'uso                                        |

### Eccezione owner: Sonniss GDC Bundle (decisa 2026-07-12)

- URL: https://sonniss.com/gameaudiogdc/ -- licenza CUSTOM royalty-free
  (https://sonniss.com/gdc-bundle-license/): commerciale OK, zero attribution,
  no resale standalone, no AI-training. NON e' CC0/CC-BY: inclusa come ECCEZIONE
  esplicita owner per la qualita' pro dei combat SFX (~200GB WAV, categoria
  creatures/impacts). Tracciare i file usati in CREDITS.md con licenza Sonniss.

### Scartati per licenza o tono (documentazione anti-drift)

- Dark Ambience Soundscapes (OGA, yewbic): tono perfetto ma CC-BY-SA 3.0 = viral, ESCLUSA.
- Epic Stock Media "Strange Game Ambient Loops" + "Ambient Earth Nature Loops" (itch): PAID + licenza proprietaria.
- Zapsplat: CUSTOM free tier (attribution obbligatoria, non-CC) -- rimosso dalla tabella storica.
- GameDev Market, SwishSwoosh, Pixabay: licenze proprietarie non-CC.
- Goofy Sounds for Scary Monsters (itch, Stormyman): CC0 ok ma tono "goofy" = anti-fit cute/cartoon.

**Tool generativi** (non asset, nessun vincolo licenza sull'output): Bfxr, sfxr,
Chiptone, Beepbox restano utilizzabili per placeholder. AI audio (Suno/Udio):
deferred, review 2026-2027 post RIAA.

## VFX combat shortlist (Fase 2 studio-track, 2026-07-12)

Classi richieste (spec studio-track): impatti/slash/bite, status effects
(panic/disorient/bleed), telegraph/warning marker, surge/evoluzione. Stile:
pixel-art leggibile su grid 32x32 (reference Into the Breach), vaglio contro
art direction 41 (organico > metallico).

| Pack                             | Fonte/Autore    | Licenza                                            | URL                                                          | Note fit                                                                   |
| -------------------------------- | --------------- | -------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Free VFX Asset Pack              | itch / CodeManu | CC-BY 4.0 (metadata; descr. dice PD -> ATTRIBUIRE) | https://codemanu.itch.io/vfx-free-pack                       | 22 effetti spritesheet PNG + frame + GIF, 30/60fps; impatti/burst generici |
| Pixel art sword slash effect     | OGA / tbbk      | CC0 (verif.)                                       | https://opengameart.org/content/pixel-art-sword-slash-effect | Singolo slash 64x47, classe esatta, overlay-compatibile 32x32              |
| CC0 special effects (collection) | OGA / multi     | CC0 per-asset, VERIFY per-item                     | https://opengameart.org/content/cc0-special-effects          | Hunting ground secondario, cherry-picking stile                            |

### Eccezione owner condizionale: Pimen (decisa 2026-07-12)

- URL: https://pimen.itch.io/ -- miglior fit tematico in assoluto (spell effects
  Acid/Dark/Wood/Earth, battle slash/thrust/hit-spark, STATUS e buff/debuff).
  Licenza tipica custom "free, commercial OK, no resell" = NON CC. Trattamento:
  VERIFICA-PER-PACK obbligatoria dei termini sulla pagina di ogni singolo pack
  PRIMA del download; se un pack non dichiara uso commerciale esplicito -> scarto.
- **PRICE-GATE (zero-cost policy ADR-2026-04-18)**: molti pack Pimen sono freemium
  (es. Acid Spell Effect: file 01-02 free, 03-15 = $4.99; Hit Spark: full pack
  $4.25). La verifica per-pack copre anche il PREZZO: si importa SOLO il subset
  $0; qualsiasi tier a pagamento = deroga zero-cost, autorizzazione owner separata
  ed esplicita (non coperta da questa eccezione).

**GAP dichiarato**: telegraph marker e status panic/disorient/bleed dedicati non
hanno candidato CC puro -- coprono Pimen (condizionale) o pipeline AI-generated
(sezione sopra) con human authorship layer.

### Scartati VFX (documentazione anti-drift)

- BDragon1727 "750 Effect and FX Pixel All" (itch): free tier = SOLO non-commercial, commercial = $25 licenza custom. Viola vincolo hard.
- CodeManu "Impact&Hit FX" (44 effetti): PAID $4.95, licenza custom.
- Collection OGA "Explosions, Bullets, Fire etc" (aab): nessuna label licenza verificabile sulla pagina.

## Manifest download (stato: shortlist APPROVATA owner 2026-07-12, download DA AUTORIZZARE)

Nessun import massivo in repo: il download avviene per-item dopo autorizzazione
owner, con licenza ri-verificata al momento del fetch e attribution file aggiornato
al primo import CC-BY (regola spec studio-track).

- [ ] 80 CC0 creature SFX (CC0) -> SFX combat
- [ ] Squish Sounds Effects (CC0) -> SFX combat layer
- [ ] Impact qubodup (CC0) -> SFX combat layer
- [ ] 51 UI sound effects (CC0, WAV organici) -> SFX UI primario
- [ ] Interface Sounds Kenney (CC0) -> SFX UI base
- [ ] UI Audio Kenney (CC0) -> SFX UI complemento
- [ ] Interface SFX Pack 1 ObsydianX (CC0) -> SFX UI, previa audizione anti-beep
- [ ] Cave Ambience Loop (CC0, WAV) -> ambience caverna
- [ ] Loopable Dungeon Ambience (CC0) -> ambience caverna alt
- [ ] Dark Sci-Fi Audio Pack (CC0, OGG) -> musica ancora (5 tracce)
- [ ] Incompetech: selezione 2-3 tracce Unnerving/Dark (CC-BY 4.0 + attribution) -> slot musica mancanti
- [ ] Free VFX Asset Pack CodeManu (CC-BY 4.0 + attribution) -> VFX impatti
- [ ] Pixel art sword slash (CC0) -> VFX slash
- [ ] Sonniss GDC: cherry-pick creatures/impacts (ECCEZIONE licenza custom) -> SFX combat pro
- [ ] Pimen: SOLO subset $0 previa verifica termini+prezzo per-pack (ECCEZIONE condizionale, price-gate) -> VFX status/telegraph
- [ ] Hunt mirata freesound CC0: ambience savana + foresta tossica (GAP)
- [ ] Hunt mirata: musica vittoria/sconfitta/evoluzione se Incompetech non copre (GAP)

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
