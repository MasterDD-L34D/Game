---
title: 'Handoff issue #2746 -- coop WS/REST contract gaps closure (backend-side)'
date: 2026-06-14
sprint: issue-2746-coop-ws
type: session-handoff
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-14'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, handoff, coop, websocket, phase-change, prisma, godot, issue-2746]
---

# Handoff issue #2746 -- coop WS/REST contract gaps closure (2026-06-14)

## TL;DR

- Issue [#2746](https://github.com/MasterDD-L34D/Game/issues/2746) (5 gap di contratto coop WS/REST trovati dal playtest AI GGv2 item-5/6) chiusa **backend-side**: G1+G2+G3+G4+G5 tutti mergiati.
- 3 PR, 4 commit, 2 Codex P2 reali indirizzati+resolved, ~18 test TDD nuovi; ogni PR con regression coop/WS + AI 510/510 verde.
- G4 anche **provato live** contro Prisma+Postgres reale (Postgres portable su Lenovo, non Docker): i 2 endpoint passano da 500 a 200.
- **Unico residuo**: re-check QA end-to-end sul phone Godot (lane GGv2, repo separato). Non e' un fix Game: e' validazione visiva.

## PR mergiati (3)

| PR                                                       | Gap      | Scope                                                                 | SHA        | Test                                 |
| -------------------------------------------------------- | -------- | --------------------------------------------------------------------- | ---------- | ------------------------------------ |
| [#2748](https://github.com/MasterDD-L34D/Game/pull/2748) | G4 [P2]  | store meta globale (campaignId null) usa findFirst su unique nullable | `662fc761` | +5 (mock fedele strict-prisma)       |
| [#2751](https://github.com/MasterDD-L34D/Game/pull/2751) | G1 [P1]  | phase_change broadcast versionato (3 emitter coop-WS)                 | `087f60cd` | +6 (3 REST + rebroadcast + snapshot) |
| [#2756](https://github.com/MasterDD-L34D/Game/pull/2756) | G2+G3+G5 | campaign_id mirror + nido broadcast + tally host-filter               | `e02764f2` | +8 (G2 x2 + G3 + G5 x2 con Codex P2) |

## Dettaglio fix

- **G4** [P2] -- `apps/backend/services/metaProgression.js`. Il client Prisma reale rigetta `findUnique` con membro null su unique key (NestState.campaignId String? @unique; NpcRelation @@unique compound) -> `GET /api/meta/npg` e `GET /api/v1/meta/nest` rispondevano 500. Branch su null -> `findFirst` (in Postgres NULL non collide sull'indice unique). Codex P2: race null-create poteva duplicare righe globali -> create serializzato in-process + read orderBy createdAt,id asc (riga piu' vecchia = canonica). Mock fedele `tests/helpers/strictMetaPrisma.js`.
- **G1** [P1] -- `routes/coop.js` (broadcastCoopState) + `services/network/wsSession.js` (rebroadcastCoopState host-transfer + snapshot fresh-join). 3 emitter mandavano `phase_change` via `room.broadcast` raw, senza chiave `version` -> il phone Godot scartava i frame come unknown_type (schermo vuoto, root cause deterministica finding-1 item-3). Fix: `room.publishEvent('phase_change', payload)` (version-stamp + ledger, payload ricco preservato) per i 2 broadcast; `version: room.stateVersion` sul snapshot per-socket. Scartato `publishPhaseChange` (payload lean + side-effect su room.phase + gate KNOWN_PHASES).
- **G2** [P2] -- `services/coop/coopStore.js` (linkSession). Mirrorava solo `room.sessionId`, mai `room.campaignId` -> ogni phase_change versionato shippava `campaign_id: null` (il phone keya CampaignState su campaign_id). Fix: + `room.campaignId = campaignId` (run.id == campaign_id).
- **G3** [P2] -- `services/network/wsSession.js` (drain next_macro). Pubblicava phase_change solo per world_setup/ended. Con Nido sbloccato `submitNextMacro` ritorna phase 'nido' ma nessun phase_change partiva -> i phone non entravano in MODE_NIDO. Fix: ramo `else if (result.phase === 'nido') room.publishPhaseChange('nido')` (nido whitelisted in KNOWN_PHASES).
- **G5** [P3] -- `services/network/wsSession.js` (drain world_vote). Passava gli id NON filtrati (host TV incluso) a worldTally -> total gonfiato ("2 in attesa / 3 totali" con 2 player). Fix: set voter role-aware (host conta solo se possiede un PG) calcolato indipendentemente dal submitter + gate `not_a_player` che rigetta il voto dell'host non-giocante PRIMA che voteWorld lo persista (Codex P2: evita accept > total / falso quorum).

## Blockers residui

- [ ] **Re-check QA phone Godot (lane GGv2, NON Game)** -- validazione visiva end-to-end dei 5 fix sul client phone. Vedi sotto "Next entry point". Non blocca il merge Game (gia' fatto): conferma che i fix funzionano sul device reale.
- [ ] Issue #2746 lasciata APERTA -- chiudibile dopo il re-check phone, o ora a discrezione owner. Backend-side e' 100% completo.

## Next entry point (cosa fare ora)

Tutto il lavoro Game e' chiuso. L'unica cosa che resta = **validare i fix sul phone Godot** (repo Game-Godot-v2, lane Lenovo, ~15 min). Non e' codice nuovo: e' un playtest di conferma.

1. **Avvia backend reale** (Lenovo): Postgres portable + backend con Prisma reale.
   ```powershell
   & "C:\dev\tools\pgsql\bin\pg_ctl.exe" -D "C:\dev\tools\pgdata-game" -l "C:\dev\tools\pgdata-game\srv.log" start
   # checkout main aggiornato (>= e02764f2)
   $env:DATABASE_URL="postgresql://game@localhost:5432/game?schema=public"
   $env:LOBBY_WS_SHARED="true"; $env:PORT="3334"; $env:NIDO_UNLOCKED="true"; $env:META_NETWORK_ROUTING="true"
   node apps/backend/index.js   # log atteso: "[lobby-ws] Prisma hydrate" (no warn stub)
   ```
   NB: Docker Desktop su Lenovo NON parte (engine pipe admin-only); usare il Postgres portable.
2. **Seed dello store NPG globale (CHIAVE per B3)**: `GET /api/meta/npg` legge lo store GLOBALE (`createMetaStore campaignId:null`, `pluginLoader.js`); il recruit per-campaign NON lo popola. Post-fix npg torna `200 {npcs:[]}` -> il pannello Relazioni resta su "Nessun NPG conosciuto" finche' vuoto. Seeda con PowerShell-native (in PS 5.1 `curl` = alias di Invoke-WebRequest, i flag `-X/-d` falliscono): `Invoke-RestMethod -Method Post -Uri .../api/meta/affinity -ContentType application/json -Body '{"npc_id":"npc_recheck","delta":1}'` + idem `/trust` con `delta:2` -> poi npg ha la riga.
3. **Phone run** (Godot): build phone + `node tools/playtest/host_driver.mjs --base http://localhost:3334 --out tools/playtest/smoke_logs/<run>` -> drive nido (frame-pump, vedi gotchas del report) -> assert:
   - **B3 affinity-half**: pannello Relazioni MODE_NIDO renderizza la riga NPG seedata (Aff/Fid), non piu' placeholder. Server gia' verificato 500->200 in G4.
   - **G1/G3**: il phone monta gli schermi su `phase_change` versionati (no schermo vuoto); entra in MODE_NIDO server-driven su next_macro.
   - **G2**: i frame portano `campaign_id` non-null.
   - **G5**: tally mostra "N totali" = solo i player (host TV escluso).
4. **Reference**: report `Game-Godot-v2/docs/godot-v2/qa/2026-06-12-item5-item6-ai-playtest.md` -- sez. **"Re-check #2746 (runbook)"** (backend + seed + assert, copia operativa) + "Stack del run" + "Gotchas frame-pump".
5. **Estimated effort**: ~15-20 min (lane Lenovo, client interattivo).
6. **Post-conferma**: chiudi issue #2746.

## Memory candidates

- [x] `project_g4_meta_null_fix_2748` -- gia' salvato (G4 + verifica live Prisma).
- [x] `project_g1_phasechange_versioned_2751` -- gia' salvato (G1 + G2/G3/G5 + gotchas test + Codex P2).
- [ ] (nessun nuovo pattern durevole oltre i due gia' salvati).

## Gotchas raccolti (per il prossimo)

- `lobby.createRoom()` ritorna un **descriptor** (code/host_id/host_token), NON la Room viva. Per asserire `room.sessionId`/`room.campaignId` usa `lobby.getRoom(code)`.
- Il `world_tally` arriva 2 volte sul phone: snapshot di connect (accept 0) + post-voto. Nei test filtra con predicate su `accept >= 1`.
- `phase_change` NON e' un tipo reserved per `publishEvent` (publishPhaseChange stesso lo usa); `room.broadcast` raw = no version, `publishEvent` = versionato + ledger.
- Codex spesso rate-limited (PR #2751 nessun review dopo >1h -> self-review); su #2748/#2756 ha lasciato 1 P2 reale ciascuno. Triage + reply + resolve thread prima di dire done.
- Postgres portable Lenovo (`C:\dev\tools\pgdata-game`) e' l'alternativa a Docker (che non parte): start con path completo a `pg_ctl.exe`.
