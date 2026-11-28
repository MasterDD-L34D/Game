---
title: 'Strategy Research MASTER Synthesis — 23 games + 58 patterns + ranked roadmap'
date: 2026-04-27
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  [
    report,
    synthesis,
    strategy,
    research,
    design,
    mechanics,
    tech,
    roadmap,
    ranked,
    master,
    verification_needed,
  ]
related:
  - docs/research/2026-04-27-strategy-games-design-extraction.md
  - docs/research/2026-04-27-strategy-games-mechanics-extraction.md
  - docs/research/2026-04-27-strategy-games-tech-extraction.md
  - docs/research/2026-04-27-indie-MASTER-synthesis.md
  - docs/reports/2026-04-27-indie-research-classification.md
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/museum/MUSEUM.md
---

# Strategy Research MASTER Synthesis — 2026-04-27

> **Scopo**: aggregato dei 3 doc strategy research shippati 2026-04-27 (PR #1942 tech + #1943 design + #1944 mechanics). 23 giochi totali (8+7+8). 58 pattern estratti. Top 15 quick-win ranked + bundle roadmap + decision points.
>
> **Bridge**: tra research output (PR #1942-1944) e action items concreti. Identifica ALREADY SHIPPED, IMMEDIATE-USE, MUSEUM-MAPPING.

---

## §1 — Inventario 23 giochi analizzati

### Per dominio

| Dominio | Doc | Games | Pattern count |
| --- | --- | --- | ---: |
| **Tech / engine / modding** | `strategy-games-tech-extraction.md` | Paradox Clausewitz, Stellaris, StS, Civ VI, Total War, CK3, Old World, Frostpunk | 24 (8×3) |
| **Design / visual / UI** | `strategy-games-design-extraction.md` | Civ VI, CK3, Frostpunk 1+2, Battle Brothers, Old World, JA3, Phoenix Point | 10 |
| **Mechanics / gameplay** | `strategy-games-mechanics-extraction.md` | XCOM 2, Battle Brothers, Phoenix Point, JA3, MYZ, Hard West 2, Othercide, Triangle Strategy | 24 (8×3) |

**Total**: 58 pattern (con overlap 4 giochi cross-domain: CK3 design+tech, Civ VI design+tech, Frostpunk design+tech, Battle Brothers design+mechanics).

### Mapping pillar Evo-Tactics

| Pillar | Top giochi che lo impattano |
| --- | --- |
| P1 — Tattica leggibile | Civ VI, Battle Brothers, JA3, Phoenix Point, Frostpunk |
| P2 — Evoluzione | CK3 (DNA encoding), Mutant Year Zero (mutation tree), Othercide (remembrance) |
| P3 — Specie × Job | Battle Brothers (brother synergy), Old World (character drama), JA3 (multi-perk) |
| P4 — MBTI / temperamento | Triangle Strategy (conviction), CK3 (portrait emotion), Old World (aging) |
| P5 — Co-op vs Sistema | XCOM 2 (overwatch stack), Hard West 2 (bravado), Mechabellum (escalating tech) |
| P6 — Fairness | Phoenix Point (pseudo-RNG), Battle Brothers (morale check), Othercide (perma-death) |
| **Cross — Tech** | Clausewitz (modding), StS (run analytics), Old World (replay), CK3 (DNA + telemetry) |

---

## §2 — Top 15 quick-win ranked (≤5h cad)

Ordinato per ROI (effort-adjusted impact + prerequisiti live + pillar critico).

| Rank | Pattern | Source | Effort | Pillar | Prerequisiti | Doc § |
| ---: | --- | --- | ---: | :-: | --- | --- |
| **1** | **Pseudo-RNG mitigation (Phoenix Point)** | mechanics §3 | ~3h | P6 | resolveAttack live | mech §B |
| **2** | **Bravado 1 AP refill chain-kill (Hard West 2)** | mechanics §6 | ~3h | P1 | abilityExecutor | mech §B |
| **3** | **Pin Down suppress fire (XCOM 2)** | mechanics §1 | ~3h | P1 | overwatch live | mech §B |
| **4** | **AI personality YAML (Total War)** | tech §5 | ~4h | P5 | ai_profiles.yaml live | tech §B |
| **5** | **Patch delta auto report (CK3)** | tech §6 | ~3h | meta | git diff + deploy script | tech §B |
| **6** | **Bug replay export (Old World)** | tech §7 | ~3h | dev | mulberry32 seed | tech §B |
| **7** | **Tooltip stratificato 3-tier (Civ VI)** | design §1 | ~5h | P1 | render.js | design §B |
| **8** | **Chromatic tension gauge (Frostpunk)** | design §3 | ~4h | P6 | pressure live, partial #1905 | design §B |
| **9** | **Portrait-as-status (CK3)** | design §2 | ~5h | P4 | UI overlay | design §B |
| **10** | **Free-aim body-part overlay (Phoenix Point)** | design §7 | ~5h | P1 | render.js | design §B |
| **11** | **Morale check post-event (Battle Brothers)** | mechanics §2 | ~4h | P6 | status system | mech §B |
| **12** | **Timeline manipulation UI (Othercide)** | mechanics §7 | ~5h | P1 | round orchestrator | mech §B |
| **13** | **Perf benchmark baseline (Frostpunk)** | tech §8 | ~2h | dev | tools/py | tech §B |
| **14** | **Dirty flag traitEffects (Frostpunk)** | tech §8 | ~4h | perf | traitEffects | tech §B |
| **15** | **JA3 atmospheric voice UI (JA3)** | design §6 | ~3h | P3 | style.css, indie design | design §B |

**Totale top 15**: ~58h (3 sprint da ~20h cad).

**Bundle quick-15 split** (3 sprint sequential):
- **Sprint α** "Tactical depth" (~16h): #1+#2+#3+#11 — pseudo-RNG + bravado + pin down + morale
- **Sprint β** "Visual UX" (~22h): #7+#8+#9+#10+#15 — tooltip + tension gauge + portrait + body-part + voice UI
- **Sprint γ** "Tech baseline" (~16h): #4+#5+#6+#13+#14 — AI YAML + patch delta + replay + benchmark + dirty flag

---

## §3 — Cross-ref ALREADY SHIPPED (8 patterns coperti parzialmente)

Patterns già live via PR shipped — zero/minimo effort residuo:

| Pattern | Già shipped via | Residuo |
| --- | --- | --- |
| Gris pressure palette | PR #1905 PR-Y1 | overlap parziale Frostpunk tension gauge (#8) |
| HLD glyph status icons | PR #1905 PR-Y1 + PR-Y2 | already done |
| Pentiment typography | PR #1905 PR-Y1 | already done |
| AI War Progress meter | PR #1898 + #1908 | overlap parziale Civ VI tooltip (#7) |
| Tactics Ogre HP/AP HUD | PR #1901 | foundation per Civ VI tooltip stratificato |
| ITB push/pull arrows | PR #1907 | overlap parziale phoenix point body-part |
| Long War mission timer | PR #1695 | overlap parziale Othercide timeline (#12) |
| StS damage forecast | PR #1906 | foundation per pseudo-RNG mitigation (#1) |

**Implicazione**: 5 pattern strategy hanno foundation già shipped → minor effort to extend. Concentrare sprint α+γ prima (max ROI), sprint β dopo (richiede design coordination).

---

## §4 — Bundle roadmap proposti (~20-30h cad)

### Bundle Tactical-Α (~22h, P1+P6)

XCOM/JA3/Hard West 2/Phoenix Point combat depth.

**Componenti**:
- Pseudo-RNG mitigation (~3h)
- Bravado AP refill (~3h)
- Pin Down suppress (~3h)
- Free-aim body-part (~5h)
- Morale check (~4h)
- Interrupt fire stack (~4h, refactor roundOrchestrator)

**Chiude**: P1 leggibilità tattica + P6 fairness percepita.

**Rischio**: interrupt fire stack tocca roundOrchestrator (refactor moderato). Cross-ref con sessionRoundBridge.

### Bundle Visual-Β (~25h, P3+P4+P6)

Civ VI/CK3/Frostpunk/Battle Brothers/JA3 design layer.

**Componenti**:
- Tooltip 3-tier (~5h)
- Tension gauge chromatic (~4h)
- Portrait-as-status (~5h)
- JA3 voice UI period (~3h)
- Battle Brothers parchment frame (~4h)
- Old World character aging (~4h)

**Chiude**: P3 identità + P4 portrait emotion + P6 visual feedback.

**Rischio**: writer/asset bottleneck (portrait variations richiedono asset pipeline).

### Bundle Tech-Γ (~25h, dev/perf/modding)

Clausewitz/StS/Old World/CK3/Frostpunk tech stack.

**Componenti**:
- AI personality YAML loader (~4h)
- Patch delta auto report (~3h)
- Bug replay export (~3h)
- Perf benchmark baseline (~2h)
- Dirty flag traitEffects (~4h)
- Mod manifest hook API (~8h)
- Telemetry consent GDPR (~2h)

**Chiude**: dev velocity + perf hot path + modding foundation.

**Rischio**: mod manifest hook API tocca pluginLoader.js (ripple su 8 plugin esistenti).

### Bundle Meta-Δ (~20h, P2+P5)

CK3/Stellaris/MYZ/Triangle Strategy systemic depth.

**Componenti**:
- DNA gene encoding (CK3) — ~6h, base per V3 mating evolved
- Event chain scripting (Stellaris) — ~5h, narrative reactivity
- Mutation tree swap (MYZ) — ~4h, V3 mating extension
- Conviction voting (Triangle) — ~5h, P4 branching

**Chiude**: P2 evoluzione trans-generazionale + P5 narrativa reactive + P4 conviction.

**Rischio**: scope grosso, dipende da TKT-09 ai_intent + writer budget D4.

---

## §5 — 5 anti-pattern trasversali (collected from 3 docs)

1. **RNG puro senza mitigation** (Phoenix Point lesson, anche Astrea/Wildfrost): dice mechanics funzionano solo se player percepisce agency. Sempre includere reroll/choice/streak-breaker.

2. **Scope creep stage** (Spore + Banner Saga + Inscryption): ogni gioco con espansione scope diluisce il core. Evo-Tactics: NON aggiungere layer (caravan + mating + map) in stesso sprint.

3. **Visual overload** (HLD + Loop Hero + Civ VI tooltip): più mondo si popola, più rischio clutter. Regola 7-element UI cap. Cleanup pass per wave.

4. **Modding security risk** (Lua/scripting unconstrained): plugin runtime senza sandbox = exploit vector. Mod manifest hook API DEVE includere allowlist.

5. **Premature optimization** (Frostpunk perf trap): NO ottimizzare prima di benchmark baseline (#13 quick-win). Profile-first, optimize-second.

---

## §6 — Decisioni master-dd aperte (consolidate da 3 docs)

### Da design doc

- **D-design-1**: Portrait dynamic emotion vs static? (effort 5h vs 12h con animation)
- **D-design-2**: Tooltip 3-tier hover delay default 300ms o 500ms?
- **D-design-3**: Tension gauge integrato pressure UI o panel separato?

### Da mechanics doc

- **D-mech-1**: Pseudo-RNG seed scope per-encounter o per-campaign?
- **D-mech-2**: Bravado refill 1 AP o variable per kill type?
- **D-mech-3**: Morale check threshold MoS≥X o status-driven?

### Da tech doc

- **D-tech-1**: Mod hook API surface (ini-override / Lua / TypeScript plugin)?
- **D-tech-2**: Replay storage (in-memory / IndexedDB / server-side persisted)?
- **D-tech-3**: GDPR consent UI (modal first-launch / settings only)?

**9 decisioni totali** (3 per dominio). Sblocca rispettivi bundle quando risolte.

---

## §7 — Verification status (transparency)

Su 58 pattern totali estratti:

| Verified status | Count | % |
| --- | ---: | ---: |
| ✅ Verified primary source (dev diary, GDC postmortem, codebase open) | 22 | 38% |
| ⚠️ verification_needed (citato ma non confermato) | 28 | 48% |
| 🔍 Marked esplicito | 8 | 14% |

**Sweep verification mandatory** prima di adopt: top 5 quick-win → verify primaria dev diary GDC. Costo ~2-3h verification per pattern.

---

## §8 — Action items master-dd

### Immediate sprint candidato (Sprint α "Tactical depth", ~16h)

Bundle 4 pattern P1+P6 critici, prerequisiti tutti live, zero scope creep:

1. Pseudo-RNG mitigation (Phoenix Point) — ~3h
2. Bravado AP refill (Hard West 2) — ~3h
3. Pin Down suppress (XCOM 2) — ~3h
4. Morale check (Battle Brothers) — ~4h
5. Interrupt fire stack (JA3) — ~3h (light version, no refactor)

**Player perception shift**: combat ha più telegraph (RNG mitigated) + più reward feel (bravado chain) + più agency (pin/interrupt).

### Decisioni urgenti

- **D-mech-1** pseudo-RNG seed scope (sblocca Sprint α)
- **D-design-3** tension gauge layout (sblocca Sprint β #8)
- **D-tech-1** mod hook API choice (sblocca Sprint γ #6)

### Museum mapping

I pattern non in top 15 + non shipped vanno mappati in museum cards M-032+ via repo-archaeologist sweep dedicata (~1h):
- 5 mechanics deferred (concealment phase, mutation tree complete, remembrance permadeath, conviction full, timeline manipulation deep)
- 4 design deferred (Old World aging, Battle Brothers parchment, Frostpunk 2 generational layered)
- 5 tech deferred (Stellaris event chains, mod manifest hook full, debug console live, community aggregate, Frostpunk perf optimization completa)

Total ~14 nuove museum cards.

---

_Doc generato 2026-04-27 sera post research wave (PR #1942+#1943+#1944). Bridge tra research output e roadmap concreto. Cross-ref `2026-04-27-indie-research-classification.md` per pattern flow precedente._
