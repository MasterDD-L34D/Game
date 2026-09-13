---
title: 'Vertical Slice Roadmap v3.2 — Risveglio del Leviatano (build readiness 2026-04-27)'
workstream: planning
category: plan
doc_status: draft
doc_owner: claude-code
language: it
created: 2026-04-27
tags: [pcg, level-design, vertical-slice, roadmap, leviatano, worldgen]
related:
  - docs/planning/2026-04-26-v3-canonical-flow-decisions.md
  - docs/planning/2026-04-26-leviatano-sprint-plan.md
  - docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html
---

# Vertical Slice Roadmap v3.2 — Risveglio del Leviatano

**Audit date**: 2026-04-27  
**Branch**: claude/cranky-easley-606ae0 (merge main eed55103)  
**Metodologia**: lettura diretta file — zero assumption su PR non merged.

---

## TL;DR 5 bullet

1. **Playable oggi ~25%**: lobby M11 + combat M15 round model + debrief recruit + Nido 4-tab scaffold. Tutto il resto è dato/spec senza wire frontend visible.
2. **Gap effort totale 22 beat**: ~155-210h aggregato. Di cui ~75-90h solo Boss Leviatano (sprint plan già scritto).
3. **Critical path**: B1 VC swipe → B2 worldgen visible → B3 foodweb → B5 clan test → B7 asymmetric info → B8 mutagen cross-event → B9 memory_fog → B16/B17 Leviatano multi-stage. Sequenza lineare, 8 nodi bloccanti.
4. **Parallelizzabile subito**: VS-A (worldgen/onboarding) parallelo VS-B (combat enrichment) parallelo Leviatano Sprint C (world-state). Risparmio ~30-40h calendario.
5. **N6 pitch readiness**: screenshot Atollo + slide Frattura richiedono ALMENO B2 (worldgen visible) + B3 (foodweb animato) + PR enc_frattura_03 migrato multi-stage. Stima minima N6: ~35-45h (VS-A completo + Sprint A Leviatano).

---

## 1. Beat-by-beat coverage (22 beat)

### Schermata 1 — Worldgen (T+0:00 → 1:15)

| Beat | Time | Spec v3.2 | Repo status | Gap | Effort |
|------|------|-----------|-------------|-----|--------|
| **B0 Patto stanza** | 0:00 | QR join + nickname-vento + 6 cerchi vuoti pulsanti | ✅ Codice 4-letter `apps/play/src/lobby.js` + `network.js` M11. 🔴 QR codice non generato (qrcode lib non presente). 🔴 nickname tematico (vento/ecc.) hardcoded come "Giocatore N". 🔴 6 cerchi animati canvas TV non implementati (`lobbyBridge.js` ha roster banner, NON animazione circolare) | QR lib + CSS animation roster | ~3h |
| **B1 Trait branco 3 carte** | 0:00-0:30 | Vote maggioranza → trait condiviso · tiebreak host | 🔴 ZERO impl. `characterCreation.js` mostra Forma MBTI per player, NON trait branco collettivo. Schema trait-vote non esiste. `packRoller.js` esiste ma non è collegato a vote flow. | Backend `/api/session/vote/trait` + UI 3-card vote + tiebreak | ~5h |
| **B2 5 dilemmi VC swipe** | 0:30-0:45 | 5 micro-scenari → 5 axes UI surface · output 15s | 🟡 `onboardingPanel.js` gestisce choice narrativa 60s da `default_campaign_mvp.yaml`. MA: NON è swipe gesture, NON produce 5-axes output, è 3 opzioni testo. `vcScoring.js` ha 4 MBTI axes engine. Il mapping 5 axes UI → 4 MBTI engine (Q1 in v3-canonical) NON è chiuso. PR 1868 telemetria VC spedito MA NON verifica implementazione swipe. | Spec 5 micro-scenari YAML + swipe gesture phone + axes mapping formula | ~5-6h |
| **B3 Worldgen visibile** | 0:45-0:55 | 6 biomi animati canvas TV + archi tipizzati che appaiono | 🔴 Worldgen backend: `biomeSynthesizer` Python esiste ma NON espone HTTP render-ready endpoint per frontend. `biomeModifiers.js` (#1864) proietta diff_base → pressure runtime. `meta_network_alpha.yaml` ha 5 nodi + 12 archi. 🔴 NON esiste canvas TV bioma-map con animazione. `worldSetup.js` mostra card scenario lista, NON mappa generata. | Endpoint `/api/worldgen/preview` + canvas TV SVG/Canvas animato (nodo-per-nodo) | ~8-10h |
| **B4 Foodweb auto-disegno** | 0:55-1:10 | Foodweb si disegna nodo-dopo-nodo per bioma | 🔴 `meta_network_alpha.yaml` ha struttura nodi/archi. 4 ecosystem YAML (`badlands`, `cryosteppe`, `deserto_caldo`, `foresta_temperata`). 🔴 ZERO frontend render. Nessun endpoint `/api/worldgen/foodweb`. | D3/SVG foodweb renderer (node-by-node step animation) | ~8-10h |
| **B5 Imprint creatura** | 1:10-1:15 | Silhouette + nome + bioma + 5 slot morph + 1 affix | 🟡 `characterCreation.js` mostra Forma MBTI + pack bias. `species.yaml` ha 45 specie. `biomeSpawnBias.js` (#1862) role_templates wired. 🔴 Scena "imprint" con silhouette NON esiste — è un momento narrativo separato, non solo la char creation form. 🔴 5 slot morph (Stadio I-X) UI non wired, solo dati YAML (`stadio` branch PR 1882 merged ma UI zero). | Scene imprint dedica: silhouette generativa + morph slot + affix reveal | ~4h |

### Schermata 2 — Combat (T+1:15 → 5:15)

| Beat | Time | Spec v3.2 | Repo status | Gap | Effort |
|------|------|-----------|-------------|-----|--------|
| **B6 Approdo cutscene** | 1:15-1:45 | Wide bioma + 8 creature emergenti + companion Skiv-archetype | 🔴 inkjs `narrativeEngine.js` wired per briefing/debrief. 🔴 Scena "approdo" non esiste come state narrativo separato. Skiv card (`skivPanel.js`) mostra ASCII card da `/api/skiv/card` SOLO per Arenavenator vagans. 🔴 Skiv-archetype istanza per bioma (B1 decisione master-dd) NON implementata — pool 8-12 nomi per bioma in volo come spec. | Narrative state "approdo" ink/inkjs + Skiv-archetype instance loader + bioma-aware voice | ~5-6h |
| **B7 Test clan apex** | 1:45-2:45 | 3 carte aiuta/ostacola/ignora · 3 esiti shifano Form squadra | 🔴 ZERO impl. Nessun social-test engine. Nessuna route `/api/session/clan_test`. Non è combat AP/turn — è mini-puzzle narrativo. "Clan Araldo" come NPC group = non esiste in npcRegistry. | Social test engine + 3-choice vote + Form-shift outcome | ~7-8h |
| **B8 Trigger evento mutageno** | 2:45-3:00 | Bioma stressato 🔴 rompe arco ecologico | 🟡 `data/core/events/mutagen_events.yaml` esiste (status: design-draft, NON wired runtime). Schema 0.2 con trigger/effects/counterplay. 🔴 NON wired in `sessionRoundBridge.js` o `reinforcementSpawner.js`. Wire target documentato nel commento YAML stesso. | Wire mutagen events: trigger check → pressure/stresswave modifier flat | ~4-5h |
| **B9 Combat 3 round** | 3:00-5:00 | M15 round model + StressWave bar + hazard-response visual | ✅ Round model M15 `sessionRoundBridge.js` completo. ✅ Hazard tile damage wired `handleTurnEndViaRound`. 🟡 StressWave: barra visiva esiste nella wireframe HTML del vertical slice (`enc_frattura_03.yaml` biome `frattura_abissale_sinaptica`). 🔴 StressWave come metrica runtime NON esiste — `biomeModifiers.js` usa `pressure_initial_bonus` ma NON `stresswave_baseline`. La barra HUD StressWave non è nel main.js canvas render. | StressWave runtime metric + HUD bar canvas + enc_frattura_03 biome pressure scale | ~4-5h |
| **B10 Scripted death** | 3:00-5:00 | Player unit muore scripted al R3 (o threshold) per drammaticità | 🔴 ZERO impl. Outcome `wipe` è possibile organicamente. Un "scripted" death trigger per narrazione NON esiste. Session.js outcome enum: `win/wipe/draw/abandon` — no `scripted_death`. | Script trigger hook nel round orchestrator — opzionale, può essere rimosso dal v3.2 senza perdita | ~2h (o drop) |
| **B11 Debrief in-world** | 5:00-5:15 | 1 cambiamento per player diegetic · voce Skiv | ✅ `debriefPanel.js` wired con recruit + VC reveal + Tri-Sorgente reward offer (V2 rewardOffer.js). 🟡 Voce Skiv: `skivPanel.js` mostra ASCII card ma NON integrata nel debrief flow come voice. | Wire Skiv-archetype line in debrief panel | ~1-2h |

### Schermata 3 — Nexus (T+5:15 → 8:30)

| Beat | Time | Spec v3.2 | Repo status | Gap | Effort |
|------|------|-----------|-------------|-----|--------|
| **B12 Nexus cutscene** | 5:15-5:45 | Ambiente underwater + companion nomina sé stesso | 🔴 Cutscene "Nexus" non impl. "Flint" droppato (v3-canonical §1.3) → Skiv-archetype. Skiv si nomina in base a worldgen. 🔴 istanza Skiv non ha self-naming logic. Narrative engine `narrativeEngine.js` ha briefing/debrief ma NON nexus state. | Ink knot "nexus" + Skiv self-naming logic da worldgen seed | ~3-4h |
| **B13 4 tab phone** | 5:45-6:45 | Me / Branco / Mondo / Relazioni · Relazioni asimmetriche | 🟡 `nestHub.js` OD-001 Path A ha 4 tab: squad/mating/lineage/codex. Schema tab NON corrisponde 1:1 a Me/Branco/Mondo/Relazioni del v3.2. 🔴 Tab "Mondo" (meta-network, bioma stato) NON esiste. 🔴 Tab "Relazioni" asimmetriche per-player (ognuno vede relazioni diverse) NON esiste. Squad ≈ Me. Mating+Lineage ≈ Branco parziale. Codex ≈ wiki. | Rinomina tab + "Mondo" meta_network view + "Relazioni" asimmetriche per-player data | ~6-8h |
| **B14 Scelta Forma 3 archetipi** | 6:45-7:15 | Per-player: Agile/Robusta/Specializzata · costo 1 PI | 🔴 ZERO impl come scelta attiva player nel flusso v3.2. `formsPanel.js` mostra 16 MBTI form cards + evolve (M12). MA: M12 è VC-driven (auto-projection), NON una scelta esplicita "3 archetipi" con costo PI. La spec v3.2 chiede 3 opzioni semplici (Agile/Robusta/Specializzata) ≠ 16 MBTI form picker. Mismatch design. | Mini-picker 3 archetipi (wrapper di formEvolution.js) + PI cost deduct | ~5-6h |
| **B15 Mating nido offspring** | 7:15-7:45 | 3 carte offspring · death-triggered | ✅ `rollMatingOffspring` wired backend `metaProgression.js` PR #1879 (3-tier: rainbow/gold/no-glow). ✅ `nestHub.js` Mating tab scaffolded. 🔴 3 carte offspring UI (card visuals nel phone) NON implementate — PR 1877 deferred per conflict nestHub Sprint A. 🔴 Death-trigger gating (offspring appare solo dopo morte scripted) NON wired. | Mating tab full UI (3 offspring cards visual) + death-trigger gate | ~4-5h |
| **B16 Scelta strategica** | 7:45-8:30 | Riposa/Esplora/Spingi · host vote + outcome branch | 🔴 ZERO impl. `defyEngine.js` esiste (AP-based defy combat) ma NON è scelta macro-strategica post-combat. `campaign.js` advance ha outcome enum ma NON 3 explicit choices Riposa/Esplora/Spingi. `meta_network_alpha.yaml` ha 12 archi typizzati — il "voto macro → arco compatibile" è descritto in v3-canonical §6 ma non codificato. | Endpoint `/api/campaign/strategic_choice` + UI host-vote + meta-network arc selection | ~4-5h |

### Schermata 4 — Climax (T+8:30 → 14:00)

| Beat | Time | Spec v3.2 | Repo status | Gap | Effort |
|------|------|-----------|-------------|-----|--------|
| **B17 Manifestazione Leviatano** | 8:30-10:30 | Apex evolved + bioma-dependent + 3 strati cutaway | 🟡 `enc_frattura_03.yaml` esiste con biome `frattura_abissale_sinaptica` + 3 wave. 🔴 Leviatano non è uno species entry runtime apice. `data/core/species.yaml` + `species_expansion.yaml` → serve entry `leviatano_risonante`. 🔴 Schema `phases[]` NON esiste ancora in `schemas/evo/encounter.schema.json` (Sprint A Leviatano). HUD phase indicator NON esiste. | `enc_frattura_03.yaml` migrato + `phaseEvaluator.js` NEW + `hudPhasePanel.js` NEW | ~12-15h (Sprint A) |
| **B18 Strato 1 PRE — 3 Echi coherence** | 8:30-10:30 | Echi che sincronizzano attacco · coherence meter | 🔴 "Echi" (creature supporto Leviatano) non sono speciate. `araldi_fotofase` + `sciami_memetici` in enc_frattura_03 wave 1 possono servire come Eco approssimato MA NON hanno coherence mechanic. Coherence meter NON esiste. | Coherence sub-mechanic (fase-1 encounter design) — in Sprint A | incluso Sprint A |
| **B19 Strato 2 MID — "carte di un altro"** | 10:30-13:00 | Ogni player riceve azioni di un altro per 2 round · memory_fog | 🔴 ZERO impl. "Carte di un altro" = mechanic di swap ability/action pool tra player. `sessionRoundBridge.js` non ha concept di cross-player action assignment. `memory_fog` hazard nel YAML enc_frattura_03 ma NON ha runtime effect. Key innovation del vertical slice — alta complessità. | Cross-player action swap mechanic + memory_fog hazard runtime | ~10-12h |
| **B20 Strato 3 POST — 3 esiti** | 13:00-14:00 | Accordo (parley) / Ritirata (fail-lite) / Combattimento fino 5+ | 🔴 Outcome enum `session.js` attuale: `win/wipe/draw/abandon`. NON ha `parley` o `retreat`. `parleyEvaluator.js` NON esiste (Sprint B Leviatano). `objectiveEvaluator.js` non gestisce accordo/ritirata. 5 azioni simboliche per parley threshold (C3 master-dd) non codificata. | Outcome enum esteso + `parleyEvaluator.js` + narrative 6 varianti + debriefPanel stamp | ~20-25h (Sprint B) |
| **B21 Asymmetric world info** | durante combat | Player vede world info diversa per sensi/cognizione creatura | 🔴 ZERO impl. `publicSessionView` in session.js espone stato uniforme a tutti. Concetto "B7 asymmetric" dal v3-canonical §3. Breakthrough design non ancora spec-formalizzato. Dipende da per-player state in WS. | Per-player filtered state emitter in wsSession.js + sense/cognition model | ~8-10h |
| **B22 Failure-as-lore + meta-network degradation** | fine run | Epilogo Skiv 60s · wiki aggiornata · bioma degradato | 🔴 `failure_as_lore` come outcome state NON codificato. `campaign.js` advance gestisce outcome `timeout` ma NON lore-persistent epilogue. `worldStateService.js` NON esiste ancora (Sprint C Leviatano). Wiki Hades-pattern (Q2 v3-canonical) = design doc in volo, non implementata. | WorldStateService + wiki unlock trigger + Skiv epilogo lore ink knot | ~8-12h (Sprint C) |

---

## 2. Critical path + dependencies

### Dependency graph (linearizzato)

```
B0 (lobby QR) ──────────────────────────────────────────────► sempre parallelo

B1 (trait vote) ──────► B5 (imprint) ──► B6 (approdo)
                         │
B2 (VC swipe) ──────────┤
                         │
B3 (worldgen anim) ──────┤
                         │
B4 (foodweb anim) ───────┘

B6 (approdo) ───► B7 (clan test) ──► B9 (combat)
                                      │
B8 (mutagen wire) ───────────────────►│
                                      │
B9 (combat) ──► B10 (death optional) ► B11 (debrief) ──► B12 (nexus)

B12 (nexus) ──► B13 (4 tab phone) ──► B14 (Forma 3 arch) ──► B16 (scelta strat)
                │
                ► B15 (mating offspring)

B16 (scelta strat) ──► B17 (manifestazione) ──► Boss Sprint A
                                                  │
                       Boss Sprint A ─────────── ► B18 (Strato 1)
                                                  │
                       Boss Sprint A + B21 ──────► B19 (Strato 2 carte)
                                                  │
                       Boss Sprint B ────────────► B20 (3 esiti parley)
                                                  │
                       Boss Sprint C + B22 ───────► B22 (failure lore)
```

### Critical path (sequenza più lunga bloccante)

**B2 → B3 → B6 → B7 → B9 → B12 → B16 → B17 → B18 → B19 → B20 → B22**

Stima: 5 + 9 + 5 + 7 + 0 + 3 + 4 + 12 + incluso + 11 + 22 + 10 = **~88-120h no-parallel**

### Parallelizzabile

| Stream | Beat | Effort | Prerequisito |
|--------|------|--------|--------------|
| Stream A (Onboarding) | B0-B5 | ~33-43h | nessuno |
| Stream B (Combat enrich) | B8-B10 + B21 | ~14-17h | M15 già wired |
| Stream C (Nexus tabs) | B13-B15 | ~15-19h | B12 (nexus) |
| Stream D (Boss Leviatano) | B17-B20 | ~42-52h (Sprint A+B) | B16 |
| Stream E (World-state) | B22 | ~8-12h (Sprint C) | parallelo-safe |

---

## 3. Sprint pacchetti vertical slice

### Sprint VS-A — Worldgen visible + Onboarding (B0-B5)

**Scope**: primissimi 75s di esperienza — dalla stanza al bioma assegnato.  
**Effort**: ~30-40h  
**Prerequisito**: nessuno — parallelo-safe.

**File toccati (top)**:

| File | Modifica | LOC est |
|------|----------|---------|
| `apps/play/src/lobby.js` + `lobbyBridge.js` | QR lib (qrcode.js CDN) + 6-cerchi CSS animation roster | +60 |
| `apps/backend/routes/session.js` + NEW `traitVote.js` | POST `/api/session/vote/trait` + majority logic | +80 |
| `apps/play/src/onboardingPanel.js` | Estendi a 5 swipe-scenari con gesture touch | +120 |
| `apps/backend/routes/vcSwipe.js` NEW | 5 axes mapping → 4 MBTI engine formula | +80 |
| `apps/backend/routes/worldgen.js` NEW | GET `/api/worldgen/preview` (5 biomi + archi) | +100 |
| `apps/play/src/worldgenCanvas.js` NEW | SVG canvas TV nodo-per-nodo animation | +200 |
| `apps/play/src/foodwebRenderer.js` NEW | D3-like foodweb step-draw (no dep, pure canvas) | +180 |
| `apps/play/src/imprintScene.js` NEW | Silhouette + slot morph + affix reveal | +120 |
| `data/core/onboarding/vc_swipe_scenarios.yaml` NEW | 5 scenari YAML con axes delta output | +80 |

**DoD VS-A**:

1. QR generato e scanabile da phone reale → join session
2. 5 swipe completati in <15s → axes output visibile in debrief
3. Canvas TV mostra biomi + archi (non animated ok per v0, nodo-per-nodo stretch)
4. Imprint scene mostra silhouette specie + nome generato
5. Tests: 5 unit vcSwipe + 3 worldgen endpoint + 2 lobby QR smoke
6. AI regression verde

**Risk VS-A**:

- QR join dipende da `ngrok` tunnel URL stabile — workaround: URL manuale fallback
- Canvas worldgen pesante se >6 biomi — cap 5 biomi + lazy-load archi
- Swipe gesture mobile: fallback tap-card se touch API non supportata

---

### Sprint VS-B — Combat enrichment (B7-B11)

**Scope**: dal clan test al debrief — le 4 minuti di combat v3.2.  
**Effort**: ~25-35h  
**Prerequisito**: M15 round model (✅ già merged). Inizio parallelo con VS-A.

**File toccati (top)**:

| File | Modifica | LOC est |
|------|----------|---------|
| `apps/backend/routes/session.js` | social test endpoint `/api/session/clan_test` | +80 |
| `apps/backend/services/combat/socialTestEngine.js` NEW | 3-choice vote + Form-shift outcome | +120 |
| `apps/backend/services/combat/reinforcementSpawner.js` | wire mutagen_events trigger check | +60 |
| `apps/backend/services/combat/sessionHelpers.js` | mutagen event apply: pressure_add + stresswave_add | +40 |
| `apps/play/src/clanTestPanel.js` NEW | 3 carte aiuta/ostacola/ignora UI phone | +100 |
| `apps/backend/services/combat/biomeModifiers.js` | StressWave metric runtime (extend pressure knob) | +40 |
| `apps/play/src/main.js` | StressWave HUD bar render + update | +40 |
| `apps/play/src/debriefPanel.js` | wire Skiv-archetype 1 line voice in debrief | +20 |
| `services/narrative/narrativeEngine.js` | approdo + nexus ink knots | +80 |

**DoD VS-B**:

1. Clan test: 3 scelte → Form-shift visible nel debrief
2. Mutagen event trigger @ pressure threshold → messaggio diegetic visibile
3. StressWave barra HUD aggiornata ogni round per enc_frattura_03
4. Debrief mostra 1 linea Skiv voce (anche hardcoded per v0)
5. Tests: 6 unit socialTestEngine + 4 mutagen wire + 2 stresswave HUD
6. enc_frattura_03 playthrough N=5 sim, StressWave > 0 almeno round 2

**Risk VS-B**:

- Clan test Form-shift: mapping 3 esiti (aiuta/ostacola/ignora) → VC delta da definire pre-sprint. Serve design call 30min.
- Mutagen events: wire solo modalità `pressure_threshold` per v0 — skip `round_count` e `kill_event` trigger (deferred)
- StressWave ≠ pressure: sono metriche distinte. Decidere se StressWave = alias pressure o nuova var. Default raccomandato: alias (evita terza metrica).

---

### Sprint VS-C — Nexus + Climax (B12-B22, include Boss Leviatano A+B+C)

**Scope**: tutto da min 5:15 in poi — l'esperienza che NON esiste ancora.  
**Effort**: ~80-110h  
**Prerequisito**: VS-A + VS-B merged. Boss Sprint plan già scritto (`docs/planning/2026-04-26-leviatano-sprint-plan.md`).  
**Sequenza interna**: Nexus UI (B12-B16) → Boss Sprint A (B17-B18) → Boss Sprint B (B19-B20) → Boss Sprint C + B22.

**Sub-sprint VS-C1 — Nexus tabs (B12-B16), ~20-25h**:

| File | Modifica |
|------|----------|
| `apps/play/src/nestHub.js` | Rinomina tab + "Mondo" meta_network view |
| `apps/backend/routes/worldgen.js` | GET `/api/worldgen/meta_network` runtime |
| `apps/play/src/formsPanel.js` | Mini-picker 3 archetipi wrapper (Agile/Robusta/Specializzata) |
| `apps/play/src/nestHub.js` Mating tab | 3 offspring cards UI (PR 1877 deferred work) |
| `apps/backend/routes/campaign.js` | `/api/campaign/strategic_choice` (Riposa/Esplora/Spingi) |
| `services/narrative/narrativeEngine.js` | Nexus ink knot + Skiv self-naming |

**Sub-sprint VS-C2 — Boss Sprint A (B17-B18), ~12-15h**:

Vedi `docs/planning/2026-04-26-leviatano-sprint-plan.md` §Sprint A.  
Key files: `schemas/evo/encounter.schema.json` +60 LOC `phases[]`, `apps/backend/services/combat/phaseEvaluator.js` NEW +180, `apps/play/src/hudPhasePanel.js` NEW +120, `enc_frattura_03.yaml` migrato.

**Sub-sprint VS-C3 — Boss Sprint B (B19-B20), ~20-25h**:

Vedi `docs/planning/2026-04-26-leviatano-sprint-plan.md` §Sprint B.  
Aggiunge: cross-player action swap (B19 "carte di un altro") NON presente nel sprint plan originale — stima extra +10-12h sopra i 20-25h Sprint B.  
Key files: `apps/backend/services/combat/parleyEvaluator.js` NEW, outcome enum session.js, `memory_fog` hazard runtime.

**Sub-sprint VS-C4 — Boss Sprint C + failure-as-lore (B21-B22), ~15-20h**:

Vedi `docs/planning/2026-04-26-leviatano-sprint-plan.md` §Sprint C.  
Key files: `apps/backend/services/world/worldStateService.js` NEW, Prisma migration 0005, Skiv epilogo ink knot, wiki unlock trigger.

**DoD VS-C** (aggregate):

1. Nexus tabs 4 funzionanti: Me(squad) / Branco(mating+lineage) / Mondo(meta_network) / Relazioni(codex+asimmetrico)
2. 3 archetipi Forma selezionabili + PI cost deducted
3. enc_frattura_03 multi-stage 3 fasi playthrough verde
4. 3 esiti (parley/retreat/combat) reachable con test N=5 each
5. "Carte di un altro" funziona 1 round in demo
6. Failure-as-lore: wipe → epilogo Skiv 60s → wiki unlock 1 entry

**Risk VS-C**:

- **ALTO**: "Carte di un altro" (B19) non ha spec tecnica. Richiede design call prima del sprint: chi swappa cosa, come il phone lo mostra, come il backend lo gestisce.
- **ALTO**: Asymmetric world info (B21) richiede refactor `publicSessionView` → per-player filtered — potenziale breaking change su 15+ test.
- **MED**: Parley balance: 35-55% reach con enemy bilanciato per abisso (diff 5). Calibration harness obbligatorio post Sprint B.
- **LOW**: Prisma migration 0005 (world state) — round-trip documentato nel sprint plan.

---

## 4. Top 5 quick wins

Quick win = beat singolo, ≤12h, high visual impact, zero breaking change.

| # | Quick win | Beat | Effort | Impact | File principali |
|---|-----------|------|--------|--------|-----------------|
| **QW-1** | **StressWave HUD bar** | B9 | ~3h | Alta — rende il biome enc_frattura_03 visivamente distintivo. Già la barra c'è nella wireframe HTML. | `apps/backend/services/combat/biomeModifiers.js` +40 · `apps/play/src/main.js` +40 |
| **QW-2** | **Mutagen event wire** | B8 | ~4-5h | Alta — l'evento visivo che "rompe" l'arco è il momento più memorabile del v3.2. YAML pronto. | `apps/backend/services/combat/reinforcementSpawner.js` +60 · `sessionHelpers.js` +40 |
| **QW-3** | **3 carte trait branco vote** | B1 | ~5h | Alta — primo momento "siamo un branco" della sessione. Pack roller esiste. | `apps/backend/routes/session.js` +50 · NEW `traitVote.js` +80 · `apps/play/src/phoneComposerV2.js` +60 |
| **QW-4** | **Scelta strategica host vote** | B16 | ~4-5h | Med-Alta — chiude il loop Nido → campagna (Nido OD-001 spedito, mancava solo l'uscita). | `apps/backend/routes/campaign.js` +60 · `apps/play/src/nestHub.js` +40 |
| **QW-5** | **Nexus ink knot + Skiv voice debrief** | B11 + B12 | ~3-4h | Med — aggiunge voce diegetic a 2 momenti esistenti senza infra nuova. inkjs già wired. | `services/narrative/narrativeEngine.js` +80 · `apps/play/src/debriefPanel.js` +20 |

**Ordine raccomandato quick wins**: QW-1 → QW-2 → QW-3 → QW-5 → QW-4.  
Stima totale 5 QW: ~19-22h. Esperienza dopo: combat visivamente ricca + momento mutageno + branco condiviso + voce companion.

---

## 5. Pitch deck readiness (N6)

**Target N6**: screenshot Atollo + slide "La Frattura" (3 strati visual).

**Requisiti minimi N6** (cosa DEVE esistere):

| Asset N6 | Stato oggi | Effort minimo | Sprint |
|----------|------------|---------------|--------|
| Screenshot Atollo (worldgen biomi visible) | 🔴 NON esiste | ~9h (B3 canvas TV) | VS-A |
| Screenshot Frattura (3 strati HUD) | 🟡 enc_frattura_03 YAML ok, HUD NON | ~13h (B17 Sprint A) | VS-C2 |
| Demo live 2 min worldgen → combat | 🔴 NON chain continua | VS-A + VS-B | ~35-50h |
| Slide "La rete ha plasmato la missione" | 🟡 meta_network YAML ok | ~6h (B3 + worldgen endpoint) | VS-A |

**Stima N6 readiness**: ~35-45h (VS-A completo + Boss Sprint A). Circa 3 sprint settimana intensiva.

---

## 6. Recommendation — da quale sprint partire

**FIRST: Sprint VS-A (Worldgen visible)** — 3 ragioni:

1. B3 worldgen canvas + B4 foodweb = momento "wow" del deck N6. Alto visual, zero dipendenza su Boss Leviatano.
2. B0 QR + B1 trait vote = esperienza co-op immediata migliorata. Chiunque entra in sessione sente "siamo un branco".
3. VS-A è 100% parallelo-safe con tutto. Non blocca nessuno.

**SECOND (parallelo VS-A)**: QW-1 + QW-2 (StressWave + Mutagen wire) — ~7-8h totale. Arricchisce il combat esistente mentre VS-A costruisce il mondo.

**THIRD**: VS-B (combat social test + clan apex) — dipende da VS-A solo per B6 approdo. La maggior parte è indipendente.

**FOURTH**: VS-C — dipende da VS-A+B. Sequenza interna: Nexus tabs → Boss Sprint A → B → C.

**Design decision bloccante prima di VS-C**: "Carte di un altro" (B19) non ha spec tecnica. Serve 30-60 min design call su: chi swappa cosa, durata, UI phone durante swap, test fallback se player DC.

---

## 7. Effort summary

| Sprint | Beat | Effort |
|--------|------|--------|
| VS-A (Worldgen + Onboarding) | B0-B5 | ~30-40h |
| VS-B (Combat enrichment) | B6-B11 | ~25-35h |
| VS-C1 (Nexus tabs) | B12-B16 | ~20-25h |
| VS-C2 (Boss Sprint A) | B17-B18 | ~12-15h |
| VS-C3 (Boss Sprint B + "carte di un altro") | B19-B20 | ~30-37h |
| VS-C4 (Boss Sprint C + failure lore) | B21-B22 | ~15-20h |
| **TOTALE** | 22 beat | **~132-172h** |

Note: 75-90h stima originale Boss Leviatano dal sprint plan include playtest cycle. Qui includo solo impl, escludo balance iteration. Con balance: +20-30h.

---

**Verdict**: `VERTICAL_SLICE_BUILD_READY (effort ~132-172h impl + ~20-30h balance) / NEEDS_DESIGN_DECISION_FIRST (su B19 "carte di un altro" + B7 clan test Form-shift delta + B21 asymmetric world info refactor scope)`
