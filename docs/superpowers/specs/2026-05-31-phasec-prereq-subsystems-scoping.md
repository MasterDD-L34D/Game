---
title: 'PHASEC C-G prereq subsystems — scoping + sequencing [no-impl]'
workstream: combat
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: '2026-06-01'
language: it
tags:
  [
    phasec,
    jobs-expansion,
    combat,
    minion,
    symbiont,
    pe-pool,
    mutation,
    scoping,
    sequencing,
    no-impl,
  ]
---

# PHASEC C-G prereq subsystems — scoping + sequencing

> **NO-IMPL.** Zero codice, zero tocco a `data/`/`yaml`/`schema`. Solo scoping +
> dependency graph + sequence + open questions per verdict master-dd. Ogni step
> reale = un futuro `spec → TDD → PR` (pattern GAP-C MVP: spec
> [#2482](https://github.com/MasterDD-L34D/Game/pull/2482) → MVP fase-1
> [#2483](https://github.com/MasterDD-L34D/Game/pull/2483), fasi successive
> gated master-dd).
>
> **Scopo**: master-dd sceglie _cosa_ costruire e _in che ordine_. NON costruire
> tutto e quattro insieme. Cheapest-high-ROI prima; i fork pesanti (symbiont,
> minion) per ultimi o deferred.

## 0. TL;DR per master-dd (1 schermata)

`data/core/jobs_expansion.yaml` dichiara **32 passive tag**. Ground-truth su
`origin/main` (`812c72cb`):

- **6 tag già wired** (NON 4 come diceva il brief): Cat A `apex_first_strike` +
  `random_double_dmg_chance` (#2470), Cat B `kill_buff_attack` +
  `eternal_kill_buff` (#2474), **+ 2 pre-esistenti** `execution_bonus` +
  `isolated_target_bonus` (già consumati in `progressionApply.js`).
- **26 tag bloccati** (NON 28): il brief contava 28 e ometteva
  `aura_defense_2tile` (0 consumer = bloccato su un 6° micro-gap).

I 26 bloccati dipendono da **4 sottosistemi grandi + 2 micro-gap**. Il motore di
dispatch dei perk (`progressionApply.js`) **esiste già** ed è estendibile: ogni
tag bloccato è bloccato perché manca lo **stato/evento a monte** che l'handler
leggerebbe, non perché manca il dispatch.

| #   | Slice                           | Effort | Tag sbloccati | Fork?          |
| --- | ------------------------------- | ------ | ------------- | -------------- |
| 1   | `silent_step` last-ability      | XS     | 1             | no             |
| 2   | PE pool (combat-scoped)         | S      | 1 (+1 ready)  | naming verdict |
| 3   | Defense-passive eval + aura     | XS     | 1             | no             |
| 4   | Mutation/phenotype use-hook (F) | M      | 7             | no             |
| 5   | Symbiont bond-redirect (C/D/G)  | L      | 8             | **sì**         |
| 6   | Minion runtime (E + capstone C) | XL     | 8             | **sì**         |

**Raccomandazione**: ship 1→4 (≈10 tag, zero fork, ≈3-4 sessioni totali). POI
decidi i 2 fork (5, 6) uno per volta. Il **minion (6)** è il candidato a restare
**deferred / post-MVP** (effort XL, ROI peggiore, design surface più grande).

---

## 1. Ground-truth table (verificato su `origin/main` `812c72cb`)

Tutti i path verificati nel worktree off `origin/main`. Il brief citava
`apps/backend/services/combat/abilityExecutor.js`: **path errato**, il file reale
è `apps/backend/services/abilityExecutor.js` (l'header di `jobs_expansion.yaml`
riga 22 ha lo stesso self-reference sbagliato).

### 1a. I 4 sottosistemi + 2 micro-gap

| Sottosistema                            | Stato verificato                                                                                                                                                                                                          | Evidence (file:line)                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MINION runtime**                      | ASSENTE. `summon_companion` esegue come `buff` di `hp_max +5` **su se stesso** (`target: self`) — **non spawna unità**. Nessuna entità minion.                                                                            | `jobs_expansion.yaml:234-245` (effect_type buff, target self); grep `minion` in `apps/backend/**/*.js` → solo `hardcoreScenario.js` (config nemici, non runtime job)          |
| **PE pool (combat)**                    | ASSENTE in combat. `normaliseUnit` non setta `pe` (ha `sg` r111, `mp` r125, **no `pe`**). PE _esiste_ ma in layer meta/forms (vedi §5 fork).                                                                              | `apps/backend/routes/sessionHelpers.js:80-127` (no campo pe); `apps/backend/services/forms/formEvolution.js:147` (`unit.pe` legge META-PE)                                    |
| **mutation_burst / phenotype exec**     | PARZIALE. Le ability **eseguono** (drain_attack / buff) e **emettono evento con `ability_id`** via `appendEvent`. Manca: hook perk on-ability-use + semantica roll (phenotype random table NON nei dati).                 | `apps/backend/services/abilityExecutor.js:5-8` (event schema con ability_id), `:135` `applySgEarn`; `jobs_expansion.yaml:336-346` (phenotype = buff FISSO +3, non random 1d6) |
| **symbiont bond**                       | ASSENTE. `symbiotic_bond` esegue come `shield` con `shield_amount: 0` = **no-op**. Nessuno stato di pairing né redirect.                                                                                                  | `jobs_expansion.yaml:148-157` (shield_amount 0); grep `symbiotic_bond` runtime → 0                                                                                            |
| **micro-gap: silent_step last-ability** | `silent_step` esegue (attack_move) ma manca tracking **ability-id granulare**. `last_action_type` esiste ma **coarse** (`'attack'`/`'move'`/`'retreat'`).                                                                 | `apps/backend/routes/sessionRoundBridge.js:1632,1687` (`last_action_type` coarse); grep `_last_ability` → 0                                                                   |
| **micro-gap: aura_defense_2tile**       | 0 consumer. Passive di prossimità difensiva (alleati Manhattan ≤2 → +1 def). Non richiede nessuno dei 4 fork — solo un punto di valutazione passive **difensive** (oggi esiste solo `computePerkDamageBonus`, offensivo). | `progressionApply.js:131-209` (solo damage-bonus, nessun defense-bonus eval)                                                                                                  |

### 1b. Il seam di wiring esistente (riusabile da TUTTI gli slice)

`apps/backend/services/progression/progressionApply.js` è il motore perk. Ha già
3 punti di dispatch `switch (p.tag)`, ognuno chiamato dagli hook di
`routes/session.js`:

1. `computePerkDamageBonus(actor, target, ctx)` — `:131` — passive **additive di
   danno** (`execution_bonus`, `isolated_target_bonus`, `flank_bonus`,
   `first_strike_bonus`, `long_range_bonus`). `default: break` per tag ignoti.
2. `applyPerkKillEffects(actor)` — `:232` — **on-kill** (`eternal_kill_buff`,
   `kill_buff_attack`). Hook in `session.js:980-986`.
3. `computePerkCombatModifiers(actor, target, ctx)` — `:283` — **moltiplicativi /
   DR-bypass** (`random_double_dmg_chance`, `apex_first_strike`). Hook in
   `session.js:709-759`.

Ogni unità porta `unit._perk_passives` (array `{tag, payload, source_perk_id}`),
idratato a `/start` da `applyProgressionToUnits` (`:90`). **Conseguenza chiave**:
aggiungere un tag wired ≈ aggiungere un `case` _se i dati che legge esistono già_
su `actor`/`target`/`ctx`. I 26 bloccati sono bloccati perché quei dati (minion,
bond, PE, last-ability, eventi-uso-ability) **non esistono ancora** — è quello
che i 4 sottosistemi + 2 micro-gap producono.

### 1c. Mappa COMPLETA dei 32 tag → stato + sottosistema

| Tag                            | Job         | Stato          | Sblocco da                       |
| ------------------------------ | ----------- | -------------- | -------------------------------- |
| `apex_first_strike`            | stalker     | ✅ wired #2470 | —                                |
| `random_double_dmg_chance`     | aberrant    | ✅ wired #2470 | —                                |
| `kill_buff_attack`             | stalker     | ✅ wired #2474 | —                                |
| `eternal_kill_buff`            | stalker     | ✅ wired #2474 | —                                |
| `execution_bonus`              | stalker     | ✅ wired (pre) | —                                |
| `isolated_target_bonus`        | stalker     | ✅ wired (pre) | —                                |
| `defense_after_silent`         | stalker     | 🔴 blocked     | (1) silent_step last-ability     |
| `first_kill_pe_bonus`          | stalker     | 🔴 blocked     | (2) PE pool                      |
| `aura_defense_2tile`           | symbiont    | 🔴 blocked     | (3) defense-passive eval         |
| `mutation_status_extend`       | aberrant    | 🔴 blocked     | (4) mutation use-hook            |
| `phenotype_baseline_heal`      | aberrant    | 🔴 blocked     | (4) mutation use-hook            |
| `mutation_chain_on_kill`       | aberrant    | 🔴 blocked     | (4) mutation use-hook + kill     |
| `double_phenotype_roll`        | aberrant    | 🔴 blocked     | (4) mutation use-hook (+roll)    |
| `sg_on_mutation_burst`         | aberrant    | 🔴 blocked     | (4) mutation use-hook            |
| `perfect_mutation_burst`       | aberrant    | 🔴 blocked     | (4) mutation use-hook (+roll)    |
| `phenotype_double_use`         | aberrant    | 🔴 blocked     | (4) mutation use-hook (+roll)    |
| `bond_redirect_strong`         | symbiont    | 🔴 blocked     | (5) symbiont bond                |
| `dual_bond`                    | symbiont    | 🔴 blocked     | (5) symbiont bond                |
| `bond_no_distance_limit`       | symbiont    | 🔴 blocked     | (5) symbiont bond                |
| `bonded_death_grace`           | symbiont    | 🔴 blocked     | (5) symbiont bond                |
| `emergency_full_redirect`      | symbiont    | 🔴 blocked     | (5) symbiont bond                |
| `shared_hp_pool`               | symbiont    | 🔴 blocked     | (5) symbiont bond (invasivo)     |
| `bonded_proximity_defense`     | symbiont    | 🔴 blocked     | (5) symbiont bond + (3) def-eval |
| `chain_heal_adjacent`          | symbiont    | 🔴 blocked     | (5) symbiont bond (heal)         |
| `minion_attack_buff`           | beastmaster | 🔴 blocked     | (6) minion runtime               |
| `minion_proximity_dmg`         | beastmaster | 🔴 blocked     | (6) minion runtime               |
| `encounter_start_buff_minions` | beastmaster | 🔴 blocked     | (6) minion runtime               |
| `max_minions`                  | beastmaster | 🔴 blocked     | (6) minion runtime               |
| `pack_command_extended_range`  | beastmaster | 🔴 blocked     | (6) minion runtime               |
| `minion_resurrect_chance`      | beastmaster | 🔴 blocked     | (6) minion runtime               |
| `alpha_pack_buff`              | beastmaster | 🔴 blocked     | (6) minion runtime               |
| `minion_kill_pe_bonus`         | beastmaster | 🔴 blocked     | (6) minion + (2) PE (co-req)     |

Conteggio: **6 wired + 26 blocked = 32** ✓. Blocked per slice: (1)=1, (2)=1 pieno
[+`minion_kill_pe_bonus` co-req], (3)=1, (4)=7, (5)=8, (6)=8. `minion_kill_pe_bonus`
conta su (6) perché la sorgente-kill è il minion; PE è co-requisito.

---

## 2. Per-subsystem scoping

Effort in "sessioni" (1 sessione ≈ mezza giornata focalizzata spec+TDD+PR). Tutti
multi-step; nessuno è un one-liner. Blast radius = quanti file core tocca.

### Slice 1 — `silent_step` last-ability tracking (micro-gap)

- **Cos'è**: `defense_after_silent` (st*r2_camo_protocol) vuole +2 def nel turno
  \_dopo* aver usato `silent_step`. Serve sapere "l'ultima ability usata è stata
  `silent_step`" a livello **ability-id**.
- **Seam**: estendere il tracking esistente `last_action_type`
  (`sessionRoundBridge.js:1632,1687`, oggi coarse) con un `actor._last_ability_id`
  settato in `abilityExecutor` post-`appendEvent` (l'evento ha già `ability_id`).
  Nuovo `case` in un eval **difensivo** (vedi slice 3) o in un decay end-of-round.
- **Effort**: **XS** (~0.5 sessione). **Blast radius**: basso (1 campo + 1 set +
  1 case + 1 decay tick).
- **Sblocca**: `defense_after_silent` (**1 tag**).

### Slice 2 — PE pool (combat-scoped)

- **Cos'è**: pool risorsa "Punti Evoluzione" usato da aberrant
  (`aberrant_overdrive` `cost_pe: 5` + trigger `PE>=5`) e guadagnato dai perk
  `first_kill_pe_bonus` (+1 su primo kill) / `minion_kill_pe_bonus` (+1 su
  minion-kill). **Oggi `cost_pe` NON è enforced** (nessun campo `pe` in combat).
- **Seam**: mirror **esatto** del pattern `sg`/`mp` in `normaliseUnit`
  (`sessionHelpers.js:111,125`) → +1 campo `pe`. Earn = nuovo `case` in
  `applyPerkKillEffects` (`:232`, già l'hook kill). Spend/gate = check in
  `abilityExecutor` cost-resolution. `sgTracker.js` (accumulate/cap/per-turn-cap)
  è il template strutturale clonabile.
- **Effort**: **S** (~1 sessione) _meccanicamente_. **MA** vedi §5-fork: collisione
  naming con la PE meta (vedi OQ-PE).
- **Blast radius**: medio (normaliseUnit + cost-resolution path + kill hook).
- **Sblocca**: `first_kill_pe_bonus` (**1 tag pieno**) + prepara
  `minion_kill_pe_bonus` (sblocca quando arriva il minion).

### Slice 3 — Defense-passive eval + `aura_defense_2tile`

- **Cos'è**: oggi esiste solo `computePerkDamageBonus` (offensivo). I tag passive
  **difensivi** (`aura_defense_2tile`, e poi `bonded_proximity_defense`,
  `defense_after_silent`) non hanno un punto di aggregazione. Serve un sibling
  `computePerkDefenseBonus(actor, ctx)` chiamato nel damage-taken path.
- **Seam**: nuova funzione gemella in `progressionApply.js` + hook nel punto dove
  si calcola `dc`/DR del difensore (resolveAttack defender side). `aura_defense_2tile`
  = 1 case (conta alleati entro Manhattan ≤2). Questo seam **serve anche** slice 1
  (`defense_after_silent`) e slice 5 (`bonded_proximity_defense`) → investimento
  che ammortizza.
- **Effort**: **XS-S** (~0.5-1 sessione). **Blast radius**: medio (tocca il
  defender side di resolveAttack — core damage path, ma additivo).
- **Sblocca**: `aura_defense_2tile` (**1 tag**) + abilita slice 1 e parte di 5.

### Slice 4 — Mutation/phenotype use-hook (Cat F)

- **Cos'è**: 7 tag aberrant che si triggerano **sull'uso** di `mutation_burst` o
  `phenotype_shift` (extend status, +SG, chain on kill, double roll, baseline
  heal, fixed-dmg capstone, double use).
- **Seam**: le ability **già eseguono e già emettono evento con `ability_id`**
  (`abilityExecutor.js:5-8`). Manca un handler `applyPerkAbilityUseEffects(actor,
abilityId, ctx)` (gemello di `applyPerkKillEffects`) chiamato post-ability nel
  round bridge. `applySgEarn` (`:135`) è il template per `sg_on_mutation_burst`.
  `mutationEngine.js` (`applyMutationPure` emette `applied_event`) e
  `mutationTriggerEvaluator.js` (legge `session.events` per kill-streak/condizioni)
  sono pattern di riferimento riusabili — **ma sono il layer genetics Spore, NON
  l'ability aberrant** (vedi §6 reuse).
- **Dipendenza interna (sub-spec)**: alcuni tag presuppongono la **semantica roll**
  delle ability che **non è nei dati**: `phenotype_shift` è oggi un buff FISSO
  (+3 attack), non la random-table 1d6 descritta; `mutation_burst` ha
  `damage_step_min/max` (range, forse onorato da drain_attack — **da verificare**)
  e uno status MoS-gated random (**non confermato**). Quindi `double_phenotype_roll`
  / `phenotype_double_use` / `perfect_mutation_burst` / `mutation_status_extend`
  hanno un **pre-req**: implementare la random-roll delle ability (sub-spec
  separata, vedi OQ-F).
- **Effort**: **M** (~1.5-2 sessioni) per l'hook + i tag "evento puro"
  (`sg_on_mutation_burst`, `phenotype_baseline_heal`, `mutation_chain_on_kill`);
  **+M** se include la random-roll (OQ-F).
- **Blast radius**: medio (round bridge post-ability hook + 1 handler nuovo).
- **Sblocca**: **7 tag** (Cat F) — miglior ROI bulk senza fork.

### Slice 5 — Symbiont bond-redirect (Cat C/D/G) — **FORK**

- **Cos'è**: link permanente symbiont↔alleato con redirect-danno (50%→60%, dual
  bond, no-distance, death grace, emergency 100%, shared HP pool, proximity
  defense, chain heal). `symbiotic_bond` oggi è no-op (`shield_amount: 0`).
- **Seam**: (a) **stato di pairing** persistito sull'unità (`actor._bond = {
partner_id, redirect_pct, ... }`); (b) **intercettazione danno** nel damage
  step. **Template riusabile**: `bondReactionTrigger.js` documenta già un
  `shield_ally` ("bonded ally absorbs floor(damageDealt/2), target restored",
  "identical math to intercept reroute", hook "performAttack post damage step,
  AFTER intercept reroute check"). Esiste quindi già un **intercept reroute** nel
  performAttack — il symbiont redirect riusa quella plumbing, ma con stato di
  pairing job-driven (non `creature_bonds.yaml`).
- **DISTINZIONE confermata (brief OK)**: `bondReactionTrigger.js` =
  AncientBeast Beast-Bond, **data-driven** `data/core/companion/creature_bonds.yaml`,
  species-pair indexed, companion bonds. **NON** è il bond del job symbiont. Sono
  due sistemi distinti; il symbiont riusa la _math/hook_, non i dati.
- **Sotto-tag invasivo**: `shared_hp_pool` (sy_r6_one_soul) fonde due pool HP →
  tocca logica death/KO (chi muore? danno split). Il più rischioso del fork.
- **Effort**: **L** (~3-5 sessioni). **Blast radius**: **alto** (core damage path
  - death/KO + targeting UX).
- **Sblocca**: **8 tag** (`bond_redirect_strong`, `dual_bond`,
  `bond_no_distance_limit`, `bonded_death_grace`, `emergency_full_redirect`,
  `shared_hp_pool`, `bonded_proximity_defense` [+ slice 3], `chain_heal_adjacent`).

### Slice 6 — Minion runtime (Cat E + capstone C) — **FORK GRANDE**

- **Cos'è**: tipo-unità minion controllabile non-player. `summon_companion` oggi
  buffa solo l'HP del beastmaster (`buff hp_max +5`, target self) — **non spawna
  nulla**. Servono: entità minion, lifecycle (summon/cap/death/resurrect), ordini
  (`pack_command`), buff (attack/proximity/encounter-start/alpha permanente).
- **Seam**: tocca quasi tutto il combat core — round order (initiative slot del
  minion?), AI (`declareSistemaIntents`? ordini scriptati?), spawn (tile
  adiacente libero), death (conta verso party wipe?), grid occupancy, **co-op
  ownership** (chi comanda il minion nel flow Jackbox? `owner_id` esiste a
  `sessionHelpers.js:105`). È un **nuovo tipo di unità**, non un buff.
- **Effort**: **XL** (~4-6+ sessioni). **Blast radius**: **molto alto** (round
  orchestrator + AI + spawn + death + grid + co-op).
- **Sblocca**: **8 tag** (`minion_attack_buff`, `minion_proximity_dmg`,
  `encounter_start_buff_minions`, `max_minions`, `pack_command_extended_range`,
  `minion_resurrect_chance`, `alpha_pack_buff`, `minion_kill_pe_bonus` [co-req
  PE]).
- **Candidato DEFERRED / post-MVP**: ROI peggiore (8 tag / ~5 sessioni = 1.6) +
  design surface più grande + tocca co-op (rischio regressione P5).

---

## 3. Dependency graph + ROI ranking

```
                    progressionApply.js (motore perk — ESISTE)
                    ├── computePerkDamageBonus      (offensivo)   ✅ live
                    ├── applyPerkKillEffects         (on-kill)     ✅ live
                    ├── computePerkCombatModifiers   (mult/DR)     ✅ live
                    └── [computePerkDefenseBonus]    (difensivo)   ← slice 3 (NEW)

  slice 1 silent_step ──► defense_after_silent           (usa slice 3 eval)
  slice 2 PE pool ──────► first_kill_pe_bonus
                          minion_kill_pe_bonus  ◄── co-req ── slice 6 minion
  slice 3 def-eval ─────► aura_defense_2tile
                          bonded_proximity_defense ◄── anche slice 5
  slice 4 use-hook ─────► 7× Cat F          (sub-dep: random-roll OQ-F)
  slice 5 bond  FORK ───► 8× Cat C/D/G      (riusa intercept-reroute hook)
  slice 6 minion FORK ──► 8× Cat E + alpha  (nuovo unit type; tocca co-op)
```

### ROI ranking (tag sbloccati / effort)

| Rank | Slice                 | Tag | Effort (sess) | ROI (tag/sess) | Fork   |
| ---- | --------------------- | --- | ------------- | -------------- | ------ |
| 1    | 4 — mutation use-hook | 7   | ~1.5          | **~4.7**       | no     |
| 2    | 1 — silent_step       | 1   | ~0.5          | ~2.0           | no     |
| 2    | 3 — def-eval + aura   | 1   | ~0.5-1        | ~1.5-2.0       | no     |
| 4    | 5 — symbiont bond     | 8   | ~4            | ~2.0           | sì     |
| 5    | 2 — PE pool           | 1   | ~1            | ~1.0 (+ready)  | naming |
| 6    | 6 — minion runtime    | 8   | ~5            | **~1.6**       | sì     |

Note ROI:

- **Slice 4 vince in bulk-ROI** (7 tag, nessun fork) — ma ha la sub-dep random-roll
  (OQ-F) che può alzarlo a ~M+M.
- **Slice 2 (PE)** ha ROI assoluto basso (1 tag pieno) ma è **meccanicamente
  minuscolo** (mirror sg/mp) e **compone** col minion (sblocca il 2° tag PE) →
  vale come fondamenta cheap.
- **Slice 6 (minion)** ha il peggior ROI _e_ il blast radius maggiore _e_ tocca
  co-op → il candidato naturale a restare deferred.

---

## 4. Recommended build SEQUENCE

Cheapest-high-ROI prima. Ogni step = proprio `spec → TDD → PR` (pattern GAP-C).
Step 1-4 sono **zero-fork** e si possono shippare in sequenza senza verdict di
design (solo OQ-PE su step 2 e OQ-F su step 4).

| Ordine | Slice                     | Perché qui                                                               | Gate                   |
| ------ | ------------------------- | ------------------------------------------------------------------------ | ---------------------- |
| **1**  | silce 1 `silent_step`     | Cheapest assoluto, self-contained, riscalda il pattern last-ability      | —                      |
| **2**  | slice 3 def-eval + aura   | Sblocca 1 tag MA crea il seam difensivo che serve a 1 e 5 (ammortizza)   | —                      |
| **3**  | slice 2 PE pool           | Fondamenta cheap; enforce `cost_pe` aberrant; prepara minion-kill-PE     | **OQ-PE** (naming)     |
| **4**  | slice 4 mutation use-hook | Best bulk-ROI (7 tag), nessun fork                                       | **OQ-F** (random-roll) |
| **5**  | slice 5 symbiont bond     | Primo fork. Riusa intercept-reroute. 8 tag. Verdict design necessario    | **OQ-BOND**            |
| **6**  | slice 6 minion runtime    | Fork più grande, ROI peggiore, tocca co-op → **valutare DEFER post-MVP** | **OQ-MINION**          |

**Milestone "no-fork" (step 1-4)**: ~3-4 sessioni → **10 tag wired** (10/26 =
38% dei bloccati) senza alcun fork architetturale né nuovo unit type. Ottimo
punto di pausa/playtest prima di committare ai 2 fork pesanti.

**Bundling opzionale**: step 1+2+3 sono tutti XS/S e tutti toccano
`progressionApply.js` + il defender path → potrebbero essere **1 PR cluster
"micro-passives + def-eval + PE foundation"** (~1.5 sessioni) invece di 3 PR
separati, se master-dd preferisce meno overhead PR. Step 4/5/6 restano discreti.

---

## 5. Design-fork callouts — OPEN QUESTIONS (verdict master-dd)

> **NON decise qui.** Queste sono le forche che bloccano gli step relativi. Ogni
> risposta è input alla spec dello step.

### OQ-PE — PE: riusare la meta-PE o nuovo pool combat?

PE **esiste già** come "Evolution Points" meta: `campaign.js:112`
(`PE_EVOLVE_TRIGGER_THRESHOLD`, evolve trigger M12 Phase D), `formEvolution.js:147`
(`unit.pe`), `skiv.js` currencies. Ma `normaliseUnit` non la porta in combat.

- **Opzione A**: il job-PE combat **è** la meta-PE → earn-on-kill alimenta
  direttamente l'evolve trigger (coupling interessante: uccidere → evolvere). Ma
  mischia una risorsa per-encounter con una meta cross-encounter.
- **Opzione B**: **nuovo** pool PE combat-scoped (reset a fine encounter, mirror
  `sg`), separato dalla meta-PE. Pulito, ma **collisione di nome** (2 cose "PE").
- **Sub-domanda balance**: curva earn/spend. Quanti PE per kill? `aberrant_overdrive`
  gate a `PE>=5` + `first_kill_pe_bonus` +1: con +1/kill servono 5 kill per 1
  overdrive — intenzionale o troppo lento?

### OQ-F — Cat F: la random-roll delle ability è in scope o pre-req?

`phenotype_shift` nei dati è un buff **fisso** (+3 attack), non la random-table
1d6 della description. `mutation_burst` ha `damage_step_min/max` (range) + uno
status MoS-gated random **non confermato** in `drain_attack`.

- I tag `double_phenotype_roll`, `phenotype_double_use`, `perfect_mutation_burst`,
  `mutation_status_extend` **presuppongono** che la random-roll esista.
- **Domanda**: lo slice 4 include la random-roll (sub-spec "aberrant roll
  semantics") o quei 4 tag restano gated finché non si implementa la roll? I 3 tag
  "evento puro" (`sg_on_mutation_burst`, `phenotype_baseline_heal`,
  `mutation_chain_on_kill`) sono shippabili **senza** la roll.

### OQ-BOND — symbiont: UX di pairing + regole redirect

- **Pairing UX**: come si sceglie il bonded? Adiacenza al cast (come dice il
  testo) e poi persiste? Si può ri-bondare? In co-op chi vede/sceglie il link?
- **Redirect rules**: il redirect symbiont **stacka** con l'intercept-reroute
  esistente? Ordine delle operazioni nel damage step? Cosa se il symbiont è KO?
- **`shared_hp_pool` (capstone)**: due unità un pool HP → muoiono insieme? Il
  danno si splitta come? Tocca death/KO — il sotto-tag più invasivo.
- **`dual_bond`**: secondario al 25% — due redirect simultanei sommano oltre 100%?

### OQ-MINION — minion: è un nuovo unit type, decidere la forma

- **`controlled_by`**: nuovo valore `'minion'`? o `'player'` con `owner_id` =
  beastmaster? (campo `owner_id` esiste, `sessionHelpers.js:105`).
- **AI**: ordini scriptati (move/attack base) o AI piena
  (`declareSistemaIntents`)? `pack_command` dà 1 ordine free/round.
- **Death**: permanente? conta verso party-wipe / lose condition?
  `minion_resurrect_chance` re-summona a 1HP a fine round.
- **Spawn tiles**: tile adiacente libero? cosa se nessuno libero?
- **Initiative**: turno proprio nel round order o agisce nel turno del BM?
- **Co-op ownership**: nel flow Jackbox, quale giocatore comanda i minion? →
  **rischio regressione P5** (il motivo per cui questo fork è il più rischioso).

---

## 6. Reference games per subsystem

| Subsystem  | Reference                                                                                                      | Cosa prendere                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Minion     | Warhammer Beastmaster / DnD Drakewarden / RTS hero-pet (WC3) / FFXIV Scholar fairy (già nell'header del job)   | Pet come unità separata con initiative + ordini limitati; cap + resummon; il fairy FFXIV = pet non-controllato che agisce su comando                         |
| Symbiont   | FFXIV Scholar Fairy + Pokémon doubles (già header) + **FFT/FFXIV "Cover"** (redirect danno alleato→self)       | "Cover" è il template canonico di damage-redirect; Scholar = link support 1:1; doubles = pair tactics                                                        |
| PE economy | **FFT charge/MP-gated specials** (brief) + FFXIV job gauges + **il pool `sg` già in repo** (sgTracker)         | Risorsa per-encounter che si accumula e gate-a le ability forti; `sgTracker` è il clone locale pronto                                                        |
| Mutation   | The Witcher mutagens / The Thing assimilation / Disco Elysium thoughts (header) — **MA molto è già costruito** | RIUSO: `mutationEngine.js` (slot/MP/bingo `applied_event`), `abilityExecutor.applySgEarn`, event con `ability_id`. NON serve build from-scratch — vedi sotto |

### Verifica reuse `mutationEngine` (esplicita, come da brief)

`apps/backend/services/mutations/` **esiste già**: `mutationEngine.js` (9.6KB),
`mutationCatalogLoader.js`, `mpTracker.js`. Cosa fornisce:

- `applyMutationPure` — applica mutazione genetica (trait swap, MP cost) +
  **emette `applied_event`** (pattern evento pronto).
- `computeMutationBingo` / `applyMutationBingoToUnit` — 3-of-a-kind → archetype
  passives in `unit._archetype_passives` (array parallelo a `_perk_passives`).
- `checkMpBudget` / `mpTracker` — pattern pool risorsa (clonabile per PE).

**MA**: questo è il layer **genetics Spore** (mutazioni come trait permanenti del
corpo), **NON** l'ability `mutation_burst`/`phenotype_shift` del job aberrant. I
tag Cat F si agganciano all'**uso in combat** di quelle ability (evento
`ability_id`), non al sistema genetics. **Conclusione**: slice 4 **NON** ricostruisce
un motore mutazioni — riusa (a) il pattern evento `ability_id` di
`abilityExecutor`, (b) `applySgEarn` per `sg_on_mutation_burst`, (c)
opzionalmente l'idea di `mutationTriggerEvaluator` (leggere `session.events` per
chain/streak). Il grosso del lavoro è l'**hook on-ability-use** + la random-roll
(OQ-F), non un engine nuovo.

---

## 7. Cosa questo doc NON fa

- NON decide nessuna delle OQ (PE/F/BOND/MINION) — gated master-dd.
- NON tocca `data/`, `yaml`, `schema`, codice.
- NON raccomanda di costruire i 4 insieme — esplicitamente sequenziati.
- NON conferma la semantica roll delle ability aberrant (flaggata OQ-F come da
  verificare nella spec dello slice 4).

## 8. Next action suggerita

Master-dd sceglie **1 slice** (raccomandato: partire da step 1-2-3 bundle, o
direttamente slice 4 se si vuole il bulk-ROL e si risponde a OQ-F). Quello slice
diventa la prossima spec dedicata `spec → TDD → PR`. I fork (5, 6) restano gated
sui rispettivi OQ; il minion (6) è il candidato esplicito a deferred/post-MVP.
