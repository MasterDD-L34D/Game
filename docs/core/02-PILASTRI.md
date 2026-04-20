---
title: Pilastri di Design (sintesi)
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-20
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Pilastri di Design (sintesi)

Rev 2026-04-20: audit deep rivela P6 era missing + inflation status in CLAUDE.md.
Vedi `docs/planning/2026-04-20-pilastri-reality-audit.md` + `docs/planning/2026-04-20-design-audit-consolidated.md`.

1. **Tattica leggibile** (FFT-like): iniziativa, posizionamento, altezze, facing, reazioni. Core: d20 + MoS + AP budget + reactions first-class.
2. **Evoluzione emergente** (Spore-like): tratti, morfologie e job **sbloccati da comportamenti**. Pattern proven: Wesnoth advancement tree + AI War pack unlock (NON Spore sim continuo).
3. **Identità doppia**: Specie (biologia) × Classe/Job (ruolo) → sinergie / counter chiari. 84 specie YAML + 7 job canonical + 4 archetype resistance.
4. **Temperamenti giocati**: VC → profilo MBTI-like + temi Ennea-like (solo **telemetria ludica**). Reveal diegetico post-encounter (Disco Elysium pattern).
5. **Co-op vs Sistema** (TV condivisa): 4-8 player collaborativi vs antagonista AI data-driven. Pattern proven: Jackbox room-code WebSocket (M11 LOCKED).
6. **Fairness**: budget morfologico, cap sugli stack, counter espliciti, damage scaling curves per encounter class (ADR-2026-04-20), verdict harness GREEN/AMBER/RED, timeout=defeat per force decision pressure (M9 P6 ADR-2026-04-20). MMR per stile/build post-MVP.

## Stato runtime (2026-04-20)

|  #  | Pilastro              | Stato | Vedi                                                         |
| :-: | --------------------- | :---: | ------------------------------------------------------------ |
|  1  | Tattica leggibile     |  🟢   | `docs/hubs/combat.md`, ADR-2026-04-15                        |
|  2  | Evoluzione emergente  |  🟡   | Meta-prog in-memory, persistence M10; evolution runtime M12+ |
|  3  | Identità Specie × Job |  🟡   | Progression system M9-M10                                    |
|  4  | Temperamenti          |  🟡   | T_F full, E_I/S_N/J_P partial (M9)                           |
|  5  | Co-op vs Sistema      |  🟡   | Focus-fire combo live, network multi-client M11              |
|  6  | Fairness              |  🟡   | Hardcore M9 P6 fix shipped, iter8 validate pending           |

Score: 1/6 🟢 + 5/6 🟡 (nessun 🔴). Roadmap closure `docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md`.
