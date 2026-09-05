---
title: 'ADR 2026-04-26 — M15 co-op UI redesign (Jackbox pattern phone+TV)'
workstream: cross-cutting
category: adr
status: accepted
owner: master-dd
created: 2026-04-26
tags:
  - adr
  - m15
  - ui
  - coop
  - jackbox
  - phone
  - playtest
related:
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
  - docs/playtest/2026-04-26-demo-launcher.md
---

# ADR M15 — Co-op UI redesign

Filosofia applicata: `Archivio_Libreria_Operativa_Progetti/02_LIBRARY/01` + `03` (first principles).
Intake dopo feedback playtest live 2026-04-26 (flow rotto, UI confusa).

## Verità fondamentali

### Layer A — gioco

- Fantasy: "cellulare = mio PG; TV = tavolo condiviso".
- Loop: round simultaneo (planning insieme → commit → TV anima risoluzione).
- Decisioni interessanti: coordinarsi via chat + UI minima vedendo azioni in planning altrui.
- Leggibilità: TV mostra STATO, phone mostra MIA AZIONE.

### Layer B — sistema

- Stato match: `{ phase, pending_intents, ready_set, missing_set, units, turn, round }`
- Input player: `{actor_id, action, target_id?, x?, y?}` — 1/round fino a commit
- Determinismo: commit quando `ready_set == all_players` OR timer scaduto (host override).
- Party primitive: chat messages broadcast + ready broadcast.

### Layer C — repo

- Backend: `roundOrchestrator` già sequenziale; serve wrapper `pendingIntents` per player + broadcast ready.
- Frontend: `lobbyBridge.js` composer → rewrite v2 (card PG + buttons + banner + chat).
- TV: hide composer lato host, mostra roster compatto con ticks.

## Decisione

### Phase state machine

```
idle → planning → ready → resolving → planning (loop) → ended
```

- `idle`: stanza creata, sessione non avviata. Player vede "Aspetta host...".
- `planning`: sessione live, accetta intent da player/AI. Timer visibile.
- `ready`: commit in corso (tutti inviato OR timer scaduto). UI freeze.
- `resolving`: round orchestrator esegue, TV anima. Phone mostra "⚡ Risoluzione...".
- `ended`: scenario win/lose/timeout. Player vede outcome + "Nuova partita".

Gate server: intent rifiutato se phase ≠ planning OR player già ready in questo round.

### Wireframe phone

```
┌─ 📱 PLAYER · ABCD · connesso ─────────┐
│ 🟢 Tocca a te — planning (23s)        │
├────────────────────────────────────────┤
│ ┌─ IL TUO PG ──────────────────┐      │
│ │ [◉] Aria  HP 18/22  AP 2/2   │      │
│ │ Gladiatrice · Lvl 2          │      │
│ └───────────────────────────────┘      │
│                                        │
│ AZIONE (tap uno):                      │
│ [⚔ Attacca] [👟 Muovi] [🛡 Difendi]    │
│ [✨ Abilità] [⏭ Passa turno]           │
│                                        │
│ TARGET:                                │
│ ◉ Goblin A · HP 5/8 · 3 tile           │
│ ○ Goblin B · HP 8/8 · 5 tile           │
│                                        │
│ [✓ Conferma intent]                    │
├─ PARTY ───────────────────────────────┤
│ Aria: 💭 pianificando                  │
│ Bruno: ✅ pronto                       │
│ Chiara: 💭 pianificando                │
│ Dario: ✅ pronto                       │
├─ CHAT ────────────────────────────────┤
│ Bruno: attacco il boss, copritemi      │
│ Chiara: io muovo sul fianco            │
│ [scrivi...] [invia]                    │
└────────────────────────────────────────┘
```

### Wireframe TV (host)

```
┌─ Evo-Tactics · round 3 · PLANNING ────────────────────────────┐
│ SISTEMA: pressure 40/100 · cap 2 intents/round                 │
│ Roster: [🟡 Aria ✅] [🟡 Bruno ✅] [🔵 Chiara 💭] [🔵 Dario 💭] │
│ Timer round: 00:23                      [⏱ Forza commit]       │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│                    [CANVAS MAPPA]                              │
│                                                                │
├─ Log narrativo ───────────────────────────────────────────────┤
│ Round 2 end: Aria colpisce goblin (8 dmg). Bruno si difende.   │
│ Goblin A attacca Aria (miss). Sistema spawn rinforzi.          │
│ Round 3 start — tutti pianificano.                             │
└───────────────────────────────────────────────────────────────┘
```

## Invarianti

1. **Phone = composer esclusivo** player. TV = zero composer lato host.
2. **Intent lock** server-side post-ready. "Annulla" fino a commit.
3. **Chat relay** room-wide via WS msg type `chat` (già esistente ADR-2026-04-20).
4. **Ready broadcast** nuovo msg `round_ready` payload `{ready:[], missing:[]}`.
5. **Narrative log**: TV append messaggi compatti da `state.log[]` (nuovo campo).
6. **Responsive phone**: viewport ≤480px → stack vertical full-width.
7. **Dark game-y**: palette consistent con `docs/frontend/42-STYLE-GUIDE-UI.md`.

## Scope (cosa dentro M15)

- ✅ Server: `pendingIntents` Map per room, reject post-lock, broadcast `round_ready`
- ✅ Server: msg type `chat` relay already exists — wire frontend
- ✅ Phone UI: card PG grande + action buttons tile + phase banner + chat party
- ✅ TV: hide canvas composer legacy, roster compatto top, log narrativo bottom
- ✅ Timer round visibile TV + phone

## Fuori scope (deferred M16+)

- Multi-PG per player (modulation duo/trio)
- Audio cue + vibration phone
- Voice chat integration
- Portrait custom per PG (placeholder icon ora)
- PWA install/add-to-home

## Rollback

- Feature flag `UI_V2_ENABLED=true` default true. `false` → legacy composer.
- Server changes retrocompat (new msg type, legacy intent still accepted).

## Riferimenti

- Pattern Jackbox: https://jackboxgames.com/how-to-play
- Round simultaneo existing: `apps/backend/services/roundOrchestrator.js`
- M11 Jackbox backend: [ADR-2026-04-20](ADR-2026-04-20-m11-jackbox-phase-a.md)
- Filosofia sorgente: `Archivio_Libreria_Operativa_Progetti/02_LIBRARY/03_First_Principles_Repo_Game_Claude_Code.md`
