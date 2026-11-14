---
title: 'Identity Dimensions Reconciliation — 4 Dimensioni Cross-Specie'
workstream: cross-cutting
category: design-spec
doc_status: draft
doc_owner: master-dd
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 14
---

# Identity Dimensions Reconciliation — 4 Dimensioni Cross-Specie

**Data**: 2026-04-27 | **Mandato**: verificare coexistenza Dim 1-4, mappare scelte player, proporre schema branch evolutiva.

---

## 1. TL;DR (5 bullet)

1. **Tutte e 4 le dimensioni coesistono senza ridondanza**: misurano assi ortogonali (chi sei psicologicamente / quanto sei sviluppato anatomicamente / che "via" hai scelto al Nexus / quali trait condivide il branco). Nessuna coppia sostitutiva.
2. **Trait branco WIRED**: `zampe_a_molla` (T1, extra_damage sopraelevata), `pelle_elastomera` (T1, damage_reduction hit), `denti_seghettati` (T1, bleeding 2 turni) esistono tutte e tre in `data/core/traits/active_effects.yaml:21-142`. Dim 4 scatta quasi free.
3. **3 archetipi Agile/Robusta/Specializzata = diramazione branch evolutiva allo Stadio V** (mature early). Non mappa a Forma III/IV/V MBTI — quelle sono slot MBTI distinti. La branch è una scelta **anatomica** all'ingresso mature, ortogonale alla Forma psicologica.
4. **Player choice flow pulito**: Dim 2 (Form MBTI) all'onboarding, Dim 4 (Trait branco) allo start squadra, Dim 3 (Stadio) automatico, Dim 1 (Archetipo) al primo Nexus (Stadio V). 4 momenti distinti, zero conflitto temporale.
5. **Pattern industry multi-dim confermato**: Pokemon (species+Nature+IVs+EVs), CK3 (dynasty+religion+culture+traits), Wildermyth (class+personality+transformations), MHS3 (species+gene grid+ride form) tutti operano 4-5 dimensioni separate. Il rischio è la *surface* — risolvibile via display priority ladder (TV=2 dim, phone=4 dim).

---

## 2. Task 1 — Trait Branco: Wired Status

### Verifica `active_effects.yaml`

| Trait | Line | Tier | Category | Trigger | Effect | Status |
|---|---|---|---|---|---|---|
| `zampe_a_molla` | `:21` | T1 | fisiologico | attack, MoS≥5, posizione_sopraelevata | extra_damage +1 | ✅ wired |
| `pelle_elastomera` | `:38` | T1 | fisiologico | attack, on_result: hit (target) | damage_reduction -1 | ✅ wired |
| `denti_seghettati` | `:126` | T1 | fisiologico | attack, on_result: hit (actor) | apply_status bleeding 2 turni | ✅ wired |

**Conclusione**: Dim 4 (Trait Branco) può scattare quasi free — i 3 trait di start branco esistono già in pipeline.

**Gap residuo**: non esiste ancora la meccanica di "voto a maggioranza" che seleziona 1 trait su 3 e lo applica cross-squad. Questa logica è progettuale, non un trait. Effort stimato: ~2h (sessione player start → pick branco → apply a tutti). File target: `apps/backend/routes/session.js` `/start` handler o `apps/backend/services/combat/brancoPicker.js` (NEW).

**Nota su `form_pack_bias.yaml`**: `zampe_a_molla` compare anche in pack bias ISFP `:103` e ESTP `:136` come `trait_T1`, confermando rilevanza cross-forma.

---

## 3. Task 2 — Coexistence Matrix 4×4

Definizioni:
- **Ortogonale**: assi diversi, zero ridondanza
- **Sovrapposto**: misura parzialmente la stessa cosa (rischio)
- **Gerarchico**: una dipende dall'altra (sequenza)
- **Sostitutivo**: una rimpiazza l'altra

| | **16 MBTI Form** | **Stadio I-X** | **3 Archetipi** | **Trait Branco** |
|---|---|---|---|---|
| **16 MBTI Form** | — | **Ortogonale** (psy vs anatomico) | **Ortogonale** (psy vs tattico-anatom.) | **Ortogonale** (psy vs patrimonio branco) |
| **Stadio I-X** | Ortogonale | — | **Gerarchico** (Archetipo si sceglie a Stadio V) | **Ortogonale** |
| **3 Archetipi** | Ortogonale | Gerarchico (dipende da Stadio V unlock) | — | **Sovrapposto parziale** (vedi nota sotto) |
| **Trait Branco** | Ortogonale | Ortogonale | Sovrapposto parziale | — |

**Nota Archetipi vs Trait Branco (unica relazione non-pura)**:

Agile = mobilità; `zampe_a_molla` = extra damage da posizione sopraelevata. Overlap tattico *parziale* (entrambi favoriscono mobile play) ma non si misurano la stessa cosa. Archetipo = profilo permanente della creatura singola. Trait Branco = patrimonio condiviso cross-squadra. Non sostitutivi: un'unità Agile con branco `pelle_elastomera` è coerente. Rischio player: "perché ho scelto Agile se ho già un trait di mobilità?" → mitigazione via framing (Archetipo = identità della creatura, Trait Branco = dna della squadra).

**Verdict**: nessuna coppia puramente sostitutiva. 5 relazioni ortogonali, 2 gerarchiche (corrette per sequenza), 1 sovrapposto parziale (gestibile via framing).

---

## 4. Task 3 — Player Choice Flow

| Dim | Player sceglie? | Quando | Costo | Permanenza | Reversibile? |
|---|:---:|---|---|---|---|
| **16 MBTI Form** | Sì (pack roll d20) | Onboarding — start run | Gratis (pack iniziale) | Per run | Sì (evolve M12) |
| **Stadio I-X** | No — auto-progress | XP+mutations+thoughts gate | XP-driven (non PI) | Progressivo cumulativo | No (avanza solo) |
| **3 Archetipi** | Sì (1 scelta al Nexus) | Primo Nexus = Stadio V mature | 1 PI | Per run | No (permanente) |
| **Trait Branco** | Sì (squad-vote 3 carte) | Start squadra (pre-campagna) | Gratis | Campagna intera | No |

**Timeline player-facing**:

```
T0 — Start run:
    ↳ [Onboarding] Roll pack → Form MBTI scelto (Dim 2)
    ↳ [Squad start] Voto branco → 1 trait scelto cross-squad (Dim 4)

T1-T4 — Campagna early:
    ↳ Stadio I→II→III→IV auto-avanza (Dim 3, trasparente)

T5 — Primo Nexus (Stadio V / mature entry):
    ↳ [Nexus choice] Agile / Robusta / Specializzata → branch evolutiva (Dim 1)

T6-T10 — Campagna late:
    ↳ Stadio V→X auto-avanza (Dim 3, trasparente)
    ↳ Form MBTI può evolvere se soglia confidence (Dim 2, opzionale)
```

**Chiave**: player non può confondere le scelte — Dim 2 e Dim 4 avvengono all'onboarding/start, Dim 1 al primo Nexus mature, Dim 3 mai. 3 momenti di scelta separati nel tempo.

---

## 5. Task 4 — Industry Pattern Multi-Dimensione Identità

Cinque giochi con 4+ dimensioni identità coesistenti senza conflitto:

### Pokemon (Game Freak, 1996-2026)

5 dimensioni: species (base stat fissi) + Nature (moltiplicatore 1.1/0.9 su 2 stat) + IVs (0-31 genetici fissi) + EVs (0-252 allenamento, cap 510 totale) + Form mega/gigantamax.

Il Nature corrisponde agli Archetipi: scelta d'identità che amplifica un asse. IVs = patrimonio genetico immutabile = Trait Branco (eredità condivisa). Stadio evolutivo = evolution via stone/level. MBTI Form non esiste (absence is ok — Pokemon ha meno psicologia e più combat-build).

Fonte: [Bulbapedia IVs](https://bulbapedia.bulbagarden.net/wiki/Individual_values) · [Smogon EVs history](https://www.smogon.com/smog/issue28/evs_ivs)

### Monster Hunter Stories 3 (Capcom, 2025)

4 dimensioni: species (base stat fissi) + gene grid 3×3 (9 slot acquisibili) + ride form (aspetto tattico) + breeding lineage. Gene grid cap fisso = leggibilità cognitiva preservata. Ride form = scelta del player su come usare il Monstie. Non conflitto ma sinergia.

Fonte: [GAMES.GG MHS3 Genetics](https://games.gg/monster-hunter-stories-3-twisted-reflection/guides/monster-hunter-stories-3-monstie-genetics-breeding-guide/) · [Kiranico gene db](https://mhst.kiranico.com/gene)

### Crusader Kings 3 (Paradox, 2020)

5 dimensioni: dynasty (gerarchia) + religion + culture + congenital traits (genetici, immutabili) + lifestyle traits (acquisiti, max 5). Congenital = Trait Branco (ereditarietà di clan). Lifestyle = Forma MBTI (acquisita via comportamento). Culture+religion = biome affinity. Dynasty = lineage_id Skiv. 5 dimensioni, zero confusione: ogni scatta in momento diverso del ciclo di vita.

Fonte: [CK3 Wiki Traits](https://ck3.paradoxwikis.com/Traits) · [Paradox Dev Diary #58 stress traits](https://forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-58-stre-ss-tching-the-traits.1472092/)

### Wildermyth (Worldwalker Games, 2021)

4 dimensioni: class (job fisso) + 11 personality scores (fluidi da scelte narrative) + transformations (mutations cumulative permanenti) + chapter scars (visual+stat). Personality = Forma MBTI (fluida). Transformations = Stadio + mutations. Scars = Trait Branco (permanenti, condivisi a livello di campagna). Class = archetipo fisso al setup.

Fonte: [Wildermyth Image layers wiki](https://wildermyth.com/wiki/Image_layers) · [Wildermyth Transformation wiki](https://wildermyth.com/wiki/Category:Transformation)

### Path of Exile (GGG, 2013)

4 dimensioni: class (Marauder/Ranger/etc.) + ascendancy (specializzazione a Act 10) + passive tree (build libera) + item affixes. Class = species. Ascendancy = 3 Archetipi: scelta **una volta sola**, in un momento preciso della progressione, che redirige la build. Passive tree = Stadio (auto-avanza con XP). Item affixes = Trait Branco (condivisi o acquistati).

Fonte: [PoE Ascendancy Guide](https://www.pathofexile.com/ascendancy) · [Wiki Ascendancy Classes](https://www.poewiki.net/wiki/Ascendancy_class)

**Pattern comune industry**: le dimensioni non conflittano perché sono *scaglionate nel tempo* (onboarding / milestone gate / late-game) e misurano assi diversi (genetica / psicologia / anatomia / patrimonio branco). Il giocatore non percepisce "troppo" perché ogni scelta è isolata temporalmente.

---

## 6. Task 5 — 3 Archetipi + Stadio Mapping: Branch Evolutiva

### Problema v3.2 N1

V3.2 dice Agile→Forma III, Robusta→Forma IV, Specializzata→Forma V. Questo crea conflitto con le 16 MBTI Forms (Forma I-XVI sono MBTI, NON anatomia). La naming collision è risolta da `docs/core/00E-NAMING_STYLEGUIDE.md:310-314` (Forma riservato MBTI, Stadio per anatomia).

**Conclusione**: i 3 archetipi NON sono "Forma III/IV/V" nel senso MBTI. Sono *varianti di branch evolutiva* all'interno dello Stadio V-VI (mature).

### Schema Branch Evolutiva Proposta

I 3 archetipi diventano un campo `evolutionary_branch` che si attiva all'ingresso in Stadio V (mature early):

```yaml
# Estensione additive a dune_stalker_lifecycle.yaml
# Nel blocco phases.mature oppure come top-level field

evolutionary_branches:
  trigger_stage: 5          # Stadio V = mature early
  trigger_event: nexus_01   # primo Nexus visit
  cost_pi: 1
  permanent: true
  branches:
    agile:
      label_it: "Stalker Agile"
      label_en: "Agile Stalker"
      tactical_bonus:
        movement_bonus: 1
        silent_step_range: +1
      stat_modifier:
        speed: +1
      aspect_overlay_it: "Corpo filato, arti anteriori allungati, postura bassa."
      mbti_affinity: [ISTP, ISFP, ESTP, ENTP]   # SP+NT che valorizzano mobilità
    robusta:
      label_it: "Stalker Robusta"
      label_en: "Robust Stalker"
      tactical_bonus:
        damage_reduction_passive: 1
        hp_bonus: 2
      stat_modifier:
        hp: +2
      aspect_overlay_it: "Massa corporea aumentata, scaglie ispessite, postura eretta."
      mbti_affinity: [ISTJ, ISFJ, ESTJ, ESFJ]   # SJ che valorizzano difesa
    specializzata:
      label_it: "Stalker Specializzata"
      label_en: "Specialized Stalker"
      tactical_bonus:
        vc_axis_amplifier: 0.15   # amplifica asse VC dominante del form
        thought_cabinet_slots: +1
      stat_modifier: {}
      aspect_overlay_it: "Mutation dominante amplificata visivamente; forma asimmetrica."
      mbti_affinity: [INTJ, INTP, INFJ, INFP]   # NI/NE che valorizzano la forma psico
```

### Relazione con Stadio I-X (`docs/planning/2026-04-27-forme-10-stadi-naming-spec.md:70-97`)

| Stadio | Macro-fase | Branch disponibile? | Note |
|---|---|---|---|
| I-IV | hatchling/juvenile | No | Troppo presto, identità non consolidata |
| V | mature (early) | **Sì — scelta avviene qui** | Nexus 01, costo 1 PI |
| VI-X | mature late / apex / legacy | No (post-scelta) | Branch permanente, solo evoluzioni downstream |

Compatibilità con `dune_stalker_lifecycle.yaml:109-131` (mature: `mutations_required:1`, `mbti_polarity_required:true`): la branch può essere richiesta solo se mbti_polarity stable, coerente — la creatura deve avere identità psicologica prima di scegliere via anatomica.

### Tactical Correlate (Anti-pattern guard)

Per non violare la regola "no aspetto cosmetic-only senza tactical correlato" (agent `creature-aspect-illuminator.md`):

| Branch | Tactical | Aspetto visivo | Tactical correlato |
|---|---|---|---|
| Agile | +1 movement, +1 silent_step | Corpo filato, arti lunghi | ✅ si (mobility buff) |
| Robusta | -1 damage taken, +2 HP | Massa, scaglie spesse | ✅ si (defense buff) |
| Specializzata | VC axis +15%, +1 Cabinet slot | Mutation visivamente dominante | ✅ si (psy amplification) |

---

## 7. Recommendation — Layout Scheda Creatura Player-Facing

### Verdict Coexistenza

**ALL_4_COEXIST** — le 4 dimensioni sono ortogonali, scaglionate nel tempo, con tactical correlate distinte. Nessuna da droppare.

### Scheda creatura player-facing (priority ladder)

Seguendo il pattern `display_priority` da `docs/planning/2026-04-27-forme-10-stadi-naming-spec.md:237-248`:

**TV canvas (render.js, grande distanza)**:
```
Riga 1:  "[species_label_it] · Stadio [roman]"      → "Predatore Maturo · Stadio VI"
Riga 2:  "[forma_mbti.code] · [branch]"              → "INTP · Agile"
Badge:   clade_tag + mutation dots (N dot)           → [APEX] ●●
```

**Phone overlay (skivPanel.js, piccola distanza)**:
```
Header:  "Skiv · Stadio VI · Predatore Maturo"
Line 1:  "Forma Analista (INTP) — Agile"
Line 2:  "T2 Pre-Sociale · Branco: zampe_a_molla"
Line 3:  "Adattato Savana · 1 mutazione"
Footer:  "Lv 5 · 2/3 Cabinet · 42 PE"
```

**Full debug (API `/api/creature/:id/card`)**:
```
Skiv (Stadio VI · Predatore Maturo) — Forma Analista (INTP) —
Branch Agile — T2 Pre-Sociale — Branco: zampe_a_molla —
Lineage KRNA-3 — Adattato Savana — 1 mutazione
```

### Regole display

- TV: max 2 dimensioni in primo piano (Stadio + Forma). Branch come suffisso alla Forma.
- Phone: max 4 righe. Branco in riga 2 (dopo Forma). Lineage solo su inspect.
- Anti-pattern "label spam": NON concatenare tutte e 4 dimensioni in UI runtime. Solo debug/export.

### File da estendere (Phase A, ~3-4h extra)

| File | Change | Effort | Breaking? |
|---|---|---|---|
| `data/core/species/dune_stalker_lifecycle.yaml` | ADD `evolutionary_branches` block | 1h | NO |
| `apps/backend/services/forms/brancoPicker.js` (NEW) | Squad-vote logic + `apply_branco_trait` | 2h | NO |
| `apps/backend/routes/session.js` `/start` | Wire brancoPicker on session start | 30min | NO |
| `apps/play/src/skivPanel.js` | Header update: Stadio VI + Branch label | 30min | NO |

**Dipendenze**: Phase A di `docs/planning/2026-04-27-forme-10-stadi-naming-spec.md` (sub_stages in lifecycle YAML) deve essere shipmento prima o in parallelo.

---

## Riferimenti File:line

- Trait branco wired: `data/core/traits/active_effects.yaml:21` (zampe_a_molla), `:38` (pelle_elastomera), `:126` (denti_seghettati)
- MBTI Forms 16: `data/core/forms/mbti_forms.yaml:11-142`
- Form pack bias: `data/core/forms/form_pack_bias.yaml:103,136` (zampe_a_molla cross-form)
- Stadio I-X spec: `docs/planning/2026-04-27-forme-10-stadi-naming-spec.md:70-97` (mapping 10 stadi)
- Lifecycle Skiv 5 fasi: `data/core/species/dune_stalker_lifecycle.yaml:54-185`
- Mature phase gating: `data/core/species/dune_stalker_lifecycle.yaml:106-131`
- Form engine M12: `apps/backend/services/forms/formEvolution.js:48-80`
- Creature emergence audit: `docs/reports/2026-04-26-creature-emergence-audit.md:24-60`
- Stat hybrid research: `docs/reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md:38-73`
- 5axes UI research (Agile/Robusto derivation): `docs/reports/2026-04-27-5axes-ui-mapping-research.md:21-23`
- Style guide Forma vs Stadio: `docs/core/00E-NAMING_STYLEGUIDE.md:310-314`
