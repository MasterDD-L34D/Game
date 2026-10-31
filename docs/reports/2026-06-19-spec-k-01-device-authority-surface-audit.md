---
title: 'SPEC-K K-01 -- device-authority surface audit (host-only inventory + classify + surface_role table)'
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-19'
source_of_truth: false
language: it-en
review_cycle_days: 30
tags: [evo-tactics, godot, device-authority, coop, spec-k, audit]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# SPEC-K K-01 -- device-authority surface audit

> Deliverable del ticket BACKLOG **K-01** ("Surface audit Godot: inventory + `surface_role:` metadata su tutte le view"). Method: Workflow 5-finder multi-modal sweep (orchestrator host-gate / routes+WS / K-spec acceptance / Godot views / migrated-baseline pattern) + synth-critic adversariale (verify-first, K-spec acceptance + recipe K-05 = metro, commenti = ipotesi). 6 agenti, ~755k token, 437s.
>
> Spec misurata: [`docs/design/evo-tactics-godot-device-authority-reconciliation.md`](../design/evo-tactics-godot-device-authority-reconciliation.md) (active). Backend ground-truth: `apps/backend/services/coop/coopOrchestrator.js`, `apps/backend/routes/coop.js`, `apps/backend/services/network/wsSession.js`.

## BLUF

~20 operazioni host-touching nel loop co-op auditate. Tally: **1 MIGRATION_GAP** (`confirmWorld` + il suo mirror WS `world_confirm`), **4 DONE**, **11 INTENDED_ARBITER**, **2 DESIGN_CALL**.

Verdetto **definitivo su world-confirm**: e' un gap reale, NON un design-call. La spec lo nomina su 3 superfici indipendenti (matrix riga 131-132, criterion 9.4, ticket K-02) e classifica il CTA host letteralmente come *"dev fallback ... marcare e sostituire con device quorum"*. Ground-truth conferma: `confirmWorld()` non prende input per-player e committa lo stato (`world_setup -> combat`), mentre `voteWorld`/`worldTally` sono **signal-only** (docstring :586 "Host remains arbiter and must still confirmWorld() to commit"). E' il **single highest-value buildable** di SPEC-K (~120-160 LOC, mirror K-05 7-step; `worldTally` ha gia' l'invariante `connected_*` + empty-set => false da riusare).

Residuo K dopo questo audit: **K-02** build (sopra), **K-01** tabella surface_role (nessuna view Godot ancora annotata -- sezione qui sotto), **K-06** wording cleanup, **K-07** real-device playtest.

## Inventory classificato (18)

### MIGRATION_GAP (1, + mirror WS)

| Operazione | Location | Perche' gap |
|---|---|---|
| `confirmWorld()` / `POST /coop/world/confirm` + WS `world_confirm` | `coopOrchestrator.js:540-582`; route `coop.js:374-414` (authHost :386); WS `wsSession.js:1574-1607` (host_only :1576) | Spec DEFINITIVA non silente: matrix 131 ("spostare confirm finale su quorum/device"), 132 (CTA host = "dev fallback"), crit 9.4, K-02 (:453), sez.6.3 ("world setup lock-in" sotto quorum/shared). `confirmWorld()` zero input per-player + committa stato. `voteWorld`/`worldTally` SIGNAL-ONLY. Nessun `markWorldReady`/`worldReadyTally` esiste. |

Il mirror WS `world_confirm` (`wsSession.js:1574`) condivide lo stesso verdetto (path host-finalize del dev_fallback). Nota di scope: `nido_start_mission` WS (`wsSession.js:2047`) e' invece DONE-as-fallback (primary = quorum K-05).

### DESIGN_CALL (2 -- master-dd)

| Operazione | Location | Nodo |
|---|---|---|
| `submitNextMacro()` (advance\|branch\|retreat post-debrief) | `coopOrchestrator.js:1168-1214`; WS `wsSession.js:1992-2044` | NON in must_be_device. "branch" overlappa route-vote (K-03 DONE, gia' device); "retreat" e' distruttivo (forza run ended). Run-shell nav host-arbiter O route decision condivisa? **Default consigliato: keep host-arbiter** + annotate HOST_TECHNICAL (route-vote possiede gia' la node choice; se migrato, "retreat" serve per-player consent sez.6.4, non bare quorum). |
| `submitOnboardingChoice()` legacy host path | `coopOrchestrator.js:370-402` (throws host_only :376) | DUAL-MODE: il branch device per-player ESISTE gia' nello stesso metodo (allPlayerIds -> onboardingChoices Map + readiness). Host path = legacy fallback. K-spec matrix 129 deferisce per-player-vs-aggregate **esplicitamente a SPEC-A/B**. Wiring triviale (~10-20 LOC) ma l'authority model = call SPEC-A/B, non K. |

### DONE (4)

| Operazione | Nota |
|---|---|
| `startMissionFromNido()` / `POST /coop/mission/start` | K-05 migrato. Host anti-deadlock FALLBACK esplicito (recipe step 7), fail-closed null-hostId. PR #2871. Il pattern-modello (quorum primary + fallback host marcato). |
| `markMissionReady()` / `POST /coop/mission/ready` | Il quorum device-authority di riferimento (mirror voteWorld). Connected-only, auto-advance @ `all_connected_ready`. PR #2871. |
| `confirmLethalConsent()` / WS `lethal_consent_confirm` | Device per-player consent (sez.6.4): AND-gate unanime sugli at-risk, NON quorum-majority. crit 9.7 MET. SPEC-J. |
| `setHostId()` host-transfer sync | Non-gate: il primitivo di host-transfer parity (recipe step 6) che tiene `orch.hostId == Room.hostId`. Load-bearing per ogni fail-closed gate. |

### INTENDED_ARBITER (11)

| Operazione | Perche' resta host (by-design) |
|---|---|
| `startRun()` / `POST /coop/run/start` | Run bootstrap host-initiated. sez.7.1 vincola START-WITHOUT-READY, non il boot; la "device ready" e' soddisfatta dal quorum character_creation che SEGUE. |
| `startOnboarding()` (WS phase bootstrap) | Come startRun. Caller = WS `phase` intent host-authoritative (Jackbox model). sez.5.3. |
| `forceAdvance()` / `POST /coop/run/force-advance` | Escape hatch anti-deadlock host-only (sez.3.1 "esplicitamente escape hatch"). E' il deadlock-breaker su cui la migrazione quorum SI APPOGGIA (recipe step 7). |
| `endCombat()` / `POST /coop/combat/end` | Transizione event-driven dalla combat-session autoritativa, non un voto. OD-058 D3 vcLedgerReplay (#2531) ha gia' spostato il payload VC server-side (host non-trusted). |
| `openLethalConsent()` / `POST /coop/lethal/open` | Host technical open (sez.6.1): host nomina at-risk + apre finestra; il CONFIRM e' device. Anti-deadlock = auto-timeout (sez.5 trigger-a). SPEC-J. |
| `POST /coop/lethal/cancel` | Override host di un round bloccato -> soft. Complementa l'auto-timeout wall-clock che risolve SENZA host. Recipe step 7. |
| `openRouteChoice()` / `POST /coop/route/open` | Host technical open (sez.7.3 step3). Il VOTO e' device (voteRoute/routeTally, host escluso). K-03 DONE / #2597. crit 9.3 MET. |
| `voteRoute()` host-EXCLUSION (`wsSession.js:1755`) | INVERSE gate -- host VIETATO votare (anti-skew). SUPPORTA device-authority. |
| WS combat intent host-exclusion (combat_action/end_turn) + intent_cancel + form_pulse | INVERSE gates -- host NON puo' submittare intent combat/form_pulse (Sistema-driven, host=arbiter non partecipante). sez.7.4 "la TV non e' UI di planning". |
| WS intent `state`/`phase`/`round_clear` (host-authoritative) | Modello Jackbox/M11 foundational: solo host pubblica room.state/phase/drain (header "only host can mutate; players send intents"). I commit player-facing viaggiano sugli intent device, non su questi setter tecnici. |
| (incluso sopra) `voteRoute` exclusion / combat exclusions / state-machine setters | Tutti enforce device-authority escludendo l'host = forma corretta dell'arbiter-map. |

## K-02 scope (buildable, mirror K-05 7-step)

`confirmWorld` confermato gap reale. Recipe (~120-160 LOC):

1. **Per-player store**: riusa `worldVotes` Map (gia' accept/reject) OPPURE aggiungi `worldReadyVotes`; cleared in `startRun`/`startOnboarding`/`advanceScenarioOrEnd`.
2. **Mutator**: o wire `confirmWorld` auto-fire su quorum, o aggiungi `markWorldReady(playerId,{ready,allPlayerIds,connectedPlayerIds})` phase-guard `not_in_world_setup` + `player_id_required` + `_emit('world_ready')`.
3. **Tally**: `worldTally` HA GIA' `connected_*` + `all_connected_accepted` con invariante empty-set => false (verificato :839-840) -- riusa.
4. **Auto-advance**: route REST + WS drain controllano `tally.all_connected_accepted` -> chiamano `confirmWorld()` server-side SENZA azione host -> `broadcastCoopState`.
5. **Disconnect re-eval**: branch `world_setup` nel close-handler `wsSession` (mirror route_tally/mission_tally) ricomputa allPids+connectedPids (filtro connected && id!==hostId && role!=='host'), re-broadcast world_tally, auto-confirm se ora all_connected_accepted.
6. **Host-transfer parity**: gia' coperto da `setHostId` in `rebroadcastCoopState`; denominatori quorum usano `quorumPids`/`connectedQuorumPids` role-aware.
7. **Anti-deadlock fallback**: tieni `POST /coop/world/confirm` + WS `world_confirm` come host force-confirm, fail-closed (`if(!hostId)throw'no_host'; if(playerId!==hostId)throw'host_only'`) + marca DEV_FALLBACK + test no-bypass-in-coop-production.

Surface parity: REST (`/coop/world/ready` o auto-confirm su quorum) AND WS drain stessa orch method. Godot: phone world-ready toggle + TV recap (la `phone_world_vote_view.gd` esiste gia'; il confirm deve solo smettere di essere host-CTA-gated in production).

**Design-call mechanism (DC#3)**: riusare `worldVotes` + auto-confirm su `all_connected_accepted` (meno superficie, no nuova Map, il voto gia' codifica accept) VS nuovo `markWorldReady/worldReadyTally`. **Default consigliato: riusa `worldVotes`** -- `markWorldReady` duplicherebbe `worldVotes`. Da confermare con master-dd prima del build.

## K-06 scope (wording cleanup, crit 9.8 UNMET)

Stringhe/commenti da correggere dopo K-02:
1. `phone_nido_view.gd`/docs: "host drives Nido upgrades from the TV" -> riclassificare (Nido phone = action hub, K-04 DONE).
2. `phone_composer_view.gd`: "phone never drives" / CTA host-only world-confirm -> marca world-confirm CTA DEV_FALLBACK dopo K-02.
3. `coopOrchestrator.js:538` "Voting logic deferred to M17 (host confirm for MVP)" + :586 "Host remains arbiter..." -> aggiorna a "host confirm = DEV_FALLBACK; production commit on device quorum".
4. `coop.js:459` "MVP: host controls" su combat/end -> riclassifica HOST_TECHNICAL (event-driven, intended).
5. GGv2 docs (sprint-context-archive, PRD-BUILD-STATUS-GODOT-V2): #413/#423 indicati open, route-vote come gap -> marca DONE (#2597).
6. `coop.js` routes: annota authHost gates come HOST_TECHNICAL vs DEV_FALLBACK per la taxonomy.

Per sez.6.1: sostituisci "host chooses / TV drives" con "host technical open / arbiter open" dove e' tecnicamente un open, non una scelta.

## K-07 scope (real-device playtest, crit 9.9 UNMET)

Prereq: Lenovo TV host always-on (3334/3341 via task EvoTacticsBackend + cloudflared -- **NON killare prod ports**), 2+ phone su tunnel Cloudflare, stato META_NETWORK_ROUTING confermato, NIDO_UNLOCKED set.

Scenari e2e su device reali (NON sostituto degli unit test, sez.10): (1) route-vote (2 phone -> node_id, host "Sei l'arbitro", TV tally+reveal); (2) recruit post-combat (K-04, can_recruit via /meta/npg); (3) mating risolto (vote -> offspring roll -> mating_resolved -> TV reveal); (4) offspring reveal; (5) Nido entry (phone action hub); (6) next mission via mission/ready QUORUM (2 phone ready, TV countdown, auto-advance) AND host force-start fallback; (7) SE K-02 landa: world-confirm via device quorum. Esercitare disconnect-mid-vote + host-transfer. Capture: ogni path host/TV che committa una scelta player-facing senza device input = fail crit 9.2.

## surface_role table (deliverable K-01 -- metadata)

**Enum reconciliation**: la spec ha un mismatch interno -- sez.8.2 elenca 4 valori `{TV_MIRROR, DEVICE_INPUT, DEVICE_PRIVATE, DEV_FALLBACK}`; criterion 9.1 estende a 6 `{+HOST_TECHNICAL, +LEGACY_TO_REMOVE}`. **Proposta (DC#4): adottare l'enum 6-valori di 9.1 come canonico** (superset; 8.2 = sottoinsieme "new device-facing view"). [master-dd: ratifica enum]

Assegnazione per-view Godot (tutte attualmente `has_surface_role_metadata=false`):

| surface_role | Views |
|---|---|
| **TV_MIRROR** | `tv_mating_panel.gd`, `lobby_spectator_poll.gd`, `nido_hub_view.gd` (co-op, NextMissionButton disabled), `tv_lethal_consent_panel.gd` (render; HostCancelButton=DEV_FALLBACK), `main_nido.gd`/`main_lethal_consent.gd`/`main_route_choice.gd` OBSERVER mounts |
| **HOST_TECHNICAL** | `coop_api.gd` open_route/lethal cancel sends, `lobby_api.gd` create/close_room, `world_setup_host_view.gd` (shared-render; ConfirmButton -> DEV_FALLBACK pending K-02), `main.gd` _is_host plumbing, `main_coop_combat_end.gd` |
| **DEVICE_INPUT** | `phone_world_vote_view.gd`, `phone_mating_view.gd`, `phone_coop_vote_wire.gd` (route vote, host-excluded), `phone_mission_ready_wire.gd` ReadyToggle, `phone_nido_view.gd` ReadyToggle+recruit, `phone_lethal_consent_overlay/wire.gd`, `phone_composer_view.gd` device CTAs |
| **DEVICE_PRIVATE** | form_pulse phone input (filtered per-player), sensory-filtered detail surfaces |
| **DEV_FALLBACK** | `phone_composer` "Conferma mondo" host CTA (until K-02), `phone_nido_view` ForceStartButton (host anti-deadlock), `nido_hub_view` local NextMissionButton (solo/dev), `world_setup_host_view` ConfirmButton (co-op) |
| **LEGACY_TO_REMOVE** | qualsiasi TV route-pick card se puo' ancora committare in co-op (sez.7.3 debt), `submitOnboardingChoice` host-only path una volta che SPEC-A/B regola per-player |

Authority metadata (sez.8.1) per backend action: `confirmWorld` authority=dev_fallback->device scope=shared phase=world_setup; `markMissionReady` authority=device scope=shared phase=nido; `confirmLethalConsent` authority=device scope=per_creature requires_consent=true phase=combat; `voteRoute` authority=device scope=shared; `openRouteChoice`/`openLethalConsent` authority=host_technical; `forceAdvance`/`lethal-cancel` authority=dev_fallback.

> Nota: l'annotazione effettiva `surface_role:` nelle view `.gd` = met del K-01 build (cross-repo GGv2), da fare dopo ratifica enum (DC#4). Questo doc fornisce la tabella sorgente.

## Design-calls per master-dd

1. **`submitNextMacro`** (advance|branch|retreat): keep host-arbiter o migrare a device quorum? NON in must_be_device; "branch" overlappa route-vote (K-03 device); "retreat" distruttivo. **Default: keep host-arbiter** + HOST_TECHNICAL. Se migrato, "retreat" serve per-player consent (sez.6.4).
2. **Onboarding choice authority**: per-player o aggregate? K-spec matrix 129 deferisce a SPEC-A/B. Branch device gia' esiste; mancano wiring + Godot per-player submit. **Default: per-player** (flip caller a allPlayerIds) -- ma confermare sotto SPEC-A/B prima del build.
3. **K-02 mechanism**: riusa `worldVotes` + auto-confirm su `all_connected_accepted`, O nuovo `markWorldReady/worldReadyTally`? **Default: riusa `worldVotes`** (meno superficie). Confermare prima del build.
4. **Enum mismatch 8.2 (4) vs 9.1 (6)**: quale canonico per la K-01 table? **Default: adotta 9.1 (6 valori)** + patch snippet 8.2.
5. **Route-vote disconnected-voter persistence** (invariante P1-B ereditato): ratify-or-prune? **Default: prune su disconnect** (mirror world/mission re-eval; un player andato non tiene aperto un quorum), salvo intenzionalita' per reconnect.

### Resolutions (2026-06-20, master-dd "risolvo le 5")

- **DC#1 RESOLVED** -- keep `submitNextMacro` host-arbiter (HOST_TECHNICAL); verdict recorded as a code comment at `coopOrchestrator.submitNextMacro`. Not a migration gap (run-shell nav; route-vote owns node choice; `retreat` would need per-player consent, not a quorum).
- **DC#2 RESOLVED** -- onboarding per-player-vs-aggregate authority deferred to SPEC-A/B (K-spec matrix 129); the device branch already exists. Comment recorded at `submitOnboardingChoice`. Not a K build.
- **DC#3 RESOLVED (superseded during K-02 build)** -- the audit's "reuse worldVotes + auto-confirm" default was corrected by a verify-first finding: the backend has NO server-side world params (biome/seed are host-computed), so a propose/lock-in step is required. Master-dd chose **mechanism A1** (host proposes, device quorum commits); shipped in #2879.
- **DC#4 RESOLVED** -- 6-value enum (crit 9.1) adopted; implemented in the GGv2 registry `scripts/coop/surface_role_registry.gd` (#516).
- **DC#5 RESOLVED -> RATIFY persist (2026-06-20, master-dd)** -- keep the #2597 P1-B invariant: a disconnected voter's route vote PERSISTS (not pruned) so a reconnect with the same token keeps the player's choice. Master-dd added the requirement to *verify reconnect preserves changes* -> locked by `tests/api/coopReconnectPreservesVotes.test.js` (orchestrator route+world persist/re-count + a real WS disconnect->reconnect e2e; 4/4 green). `routeTally` comment updated to RATIFIED. Flag-OFF (META_NETWORK_ROUTING) = no current live effect; the contract is now test-guarded against a future accidental prune.

## Contraddizione 9.5 (doc-vs-BACKLOG, anti-pattern #19)

Il criterion **9.5** (phone_nido_view action surface) e' **contraddittorio**: la spec sez.13 (flip-verdict) legge "5 = UNMET", ma il BACKLOG dice **K-04 DONE e2e 2026-06-18** (9.5 MET via recruit GGv2 #481 + wound-ritual #479, merged). Per Currency Gate il git-met (BACKLOG) e' autoritativo -> 9.5 = **MET**, spec sez.13 = **stale**. [master-dd: ratifica patch sez.13 spec -> MET, oppure conferma il gap residuo se sez.13 intende altro]

## Completeness gaps (verify-first honesty)

- Lato Godot verificato SOLO via il finder (input 4), NON leggendo direttamente i sorgenti GGv2 (`C:/dev/Game-Godot-v2` cross-repo non aperto in questo audit). Le assegnazioni surface_role + "no metadata present" vanno riconfermate leggendo i `.gd` prima del build K-01-metadata.
- Non e' stato grep-ato esaustivamente OGNI `isHost`/`host_only` in `wsSession.js`; ci si e' affidati all'inventory del finder routes+WS. Un gate non emerso li' sarebbe mancato.
- 9.5 trattato come DONE per Currency Gate (vedi sopra); sez.13 spec resta letteralmente UNMET -> reconcile.
- Suite coop/WS NON ri-eseguita in questo audit (claim 438/438 = source-read, non run). Da girare prima/durante il build K-02.
- L'overlap "branch" macro con route-vote e' inferito (enum + GAP-C context), non tracciato end-to-end a /campaign/choose.
- `submitOnboardingChoice:370-402` non ri-letto direttamente in questa sessione (esistenza branch device per finder orchestrator).

## Next

- **K-02 build** (highest-value): mechanism DC#3 default reuse-worldVotes, autonomo (spec-required, additive, fail-closed fallback) -- pending conferma master-dd su DC#3/DC#1/DC#2/DC#5.
- **K-01 metadata** (annotazione `surface_role:` view GGv2): dopo ratifica enum DC#4, cross-repo chip.
- **9.5 reconcile**: patch spec sez.13 (master-dd).
- **K-06/K-07**: dopo K-02.
