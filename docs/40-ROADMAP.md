# Roadmap (MVP -> Alpha)

## Obiettivi originali

- Core TBT, 6 Specie base, 6 Job base, Telemetria VC, 12 Regole Sblocco, UI identita'.
- 2 Mappe (caverna/savana), Matchmaking, Privacy/Reset, 50 partite playtest (audit predator/counter).

## Completati

- [x] EVO-421 -- Ripristinata la pipeline export PDF del generatore (SRI html2pdf aggiornato, alert nel manifest export).
- [x] BAL-612 -- Skydock Siege XP curve Helix+Cipher allineata (delta profilo -0.0009%, dataset rigenerato e log `pilot-2025-11-12`).

### Rules Engine d20 (ADR-2026-04-13)

- [x] Fase 1 -- RNG namespacing additivo in `tools/py/game_utils/random_utils.py`.
- [x] Fase 2 -- `combat.schema.json` in `packages/contracts/` (+ riallineamenti 2-bis, 2-ter, 2-quater, 2-quinquies).
- [x] Fase 3 -- Layer di bilanciamento `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` con 30 core trait.
- [x] Fase 3-bis -- Pass Balancer manuale collaborativo (5 classi: offensive/defensive/hybrid/mobility/utility).
- [x] Fase 4 -- Hydration: `services/rules/hydration.py` (encounter + party -> CombatState).
- [x] Fase 5 -- Resolver core: `services/rules/resolver.py` (attack pipeline completa, formule pure).
- [x] Fase 6 -- Worker bridge `services/rules/worker.py` (pattern stdin JSON line, medesimo bridge della generation pipeline).
- [x] Fase 7 -- PT pool + Parry nel resolver (accumulo, spesa perforazione, parata reattiva).
- [x] Fase 8 -- Status auto-trigger nel resolver (bleeding/fracture/disorient tick, stress breakpoints rage/panic).

## Rimandato (da ADR)

- Status con effetti gameplay concreti per rage e panic (attualmente solo marcatura).
- Spese PT aggiuntive: spinte, condizioni, combo.
- Parata contrapposta (d20 vs d20) — attuale usa CD fissa `PARRY_CD = 12`.
- Saving throw con modifier (attuale: d20+0 vs `trigger_dc`).
- Azioni non-attack con logica di risoluzione (`defend`, `parry`, `ability`, `move` consumano solo AP).
- Effetti condizionali su terreno e trigger reattivi.
- Vulnerabilita' (modifier_pct negativo) sui trait core.
- Formalizzazione enum chiuso dei canali di danno (canale `gelo` da riconciliare).
- Session state nel backend e client di gioco nella dashboard.

## Prossimi passi

- Integrazione del rules engine nel backend Express via worker bridge (medesimo pattern di `services/generation/worker.py`).
- Primo playtest con valori Balancer reali (attualmente placeholder ragionevoli).
- Estensione `trait_mechanics.yaml` ai trait non-core in modo incrementale.
