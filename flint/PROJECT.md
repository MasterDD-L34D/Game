---
title: Flint — project definition
doc_status: active
doc_owner: flint-maintainer
workstream: cross-cutting
last_verified: 2026-04-18
source_of_truth: true
language: it-en
review_cycle_days: 90
version: 0.2.1
---

# Flint — project definition

> Tool companion CLI per developer che vogliono mantenere rotta di design/scope. Classificatore commit + diagnostic passive + workflow pattern per Claude Code integration. Nato come companion Evo-Tactics, progettato per essere ripetibile su altri progetti.

## 1. Overview

### Problem statement

Solo-dev e piccoli team perdono rotta facilmente. Sintomi ricorrenti:

- Scope creep silenzioso (commit infra cumulativi senza shipping gameplay/feature-user)
- Yak shaving camuffato da "tooling necessario"
- Perdita memoria cross-session su behaviors che funzionano (AI assistant perde contesto)
- Nessuna diagnostica passiva che distingua "stai costruendo" da "stai tweakando"

Flint fornisce **diagnostica non-gamificata** + **workflow discipline pattern** per AI assistant (primariamente Claude Code).

### Target user

| Profilo                             |                   Applicabilità                   |
| ----------------------------------- | :-----------------------------------------------: |
| Solo indie dev (gamedev o prodotto) |                    🟢 Primary                     |
| Piccolo team 2-5 (single repo)      |                   🟢 Secondary                    |
| Studente / learning project         |                     🟡 Utile                      |
| Team ≥10 con CI/CD maturo           | 🔴 Non-goal (usare GitHub Insights, Jira, Linear) |
| Enterprise                          |                    🔴 Non-goal                    |

### Differentiator vs upstream `caveman:caveman` (Anthropic plugin)

| Dimensione    |        `caveman:caveman` (Anthropic)         |               **Flint** (this project)               |
| ------------- | :------------------------------------------: | :--------------------------------------------------: |
| Purpose       | Voice compression (drop articoli, fragments) | Design discipline (classifier, diagnostic, workflow) |
| Scope         |       Cross-session presentation layer       |               Project governance layer               |
| Attivazione   |          SessionStart hook globale           |     On-demand (`flint status`, `dammi un flint`)     |
| State         |                  Stateless                   |           JSON snapshot + memory patterns            |
| Distribuzione |            Marketplace Anthropic             |              Custom repo (futuro: PyPI)              |

I due sono **ortogonali e complementari**. Flint può girare senza caveman. Caveman può girare senza Flint.

---

## 2. Scope & non-goals

### In scope

✅ Classifier commit per categoria semantica (pluggable taxonomy)
✅ Gameplay ratio / drift signal come diagnostica passiva
✅ Status JSON export on-demand per dashboard esterno
✅ Integration pattern per Claude Code (memory feedback, slash-command, skill)
✅ Classification framework 4D per decisioni tool/feature kill/keep
✅ Archive preservation pattern per decisioni reversibili
✅ Research-critique workflow (2 agent + sources + verdict)

### Non-goals

❌ Achievement / reward / gamification (backfire su solo-dev — Liberty + NTNU)
❌ Auto-trigger hook post-commit (friction > ROI — Stackdevflow 2026)
❌ Team velocity tracking / leaderboard (usare Git-Velocity Dashboard, Linear)
❌ AI code review / refactoring suggestions (usare Copilot, Cursor)
❌ Multi-repo aggregation (single repo focus by design)
❌ Web UI / SaaS (CLI + JSON output only)
❌ Distribuzione su PyPI prima di v1.0 (single-user validation phase)

---

## 3. Architettura componenti

### Componenti attivi (post kill-60 2026-04-18)

```
flint/                              ← package root
├── src/flint/
│   ├── cli.py                      ← Typer CLI, subcommands
│   ├── repo.py                     ← snapshot + classify commit
│   ├── engine.py                   ← decide_category + generate narrative
│   ├── seeds.py                    ← 5 categorie output templates
│   └── __init__.py
├── tests/                          ← pytest test_repo + test_engine
├── pyproject.toml                  ← package metadata (PEP 621 + 735)
├── PROJECT.md                      ← questo file (canonical definition)
├── README.md                       ← user-facing quick start
├── FLINT.md                        ← rituale + quick links
└── DEEP_RESEARCH.md                ← findings 2026

tools/py/
└── flint_status_stdlib.py          ← fallback stdlib-only (no deps)

docs/
└── flint-status.json               ← snapshot on-demand (non auto)
```

### Componenti archiviati (killed 2026-04-18)

```
docs/archive/flint-kill-60-2026-04-18/
├── code/
│   ├── achievements.py             ← 8 achievement (re-open condition: team ≥3)
│   └── post-commit                 ← Husky hook (re-open condition: dashboard QA)
├── skills/
│   └── flint-narrative.md          ← auto-trigger block (re-open: user esplicito)
├── memory-feedback/                ← 8 file pre-consolidamento
├── readme-sections/                ← doc sections rimosse
└── MANIFEST.md                     ← classificazione + decision gate
```

### Componenti Claude Code integration

```
.claude/
├── commands/
│   └── meta-checkpoint.md          ← slash `/meta-checkpoint` (research-critique gemello interno)
└── skills/                         ← (flint-narrative.md archiviata)

~/.claude/projects/<proj>/memory/
├── MEMORY.md                                                       ← indice auto-loaded
├── feedback_claude_workflow_consolidated.md                        ← 9 pattern consolidati
├── feedback_meta_checkpoint_directive.md                           ← auto-trigger on meta-pause
└── reference_flint_optimization_guide.md                           ← 40+ sources
```

### Data flow

```
git commit                                     (user action)
     ↓
git log + git status --porcelain              (input)
     ↓
flint.repo.snapshot()                          (process)
     ↓
flint.repo._classify_commit(msg, files)        (pattern match)
     ↓
RepoSnapshot { commits, dirty_files, metrics } (domain model)
     ↓
flint.cli.status / export                      (CLI output)
     ↓
docs/flint-status.json                         (JSON snapshot)
     ↓
Read by: Claude Code agent / external dashboard / evo-tactics-monitor skill
```

---

## 4. Classification framework 4D (core reusable contribution)

**Questa sezione è il vero deliverable riutilizzabile di Flint**. Le altre componenti (classifier, CLI, status) sono implementazione.

Ogni asset/tool/feature sotto esame si classifica su 4 dimensioni:

### 4.1 Valore scope

Quanto l'asset copre bisogni reali del progetto:

| Livello      | Criterio                                                  |
| ------------ | --------------------------------------------------------- |
| 🟢 **Alto**  | Pattern osservato usato ≥3 volte, risolve pain measurable |
| 🟡 **Medio** | Utile ma novelty decay probabile (5-7 giorni), ROI medio  |
| 🔴 **Basso** | Nice-to-have, backfire risk, letteratura contraria        |

### 4.2 Applicabilità

Chi/cosa può beneficiarne:

| Livello              | Esempio                                       |
| -------------------- | --------------------------------------------- |
| **universal**        | Qualsiasi dev / progetto                      |
| **gamedev**          | Progetti game-dev                             |
| **data-ops**         | Progetti data pipeline / ML                   |
| **solo-dev-only**    | Solo maintainer singolo                       |
| **single-user**      | Solo questo utente/preferenza                 |
| **evo-tactics-only** | Specifico repo (custom terminology, pilastri) |

### 4.3 Stato sviluppo

| Stato            | Significato                                   |
| ---------------- | --------------------------------------------- |
| **production**   | Attivo, validato, maintained                  |
| **experimental** | Attivo ma in osservazione (gate 7-30 gg)      |
| **draft**        | Incomplete, non pubblicato                    |
| **deprecated**   | Ancora funzionante ma superato                |
| **consolidated** | Assorbito in altro asset (non più standalone) |
| **killed**       | Rimosso, archiviato per eventuale re-open     |

### 4.4 Re-open cost

Effort per riattivare se archiviato:

| Cost   | Tempo   | Esempio                |
| ------ | ------- | ---------------------- |
| **XS** | <30 min | Paste back single file |
| **S**  | ≤2h     | Re-wire + test         |
| **M**  | ≤1 gg   | Refactor + update deps |
| **L**  | >1 gg   | Significant redesign   |

### Uso framework

Prima di ogni kill / archive / refactor, classificare l'asset su queste 4 dimensioni. Documentare in MANIFEST + decision gate (condizioni re-open esplicite).

Pattern riusabile per qualsiasi progetto/tool. Esempio applicato: `docs/archive/flint-kill-60-2026-04-18/MANIFEST.md`.

---

## 5. Integration pattern

### Minimal (5 min adoption)

Solo il fallback stdlib-only. Zero dipendenze Python esterne:

```bash
# 1. Copia script
curl -o tools/flint_status_stdlib.py \
  https://raw.githubusercontent.com/.../tools/py/flint_status_stdlib.py

# 2. Personalizza COMMIT_PATTERNS per il tuo dominio
# edit tools/flint_status_stdlib.py → _COMMIT_PATTERNS

# 3. Run on-demand
python3 tools/flint_status_stdlib.py --output docs/flint-status.json
```

**Ottieni**: snapshot JSON con gameplay_ratio, classification, drift flag. Niente hook, niente CLI install.

### Standard (30 min adoption)

Full CLI package (pip install):

```bash
# 1. Clone flint/ subtree nel tuo repo
git subtree add --prefix=flint https://github.com/.../Game.git main --squash
# (oppure extract_subdirectory se flint diventa repo standalone)

# 2. Install via uv (raccomandato 2026)
cd flint && uv tool install .

# 3. Personalizza pilastri in flint/pyproject.toml o config YAML
# (v0.3 roadmap: .flint/config.yaml user-editable)

# 4. Uso
flint status
flint export
```

**Ottieni**: CLI completa, narrative block on-demand, status export, classificatore pluggable.

### Full (2h adoption — Claude Code integration)

Aggiunge memory feedback patterns + slash commands:

```bash
# 1-3 come Standard

# 4. Copy memory patterns in user profile Claude Code
cp -r flint/claude-integration/memory/ \
      ~/.claude/projects/<your-proj>/memory/

# 5. Copy commands
mkdir -p .claude/commands
cp flint/claude-integration/commands/*.md .claude/commands/

# 6. Update CLAUDE.md con section "Session workflow patterns"
```

**Ottieni**: workflow codificati per AI assistant (tabella opzioni, delega agent, piano file:line, CI auto-merge, checkpoint memory, research-critique, `dammi un flint`).

---

## 6. Config schema

### Personalizzabile per progetto

| Config                      | Default                                                          | Come customizzare                                               |
| --------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| **Categorie classifier**    | `GAMEPLAY/INFRA/TOOLING/DOCS/DATA/ALTRO`                         | Edit `_COMMIT_PATTERNS` in `repo.py` o `flint_status_stdlib.py` |
| **Pilastri progetto**       | 6 Evo-Tactics (FFT, Spore, Identità, ecc)                        | Edit `CLAUDE.md § Sprint context` tabella pilastri              |
| **Drift threshold**         | 20% gameplay ratio                                               | Hardcoded (v0.3 → CLI flag `--drift-threshold`)                 |
| **Consecutive INFRA limit** | 4                                                                | Hardcoded (v0.3 → config)                                       |
| **Narrative categories**    | 5 (micro_sprint, design_hint, mini_game, evo_twist, scope_check) | Edit `seeds.py` oppure disable via archive                      |
| **3 domande venerdì**       | Evo-Tactics specific                                             | Edit `FLINT.md § 3 domande`                                     |

### Pluggable schema proposta v0.3

```yaml
# .flint/config.yaml
project:
  name: 'Evo-Tactics'
  type: 'gamedev-solo' # gamedev-solo | gamedev-team | webapp | data-pipeline | custom

classifier:
  patterns:
    GAMEPLAY:
      - 'traits/'
      - 'biomes/'
      - 'combat'
      - 'playtest'
    INFRA:
      - '.github/workflows'
      - 'prisma'
    # ... etc

drift:
  gameplay_ratio_min: 0.20
  consecutive_infra_max: 4

pillars:
  - { id: 1, name: 'Tattica leggibile', status: '🟢' }
  - { id: 2, name: 'Evoluzione emergente', status: '🟢' }
  # ...

narrative:
  enabled: false # default disabled (no auto-trigger)
  trigger_phrase: 'dammi un flint'
  categories: [micro_sprint, design_hint, mini_game, evo_twist, scope_check]
```

---

## 7. Roadmap versioni

### v0.2.1 (current, 2026-04-18)

- Rename evo-caveman → flint atomic
- Kill 60% (achievements, hook, drift alerts, 8→1 memory files)
- Archive preservation con 4D classification
- Research-critique workflow codificato
- `dammi un flint` composite (A+C+D+E+G) on-demand

### v0.3 (planned, se sopravvive 30 gg)

**Trigger**: Flint diagnostic usato ≥5 volte dal 2026-04-18. Bisogno concreto emerso.

- Config schema YAML `.flint/config.yaml` (pluggable taxonomy, pilastri, thresholds)
- File-path signal extension (git log --name-only → path → category, letteratura dice 3-5× più forte di message keyword)
- Eval set classifier (50 commit etichettati a mano, accuracy baseline)
- In-context LLM classification opzionale (Claude Haiku, 1 call/run, $0.01 — SciTePress 2024)
- PyPI test release (v0.3-rc1)

### v1.0 (target, se v0.3 valida adoption)

**Trigger**: ≥1 progetto esterno ha adottato Flint (non Evo-Tactics).

- Extract repo standalone (`github.com/MasterDD-L34D/flint`)
- PyPI release ufficiale
- Trusted Publishers GitHub Actions (OIDC)
- Multi-language narrative (i18n en.yaml + it.yaml)
- CLI `flint init --template gamedev-solo|webapp|data-ops`
- Docs site (docs.flint.dev o GitHub Pages)
- 2+ case studies esterni documentati

### v2.0 (aspirational)

**Trigger**: Flint usato da >50 utenti, feedback loop sano.

- Integration con LSP / IDE plugins (VSCode, Cursor)
- Opzionale: team velocity mode (multi-maintainer)
- Cross-family LLM review (Anthropic + OpenAI cross-check on drift alerts)
- Community-contributed taxonomies
- Web dashboard opzionale (opt-in, SaaS-light)

### Kill-100 condition

Flint viene cancellato completamente se:

- 30 giorni senza utilizzo misurabile
- Bit-rot: ≥3 breaking change in Claude Code / Husky / Python che richiedono maintenance >1h
- Zero adopter esterni dopo 6 mesi dal v1.0
- Maintainer esplicito "non serve più, cancella"

---

## 8. Lessons learned (2026-04-18 session)

### Kill-60 decisione

Research critica (2 agent paralleli, 40+ fonti) ha ridotto Flint del 60%. Voto pre-kill: 4/10. Motivazione in `docs/archive/flint-kill-60-2026-04-18/MANIFEST.md`.

**Key insights**:

1. **Gamification backfire su solo-dev**: achievement system undermines intrinsic motivation (Liberty, NTNU). Remove.
2. **Git hook friction**: post-commit 300-500ms × 20 commit/giorno = attrito invisibile senza ROI. Move to on-demand.
3. **Bit-rot risk reale**: tool custom single-user ha ~30% sopravvivenza a 6 mesi (Sonar, Xebia). Minimal maintenance surface.
4. **Meta-productivity skepticism** (Lethain): codificare pattern dopo sample=1 = premature. Gate ≥3 osservazioni.
5. **Infrastructure avoidance**: preferire "costruire tool" a "shippare gameplay" è solodev trap classico (Zylinski).

### Research-critique workflow (nato in questa sessione)

Pattern replicabile per ogni tool/feature in audit:

1. Save checkpoint
2. Identifica asset
3. Spawn 2 agent paralleli (landscape + rischi, WebSearch 4-6 query)
4. Synthesize voti 1-10
5. Verdict atomico (kill X% / keep Y%)
6. Save sources in `reference_<asset>_guide.md`
7. Apply on "procedi" → refactor + archive

Vedi `.claude/commands/meta-checkpoint.md` per gemello interno (meta-self-audit).

### Naming discipline

**Caveman** (upstream Anthropic) ≠ **Flint** (custom nostro). Confondere = drift semantico (vedi "dammi un caveman" vs "dammi un flint" issue 2026-04-18).

Rule: upstream vendor-owned names = immutabili. Custom assets = brand proprio con semantica distinta.

---

## 9. Known limitations

### Tecniche

| Limite                           | Evidenza                                            | Mitigazione v0.3                                 |
| -------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| Classifier pattern-match fragile | Substring su message — "fix bug in combat" conflict | File-path signal + LLM in-context classification |
| No file-path signal              | Solo commit message analizzato                      | `git log --name-only` + path-based rules         |
| Hardcoded taxonomy 6 categorie   | Non riusabile altri progetti                        | Config YAML user-editable                        |
| Drift threshold 20% arbitrary    | Phase-insensitive (sprint 1-3 = 10% OK)             | Phase-aware threshold                            |
| No eval accuracy                 | "Vibes-based" accuracy claim                        | 50 commit labeled set + accuracy gate ≥85%       |

### Strategiche

| Rischio                        | Probabilità | Mitigazione                                                        |
| ------------------------------ | :---------: | ------------------------------------------------------------------ |
| Bit-rot 6 mesi                 |    Alta     | Smoke test CI + minimal maintenance surface                        |
| Lock-in Claude Code            |    Media    | Separate core (Python portable) da claude-integration layer (v1.0) |
| Novelty decay narrative        |    Alta     | Disabled auto-trigger, solo on-demand                              |
| Solo-dev sample bias           |    Alta     | v1.0 richiede 1 adopter esterno validation                         |
| Maintenance overhead > benefit |    Media    | Gate 7gg / 30gg / 6mo con kill condition esplicita                 |

### Comunicazione

Flint **non è** magic bullet. È diagnostica passiva + pattern library. Non sostituisce:

- Self-discipline
- Playtesting vero
- Feedback utenti reali
- Shipping

---

## 10. Quick start altri progetti

### Template adozione 5-step

Per un progetto nuovo (assumendo Python 3.12+ + Claude Code):

**Step 1**: clone flint subtree o fallback stdlib

```bash
# Minimal (solo stdlib)
mkdir -p tools/py
curl -o tools/py/flint_status_stdlib.py https://.../flint_status_stdlib.py

# Standard (full CLI)
git subtree add --prefix=flint https://github.com/.../Game.git main --squash
cd flint && uv tool install .
```

**Step 2**: personalizza taxonomy per tuo dominio

Edit `_COMMIT_PATTERNS` in `flint_status_stdlib.py` OR `flint/src/flint/repo.py`:

```python
_COMMIT_PATTERNS: Final = (
    # Esempio per webapp project:
    (("frontend/", "api/", "feature(", "feat("), "FEATURE"),
    (("bug/", "fix(", "hotfix"), "FIX"),
    (("docs/", ".md", "docs("), "DOCS"),
    (("ci/", ".github/workflows"), "INFRA"),
    (("test/", "spec/"), "TEST"),
)
```

**Step 3**: definisci pilastri progetto

Edit `CLAUDE.md` (o doc equivalente):

```markdown
## Pilastri del progetto

| #   | Pilastro     | Stato |
| --- | ------------ | :---: |
| 1   | <pilastro-1> |  🟡   |
| 2   | <pilastro-2> |  🟢   |

| ...
```

**Step 4**: copia memory patterns (Claude Code integration)

```bash
cp flint/claude-integration/memory/*.md \
   ~/.claude/projects/<your-proj>/memory/
cp flint/claude-integration/commands/*.md .claude/commands/
```

**Step 5**: test + iterate

```bash
python3 tools/py/flint_status_stdlib.py --output docs/flint-status.json
# OR
flint status

# Verifica classificazione commit recenti. Se molti "ALTRO" → extend patterns.
# Se gameplay_ratio=0% ma hai shippato feature → classifier mancante patterns.
```

### Adoption checklist

- [ ] Minimal stdlib working (JSON export OK)
- [ ] Categorie customizzate per dominio (min 80% commit classified non-ALTRO)
- [ ] Pilastri progetto definiti in CLAUDE.md
- [ ] Memory patterns copiati (almeno consolidated + meta-checkpoint)
- [ ] Testato `dammi un flint` in sessione Claude Code
- [ ] Archive directory preparata per eventuali kill future

---

## Appendix A — Sources essenziali

MUST READ prima di decidere keep/kill/extend Flint:

1. [Sam Liberty — Gamification undermines motivation](https://medium.com/design-bootcamp/gamification-does-not-increase-motivation-heres-what-to-know-c6a0e9bdc136)
2. [Karl Zylinski — Solodevs engine trap](https://zylinski.se/posts/solodevs-and-the-trap-of-the-game-engine/)
3. [Lethain — Skepticism meta-productivity tools](https://lethain.com/developer-meta-productivity-tools/)
4. [ICSE 2021 — Gamification empirical (Moldon et al.)](https://johanneswachs.com/papers/msw_icse21.pdf)
5. [Sonar — Bit Rot silent killer](https://www.sonarsource.com/blog/bit-rot-the-silent-killer)
6. [dev.to/azrael654 — Productivity tools = procrastination](https://dev.to/azrael654/most-developer-productivity-tools-are-just-procrastination-with-better-ux-39gl)
7. [SciTePress 2024 — Commit classification in-context LLM](https://www.scitepress.org/Papers/2024/126867/126867.pdf)

Lista completa 40+ sources: `~/.claude/projects/C--Users-VGit-Desktop-Game/memory/reference_flint_optimization_guide.md`.

## Appendix B — Changelog high-level

- **2026-04-18** v0.2.1: PROJECT.md canonical + kill-60 + archive + research-critique workflow + `dammi un flint` composite on-demand
- **2026-04-18** v0.2.0: Rename evo-caveman → flint (package + binary + JSON path + skill)
- **2026-04-17** v0.2.0-pre: Classifier bug fix (pattern conventional commit scopes)
- **2026-04-16** v0.2.0-rc: Initial drop caveman v0.2 (PR #1490, commit bfb8e103)

## Appendix C — Governance

- **Maintainer**: Eduardo (MasterDD-L34D)
- **License**: MIT (se estratto repo standalone in v1.0)
- **Contributing**: N/A fino v1.0 (single-user validation phase)
- **Review cycle**: 90 giorni (questo doc) / 7 giorni (decision gate post-kill)
- **Related repos**: [Evo-Tactics (parent)](https://github.com/MasterDD-L34D/Game)
- **Archive policy**: ogni kill documentato in `docs/archive/flint-<kill-name>-<date>/` con MANIFEST.md
