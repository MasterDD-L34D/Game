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

## Residual sweep games-source-index (2026-06-08)

Secondo controllo (richiesto): tutta la KM + doc/memorie che parlano di giochi.
Fonti: catalogo SoT `docs/guide/games-source-index.md` (overlay + tier S/A/B/C/D/E +
anti-ref + persona) + non-index (deep-research/Flint/Cards) + memorie. Subagent
`sot-planner` loop-until-dry, git-verified.

**DRY-check**: KM largely esaurita. ~1055 vault-doc citano giochi ma il grosso =
rumore chatgpt-export (GDR/fantasy-prompt/char-forge), non design tattico. Le fonti
rilevanti (v2-critique, deepgame, kill-60, research-todo, DEEP_RESEARCH dir1-4/6,
tactical-lessons, jobs/status-roadmap, flint-repo-drop) = ZERO nuovi. Esaurita.

### Residui accettati (estensioni, roadmap sez. 3ter)

| id  | Feature (gioco)                     | Pillar | Stato git                                                      | Estende           |
| --- | ----------------------------------- | ------ | -------------------------------------------------------------- | ----------------- |
| G-1 | pact_difficulty_menu (Hades/MT)     | P6     | engine LIVE (`pact_shards:0..5`), surface DEAD                 | SPEC-K            |
| G-2 | support_relation_arcs (Fire Emblem) | P3+P4  | recruit/affinity/narrativeEngine LIVE, trigger no              | SPEC-G + SPEC-E   |
| G-3 | charm_boss_recruit (Tactics Ogre)   | P3     | parley ADR esiste, dialogue-recruit no                         | SPEC-H + SPEC-E   |
| G-4 | tribe synergy + cross-party unlock  | P3+P5  | 0 same-species party-passive (Wildfrost/Cobalt/Backpack M-023) | SPEC-E            |
| G-5 | Banner Saga caravan supply          | P6     | 0 campaign-resource-drain (POST-MVP, L)                        | SPEC-J / nuovo    |
| G-6 | Banner Saga permadeath opt-in       | P6     | 0 permadeath (woundedPerma = scar)                             | SPEC-J (POST-MVP) |

**Nota supersede**: la sez. PARKED-OK sopra e' superata per G-1 (pact: engine
`pact_shards` trovato LIVE -> surface-gap reale, non parked) + G-5/G-6 (Banner Saga
accettati POST-MVP). Gli altri PARKED-OK restano.

### Dedup (gia' coperti, non re-inserire)

- Invisible Inc hidden-abilities = M-4 (SPEC-Q). Wildfrost counter-delay = C1 status-v2 (sez. 3bis).
- Mewgenics three-horizons = annotation SPEC-B/K (concept implicito).
- Tactical Breach Wizards undo = B9 rewind (shipped). Wildfrost counter-HUD = shipped #1932.
  Citizen Sleeper drift-briefing = shipped #1932 (data live).

### PARKED-OK confermati (non revivere)

gene_grid_bingo (S6 deep-genetics freeze ADR-2026-05-26); Astrea dice-radar (GATED
OD-013); Backpack Hero organ_system (museum M-023, post-S6); Cobalt position-cond
(deferred ADR); Dicey/Beglitched (metodologia, non feature); forgia-celeste deepgame
(GPT narrative scaffold, dominio unrelated).
