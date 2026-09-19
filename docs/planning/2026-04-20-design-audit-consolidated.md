---
title: 'Design audit consolidato 2026-04-20 — 4-agent deep audit'
workstream: planning
category: retrospective
status: published
owner: master-dd
created: 2026-04-20
tags:
  - audit
  - design-gaps
  - canonical
  - 4-agent-parallel
  - 75-questions
related:
  - docs/planning/2026-04-20-pilastri-reality-audit.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
  - docs/core/00-SOURCE-OF-TRUTH.md
  - docs/core/90-FINAL-DESIGN-FREEZE.md
  - memory:project_gdd_open_questions.md
---

# Design audit consolidato — 4-agent deep audit

## TL;DR

**4 agent parallel** (structural scan + internal consistency + clarity unclear + deep topic dive) su `docs/core/` (33 file, 6940 LOC) + `docs/adr/` (25 file, 4121 LOC).

### Risultati aggregati

| Axis            | Findings                                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structural**  | 13/33 core file STUB (39%) · P6 Pilastro non definito in canonical · 3 GDD sezioni MISSING (Audio/Art/Appendix) · 18+ ADR unresolved                                                   |
| **Consistency** | PT semantica doppia (token vs budget) · PP=3 vs Ultimate PP≥10 · Affinity -2..+2 vs -3..+3 · Grid 8/12/16 vs 6/8/10 · Python rules engine flag stale                                   |
| **Clarity**     | 75 domande design intent aperte · Form transitions HANDWAVE · Ennea numeri buff ZERO · Reactions cap undocumented                                                                      |
| **Topic gaps**  | Campaign structure ZERO doc + ZERO impl (P0 absolute) · Biome runtime gap (Python only deprecato consume terrain_defense) · Mating scale conflict Canvas D vs Freeze · Nido slice only |

### Verdict

CLAUDE.md status inflation era **iceberg tip**. Design spec ha gap strutturali + terminology drift + 75 open questions. Pre-sprint M9-M11 serve chiudere almeno P0 questions (Campaign + Economy + Canonical SoT).

---

## 1. Structural gaps (Agent 1)

### GDD 13-section coverage matrix

| #   | Section            |    State    | Coverage | Gap                                                |
| --- | ------------------ | :---------: | -------: | -------------------------------------------------- |
| 1   | Overview/Vision    |    FULL     |     100% | —                                                  |
| 2   | Version History    |    FULL     |     100% | —                                                  |
| 3   | Game Overview      |    STUB     |      60% | Target audience personas unvalidated               |
| 4   | Gameplay/Mechanics |    FULL     |      90% | Save/Load undefined                                |
| 5   | Story/Character    |    STUB     |      40% | Narrative plot arc absent, NPC hooks missing       |
| 6   | Levels             |   PARTIAL   |      70% | Only 1 tutorial level, no difficulty curve formula |
| 7   | Interface          |   PARTIAL   |      65% | Audio design absent, control mapping partial       |
| 8   | AI                 |   STRONG    |      85% | Player hint system undocumented                    |
| 9   | Technical          |   PARTIAL   |      60% | Hardware req + perf targets absent                 |
| 10  | Art                |    STUB     |      45% | Concept art inventory absent                       |
| 11  | **Audio**          |  **STUB**   |  **30%** | Sound design + music spec absent                   |
| 12  | Management         |   PARTIAL   |      50% | QA test plan + risk matrix absent                  |
| 13  | **Appendices**     | **MISSING** |   **0%** | Asset inventory + glossary unpublished             |

### Pilastri coverage canonical (contraddizione)

- `docs/core/02-PILASTRI.md` lista **5 Pilastri** (non 6 come CLAUDE.md)
- P6 Fairness: mentioned ma **non definito in canonical**

### Top 10 structural gaps

**P0 — Blocking playtest**:

1. Encounter design taxonomy (1 tutorial only, no difficulty curve)
2. Narrative arc framework (debrief lacks emotional beats)
3. Accessibility WCAG 2.1 AA test plan (TV-first claim unvalidated)
4. Creature evolution visual specs (Pilastro 2 ungrounded)
5. Save/Load system specification (co-op save sync missing)

**P1 — M4 milestone**: 6. Audio design (composer can't start) 7. Networking ADR PROPOSED only (backend sprint stalled) 8. Playable encounter count <5 9. QA test plan absent 10. Asset inventory undefined

### Stub density

13/33 core docs (39%) sono stub <50 LOC:

- 01-VISIONE (14L), 02-PILASTRI (18L), 03-LOOP (17L), 10-SISTEMA_TATTICO (20L), 20-SPECIE_E_PARTI (20L), **22-FORME_BASE_16 (16L, points to forms.yaml che non esiste**), 24-TELEMETRIA_VC (18L), 25-REGOLE_SBLOCCO_PE (16L), 27-MATING_NIDO (18L), 28-NPC_BIOMI_SPAWN (17L), 30-UI_TV_IDENTITA (17L), 40-ROADMAP (17L), Mating-Reclutamento-Nido (49L)

---

## 2. Internal consistency (Agent 2)

### Top 10 contradictions cross-doc

1. **PT semantica doppia** — `10-SISTEMA_TATTICO` dice "Punti Tecnica da crit/MoS", `90-FREEZE §7.2` dice "budget azione tattica 3/turno". Incompatibili.
2. **Grid decision** — ADR-2026-04-16 accepted hex axial, `00-SoT §14.1` ancora "decisione aperta", `15-LEVEL_DESIGN` usa "8×8/12×12/16×16" (square pre-ADR).
3. **Python rules engine** — CLAUDE.md + ADR-04-19 deprecato, MA `00-SoT §13.2` + `90-FREEZE §7.3` ancora lo dichiarano canonico.
4. **MoS step cap** — `00-SoT §13.2` cap=6, `10-SISTEMA` + `11-REGOLE` non menzionano.
5. **Pressure tier count** — `00F-ART_AUDIO` dice 3 (Calm/Tense/Apex), SoT + reinforcement ADR dice 5.
6. **Trait tier scale intra-doc** — `Guida_Evo:106` dice T1-T5, `Guida_Evo:358` dice T1-T6 (same file!).
7. **AP vs PT budget** — AP=2 canonical, PT=3/turno (se PT=budget) = contraddizione.
8. **Tutorial 01 AP eccezione** — `11-REGOLE:57` dice ap_max=3 eccezione, `00-SoT` non ha nota.
9. **Status system** — `10-SISTEMA` 5 status IT (Sanguinamento/Frattura/etc.), `00-SoT` + `00-GDD_MASTER` 7-8 status EN.
10. **Affinity/Trust scale** — `Mating-Reclutamento-Nido.md` -3..+3, `Freeze §20` -2..+2 + 0..5.

### Terminology drift

| Termine                     | Variants                     | SoT raccomandata                                        |
| --------------------------- | ---------------------------- | ------------------------------------------------------- |
| Sistema/SIS/AI              | 15/3/1 occurrences           | `Sistema` docs, `SIS` tabelle, `AI` code                |
| PT                          | 2 meanings (token vs budget) | **OPEN_QUESTION Q1**                                    |
| PE/PI/PP/SG                 | overloading                  | **OPEN_QUESTION Q2**: serve glossario economie canonico |
| encounter/scenario/missione | 3 usage contexts             | `encounter` code, `missione` IT prose                   |
| archetype/archetipo         | IT/EN mix                    | code EN, prose IT (conventional OK)                     |

### ADR drift (5 recent ACCEPTED non propagated)

- ADR-04-16 hex-axial → SoT §14.1 + 15-LEVEL stale
- ADR-04-17 coop-scaling → 15-LEVEL non aggiornato ai 11 modulation
- ADR-04-19 kill-python → SoT §13.2 + Freeze §7.3 stale
- ADR-04-19 resistance-convention → SoT menziona ma no 100-neutral spec
- ADR-04-20 damage-curves → nessun core doc menziona class curves

---

## 3. Clarity — 75 design questions (Agent 3)

Classificazione **FULL/PARTIAL/HANDWAVE/ZERO** per 15 mechanic-groups:

| Mechanic                  |  Class   | Gap                                    |
| ------------------------- | :------: | -------------------------------------- |
| 1. Sistema Pressure tiers | PARTIAL  | Visibility HUD + reset semantics       |
| 2. Focus-fire combo       | PARTIAL  | Chain cap + diminishing + cross-round  |
| 3. Mating d20 table       | PARTIAL  | Scale conflict + DC formula            |
| 4. PI Pacchetti pricing   | PARTIAL  | Earning rate + cap + overflow          |
| 5. Form transitions       | HANDWAVE | Trigger + cost + threshold             |
| 6. Ennea theme effects    | PARTIAL  | Trigger conditions + buff values       |
| 7. Reactions cap/trigger  | PARTIAL  | Cap=1 hardcoded non in doc             |
| 8. Hazard tiles           | PARTIAL  | Duration + scaling + status            |
| 9. Squad affinity/trust   |   ZERO   | Distinct from NPG trust?               |
| 10. Campaign structure    |   ZERO   | Save + branching + carry-over          |
| 11. Economy PE/PT/PI      | PARTIAL  | Formula earning + cap + contradictions |
| 12. Character progression |   ZERO   | Level curves + perk choice             |
| 13. Reclutamento d20      | PARTIAL  | Probabilistic vs threshold             |
| 14. Biome ecosystem       | PARTIAL  | Numbers to formulas                    |
| 15. Timeout/defeat        | PARTIAL  | Per-type outcome variation             |

### 75 questions batched by priority

**BLOCKING P0 (must answer before M9 kickoff real work)**:

Q46. Save model: SQLite locale o cloud? Co-op sync protocol?
Q47. Campaign branching unlock criterion?
Q50. Encounter unlock sequenziale o open-world?
Q11. Affinity/Trust scale canoniche: ±3 o ±2/0..5?
Q54. PP=3 (Freeze) vs PP≥10 (Ultimate combat): resolve.
Q51. PT reset per-turn o per-round?
Q56. Tier advancement costo?
Q58. Level cap esplicito MVP (elite? mythic?)?

**HIGH P1 (blocca M10 M11 implementation)**:

Q1. Pressure visibile HUD o hidden?
Q16. PE mission_base win/draw/loss numeri esatti?
Q17. Cap PE accumulabili (hard/soft)?
Q19. PE→PI checkpoint trigger?
Q6. Focus-fire chain cap esplicito?
Q21. Forma innata immutable o shifting?
Q22. Form shift threshold numerica?
Q26. Ennea trigger condition per 6 archetipi?
Q27. Ennea buff valori numerici specifici?
Q31. Reaction cap 1/actor canonico + multi_reaction trait?
Q36. Hazard damage scaling per bioma tier?
Q37. Hazard permanente o temporaneo?
Q41. Squad trust distinto da NPG trust?
Q61. Recruit d20 probabilistico o deterministico?
Q66. stress_modifiers unità di misura?

**MEDIUM P2 (clarification nice-to-have)**:

Q2-Q5, Q7-Q10, Q12-Q15, Q18, Q20, Q23-Q25, Q28-Q30, Q32-Q35, Q38-Q40, Q42-Q45, Q48-Q49, Q52-Q53, Q55, Q57, Q59-Q60, Q62-Q65, Q67-Q75 (lista completa in sezione dedicata sotto)

---

## 4. Deep topic gaps (Agent 4)

### Topic 1 — Campaign Structure: **ZERO doc + ZERO impl** (P0 ABSOLUTE)

- `docs/core/40-ROADMAP.md` 17 LOC, solo MVP→Alpha
- `docs/core/03-LOOP.md` 4 LOC
- `00F-ART_AUDIO §4` parla "intro → 3-5 atti" ma **deferred fase 2 post-EA**
- ZERO Prisma schema Campaign/Chapter/SaveGame
- ZERO campaign service backend

**Effort totale**: Spec (ADR + 50-CAMPAIGN.md + encounter_chain.yaml) = 12-16h. Impl minimale = 30-40h. **Totale P0 ~50h**.

### Topic 2 — Economy: Medium spec gap, Small impl gap (~25h)

- Code solido: `rewardEconomy.js` + `fairnessCap.js` + `rollMating()`
- Doc frammentato: `PI-Pacchetti-Forme.md` + `25-REGOLE_SBLOCCO_PE.md` (4 LOC!) + Freeze §19
- **Conflict**: PE vs PI semantica + CAP_PT non doc
- **Seed generation**: hardcoded 0 in debrief, only mating hook
- **Missing**: PE cap, shop endpoint, diminishing returns formula

### Topic 3 — Biome Ecosystem: Large impl gap (~50h P0)

- Doc ricco: biomes.md + 28-NPC_BIOMI + 15-LEVEL + 00F-ART
- **Implementazione runtime Node: ZERO**. terrain_defense + movement_profiles + cover + LoS solo in Python rules engine **DEPRECATED**.
- Foodweb: validator Python only, no runtime consumption Node
- Tri-Sorgente: spec bridge solo, endpoint missing
- hexGrid.js: non esiste in apps/backend/

### Topic 4 — Reclutamento/Mating/Nido: Low spec + Small impl (~30h P0)

- Code solido: `metaProgression.js` 195 LOC (affinity -2..+2, trust 0..5, canRecruit, canMate, rollMating, MBTI compat)
- **Conflict**: Mating-doc ±3 vs Freeze -2..+2 + 0..5 (code allinea Freeze)
- **Missing impl**: Nido moduli tier 0-3, risorse Nutrienti/Energia/Legami/Shards, rituali (Convergenza/Veglia/Consiglio), Bond Link buff combat
- **In-memory only**: ZERO Prisma persist

---

## 5. Priority Q list per user — risposta batch

Raggruppate per priorità. User risponde solo BLOCKING P0 + HIGH P1 per unblock M9-M11. MEDIUM P2 defer next audit pass.

### 🔴 BLOCKING P0 (8 questions — answer before real M9 work)

**Q_BP0_1 Save/Campaign model**:

- Q46: Save game = SQLite locale? NeDB? Prisma? Cloud sync?
- Q47: Campaign branching = lineare con 1-2 scelte binarie (Descent) o full DAG?
- Q50: Encounter unlock = sequenziale rigido post-tutorial o open-world selezionabile?

**Q_BP0_2 Economia contradictions**:

- Q11: Affinity/Trust scale CANONICAL = ±3 (Mating doc) O ±2/0..5 (Freeze)? Pick one.
- Q54: PP max = 3 (Freeze §7.2) O Ultimate richiede PP≥10 (combat.md:117)? Math conflict.
- Q51: PT resource reset = per-turn O per-round? (round-model richiede disambiguo).

**Q_BP0_3 Character progression shape**:

- Q56: Tier advancement base→veteran→elite→mythic costo = PE amount? Kill count? Encounter count?
- Q58: Level cap MVP shipping = elite max o mythic unlocked?

### 🟡 HIGH P1 (16 questions — answer before M10)

**Economia earning + flow**:

- Q16: PE per encounter: tutorial=3, standard=5, elite=8, boss=12 (code shipped) — confermi canonical?
- Q17: PE accumulabili: soft cap 18 (telemetry.yaml) o hard? Overflow?
- Q19: PE→PI checkpoint trigger: ogni mission? Bioma clear? Tier unlock?
- Q55: PE win/draw/loss differenziati? Style bonus stackable?

**Sistema pressure + Form mechanics**:

- Q1: Pressure visibile HUD player o hidden (AI War style vs Slay Spire style)?
- Q21: Forma innata immutable o può shifting mid-campagna?
- Q22: Form shift threshold numerica (es. asse > 0.7 per N round) + hysteresis?
- Q26: Ennea trigger condition complete per 6 archetipi (solo Conquistatore quotato)?
- Q27: Ennea buff valori specifici (es. +1 attack? +2 defense?)?

**Combat edge cases**:

- Q6: Focus-fire chain cap = 2p/3p saturation?
- Q31: Reaction cap 1/actor canonizzare in doc? Trait multi_reaction esiste?
- Q36: Hazard damage scaling per bioma tier o flat per type?
- Q37: Hazard permanente intera battaglia o N turn?
- Q66: stress_modifiers (sandstorm: 0.06) unità: +0.06/turn a StressWave? Multiplier?

**Meta progression**:

- Q41: Squad trust distinto da NPG trust?
- Q61: Reclutamento d20 probabilistico (DC vs tier) o threshold deterministico?

### 🟢 MEDIUM P2 (51 questions — defer batch M11+)

Q2-Q5, Q7-Q10, Q12-Q15, Q18, Q20, Q23-Q25, Q28-Q30, Q32-Q35, Q38-Q40, Q42-Q45, Q48-Q49, Q52-Q53, Q57, Q59-Q60, Q62-Q65, Q67-Q75.

Vedi `docs/planning/2026-04-20-design-audit-raw-questions.md` per lista completa (prossimo commit).

---

## 6. Fix "no design intent needed" — action items immediate

Questi sono **propagazione ADR**, non design decision. Posso shippare ora senza input user:

- [ ] `00-SOURCE-OF-TRUTH.md §14.1` grid: rimuovere "decisione aperta" + citare ADR-2026-04-16 hex axial
- [ ] `00-SOURCE-OF-TRUTH.md §13.2` rules engine: marcare Python deprecato + citare ADR-2026-04-19
- [ ] `90-FINAL-DESIGN-FREEZE.md §7.3` rules engine: marcare deprecato
- [ ] `15-LEVEL_DESIGN.md §2`: aggiornare grid 8/12/16 → 6/8/10 hex axial
- [ ] `02-PILASTRI.md`: aggiungere P6 Fairness definizione canonical
- [ ] `00E-NAMING_STYLEGUIDE.md`: estendere con encounter/missione/status EN-IT mapping
- [ ] Cross-ref `ADR-2026-04-20 damage curves` da `15-LEVEL_DESIGN`
- [ ] `Guida_Evo_Tactics_Pack_v2.md`: risolvere T1-T5 vs T1-T6 intra-file
- [ ] `10-SISTEMA_TATTICO.md`: propagare MoS cap=6 dal SoT

**Effort totale ~4h docs sync**. Auto-shippabile post-audit merge.

---

## 7. Raccomandazione strategic sprint M9-M11

**Baseline audit consolidated**: strategy M9-M11 evidence-based (già shipped #1661) era **giusta direzionalmente** ma underestimated canonical doc gap.

**Revision proposta**:

- **M9 extended** (~25h, +5h vs strategy): P6 structural fix + P4 axes + P3 XP proof + **docs sync batch "no intent" action items sopra** + **P0 8 questions user response**.
- **M10** (~25h): P2 PI pack runtime + P3 full levels + **Campaign MVP spec (ADR + 50-CAMPAIGN.md)** (senza impl, solo design).
- **M11** (~20h): P5 Jackbox co-op TV (già locked).
- **M12+**: Campaign impl (~40h) + P2 full evoluzione + Biome runtime port Node.

**Kill-60 rinforzato**:

- NON espandere scope docs M9 oltre "no intent needed" sync
- NON risolvere 51 MEDIUM P2 questions in sprint M9-M11 (defer)
- NON chiudere ogni gap GDD 13 sezioni (Audio/Art fase post-MVP)

## Output artifact audit

- `docs/planning/2026-04-20-design-audit-consolidated.md` (questo doc)
- `docs/planning/2026-04-20-design-audit-raw-questions.md` — 75 Q flat list (prossimo commit)
- 4 agent reports salvati in memory conversation (non file persistent, usata qui come synthesis source)

## Autori

- Master DD (user direction "audit design gap similar a Pilastri audit")
- Claude Opus 4.7 (parallel 4-agent orchestration + synthesis)
- Agent Explore (structural scan 6940+4121 LOC)
- Agent general-purpose (internal consistency)
- Agent general-purpose (clarity/unclear definitions)
- Agent general-purpose (deep topic dive Campaign+Economy+Biome+Nido)
