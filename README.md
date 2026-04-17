---
title: Evo-Tactics — Starter Monorepo
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# 🦴 Evo-Tactics

## Why

Comandi una squadra di creature in co-op contro il Sistema, e ogni scelta tattica decide chi diventeranno.

A differenza di FFT c'è planning condivisa non turn-order rigido; vs Spore l'evoluzione è conseguenza tattica non sandbox; vs Descent il bioma reagisce a come combatti.

Full pitch: [`docs/PITCH.md`](docs/PITCH.md).

## What

Monorepo polyglot. Mappa essenziale:

- `apps/backend/` — Express API "Idea Engine" (porta 3334)
- `services/rules/` — rules engine d20 (Python): resolver, hydration, demo CLI
- `services/generation/` — generatore specie (Node+Python worker pool)
- `services/ai/` — AI Sistema (policy legacy + Utility AI opt-in per profile)
- `services/difficulty/`, `services/triSorgente/`, `services/replay/` — moduli Q-001
- `packages/contracts/` — AJV schemas + TS types condivisi (seam tra backend/mock/dashboard)
- `data/core/` — dataset canonici (species, biomes, traits, mating, difficulty, i18n, ui)
- `packs/evo_tactics_pack/` — Ecosystem Pack v1.7 self-contained
- `tools/py/` + `tools/js/` — CLI Python/Node (validators, game_cli)
- `tests/` — cross-cutting suites (api, ai, rules, generation, difficulty, replay, i18n)
- `docs/` — workstream-organized (core, hubs, adr, planning, pitch, playtests)

Dependency map canonica + authority levels: [`docs/core/00C-WHERE_TO_USE_WHAT.md`](docs/core/00C-WHERE_TO_USE_WHAT.md).
Versione completa/legacy del README precedente: [`docs/README_FULL_ARCHIVE.md`](docs/README_FULL_ARCHIVE.md).

## How

Regole sempre attive:

1. **Playtest-first**. Un playtest con post-it batte dieci dashboard. Vedi [`docs/playtests/`](docs/playtests/).
2. **Commit prefix obbligatorio**: `play:` (gameplay) · `infra:` (CI/docker/build) · `data:` (YAML/dataset) · `doc:` (README/docs) · `cut:` (remove).
3. **Max 1 MUST attiva** per volta. Vedi [`RESEARCH_TODO.md`](RESEARCH_TODO.md).
4. **Guardrail Pilastro 5**: `apps/backend/routes/session.js` + `services/ai/` richiedono approval esplicita (vedi `CLAUDE.md`).
5. **DoD ogni sprint**: `node --test tests/ai/*.test.js` verde + `npm run format:check` clean + working tree pulito.

Setup locale:

```bash
npm ci                                          # root
npm --prefix tools/ts install                   # TS CLI
pip install -r tools/py/requirements.txt        # Python CLI + validators
npm run prepare                                  # Husky hooks
npm run start:api                                # backend :3334
```

Test baseline: `node --test tests/ai/*.test.js` (~150 test, <200ms).

## For agents

Pre-reading in ordine:

1. [`CLAUDE.md`](CLAUDE.md) — project instructions canoniche (Agent SDK / Cursor / Codex)
2. [`RESEARCH_TODO.md`](RESEARCH_TODO.md) — roadmap MoSCoW (MUST/SHOULD/COULD/WON'T)
3. [`docs/PITCH.md`](docs/PITCH.md) — 3 frasi che definiscono scope
4. [`docs/PILLARS_STATUS.md`](docs/PILLARS_STATUS.md) — status 6 pilastri design con prossimi micro-passi
5. [`docs/core/00-SOURCE-OF-TRUTH.md`](docs/core/00-SOURCE-OF-TRUTH.md) — reference tecnico completo
6. [`docs/core/00-GDD_MASTER.md`](docs/core/00-GDD_MASTER.md) — GDD canonico
7. [`docs/governance/QUARANTINE.md`](docs/governance/QUARANTINE.md) — coordinamento cross-branch

Policy: prima di iniziare lavoro che supera 50 righe fuori `apps/backend/`, fermati e chiedi.

## Stato corrente

- Sprint 001–020 completati (vedi `CLAUDE.md` §sprint-context)
- Q-001 open questions triage **✅ chiusa** (PR #1463), 8 follow-up PR mergiate (#1472-#1480)
- MUST RESEARCH_TODO **3/3 ✅** (M1 playtest, M2 backlog, M3 pitch) — 2026-04-17
- Pillar status attuale: **tutti 🟡** post-playtest (revisione onesta, non regressione)
- Test totali: Python 196, Node AI 150+, VC 21, Encounter 8, Replay 20, Difficulty 23, i18n 4

## Licensing

MIT. Contenuto docs bilingual it-en. Commit messages + code identifiers in English, docs + comments in Italian.
