---
title: Sprint 2026-04-18 M3.10 — Real assets (Flint kill-60 close)
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Sprint 2026-04-18 M3.10 — Real assets (Flint kill-60 close)

**Sessione autonoma close** post-M3.9. Chiude cycle asset end-to-end con both fonti (procedural + community). Flint kill-60 fully enforced.

## Scope delivered

3 PR close sessione:

| #       | Lane                                  | PR                                                                                           |  Status   |
| ------- | ------------------------------------- | -------------------------------------------------------------------------------------------- | :-------: |
| M3.9    | First real SVG icons (Flint trigger)  | [#1597](https://github.com/MasterDD-L34D/Game/pull/1597) — 7 custom SVG                      | ✅ merged |
| M3.10 A | Procedural tile generator             | [#1598](https://github.com/MasterDD-L34D/Game/pull/1598) — Python PIL + 3 tile PNG + 12 test |  🟡 open  |
| M3.10 B | Kenney community guide + sprint close | (this PR)                                                                                    |  🟡 open  |

**Totale M3.9+M3.10**: 7 icon SVG + 3 tile PNG + generator Python + community guide.

## Trigger sessione

**Flint design_hint** post-M3.8: "22 carte geroglifiche scritte, 0 pixel reali. apri Libresprite/Piskel, 1h, 1 asset reale."

User: "non so disegnare, come faccio?"

Risposta: **C+A combo**:

- **A** (Claude Python procedurale): zero skill user, 1 command
- **C** (Community Kenney download): zero skill user, 45 min click+save

## Deliverable M3.9

7 SVG icon custom (faction×3 + action×3 + status×1) in `data/art/icons/`. Shape geometrici, palette 42-SG, zero AI, MIT license.

## Deliverable M3.10 A — Procedural generator

`tools/py/art/generate_tile.py`:

- Palette master 9 biomi shipping (derivati 41-AD)
- 3 pattern (grass/stone/moss)
- PNG-8 indexed palette-locked
- Deterministic RNG hash-based
- CLI `--biome X --variant Y` o `--all`

Output:

- `data/art/tilesets/savana/grass_01.png`
- `data/art/tilesets/caverna_sotterranea/stone_01.png`
- `data/art/tilesets/foresta_acida/moss_01.png`

Tests 12/12 pass (`tests/test_generate_tile.py`).

## Deliverable M3.10 B — Community guide

`docs/playtest/kenney-community-asset-guide.md`:

- 3 pack Tier 1 (Roguelike/RPG, Tiny Dungeon, Pixel Platformer)
- Workflow 7-step download+extract+select+copy+CREDITS+commit+verify
- Naming convention `<type>_kenney_<NN>.png` vs procedural `<type>_<NN>.png`
- Troubleshooting + palette lock optional
- Integration pattern con procedural (both coexist)

## Pipeline zero-cost completa

| Fonte                  |            Input user            |       Output tile        |        Tempo        |        Skill        |
| ---------------------- | :------------------------------: | :----------------------: | :-----------------: | :-----------------: |
| **A. Procedural**      |          1 CLI command           | N tile PNG deterministic |        1 min        |          0          |
| **C. Kenney**          |    Browser click + file copy     | M tile PNG professional  |       45 min        |          0          |
| **AI Retro Diffusion** | Prompt + Libresprite (opzionale) |    Custom biomi niche    |         4h          | medio (Libresprite) |
| **Custom authored**    |      User disegno (Piskel)       |     Unique pixel art     | 14h (playbook M3.8) |        alto         |

**Raccomandazione MVP**: A+C combo = 46 min total, skill zero, 6-12 tile ready.

## Flint kill-60 verdict finale sessione

| Metric              | Pre-sessione | Post-M3.8 |   Post-M3.10    |
| ------------------- | :----------: | :-------: | :-------------: |
| PR docs             |      22      |    22     |       23        |
| SVG icon committed  |      0       |     0     |      **7**      |
| PNG tile committed  |      0       |     0     |      **3**      |
| Python generator    |      0       |     0     | **1** (12 test) |
| Pipeline end-to-end |      ❌      |    ❌     |       ✅        |
| Scope debt          |      🔴      |    🟡     |     **🟢**      |

Flint kill-60 ENFORCED. Pipeline dimostrata con asset reali + zero user-skill path.

## Q-OPEN aggiornati

Tutti Q-OPEN asset-related closable post-M3.10:

- Q-OPEN-15 (stile creature): 🟢 naturalistic pixel (M3.6)
- Q-OPEN-19 (palette biomi): 🟢 matrix 9 biomi (M3.6)
- Q-OPEN-22 (UI language): 🟢 flat + TV-first (M3.6)
- Q-OPEN-26 (typography): 🟢 8 scale (M3.6)
- Q-OPEN-27 (spacing): 🟢 base 4px (M3.6)
- Q-OPEN-21 (stile musicale): 🟢 ambient organic + percussive (M3.8)
- Q-OPEN-24 (SFX): 🟢 ibrido sampled + synth (M3.8)
- Q-OPEN-19b (palette non-shipping): 🟢 AI gap-fill disponibile (M3.7) → ora zero-cost path aperto via procedural

**10 Q-OPEN closed sessione totale** (pre-sessione: 17 blocked → post: 7 residue).

## Follow-up FU-M3.10

| ID  | Task                                                      | Blocker                         | Priorità |
| --- | --------------------------------------------------------- | ------------------------------- | :------: |
| A   | User run Kenney guide (45 min, Tier 1 pack)               | User tempo                      |    🟢    |
| B   | Estendere procedural patterns (sand, water, crystal)      | Algorithm design                |    🟡    |
| C   | Sprite character procedural (stick-figure → naturalistic) | Algorithm complex               |    ⚪    |
| D   | Audio MVP slice (freesound + Bfxr)                        | User tempo + audio ADR step 1-2 |    ⚪    |

## Gap GDD status finale

| Gap       | Pre-sessione |                             Post-M3.10                             |
| --------- | :----------: | :----------------------------------------------------------------: |
| #1 Art    |  TOTAL GAP   | **PIPELINE-READY + ASSET-COMMITTED** (7 icon + 3 tile + generator) |
| #2 Audio  |  TOTAL GAP   |       SPEC-COMPLETE + PIPELINE-READY (deferred post-visuale)       |
| #3 Levels | GAP parziale |           SPEC-COMPLETE (M3.5 sprint, 9 encounter YAML)            |

## Memo guardrail rispettati

- Regola 50 righe: tools/py/art/generate_tile.py ~280 LOC (fuori apps/backend, OK)
- Zero touch workflow/migrations/contracts/generation
- Trait: zero modifica
- Nuova dep Python: **Pillow** (già compatibile ecosystem, install-on-demand)
- Governance OK

## Critical path MVP (post-M3.10)

- Art direction: ✅ ASSET-COMMITTED (7 icon + 3 tile reali)
- Audio direction: SPEC-COMPLETE + PIPELINE-READY
- Playtest batch: harness ready (M3.5)
- **Blockers rimasti**: user tempo MVP slice (45 min Kenney) + playtest schedule

## Quirks sessione

- Flint design_hint caveman voice ha triggered course correction decisiva
- User ha chiesto "non so disegnare" → ripensare workflow asset end-to-end
- C+A combo cuts 14h playbook originale a 46 min (zero-skill)
- Pillow install on-demand (Python 3.13 env, `pip install Pillow` 1-shot)
- Deterministic RNG hash per output riproducibile → asset idempotent

## Memory aggiornata

- `project_sprint_m3_9_first_real_assets.md` (nuovo)
- `project_sprint_m3_10_real_tileset.md` (nuovo)
- MEMORY.md index aggiornato

## Riferimenti

- `docs/playtest/kenney-community-asset-guide.md` — guida step-by-step
- `tools/py/art/generate_tile.py` — procedural generator
- `data/art/icons/` — 7 SVG icon
- `data/art/tilesets/` — 3 PNG tile
- `CREDITS.md` — provenance log
- `docs/core/43-ASSET-SOURCING.md` — pipeline canonical
- Flint: `flint/claude-integration/memory/feedback_claude_workflow_consolidated.md` §design_hint
