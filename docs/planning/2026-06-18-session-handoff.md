---
title: '2026-06-18 session handoff -- item-1 build-residui + deep post-merge audit'
date: 2026-06-18
type: session-handoff
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-18'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, handoff, item1, spec-h, spec-k, audit]
---

# Session handoff 2026-06-18 (Lenovo)

> **Entry point prossima sessione.** main `aeef06f7`. item-1 = 17/17 active COMPLETE
> (invariato). Questa sessione = chiusura build-residui item-1 (K-04 recruit e2e +
> SPEC-H buildable arc) + **deep adversarial audit post-merge** della giornata
> (18 findings -> tutti risolti, Codex-converged). Stile + permessi: vedi il chip di
> continuazione (`task`-id nel commento finale della sessione).

## Cosa e' stato fatto

### Track A -- K-04 recruit-review: DONE e2e

- **#2826** `3f5ecf21` prereq `GET /api/v1/meta/npg` enrich `can_recruit`/`can_mate`
  server-side (`metaProgression.evalNpcGates`; verify-first: il phone duplicava il
  gate client-side = drift-risk).
- **GGv2 #481** `200ac70` (+doc #482) recruit-button phone (per-player device, NON-bypass).

### Track C -- SPEC-H Codex: buildable arc COMPLETE

- Surface: **#2828** backend `GET /codex/entries` (secret-guard) + **#2829** "Specie"
  tab frontend (6-dim accordion + Skiv footer, verificato live) + **#2830**
  unlock-through-play.
- **#2833** HA2 authoring-validator (`tools/js/validate_codex_aliena.js`, enforced
  via run-test-api).
- **#2835** HA5 proxy `presence_descriptor` (verify-first: runtime scorer disallineato
  combat-pool/ecosistema -> proxy codex-native 3-dim; master-dd verdict).

### Deep audit post-merge (8-agent Workflow) -> 18 findings, tutti risolti

Codex era rate-limited tutta la sessione (le 6 Game PR mergiate senza review esterna);
l'audit adversarial = controllo compensativo. Trovo' **1 P1** (HA2-gate CI-orphaned:
`data/codex/**` mancava dal paths-filter -> codex-only PR skippava test:api) + 2
design-flaw provati live (HA5 misurava completezza-authoring non fit-ecologico; HA2
band 100-300 warnava sul 100% del corpus). Fix-PR: **#2838** (ci.yml P1, forbidden-path
autorizzato), **#2839** (secret-allowlist + HA5 bands rinominate `scheda completa/
parziale/frammentaria` + P3s), **#2841/#2847/#2848** (Codex P2 a catena sullo scrub
secret, convergente: tiene score-leaf, droppa solo `strength`), **#2842** (frontend
resilience + a11y + namespace doc), **#2843** (HA2 band -> 100-500), **#2844** report,
**#2845/#2848** correzioni report. **GGv2 #486** freed-view guard.
Report: `docs/reports/2026-06-18-session-audit.md`. 1 refutato (il mio "metaRoutes 9/9"
era corretto). Lesson: `lesson_codex_ratelimit_audit_compensating`.

### Incidente prod recuperato

Killato per errore la WS port prod 3341 -> prod 3334 giu' -> ripristinato via
`Start-ScheduledTask EvoTacticsBackend`. Lesson: `lesson_prod_host_ports_3334_3341`
(NON killare 3334/3341; local test su PORT=3400 LOBBY_WS_ENABLED=false).

## Sessioni parallele (NON toccare)

- **species/taxonomy** (`_wt-roster-parity` [feat/promote-ghost-species]): PR #2845
  (promote 5 ghost species) + #2846 (evopack test). Disgiunto.
- **G2 calibration** (harness N=40): owns `tools/py/calibrate_*` + `objective.py` +
  `canonical-suite.yaml`. = LEVERAGE per i flip N=40, NON duplicare.
- **prod-host** (`_gamewt-lenovo-host`). Leftover stale: `.claude/worktrees/spec-j-lethal`.
- #2765 draft (master-dd weekly drift) = non toccare.

## Residui (gated / design-call, pre-audit -- pronti quando vuoi)

- **SPEC-H HA1 flip** = unico residuo sostanziale SPEC-H: `aliena_enforcement.enabled:true`
  - `strength` SOLO post N=40 su `enc_badlands_pilot_01` (via harness G2) + master-dd.
- **SPEC-K namespace** (audit doc-only/accepted-risk): se si autorano nuove codex-entry,
  il loro id deve == species-slug di un'unita' sistema, altrimenti niente unlock; eventuale
  propagation `species_hint -> unit.species_id` negli scenario builder.
- Track A: party-select (design-call blocking-rules), altri Godot K-0x (chip).
- Altri: SPEC-F durable cooldown (forbidden-path contracts), A2 floor re-tune UPWARD-only
  post-playtest, META_NETWORK_ROUTING flip (env, prod-health-gated), Postgres auto-start
  (reboot-survival), biome-aware Skiv pool + species.yaml fallback (SPEC-H minori).

## Pointer

- Piano coordinato cross-session: `docs/planning/2026-06-17-post-item1-coordinated-plan.md`.
- Sprint pointer live: `CLAUDE.md` -> "Current sprint (2026-06-18 ...)".
- Memory auto-load: `MEMORY.md` (SPEC-H/K/J, lessons prod-ports + codex-audit).
