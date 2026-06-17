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

## Next frontier (blocked-build, build-vero)

- **SPEC-J backend = DONE e2e** (auto-timer incluso); residui = SPEC-E (transform-trait/cost) + item-3 (Godot UI) + flip (master-dd).
- **H** aliena-enforcement: infra ALIENA GIA' robusta (spawn-bias/reinforcement/telemetry/
  coherence/generator/calibrate); residuo = authoring-gate validator + telemetry + flip (N=40).
  3 design-call aperti HA1/HA2/HA4 (rec ma non ratificati). NON 0-code.
- **B** tv-device-info + **F slice 3**: gated SPEC-K / 3 design-call.
- Oppure: A2 magnitude post-playtest Godot; item-3 Godot cross-repo; Postgres auto-start service.
