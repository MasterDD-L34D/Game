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
- **SPEC-F slice 3** (`/crossbreed/confirm` + cooldown/rate-limit): 3 design-call aperti
  (cooldown enforcement, +Nido materialization, diary-consent persistence). Slices 0-2 LIVE.
- **OD-059 design-call** (deferred, structured-data only shipped): copy narrativa, soglie,
  semantica turn-delta (default `session.turn`/unit), se mai meccanico (= N=40).
- **#2785 P2**: master-dd ha scelto class-wide as-is (A); per-scenario override = follow-up se serve.
- **SPEC-G controllo_reale apply+consent** = SPEC-K-coupled (nessun card-apply path oggi -> 0
  controllo_reale cards). Sorgenti narrativa/dottrinale (sez.3) = slice futura. `tri-sorgente.schema.json`
  = orphan non validato dalla route live (forbidden-path, lasciato).

## Next frontier (blocked-build, build-vero)

- **H** aliena-enforcement: N=40 ALIENA pilot + authoring-gate 6-dim (piu' grosso, design-heavy).
- **J** lethal-wounds: layer lethal/consenso/rituali/succession = 0 codice (build grosso).
- **B** tv-device-info + **F slice 3**: gated SPEC-K / 3 design-call.
- Oppure: A2 magnitude post-playtest Godot; item-3 Godot cross-repo; Postgres auto-start service.
