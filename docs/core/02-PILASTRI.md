---
title: Pilastri di Design (canonical 6-pilastri)
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: '2026-04-28'
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Pilastri di Design — canonical 6-pilastri (P1-P6)

> **Rev 2026-04-27 (Sprint v3.5).** Reconciliation di 3 set storicamente in conflitto:
>
> - Canvas A originale → 4 pilastri (Cooperazione situazionale / Mutazione significativa / Telemetria visibile / Narrazione reattiva).
> - Vecchio `02-PILASTRI.md` → 5 pilastri (FFT-like + Spore-like + Dual identity + Temperaments + Co-op).
> - V3 canonical decisions 2026-04-26 → 6 pilastri (P1-P6).
>
> **Decisione formal**: i 6 pilastri P1-P6 sono **canonical** (vedi
> [`ADR-2026-04-27-pilastri-canonical-6.md`](../adr/ADR-2026-04-27-pilastri-canonical-6.md)).
> Canvas A 4-pilastri è **historical baseline** (utile per intent originario, NON canonical).

## I 6 pilastri canonical

1. **P1 — Tattica leggibile** (FFT-like): iniziativa, posizionamento, altezze, facing,
   reazioni. Core meccanico: `d20 + MoS + AP budget + reactions first-class`. Ref hub:
   [`docs/hubs/combat.md`](../hubs/combat.md), ADR-2026-04-15.

2. **P2 — Evoluzione emergente** (Spore-like): tratti, morfologie e job **sbloccati da
   comportamenti**. Pattern proven: Wesnoth advancement tree + AI War pack unlock.
   **NON** Spore sim continuo runtime (anti-pattern UO 2000). Ref:
   [`docs/core/PI-Pacchetti-Forme.md`](PI-Pacchetti-Forme.md), M12 Form evolution engine.

3. **P3 — Identità doppia** (Specie × Job): biologia (specie) × ruolo (job/classe) →
   sinergie e counter chiari. 84 specie YAML + 7 job canonical + 4 archetype resistenza.
   Ref: progression system M9-M10, [`docs/hubs/dataset-pack.md`](../hubs/dataset-pack.md).

4. **P4 — Temperamenti giocati** (MBTI/Ennea): VC → profilo MBTI-like + temi Ennea-like
   come **telemetria ludica**. Reveal diegetico post-encounter (Disco Elysium pattern).
   Engine: 4 MBTI canonical (E_I/S_N/T_F/J_P). UI surface: 5 axes player-felt
   (Simbiosi/Predazione, Esplorativo/Cauto, Agile/Robusto, Solitario/Sciame,
   Memoria/Istinto). Ref: [`docs/planning/2026-04-26-v3-canonical-flow-decisions.md §1.2`](../planning/2026-04-26-v3-canonical-flow-decisions.md).

5. **P5 — Co-op vs Sistema** (TV condivisa): 4-8 player collaborativi vs antagonista AI
   data-driven. Pattern proven: Jackbox room-code WebSocket (M11 LOCKED). Ref:
   ADR-2026-04-20 m11-jackbox.

6. **P6 — Fairness**: budget morfologico, cap sugli stack, counter espliciti, damage
   scaling curves per encounter class (ADR-2026-04-20), verdict harness GREEN/AMBER/RED,
   timeout=defeat per force decision pressure (M9 P6 ADR-2026-04-20). MMR per stile/build
   post-MVP. Ref: [`docs/planning/2026-04-20-pilastri-reality-audit.md`](../planning/2026-04-20-pilastri-reality-audit.md).

## Stato runtime — vedi doc dedicato

> **Single SOT runtime** (post drift audit 2026-04-28): lo stato live runtime dei 6 pilastri vive in [`docs/reports/PILLAR-LIVE-STATUS.md`](../reports/PILLAR-LIVE-STATUS.md) — bump frequency: ad ogni sprint shipped (volatile).
>
> Questo doc (`02-PILASTRI.md`) rimane **canonical design spec** dei 6 pilastri (stable). Bump frequency: ad ogni release o ridefinizione design (mese cadence).
>
> Pattern: separazione spec stable + runtime volatile (Opzione B drift audit).

**Snapshot ultima verifica** (2026-04-28, post sprint α/β/γ/δ + Skiv personal sprint):

|  #  | Pilastro             |  Stato   |
| :-: | -------------------- | :------: |
|  1  | P1 Tattica leggibile | 🟢 def++ |
|  2  | P2 Evoluzione        | 🟢 def++ |
|  3  | P3 Specie × Job      |   🟡++   |
|  4  | P4 Temperamenti      |  🟢 def  |
|  5  | P5 Co-op vs Sistema  | 🟢 cand  |
|  6  | P6 Fairness          |    🟢    |

Score: **5/6 🟢 def + 1/6 🟡++ (P3)**. Demo-ready confirmed.

Per dettaglio per-pillar + delta history + cross-link PR sprint, consulta [`PILLAR-LIVE-STATUS.md`](../reports/PILLAR-LIVE-STATUS.md).

## Rapporto con baseline storiche

### Canvas A (4 pilastri originali) — historical baseline

I 4 pilastri Canvas A non scompaiono: vivono **dentro** i 6 P1-P6 come componenti
trasversali. Mapping informativo:

| Canvas A                  | P1-P6 mapping                                                   |
| ------------------------- | --------------------------------------------------------------- |
| Cooperazione situazionale | P5 (Co-op vs Sistema) + P1 (reactions/positioning)              |
| Mutazione significativa   | P2 (Evoluzione emergente) + P3 (Specie × Job identity)          |
| Telemetria visibile       | P4 (Temperamenti come telemetria ludica) + P6 (verdict harness) |
| Narrazione reattiva       | P5 (Sistema antagonist AI) + P4 (Disco Elysium reveal diegetic) |

Riferimento: [`docs/appendici/A-CANVAS_ORIGINALE.md`](../appendici/A-CANVAS_ORIGINALE.md).

### Vecchio 02-PILASTRI 5-pilastri — superseded

Il set 5-pilastri (pre-2026-04-20) mancava P6 Fairness esplicito. Audit
2026-04-20 ha rivelato fairness era critical missing. Set 6-pilastri lo include
come dimensione separata (prima era implicito in P1+P3).

## Authority

Doc è **A3 source-of-truth** per i pilastri.

In conflitto vince:

- ADR / hub canonico per scope architetturale (vedi [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md)).
- Core data / schema per numeri.
- Questo doc per identità dei pilastri canonical.

## Documenti correlati

- [`ADR-2026-04-27-pilastri-canonical-6.md`](../adr/ADR-2026-04-27-pilastri-canonical-6.md) — decisione formal.
- [`docs/core/DesignDoc-Overview.md`](DesignDoc-Overview.md) — overview design (allineato 6-pilastri).
- [`docs/planning/2026-04-26-v3-canonical-flow-decisions.md`](../planning/2026-04-26-v3-canonical-flow-decisions.md) — V3 decisions session.
- [`docs/planning/2026-04-20-pilastri-reality-audit.md`](../planning/2026-04-20-pilastri-reality-audit.md) — audit reality vs claims.
- [`docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md`](../planning/2026-04-20-strategy-m9-m11-evidence-based.md) — roadmap closure.
- [`docs/appendici/A-CANVAS_ORIGINALE.md`](../appendici/A-CANVAS_ORIGINALE.md) — historical Canvas A.
