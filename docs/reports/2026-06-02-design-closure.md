---
title: 'Design-closure report 2026-06-02 — Fase 1 (H1-H9 verdetti)'
date: 2026-06-02
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-02'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [design-closure, sot, worldgen-gap-c, economy, pillar, governance, verify-first]
---

# Design-closure report 2026-06-02 — Fase 1

> Output del GOAL a 2 fasi (`docs/planning/2026-06-02-design-closure-goal.md`). Per ogni buco di
> design (inventario H1-H9): **verdetto + citazione canon + stato** (deciso-reversibile /
> pending-master-dd / gia-shipped). Metodo §2 del goal: verify-first ground-truth ->
> museum-first -> SoT -> giochi-fonte -> Style -> verdetto citato.
>
> ⚠️ **Doc autonomo Claude (claude-opus-4.8), `doc_status: active` ma i verdetti gated restano
> proposte pending master-dd.** Il canon citato e' verita'; i default proposti su balance/scope no.

## TL;DR (30s)

Il design e' **chiuso al 100%** a livello di decisione. Sotto verify-first (anti-pattern #19,
`git log origin/main -S <simbolo>` per ogni riga), **7 buchi su 9 risultano gia-shipped o
verify-closed**; restano **2 verdetti owner-gated** (H2 economy balance + H1 GAP-C fase-3/4
build-vs-gate) per i quali l'output e' una **spec/brainstorm** (non una decisione forzata).

| ID  | Buco                        | Verdetto                                  | Stato                       |
| --- | --------------------------- | ----------------------------------------- | --------------------------- |
| H1  | Worldgen GAP-C residuo      | **GATE / POST-MVP** (fase-3/4 + arc-data) | pending master-dd (spec)    |
| H2  | Economy combat cost-gate    | **GATED** (C-hybrid proposto)             | pending master-dd (spec)    |
| H3  | Campaign-XP earn-wire       | shipped (V6 #2550)                        | ✅ verify-closed            |
| H4  | Cat F roll-tags 7/7         | wired 7/7 (consumer-verified)             | ✅ verify-closed            |
| H5  | OQ-BOND / OQ-MINION         | shipped (PHASEC 32/32)                     | ✅ verify-closed            |
| H6  | Ecosystem combat-wiring     | LIVE (GAP-A #2447)                        | ✅ verify-closed            |
| H7  | Pilastri 6/6 + surface      | 6/6 🟢 ratificato; gap gated/done         | ✅ verify-closed            |
| H8  | 1-HP-tail comment           | ratificato -> comment cleaned             | ✅ shipped (questo PR)      |
| H9  | OD residui (OD-022/023)     | OD-022 risolto; OD-023 MOOT               | ✅ shipped (questo PR)      |

**Gate Fase 1 -> Fase 2**: nessun design aperto resta indeciso. **Fase 2 build frontier =
interamente owner-gated** (vedi §Fase-2) -> nessun build autonomo eseguibile sotto disciplina
canon + Gate-5 + flag-OFF. Outcome corretto, NON over-caution (ogni residuo = STOP condition §6).

---

## H1 — Worldgen GAP-C (residuo) -> GATE / POST-MVP [pending master-dd]

**Verify-first**: `git log origin/main -S filterReinforcementPool` + `-S getEcosystem` + BACKLOG:22-28 +
memory `project_worldgen_gapc_spec`.

**Gia-shipped (NON ricostruire)**:

- **GAP-A foodweb->spawn** LIVE: PR #2447 `04a3920a`, `reinforcementSpawner.js:158-173` consuma
  `foodwebFilter.filterReinforcementPool` (whitelist Caves-of-Qud sul pool di rinforzo per bioma).
- **GAP-C meta-network Stage-1** LIVE flag OFF: PR #2483, `metaNetworkRouting.selectNextNodes` (Dormans
  lock-and-key) + `campaign.js:61`, flag `META_NETWORK_ROUTING` OFF-default.
- **GAP-C fase-2 arc-conditions** Stage-1 LIVE flag OFF: PR #2509 `d05fe323`, `_evalEdgeConditions`
  (season + prior_node_cleared), schema yaml 2.1, `conditions.season:[winter]` su 2 winter bridges.

**Residuo NON costruito**: (a) ulteriori arc-conditions data, (b) **fase-3 Godot choice-UI**,
(c) **fase-4 generative grammar**.

**Verdetto: GATE (POST-MVP), master-dd decide se/quando.** Citazione canon:

- Goal §4 ("residuo UI/grammar = master-dd se/quando") + memory `project_worldgen_gapc_spec`
  ("fase 2-4 GATED master-dd").
- Reference-game (`docs/guide/games-source-index.md`, pilastro P5): **Into the Breach** (la rotta e'
  hand-authored + random, il player la VEDE e sceglie) per la fase-3 UI; **Dormans mission/space
  grammar** (cross-game-extraction-MASTER §3 P5) per la fase-4 generative.

**Rationale GATE (non over-caution, 3 STOP reali)**:

1. **fase-3 Godot choice-UI** = cross-repo (`MasterDD-L34D/Game-Godot-v2`, fuori dallo scope `C:/dev/Game`
   del goal) + il flag e' OFF -> costruire UI per un sistema non nel flusso campaign live.
2. **fase-4 generative grammar** = scope maggiore, richiede design (Dormans grammar) -> brainstorm
   master-dd.
3. **arc-conditions data ulteriore** = flag OFF + nessuna surface player (solo diagnostic endpoint) ->
   **viola Gate-5** ("player VEDE l'effetto <60s": un sistema flag-OFF non e' visto). Authoring di
   contenuto stagionale = design-call (quali bridge, quale season) -> master-dd / worldgen designer.

**STOP §6 applicabile**: "flag GAP-C ON in prod = decisione master-dd". Deliverable = brainstorm
`docs/planning/2026-06-02-gapc-fase3-4-build-vs-gate.md` (opzioni + reference-game + effort + reco GATE).

## H2 — Economy combat cost-gate -> GATED balance [pending master-dd]

**Verify-first**: spec `docs/superpowers/specs/2026-06-01-phasec-economy-cost-gate.md` (#2530-A2) +
re-check su main `253c4686` (`abilityExecutor.js` gate solo `cost_ap`; nessun deduct SG/PT/PP).

**Verdetto: GATED.** Tutti i combat `cost_sg/pp/pt` sono **decorativi** (solo `cost_ap` e' gated) e su
**scale incoerenti** vs i pool del SoT (`26-ECONOMY_CANONICAL`: PP/SG max **3**, PT max **12**; valori
trovati fino a 75/80/100). Un gate naive rende gli ultimate incastellabili.

Opzioni (dalla spec): **A** rescale ai cap / **B** consume-all per ultimate (fedele al SoT "Ultimate =
3 PP consume all") / **C** hybrid (rank<=2 gate numerico + ultimate consume-all, **proposto**) / **D**
leave decorative (status quo, sconsigliata). **Proposta Claude: C-hybrid** -- ma e' **balance/design ->
verdict master-dd** (no-anticipated-judgment). Tocca il balance reale (WR shift: i player non
spammano piu' ultimate gratis) + richiede il pool-model PT/PP mancante (non solo la scala).

**STOP §6**: "verdetto design/balance gated". Deliverable = la spec gia esistente (#2530-A2). Nessun
nuovo file richiesto; questo report la referenzia + conferma il ground-truth ancora valido su main.

## H3 — Campaign-XP earn-wire -> ✅ shipped (V6 #2550)

`grantXpToSurvivors` applica `first_kill_pe_bonus` + `minion_kill_pe_bonus` per-unit (PE=campaign-XP
post-#2528); `campaign.js` passa `first_kill_actor_id`; minion-kill PE accumulato in combat. Test
`v6CampaignXp.test.js` verde (suite progression 157/157). La spec A3 diceva "DEFER" ma #2550 l'ha
costruito -> **closed**.

## H4 — Cat F roll-tags 7/7 -> ✅ verify-closed (wired)

**Verify-first** (la memory "5/7 + 3 deferred" era STALE, anti-pattern #19): grep dei 7 tag in
`apps/backend` = 27 ref (abilityExecutor 6 + progressionApply 21). **Tutti e 7 hanno un consumer reale**
in `progressionApply.js` (branch `p.tag === '<tag>'` che applica un effetto):

| Tag                      | Consumer (progressionApply.js) |
| ------------------------ | ------------------------------ |
| sg_on_mutation_burst     | :449 (earn SG, clamp POOL_MAX) |
| phenotype_baseline_heal  | :463 (flat heal, cap max_hp)   |
| mutation_chain_on_kill   | :509 (`applyMutationChainRefund`) |
| mutation_status_extend   | :545 (+N turni status)         |
| perfect_mutation_burst   | :555 (force 5 + flat bonus)    |
| double_phenotype_roll    | :589 (roll 1d6 x2)             |
| phenotype_double_use     | :592 (use-cap per-round -> 2)  |

Test verdi: `mutationBurstEffects` + `phenotypeShiftPerks` + `perkAbilityUseEffects` +
`progressionKillEffects` (suite progression 157/157). **Nessun gap** -> close.

## H5 — OQ-BOND / OQ-MINION -> ✅ shipped (PHASEC 32/32)

Symbiont B4 7/7 (#2539/#2541) + minion B5 8/8 (#2544-#2549) + capstone `shared_hp_pool` (#2542
`0f9be016`, 9 round Codex). `symbiontBond.js` + `minionRuntime.js` live. Verify-first 2026-06-02.

## H6 — Ecosystem combat-wiring -> ✅ verify-closed (LIVE)

**Verify-first** (la memory D4 "combat-DORMANT / GAP-A NOT built" era STALE, anti-pattern #19):
`foodwebFilter.js:35,50` legge gli `.ecosystem.yaml` trofico via `ecosystemResolver.getEcosystem`
(flatten `trofico` -> `species_all` whitelist), consumato da GAP-A (#2447). I 21 `.ecosystem.yaml`
(produttori #2510) **SONO la sorgente whitelist degli spawn di combat**. **Nessuna dormancy** -> close.

## H7 — Pilastri 6/6 + surface-audit -> ✅ verify-closed

`PILLAR-LIVE-STATUS.md` (ratificato master-dd 2026-06-01) = **6/6 🟢** (P2 def; P1/P4/P5 confirmed;
P3 cand HARD; P6 cand reinforced). Audit Gate-5 per-pillar:

- **P1**: surface debt **azzerato** (GAP-5 MissionTimer + GAP-6 reinforcement telegraph entrambi
  risolti) -> nessun gap.
- **P2 / P4**: surface-chain Engine-LIVE/Surface-DEAD **chiusa** (#2467 e2e debrief->phone; Bond
  DebriefView #332). Debt residuo = polish aspect_token (non bloccante).
- **P6**: la "raccomandazione recalibrare BASELINE_WR.balanced" del doc e' **STALE** -> verify-first:
  `tools/sim/check-thresholds.js:38` ha **gia** `balanced: 0.9` (evidence N=40 #2513 85% + N=40 95% +
  N=100 99% = 171/180 combinato, shipped 2026-06-01). **Gia-fixed** (anti-pattern #19 evitato) -> no PR.
- **Gated / out-of-scope** (NON design-hole di questo goal): **P5** TV LobbyView room-sync = Godot-v2
  **cross-repo** + design-call pendente (`2026-05-20-tv-ws-sync-gap-p3.md`, nessun fix post-05-20);
  **P3** morphotype pool selector + points-buy, **P4** Ennea voices counterpart = **feature forward**
  (gate di promozione pilastro), non buchi di design del §3.

**Conclusione H7**: chiuso. Nessun surface-gap in-repo reversibile residuo (P6 gia fixed, P5 gated
cross-repo, resto = feature forward).

## H8 — 1-HP-tail comment -> ✅ shipped (questo PR)

`shared_hp_pool` integer 1-HP tail (both-KO a pool <=1) **ratificato master-dd 2026-06-02**. Il commento
in `symbiontBond.js:259-261` recava ancora "pending master-dd review" + un em-dash (anti-pattern #12).
Aggiornato a "RATIFIED master-dd 2026-06-02 ..." (ASCII-clean), comportamento invariato (suite
progression 157/157, incl. edge 1-HP-pool both-KO + downed-counterpart-no-resurrect).

## H9 — OD residui -> ✅ shipped (questo PR)

- **OD-022** (evo-swarm gate): gia `status=resolved` ("IMPLICIT ACCEPT 2026-05-08 sera") -> nessuna
  azione.
- **OD-023** (Phase-B execution date): **MOOT post-cutover**. La finestra decisionale (Path C ORA +
  Path A Day 8 = 2026-05-14) e' scaduta da settimane; il cutover Godot-v2 e' canonical (tutta la saga
  PHASEC/D4/GAP-C e' post-cutover). Chiuso (`status=resolved resolved_by="MOOT post-cutover ..."`) +
  `generate_open_decisions.py` rigenerato -> **0 OD open** (30 totali: 0 open / 25 resolved / 5
  archived). Precedente date-discipline preservato nel museum card M-2026-05-12-001 + ADR-0021.

---

## Fase 2 — build frontier (interamente owner-gated)

Dopo la chiusura Fase-1, il frontier di costruzione e' **tutto gated** -> nessun build autonomo:

| Candidato Fase-2                | Perche' gated (STOP §6)                                      |
| ------------------------------- | ----------------------------------------------------------- |
| H1 GAP-C fase-3 Godot choice-UI | cross-repo Game-Godot-v2 + flag OFF (flag-ON = master-dd)    |
| H1 GAP-C fase-4 grammar         | scope design (Dormans grammar) -> brainstorm master-dd      |
| H1 arc-conditions data ulteriore| flag OFF, nessuna surface player -> Gate-5 fail (premature)  |
| H2 economy cost-gate impl       | balance reale (WR shift) -> verdict master-dd               |
| P5 TV LobbyView sync            | Godot-v2 cross-repo + design-call pendente                  |

⚠️ **Distinzione anti over-caution** (lezione PHASEC "28/32 ceiling"): qui ogni residuo colpisce una
**STOP condition reale** (balance verdict / flag-ON / cross-repo / out-of-scope), NON fatica. Le voci
buildabili-e-decise erano gia shippate (PHASEC 32/32, GAP-A, GAP-C Stage-1, campaign-XP). Costruire i
residui gated violerebbe canon + Gate-5 + flag-OFF discipline. **"Nessun build Fase-2 autonomo" e'
l'outcome corretto**, non incompletezza.

## Provenienza

- Goal: `docs/planning/2026-06-02-design-closure-goal.md` + handoff
  `docs/planning/2026-06-02-goal-master-session-handoff.md`.
- Verify-first cross-check: `git log origin/main -S <simbolo>` su filterReinforcementPool / getEcosystem
  / i 7 Cat F tag; suite `node --test tests/progression/*.test.js` = 157/157.
- Worktree isolato `C:/dev/_gamewt-designclosure` off origin/main `253c4686` (mai il main checkout
  `claude/fix-ecotypes-enum`).
