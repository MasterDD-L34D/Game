---
title: 44 — HUD Layout References + Round Model Research
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-18'
source_of_truth: true
language: it
review_cycle_days: 90
related:
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/core/43-ASSET-SOURCING.md'
  - 'docs/adr/ADR-2026-04-15-round-based-combat-model.md'
---

# 44 — HUD Layout References + Round Model Research

> Research canonical post-playtest M4 #1600. User feedback: HUD sidebar 30% + canvas small + log scroll problem. Round model FFT sequenziale obsoleto — serve contemporaneo 2024-2026. Agent research 30+ ref.

## Executive summary

**HUD layout raccomandato**: **Into the Breach-style** (top bar compatta + grid centrale ~70% width + bottom bar ability chunky + mini-strip player LEFT + enemy intent RIGHT). Log collapsato in "recap chip" flottante.

**Round model raccomandato**: **Plan & Reveal batched** (Frozen Synapse + Into the Breach hybrid). 3 fasi:

1. **Declare** parallelo tutti player + SIS intents (timer soft 45s)
2. **Resolve** animato priority queue (ADR-2026-04-15)
3. **Recap** chip 2-3s

**Top 3 anti-pattern**:

1. Sidebar vertical dense 30% (Wesnoth, XCOM — tuo problema attuale)
2. Log testuale scroll (TV no-scroll)
3. Timeline iniziativa invisible (FFT error)

## Part A — HUD references (15 giochi tactical)

### Tier 1 — HIGH fit Evo-Tactics

| #   | Gioco                   | Anno | Pattern chiave                                                |    Fit     |
| --- | ----------------------- | :--: | ------------------------------------------------------------- | :--------: |
| 1   | **Into the Breach**     | 2018 | Threat arrows on grid + mech cards bottom + enemy queue right | ⭐⭐⭐⭐⭐ |
| 2   | **Slay the Spire**      | 2019 | Enemy intent icon (pugno/scudo) sopra enemy = scan time ≤1s   | ⭐⭐⭐⭐⭐ |
| 3   | **Triangle Strategy**   | 2022 | **Timeline iniziativa orizzontale TOP** con portrait ordinati | ⭐⭐⭐⭐⭐ |
| 4   | **Tactics Ogre Reborn** | 2022 | HP bar **floating sopra sprite**, no sidebar                  | ⭐⭐⭐⭐⭐ |
| 5   | **Frozen Synapse**      | 2011 | Plan→Prime→Execute 3-phase button + visual path ghost         | ⭐⭐⭐⭐⭐ |
| 6   | **AncientBeast**        | 2024 | Open-source browser Canvas JS, queue top + 4 ability bottom   | ⭐⭐⭐⭐⭐ |
| 7   | **Lost Eidolons**       | 2022 | AP bar central + threat tile color on hover                   |  ⭐⭐⭐⭐  |
| 8   | **Battle Brothers**     | 2017 | Initiative portrait strip TOP con timer indicator             |  ⭐⭐⭐⭐  |
| 9   | **Unicorn Overlord**    | 2024 | **Combat preview overlay** prima ingaggio (= predict_combat)  |  ⭐⭐⭐⭐  |

### Tier 2 — MEDIUM fit

| #   | Gioco             | Anno | Pattern                                          |  Fit   |
| --- | ----------------- | :--: | ------------------------------------------------ | :----: |
| 10  | **Midnight Suns** | 2022 | Card fan bottom + enemy mini-portraits top-right | ⭐⭐⭐ |
| 11  | **Wartales**      | 2023 | Mini turn queue top-left + skill bar MOBA-style  | ⭐⭐⭐ |
| 12  | **Wildermyth**    | 2021 | Character strip narrative (meno dense stats)     | ⭐⭐⭐ |

### Tier 3 — ANTI-pattern reference

| #   | Gioco                  | Problema                                           |
| --- | ---------------------- | -------------------------------------------------- |
| 13  | **Wesnoth BfW**        | Sidebar destra denso = desktop-first, NON TV-first |
| 14  | **XCOM Enemy Unknown** | Submenu multi-click ability (click fatigue)        |
| 15  | **Gears Tactics**      | Small font 14px non leggibile TV 3m                |

## Part B — Round model landscape (10 pattern)

| #   | Pattern                                   | Esempio                     | Fit co-op 4-8 TV |
| --- | ----------------------------------------- | --------------------------- | :--------------: |
| 1   | **Planning simultaneo → resolve batched** | Frozen Synapse, ItB         |    ⭐⭐⭐⭐⭐    |
| 2   | Initiative timeline ATB                   | FF7 Remake, Battle Brothers |      ⭐⭐⭐      |
| 3   | **Action queue (threat declared first)**  | Into the Breach             |     ⭐⭐⭐⭐     |
| 4   | AP dynamic per round                      | Triangle Strategy           |     ⭐⭐⭐⭐     |
| 5   | Speed-based preview                       | FFX                         |       ⭐⭐       |
| 6   | Async co-op turn                          | Gloomhaven Digital          | ❌ (no TV share) |
| 7   | Real-time with pause                      | Pillars, Wartales           |       ⭐⭐       |
| 8   | Card-driven sequencing                    | StS, Midnight Suns          |      ⭐⭐⭐      |
| 9   | Draft planning phase                      | Door Kickers                |      ⭐⭐⭐      |
| 10  | **Simultaneous reveal** (fog of intent)   | Diplomacy                   |     ⭐⭐⭐⭐     |

### Raccomandazione Evo-Tactics: "Plan & Reveal"

**Combo #1 + #3 + #4** hybrid contemporary:

```
╔══════════════════════════════════════╗
║ FASE 1 — DECLARE (parallel, 45s)     ║
║  • 4-8 player declare intent ALL     ║
║  • SIS AI declara intent VISIBILE    ║
║  • Threat tile overlay rosso         ║
║  • Player vede cosa SIS prepara      ║
╠══════════════════════════════════════╣
║ FASE 2 — RESOLVE (animato, 8-15s)    ║
║  • Priority queue (ADR-04-15)        ║
║  • Camera pan action corrente        ║
║  • Reaction first-class trigger      ║
╠══════════════════════════════════════╣
║ FASE 3 — RECAP (2-3s)                ║
║  • Chip PT/KO/status applicati       ║
║  • Pressure tier update              ║
╚══════════════════════════════════════╝
```

### Perché batte FFT

| Problema FFT                                      | Plan & Reveal fix                           |
| ------------------------------------------------- | ------------------------------------------- |
| Attesa turno sequenziale 4-8p boring              | Tutti agiscono insieme fase 1 = zero attesa |
| SIS intents hidden fino own turn                  | Visible fase 1 = decision lever TV          |
| Co-op = shared thinking non mechanically enforced | Fase 1 = conversation-driven moment         |
| Tactical depth = micro-decisions                  | Preserve priority queue + reactions         |

### Perché è CONTEMPORANEO 2024-2026

- Frozen Synapse 2011 ma pattern ripreso 2024 (Into the Breach + Children of the Sun)
- Co-op 4-8 shared screen = TV party game wave (Overcooked, It Takes Two, Chef Life)
- Threat preview = puzzle-feel loved post-ItB 2018
- Priority queue data-driven = pattern XState + boardgame.io 2024

## Part C — Coding references

### Top repo tactical Canvas/browser

| Repo                 | Link                                         | Pattern rilevante                                                                                                        |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **AncientBeast**     | https://github.com/FreezingMoon/AncientBeast | Browser Canvas tactical, queue top + 4 ability bottom. Stack molto simile apps/play/. `src/ui/queue.js`, `src/ui/hud.js` |
| **Wesnoth**          | https://github.com/wesnoth/wesnoth           | C++ ma sidebar decomposition pattern riferimento                                                                         |
| **boardgame.io**     | https://github.com/boardgameio/boardgame.io  | Multi-player UI state + phases (stesso model nostro round)                                                               |
| **XState**           | https://github.com/statelyai/xstate          | State machine per round phase (declare→resolve→recap)                                                                    |
| **Phaser Roguelike** | https://github.com/phaserjs/examples         | Tile-based input + fog of war overlay                                                                                    |
| **OpenRA**           | https://github.com/OpenRA/OpenRA             | Command bar widget tree reactive                                                                                         |
| **Unciv**            | https://github.com/yairm210/Unciv            | Hex grid + unit info panel free-form                                                                                     |
| **Freeciv-web**      | https://github.com/freeciv/freeciv-web       | Canvas 2D map + HUD JS vanilla (stack simile)                                                                            |

### Pattern da estrarre per Evo-Tactics

- **AncientBeast queue strip**: top bar portrait con initiative order
- **XState round machine**: fasi dichiarative con transitions
- **boardgame.io phase system**: per round Plan/Resolve/Recap canonical
- **OpenRA widget tree**: ristruttura apps/play/ layout senza DOM manuale

## Part D — Anti-pattern

| Problema                    | Esempio                 | Perché male TV co-op              |
| --------------------------- | ----------------------- | --------------------------------- |
| Sidebar dense-vertical 30%  | Wesnoth, XCOM EU        | Riduce grid, TV 10ft = illegibile |
| Log testuale scroll         | Battle Brothers war log | No scroll su TV                   |
| Submenu multi-click         | XCOM Chimera            | Click fatigue controller          |
| Small font < 18px           | Gears Tactics           | Illegible 3m distance             |
| Initiative invisible        | Valkyrie Profile        | Player non sa chi agisce dopo     |
| Confirmation double-tap     | Fire Emblem Engage      | Fatigue 4-8p                      |
| Tutorial tooltip permanente | Anthem                  | Clutter                           |
| HP bar color unico          | Destiny early           | Colorblind fail                   |

## Part E — TV-first best practice

Già in `42-STYLE-GUIDE-UI.md §Accessibility`, riassunto qui:

- **Safe zone 5%**: no UI critico bordi 5% viewport
- **Font ≥18px** equivalente 1080p @ 3m
- **Scan time ≤ 2s** per info critica
- **Color + shape** ridondanti (colorblind safe)
- **Audio feedback** opzionale
- **Timer visible** ma opzionale (non stress-inducing per TV co-op)

## Recommendation finale — layout Evo-Tactics

### Layout nuovo proposto

```
┌──────────────────────────────────────────────────────────┐
│ [R05 Turn 03] [Pressure:Guarded ▓▓▓░░] [Recap chip]     │ ← TopBar h≈60px (safe zone 5%)
├────┬─────────────────────────────────────────────┬──────┤
│ P1 │                                             │ Enemy│
│ P2 │         GRID CANVAS                         │intent│
│ P3 │      (centered, ~70% width)                 │ icons│
│ P4 │                                             │      │
│    │   [threat tile overlay rosso]               │      │
│    │                                             │      │
├────┴─────────────────────────────────────────────┴──────┤
│ [Ability1] [Ability2] [Ability3]  [⏱ 32s]  [End Plan]   │ ← BottomBar h≈100px
└──────────────────────────────────────────────────────────┘
```

### Priority change apps/play/

| Priority | Change                                              | File                                           | Stima LOC |
| :------: | --------------------------------------------------- | ---------------------------------------------- | :-------: |
|  **P0**  | HP float sopra unit sprite                          | `apps/play/src/render.js`                      |    50     |
|  **P0**  | SIS enemy intent icon (pugno/scudo)                 | `apps/play/src/hud/enemyIntent.js` (nuovo)     |    120    |
|  **P0**  | Threat tile overlay (rosso tile minacciato declare) | `render.js` overlay layer                      |    80     |
|  **P0**  | Safe zone 5% padding CSS                            | `apps/play/style.css`                          |     5     |
|  **P1**  | Player mini-strip LEFT (sostituisce sidebar destra) | `apps/play/index.html` + `ui.js`               |    180    |
|  **P1**  | Recap chip TOP flottante (ultimi 3 eventi)          | `hud/recapChip.js` (nuovo)                     |    100    |
|  **P1**  | Ability bottom card chunky (≥120px alto, font 20px) | CSS rework                                     |    60     |
|  **P2**  | Timer declare phase 45s soft                        | backend `/round/begin-planning`                |    40     |
|  **P2**  | ADR Plan-Reveal canonico                            | `docs/adr/ADR-2026-04-18-plan-reveal-round.md` |    200    |
|  **P3**  | Camera pan resolve animation                        | canvas transform controller                    |    150    |
|  **P3**  | Initiative timeline portrait TOP                    | `hud/timelineBar.js`                           |    200    |

### ADR nuovo raccomandato

**`ADR-2026-04-18-plan-reveal-round.md`** (futuro sprint):

- Formalizza Plan → Reveal → Recap 3-fase
- Threat preview mandatory
- Timer soft 45s configurable
- Reaction first-class nel resolve
- Fog-of-intent OFF default (visible SIS intent = decision lever TV)

## Part F — Moodboard (20+ URL verificati)

1. Into the Breach HUD https://subsetgames.com/itb.html
2. Into the Breach gameplay https://www.youtube.com/watch?v=C876E7Y3AS0
3. Slay the Spire intent icons https://store.steampowered.com/app/646570/Slay_the_Spire/
4. Triangle Strategy timeline https://www.square-enix-games.com/en_US/games/triangle-strategy
5. Frozen Synapse plan/prime https://www.frozensynapse.com/
6. AncientBeast live demo https://AncientBeast.com/
7. AncientBeast GitHub https://github.com/FreezingMoon/AncientBeast
8. Wesnoth UI screenshots https://www.wesnoth.org/screenshots/
9. Battle Brothers initiative bar https://store.steampowered.com/app/365360/Battle_Brothers/
10. Lost Eidolons AP bar https://store.steampowered.com/app/1275910/Lost_Eidolons/
11. Unicorn Overlord combat preview https://unicorn-overlord.nintendo.com/
12. Tactics Ogre Reborn HUD https://www.square-enix-games.com/en_US/games/tactics-ogre-reborn
13. Wartales combat https://store.steampowered.com/app/1527950/Wartales/
14. Midnight Suns card HUD https://midnightsuns.2k.com/
15. Symphony of War hex https://store.steampowered.com/app/1488200/Symphony_of_War_The_Nephilim_Saga/
16. BBC TV-safe zone white paper https://www.bbc.co.uk/rd/publications/whitepaper162
17. MDN Canvas tutorial https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
18. XState docs (phase state machine) https://stately.ai/docs
19. boardgame.io docs https://boardgame.io/documentation/
20. OpenRA widget system https://github.com/OpenRA/OpenRA/wiki/UI-widgets
21. Unciv screenshot gallery https://github.com/yairm210/Unciv#screenshots
22. Freeciv-web demo https://play.freeciv.org/

## Implementation priority (3 sprint roadmap)

### Sprint A — P0 essentials (1 settimana)

- HP float sprite
- SIS enemy intent icon
- Threat tile overlay declare phase
- Safe zone 5% padding
- **Test**: playtest TV 10ft scan time ≤2s

### Sprint B — P1 layout (1 settimana)

- Player mini-strip LEFT ristruttura
- Recap chip TOP
- Ability bottom chunky card
- Font upgrade globale ≥20px
- **Test**: playtest 4p comparative vs shapes base

### Sprint C — P2-P3 round model (2 settimane)

- ADR Plan-Reveal formalizzato
- Timer backend soft
- Camera pan resolve
- Initiative timeline portrait TOP
- **Test**: N=30 round Plan-Reveal baseline timing

### Risk mitigation

- Feature flag `ROUND_MODEL=plan-reveal` default OFF fino playtest
- Gate ogni sprint con playtest reale (kill-60 validation)
- Rollback via flag (no destructive refactor)

## Cross-references

- `docs/core/41-ART-DIRECTION.md` — palette + silhouette compatibile
- `docs/core/42-STYLE-GUIDE-UI.md` — design tokens (font, spacing, safe zone già spec)
- `docs/core/43-ASSET-SOURCING.md` — pipeline asset zero-cost
- `docs/adr/ADR-2026-04-15-round-based-combat-model.md` — base round canonical
- `apps/play/src/render.js` — target P0 changes
- `apps/play/src/abilityPanel.js` — bug race condition FIXED #1602

## Q-OPEN da questo research

- Q-OPEN-31: ADR Plan-Reveal round model formalize — when?
- Q-OPEN-32: Fog of intent default OFF vs ON — depends playtest feedback
- Q-OPEN-33: Timer declare 45s tunable vs fixed
- Q-OPEN-34: Camera pan animation blocking vs smooth-continuous
