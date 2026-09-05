---
title: 'Forme 10-Stadi Naming Spec — Stadio I-X dual-layer + cross-dimension link'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-26
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Forme 10-Stadi Naming Spec — Stadio I-X dual-layer + cross-dimension link

Spec design (zero codice). Risponde a tre decisioni master-dd 2026-04-26 sera:

- **A1**: 10 stadi (I-X) — granularità maggiore di 5 canonical Skiv.
- **A2**: applica `docs/core/00E-NAMING_STYLEGUIDE.md` (style guide canonical).
- **A3**: **(a) dual layer** (tier generico + specie-specifico) **+ (d) cross-dimension** ("dati tutti collegati").

**User correction 2026-04-27 sera (master-dd)**: confermato **I-X (10 stadi)**, NON I-IX. Originally I-X spec correct — questa è canonical reference per Phase A implementation.

Naming canonical proposto: termine **`Stadio`** IT / **`Stage`** EN (NON `Forma`, riservato MBTI per `00E-NAMING_STYLEGUIDE.md:310-314`). Decisione coerente con audit precedente `docs/reports/2026-04-26-forme-naming-integration.md:166-184`.

---

## 1. TL;DR (5 bullet)

1. **10 stadi I-X = sotto-divisione fine-grain dei 5 macro-stadi Skiv canonical** (mapping 2:1: I-II=hatchling, III-IV=juvenile, V-VI=mature, VII-VIII=apex, IX-X=legacy). Backward-compat zero breaking — il 5-fasi YAML in `data/core/species/dune_stalker_lifecycle.yaml:54-185` resta sorgente di verità; aggiungiamo solo `stage_index 1-10` + `macro_phase` ref.
2. **Naming Dimension 2 = `Stadio` (NON `Forma`)** per non collidere con MBTI 16 Forms già canonical (`docs/core/00E-NAMING_STYLEGUIDE.md:310-314`). Romano I-X player-facing, integer 1-10 code.
3. **Dual-layer label**: ogni stadio ha (a) **tier generico** universale cross-specie (es. `Stadio III · Apprendista`) + (b) **override specie-specifico** narrativo (es. `Skiv Stadio III · Predatore Adolescente`). Specie nuove ereditano tier generico finché non hanno YAML lifecycle proprio.
4. **Cross-dimension data link (opzione d)**: schema runtime `creatureCard` aggrega 6 dimensioni (Stadio · Forma MBTI · Sentience T0-T6 · Lineage · Bioma · Mutations) con priority ladder per display. Composite label esempio: _"Skiv (Stadio VI · Predatore Maturo) — Forma Analista (INTP) — T2 Pre-Sociale — Lineage KRNA-3 — Adattato Savana"_. Rischio readability mitigato via priority tiers (TV = solo Stadio + Forma; phone overlay = full stack).
5. **Effort Phase A additive**: ~5h (lifecycle YAML extension + style guide §`Stadio` + ADR + 16 Forms `display_name_en`). Phase B universalizzazione 44 specie residue = big design call separata (deferred).

---

## 2. Style guide compliance check

`docs/core/00E-NAMING_STYLEGUIDE.md` letto integralmente. Vincoli rilevanti:

| Linea      | Regola                                                    | Applicazione a Stadio I-X                                                                               |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `:18-25`   | "Codice EN, display IT primario, EN alternato"            | `stage_index: 6` (code int) + `stage_label_it: "Predatore Maturo"` + `stage_label_en: "Mature Stalker"` |
| `:28-43`   | Modello a doppio livello (canonico + player-facing)       | `stage_index 1-10` (canonico, machine-readable) + `stage_label_it/en` (player-facing)                   |
| `:88-99`   | display_name 2-3 parole Title Case                        | `Stadio VI · Predatore Maturo` rispetta limite (3 parole post separatore)                               |
| `:101-105` | slug kebab-case ASCII, mai dal display                    | `stage_slug: mature-stalker-vi` se necessario                                                           |
| `:142-154` | morph slots snake_case `*_legs`, `*_claws`, etc.          | invariato: Stadio è ortogonale a morph slots                                                            |
| `:158`     | Campi canonici ASCII-only                                 | `stage_roman: "VI"` ASCII, no diacritici                                                                |
| `:310-314` | `Forma` riservato MBTI 16 — IT title `Forma`, code `form` | **NON usare `Forma` per anatomia**. Usare `Stadio`.                                                     |

**Eccezione proposta**: sintassi `Stadio + numero romano + bullet separator` (es. `Stadio VI · Predatore Maturo`) **estende** lo stile compositivo della style guide (oggi solo `genus epithet` + `display_name`). Aggiungere paragrafo `§Stadio / Stage / stage` speculare a `§Forma / Form / form` (`docs/core/00E-NAMING_STYLEGUIDE.md:310-314`).

**Conformità Skiv esistente** (`data/core/species/dune_stalker_lifecycle.yaml:54-185`):

- ✅ `label_it` + `label_en` già presenti per ogni phase
- 🟡 manca `stage_index` (1-10 nuovo) + `stage_roman` (`I-X` nuovo) + `macro_phase` (back-link a hatchling/juvenile/mature/apex/legacy)
- ✅ ASCII-only nei campi canonical → aggiunte additive rispettano vincolo

---

## 3. 10 stadi I-X — schema + mapping a 5 macro-fasi

### Decisione design

**10 stadi = sotto-divisione fine-grain dei 5 macro-stadi**, NON scala parallela. Razionale:

- Skiv 5-fasi (`dune_stalker_lifecycle.yaml:54-185`) è schema canonical operativo + skill `/skiv` dipende da `current_phase: mature`. Romperlo = invalidare `seed_skiv_saga.py` + skivPanel.js.
- Sentience T0-T6 (`docs/guide/README_SENTIENCE.md:19-26`) è scala **per-specie** (cognitive complexity), NON per-individuo. Una scala 1-10 anatomica indipendente sentience preserva ortogonalità.
- 2:1 mapping (2 stadi per macro-fase) dà granularità senza inflazione gating: ogni macro-fase ha early/late.

### Mapping canonical

| Stadio | Roman | Macro-fase Skiv   | Tier label IT (generico) | Tier label EN | Skiv-specific label_it  | Trigger condizione promozione                         |
| ------ | ----- | ----------------- | ------------------------ | ------------- | ----------------------- | ----------------------------------------------------- |
| 1      | I     | hatchling (early) | Schiusa                  | Hatching      | Cucciolo delle Dune     | spawn / lineage origin event                          |
| 2      | II    | hatchling (late)  | Neonato                  | Newborn       | Cucciolo Esplorante     | Lv 1 + 1 encounter completato                         |
| 3      | III   | juvenile (early)  | Apprendista              | Apprentice    | Predatore Giovane       | Lv 2 raggiunto                                        |
| 4      | IV    | juvenile (late)   | Adolescente              | Adolescent    | Predatore Adolescente   | Lv 3 + warning_zone trigger primo silenzio            |
| 5      | V     | mature (early)    | Affermato                | Affirmed      | Predatore Adulto        | Lv 4 + 1 mutation cumulata                            |
| 6      | VI    | mature (late)     | Maturo                   | Mature        | Predatore Maturo        | Lv 5 + 2 thoughts internalized + mbti polarity stable |
| 7      | VII   | apex (early)      | Apicale                  | Apex Rising   | Cacciatore d'Alto Rango | Lv 6 + 2 mutations + 3 thoughts                       |
| 8      | VIII  | apex (late)       | Apex                     | Dune Apex     | Apex delle Dune         | Lv 7 + 3 mutations + Defy usato a Critical+           |
| 9      | IX    | legacy (early)    | Veterano                 | Veteran       | Apex Anziano            | Lv 7 + saga arc 80% complete                          |
| 10     | X     | legacy (late)     | Eredità                  | Pack Memory   | Memoria del Branco      | retired event, lineage_id propagato                   |

**Note di mapping**:

- Stadi I-IV non richiedono mutations / thoughts (gating leggero, allineato a Skiv `hatchling/juvenile` `mutations_required: 0` cfr. `dune_stalker_lifecycle.yaml:62-104`).
- Stadi V-VI corrispondono a `mature` Skiv (`level_range: [4, 5]`, `mutations_required: 1`, `thoughts_internalized_required: 2`, cfr. `dune_stalker_lifecycle.yaml:106-131`).
- Stadi VII-VIII = `apex` (`level_range: [6, 7]`, `mutations_required: 2`, `thoughts_internalized_required: 3`, cfr. `:133-158`).
- Stadi IX-X = `legacy` (`mutations_required: 3`, cfr. `:160-185`).

**Trigger fine-grain proposti** (per ogni passaggio N → N+1 dentro stessa macro-fase):

- **I → II**: 1 encounter completato (event `scenario_completed`, già in Skiv YAML `:78`).
- **III → IV**: warning_zone primo silenzio (event `mbti_axis_threshold_crossed`, `:104`).
- **V → VI**: secondo thought internalized (event `thought_internalized`, `:131`).
- **VII → VIII**: Defy usato a Critical+ (event citato in warning_zone Skiv `:143`).
- **IX → X**: lineage propagation event (V3 Mating/Nido futuro, `:174-177`).

I trigger usano **event types già documentati** nel Skiv YAML (`diary_milestone_event` field), zero invenzione.

### Alternativa scartata: scala parallela 10 sentience-like

Considerata: `anatomy_tier A0-A9` parallelo a sentience T0-T6. **Scartata** perché:

- Forza nuova scala universale 44 specie senza lifecycle YAML — big migration call.
- Rompe Skiv 5-fasi mapping → richiede dual-write skivPanel.js.
- Scope user "anatomico" si sovrappone a sentience (cognitive vs morphological) generando ambiguità.

---

## 4. Dual-layer label — tier generico + specie-specifico

### Schema YAML proposto

Estensione additive a `data/core/species/dune_stalker_lifecycle.yaml`. Esempio fase `mature` (`:106-131`):

```yaml
phases:
  mature:
    id: mature
    label_it: 'Predatore Maturo' # KEEP (Skiv-specific, label macro-fase)
    label_en: 'Mature Stalker' # KEEP
    level_range: [4, 5] # KEEP
    mutations_required: 1 # KEEP
    thoughts_internalized_required: 2 # KEEP
    mbti_polarity_required: true # KEEP
    # ... aspect_it, sprite_ascii, etc. KEEP

    # NEW: 2 sub-stadi fine-grain
    sub_stages:
      - stage_index: 5 # NEW: 1-10 globale
        stage_roman: 'V' # NEW: I-X player-facing
        macro_phase: mature # NEW: back-link
        tier_label_it: 'Affermato' # NEW: generico cross-specie
        tier_label_en: 'Affirmed' # NEW
        species_label_it: 'Predatore Adulto' # NEW: override Skiv
        species_label_en: 'Adult Stalker' # NEW
        promotion_trigger: 'Lv 4 + 1 mutation cumulata'
      - stage_index: 6
        stage_roman: 'VI'
        macro_phase: mature
        tier_label_it: 'Maturo'
        tier_label_en: 'Mature'
        species_label_it: 'Predatore Maturo'
        species_label_en: 'Mature Stalker'
        promotion_trigger: 'Lv 5 + 2 thoughts internalized + mbti polarity stable'
```

### Tier generici cross-specie completi

| Stadio | tier_label_it | tier_label_en | Adatto a quali clade_tag?                                 |
| ------ | ------------- | ------------- | --------------------------------------------------------- |
| I      | Schiusa       | Hatching      | tutti                                                     |
| II     | Neonato       | Newborn       | tutti tranne `Threat` (alcuni Threat spawnano già adulti) |
| III    | Apprendista   | Apprentice    | `Playable`, `Keystone`, `Bridge`, `Support`               |
| IV     | Adolescente   | Adolescent    | `Playable`, `Keystone`, `Apex` (juvenile form)            |
| V      | Affermato     | Affirmed      | tutti                                                     |
| VI     | Maturo        | Mature        | tutti                                                     |
| VII    | Apicale       | Apex Rising   | `Apex`, `Threat`, `Playable` (path apex)                  |
| VIII   | Apex          | Dune Apex     | solo specie con `apex` arc (`dune_stalker`, future)       |
| IX     | Veterano      | Veteran       | `Apex`, `Playable` con saga arc completo                  |
| X      | Eredità       | Pack Memory   | tutti (post-mortem ritualizzato)                          |

**Regola cascade**: se una specie non override `species_label_*`, runtime mostra `tier_label_*` generico. Default sicuro per le 44 specie senza lifecycle YAML.

### Esempio Skiv specie-specifico (riferimento)

Display priority:

```
TV (silhouette + size scaling, già wirato QW4 PR #1863):
  → "Predatore Maturo · Stadio VI"

Phone overlay (skivPanel.js):
  → "Skiv · Stadio VI · Predatore Maturo"
  → underline: "Forma Analista (INTP) — T2 Pre-Sociale"
```

---

## 5. Cross-dimension data link (opzione d)

### 6 dimensioni collegate

| Dim                | Source file                                                           | Granularità            | Scope   | Player visibility      |
| ------------------ | --------------------------------------------------------------------- | ---------------------- | ------- | ---------------------- |
| Stadio I-X         | `data/core/species/<species>_lifecycle.yaml` (NEW field `sub_stages`) | per-individuo          | runtime | TV + phone (alta)      |
| Forma MBTI         | `data/core/forms/mbti_forms.yaml:13-142`                              | per-individuo (player) | runtime | phone (alta)           |
| Sentience T0-T6    | `data/core/species.yaml:66` (`sentience_tier`)                        | per-specie             | static  | phone (media)          |
| Lineage_id         | `data/derived/skiv_saga.json` (Skiv only oggi)                        | per-individuo          | runtime | phone (bassa, inspect) |
| Bioma adattato     | `data/core/species.yaml:72` (`biome_affinity`)                        | per-specie             | static  | phone (media)          |
| Mutations cumulate | `data/core/mutations/mutation_catalog.yaml:20-100` (30 entries)       | per-individuo          | runtime | TV badges + phone full |

### Schema runtime aggregato (proposta JSON)

Endpoint `/api/creature/:unit_id/card` (oggi solo `/api/skiv/card`, da generalizzare):

```json
{
  "unit_id": "u_skiv_001",
  "species_id": "dune_stalker",
  "lineage_id": "KRNA-3",

  "stadio": {
    "index": 6,
    "roman": "VI",
    "macro_phase": "mature",
    "tier_label_it": "Maturo",
    "tier_label_en": "Mature",
    "species_label_it": "Predatore Maturo",
    "species_label_en": "Mature Stalker"
  },

  "forma_mbti": {
    "code": "INTP",
    "label_it": "Analista",
    "axes": { "E_I": 0.7, "S_N": 0.3, "T_F": 0.75, "J_P": 0.3 },
    "polarity_stable": true
  },

  "sentience": {
    "tier": "T2",
    "label_it": "Pre-Sociale"
  },

  "biome_adapted": {
    "id": "savana",
    "affinity_strength": 1.0
  },

  "mutations": [
    { "id": "artigli_grip_to_glass", "aspect_token": "claws_glass", "phase_unlock": "mature" }
  ],

  "thoughts_internalized": 2,
  "level": 5,

  "display_priority": {
    "tv_primary": "stadio.species_label_it",
    "tv_subtitle": "stadio.tier_label_it · forma_mbti.code",
    "phone_primary": "stadio.species_label_it",
    "phone_overlay": [
      "Stadio VI · Maturo",
      "Forma Analista (INTP)",
      "T2 Pre-Sociale · Lineage KRNA-3",
      "Adattato Savana · 1 mutazione"
    ]
  }
}
```

### Display priority ladder

**TV (canvas, render.js drawUnit, sprint M14):**

- Riga 1 (titolo): `stadio.species_label_it` → "Predatore Maturo"
- Sottotitolo (overlay piccolo): `Stadio VI · Forma INTP`
- Badge: `clade_tag` colorato (Apex=rosso, Threat=arancio, Keystone=verde, Bridge/Support/Playable=neutro)
- Mutations: N dot colorati per `aspect_token` (Wildermyth pattern, `docs/reports/2026-04-26-creature-emergence-audit.md:84-87`)

**Phone (skivPanel.js / future creatureCard.js):**

- Header: `species_label_it` + `Stadio + roman`
- Card body: 4-line stack (Forma · Sentience · Lineage · Bioma)
- Footer: mutations list + thoughts + level

**Anti-pattern "label spam"**: NON mostrare TUTTE 6 dimensioni in una riga. TV = max 2 (Stadio + Forma); phone overlay = max 4 righe. Composite full string solo in `/api/creature/:id/card` debug + handoff doc.

### Esempio composite label completa (per debug / saga summary)

```
Skiv (Stadio VI · Predatore Maturo) — Forma Analista (INTP) — T2 Pre-Sociale — Lineage KRNA-3 — Adattato Savana — 1 mutazione
```

68 caratteri. Solo per logging, mai UI runtime.

### Effort di wire cross-dimension

| Step                                                                     | File                                                             | Effort  |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------- |
| Schema `sub_stages` in `dune_stalker_lifecycle.yaml`                     | `data/core/species/dune_stalker_lifecycle.yaml`                  | 1h      |
| Generalizzare `/api/skiv/card` → `/api/creature/:unit_id/card`           | `apps/backend/routes/skiv.js`                                    | 2h      |
| `creatureCard` aggregator (legge 6 dim da YAML + runtime state)          | `apps/backend/services/creature/creatureCardAggregator.js` (NEW) | 3h      |
| `display_priority` resolver helper                                       | come sopra                                                       | inclusa |
| Frontend: rinominare skivPanel → creaturePanel + supportare 6-dim render | `apps/play/src/skivPanel.js`                                     | 2h      |
| Estendere style guide §`Stadio / Stage / stage`                          | `docs/core/00E-NAMING_STYLEGUIDE.md`                             | 30min   |
| ADR `ADR-2026-04-27-stadio-naming-cross-dimension.md`                    | `docs/adr/`                                                      | 1h      |

**Totale Phase A (Skiv only)**: ~10h. Big design call: estensione 44 specie residue (Phase B).

### Rischi readability

| Rischio                                                          | Mitigazione                                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Phone overlay 4 righe + TV badge → information overload          | Display priority ladder enforced; toggle "mostra extra" su phone                                   |
| Tier vs species label confusion ("Maturo" vs "Predatore Maturo") | Tier sempre con prefisso `Stadio + roman` (es. "Stadio VI · Maturo"), species label senza prefisso |
| Lineage_id criptico (KRNA-3)                                     | Prefisso label (es. "Lineage KRNA-3 · Branco di Skiv") opzionale                                   |
| 10 stadi vs 5 macro-fasi confusi                                 | YAML field `macro_phase` esplicito; documentare 2:1 mapping in style guide                         |
| Specie senza lifecycle YAML mostrano solo tier generico          | Default cascade "tier_label_it" solo, footnote "lifecycle non definito" su debug                   |

---

## 6. Migration path (effort additive Phase A)

### File da modificare

| File                                                                                  | Change tipo                                                                                                                                      | Effort | Breaking?               |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------- |
| `docs/core/00E-NAMING_STYLEGUIDE.md`                                                  | ADD §`Stadio / Stage / stage` post §Forma `:310-314` + tabella tier 10 stadi                                                                     | 30min  | NO                      |
| `data/core/species/dune_stalker_lifecycle.yaml:54-185`                                | ADD field `sub_stages: [...]` per ogni macro-phase (10 entries totali)                                                                           | 1h     | NO (additive)           |
| `apps/backend/services/skiv/skivStateBuilder.js` (verify path; oggi `routes/skiv.js`) | ADD resolver `currentSubStage(level, mutations, thoughts)` → returns stage_index 1-10                                                            | 2h     | NO                      |
| `apps/play/src/skivPanel.js`                                                          | UPDATE header per mostrare `Stadio VI · Predatore Maturo` instead of solo `mature`                                                               | 1h     | NO (i18n string change) |
| `data/core/forms/mbti_forms.yaml:13-142`                                              | ADD `display_name_en` + `description_en` per 16 entries (gap precedente da `docs/reports/2026-04-26-forme-naming-integration.md:71-76`)          | 1h     | NO (additive)           |
| `docs/core/22-FORME_BASE_16.md`                                                       | UPDATE stub con tabella completa 16 Forms + reference path corretto `data/core/forms/mbti_forms.yaml` (oggi cita `data/forms.yaml` mai esistito) | 30min  | NO                      |
| `docs/adr/ADR-2026-04-27-stadio-naming-cross-dimension.md`                            | NEW ADR: rationale 10 stadi + mapping 5:10 + cross-dimension schema                                                                              | 1h     | NO                      |

**Totale Phase A**: ~7h. Zero breaking change (tutte additive).

### Phase B (deferred — universalizzazione 44 specie)

- Schema design call: come estendere `sub_stages` a `Apex` (boss arc, IX-X relevant), `Threat` (vita breve, max VI?), `Keystone` (stabile, mai apex), `Support` (lifecycle compresso?).
- Lifecycle template per `clade_tag` (5 file YAML in `data/core/species/templates/<clade>.yaml`).
- Effort stimato: 6-9h schema + 4-6h migration 44 specie.

### Phase C (futuro — cross-dimension UI)

- Generalizzare `/api/skiv/card` → `/api/creature/:unit_id/card` (vedi §5 effort wire).
- Rinominare `skivPanel.js` → `creaturePanel.js`; supportare arbitrary species + cross-dim display priority.
- ~5h post Phase B.

---

## 7. Style guide compliance — sezione finale

### Cosa Stadio I-X rispetta

- ✅ **Codice EN, display IT primario, EN alternato** (`docs/core/00E-NAMING_STYLEGUIDE.md:18-25`): `stage_index` int code, `tier_label_it` IT primario, `tier_label_en` EN alternato.
- ✅ **Modello a doppio livello** (`:28-43`): `stage_index 1-10` machine-readable canonical + `tier_label_*` player-facing localized.
- ✅ **ASCII-only canonical fields** (`:158`): `stage_roman: "VI"` ASCII; `macro_phase: mature` ASCII.
- ✅ **Display name 2-3 parole Title Case** (`:88-99`): "Predatore Maturo" (2), "Apex delle Dune" (3 separato), "Memoria del Branco" (3).
- ✅ **No collisione con `Forma`** (`:310-314`): nuovo termine `Stadio` esplicito.

### Eccezioni proposte (richiede paragrafo nuovo in style guide)

- **Numerazione romana I-X come componente label**: pattern compositivo `Stadio + roman + bullet + label` (es. `Stadio VI · Predatore Maturo`) **estende** lo stile compositivo, non lo sostituisce. Aggiungere in §`Stadio / Stage / stage`.
- **Dual-layer cascade**: regola "se species*label*_ assente → fallback tier*label*_" è nuova; documentare in style guide come "Regola cascade Stadio".

---

## 8. Domande aperte per master-dd

### Q1 — 10 stadi sub-divisione 2:1 vs scala parallela?

**Default raccomandato**: **sub-divisione 2:1** (proposto sopra). Backward-compat con Skiv 5-fasi, Phase A additive, zero rotture skill `/skiv` o `seed_skiv_saga.py`.

**Alternativa scartata**: scala parallela `anatomy_tier A0-A9` (rompe Skiv, big design call). Riconsiderare solo se intenzione user è disaccoppiare anatomy da lifecycle level-based.

### Q2 — Termine Dimension 2: `Stadio` confermato?

**Default raccomandato**: **`Stadio` IT / `Stage` EN**. Non collide con `Forma` (MBTI), allineato a biology terminology, già usato in `docs/reports/2026-04-26-forme-naming-integration.md:166-184`.

Alternative scartate: `Fase` (collide con `round phase`), `Età` (non copre `legacy` post-mortem), `Forma` (collide MBTI).

### Q3 — Cross-dimension display priority: 4 livelli phone overlay accettabili?

**Default raccomandato**: 4 righe phone overlay (Stadio · Forma · Sentience+Lineage · Bioma+Mutations). Toggle utente "compact mode" → 2 righe (Stadio + Forma) per readability.

**Alternativa**: limitare a 2 righe sempre, mostra rest solo su tap "inspect". Più sicuro su readability ma costa un'azione utente per accedere a info "saga arc" relevant.

### Q4 — Phase B universalizzazione 44 specie: priorità o deferred?

**Default raccomandato**: **deferred**. Phase A copre Skiv (priorità progetto). Phase B richiede schema design per `clade_tag`-specific lifecycle templates — big call separata da fare quando V3 Mating/Nido apre saga propagation per altre specie.

---

## 9. Riferimenti file:line

- Style guide canonical: `docs/core/00E-NAMING_STYLEGUIDE.md:18-43, :88-99, :158, :310-314`
- 16 MBTI Forms: `data/core/forms/mbti_forms.yaml:11-142`
- Forma stub doc: `docs/core/22-FORME_BASE_16.md:14-16`
- Skiv lifecycle 5 fasi: `data/core/species/dune_stalker_lifecycle.yaml:54-185`
- Skiv saga anchor: `data/core/species/dune_stalker_lifecycle.yaml:242-248`
- Sentience scale T0-T6: `docs/guide/README_SENTIENCE.md:19-26`
- Species catalog (15 + 30 = 45): `data/core/species.yaml:60-484` + `data/core/species_expansion.yaml:5-30+`
- biome_affinity reference: `data/core/species.yaml:72` (es. `dune_stalker → savana`)
- Mutation catalog: `data/core/mutations/mutation_catalog.yaml:20-100` (30 entries con biome_boost / mbti_alignment)
- Audit precedente forme naming: `docs/reports/2026-04-26-forme-naming-integration.md:166-184` (decisione `Stadio` term)
- Audit emergence chain: `docs/reports/2026-04-26-creature-emergence-audit.md:84-103` (Wildermyth pattern + render gap)
- Skiv saga JSON: `data/derived/skiv_saga.json` (lineage_id source)
- Form engine M12: `apps/backend/services/forms/formEvolution.js`
- Skiv panel UI: `apps/play/src/skivPanel.js` (header da estendere con Stadio VI label)

---

## 10. Conclusione

**Raccomandazione netta**:

1. **`Stadio` (NON `Forma`)** come termine canonical Dimension 2. Eliminare ambiguità terminologica via §nuovo style guide.
2. **10 stadi I-X come sub-divisione 2:1** dei 5 macro Skiv. Backward-compat zero breaking.
3. **Cross-dim via display priority ladder**, NO concatenazione full-string. TV = 2 dim; phone = 4 dim; debug = 6 dim.
4. **Phase A first** (~7h Skiv only). Phase B + C deferred.

**Bloccanti master-dd**: Q1 (sub-div) + Q2 (term `Stadio`) + Q3 (4 righe phone). Q4 (Phase B) può attendere.
