---
title: Repo-archaeologist agent — Gate 2 smoke test report
doc_status: draft
doc_owner: claude-code
workstream: ops-qa
last_verified: 2026-04-25
source_of_truth: false
language: it-en
review_cycle_days: 30
tags: [agent, smoke-test, 4-gate-dod, archaeology, museum]
---

# Repo-archaeologist — Smoke test report (2026-04-25)

## Context

User feedback 2026-04-25: due aree tematiche dimenticate sotto rumore 18 sprint:

1. **Ancestors** + cognitive traits research (gran parte del lavoro era già nel repo, perso)
2. **Meccaniche originali** che si stanno perdendo di vista

User propone agent "gravedigger / archeologo" che scava nei recessi del repo, mette le idee riusabili in un museo dove altri agent attingono prima di avventurarsi.

Applicato 4-gate DoD policy (CLAUDE.md sezione "DoD nuovi agent"). Doc deriva da memoria `feedback_4gate_dod_application_pattern.md`.

## Gate 1 — Research

### Probe filesystem (evidenze concrete)

- ✅ `incoming/sentience_traits_v1.0.yaml` — schema completo T1-T6 sentienza con flags social/tools/language e milestones, mai integrato in `data/core/`
- ✅ `incoming/sensienti_traits_v0.1.yaml` — versione iniziale stessa idea
- ✅ `incoming/Ennagramma/` — 6 dataset CSV (master, stackings, triadi, varianti istintive, wings, dataset.json) + `enneagramma_mechanics_registry.template.json`
- ✅ `incoming/personality_module.v1.json` — personality module structured
- ✅ `incoming/recon_meccaniche.json` — mechanics scouting
- ✅ `incoming/species/*.json` — 10 specie pre-canonical
- ✅ `incoming/swarm-candidates/traits/` — swarm trait pool
- ✅ `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.sha256` — dump file
- ✅ `docs/reports/incoming/validation/evo_tactics_ancestors_*` — 30+ validation reports da 2025-10-29/30, mai integrati
- ✅ `docs/archive/historical-snapshots/2025-11-15_evo_cleanup/lavoro_da_classificare/` — 50+ md (security policy, traits catalog, GDD draft)

### Cross-check tracking docs

- `BACKLOG.md` — **NESSUN ticket** menziona ancestors / cognitive_traits / sentience
- `OPEN_DECISIONS.md` — OD-001 mating_nido aperto, ma niente per ancestors/cognitive
- `CLAUDE.md` "Sprint context" — citato Sentience Tier system mai

Conferma piena: dimenticati sotto il rumore.

### WebSearch industry patterns (P0/P1/P2)

- **Software Archaeology** (Hermann + Wikipedia + CodeMag) — standard tecnico per legacy excavation
- **Git pickaxe** (`git log -S/-G`) — Pro Git Book canonical
- **Dublin Core Provenance** (DCMI standard 25+ years) — schema metadata archive
- **Hades Codex archive UX** — game design pattern per "browse + read" archive
- **Bus factor** (Avelino IEEE 2016) — silos identification
- **AI-driven software archaeology** (Caimito + Full Vibes 2025) — frontier auto-excavate

## Gate 2 — Smoke test

### Setup

Subagent `general-purpose` invocato con prompt: "leggi `.claude/agents/repo-archaeologist.md` come istruzioni, simula `--mode excavate --domain ancestors` step-by-step su repo reale, ritorna critique line-by-line USABLE/NEEDS-FIX/REWRITE".

### Verdict: **NEEDS-FIX** (post-fix → USABLE)

### Issues identificati (7 fix + 2 nit)

| #   | Severity     | File              | Issue                                                                                                                          | Status   |
| --- | ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | **BLOCKING** | docs/museum/      | Subdirs `excavations/`, `cards/`, `galleries/` mancanti — Write hard-fail su prima invocazione                                 | ✅ fixed |
| 2   | P1           | agent.md L196     | `incoming/lavoro_da_classificare/` (root) confuso con `docs/archive/.../lavoro_da_classificare/` — root ha solo CI scaffolding | ✅ fixed |
| 3   | P2           | agent.md L195     | `incoming/swarm-candidates/` ambiguo — struttura nested `traits/`                                                              | ✅ fixed |
| 4   | P1           | agent.md L154-159 | Formula relevance senza probe paths concreti per `mentions_in_open_backlog` / `pillar_match_count`                             | ✅ fixed |
| 5   | P1           | agent.md L220-231 | Domain enum mismatch con MUSEUM.md sezioni (sentience separato, mancano personality/architecture/old_mechanics)                | ✅ fixed |
| 6   | P1           | agent.md L245-246 | `excavated_on` / `last_verified` source ambiguo — no instruction su currentDate vs `date +%F`                                  | ✅ fixed |
| 7   | P1           | agent.md L363     | Step 7 Curate manca instruction su placeholder replacement in MUSEUM.md "Vuoto..." sections                                    | ✅ fixed |
| nit | P2           | README.md L3      | `doc_owner: repo-archaeologist` → `agents/repo-archaeologist` per governance compliance                                        | ✅ fixed |
| nit | P2           | agent.md L65      | Cita `thilo-hermann.medium.com` come P0 source mentre L181 blocklist `medium.com/*`                                            | ✅ fixed |

### Probe verificate funzionanti (real data)

```bash
git log --oneline --all -- incoming/sentience_traits_v1.0.yaml
# → f28b3001 feat: align sentience rollout references

git blame -L 1,5 incoming/sentience_traits_v1.0.yaml
# → f28b30015 (MasterDD-L34D 2025-11-02 14:33:22 +0100)

git log -S "sentience" --all --oneline | head
# 10 hits real

git log -S "ancestors" --all --oneline | head
# 10 hits real
```

Frontmatter Dublin Core fillable con dati REALI: `git_sha_first: f28b30015`, `last_author: MasterDD-L34D`, `last_modified: 2025-11-02`, `bus_factor: 1`. ✅

## Gate 3 — Tuning

7 fix applicati line-by-line (vedi tabella sopra). 2 nit applicati. Re-verify: agent ora coerent + bootstrap completo.

## Gate 4 — Optimization

- ✅ **Caveman density**: voce caveman + numbered steps + no filler. Lunghezza ~480 LOC (peer balance-illuminator ~458 LOC).
- ✅ **Anti-pattern guards**: 9 voci "DO NOT" esplicite (auto-revive senza OK, cancellare, spostare senza ADR, card senza provenance verificata, curare canonical, fabricare score, modify guardrail dirs, scrivere ADR autonomo, fix mojibake in-place, doppio-tracking via TodoWrite).
- ✅ **Escalation path**: 5 agent target verificati esistere (`session-debugger`, `schema-ripple`, `sot-planner`, `balance-illuminator`, `narrative-design-illuminator`).
- ✅ **Governance**: `python tools/check_docs_governance.py` → 0 errors, 0 warnings.
- ✅ **MBTI dual mode**: INTJ-A excavate (Ni connect → Te search) + ISTJ-A curate (Si memory → Te organize). Documentato nel preambolo.

## Output dell'integrazione

### Files creati

- [.claude/agents/repo-archaeologist.md](../.claude/agents/repo-archaeologist.md) — agent definition (~480 LOC)
- [docs/museum/MUSEUM.md](../museum/MUSEUM.md) — index file pattern Hades Codex (~110 LOC, cap 200)
- [docs/museum/README.md](../museum/README.md) — guida d'uso per altri agent (~70 LOC)
- `docs/museum/excavations/.gitkeep`, `cards/.gitkeep`, `galleries/.gitkeep` — bootstrap subdirs

### Pattern hooks

- Schema Dublin Core (Provenance + Identifier + Date + Source + Relation)
- Lifecycle 5-stage: `excavated → curated → reviewed → revived | rejected`
- Domain taxonomy 9 voci (ancestors / cognitive_traits / enneagramma / personality / mating_nido / old_mechanics / species_candidate / architecture / other)
- Relevance score 1-5 con probe concreti (age + backlog mentions + pillar match + reuse path)

### Other agents — consultation rule

Tutti gli agent esistenti (`balance-illuminator`, `creature-aspect-illuminator`, `narrative-design-illuminator`, `pcg-level-design-illuminator`, `economy-design-illuminator`, `telemetry-viz-illuminator`, `ui-design-illuminator`, `coop-phase-validator`, `sot-planner`, `playtest-analyzer`) **dovrebbero** consultare `docs/museum/MUSEUM.md` PRIMA di research esterna su un dominio nuovo. Pattern documentato in `docs/museum/README.md`.

**Note**: aggiornamento esplicito dei singoli agent file per aggiungere "consultare museum" è opzionale (overhead non giustificato). README + MUSEUM.md servono come read-pattern self-documenting.

## Next steps suggested

1. **Prima excavate session reale**: `invoke repo-archaeologist --mode excavate --domain ancestors`
   - Atteso: inventory 5+ artifact (sentience_traits + 30 validation reports)
   - Output: `docs/museum/excavations/2026-04-25-ancestors-inventory.md`
2. **Curate top 3-5** post-inventory
3. **Replicate** su domini `cognitive_traits`, `enneagramma`, `old_mechanics`, `species_candidate`
4. **Sweep periodico** ogni 3 sprint per re-score relevance + maintenance

## References

- [4-gate DoD policy](../../CLAUDE.md#dod-nuovi-agent--skill--feature--4-gate-policy-dichiarazione-2026-04-24) — CLAUDE.md sezione policy
- [Memory: feedback_4gate_dod_application_pattern.md](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_4gate_dod_application_pattern.md)
- [Memory: feedback_smoke_test_agents_before_ready.md](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_smoke_test_agents_before_ready.md)
- Industry: [Software Archaeology Wikipedia](https://en.wikipedia.org/wiki/Software_archaeology) · [DCMI Provenance](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/provenance/) · [Pro Git Searching](https://git-scm.com/book/en/v2/Git-Tools-Searching) · [Hades Codex analysis](https://storiesinplay.com/2022/11/24/hades/)
