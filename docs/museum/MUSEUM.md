# Museum — Evo-Tactics

> **Scope**: index curato di idee/meccaniche/research **sepolti** nel repo che potrebbero essere riusati. Pattern Hades Codex + Dublin Core Provenance.
>
> **Curatore canonical**: agent [`repo-archaeologist`](../../.claude/agents/repo-archaeologist.md). Solo lui scrive qui.
>
> **Lettori**: tutti gli altri agent. **Consultare PRIMA di WebSearch / repo dig** quando iniziano un dominio nuovo. Pattern validato 2026-04-25 via cross-agent test (creature-aspect-illuminator letto MUSEUM.md spontaneously, found 6 GAP, saved 10-15 min repo dig).
>
> **Lifecycle entry**: `excavated` → `curated` → `reviewed` → `revived | rejected`. Card additive-only (no delete).
>
> **Cap**: prime 200 righe sono caricabili in context altri agent. Una linea per card, sotto ~150 char.

---

## 🏆 Top relevance (score 4-5 — revive priority)

- [Mating Engine D1+D2 Orphan](cards/mating_nido-engine-orphan.md) — **5/5** · runtime LIVE (469 LOC + 7 endpoint), zero frontend · OD-001 correction needed
- [Triangle Strategy MBTI Transfer](cards/personality-triangle-strategy-transfer.md) — **5/5** · 3 Proposals concrete P4 closure, mai citato BACKLOG · forgotten
- [Sentience Traits v1.0 — tier T1-T6 + interoception](cards/cognitive_traits-sentience-tiers-v1.md) — **5/5** · Skiv Sprint C diary unblock 3h · unintegrated
- [Enneagramma Mechanics Registry — 16 hook stub](cards/enneagramma-mechanics-registry.md) — **5/5** · plug-in `enneaEffects.js` 3h · unintegrated
- [Enneagramma Dataset — 9 tipi canonical](cards/enneagramma-dataset-9-types.md) — **5/5** · Skiv voice palette type 5/7 · unintegrated
- [Nido Itinerante D-Canvas](cards/mating_nido-canvas-nido-itinerante.md) — **4/5** · Skiv vagans direct fit, 3 mechanics legacy mai migrate · superseded
- [MBTI Gates Ghost](cards/personality-mbti-gates-ghost.md) — **4/5** · recoverable via `git show 5c704524:...` · deleted
- [BiomeMemory + Trait Cost Exploration](cards/architecture-biome-memory-trait-cost.md) — **4/5** · Skiv biome-mover differentiation · deferred
- [Ancestors Neurons Dump — 34 trigger combat](cards/ancestors-neurons-dump-csv.md) — **4/5** · 22 reaction trigger Self-Control · unintegrated
- [Magnetic Rift Resonance — swarm trait T2](cards/old_mechanics-magnetic-rift-resonance.md) — **4/5** · Skiv Sprint A biomeResonance 2h · deferred
- [enneaEffects.js — orphan canonical 93 LOC](cards/enneagramma-enneaeffects-orphan.md) — **4/5** · wire onRoundEnd 2h · abandoned

---

## 📚 Per domain

### Ancestors

- [Ancestors Neurons Dump 01B — 34 trigger combat](cards/ancestors-neurons-dump-csv.md) — score 4/5 · 22 Self-Control reaction trigger · unintegrated

_Restanti: 8 artifact in inventory + 263 neuroni in binary `.zip` mancanti. Recovery autonomous schedulato 2026-05-16. Vedi [excavations/2026-04-25-ancestors-inventory.md](excavations/2026-04-25-ancestors-inventory.md)._

### Cognitive traits / Sentience

- [Sentience Traits v1.0 — tier T1-T6 + interoception hooks](cards/cognitive_traits-sentience-tiers-v1.md) — score 5/5 · Skiv Sprint C unblock · unintegrated

_Restanti: `incoming/sensienti_traits_v0.1.yaml` superseded (skip). False positive: `docs/guide/README_SENTIENCE.md` canonical T0-T6._

### Enneagramma

- [Enneagramma Mechanics Registry — 16 hook stub](cards/enneagramma-mechanics-registry.md) — score 5/5 · ready-to-wire · unintegrated
- [Enneagramma Dataset — 9 tipi canonical](cards/enneagramma-dataset-9-types.md) — score 5/5 · vcScoring.js extension · unintegrated
- [enneaEffects.js — orphan canonical](cards/enneagramma-enneaeffects-orphan.md) — score 4/5 · wire onRoundEnd · abandoned

📎 **Gallery**: [galleries/enneagramma.md](galleries/enneagramma.md) — 3 card stesso domain, narrative aggregato.

### Personality / MBTI extended

- [Triangle Strategy MBTI Transfer Plan](cards/personality-triangle-strategy-transfer.md) — score 5/5 · 3 Proposals A/B/C P4 closure path · forgotten
- [MBTI Gates Ghost](cards/personality-mbti-gates-ghost.md) — score 4/5 · 2 deleted file recoverable via `git show 5c704524:...` · deleted

_Restanti: 6 artifact in inventory (incl. personality_module.v1.json già citato in old_mechanics #2). Vedi [excavations/2026-04-25-personality-inventory.md](excavations/2026-04-25-personality-inventory.md)._

### Mating / Nido / Reclutamento

- [Mating Engine D1+D2 Orphan](cards/mating_nido-engine-orphan.md) — score 5/5 · 469 LOC engine + 7 REST endpoint, zero frontend · abandoned
- [Nido Itinerante D-Canvas](cards/mating_nido-canvas-nido-itinerante.md) — score 4/5 · 3 mechanics legacy + Skiv vagans direct fit · superseded

_Major finding: OD-001 disinformata (V3 "deferred no runtime" era falso). Vedi [excavations/2026-04-25-mating_nido-inventory.md](excavations/2026-04-25-mating_nido-inventory.md). Anche pack drift `mating.yaml` 84 LOC (`gene_slots`)._

### Old mechanics

- [Magnetic Rift Resonance — swarm trait T2](cards/old_mechanics-magnetic-rift-resonance.md) — score 4/5 · Skiv Sprint A biomeResonance · deferred

_Restanti: 4 candidate in inventory (engine_events.schema, integrated-design-map, recon_meccaniche, Python rules deprecated). Vedi [excavations/2026-04-25-old_mechanics-inventory.md](excavations/2026-04-25-old_mechanics-inventory.md)._

### Species candidate

_Pool secco. 10/10 species in `incoming/species/*.json` già canonical via commit `b1fe7e36` (bilingual naming styleguide). Vedi [excavations/2026-04-25-species_candidate-inventory.md](excavations/2026-04-25-species_candidate-inventory.md). Negative result valido._

### Architecture

- [BiomeMemory + Costo ambientale trait](cards/architecture-biome-memory-trait-cost.md) — score 4/5 · 3 exploration-note + Skiv biome-mover · deferred

_Restanti: 22 artifact in inventory (1 ADR formally Superseded + 4 partial supersedes + DEPRECATED.md cleanup + concept-explorations vertical-slice). Vedi [excavations/2026-04-25-architecture-inventory.md](excavations/2026-04-25-architecture-inventory.md)._

### Other

Reserved per artifact che non match domain sopra.

---

## 📊 Stats

- **Excavations run**: 8 totali (4 session-1: ancestors/cognitive/enneagramma/old_mechanics + 4 session-2: personality/mating_nido/species_candidate/architecture)
- **Artifact identificati**: ~78 totali (28 session-1 + 50 session-2)
- **Cards total**: 11 curate (5 score 5/5: 5 · 4 score 4/5: 6)
- **Galleries**: 1 (enneagramma — 3 card aggregate)
- **Last excavate**: 2026-04-25 (session 2)
- **Coverage**: **100%** (8/8 priority domains explored)
- **Skiv unblock**: 8/11 card hanno reuse path Skiv-aware (Sprint A: 2, Sprint B: 1, Sprint C: 4, biome-mover differentiation: 1)
- **Cross-agent validation**: ✅ PASS 2026-04-25 (creature-aspect-illuminator consulted MUSEUM.md spontaneously, 6 GAP found, 10-15min saved)

---

## 🗂 Structure

```
docs/museum/
├── MUSEUM.md                                          # this file (index)
├── README.md                                          # how to use the museum
├── excavations/
│   ├── 2026-04-25-ancestors-inventory.md             # 9 artifact
│   ├── 2026-04-25-cognitive_traits-inventory.md      # 2 artifact
│   ├── 2026-04-25-enneagramma-inventory.md           # 9 artifact
│   ├── 2026-04-25-old_mechanics-inventory.md         # 8 artifact
│   ├── 2026-04-25-personality-inventory.md           # 8 artifact (session 2)
│   ├── 2026-04-25-mating_nido-inventory.md           # 10 artifact (session 2)
│   ├── 2026-04-25-species_candidate-inventory.md     # 10 false positive (pool secco)
│   └── 2026-04-25-architecture-inventory.md          # 22 artifact (session 2)
├── cards/
│   ├── ancestors-neurons-dump-csv.md                  # M-2026-04-25-004 score 4/5
│   ├── architecture-biome-memory-trait-cost.md       # M-2026-04-25-011 score 4/5 (NEW)
│   ├── cognitive_traits-sentience-tiers-v1.md        # M-2026-04-25-001 score 5/5
│   ├── enneagramma-dataset-9-types.md                # M-2026-04-25-003 score 5/5
│   ├── enneagramma-enneaeffects-orphan.md            # M-2026-04-25-006 score 4/5
│   ├── enneagramma-mechanics-registry.md             # M-2026-04-25-002 score 5/5
│   ├── mating_nido-canvas-nido-itinerante.md         # M-2026-04-25-008 score 4/5 (NEW)
│   ├── mating_nido-engine-orphan.md                  # M-2026-04-25-007 score 5/5 (NEW)
│   ├── old_mechanics-magnetic-rift-resonance.md      # M-2026-04-25-005 score 4/5
│   ├── personality-mbti-gates-ghost.md               # M-2026-04-25-010 score 4/5 (NEW)
│   └── personality-triangle-strategy-transfer.md     # M-2026-04-25-009 score 5/5 (NEW)
└── galleries/
    └── enneagramma.md                                 # 3 cards aggregato
```

---

## 🔗 Cross-references

- Agent definition: [.claude/agents/repo-archaeologist.md](../../.claude/agents/repo-archaeologist.md) (REFINED 2026-04-25 post-session-1: path verify + signature read + blast radius + data flow audit)
- Provenance standard: [DCMI Provenance](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/provenance/)
- Backlog open: [BACKLOG.md](../../BACKLOG.md) — "Museum-driven autonomous tasks" sezione + 3 nuovi P4 ticket pending (TKT-P4-MBTI-001/002/003)
- Open decisions: [OPEN_DECISIONS.md](../../OPEN_DECISIONS.md) — OD-008..012 risolte session-1, OD-001 CORREZIONE pending session-2 (mating disinformation), OD-013+ pending (Triangle Proposal A default)
- ADR index: [DECISIONS_LOG.md](../../DECISIONS_LOG.md)
- Skiv canonical: [data/core/species/dune_stalker_lifecycle.yaml](../../data/core/species/dune_stalker_lifecycle.yaml)
- Cross-agent validation report: [docs/qa/2026-04-25-museum-validation.md](../qa/2026-04-25-museum-validation.md) (TBD post-commit)

---

## 📅 Last verified

**2026-04-25 sera** — Session 2 complete. 8/8 domain coverage, 11 card curate, 1 gallery, agent refined post-lessons-learned, cross-agent validation PASS.

**5 OPEN_DECISIONS new** to user verdict:

- OD-008..012 risolte session-1 (sentience backfill / Ennea hybrid / Skiv voice A/B / ancestors recovery / swarm scope)
- **OD-001 CORRECTION** (mating disinformation) — session-2 critical finding
- OD-013+ TBD (Triangle Proposal default + BiomeMemory pilot scope + Legami pool resource)

**Major finding session 2**: V3 mating engine GIÀ LIVE (PR #1679, 469 LOC + 7 endpoint). OD-001 era basata su audit incomplete. Decisione product Path A (activate ~12-15h) / Path B (demolish ~2h) / Path C (sandbox ~5h) pending.

**Next**: user review verdict OD-001 + 5 backlog ticket P4 spawn + Sprint A wire (M-005 magnetic_rift, validato 6 GAP da cross-agent audit).
