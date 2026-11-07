---
title: 'Forme — Naming Integration & Dual-Dimension Audit'
doc_status: draft
doc_owner: research
workstream: cross-cutting
last_verified: 2026-04-26
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Forme — Naming Integration & Dual-Dimension Audit

Research-only report. Audit naming attuale + proposta canonical per due dimensioni
ortogonali (16 MBTI Forms × N stadi anatomici). Decisione user pending.

## TL;DR (5 bullet)

1. **Le due dimensioni esistono già nel repo** ma con naming sovrapposto al termine `Forma` —
   Dimension 1 ("chi sei") usa `forms` snake_case (`mbti_forms.yaml`, 16 entries).
   Dimension 2 ("a che stadio sei") **non è universale**: esiste solo per Skiv come
   `phases` in `data/core/species/dune_stalker_lifecycle.yaml:54` (5 fasi).
2. **"Forma I-X" 10-stage proposto user è inconsistente con repo canon**: lo schema
   canonico operativo è **5-stage lifecycle** (hatchling/juvenile/mature/apex/legacy)
   per creatura individuale, mentre **T0–T6 sentience_index** (7 livelli) descrive la
   capacità cognitiva per-specie. Una scala 1-10 fonderebbe due cose diverse.
3. **Style guide** (`docs/core/00E-NAMING_STYLEGUIDE.md:310-314`) già fissa che
   `Forma` = MBTI temperament (16 Forme), code `form` lowercase EN. Riusare lo stesso
   termine per anatomia genera collisione. Serve neologismo player-facing per Dim 2.
4. **Overlap label rischioso**: `mbti_forms.yaml` già usa label come "Stratega",
   "Comandante", mentre Ennea usa "Conquistatore" / "Architetto" / "Stoico"
   (`packs/evo_tactics_pack/tools/py/ennea/themes.yaml:3-19`). Mai mescolare nello
   stesso campo. Proposta: tenere label MBTI **distinte** semanticamente da label Ennea.
5. **Proposta canonical** (vedi §5): mantenere `Forma` per MBTI (16); rinominare
   Dim 2 in **`Stadio`** (IT) / `Stage` (EN) con scala **I-V** allineata al
   lifecycle 5-fasi già canonical. Display dual: _"Skiv (Stadio III · Forma INTP/Analista)"_.

---

## 1. Audit Dimension 1 — 16 MBTI Forms

### Stato attuale

**Source of truth runtime**: `data/core/forms/mbti_forms.yaml` (153 LOC, 16 entries +
`NEUTRA` fallback in `form_pack_bias.yaml:230`).

| Code MBTI | Label IT (`label`)  | Temperament |
| --------- | ------------------- | ----------- |
| INTJ      | Stratega            | NT          |
| INTP      | Analista            | NT          |
| ENTJ      | Comandante          | NT          |
| ENTP      | Inventore           | NT          |
| INFJ      | Custode             | NF          |
| INFP      | Mediatore           | NF          |
| ENFJ      | Protagonista        | NF          |
| ENFP      | Campione            | NF          |
| ISTJ      | Ispettore           | SJ          |
| ISFJ      | Difensore           | SJ          |
| ESTJ      | Esecutore           | SJ          |
| ESFJ      | Console             | SJ          |
| ISTP      | Virtuoso            | SP          |
| ISFP      | Avventuriero        | SP          |
| ESTP      | Imprenditore        | SP          |
| ESFP      | Intrattenitore      | SP          |

Source: `data/core/forms/mbti_forms.yaml:13-142`. Pattern: 1 parola, sostantivo
agentivo IT, no `display_name_en`.

### Style guide compliance

- ✅ Code identifier `form` lowercase EN snake_case (`form_pack_bias.yaml`,
  `formEvolution.js`). Conforme a §"Forma / Form / form" stylesheet.
- ✅ Prose IT usa `Forma` Title Case quando riferito al sistema 16 (`docs/core/22-FORME_BASE_16.md:12`).
- 🟡 **Manca `display_name_en`**: stylesheet richiede dual IT/EN per ogni player-facing label. Ogni form ha solo `label` IT.
- 🟡 **Manca `description_en`**: idem.
- 🔴 **`docs/core/22-FORME_BASE_16.md` è stub**: dichiara "pacchetti PI dettagliati in
  `data/forms.yaml` quando aggiunto" — ma il file canonico è
  `data/core/forms/form_pack_bias.yaml` (path divergente). Stub da aggiornare.

### Gap

- Nessuna creatura-themed naming proposta (es. _"Forma Conquistatore"_) — gli archetipi
  Ennea sono **separati** e label _"Conquistatore"_ è solo Ennea (achiever_3).
- `description_it` in `mbti_forms.yaml:14` è 1 frase tactical (es. INTJ:
  _"Pianificatore freddo, setup meticoloso, poche azioni ma decisive."_). Player-facing
  ok. EN missing.

---

## 2. Audit Dimension 2 — Forma anatomica / lifecycle

### Stato attuale: **non universale**

Lifecycle 5-fasi esiste **solo per Skiv** (`data/core/species/dune_stalker_lifecycle.yaml:54-185`).
Nessuna altra specie in `data/core/species.yaml` (45 entries) ha campo `lifecycle` o `phases`.

| ID phase     | label_it             | label_en          | level_range | Gating                             |
| ------------ | -------------------- | ----------------- | ----------- | ---------------------------------- |
| `hatchling`  | Cucciolo delle Dune  | Dune Hatchling    | [1,1]       | mut=0, thoughts=0                  |
| `juvenile`   | Predatore Giovane    | Juvenile Stalker  | [2,3]       | mut=0, thoughts=0                  |
| `mature`     | Predatore Maturo     | Mature Stalker    | [4,5]       | mut≥1, thoughts≥2, polarity stable |
| `apex`       | Apex delle Dune      | Dune Apex         | [6,7]       | mut≥2, thoughts≥3                  |
| `legacy`     | Memoria del Branco   | Pack Memory       | [7,7]       | mut≥3, thoughts≥3                  |

Source: `data/core/species/dune_stalker_lifecycle.yaml:54-185`.

### Sistema separato esistente: sentience tier T0-T6

`docs/guide/README_SENTIENCE.md:19-26` definisce **T0 Reattivo → T6 Sapiente** (7 livelli)
come capacità cognitiva **per-specie** (non per-individuo). Wired su 45/45 species
(`data/core/species.yaml`). Esempi:
- `dune_stalker`: T2 Pre-Sociale
- `cephalophis_praeco`: T5 Avanzato
- `larva_swarm`: T0 Reattivo

**Importante**: T0-T6 è scala canonica per "complessità cognitiva", NON per
"complessità anatomica". Confondere le due fa danni.

### Confronto user proposal "Forma I-X" 10-stage

| Aspetto              | User proposal "Forma I-X" 10 | Canon repo lifecycle 5 | Canon repo sentience 7 |
| -------------------- | ---------------------------- | ---------------------- | ---------------------- |
| Granularità          | 10                           | 5                      | 7 (T0-T6)              |
| Scope                | per-individuo (?)            | per-individuo (Skiv)   | per-specie             |
| Universale?          | ?                            | No (Skiv-only)         | Sì                     |
| Gating               | ?                            | level + mut + thoughts | static species enum    |
| Player-facing        | ?                            | sì (sprite + voice)    | dev-facing             |

**Rischio user proposal 1-10**: né lifecycle (max 5 stati gating) né sentience (T0-T6 + non-progressive) supportano scala 1-10. Implementarla forzerebbe nuovo schema universale **non collaudato**.

### Gap

- **5-stage lifecycle è Skiv-only**: per estendere ad altre specie servirebbe schema
  per-clade (Apex / Keystone / Threat / etc.) o per-genus, con quote di mutation/level
  diverse. Ad oggi non esiste.
- **Naming `phases` vs `Forma`**: `phases` è snake_case, no display IT in tabella
  riassuntiva, label_it solo per phase singola. Style guide §"Forma" non chiarisce
  se "Forma" debba coprire anche lifecycle.

---

## 3. Style guide compliance check

`docs/core/00E-NAMING_STYLEGUIDE.md:310-314` **definisce solo Dimension 1**:

```text
### Forma / Form / form
- Prose IT + title canonical: `Forma` (MBTI-based 16 Forms)
- Code + YAML: `form` (EN lowercase) — `mbti_forms.yaml`, `form_seed_bias`
- Plurale IT: `Forme` (title case quando riferito al sistema 16 Forms)
```

Style guide **non copre Dimension 2** (lifecycle/anatomia). Eredità: termine `phases`
in YAML lifecycle, `lifecycle` come campo wrapper. Nessuna decisione canonica.

**Diverge**:
- `docs/core/22-FORME_BASE_16.md:16` cita `data/forms.yaml` ma file vero è
  `data/core/forms/mbti_forms.yaml` (path drift).
- `mbti_forms.yaml` non rispetta dual `display_name`/`display_name_en` (style guide
  richiede entrambi per entità player-facing).

---

## 4. Proposta naming canonical

### Decisione di stile chiave

**Tenere `Forma` riservato a Dimension 1 (MBTI temperament)**. Per Dimension 2
(anatomia/lifecycle) usare un termine distinto.

### Candidati Dimension 2

| Termine IT  | Termine EN | Pro                                        | Contro                                    |
| ----------- | ---------- | ------------------------------------------ | ----------------------------------------- |
| **Stadio**  | **Stage**  | Comune in biologia, scale numeriche stabilite | Generico                                  |
| Fase        | Phase      | Già in YAML (`phases:`)                    | Confonde con "round phase" combat         |
| Età         | Age        | Player-friendly                            | Non copre `legacy` (post-mortem)          |
| Era         | Era        | Evocativo                                  | Tipicamente storico, non biologico        |
| Forma       | Form       | Suggerito user                             | **Collide con Dimension 1 MBTI**          |

**Raccomandazione**: `Stadio` / `Stage` con numerazione romana **I-V** (5 stadi
canonical lifecycle). Numerazione I-X (10) richiederebbe schema nuovo non supportato.

### Naming finale proposto

#### Dimension 1 — Forma (16 MBTI)

Mantenere stato attuale + add `display_name_en`:

```yaml
INTJ:
  display_name_it: 'Stratega'      # rename label → display_name_it
  display_name_en: 'Strategist'    # NEW
  description_it: 'Pianificatore freddo, setup meticoloso, poche azioni ma decisive.'
  description_en: 'Cold planner...' # NEW
```

Player display: _"Forma Stratega (INTJ)"_ / _"Form Strategist (INTJ)"_.

#### Dimension 2 — Stadio (5 lifecycle, scala I-V)

Aggiungere `stage_index` (Roman/integer dual) + universalizzare schema:

```yaml
phases:
  hatchling:
    stage_index: 1            # NEW: 1..5
    stage_roman: 'I'          # NEW: I..V
    label_it: 'Cucciolo delle Dune'
    label_en: 'Dune Hatchling'
    stage_label_it: 'Schiusa'        # NEW: tier-name agnostic species
    stage_label_en: 'Hatching'       # NEW
    # ... resto come ora
```

**Tier label generici** (validi per ogni specie):

| Stadio | Roman | label_it (generico) | label_en (generico) | Skiv-specific label_it |
| ------ | ----- | ------------------- | ------------------- | ---------------------- |
| 1      | I     | Schiusa             | Hatching            | Cucciolo delle Dune    |
| 2      | II    | Giovanile           | Juvenile            | Predatore Giovane      |
| 3      | III   | Maturo              | Mature              | Predatore Maturo       |
| 4      | IV    | Apicale             | Apex                | Apex delle Dune        |
| 5      | V     | Eredità             | Legacy              | Memoria del Branco     |

Player display: _"Stadio III · Maturo"_ / _"Stage III · Mature"_ +
species-specific label come sottotitolo.

#### Dual-display proposto

Esempio scheda creatura sul phone:

```text
╭─ SKIV ─────────────────────────────────╮
│ Stadio III · Maturo                    │  ← Dimension 2 (anatomia)
│ Forma Analista (INTP)                  │  ← Dimension 1 (MBTI)
│ ━━━━━━━━━━                              │
│ Sentience: T2 · Pre-Sociale             │  ← scala specie cognitiva
│ Lv 4 · 1 mutation · 2 thoughts          │  ← gauges runtime
╰─────────────────────────────────────────╯
```

TV (silhouette + size scaling, già wirato QW4 PR #1863):
- Visualizza solo **Stadio** via sprite morphology.
- Tag overlay **Forma** opzionale (icona MBTI).

---

## 5. Effort migration

Se decidiamo `Forma` (16 MBTI) + `Stadio I-V` (5 lifecycle):

### File da rinominare/estendere

| File                                                   | Change                                                                            | Effort |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- | ------ |
| `docs/core/00E-NAMING_STYLEGUIDE.md`                   | Aggiungere §"Stadio / Stage / stage" speculare a §"Forma"                         | 30 min |
| `docs/core/22-FORME_BASE_16.md`                        | Sostituire stub con tabella completa + fix path `data/forms.yaml`                 | 1 h    |
| `data/core/forms/mbti_forms.yaml`                      | Aggiungere `display_name_en` + `description_en` per 16 entries                    | 1 h    |
| `data/core/species/dune_stalker_lifecycle.yaml`        | Aggiungere `stage_index` + `stage_roman` + `stage_label_*` per 5 phases           | 30 min |
| `data/core/species.yaml` (45 entries)                  | Opzionale: aggiungere campo `lifecycle_template` per cladi non Skiv (deferred)    | 4 h+   |
| `apps/backend/services/forms/formEvolution.js`         | No code change (term `form` resta), solo doc comment                              | 0      |
| `apps/backend/routes/skiv.js:148-243`                  | Frontend label "Lifecycle" → "Stadio"                                             | 15 min |
| `data/core/forms/form_pack_bias.yaml`                  | No change (code identifier resta)                                                 | 0      |
| **ADR**                                                | `docs/adr/ADR-2026-04-26-forme-stadio-naming.md` (rationale + migration policy)   | 1 h    |

**Effort totale** Phase A (style guide + ADR + Skiv 5 stadi + 16 form EN): **~4 ore**.
**Phase B** (universalizzare lifecycle template per altre 44 specie): **deferred**, schema design call necessaria (~6-9 h).

### Rischi

- **Schema breaking change** ZERO se aggiungiamo campi additivi (`display_name_en`,
  `stage_index`, `stage_roman`, `stage_label_*`). No rename di chiave esistente.
- **i18n**: dashboard / TV bundle devono leggere `display_name_it`/`display_name_en` —
  oggi `mbti_forms.yaml` espone solo `label`. Se rinomini `label` → `display_name_it`,
  rompi consumer. Patch: tenere `label` come alias deprecato + add `display_name_*`.

---

## 6. Domande per user (decisioni di stile bloccanti)

### Q1 — Scala stadi: 5 (I-V canonico Skiv) o 10 (proposta user)?

**Default raccomandato**: **5 stadi I-V**. Allinea a lifecycle Skiv già canonical e a
literature biology lifecycle (egg → larva → juvenile → adult → senescent). Scala 1-10
fonderebbe lifecycle per-individuo con sentience per-specie, anti-pattern.

**Opzione user**: se 10 stadi sono **per-specie** (sentience-like, complessità
anatomica vs cognitiva), proporre estensione T0-T6 sentience a 10 livelli oppure
nuova scala parallela `anatomy_tier A0-A9`. Big design call.

### Q2 — Termine Dimension 2: "Stadio" o altro?

**Default raccomandato**: `Stadio` IT / `Stage` EN. Letterario-biologico, no overlap
con altre meccaniche.

**Alternative** (se "Stadio" troppo tecnico):
- _Età_ (player-friendly ma non copre `legacy`)
- _Vita_ (es. _"Skiv in Terza Vita"_) — più lirico, MA collide con HP "vita"

### Q3 — Label Stadio vs label specie-specifica: due livelli o uno?

**Proposta**: **due livelli** (vedi §4 tabella). Tier generico (`Maturo`) + label
specie-specifica (`Predatore Maturo`).

**Alternativa minimale**: solo label specie-specifica (più lavoro per ogni nuova
specie, no template).

### Q4 — `display_name_en` 16 Forme MBTI: traduzione letterale o libera?

Esempio INTJ "Stratega" → "Strategist" (letterale) vs "Mastermind" (MBTI canonical
EN per INTJ). Letterale è consistente con style guide §pattern;
canonical MBTI è più riconoscibile internazionale.

**Default raccomandato**: traduzione letterale italiana → inglese (consistenza
brand). MBTI canonical EN come `display_name_en_alt` opzionale.

---

## 7. Riferimenti file-line

- Style guide: `docs/core/00E-NAMING_STYLEGUIDE.md:310-314` (sezione "Forma")
- 16 Forms label: `data/core/forms/mbti_forms.yaml:13-142`
- Pack bias: `data/core/forms/form_pack_bias.yaml:36-240`
- Stub doc: `docs/core/22-FORME_BASE_16.md:16`
- Lifecycle Skiv: `data/core/species/dune_stalker_lifecycle.yaml:54-185`
- Sentience scale: `docs/guide/README_SENTIENCE.md:19-35`
- Ennea archetypes: `packs/evo_tactics_pack/tools/py/ennea/themes.yaml:3-19`
- Form engine: `apps/backend/services/forms/formEvolution.js:48-80`
- Skiv route lifecycle render: `apps/backend/routes/skiv.js:123-246`

---

## 8. Conclusione

I due assi user (`16 MBTI` × `Forma I-X anatomica`) **sono entrambi necessari** ma
oggi nel repo:
- Asse 1 è **completo** (16 entries, engine M12 wired) ma con label IT-only.
- Asse 2 è **embrionale** (1 specie su 45 = Skiv) e usa termine `phases`/`lifecycle`
  non aggiornato a stylesheet.

**Raccomandazione netta**: prima di codice, chiudere **Q1+Q2** sopra (5 vs 10 stadi,
nome Dimension 2). Poi Phase A migration leggera ~4h. Phase B universalizzazione
lifecycle a 44 specie residue è **big design call** — meglio fare ADR separato.
