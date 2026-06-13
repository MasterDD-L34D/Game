---
title: Sprint 2026-04-18 M3.6 — Art direction + Style guide canonical
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Sprint 2026-04-18 M3.6 — Art direction + Style guide canonical

**Sessione autonoma** post-M3.5. Closes ADR-2026-04-18 art direction placeholder DRAFT → ACCEPTED e canonicizza direzione visiva + design tokens UI + encounter visual_mood metadata + lint tool.

## Scope delivered

6 PR sequenziali (tutti docs/schema/tools, zero code change runtime):

| #   | Lane                        | PR                                                                                               | Size LOC | Status  |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------ | :------: | :-----: |
| 1   | ADR accept                  | [#1577](https://github.com/MasterDD-L34D/Game/pull/1577) — art-direction DRAFT → ACCEPTED        |   ~39    | 🟡 open |
| 2   | Canonical art direction     | [#1578](https://github.com/MasterDD-L34D/Game/pull/1578) — docs/core/41-ART-DIRECTION.md         |   ~212   | 🟡 open |
| 3   | Canonical style guide UI    | [#1579](https://github.com/MasterDD-L34D/Game/pull/1579) — docs/core/42-STYLE-GUIDE-UI.md        |   ~342   | 🟡 open |
| 4   | Encounter schema + retrofit | [#1580](https://github.com/MasterDD-L34D/Game/pull/1580) — visual_mood + 9 encounter             |   ~81    | 🟡 open |
| 5   | Styleguide lint             | [#1581](https://github.com/MasterDD-L34D/Game/pull/1581) — tools/py/styleguide_lint.py + 10 test |   ~432   | 🟡 open |
| 6   | Sprint close                | (this PR) — sprint doc + memory                                                                  |   ~150   | 🟡 open |

**Totale net**: ~1256 LOC (docs 593, schema+data 81, tools 432, sprint 150).

## Obiettivo + rationale

User ha chiesto "continuare con stesso criterio per grafica e contenuti di stile" post-M3.5 (wire G+H + Pilastro 1 coverage, 5 PR merged).

GDD audit (reference_gdd_audit memory) identifica **3 gap critici**: levels (coperto post-M3.5), **art direction** (questo sprint), audio (deferred).

Open Questions GDD (28 totali, SoT v4) aveva **7 BLOCKED** pre-M3.6 — 3 risolti qui.

## ADR acceptance — #1577

ADR-2026-04-18 art-direction-placeholder: DRAFT → **ACCEPTED**.

- Direzione: "naturalistic stylized" implementata in pixel art (Into the Breach + AncientBeast ref)
- 4 pillars: leggibilità tattica, specie come carattere, biomi atmosferici, TV-first
- Registry entry aggiunto (governance drift fix — ADR non era registered)

## Canonical 41-ART-DIRECTION.md — #1578

Promuove `docs/planning/draft-art-direction.md` (con decisione pixel art 2026-04-16) in `docs/core/41-ART-DIRECTION.md` (source_of_truth: true).

Contenuto:

- 4 pillars visivi dettagliati
- Implementazione pixel art (32×32 tile, 10-16 frame sprite, palette indexed, integer upscaling)
- Silhouette language 7 job (vanguard/skirmisher/assassin/support/scout/controller/civilian)
- **Palette matrix 9 biomi shipping** (savana/caverna/foresta_acida/foresta_miceliale/rovine_planari/frattura_abissale_sinaptica/reef_luminescente/abisso_vulcanico/steppe_algoritmiche) con HEX + accent + mood + light direction
- 10 colori funzionali universali (faction, selezione, AoE, path, status, crit, heal)
- UI hierarchy 6 livelli
- Accessibility gate (colorblind, contrast, scale S/M/L, screen reader)
- Asset commission spec MVP per freelance (tileset + sprite + icon + UI mockup + particles)

## Canonical 42-STYLE-GUIDE-UI.md — #1579

Design tokens + component patterns canonici (complement a 41-AD visual identity).

- Colors: 10 semantic + 6 surface + 4 text + 4 state (contrast ratio spec)
- Typography: Inter/Noto Sans, 8 scale TV-first (14px..72px), 4 weight
- Spacing base 4px, 11 token
- Radius 6 token, Shadows 6 token
- Icon grid (16/24/32/48, stroke ≥2px)
- Component patterns: button, card, tooltip, modal, unit card
- Accessibility WCAG 2.1 AA gate
- Responsive breakpoints (tv-1080p target MVP, tv-4k integer 2x)
- Motion duration 150-500ms + reduced-motion respected
- Z-index scale 9 token

## Encounter visual_mood — #1580

Schema `encounter.schema.json` estende con `visual_mood` object opzionale (ref 41-AD palette matrix).

4 field: `mood_tag`, `lighting`, `particle_effect`, `accent_override` (hex).

Retrofit 9 encounter YAML con visual_mood appropriato al bioma.

Runtime no-op: consumato solo da art tools + future renderer. Backward compat.

## Styleguide lint tool — #1581

`tools/py/styleguide_lint.py` — linter Python cross-document consistency.

5 check rules (hex validity, functional color parity, encounter mood_tag, lighting, accent_override). Exit 0/1/2. JSON output opzionale. 10/10 unit test pass.

## Q-OPEN chiuse

| Q-OPEN | Topic              | Decisione                          |
| ------ | ------------------ | ---------------------------------- |
| 15     | Stile creature     | naturalistic stylized pixel art    |
| 19     | Palette biomi      | matrix 9 biomi shipping (41-AD)    |
| 22     | UI visual language | flat + alto contrasto + TV-first   |
| 26     | Typography scale   | 8 token text-xs..text-hero (42-SG) |
| 27     | Spacing system     | base 4px, 11 token (42-SG)         |

**5 Q-OPEN chiuse sessione M3.6**.

## Q-OPEN residue post-M3.6

- Q-OPEN-15b: budget frame specie evoluta T3 — blocked su artist onboard
- Q-OPEN-19b: palette 11 biomi non-shipping — blocked su commission
- Q-OPEN-25: day/night cycle — blocked su playtest visual
- Q-OPEN-26b: icon set definitivo (Lucide vs custom) — attesa artist
- Q-OPEN-27b: light mode UI (MVP-off, deferred)

## Memo guardrail rispettati

- Regola 50 righe: tutti PR docs/schema/tools, zero apps/backend code
- Nessun file in `.github/workflows/`, `migrations/`, `services/generation/` toccato
- `packages/contracts/schemas/` non toccato (visual_mood è in `schemas/evo/encounter.schema.json` standalone)
- Trait: zero modifica
- Nessuna dipendenza npm nuova (PyYAML già in `tools/py/requirements.txt`)

## Test delta sessione

| Suite                    | Pre | Post |                   Δ                   |
| ------------------------ | :-: | :--: | :-----------------------------------: |
| encounter schema (node)  | 12  |  12  | 0 (stessi 9 encounter, schema esteso) |
| styleguide lint (python) |  0  |  10  |                  +10                  |
| **Totale sessione**      |  —  |  —   |                  +10                  |

## Pilastro state update

Pilastri di design non cambiano status (tutti già 🟢 post-M3.5). Ma **art direction gap** passa da 🔴 (blocker) a 🟢 (spec-complete, asset commission ancora blocked su budget).

Pre-M3.6: GDD audit gap critico #1 (art) = **TOTAL GAP**.
Post-M3.6: spec-complete, **asset commission ready-for-freelance**.

## Follow-up FU-M3.6-A..D

| ID  | Task                                                             | Blocker                   | Priorità |
| --- | ---------------------------------------------------------------- | ------------------------- | :------: |
| A   | Asset commission freelance (tileset + sprite + icon + UI mockup) | Budget + art lead onboard |    🟢    |
| B   | Palette extension 11 biomi non-shipping                          | Art curator + commission  |    🟡    |
| C   | Moodboard visivo (PNG ref board Aseprite)                        | Master DD tempo           |    🟡    |
| D   | Audio direction ADR (gap critico #3)                             | Audio lead TBD            |    ⚪    |

## Quirks sessione

- `docs/planning/draft-art-direction.md` già molto dettagliato pre-sessione (con decisione pixel art 2026-04-16) → promuovere via copy+enrich, mark draft SUPERSEDED
- 41-AD palette matrix inclusa tutti 9 biomi usati negli encounter shipping — 11 biomi non-shipping deferred
- `docs/frontend/styleguide.md` (EvoGene Deck guide legacy) resta separato — 42-SG SUPERSEDES come canonical ma frontend/styleguide resta ref specifico Mission Console shipping
- Mission Console è pre-built Vue bundle NOT in source: 42-SG tokens sono **spec per future implementation**

## Memory aggiornata

- `project_sprint_m3_6_art_style.md` (nuovo)
- `MEMORY.md` index aggiornato

## Riferimenti

- `docs/adr/ADR-2026-04-18-art-direction-placeholder.md` (ACCEPTED)
- `docs/core/41-ART-DIRECTION.md` (source of truth)
- `docs/core/42-STYLE-GUIDE-UI.md` (source of truth)
- `docs/planning/draft-art-direction.md` (SUPERSEDED)
- supermemory `reference_gdd_audit` — gap critici GDD
- supermemory `project_gdd_open_questions` — 28 open questions
