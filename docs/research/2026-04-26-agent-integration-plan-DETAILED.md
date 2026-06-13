---
title: 'Agent Integration Plan DETAILED — cross-link + pattern matching + ticket auto-gen'
date: 2026-04-26
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [agent, integration, planning, donor-games, sprint-backlog, ticket-automation]
related:
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/research/2026-04-26-tier-a-extraction-matrix.md
  - docs/research/2026-04-26-tier-b-extraction-matrix.md
  - docs/research/2026-04-26-tier-e-extraction-matrix.md
---

# Agent Integration Plan — DETAILED execution spec

> **Scope**: piano dettagliato per integrare i 16 agent illuminator con i 4 extraction matrix. Da eseguire ora (step 1+2) o salvare per dopo (step 3 M14).
>
> **Output target**: ogni audit agent illuminator produce findings + donor game citation + ticket BACKLOG-ready.

---

## §0 — TL;DR esecuzione

| Step                            | Effort |  Status  | Quando                |
| ------------------------------- | -----: | :------: | --------------------- |
| Step 1 — Cross-link automatico  |    ~2h | pending  | Now (questa session)  |
| Step 2 — Smart pattern matching |    ~3h | pending  | Now (questa session)  |
| Step 3 — Ticket auto-generation |    ~5h | deferred | M14+ sprint dedicated |

**Pre-requisiti**:

- 4 extraction matrix shipped ✅ (`docs/research/2026-04-26-tier-{S,A,B,E}-extraction-matrix.md`)
- MASTER aggregato ✅ (`docs/research/2026-04-26-cross-game-extraction-MASTER.md`)
- `docs/guide/games-source-index.md` 419 LOC (PR #1883 pending merge)

**Bloccanti**: nessuno per step 1+2. Step 3 richiede M14 sprint slot + decisione user su ticket schema.

---

## §1 — Step 1 — Cross-link automatico (~2h)

### Obiettivo

Ogni `.claude/agents/*-illuminator.md` (16 file) deve avere una sezione `## Donor games (extraction matrix)` che linka **subset filtrato per pillar/owner** dei 4 extraction matrix.

### Inventario agent (16 file)

| Agent                          | Pillar focus        | Donor games owned (da matrix)                                                           |     Action     |
| ------------------------------ | ------------------- | --------------------------------------------------------------------------------------- | :------------: |
| `balance-illuminator`          | P6 fairness + cross | Stockfish SPRT, MAP-Elites, MCTS, LLM-as-critic, Bayesian, Pathfinder XP, Hearthstone   |      edit      |
| `balance-auditor`              | P6 outliers         | trait_mechanics outliers, ai_intent_scores, Pathfinder bestiary, Hearthstone deck space |      edit      |
| `creature-aspect-illuminator`  | P2 + P3 + Skiv      | Caves of Qud, MHS, CK3, Subnautica, Wildermyth, Spore, Cogmind, Voidling Bound          |      edit      |
| `economy-design-illuminator`   | P2 + P6             | StS, Hades, MT, Voidling Bound, Balatro                                                 |      edit      |
| `narrative-design-illuminator` | P4 narrative        | ink/inkle, QBN, Disco, Wildermyth, Frozen Synapse, Hades GDC                            |      edit      |
| `pcg-level-design-illuminator` | P5 PCG + P1 level   | ITB, Dead Cells, WFC, Spelunky, Dormans, Wesnoth, Wargroove, Songs of Conquest          |      edit      |
| `telemetry-viz-illuminator`    | telemetria + viz    | Tufte, Grafana, Riot/Valorant, deck.gl, DuckDB, LW2 timer, Stockfish ELO                |      edit      |
| `ui-design-illuminator`        | P1 UI               | ITB, StS, Dead Space, Jackbox, Tactics Ogre, Halfway, Frozen Synapse, AI War            |      edit      |
| `coop-phase-validator`         | P5 coop             | Jackbox, M11, AI War, NS2                                                               |      edit      |
| `playtest-analyzer`            | playtest            | Halfway, Cogmind, Battle Brothers                                                       |      edit      |
| `migration-planner`            | infra               | (no donor)                                                                              |      skip      |
| `repo-archaeologist`           | museum              | Software Archaeology, Dublin Core, git pickaxe (già live agent)                         | edit (refresh) |
| `schema-ripple`                | schema impact       | (no donor)                                                                              |      skip      |
| `session-debugger`             | runtime debug       | (no donor)                                                                              |      skip      |
| `sot-planner`                  | SoT                 | (no donor)                                                                              |      skip      |
| `species-reviewer`             | species data        | (donor via creature-aspect)                                                             |      skip      |

**Edit count**: 10 agent illuminator. **Skip 6** (migration, schema-ripple, session-debugger, sot-planner, species-reviewer) — non hanno donor games extraction relevant.

### Template sezione da aggiungere

Per ogni agent edit, aggiungi alla fine del file (prima dei delimitatori finali):

```markdown
---

## Donor games (extraction matrix)

> Cross-link a `docs/research/2026-04-26-cross-game-extraction-MASTER.md` filtrato per ownership di questo agent.

### Tier S deep-dive (alta autorità, transfer plan completo)

- **{Game name}** — {feature key} → [tier-S matrix](../../docs/research/2026-04-26-tier-s-extraction-matrix.md#{anchor})
  - Status: 🟢 live | 🟡 parziale | 🔴 pending
  - Reuse path: Minimal {N}h / Moderate {N}h / Full {N}h

### Tier A feature donor

- **{Game name}** — {feature} → [tier-A matrix](../../docs/research/2026-04-26-tier-a-extraction-matrix.md#{anchor})
  - Status: ...
  - Reuse path: ...

### Tier B postmortem (lessons)

- **{Game name}** → [tier-B matrix](../../docs/research/2026-04-26-tier-b-extraction-matrix.md#{anchor})
  - Lezione: {1-2 frasi}

### Tier E algoritmi/tooling

- **{Voce}** → [tier-E matrix](../../docs/research/2026-04-26-tier-e-extraction-matrix.md#{anchor})
  - Status integration: ...

### Quick-wins suggested per questo agent

| Rank | Feature   | Donor  | Effort | Pillar |
| ---: | --------- | ------ | -----: | :----: |
|    1 | {feature} | {game} |    {h} |  P{N}  |

> **Pattern**: quando esegui audit, cita SEMPRE donor game + effort + status nel report. Esempio:
> _"Gap UI threat tile overlay (P1). Pattern donor: Into the Breach telegraph rule (Tier A, status 🟢 shipped PR #1884). Reuse path Minimal 3h."_
```

### Esecuzione step 1

**Tempo realistico**: 10-12 minuti per agent × 10 agent = **100-120 minuti** (~2h confermato).

**Approccio batch**: per ogni agent illuminator:

1. Read current content (skip se file < 200 LOC, append solo)
2. Identifica donor games subset da MASTER §4 agent ownership matrix
3. Append sezione template con link risolti

---

## §2 — Step 2 — Smart pattern matching (~3h)

### Obiettivo

Quando agent illuminator viene **invocato** per audit/research, deve **automaticamente** citare donor games + effort + status nel report finale.

### Modifica al prompt template (per ogni agent)

Aggiungi sezione **"Output requirements"** in ogni agent profile:

```markdown
## Output requirements (smart pattern matching)

Quando produci report audit/research:

1. **Findings con donor citation obbligatoria**:
   Per ogni gap identificato, includi:
   - Pillar mappato (P1-P6)
   - Donor game match (da extraction matrix sezione sopra)
   - Reuse path effort (Min/Mod/Full ore)
   - Status implementation Evo-Tactics (🟢/🟡/🔴)

2. **Format esempio**:
```

GAP-001 (P1 Tattica): UI threat tile overlay missing.

- Donor: Into the Breach telegraph rule (Tier A 🟢)
- Pattern: tile pulse rosso semi-trasparente pre-attack telegraph
- Reuse path: Minimal 3h (additivo render.js)
- Esempio shipped: PR #1884 questa session

```

3. **Anti-pattern guard**:
Cita anche cosa NOT prendere se relevant (vedi MASTER §6 anti-pattern aggregato).

4. **Cross-card museum**:
Se gap mappa a museum card esistente, link la card.

5. **Ticket scaffold (preview Step 3)**:
Concludi report con sezione "Proposed tickets" formato:
```

TKT-{PILLAR}-{DONOR-GAME}-{FEATURE}: {effort}h — {1-frase descrizione}

```

```

### Edit batch step 2

Stessi 10 agent illuminator dello step 1. Modifica = aggiungi sezione "Output requirements" appena prima del file end.

**Tempo**: 15-20 min per agent × 10 = **150-200 min** (~3h confermato).

### Validation step 2

Test smoke: invoca un agent illuminator dummy con prompt audit semplice. Verifica output cita donor game + effort. Esempio:

```
Agent({
  description: "Test smart pattern matching ui-design",
  subagent_type: "ui-design-illuminator",
  prompt: "Audit UI overlay del gioco. Identifica 1 gap, cita donor game + effort + status."
})
```

Output atteso (verifica):

```
GAP: missing intent preview deterministico.
Donor: Slay the Spire intent preview (Tier A 🔴 pending).
Reuse path: Minimal 4h.
Status: render.js wire absent.
Proposed: TKT-UI-STS-INTENT-PREVIEW (4h)
```

---

## §3 — Step 3 — Ticket auto-generation (~5h, M14 deferred)

### Obiettivo

Audit agent **emette automaticamente** ticket BACKLOG-ready per ogni gap identificato. Eliminare manual ticket scribing.

### Architecture sketch (NO esecuzione adesso)

#### Componente 1: ticket schema canonical

File: `data/core/tickets/ticket_schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Ticket BACKLOG-ready",
  "type": "object",
  "required": ["id", "title", "pillar", "effort_hours", "donor_game", "agent_owner"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^TKT-(P[1-6]|UI|COMBAT|NARRATIVE|PCG|BALANCE|TELEMETRY|ECONOMY|CREATURE|COOP)-[A-Z-]+-[A-Z]+$"
    },
    "title": { "type": "string", "minLength": 5, "maxLength": 80 },
    "pillar": { "enum": ["P1", "P2", "P3", "P4", "P5", "P6"] },
    "effort_hours": { "type": "number", "minimum": 0.25, "maximum": 50 },
    "donor_game": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "tier": { "enum": ["S", "A", "B", "E"] },
        "matrix_anchor": { "type": "string" }
      }
    },
    "agent_owner": { "type": "string" },
    "status": { "enum": ["proposed", "open", "in_progress", "review", "merged", "rejected"] },
    "reuse_level": { "enum": ["minimal", "moderate", "full"] },
    "blast_radius": { "enum": ["isolated", "moderate", "wide"] },
    "blockers": { "type": "array", "items": { "type": "string" } },
    "created_at": { "type": "string", "format": "date" },
    "audit_source_doc": { "type": "string" }
  }
}
```

#### Componente 2: ticket store

File: `data/core/tickets/proposed/{TKT-ID}.json`

Ogni ticket = 1 file JSON. Naming: `TKT-{pillar}-{donor}-{feature}.json`.

#### Componente 3: agent emit hook

Ogni agent illuminator finale produce 2 output:

1. Markdown report (existing)
2. Ticket JSON files emit in `data/core/tickets/proposed/`

#### Componente 4: BACKLOG sync script

Tool: `tools/py/sync_proposed_tickets.py`

Flow:

1. Scan `data/core/tickets/proposed/*.json`
2. Validate schema
3. Append a `BACKLOG.md` sezione "🤖 Auto-proposed (review needed)"
4. Move accepted → `data/core/tickets/active/`
5. Move rejected → `data/core/tickets/rejected/` con motivo

#### Componente 5: review skill `.claude/skills/ticket-triage.md`

User flow:

```
/ticket-triage  → mostra 10 ticket auto-proposed più recenti
/ticket-triage accept TKT-UI-STS-INTENT-PREVIEW
/ticket-triage reject TKT-CREATURE-CK3-DNA --reason "OD-001 conflict"
```

### Effort breakdown step 3

| Sub-step                          | Effort | Note            |
| --------------------------------- | -----: | --------------- |
| Ticket schema JSON                |   0.5h | additive        |
| Ticket store directory + .gitkeep |  0.25h | trivial         |
| Agent emit hook (10 agent edit)   |     2h | template repeat |
| BACKLOG sync script Python        |   1.5h | tools/py        |
| ticket-triage skill               |     1h | .claude/skills  |

**Totale**: 5.25h. **Defer to M14** perché richiede:

- User decision su ticket schema (P0 review)
- User OK su `data/core/tickets/` directory creation
- Test E2E con 3+ agent run produrre real ticket

---

## §4 — Pattern dominante "Engine LIVE, Surface DEAD" — full detail

### Definition

Pattern ricorrente in Evo-Tactics: **infrastructure runtime build con effort significativo, ma NON wired al player surface**. Effetto: feature completata "tecnicamente" ma invisibile al giocatore.

Identificato durante deep-analysis 2026-04-26 (9 illuminator agent paralleli). 8 sistemi confermati orphan.

### Sub-pattern in giochi referenziati

Stessa malattia presente nel modo come donor games sono **studiati ma non integrati**:

#### Spore (P2 fonte primaria evoluzione)

- **Status doc**: solo 📌 referenced in `LIBRARY.md`
- **Status runtime**: ZERO part-pack genuino — abbiamo `data/core/forms/form_pack_bias.yaml` (16 MBTI form bias) ma NON è Spore-style emergent evolution
- **Gap critico**: Pilastro 2 dichiarato "Spore-like emergent evolution" ma 84 specie YAML → ZERO runtime evoluzione
- **Causa**: nessuno ha mai letto Spore postmortem GDC + creature creator design specs
- **Fix proposto**: `TKT-CREATURE-SPORE-PART-PACK` (~10h research + 20h runtime), Tier S deep extraction missing

#### Tactics Ogre Reborn (P1 UI HUD reference top)

- **Status doc**: ⭐⭐⭐⭐⭐ canonical reference in `docs/core/44-HUD-LAYOUT-REFERENCES.md`
- **Status runtime**: NESSUN HP bar floating sopra sprite implementato
- **Gap**: HUD canonical citato come gold standard ma render.js usa solo HP numeric in unit-log sidebar
- **Fix proposto**: `TKT-UI-HP-FLOATING` (~5h, P0 quick-win Tier S)

#### Hades (P2 multi-currency + Codex)

- **Status doc**: pattern Codex archive UX adopted in `repo-archaeologist` agent (museum-first protocol)
- **Status runtime**: currency duality (Mirror + Pact + Heat shards) NON adopted — abbiamo solo PE + PI single-flow
- **Gap**: agent imports HADES Codex UX MA economy pipeline non riflette multi-tier currency separation
- **Fix proposto**: `TKT-ECONOMY-HADES-PACT-MENU` (~4h, P2 difficulty modifiers)
- **Cross-ref**: Voidling Bound 3-currency separation (Mutagen / Research Points / Attribute Points) stesso pattern

#### Frozen Synapse (P1 simultaneous turn replay)

- **Status doc**: 🔬 deep-dive research in `docs/planning/tactical-lessons.md` §3
- **Status runtime**: ADR-2026-04-18 plan-reveal round model SHIPPED, MA replay cinematico round VCR (rewind/playback) NON adopted
- **Gap**: pattern lezione concreta documentata, ma "replay watching after commit" missing — player non può replay round
- **Fix proposto**: `TKT-NARRATIVE-FROZEN-SYNAPSE-REPLAY` (~6h, P2 third wave)

#### AI War: Fleet Command (P5+P6 asymmetric AI)

- **Status doc**: museum reference + memory `reference_tactical_postmortems.md`
- **Status runtime**: AI War decentralized AI rules NON adopted — abbiamo `utilityBrain.js` opt-in MA non decentralizzato per faction
- **Gap**: AI Progress meter + asymmetric rules pattern documentati, runtime monolithic SIS pressure single-dial
- **Fix proposto**: `TKT-UI-AI-PROGRESS-METER` (5h, P0 quick-win) + `TKT-AI-DECENTRALIZED-FACTION` (~12h, P3 third wave)

### Frequenza pattern

Su 61 voci catalogate:

- **🟢 live deep-adoption**: 10 voci (16%)
- **🟡 parziale "Engine LIVE Surface DEAD"**: 18 voci (30%)
- **🔴 pending zero adoption**: 33 voci (54%)

**Verdict**: 30% del corpus referenziato soffre di Engine-LIVE-Surface-DEAD. Pattern strutturale, non incidente isolato.

### Fix sistemico proposto

1. **Trigger automatic** in `repo-archaeologist`: ogni nuovo museum card check status runtime e flag se "Surface DEAD"
2. **Quarterly review**: extraction matrix re-scan ogni 3 mesi, riclassifica 🟡 → 🟢 o 🔴
3. **DoD nuovo agent/skill**: include verifica "is surface wired?" come gate prima di ship-ready

---

## §5 — Tier E status DETAILED breakdown

### 🟢 Live (5/20)

| Voce                                   | Status proof                                       | Owner       |
| -------------------------------------- | -------------------------------------------------- | ----------- |
| Software Archaeology (Hermann/Caimito) | `repo-archaeologist` agent excavate mode shipped   | repo-arch   |
| Dublin Core Provenance                 | museum cards frontmatter compliant 12/12           | repo-arch   |
| git pickaxe (`git log -S`)             | usato in excavations                               | repo-arch   |
| Game Design Patterns (Chalmers)        | reference cross-pillar in `external-references.md` | (read-only) |
| Game Programming Patterns (Nystrom)    | session engine refactor pattern adopted            | (read-only) |

### 🟡 Parziale (6/20)

| Voce                            | Spec doc esiste                                              | Runtime wire missing                       |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| MAP-Elites Quality-Diversity    | `docs/balance/2026-04-25-map-elites-archive.md`              | engine wire — manual JSON dump only        |
| Pathfinder XP budget            | `docs/research/triangle-strategy-transfer-plan.md` reference | `services/balance/xp_budget.js` non esiste |
| LLM-as-critic                   | `balance-illuminator` agent profile                          | Bayesian knob-tuning loop non runtime      |
| Machinations.io                 | `docs/balance/MACHINATIONS_MODELS.md` (4 visual models)      | Simulation runtime non wired               |
| Overwatch ECS pattern           | `external-references.md D` doc                               | session engine ECS adoption parziale       |
| Hearthstone MAP-Elites academic | balance-illuminator reference                                | Deck space algorithm non implementato      |

### 🔴 Pending (9/20)

| Voce                    | Effort adoption | Bloccanti                          |
| ----------------------- | --------------: | ---------------------------------- |
| Stockfish SPRT          |            3-4h | nessuno                            |
| Wave Function Collapse  |          20-25h | scope review                       |
| ASP constraint solvers  |            15h+ | new Python dep                     |
| MCTS playout            |          15-20h | post-MVP                           |
| Tufte sparklines        |            4-6h | telemetry-viz frontend             |
| Grafana dashboard       |           8-10h | infra+docker setup                 |
| Riot/Valorant analytics |            10h+ | post-playtest data                 |
| deck.gl hex WebGL       |            12h+ | Mission Console source unavailable |
| DuckDB JSONL pipelines  |            3-5h | nessuno (quick-win)                |

---

## §6 — Agent ownership concentration DETAILED

### Heatmap ownership

| Agent                            | Donor count attuale |                                                                           Donor da AGGIUNGERE step 1 | Total post-step-1 |
| -------------------------------- | ------------------: | ---------------------------------------------------------------------------------------------------: | ----------------: |
| **balance-illuminator**          |          6 (Tier E) | +5 (Pathfinder runtime, Hearthstone academic, Balatro iterazione, Stockfish SPRT, MAP-Elites engine) |                11 |
| **telemetry-viz-illuminator**    |      6 (Tier E viz) |              +5 (LW2 timer, Stockfish ELO drift, Mission timer pattern, Tufte concrete, deck.gl hex) |                11 |
| **ui-design-illuminator**        |                   4 |                           +4 (Tactics Ogre HP, Halfway numbers, Frozen Synapse replay, AI War meter) |                 8 |
| **creature-aspect-illuminator**  |                   5 |                               +3 (Spore part-pack, Wildermyth storylets, Cogmind component identity) |                 8 |
| **economy-design-illuminator**   |                   3 |                                  +3 (Hades Pact menu, Balatro emergent balance, Voidling 3-currency) |                 6 |
| **narrative-design-illuminator** |                   4 |                               +3 (Disco MBTI tag, Frozen Synapse replay narrative, Hades GDC vision) |                 7 |
| **pcg-level-design-illuminator** |                   5 |                          +3 (Wesnoth time-of-day, Wargroove hex commander, Songs of Conquest hybrid) |                 8 |
| **coop-phase-validator**         |                   2 |                                                            +2 (AI War decentralized, NS2 asimmetria) |                 4 |
| **playtest-analyzer**            |                   0 |                                  +3 (Halfway scope discipline, Cogmind tooltip, Battle Brothers ATB) |                 3 |
| **repo-archaeologist**           |     3 (Tier E live) |                                                                                        refresh links |                 3 |

**Totale agent edit step 1**: 10 file, ~30 nuovi donor links totali da aggiungere.

### Insight

- **balance + telemetry hot**: 11 voci ciascuno. Sono i 2 agent più tecnici, fanno extraction da Tier E principalmente.
- **playtest-analyzer empty pre-step-1**: 0 donor games. Major gap: Halfway scope discipline lesson cruciale ma mai citata.
- **migration-planner / schema-ripple / session-debugger / sot-planner / species-reviewer**: zero donor games applicable (operational/data agent, no design pattern transfer).

---

## §7 — Sprint backlog DETAILED

### P0 quick-wins bundle (~19h totali)

| Ticket ID                        | Feature                      | Donor               | Effort | Pillar | Owner           | Status pre |
| -------------------------------- | ---------------------------- | ------------------- | -----: | :----: | --------------- | :--------: |
| `TKT-UI-HP-FLOATING`             | HP bar floating sopra sprite | Tactics Ogre Reborn |     5h | P1 UI  | ui-design       |     🔴     |
| `TKT-COMBAT-WAIT-ACTION`         | Wait action defer turn       | FFT                 |     3h |   P1   | combat-engineer |     🔴     |
| `TKT-NARRATIVE-MBTI-TAG-DEBRIEF` | MBTI tag debrief reveal      | Disco Elysium       |     3h |   P4   | narrative       |     🔴     |
| `TKT-PCG-TIME-OF-DAY`            | Time-of-day biome bias       | Wesnoth             |     3h | P1+P3  | pcg             |     🔴     |
| `TKT-UI-AI-PROGRESS-METER`       | AI Progress meter            | AI War              |     5h |   P5   | ui+telemetry    |     🔴     |

**Pillar coverage P0**: P1 (3 ticket), P3 (1), P4 (1), P5 (1), P6 (0). **P6 missing in P0** → spostare 1 P6 quick-win:

**Bundle P0 v2 (consigliato)**: swap `TKT-PCG-TIME-OF-DAY` → `TKT-BALANCE-PATHFINDER-XP-BUDGET` (5-7h, P6).
Risultato: P1 (3) + P3 (1) + P4 (1) + P5 (1) + P6 (1) = full pillar coverage.

### P1 second wave (~25h)

| Ticket ID                           | Effort |  Pillar   |
| ----------------------------------- | -----: | :-------: |
| `TKT-CREATURE-SUBNAUTICA-LIFECYCLE` |     3h |    P2     |
| `TKT-UI-STS-INTENT-PREVIEW`         |     4h |   P1 UI   |
| `TKT-CREATURE-MHS-GENE-GRID`        |     4h |    P2     |
| `TKT-PCG-SPELUNKY-4X4`              |     4h |    P5     |
| `TKT-TELEMETRY-DUCKDB`              |   3-5h | telemetry |
| `TKT-PCG-TIME-OF-DAY` (se non P0)   |     3h |   P1+P3   |
| `TKT-BALANCE-STOCKFISH-SPRT`        |   3-4h |    P6     |

### P2 third wave (~30h)

| Ticket ID                             |                     Effort |    Pillar     |
| ------------------------------------- | -------------------------: | :-----------: |
| `TKT-NARRATIVE-FROZEN-SYNAPSE-REPLAY` |                         6h |     P1+P2     |
| `TKT-ECONOMY-HADES-PACT-MENU`         |                         4h |      P6       |
| `TKT-CREATURE-SPORE-PART-PACK`        | 10h research + 20h runtime | P2 (CRITICAL) |
| `TKT-PCG-WESNOTH-RECRUIT-RETAIN`      |                         5h |  P3 economy   |
| `TKT-UI-HALFWAY-SHOW-NUMBERS`         |                         4h |     P1 UI     |

### P3 deferred (>50h)

| Ticket ID                            | Effort | Note                       |
| ------------------------------------ | -----: | -------------------------- |
| `TKT-BALANCE-MAP-ELITES-ENGINE-FULL` | 12-15h | engine MAP-Elites runtime  |
| `TKT-PCG-WAVE-FUNCTION-COLLAPSE`     | 20-25h | scope review M-future      |
| `TKT-AI-MCTS-PLAYOUT`                | 15-20h | post-MVP                   |
| `TKT-CREATURE-SPORE-FULL-RUNTIME`    |   20h+ | dependency su P2 spec lock |

---

## §8 — 4 decisioni richieste utente DETAILED

### Decisione 1: Quick-win bundle P0 attivare?

**Opzioni**:

- **A** Bundle 5 originale (~19h): HP floating + Wait + MBTI tag + Time-of-day + AI progress meter — pillar coverage P1×3 + P3 + P4 + P5
- **B** Bundle v2 swap (~21h): swap Time-of-day → Pathfinder XP budget — pillar coverage P1×3 + P3 + P4 + P5 + P6 ✅ FULL
- **C** Custom: scegli 3-5 tu
- **D** Skip P0, vai P1 directly

**Default raccomandato**: **B** (full pillar coverage, +2h modesti).

### Decisione 2: Voidling Bound livello adoption?

**Opzioni** (research esistente `2026-04-26-voidling-bound-evolution-patterns.md`):

- **Minimal** (~1h): apri ticket TKT-MUTATION-P6-VISUAL + design debt flag
- **Moderate** (~5-6h): visual_swap_it 30 mutation + linter + Pattern 2 partial (5-6 mutation mutually_exclusive pilot)
- **Full** (~15-20h): wire all 6 pattern M14 mutation engine

**Default raccomandato**: **Moderate** (visual swap MANDATORY + linter prevent regression).

### Decisione 3: Spore deep extraction priorità?

**Opzioni**:

- **A** Skip — Spore P2 reference resta 📌, conta su Voidling Bound + Caves of Qud + MHS per coverage
- **B** Research only (~10h): scrivi `2026-04-26-spore-deep-extraction.md` come Triangle Strategy 65KB pattern
- **C** Full P2 native (~30h+): research + runtime part-pack genuino emergent evolution

**Default raccomandato**: **B** (chiude doc gap, runtime defer M14+). Pilastro 2 dichiarato Spore-like ma fonte primaria mai estratta = **embarrassment doc-vs-runtime**.

### Decisione 4: Agent integration step 1+2 OK?

**Step 1 (cross-link, ~2h)** + **Step 2 (smart pattern matching, ~3h)** = ~5h totali.

**Output atteso**: 10 agent illuminator updated con donor games subset + output requirements per cite donor + effort + status.

**Trigger validation**: smoke test 1 agent post-edit → verifica output cita donor.

**Opzioni**:

- **A** Sì — esegui ora step 1+2 (~5h)
- **B** Solo step 1 (~2h, isolated)
- **C** Defer entrambi M14
- **D** Modifica scope (es: solo top-3 agent)

**Default raccomandato**: **A** (low-risk, alta ROI per ogni futuro audit).

---

## §9 — Action items immediati post-decision

Se decisioni B + Moderate + B + A:

1. ✅ Apri PR-13 con bundle P0 5 ticket creation in `BACKLOG.md`
2. ✅ Apri PR-14 Voidling Moderate (~5-6h work)
3. ✅ Spawn agent research Spore deep extraction (~10h, async)
4. ✅ Esegui step 1 cross-link (~2h, 10 agent edit) → PR-15
5. ✅ Esegui step 2 smart matching (~3h, 10 agent edit) → PR-16

Totale work autonomous: ~21h spread su 5 PR.

---

## §10 — Anti-pattern guard step 1+2 esecuzione

**NON fare**:

- ❌ Edit agent profile senza READ first (rompi struttura)
- ❌ Aggiungi tutti 60+ donor in ogni agent (overwhelming, kill grep utility)
- ❌ Hardcode link assoluti `C:/Users/.../`
- ❌ Bypass governance frontmatter
- ❌ Edit migration-planner / schema-ripple / session-debugger / sot-planner / species-reviewer (no donor relevant)

**DA fare**:

- ✅ Read agent profile prima di append
- ✅ Filter donor subset by agent ownership (vedi MASTER §4 + §6)
- ✅ Link relativi `../../docs/research/...`
- ✅ Frontmatter compliant
- ✅ Test smoke post-edit con 1 agent dummy

---

## §11 — Salvataggio per dopo

Questo documento è il **piano canonico** per l'agent integration. Salva e referenzia in:

- `BACKLOG.md` sezione "Agent integration plan" (link a questo doc)
- `OPEN_DECISIONS.md` 4 nuove OD (decisione 1-4 sopra)
- Sprint kickoff M14 (step 3 ticket auto-gen)

Trigger consultation:

- Ogni volta che spawn nuovo agent illuminator
- Ogni audit cycle (M14+ quarterly review)
- Quando flag "Engine LIVE Surface DEAD" emerge

**Ownership**: `repo-archaeologist` agent (museum-first protocol estende a extraction matrix + agent integration).
