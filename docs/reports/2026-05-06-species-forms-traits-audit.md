---
title: 'Specie + Forme + Tratti Audit 2026-05-06 — canonical vs shipped drift'
doc_status: active
doc_owner: creature-aspect-illuminator
workstream: dataset-pack
last_verified: '2026-05-06'
source_of_truth: false
language: it-en
review_cycle_days: 30
tags: [species, forms, traits, audit, drift, pillar-p3, pillar-p4]
---

# Specie + Forme + Tratti Audit — 2026-05-06

**Trigger**: master-dd sospetta discrepancies design originale vs shipped per specie + forme + tratti.

**Scope**: tre layer + cross-layer integration. File letti direttamente dal repo worktree.

---

## 1. Layer Specie — Canonical vs Shipped

### 1.1 Canonical vision

`docs/core/GDD_MASTER.md §5` dichiara: specie definite con stat base, ruoli ecologici, trait pool. Asse evolutivo: `biomi → ecosistemi → specie → morph → trait → Forme`.

`docs/core/00-SOURCE-OF-TRUTH.md §5` aggiunge: 45 specie canonical (cross-ref PR #1808 sentience_tier backfill, docs/planning/2026-04-20-pilastri-reality-audit.md linea 70 "45 specie + 40 biomi bilingue naming").

Schema specie canonical richiede: `id`, `genus/epithet`, `clade_tag`, `sentience_tier`, `biome_affinity`, `default_parts` (5 slot: locomotion/offense/defense/senses/metabolism), `trait_plan` (core/optional/synergies), `ecology` (trophic_tier, pack_size, relazioni).

### 1.2 Shipped runtime

`data/core/species.yaml` contiene **15 specie** con schema completo + `ecology` block. Distribuzione:

| clade_tag | count |
|-----------|-------|
| Threat    | 4     |
| Playable  | 4     |
| Keystone  | 3     |
| Bridge    | 2     |
| Support   | 1     |
| Apex      | 1     |

`data/core/species_expansion.yaml` contiene **31 specie** addizionali (naming + morph_slots + role_tags, schema ridotto). Totale catalogo: **46 specie** (vs claim 45 — 1 extra, accettabile).

**DRIFT CRITICO A — default_parts identici per 14/15 specie**: ogni specie tranne `dune_stalker` (che ha synergy_hints reali) dichiara `default_parts` identici: `locomotion: burrower`, `offense: [sand_claws]`, `defense: [heat_scales]`, `senses: [echolocation]`. Questi sono i 5 slot del catalogo globale, NON specifici per specie. Il catalog `slots` in `species.yaml` definisce solo 5 parti globali. Le 14 specie non-Skiv hanno parti placeholder non differenziate.

**DRIFT B — species_expansion.yaml non ha lifecycle, ecology, trait_plan completo**: 31 specie hanno solo `morph_slots`, `preferred_biomes`, `role_tags`. Zero `trait_plan`, zero `ecology`, zero lifecycle yaml.

**DRIFT C — `data/core/species/` lifecycle status**: 15 lifecycle yaml esistono per le 15 specie di `species.yaml`. ZERO lifecycle per le 31 species_expansion. I lifecycle file sono stati generati autonomamente ma integrazione runtime è parziale (vedi §3).

### 1.3 Runtime species loading

`services/generation/SpeciesBuilder.js` non legge `species.yaml` direttamente — legge `docs/catalog/catalog_data.json` (derivato). Il builder genera profili sintetici da `trait_ids[]`, non dal campo `default_parts`.

`apps/backend/services/traitEffects.js` carica `species.yaml + species_expansion.yaml` per gate per-tag enemy. Unico uso runtime delle specie come entità strutturate.

`apps/backend/services/coop/coopOrchestrator.js characterToUnit()`: accetta `species_id` come stringa ma non legge dati specie — solo propagazione field. `species: character.species_id || 'unknown'` è metadata non operativo in combat.

---

## 2. Layer Forme — Canonical vs Shipped

### 2.1 Canonical vision

`docs/core/22-FORME_BASE_16.md`: 16 Forme come seed temperamentale. Ogni Forma assegna 1 **innata** + 7 PI pacchetti tematici. VC in-match sposta gradualmente i pesi. Nota: "pacchetti PI dettagliati in `data/forms.yaml` quando aggiunto."

`docs/core/PI-Pacchetti-Forme.md`: definisce struttura economica PI, tabella 13 pack d20, bias d12 per Forma, bias job. Riferimento `data/packs.yaml` e **`data/forms.yaml`** come source.

`docs/core/00-SOURCE-OF-TRUTH.md §5` (linea 300-307): ogni Forma assegna 1 innata + 7 PI. Job è ortogonale alla Specie ma strettamente accoppiato alla Forma.

### 2.2 Shipped runtime

**`data/forms.yaml` — MANCANTE**. Il file dichiarato come source of truth per le Forme non esiste. Replaced da:
- `data/core/forms/mbti_forms.yaml` — 16 tipi MBTI con `axes`, `job_affinities`, `job_penalties`, `temperament`. Schema: classificazione personalità, NO innate trait, NO PI pack specifici per Forma.
- `data/core/forms/form_pack_bias.yaml` — bias d12 per Forma (mirror di PI-Pacchetti-Forme tabella).
- `data/packs.yaml` — PI shop + pack d20 + job_bias + forms bias. Esiste. Riferisce trait come `trait_T1:pianificatore` (label placeholder, NON trait_id reale).

**DRIFT D — Innata trait NON implementata**: il canonical richiede che ogni Forma assegni 1 trait innata. `data/core/forms/mbti_forms.yaml` non ha campo `innata_trait`. `apps/backend/services/personalityProjection.js` e `formEvolution.js` non grant mai un trait innato da form_id. Il `sigillo_forma` in packs.yaml è un pacchetto PI acquistabile, non un grant automatico.

**DRIFT E — form_id non modifica stat combat**: `apps/backend/routes/session.js` usa `form_id` solo per logging/storage. `coopOrchestrator.js` `characterToUnit()` propaga `form_id` nel payload ma nessun servizio downstream applica stat multiplier, ability unlock, o trait grant basati su di esso. `wsSession.js` line 1348: fallback `form_default` se phone non trasmette form_id — conferma che form_id è cosmetic.

**DRIFT F — Pack d20 reference placeholders non risolti**: `data/packs.yaml` forms section riferisce `trait_T1:pianificatore`, `job_ability:vanguard/muraglia` come label testuali. Non sono trait_id validi in `active_effects.yaml` o `glossary.json`. Il sistema PI esiste come config YAML ma non ha engine runtime che risolva questi token in trait_id reali.

### 2.3 Runtime forms integration (cosa funziona)

`personalityProjection.js` + `formEvolution.js` (M12 Phase A+B): funzionano. Calcolano distanza euclidea axes MBTI, classificano form type, gate evoluzione (confidence ≥ 0.55, PE cost 8, cooldown 3 round). Endpoint `/api/v1/forms/*` vivi.

`formPackRecommender.js`: risolve starter bioma per Forma. Vivo.

`packRoller.js`: roll pack d20. Vivo.

**Verdict Forme**: infrastruttura MBTI projection live e solida. MA il layer "Forma → stat/trait runtime" è assente. Forma è un label + pack-roll bias, non una mechanical identity.

---

## 3. Layer Tratti — Canonical vs Shipped

### 3.1 Canonical vision

`docs/core/GDD_MASTER.md §5`: "Trait attivi idratati dal resolver d20. Solo in `active_effects.yaml`, mai hardcoded."

`docs/core/20-SPECIE_E_PARTI.md`: budget `weight_budget` per specie, 5 slot (locomotion/offense/defense/senses/metabolism). Trait in slot specifici.

Canonical claim (CLAUDE.md sprint context): 458 trait active_effects.yaml.

### 3.2 Shipped runtime

| Fonte | Count |
|-------|-------|
| `data/core/traits/active_effects.yaml` | **458 trait** con schema meccanico (trigger + effect) |
| `data/core/traits/glossary.json` | **592 trait** con label_it/label_en/description |
| Trait in `species.yaml` trait_plan | **64 unique trait_ids** referenziati |
| Trait_ids in species.yaml presenti in active_effects | **21/64 (33%)** |
| Trait_ids in species.yaml assenti in active_effects | **43/64 (67%)** |

**DRIFT G — 43/64 species trait_plan IDs non hanno effetto meccanico**: le specie dichiarano trait come `campo_di_interferenza_acustica`, `cannone_sonico_a_raggio`, `struttura_elastica_amorfa`, `criostasi_adattiva`, `bozzolo_magnetico` nel loro `trait_plan` ma questi trait NON esistono in `active_effects.yaml`. Sono presenti in `glossary.json` (592 entries > 458) ma il glossario è metadata descrittivo, non meccanico.

Risultato: un'unità con specie `soniptera_resonans` che dichiara `core: [ali_fono_risonanti, cannone_sonico_a_raggio, campo_di_interferenza_acustica, ...]` in session avrà solo `ali_fono_risonanti` con effetto meccanico (esiste in active_effects). Gli altri sono silently ignored da `traitEffects.js`.

**DRIFT H — Encoding mojibake in active_effects**: la descrizione di `artigli_sette_vie` contiene `profondit<U+FFFD>` — 1 occorrenza di carattere sostituto (soglia hook è 5, non triggera). Isolato ma segnale di write senza `ensure_ascii=False`.

**DRIFT I — active_effects non ha aspect_token/visual_swap**: 458 trait meccanici hanno solo `tier/category/applies_to/trigger/effect/description_it`. Zero `aspect_token`, zero `visual_swap_it`, zero `morphology`. Questi campi esistono SOLO in `data/core/mutations/mutation_catalog.yaml` (36/36 mutations li hanno).

**DRIFT J — Trait in slot vs trait come lista flat**: canonical definisce 5 slot per specie (locomotion/offense/defense/senses/metabolism). `active_effects.yaml` usa `category` (fisiologico/comportamentale/traumatico) NON slot. Il campo `applies_to` è actor/target, non slot. Nessun mapping runtime da slot → trait_category.

### 3.3 Runtime trait integration (cosa funziona)

`traitEffects.js` evalua trait nel session engine: lookup per id in active_effects dict, trigger check, effect apply. **Solo i 458 in active_effects sono valutati**. I 134 in glossary ma non in active_effects (592-458=134) + i 43 in species.yaml ma non in active_effects sono no-ops.

`mutation_catalog.yaml` (36 mutations): tutte hanno `aspect_token` + `visual_swap_it`. Status: "Design intent NOT yet wired to runtime — additive baseline per M14."

---

## 4. Cross-Layer Integration Matrix

| Layer A × B | Canonical | Shipped | Drift |
|---|---|---|---|
| Specie × Forme | Ogni specie ha forma innata; forme determinano stat seed | form_id è stringa propagata, zero stat effect, zero trait grant | **ROSSO** — forma non modifica specie in combat |
| Specie × Tratti | Ogni specie ha trait_plan (core/optional/synergies); trait slot-mapped | 33% trait_plan IDs attivi meccanicamente; slot mapping assente | **ARANCIO** — 67% trait_plan silent no-op |
| Forme × MBTI | MBTI projection → form type → stat + trait innata + PI bias | MBTI projection viva (personalityProjection.js); PI bias vivo; innata/stat assenti | **GIALLO** — projection funziona, downstream effect assente |
| Tratti × Specie | Trait idratati dal resolver usando spec specie | Trait valutati da lista sessione (non da species.yaml default_parts) | **ARANCIO** — species spec non alimenta combat unit |
| Tratti × Forme | Forma concede trait innata (canonical) | Nessun form→trait grant runtime | **ROSSO** — innata mai implementata |
| Forme × PI Pacchetti | Pack d20 risolve in trait_ids reali basati su Forma | Pack risolve in label placeholder non in trait_id | **ROSSO** — pack non producono trait reali |

---

## 5. P3 Pillar Status per Layer

| Layer | P3 Identità Specie × Job | Status | Gap primario |
|-------|--------------------------|--------|--------------|
| Specie | 15 specie schema completo, sentience/ecology/lifecycle | 🟡 | 14/15 default_parts identici, 31 expansion species incomplete |
| Forme | 16 MBTI forms config, projection engine live | 🟡 | form_id senza effetto stat/trait; innata trait assente |
| Tratti | 458 meccanici live, resolver funziona | 🟡 | 67% species trait_plan IDs no-op; no aspect_token su traits |
| Cross: Specie × Forme | forma associata a specie in runtime | 🔴 | zero mechanical link |
| Cross: Forme → Trait | forma concede innata | 🔴 | non implementato |
| Cross: PI Pack → Trait | pack risolve in trait reali | 🔴 | placeholder label, non trait_id |

---

## 6. Gap Prioritizzati

### GAP-001 — P0: default_parts identici su 14/15 specie

**File:line**: `data/core/species.yaml` — tutte le specie tranne dune_stalker (linea ~74-78 pattern ripetuto 14×)
**Reality**: catalogo ha 5 parti globali; tutte le specie dichiarano le stesse 5 parti placeholder
**Pattern-da-applicare**: Wildermyth layered portraits — ogni specie deve avere parti differenziate per slot
**Concrete change**: definire slot parts unici per ogni specie in catalog.slots + aggiornare default_parts; ~15 nuove parti slot, ~30 LOC species.yaml
**Effort**: ~4h
**Dependencies**: nessuna
**Pillar**: P3
**Status**: 🔴

### GAP-002 — P0: form_id non ha effetto meccanico (stat/trait)

**File:line**: `apps/backend/services/coop/coopOrchestrator.js:34`, `apps/backend/services/network/wsSession.js:1348`
**Reality**: form_id propagato come stringa, mai letto da resolver o traitEffects
**Pattern-da-aplicare**: Hades Weapon Aspects — form selection deve produrre ability unlock o stat modifier
**Concrete change**: `formEvolution.js` o nuovo `formStatApplier.js` — `forms/mbti_forms.yaml` aggiunge `stat_seed: {hp_mod, ap_mod}` + `normaliseUnit()` legge form_id → apply
**Effort**: ~6h
**Dependencies**: GAP-006 (innata trait resolve)
**Pillar**: P3+P4
**Status**: 🔴

### GAP-003 — P0: innata trait non implementata per nessuna Forma

**File:line**: `data/core/forms/mbti_forms.yaml` — schema assente per innata_trait_id
**Reality**: `22-FORME_BASE_16.md` canonical: ogni forma assegna 1 innata. Zero implementazione.
**Pattern-da-aplicare**: Caves of Qud morphotype — Forma determina pool iniziale + 1 trait guaranteed
**Concrete change**: aggiungere `innata_trait_id: <id>` a `mbti_forms.yaml` (16 entries); `characterToUnit()` aggiunge l'id a `traits[]` se non già presente
**Effort**: ~3h
**Dependencies**: nessuna (trait_ids già in active_effects)
**Pillar**: P3+P4
**Status**: 🔴

### GAP-004 — P1: 43/64 species trait_plan IDs silent no-op

**File:line**: `data/core/species.yaml` — trait_plan.core/optional per 14+ specie; `data/core/traits/active_effects.yaml` — mancano 43 IDs
**Reality**: trait come `campo_di_interferenza_acustica`, `cannone_sonico_a_raggio`, `struttura_elastica_amorfa` sono in glossary ma non in active_effects → silently ignored in combat
**Pattern-da-applicare**: Wildermyth permanent visible change — ogni trait deve avere effetto meccanico O essere flaggato `passive_flavor` esplicitamente
**Concrete change**: per i 43 IDs: (A) aggiungere schema minimo in active_effects.yaml (`tier/category/applies_to/trigger: null/effect: null`) per rendere esplicito che sono passive; o (B) implementare 5-10 prioritari con effetti reali. Linter `tools/py/lint_mutations.py` pattern.
**Effort**: ~8h per stub-all; ~20h per full mechanical
**Dependencies**: nessuna
**Pillar**: P3
**Status**: 🔴

### GAP-005 — P1: PI pack d20 non risolve trait_id reali

**File:line**: `data/packs.yaml` — forms section usa `trait_T1:pianificatore`, `job_ability:vanguard/muraglia` come label
**Reality**: nessun resolver converte questi token in trait_id validi; `packRoller.js` ritorna il label testuale, non un ID meccanico
**Pattern-da-applicare**: Monster Hunter Stories gene grid — pack roll deve produrre grant di trait_id reali nel unit state
**Concrete change**: mappatura `trait_T1:pianificatore → <real_trait_id>` in packs.yaml o resolver lookup; `packRoller.js` restituisce `{ trait_ids: [], job_ability_ids: [] }`
**Effort**: ~5h
**Dependencies**: GAP-004 (trait coverage)
**Pillar**: P2+P3
**Status**: 🔴

### GAP-006 — P2: mutation_catalog non wired a runtime (36 mutations)

**File:line**: `data/core/mutations/mutation_catalog.yaml:9` — "Design intent NOT yet wired to runtime"
**Reality**: 36 mutations con aspect_token + visual_swap_it + trait_swap pronte ma zero endpoint, zero trigger, zero runtime call
**Pattern-da-aplicare**: Wildermyth permanent visible change — mutation deve triggerare visual_swap sul portrait
**Concrete change**: endpoint `POST /api/v1/mutations/apply` + progressionEngine hook; aspect_token propagato a publicSessionView
**Effort**: ~8h
**Dependencies**: GAP-004
**Pillar**: P2+P3
**Status**: 🔴

### GAP-007 — P2: species_expansion.yaml (31 specie) senza trait_plan/ecology/lifecycle

**File:line**: `data/core/species_expansion.yaml:1-626`
**Reality**: 31 specie hanno solo naming + morph_slots + role_tags. Nessun trait_plan, ecology, lifecycle yaml.
**Pattern-da-aplicare**: Subnautica habitat lifecycle — ogni specie dovrebbe avere almeno biome_affinity_per_stage + 1 lifecycle phase
**Concrete change**: backfill trait_plan minimal (3 core traits) per 31 specie + alias lifecycle yaml stub
**Effort**: ~10h (autonomous content generation)
**Dependencies**: GAP-004
**Pillar**: P2+P3
**Status**: 🔴

### GAP-008 — P2: lifecycle yaml non integrati nel character creation flow

**File:line**: `apps/backend/services/species/biomeAffinity.js` — unico consumer lifecycle
**Reality**: 15 lifecycle yaml esistono e hanno biome_affinity_per_stage. `biomeAffinity.js` li legge per stat modifier. MA `coopOrchestrator.js characterToUnit()` non legge lifecycle_phase → nessun gating basato su lifecycle nel coop flow
**Pattern-da-aplicare**: Subnautica habitat lifecycle
**Concrete change**: `characterToUnit()` accetta `lifecycle_phase` (hatchling/juvenile/mature/apex/legacy) → biomeAffinity stat modifier applicato; `character_creation` endpoint espone lifecycle selection
**Effort**: ~4h
**Dependencies**: nessuna (biomeAffinity.js già funziona)
**Pillar**: P2
**Status**: 🟡 parziale

---

## 7. Open Architectural Questions

1. **Slot mapping**: canonical (5 slot: locomotion/offense/defense/senses/metabolism) vs active_effects (category: fisiologico/comportamentale). Come si mappano? Chi è la fonte canonica per l'assegnazione slot → effetto meccanico?

2. **Species default_parts runtime**: i `default_parts` di species.yaml devono diventare `traits[]` iniziali dell'unità al `/session/start`, oppure rimangono metadata per encounter generation solo?

3. **Forme come identity layer**: la Forma deve essere selezionata prima della Specie, dopo, o in parallelo? Il canonical suggerisce "Forma = seed temperamentale" (pre-progressione), ma la progressione current parte da MBTI scoring in-match (post-partita).

4. **Trait_plan completeness vs active_effects coverage**: è by-design avere 43 trait_plan IDs senza effetto meccanico (placeholder per future sprint), oppure è un bug di authoring? Serve una linter rule che flagga species trait_plan IDs non in active_effects.

5. **PI pack token resolution**: `sigillo_forma` in packs.yaml è un marker "evolvi forma" o un trait_id acquistabile? Il design non disambigua.

---

## 8. Proposed Tickets

```
TKT-P3-SPECIES-DEFAULT-PARTS: 4h — differenziare default_parts per specie in species.yaml catalog slots
TKT-P3-FORM-STAT-APPLIER: 6h — normaliseUnit legge form_id → applica stat_seed da mbti_forms.yaml
TKT-P3-P4-INNATA-TRAIT: 3h — aggiungere innata_trait_id a mbti_forms.yaml + grant in characterToUnit
TKT-P3-TRAIT-PLAN-STUB: 8h — stub active_effects entries per 43 species trait_plan IDs mancanti
TKT-P2-P3-PACK-RESOLVER: 5h — packRoller risolve trait_T1/job_ability token in real trait_ids
TKT-P2-MUTATION-RUNTIME: 8h — endpoint apply mutation + aspect_token propagato a publicSessionView
TKT-P2-EXPANSION-BACKFILL: 10h — trait_plan minimal + lifecycle stub per 31 species_expansion
TKT-P2-LIFECYCLE-COOP-WIRE: 4h — characterToUnit accetta lifecycle_phase + biomeAffinity stat modifier
```

---

## 9. Anti-pattern Guard

- **Cosmetic-only form_id** (current state) → ogni sprint che usa form_id senza GAP-002 fix crea tech debt
- **Silent trait no-op** — 43 species trait IDs mancanti da active_effects non devono essere aggiunti a species.yaml senza effetto meccanico corrispondente (o flag `passive_flavor: true` esplicito)
- **Pack label invece di trait_id** — mai aggiungere nuovi trait_T1:label senza resolver; genera gap non rilevabile
- **Lifecycle yaml senza integration test** — 15 lifecycle file esistono, ma senza test E2E il consumer (biomeAffinity) potrebbe silently fallback su default per specie non-dune_stalker
