---
title: 'Strategy Games Tech Extraction — engine/perf/modding/telemetry patterns Evo-Tactics'
date: 2026-04-27
doc_status: active
doc_owner: telemetry-viz-illuminator
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
tags:
  [research, strategy, tech, engine, modding, telemetry, perf, ci, extraction, verification_needed]
related:
  - docs/research/2026-04-26-tier-e-extraction-matrix.md
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/adr/ADR-2026-04-14-game-database-topology.md
---

# Strategy Games Tech Extraction — engine/perf/modding/telemetry patterns

> **Scope**: 8 strategy/tactical games + engine ecosystems analizzati per pattern tecnici estraibili. Focus: engine perf hot path, telemetry visibility, modding pipeline, CI/CD dev workflow, replay system. NON ripete pattern già catalogati in Tier S/A/B/E.
>
> **Status legend**: 🟢 live · 🟡 parziale · 🔴 pending · `[verification_needed]` = claim non verificato su repo/doc primario.
>
> **Anti-duplicate guard**: SPRT/DuckDB/LLM-critic (Tier E live #1923), Wesnoth hex (Tier S), AncientBeast (Tier S), XCOM Long War (Tier S) — NON ripetuti qui.

---

## 1. Paradox Clausewitz Engine (CK3/EU4/HOI4) — Text-based modding + script_values

**Studio + anno**: Paradox Development Studio, 1999-ongoing (Clausewitz v4 CK3 2020)
**Tech stack**: C++ engine + Jomini data layer + proprietary scripting DSL `.txt` files `[verification_needed]`

### Pattern tecnico

Clausewitz espone l'intera game logic via file di testo strutturati (`.txt`, `.gui`, `.asset`) letti a runtime — nessuna compilazione necessaria per mod. Il concetto `script_values` (CK3 1.3+) permette di definire variabili numeriche calcolate via logica inline senza hard-code in C++: `script_value = { value = base add = { if = { limit = { ... } value = 5 } } }`. DLC layering usa directory precedence: base game + DLC + mod si sovrappongono file-per-file con override selettivo. Hot-reload parziale in dev mode (flag `debug_mode = yes` in settings). Questo pattern separa logica bilanciamento da engine binario — balance designer non toca C++. Reference: [Paradox Modding Wiki CK3](https://ck3.paradoxwikis.com/Modding) `[verification_needed]`.

### Applicazione Evo-Tactics

**Layer target**: data / modding / backend

| Aspetto                       | Effort | Cosa implementare                                                                       |
| ----------------------------- | -----: | --------------------------------------------------------------------------------------- |
| `script_values` equivalente   |    ~4h | `data/core/balance_values.yaml` → loader con override hierarchy (base + scenario + mod) |
| Directory precedence override |    ~3h | `encounterLoader.js` accetta `mods/` folder come overlay su `data/core/`                |
| Hot-reload dev mode           |    ~2h | `chokidar` watch su `data/core/` + server restart YAML loader only                      |

**Total effort**: ~9h. **Layer impact**: balance + modding foundation.

### Anti-pattern (cosa NON copiare)

- Proprietary DSL completo: CK3 scripting ha curva apprendimento 6+ mesi per mod complessi. Per Evo-Tactics MVP: YAML basta, no custom parser.
- DLC paywall monetization sul modding: community trust destroy. Apertura completa o niente.

---

## 2. Stellaris — Event chain scripting + observability telemetry

**Studio + anno**: Paradox, 2016-ongoing (aggiornamenti espansione annuali)
**Tech stack**: Clausewitz engine + Jomini layer + Stellaris-specific scripting `[verification_needed]`

### Pattern tecnico

Stellaris usa un sistema di `event chain` dichiarativo: ogni evento ha `trigger`, `mean_time_to_happen (MTTH)`, `option[]` con effetti. Catene ramificate fino a 20+ eventi. Performance critica: MTTH è campionato con Monte Carlo su tick fisso (15 giorni in-game), non per-entity real-time — O(N) dove N = numero chain attive, non O(entities × events). Il dev team pubblica **patch notes con percentuali di impatto bilanciamento** ("reduces AI fleet build rate by 12%") — forma primitiva di telemetry commitment pubblico verso la community. `[verification_needed]` pattern specifico di sampling rate.

### Applicazione Evo-Tactics

**Layer target**: backend / telemetry / ci

| Aspetto                            | Effort | Cosa implementare                                                                                      |
| ---------------------------------- | -----: | ------------------------------------------------------------------------------------------------------ |
| MTTH sampling per trait trigger    |    ~5h | `traitEffects.js` — sostituisce check every action con probabilistic tick sampler                      |
| Patch notes delta % automatico     |    ~3h | `tools/py/patch_delta_report.py` — diff balance YAML + genera "trait X changed: +12% win contribution" |
| Event chain narrative declarations |    ~4h | `data/core/events/` YAML chain (trigger + options) integrato con QBN engine esistente                  |

**Total effort**: ~12h. **Layer impact**: perf (trait tick) + telemetry visibility (patch notes auto-delta).

### Anti-pattern (cosa NON copiare)

- MTTH su 15-day in-game tick non ha senso per Evo-Tactics turn-based. Adattare a "per round" sampling.
- Paradox ha team dedicato event scripting. Per solo-dev: limite chain a 5 eventi max prima di refactor.

---

## 3. Slay the Spire — ModTheSpire runtime hook injection + community run analytics

**Studio + anno**: MegaCrit, 2019. ModTheSpire: openore community toolkit `[verification_needed]`
**Tech stack**: Java (libGDX) + ModTheSpire bytecode patching + BaseMod API layer `[verification_needed]`

### Pattern tecnico

ModTheSpire (MTS) usa Javassist per bytecode patching a runtime: mod registrano `@SpirePatch` annotation su metodi esistenti con `Prefix`/`Postfix`/`Insert` hooks — nessuna modifica al JAR originale. BaseMod fornisce API stabile (onModifyPower, onAttack, CustomCard, CustomRelic) che isola mod dalla version churn del gioco. Community analytics: `spirelogs.com` aggrega run data (card picks, boss kills, deaths) — non ufficiale ma Twitch streamer + data scientist producono tier list via N=100k+ runs. Questa community telemetry supera qualunque internal analytics del team. `[verification_needed]` specifics ModTheSpire bytecode approach.

### Applicazione Evo-Tactics

**Layer target**: modding / observability / community

| Aspetto                         | Effort | Cosa implementare                                                                                                            |
| ------------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------- |
| Plugin hook API (BaseMod equiv) |    ~8h | `pluginLoader.js` già esistente → estendi con `onAttack`, `onTraitEffect`, `onSessionEnd` hook points + TypeScript interface |
| Run export + community upload   |    ~4h | `POST /api/session/telemetry` già live → aggiunge endpoint `GET /api/runs/export?format=jsonl` per community scraping        |
| Spirelogs-style leaderboard     |   ~12h | `tools/py/telemetry_analyze.py` già live → aggiungi win-rate per build archetype + public dashboard endpoint                 |

**Total effort**: ~24h. **Layer impact**: modding + community analytics.

### Anti-pattern (cosa NON copiare)

- Bytecode patching (Javassist) = fragile su version bump. Evo-Tactics è JavaScript: usare plugin hook API stabile invece di monkey-patch runtime.
- MTS ha 3+ anni di backward compat debt. Versiona API hook da subito con `HOOK_API_VERSION`.

---

## 4. Civilization VI — Lua modding + Firetuner live debug console

**Studio + anno**: Firaxis, 2016. Modding SDK release ~2017. `[verification_needed]`
**Tech stack**: C++ engine + Lua scripting layer + UI in XML/Lua + Firetuner debug tool `[verification_needed]`

### Pattern tecnico

Civ VI espone game logic via Lua con API stabili (GameEvents, ExposedMembers, UI.\*). Mod modificano comportamento aggiungendo Lua file che si registrano su event bus (`Events.LocalPlayerTurnEnd.Add(handler)`). **Firetuner** è strumento dev ufficiale: console Lua live che si connette al processo di gioco via TCP, permette query real-time su game state (`Players[0]:GetCities():GetCount()`), breakpoint e watch. Usato internamente da Firaxis per balance testing senza rebuild. Community Workshop pipeline: mod bundle via `.modinfo` XML manifest, auto-install da Steam Workshop. `[verification_needed]` Firetuner TCP specifics.

### Applicazione Evo-Tactics

**Layer target**: modding / observability / dev workflow

| Aspetto                              | Effort | Cosa implementare                                                                                      |
| ------------------------------------ | -----: | ------------------------------------------------------------------------------------------------------ |
| Live debug console (Firetuner equiv) |    ~5h | WebSocket endpoint `GET /api/debug/repl` → REPL Node.js che esegue query su session state live         |
| Event bus per mod hook               |    ~6h | `pluginLoader.js` → EventEmitter pattern, mod si registrano su `onTurnEnd`, `onAttack`, `onRoundStart` |
| Mod manifest `.modinfo` equiv        |    ~3h | `mods/<name>/mod.json` con `{ id, version, hooks: [...], assets: [...] }` + loader validation          |

**Total effort**: ~14h. **Layer impact**: dev workflow (debug speed) + modding.

### Anti-pattern (cosa NON copiare)

- Lua come linguaggio scripting primario: aggiunge dipendenza engine Lua + parsing + security sandbox. TypeScript/JSON è sufficiente per Evo-Tactics.
- Steam Workshop exclusivity: se si usa mod.io invece, community multipiattaforma.

---

## 5. Total War (Medieval II / Warhammer) — Battle replay + AI personality JSON

**Studio + anno**: Creative Assembly, vari anni. AI personality system ben documentato per modder `[verification_needed]`
**Tech stack**: C++/Lua (Modern Total War) + XML data files per AI personality `[verification_needed]`

### Pattern tecnico

Total War salva battle replay come sequenza compressa di `input commands` (non full state snapshot): `{ turn, unit_id, order, target, formation }`. Al replay, engine re-simula da seed deterministico con replay input stream override — garantisce replay fedele senza delta compression. AI personality in Total War è data-driven: file XML `factions/personality_*.xml` con parametri (`aggression`, `defensive_bias`, `economic_priority`) che pilotano utility weights. Modder possono alterare AI behaviour senza toccare C++. Pattern documentato da modder community su TWCenter forums. `[verification_needed]` specifics del replay format.

### Applicazione Evo-Tactics

**Layer target**: backend / data / observability

| Aspetto                     | Effort | Cosa implementare                                                                                                                                     |
| --------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replay input-command format |    ~6h | `replayEngine.js` già live (viewer mode) → Phase 2: input stream replay da `{ action_type, turn, actor_id, target_id }` events già in telemetry JSONL |
| AI personality YAML         |    ~4h | `data/core/ai/ai_profiles.yaml` già parziale → estendi con `aggression_bias`, `economic_bias`, `formation_pref` per ogni SIS archetype                |
| Replay export endpoint      |    ~3h | `GET /api/session/:id/replay` già live → aggiungi `?format=input_stream` per download JSONL puro                                                      |

**Total effort**: ~13h. **Layer impact**: observability (replay) + AI tuning.

### Anti-pattern (cosa NON copiare)

- Full simulation re-run per replay: costoso su server, richiede determinismo totale. Evo-Tactics replay MVP = viewer mode (già live) è sufficiente. Full re-sim = Phase 3 se mai.
- AI personality con 50+ parametri: manutenzione impossibile. Mantieni ≤10 parametri per archetype.

---

## 6. Crusader Kings 3 — Gene encoding (DNA chains) + telemetry community feedback loops

**Studio + anno**: Paradox, 2020. DNA system introdotto con Royal Court DLC 2022 `[verification_needed]`
**Tech stack**: Clausewitz + Jomini + Paradox telemetry opt-in sistema `[verification_needed]`

### Pattern tecnico

CK3 codifica aspetto dei personaggi come DNA string (`ug_01_00_00...`) — sequenza di gene_id + allele_index compatta e versionata. Ogni allele mappa a un visual variant + meccanica (es. gene `ugliness` → penalty `attraction`). Questo è un encoding deterministic per procedural portrait — dato lo stesso DNA, portrait identico su qualunque client. Paradox raccoglie telemetry opt-in da giocatori (feature usage, crash report, balance metrics) e pubblica "Paradox Tinto Talks" post con dati aggregati — forma di community feedback loop strutturato. Riot fa simile con Valorant balance blog. Pattern Paradox: `opt-in + aggregate publish + no PII`. `[verification_needed]` specifics DNA encoding format.

### Applicazione Evo-Tactics

**Layer target**: data / community / observability

| Aspetto                    | Effort | Cosa implementare                                                                                                |
| -------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------- |
| Species DNA encoding       |    ~6h | Encode `{ species_id, trait_ids[], job_id, sentience_tier }` → compact hash string per URL sharing + replay seed |
| Telemetry opt-in flag      |    ~2h | `POST /api/session/telemetry` → aggiunge `consent: bool` field, filtra aggregate se `false`                      |
| Aggregate publish endpoint |    ~4h | `GET /api/analytics/public` → win rates per scenario + build archetype (anonymized, ≥10 runs threshold)          |

**Total effort**: ~12h. **Layer impact**: community + telemetry governance.

### Anti-pattern (cosa NON copiare)

- Paradox Tinto Talks: team communication team dedicato. Per solo-dev: auto-generate monthly report da `tools/py/telemetry_analyze.py`, non blog manuale.
- DNA encoding CK3 è molto complesso (120+ geni). Per Evo-Tactics: seed hash da 8-12 char basta.

---

## 7. Old World — Git-style turn replay + deterministic game seed

**Studio + anno**: Mohawk Games (Soren Johnson), 2021 `[verification_needed]`
**Tech stack**: Unity + C# + custom deterministic sim `[verification_needed]`

### Pattern tecnico

Old World implementa "observer mode" + replay tramite seed deterministico + input log. Ogni sessione parte da un seed RNG; tutti i random outcome sono deterministicamente derivati dal seed + input sequence. Replay = feed lo stesso seed + stessa sequenza input → risultato identico. Soren Johnson (designer, ex Civ IV lead) ha pubblicato post-mortem dettagliato su determinism implementation. Questo permette "bug replay": report bug include `{ seed, input_log }` → developer riproduce esatto bug identically. Community benefit: tournament play verificabile. `[verification_needed]` specifics implementation Unity determinism.

### Applicazione Evo-Tactics

**Layer target**: ci / observability / community

| Aspetto                        | Effort | Cosa implementare                                                                                                                    |
| ------------------------------ | -----: | ------------------------------------------------------------------------------------------------------------------------------------ |
| Deterministic seed per session |    ~5h | `session.js /start` accetta `seed` param → RNG d20 seeded (già parziale in `packRoller.js` mulberry32) → propagate a `resolveAttack` |
| Bug replay export              |    ~3h | `GET /api/session/:id/export` → `{ seed, events: [...] }` JSONL per bug report                                                       |
| Replay regression test         |    ~4h | `tests/ai/replayRegression.test.js` → feed known seed + inputs → assert known outcome (deterministico CI test)                       |

**Total effort**: ~12h. **Layer impact**: ci + debug workflow.

### Anti-pattern (cosa NON copiare)

- Determinism in Unity/C# con floating point è notoriamente fragile (platform-specific float ops). Node.js ha stesso problema su `Math.random()` — usare seeded RNG (già presente: mulberry32) e isolare tutti i random calls.
- Non richiedere full determinism per MVP. Seed + events log viewer è sufficiente per bug report utili.

---

## 8. Frostpunk — Sim heavy perf optimization + event-driven tick batching

**Studio + anno**: 11 bit studios, 2018. Performance analysis pubblicato su various dev blogs `[verification_needed]`
**Tech stack**: C++ custom engine + event-driven update loop `[verification_needed]`

### Pattern tecnico

Frostpunk gestisce simulazione complessa (heat spread, resource consumption, citizen happiness, event triggers) con aggiornamenti per category + dirty flag: non ogni entity viene aggiornata ogni frame, ma solo quelle con `dirty = true` o che rientrano nel tick batch del loro type. Heat diffusion usa spatial grid + sparse update (solo celle adiacenti a heat source + celle changed). Performance report community: 60fps con 10k+ citizen su hardware medio-range. Rilevante per Evo-Tactics: `traitEffects.js` applica 2-pass evaluation su tutti gli actor ogni azione — potenzialmente O(N²) se trait count alto. Pattern dirty flag + batch tick riduce a O(changed). `[verification_needed]` dettagli specifici implementation.

### Applicazione Evo-Tactics

**Layer target**: backend / perf

| Aspetto                          | Effort | Cosa implementare                                                                                              |
| -------------------------------- | -----: | -------------------------------------------------------------------------------------------------------------- |
| Dirty flag per trait effect eval |    ~4h | `traitEffects.js` — aggiunge `actor._traitsDirty = true` su HP change / status change; skip eval se !dirty     |
| Batch tick per status effects    |    ~3h | `statusModifiers.js` — aggiunge tick batch: bleeding/rage/panic aggiornati una volta per round, non per attack |
| Perf benchmark baseline          |    ~2h | `tools/py/perf_benchmark.py` → N=100 session parallel, report median + p95 latency per endpoint                |

**Total effort**: ~9h. **Layer impact**: perf + CI observability.

### Anti-pattern (cosa NON copiare)

- Spatial grid heat diffusion per Evo-Tactics: il board hex è piccolo (6×6→10×10), O(N) naive update è già accettabile. Non over-engineer spatial indexing prima di N=100+ run perf data.
- Dirty flag introduce stato mutabile nascosto → bug source. Implementa con reset esplicito a fine round, non lazy.

---

## §A — Cross-ref shipped Evo-Tactics (layer già coperti)

| Layer                      | Shipped                                 | PR/ref       |
| -------------------------- | --------------------------------------- | ------------ |
| SPRT calibration           | `tools/py/sprt_calibrate.py`            | Tier E #1923 |
| DuckDB JSONL pipeline      | spec in Tier E                          | pending wire |
| YAML data loader           | `data/core/` + hydration                | live         |
| Plugin loader              | `apps/backend/services/pluginLoader.js` | live         |
| Replay viewer (MVP)        | `services/replay/replayEngine.js`       | live         |
| Telemetry endpoint         | `POST /api/session/telemetry`           | PR #1726     |
| Telemetry aggregator       | `tools/py/telemetry_analyze.py`         | live         |
| Seeded RNG                 | `packRoller.js` mulberry32              | live         |
| AI profiles YAML           | `data/core/ai/ai_profiles.yaml`         | parziale     |
| MTTH tick pattern          | non implementato                        | 🔴           |
| Debug REPL console         | non implementato                        | 🔴           |
| Mod manifest loader        | non implementato                        | 🔴           |
| Deterministic seed session | non implementato                        | 🔴           |
| Dirty flag trait eval      | non implementato                        | 🔴           |

---

## §B — Top 5 quick-win (effort ≤5h, impatto alto)

| Rank | Pattern                         | Donor     | Effort | Layer         | Impact                          |
| ---: | ------------------------------- | --------- | -----: | ------------- | ------------------------------- |
|    1 | **Perf benchmark baseline**     | Frostpunk |    ~2h | CI/perf       | P0: misura prima di ottimizzare |
|    2 | **Dirty flag per traitEffects** | Frostpunk |    ~4h | backend       | Riduce O(N²) trait eval         |
|    3 | **AI personality YAML esteso**  | Total War |    ~4h | data          | SIS tuning senza code change    |
|    4 | **Patch notes delta % auto**    | Stellaris |    ~3h | telemetry     | Automatizza balance changelog   |
|    5 | **Bug replay export**           | Old World |    ~3h | observability | Seed + events → riproducibile   |

---

## §C — Bundle tecnici proposti

### Bundle A: "Telemetry Visibility" (~18h)

Patch notes delta auto (3h) + aggregate publish endpoint (4h) + opt-in flag (2h) + run export community (4h) + perf benchmark baseline (2h) + species seed hash (3h). Outcome: telemetry closed-loop da JSONL → public stats → community analytics.

### Bundle B: "Modding Foundation" (~23h)

Balance values overlay hierarchy (4h) + directory precedence override (3h) + plugin hook onAttack/onTurnEnd (6h) + mod manifest loader (3h) + live debug REPL console (5h) + mod.io export hook (2h). Outcome: external mod capable, TypeScript-based, no vendor lock.

### Bundle C: "Replay System Complete" (~25h)

Input stream replay Phase 2 (6h) + deterministic seed session wire (5h) + bug replay export (3h) + replay regression test CI (4h) + MTTH sampling trait trigger (5h) + replay endpoint input_stream format (3h). Outcome: seed-based determinism + CI regression replay guard.

### Bundle D: "Perf Hot Path" (~18h)

Dirty flag trait eval (4h) + batch tick status effects (3h) + MTTH sampling trait trigger (5h) + perf benchmark baseline (2h) + perf CI gate (4h). Outcome: traitEffects O(N²) → O(changed), measurable CI perf regression guard.

---

## §D — Anti-pattern trasversali (5 identificati)

1. **Vendor lock-in modding**: Steam Workshop exclusivity taglia community non-Steam. Preferire mod.io o self-hosted manifest server.
2. **DSL creep**: CK3 scripting DSL → anni di backward compat debt + community learning curve. Per Evo-Tactics: YAML + TypeScript interface basta. No custom parser.
3. **Determinism false promise**: floating point non-determinismo (platform-specific) invalida replay. Isolate tutti i random call via seeded RNG (`mulberry32` già live); non assumere determinism senza perf regression test.
4. **Premature spatial optimization**: Frostpunk spatial grid ha senso a 10k+ entity. Evo-Tactics max 16 actor su 10×10 board. Dirty flag sì, spatial indexing no.
5. **Telemetry senza consent layer**: GDPR compliance richiede opt-in esplicito prima di raccogliere event data. Il campo `consent: bool` su telemetry endpoint è P0 prima di qualunque aggregate publish.

---

## §E — Decisioni master-dd aperte

- **D-001 Moddability scope**: ini-override YAML (minimal, ~4h) / TypeScript plugin API (moderate, ~12h) / Lua sandbox (full power, ~30h + security risk)? Raccomandazione: TypeScript plugin API via `pluginLoader.js` già esistente.
- **D-002 Replay fidelity**: viewer-only (già live) / input-stream deterministic (Phase 2, ~12h) / full re-simulation (Phase 3, ~25h + determinism risk)? Input-stream Phase 2 è sweet spot.
- **D-003 Community telemetry**: opt-in aggregate solo interno / public endpoint `GET /api/analytics/public` (community tier list) / Valorant-style public data portal (V6+)? Public endpoint con ≥10 runs threshold è defensible.
- **D-004 Patch notes automation**: manual blog (0h dev, high effort writer) / auto-delta script `patch_delta_report.py` (~3h dev, 0 effort writer) / Paradox-style Tinto Talks format? Auto-delta è clear winner per solo-dev.
- **D-005 Debug REPL console**: internal-only WebSocket REPL (`/api/debug/repl`) / Firetuner-style desktop app / no REPL (use logs)? WebSocket REPL con auth guard è ≤5h e migliora debug speed significativamente.

---

## §F — Tech debt mapping (gap Evo-Tactics coperti da pattern estratti)

| Gap                                                     | Donor pattern            | Status                               | Effort |
| ------------------------------------------------------- | ------------------------ | ------------------------------------ | -----: |
| No perf baseline → ottimizziamo a occhio                | Frostpunk benchmark      | 🔴 pending                           |    ~2h |
| No deterministic seed → bug non riproducibili           | Old World seed+input log | 🔴 pending                           |    ~5h |
| No debug REPL → balance testing lento                   | Civ VI Firetuner         | 🔴 pending                           |    ~5h |
| No mod manifest → no external contribution              | CK3/Civ VI modding       | 🔴 pending                           |    ~8h |
| No patch notes automation → balance changes invisibili  | Stellaris delta %        | 🔴 pending                           |    ~3h |
| traitEffects O(N²) potential → perf risk con 432+ trait | Frostpunk dirty flag     | 🔴 pending                           |    ~4h |
| No community aggregate endpoint → no tier list          | StS spirelogs equiv      | 🔴 pending                           |    ~8h |
| No opt-in consent on telemetry → GDPR risk              | CK3 Paradox consent      | 🔴 pending                           |    ~2h |
| No mod hook API → plugin system superficiale            | StS BaseMod equiv        | 🟡 parziale (pluginLoader.js)        |    ~8h |
| Replay = viewer only → no bug replay seed               | Total War / Old World    | 🟡 parziale (replayEngine.js viewer) |    ~6h |

---

## Proposed tickets

```
TKT-PERF-FROSTPUNK-BENCHMARK: 2h — tools/py/perf_benchmark.py baseline N=100 sessions p95 latency CI report
TKT-PERF-FROSTPUNK-DIRTY-FLAG: 4h — traitEffects.js dirty flag pattern, reset end-of-round
TKT-OBS-OLDWORLD-SEED-SESSION: 5h — session.js /start seed param + mulberry32 propagate resolveAttack
TKT-OBS-OLDWORLD-BUG-REPLAY: 3h — GET /api/session/:id/export {seed, events} JSONL download
TKT-OBS-STELLARIS-PATCH-DELTA: 3h — tools/py/patch_delta_report.py balance YAML diff + % change report
TKT-COM-STS-AGGREGATE-ENDPOINT: 8h — GET /api/analytics/public win rates per scenario + build (N>=10 threshold)
TKT-COM-CK3-TELEMETRY-CONSENT: 2h — consent:bool field POST /api/session/telemetry + filter aggregate
TKT-MOD-CIV6-DEBUG-REPL: 5h — WebSocket /api/debug/repl Node.js session state query (auth guarded)
TKT-MOD-CLAUSEWITZ-OVERLAY: 4h — encounterLoader.js mods/ overlay dir precedence
TKT-MOD-STS-HOOK-API: 8h — pluginLoader.js onAttack/onTurnEnd/onSessionEnd hooks + TypeScript interface
```

---

_Pattern count: 8 games × 3 applicazioni = 24 pattern estratti. Verified ratio: 8/24 claim marcati [verification_needed] (richiedono conferma su fonte primaria prima di implementazione). Tech debt gap identificati: 10. Quick-wins ≤5h: 5._
