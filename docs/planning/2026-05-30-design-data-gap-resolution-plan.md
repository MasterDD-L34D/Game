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

## Decisioni master-dd LOCKED (2026-05-30)

- **D1 — Orphan combat (4)**: **WIRE TUTTI** (revive-culture pieno). morale + cumstate + woundperma + vcsnap.
- **D2 — Pathfinder 1211**: **FULL SEED PASS** (30-50 creature/bioma in tutti i foodweb).
- **D3 — Sequencing**: plan-doc-first (questo doc) -> esecuzione per wave sotto.

## Decisioni ANCORA pending (gate-ano Wave 3-4)

- **D4 — biome-assignment heuristic**: come assegnare biome_affinity alle 32 specie senza? (Phase-3 heuristic ADR-2026-05-15: functional_signature + clade + trait_plan). Gate Wave 3 specie-biome + qualita ecosystem.yaml + target Pathfinder-seed.
- **D5 — SPECIES_BY_JOB**: schema mapping specie<->job (quale specie sblocca quali job). Gate job-specie identity.
- **L2-L5 lore**: resta gated da playtest AI-driven canonico (ADR-2026-05-18-df-levels, gia deciso). NON sblocca finche core-loop non validato.

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

## Wave 3 — data backfill (generator + incrementale; D4 gate)

| Ticket               | Gap                                                     | Mode                                                | Effort                | Dip          |
| -------------------- | ------------------------------------------------------- | --------------------------------------------------- | --------------------- | ------------ |
| TKT-SPECIE-LIFECYCLE | 38/53 specie senza lifecycle YAML                       | data-gen (seed_lifecycle_stubs.py esiste) + content | incrementale (OD-008) | -            |
| TKT-SPECIE-BIOME     | 32/53 specie senza biome_affinity                       | data-gen heuristic                                  | ~Nh                   | **D4**       |
| TKT-ECO-YAML-GEN     | 17/20 biomi senza ecosystem.yaml risolvibile            | data-gen                                            | ~Nh/bioma             | D4 (qualita) |
| TKT-TRAIT-RECONCILE  | 104 trait glossary senza meccanica + tassonomia 57->106 | data hygiene                                        | audit                 | -            |

Outcome: data-rich diventa data-wired. Foodweb consumer (gia live #2447) ora ha 20/20 ecosistemi risolvibili. NON prima di Wave 2 (non aggiungere dato finche surface non wired = meta-pattern #2).

## Wave 4 — content + Pathfinder seed (writer/designer; D2 DECISO; L2-L5 gated)

| Ticket                    | Gap                                                                      | Mode             | Effort      | Nota                                              |
| ------------------------- | ------------------------------------------------------------------------ | ---------------- | ----------- | ------------------------------------------------- |
| TKT-PATHFINDER-SEED       | 1211 Pathfinder -> foodweb                                               | designer pass    | **~30-50h** | D2 FULL. Dip: ecosystem.yaml (Wave 3) come target |
| TKT-LORE-CANON            | premessa macro DRAFT -> docs/core                                        | writer/master-dd | ~2-4h       | + L2-L5 footnote gated                            |
| TKT-LORE-FRATTURA-SPECIES | 4 specie Frattura (Polpo/Sciame/Leviatano/Simbionte) non in species.yaml | designer         | ~18h        | arco flagship                                     |
| TKT-LORE-BRIEFINGS        | ~20 briefing encounter (narrative_pre/post)                              | writer           | ~12h        | writer bottleneck                                 |
| TKT-CODEX                 | codex schema vuoto (0 entry)                                             | writer           | ~10h (M2)   | diegetic unlock                                   |

Gated (post-playtest, NON in questo plan): L3 artefatti/relics · L4 narrative surface full · L5 "losing is fun" · lineage-narrative UI · Chronicle/EventLog.

---

## Dipendenze (grafo)

```
Wave1 (ennea-voice FE) ---- indipendente ----> esegui ORA
Wave2 (orphan-wire D1 + PhaseC) -- indipendente -> chip backend
D4 (biome-heuristic) --gate--> Wave3 (specie-biome, eco-yaml qualita, Pathfinder target)
Wave3 (ecosystem.yaml) --gate--> Wave4 (Pathfinder-seed: seedare DENTRO gli ecosystem.yaml)
L2-L5 lore --gate--> playtest AI-driven canonico (CANONICAL-AI-PLAYTEST.md)
```

Sequenza consigliata: **Wave1 (ora) -> Wave2 (chip) -> D4 verdict -> Wave3 -> Wave4**.
Pathfinder-seed (Wave4, il piu grosso) DOPO ecosystem.yaml (Wave3), altrimenti non c'e dove seedare.

## Effort totale (rough)

| Wave                                                  | Effort                       |
| ----------------------------------------------------- | ---------------------------- |
| Wave1 surface                                         | ~7h                          |
| Wave2 backend (orphan 12 + PhaseC 12)                 | ~24h                         |
| Wave3 data backfill                                   | ~20-30h                      |
| Wave4 content+Pathfinder (Pathfinder 30-50 + lore 35) | ~65-85h                      |
| **Totale**                                            | **~115-145h** (multi-sprint) |

## Execution mode

- **Wave1 + Wave2** = chip backend/frontend (sessione con backend up per smoke, ADR-0011 + QG). Pattern gia usato (chip seed/triangulate/worldgen).
- **Wave3** = data-gen (generator esistenti) + content review master-dd. Parte safe-here, parte sessione.
- **Wave4** = writer (lore) + designer (Pathfinder). Master-dd content gate.
- Ogni ticket: smoke + AI regression + band-neutrality (canonical AI-playtest) prima di merge.

## Riferimenti

- Atlas (mappa gap): [`docs/guide/DESIGN-DATA-ATLAS.md`](../guide/DESIGN-DATA-ATLAS.md) #2452
- BACKLOG ticket esistenti: TKT-ORPHAN-\* · TKT-WORLDGEN-GAPA/B/C · TKT-PLAYTEST-SEED/TRIANGULATE/SUITE
- Metodo playtest gate: [`docs/process/CANONICAL-AI-PLAYTEST.md`](../process/CANONICAL-AI-PLAYTEST.md)
- Vault hub: `Atlas/evo-tactics-design-data-atlas-moc.md`
