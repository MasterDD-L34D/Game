---
title: 'Indie Research MASTER Synthesis — aggregato 20 giochi, 4 bundle, top 5 quick-wins'
date: 2026-04-27
doc_status: active
doc_owner: narrative-design-illuminator
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, indie, synthesis, master, extraction, bundle, roadmap]
related:
  - docs/research/2026-04-27-indie-meccaniche-perfette.md
  - docs/research/2026-04-27-indie-concept-rubabili.md
  - docs/research/2026-04-27-indie-narrative-gameplay.md
  - docs/research/2026-04-27-indie-design-perfetto.md
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/research/2026-04-26-tier-a-extraction-matrix.md
  - docs/research/2026-04-26-tier-b-extraction-matrix.md
  - docs/research/2026-04-26-tier-e-extraction-matrix.md
  - docs/research/2026-04-26-spore-deep-extraction.md
  - docs/adr/ADR-2026-04-26-spore-part-pack-slots.md
---

# Indie Research MASTER Synthesis

> **Scopo**: aggregato dei 5 doc indie research (sessione 2026-04-27). 20 giochi totali analizzati (17 distinti con overlap). 4 bundle proposti per Evo-Tactics. Top 5 quick-wins ranked per effort/impatto. Decisioni aperte per master-dd.
>
> **Struttura**: questo e il punto di ingresso. Leggi i 4 doc specifici per dettagli implementativi. Questo doc e solo indice + decisioni.

---

## §1 — Inventario 20 giochi analizzati

### Giochi per categoria doc

| Categoria           | Doc                            | Giochi                                                                            |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| Meccaniche perfette | `indie-meccaniche-perfette.md` | The Banner Saga, Wildfrost, Astrea: Six-Sided Oracles, Backpack Hero, Cobalt Core |
| Concept rubabili    | `indie-concept-rubabili.md`    | Citizen Sleeper, Inscryption, Tunic, Cocoon, Pentiment                            |
| Narrative-gameplay  | `indie-narrative-gameplay.md`  | Citizen Sleeper, Slay the Princess, Pentiment, Inscryption, 1000xRESIST           |
| Design perfetto     | `indie-design-perfetto.md`     | Pentiment, Gris, Tunic, Hyper Light Drifter, Loop Hero                            |

### Mappa overlap (17 giochi distinti)

- **Citizen Sleeper**: appare in concept rubabili + narrative-gameplay (2 pattern diversi: clock resource + NSC reactivity)
- **Inscryption**: appare in concept rubabili + narrative-gameplay (meta-frame + camera reveal)
- **Pentiment**: appare in concept rubabili + narrative-gameplay + design perfetto (3 pattern distinti: typography, party-as-narrator, job voice)
- **Tunic**: appare in concept rubabili + design perfetto (manual-as-puzzle + glyph visual)

### Mapping pilastri Evo-Tactics

| Pilastro               | Giochi che lo impattano                                        |
| ---------------------- | -------------------------------------------------------------- |
| P1 — Tattica           | Wildfrost, Cobalt Core, HLD, Backpack Hero                     |
| P2 — Evoluzione        | Astrea, Backpack Hero, Loop Hero, Cocoon                       |
| P3 — Specie × Job      | Wildfrost, Cobalt Core, Pentiment, Backpack Hero               |
| P4 — MBTI/temperamento | Citizen Sleeper, Astrea, Tunic, Slay the Princess, 1000xRESIST |
| P5 — Co-op             | Cobalt Core, Inscryption                                       |
| P6 — Fairness          | The Banner Saga, Gris, Citizen Sleeper                         |

**P4 e il pilastro piu coperto** (5 giochi): indica che e anche il piu carente attualmente (stato 🟡 in audit 2026-04-27).

---

## §2 — Pattern matrix per implementabilita

### Rating 1-5 (effort-adjusted impact)

| Gioco             | Pattern                        | Effort |    Impatto     | Rating | Prerequisiti live          |
| ----------------- | ------------------------------ | -----: | :------------: | :----: | -------------------------- |
| Wildfrost         | Counter display HUD            |    ~4h |    P1 alto     | ★★★★★  | hexGrid, render.js         |
| Citizen Sleeper   | Drift briefing (vcScore → ink) |    ~3h |    P4 alto     | ★★★★★  | narrativeRoutes, vcScoring |
| Gris              | Pressure color system          |    ~4h |  P6 visibile   | ★★★★☆  | pressure tracking live     |
| HLD               | Status icons geometriche       |    ~5h | P1 leggibilita | ★★★★☆  | render.js                  |
| Pentiment         | Job typography CSS             |    ~3h |  P3 identity   | ★★★★☆  | style.css, ADR art         |
| The Banner Saga   | Permadeath opt-in              |    ~4h |   P6 weight    | ★★★★☆  | modulation system          |
| Backpack Hero     | Trait adjacency bonus          |    ~6h |     P2+P3      | ★★★☆☆  | form_pack_bias.yaml        |
| Cobalt Core       | Position-conditional bonus     |    ~5h |     P1+P5      | ★★★☆☆  | hexGrid, abilityExecutor   |
| Slay the Princess | Debrief reaktivo 12 knot       |    ~8h |  P4 narrative  | ★★★☆☆  | narrativeRoutes            |
| Inscryption       | Sistema reveal via data        |    ~6h |  P5 narrative  | ★★★☆☆  | TKT-09 resolve needed      |
| Tunic             | Thought cabinet visual         |    ~4h |  P4 discovery  | ★★★☆☆  | onboardingPanel            |
| Pentiment         | Job voice ink                  |    ~6h |     P3+P4      | ★★★☆☆  | narrativeRoutes            |
| Astrea            | Debrief radar chart            |    ~6h |   P4 visual    | ★★☆☆☆  | vcScoring render           |
| Cocoon            | Biome rules layer              |    ~7h |   P1 varieta   | ★★☆☆☆  | biomeSpawnBias             |
| 1000xRESIST       | Campaign memory briefing       |    ~5h | P4 continuita  | ★★☆☆☆  | campaign state store       |
| Loop Hero         | Campaign mini-map              |    ~6h |   P2 visual    | ★★☆☆☆  | campaign advance           |
| Backpack Hero     | Reward offer grid preview      |    ~4h |     P2 UX      | ★★☆☆☆  | rewardOffer.js             |
| Citizen Sleeper   | Fatigue drift campaign         |    ~8h |   P6 weight    | ★★☆☆☆  | campaign advance           |
| Tunic             | Codex entry trigger            |    ~6h |    P4 lore     | ★★☆☆☆  | campaign advance           |
| Inscryption       | Consecutive same-arch reveal   |    ~3h |  P5 narrative  | ★★★☆☆  | TKT-09 partial             |

---

## §3 — Top 5 quick-wins Evo-Tactics (effort ≤ 5h)

**Criterio**: effort ≤ 5h, prerequisiti gia live, impatto su pillar critico.

| Rank | Pattern                              | Gioco           | Effort | Pillar | Doc dettaglio                     |
| ---: | ------------------------------------ | --------------- | -----: | :----: | --------------------------------- |
|    1 | **Drift briefing vcScore → ink**     | Citizen Sleeper |    ~3h |   P4   | `indie-narrative-gameplay.md §1`  |
|    2 | **Counter display HUD sopra sprite** | Wildfrost       |    ~4h |   P1   | `indie-meccaniche-perfette.md §2` |
|    3 | **Pressure color system**            | Gris            |    ~4h |   P6   | `indie-design-perfetto.md §2`     |
|    4 | **Job typography CSS**               | Pentiment       |    ~3h |   P3   | `indie-design-perfetto.md §1`     |
|    5 | **Permadeath opt-in modulation**     | The Banner Saga |    ~4h |   P6   | `indie-meccaniche-perfette.md §1` |

**Bundle quick-5**: ~18h totale. Chiude: P4 briefing reaktivo + P1 HUD leggibilita + P6 visual feedback + P3 job identity + P6 conseguenze reali.

**Batch raccomandato**: #1 + #2 + #3 → "HUD e narrative reaktivi" in un PR. #4 + #5 → "Job identity + consequences" in secondo PR.

---

## §4 — 4 bundle proposti

### Bundle A — "Tactical depth" (~26h)

**Componenti**: Wildfrost counter display (4h) + Cobalt Core position-conditional (5h) + Astrea debrief radar (6h) + Backpack Hero trait adjacency (6h) + HLD status icons (5h).

**Chiude**: P1 HUD leggibilita completo + P2 evoluzione visibile + P3 sinergie specie.

**Rischio**: Cobalt Core e Backpack Hero richiedono `abilityExecutor.js` + `traitEffects.js` modifiche — cross-ref con balance-illuminator prima.

**Player sente**: ogni turno ha piu informazione leggibile, ogni scelta tattica ha conseguenze visibili.

### Bundle B — "Diegetic narrative" (~27h)

**Componenti**: Pentiment typography (3h) + Tunic codex thoughts (6h) + Cocoon biome rules (7h) + Pentiment job voice ink (6h) + 1000xRESIST campaign memory (5h).

**Chiude**: P3 job identity + P4 narrative diegetica + P1 varieta biome.

**Rischio**: 35+ ink stitches nuovi — richiede writer review (o caveat "placeholder text da writer"). Il codice e triviale, il contenuto e il bottleneck.

**Player sente**: ogni missione ha sapore distinto, il gioco ricorda chi sei e cosa hai fatto.

### Bundle C — "Resource attrition" (~25h)

**Componenti**: Banner Saga permadeath (4h) + Banner Saga caravan supply (6h) + Citizen Sleeper fatigue drift (8h) + Gris pressure color (4h) + Loop Hero mini-map (6h) + rewardOffer grid preview (4h, Backpack Hero).

**Chiude**: P6 conseguenze reali + P2 visual emergence + P6 fairness visual feedback.

**Rischio**: fatigue drift e caravan supply sono feature nuove con stato persistente — Prisma write-through adapter richiesto (~3h overhead non incluso).

**Player sente**: le decisioni hanno peso permanente. Il mondo si "accumula" visivamente nel tempo.

### Bundle D — "Meta-frame" (~22h)

**Componenti**: Inscryption sistema reveal (6h) + Inscryption consecutive arch reveal (3h) + Slay the Princess debrief reaktivo (8h) + Citizen Sleeper drift briefing (3h) + 1000xRESIST memory briefing (5h).

**Chiude**: P4 narrative reaktivita + P5 Sistema come antagonista reale + P4 identita narrative.

**Rischio**: richiede TKT-09 resolve (ai_intent emit) come prerequisito critico per il reveal Inscryption. Se TKT-09 non viene risolto prima, Bundle D si sblocca solo parzialmente (~13h invece di ~22h).

**Player sente**: il gioco li conosce. Il Sistema e vivo. La narrativa ricorda.

---

## §5 — Cross-ref con tier matrices esistenti

### Complementarita con `2026-04-26-cross-game-extraction-MASTER.md`

I 17 giochi indie di questo research NON sono presenti nel cross-game extraction MASTER (che copre 13 Tier S + 11 Tier A + 15 Tier B + 20 tech = 59 voci). Questo research aggiunge **17 voci nuove** al catalogo totale.

**Overlap intenzionale**:

- Citizen Sleeper citato in `tier-b-extraction-matrix.md` come pattern TTRPG dice. Qui viene approfondito su narrative axis (non meccanica dice).
- Pentiment citato genericamente in tier matrix. Qui 3 pattern distinti estratti.

**Raccomandazione**: aggiungere i 17 giochi indie come **Tier A** (feature donor) nel catalogo principale nella prossima sessione di archaeologist sweep.

### Cross-ref ADR shipped

- `ADR-2026-04-26-spore-part-pack-slots.md`: Backpack Hero adjacency pattern si inserisce su questo ADR — la griglia slot di Spore e la griglia spaziale di Backpack Hero convergono. Verificare compatibilita prima di implementare trait adjacency.
- `ADR-2026-04-18-art-direction.md` + `ADR-2026-04-23-m12-phase-a-form-evolution.md`: pattern visual (Gris, HLD, Pentiment) devono rispettare palette + styleguide gia approved.

---

## §6 — Decisioni aperte per master-dd

### D1 — Quale bundle prioritizzare?

|        Bundle        | Effort | Chiude               |      Rischio      |
| :------------------: | -----: | -------------------- | :---------------: |
|       Quick-5        |   ~18h | P1+P3+P4+P6 parziale |       Basso       |
|   A Tactical depth   |   ~26h | P1+P2+P3             |       Medio       |
| B Diegetic narrative |   ~27h | P3+P4                | Writer bottleneck |
| C Resource attrition |   ~25h | P6+P2                |  Prisma overhead  |
|     D Meta-frame     |   ~22h | P4+P5                |   TKT-09 prereq   |

**Raccomandazione agent**: Quick-5 prima (sprint rapido ~18h) poi Bundle D (narrative reaktivita, P4 e il gap principale). Total ~40h per chiudere P4 🟡 → 🟢 candidato.

### D2 — TKT-09 priorita?

TKT-09 ("ai_intent_distribution non emessa via /round/execute response") e prerequisito di Bundle D Inscryption reveal. Vale risolverlo come prerequisito Bundle D o attendere sprint dedicato?

**Effort TKT-09**: ~3h (aggiungere `aiIntentDistribution` a response `/round/execute`). ROI alto — sblocca Bundle D e migliora telemetry.

### D3 — Permadeath: feature o mode?

Banner Saga permadeath e una feature centrale nel suo gioco. Per Evo-Tactics, proposta: modulation preset "permadeath" (flag in `party.yaml`). Ma questo impatta tutorial scenario — il tutoriale deve spiegare il permadeath prima di attivarlo?

Opzioni:

- A: Permadeath solo in campagne custom (no tutorial touch)
- B: Tutorial scenario variante con permadeath intro
- C: Permadeath off fino a campaign milestone (player lo "sblocca")

### D4 — Writer budget per Bundle B?

Bundle B richiede 35+ ink stitches (job voice) + 12 knot debrief + 5-8 codex entries = ~55 unita di contenuto testuale. Chi scrive? Opzioni:

- Placeholder text generato (caveat: qualita bassa, better than nothing)
- Commissiona writer esterno per 20h max
- Limita Bundle B a 3 job invece di 7 (reduce 35→15 ink stitches)

### D5 — Mini-map: diegetica o HUD?

Loop Hero mini-map proposta come "briefing panel component" (HUD read-only). Alternativa: la mini-map e un item di gioco che il party "sblocca" dopo 3 missioni (diegetica, in stile Tunic). La versione diegetica e piu costosa (~9h vs ~6h) ma piu coerente con il tema scoperta.

---

## §7 — Anti-pattern consolidati (20 giochi)

Dall'analisi dei 17 giochi, 5 anti-pattern emergono come trasversali:

1. **Scope creep stage** (Spore, Banner Saga): ogni gioco ha avuto un'espansione di scope che ha diluito il core. Evo-Tactics: non aggiungere layer (caravan + mating + campaign map) in uno stesso sprint. Uno alla volta.

2. **RNG non bilanciato** (Astrea, Wildfrost): dice mechanics funzionano solo se il player percepisce di avere agency sul risultato. RNG puro senza mitigation (reroll, choice) e percepito come ingiusto. Evo-Tactics usa d20 vs DC con MoS — mantenere questa struttura, non aggiungere RNG puro.

3. **Oscurita ostruttiva** (Tunic, Inscryption): il mystery funziona finche non blocca il player. Evo-Tactics deve sempre avere un path chiaro verso la vittoria. I layer di scoperta (codex, thought cabinet) devono essere opzionali, non bloccanti.

4. **Visual overload** (HLD, Loop Hero): piu il mondo si popola, piu il rischio di clutter visivo. Ogni wave di visual feature deve avere un "cleanup pass" — rimuovere badges inutili, limitare colori simultanei a 3-4.

5. **Content bottleneck narrativo** (Pentiment, Slay the Princess): giochi con narrative profonda hanno budget writer enormi (Pentiment ha 300.000 parole). Evo-Tactics single-dev: narrative deve essere minimal, reactive, non espansiva. Target: 3 varianti per knot, 2-5 frasi per variante. Mai piu.

---

_Doc generato da narrative-design-illuminator. Aggregato di sessione 2026-04-27. Versioni precedenti non committate — questo e il recovery canonico. Cross-ref con tier matrices 2026-04-26 per contesto completo._
