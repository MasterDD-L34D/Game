---
title: 'ADR-2026-04-27: Pilastri canonical — 6-pilastri (P1-P6) wins'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-27
source_of_truth: false
language: it-en
review_cycle_days: 30
related:
  - docs/core/02-PILASTRI.md
  - docs/core/DesignDoc-Overview.md
  - docs/appendici/A-CANVAS_ORIGINALE.md
  - docs/planning/2026-04-26-v3-canonical-flow-decisions.md
  - docs/planning/2026-04-20-pilastri-reality-audit.md
---

# ADR-2026-04-27: Pilastri canonical — 6-pilastri (P1-P6) wins

- **Data**: 2026-04-27
- **Stato**: Accepted
- **Owner**: Master DD + Platform Design
- **Stakeholder**: Tutti i workstream (governance, gameplay, ops/QA, design docs)

## 1. Contesto

Il repo aveva storicamente **3 set di pilastri di design in conflitto**, con
nessuno dichiarato canonical formalmente:

| Set                                       | Origine                                                      | Forma      |
| ----------------------------------------- | ------------------------------------------------------------ | ---------- |
| Canvas A (4 pilastri originali)           | `docs/appendici/A-CANVAS_ORIGINALE.md` — snapshot 2025-10-23 | 4 pilastri |
| Vecchio `02-PILASTRI.md` (5 pilastri)     | docs/core/02-PILASTRI.md (rev 2026-04-20)                    | 5 pilastri |
| V3 canonical decisions (6 pilastri P1-P6) | `docs/planning/2026-04-26-v3-canonical-flow-decisions.md`    | 6 pilastri |

Effetti negativi del conflitto:

- Future agent + collaboratori leggevano set diversi a seconda del file consultato.
- `docs/core/DesignDoc-Overview.md` citava i 4 Canvas A pilastri come canonical.
- `docs/core/02-PILASTRI.md` (post-audit 2026-04-20) usava 6 ma faceva riferimento
  a "5 pilastri vecchi" senza chiarire la transizione.
- `CLAUDE.md` operava su 6 pilastri P1-P6 ma senza una source-of-truth scritta.

L'ottimizzazione doc V2 inspect (Sprint v3.5) ha esposto il conflitto come
top-3 critical addition.

## 2. Decisione

I **6 pilastri P1-P6** sono il **set canonical** di design del progetto. In
caso di conflitto, vincono su Canvas A 4 e su 5-pilastri legacy.

### Set canonical accettato (P1-P6)

1. **P1 — Tattica leggibile** (FFT-like): d20 + MoS + AP + reactions first-class.
2. **P2 — Evoluzione emergente** (Spore-like, advancement Wesnoth + pack unlock AI War).
3. **P3 — Identità doppia**: Specie × Job (84 specie × 7 job × 4 archetype resistenza).
4. **P4 — Temperamenti giocati**: VC → MBTI/Ennea telemetria ludica + reveal diegetic.
5. **P5 — Co-op vs Sistema**: 4-8 player vs AI antagonist (Jackbox room-code M11).
6. **P6 — Fairness**: budget morfologico, scaling curves, verdict harness, timeout pressure.

### Authority

A3 source-of-truth file: [`docs/core/02-PILASTRI.md`](../core/02-PILASTRI.md) — set definitivo.

In caso di conflitto:

- ADR / hub canonical (A1) → vince per **scope architetturale**.
- Core data / schema (A2) → vince per **numeri / dataset**.
- Questo ADR + 02-PILASTRI (A3) → vince per **identità dei pilastri**.

Vedi [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md).

## 3. Conseguenze

### Documenti aggiornati nello stesso commit (Sprint v3.5)

- `docs/core/02-PILASTRI.md` → set 6 P1-P6 canonical, deprecation note per Canvas A 4.
- `docs/core/DesignDoc-Overview.md` → sezione Pilastri patched verso 6 P1-P6 con cross-ref.
- Questo ADR pubblicato come decisione formal.

### Documenti deprecati / re-classificati

- Canvas A 4-pilastri → **historical baseline**: utile per intent originario,
  NON canonical. Resta in `docs/appendici/A-CANVAS_ORIGINALE.md` come archive.
- Vecchio set 5-pilastri (pre-audit 2026-04-20) → **superseded** da 6-pilastri:
  P6 Fairness era implicit-mancante, audit 2026-04-20 lo ha promosso esplicito.

### Nessuna duplicazione

Le 4 voci Canvas A non scompaiono: vivono come **componenti trasversali**
dentro i 6 P1-P6 (mapping documentato in `02-PILASTRI.md §"Rapporto con
baseline storiche"`).

### Effetto su agent / Codex

`AGENTS.md` + `.ai/BOOT_PROFILE.md` + `CLAUDE.md` (A4) eseguono sul set
canonical. Nessun cambio operativo richiesto: stavano già usando il P1-P6
set.

### Effetto su CI / governance

Registry `docs/governance/docs_registry.json` aggiornato (last_verified =
2026-04-27 per i 3 file toccati + nuovo entry per questo ADR).

## 4. Alternatives considered

### Alt 1: Mantenere Canvas A 4-pilastri come canonical

Rejected: Canvas A snapshot 2025-10-23, troppo vecchio per riflettere
evoluzione progetto post-M11/M12. Manca P6 Fairness esplicito. Manca P3
Specie × Job dual identity (Canvas A lo mette in "mutazione significativa").

### Alt 2: Compress 6 → 4 (collapse P3+P2 e P4+P5)

Rejected: i 4 collapsed pilastri sarebbero stati troppo astratti
(es. "evoluzione/identità" perde la distinzione tra **acquisizione tratti**
[P2] e **integrazione job** [P3] che è il workstream M9-M13). Granularità
6-pilastri serve per gating roadmap milestone.

### Alt 3: Espandere a 7-8 pilastri (separare MBTI/Ennea, splittare Co-op/Director)

Rejected: 6 sono già al limite di memorizzazione + ogni pilastro ha
dataset/runtime/ADR coverage proven. Splittare ulteriore = noise.

## 5. Verifica & rollout

- [x] `docs/core/02-PILASTRI.md` patched (6 P1-P6 + deprecation note Canvas A).
- [x] `docs/core/DesignDoc-Overview.md` Pilastri section patched.
- [x] ADR pubblicato (questo file).
- [ ] Registry `docs/governance/docs_registry.json` updated post-PR (atomic in stesso commit).
- [ ] Cross-ref ai pilastri in altri docs verificato post-PR (grep `Canvas A pilastri`).

## 6. Documenti correlati

- [`docs/core/02-PILASTRI.md`](../core/02-PILASTRI.md) — set canonical.
- [`docs/core/DesignDoc-Overview.md`](../core/DesignDoc-Overview.md) — overview design.
- [`docs/appendici/A-CANVAS_ORIGINALE.md`](../appendici/A-CANVAS_ORIGINALE.md) — historical baseline.
- [`docs/planning/2026-04-26-v3-canonical-flow-decisions.md`](../planning/2026-04-26-v3-canonical-flow-decisions.md) — V3 design decisions session.
- [`docs/planning/2026-04-20-pilastri-reality-audit.md`](../planning/2026-04-20-pilastri-reality-audit.md) — audit reality vs claims.
- [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — A1-A5 authority levels.
