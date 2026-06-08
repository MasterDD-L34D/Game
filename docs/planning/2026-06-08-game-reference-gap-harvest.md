---
title: 'Game-reference gap harvest -- DF-levels (RECONCILIATION-MASTER vs piani)'
date: 2026-06-08
type: gap-analysis
doc_status: review_needed
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, gap-analysis, reference-games, df-levels, spec-q]
related: docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md
---

# Game-reference gap harvest (2026-06-08)

Ultimo controllo: feature collegate a reference-game volute ma NON correttamente
rappresentate nei piani. Fonti: `Spaces/Dev/Evo-Tactics/core/RECONCILIATION-MASTER.md`
(A5 vault, DF + 31 giochi -> L0-L5) + `docs/adr/ADR-2026-05-18-df-levels-integration-direction.md`
(Game, ground-truth corretto) + deep-research/game-references cards + games-source-index.
Cross-check git-verificato vs Spec A..P + roadmap sez. 3bis + PILLAR-LIVE-STATUS.
Triage utente 2026-06-08: tutti accettati -> SPEC-Q + roadmap sez. 3ter.

## Finding

Blind-spot: Spec A..P = SUPERFICI device/TV; manca la PROFONDITA' narrativa/simulativa
(DF-levels L1-L5). Molte voci del master (2026-05-18) sono ORA shipped o in-spec (il
git-verify ha corretto l'undercount); 7 sono genuinamente mancanti.

## MISSING (game-linked, assenti da tutti i piani) -> SPEC-Q

| id  | Feature (gioco)                                                          | Livello | Evidence git                                                                                                        | Casa                     |
| --- | ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| M-7 | Chronicle/EventLog narrativo cross-session + viewer (DF/Loop Hero/Slay)  | L4      | services/{eventlog,chronicle} 404; combat-log `sessionRoundBridge` LIVE (diverso); solo `/campaign/seasonal/events` | SPEC-Q keystone (A3/A13) |
| M-2 | Identity-earned: name emergence + portrait overlay + storia (Wildermyth) | L1      | services/identity 404; 0 hit earnedName/identityEarned; SPEC-J copre solo scar-stat (`woundedPerma`)                | SPEC-Q                   |
| M-1 | Named heirlooms/artefatti con storia (FFT)                               | L3      | 0 hit namedWeapon/artifactHistory                                                                                   | SPEC-Q                   |
| M-3 | Named-mutation lineage contratto Game-side (Godot-v2 ha draft)           | L3      | spec in Game-Godot-v2 (draft); Game backend 0 schema/endpoint                                                       | SPEC-Q / SPEC-E          |
| M-4 | Hidden/evolving enemy abilities reveal (Invisible Inc)                   | L2/P5   | 0 design in Game; SPEC-H/I non lo coprono                                                                           | SPEC-Q + SPEC-H          |
| M-5 | "Ogni job = 1 domanda core" design-constraint (Dicey Dungeons)           | P3      | non tracciato in nessun doc                                                                                         | SPEC-Q + SPEC-E          |
| M-6 | Visual-swap su mutazione (Spore) -- verify                               | P2      | `derived_ability_id` null -> likely 0-runtime                                                                       | SPEC-Q + SPEC-K verify   |

## MISREPRESENTED (label stale, vault vs git)

| id  | Voce                                          | Mismatch                                             | Verdetto                                    |
| --- | --------------------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| R-1 | Triangle Strategy A+B "FORGOTTEN 5/5" (vault) | git: SHIPPED `mbtiSurface.js`/`mbtiPalette.js` #1848 | vault A5 stale; non riaprire RESCUE-001/002 |
| R-2 | Sentience Tiers "not integrated" (vault)      | data SHIPPED #1808; behavior-wire = gap reale (C5)   | piani OK (C5 partial)                       |
| R-3 | Wildermyth "IN-DESIGN" (vault)                | ADR: GREENFIELD; services/identity 404               | piani understate -> M-2                     |
| R-4 | Worldgen tick "5/5 quick-win" (vault)         | DESIGN-ONLY (foodweb data si', runtime no)           | sez.3bis A9 framing OK                      |
| R-5 | AI War Sistema "pending #2328"                | SHIPPED #2371/#2387, P5 confirmed 2026-06-01         | PILLAR-LIVE-STATUS OK; vault stale          |

R-1/R-2/R-4/R-5 = staleness vault A5 (non-governing, gia' corretto da ADR-2026-05-18).
Solo R-3 = gap piano reale (= M-2). Nessuna fix piano per le altre.

## PARKED-OK (deferred deliberato, reference-game)

Citizen Sleeper needs/fatigue (L0, post-Bundle C); Cocoon biome-rules (post-P3);
Inscryption dossier-reveal (post-MVP); 1000xRESIST memory-POV (post-Bundle B); Banner
Saga attrition / Hades permadeath / Monster Train Pact-Shards (post-playtest, difficulty
= gap B11); Backpack Hero adjacency / Astrea dice / Pentiment job-voice / Tunic
codex-decipher (gated). Restano fuori scope MVP per scelta.

## Provenienza

- Subagent: `sot-planner` (vault reference-cards x current plans, git-verified).
- eng-graph: cognee SSE `fact` su pattern-promossi / Pact-Shards / RECONCILIATION (conferma corpus).
- Spot-verify git: `services/{identity,eventlog,chronicle}` 404; SPEC-J scar coverage; `/campaign/seasonal/events` unico events endpoint.
