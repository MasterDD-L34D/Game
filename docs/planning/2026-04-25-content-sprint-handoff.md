---
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 14
---

# Content Sprint Notte 2026-04-25 — Handoff

> Sessione autonoma overnight su richiesta utente: "mi servono i trait
> completi e tante idee di design per creature/mutazioni/effetti/classi/perk".
> Strategia: lavoro additive zero-risk + 3 illuminator agent in parallel
> per design depth + io che scrivo trait mechanics + design doc.

## TL;DR

| Asset                                            | Δ Pre         | Δ Post  | Note                                                 |
| ------------------------------------------------ | ------------- | ------- | ---------------------------------------------------- |
| **Trait mechanics** (`active_effects.yaml`)      | 7             | **111** | +104 (+1486%) tutti validati schema                  |
| **Glossary entries**                             | 263           | **275** | +12 (additive per trait nuovi)                       |
| **Mutation catalog** (NEW)                       | 0             | **30**  | T2 24 + T3 6, 5 categorie                            |
| **Jobs canonici**                                | 7             | **11**  | +4 expansion (Stalker/Symbiont/Beastmaster/Aberrant) |
| **Perks** (`progression/perks.yaml` + expansion) | 84            | **132** | +48 (12/job nuovo)                                   |
| **Design docs nuovi**                            | 0             | **4**   | status, creatures, mutations, jobs                   |
| **Creature concepts**                            | 0 documentati | **40+** | cross-ref a 20 biomi canonici                        |
| **Encounter pack seeds**                         | 0             | **10**  | per playtest M14                                     |

**Test status**: AI 307/307 ✅ · governance 0 errors ✅ · prettier 0 errors ✅

## Files modificati / creati

### Modificati (additive, no breaking)

- `data/core/traits/active_effects.yaml` — **+104 trait mechanics**
  (5 wave: offensive/defensive/status/sensory/residual). Schema invariato.
  Runtime carica tutti 111 senza errore (verificato con
  `loadActiveTraitRegistry()`).
- `data/core/traits/glossary.json` — **+12 entries** (6 trait pre-esistenti
  in active_effects ma assenti dal glossary + 6 nuovi trait con design
  intent).
- `docs/governance/docs_registry.json` — +4 entry per i nuovi planning
  docs (governance check passa con 0 errori).

### Creati

- `data/core/mutations/mutation_catalog.yaml` — **30 mutation baseline**
  (T2 24 + T3 6, 5 categorie: physiological/behavioral/sensorial/
  symbiotic/environmental). Tutte validate vs glossary (0 unresolved
  trait_id).
- `data/core/jobs_expansion.yaml` — **4 jobs + 48 perks** (Stalker,
  Symbiont, Beastmaster, Aberrant). Effect_type tutti supportati da
  abilityExecutor.js (verified).
- `docs/planning/2026-04-25-status-effects-roadmap.md` — design doc
  status v2: 5 live + 12 proposte (slowed/marked/burning/chilled/
  disoriented/taunted/linked/swarming/infected/enlightened/cursed/
  attuned).
- `docs/planning/2026-04-25-creature-concept-catalog.md` — 40+ creature
  cross-referenziate ai 20 biomi canonici + 8 apex tier + 10 encounter
  pack seeds + 5 mutation gateway showcase.
- `docs/planning/2026-04-25-mutation-system-design.md` — design doc
  M14+ runtime intent + integration M12/M13/M11.
- `docs/planning/2026-04-25-jobs-expansion-design.md` — design doc 4
  expansion job + synergy matrix 28-cell + balance band per job.

## Distribuzione contenuto generato

### Trait mechanics (111 totali)

**Per kind** (effect.kind):

- `extra_damage`: 27
- `damage_reduction`: 35
- `apply_status`: 49

**Per status applicato** (su 49 apply_status):

- `rage`: 8
- `panic`: 6
- `stunned`: 14
- `bleeding`: 12
- `fracture`: 9

**Per tier**:

- T1: 52
- T2: 56
- T3: 3

**Per famiglia coperta** (top 10):

- artigli: 8/8 (100% glossary coverage)
- ali: 5/5 (100%)
- carapace/carapaci: 4/4 (100%)
- cuticole: 2/2 (100%)
- coda: 7/8 (88%)
- branchie: 4/7 (57%)
- ghiandole: 7/14 (50%)
- antenne: 7/9 (78%)
- occhi: 4/4 (100%)
- circolazione: 3/5 (60%)

### Mutation catalog (30 totali)

**Per categoria**:

- physiological: 14 (trait swap fisici)
- behavioral: 4 (rage/panic shifts)
- sensorial: 5 (occhi/antenne/ali upgrades)
- symbiotic: 2 (endosimbiont, filamenti echo)
- environmental: 5 (biome adaptation)

**6 capstones T3**:

- `carapace_segments_to_phase` (defensive ultimate)
- `rage_simple_to_super` (rage 2→3 turni)
- `antenne_track_to_storm` (sensory crit specialist)
- `coda_kinetic_chain` (control specialist)
- `zampe_spring_to_radiant` (jumping apex)
- `ferocia_to_supercritical` (berserker apex)

### Jobs expansion (4 jobs × 12 perks = 48)

| Job         | Role    | Resource primary | Signature                     |
| ----------- | ------- | ---------------- | ----------------------------- |
| Stalker     | damage  | PT/PP            | First strike +50% vs full HP  |
| Symbiont    | support | SG/PT            | Damage redirect 50% al bonded |
| Beastmaster | control | PI/PT            | 1-2 minion + sacrifice        |
| Aberrant    | damage  | PE/SG            | Mutation cascade 1d6 random   |

Ogni job: 2 R1 abilities + 1 R2 ability (mirror schema base) + 12 perks
(6 levels × 2 paired choices), capstone @ level 7.

## Quality gates passati

- ✅ Schema validation (custom Python script): 111 trait, 0 errori (kind/
  trigger/applies_to/tier/category/stato/turns/amount/log_tag)
- ✅ Glossary cross-ref: 0 trait_id unresolved (post additions)
- ✅ Runtime load: `loadActiveTraitRegistry()` ritorna 111 trait OK
- ✅ AI test suite: `node --test tests/ai/*.test.js` → 307/307
- ✅ Mutation catalog cross-ref: 30 mutation, 0 trait_id unresolved
- ✅ Jobs expansion effect_type: 0 effect_type non supportati da
  abilityExecutor.js
- ✅ Prettier: tutti i file passa `--check` (3 file richiesto double-write
  per CRLF/LF idempotency, settled)
- ✅ Docs governance: `python3 tools/check_docs_governance.py --strict`
  → 0 errori 0 warning post registry update

## Next session pickup

### Priority P0 (auto-eseguibile)

1. **Espandere active_effects.yaml a 150+** — restano 142 trait glossary
   senza meccaniche. Wave 6 candidati: famiglie sotto-rappresentate
   (`sensori_*`, `mente_*`, `cuore_*`, `midollo_*`, `arti_*`, `mani_*`).

2. **Wire jobs_expansion in jobsLoader** — `services/jobs/jobsLoader.js`
   estendere a leggere `jobs_expansion.yaml`. Effort: ~2h.

### Priority P1 (richiede design call)

3. **Status effects v2 Phase A** — implementare 5 stati Tier 1 (slowed,
   marked, burning, chilled, disoriented) per sbloccare nuova categoria
   trait. Effort: ~110 LOC backend + 5 trait esempio. Vedi roadmap doc.

4. **Mutation engine Phase B** — `mutationEngine.js` (~250 LOC) +
   gating rules + REST API. Effort: ~12h.

### Priority P2 (lavoro umano richiesto)

5. **Playtest creature pack seeds** — N=10 sim per pack seed (10 packs
   × 10 = 100 sim) per validare PT2-5 win rate.

6. **Balance N=10 per expansion job** — 4 job × 10 sim = 40 batch per
   validare win-rate band documentati.

## Open decisions (delegated to user)

1. **Trait mechanic density target**: 111 attuali → target finale?
   Proposta: 200 entro M15, lasciando 75+ trait "lore-only" per design
   futuro.

2. **Mutation runtime priority**: M14 immediato o post-M11 playtest?
   Default raccomandato: post-M11 playtest live (TKT-M11B-06) per non
   sovrapporre 2 sistemi nuovi.

3. **Jobs expansion unlock condition**: i 4 jobs disponibili da PT1
   o gating PT3+? Default raccomandato: post-PT2 (player ha imparato
   i base 7).

4. **NEW_TRAIT_PROPOSAL** (4 trait proposti nel creature catalog: corno_di_caccia,
   echo_pulse, feromoni_assalto, cuore_temporale) → aggiungere a glossary
   in M14 quando i loro stati siano implementati (linked, taunted, infected).

## Mappa cross-references

```
data/core/traits/glossary.json (275)
   ↓ valida_id
data/core/traits/active_effects.yaml (111 mechanics)
   ↓ wired in runtime
apps/backend/services/traitEffects.js
   ↓ propaga effetti
apps/backend/routes/session.js performAttack()
   ↓ applica status
unit.status[<stato>] (5 live + 12 proposte v2)

data/core/mutations/mutation_catalog.yaml (30 mutations)
   ↓ refs trait_id glossary (✅ 0 errori)
   ↓ design intent
docs/planning/2026-04-25-mutation-system-design.md
   ↓ futuro M14
apps/backend/services/mutations/mutationEngine.js (TODO)

data/core/jobs.yaml (7 base) + jobs_expansion.yaml (4 NEW)
   ↓ refs effect_type
apps/backend/services/combat/abilityExecutor.js (✅ tutti supportati)
   ↓ runtime
data/core/progression/perks.yaml (84) + jobs_expansion.yaml.perks (48)
   ↓ runtime
apps/backend/services/progression/progressionEngine.js
```

## Filosofia di lavoro applicata (per ricordare)

- **Additive zero-risk**: tutto il lavoro è data/docs additivo.
  Zero modifiche a runtime, zero modifiche a workflows CI, zero modifiche
  a contratti. Reverso totale = `git revert`.
- **Schema validation custom**: ogni file YAML/JSON validato con Python
  ad-hoc prima del commit (no schema drift silenzioso).
- **Cross-reference reali**: ogni trait_id in mutations refers a
  glossary; ogni effect_type in jobs refers ad abilityExecutor.js
  (no fabricated identifiers).
- **Italian fantasy flavor**: tutti i `description_it` sono prosa
  fantasy italiana (matching project language convention).
- **Anti-pattern blocklists espliciti**: ogni design doc ha sezione
  "DON'T" per evitare derivazione futura su pattern noti rotti.

## Memoria sessione

3 background illuminator agents (narrative-design + pcg-level-design +
balance-illuminator) erano lanciati per produrre versioni più estese.
Output non ancora ritornato al moment of commit. Quando arrivano,
raccomandato: integrare con merge nei rispettivi file (mutation_catalog
expand a 60+, creature catalog expand a 80+, jobs expansion magari più
sezioni di balance).

---

**Sessione chiusa 2026-04-25 ~14:00 UTC. Zero deluse.** 🦎
