---
title: 'Design-data gap resolution plan — 4 wave (decisioni master-dd bakate)'
workstream: cross-cutting
category: planning
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-30'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [planning, gap-resolution, roadmap, design-data, atlas, waves]
---

# Design-data gap resolution plan (2026-05-30)

> Piano di risoluzione dei gap mappati in [`docs/guide/DESIGN-DATA-ATLAS.md`](../guide/DESIGN-DATA-ATLAS.md)
> (8 sistemi). Ogni gap -> resolution mode + effort + dipendenza + wave + execution-mode.
> Decisioni master-dd 2026-05-30 bakate. **Principio** (dai 5 meta-pattern atlas): _wire
> surface non costruire engine_ + _non aggiungere dato finche l'esistente non e wired_ +
> _decisioni sbloccano_ -> ordino per ROI/sblocco, non per dimensione.

> **REFRAME 2026-05-30** (post census [#2454](../superpowers/specs/2026-05-30-ecologia-combat-disconnect-strategy.md)):
> il census ecologia-combat dimostra che la keystone di Wave 3/4 NON e il backfill-broad ma
> l'**adapter ecologia->combat** -- 0/53 specie canoniche hanno hp/mod/dc (solo 6 tutorial).
> Senza adapter ogni specie backfillata resta inusabile in combat. Wave 3 ristrutturata
> adapter-first + backfill YAGNI; D4 demoted (foodweb-only); nuova D6 (rovine_planari).
> Wave 1/2 invariate (gap ortogonali: mbti/ennea surface + combat-orphan engine).

## Decisioni master-dd LOCKED (2026-05-30)

- **D1 — Orphan combat (4)**: **WIRE TUTTI** (revive-culture pieno). morale + cumstate + woundperma + vcsnap.
- **D2 — Pathfinder 1211**: **FULL SEED PASS** (30-50 creature/bioma in tutti i foodweb).
- **D3 — Sequencing**: plan-doc-first (questo doc) -> esecuzione per wave sotto.
- **D3b — Adapter-first reframe (2026-05-30, post census #2454)**: la keystone Wave 3/4 e l'adapter ecologia->combat (deriva hp/mod/dc deterministici da threat_tier/role_trofico + trait modifier). Backfill-broad = YAGNI (solo biomi/specie toccati dal gameplay). Pilota verticale su badlands prima di generalizzare. GAP-C (mondo a inizio partita) resta POST-MVP.
- **D5 — SPECIES_BY_JOB (RESOLVED 2026-05-30)**: SoT = `species.jobs_bias` (1:many, gia esistente, 23/81 specie); `SPECIES_BY_JOB` = indice inverso **DERIVATO** a build-time (job -> specie eligibili). **soft-gate** (player non hard-locked; jobs_bias resta anche AI-bias). Sostituire l'hardcoded map (`hardcoreScenario.js:90-95`) con l'indice derivato (anti-drift L-075). Backfill `jobs_bias` per coprire gli 11 job. **Impl deferita al player-roster UI** (unico consumer reale, non ancora wired -- YAGNI): la SHAPE e decisa, l'infra si costruisce col consumer.
- **D6 — rovine_planari (RESOLVED 2026-05-30)**: **NON toccare hardcore_06/07** (content shipped + bande ratificate 15-25%/30-50%, revive-culture). Riempire le 10 specie rovine_planari come **NUOVO contenuto** (Wave 3/4, YAGNI: solo se il gameplay le tocca) per encounter futuri. Retrofit di hardcore_06/07 con specie reali = **decisione separata gated dopo** (richiede band re-ratify N=40).

## Decisioni ANCORA pending (gate-ano Wave 3-4)

- **D4 — biome-assignment heuristic** (DEMOTED post #2454): come assegnare biome_affinity alle 32 specie senza? (Phase-3 heuristic ADR-2026-05-15: functional_signature + clade + trait_plan). **Non piu critical-path**: serve a foodweb-membership (GAP-A), NON alla combat-usabilita (quella e l'adapter D3b). Si risolve per-bioma quando si estende un ecosystem.yaml a un bioma gameplay-touched.
- **D5 + D6 — RESOLVED 2026-05-30** -> spostate in "Decisioni master-dd LOCKED" sopra (D5 = derive-from-jobs_bias DRY + impl deferita roster-UI; D6 = leave-hardcore + fill-as-new-content).
- **L2-L5 lore**: resta gated da playtest AI-driven canonico (ADR-2026-05-18-df-levels, gia deciso). NON sblocca finche core-loop non validato.

> Stato gate Wave 3-4: D3/D3b LOCKED, D4 demoted (foodweb-only, non critical-path), D5/D6 RESOLVED. Resta pending solo L2-L5 (playtest-gated). Il critical-path Wave 3 (adapter) NON e gated da decisioni aperte.

---

## Wave 1 — surface quick-win (NOW, max ROI, zero nuovo engine)

| Ticket                   | Gap                                                | Sistema    | Mode          | Effort | Dip     |
| ------------------------ | -------------------------------------------------- | ---------- | ------------- | ------ | ------- |
| TKT-P4-ENNEAVOICE-FE     | ennea-voice endpoint 796 righe = dead surface      | mbti/ennea | frontend chip | ~4h    | nessuna |
| TKT-P4-DIALOGUE-COLORS   | mbtiPalette helper shipped, pipeline non auto-wrap | mbti/ennea | frontend      | ~2h    | nessuna |
| TKT-P4-CONVICTION-BADGES | conviction badge backend-computed, no render       | mbti/ennea | frontend      | ~1h    | nessuna |

Outcome: **P4 🟡++ -> 🟢** (surface 60%->90%). Indipendente, eseguibile subito. Allineato meta-pattern #1 (wire surface).

## Wave 2 — backend wiring (chip/sessione backend; D1 DECISO)

| Ticket                | Gap                                                  | Mode         | Effort | Nota                                      |
| --------------------- | ---------------------------------------------------- | ------------ | ------ | ----------------------------------------- |
| TKT-ORPHAN-MORALE     | morale.js shipped #1959, mai wired roundOrchestrator | backend chip | ~3h    | D1 WIRE. P6 fairness                      |
| TKT-ORPHAN-CUMSTATE   | cumulativeStateTracker.js Phase-7 TODO, 0 caller     | backend chip | ~4h    | D1 WIRE. sblocca trigger mutation Phase-6 |
| TKT-ORPHAN-WOUNDPERMA | write-path morto (read live)                         | backend chip | ~3h    | D1 WIRE. apply wound in combat            |
| TKT-ORPHAN-VCSNAP     | test-only Godot mirror                               | backend chip | ~2h    | D1 WIRE. debrief broadcast                |
| TKT-JOB-PHASEC        | 24 passive-tag expansion senza handler               | backend chip | ~12h   | progressionEngine handlers + test         |

Outcome: combat engine fully wired (34/34); job expansion perks attivi. Smoke obbligatorio (backend) + AI regression. Conflitto atteso minimo (chip 1 SEED gia merged).

## Wave 3 — adapter-first + data backfill YAGNI (post census #2454; D3b)

> **Ristrutturata 2026-05-30.** Keystone = adapter (TKT-ADAPTER-ECO-COMBAT), NON backfill-broad.
> Ordine interno: adapter+pilota -> census/reconcile (data hygiene) -> backfill solo-gameplay-touched.
> D4 non gate piu il critical-path. L'adapter e nuovo engine, ma e il _ponte minimo mancante_ (eccezione
> motivata al meta-pattern "wire surface non engine": senza il ponte il materiale esistente resta morto).

| Ticket                     | Gap                                                                                                                                                                                                                                                       | Mode                                                | Effort                | Dip                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------- | ---------------------------- |
| TKT-ADAPTER-ECO-COMBAT     | 0/53 specie con hp/mod/dc; manca il ponte ecologia->combat. **Keystone.** Deriva stat deterministiche da threat_tier/role_trofico + trait modifier; pilota badlands (ri-ambienta 1 scenario su specie reali -> GAP-A accetta rinforzi veri, non fallback) | engine + pilota                                     | ~Mh (spec)            | D3b. **band re-verify N=40** |
| TKT-SPECIE-CANON-RECONCILE | 85 dir-bioma vs 53 SOT canon non 1:1 + 13/14 creature-scenario orfane -> censire e ricondurre                                                                                                                                                             | data hygiene                                        | audit                 | -                            |
| TKT-SPECIE-LIFECYCLE       | 38/53 specie senza lifecycle YAML                                                                                                                                                                                                                         | data-gen (seed_lifecycle_stubs.py esiste) + content | incrementale (OD-008) | -                            |
| TKT-ECO-YAML-GEN           | 17/20 biomi senza ecosystem.yaml risolvibile -- **YAGNI: solo biomi gameplay-touched**                                                                                                                                                                    | data-gen                                            | ~Nh/bioma             | D4 (qualita, per-bioma)      |
| TKT-SPECIE-BIOME           | 32/53 specie senza biome_affinity -- solo per i biomi estesi                                                                                                                                                                                              | data-gen heuristic                                  | ~Nh                   | D4 (demoted)                 |
| TKT-TRAIT-RECONCILE        | 104 trait glossary senza meccanica + tassonomia 57->106                                                                                                                                                                                                   | data hygiene                                        | audit                 | -                            |

Outcome: l'adapter sblocca la combat-usabilita del materiale esistente (pilota badlands verticale); il backfill diventa mirato (YAGNI) non broad. Foodweb consumer (#2447) riceve ecosistemi reali per i biomi che servono. NON prima di Wave 2.

## Wave 4 — content + Pathfinder seed (writer/designer; D2 DECISO; L2-L5 gated)

| Ticket                    | Gap                                                                      | Mode             | Effort      | Nota                                                                                             |
| ------------------------- | ------------------------------------------------------------------------ | ---------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| TKT-PATHFINDER-SEED       | 1211 Pathfinder -> foodweb                                               | designer pass    | **~30-50h** | D2 FULL. Dip: **adapter (D3b)** + ecosystem.yaml (Wave 3) -- seedare specie con stat via adapter |
| TKT-LORE-CANON            | premessa macro DRAFT -> docs/core                                        | writer/master-dd | ~2-4h       | + L2-L5 footnote gated                                                                           |
| TKT-LORE-FRATTURA-SPECIES | 4 specie Frattura (Polpo/Sciame/Leviatano/Simbionte) non in species.yaml | designer         | ~18h        | arco flagship                                                                                    |
| TKT-LORE-BRIEFINGS        | ~20 briefing encounter (narrative_pre/post)                              | writer           | ~12h        | writer bottleneck                                                                                |
| TKT-CODEX                 | codex schema vuoto (0 entry)                                             | writer           | ~10h (M2)   | diegetic unlock                                                                                  |

Gated (post-playtest, NON in questo plan): L3 artefatti/relics · L4 narrative surface full · L5 "losing is fun" · lineage-narrative UI · Chronicle/EventLog.

---

## Dipendenze (grafo)

```
Wave1 (ennea-voice FE) ---- indipendente ----> esegui ORA
Wave2 (orphan-wire D1 + PhaseC) -- indipendente -> chip backend
ADAPTER (D3b, keystone) --gate--> Wave3 backfill utile + Wave4 Pathfinder-seed
D4 (biome-heuristic, demoted) --gate per-bioma--> eco-yaml di QUEL bioma (non critical-path)
Wave3 (adapter + ecosystem.yaml mirati) --gate--> Wave4 (Pathfinder-seed: stat via adapter)
D6 (rovine_planari) --gate--> specie di hardcore_06/07
L2-L5 lore --gate--> playtest AI-driven canonico (CANONICAL-AI-PLAYTEST.md)
```

Sequenza consigliata: **Wave1 (ora) -> Wave2 (chip) -> ADAPTER pilota badlands (spec->impl->N=40) -> Wave3 backfill mirato + D6 verdict -> Wave4**.
Pathfinder-seed (Wave4, il piu grosso) DOPO adapter (per le stat) + ecosystem.yaml mirati (Wave3), altrimenti si seedano specie senza numeri di combat.

## Effort totale (rough)

| Wave                                                  | Effort                             |
| ----------------------------------------------------- | ---------------------------------- |
| Wave1 surface                                         | ~7h                                |
| Wave2 backend (orphan 12 + PhaseC 12)                 | ~24h                               |
| Wave3 adapter+pilota badlands (keystone)              | ~TBD (spec first)                  |
| Wave3 backfill YAGNI (mirato, non broad)              | ridotto vs ~20-30h originale       |
| Wave4 content+Pathfinder (Pathfinder 30-50 + lore 35) | ~65-85h                            |
| **Totale**                                            | multi-sprint (adapter da spec'are) |

## Execution mode

- **Wave1 + Wave2** = chip backend/frontend (sessione con backend up per smoke, ADR-0011 + QG). Pattern gia usato (chip seed/triangulate/worldgen).
- **Wave3** = adapter (engine, sessione backend + band re-verify N=40) PRIMA, poi data-gen mirato + content review master-dd.
- **Wave4** = writer (lore) + designer (Pathfinder). Master-dd content gate.
- Ogni ticket: smoke + AI regression + band-neutrality (canonical AI-playtest) prima di merge.

## Riferimenti

- Atlas (mappa gap): [`docs/guide/DESIGN-DATA-ATLAS.md`](../guide/DESIGN-DATA-ATLAS.md) #2452
- Census ecologia-combat (reframe adapter-first): [`docs/superpowers/specs/2026-05-30-ecologia-combat-disconnect-strategy.md`](../superpowers/specs/2026-05-30-ecologia-combat-disconnect-strategy.md) #2454
- BACKLOG ticket esistenti: TKT-ORPHAN-\* · TKT-WORLDGEN-GAPA/B/C · TKT-PLAYTEST-SEED/TRIANGULATE/SUITE
- Metodo playtest gate: [`docs/process/CANONICAL-AI-PLAYTEST.md`](../process/CANONICAL-AI-PLAYTEST.md)
- Vault hub: `Atlas/evo-tactics-design-data-atlas-moc.md`
