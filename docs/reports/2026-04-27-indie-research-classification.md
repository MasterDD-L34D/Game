---
title: 'Indie Research Classification — immediate-use vs museum mapping'
date: 2026-04-27
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [report, indie, research, classification, museum, sprint-prep]
related:
  - docs/research/2026-04-27-indie-MASTER-synthesis.md
  - docs/research/2026-04-27-indie-meccaniche-perfette.md
  - docs/research/2026-04-27-indie-concept-rubabili.md
  - docs/research/2026-04-27-indie-narrative-gameplay.md
  - docs/research/2026-04-27-indie-design-perfetto.md
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/museum/MUSEUM.md
---

# Indie Research Classification 2026-04-27

> **Scopo**: triare i 17 pattern dai 5 doc indie research (rigenerati post-loss) in 3 categorie: ALREADY SHIPPED / IMMEDIATE-USE / MUSEUM. Bridge tra recovery doc e azione concreta.

---

## §A — ALREADY SHIPPED (3 patterns, ZERO effort residuo)

Verificati su `apps/play/src/style.css` + `apps/play/src/render.js` post-merge `46071b03`:

| Pattern indie | Source doc | Shipped via | Verifica grep |
| --- | --- | --- | --- |
| **Pentiment typography** (job/sistema/narrative serif/sans/script) | `indie-design-perfetto.md §1` | PR #1905 (PR-Y1) | `--font-{player,sistema,narrative}` in `style.css` |
| **Gris pressure palette** (4-tier color body class) | `indie-design-perfetto.md §2` | PR #1905 (PR-Y1) | `--gris-bg-{calm,alert,critical,apex}` + `body.pressure-*` |
| **HLD glyph status icons** (forma + colore semantici) | `indie-design-perfetto.md §4` | PR #1905 + PR-Y2 | `STATUS_ICONS` con campo `shape: 'triangle'/'diamond'` in `render.js` |

**Implicazione**: doc `indie-design-perfetto.md §1+§2+§4` non richiede sprint nuovo. Effort doc-stated (~3+4+5 = 12h) è già consumato. Solo §3 Tunic + §5 Loop Hero restano potenzialmente actionable.

---

## §B — IMMEDIATE-USE (4 patterns, ~16h totale, candidato sprint)

Patterns con prerequisiti live, effort ≤5h, alto impatto pillar.

### B.1 Citizen Sleeper drift briefing (vcScore→ink)

- **Source**: `indie-narrative-gameplay.md §1`
- **Effort**: ~3h
- **Pillar**: P4 MBTI/temperamento (gap critico 🟡++ → 🟢 candidato)
- **Pattern**: `narrativeRoutes.js` serve briefing via ink knot condizionale su `session.vcSnapshot.mbti_T` (3 path: T>0.65 / F>0.65 / else)
- **Prerequisiti live**: `narrativeRoutes.js` ✅, `vcScoring.js` ✅, `tutorialScenario.js` briefing slots ✅
- **Differenza vs #1925 DEFER Citizen Sleeper**: #1925 deferiva la **dice allocation mechanic** (breaking AP system). Questo è il **drift narrative reactivity** — pattern ortogonale, no breaking change
- **Anti-pattern**: max 3 varianti per knot (combinatorial)

### B.2 Tactical Breach Wizards Undo libero

- **Source**: ADOPT in #1925 §H.4
- **Effort**: ~3-4h
- **Pillar**: P1 (already 🟢 def, rinforza apprendimento tutorial)
- **Pattern**: undo move/action gratis fino a commit-round (escape sperimentale per player tutorial)
- **Ticket pre-aperto**: `TKT-COMBAT-TBW-UNDO-LIBERO`

### B.3 Tunic decipher Codex pages

- **Source**: ADOPT in #1925 §H.4 (TOP RECOMMENDATION) + `indie-concept-rubabili.md §3`
- **Effort**: ~5h
- **Pillar**: cross-cutting (lore + UI)
- **Pattern**: A.L.I.E.N.A. wiki in-game con pages "blurred" → si decifrano gradualmente via gameplay (kill bestiari, esplora bioma, etc.)
- **Prerequisiti**: Hades Codex panel spec (M-2026-04-27-005 museum)
- **Ticket pre-aperto**: `TKT-CROSS-TUNIC-DECIPHER-CODEX`

### B.4 Wildfrost counter HUD (charge timer sopra sprite)

- **Source**: `indie-meccaniche-perfette.md §2`
- **Effort**: ~4h
- **Pillar**: P1 (rinforza 🟢 def)
- **Pattern**: `render.js` badge counter sopra sprite per ability cooldown / status duration (mirror HP bar pattern Tactics Ogre già shipped #1901)
- **Prerequisiti**: `render.js` STATUS_ICONS infrastructure ✅ (PR-Y1)
- **Anti-pattern**: NO art style kawaii Wildfrost — pattern meccanico isolabile, estetica no

**Bundle ~16h totale** (B.1+B.2+B.3+B.4). Player perception shift: P4 reactivity + apprendimento sicuro + lore decifrabile + leggibilità tattica.

---

## §C — MUSEUM MAPPING (10 patterns deferred → cards)

Patterns deferred per scope creep, dipendenze pesanti, decisione master-dd pendente, o blast radius narrative system. Da catalogare in `docs/museum/MUSEUM.md` per consultazione futura senza re-research.

### C.1 Resource attrition (3 patterns)

| # | Pattern | Source | Reason museum | Reuse trigger |
| --- | --- | --- | --- | --- |
| C.1.1 | Banner Saga caravan supply | `meccaniche §1` | New persistent state, Prisma overhead ~3h, scope-creep single-dev | Post-playtest se TKT-M11B-06 mostra need attrition |
| C.1.2 | Banner Saga permadeath opt-in | `meccaniche §1` + MASTER quick-win #5 | Decisione master-dd D3 pending (modulation vs tutorial intro vs milestone unlock) | Decisione D3 risolta |
| C.1.3 | Citizen Sleeper fatigue drift | `MASTER bundle C` | Stato persistente cross-encounter + Prisma overhead | Post-Bundle C decision |

### C.2 Combat depth (3 patterns)

| # | Pattern | Source | Reason museum | Reuse trigger |
| --- | --- | --- | --- | --- |
| C.2.1 | Astrea dice purification (corruption/purification dual-resource) | `meccaniche §3` | DEFER #1925 — Spore Moderate ha già MP pool, scope creep | Solo se P4 dice mechanic richiesto post-MBTI surface |
| C.2.2 | Backpack Hero spatial inventory adjacency | `meccaniche §4` | Convergenza con Spore S6 body_slot — overlap design da risolvere prima | Post sprint S6 rebalance |
| C.2.3 | Cobalt Core position-conditional bonus | `meccaniche §5` | abilityExecutor + traitEffects ripple ~5h, requires balance-illuminator review | Post-Bundle A "Tactical depth" decision |

### C.3 Narrative reactivity (4 patterns)

| # | Pattern | Source | Reason museum | Reuse trigger |
| --- | --- | --- | --- | --- |
| C.3.1 | Slay the Princess 12-knot branching mantenute | `narrative §2` + `concept §3` | Writer bottleneck D4 (~55 ink units content), ~8h dev | Decisione D4 risolta + writer assigned |
| C.3.2 | Pentiment job voice + confessionals | `narrative §3` + `concept §5` | 35+ ink stitches per 7 job, content bottleneck | Writer commission o reduce a 3 job |
| C.3.3 | Inscryption camera reveal + meta-frame | `narrative §4` + `concept §2` | DEFER #1925 post-MVP — TKT-09 prereq + blast radius | Post-MVP playtest demonstrato need |
| C.3.4 | 1000xRESIST memory layered POV | `narrative §5` | ~5h, P4 nice-to-have non critico | Post-Bundle B narrative decision |

### C.4 Visual emergence (2 patterns)

| # | Pattern | Source | Reason museum | Reuse trigger |
| --- | --- | --- | --- | --- |
| C.4.1 | Tunic broader manual-as-puzzle | `concept §3` (broader version, NON il decipher Codex già ADOPT) | Subset shipped (decipher Codex). Broader scope = full diegetic UI rework | Post-MVP UX iteration |
| C.4.2 | Loop Hero mini-map (campaign progress visual) | `design §5` | Decisione D5 pending (diegetic vs HUD), ~6-9h | Decisione D5 risolta + campaign def update |
| C.4.3 | Cocoon biome rules layer | `concept §4` | Deep biome rules engine ~7h + biomeSpawnBias rework | Post sprint P3 specie×job closure |

---

## §D — Cross-ref con tier matrices precedenti (anti-duplication)

I 17 giochi indie **NON erano nel catalogo `2026-04-26-cross-game-extraction-MASTER.md`** (59 voci pre-existing). Aggiungerli come Tier A:

- 8 narrative-axis (Citizen Sleeper, Slay Princess, Pentiment, Inscryption, 1000xRESIST, Tunic, Cocoon, Loop Hero)
- 5 mechanics-axis (Banner Saga, Wildfrost, Astrea, Backpack Hero, Cobalt Core)
- 3 visual-axis (Gris, HLD, Pentiment) — già coperti da #1905 nel codice

Total catalogo post-questo doc: **76 voci** (59 + 17 indie). Update raccomandato in cross-game MASTER alla prossima sweep archaeologist.

---

## §E — Action items per master-dd

### E.1 Sprint candidato "Indie Quick-Wins" (~16h)

Bundle B.1+B.2+B.3+B.4 — chiude P4 gap critico + rinforza P1.

**Ordine raccomandato**:
1. B.1 Citizen Sleeper drift briefing (3h, P4 immediate impact, low risk)
2. B.4 Wildfrost counter HUD (4h, infrastructure-friendly, additive)
3. B.2 TBW Undo libero (4h, single touch round flow)
4. B.3 Tunic decipher Codex (5h, cross-system but spec'd)

### E.2 Decisioni pendenti (sblocca ulteriori sprint)

- **D3** permadeath: A/B/C? (sblocca C.1.2)
- **D4** writer budget Bundle B narrative: placeholder/commission/reduce-scope? (sblocca C.3.1+C.3.2)
- **D5** mini-map diegetica vs HUD? (sblocca C.4.2)
- **TKT-09** ai_intent_distribution priority? (sblocca C.3.3 Inscryption parziale)

### E.3 Museum curation pending

10 cards (C.1.1+C.1.3+C.2.1+C.2.2+C.2.3+C.3.1+C.3.2+C.3.3+C.3.4+C.4.1+C.4.2+C.4.3) da curare via repo-archaeologist sweep dedicato (~1h). Output: 10-12 museum cards Dublin-Core con provenance + reuse path + blast radius.

---

_Doc generato 2026-04-27 dopo recovery PR #1927 (5 indie docs untracked)._
_Bridge tra research deliverables e action items concreti. Cross-ref #1925 §H.4 per ADOPT/DEFER decisions già codificate._
