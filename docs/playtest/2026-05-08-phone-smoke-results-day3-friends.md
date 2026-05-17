---
title: Phone smoke results - 2026-05-08 Day 3/7 friends online retry
workstream: ops-qa
doc_status: active
doc_owner: master-dd
last_verified: 2026-05-08
source_of_truth: true
language: it
review_cycle_days: 30
status: active
owner: master-dd
last_review: 2026-05-08
tags:
  [
    playtest,
    phone,
    smoke,
    godot-v2,
    w6,
    deploy,
    cloudflare-tunnel,
    results,
    bug-bundle,
    day3,
    phase-a-monitoring,
    claude-driven,
  ]
---

# Phone smoke results — 2026-05-08 Day 3/7 friends online retry

Master-dd userland esecuzione smoke test phone HTML5 cross-device con amici online via Cloudflare Quick Tunnel shared mode. Claude-driven (Claude lancia stack + monitora + diagnostica live). **4 bug runtime nuovi** caught durante world setup → combat transition. Sessione fermata early su Option B (master-dd verdict: stop, log, ship fix next). Phase A Day 3/7 sera monitoring window.

## Pre-flight 5/5 ✅

| Check                          | Status                               |
| ------------------------------ | ------------------------------------ |
| Godot 4.6.2 stable             | ✅ `4.6.2.stable.official.71f334935` |
| Game-Godot-v2 main + #166/#167 | ✅                                   |
| cloudflared 2025.8.1           | ✅                                   |
| Game/ node_modules             | ✅                                   |
| deploy-quick.sh                | ✅                                   |

## Boot stack — `deploy-quick.sh` shared mode ✅

- Tunnel URL: `https://issn-rom-distributions-deaths.trycloudflare.com`
- Backend Express :3334 shared mode (REST + WS + phone same-origin)
- AUTH_SECRET auto-gen `Game/.env`
- Stack lifetime: ~25 min (boot 14:11 UTC → kill ~14:35 UTC)
- ZERO infra error boot (cloudflared spawn + backend boot + WS attach OK)

## Verdict

| Metrica                                   | Valore             |             Verdict             |
| ----------------------------------------- | ------------------ | :-----------------------------: |
| Pre-flight 5/5                            | ✅                 |              PASS               |
| Boot stack deploy-quick                   | ✅ ~30s            |              PASS               |
| Lobby create REST                         | ✅ JMMV            |              PASS               |
| Phone Create Lobby (host + amici)         | ⚠️ 3 lobby create  | CONDITIONAL (deep-link bypass)  |
| World setup vote 2/2 accept               | ✅ visible UI      |              PASS               |
| World setup tag click → combat transition | ❌ stuck no-op     |        **ABORT B-NEW-1**        |
| Phone exit + return lobby → re-join       | ❌ dead-end        |        **ABORT B-NEW-4**        |
| Combat 5 round p95 capture                | ❌                 |     DEFERRED (next session)     |
| Airplane reconnect                        | ❌                 |     DEFERRED (next session)     |
| **OVERALL VERDICT**                       | **CONDITIONAL ❌** | 4 bug runtime nuovi, fix needed |

## Bug bundle 4 runtime nuovi

### B-NEW-1 — World setup tag/Accetto click no-op post 2nd player disconnect

**Severity**: P0 functional blocker
**Scenario**: 5b world setup vote
**Sintomo**: Phone screenshot mostra "Voti mondo: 2 accetto / 0 rifiuto (2/2)" + bottoni `Sicuro`/`Ricco`/`Strano` visibili. Qualsiasi tap (Accetto / Rifiuto / tag biome) **no-op**. State frozen. Combat non parte.

**Backend ground truth** (REST `/api/lobby/state?code=JFKN`):

- `state_version: 3` (azioni avvenute)
- 1 solo player connesso (host eddy)
- 2nd player WS dropped silently mid-vote

**Hypothesis RCA**:

1. Phone UI cached state pre-disconnect (mostra 2/2 stale)
2. Vote tally logic backend probably waiting 2nd player tag pick → blocco indefinito
3. Phone tag click invia event ma backend ignora perché 2nd player offline + vote inconclusive

**Repro steps**:

1. 2 phone create+join lobby
2. 2/2 accept world vote
3. Network blip 2nd phone (WS close)
4. 1st phone tap tag biome → no advance

**Fix candidates**:

- Backend: tag selection accept con quorum host-only fallback se 2nd player offline >5s
- Frontend: vote tally UI deve invalidare se WS state mismatch con backend snapshot
- Both: add explicit "2nd player disconnesso, attendi reconnect / continua single" CTA

### B-NEW-2 — Lobby SFTN auto-close mid-vote 2-player

**Severity**: P1 state machine
**Scenario**: lobby create → 2 player join → world vote → close trigger spurious
**Sintomo**: lobby SFTN backend mostra `closed: true` con `state_version: 3` + 2 player record `connected: false`. User report: amico era stato joinato OK, poi sessione chiusa senza azione esplicita.

**Hypothesis RCA**:

- Auto-close on grace expire mid-vote? (`LOBBY_HOST_TRANSFER_GRACE_MS=90000` default post #2053)
- Host disconnect transient → grace fire → close before reconnect?
- Vote 2/2 mancato trigger phase advance → idle timeout?

**Investigate**: `apps/backend/services/lobbyService.js` close path + grace logic + idle timer.

### B-NEW-3 — Deep-link `?room=XXXX` non auto-routes a Join

**Severity**: P2 UX
**Scenario**: user apre deep-link `https://...trycloudflare.com/phone/?room=JMMV` → tap Create Lobby → crea NEW lobby (es. JFKN) ignorando query param JMMV.

**Expected**: deep-link `?room=XXX` deve:

- Pre-fill code field ✅ (probabilmente già)
- Default action **Join Lobby** (non Create) ❌
- Oppure highlight Join button + disabilita Create se room exists server-side

**Repro**: open deep-link → primary CTA = Create (default), Join secondario → user tap Create per default UX → 3 lobby orfane create in <5min.

### B-NEW-4 — Phone exit during combat → return lobby = dead-end no rejoin path

**Severity**: P0 UX blocker
**Scenario**: 5d-equivalent (phone session interrupted)
**Sintomo**: phone chiuso (manual close tab? backgrounded? OS swipe-out?) → ritornato a lobby screen → impossibile rientrare in sessione corrente.

**Master-dd quote**: _"e dal cell ora mi si è chiuso e son otornato alla lobby senza possibilità di rientrare"_

**Hypothesis RCA**:

- Player_token JWT scaduto o invalidato
- WS close 4002 → REST re-join API failed (room state inconsistent)
- Frontend re-join button assente o disabled
- Hydrated rooms back-compat (Sprint R codex bundle, PR #2036) non triggered

**Repro**: durante session attiva, phone close tab → riapri tunnel URL → vede lobby empty/list, no re-join CTA.

**Fix candidates**:

- Persist player_token localStorage + auto-rejoin via `POST /api/lobby/join` con token su page load
- "Rejoin sessione precedente" CTA su lobby home se token+room presenti localStorage
- Backend: hydrated rooms validate token → 200 OK + state replay anche post-close-tab

## State backend post-sessione

3 lobby orfane:

- JMMV (REST POST mio, abandoned, host disconnesso)
- SFTN (eddy + rufl, **closed:true** mid-vote, B-NEW-2 RCA target)
- JFKN (eddy host only post B-NEW-1 stuck)

## Lessons

- **Claude-driven smoke = ~5x speedup vs ship+retest**: lancio stack autonomous via Bash bg, monitora tunnel URL, crea lobby via REST, diagnostica live via `/api/lobby/list` + backend log tail. Master-dd phone-only, zero terminale userland.
- **Backend log silente su lobby events**: ZERO log line per join/vote/close su current backend (probably `console.log` minimal). Add structured JSON log su `lobbyService.create/join/vote/close/grace_fire/auto_close` per RCA next session più fast.
- **`jq` mancante MSYS** ma non bloccante (REST raw + python json.tool fallback).
- **3 lobby orfane in <5 min** = UX issue B-NEW-3 ha effetto cascade. Deep-link DEVE avere default Join se `?room=` query presente.

## Confronto vs 2026-05-05 bundle (5 bug B1-B5)

| Bundle                            | Date           | Bug count         | Severity max              | Status                               |
| --------------------------------- | -------------- | ----------------- | ------------------------- | ------------------------------------ |
| Iter1 (2026-05-05)                | 2026-05-05     | 5 (B1-B5)         | P0 functional             | ✅ shipped + verified iter2          |
| Iter2 hardware (2026-05-07)       | 2026-05-07     | 5 (B6-B10)        | P0 frontend infra         | ✅ shipped Tier 1 layered QA         |
| Iter3 friends online (2026-05-08) | **2026-05-08** | **4 (B-NEW-1→4)** | **P0 state machine + UX** | ❌ **NEW** — fix needed next session |

## Phase A Day 3/7 monitoring impact

Questo è **prima sessione master-dd phone smoke real con amici online post-Phase-A-LIVE 2026-05-07**. 4 bug runtime nuovi caught — pattern coerente con sprint Phase A grace window 7gg dove regression non triviali emergono solo con userland real-traffic.

**Verdict Phase A monitoring window**: **NO-GO trigger Phase B yet**. Bug B-NEW-1 + B-NEW-4 entrambi P0 blocker, devono essere fixed prima di archive web v1 (ADR-2026-05-05 §6 cutover Phase B trigger 2/3).

**Day 3/7 trigger evaluation post-bug**:

- ❌ ZERO critical bug regression baseline → **violato** (4 nuovi P0/P1)
- ❌ p95 stable → **non capturable** (combat mai entrato)
- ⚠️ WS reconnect <5% → **non capturable** (ma B-NEW-4 dimostra reconnect path rotto cross-device)

Phase B trigger gate **MOVED**: 2026-05-14 → ≥ 2026-05-15+ (1+ day delay per fix bundle ship + retry).

## Next session triggers

**Resume trigger phrase canonical**:

> _"resume phone smoke iter3 friends-online RCA, fix B-NEW-1 + B-NEW-4 + retry deploy-quick"_

OR

> _"leggi docs/playtest/2026-05-08-phone-smoke-results-day3-friends.md, ship fix bundle B-NEW + relaunch phone smoke"_

**Priority queue next session**:

1. **B-NEW-4 fix P0** (phone exit → rejoin via localStorage token) — unblocks any future smoke
2. **B-NEW-1 fix P0** (world vote tag click + 2nd player offline quorum) — unblocks combat path
3. **B-NEW-2 RCA P1** (lobby auto-close mid-vote forensic via add log lines + repro)
4. **B-NEW-3 fix P2** (deep-link default Join CTA quando `?room=XXX`)
5. **Retry full smoke** post-fix bundle → 5c combat 5 round p95 + 5d airplane reconnect

**Estimated effort fix bundle**: ~3-4h (B-NEW-1+4 critical) + ~2h (B-NEW-2+3 polish) + ~1h retry = **~6-7h next session**.

## Refs

- [`docs/playtest/2026-05-05-phone-smoke-step-by-step.md`](2026-05-05-phone-smoke-step-by-step.md) — userland playbook canonical
- [`docs/playtest/2026-05-05-phone-smoke-results.md`](2026-05-05-phone-smoke-results.md) — bundle B1-B5 iter1 reference
- [`docs/playtest/2026-05-07-phone-smoke-bundle-rca.md`](2026-05-07-phone-smoke-bundle-rca.md) — bundle B6-B10 iter2 reference
- [Game-Godot-v2 PR #169](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/169) — bundle B1-B4 fix shipped
- [Game/ PR #2053](https://github.com/MasterDD-L34D/Game/pull/2053) — `LOBBY_HOST_TRANSFER_GRACE_MS=90000` + WS publishPhaseChange
- [ADR-2026-05-05](../adr/ADR-2026-05-05-cutover-fase-3-godot.md) — Phase B trigger gate

## Out of scope

- Hardware-equivalent iter3 automated (covered Tier 1 PR #2099)
- WS multi-tab phase-flow synthetic (covered Tier 1 PR #2097-#2098)
- Production cert hardening (Cloudflare Quick Tunnel sufficient demo)
