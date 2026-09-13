---
title: Evo-Tactics — Starter Monorepo
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-06-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# 🦴 Evo-Tactics

> **2026-05-07 — Cutover Phase A LIVE**: primary frontend = **Godot v2 phone HTML5** ([sibling repo](https://github.com/MasterDD-L34D/Game-Godot-v2), `dist/web/`). Web v1 (`apps/play/`) = secondary fallback alive (no archive yet). Phase B archive trigger post 7gg grace + 1+ playtest pass. Vedi [ADR-2026-05-05](docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md).

> **2026-06-06 re-verify**: questa README resta orientamento rapido non-SOT.
> Per stato operativo corrente usare `COMPACT_CONTEXT.md`, `CLAUDE.md` e
> `docs/planning/2026-06-06-evo-tactics-kl-operational-matrix.md`.

## Why

Comandi una squadra di creature in co-op contro il Sistema, e ogni scelta tattica decide chi diventeranno.

A differenza di FFT c'è planning condivisa non turn-order rigido; vs Spore l'evoluzione è conseguenza tattica non sandbox; vs Descent il bioma reagisce a come combatti.

Full pitch: [`docs/PITCH.md`](docs/PITCH.md).

## What

Monorepo polyglot. Mappa essenziale:

- `apps/backend/` — Express API "Idea Engine" (porta 3334)
- `apps/play/` — Browser 2D frontend (Vite, porta 5180) — fallback/web smoke
- `apps/backend/services/combat/` — runtime combat d20 canonico Node
- `services/generation/` — generatore specie (Node+Python worker pool)
- `apps/backend/services/ai/` — AI Sistema, intenti e SistemaState
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

1. **Playtest-first**. Un playtest con post-it batte dieci dashboard. Vedi `docs/playtest/`.
2. **Commit prefix obbligatorio**: conventional commits lowercase (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
3. **Max 1 MUST attiva** per volta. Vedi [`RESEARCH_TODO.md`](RESEARCH_TODO.md).
4. **Guardrail Pilastro 5**: `apps/backend/routes/session.js`, round bridge, co-op e `apps/backend/services/ai/` richiedono verifica mirata (vedi `CLAUDE.md`).
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

Policy: per lavori ad alto impatto seguire `CLAUDE.md`/`AGENTS.md`; non usare
questa README per bloccare cleanup fattuali o governance re-verify.

## Stato corrente

> Snapshot storico. Per avanzamento live leggere `COMPACT_CONTEXT.md`,
> `BACKLOG.md`, `OPEN_DECISIONS.md` e la K/L matrix.

- Sprint 001–020 completati (vedi `CLAUDE.md` §sprint-context)
- Q-001 open questions triage **✅ chiusa** (PR #1463), 8 follow-up PR mergiate (#1472-#1480)
- MUST RESEARCH_TODO **3/3 ✅** + SHOULD **4/4 ✅** — 2026-04-17
- **Gioco giocabile ✅** — CLI (`node tools/js/play.js`) e browser 2D (`npm run play:dev`)
- Frontend sprint α-ε merged: ability UI, animations, status icons, VC debrief, replay viewer, SFX synth
- Pillar status: SoT runtime [`docs/reports/PILLAR-LIVE-STATUS.md`](docs/reports/PILLAR-LIVE-STATUS.md) (snapshot inline rimosso 2026-06-22 -- driftava; vedi anche `COMPACT_CONTEXT.md`)
- Test totali: Python 196, Node AI 150+, VC 21, Encounter 8, Replay 20, Difficulty 23, i18n 4

## Licensing

MIT. Contenuto docs bilingual it-en. Commit messages + code identifiers in English, docs + comments in Italian.

## Asset Attribution & AI Disclosure

Evo-Tactics usa una pipeline **zero-cost** di asset acquisition (ADR-2026-04-18 zero-cost-asset-policy). Team: solo-dev + AI curator. No budget, no freelance commission.

### Attribution

- **UI icons** from Game-icons.net (CC-BY 3.0): full list in [`CREDITS.md`](CREDITS.md)
- **Base tileset** from Kenney.nl (CC0) + selected OpenGameArt.org contributors
- **Typography**: Inter, Noto Sans, Press Start 2P (Google Fonts, OFL)
- **Additional community assets**: see [`CREDITS.md`](CREDITS.md) for complete attribution list

### AI-Generated Content Disclosure

Some visual assets in this game were generated using AI image synthesis tools (Retro Diffusion, Stable Diffusion + pixel-art LoRA) and subsequently **edited, composited, and refined by human artists** using Libresprite (GPL). All AI-generated outputs received significant human authorship contribution (palette lock to 32-color indexed master palette, manual pixel cleanup, compositional decisions) prior to inclusion.

**Ethical commitments**:

- ❌ No AI-generated output replicating the style of specific living artists
- ❌ No training data from unauthorized scraped sources (tools approvati hanno training licensed o claim etico — vedi [`docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md`](docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md))
- ✅ Human authorship layer documented per-asset in [`CREDITS.md`](CREDITS.md) provenance log
- ✅ Disclosure compliant Steam AI policy (Jan 2024) + EU AI Act (Ago 2024-2025)

Pipeline completa + tool approvati: [`docs/core/43-ASSET-SOURCING.md`](docs/core/43-ASSET-SOURCING.md).

### Inspiration (no derivative use)

Evo-Tactics design si ispira concettualmente a Final Fantasy Tactics (Pilastro 1), Spore (Pilastro 2), Slay the Spire / Into the Breach / Wildermyth / Don't Starve / AncientBeast (art direction ref). **Nessun asset o codice copiato** dalle suddette opere.
