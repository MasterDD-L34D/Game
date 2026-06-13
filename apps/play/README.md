---
title: '@evo-tactics/play — Browser 2D Player'
doc_status: active
doc_owner: frontend-team
workstream: atlas
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# 🦴 @evo-tactics/play

Frontend browser 2D completo: Canvas tile-based + ability UI + end-game overlay + VC debrief + replay viewer + SFX sintetizzati. Zero asset art, shapes base, feel da vero game.

## Quick start

```bash
# Shell 1: backend
npm run start:api

# Shell 2: dev server Vite (porta 5180)
npm run play:dev
# → open http://127.0.0.1:5180
```

## Features implementate

### 1. Grid tattica

- Canvas 2D checkered 64px/cell
- Unit come cerchi color-coded (cyan = PG, red = Sistema)
- HP bar sotto unit (verde/giallo/rosso)
- Active unit marker (triangolo giallo sopra)
- Dead unit gray + opacity + skull

### 2. Ability UI

- Click tua unit → sidebar mostra ability da `/api/jobs/:job_id`
- Ability badge: label + AP cost + effect_type + descrizione
- Click ability self-cast (fortify, ecc.) → esegue immediato
- Click ability target-needed → entra in "target mode" (cursor crosshair, border canvas giallo)
- ESC cancella target mode
- Ability disabled (opacity 0.35) se `ap_remaining < ap_cost`

### 3. End-game detection + overlay

- Auto-detect wipe su ogni refresh state
- Modal fullscreen con:
  - 🏆 Vittoria (verde) / ☠ Sconfitta (rosso)
  - Turni giocati, HP persi PG, HP inflitti SIS
  - **VC debrief async**: MBTI type + top Ennea + 3 aggregates chiave per ogni PG
- 3 buttons: Prossimo encounter / Rigioca / Chiudi

### 4. Scenarios

Dropdown 5 tutorial: 01 Primi passi · 02 Pattuglia · 03 Hazard savana · 04 Bleeding foresta · 05 BOSS Apex.

Auto-advance "Prossimo encounter" loop 01→02→03→04→05→01.

### 5. Animations

- **Move tween** 200ms ease-out (no teleport)
- **Damage popup** floating +N / -N fade+rise 900ms (rosso dmg, verde heal)
- **Status icons** overlay top-right unit: panic/rage/stunned/focused/confused/bleeding/fracture/sbilanciato/taunted_by/aggro_locked
- requestAnimationFrame loop attivo solo quando servono

### 6. VC debrief

Post-match: fetch `/api/session/:id/vc` async, render MBTI + Ennea + aggregates per player unit. Tesi progetto visibile: "come giochi modella ciò che diventi".

### 7. Replay viewer

Bottone 📽 Replay apre modal:

- Fetch `/api/session/:id/replay`
- Canvas dedicato con same render
- Controls: ⏮ first / ◀ prev / ▶ play (600ms/step) / ▶ next / ⏭ last
- Event info: `T<turn> · <action> · <actor> → <target> · dmg N · <result>`

### 8. SFX sintetizzati

Web Audio API, zero asset. 9 preset:

- `hit` / `crit` / `miss` (tone square/sine)
- `heal` (sweep rising)
- `turn_end` / `sis_turn` / `select` (short triangle)
- `win` (double sweep up) / `defeat` (sweep down)

Mute toggle 🔊/🔇 in controls.

## UI

- **Header**: logo + Turn + Active unit
- **Canvas centro**: grid + units
- **Controls**: End turno · Nuova sessione · 📽 Replay · Scenario dropdown · 🔊 mute
- **Sidebar**: Unità list (click per select) · Abilities (live per selected) · Log eventi
- **Footer**: hint contestuale

## Controls riassunto

| Azione            | Input                                 |
| ----------------- | ------------------------------------- |
| Seleziona unit    | Click unit (canvas o sidebar)         |
| Move              | Click cella libera (unit selezionata) |
| Attack            | Click nemico (unit selezionata)       |
| Ability self-cast | Click ability sidebar                 |
| Ability target    | Click ability → click target (o ESC)  |
| End turno         | Bottone "Fine turno"                  |
| Replay            | Bottone 📽 Replay                     |
| Mute              | Bottone 🔊/🔇                         |

## Stack

- Vite 5 dev + build
- Vanilla JS ES modules · Canvas 2D native · Web Audio API
- Zero runtime deps

## Build

```bash
npm run play:build
# → apps/play/dist/
```

~20KB JS (gzip 7.5KB), ~5.6KB CSS (gzip 1.6KB). Build ~80ms.

## Files

```
apps/play/
├── package.json             # workspace @evo-tactics/play
├── vite.config.js           # proxy /api → :3334, dev port :5180
├── index.html               # mount + layout + overlays
├── README.md                # questo file
├── .gitignore
└── src/
    ├── main.js              # orchestration, event handlers, anim loop
    ├── api.js               # fetch client (scenario/start/state/action/endTurn/vc/replay)
    ├── render.js            # Canvas grid + units + status icons + anim + popups
    ├── ui.js                # sidebar units + log + status header
    ├── abilityPanel.js      # fetch /api/jobs, render ability list
    ├── endgame.js           # wipe detection + overlay + VC debrief async
    ├── replayPanel.js       # modal replay viewer con playback controls
    ├── anim.js              # move tween + damage popups + anim state
    ├── sfx.js               # Web Audio synth sfx + mute toggle
    └── style.css            # tema dark minimal
```

## Limitazioni known

- No drag&drop movimento
- No pixel-art sprite (asset direction 🔴 bloccato su Master DD)
- No multiplayer (local solo vs Sistema)
- No save/load mid-session
- Replay: MVP viewer, non full simulator (d20 re-roll defer)

## Roadmap next

- Sprint η: playtest #3 documentato browser (valida flow)
- UI tooltips su ability/unit hover
- Attack animation: flash sprite + screen shake configurable
- Multi-language i18n (`data/i18n/{it,en}/`)
- Accessibility toggle (colorblind, reduce motion) da `data/core/ui/accessibility.yaml`
- Pixel-art asset swap quando disponibili

## Cross-reference

- Backend: `apps/backend/` (porta 3334)
- CLI alternative: `node tools/js/play.js` (terminale, same backend)
- Decisions: `RESEARCH_TODO.md` sprint α-ζ
- Playtest log: `docs/playtests/`
