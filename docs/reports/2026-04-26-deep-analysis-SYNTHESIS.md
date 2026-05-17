---
title: "Design Corpus Deep-Analysis — Synthesis & Prioritized Action Plan (2026-04-26)"
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [synthesis, audit, action-plan, vision-vs-runtime]
date: 2026-04-26
---

# Deep-Analysis Synthesis — Vision vs Runtime gap

> Sintesi finale di **9 deep-analysis agent** spawned 2026-04-26 sul corpus design completo (~700 file, ~70k LOC). Catalog parent: [`2026-04-26-design-corpus-catalog.md`](2026-04-26-design-corpus-catalog.md).

## Reports inclusi

| Agent | Report | Size | Critical findings |
|---|---|---:|---:|
| balance-illuminator | [`deep-analysis-balance.md`](2026-04-26-deep-analysis-balance.md) | 13.6K | 5 (2 P0 + 3 P1) |
| creature-aspect-illuminator | [`deep-analysis-creature.md`](2026-04-26-deep-analysis-creature.md) | 12.6K | 6 (3 P0 + 2 P1 + 1 P2) |
| narrative-design-illuminator | [`deep-analysis-narrative.md`](2026-04-26-deep-analysis-narrative.md) | 15.9K | 9 (4 urgent) |
| pcg-level-design-illuminator | [`deep-analysis-pcg.md`](2026-04-26-deep-analysis-pcg.md) | 4.8K | 7 (2 P0 + 4 P1 + 1 P2) |
| economy-design-illuminator | [`deep-analysis-economy.md`](2026-04-26-deep-analysis-economy.md) | 4.5K | 4 (2 P0 + 2 P1) |
| telemetry-viz-illuminator | [`deep-analysis-telemetry.md`](2026-04-26-deep-analysis-telemetry.md) | 16.2K | 5 (2 P0 + 2 P1 + 1 P2) |
| ui-design-illuminator | [`deep-analysis-ui.md`](2026-04-26-deep-analysis-ui.md) | 19.2K | 9 (4 P0 + 3 P1 + 2 P2) |
| coop-phase-validator | [`deep-analysis-coop.md`](2026-04-26-deep-analysis-coop.md) | 5.3K | 6 (1 P1 + 5 P2/P3) |
| balance-auditor | [`deep-analysis-outliers.md`](2026-04-26-deep-analysis-outliers.md) | 12.8K | 11 (4 P0 + 4 P1 + 3 P2) |

**Totale**: 62 finding identificati. **18 P0** + **24 P1** + **20 P2/P3**.

---

## TOP-10 P0 ACTION PLAN — ranked by ROI

### 🔴 1. Encounter YAML loader (PCG G1) — ~5h
**Sblocco massimo**: 9 YAML templates orphaned + objectiveEvaluator (5 obj non-elim) + biomeSpawnBias (initial waves) + conditions runtime — **tutto dead weight** finché non wired.
File: new `services/combat/encounterLoader.js` + `session.js:1174`.

### 🔴 2. PE→PI checkpoint resolution (Economy Q19) — ~2h
PE inflation 80:24 ratio, decision tree user Opzione A (mission victory conversion = StS gold analogy).
File: `apps/backend/services/rewardEconomy.js`.

### 🔴 3. Wire 68 silent ancestor status consumers (Outliers + Balance G4) — ~6-8h
68/433 traits (15.7%) `linked`/`fed`/`attuned`/`sensed`/`telepatic_link`/`frenzy`/`healing` fire `triggered:true` ma zero downstream consumer. Ancestor batch OD-011 produce zero game effect runtime.
File: `apps/backend/services/ai/policy.js` + `services/combat/resolver` integration. Già flagged in CLAUDE.md.

### 🔴 4. Threat tile overlay rosso (UI ITB telegraph) — ~50 LOC, 2h
ITB telegraph rule violata. `threatPreview` array arriva al render ma nessuno disegna. Player vede badge ✊ senza capire quale tile colpita. **Single biggest UX bug live**.
File: `apps/play/src/render.js` `drawThreatTileOverlay()`.

### 🔴 5. JS scenario `objective: 'elimination'` string → schema object (PCG G2) — ~1h
8 runtime scenari hardcoded JS hanno `objective: 'elimination'` string non schema-compliant. objectiveEvaluator NEVER evaluates non-elim live.
File: `apps/backend/services/scenarios/tutorialScenario.js:25,42`, `hardcoreScenario.js:32,273`.

### 🔴 6. SF + Seed orphan currency cleanup (Economy P0) — ~30min each
SF emit attivo zero sink. Viola Hades principle. Stub: `seed_earned: 0` rimuovi da debrief payload, SF disable emission finché nest sink live.
File: `rewardEconomy.js:110`, `rewardOffer.js:231`.

### 🔴 7. Hardcoded difficulty key mismatch (Balance G-01) — ~1h
`rewardEconomy.js:12-17` lookup usa key `difficulty` mai impostata da `encounter_class`. Hardcore encounter → PE 5 (standard) invece di 10-12. Aggiungi chiavi `hardcore:10, tutorial_advanced:4`.
File: `apps/backend/services/rewardEconomy.js`.

### 🔴 8. `isTurnLimitExceeded` orphan (Balance G-03) — ~2h
Esportata `damageCurves.js:158` ma **zero chiamate `session.js`**. Single-player path non forza defeat → causa diretta iter7 timeout=66.7%.
File: wire in `session.js` + sessionRoundBridge timer path.

### 🔴 9. Trait outlier nerf (Outliers P0 #1+#2) — ~1h
- `ipertrofia_muscolare_massiva` z=+2.55 → cost_ap 2→3 OR drop perm dmg_step
- `sangue_piroforico` 4-stack benefit → drop perm dmg_step OR fuoco resist 20%→10%
File: `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`.

### 🔴 10. UI font + contrast WCAG AA (UI 3 fix bundle) — ~10 LOC, 30min
- `.unit-log li` 11px + `.unit-tech-id` 10.5px → ≥18px (TV 3m illegible)
- `--dim: #666` (2.9:1) → `#888` (4.5:1 AA)
- HP critico pulse animation in `render.js` (Dead Space pattern)
File: `apps/play/src/style.css` + `render.js`.

**Sub-total P0 batch**: ~30h, 10 fix, sblocco massiccio gameplay coverage + UX clarity.

---

## TOP-15 P1 — second wave

| # | Area | Fix | File | Effort |
|---|---|---|---|---:|
| 11 | Narrative N-01 | Wire QBN engine a session debrief endpoint | `routes/session.js` | 3h |
| 12 | Narrative N-02 | Authoring `reveal_text_it` per 18 mbti_thoughts | thought_cabinet YAML | 3h |
| 13 | UI palette drift | `phoneComposerV2.js` hex hardcoded → token style.css | `phoneComposerV2.js` | 1h |
| 14 | Coop reconnect snapshot push | `attachSocket()` reconnect → `rebroadcastCoopState()` | `wsSession.js:177-191` | 1h |
| 15 | Creature visual lifecycle | `drawLifecycleRing()` + `drawMutationDots()` in render.js | `render.js` | 5h |
| 16 | Creature lifecycle stub script | `seed_lifecycle_stub.py` per 44 species | tools/py | 3h |
| 17 | PCG biomeSpawnBias archetype field | Schema + YAML pool entries `archetype` field | encounter.schema.json + pool YAMLs | 3h |
| 18 | PCG biome_id orphan fix | `rovine_planari` + `caverna_sotterranea` add a biomes.yaml o rename | data/core/biomes.yaml | 1h |
| 19 | Outliers `cautious` AI broken | retreat_hp_pct 0.3 → 0.45 (differentiation vs balanced) | ai_profiles.yaml | 15min |
| 20 | Telemetry CI in batch harness | bootstrap CI [mean, ±σ, 95%] | `tools/py/batch_calibrate_*.py` | 1h |
| 21 | Telemetry telemetry.schema.json | AJV gate per event payload consistency | new file | 2h |
| 22 | Balance computeStatusModifiers round path | Import in `sessionRoundBridge.js` (status no-op co-op) | sessionRoundBridge.js | 1h |
| 23 | UI faction shape marker (colorblind) | triangle/diamond marker in render.js | render.js | 35 LOC |
| 24 | Coop phase-skip negative tests | parametric: methods wrong phase → throws | tests/api/coop*.test.js | 2h |
| 25 | Outliers gravita dead channel | rimuovi o aggiungi 1 trait + 1 archetype vulnerability | trait_mechanics + species_resistances | 2h |

**Sub-total P1 batch**: ~30h, 15 fix.

---

## P2/P3 — backlog (20 issue)

Vedi singoli report. Categoria: ITB random elements, Pathfinder XP budget calibration, deck.gl heatmap, MBTI iter2 default flip, Dormans grammar M10+, T3 trait scarcity, light terrain penalty, threat zone toggle, doc dedup, ADR text alignment.

---

## Cross-cutting patterns identificati

### Pattern A — Engine shipped, surface dead
**Sintomo**: infrastructure runtime esiste e testata, ma **non wired a entry point player-facing**.

Esempi (8 trovati):
- enneaEffects.js orphan (PR #1825 chiuse, but applied scope partial)
- objectiveEvaluator.js (5 obj types) → 0 scenari live usano non-elim
- biomeSpawnBias.js → 1 scenario opt-in only
- QBN engine 17 events → 0 chiamate da session
- briefingVariations.js → 0 route consumer
- Thought Cabinet 18 thoughts → no `reveal_text_it`
- isTurnLimitExceeded → 0 chiamate session.js
- threatPreview array → 0 disegno render

**Root cause**: pattern "research/build engine first, wire later" dimenticato. P0 retro: aggiungere "wire to player surface" come DoD obbligatorio.

### Pattern B — Doc dedup + supersede pending
- `24-TELEMETRIA_VC.md` vs `Telemetria-VC.md`
- `27-MATING_NIDO.md` vs `Mating-Reclutamento-Nido.md`
- `EVO_FINAL_DESIGN_*` (A1) vs `90-FINAL-DESIGN-FREEZE.md` (A3) — autorità sovrapposta
- `docs/frontend/styleguide.md` mancante `superseded_by: 42-STYLE-GUIDE-UI`
- ADR-XXX-refactor-cli.md legacy stub
- ADR-2026-04-13-rules-engine-d20 (killed) ancora referenced

### Pattern C — Schema-runtime drift silenzioso
- difficulty_rating: 6/7 in hardcoreScenario.js (max=5)
- objective string vs object
- reinforcement_pool missing `archetype` field
- biome_id orphan vs biomes.yaml canonical
- telemetry event no AJV
- 9 YAML encounters non in CI gate

**Mitigation**: 1 npm script `npm run schema:lint:encounters` + AJV CI gate.

### Pattern D — Author-determinism vs emergence trade-off
ITB pattern (hand-made + random elements) **non adottato**. Tutti scenari deterministici per-run. Player rejouablility low.

Fix minimale (~3-5h): per-scenario `enemy_pool_candidates[]` + `condition_candidates[]` pick-N at session init.

---

## Pillar status update post-audit

| Pilastro | Pre-audit | Post-audit | Delta |
|---|---|---|---|
| P1 Tattica leggibile | 🟢 | 🟡 → P0 #4 (threat tile overlay) | regressione UX scoperta |
| P2 Evoluzione | 🟢 candidato | 🟡++ — V3 mating mancante + 68 status no-op | confermato ma con caveat |
| P3 Specie×Job | 🟢 candidato | 🟡 — 44/45 species lifecycle YAML missing | regressione visual |
| P4 MBTI/Ennea | 🟡++ | 🟡 — Stoico unreachable, T_F axis 0 thoughts, no reveal_text | confermato gap |
| P5 Co-op | 🟢 candidato | 🟢 candidato — 1 P1 reconnect snapshot, altrimenti solido | nessuna regressione |
| P6 Fairness | 🟢 candidato | 🟡 — `cautious` profile broken, gravita dead channel, 4 trait outlier | regressione balance |

**Score**: 0/6 🟢 + **2/6 🟢 candidato** (P5+P2 caveat) + **4/6 🟡** (regressione P1/P3/P4/P6 scoperta).

---

## Prossime mosse raccomandate

### Opzione A — Fix P0 batch (kill-priority)
~30h work, 10 fix. Sblocco massimo gameplay coverage + UX clarity. Ship come 5-10 PR atomici. **Raccomandato se obiettivo è playtest live polished**.

### Opzione B — Vertical slice closure
Pick 1 pilastro (es. P4 MBTI) + chiudi tutti i finding (P0+P1+P2). ~15h. Showcase coherent. **Raccomandato se obiettivo è demo investitori/showcase**.

### Opzione C — Pattern A retro (anti-pattern killer)
1 sprint dedicato a wiring tutti gli engine orphan a surface (8 fix Pattern A). ~25h. **Raccomandato se obiettivo è recover ROI investimento engine già fatto**.

### Opzione D — User-driven (preferito utente)
Utente decide quale gap risolvere prioritariamente. Default: comincia da Top-3 (encounter loader + threat tile overlay + ancestor status consumers) per impact massimo.

---

## File reference

- Catalog parent: [`docs/reports/2026-04-26-design-corpus-catalog.md`](2026-04-26-design-corpus-catalog.md)
- 9 deep-analysis report sopra
- Memoria session: aggiornare `feedback_*` e `MEMORY.md` post-decision
