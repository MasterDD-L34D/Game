---
title: 'Pilastri reality audit 2026-04-20 — status inflation debunk'
workstream: planning
category: retrospective
status: published
owner: master-dd
created: 2026-04-20
tags:
  - audit
  - pilastri
  - honest-assessment
  - kill-60
related:
  - docs/core/02-PILASTRI.md
---

# Pilastri reality audit — status inflation debunk

## TL;DR

**CLAUDE.md dichiarava 6/6 🟢. Reality 1/6 🟢, 5/6 🟡** (dopo deep repo audit 2026-04-20 agent Explore).

Root cause: status inflation confondeva **"dataset shipped"** con **"runtime shipped"**. Pattern ricorrente dal Sprint 020 → Sprint sessione M7.

**Aggiornamento post-deep-audit**: P2 era stato classificato 🔴 (first pass), ma deep audit ha rivelato che `apps/backend/services/metaProgression.js` + `apps/backend/routes/meta.js` (6 endpoint recruit/mating/nest/affinity/trust) sono **runtime in-memory**. Gap reale = persistence + PI pack spender, non "zero runtime". Revisione 🔴 → 🟡.

Vedi `docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md` per roadmap evidence-based con pattern proven (Wesnoth + XCOM + Jackbox + Long War).

## Tabella reality

|  #  | Pilastro                     | Stated | First pass | **Deep audit** | Gap primario                        |
| :-: | ---------------------------- | :----: | :--------: | :------------: | ----------------------------------- |
|  1  | Tattica leggibile (FFT)      |   🟢   |     🟢     |       🟢       | Nessuno major                       |
|  2  | Evoluzione emergente (Spore) |   🟢   |     🔴     |     **🟡**     | Persistence + PI spender (non zero) |
|  3  | Identità Specie × Job        |   🟢   |     🟡     |       🟡       | Level curves non applicate          |
|  4  | Temperamenti MBTI/Ennea      |   🟢   |     🟡     |       🟡       | T_F full, 3 altri partial/null      |
|  5  | Co-op vs Sistema             |   🟢   |     🟡     |       🟡       | Network multi-client = zero         |
|  6  | Fairness                     |   🟢   |     🟡     |       🟡       | Hardcore deadlock 0% defeat         |

## Detail per Pilastro

### P1 — Tattica leggibile (FFT) 🟢 **giusto**

**Runtime shipped**:

- d20 + MoS resolver
- AP budget canonical (2 standard, 3 eccezione tutorial_01)
- Grid hex axial (195 LOC)
- Reactions first-class (intercept, overwatch)
- Ability executor 18/18 effect_type live
- Plan-Reveal P0 intent icons (M8 #1658)
- Priority queue + resolve orchestrator

**Gap minori**:

- Threat tiles overlay grid (Plan-Reveal ext)
- Timer soft 45s
- Recap phase
- Parata reattiva

**Verdict**: 🟢 giusto. Core tactical loop solid.

### P2 — Evoluzione emergente (Spore) 🟢 → **🔴**

**Dataset shipped**:

- 84 species YAML canonical
- Trait catalog + mechanics
- Biome synthesizer
- Flow pipeline (generate species blueprint)
- 45 specie + 40 biomi bilingue naming

**Runtime shipped**: **ZERO evoluzione**

- No leveling system
- No form transformation (Spore → Species → Form → Apex)
- No PI pack application runtime
- No trait acquisition in-game
- Flow genera blueprint pre-session, mai applicato runtime

**Verdict**: 🔴 **overoptimistic** — il Pilastro core del game (evoluzione emergente!) ha zero runtime. Non è "emergente" se è statico.

**Scope canonical**: `docs/core/PI-Pacchetti-Forme.md`, `docs/core/Mating-Reclutamento-Nido.md`

**Gap restante**: ~30-50h implementation.

### P3 — Identità Specie × Job 🟢 → **🟡**

**Runtime shipped**:

- 7 jobs canonical (vanguard, warden, invoker, skirmisher, ranger, artificer, harvester)
- 4 archetype resistance (corazzato, psionico, bioelettrico, termico, adattivo)
- Job shape render (W8M silhouette profile)
- Species JSON full + stat wiring
- JOB_STATS hook in normaliseUnit

**Gap**:

- Character progression (no levels, no stat curves applied)
- Job-specific abilities differentiation (tutti usano ability executor generico)
- Class system (hp_baseline in damage_curves.yaml MA non applicato)

**Verdict**: 🟡 identity visible ma progression layer assente. Player non vede crescita character.

**Gap restante**: ~10-15h per character progression base.

### P4 — Temperamenti MBTI/Ennea 🟢 → **🟡**

**Runtime shipped**:

- VC scoring (20+ raw metrics, 6 aggregate, 4 MBTI, 6 Ennea)
- deriveMbtiType()
- MBTI axes E_I + S_N (P4 parziale)
- 16 Forms YAML (ma solo 4 reachable in playtest)
- Ennea theme effects
- PF_session endpoint

**Gap**:

- MBTI 2/4 axes implementati (T_F + J_P mancanti)
- Forms reach 4/16 = 25%
- Ennea 6/9 types triggered in calibration

**Verdict**: 🟡 infrastructure solida ma coverage parziale.

**Gap restante**: ~6h per completare 4 axes + 16 Forms reach.

### P5 — Co-op vs Sistema 🟢 → **🟡**

**Runtime shipped**:

- SquadSync focus_fire combo
- AI Sistema data-driven (intent scores + profiles YAML)
- Pressure tier gates (Calm → Apex)
- Modulation 4→8 preset
- Reinforcement spawner
- Plan-Reveal P0 (#1658)
- Sistema actor + utility brain

**Gap MASSIVE**:

- **Network sync multi-client = ZERO**
- Modulation 8p è configurazione, NON session network sync
- Canonical "TV condivisa 4-8 player" → zero WebSocket/SSE broadcast
- Single-client controlla tutto (keyboard multi-keyboard local)
- No lobby real, no matchmaking

**Verdict**: 🟡 AI co-op solid vs Sistema. MA Pilastro dichiara "TV condivisa co-op" — runtime è single-client.

**Gap restante**: ~20-30h per network multi-client reale.

### P6 — Fairness 🟢 → **🟡**

**Runtime shipped**:

- Resistance engine (100-neutral scale)
- Channel routing (psionico/fisico/ionico)
- Damage scaling curves (ADR-2026-04-20 A+B+C+D+E)
- Target bands per encounter_class
- Fairness cap service
- Verdict harness GREEN/AMBER/RED

**Gap**:

- Hardcore iter7 verdict RED: 0% defeat + 67% timeout deadlock
- Multiplier knob exhausted (iter6→iter7 defeat stuck a 0%)
- Broken balance su hardcore_06

**Verdict**: 🟡 infrastructure completa ma calibrazione rotta su hardcore. "Fair" richiede outcome distribution non-degenerate.

**Gap restante**: M9 structural fix (2-3h per Option F) + N=30 validate.

## Root cause status inflation

Tre pattern ricorrenti:

1. **Dataset ≠ Runtime**: 84 species YAML non è "evoluzione shipped"
2. **Infrastructure ≠ Feature**: VC scoring infrastructure ≠ MBTI completo (2/4 axes)
3. **Local ≠ Network**: Modulation config 8p ≠ multi-client TV co-op

Fix: CLAUDE.md Pilastri aggiornati + questo doc canonical per future sprint reality check.

## Raccomandazioni

### Priority ordering design-core (no demo UX)

1. **P6 fix**: M9 structural (2-3h) — sblocca demo fairness
2. **P3 progression**: character leveling (10-15h) — unlock campagna
3. **P4 complete**: T_F + J_P axes + 16 Forms reach (6h) — chiude temperament
4. **P2 Pacchetti Forme**: PI evolution runtime (8-12h) — primo piede su Spore-like
5. **P5 network**: multi-client TV sync (20-30h) — Pilastro 5 real

### Kill-60

**Non spendere tempo su**:

- Pretending Pilastri sono 🟢 quando sono 🟡
- Dataset-shipped claim come proxy runtime
- Feature pre-announce senza runtime

## Autori

- Master DD (user direction pushback "overoptimistic?")
- Claude Opus 4.7 (honest audit esecuzione)
