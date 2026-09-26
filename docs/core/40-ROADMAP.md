---
title: Roadmap (MVP → Alpha)
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-07-12
source_of_truth: false
language: it-en
review_cycle_days: 14
related:
  - docs/superpowers/specs/2026-07-10-studio-track-v09-design.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
  - docs/adr/ADR-2026-04-21-campaign-save-persistence.md
---

# Roadmap (MVP → Alpha)

## Sequenza slice-first verso EA Steam (roadmap-of-record, 2026-07-12)

Decisione owner 2026-07-10 (spec studio-track, sequenza C "v0.9 slice-first"):
consegnare PRIMA una vertical slice vestita con playtest umano a meta' percorso,
poi scalare. Traguardo = scope freeze v0.9 completo (4 specie, 6 job, 3 biomi,
slice meta recruit/nido/mating) -> build EA Steam. Prerequisiti CHIUSI: GDD
refresh (Fase 1, PR #3269), asset shortlist + download staging (Fase 2, PR
#3270/#3271, provenance in `docs/reports/2026-07-12-asset-staging-provenance.md`).

| Fase                          | Contenuto                                                                                          | Exit-gate                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **F-A slice vestita**         | 1 bioma (badlands, gia' misurato), 2 specie, Path A con audio+VFX veri (staging Fase 2), polish UI | Slice giocabile end-to-end VESTITA |
| **F-B playtest N5**           | Co-op real-device CAMP-4 (gate UMANO)                                                              | Report playtest + triage           |
| **F-C scala contenuto**       | 4 specie, 6 job, 3 biomi (criteri asset validati dalla slice)                                      | Contenuto freeze completo in build |
| **F-D slice meta + EA-ready** | Recruit/nido/mating + packaging Steam EA                                                           | Build candidata EA                 |

Regole di percorso:

- Ogni fase passa il **Quality Gate 3-step** (smoke verde, ricerca >=3 edge case,
  tuning >=1 iterazione con delta misurato) PRIMA di dichiararsi chiusa.
- MAI aprire la fase successiva con il gate precedente rosso.
- Ogni fase F-A..F-D = writing-plans dedicato -> implementazione (Game-Godot-v2
  self-governed + Game backend coi suoi gate) -> verifica. Decisioni design-nuove
  emerse passano da ADR.
- Le sconfitte by-design (simmetria flag-ON) restano nel tuning: leggibilita' P1
  = guardrail (SoT sez.18.1).

NB scope: i numeri v0.9 (4 specie / 6 job / 3 biomi) SOSTITUISCONO (supersede)
il vecchio "MVP scope lock" sotto (6 specie / 7 job / 5 biomi): e' uno scope
DELIBERATAMENTE ridotto, deciso dall'owner col freeze v0.9 (decisione 5, spec
studio-track 2026-07-10). La sezione sotto resta come storia.

## MVP scope lock (2026-04-20, P0 Q58 default B) -- STORICO, superato dal freeze v0.9

**Level cap MVP**: base + veteran + elite (3 tier). **Mythic tier DEFERRED post-release**.

**Content budget MVP**:

- 6 Specie base (canvas D)
- 7 Job canonical (vanguard/warden/invoker/skirmisher/ranger/artificer/harvester)
- **Campaign**: 3 atti × 5-8 mission linear + 1-2 scelte binarie per atto (Descent pattern, P0 Q47)
- **Save**: SQLite locale (P0 Q46)
- **Encounter unlock**: sequenziale post-tutorial (P0 Q50)
- 2 Mappe base (caverna/savana) + 5 biomi canonical
- Telemetria VC + PI-Pacchetti shop
- UI identità TV-first

## Sprint cadence -- STORICO (fotografia 2026-05-06; la sequenza corrente e' slice-first sopra)

Vedi `docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md` per dettaglio:

| Sprint | Focus                                            | Effort |              Status              |
| ------ | ------------------------------------------------ | ------ | :------------------------------: |
| M7-#2  | Damage curves (A+B+C+D+E)                        | ~12h   |     ✅ ACCEPTED + calibrated     |
| M8     | Plan-Reveal P0 threat_preview                    | 3h     |         ✅ shipped #1658         |
| M9     | P6 timeout + P4 axes + P3 XP proof               | ~20h   | 🟡 P6 shipped, P4+P3 in progress |
| M10    | Campaign + PI pack runtime + P3 full             | ~25h   |     🟡 pending P0 ADR-04-21      |
| M11    | P5 Jackbox co-op TV                              | ~20h   |          🔒 LOCKED next          |
| M12+   | P2 full evoluzione + P3 mythic + biome Node port | 80h+   |        Deferred post-MVP         |

## Historical closure

- [x] EVO-421 · Ripristinata la pipeline export PDF del generatore (SRI html2pdf aggiornato, alert nel manifest export).
- [x] BAL-612 · Skydock Siege XP curve Helix+Cipher allineata (delta profilo -0.0009%, dataset rigenerato e log `pilot-2025-11-12`).
- [x] M7-#2 · Damage scaling curves + verdict harness + Phase E tune + P6 turn_limit_defeat structural fix (2026-04-20).
- [x] M8 · Plan-Reveal P0 threat_preview payload backend + frontend consume.
- [x] Design audit 4-agent + 75 Q batch + P0 8 batched decisions (2026-04-20).
