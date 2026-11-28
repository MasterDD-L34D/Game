---
title: Asset Creation Workflow — 3-path canonical (Kenney + AI + Redraw)
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-28
source_of_truth: false
language: it
review_cycle_days: 90
---

# Asset Creation Workflow — 3-path canonical

Guida operativa per creare/acquisire asset visivi per Evo-Tactics nel rispetto della policy `docs/core/43-ASSET-SOURCING.md` (zero-cost + indemnification + human authorship layer).

3 path canonici, applicabili in parallelo o sequenza. Tutti compatibili con build pubblica + license commerciale.

## Workspace locale (out-of-repo)

Reference asset library + tools vivono **fuori repo** in `~/Documents/evo-tactics-refs/` (mai sync con repo Game, gitignore by design — vedi `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md`).

Bootstrap pattern (~30-60 min download bandwidth):

1. Crea folder: `mkdir -p ~/Documents/evo-tactics-refs/{tools-install,references,output-staging,session-logs}`
2. Genera URL lists per fonte (Kenney pack URLs scraped da `kenney.nl/assets/<slug>`, HF dataset via `huggingface.co/api/datasets/nyuuzyou/OpenGameArt-CC0/tree/main`, Sonniss bundles via `archive.org/metadata/<id>`).
3. Run robust download script con verify+retry+size-check (canonical helper in workspace).
4. Estrai pack rilevanti per workflow Path 1 (esistenti) o Path 2 (placeholder AI) o Path 3 (reference + redraw).

**Vincoli workspace**:

- ❌ Mai committare reference asset locali a repo (DMCA fastlane on public repo)
- ❌ Mai sync workspace via cloud Drive condiviso
- ✅ License coverage 100% (CC0 + PD + Sonniss royalty-free perpetual + tool licenses GPL/MIT/Apache2)
- ✅ MANIFEST.json file-level index searchable
- ✅ Workflow recipes per Skiv portrait/run cycle/echolocation/idle vocal/combat roar in workspace HANDOFF.md

Asset finali polished → copy a `Game/assets/<category>/` + provenance log mandatory `CREDITS.md`.

## Path 1 — Kenney / itch.io CC0 base + modifica

**Quando**: asset standard riconoscibili (icone UI, tile dungeon, creature low-poly, sprite generici).

**Vantaggio**: license CC0 esplicita "modify + commercial OK". Zero rischio legale. Velocissimo.

**Steps**:

1. Browse fonti CC0 verificate:
   - [Kenney.nl](https://kenney.nl) — pack CC0 organizzati per genere (asset tier-1 progetto)
   - [itch.io free assets](https://itch.io/game-assets/free) — filter "Creative Commons" / "Public Domain"
   - [OpenGameArt](https://opengameart.org) — filter license CC0 (verifica per-asset, mixed license)
   - [Quaternius](https://quaternius.com) — CC0 low-poly 3D
   - [Poly Pizza](https://poly.pizza) — CC0 3D models
   - [3dtextures.me](https://3dtextures.me) — CC0 PBR textures (utile per scale/skin/dirt creature)
   - [ambientCG](https://ambientcg.com) — CC0 PBR materials

2. Download pack rilevante. Verifica license CC0/CC-BY (CC-BY richiede attribution, ok).

3. Importa in Aseprite/Krita/Blender. Modifica liberamente:
   - Palette swap per allineare a `docs/core/41-ART-DIRECTION.md`
   - Crop / recompose per layout encounter
   - Layer aggiunte (highlight, shadow, FX overlay)

4. Export PNG/SVG nel target path repo (`assets/hud/`, `assets/catalog/`, ecc.)

5. **Provenance entry** in `CREDITS.md`:

   ```
   - Source: Kenney.nl Tiny Dungeon pack v1.2 (CC0)
   - Modified: palette swap to Evo-Tactics #N1-#N6, layer composition
   - Asset paths: assets/hud/icon-attack.png, ...
   ```

6. Commit con message standard: `assets: add Kenney-derived HUD icons (CC0)`.

## Path 2 — Retro Diffusion AI + human edit

**Quando**: asset custom non disponibili in CC0 pack (creature uniche tipo Skiv, biome specifici, FX particolari).

**Vantaggio**: license enterprise indemnified (ToS Retro Diffusion). Output custom-fit. Veloce a iterare.

**Steps**:

1. Login a Retro Diffusion (account enterprise tier per indemnification).

2. Compose prompt rispettando `docs/core/41-ART-DIRECTION.md`:
   - Style: "naturalistic stylized pixel art, 32x32, palette earthy desaturated"
   - Subject: descrizione anatomy/persona
   - **NO style replication artisti viventi** (vedi ADR-2026-04-18 jailbreak risk).
   - **NO image-to-image da reference proprietary**. Solo text-to-image o img2img da CC0/own work.

3. Genera batch 10 varianti. Pick 1-3 candidati.

4. Apri in Aseprite. **Human authorship layer obbligatorio**:
   - Cleanup pixel-level (palette lock, anti-AI artifact)
   - Polish silhouette (AI tende a dettagli inconsistenti)
   - Add details specifici (lore-relevant es. Skiv dune-pattern stripes)
   - Allinea palette a project tokens

5. Export + provenance:

   ```
   - Source: Retro Diffusion enterprise (indemnified ToS)
   - Prompt: "creature stile naturalistic stylized..."
   - Human edit: 30+ min cleanup, palette lock, silhouette polish
   - Asset paths: assets/catalog/skiv-portrait.png
   ```

6. Commit: `assets: add Skiv portrait (Retro Diffusion + human-edited)`.

## Path 3 — Reference + redraw fresh from scratch

**Quando**: anatomy/proporzioni/posing complessi che richiedono studio (es. quadruped run cycle, wing fold mechanics, parallax landscape composition).

**Vantaggio**: output 100% original (idea/expression dichotomy giuridica). Zero rischio.

**Steps**:

1. Raccolta reference:
   - **Foto natura** (Wikimedia Commons CC0/CC-BY, Unsplash CC0, Pexels CC0)
   - **Anatomy book** (Animal Anatomy for Artists Goldfinger, ecc.) — studio mentale, no scan/import
   - **Reference legali ammessi**: video documentari natura, photo own, museum collections public domain
   - Asset commercial games come reference **solo se license owned + studio mentale fuori dal canvas Aseprite**

2. **Studio fase**:
   - Aprire reference in viewer separato (non Aseprite)
   - Studiare: anatomy points (joint locations, muscle volumes), proporzioni rapport (head-body ratio), palette logic (light/shadow direction)
   - Sketch mentali / appunti su note app
   - **Chiudere file reference**

3. **Redraw fresh**:
   - Apri Aseprite con canvas vuoto target dimension (32x32, 64x64, 128x128)
   - Costruisci da silhouette → forme grezze → dettagli
   - Forme tue, palette tua, posing tuo
   - Applica lessons studied senza copy

4. Iterate finché soddisfa `41-ART-DIRECTION` style guide.

5. Provenance:

   ```
   - Source: original work
   - Inspired by: anatomy study from Wikimedia Commons photos (creature genus), Goldfinger Animal Anatomy
   - Asset paths: assets/catalog/dune-walker-runcycle.png
   ```

6. Commit: `assets: add dune-walker run cycle (original art)`.

## Cross-path tips

- **Path 1 + 2 ibrido**: prendi base Kenney CC0, processa con Retro Diffusion img2img per style transfer, finalizza con human edit. Triple-source provenance, all'indemnified.
- **Path 3 dopo Path 1**: usa Kenney come blocking, redraw da scratch sopra il blocking come "reference legitimate" (sei tu owner del blocking).
- **Path 2 + 3**: AI genera concept exploration, scegli direzione, redraw fresh fuori da AI output per output 100% human.

## Cosa NON fare (compliance check)

- ❌ Trace su sprite proprietary (anche layer separato)
- ❌ Paint-over modify-and-export da fan-rip
- ❌ AI img2img da asset proprietary
- ❌ Style prompt che cita artisti viventi ("in style of [Living Artist Name]")
- ❌ Asset da `spriters-resource.com` / `vg-resource.com` / `models-resource.com`
- ❌ Skip provenance log in `CREDITS.md`

## Provenance log mandatory

Ogni asset shipping → entry in `CREDITS.md` con:

- Source (CC0 pack URL, AI service + ToS link, "original work")
- Modifications applied
- Asset paths repo
- Date

Senza provenance entry → CI lint fail (validator path TBD, manual gate per ora).

## Cross-ref

- Policy canonical: [`docs/core/43-ASSET-SOURCING.md`](../core/43-ASSET-SOURCING.md)
- Art direction: [`docs/core/41-ART-DIRECTION.md`](../core/41-ART-DIRECTION.md)
- Style guide UI: [`docs/core/42-STYLE-GUIDE-UI.md`](../core/42-STYLE-GUIDE-UI.md)
- ADR zero-cost: [`docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md`](../adr/ADR-2026-04-18-zero-cost-asset-policy.md)
- Provenance log: [`CREDITS.md`](../../CREDITS.md)
