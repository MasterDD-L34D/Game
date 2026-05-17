---
title: Roadmap (MVP → Alpha)
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
related:
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
  - docs/adr/ADR-2026-04-21-campaign-save-persistence.md
---

# Roadmap (MVP → Alpha)

## MVP scope lock (2026-04-20, P0 Q58 default B)

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

## Sprint cadence

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
