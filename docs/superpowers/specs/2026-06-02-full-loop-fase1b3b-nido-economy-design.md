---
title: 'Full-loop fase-1b-3b -- Nido economy + breeding seam (affinity/mating)'
date: 2026-06-02
workstream: ops-qa
category: spec
doc_status: active
doc_owner: master-dd
language: it
review_cycle_days: 30
tags: [ai-playtest, meta-loop, nido, affinity, mating, breeding, full-loop]
---

# Full-loop fase-1b-3b -- Nido economy + breeding (affinity/mating seam)

> Slice di [`2026-06-02-full-loop-ai-playtest-runner-design.md`](2026-06-02-full-loop-ai-playtest-runner-design.md)
> (spec #2559), dopo fase-1b-3a (#2565, recruit->combat). Scope approvato master-dd =
> **economy + mating seam**: l'AI esercita l'economia Nido (affinity/trust -> recruit
> CANONICO senza bypass) + il breeding (mating roll -> offspring). Gli offspring NON
> combattono ancora (deferred). Zero engine change (solo `tools/sim/`) -> band-safe.

## Finding chiave (store-routing) -> ha plasmato il design

Probe (`createApp({databasePath:null})` + supertest, verify-first):

- `/api/meta/affinity` + `/api/meta/trust` scrivono il **default** store (IGNORANO
  `campaign_id`). Bump affinity +1, trust +2 -> `can_recruit:true` (gate canonico
  `RECRUIT_AFFINITY_MIN=0`, `RECRUIT_TRUST_MIN=2`).
- `/api/meta/recruit` CON `campaign_id` usa `metaStoreFactory(campaignId)` = store
  SEPARATO -> earned-affinity sul default store NON soddisfa quel gate (`gate_not_met`).
  SENZA `campaign_id` -> stesso default store -> recruit no-bypass SUCCEDE.
- `/api/meta/mating/roll {parent_a:{id}, parent_b:{id}, biome_id}` funziona in no-DB
  (Prisma hydration best-effort/swallowed) -> `{success, offspring:{lineage_id, gene_slots,
environmental_mutation, tier...}}`, registrato in `/api/meta/nest/offspring`.

**Conseguenza (forzata, band-safe):** rendere il combat-recruit (3a, campaign+bypass)
"earned senza bypass" richiederebbe `/affinity` campaign-scoped = ENGINE change. Quindi:
il combat-recruit (3a) resta intatto (campaign+bypass, combatte); l'economia + il breeding
si provano su **NPC courtship separati** sul default store. Coprono i seam, NON sono le
unita' che combattono.

## Componenti (`tools/sim/`)

- **`greedy-policy.js`** -- `chooseCourtship({step})` -> `{npcId:'courtship_s<step>',
speciesId(pool), affinityDelta:1, trustDelta:2}` (deltas che raggiungono il gate
  canonico); `chooseMating({step})` -> `null` se step<2, altrimenti
  `{parentA:'courtship_s<step-1>', parentB:'courtship_s<step>'}`.
- **`nido-economy.js`** (NUOVO) -- `applyNidoEconomy(http,{step,biomeId})`: affinity+trust
  -> recruit NO-bypass NO-campaign_id (earned gate) -> mating/roll (da step 2). Ritorna
  `{earnedRecruits, offspring, affinityProven, failures}`. Additivo: i fallimenti vanno in
  `failures`, non lancia.
- **`full-loop-runner.js`** -- chiama `applyNidoEconomy` nel blocco capitolo-chiuso (stesso
  gate `adv.status===200 && victory && hasNextChapter` del combat-recruit); aggrega
  `economyRecruited` / `offspring` / `economyAffinityProven`; `econ.failures` -> metaViolations.

## Test (TDD, `node --test tests/sim/*.test.js` = 22/22)

- `greedyPolicy.test.js` (+2): chooseCourtship deltas raggiungono il gate; chooseMating
  null<step2 + parents distinti.
- `nidoEconomy.test.js` (3, fake-http): earned-recruit no-bypass/no-campaign + affinityProven;
  mating da step 2 (parents corretti); earned-recruit fallito -> failure (no false-green).
- `fullLoopRunner.test.js` e2e (real app): `economyAffinityProven===true` +
  `economyRecruited>=1` + `offspring>=1` (economia + breeding provati contro l'engine reale).

## Fuori scope (fase successive)

- **offspring -> combat** (risolvere l'offspring a unita' come 3a): genetica offspring ->
  stat = piu' complesso, deferred.
- **affinity campaign-scoped** (`/affinity` accetta `campaign_id`) = ENGINE change ->
  permetterebbe earned-recruit campaign-scoped che combatte; gated master-dd.
- **fase-2**: enemy scaled (encounter YAML) + band-metriche meta (completion 40-70%
  XCOM-LW2, attrition, economia PE->PI, offspring) + mbtiPolicy +
  `META_NETWORK_ROUTING=true` test-context + N=40 (L-069).
