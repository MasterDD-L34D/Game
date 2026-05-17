---
title: 'Co-op loop — verità fondamentali Layer A+B+C (first principles)'
workstream: cross-cutting
category: research
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - first-principles
  - coop
  - m16
  - design
  - pre-execution
related:
  - docs/planning/2026-04-26-coop-mvp-spec.md
  - docs/planning/2026-04-26-coop-migration-plan.md
  - docs/adr/ADR-2026-04-26-m15-coop-ui-redesign.md
---

# Co-op loop — verità fondamentali (pre-execution)

Filosofia sorgente: `Archivio_Libreria_Operativa_Progetti/02_LIBRARY/03_First_Principles_Repo_Game_Claude_Code.md`.

Sequenza operativa richiesta prima di qualsiasi altro code:

1. ✅ Intake problema (fatto — UI v2 shipped ma scope frammentato)
2. 🟡 Verità gioco (parziale — solo combat)
3. ✅ Repo map (ADR esistenti)
4. **Distrutturazione first principles** ← questo doc
5. Ricostruzione minima → `coop-mvp-spec.md`
6. Piano migrazione → `coop-migration-plan.md`

---

## Layer A — verità gioco co-op

### A.1 Fantasy giocatore

**"Io e 3 amici, seduti in salotto. TV al centro. Ognuno sul suo cellulare. La TV mostra mondo, mappa, eventi. Il mio cellulare è il mio personaggio: chi sono, cosa posso fare, cosa scelgo. Decidiamo insieme parlando. Il gioco aspetta che tutti siano pronti. Poi la TV risolve e ci dice cosa è successo."**

Analogia: **Jackbox Party Pack** (ogni player phone = avatar + input) **+** **Pathfinder tavolo** (party cooperativo narrativo) **+** **FFT/XCOM** (tattica a griglia deterministica).

### A.2 Core loop minimo

```
┌─────────────────┐
│  INIZIO RUN     │  ← stanza creata, amici entrati
└────────┬────────┘
         ↓
┌─────────────────┐
│ CHARACTER       │  ← ognuno sceglie chi è (form + nome + specie)
│ CREATION        │  ← party conferma pronto
└────────┬────────┘
         ↓
┌─────────────────┐
│ WORLD SETUP     │  ← party decide insieme scenario (biome + difficoltà)
│                 │  ← host propone / party vota o conferma
└────────┬────────┘
         ↓
┌─────────────────┐
│ COMBAT ROUND    │  ← ognuno pianifica intent su phone
│ (planning)      │  ← tutti ✅ → tutti committati
│                 │  ← risoluzione animata su TV
│                 │  ← narrativa post-round su phone
└────────┬────────┘
         ↓
     ┌───┴────────┐
     │ scenario   │
     │ finito?    │
     └──┬────┬────┘
        │ NO │ SÌ
        ↓    ↓
    [loop]  DEBRIEF
         (XP + form evolve + prossimo scenario o fine run)
```

### A.3 Job-to-be-done partita

1. **Divertirsi insieme** a prescindere dalla vittoria — sessione 30-60 min.
2. **Prendere decisioni condivise**: target, tattica, chi aiuta chi.
3. **Vedere progressione**: PG cresce (form evolve, perk, XP) tra scenari.
4. **Ridere dei fallimenti**: narrativa colorata, non solo numeri.

### A.4 Decisioni che devono essere interessanti

- **Character creation**: form MBTI scelto imposta stile tattico (ISTJ-tank vs ENFP-support). Scelta informa ruolo party.
- **World setup**: biome influenza trait synergy + hazards. Scelta party = compromesso tra stili.
- **Combat planning**: azione + target con info parziale (nemici hanno HP visibile ma AI intent nascosto).
- **Debrief**: form evolve o tieni perk attuali? Rischio vs consolidamento.

### A.5 Leggibilità / tensione / soddisfazione

| Attributo         | Dove si manifesta                                                           | Fail mode                                |
| ----------------- | --------------------------------------------------------------------------- | ---------------------------------------- |
| **Leggibile**     | TV = stato globale + narrativa testuale; phone = UN solo PG, HP/AP visibili | JSON raw, dropdown nudi, "turn ?"        |
| **Teso**          | Timer round 30s + pressure sistema crescente                                | Infinite planning senza pressione        |
| **Soddisfacente** | Feedback narrativo post-round + ✅/❌ intent riuscito/fallito               | Silenzio dopo commit, no sense of impact |

### A.6 Anti-patterns da evitare

- ❌ **Master DM asimmetrico** (user ha detto esplicitamente "1 solo gioco online senza master")
- ❌ **Host = player privilegiato** che può vincere il gioco (host = arbitro/TV, non contendente)
- ❌ **Voting everywhere** (lentezza). Votazione solo per World Setup, dopo tutto è input individuale.
- ❌ **Tutorial forzato** ogni run. Onboarding opt-in primo gioco + skip-for-regulars.

---

## Layer B — verità sistema

### B.1 Stato minimo match

```yaml
room:
  code: ABCD
  phase: lobby|character_creation|world_setup|combat|debrief|ended
  host_id: p_xxx
  players: [{id, name, connected, role}]

run:
  id: run_xxx
  scenario_stack: [enc_01, enc_02, ...]
  current_scenario_index: 0
  party_xp_pool: 0
  party_pi_pool: 0

characters: # 1 per player, created in Character Creation phase
  p_xxx:
    player_id: p_xxx
    name: "Aria"
    form_id: istj_custode
    species_id: scagliato
    job_id: guerriero
    level: 1
    xp: 0
    perks: []
    hp_max: 22
    ap_max: 2

combat_state: # populated in combat phase
  turn: 1
  round: 1
  pending_intents: {p_xxx: {actor_id, action, target_id}}
  ready_set: [p_xxx]
  units: [{id, owner_id, hp, ap, position, status, ...}]
  grid: {w: 8, h: 8, terrain: [...]}
  pressure: 0

log:
  - {ts, kind: 'room.created' | 'char.created' | 'combat.round_start' | ..., payload}
```

### B.2 Input/output per fase

| Fase                   | Input player                                                               | Output → TV                         | Gate avanzamento                        |
| ---------------------- | -------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------- | --------------- | ---------------------------------- |
| **Character Creation** | `{player_id, name, form_id, species_id?}`                                  | `character_ready` per ogni player   | tutti i player `character_ready` → NEXT |
| **World Setup**        | `{player_id, vote: scenario_id}` oppure host `{scenario_id, accept: true}` | `world_chosen`                      | Host confirma scelta OR timer 60s       |
| **Combat / planning**  | `{player_id, actor_id, action, target_id?, xy?}` 1/round                   | `round_ready` broadcast             | tutti ready OR timer 30s → commit       |
| **Combat / resolving** | (nessuno)                                                                  | `round_resolved` + narrative events | animazione completa → back to planning  |
| **Debrief**            | `{player_id, choice: 'evolve'                                              | 'perk'                              | 'skip'}` per ogni level-up              | `debrief_ready` | tutti ready → NEXT scenario OR END |

### B.3 Determinismo + testabilità

- **Combat resolver**: già deterministico (d20 + seed roundOrchestrator). OK.
- **Character creation**: deterministico dato form+species+job. OK se form catalog statico.
- **World setup**: selezione player + biome RNG seedato. OK se seed reproducibile.
- **Tutto testabile senza UI**: ogni fase ha endpoint REST che riceve input e produce output state. WS = solo notifica broadcast.

### B.4 Replay / serialization / trace

- Intero run serializzabile come lista eventi `log[]`.
- Replay = replay degli eventi applicando reducer deterministico.
- Test di replay: dato `run.log[]` finale, ri-esegui reducer da zero → stato equivalente.

### B.5 Contratti schema (da validare)

- `packages/contracts/schemas/` deve avere:
  - `character.schema.json` ✅ parzialmente (già forms)
  - `run.schema.json` ❌ nuovo
  - `combat_round.schema.json` ✅ (già session)
  - `debrief.schema.json` ❌ nuovo

---

## Layer C — verità repo

### C.1 Moduli esistenti riutilizzabili

| Modulo                                                             | Stato                 | Serve per                     |
| ------------------------------------------------------------------ | --------------------- | ----------------------------- |
| `apps/backend/routes/session.js`                                   | ✅ live               | Combat loop                   |
| `apps/backend/services/roundOrchestrator.js`                       | ✅ live               | Round planning+commit         |
| `apps/backend/services/network/wsSession.js`                       | ✅ live + M15 pending | Lobby + ready + chat          |
| `apps/backend/routes/forms.js` + `services/forms/formEvolution.js` | ✅ live M12           | Form pick + evolve            |
| `apps/backend/routes/progression.js` + `progressionEngine.js`      | ✅ live M13           | XP + perks                    |
| `apps/backend/routes/campaign.js`                                  | 🟡 partial            | Run state (scenari stack)     |
| `data/core/forms/mbti_forms.yaml`                                  | ✅ 16 forms           | Character creation pool       |
| `data/core/jobs.yaml`                                              | ✅ 7 jobs             | Character creation pool       |
| `packs/evo_tactics_pack/data/species/*`                            | ✅ 45 species         | Character creation pool       |
| `apps/play/src/formsPanel.js`                                      | ✅ live M12           | Riutilizzare come form picker |

### C.2 Moduli mancanti (da creare)

| Modulo                                      | Responsabilità                                                            | Effort |
| ------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| `apps/backend/services/coopOrchestrator.js` | Macchina stato fase lobby→character→world→combat→debrief                  | ~4h    |
| `apps/backend/routes/coop.js`               | REST: `/run/start`, `/character/create`, `/world/vote`, `/debrief/choice` | ~3h    |
| `apps/play/src/characterCreation.js` + CSS  | UI phone phase character creation                                         | ~4h    |
| `apps/play/src/worldSetup.js` + CSS         | UI phone phase world setup + voto                                         | ~3h    |
| `apps/play/src/debriefPanel.js` + CSS       | UI phone phase debrief (XP + form choice)                                 | ~3h    |
| `apps/play/src/phaseCoordinator.js`         | Switch overlay phone in base a `room.phase`                               | ~1h    |

### C.3 Cerimonie / accoppiamenti da rompere

| Anti-pattern attuale                                                             | Fix                                                                                |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `session.js` /start spawna units hardcoded da scenario. No `owner_id` per player | Param `characters[]` da coop orchestrator → unità create con `owner_id`            |
| `publishWorld` su TV è chiamato da `main.js` host — accoppia UI↔backend         | Host TV invia `publishWorld` solo come relay; source of truth = backend coop state |
| Form evolution in M12 è player-locale (formSessionStore)                         | Debrief usa stesso store, espone scelta al player via WS msg                       |
| Scenario selection dropdown TV = host-only                                       | Voto party via nuovo WS msg `world_vote`                                           |

### C.4 Dati che devono sopravvivere restart

- `run_state` (in-memory ok per MVP, Prisma in M18)
- `characters[]` per run (legati a `run_id + player_id`)
- `log[]` per replay/debrief (cap 500 eventi per run)

---

## Gap rapidi rispetto allo shipped M15

| Gap                                                            | Bloccante per         | Priorità |
| -------------------------------------------------------------- | --------------------- | -------- |
| PG non mappati a `player_id`                                   | Jackbox flow          | 🔴 P0    |
| Phase `idle→planning→ready→resolving` non pilotate server-side | UX rotta post round 1 | 🔴 P0    |
| `round_clear` mai chiamato da host post-commit                 | Stesso                | 🔴 P0    |
| Character Creation UI mancante                                 | Flow completo         | 🟠 P1    |
| World Setup UI mancante                                        | Flow completo         | 🟠 P1    |
| Debrief UI mancante                                            | Flow completo         | 🟠 P1    |
| Narrative log su phone post-round                              | Feedback              | 🟡 P2    |
| Timer visivo round                                             | Tensione              | 🟡 P2    |

---

## Decisioni chiave aperte (serve user)

1. **Mapping PG ↔ player_id** alla `/run/start`:
   - Opt A: server assegna PG dal pool in base a ordine join
   - Opt B: player sceglie PG in Character Creation (pattern Jackbox)
   - Opt C: host assegna ai player durante setup
     → **raccomando Opt B** (matcha fantasy giocatore)

2. **Scenari stack**:
   - Opt A: campagna lineare pre-definita (tutorial 01→02→…→05)
   - Opt B: party sceglie prossimo scenario dopo ogni vittoria
   - Opt C: random rogue-lite
     → **raccomando Opt A per MVP, B come M18**

3. **Max player**: 4 fisso o 2-8 modulation?
   → **2-4 fisso MVP** (modulation complica). 8 è M20+.

4. **Session duration target**:
   - 30 min per "one and done" casual
   - 60-90 min per "full run" con 3-5 scenari
     → **MVP = 1 scenario quick run ~20min**, poi extend

5. **Persistenza run tra sessioni**:
   - No, ogni demo = fresh run (MVP)
   - Sì, run può essere ripresa (M19+)
     → **MVP no persist**, Prisma gia pronto (ADR M11.D)

---

## Next step filosofico

Doc completato. User conferma/modifica layer A+B+C.
Poi procedo a `coop-mvp-spec.md` (ricostruzione minima + wireframe + state machine).

Format prossimo doc (da filosofia):

1. Sintesi
2. Struttura operativa (wireframe + schema)
3. Rischi / punti deboli
4. Prossimi passi

## Riferimenti

- Filosofia: `02_LIBRARY/03_First_Principles_Repo_Game_Claude_Code.md` §Sequenza operativa
- ADR M15 UI: [ADR-2026-04-26-m15-coop-ui-redesign](../adr/ADR-2026-04-26-m15-coop-ui-redesign.md)
- ADR M11 WS: [ADR-2026-04-20-m11-jackbox-phase-a](../adr/ADR-2026-04-20-m11-jackbox-phase-a.md)
- M12 forms: `services/forms/formEvolution.js`
- M13 progression: `services/progression/progressionEngine.js`
