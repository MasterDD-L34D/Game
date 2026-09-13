---
title: 'Boss + Event files audit — proposta Leviatano Risonante 3-strato vs runtime esistente'
workstream: dataset-pack
status: draft
created: 2026-04-26
author: research-agent
tags: [boss, event, encounter, leviatano, frattura-abissale, narrative]
---

# Boss + Event files audit

## TL;DR (5 bullet)

- **"Leviatano Risonante" già esiste** come specie canonical (`packs/evo_tactics_pack/data/species.yaml:115`) + apex tier in 2 encounter (`docs/planning/encounters/enc_frattura_03.yaml:69-74` wave 3 + `data/encounters/elite_01.yaml:13-21` solo apex). Bioma `frattura_abissale_sinaptica` esiste con 3 strati `fotofase_synaptic_ridge / crepuscolo_synapse_bloom / frattura_void_choir` già wirati come pool trait (`data/core/traits/biome_pools.json:381,417,453`). Lore biome cita testualmente "accordarsi con il Leviatano Risonante" (`packs/evo_tactics_pack/data/biomes.yaml:719`).
- **Multi-strato runtime NON esiste**: schema encounter (`schemas/evo/encounter.schema.json`) ha solo `waves[]` con `turn_trigger` numerico, ZERO supporto per "phase change boss" (HP threshold → form switch) o stratum-as-zone. I 3 strati Cresta/Soglia/Frattura sono tassonomia dataset, non state machine combat.
- **Outcome aperto NON esiste**: outcome runtime è binario (`apps/backend/routes/session.js:2009-2010` → `win`/`wipe`/`timeout`/`objective_failed`). Nessun `accordo` o `parley` come 3° esito. Schema `objective.type` enum chiuso a `[elimination, capture_point, escort, sabotage, survival, escape]` — non c'è `negotiation`/`accordo`.
- **Vertical slice "Risveglio del Leviatano"** (`docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html`) è il documento di design canonical (2128 LOC HTML/SVG, 3 scene PRE/MID/POST con tweak panel `accordo|ritirata|combatt.`). User proposal allineata 1:1, ma documento è "concept exploration archive" — zero wiring runtime.
- **Effort gap-to-vertical-slice**: usando l'esistente come base, ~30-40h split su 3 ADR (multi-stage encounter, parley outcome, biome strato-as-zone). Effort full vertical slice da-zero ~80-100h. **Raccomandazione**: estendere `enc_frattura_03.yaml` esistente, non rifare.

---

## Inventario concreto

### Boss/encounter esistenti

| File:line | Nome | Tier | Bioma | Note |
|---|---|---|---|---|
| `docs/planning/encounters/enc_frattura_03.yaml:13` | "Il Canto dello Strappo" | hardcore boss (diff 5/5) | frattura_abissale_sinaptica | **DIRETTO PARENT della proposta user**. 4 wave, comment esplicito: «Original design had 3 branching objectives (disinnescare/accordo/fuga). Schema supports single objective — using survival as primary. Multi-objective design preserved in docs/planning/ narrative docs.» (linee 7-9). Wave 3 turn 8 spawna `leviatani_risonanti` apex 1× + `cori_voidsong` elite 2×. |
| `data/encounters/elite_01.yaml:1-43` | "Confronto con l'Apex" | boss tier 5 | abisso_vulcanico | Boss singolo `leviatano_risonante` HP~180, 4 trait, lava hazard. Schema legacy, ID = `elite_01` (non slug `enc_*`). Description: «Boss fight: un Leviatano Risonante domina il campo. Cooperazione obbligatoria.» |
| `apps/backend/services/hardcoreScenario.js:55,266,285` | `enc_tutorial_07_hardcore_pod_rush` | hardcore | rovine_planari | Mission timer enabled (turn_limit 10). Pattern Long War 2 (ADR-2026-04-24). |
| `docs/planning/encounters/enc_hardcore_reinf_01.yaml:11-14` | "Marea dell'Apex" | hardcore | rovine_planari | Reinforcement pool dinamico tier-based (Alert+). 3 wave + spawn loop. |
| `packs/evo_tactics_pack/data/species/tutorial/apex-predatore.yaml:1` | `apex_predatore` | T3 boss | savana/badlands | Tutorial finale 05 (curva 1→5). Phantom species stub, baseline `tutorialScenario.js`. |

### Event/keystone (cross-bioma + climatic)

| File:line | Tipo | Note |
|---|---|---|
| `packs/evo_tactics_pack/data/species/badlands/evento-tempesta-ferrosa.yaml` | climatic event | `flags.event:true` + `encounter_role:boss`. 4 in totale: tempesta-ferrosa, brinastorm, ondata-termica, seme-uragano. |
| `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml` (citato museum card M-2026-04-26-014) | cross-bioma propagation | 3 eventi (tempesta-ferrosa BADLANDS→FORESTA/DESERTO; ondata-termica DESERTO→BADLANDS; brinastorm CRYOSTEPPE→FORESTA/BADLANDS) via corridor/seasonal_bridge. **Validator-only**, zero runtime wiring. Vedi `docs/museum/cards/worldgen-cross-bioma-events-propagation.md`. |
| `data/narrative/qbn_events.yaml:42-` | QBN narrative event | Pattern Failbetter/StoryNexus. MBTI/Ennea-gated, debrief-level. Scope = "tra missioni", non in-combat. ~20+ event con `choices[]`. |
| `docs/playtest/tickets/EVT-02-event-special.md` | "Alleanza inattesa" | Reference a sistema branching narrativo con flag `evt02_reputation_delta` — design doc, runtime status unclear. |

### Boss state runtime

| File | Funzione | Note |
|---|---|---|
| `apps/backend/services/combat/objectiveEvaluator.js:78-` | win/wipe evaluator | 6 evaluator type registered. Outcome enum hardcoded `'win' \| 'wipe' \| 'timeout' \| 'objective_failed'`. |
| `apps/backend/services/combat/missionTimer.js:42-60` | timer + on_expire | `on_expire`: `defeat \| escalate_pressure \| spawn_wave`. ZERO fork narrativo. |
| `apps/backend/services/combat/reinforcementSpawner.js:1-60` | dynamic spawn waves | Tier-based (`Calm→Apex`). Pure additive, no boss-phase trigger. |
| `apps/backend/services/narrative/qbnEngine.js:1-100` | QBN narrative draw | YAML-pool + condition gates. Debrief scope, NON wirato in combat loop. |
| `services/narrative/narrativeRoutes.js:32-80` | `/api/v1/narrative/*` | Ink-based stories (briefing/debrief). Out-of-combat. |

---

## Multi-stage support — gap

Schema attuale (`schemas/evo/encounter.schema.json:108-160`):

```yaml
waves:
  - wave_id: int
    turn_trigger: int      # solo trigger numerico
    spawn_points: [[x,y]]
    units: [...]
```

**Gap concreti per "3 strati con transizione"**:

1. **No HP-threshold trigger**: nessun `wave.trigger.type: 'boss_hp_pct'` o `'phase_change'`. Esiste `boss_enrage_threshold_hp` (40%) in `damage_curves.yaml` solo come buff multiplier passivo, non come stage shift.
2. **No zone-as-stratum**: `target_zone` esiste solo per `capture_point/escape/sabotage` (1 box per encounter). Non si possono dichiarare 3 zone con transizione.
3. **No spawnable terrain change** dentro encounter (cambio bioma in-mission). `conditions[]` permette `terrain_collapse` come one-shot effect, non sequenziale.
4. **No boss form switch**: `apex` tier è una unit con stat fissi. Non esiste `unit.forms[]` con transition rules. La specie `leviatano_risonante` ha `synergy_hints.notes: "Forma armonica/shear; switch gratuito 1/encounter da corrente"` (`packs/evo_tactics_pack/data/species.yaml:127`) — design intent c'è, runtime no.

**Pattern industry usable da museum**:
- `docs/museum/cards/worldgen-cross-bioma-events-propagation.md` — propagation pre-wave da Long War 2 mission pressure pattern.
- Sintesi: aggiungere `wave.trigger: { type: 'boss_hp_pct', threshold: 0.66 }` (proxy strato 1→2) + `{ type: 'boss_hp_pct', threshold: 0.33 }` (2→3) + `wave.terrain_change: { from: 'cresta', to: 'soglia' }` come schema extension. ~12-15h schema + AJV + evaluator wire.

---

## Branching outcome — gap

### Runtime attuale

```js
// apps/backend/routes/session.js:2009-2010
} else if (sistemaAlive === 0 && playerAlive > 0) outcome = 'win';
else if (playerAlive === 0 && sistemaAlive > 0) outcome = 'wipe';
```

`objectiveEvaluator.js:13` documenta outcome enum: `'win' | 'wipe' | 'timeout' | 'objective_failed'`. Nessun `'parley' | 'accordo' | 'retreat'`.

### Pattern QBN parziale

`data/narrative/qbn_events.yaml` ha `choices[]` per branching, ma scope è **tra missioni** (debrief). `qbnEngine.js:1-30` esplicita: «QBN operates at debrief / milestone level — campaign-arc scope.»

### Pattern Ink narrative

`services/narrative/narrativeRoutes.js` espone `/api/v1/narrative/start` + `/choice` per ink stories. Sono dialoghi out-of-combat. Per accordo Leviatano serve **bridge narrative ↔ combat**: trigger ink mid-encounter quando boss HP < 33%.

### Effort branching outcome

- Schema extension `objective.outcomes: { win, wipe, parley, retreat }` con condition predicate per ognuno: ~5h.
- `objectiveEvaluator` register `parley` evaluator (es. `boss_hp < 33% AND player_intent_declared "negotiate" within N turns`): ~8h.
- Bridge ink overlay mid-combat (paus combat, draw choice, resume con flag): ~10h.
- Reward/diary fork per outcome: già presente in `data/narrative/qbn_events.yaml` schema, basta wire post-combat hook → `mark_seen(outcome_id)`.

---

## Vertical slice "Leviatano" — excerpt chiave

File: `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html`

### Identità + struttura (linea 315-317)

> "Vertical Slice — Risveglio del Leviatano" · Frattura Abissale Sinaptica · 3 sotto-strati · 4 player co-op

### 3 strati (linee 654, 706, 766)

> I · Cresta Fotofase — keystone: Polpo Araldo Sinaptico · support: Simbionte Corallino — strato luminoso · corridoi stabili · primo contatto
>
> II · Soglia Crepuscolare — threat: Sciame di Larve Neurali · nebbia mnesica — visibilità compromessa · eclissi sinaptiche · decisione morale
>
> III · Frattura Nera — apex: Leviatano Risonante · canto_dello_strappo — climax · accordo / ritirata / combattimento

### Obiettivi dinamici (linea 790-800)

> ① Stabilizza i corridoi della Cresta (3 nodi)
> ② Attraversa la Soglia prima dell'eclissi (T-6 turni)
> ③ Frattura Nera — risveglio del Leviatano [esito aperto]
> › trait planare sblocca in base al comportamento · no fail state forzato

### 3 outcome con flavour (linee 2031-2061)

```js
OUTCOMES = {
  good (accordo):    "« Il Leviatano non è morto. E ora sa il vostro nome. »"
                     "› alla prossima sessione: il suo canto raggiungerà la Foresta"
  neutral (ritirata):"« Ci siamo voltati in tempo. Il canto resta sotto soglia. »"
                     "› rete quasi intatta · spillover residuo · ritenteremo"
  bad (combat):      "« Il Leviatano tace ora. Ma la Frattura grida per lui. »"
                     "› collapse della Cresta · 2 bridge persi · tracce memetiche +5"
}
```

### SYNC/OVERLOAD/FRACTURE thresholds (linea 550 + biomes.yaml:711-713)

> SYNC 0.52 ▸ OVERLOAD 0.74 ▸ FRACTURE 0.90

Già wirato in `packs/evo_tactics_pack/data/biomes.yaml:710-713`:
```yaml
stresswave:
  baseline: 0.35
  escalation_rate: 0.06
  event_thresholds:
    sync_window: 0.52
    overload: 0.74
    fracture: 0.9
```

---

## Confronto user proposal ↔ runtime

| User proposal | Status repo | File evidence | Gap effort |
|---|---|---|---|
| **Boss "Leviatano Risonante"** | 🟢 specie esiste | `packs/evo_tactics_pack/data/species.yaml:115`, `data/encounters/elite_01.yaml:13-21`, `enc_frattura_03.yaml:69-74` | 0h (riusa) |
| **3 strati (Cresta Inversa / Soglia Densa / Frattura Nera)** | 🟡 nominativi diversi (Cresta Fotofase / Soglia Crepuscolare / Frattura Nera) ma data wirato | `data/core/traits/biome_pools.json:381,417,453` (3 pool); `packs/evo_tactics_pack/data/biomes.yaml:674-719` | rinaming ~1h, runtime stratum-as-zone ~12-15h |
| **3 esiti (accordo / ritirata / combat)** | 🔴 runtime binario `win/wipe/timeout` | `apps/backend/routes/session.js:2009-2010`, schema `objective.type` enum closed | ~20-25h (schema + evaluator + ink bridge) |
| **Flavour "rete tradita / fame antica" da worldgen** | 🟡 cross_events.yaml propagation esiste (validator-only); QBN events MBTI-gated esistono | `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml`, `data/narrative/qbn_events.yaml`, museum card M-2026-04-26-014 | wire ~8-12h |
| **Multi-strato encounter (boss multi-stage)** | 🔴 schema waves[] solo turn-triggered | `schemas/evo/encounter.schema.json:108-160` | schema ext + evaluator ~12-15h |
| **Hazard event multi-round (calm→telegraph→detonation)** | 🟡 mission timer 1-shot warning, stresswave baseline+escalation | `apps/backend/services/combat/missionTimer.js`, `biomes.yaml:707-713` | wire R-step modulation ~5-8h |
| **Outcome → mondo dinamico (Leviatano "sa nome", canto Foresta)** | 🔴 nessun world-state persistence cross-session | nulla wirato | ~25h (campaign state model + cross_events activation flag) |

### Effort breakdown gap vertical slice completo

- Multi-stage encounter schema + evaluator: **~12-15h** (ADR + AJV + objectiveEvaluator extension)
- Parley outcome (3° esito): **~20-25h** (schema + evaluator + ink mid-combat overlay + diary fork)
- Strato-as-zone runtime (3 zone con transizione): **~10-12h** (può sovrapporsi con multi-stage)
- Cross-bioma propagation activation post-Leviatano: **~8-12h** (museum card 014 reuse path moderate)
- World-state persistence (Leviatano "sa nome" cross-campaign): **~25h** (Prisma campaign model + replay flag)

**Totale gap = 75-90h split su 3-4 ADR** (multi-stage, parley, world-state). Riusabile come base: dataset Frattura completo (4 specie, 3 strati pool, biome lore, hazards). Vertical slice da-zero stimato 100+ h.

---

## Raccomandazione

### Usare base esistente, non rifare

Il **prerequisito 80% è già committed**:

1. **Specie**: `leviatano_risonante` + `polpo_araldo_sinaptico` + `sciame_larve_neurali` + `simbionte_corallino_riflesso` (vedi `scripts/qa/frattura_abissale_validations.py:27-32` per la lista canonical).
2. **Bioma**: `frattura_abissale_sinaptica` con 3 strati pool + thresholds SYNC/OVERLOAD/FRACTURE + 4 trait planari (Eco Lucido, ecc.).
3. **Encounter scaffold**: `docs/planning/encounters/enc_frattura_03.yaml` ESPLICITA che il design originale aveva 3 outcome (linea 7-9) e fu downgraded "Schema supports single objective". Promuoverlo == ripristinare design originale.
4. **Lore**: `biomes.yaml:719` cita testualmente "accordarsi con il Leviatano Risonante" come hook narrativo.
5. **Concept doc**: `Vertical Slice - Risveglio del Leviatano.html` è il design freeze 1:1 della user proposal.

### Step concreti raccomandati

1. **Sprint A** (~12-15h, ADR-multi-stage-encounter): schema ext `wave.trigger: { type: 'boss_hp_pct' | 'turn' | 'zone_entered' }` + objectiveEvaluator `phase_change` evaluator. Promuovi `enc_frattura_03` da survival a multi-objective. Test on harness N=10.
2. **Sprint B** (~20-25h, ADR-parley-outcome): aggiungi `objective.outcomes` + `parley` evaluator (HP < 33% AND `player.intent === 'negotiate'` durante N turn). Bridge ink mid-combat overlay. 3 ink scripts per outcome (accordo/ritirata/combat) con flavour da Vertical Slice excerpt above.
3. **Sprint C** (~8-12h, museum card 014 reuse path moderate): `cross_events.yaml` runtime activation post-Leviatano outcome. Outcome `accordo` → flag `leviatano_resonance_active` → next-session foresta_temperata bioma riceve `+0.05 stresswave + 1 ink event "canto sotto soglia"`.

### Non rifare from scratch

- Specie/bioma/3 strati = già done. Skip dataset work.
- Vertical Slice HTML è canonical design = skip design exploration.
- QBN engine + ink narrative routes = già wired = skip narrative infra build.

### Anti-pattern

- ❌ Creare nuovo encounter `enc_leviatano_*` da zero ignorando `enc_frattura_03.yaml`. Il file esistente HA il commento esplicito che indica il design originale.
- ❌ Hardcodare 3 outcome solo nel narrative ink (senza schema ext). I gating predicates devono essere in `objectiveEvaluator` per replay/telemetry.
- ❌ Wire mid-combat ink overlay senza pause UX research. Il vertical slice mostra `[esito aperto]` come UI overlay all'inizio missione — non interrupt mid-combat. Verificare con UX skill prima.

---

## Path canonical referenziati

- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/packs/evo_tactics_pack/data/species.yaml:115` (leviatano_risonante)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/packs/evo_tactics_pack/data/biomes.yaml:674-719` (frattura_abissale_sinaptica)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/data/core/traits/biome_pools.json:381,417,453` (3 strati pool)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/docs/planning/encounters/enc_frattura_03.yaml` (encounter scaffold)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/data/encounters/elite_01.yaml` (boss singolo Leviatano legacy)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/schemas/evo/encounter.schema.json` (schema canonical)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/apps/backend/services/combat/objectiveEvaluator.js` (outcome enum)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/apps/backend/services/combat/missionTimer.js` (timer pattern)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/apps/backend/services/narrative/qbnEngine.js` (QBN runtime)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/services/narrative/narrativeRoutes.js` (ink routes)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/data/narrative/qbn_events.yaml` (QBN event pack)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html` (design freeze canonical)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/docs/museum/cards/worldgen-cross-bioma-events-propagation.md` (propagation pattern museum)
- `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/cranky-easley-606ae0/scripts/qa/frattura_abissale_validations.py` (4 specie canonical lista)
