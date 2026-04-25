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

_Vuoto. Dopo prima excavate session questa sezione popola con artifact score ≥4._

---

## 📚 Per domain

### Ancestors

_Vuoto. Pending excavate `--domain ancestors`. Atteso: 30+ validation reports `evo_tactics_ancestors_\*`(Oct/Nov 2025),`reports/incoming/ancestors/ancestors*neurons_dump_01B_sanitized.sha256`.*

### Cognitive traits / Sentience

_Vuoto. Pending excavate `--domain cognitive_traits`. Atteso: `incoming/sentience_traits_v1.0.yaml` (T1-T6 tier scale full), `incoming/sensienti_traits_v0.1.yaml`._

### Enneagramma

_Vuoto. Pending excavate `--domain enneagramma`. Atteso: `incoming/Ennagramma/` 6 dataset CSV (master, stackings, triadi, varianti istintive, wings, dataset.json) + `incoming/enneagramma_mechanics_registry.template.json`._

### Personality / MBTI extended

_Vuoto. Pending excavate `--domain personality`. Atteso: `incoming/personality_module.v1.json`._

### Mating / Nido / Reclutamento

_Vuoto. Pending excavate `--domain mating_nido`. Tracker user OD-001. Doc `docs/core/Mating-Reclutamento-Nido.md` esistente, runtime zero._

### Old mechanics

_Vuoto. Pending excavate `--domain old_mechanics`. Atteso: `incoming/recon_meccaniche.json`, deprecated `services/rules/`, `docs/archive/historical-snapshots/2025-11-15_evo_cleanup/lavoro_da_classificare/*.yml`._

### Species candidate

_Vuoto. Pending excavate `--domain species_candidate`. Atteso: `incoming/species/*.json` (10 specie pre-canonical), `incoming/swarm-candidates/traits/`._

### Architecture

_Vuoto. Pending excavate `--domain architecture`. Atteso: ADR superseded chain, `services/rules/DEPRECATED.md`, `docs/archive/concept-explorations/`._

### Other

_Reserved per artifact che non match domain sopra._

---

## 📊 Stats

- **Excavations run**: 0
- **Cards total**: 0
- **Galleries**: 0
- **Last excavate**: never
- **Coverage**: 0% (0/8 priority domains explored)

---

## 🗂 Structure

```
docs/museum/
├── MUSEUM.md                          # this file (index)
├── README.md                          # how to use the museum
├── excavations/
│   └── YYYY-MM-DD-<domain>-inventory.md  # per excavate run
├── cards/
│   └── <domain>-<slug>.md             # one per buried artifact (Dublin Core)
└── galleries/
    └── <domain>.md                    # ≥3 cards same domain → narrative aggregate
```

---

## 🔗 Cross-references

- Agent definition: [.claude/agents/repo-archaeologist.md](../../.claude/agents/repo-archaeologist.md)
- Provenance standard: [DCMI Provenance](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/provenance/)
- Backlog open: [BACKLOG.md](../../BACKLOG.md)
- Open decisions: [OPEN_DECISIONS.md](../../OPEN_DECISIONS.md)
- ADR index: [DECISIONS_LOG.md](../../DECISIONS_LOG.md)

---

## 📅 Last verified

**2026-04-25** — Bootstrap session. Schema + structure created. First excavate pending.
