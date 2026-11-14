---
title: 'Session handoff 2026-06-22 -- codex lore PHASE 1+2 + OD-024 sentience program'
date: 2026-06-22
sprint: codex-lore-and-od024-sentience
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-22'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Handoff 2026-06-22 (Lenovo) — codex lore + OD-024 sentience

## TL;DR

Due filoni chiusi/avanzati: (1) **codex A.L.I.E.N.A. lore voice + pilot encounter** (PHASE 1+2);
(2) **OD-024 sentience interoception program** — producer + 2 motori D6 + D3 enemy-wire +
D2 ratify, con riconciliazione di un interleave cross-sessione. Tutto **flag-OFF /
band-neutral**. Residuo = D4 pipeline (piano dedicato), engine #3 (parcheggiato), D7
flip (owner).

## PR mergiate (questa sessione, su origin/main)

| PR                                                                  | Cosa                                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [#2930](https://github.com/MasterDD-L34D/Game/pull/2930) `268a13d4` | codex: voce IT naturale (taxon hooks + EN→IT lifecycle/neighbors) + pilot encounter apex_neutral (PHASE 1+2) |
| [#2932](https://github.com/MasterDD-L34D/Game/pull/2932) `7053c830` | sentience: producer interocezione flag-gated (Gate-5) — D1/D2-infra/D4-read                                  |
| [#2936](https://github.com/MasterDD-L34D/Game/pull/2936) `d38ffa92` | combat: engine #1 nocicezione "ritardi quando Ferito" (action-timing slow)                                   |
| [#2937](https://github.com/MasterDD-L34D/Game/pull/2937) `3c6a0209` | combat: engine #2 stamina/fatica sprint subsystem                                                            |
| [#2945](https://github.com/MasterDD-L34D/Game/pull/2945) `497124f2` | sentience: D3 grant esteso a unità nemiche/sistema a /start                                                  |
| #2944 / #2946 / #2947                                               | doc-sync: engine#2 done · D3 done · **D2 map RATIFICATA** + verdetti D1-D7                                   |

Parallelo (altra sessione, riconciliato): **#2941** ratify D1-D7 program (SUPERSEDE: D3 player→player+enemies, D7 defer→incrementale); **#2938** fix flake echo_backstab.

## Stato OD-024 (programma sentience)

- **FATTO**: producer #2932 (D1 minTier + D2 map-infra + D4 read-path) · engine #1 #2936 · engine #2 #2937 · D3 enemy-wire #2945 · **D2 map RATIFICATA** #2947 (valori confermati; N=40 = gate del flip D7, non dei valori).
- **RESIDUO**:
  1. **D4 populate pipeline** — solo pipeline (0 override). È un sotto-progetto ETL multi-stage. **PIANO: [`docs/superpowers/plans/2026-06-22-od024-d4-populate-pipeline.md`](../superpowers/plans/2026-06-22-od024-d4-populate-pipeline.md)** (recon-first). ← **PROSSIMO ENTRY POINT**.
  2. **D6 engine #3 (encumbrance)** — PARCHEGGIATO (serve sistema peso/inventario assente).
  3. **D7 flip incrementale** — owner-action (keys.env + N=40 per pezzo).

## Stato codex A.L.I.E.N.A. (PHASE 1+2 #2930)

PHASE 1 voce curata (extractor: taxon hook Linnaean→"creatura di tipo X", lifecycle EN→IT,
npc_archetypes EN→IT; biomes.yaml intatto). PHASE 2 pilot encounter `enc_foresta_temperata_radici`
(cameo apex_neutral `sentinella_radice`, roster clonato da standard_01) → sentinella promossa,
HA2 zero-orphan. Residuo PHASE 2: replicare il pilot per i 19 orfani (per-bioma, balance master-dd).

## Spec/plan creati

- Spec engine #2: `docs/superpowers/specs/2026-06-22-od024-engine2-stamina-fatigue-design.md`
- Plan engine #2: `docs/superpowers/plans/2026-06-22-od024-engine2-stamina-fatigue.md`
- **Plan D4 (prosecuzione)**: `docs/superpowers/plans/2026-06-22-od024-d4-populate-pipeline.md`

## Blocker / gated (NON autonomi)

- D7 flip: owner (keys.env + restart) + N=40 per pezzo.
- engine #3: design sistema peso (master-dd).
- PHASE 2 codex restanti: balance per-encounter (master-dd, AskUserQuestion).
- Prod-resilience (sessione 06-20, ancora aperto): script `C:\Users\edusc\fix-evo-backend-task-resilience.ps1` da runnare ELEVATED.

## Lezioni chiave (questa sessione)

- **Verify-first ripetuto**: engine #1 = il sistema iniziativa/slow ESISTEVA (estensione, non motore nuovo); D4 = catalog è ETL multi-stage; #2941 interleave (engine #2 marcato RESIDUO mentre shippava → doc-sync anti re-build); merge "fatti" parziali (solo #2930, non #2932).
- **Adversarial review paga**: engine #2 v1 ucciso (sprint irraggiungibile a DEFAULT_AP=2 + tally inesistente) → v2; Task-3 review ha preso un leak di band-neutrality (`_tiles_voluntary_round` non flag-gated).
- **Infra degradata**: classifier opus + 529 overload hanno bloccato i subagent → fallback INLINE per Tasks 4-5 + final/compensating review (Tasks 1-3 avevano review indipendente).
- **sessionRoundBridge = factory** → test a livello modulo, non via closure.
