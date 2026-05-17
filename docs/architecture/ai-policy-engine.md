---
title: Architettura AI Policy Engine (Evo-Tactics Playtest)
doc_status: active
doc_owner: flow-team
workstream: flow
last_verified: 2026-04-16
source_of_truth: true
language: it
review_cycle_days: 30
---

# Architettura AI Policy Engine

Questo documento descrive l'architettura del sistema IA SIS nel modulo
`apps/backend/services/ai/`, estratto da `routes/session.js` nello
sprint-010. Copre il flusso **event → metric → aggregate index → Ennea
archetype** e il **sistema di regole decisionali** del turno SIS, incluse
le estensioni sprint-012 (REGOLA_003 kite) e sprint-013 (stati emotivi).

L'obiettivo: dare a chiunque lavori sull'IA (tu fra 6 mesi incluso)
una mappa chiara di dove vive cosa e come aggiungere nuove regole,
stati o metriche senza rompere quelle esistenti.

## Mappa dei file

```
apps/backend/
├── routes/
│   └── session.js                 ← router HTTP, state session in-memory
└── services/
    ├── ai/
    │   ├── policy.js              ← funzioni PURE: regole, stati, geo, threat
    │   ├── threatAssessment.js    ← AI War pattern: threat index + escalation
    │   ├── declareSistemaIntents.js ← intent producer per round model
    │   ├── sistemaTurnRunner.js   ← orchestratore turno legacy con DI
    │   ├── utilityBrain.js        ← utility AI scoring (opt-in)
    │   └── sistemaActor.js        ← xstate actor model
    ├── vcScoring.js               ← event → metric → aggregate → ennea
    ├── traitEffects.js            ← modificatori damage trait
    └── fairnessCap.js             ← cap_pt budget enforcement

packs/evo_tactics_pack/data/balance/
├── ai_intent_scores.yaml          ← costanti decisionali + threat config
└── ai_profiles.yaml               ← profili personalita + threat overrides

data/core/
└── telemetry.yaml                 ← pesi indici + ennea_themes[]

tests/ai/
├── policy.test.js                 ← 34+ test puri
├── declareSistemaIntents.test.js  ← intent generation tests
├── sistemaTurnRunner.test.js      ← 11 test runner con DI stubs
├── threatAssessment.test.js       ← threat index + REGOLA_004 integration
└── utilityBrain.test.js           ← utility AI curves + scoring
```

## Flusso di un turno SIS

```
┌────────────────────────────────────────────────────────────────┐
│ POST /api/session/turn/end                                     │
│   (session.js router)                                          │
└────────┬───────────────────────────────────────────────────────┘
         │
         │  1. Reset ap_remaining dell'unita' che ha appena finito
         │  2. Decrement durate status di TUTTE le unita' (sprint-013)
         │  3. next = nextUnitId(session)
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│ runSistemaTurn(session)                                        │
│   (createSistemaTurnRunner factory, DI dependencies)           │
│                                                                │
│   while (actor.ap_remaining > 0) {                             │
│     target = pickLowestHpEnemy(session, actor)                 │
│     policy = selectAiPolicy(actor, target)   ←─ policy.js      │
│                                                                │
│     if (policy.intent === 'retreat'                            │
│         && !canRetreat && distance > range)  {                 │
│       policy = REGOLA_001 approach           (fallback corner) │
│     }                                                          │
│                                                                │
│     switch (policy.intent) {                                   │
│       case 'attack':  performAttack + appendEvent              │
│       case 'approach': stepTowards + appendEvent               │
│       case 'retreat':  stepAway + appendEvent                  │
│       case 'skip':     action skip, break                      │
│     }                                                          │
│     actor.ap_remaining -= 1                                    │
│   }                                                            │
│                                                                │
│   return actions[]                                             │
└────────┬───────────────────────────────────────────────────────┘
         │
         ▼
  iaActions[] → /turn/end response (con state aggiornato)
```

## `services/ai/policy.js`

Funzioni **pure** (nessun side-effect, nessuna dipendenza circolare con
session.js). Sono le "decisioni" dell'IA. Testate in
`tests/ai/policy.test.js`.

### Funzioni esportate

| Funzione                                 | Tipo      | Scopo                                                        |
| ---------------------------------------- | --------- | ------------------------------------------------------------ | --- | --- | --- | -------------------------------------------- |
| `DEFAULT_ATTACK_RANGE`                   | const 2   | Fallback range per unita' senza `attack_range` esplicito     |
| `DEFAULT_MAX_HP_FALLBACK`                | const 10  | Fallback HP massimo se `unit.max_hp` mancante                |
| `LOW_HP_RETREAT_THRESHOLD`               | const 0.3 | Soglia HP ratio per REGOLA_002                               |
| `manhattanDistance(a, b)`                | pure      | `                                                            | dx  | +   | dy  | ` (copia locale per evitare circular import) |
| `stepAway(from, to, gridSize?)`          | pure      | 1 cella away dal target. `null` se cornered                  |
| `selectAiPolicy(actor, target)`          | pure      | Ritorna `{ rule, intent }` — **entry point della decisione** |
| `checkEmotionalOverrides(actor, target)` | pure      | Helper interno per stati emotivi, ritorna override o null    |

### Priorità delle regole in `selectAiPolicy`

```
1. checkEmotionalOverrides(actor, target)
     stunned → { STATO_STUNNED, skip }
     rage    → { STATO_RAGE, attack/approach }
     panic   → { STATO_PANIC, retreat }

2. REGOLA_004_THREAT (AI War pattern, threatAssessment.js)
     passive tier  → { REGOLA_004_THREAT, attack/approach }  ← punisce turtling
     critical tier → { REGOLA_004_THREAT, attack/approach }  ← all-in disperato
     normal/aggressive → noop, cade al livello successivo

3. HP ratio check
     hp/max_hp <= 0.3 → { REGOLA_002, retreat }

4. Range comparison
     actor.range > target.range:
       safe zone       → { REGOLA_003, attack }
       dentro target   → { REGOLA_003, retreat }
       fuori actor     → { REGOLA_003, approach }

5. Default
     in range → { REGOLA_001, attack }
     fuori    → { REGOLA_001, approach }
```

Gli stati emotivi hanno **priorità assoluta** — bypassano threat, HP
check, range check, e kite. Un SIS `rage` con HP 10% attacca comunque.

### Threat Assessment (AI War pattern)

`threatAssessment.js` computa un indice di minaccia composito da
session.events. Iniettato via DI in `declareSistemaIntents()`.

**Escalation tiers:**

| Tier         | Trigger                       | Comportamento SIS                   |
| ------------ | ----------------------------- | ----------------------------------- |
| `passive`    | 3+ turni senza attacco player | Forza ingaggio, ignora HP retreat   |
| `normal`     | Combattimento bilanciato      | Comportamento default               |
| `aggressive` | Danno player elevato          | Comportamento default (tier futuro) |
| `critical`   | SIS perso >60% HP             | All-in disperato, ignora retreat    |

**Config:** `packs/evo_tactics_pack/data/balance/ai_intent_scores.yaml` → sezione `threat`.
Ogni profilo in `ai_profiles.yaml` può sovrascrivere `threat_passivity_threshold`.

### Intent possibili

| Intent     | Semantica                         | Runner action                               |
| ---------- | --------------------------------- | ------------------------------------------- |
| `attack`   | Bersaglio in range, esegui attack | `performAttack + appendEvent`               |
| `approach` | Fuori range, avvicinati           | `stepTowards + move event`                  |
| `retreat`  | Fuggi dal target                  | `stepAway + move event (type=retreat)`      |
| `skip`     | Non agire (stunned)               | Consuma tutti AP, 1 action skip, break loop |

## `services/ai/sistemaTurnRunner.js`

L'**orchestratore** del turno IA. Factory `createSistemaTurnRunner(deps)`
che ritorna `async function runSistemaTurn(session)`. Le dipendenze
sono iniettate perché il runner vive "sotto" il router session.js ma
ha bisogno dei helper di combattimento che vivono "dentro" il
closure `createSessionRouter`.

### Dependencies required

```js
createSistemaTurnRunner({
  pickLowestHpEnemy, // (session, actor) => enemy|null
  manhattanDistance, // (a, b) => number
  stepTowards, // (from, to) => {x,y}
  performAttack, // (session, actor, target) => { result, damageDealt, killOccurred, ... }
  buildAttackEvent, // ({ session, actor, target, ... }) => event
  buildMoveEvent, // ({ session, actor, positionFrom }) => event
  emitKillAndAssists, // async (session, killer, target, event) => void
  appendEvent, // async (session, event) => void (persistEvents)
  gridSize: 6, // dimensione griglia
});
```

Il runner throws un errore a costruzione se mancano
`pickLowestHpEnemy`, `stepTowards`, `performAttack`. Questo è un
sanity check anti-misuse.

### Loop interno

Pseudo-code semplificato (vedi tests `tests/ai/sistemaTurnRunner.test.js`
per copertura completa):

```js
while (actor.ap_remaining > 0) {
  const target = pickLowestHpEnemy(session, actor);
  if (!target) break;

  let policy = selectAiPolicy(actor, target);
  const distance = manhattanDistance(actor.position, target.position);

  // Fallback cornered: se retreat impossibile E cornered flag alzato
  // o stepAway ritorna null → fallback REGOLA_001 attack o approach
  if (policy.intent === 'retreat') {
    /* cornered logic */
  }

  // Skip (stunned) consuma tutti gli AP e termina
  if (policy.intent === 'skip') {
    /* push skip action, break */
  }

  // Attack / approach / retreat branches
  // Overlap guard sui move (SIS non si sovrappone al player)
  // ap_remaining -= 1 ad ogni iterazione
}
return actions;
```

### Flag `corneredThisTurn`

Locale al turno. Una volta che `stepAway` fallisce (SIS al bordo),
il flag diventa `true` e le iterazioni successive **non tentano piu'
REGOLA_002 retreat**. Cosi' evitiamo l'oscillazione retreat ↔ approach
fallback scoperta in sprint-009.

Il flag NON persiste sul session: ogni chiamata a `runSistemaTurn`
riparte con `corneredThisTurn = false`.

## Come aggiungere una nuova REGOLA

Esempio: REGOLA_004 "flank" — se l'actor ha un alleato a distanza ≤ 2
dal target, preferisce attaccare da un lato diverso per massimizzare
il danno (placeholder, non implementato).

1. **Aggiungi la logica in `selectAiPolicy`** (policy.js) come branch
   condizionale prima di REGOLA_001:
   ```js
   if (hasAdjacentAlly(actor, target, session)) {
     return { rule: 'REGOLA_004', intent: 'attack' };
   }
   ```
2. **Il runner non cambia** — gestisce già gli intent `attack/approach/
retreat/skip` a prescindere dalla rule.
3. **Aggiungi test** in `tests/ai/policy.test.js`:
   ```js
   test('selectAiPolicy R004: alleato nearby → flank attack', () => { ... });
   ```

Se la nuova regola richiede dati non presenti su `actor` e `target`
(es. posizioni degli alleati), estendi la signature di `selectAiPolicy`
per accettare un terzo parametro `context`. Evita di accedere a
`session` direttamente dalla policy (rompe la purezza).

## Come aggiungere un nuovo stato emotivo

Esempio: **`focused`** — bonus hit rate +2 al d20.

1. **Aggiungi il nome a `unit.status`** in `normaliseUnit` (session.js):
   già presente come default `focused: 0`.
2. **Estendi `checkEmotionalOverrides`** in policy.js se lo stato
   cambia l'intent (focused non cambia intent, salta questo step).
3. **Integra il bonus nel `performAttack`** (session.js): leggi
   `actor.status.focused > 0` e aggiungi bonus al `result.roll` o
   al `mod`.
4. **Aggiungi il trigger**:
   - Auto: in un evento specifico (es. al ricevere assist, setta
     `unit.status.focused = 2`)
   - Manuale: applicabile da un trait via `trait_effects.yaml`
5. **UI feedback**: aggiungi l'emoji in `STATUS_EMOJI` del frontend
   (Playtest.html), un colore glow `has-status-focused`, e il label
   in `STATUS_LABEL`.
6. **Test**: 2-3 casi in `tests/ai/policy.test.js`.

Il decrement automatico in `/turn/end` funziona per qualunque chiave
di `unit.status`, non serve modificarlo.

## VC Scoring flow

```
Event                         Raw metric                 Aggregate index         Ennea theme
                                                                                      │
action_type='attack'        ┌─ attacks_started ─┐                                     │
  result='hit'              ├─ attack_hits ─────┤                                     │
  target_position_at_attack ├─ close_engage ────┤       ┌─ aggro (0.35·atk + …) ──┐   │
  position_from             └─ adjacency counts ┘       │                          │   │
                            ┌─ damage_dealt ────┐       │                          │   │
action_type='kill'          ├─ first_blood ─────┤ ──►   ├─ risk (0.28·dmg + …) ────┤   ├──► Conquistatore(3)
                            └─ kills (→kp ratio)┘       │                          │   │        aggro>0.65 &&
                            ┌─ damage_taken ────┐       │                          │   │        risk>0.55
attack targeting actor      ├─ damage_taken_r ──┤       ├─ cohesion (…) ───────────┤   │
                            └─ low_hp_time ─────┘       │                          │   │
                            ┌─ evasion_attacks ─┐       ├─ explore (0.45·new_tiles)┤   ├──► Cacciatore(8)
move dopo attack verso      └─ evasion_ratio ───┘       │                          │   │        evasion_ratio>0.6
distanza maggiore                                       └─ mbti (T_F, J_P, …) ─────┘   │        && attacks>=5
                            ┌─ 1vX count ───────┐                                     │        && dmg_ratio<0.4
count alive per team        └─ 1vX ratio ───────┘                                     │        && first_blood>0
                            ┌─ visited_tiles ───┐                                     │
position from/to su move    └─ new_tiles ───────┘                                     │
```

Vedi `apps/backend/services/vcScoring.js` e `data/core/telemetry.yaml`
per i pesi dei singoli indici e le condizioni dei themes.

## Utility AI gradual rollout (ADR-2026-04-17 Q-001 T3.1)

Architettura Utility AI formalizzata in [ADR-2026-04-16](../adr/ADR-2026-04-16-ai-architecture-utility.md), attivazione gradual via feature flag data-driven formalizzata in [ADR-2026-04-17](../adr/ADR-2026-04-17-utility-ai-default-activation.md) (Opzione C).

### Flag per-profile in `ai_profiles.yaml`

Ogni profile AI ha campo opzionale `use_utility_brain: boolean`:

```yaml
profiles:
  aggressive:
    use_utility_brain: true # ADR-2026-04-17 first flip
    overrides: { ... }
  balanced:
    use_utility_brain: false # gradual rollout: attesa metriche VC fairness
    overrides: {}
  cautious:
    use_utility_brain: false # flip dopo validation su aggressive
    overrides: { ... }
```

### Loader + wiring

- `apps/backend/services/ai/aiProfilesLoader.js` — carica YAML al boot (log: `[ai-profiles] caricato …: N profile, utility_brain ON: [aggressive]`)
- `apps/backend/routes/session.js:444` — passa `aiProfiles` a `createDeclareSistemaIntents({ aiProfiles })`
- `apps/backend/services/ai/declareSistemaIntents.js:80-88` — funzione `resolveUseUtilityBrain(actor)`:
  1. Se `aiProfiles.profiles[actor.ai_profile].use_utility_brain === true/false` → ritorna quel valore
  2. Altrimenti → fallback a `useUtilityAi` global (default `false`)
- `declareSistemaIntents.js:186-192` — dispatch: se utility ON → `selectAiPolicyUtility(actor, target, {}, difficultyProfile)`; altrimenti → `selectAiPolicy(actor, target, null, threatCtx)` (legacy REGOLA\_\*)

### Criterio rollout batch successivo

Flip prossimo profile quando:

1. VC fairness metrics invariati su N≥20 partite con `aggressive` Utility AI
2. Nessuna regressione in `tests/ai/*.test.js` (161/161 baseline)
3. Playtest human valida "Sistema si fa sentire" senza "barare"

Ordine profile pianificato: `aggressive → flanking → patrol → support → territorial → balanced → cautious`

(Profile `flanking/patrol/support/territorial` non ancora in YAML — aggiunti on-demand quando encounter richiede.)

### Test

- `tests/ai/utilityBrain.test.js` — unit test utility brain core (curves, scoring, selectAction, enumerateLegalActions)
- `tests/ai/utilityAiProfileWiring.test.js` — smoke test wiring loader → dispatch (8 test):
  - loader carica 3 profile + graceful fallback su file mancante
  - `aggressive` ha `use_utility_brain=true`, `balanced`/`cautious` false
  - dispatch: actor con profile flag → utility; actor con profile false → REGOLA\_\*; fallback global se profile assente
  - `aiProfiles=null` → ignora profile, usa global

## Riferimenti

- **Sprint history**:
  - sprint-006 fase 2: REGOLA_001 + REGOLA_002 retreat, `max_hp` tracking
  - sprint-009 hotfix: `corneredThisTurn` flag, fallback cornered out-of-range
  - sprint-010: estrazione in `services/ai/`, dependency injection pattern
  - sprint-011: metriche `1vX`, `new_tiles` (issue #5 parziale)
  - sprint-012: REGOLA_003 kite opportunistico
  - sprint-013: stati emotivi panic/rage/stunned (issue #10)
  - sprint-015: test suite 45 test (policy + runner)
  - 2026-04-17 Q-001 T3.1: Utility AI gradual rollout wired (loader + aggressive flip)
- **PRs**: #1354 → #1363 sulla branch `main`
- **Backlog residuo**: metriche telemetria che richiedono feature di
  gameplay (heal action, guard system, fog of war, objective system,
  pattern_entropy) — vedi `logs/playtest_design_backlog.md`
