---
title: 'NS2 Strategist + Frozen Synapse replay (P5 co-op asymmetric + cinematic)'
museum_id: M-2026-04-27-011
type: research
domain: coop
provenance:
  found_at: docs/research/2026-04-26-tier-b-extraction-matrix.md#6-natural-selection-2-2012
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: docs-team
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'Minimal: Frozen Synapse replay cinematico (~10-14h) / Moderate: NS2 Strategist 5p+ async role (~25-30h L) / Full: stack co-op asymmetric + replay TV-shared'
related_pillars: [P5]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# NS2 Strategist + Frozen Synapse replay (P5 co-op extension)

## Summary (30s)

- **4/5 score** — 2 pattern P5 co-op che estendono M11 Phase A-C shipped: Frozen Synapse replay cinematico round (~10-14h M) + NS2 Strategist role async 5p+ (~25-30h L).
- **P5 attualmente 🟢 candidato** (M11 shipped, playtest userland TKT-M11B-06 unico bloccante). Replay cinematico = TV-shared rewatch outcome; Strategist = scaling 4→5p con asymmetric role.
- **Convergenza Frozen Synapse + ITB**: Plan→Prime→Execute + telegraph + simultaneous reveal pattern.

## What was buried

Tier B matrix #2 + #6 categorizza FS + NS2 come donor P5 + tangenziale P1 TV-play:

- 🔴 **Frozen Synapse replay cinematico** — round risolto post-resolution, 3-5s loop visualizza outcome simultaneo squad+SIS
- 🔴 **NS2 Strategist role 5p+** — 1 player ruolo Strategist (vista atlas + pressure overlay + intent suggest), altri tactical 4p classic. Scaling oltre 4 player.
- ⏸️ **NS2 RTS+FPS asimmetria** completa — out of scope (FPS layer fuori contesto turn-based)
- ⏸️ **PvP-only multiplayer** — non match P5 co-op vs Sistema

## Why it might still matter

### Pillar match

- **P5 Co-op 🟢 candidato → 🟢 def post replay**: M11 base shipped + replay TV-shared closes loop "vedo cosa è successo dopo aver chiuso turno". Co-op visibility unblock.
- **Scaling oltre 4p**: modulation 5-8p già supportata data ma UX 5p+ non differenziata. Strategist role aggiunge meaningful asymmetric layer.

### Convergenza Frozen Synapse + ITB telegraph (3 fonti)

- **Frozen Synapse** — Plan→Prime→Execute simultaneous reveal
- **Into the Breach** (M-2026-04-27-006) — telegraph deterministic
- **AI War Progress meter** (M-Tier-S #10) — escalation visibility

3 fonti convergono su "everything visible before commit" pattern.

### File targets

- M11 lobby: [`apps/play/src/lobby.html`](../../../apps/play/src/lobby.html) + [`apps/play/src/network.js`](../../../apps/play/src/network.js)
- WS session backend: [`apps/backend/services/network/wsSession.js`](../../../apps/backend/services/network/wsSession.js)
- Round orchestrator: [`apps/backend/services/roundOrchestrator.js`](../../../apps/backend/services/roundOrchestrator.js)
- VC snapshot + raw events log (replay source)
- Atlas surface (Strategist view): [`apps/backend/routes/session.js`](../../../apps/backend/routes/session.js) `/api/session/state`
- Pressure tier API: [`apps/backend/services/ai/aiProgressMeter.js`](../../../apps/backend/services/ai/aiProgressMeter.js) (shipped #1898)

### Cross-card relations

- M-2026-04-27-006 [ITB Telegraph](ui-itb-telegraph-deterministic.md) — co-op shared visibility convergence
- M-2026-04-27-002 [Tactics Ogre HP Floating](combat-tactics-ogre-hp-floating-charm.md) — TV-play UX scope shared
- ADR-2026-04-20-m11-jackbox-phase-a — M11 base reference

## Concrete reuse paths

### Minimal — Frozen Synapse replay cinematico (~10-14h)

1. **Backend** (~6h):
   - `apps/backend/routes/session.js` aggiungi endpoint `GET /api/session/:id/replay/:round`
   - Output: `raw_events[]` + `vcSnapshot` per round specifico + seed
   - Format: array di per-frame deltas (position changes, hp changes, status changes)

2. **Frontend cinema** (~5h):
   - `apps/play/src/replayCinema.js` (NEW) — overlay 3-5s post-resolution
   - Render loop: replay raw_events frame-by-frame at 60fps, slow-mo critical
   - Skip button + speed selector (1x/2x/5x)

3. **TV-shared sync** (~2h):
   - WS broadcast replay state to all phones + TV
   - Tutti vedono lo stesso replay simultaneous

### Moderate — NS2 Strategist role 5p+ (~25-30h L)

1. **Modulation 5p+ extension** (~8h):
   - `data/core/party.yaml` aggiungi modulation `coop_5p_strategist` (4 tactical + 1 strategist)
   - Strategist NO unit control diretto, ha metaview

2. **Strategist UI** (~12h):
   - `apps/play/src/strategistView.html` (NEW) — atlas overview + pressure tier + intent SIS aggregato
   - Annotation tools: ping locations, suggest priorities, queue intent suggestions
   - Phone-as-strategist-controller (M11 lobby pattern)

3. **Backend support** (~5h):
   - WS channel "strategist_intent" — broadcast suggestion to tactical 4p
   - Aggregate view: pressure history graph + biome progression timeline

### Full — Stack completo (~50h+)

- - Asymmetric reward distribution (Strategist gets meta-currency, tactical get run-currency)
- - Replay analytics aggregator post-session

## Tickets proposed

- [`TKT-UI-FROZEN-SYNAPSE-REPLAY-CINEMATICO`](../../../data/core/tickets/proposed/TKT-UI-FROZEN-SYNAPSE-REPLAY-CINEMATICO.json) (12h) — moderate
- [`TKT-COOP-NS2-STRATEGIST-ROLE`](../../../data/core/tickets/proposed/TKT-COOP-NS2-STRATEGIST-ROLE.json) (28h) — full L

## Sources / provenance trail

- Source matrix Tier B: [`docs/research/2026-04-26-tier-b-extraction-matrix.md`](../../research/2026-04-26-tier-b-extraction-matrix.md) #2, #6
- Frozen Synapse (Mode 7 Games 2011) — Ian Hardingham
- Natural Selection 2 (Unknown Worlds 2012)
- ADR-2026-04-20-m11-jackbox-phase-a (M11 base)
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.3 #2, #6

## Risks / open questions

- **Replay storage cost**: raw_events log per round ×500 round/campaign = grande JSON. Compress + cap N=last-10 round in cache.
- **Strategist scope creep**: rischio "Strategist diventa game director micromanager". UX limit: max 3 ping/round + suggest queue cap 5.
- **5p+ player matching**: lobby flow attuale = 4-player default. UX update per +1 strategist-only slot.
- **Replay determinism**: raw_events deve essere deterministic da seed. Verifica `vcSnapshot` non contiene timestamps wall-clock.

## Anti-pattern guard

- ❌ NON 8+ ore session length (anti-roguelike compact)
- ❌ NON galaxy map 80+ planets (scope creep)
- ❌ NON cinematic blocking 30s+ replay (player attesa passiva)
- ❌ NON pure PvP-only (non match co-op vs Sistema)
- ❌ NON Strategist senza intent vincoli (game-director micromanager)
- ✅ DO simultaneous reveal (Plan→Prime→Execute)
- ✅ DO replay TV-shared visibility (co-op planning unblock)
- ✅ DO Strategist limited toolset (ping + suggest, no direct control)
