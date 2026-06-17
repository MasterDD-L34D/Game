---
title: Handoff continuazione 2026-06-17 -- A2 prod-deploy LIVE + 4 PR (SPEC-A/F + OD-059 + hc06)
date: 2026-06-17
sprint: maintenance-frontier
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-17'
source_of_truth: false
review_cycle_days: 30
language: it
---

# Handoff continuazione 2026-06-17

Continua `docs/planning/2026-06-17-session-handoff.md`. Sessione fresca: backlog gated
presentato a master-dd via AskUserQuestion -> 4 verdetti eseguiti + A2 deployato LIVE in prod.

## TL;DR

- **6 verdetti backlog eseguiti + 7 PR + A2 prod-deploy + Postgres restore**.
- **A2 `pressure_tier_floor` LIVE in prod** (deploy + flip, verificato end-to-end).
- **SPEC-A + SPEC-G flippate -> active**; **item-1 = 13/17**.
- Decision backlog: A2=flip-ON / hc06=banda A / SPEC-A=flip / OD-059=A reuse / G=build+flip /
  Postgres=avvia -- TUTTI eseguiti.

## PR mergiate (7)

| PR     | Scope                                         | SHA      |
| ------ | --------------------------------------------- | -------- |
| #2782  | flip SPEC-A review_needed -> active           | 28a37e52 |
| #2783  | SPEC-F custode /share + /crossbreed-propose   | 5927cb7d |
| #2784  | OD-059 campaign biome-memory (read-only narr) | abcc28f6 |
| #2785  | hc06 band-widen 0.15-0.25 -> 0.15-0.30 (A)    | 2e0b9622 |
| #2786  | handoff continuazione                         | ae09e825 |
| #2787  | SPEC-G power_level + anti-agency offer-layer  | 52e5252e |
| (this) | flip SPEC-G + handoff/pointer final           | --       |

## SPEC-G (#2787) -- MVP slice + flip

`power_level` metadata su 17 carte reward (ratificato master-dd: 16 `suggerimento` + 1 `vista`
[`rwd_apex_scent`] + 0 `controllo_reale`; enum snake; fail-closed -> `suggerimento`) + helper
`rewardPowerLevel.js` + anti-agency test offer-layer. **Band-neutral** (metadata inerte, 0 consumer),
unflagged, zero forbidden-path. **SPEC-G flippata -> active** (forward-work residue: controllo_reale
apply+consent = SPEC-K; sorgenti narrativa/dottrinale sez.3 = slice futura). 23/23 + AI 543/543.

## A2 -- DEPLOYATO + LIVE in prod (2026-06-17, Lenovo CODEMASTERDD)

Flag-flip da solo era NECESSARIO ma NON sufficiente. Due parti:

1. **Flag** `export PRESSURE_TIER_FLOOR_ENABLED=true` in `~/.config/api-keys/keys.env`
   (GOTCHA: keys.env mixa export/bare, NO `set -a` -> flag DEVE usare `export`, altrimenti
   sourced ma non ereditato dal child node). Catena env = `start-evo-backend.cmd:7`.
2. **Deploy prod** (il blocker vero): worktree prod `_gamewt-lenovo-host` era a `b2b9ea51`
   (#2761) -> PRE-#2769 -> ZERO encounter con `pressure_tier_floor` -> floor inerte
   (`effectivePressure(raw,unset)=raw` = byte-identical a OFF). Deployato `b2b9ea51 -> 5927cb7d`
   (~24 commit; package-lock invariato -> no npm ci; no prisma/migration). Floor data vive in
   `docs/planning/encounters/*.yaml` (loaded da `encounterLoader.js:22`).

**VERIFICATO end-to-end** (live fire-check `enc_frattura_03` floor=4): pre-deploy `Calm@0`
(inerte) -> post `sistema_tier=Critical sistema_pressure=75`. Rollback = `git checkout
b2b9ea51` su worktree prod + rimuovi riga keys.env + restart task `EvoTacticsBackend`.

Magnitudine floor = review post-Godot-playtest #2 (solo UP).

## Note prod

- **Prod worktree `_gamewt-lenovo-host` @ `5927cb7d`** = behind main di 2 commit (#2784 OD-059
  narrativo + #2785 hc06 band-tooling = non-prod-critical; dati A2 presenti). Prossimo deploy li porta.
- **Postgres prod RIPRISTINATO** (master-dd "avvia"): portable PG 16.4 avviato
  (`C:/dev/tools/pgsql/bin/pg_ctl.exe -D C:/dev/tools/pgdata-game -l .../server.log start`,
  listener 5432; `DATABASE_URL=...@localhost:5432/game`) + backend restart -> boot log
  `[lobby-ws] Prisma hydrate: 3 room(s) restored`, zero prisma:error. Coop lobby persistence LIVE.
  NOTE: `pg_ctl start` NON sopravvive a reboot host (nessun servizio auto-start) = follow-up.

## Item-1: 13/17 active

active (13): I, K, L, M, N, O, C, D, E, P, Q, **A**, **G**.
blocked (4): B (gated SPEC-K), F (slice 3 gated), H (aliena), J (lethal-wounds).

## Flagged a master-dd (verify-first, NON fabbricati)

- **B2 gate-policy-random** (seconda meta hc06 option A): dossier 2026-06-17 NON committato
  in repo -> non implementato. Band-widen (parte chiara) shipped; B2 serve il dossier.
- ~~**SPEC-F slice 3**~~ **DONE #2796 `a085009b`**: i "3 design-call" erano POLICIES
  GIA' RATIFICATE (ADR-04-27: cooldown 1/campagna, rate-limit 10/h, history cap 10) -- NON
  aperti (verify-first). `POST /crossbreed/confirm` (commit + rate-limit + cooldown in-memory
  - seeded preview-match) shipped. Cooldown in-memory perche' `crossbreed_history` schema =
    additionalProperties:false (no `campaign_id` field) -> durable = master-dd/contracts. Residui:
    durable cooldown + offspring->playable lineage (SPEC-E) + QR/card export.
- **OD-059 design-call** (deferred, structured-data only shipped): copy narrativa, soglie,
  semantica turn-delta (default `session.turn`/unit), se mai meccanico (= N=40).
- **#2785 P2**: master-dd ha scelto class-wide as-is (A); per-scenario override = follow-up se serve.
- **SPEC-G controllo_reale apply+consent** = SPEC-K-coupled (nessun card-apply path oggi -> 0
  controllo_reale cards). Sorgenti narrativa/dottrinale (sez.3) = slice futura. `tri-sorgente.schema.json`
  = orphan non validato dalla route live (forbidden-path, lasciato).

## Continuazione 2 -- SPEC-J lethal-wounds backend (4 PR + docs, COMPLETE e2e)

Ground-truth correction (anti-pattern #19): l'handoff diceva "J = 0 codice grosso"
-- SBAGLIATO. J1 (KO -> `grave` wound) + criterion-3 (`woundSystem`) GIA' LIVE
(`maybeApplyCombatWound`, default ON, wired in performAttack, #2535/#2714). SPEC-J
serviva solo il LAYER lethal sopra il substrato. Design FULLY ratificato (J1-J5
tutti A, 2026-06-08; J2 canon) -> impl pura, zero design-call aperti.

- **#2789 `315b41da`** PR1 -- lethal-death model: `services/combat/lethalDeath.js`
  (puro: soft-death default, per-mission `lethal` flag strict, per-player consent
  gate fail-closed, `markCreatureFallen` -> top-level `unit.fallen`, orchestrator
  `applyLethalKoIfDead`) + `emitCreatureFell` (riusa tipo chronicle `creature_death`;
  J5 lineage-auto + SPEC-D beat + `succession_trigger` SPEC-E E2) + wire nel KO-path
  performAttack + `publicSessionView.lethal` (sez.8 public). Band-neutral: kill switch
  `LETHAL_MISSIONS_ENABLED` default OFF + nessun consent-producer + 0 encounter lethal
  -> ogni KO = soft = oggi. 2 Codex P2 verified-vs-source + fixed (fallen marker
  top-level vs round-sync wipe; encounter_id provenance fallback).
- **#2790 `7d8abfdb`** PR3 -- Nido ritual heal/transform (J3): `services/combat/nidoRitual.js`
  (heal rimuove grave scar + malus; transform -> deterministic narrative `mark`,
  failure-as-lore) + `emitScarRitual` (`scar_healed`/`scar_transformed`, public esito
  sez.6) + `POST /api/session/:id/nido/ritual`. **Verify-first finding**: NESSUN pool
  risorse backend (campaign obj + `godotV2State` senza PE/PI -> risorse Godot/client-owned)
  -> verdict master-dd = build mechanism+chronicle, **cost (SPEC-E E6) deferred**.
- **#2792 `eac6d85a`** PR2 -- lethal consent state machine + coop transport:
  `services/coop/lethalConsent.js` (puro: open/confirm/markDeliveryFailed/evalTimeout/
  snapshot/outcome; per-player NON quorum SPEC-K 6.4 -- granted solo se TUTTI gli at-risk
  confermano; anti-deadlock -> soft [timeout post-receipt OR delivery-fail]; granted mai
  declassato; snapshot anonimo F5 counts-only; timeout VALUE = param PROPOSED 120s) +
  CoopOrchestrator (open/confirm/evalTimeout/snapshot/outcome + `_emit`; reset su
  startRun/startOnboarding) + `POST /coop/lethal/open` (host, rifiuta at-risk vuoto/non-string)
  - `POST /coop/lethal/cancel` (host anti-deadlock escape -> soft) + `lethal_consent_confirm`
    WS intent (socket-bound id) + broadcast waiting/resolved. **Review adversariale
    `coop-phase-validator` -> 3 P1 fixate** (empty-grant, run-reset mancante, anti-deadlock
    escape) ognuna con regression test.
- **#2794 `f6b4e875`** PR2b -- consent->death bridge: `coopStore.getLethalConsentOutcome(campaign_id)`
  (mirror getFormPulses) + session.js performAttack KO path PULLs il consent outcome dal coop run
  linkato -> popola `session.lethalConsent` cosi' il death-gate di PR1 si attiva. **PULL = pattern
  gia' stabilito** (session.js:316 ha coopStore + precedent getFormPulses/linkSession; verify-first
  ha risolto il "fork" -> master-dd confermato NON e' nuova architettura). **Lethal funziona
  END-TO-END** (lethal flag -> host apre consent -> WS confirm per-player -> tutti granted -> KO =
  morte reale -> fallen+lineage+chronicle; flag OFF). +Codex P1 fixato (`advanceScenarioOrEnd`
  ora azzera `lethalConsent` = no stale-consent permadeath cross-scenario) + bug latente t=0
  (ts=0 falsy -> hasOwnProperty presence check).

item-1 **invariato 13/17** (SPEC-J resta `review_needed`; chiusura piena = item-3 Godot UI + flip).
AI 543/543 + combat-oracle + meta-loop-oracle green su tutte. **5 PR sessione** (PR1/PR3/PR2/PR2b + docs)
-> **SPEC-J backend COMPLETE end-to-end** (4 code PR).

### Residui SPEC-J (gated, NON fabbricare)

- ~~**AUTOMATIC timeout timer** (sez.5 trigger a)~~ -> **DONE** (PR #2798 `3a8051a7`, vedi Continuazione 3 sotto).
- **transform -> trait mechanical** (scar -> tratto reale) + **ritual resource-cost** (E6) = SPEC-E/balance.
- **Godot device UI** (consent prompt + ritual private device-owned, SPEC-K 7.6) = item-3 cross-repo.
- **flip `LETHAL_MISSIONS_ENABLED=true` + valore timeout consent = master-dd**, solo post lethal-mission N=40/playtest.

## Continuazione 3 -- SPEC-J auto-timer (sez.5 trigger-a) SHIPPED

Sessione fresca continuazione: master-dd via AskUserQuestion -> **SPEC-J auto-timer** (default consigliato,
last buildable-autonomo residue). 1 PR merged.

- **PR #2798 `3a8051a7`** (`feat(spec-j): automatic lethal-consent timeout timer`): one-shot wall-clock
  timer armato a `openLethalConsent`; allo scadere di `timeout_ms` auto-risolve il round `pending` a
  `timeout_soft` (NON parte lethal) senza azione host ("mai loop bloccato"). Prima: solo confirm-all /
  host-cancel / eval-manuale risolvevano -> device online-no-risposta restava pending fino a host-cancel.
  - Scheduler `setTimeoutFn`/`clearTimeoutFn` injectable (default globals, `.unref()`ed); `coopStore`
    ha ora `orchestratorOptions` (DI seam). `onTimeout(snap,outcome)` callback da `/coop/lethal/open`
    broadcasta `lethal_consent_resolved` -- fira SOLO dal timer (no double-broadcast coi path manuali).
    Timer clear su: confirm->granted / eval-resolution / startRun / startOnboarding / advanceScenarioOrEnd
    / coopStore.remove.
  - **VALUE-NEUTRAL**: il valore 120s (`DEFAULT_TIMEOUT_MS`) resta PROPOSED design-call master-dd; la PR
    wira solo il firing. Band-neutral / default-OFF (`LETHAL_MISSIONS_ENABLED`); pull-only.
  - **Adversarial review `coop-phase-validator`** (agent-scanner -> REUSE) ha trovato 3 bug reali fixati
    pre-merge: P1-B dual-clock race (libuv-monotonic decide il fire vs Date.now per l'elapsed -> fire
    sub-ms-early = round bloccato pending in silenzio; fix = eval `now` pinnato all'esatto deadline),
    P1-A leak timer in `advanceScenarioOrEnd`, P2-A leak timer in `coopStore.remove`. **Codex P2** fixato:
    `timeout_ms` non-positivo (0/neg) -> normalizza a DEFAULT in `consentSM.open`.
  - Test: auto-timer 13 + SM +1 + e2e route +1. **coop 334/334, AI 543/543**, prettier+CI green.
  - 🔴 lesson: `setTimeout` NON e' bit-coupled a `Date.now` (due clock distinti) -> un timer che
    ri-controlla l'elapsed con un clock diverso da quello che ha deciso il fire puo' lasciare lo stato
    irrisolto; pinna il timestamp di eval al deadline schedulato.

item-1 **invariato 13/17** (SPEC-J resta `review_needed`; auto-timer non flippa uno SPEC, chiusura piena
= item-3 Godot UI + flip). **Residui SPEC-J ora**: SPEC-E (transform-trait/cost) + item-3 (Godot UI) + flip
(master-dd post lethal-mission N=40).

## Continuazione 4 -- 3 design-call decise (consent-timeout / lethal-flip / A2 floor)

Master-dd ha chiesto le domande nel formato preferito "con evidenze e ricerche". Eseguito
**workflow di ricerca** (5 finder: UX-web + repo-precedent + flip-readiness Game + flip-readiness
Godot + A2-balance, schema'd) -> **synth-critic** (overclaim-flagged). Poi AskUserQuestion (3
domande, consigliato-first). Master-dd = **vai** (accettati i 3 consigliati). 1 PR esecuzione.

- **Q1 consent auto-timeout = RATIFY-PROVISIONAL @ 120000ms.** Tuning value, consistente col
  ghost-timeout coop 120s. Ground-truth: l'early-confirm GIA' esiste (round -> granted appena
  TUTTI confermano) -> il timeout morde SOLO il path non-responder; osservabile solo quando Godot
  renderizza la countdown (item-3). Re-tune verso ~90s (UX-evidence) SOLO con dati device-roundtrip
  - playtest. Comment `lethalConsent.js` PROPOSED -> RATIFIED-PROVISIONAL.
- **Q2 flip `LETHAL_MISSIONS_ENABLED` = DEFERRED.** Verificato Gate-5 surface-dead: 0 encounter
  `lethal:true` in data + 0 handler `lethal_consent_*` in Game-Godot-v2 (broadcast unversioned ->
  silent drop) + backend inerte. Flip gated su: >=1 encounter lethal + Godot consent UI + N=40/
  playtest + master-dd. Mirror del defer META_NETWORK_ROUTING. NB: lavoro Godot item-3 NON tracciato
  in Game-Godot-v2. Registrato in spec lethal-wounds sez.11.
- **Q3 A2 floor magnitude = RATIFY-PROVISIONAL + author-guard.** A2 gia' LIVE in prod -> defer
  non-protettivo. N=40 = SAFETY non OPTIMALITY (sim greedy satura sopra banda umana) -> provisional,
  re-tune UPWARD-only pending playtest. **Author-guard SHIPPED**: `validate_encounter_difficulty.js`
  enforces `pressure_tier_floor` intero [0,5] E `<= difficulty_rating` (early/low-diff encounter
  non puo' partire a tier alto, P6). Tutti i 14 encounter passano.

- **PR #2800 `bad2d6e1`** (`feat(a2): encounter floor author-guard + ratify SPEC-J/A2 verdicts`):
  author-guard (codice) + comment/doc ratifications (Q1/Q2/Q3). 🔴 **Codex P2** (reale): tests/
  difficulty/\*_ era CI-orphaned (anti-pattern #10) -> wirato `tests/difficulty/_.test.js`in`scripts/run-test-api.cjs`(commit`dc776981`) cosi' il guard gate i merge davvero. Tests:
  validator 7/7, difficulty 25/25, AI 543/543, governance errors=0.
- Sessione totale = **3 PR** (#2798 auto-timer + #2799 handoff + #2800 verdicts).

## Continuazione 5 -- next-frontier scelta = item-3 Godot SPEC-J consent surface

Master-dd ha chiesto "sempre le domande". Eseguito **workflow next-frontier** (4 finder: H-aliena +
item-3 Godot + B/F/E residue + frontier-value, web+repo) -> synth-critic. AskUserQuestion (4 domande:
frontiera + J1 + J2 + esecuzione-Godot). Master-dd = **vai** (tutti consigliati).

- **Frontiera scelta = item-3 Godot SPEC-J lethal-consent surface.** Gate-5 (engine-LIVE/surface-DEAD
  = ~0 valore) = vincolo binding; SPEC-J = unica superficie genuinamente morta ad alto valore
  (verificato: 0 handler `lethal_consent` in Game-Godot-v2 `coop_ws_peer.gd` -> broadcast cadono in
  unknown_type toast). 🔑 **Falsificazione**: la UI route-choice META_NETWORK e' GIA' costruita (#401)
  -> il suo flip e' puro env-flip master-dd, NON un build. H aliena = backend-su-machinery-LIVE
  (aggiunge inventario engine-invisibili = anti-pattern Gate-5); label HA1/HA2/HA4 = solo handoff,
  NON nello spec SPEC-H (review_needed).
- **J1 at-risk targeting = show-confirm-a-tutti no-op-safe** (zero backend, F5-clean; confirm
  non-at-risk e' gia' un no-op backend).
- **J2 countdown = timeout_ms nello snapshot -> SHIPPED PR #2803 `6671cdc7`** (`snapshot()` porta
  `timeout_ms` = durata round, F5-safe non-roster; cavalca open/waiting broadcast; il client guida il
  countdown senza hardcodare 120000 [valore RATIFIED-PROVISIONAL, andra' verso ~90s]). coop 335/335,
  AI 543/543, 0 Codex finding.
- **J3 TV = conteggi anonimi + countdown + bottone host-cancel**; **J4 phone = lock + "in attesa del
  branco (N/M)" + dismiss-on-resolved**, host-cancel = bottone TV dedicato (non long-press).
- **Esecuzione Godot = CHIP cross-repo spawnata** `task_1162a9a2` (Game-Godot-v2: 4 signal+case in
  coop_ws_peer.gd mirror route_tally + confirm-sender + PhoneLethalConsentWire overlay + TV panel +
  roadmap entry + issue). NON buildabile dal repo Game (repo separato, fuori auto-merge L3).
- Sessione totale (cont 3-5) = **#2798 #2799 #2800 #2801 #2803** + chip Godot.

## Next frontier (blocked-build, build-vero)

- **SPEC-J backend = DONE e2e** (auto-timer incluso); timeout RATIFIED-PROVISIONAL; residui = SPEC-E (transform-trait/cost) + item-3 (Godot UI = sblocca flip + rende osservabile la countdown) + flip (DEFERRED, master-dd).
- **A2** = LIVE + magnitude RATIFIED-PROVISIONAL + author-guard CI-enforced; residuo = re-tune UPWARD-only post-playtest-umano (no sim).
- **H** aliena-enforcement: infra ALIENA GIA' robusta (spawn-bias/reinforcement/telemetry/
  coherence/generator/calibrate); residuo = authoring-gate validator + telemetry + flip (N=40).
  3 design-call aperti HA1/HA2/HA4 (rec ma non ratificati). NON 0-code.
- **B** tv-device-info + **F slice 3**: gated SPEC-K / 3 design-call.
- Oppure: A2 magnitude post-playtest Godot; item-3 Godot cross-repo; Postgres auto-start service.
