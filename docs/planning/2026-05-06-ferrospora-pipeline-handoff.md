---
title: 'Ferrospora image pipeline — handoff per Game-Godot-v2 Sprint M.3'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - docs/planning/2026-04-29-master-execution-plan-v3.md
  - docs/core/41-ART-DIRECTION.md
  - docs/guide/asset-creation-workflow.md
  - docs/archive/2026-05-04-legacy-claude-code-packet/README.md
---

# Ferrospora image pipeline — handoff Game-Godot-v2 Sprint M.3

## Status

DRAFT — handoff per Sprint M.3 Godot asset import. Pacchetto sourced 2026-05-04, archived qui per provenance.

## Origine

Pacchetto `ferrospora_image_pipeline_decision_pack_v1.zip` (12KB, 18 file) prodotto 2026-05-04. Target = `Game-Godot-v2` repo (NOT this Game/ repo).

Original zip preservato in `~/Desktop/Asset gen/ferrospora_image_pipeline_decision_pack_v1.zip` (path PC-locale, NOT in repo).

## Scope

Pipeline manuale image generation per **Ferrospora UI Art Pass v1** (combat panels + board overlays + CT medallions + forecast panel + unit info panel).

**Workflow** (zero billing API extra):

1. **Codex** prepare/aggiorna queue JSON in `docs/godot-v2/artstyle/ferrospora/generation_queue/`
2. **ChatGPT Pro** genera immagini finali (qualità + iterate stile)
3. PNG drop in `artifacts/ferrospora_image_intake/`
4. **Codex** validate via `python tools/art_pipeline/validate_intake_assets.py`
5. **Codex** contact sheet via `python tools/art_pipeline/build_contact_sheet.py`
6. **Master DD** approva
7. **Codex** promote via `python tools/art_pipeline/promote_approved_assets.py --queue <queue.json>`
8. **Claude Code Max** review tecnica + refactor + guardrail check
9. PR piccola

**Vincoli**:

- Asset singolo + centrato + trasparente + senza testo + production-ready
- NON sheet da croppare
- NON modificare `RoundOrchestrator`
- NON creare `RitualAction`
- Preservare `HudView.action_selected(action_type: String)`
- Evitare `ANTHROPIC_API_KEY` se vuoi restare nel piano Claude Max

## Quando deploy in Game-Godot-v2

**Trigger condition**: Sprint M.3 asset import live (post-Sprint M.1 Godot bootstrap completato).

**Plan v3 reference**: [`docs/planning/2026-04-29-master-execution-plan-v3.md §FASE 2 Sprint M.3`](2026-04-29-master-execution-plan-v3.md).

**Drop sequence**:

```bash
cd /path/to/Game-Godot-v2
unzip ~/Desktop/Asset\ gen/ferrospora_image_pipeline_decision_pack_v1.zip
# Crea cartelle:
#   docs/godot-v2/artstyle/ferrospora/{*.md, generation_queue/, prompt_templates/}
#   tools/art_pipeline/{validate_intake_assets.py, build_contact_sheet.py, promote_approved_assets.py}
#   artifacts/ferrospora_image_intake/
#   artifacts/ferrospora_review/
#   artifacts/ferrospora_approved_assets/
git checkout -b feat/sprint-m3-ferrospora-pipeline
git add docs/godot-v2/artstyle/ferrospora/ tools/art_pipeline/ artifacts/ferrospora_*/
git commit -m "feat(art-pipeline): Sprint M.3 Ferrospora image pipeline drop-in"
gh pr create
```

## Compatibilità con asset workflow esistente

Allineato a:

- `docs/guide/asset-creation-workflow.md` (PR [#2011](https://github.com/MasterDD-L34D/Game/pull/2011) Path 1+2+3+4)
- Workspace locale `~/Documents/evo-tactics-refs/` 184GB (PR [#2014](https://github.com/MasterDD-L34D/Game/pull/2014))
- `docs/core/41-ART-DIRECTION.md §Job-to-shape silhouette spec` (sessione 2026-05-06 closure bundle PR [#2069](https://github.com/MasterDD-L34D/Game/pull/2069))

**Bonus value**: tools Python `~100 LOC totali` immediately reusable cross-asset (non solo Ferrospora). Pattern queue+intake+validate+contact_sheet+promote applicabile a qualsiasi pass UI art.

## Asset queue iniziali (preview)

Pacchetto include 3 queue JSON pronte per Sprint M.3:

| Queue file               | Scope                                                          | Asset count atteso |
| ------------------------ | -------------------------------------------------------------- | ------------------ |
| `board_overlays_v1.json` | Tactical board overlay (path preview, AOE shape, range circle) | TBD                |
| `combat_panels_v1.json`  | Combat HUD panels (action dock, intent display, status bar)    | TBD                |
| `ct_medallions_v1.json`  | CT bar medallion (initiative + lookahead 3-turn FFT-style)     | TBD                |

5 prompt templates inclusi per qualità coerente:

- `board_overlay.md`
- `combat_panel.md`
- `ct_medallion.md`
- `forecast_panel.md`
- `unit_info_panel.md`
- `universal_style_block.md` (style block riusabile)

## Decisioni preserve

Pacchetto v1 documenta 7 decisioni canonical:

1. ChatGPT Pro = generazione finale (qualità)
2. Codex = organize + manifest + queue + validation + integrazione
3. Claude Code Max = review tecnica + refactor + guardrail
4. Open WebUI / ComfyUI / Automatic1111 = opzionali locali (sperimentazione)
5. NO API immagini paid extra (escluso billing)
6. Asset metodo: singolo + centrato + trasparente + sento testo
7. Pipeline naming: `validate → contact_sheet → promote`

## Anti-pattern check

- ❌ Generare sheet grandi e croppare → asset singoli centrati only
- ❌ ChatGPT con label/testo → senza testo
- ❌ Modificare RoundOrchestrator runtime → preservato
- ❌ Creare RitualAction senza spec → blocked
- ❌ Importare YAML legacy direct (vedi NO_DIRECT_IMPORT_POLICY companion archive)

## Reversibility

Pipeline è purely additive (nuove cartelle + Python tools standalone). Reversibile via `git revert` Game-Godot-v2 PR. Asset generati in `artifacts/` rimovibili senza side-effect runtime.

## Companion archive

Companion legacy packet archived in [`docs/archive/2026-05-04-legacy-claude-code-packet/`](../archive/2026-05-04-legacy-claude-code-packet/README.md) (audit reference + workflow templates).
