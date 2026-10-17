---
title: Spike POC BG3-lite Tier 1 — Rubric Aggregator 2026-04-29
workstream: ops-qa
status: active
owner: master-dd
last_review: 2026-04-29
tags: [playtest, spike, bg3-lite, gate-decision, rubric]
---

# Spike POC BG3-lite Tier 1 — Rubric 2026-04-29

Decision-binary gate go/no-go per Sprint G.2b BG3-lite Plus ~10-12g commitment.

## 1. Scope

Spike POC **Tier 1 only** su encounter `enc_tutorial_01`. Branch `spike/bg3-lite-prototype-2026-04-29` (PR pending).

**Tier 1 (in scope ~6-7h frontend)**:

- Hide grid lines (`bg3lite_hide_grid`)
- Smooth movement bezier easing (`bg3lite_smooth_movement`, cubic-bezier 0.4/0/0.2/1, 250ms)
- Range cerchio gradient ambra warm + pulse breathing (`bg3lite_range_circle`)
- AoE shape sphere/blast radial (`bg3lite_aoe_shape`)
- Movement zone arc cerchio gradient ciano (`bg3lite_movement_zone_arc`)

**Tier 2 (DEFERRED full G.2b post-spike-pass)**:

- Sub-tile positioning float (continuous coords)
- vcScoring float dimensions (no rounding)
- Flanking 5-zone angle direzionale
- Synthetic test 10 scenari hardcoded vcScoring

## 2. Tester pool

**4 amici DIVERSI da TKT-M11B-06 pool** — preserva tester fresh per playtest userland post G.2b ship.

| Tester | Background | Disponibilità |
| ------ | ---------- | ------------- |
| T1     | TBD        | TBD           |
| T2     | TBD        | TBD           |
| T3     | TBD        | TBD           |
| T4     | TBD        | TBD           |

Master-dd compila tabella post-recruitment.

## 3. Rubric 4-criteria (1-5 scale)

Ogni tester valuta **1-5 per ogni criterio** dopo run side-by-side toggle pre/post.

### 3.1 Movement smoothness

- **1**: jerky snap-to-tile-center, no easing visibile, scatti netti
- **2**: easing minima ma percepibile rigid linear
- **3**: ease-out ok ma non "BG3-tier"
- **4**: smooth curva visibile, lieve micro-stutter
- **5**: BG3-tier curve smooth, zero stutter, sensazione "pesante naturale"

### 3.2 Range readability

- **1**: confuso, non chiaro dove può attaccare
- **2**: cerchio visibile ma boundary fuzzy
- **3**: ok, leggibile dopo 1-2s scan
- **4**: immediately clear, gradient guida occhio
- **5**: BG3 / Pillars Eternity tier — istantaneo, edge ring nitido

### 3.3 Combat feel "2024 RPG"

- **1**: pre-2000 console (FFT PSX feel)
- **2**: 2005-2010 indie tactical
- **3**: middle-of-pack 2015-2020 indie
- **4**: BG3-adjacent (Pillars / Wasteland 3 tier)
- **5**: BG3 / Pathfinder WotR tier feel

### 3.4 Echolocation Skiv lore-faithful

Mantenuto Sprint G v3 override (Skiv = creatura canonical, override LPC sprite + senso radiale).

- **1**: tile rigid 5-cell highlight, "videogioco vecchio"
- **2**: hint radiale ma percepito comunque tile-based
- **3**: ok, non rompe lore ma non rinforza
- **4**: natural sense radiale, allineato lore "sabbia segue"
- **5**: lore-faithful pieno — Skiv senso si "vede" come pulse naturale, non grid

## 4. Threshold pass

**Pass se TUTTE e 3 condizioni verde**:

1. Media aggregata ≥ **3.5** (su 16 score totali = 4 tester × 4 criteri)
2. Zero score **1** singolo (rigetto outlier)
3. Zero criterio con **rigetto unanime ≥3 tester score ≤2**

Se pass → commit Sprint G.2b BG3-lite Plus full (~10-12g, Tier 2 add-ons).

Se fail → abort Sprint G.2b. Mantieni grid square + Sprint G v3 visual asset swap solo. Ship Sprint I TKT-M11B-06 playtest current state.

## 5. Side-by-side test (A/B toggle)

Master-dd guida tester step-by-step:

1. Apri `apps/play/index.html` browser
2. Edit `apps/play/public/data/ui_config.json`:
   - **Pre (legacy)**: tutti i toggle `false`
   - **Post (BG3-lite Tier 1)**: tutti i toggle `true`
3. Reload page (no cache)
4. Run encounter `enc_tutorial_01` 1 turno completo per condition
5. Switch toggle → reload → ripeti
6. Tester compila score 4-criteria per condition

Toggle keys file `ui_config.json`:

```json
{
  "bg3lite_hide_grid": true|false,
  "bg3lite_smooth_movement": true|false,
  "bg3lite_range_circle": true|false,
  "bg3lite_aoe_shape": true|false,
  "bg3lite_movement_zone_arc": true|false
}
```

## 6. Output verdict — score table

Compila post-session:

| Tester             | Movement | Range | Combat feel | Skiv echolocation |   Media tester   |
| ------------------ | :------: | :---: | :---------: | :---------------: | :--------------: |
| T1                 |    ?     |   ?   |      ?      |         ?         |        ?         |
| T2                 |    ?     |   ?   |      ?      |         ?         |        ?         |
| T3                 |    ?     |   ?   |      ?      |         ?         |        ?         |
| T4                 |    ?     |   ?   |      ?      |         ?         |        ?         |
| **Media criterio** |    ?     |   ?   |      ?      |         ?         | **AGGREGATE: ?** |

## 7. Decision binary

| Condizione                                                      | Verdetto                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| Media ≥ 3.5 + zero score 1 + zero rigetto unanime               | ✅ **PASS** → commit Sprint G.2b BG3-lite Plus full      |
| Media < 3.5 OR ≥1 score 1 OR ≥3 tester score ≤2 stesso criterio | ❌ **FAIL** → abort, keep grid square + Sprint G v3 only |

**Commit Sprint G.2b se PASS**: ~10-12g effort. Tier 2 add-ons (sub-tile positioning + vcScoring float + flanking 5-zone angle).

**Abort se FAIL**: ship Sprint I TKT-M11B-06 playtest userland current state. Mantieni Sprint G v3 (Ansimuz visual + parallax + VFX). Spike learning preserved in `docs/research/2026-04-28-grid-less-feasibility.md` post-mortem.

## 8. References

- ADR canonical: `docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md` §9 Spike POC
- Grid-less feasibility: `docs/research/2026-04-28-grid-less-feasibility.md`
- Sprint G v3 baseline: PR #2002 (Ansimuz tile asset swap shipped)
- Branch: `spike/bg3-lite-prototype-2026-04-29`
- Skiv canonical: `docs/skiv/CANONICAL.md` (override LPC sprite preserved)

## 9. Note operative

- Rubric criteria 1-5 ancorati definizione concreta (NON solo "good/bad" feel) per mitigare drift soggettivo tester
- Threshold media ≥3.5 NON solo mean ma anche zero score 1 + rigetto unanime check (mitiga outlier high pull mean)
- Async submission OK via form se 4 tester non disponibili stesso giorno — master-dd aggrega entro 24-48h post-PR-open
- Subjective drift mitigation: pre-session 5min calibration showing 1-3 reference video clip BG3 / Pillars / FFT per allineare scale
