---
title: 'Handoff 2026-06-02 — H2 economy (SG+PP shipped) -> PT + rescales + resto Fase-2'
date: 2026-06-02
type: session-handoff
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-02'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, economy, cost-gate, pt-pool, worldgen-gap-c, fase-2, pending-build]
---

# Handoff 2026-06-02 — H2 economy + resto Fase-2

> Continuazione del GOAL design-closure (`docs/planning/2026-06-02-design-closure-goal.md`). Fase-1
> chiusa (#2553). Fase-2: SG+PP cost-gate shipped; restano PT + rescale opzionali + H1 GAP-C + eventuali
> feature sbloccate. Master-dd ha accordato **autonomia di scelta su evidenza** (decidi + costruisci,
> STOP solo su STOP-conditions reali).

## TL;DR (30s)

H2 economy combat cost-gate: **SG** (#2554 `294174b2`) + **PP** (#2555 `67823702`) **SHIPPED** su main.
Resta: **PT economy slice** (la grossa) + **rescale numerici opzionali** (cataclysm + PP rank-2) +
**H1 GAP-C fase-3/4** (gated, build greenlit) + qualunque feature Fase-2 sbloccata. Metodo invariato
(verify-first / museum-first / SoT / giochi / TDD / band-verify / Gate-5 / ADR-0011 / auto-merge L3).

## GIA SHIPPED — NON ricostruire (verify-first: `git log origin/main -S <simbolo>`)

- **SG cost-gate** (#2554): `executeAbility` gate `cost_sg<=3` numerico / `>3` consume-all (drena pool);
  spend-before-dispatch + rollback su non-2xx. Pool = `sgTracker` (esisteva). `initial_sg` seed.
- **PP cost-gate** (#2555): `ppTracker` (POOL_MAX 3, earnKill/earnCrit) + earn in `session.js`
  performAttack (+1 `is_critical`, +1 `killOccurred`) + gate consume-all (tutti i cost_pp 4-12 > 3) +
  `initial_pp` seed. executeTeamBuff esclude il caster dal proprio pp_grant (anti self-refill) + clamp.
- Fase-1 (#2553): design-closure report + H8/H9. Tutto in `docs/reports/2026-06-02-design-closure.md`.

## RESTANTE (mandato della prossima sessione)

### 1. PT economy slice (la principale)

PT (`26-ECONOMY` §PT, Q51-B): cap 12, **per-round**, earn `nat15-19 +1 / nat20 +2 / +5 MoS +1`, spend su
**perforazione / spinte / condizioni / combo** (manovre) + `cost_pt` sulle ability (3-10, gia <=cap).
**Stato verificato 2026-06-02**: il PT roll si computa (`sessionHelpers.js:248-252`) ma **NON esiste un
pool `actor.pt` spendibile** (no accumulo/reset/spend wiring). Quindi PT = slice INTERA, non bolt-on:

- Costruire il pool PT spendibile (mirror `sgTracker`/`ppTracker`): `ptTracker` accumula il roll per-round
  -> `actor.pt` (cap 12), **reset per-round** (round-model `sessionRoundBridge`).
- Wire delle manovre (perforazione/spinte/condizioni/combo) come spend di PT (se non gia) — verify-first
  se esistono.
- Gate `cost_pt` sulle ability in `executeAbility` (numerico, tutti <=12 -> nessun rescale; stesso pattern
  spend-before-dispatch + rollback di SG/PP). `initial_pt` seed nel route /start (mirror initial_sg/pp).
- ⚠️ **Interazione di design**: PT finanzia SIA manovre SIA ability cost_pt dallo stesso pool per-round ->
  e' UNA economia tattica condivisa (canon OK). Se emergesse un conflitto -> verdetto master-dd.
- Band-neutral atteso (le ability cost_pt non sono in party sim — verify-first con grep) -> AI 500/500.

### 2. Rescale numerici opzionali (master-dd preference, reversibili)

Oggi consume-all per cost-threshold (valore gonfiato > pool = "ultimate"). Se master-dd preferisce
**numerico** per le rank-basse, set `cost_*<=pool` per-ability:

- **cataclysm** (rank-2, cost_sg:75) -> numerico se vuoi (set cost_sg<=3).
- **PP rank-2** (blade_flurry 6 / resonance_amplifier 4 / kill_shot 6 / deathmark 4) -> numerico se vuoi.
- Opzione canon-faithful (option-C stretta): rank-2 numerico (rescale a <=pool), rank-4 consume-all. La
  scelta del valore per-rank e' una leva balance (band-neutral, non sim-validabile) -> proporre + decidere.

### 3. H1 GAP-C fase-3/4 (gated, build greenlit-for-later)

Verdetto = GATE/POST-MVP ratificato. Build (Godot choice-UI Into-the-Breach + generative grammar Dormans)
quando master-dd attiva il flag `META_NETWORK_ROUTING`. **Cross-repo** (Game-Godot-v2). Brainstorm:
`docs/planning/2026-06-02-gapc-fase3-4-build-vs-gate.md`. Se la prossima sessione lo affronta: spec +
DoD Gate-5 (player vede la scelta <60s) consumando i `candidates` di `selectNextNodes` (NON `.preview`,
campo inesistente — gia corretto).

### 4. Resto Fase-2

Qualunque feature sbloccata dai verdetti, seguendo `docs/guide/games-source-index.md` (mappa pilastri ->
top-3 source + anti-reference) per ogni feature.

## Canon da consultare

- Economia: `docs/core/26-ECONOMY_CANONICAL.md` (SoT — PT/PP/SG/PE earn+spend). Spec follow-up:
  `docs/superpowers/specs/2026-06-02-economy-cost-gate-pp-pt-followup.md` + `2026-06-01-phasec-economy-cost-gate.md`.
- Come-costruire-feature: `docs/core/00D-ENGINES_AS_GAME_FEATURES.md` (§6 risorsa LEGGIBILE, §13 no numeri
  nascosti -> un cost-gate e' feature solo se la risorsa e' visibile + telegrafata).
- Giochi: `docs/guide/games-source-index.md` + `docs/research/2026-04-26-cross-game-extraction-MASTER.md`
  (combat-resource: FFT CT/MP, fighting super-meter; meta-economy: Hades/StS/Monster Train).
- SoT design: `docs/core/00-SOURCE-OF-TRUTH.md` + `90-FINAL-DESIGN-FREEZE.md`. Museum: `docs/museum/MUSEUM.md`.
- Report Fase-1: `docs/reports/2026-06-02-design-closure.md`.

## Metodo (ogni feature)

verify-first ground-truth (`git log origin/main -S` + memory) -> **currency-gate (leggi il SoT COMPLETO:
le earn-curve PP/PT erano GIA canon, non balance-pending — lezione di questa sessione)** -> museum-first
-> SoT check -> giochi-fonte (cita il gioco) -> Style (42-STYLE-GUIDE-UI / 00E-NAMING) -> verdetto citato
-> no-anticipated-judgment (fork balance = proposta + preserva alternative). TDD red->green. band-verify
o band-neutral-proof (grep ability assente dalle sim + AI 500/500). Gate-5 engine-wired.

## Constraints

- **Worktree ISOLATO off origin/main** (`git -C C:/dev/Game worktree add C:/dev/_gamewt-<x> -b claude/<x>
origin/main` + `npm ci`). **NON committare sul main checkout** `C:/dev/Game` (master-dd lo tiene su main
  per leggere i file in locale — lascialo su main).
- ADR-0011 trailer (`Coding-Agent: claude-opus-4.8` + `Trace-Id` uuidv7, NO Co-Authored-By); commit
  lowercase + subject <=72 + NO em-dash; prettier pre-commit (worktree needs prettier: `npm ci` o
  `npm install --no-save --no-workspaces prettier@3.3.3` per docs-only).
- `node --test tests/<dir>/*.test.js` (glob, node v24). `python tools/check_docs_governance.py --strict`
  errors=0. NO forbidden paths (.github/workflows, migrations, packages/contracts, services/generation).
- **Babysit OGNI PR**: CI + Codex. ⚠️ **Codex serve ~2 nudge `@codex review`** (connector lento ~8min su
  questo repo) — NON mergiare CLEAN senza aver letto Codex (lezione #2547). address P1/P2 + reply +
  `resolveReviewThread` (graphql). auto-merge L3 (squash + delete-branch) SOLO a checks green + 0 thread
  unresolved.
- Post-merge: `git -C C:/dev/Game worktree remove <wt> --force` (+ `Remove-Item` se dir-not-empty) +
  `git -C C:/dev/Game branch -D <branch>` + `git -C C:/dev/Game pull --ff-only` (riporta main su HEAD).

## Learnings (questa sessione)

- 🔴 **currency-gate**: leggi il SoT COMPLETO prima di chiamare una cosa "balance-pending". Le earn-curve
  PP/PT erano gia canon in `26-ECONOMY` — la followup-spec sbagliava. (anti-pattern #19 su me stesso.)
- **Codex pattern**: ~2 nudge necessari/PR; 4 P2 reali catturati questa sessione (preview->candidates;
  SG spend-before-earn; PP spend-before-earn; PP team_buff self-refill) -> SEMPRE leggi Codex pre-merge.
- **spend-before-dispatch + rollback** e' il pattern corretto per i cost-gate (lo spend post-dispatch
  perde l'earn al cap).
- **band-neutral proof** = grep ability id assente dalle party sim/scenario + AI 500/500 (le job-ability
  non sono nelle sim -> gating non muove HC06/07).

## Paste per la prossima sessione (`/goal`)

Vedi blocco sotto (incollabile). Punta a questo doc per il dettaglio completo.
