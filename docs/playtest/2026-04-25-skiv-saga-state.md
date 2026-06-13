---
title: Skiv Saga — Canonical Creature State (2026-04-25)
workstream: cross-cutting
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - skiv
  - canonical-creature
  - saga-seed
  - generated
---

# Skiv Saga — Canonical Creature State

> **Auto-generato** da `tools/py/seed_skiv_saga.py` post-content-sprint #1776.
> Ricompose via `python3 tools/py/seed_skiv_saga.py` ogni volta che cambia
> il catalogo (jobs/mutations/thoughts/species).

```
              ╱\_/\
             (  o.o )    "Sento le 111 trame del mondo.
              > ^ <       Ho la classe del mio nome.
                          Mangio gli artigli vecchi e ne nasco di nuovi."
```

## Identity

| Campo               | Valore                                                |
| ------------------- | ----------------------------------------------------- |
| Unit ID             | `skiv`                                           |
| Species             | `dune_stalker` (Arenavenator vagans / Dune Stalker)   |
| Biome affinity      | `savana` ✓ (resonance ON)                         |
| Job                 | **stalker** Lv 4 (210 / 275 XP)            |
| Previous job        | `skirmisher` (placeholder pre-class-change)       |
| Form (MBTI)         | INTP — T=0.72 · I=0.68 · N=0.22 · P=0.32                  |

## Progression

- Picked perk: `st_r1_marksman` (level 2, choice a)
- Available perks pending (Stalker tree): level 3, 4, 5, 6, 7 (10 perks)

## Thought Cabinet

| Status        | Thought                                | Effect                                                    |
| ------------- | -------------------------------------- | --------------------------------------------------------- |
| Internalized  | `i_osservatore`                        | +1 attack_range / -1 AP turno iniziale                    |
| Internalized  | `n_intuizione_terrena`                 | +1 attack_range (biome) / -1 defense_dc fuori cover       |
| Unlocked      | `n_pioniere_possibile` (tier 2)        | (no effect_bonus assegnato)                               |
| Unlocked      | `p_adattatore` (tier 1)                | +1 AP cambio intent / -1 defense_dc round transizione     |

Slots: 2/3 (1 libero per ricerca futura)

## Mutation acquired

- **`artigli_grip_to_glass`** (tier 2, physiological)
  - trait_swap: `artigli_sette_vie` → `artigli_vetrificati`
  - cost: 12 PE + 7 PI
  - effetto: +1 dmg always → +2 dmg condizionato MoS≥5 (burst trade-off)

## Aspect — fase **mature** (Predatore Maturo)

> Skiv è qui sull'asse di vita. Vedi `data/core/species/dune_stalker_lifecycle.yaml`
> per le 5 fasi totali e i gating di transizione.

```
      /\_/\        *
     (  o.o )       *
      > ^ <
      /|||\
```

Forma adulta consolidata. Gli artigli a sette vie si vetrificano
(mutation artigli_grip_to_glass) → punte trasparenti come ossidiana
che riflettono il sole. Le orecchie hanno scolpito conche per
l'echolocation, visibili come solchi. Il pelo lungo il dorso si è
condensato in una cresta scura. Lo sguardo è fisso, leggero
socchiudere — primo segno di voce interna. Il branco lo riconosce
come predatore-stalker, non più cucciolo.

**Tactical signature**: Stalker Lv 4. Synergy echo_backstab live. Thought Cabinet 2/3 slot.

### Mutation morphology (visual swap applicato)

- **claws_glass** — Le punte degli artigli si vetrificano: trasparenza ossidiana riflettente sole. Lascia tracce iridescenti nella sabbia.
- phase_unlock: `mature`

### MBTI form correlates attivi

- **I_high** — Postura chiusa, silenzioso, orecchie verso interno (ricezione).
- **T_high** — Sguardo freddo socchiuso, decisioni rapide post-pause.
- **N_high** — Movimenti sinuosi, scarsa pausa, sembra vedere senza guardare.
- **P_high** — Routine assente; cambia direzione su input minimi.

## Diary timeline (8 events — one per whitelist slot)

| # | Event type | Encounter | Turn | Payload key |
|---|---|---|---|---|
| 1 | `scenario_completed` | enc_savana_alpha | 1 | biome_id, outcome, rounds |
| 2 | `mbti_axis_threshold_crossed` | — | — | axis, from_value, newly_unlocked |
| 3 | `thought_internalized` | enc_savana_beta | 2 | effect_bonus, effect_cost, research_cost |
| 4 | `thought_internalized` | enc_savana_beta | 4 | biome_resonance_eligible, effect_bonus, effect_cost |
| 5 | `job_changed` | — | — | from_job, level, reason |
| 6 | `synergy_triggered` | enc_savana_gamma | 1 | ability, bonus_damage, parts |
| 7 | `defy_used` | enc_savana_gamma | 3 | ap_penalty_next_turn, pressure_after, pressure_before |
| 8 | `mutation_acquired` | — | — | category, mutation_id, pe_cost |

## Score pillars (questo Skiv specifico, post-saga)

| Pillar              | Status      |
| ------------------- | ----------- |
| P1 Tattica          | 🟢+ (synergy echo+claw + alpha_strike combo)  |
| P2 Evoluzione       | 🟢+ (mutation acquired, vetrificati live)     |
| P3 Identità×Job     | 🟢+ (job align con species + 1 perk)          |
| P4 MBTI             | 🟡+ (4 thoughts unlocked, 2 internalized)     |
| P5 Co-op            | 🟡+ (diary persiste cross-session)            |
| P6 Fairness         | 🟢 (1 Defy usato a Critical → Escalated)      |

## Replay

```bash
python3 tools/py/seed_skiv_saga.py --out-dir tmp/
diff data/derived/skiv_saga.json tmp/skiv_saga.json   # deterministic
```
