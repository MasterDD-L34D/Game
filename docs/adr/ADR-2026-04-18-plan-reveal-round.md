---
title: 'ADR 2026-04-18 — Plan & Reveal round model (contemporary hybrid)'
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: 2026-04-18
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/adr/ADR-2026-04-15-round-based-combat-model.md'
  - 'docs/core/44-HUD-LAYOUT-REFERENCES.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/core/02-PILASTRI.md'
---

# ADR-2026-04-18 · Plan & Reveal round model

**Stato**: 🟡 DRAFT — proposta design post-research M4, awaiting playtest validation before ACCEPTED
**Trigger**: user feedback #1600 playtest + research `docs/core/44-HUD-LAYOUT-REFERENCES.md`
**Supersedes hint**: ADR-2026-04-15 round-based-combat-model (estende, non sostituisce)

## Contesto

ADR-2026-04-15 ha definito round model base con 4 endpoint: `/round/begin-planning`, `/declare-intent`, `/commit-round`, `/resolve-round`. Model attuale = round simultaneous **parziale**: player declara intents, SIS declara intents (via `declareSistemaIntents.js`), commit-round auto_resolve tramite priority queue.

**Gap rilevato post-playtest #1600 + research #1603**:

1. **SIS intents hidden fino post-commit** → player non può decidere reagendo a threat SIS (perde puzzle-feel Into the Breach)
2. **No threat preview visuale** sul grid (anti-pattern tactical contemporary)
3. **No timer declare phase** (4-8 player co-op TV possono stallare)
4. **No recap phase esplicita** (eventi post-resolve scorrono senza momento di sintesi)
5. **FFT turn-by-turn sequential fallback** se round model non ON per scenari legacy

Pilastro 5 (Co-op vs Sistema, TV condivisa) richiede round model che **genera momenti condivisi** — planning fase dove squadra discute TV, non turn individuale silenzioso.

## Decisione (provvisoria)

Formalizzare **"Plan & Reveal"** round model come canonical Evo-Tactics contemporary:

### 3 fasi esplicite

```
╔═══════════════════════════════════════════════════════╗
║ FASE 1 — DECLARE (parallel, timer soft 45s)           ║
║                                                        ║
║  Inputs:                                               ║
║    • Tutti 4-8 player declara intents ALL insieme     ║
║    • SIS AI declara intents VISIBILI (fog OFF default)║
║    • Threat tile overlay rosso dove SIS attaccherà    ║
║    • Enemy intent icon (pugno/scudo) sopra SIS        ║
║                                                        ║
║  State machine:                                        ║
║    phase = 'planning'                                  ║
║    pending_intents: { [actor_id]: intent }            ║
║    timer_deadline: Date.now() + 45000 (if configured) ║
║                                                        ║
║  Exit: client commits OR timer elapsed OR 'end plan'  ║
╠═══════════════════════════════════════════════════════╣
║ FASE 2 — RESOLVE (animato, 8-15s)                     ║
║                                                        ║
║  Process:                                              ║
║    • Priority queue (ADR-04-15 formula)               ║
║      initiative + action_speed - status_penalty       ║
║    • Camera pan action corrente                       ║
║    • Reaction triggers first-class                    ║
║      (intercept, overwatch, parata)                   ║
║    • Damage popup visual feedback                     ║
║                                                        ║
║  State: phase = 'resolving'                           ║
║  Exit: resolution_queue empty                         ║
╠═══════════════════════════════════════════════════════╣
║ FASE 3 — RECAP (chip 2-3s)                            ║
║                                                        ║
║  Output:                                               ║
║    • Chip summary: PT guadagnati, KO, status applied  ║
║    • Pressure tier delta (Alert → Escalated ?)        ║
║    • Reinforcement spawned (ADR-04-19)                ║
║    • Objective progress (ADR-04-20)                   ║
║                                                        ║
║  State: phase = 'recap'                               ║
║  Exit: auto-transition back to FASE 1 post-delay      ║
╚═══════════════════════════════════════════════════════╝
```

### Differenze vs ADR-2026-04-15

| Aspetto                |  ADR-04-15 (base)  |        ADR-04-18 Plan & Reveal        |
| ---------------------- | :----------------: | :-----------------------------------: |
| Phase 1 name           |     `planning`     |               `declare`               |
| SIS intents visibility |    OFF default     | **ON default** (fog-of-intent opt-in) |
| Threat preview         |         ❌         |             ✅ mandatory              |
| Timer soft             |         ❌         |          ✅ 45s configurable          |
| Recap phase            | ❌ (events direct) |             ✅ chip 2-3s              |
| Camera pan resolve     |         ❌         |               ✅ opt-in               |

### Fog of Intent opt-in

**Default**: SIS intents VISIBILI (player li vede fase DECLARE). Decision lever TV co-op: planning = conversazione informata.

**Opt-in scenari competitive/asimmetrici**: `encounter.fog_of_intent: true` → SIS intents hidden. Utile per stealth scenarios o modalità hardcore.

### Timer soft configurable

`encounter.declare_timer_seconds: 45` (default). 0 = disabled. Timer COUNTDOWN visibile UI, MA non auto-commit. Espira → prompt "Conferma o estendi tempo" (TV-friendly no auto-force).

### Contract endpoint (nuovi)

Backend endpoint update ADR-04-15 extension:

- `POST /api/session/round/begin-declare` → init FASE 1, return threat_preview payload (tile coords minacciati + SIS intent summary)
- `POST /api/session/round/commit-declare` → transition FASE 1 → FASE 2, return resolution_queue
- `POST /api/session/round/advance-recap` → transition FASE 2 → FASE 3 (auto called post-resolve)
- `GET /api/session/round/phase` → current phase + deadline

### Payload threat_preview

```json
{
  "phase": "declare",
  "deadline": 1713456789000,
  "player_pending": {
    "p_scout": null,
    "p_tank": { "type": "move", "position": [2, 3] }
  },
  "sis_intents": [
    {
      "actor_id": "e_nomad_1",
      "intent_type": "attack",
      "target_id": "p_scout",
      "threat_tiles": [[1, 2]],
      "intent_icon": "fist"
    },
    {
      "actor_id": "e_hunter",
      "intent_type": "approach",
      "target_id": "p_tank",
      "threat_tiles": [[2, 3]],
      "intent_icon": "move"
    }
  ]
}
```

## Alternative valutate

### A. FFT classic sequential turn-by-turn (status quo pre-04-15)

- **Pro**: familiar, simple
- **Contro**: 4-8 player co-op = attesa boring, no momento condiviso
- **Verdetto**: rigetto (Pilastro 5 richiede shared moment)

### B. ADR-04-15 base (planning parallel + hidden SIS)

- **Pro**: simultaneous, scala co-op
- **Contro**: SIS hidden = no threat preview = meno puzzle-feel; no recap phase
- **Verdetto**: superseded (questo ADR estende)

### C. Plan & Reveal (scelto)

- **Pro**: contemporaneo 2024-2026, puzzle-feel ItB + planning-shared Frozen Synapse, scala 4-8 co-op TV, recap phase = sintesi condivisa
- **Contro**: SIS intents ALWAYS visibili = player fight decisions-with-perfect-info (meno stealth/surprise feel); richiede UI threat overlay
- **Verdetto**: 🟢 raccomandato — opt-in fog_of_intent per scenari specifici

### D. Real-time pause (Pillars of Eternity style)

- **Pro**: dinamico
- **Contro**: caos TV 4-8p, no discrete round per training MBTI/VC
- **Verdetto**: rigetto (perde pilastro 4 temperamenti per-round)

### E. Card-driven (Slay the Spire)

- **Pro**: chunky decisions
- **Contro**: collection economy overhead, deck-building pattern non evo-tactics fit
- **Verdetto**: rigetto (fuori scope genere)

## Conseguenze

**Positive**:

- Planning fase = moment TV condiviso Pilastro 5 enforced
- Threat preview = puzzle-feel Into the Breach importato
- Timer soft = co-op 4-8 non stalla 10 minuti
- Recap chip = sintesi visiva, sblocca UI momentum
- Fog of intent opt-in = modularità scenari

**Negative**:

- Implementation richiede UI rework (research 44-HUD raccomanda Sprint A+B+C 4 settimane)
- Backend state machine +1 phase (recap) — minor complexity
- Test effort: playtest comparative Plan-Reveal vs legacy 04-15
- Scenari legacy (enc_tutorial_01) potrebbero richiedere migration flag

**Neutrali**:

- Priority queue resolve (ADR-04-15) preservato
- Reinforcement + objective (ADR-04-19/04-20) transparently compatibili
- AI intents (`declareSistemaIntents.js`) riusati, expose via new endpoint

## Implementation roadmap (post-ACCEPTED)

### Sprint C.1 — Backend state machine (1 settimana)

- `apps/backend/services/roundOrchestrator.js`: add phase `recap`
- `apps/backend/routes/sessionRoundBridge.js`: 3 nuovi endpoint begin-declare/commit-declare/advance-recap
- Feature flag `ROUND_MODEL=plan-reveal` default OFF
- Migration: scenari ADR-04-15 retrocompatible con wrapper

### Sprint C.2 — UI threat preview (1 settimana)

- `apps/play/src/hud/threatTiles.js` overlay rosso
- `apps/play/src/hud/enemyIntent.js` icon SIS
- `apps/play/src/hud/recapChip.js` sintesi post-resolve
- Timer declare UI (countdown + pause button)

### Sprint C.3 — Testing + calibration (1 settimana)

- Playtest comparative Plan-Reveal vs legacy
- Timer 45s tuning (user testing 4-8p)
- Fog of intent toggle playtest
- Batch harness N=30 Plan-Reveal timing baseline

## Rollback

Feature flag `ROUND_MODEL` → se `plan-reveal` fallisce playtest, fallback `batched` (ADR-04-15 base). Backend endpoint nuovi restano disponibili ma unused. UI threat overlay hide via CSS class.

Scenari migrazione: zero destructive schema change. Encounter YAML retrocompatible (campi opzionali `fog_of_intent`, `declare_timer_seconds`).

## Test plan (pre-ACCEPTED)

- **Unit**: state machine transitions declare→resolve→recap
- **Integration**: threat_preview payload shape
- **Playtest**: 2 scenari comparative (Plan-Reveal vs ADR-04-15 base) — 3 run each, report engagement curve
- **Load**: 4p + 8p timing declare phase, measure p95 commit duration

## Q-OPEN aperte

- Q-OPEN-31: ADR Plan-Reveal ACCEPTED timing (post-playtest validation)
- Q-OPEN-32: Fog of intent default OFF/ON — playtest driven decision
- Q-OPEN-33: Timer 45s vs 30s vs 60s — user feedback tuning
- Q-OPEN-34: Camera pan resolve blocking vs smooth-continuous animation
- Q-OPEN-35: Recap chip duration 2s vs 3s vs skippable

## Follow-up (dopo ACCEPTED)

- `docs/adr/ADR-2026-04-15-round-based-combat-model.md` → mark "extended by ADR-2026-04-18-plan-reveal-round"
- `docs/hubs/combat.md` → aggiorna round lifecycle section
- `docs/core/10-SISTEMA_TATTICO.md` → aggiorna round flow
- `docs/core/44-HUD-LAYOUT-REFERENCES.md §Q-OPEN` → close Q-31/32/33/34/35 after playtest

## Riferimenti

- `docs/core/44-HUD-LAYOUT-REFERENCES.md` — research parent
- `docs/adr/ADR-2026-04-15-round-based-combat-model.md` — base round model
- `docs/adr/ADR-2026-04-19-reinforcement-spawn-engine.md` — reinforcement integration
- `docs/adr/ADR-2026-04-20-objective-parametrizzato.md` — objective integration
- Frozen Synapse https://www.frozensynapse.com/ — Plan→Prime→Execute pattern
- Into the Breach https://subsetgames.com/itb.html — threat preview pattern
- AncientBeast https://github.com/FreezingMoon/AncientBeast — browser Canvas reference
- XState https://stately.ai/docs — state machine pattern
- boardgame.io https://github.com/boardgameio/boardgame.io — phase system pattern
