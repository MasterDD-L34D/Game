---
title: 'Job System Audit 2026-05-06 — canonical vs shipped drift'
doc_status: active
doc_owner: master-dd
workstream: combat
category: balance
last_verified: '2026-05-06'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [jobs, P3, audit, drift, balance]
---

# Job System Audit 2026-05-06

**Trigger**: master-dd sospetta discrepancies design originale vs shipped per Job system.
**Scope**: Job archetype, Job × Specie identity, ability r1-r4, leveling curve, XP economy, perk-pair, Job × Form.

---

## 1. Canonical vision

**Fonte primaria**: `docs/core/02-PILASTRI.md` §P3 + `docs/adr/ADR-2026-04-24-p3-character-progression.md` + `docs/core/PI-Pacchetti-Forme.md`

P3 (Identità doppia Specie × Job): biologia (specie, 84 YAML) × ruolo (job/classe) → sinergie e counter chiari. Vision originale `data/core/jobs.yaml` header (ripresa da *Final Design Freeze v0.9 §11*): 6 job base (Skirmisher, Vanguard, Warden, Artificer, Invoker, Harvester) + Ranger aggiunto come 7o. Regola design §11.1: ogni job ha 1 fantasy flavor, 2 R1 unlock, 1 R2 unlock, costo PI chiaro, PT/PP/SG dichiarati.

Progression vision (XCOM EU/EW pattern): 7 livelli × 2 perks-pair = 84 perks per 7 base job. Scelta permanente per unità (campaign-scoped). XP curve 0→275 (livello 1-7), grant per kill/sopravvivenza/vittoria. Hybrid path (PI extra) per prendere entrambi i perks con fattore 0.5.

MBTI × Form × Job: 16 MBTI Forms con `job_affinities` (categoriale, es. `tattico`) e `job_penalties`. Soft-gate: primo turno -1 attack_mod/-1 defense_mod se job in `job_penalties`. PI surcharge alternativa (+5). Form ha `job_bias` in `form_pack_bias.yaml` che orienta il pack reward verso ability di job specifici.

**Canonical advanced jobs**: NESSUNO. Il task brief citava "3 advanced?". Non esiste categoria "advanced" in nessun documento canonico. Esiste solo `status: base` e `status: expansion`.

---

## 2. Shipped runtime

### 2.1 Job roster attuale

| File | Status | Job IDs | Count |
|---|---|---|---|
| `data/core/jobs.yaml` v0.2.0 | base | skirmisher, vanguard, warden, artificer, invoker, ranger, harvester | 7 |
| `data/core/jobs_expansion.yaml` v0.3.0 | expansion | stalker, symbiont, beastmaster, aberrant | 4 |
| **Totale runtime** | — | 11 job | **11** |

Loader: `apps/backend/services/jobsLoader.js` merge additivo (expansion non sovrascrive base). Endpoint: `GET /api/v1/jobs`. Progression loader carica anche expansion: `apps/backend/services/progression/progressionLoader.js` L14 `jobs_expansion.yaml`.

### 2.2 Ability per job

| Tier | Cost PI | Base jobs (7) | Expansion jobs (4) | Note |
|---|---|---|---|---|
| r1_1 | 3-5 | si | si | 2 ability r1 per job |
| r1_2 | 3-5 | si | si | — |
| r2 | 8-12 | si | si | 1 ability r2 per job |
| r3 | 14 | si | si (PR #2057) | Sprint 8.1 closure |
| r4 | 22 | si | si (PR #2057) | capstone |

**Totale ability shipped**: 7 base × 5 = 35 + 4 expansion × 5 = 20 = **55 ability** (49 per il numeric-reference 2026-04-27, +6 per r1/r2 expansion non contate esplicitamente).

Nota discrepanza: `docs/balance/2026-04-27-numeric-reference-canonical.md` riporta "35 base + 14 expansion = 49 ability". Il numeric-reference antecedente al PR #2057 (Sprint 8.1 che aggiunge r3/r4 ai 4 expansion) conta 4 expansion × {2r1 + 1r2 + 1r3 + 1r4} = 4×5 = 20. Totale reale = 35 + 20 = **55 ability**.

### 2.3 Perk system (M13.P3)

- `data/core/progression/perks.yaml` v0.1.0: 7 base × 6 livelli × 2 perks = **84 perks** (shipped PR #1697)
- `data/core/jobs_expansion.yaml` §perks: 4 expansion × 6 livelli × 2 perks = **48 perks expansion**
- Engine: `apps/backend/services/progression/progressionEngine.js` — perk-pair pick (scelta permanente), hybrid path (PI × 5, factor 0.5)
- Prisma persistence: `UnitProgression` store (M13.P3 Phase B PR #1697)

### 2.4 XP curve

`data/core/progression/xp_curve.yaml` v0.1.0 — XCOM EU/EW pattern:

| Livello | XP totale | Delta |
|---|---|---|
| 1 | 0 | start |
| 2 | 10 | +10 (~1 encounter vittoria) |
| 3 | 25 | +15 |
| 4 | 50 | +25 |
| 5 | 100 | +50 |
| 6 | 175 | +75 |
| 7 | 275 | +100 |

Grant: kill_trash=3, kill_elite=8, kill_boss=25, survive_round=1 (cap 5), mission_victory=12, mission_participation=5.

### 2.5 Job × Form binding

- `data/core/forms/mbti_forms.yaml` v0.1.0: 16 MBTI Forms con `job_affinities` (categorie generiche: tattico, controllore, guaritore, assaltatore, esploratore, furtivo, sentinella) e `job_penalties`.
- `data/core/forms/form_pack_bias.yaml`: `job_bias` per MBTI form → bias verso ability di job specifici (es. ISTJ → vanguard/muraglia).
- `formPackRecommender.js`: usa `job_bias[job_id]` per orientare d20 roll 18-19 verso pack specifico.
- `formEvolution.js` / `personalityProjection.js`: espone `job_affinities` + `job_penalties` nel payload.

**Relazione job × form**: form NON blocca job. Job è scelta player-owned. Form orienta pack reward (d20 bias 18-19) e soft-gate primo turno se job in `job_penalties`. **Nessun hard-gate**.

### 2.6 Job × Specie binding

**Zero restrizioni specie-to-job** in `data/core/species.yaml` o in qualunque YAML. Il campo `job_affinities` di mbti_forms è per categoria semantica (tattico, esploratore...) non per job_id specifico. La connessione specie-job si manifesta solo via:

1. Trait stack → VC metrics → MBTI form → `job_affinities` (indiretto, post-session)
2. Pack recommender: `job_bias` per form durante pack roll pre-encounter

Archetype resistenza (`apps/backend/services/combat/resistanceEngine.js`): 4 archetype (bruiser/agile/stalker/caster) che modulano damage resistance. Non mappano 1:1 sui job: sono separati.

---

## 3. Drift matrix

| Feature | Canonical vision | Shipped | Severity |
|---|---|---|---|
| Job count base | 6+1=7 base (vision §11) | 7 base | ✅ OK |
| Job count total | 7 (vision freeze v0.9) | 11 (7 base + 4 expansion) | INFO — expansion aggiunta autonomamente, non documentata nel vision originale, ma supportata dalla policy "Roster aperto a espansione" nel file header |
| "3 advanced jobs" | NON canonici — nessun doc | NON esistono | ✅ OK — falsa aspettativa del brief |
| Ability count (base) | 7×(2r1+r2) = 21 base → sprint 8 estende r3/r4 = 7×5=35 | 35 base | ✅ OK |
| Ability count (expansion) | Non definito nel vision freeze | 4×5 = 20 (after #2057) | INFO — additive, non conflict |
| **Numeric-reference desync** | — | Doc `2026-04-27-numeric-reference` riporta "49 ability" ma reale post-#2057 = **55** | MEDIUM — doc stale |
| Perk-pair (XCOM pattern) | 7 jobs × 6 livelli × 2 perks = 84 | 84 base + 48 expansion = **132 perks** | INFO — expansion aggiunge 48 non documentati nel canonical ADR |
| XP curve 7 livelli | XCOM EU/EW 7 step | Shipped, 0→275 | ✅ OK |
| Hybrid path | Canonical (PI×5, factor 0.5) | Shipped `progressionEngine.js` | ✅ OK |
| **Resource gating (PP/SG/PT/PI)** | Costs definiti per ogni ability, gating enforcement implicito | **PP/SG gating skippato in MVP** (`abilityExecutor.js` L542, L1477) | HIGH DRIFT — ability con `cost_pp >= N` non vengono rifiutate se PP < N. Knob di costo scritto ma non enforced runtime |
| **PE resource (Aberrant)** | Aberrant usa `resource_usage: { primary: PE, ... }` e `cost_pe` | `PE` non è resource type gestito da session engine (PP/PT/SG/Seed esistono, PE non compare in abilityExecutor o session.js) | HIGH DRIFT — Aberrant expansion job ha resource non implementata |
| Soft-gate Form × Job | `job_penalties` → -1 att/-1 def primo turno | Dati esposti via personalityProjection, **ma nessuna apply nel resolver session.js o abilityExecutor** | HIGH DRIFT — soft-gate definito in YAML, **zero enforcement runtime** |
| Job × Specie restriction | Nessuna hard-gate nel design | Nessuna hard-gate nel runtime | ✅ OK — allineati (nessuno nel design = nessuno nel runtime) |
| Form → Job affinity (categorie) | MBTI job_affinities per categoria (tattico, etc.) | Esposto in payload, **non mappa 1:1 a job_id** — "tattico" non corrisponde a nessun job_id specifico | MEDIUM — affinity categorica mai wired a resolver. Solo cosmetic nel payload |
| Job narrative voice | Canonical non definito esplicitamente (PI-Pacchetti-Forme non specifica voice) | Zero — museo M-026 Pentiment deferred (writer D4 bottleneck) | LOW — acknowledged backlog, non drift |
| **ADR-2026-04-24 job count claim** | "7 jobs live con abilities R1/R2" | ADR stale post expansion (11 job ora) | MEDIUM — ADR §stato tecnico stale |
| Progression ADR status | ADR `ADR-2026-04-24-p3-character-progression.md` status | "Pending" (mai marcato Accepted) | LOW — processo non bloccante ma governance drift |

---

## 4. P3 Pillar status reality check

**PILLAR-LIVE-STATUS.md** (SOT runtime) riporta P3 = 🟡++ con `last_verified: 2026-04-28`. PR #2057 (2026-05-05) ha bumped verso "🟢++".

**P3 gate per 🟢 def** (PILLAR-LIVE-STATUS §P3):

1. Morphotype CoQ pool selector (~6h Min) — **NOT shipped**
2. XCOM points-buy build allocation (~8h) — **NOT shipped**

**Reality post-audit**:

P3 🟡++ è realistica come claim. I gate per def non sono chiusi. La bump "🟢++" rivendicata nel commit #2057 (`Pillar P3 🟢ⁿ → 🟢++`) si riferisce alla copertura ability r1→r4 su 11/11 job — non alla chiusura dei gate del PILLAR-LIVE-STATUS. Sono claim su feature diverse.

**Verdict P3**: 🟡++ confermato. Ability roster completo ma:
- Resource gating non enforced (HIGH drift)
- Gate morfotipo non chiuso
- Gate points-buy non chiuso
- Soft-gate Form × Job non enforced

---

## 5. Cross-layer: Forme + MBTI + Specie

### Form → Job (indiretta)

Form (MBTI) orienta il pack reward via `job_bias[job_id]` nel roll d20 (18-19 → bias job). Non determina il job della creature. Non blocca. Le categorie `job_affinities` (tattico, esploratore...) sono semantiche e **mai risolte a job_id concreto** nel runtime.

**Drift specifico**: PI-Pacchetti-Forme.md mostra pack bias verso job_id (`job_ability:vanguard/muraglia`) — questi sono ability_id non job_id, la granularità è coretta. Ma `mbti_forms.yaml` usa categorie astratte (tattico) ≠ `form_pack_bias.yaml` usa job_id concreti. Due schema paralleli non riconciliati.

### Specie → Job (assente)

Nessuna restrizione. Il flavor "Identità doppia Specie × Job" è esperienziale (giocatore sceglie), non meccanico (engine non blocca). Il resistance archetype (bruiser/agile/stalker/caster) NON corrisponde ai job_id.

### MBTI → Job

Post-session, il VC scoring produce un MBTI profile della creatura. Le `job_affinities` nel form sono un'etichetta retroattiva ("questa creatura gioca come un tattico"), non una gate prospettica. Nessun resolver applica penalità o bonus meccanici basati su questa corrispondenza a runtime.

---

## 6. Open architectural questions

### AQ-01 — Resource gating enforcement (PRIORITY HIGH)

PP/SG/PT/PI resource costs sono dichiarati in jobs.yaml per ogni ability. `abilityExecutor.js` li ignora esplicitamente ("skippato in MVP"). Domanda: quando viene implementato il gating? Senza, le ability r3/r4 che richiedono `cost_pp >= 10` o `cost_sg >= 100` sono usabili sempre.

**Implicazione balance**: ability capstone non costano risorse effettive → equivale a tutte le ability illimitate. Il costo PI (unlock) è l'unica barriera reale.

**Proposta azione**: gate enforcement in `abilityExecutor.js` per almeno PP/SG (i più usati). PT/Seed/PI secondari.

### AQ-02 — PE resource (Aberrant) non implementata

`aberrant` usa `resource_usage: { primary: PE, secondary: SG }` e ability con `cost_pe: 5`. PE non è resource type nel session engine. `abilityExecutor.js` non gestisce `cost_pe`. Aberrant r2 `aberrant_overdrive` ha `cost_pe: 5` che viene silenziosamente ignorato.

**Opzioni**: (A) rimuovere PE da Aberrant → sostituire con SG o PP, (B) implementare PE resource nel session engine (~4h), (C) lasciare Aberrant "expansion deferred balance" con nota esplicita.

### AQ-03 — Soft-gate Form × Job non enforced

`mbti_forms.yaml` specifica `soft_gate.first_turn_penalty: { attack_mod: -1, defense_mod: -1, duration_turns: 1 }` da applicare se job in `job_penalties` del form. Non è mai applicata né in `session.js` né in `abilityExecutor.js`. Null runtime impact.

**Impatto P3**: questa era la meccanica che creava "identità doppia" non solo a livello cosmetico. Senza enforcement, specie × job non genera friction meccanica.

### AQ-04 — job_affinities categorie vs job_id concreti

`mbti_forms.yaml` usa categorie astratte (`tattico`, `assaltatore`, `guaritore`) per job_affinities. `form_pack_bias.yaml` usa job_id concreti (`vanguard`, `skirmisher`). Nessuna mappa tra le due. Il campo `job_affinities` è cosmetic-only.

**Domanda design**: le categorie semantiche sono sufficienti per P3, o si vuole un mapping formale categoria→job_id?

### AQ-05 — Expansion jobs: perk coverage in progressionEngine

`progressionEngine.js` carica perks da `perks.yaml` (7 base) + merge da `jobs_expansion.yaml` §perks (4 expansion). Verifica necessaria: il merge è testato su tutti 4 expansion job per level_2→level_7? ADR-2026-04-24 non menziona expansion jobs (stale ante-expansion).

### AQ-06 — "3 advanced jobs" claim nel task brief

Il task brief chiede audit su "advanced?" jobs. Non esistono nel design o nel codebase. Nessun file YAML o ADR usa la categoria "advanced". Probabile confusione con la categoria `expansion`. Confermato: zero advanced jobs shipped o pianificati.

### AQ-07 — PILLAR-LIVE-STATUS desync post #2057

`PILLAR-LIVE-STATUS.md` `last_verified: 2026-04-28` — non aggiornato post Sprint 8.1 (#2057, 2026-05-05). Richiede bump a 2026-05-06 con P3 status + gate status aggiornati.

---

## 7. Summary per master-dd

**Stato generale**: Job system robusto ma con 3 drift tecnici HIGH.

| # | Drift | Severity | Fix effort |
|---|---|---|---|
| D1 | Resource gating PP/SG non enforced | HIGH | ~4h |
| D2 | PE resource Aberrant non implementata | HIGH | ~4h (Opzione B) o 30min (Opzione A) |
| D3 | Soft-gate Form × Job non enforced | HIGH | ~3h |
| D4 | Numeric-reference stale (49 vs 55 ability) | MEDIUM | 30min doc update |
| D5 | ADR-2026-04-24 stale (7→11 job, status pending→accepted) | MEDIUM | 1h doc + ADR update |
| D6 | PILLAR-LIVE-STATUS `last_verified` stale | LOW | 20min bump |
| D7 | job_affinities categorie vs job_id mai riconciliate | MEDIUM | decision design + 2h mapping |

**P3 gate aperti** (per promozione 🟢 def):
1. Morphotype CoQ pool selector (~6h)
2. XCOM points-buy build allocation (~8h)
3. D1 resource gating (per meaningful cost ladder) — prerequisito P3 def

**Museum cross-ref**: card M-026 Pentiment Job Voice (score 3/5) — narrativa job-voice deferred, writer bottleneck. Non bloccante per P3 def.

---

## Sources

- `data/core/jobs.yaml` v0.2.0 (7 base job, r1-r4)
- `data/core/jobs_expansion.yaml` v0.3.0 (4 expansion job)
- `data/core/progression/perks.yaml` v0.1.0 (84 base perks)
- `data/core/progression/xp_curve.yaml` v0.1.0
- `data/core/forms/mbti_forms.yaml` v0.1.0
- `data/core/forms/form_pack_bias.yaml`
- `apps/backend/services/abilityExecutor.js` (18 effect_type, resource gating skip L542/L1477)
- `apps/backend/services/jobsLoader.js` (merge base+expansion)
- `apps/backend/services/progression/progressionEngine.js`
- `apps/backend/services/coop/coopOrchestrator.js` (job_id fallback `guerriero`)
- `docs/core/02-PILASTRI.md` (canonical 6-pilastri)
- `docs/reports/PILLAR-LIVE-STATUS.md` (SOT runtime, last_verified 2026-04-28)
- `docs/adr/ADR-2026-04-24-p3-character-progression.md` (stale, pre-expansion)
- `docs/adr/ADR-2026-04-27-ability-r3-r4-tier.md` (Sprint 8 + Sprint 8.1)
- `docs/balance/2026-04-27-numeric-reference-canonical.md` (stale post #2057)
- `docs/museum/cards/indie-pentiment-job-voice-confessionals.md` (M-026 score 3/5)

---

## Proposed tickets

```
TKT-P3-RESOURCE-GATE-D1: ~4h — enforce PP/SG resource gating in abilityExecutor.js (D1)
TKT-P3-PE-RESOURCE-D2: ~4h — implement PE resource in session engine OR remap Aberrant to PP/SG (D2)
TKT-P3-SOFTGATE-D3: ~3h — apply mbti_forms soft_gate first_turn_penalty in session resolver (D3)
TKT-DOCS-NUMERIC-REF-D4: 30min — update numeric-reference-canonical.md ability count 49→55 (D4)
TKT-DOCS-ADR-P3-D5: 1h — mark ADR-2026-04-24 Accepted + add expansion section (D5)
TKT-DOCS-PILLAR-STATUS-D6: 20min — bump PILLAR-LIVE-STATUS last_verified 2026-05-06 + P3 post #2057 (D6)
TKT-P3-AFFINITY-MAPPING-D7: ~2h — map job_affinities categories to job_id OR decision to keep semantic-only (D7)
TKT-P3-GATE-MORPHOTYPE: ~6h — morphotype CoQ pool selector (gate 1 for P3 def)
TKT-P3-GATE-POINTSBUY: ~8h — XCOM points-buy build allocation UI (gate 2 for P3 def)
```
