---
title: Handoff — Repo Content Audit 2026-05-05 (Phase 1+3 complete)
doc_status: active
doc_owner: archivist
workstream: ops-qa
last_verified: 2026-05-05
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Handoff — Repo Content Audit 2026-05-05

## Stato sessione

**Phase 1** (static scan 3 agent parallel) + **Phase 3** (triage + cleanup PRs) eseguiti.
**Phase 2** (live runtime probe) pendente — non bloccante cutover.

Report canonical: [`docs/reports/2026-05-05-repo-audit-static-scan.md`](../reports/2026-05-05-repo-audit-static-scan.md)

---

## Cosa è stato fatto

### Code cleanup (Game/)

- `aiPersonalityLoader.js` + `sistemaActor.js` + test: **eliminati** (zero runtime callers)
- PR #2058 aperta con tutte le fix

### Data fix (Game/)

10 species `biome_affinity` corrette con slug canonici biome (necessario per `isPerfectMatch()` in `biomeResonance.js`):

| Species              | Old                    | New                       |
| -------------------- | ---------------------- | ------------------------- |
| anguis_magnetica     | acquatico_costiero     | atollo_obsidiana          |
| chemnotela_toxica    | terrestre_forestale    | foresta_acida             |
| elastovaranus_hydrus | terrestre_pianeggiante | pianura_salina_iperarida  |
| gulogluteus_scutiger | terrestre_roccioso     | canyons_risonanti         |
| perfusuas_pedes      | sotterraneo            | caverna                   |
| proteus_plasma       | acquatico_dolce        | palude                    |
| rupicapra_sensoria   | terrestre_montano      | caldera_glaciale          |
| soniptera_resonans   | terrestre_forestale    | canopia_ionica            |
| terracetus_ambulator | terrestre_pianeggiante | steppe_algoritmiche       |
| umbra_alaris         | terrestre_umido        | dorsale_termale_tropicale |

### Stub delete (Game-Godot-v2)

- `scripts/ai/stubs/sistema_turn_runner.gd` + `.uid`: **eliminati** (Tier 3 abandon)
- PR #177 aperta

### Gate 5 documentation (Game/)

3 exemption comments aggiunti:

- `enneaEffects.js` — surface = vcScoring telemetry
- `meta/eventChainScripting.js` — deferred infra M18+
- `routes/speciesWiki.js` — dev-tooling surface

1 TODO note (non-exempt):

- `routes/conviction.js` — `TKT-GATE5-CONVICTION`: requires FE wire or deprecation (~4h)

### BACKLOG aggiornato

6 ticket closed + 3 ticket aperti aggiunti.

---

## PRs da mergere

| PR                                                              | Repo     | Note                          |
| --------------------------------------------------------------- | -------- | ----------------------------- |
| [#2058](https://github.com/MasterDD-L34D/Game/pull/2058)        | Game/    | Pre-cutover cleanup Phase 3   |
| [#177](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/177) | Godot v2 | Drop sistema_turn_runner stub |

Entrambi richiedono master-dd approval.

---

## Open tickets post-audit

| Ticket                          | File                                   | Effort | Note                                                                               |
| ------------------------------- | -------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `TKT-GATE5-CONVICTION`          | `routes/conviction.js`                 | ~4h    | Wire FE voting UI o deprecate route+service `meta/convictionVoting.js`             |
| `TKT-TRAITS-ANCESTOR-BUFF-STAT` | `data/core/traits/active_effects.yaml` | ~3h    | Add `buff_stat` handler in `passiveStatusApplier.js` (51 ancestor traits inactive) |
| `TKT-RULES-SIMULATE-BALANCE`    | `tools/py/simulate_balance.py`         | ~1h    | Port/delete prerequisite per `services/rules/` Phase 3 removal                     |

---

## Phase 2 runtime probe (non eseguita)

Scope:

1. Boot `deploy-quick.sh` → `curl http://localhost:3334/api/v1/session/start -X POST ...`
2. Curl ogni route definita in `apps/backend/index.js` → verifica 200 / no 500
3. Attiva session combat → trait fire log (cerca `trait_id: buff_stat` in structured log → conferma zero handler)
4. Verifica conviction endpoint live: `POST /api/v1/conviction/init` → 200 (route funziona) ma nota assenza FE caller

Effort: ~1h autonomo.

---

## Findings chiave per cutover

- **Gate 5 count: 4** (≤5 soglia = NON blocca cutover)
- **3 exempted** con inline comments
- **1 TODO** (conviction) — non bloccante cutover ma da trackare
- Biome resonance ora funzionale per 10 species (fix data critica per gameplay Risonanza Perfetta)
- 51 ancestor `buff_stat` trait — inattivi ma non bloccanti; TKT aperto

---

## Next session options

**A) Merge PRs** (#2058 + #177) → chiude Phase 3 cleanup

**B) TKT-GATE5-CONVICTION** (~4h):

- Opzione 1: `apps/play/src/convictionPanel.js` + wire in debrief/session views
- Opzione 2: deprecate `meta/convictionVoting.js` + remove route

**C) TKT-TRAITS-ANCESTOR-BUFF-STAT** (~3h):

- Add `buff_stat` handler in `apps/backend/services/combat/passiveStatusApplier.js`
- 51 ancestor locomotion traits (speed/stealth/endurance/vision boost) become active

**D) Phase 2 runtime probe** (~1h):

- Boot stack, curl routes, verify trait fire, check conviction live

**E) Phone smoke retry** (userland, master-dd) — B5 verify + combat p95 + airplane reconnect → unblocks cutover Phase A
