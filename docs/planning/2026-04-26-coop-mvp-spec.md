---
title: 'Co-op MVP spec — state machine + wireframe + user stories'
workstream: cross-cutting
category: spec
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - spec
  - mvp
  - coop
  - m16
  - wireframe
  - state-machine
related:
  - docs/planning/2026-04-26-coop-truths.md
  - docs/planning/2026-04-26-coop-migration-plan.md
---

# Co-op MVP spec (ricostruzione minima)

Da filosofia: **"ricostruzione minima = solo ciò che serve davvero perché una partita funzioni bene"**.

## 1. Sintesi

Demo-ready co-op loop: **2-4 amici** completano **1 scenario** (20-30 min) con:

1. Entrano stanza (M11 shipped ✅)
2. Ognuno crea PG scegliendo form+nome (nuovo)
3. Party vota biome+difficoltà (nuovo, semplificato)
4. Gioca 3-5 round combat (shipped M15 🟡 con gap)
5. Debrief post-vittoria/sconfitta con XP + form evolve (shipped M12/M13 ma non wired co-op)

## 2. Struttura operativa

### 2.1 State machine globale

```
                    ┌─ player leaves all ─┐
                    ↓                      │
[lobby] ──start──→ [char_creation] ──all_ready──→ [world_setup] ──confirmed──→ [combat]
                                                                                  │
                                                                                  ↓
                                                                            [resolving]
                                                                                  │
                                                            ┌────win/lose────────┤
                                                            ↓                    │
                                                       [debrief] ──next──┐  ←────┘
                                                            │            │
                                                            ↓            │
                                                       [ended] ←── scenario_stack empty
```

### 2.2 Fase CHARACTER_CREATION — wireframe phone

```
┌─ 📱 PLAYER · Stanza ABCD · fase char_creation ─────────┐
│ ⏸ Crea il tuo PG — attendo gli altri                   │
├────────────────────────────────────────────────────────┤
│ NOME (obbligatorio)                                    │
│ [ Aria______________ ]  max 20 char                    │
├────────────────────────────────────────────────────────┤
│ FORM MBTI (swipe card o grid select)                   │
│ ┌─ ISTJ ──┐ ┌─ INTJ ──┐ ┌─ ENFP ──┐ ┌─ ISFP ──┐        │
│ │ Custode │ │Stratega │ │Catalysta│ │Artigiano│  ... 16 │
│ │ +HP+DEF │ │ +MoS    │ │ +Team   │ │ +Crit   │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│                                                        │
│ Scelta: ISTJ · Custode · +HP+DEF                       │
├────────────────────────────────────────────────────────┤
│ SPECIE (suggerita in base a form, override possibile)  │
│ ● Scagliato (raccomandato ISTJ)                        │
│ ○ Corvide  ○ Saltatore  ○ ...                          │
├────────────────────────────────────────────────────────┤
│ STATISTICHE PREVIEW                                    │
│ HP 22  AP 2  DEF 4  ATK 3  MOS +1                      │
├────────────────────────────────────────────────────────┤
│ [✓ Conferma PG]                                        │
├─ PARTY (2/4) ─────────────────────────────────────────┤
│ Aria       💭 sta scegliendo                           │
│ Bruno      ✅ pronto — ENFP Catalysta                  │
└────────────────────────────────────────────────────────┘
```

### 2.3 Fase CHARACTER_CREATION — TV host

```
┌─ Evo-Tactics · Crea Personaggi ────────────────────────┐
│ Roster (2/4 pronti):                                   │
│   Aria   💭 sta scegliendo                             │
│   Bruno  ✅ ENFP Catalysta · Corvide                   │
│   Chiara 💭 sta scegliendo                             │
│   Dario  💭 entrato ora                                │
│                                                        │
│ Timer: nessuno (wait all)      [⏱ Forza inizio]        │
│                                                        │
│ Suggerimento: 4 PG consigliati (1 tank + 1 support +   │
│ 2 dps). Bilanciato per prossimo scenario.              │
└────────────────────────────────────────────────────────┘
```

### 2.4 Fase WORLD_SETUP — wireframe phone

```
┌─ 📱 PLAYER · fase world_setup ─────────────────────────┐
│ 🗺 Scegliete insieme il primo scenario                 │
├────────────────────────────────────────────────────────┤
│ Proposta host: Tutorial 01 · Savana Dorata             │
│ Difficoltà: ●●○○○ Facile                              │
│                                                        │
│ Biome: savana · 2 nemici · no boss                     │
│ Tempo stimato: 10 min                                  │
│                                                        │
│ [👍 D'accordo]  [👎 Altro...]                          │
│                                                        │
│ Voti: 2/4 (Aria ✅, Bruno ✅)                          │
│                                                        │
│ In 60s scelta automatica su host-default               │
└────────────────────────────────────────────────────────┘
```

### 2.5 Fase COMBAT — già shipped M15 (con fix P0)

Come ADR-2026-04-26-m15. Piccoli addendum:

- **Fix P0-1**: PG mappato a `player_id`. Server `/run/combat/start` riceve `characters` dal coop state → crea unità con `owner_id`.
- **Fix P0-2**: `round_clear` chiamato server-side dopo `publishState` con phase=resolving.
- **Fix P0-3**: phase transitions automatiche server quando `all_ready == true`.

### 2.6 Fase DEBRIEF — wireframe phone

```
┌─ 📱 PLAYER · fase debrief ─────────────────────────────┐
│ 🏁 Round concluso — VITTORIA                           │
├────────────────────────────────────────────────────────┤
│ IL TUO PG                                              │
│ Aria · Lv 2 (+1 level!)  XP 12 → 28/35                 │
│ HP survived 8/22                                       │
├────────────────────────────────────────────────────────┤
│ LEVEL UP — scegli perk (XCOM-style)                    │
│                                                        │
│ [⚔ Impact Strike]     [🛡 Stoneskin]                   │
│  +2 dmg on first      Riduce 2 dmg primo               │
│  attack per round     hit subito                       │
│                                                        │
│ (perk-pair: uno escludi altro)                         │
├────────────────────────────────────────────────────────┤
│ FORM EVOLUTION (se confidence ≥ 0.6)                   │
│ Hai giocato da ISTJ puro questa partita.               │
│ Disponibile evolve → ISTJ-Sentinel (+DEF +HP).         │
│ PE: 12/8 ✅                                            │
│                                                        │
│ [🧬 Evolve Sentinel]  [⏭ Tieni forma attuale]         │
├────────────────────────────────────────────────────────┤
│ NARRATIVE LOG (ultimi round)                           │
│ Round 3: Aria colpisce boss (8 dmg, crit!)             │
│ Round 4: Boss si ritira. Vittoria!                     │
├────────────────────────────────────────────────────────┤
│ [✅ Pronto per prossimo scenario]  [🚪 Esci run]      │
├─ PARTY readiness ─────────────────────────────────────┤
│ Aria ✅ · Bruno 💭 scegliendo · Chiara 💭 · Dario ✅  │
└────────────────────────────────────────────────────────┘
```

### 2.7 User stories (MVP)

| ID    | Come...       | Voglio...                                | Così che...              |
| ----- | ------------- | ---------------------------------------- | ------------------------ |
| US-01 | Host (tavolo) | creo stanza 1-click                      | amici si uniscono subito |
| US-02 | Player        | entro con codice 4-letter e nome         | salto registrazione      |
| US-03 | Player        | scelgo form MBTI + nome in 30s           | mio PG è personale       |
| US-04 | Player        | vedo statistiche preview prima conferma  | so cosa sto scegliendo   |
| US-05 | Party         | votiamo insieme scenario                 | decisione condivisa      |
| US-06 | Player        | vedo solo MIO PG in combat               | no confusione ruoli      |
| US-07 | Player        | pianifico intent + vedo ready altri      | coordinamento visivo     |
| US-08 | Player        | chat con party in qualsiasi fase         | coordinamento verbale    |
| US-09 | Host          | vedo roster con ✅ intent + forza commit | mantengo flow            |
| US-10 | Player        | vedo narrativa post-round                | capisco impatto azioni   |
| US-11 | Player        | scelgo perk/evolve in debrief            | progresso personale      |
| US-12 | Party         | continuiamo a prossimo scenario          | run lunga                |
| US-13 | Player        | riconnetto dopo drop WS e riprendo PG    | resilienza               |
| US-14 | Host          | "Nuova run" ripartendo da zero           | replay                   |

### 2.8 Schema estensioni

**`apps/backend/services/coopOrchestrator.js` (nuovo):**

```js
class CoopOrchestrator {
  constructor({ roomCode, hostId }) {
    this.roomCode = roomCode
    this.hostId = hostId
    this.phase = 'lobby'   // lobby|character_creation|world_setup|combat|debrief|ended
    this.run = null        // { id, scenarioStack, currentIndex, partyXp, partyPi }
    this.characters = new Map() // player_id → character
    this.worldVotes = new Map()
    this.debriefChoices = new Map()
  }

  // transitions
  startCharacterCreation() { this.phase = 'character_creation' ... }
  submitCharacter(playerId, spec) { ... ; if (allReady) → startWorldSetup() }
  voteWorld(playerId, scenarioId) { ... ; if (hostConfirmed || timeout) → startCombat() }
  commitCombatRound(intents) { /* delegate to roundOrchestrator */ }
  startDebrief(outcome) { ... }
  submitDebriefChoice(playerId, choice) { ... ; if (allReady) → nextScenarioOrEnd() }
  nextScenarioOrEnd() { if (stackDone) → 'ended' else startCombat(next) }
}
```

**Nuovi WS message types:**

| Msg                    | Dir        | Payload                                         |
| ---------------------- | ---------- | ----------------------------------------------- | -------- | -------- |
| `phase_change`         | S→C        | `{phase, round?, scenario?}`                    |
| `character_submit`     | C→S        | `{name, form_id, species_id}`                   |
| `character_ready_list` | S→C        | `[{player_id, name, form_id, ready}]`           |
| `world_propose`        | S→C (host) | `{scenario_id, difficulty, biome}`              |
| `world_vote`           | C→S        | `{scenario_id, accept: true/false}`             |
| `world_vote_tally`     | S→C        | `{votes: {accept, reject}, timeout_s}`          |
| `debrief_proposal`     | S→C        | `{player_id, level_up, perks[], evolve_option}` |
| `debrief_choice`       | C→S        | `{choice: 'perk_id'                             | 'evolve' | 'skip'}` |

Tutti coesistono con M15 (`intent`, `intent_cancel`, `chat`, `round_ready`).

## 3. Rischi / punti deboli

| Rischio                                          | Mitigazione                                                                         | Severità |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| Player vuole cambiare PG dopo character_creation | Disabilitato MVP; M17 consente rework pre-combat                                    | 🟡       |
| Party disagrees su world vote 2-2                | Host tie-break; se host non decide in 60s → default scenario proposto               | 🟢       |
| Player drop metà character_creation              | PG salvato in coopOrchestrator; reconnect ripristina                                | 🟡       |
| Debrief troppo lungo → frustrazione              | Timer 45s per scelta; se scade → XP applicato, no perk pick                         | 🟡       |
| Form evolution complessa per nuovi player        | MVP skip evolution (show option solo se confidence ≥ 0.7); tutorial incluso         | 🟢       |
| Scenario balance col mix party random            | Difficulty auto-scale post MVP (M18); MVP = solo tutorial 01 easy                   | 🟢       |
| WS drop mid-combat → state perso                 | Reconnect già live (M11); in-memory state survive server restart via Prisma (M11.D) | 🟢       |
| UI phone non responsive su piccoli schermi       | CSS già mobile-first M15; test 360px min                                            | 🟢       |
| Chat flooding / abuse                            | Rate limit 1 msg/sec server-side; M19 moderazione                                   | 🟢       |

## 4. Prossimi passi

1. **User review** layer A+B+C (`coop-truths.md`) + questo MVP spec
2. Approva/modifica decisioni chiave aperte sezione §Decisioni del doc truths
3. Proseguo con `coop-migration-plan.md` (fasi M16-M20 con effort + sequenza + rollback)
4. Execution fase per fase con PR piccoli focused

## Appendice — esclusioni MVP

Esplicitamente fuori scope primo mockup demo-ready:

- ❌ Character multi-PG per player (1 fisso)
- ❌ Voting complesso world setup (solo accept/reject su host proposal)
- ❌ Spettatori non-player
- ❌ PvP
- ❌ Matchmaking globale
- ❌ Leaderboard / stats persistent
- ❌ Achievement
- ❌ Cosmetic cosmetics / skins
- ❌ Mobile PWA install
- ❌ Voice chat integrato
- ❌ Save & quit run (MVP = 1 sessione consumptiva)

Questi arrivano post-playtest 3+ con feedback reale.

## Riferimenti

- Truths: [coop-truths.md](2026-04-26-coop-truths.md)
- Plan: [coop-migration-plan.md](2026-04-26-coop-migration-plan.md)
- Filosofia: `02_LIBRARY/03_First_Principles_Repo_Game_Claude_Code.md` §Ricostruzione minima
