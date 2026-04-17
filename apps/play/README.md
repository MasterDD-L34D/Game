---
title: '@evo-tactics/play — Browser 2D MVP'
doc_status: active
doc_owner: frontend-team
workstream: atlas
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# @evo-tactics/play

Frontend browser 2D minimale (Vite + vanilla JS + Canvas). MVP per "far partire il gioco" visualmente — no asset art, shapes base.

## Quick start

```bash
# 1. Backend attivo in altra shell
npm run start:api

# 2. Dev server Vite (porta 5180)
npm run play:dev
# → open http://127.0.0.1:5180
```

Vite proxy forwarda `/api/*` → `http://localhost:3334`.

## Build produzione

```bash
npm run play:build
# → apps/play/dist/
```

## UI

- **Griglia canvas**: click cella vuota = move (se unit selezionata), click nemico = attack
- **Sidebar unità**: click per selezionare. Active unit evidenziata (bordo giallo).
- **End turno**: bottone, SIS agisce.
- **Nuova sessione**: bottone + dropdown scenario.
- **Log**: eventi recenti + errori backend.

## Controls

- Click tua unità → seleziona (ring giallo)
- Click cella libera → move (se range AP OK)
- Click nemico → attack (se range OK)
- Error in sidebar → log + hint footer

## Limitazioni MVP

- No ability UI (usa CLI `tools/js/play.js` per ability finché non aggiunte)
- No animations transizione action
- No drag&drop
- No facing / status icon overlay
- No undo / replay

## Stack

- Vite 5 (zero framework)
- Canvas 2D native
- No deps runtime (solo Vite dev/build)

## Files

- `index.html` — mount + layout
- `src/main.js` — orchestration
- `src/api.js` — fetch client
- `src/render.js` — canvas grid + units
- `src/ui.js` — sidebar + log
- `src/style.css` — tema dark minimal

## Next steps

- Ability UI (click su unit → lista ability da /api/jobs → target selection)
- Replay viewer (endpoint /api/session/:id/replay)
- VC debrief overlay
- Animazioni attack/move
- Sprite pixel-art (quando asset disponibili)
