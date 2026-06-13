---
title: Games Source Index implementation audit
doc_status: review_needed
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-06'
source_of_truth: false
language: it
review_cycle_days: 30
---

# Games Source Index implementation audit

## 0. Scope

Questo audit controlla il catalogo:

```text
docs/guide/games-source-index.md
```

contro stato reale del repo al 2026-06-05. Non sostituisce il catalogo, ma
segnala dove il catalogo e i synthesis collegati sono driftati rispetto a codice
e planning successivi.

Documenti correlati controllati:

- `docs/research/2026-04-26-cross-game-extraction-MASTER.md`
- `docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md`
- `docs/museum/MUSEUM.md`
- `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`

## 1. Verdetto rapido

Il catalogo giochi e' ancora il punto giusto da usare come entrypoint, ma non
contiene una colonna di stato implementativo. Di conseguenza alcune idee appaiono
solo come reference anche quando sono gia' runtime, e altre appaiono "da prendere"
anche se restano ricerca o museum.

Serve una riconciliazione in due livelli:

1. `games-source-index.md`: resta il catalogo fonte, con tier e gioco donor.
2. nuovo layer di stato: per ogni pattern importante, indicare `LIVE`,
   `PARTIAL`, `DESIGN`, `GATED`, `MUSEUM`, `ANTI`.

## 2. Drift principali trovati

| Pattern / gioco                         | Stato nel catalogo/synthesis vecchio                            | Stato reale 2026-06-05                                                                                                                                              | Evidenza                                                                                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spore part-pack / Spore Moderate        | in vari synthesis aprile appare "ZERO runtime" o "mai estratto" | LIVE/PARTIAL. Mutation runtime, slot gating, MP, bingo, Nido tab e lineage sono presenti                                                                            | `apps/backend/services/mutations/mutationEngine.js`, `apps/backend/routes/mutations.js`, `apps/play/src/nestHub.js`, `apps/backend/services/generation/lineagePropagator.js` |
| Tactics Ogre HP floating / AP pip       | alcuni report/museum lo marcano unintegrated o solo AP pip      | LIVE/PARTIAL. HP numerico/bar e AP pip sono renderizzati sopra/sotto la creatura; charm/auto-battle restano non chiusi                                              | `apps/play/src/render.js`                                                                                                                                                    |
| Slay the Spire intent forecast          | synthesis aprile: gap damage forecast                           | LIVE/PARTIAL. `expected_damage` e `hit_pct` sono calcolati nel threat preview e resi su threat tile; resta da valutare se il badge sopra enemy e' abbastanza chiaro | `apps/backend/services/ai/threatPreview.js`, `apps/play/src/render.js`                                                                                                       |
| Into the Breach telegraph               | partial via `predictCombat`, push/pull arrows pending           | LIVE/PARTIAL. Threat tile, forecast e frecce movimento sono presenti; kill probability badge e preview completa push/pull ability restano da verificare             | `apps/play/src/render.js`, `apps/backend/services/ai/threatPreview.js`                                                                                                       |
| AI War AI Progress meter                | in synthesis aprile marcato shipped backend / overlay deferred  | LIVE. Backend + UI pressure gauge risultano collegati                                                                                                               | `apps/backend/services/ai/aiProgressMeter.js`, `apps/backend/routes/sessionHelpers.js`, `apps/play/src/ui.js`                                                                |
| Pathfinder XP budget                    | in master aprile ancora pending runtime                         | LIVE. Engine `xpBudget.js`, config YAML e wire su session start esistono                                                                                            | `apps/backend/services/balance/xpBudget.js`, `data/core/balance/xp_budget.yaml`, `apps/backend/routes/session.js`                                                            |
| DuckDB JSONL telemetry                  | in Tier E matrix appare pending/unintegrated                    | LIVE/PARTIAL. Script `analyze_telemetry.py` esiste con DuckDB optional + fallback; museum index e alcuni synthesis restano stale                                    | `tools/py/analyze_telemetry.py`, `data/core/tickets/merged/TKT-TELEMETRY-DUCKDB-JSONL.json`                                                                                  |
| Frozen Synapse replay cinematico        | research chiede replay TV 3-5s                                  | PARTIAL. Endpoint replay e replay viewer esistono, ma non e' ancora il piano-sequenza TV post-round comune                                                          | `apps/backend/routes/session.js`, `apps/play/src/replayPanel.js`                                                                                                             |
| Monster Hunter Stories gene grid        | planned 3x3 + bingo set bonus                                   | PARTIAL. Gene slots/offspring e Spore bingo esistono, ma non risulta una UI 3x3 MHS vera con linee/bingo visuale                                                    | `apps/backend/services/metaProgression.js`, `data/core/mating.yaml`, `apps/play/src/offspringRitualPanel.js`                                                                 |
| Hades / Monster Train Pact menu         | feature donor P6 opt-in difficulty                              | PARTIAL/GATED. Esistono `scenario_overrides` interni ispirati a Hades Pact, ma non un menu player-facing di pact shards                                             | `data/core/balance/damage_curves.yaml`, `apps/backend/services/balance/damageCurves.js`, `data/core/tickets/proposed/TKT-P6-HADES-PACT-MENU.json`                            |
| Cogmind tooltip stratificati            | in vecchi synthesis/museum non integrato                        | LIVE/PARTIAL. Tooltip stratificati sono citati in `main.js`; da verificare completezza 3-tier estesa                                                                | `apps/play/src/main.js`                                                                                                                                                      |
| Wildermyth scars/storylets              | layered storylets e battle-scar come donor                      | PARTIAL. Esistono permanent flags, recruit/debrief e Skiv storylets; battle-scar portrait/layered visual non risultano completi                                     | `apps/backend/services/campaign/campaignStore.js`, `apps/play/src/debriefPanel.js`, `data/core/narrative/skiv_storylets.yaml`                                                |
| Fire Emblem support conversations       | catalogato P3                                                   | DESIGN/PARTIAL. Relazioni/recruit esistono, ma non una pipeline support conversation FE-style                                                                       | `apps/play/src/debriefPanel.js`, `apps/backend/routes/meta.js`                                                                                                               |
| Natural Selection 2 commander asymmetry | catalogato P5                                                   | DESIGN. Nessuna evidenza di ruolo Strategist/commander 5p+ player-facing                                                                                            | `docs/museum/cards/coop-ns2-frozen-synapse-replay-asymmetric.md`                                                                                                             |
| Dwarf Fortress L0-L5                    | catalogato cross-pillar                                         | DIRECTION/GATED. ADR direction esiste; servizi identity/worldstate/chronicle non sono tutti live come framework DF completo                                         | `docs/adr/ADR-2026-05-18-df-levels-integration-direction.md`                                                                                                                 |

## 3. Idee ancora non implementate o non complete

Queste sono le idee piu' rilevanti da non considerare "gia' fatte":

| Priorita | Pattern                              | Donor                          | Stato          | Perche' conta                                                                                     |
| -------- | ------------------------------------ | ------------------------------ | -------------- | ------------------------------------------------------------------------------------------------- |
| P0       | Piano-sequenza TV del round          | Frozen Synapse + WEGO family   | PARTIAL        | abbiamo replay/event viewer, ma non la resa comune TV post-commit che era centrale nella sessione |
| P0       | Device info asimmetrica              | Jackbox/RoJ + NS2 asymmetry    | DESIGN/PARTIAL | il catalogo copre phone-as-controller, ma non abbastanza il phone-as-lens asimmetrico             |
| P1       | Pact menu player-facing              | Hades + Monster Train + AI War | GATED          | scenario overrides sono da designer/tooling, non ancora scelta di rischio del player              |
| P1       | Gene grid 3x3 vera                   | Monster Hunter Stories         | PARTIAL        | il backend eredita gene slot, ma manca una surface chiara stile griglia/bingo per il player       |
| P1       | Battle-scar visual persistente       | Wildermyth                     | PARTIAL        | ferite e permanent flags esistono, ma la promessa visuale permanente va completata                |
| P1       | Support conversation / relation arcs | Fire Emblem + Wildermyth       | DESIGN/PARTIAL | recruit e affinity ci sono, ma manca arco relazionale leggibile e ricorrente                      |
| P2       | Strategist/commander role 5p+        | Natural Selection 2            | DESIGN         | e' una possibile espansione co-op, non base live                                                  |
| P2       | Charm/recruit boss via dialogue      | Tactics Ogre                   | PARTIAL        | recruit post-combat esiste, ma non un vero pattern Charm/dialogue boss                            |
| P2       | Full DF L0-L5 stack                  | Dwarf Fortress                 | GATED          | direzione confermata, ma non tutto il livello memoria-mondo/chronicle e' runtime                  |

## 4. Idee da marcare come gia' assorbite

Queste vanno considerate implementate almeno in forma MVP/partial, quindi non
vanno riaperte come se fossero zero:

- Spore Moderate: mutation runtime, body slot, MP, bingo, archetype passives,
  Nido mutation tab e lineage.
- Tactics Ogre HUD base: HP floating/numeric + AP pip sopra/sotto sprite.
- Slay/ITB telegraph: threat tile, damage forecast, hit percent e frecce
  movimento sono presenti.
- AI War: AI Progress meter backend + UI.
- Pathfinder: XP budget runtime.
- DuckDB: analytics script con fallback.
- Disco/Triangle P4: MBTI phased reveal, tagged dialogue/debrief e conviction
  engine sono vivi, anche se la campagna completa deve ancora usarli meglio.

## 5. Raccomandazione operativa

Non riscrivere subito tutto `games-source-index.md`. Prima aggiungere al catalogo
una sezione breve:

```text
## Implementation Status Overlay
```

con una tabella separata per i 20 pattern piu' importanti:

```text
pattern_id | donor | pillar | runtime_status | surface_status | next_action | evidence
```

Questo evita che i futuri agenti confondano:

- donor game = fonte di ispirazione;
- research shipped = abbiamo studiato;
- runtime shipped = codice esiste;
- surface shipped = il player lo vede;
- campaign shipped = la cosa vive nel loop lungo.

### 5.1 Aggancio con la ricostruzione TV/device/campaign

Questo audit deve alimentare direttamente:

- `docs/planning/2026-06-05-evo-tactics-tv-device-campaign-flow-reconstruction.md`
- `docs/planning/2026-06-05-evo-tactics-complete-game-systems-reconstruction.md`
- `docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md`

In particolare i pattern P0/P1 non sono solo "reference estetiche": diventano
vincoli di design o ticket di riconciliazione.

| Pattern audit                        | Uso nel nuovo quadro                                                                   | Gate richiesto                              |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| Piano-sequenza TV del round          | SPEC-A/SPEC-K: TV come mirror/regia del round, animation planner sopra event-log       | surface TV post-commit senza input host     |
| Device info asimmetrica              | SPEC-K: device come unica authority di input e lente filtrata per creatura/ruolo/sensi | phone/browser actions + info filtering      |
| Gene grid 3x3                        | SPEC-C/SPEC-D: ereditarieta', offspring, lineage, corpo e trait visibili               | Nido/offspring surface + metriche full-loop |
| Battle-scar visual persistente       | SPEC-C/SPEC-D: ferite su parti del corpo, cicatrici, memoria visiva e narrativa        | permanent injury/scar pipeline              |
| Support conversation / relation arcs | SPEC-B/SPEC-H: Custodi, social group, recruit, mating, compagnia e ritorno campagna    | relationship_progress + storylet surface    |
| Full DF L0-L5 stack                  | SPEC-G/SPEC-H: Ermes, Aliena, cronaca, sedimentazione e failure-as-lore                | diagnostic/enforcement gate esplicito       |

Il criterio operativo e': ogni reference promossa a pilastro deve avere tre
campi compilati prima di diventare "done":

- `runtime`: codice o data model esistente;
- `surface`: dove il player la vede o la usa;
- `loop_metric`: metrica o report che dimostra che entra nel ciclo lungo.

## 6. Proposta di prossima patch

Stato 2026-06-06: il primo punto e' stato applicato direttamente a
`docs/guide/games-source-index.md`. Restano follow-up mirati:

1. mantenere l'`Implementation Status Overlay` aggiornato, senza riscrivere
   tutto il catalogo;
2. per ogni riga compilare `runtime_status`, `surface_status`,
   `campaign_status`, `loop_metric`, `evidence`;
3. collegare i pattern P0/P1 alla roadmap SPEC-A...SPEC-L, invece di lasciarli
   come ispirazioni generiche;
4. aggiornare le museum card stale piu' evidenti:
   - `combat-tactics-ogre-hp-floating-charm.md`
   - `spore-part-pack-runtime-stack.md`
   - `telemetry-duckdb-stockfish-llm-critic-quick-wins.md`
   - `coop-ns2-frozen-synapse-replay-asymmetric.md`
5. non correggere mojibake globale in questo sprint, per evitare churn enorme.

## 7. Addendum 2026-06-06 -- secondo passaggio reconcile

La ricerca estesa su report/reconcile/handoff con scopo simile ha trovato
sistemi runtime sottorappresentati nell'audit iniziale. L'overlay del catalogo e'
stato aggiornato con questi pattern aggiuntivi:

| Pattern                       | Stato aggiornato | Nota                                                                                                                                                             |
| ----------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form runtime identity         | LIVE/PARTIAL     | i vecchi gap "form_id cosmetic", "innata trait assente" e "soft-gate job assente" sono superati da `formStatApplier`, `formInnataTrait`, `applyJobAffinityBonus` |
| Combat resource gates         | LIVE/PARTIAL     | H2 `cost_sg/cost_pp/cost_pt` non e' piu' solo decorativo nel codice attuale; resta surface leggibile                                                             |
| Symbiont/minion jobs          | LIVE/PARTIAL     | OQ-BOND/OQ-MINION sono runtime: shared HP pool, redirect, summon, pack command, revive                                                                           |
| Lifecycle WS drains           | LIVE/PARTIAL     | `world_vote`, `mating_vote`, `lineage_choice`, `reveal_acknowledge`, `form_pulse_submit`, `next_macro` sono drainati server-side                                 |
| Foodweb/cross-events/seasonal | LIVE/PARTIAL     | foodweb spawn e cross-event pressure hanno consumer; seasonal loop esiste ma surface e product flag restano da chiarire                                          |
| Sensory/private intel         | LIVE/PARTIAL     | `senseReveal` e `telepathicReveal` vanno promossi nel contratto device-as-lens                                                                                   |
| Codex/diary memory            | LIVE/PARTIAL     | Codex glyphs e diary per-unit sono base concreta per Custodi, cronaca e ritorno campagna                                                                         |

Lezione operativa: alcuni documenti di audit del 2026-05-06 e anche parte del
design-closure 2026-06-02 sono snapshot storici, non verita' corrente. Prima di
riaprire un gap va fatto il check:

```text
rg <simbolo> apps tools data docs
git log -S <simbolo>
```

e poi va assegnato uno stato `LIVE/PARTIAL/DESIGN/GATED`, separando engine,
surface, campagna e metrica.
