# Museum — Evo-Tactics

> **Scope**: index curato di idee/meccaniche/research **sepolti** nel repo che potrebbero essere riusati. Pattern Hades Codex + Dublin Core Provenance.
>
> **Curatore canonical**: agent [`repo-archaeologist`](../../.claude/agents/repo-archaeologist.md). Solo lui scrive qui.
>
> **Lettori**: tutti gli altri agent (`balance-illuminator`, `creature-aspect-illuminator`, `narrative-design-illuminator`, `pcg-level-design-illuminator`, `economy-design-illuminator`, `telemetry-viz-illuminator`, `ui-design-illuminator`, `coop-phase-validator`, `sot-planner`, `playtest-analyzer`). **Consultare PRIMA di WebSearch / repo dig** quando iniziano un dominio nuovo.
>
> **Lifecycle entry**: `excavated` → `curated` → `reviewed` → `revived | rejected`. Card additive-only (no delete).
>
> **Cap**: prime 200 righe sono caricabili in context altri agent. Una linea per card, sotto ~150 char.

---

## 🏆 Top relevance (score 4-5 — revive priority)

- [Sentience Traits v1.0 — tier T1-T6 + interoception](cards/cognitive_traits-sentience-tiers-v1.md) — **5/5** · Skiv Sprint C diary unblock 3h · unintegrated
- [Enneagramma Mechanics Registry — 16 hook stub](cards/enneagramma-mechanics-registry.md) — **5/5** · plug-in `enneaEffects.js` 3h · unintegrated
- [Enneagramma Dataset — 9 tipi canonical](cards/enneagramma-dataset-9-types.md) — **5/5** · Skiv voice palette type 5/7 · unintegrated
- [Ancestors Neurons Dump — 34 trigger combat](cards/ancestors-neurons-dump-csv.md) — **4/5** · 22 reaction trigger Self-Control · unintegrated
- [Magnetic Rift Resonance — swarm trait T2](cards/old_mechanics-magnetic-rift-resonance.md) — **4/5** · Skiv Sprint A biomeResonance 2h · deferred
- [enneaEffects.js — orphan canonical 93 LOC](cards/enneagramma-enneaeffects-orphan.md) — **4/5** · wire onRoundEnd 2h · abandoned

---

## 📚 Per domain

### Ancestors

- [Ancestors Neurons Dump 01B — 34 trigger combat](cards/ancestors-neurons-dump-csv.md) — score 4/5 · 22 Self-Control reaction trigger · unintegrated

_Restanti: 8 artifact in inventory + 263 neuroni in binary `.zip` mancanti. Vedi [excavations/2026-04-25-ancestors-inventory.md](excavations/2026-04-25-ancestors-inventory.md)._

### Cognitive traits / Sentience

- [Sentience Traits v1.0 — tier T1-T6 + interoception hooks](cards/cognitive_traits-sentience-tiers-v1.md) — score 5/5 · Skiv Sprint C unblock · unintegrated

_Restanti: `incoming/sensienti_traits_v0.1.yaml` superseded (skip). False positive: `docs/guide/README_SENTIENCE.md` canonical T0-T6._

### Enneagramma

- [Enneagramma Mechanics Registry — 16 hook stub](cards/enneagramma-mechanics-registry.md) — score 5/5 · ready-to-wire · unintegrated
- [Enneagramma Dataset — 9 tipi canonical](cards/enneagramma-dataset-9-types.md) — score 5/5 · vcScoring.js extension · unintegrated
- [enneaEffects.js — orphan canonical](cards/enneagramma-enneaeffects-orphan.md) — score 4/5 · wire onRoundEnd · abandoned

📎 **Gallery**: [galleries/enneagramma.md](galleries/enneagramma.md) — 3 card stesso domain, narrative aggregato.

### Personality / MBTI extended

Vuoto. `incoming/personality_module.v1.json` (770 LOC dataset 9 tipi enneagram) score 4/5 candidate per next curate session. Vedi [excavations/2026-04-25-old_mechanics-inventory.md](excavations/2026-04-25-old_mechanics-inventory.md) #2.

### Mating / Nido / Reclutamento

Vuoto. Pending excavate `--domain mating_nido`. Tracker user OD-001. Doc `docs/core/Mating-Reclutamento-Nido.md` esistente, runtime zero.

### Old mechanics

- [Magnetic Rift Resonance — swarm trait T2](cards/old_mechanics-magnetic-rift-resonance.md) — score 4/5 · Skiv Sprint A biomeResonance · deferred

_Restanti: 4 candidate in inventory (engine_events.schema, integrated-design-map, recon_meccaniche, Python rules deprecated). Vedi [excavations/2026-04-25-old_mechanics-inventory.md](excavations/2026-04-25-old_mechanics-inventory.md)._

### Species candidate

Vuoto. Pending excavate `--domain species_candidate`. Atteso: `incoming/species/*.json` (10 specie pre-canonical), `incoming/swarm-candidates/traits/`.

### Architecture

Vuoto (cross-link a `enneaEffects.js` orphan, vedi sezione Enneagramma). Pending excavate dedicato per ADR superseded chain + `services/rules/DEPRECATED.md` + `docs/archive/concept-explorations/`.

### Other

Reserved per artifact che non match domain sopra.

---

## 📊 Stats

- **Excavations run**: 4 (ancestors / cognitive_traits / enneagramma / old_mechanics — tutti 2026-04-25)
- **Artifact identificati**: 28 totali (9 + 2 + 9 + 8)
- **Cards total**: 6 curate (top score 5/5: 3 · top score 4/5: 3)
- **Galleries**: 1 (enneagramma — 3 card stesso domain)
- **Last excavate**: 2026-04-25
- **Coverage**: 50% (4/8 priority domains explored — pending: personality / mating_nido / species_candidate / architecture)
- **Skiv unblock**: 6/6 card hanno reuse path Skiv-aware (Sprint A: 1, Sprint B: 1, Sprint C: 4)

---

## 🗂 Structure

```
docs/museum/
├── MUSEUM.md                                       # this file (index)
├── README.md                                       # how to use the museum
├── excavations/
│   ├── 2026-04-25-ancestors-inventory.md          # 9 artifact ancestors
│   ├── 2026-04-25-cognitive_traits-inventory.md   # 2 artifact sentience
│   ├── 2026-04-25-enneagramma-inventory.md        # 9 artifact enneagramma
│   └── 2026-04-25-old_mechanics-inventory.md      # 8 artifact old mechanics
├── cards/
│   ├── ancestors-neurons-dump-csv.md              # M-2026-04-25-004 score 4/5
│   ├── cognitive_traits-sentience-tiers-v1.md     # M-2026-04-25-001 score 5/5
│   ├── enneagramma-dataset-9-types.md             # M-2026-04-25-003 score 5/5
│   ├── enneagramma-enneaeffects-orphan.md         # M-2026-04-25-006 score 4/5
│   ├── enneagramma-mechanics-registry.md          # M-2026-04-25-002 score 5/5
│   └── old_mechanics-magnetic-rift-resonance.md   # M-2026-04-25-005 score 4/5
└── galleries/
    └── enneagramma.md                              # 3 cards aggregato
```

---

## 🔗 Cross-references

- Agent definition: [.claude/agents/repo-archaeologist.md](../../.claude/agents/repo-archaeologist.md)
- Provenance standard: [DCMI Provenance](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/provenance/)
- Backlog open: [BACKLOG.md](../../BACKLOG.md)
- Open decisions: [OPEN_DECISIONS.md](../../OPEN_DECISIONS.md) (5 nuove OD **TUTTE RISOLTE 2026-04-25** user verdict: OD-008 ✅ B incrementale, OD-009 ✅ Option 3 hybrid, OD-010 ✅ Type 5+7 A/B, OD-011 ✅ A 22 Self-Control + remind autonomous, OD-012 ✅ A single-shot magnetic_rift)
- Autonomous task queue: [BACKLOG.md "Museum-driven autonomous tasks"](../../BACKLOG.md) — 5 ticket scheduled (TKT-ANCESTORS-RECOVERY P2 + TKT-MUSEUM-ENNEA-WIRE P1 + TKT-MUSEUM-SKIV-VOICES P1 + TKT-MUSEUM-SWARM-SKIV P0 + TKT-MUSEUM-ANCESTORS-22-TRIGGER P0)
- ADR index: [DECISIONS_LOG.md](../../DECISIONS_LOG.md)
- Skiv canonical: [data/core/species/dune_stalker_lifecycle.yaml](../../data/core/species/dune_stalker_lifecycle.yaml)

---

## 📅 Last verified

**2026-04-25** — First excavate session shipped. 4 domini coperti, 6 card curate, 1 gallery. 5 OPEN_DECISIONS candidate emerse (sentience backfill scope, ennea source canonical, Skiv type 5 vs 7, ancestors recovery scope, swarm integration scope).

**Next excavate consigliato**: `--domain personality` (per personality_module.v1.json 770 LOC) o `--domain species_candidate` (10 specie + swarm-candidates).
