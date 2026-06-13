---
title: "Deep Analysis — Creature / Species / Forme / Lifecycle"
date: 2026-04-26
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: 2026-04-26
source_of_truth: false
language: it
review_cycle_days: 30
tags: [audit, creature, lifecycle, forms, mutations, skiv, gaps]
---

# Deep Analysis — Creature / Species / Forme / Lifecycle

> Audit mode (--mode audit). Museum consultato. Corpus letto. 6 GAP concreti.

---

## Snapshot stato reale (2026-04-26)

| Sistema | Shipped | Runtime wired | Visual integration |
|---|---|---|---|
| Lifecycle Skiv (dune_stalker) | `data/core/species/dune_stalker_lifecycle.yaml` — 5 fasi + mutation_morphology + mbti_aspect_correlates | `/api/skiv/card` legge fasi, sprint ASCII per fase, lifecycle bar testo | `skivPanel.js` mostra lifecycle bar HTML; `render.js` NESSUN ring/dot canvas |
| Lifecycle altri 44 species | 0 file YAML | 0 | 0 |
| 16 MBTI Forms | `data/core/forms/mbti_forms.yaml` — 16 tipi, job_affinities, baseline axes | `formEvolution.js` engine + 10 endpoint REST live (M12) | `formsPanel.js` overlay 16 card — NESSUN physical_correlate / posture |
| 30 Mutations catalog | `data/core/mutations/mutation_catalog.yaml` — 30 entries, mbti_alignment, tier | `mutationCatalogLoader.js` + 4 endpoint `/mutations/*` (M14, foundation) | ZERO aspect_token / visual_swap_it su nessuna mutation |
| 18 Thoughts MBTI | `data/core/thoughts/mbti_thoughts.yaml` — 18 thoughts, effect_bonus/cost | `thoughtCabinet.js` live (Phase 2 PR #1769) | ZERO aspect_token / portrait_overlay su nessun thought |
| Jobs expansion (4 job, 48 perks) | `data/core/jobs_expansion.yaml` | `jobsLoader + progressionLoader` live (PR #1795) | ZERO physical_correlate nei perks |

---

## GAP-1 — P0: 44/45 species hanno 0 lifecycle file

**File:line**: `data/core/species/` (solo `dune_stalker_lifecycle.yaml` presente)

**Reality**: Species YAML ha 15 specie (`grep -c "^  - id:"` = 15). Nessuna delle restanti 14 (né le 30 in expansion) ha file lifecycle dedicato. Gating rules, visual aspect, mutation_morphology, narrative_beat_it — tutti assenti.

**Pattern-da-applicare**: P0 Wildermyth layered portraits. Ogni specie canonical richiede: `phases[]` con `level_range`, `mutations_required`, `thoughts_internalized_required`, `aspect_it`, `sprite_ascii`, `tactical_signature`, `diary_milestone_event`.

**Concrete change**:
- Priorità 1: genera stub lifecycle per le 14 specie in `species.yaml` con schema minimo (5 fasi, gating numerico derivato dal `weight_budget` + `sentience_tier` esistenti).
- Script: `tools/py/seed_lifecycle_stub.py` — legge `data/core/species.yaml`, emette `data/core/species/<species_id>_lifecycle.yaml` con placeholder `aspect_it: "[DRAFT]"`.
- Effort: ~3h (script + 14 stub + linter rule).

**Dependencies**: nessuna (additive puro).

---

## GAP-2 — P0: 30/30 mutations senza `aspect_token` + `visual_swap_it`

**File:line**: `data/core/mutations/mutation_catalog.yaml` — tutte le 30 entries (riga 20 in poi)

**Reality**: Schema attuale ha `mbti_alignment`, `tier`, `category`, `biome_boost/penalty`, `description_it`. Zero campi visivi. I 4 campi che il lifecycle Skiv definisce nella sezione `mutation_morphology` (`visual_swap_it`, `phase_unlock`, `aspect_token`) non esistono nel catalog globale.

**Pattern-da-applicare**: P0 Wildermyth permanent visible change (linter rule). Anti-pattern guard attivo: "Mutation senza visual_swap → linter rule violata."

**Concrete change**:
- Aggiungere a ogni mutation entry:
  ```yaml
  aspect_token: "<snake_case_visual_id>"      # es. "claws_glacial"
  visual_swap_it: "<prose fisica della trasformazione>"
  phase_unlock: <hatchling|juvenile|mature|apex|legacy>
  ```
- Nuovo linter `tools/py/lint_mutations.py` — verifica presenza 3 campi; severity ERROR se mancanti (bloccante CI).
- 4 mutations hanno già `visual_swap_it` in `dune_stalker_lifecycle.yaml:mutation_morphology` — riusa come template.
- Effort: ~4h (linter ~1h + backfill 30 mutations ~3h, authoring budget alto ma testo breve).

**Dependencies**: GAP-1 risolto aiuta a identificare `phase_unlock` coerente per species non-Skiv.

---

## GAP-3 — P0: `render.js` senza lifecycle ring + mutation dots (canvas gap)

**File:line**: `apps/play/src/render.js:251` (`drawUnit()`) + `render.js:71` (`drawUnitBody()`)

**Reality**: `drawUnit()` disegna: outer job ring + inner faction circle + label + selected/target ring + status icons. Nessun `drawLifecycleRing()`. Nessun `drawMutationDots()`. La `skivPanel.js` mostra lifecycle bar testuale HTML, ma i tile in-combat sono ignari della fase.

**Pattern-da-applicare**: P0 Wildermyth layered portraits. Research doc `2026-04-25-skiv-lifecycle-visual-research.md` ha già il design concreto (pattern §1):
- `drawLifecycleRing(ctx, unit, cx, cy)` — terzo cerchio concentrico esterno al job ring, colore per fase: hatchling=#c8c8c8, juvenile=#c4a574, mature=#e67e22, apex=#1a1a2e con glow, legacy=#9e9e9e.
- `drawMutationDots(ctx, unit, cx, cy)` — 1 punto per mutation, posizioni ore 2/4/6, colore per category: physiological=amber, behavioral=blue, sensorial=teal. Max 3 dots a CELL=40.

**Concrete change**:
- `apps/play/src/render.js` — aggiungi 2 funzioni post `drawUnitBody` (stimato +40 LOC).
- `drawUnit()` chiama entrambe se `unit.lifecycle_phase` o `unit.mutations` presente nel payload.
- Backend: `/api/session/state` deve includere `lifecycle_phase` + `mutations[]` per ogni unit. Check `sessionHelpers.js` se già esposti (probabile: no).
- Effort: ~3h render + ~2h backend expose = ~5h totale.

**Dependencies**: GAP-2 richiesto per colori `category`. GAP-1 non necessario.

---

## GAP-4 — P1: 16 MBTI forms senza `physical_correlate` / posture canvas overlay

**File:line**: `data/core/forms/mbti_forms.yaml:1-60` (tutte le 16 forme)

**Reality**: Le 16 forme hanno `axes`, `job_affinities`, `job_penalties`, `temperament`. Zero `physical_correlate` (postura, vocal pattern, comportamento visivo). Il file `dune_stalker_lifecycle.yaml:mbti_aspect_correlates` (righe 226-233) ha già il mapping 8 poli → postura testuale (I_high: "Postura chiusa, silenzioso, orecchie verso interno"). Questo dato NON è stato portato in `mbti_forms.yaml` né in runtime.

**Pattern-da-applicare**: P0 Caves of Qud morphotype gating. Anti-pattern guard: "MBTI form senza polarity stable → fino a tier1 dead-band 0.35-0.65 NESSUN visual change."

**Concrete change**:
- `data/core/forms/mbti_forms.yaml` — aggiungi per ogni forma:
  ```yaml
  physical_correlate_it: "<1 frase postura + comportamento visivo>"
  canvas_posture_token: "<enum: open|closed|alert|flowing|rigid|adaptive>"
  ```
- `apps/play/src/render.js` — usa `canvas_posture_token` per micro-variazione in `drawUnitBody`: offset verticale corpo (+1px per `open`, -1px per `closed`) + orecchio sprite variant se disponibile.
- Dead-band enforcement: cambia visual solo se VC axis confidence ≥ tier1 (già definito in `vcScoring.js`).
- Effort: ~2h YAML backfill (16 forme × 1 riga) + ~3h render micro-variant = ~5h.

**Dependencies**: GAP-3 prerequisito (drawUnit già modificato per lifecycle ring).

---

## GAP-5 — P1: 18 Thought Cabinet thoughts senza `aspect_token` / portrait_overlay

**File:line**: `data/core/thoughts/mbti_thoughts.yaml` — 18 entries (tutte senza `aspect_token`)

**Reality**: `mbti_thoughts.yaml` ha `effect_bonus`, `effect_cost`, `research_cost_encounters` (Phase 2, PR #1769). Zero `aspect_token` (es. `eyes_inward` per `i_osservatore`). `thoughtsPanel.js` mostra slot count + title text — nessun overlay portrait correlato.

**Pattern-da-applicare**: P0 Disco Elysium Thought Cabinet portrait correlate. Research doc cita: "ogni thought_id → `aspect_token` (es. `i_osservatore` → `eyes_inward`)". Cap visivo: 3 overlay max simultaneous (Disco pattern: only equipped slot).

**Concrete change**:
- `data/core/thoughts/mbti_thoughts.yaml` — aggiungi `aspect_token` a ogni thought (es. `e_voce_collettiva` → `ears_outward`, `i_osservatore` → `eyes_inward`).
- `apps/play/src/thoughtsPanel.js` (473 LOC) — internalized thoughts con `aspect_token` → inject `data-aspect="{token}"` su element; CSS usa attr per micro-styling bordo slot.
- `apps/play/src/render.js` — `drawUnit()` legge `unit.cabinet.internalized[]`, inietta max 3 aspetti come icone miniatura a 9/11/1 ore del lifecycle ring.
- Effort: ~2h YAML backfill + ~3h UI wire = ~5h.

**Dependencies**: GAP-3 prerequisito (lifecycle ring è il target overlay).

---

## GAP-6 — P2: jobs_expansion perks senza `physical_correlate`

**File:line**: `data/core/jobs_expansion.yaml:278-599` (perks section, 4 job × 12 perks = 48 perks)

**Reality**: Perks hanno `passive { tag, payload }`, `stat_bonus`, `ability_mod`. Nessun `physical_correlate` (cosa cambia visivamente nella creatura quando il perk è acquisito). Gap meno urgente perché il player vede il perk in `progressionPanel.js` come testo stat, ma non come corpo che cambia.

**Pattern-da-applicare**: P2 Wildermyth permanent visible change ("narrative anchor"). Anti-pattern: "Aspetto cosmetic-only senza tactical correlate" — qui è l'inverso: tactical change senza visual correlate.

**Concrete change**:
- `data/core/jobs_expansion.yaml` — aggiungi `physical_correlate_it: "<1 frase>"` per ogni perk.
- `apps/play/src/progressionPanel.js` — mostra la frase nel tooltip perk, sopra la stat bonus.
- Effort: ~3h YAML authoring (48 perks × 1 frase) + ~1h UI wire = ~4h.

**Dependencies**: nessuna (additive puro, gap puramente narrativo).

---

## Top-3 priorita' con effort sum

| Rank | GAP | Severity | Effort | Blocca |
|---|---|---|---|---|
| 1 | GAP-2 — mutations senza visual_swap + linter | P0 | ~4h | ship linter subito, authoring parallelizzabile |
| 2 | GAP-3 — render.js lifecycle ring + mutation dots | P0 | ~5h | player gameplay, impatto immediato |
| 3 | GAP-1 — 44 species senza lifecycle YAML | P0 | ~3h (stub script) | prerequisito scalabilita' sistema |

Effort sum top-3: **~12h**.

---

## Reuse path da pattern library

| Pattern | GAP coperto | Note |
|---|---|---|
| Wildermyth layered portraits (P0) | GAP-3 (ring+dots) | `drawLifecycleRing` / `drawMutationDots` già spec in research doc |
| Wildermyth permanent visible change (P0) | GAP-2 (linter) | `lint_mutations.py` nuovo file, logica semplice |
| Caves of Qud morphotype gating (P0) | GAP-4 (MBTI posture) | `mbti_pool` field su mutations già suggerito in research doc; `physical_correlate` su forms è nuovo |
| Disco Elysium Thought Cabinet (P0) | GAP-5 (thoughts overlay) | `aspect_token` → canvas ring overlay, cap 3 |
| Hades Weapon Aspects (P1) | mature→apex modal | già spec in research doc §4; non in top-3 ma quick win ~2h |
| Subnautica habitat lifecycle (P1) | `lifecycle_biome_expansion` field | schema gap minore, deferred dopo top-3 |

---

## Anti-pattern guard list (violazioni rilevate)

- [ATTIVO] Mutation senza visual_swap → 30/30 violations (GAP-2)
- [ATTIVO] MBTI form senza physical correlate → 16/16 violations (GAP-4)
- [ATTIVO] Phase boundary invisibile su render canvas → 0 lifecycle rings (GAP-3)
- [ATTIVO] Thoughts internalized senza portrait overlay → 18/18 violations (GAP-5)
- [OK] Legacy come trasmissione non morte → `dune_stalker_lifecycle.yaml:legacy.narrative_beat_it` corretto
- [OK] MBTI dead-band enforcement → definito in `mbti_aspect_correlates` (polarity_required: true su mature+)
- [OK] Gating rule stabile → lifecycle gating dune_stalker: Lv + mutations + thoughts + polarity, non singolo gate

---

## Frontmatter governance

- `dune_stalker_lifecycle.yaml` — YAML, non `.md`, non soggetto a governance frontmatter MD.
- `docs/reports/2026-04-26-deep-analysis-creature.md` (questo file) — frontmatter presente e compliant.
- `docs/planning/2026-04-25-skiv-aspect-evolution.md` — `doc_status: draft`, corretto (concept non canonical).
- `docs/research/2026-04-25-skiv-lifecycle-visual-research.md` — frontmatter compliant (active, source_of_truth: false).
- `data/core/mutations/mutation_catalog.yaml`, `data/core/forms/mbti_forms.yaml`, `data/core/thoughts/mbti_thoughts.yaml` — YAML data files, no governance requirement.
- Nessuna violazione governance rilevata in corpus creature-domain.

---

## Escalation path

- Schema change `species.yaml` → `schema-ripple` agent
- Performance GAP-3 multi-creature scene → `session-debugger` per runtime measurement
- Narrative beats `aspect_it` + `narrative_beat_it` per 44 specie → `narrative-design-illuminator`
- UI canvas 10-foot rule + accessibility per lifecycle ring → `ui-design-illuminator`
