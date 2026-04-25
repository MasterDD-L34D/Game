---
doc_status: draft
doc_owner: balance-curator
workstream: combat
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
---

# Jobs Expansion Design — Evo-Tactics

> Sprint context: 2026-04-25 autonomous content sprint. **4 NUOVI job**
> additivi ai 7 base canonici (M13.P3): Stalker, Symbiont, Beastmaster,
> Aberrant. Catalog full perks (48 totali, 12/job) in
> `data/core/jobs_expansion.yaml`. Status: `expansion`.

## 1. Vision

I 4 nuovi job riempono **gap di archetipo** che il roster base non
copre:

| Gap                   | Coperto da      | Filosofia                               |
| --------------------- | --------------- | --------------------------------------- |
| Glass cannon stealth  | **Stalker**     | "Kill first, survive after"             |
| Linked-pair support   | **Symbiont**    | "La forza del legame supera il singolo" |
| Pet/minion controller | **Beastmaster** | "Wider battlefield, shared HP pool"     |
| Random/chaos burst    | **Aberrant**    | "Embrace chaos to outpace stability"    |

Roster espanso totale: **11 jobs** (7 base + 4 expansion).

## 2. Synergy matrix (4 expansion × 7 base = 28 cells)

Score: 🟢 strong synergy / 🟡 weak / 🔴 anti-synergy

|             | Skirm                           | Vang                        | Ward                              | Artif                          | Invok                  | Harv                        | Rang               |
| ----------- | ------------------------------- | --------------------------- | --------------------------------- | ------------------------------ | ---------------------- | --------------------------- | ------------------ |
| Stalker     | 🟢 (combo flank)                | 🟡                          | 🔴 (entrambi fragile)             | 🟡                             | 🟡                     | 🟢 (mark+execute)           | 🟢 (range+stealth) |
| Symbiont    | 🟡                              | 🟢 (tank+heal)              | 🟢 (sustain double)               | 🟢 (artif buffs amplified)     | 🟢 (heal/burst combo)  | 🟡                          | 🟡                 |
| Beastmaster | 🟢 (skirm flanks pet's targets) | 🟢 (tank+pet wall)          | 🟡                                | 🟢 (artif buffs pets)          | 🟡                     | 🟢 (pet harvests resources) | 🟡                 |
| Aberrant    | 🟡                              | 🔴 (entrambi imprevedibili) | 🟢 (heals vs random damage taken) | 🔴 (artif precision conflicts) | 🟢 (chaos→opportunity) | 🟡                          | 🟡                 |

## 3. Per-job balance design

### 3.1 Stalker

**Win-rate target band**: 40-60% (alta variance)
**Counter-pick chart**:

- ✅ Favors: encounter con 1 high-value bersaglio (boss-class, healer)
- ❌ Disfavors: swarm encounter (multipli low-HP target — il +50% bonus
  non scala bene)
- ✅ Biome boost: rovine_planari, mezzanotte_orbitale, savana
- ❌ Biome penalty: caverna (dark visibility limits range), foresta_acida

**Anti-pattern blocklist**:

- ❌ NON balance contro un single-encounter PT5 (Stalker brilla in
  campaign campaign mode dove può posizionarsi pre-encounter)
- ❌ NON nerf alpha_strike a +25% (rovini il signature feel)
- ❌ NON aggiungere stealth tile (mechanic too complex per M14)

### 3.2 Symbiont

**Win-rate target band**: 50-55% (stabile, lascia il combat al bonded)
**Counter-pick chart**:

- ✅ Favors: 4p+ co-op (più alleati = più scelta di bond)
- ❌ Disfavors: solo encounter (no bonded → quasi inutile)
- ✅ Biome boost: reef_luminescente, dorsale_termale_tropicale
- ❌ Biome penalty: pianura_salina_iperarida (sustained damage favorite
  vs symbiosis)

**Anti-pattern blocklist**:

- ❌ NON dare al Symbiont alta defense_mod (sempre sopravvive ai redirect)
- ❌ NON allow symbiotic_bond cross-encounter (must re-bond ogni
  encounter)
- ❌ NON allow self-bond (rompe il pattern simbiotico)

### 3.3 Beastmaster

**Win-rate target band**: 55-65% (action economy advantage)
**Counter-pick chart**:

- ✅ Favors: 8x8 / 10x10 grid (room per pet positioning)
- ❌ Disfavors: 6x6 grid (pets clutter)
- ✅ Biome boost: foresta_temperata, savana, cryosteppe (open biomes)
- ❌ Biome penalty: caverna (cramped), atollo_obsidiana (hazard tiles
  killano pets)

**Anti-pattern blocklist**:

- ❌ NON allow >3 pets attivi (action economy abuse)
- ❌ NON give pet HP > Beastmaster HP (pets become primary target)
- ❌ NON allow pet-only victory (Beastmaster must remain alive)

### 3.4 Aberrant

**Win-rate target band**: 30-70% (alta variance — design intent)
**Counter-pick chart**:

- ✅ Favors: encounter con AOE/swarm (random damage spread = more value)
- ❌ Disfavors: precision encounter (single high-DR target — mutation
  burst rolla 1 = wasted)
- ✅ Biome boost: foresta_miceliale, frattura_abissale_sinaptica
  (chaos-aligned biomes)
- ❌ Biome penalty: rovine_planari (logic-aligned biome — chaos vs
  order)

**Anti-pattern blocklist**:

- ❌ NON nerf damage_step random range (1-6 è il signature)
- ❌ NON make phenotype_shift deterministic (rovini il chaos feel)
- ❌ NON allow stacking 2+ phenotype_shift (random escalation hell)

## 4. MBTI mapping

| Job         | Primary axes             | Secondary           | Form examples |
| ----------- | ------------------------ | ------------------- | ------------- |
| Stalker     | I-T (calcolatore solo)   | J (paziente)        | INTJ, ISTP    |
| Symbiont    | F-J (empatia, sustain)   | I (background)      | INFJ, ISFJ    |
| Beastmaster | E-S (presenza, fisicità) | F (caring leader)   | ESFJ, ESFP    |
| Aberrant    | N-P (chaos, exploration) | E (extrovert chaos) | ENFP, ENTP    |

Forma evolution potenziale (via M12 FormEvolutionEngine):

- Stalker → ISTJ (lineare, planner) o INTJ (visionario)
- Symbiont → INFJ (mediator) o ESFJ (caregiver)
- Beastmaster → ESTP (action) o ESFJ (community)
- Aberrant → ENTP (chaos creator) o ENFP (improviser)

## 5. Resource_usage canonical

Tutti uso i pool canonici (mirror jobs.yaml):

- **PT** (physical, base attack): Stalker primary
- **PP** (positional, movement combo): Stalker secondary
- **SG** (stress gauge V5 0..3 cap): Symbiont primary, Aberrant secondary
- **PI** (purchase points, ability unlock): Beastmaster primary, all
  others secondary
- **PE** (progression XP): Aberrant primary (signature consumption)

**Validation**: nessun nuovo pool inventato — additive su pool M13.P3
canonical.

## 6. Industry references (adopted vs rejected)

### Adopted

- **XCOM 2 Reaper** (Stalker basis): single-target shadow assassin con
  alpha strike +50%. Adopted: stealth-friendly without literal stealth
  tile mechanic.
- **FFXIV Scholar Fairy** (Symbiont basis): support pair healing
  pattern. Adopted: damage redirect 50% senza pet-system.
- **DnD 5e Drakewarden / Beastmaster Ranger** (Beastmaster basis):
  ranger con compagno animale. Adopted: 1-2 minion + sacrifice
  mechanic.
- **The Witcher mutagen** (Aberrant basis): random buff system con
  trade-off. Adopted: phenotype_shift 1d6 random.
- **Disco Elysium thought cabinet** (Aberrant secondary inspiration):
  random insight unlock. Adopted: signature mechanic mutation_cascade.

### Rejected

- **Hunter:Showdown solo bounty** (Stalker risk-reward extreme):
  troppo dipendente da PvP, no fit per co-op vs Sistema. Rejected.
- **Pokemon doubles 6-on-6** (Symbiont scale-up): scale > 4-coop limit.
  Rejected.
- **Diablo 4 necromancer minions** (Beastmaster overscale: 7+ pets):
  action economy abuse. Rejected: cap a 2 base, 3 con perk.
- **Pathfinder 2e mutagenist alchemist**: troppo metagame complesso.
  Rejected — Aberrant uses semplice 1d6 table.

## 7. Open balance questions

1. **Stalker alpha_strike scaling**: +50% damage_step significa
   damage_step 4 → 6 (+2). È OK in PT2 (target HP 6) o esaspera one-shot?
   Calibration N=10 needed.

2. **Symbiont solo viability**: senza bonded, è una creatura di valore
   80% (heal disponibile, no redirect). Soglia accettabile o serve
   "dormant_bond" auto-trigger? Decisione playtest.

3. **Beastmaster pet AI**: minion follow simple rules (move to nearest
   enemy, attack if adjacent) o sempre player-controlled via
   pack_command? Default: rule-based, override via command.

4. **Aberrant variance**: 1-6 random + status random = ±300% damage
   spread per turn. Player feel "non in controllo" o "espressivo"?
   Focus group needed.

5. **Capstone power level (level 7)**: tutti i 4 capstones sono
   game-changing. Sani per single-encounter o serve cap a 2 capstones
   per party? Decision.

6. **Cross-job synergy**: Stalker + Symbiont (stalker bonded) = mark
   ridiretta a Symbiont = panic chain. Esploit? Cap 1 per party.

7. **Encounter PT scaling**: i 4 nuovi job dovrebbero apparire in
   encounter PT3+ o anche PT1 (tutorial)? Default: expansion = post-PT2
   unlock.

## 8. Implementation phasing

### Phase A — Data shipped (DONE 2026-04-25)

- ✅ `data/core/jobs_expansion.yaml` (4 jobs + 48 perks)
- ✅ Validation script (effect_type allowed list)
- Effort: 0 LOC backend (data-only)

### Phase B — Engine wiring

- Update `services/jobs/jobsLoader.js` per leggere `jobs_expansion.yaml`
- Plugin: nessun cambio (esistente legge `data/core/jobs.yaml`)
- Aggiungere wave loader per "status: expansion"
- Effort: ~3h

### Phase C — Perk runtime

- `progressionEngine.js` deve interpretare nuovi `passive` tags:
  - `defense_after_silent`, `first_kill_pe_bonus`, `apex_first_strike`
  - `bond_redirect_strong`, `bonded_proximity_defense`, `dual_bond`
  - `minion_attack_buff`, `pack_command_extended_range`,
    `alpha_pack_buff`
  - `random_double_dmg_chance`, `mutation_chain_on_kill`,
    `perfect_mutation_burst`
- Effort: ~12h (24 nuovi tag handlers)

### Phase D — UI

- Job picker: aggiungi 4 nuove cards con label "expansion"
- Perk overlay: estendi grid a 11 jobs
- Effort: ~4h

### Phase E — Calibration

- N=10 per job (40 sim totali) per validare win-rate band
- Tools: `tools/py/batch_calibrate_expansion_jobs.py`
- Effort: ~6h playtest + analysis

**Total expansion shipping: ~25h** (Phase B-E).

## 9. Cross-references

- `data/core/jobs.yaml` (7 base canonical M13.P3)
- `data/core/jobs_expansion.yaml` (4 NEW + 48 perks)
- `data/core/progression/perks.yaml` (84 base perks)
- `apps/backend/services/combat/abilityExecutor.js` (effect_type registry)
- `apps/backend/services/progression/progressionEngine.js` (perk runtime)
- `data/core/forms/mbti_forms.yaml` (16 MBTI forms)
- `docs/planning/2026-04-25-mutation-system-design.md` (Aberrant
  cross-system)
- `docs/planning/2026-04-25-creature-concept-catalog.md` (job role
  examples)
- `docs/planning/2026-04-25-status-effects-roadmap.md` (Symbiont uses
  `linked` status)
