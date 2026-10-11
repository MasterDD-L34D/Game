# SPRINT_003 — Temperamenti MBTI/Ennea + Fairness cap PT

> Documento operativo per Claude Code.
> Leggi tutto prima di scrivere una riga di codice.
> Prerequisiti: SPRINT_001 ✅ + SPRINT_002 ✅ completati.

---

## Contesto

Dopo SPRINT_001 il session engine gira e produce log raw del d20; dopo
SPRINT_002 ogni attacco ha `trait_effects` live, l'IA Sistema applica
REGOLA_001, e il log contiene `actor_species` + `actor_job` per ogni
evento. Due pilastri del GDD restano ancora 🟡 "teorizzati".

**Stato pilastri dopo SPRINT_002:**

| Pilastro                         | Stato                     |
| -------------------------------- | ------------------------- |
| 1 — Tattica leggibile (FFT)      | 🟢 Coperto                |
| 2 — Evoluzione emergente (Spore) | 🟢 Coperto (1 trait vivo) |
| 3 — Identità Specie × Job        | 🟢 Coperto (nel log)      |
| 4 — Temperamenti MBTI/Ennea      | 🟡 Teorizzato             |
| 5 — Co-op vs Sistema             | 🟢 Coperto (REGOLA_001)   |
| 6 — Fairness                     | 🟡 Teorizzato             |

**Questo sprint copre: Pilastri 4 e 6.**

Il sistema VC è già definito in `data/core/telemetry.yaml` (4 assi MBTI,
6 indici aggregati, 5 trigger Ennea). Il cap `cap_pt_max: 1` è
documentato in `data/packs.yaml`. Manca solo l'**implementazione
runtime**: un modulo di scoring, l'enforcement hard del cap, e 3 sessioni
reali di dati demo per validare il tutto.

---

## Obiettivo

Alla fine di questo sprint è possibile:

1. Chiamare `GET /api/session/:id/vc` e ricevere uno snapshot con almeno
   1 asse MBTI numerico e almeno 1 archetipo Ennea `triggered: true`.
2. Tentare di spendere più di `cap_pt_max` (= 1) in una sessione e
   ricevere `400 { error: "cap_pt_max exceeded", ... }` dal secondo
   tentativo in poi.
3. Avere 3 log di sessione reali in `logs/session_seed_*.json` generati
   in modo riproducibile da uno script (`node scripts/seed-sessions.js`).
4. Leggere in `engine/sistema_rules.md` la sezione `FAIRNESS_CAP_001` in
   italiano che spiega la regola del cap.

### Definition of Done

```bash
# 0. test:api non regressivo (baseline SPRINT_002)
ORCHESTRATOR_AUTOCLOSE_MS=2000 node --test tests/api/*.test.js
# → 80/80 pass

# 1. start backend (no ORCHESTRATOR_AUTOCLOSE_MS in live mode!)
PORT=3334 node apps/backend/index.js &
sleep 2

# 2. rigenera i 3 seed (lo script asserisce internamente expect_status)
node scripts/seed-sessions.js
# → [seed] conquistatore -> logs/session_seed_conquistatore.json
# → [seed] fairness_reject -> logs/session_seed_fairness_reject.json
# → [seed] mbti_baseline -> logs/session_seed_mbti_baseline.json

# 3. DoD A — i 3 log esistono
test $(ls logs/session_seed_*.json | wc -l) -ge 3

# 4. DoD B — almeno 1 log contiene eventi kill (FASE 0)
grep -l '"action_type": "kill"' logs/session_seed_*.json

# 5. DoD C — almeno 1 log contiene una spesa cap_pt (FASE 1)
grep -l '"cap_pt": 1' logs/session_seed_*.json

# 6. DoD D — fairness_reject ha visto il 400 (assertion interna allo script)
# (se /action non rispondesse 400 lo script fallirebbe con exit 1 prima di qui)

# 7. DoD E — /vc ritorna almeno T_F numerico + Conquistatore(3) triggered
SID=$(cat logs/session_seed_conquistatore.json | jq -r '.[0].session_id')
curl -s http://127.0.0.1:3334/api/session/$SID/vc \
  | jq '.per_actor.unit_1.mbti_axes.T_F.value != null
        and (.per_actor.unit_1.ennea_archetypes[]
             | select(.id=="Conquistatore(3)") | .triggered) == true'
# → true

# 8. kill backend
kill %1
```

Se qualsiasi assertion (0-7) fallisce, lo sprint **non** è chiuso.

---

## Fasi di lavoro

### FASE 0 — Session log esteso (fondamenta per VC)

**Scopo**: raccogliere i segnali minimi necessari al calcolo VC. Nessun
calcolo qui.

**Nuovi campi su ogni evento esistente** (`attack`, `move`):

- `turn: number` — già tracciato in `session.turn`, va emesso sull'evento.
- `ap_spent: number` — 1 per `attack` e 1 per `move` (convenzione
  SPRINT_003; può diventare formula in futuro).
- `action_index: number` — contatore monotono per-sessione incrementato
  da `appendEvent` via `session.action_counter++`.
- `target_position_at_attack: { x, y }` — **solo** in `buildAttackEvent`,
  snapshot della `target.position` al momento della risoluzione. Questo
  campo è prerequisito di Fase 2 per calcolare `close_engage` in modo
  onesto (mitigazione R2).

**Nuovi tipi di evento**:

```jsonc
// evento `kill` — emesso SUBITO DOPO un attack che porta target.hp === 0.
// Non sostituisce l'evento attack: si appende come evento aggiuntivo.
{
  "ts": "ISO8601",
  "session_id": "uuid",
  "action_type": "kill",
  "actor_id": "unit_1",
  "actor_species": "velox",
  "actor_job": "skirmisher",
  "target_id": "unit_2",
  "turn": 4,
  "action_index": 12,
  "killing_blow": { "die": 18, "roll": 21, "mos": 9, "pt": 2, "damage_dealt": 3 },
  "ia_rule": "REGOLA_001",         // se l'attack proveniva dal Sistema
  "ia_controlled_unit": "unit_2"   // idem
}

// evento `assist` — emesso per ogni attore ≠ killer che ha inflitto
// almeno 1 punto di damage_dealt al target_id del kill nella finestra
// ASSIST_WINDOW_TURNS = 2 turni precedenti. Uno per ciascun assistente.
{
  "ts": "ISO8601",
  "session_id": "uuid",
  "action_type": "assist",
  "actor_id": "unit_3",
  "actor_species": "…",
  "actor_job": "…",
  "target_id": "unit_2",
  "killer_id": "unit_1",
  "turn": 4,
  "action_index": 13,
  "window_turns": 2
}
```

**Estensioni session state (in memoria, non persistite nel log)**:

```js
session.action_counter = 0; // incrementato ad ogni appendEvent
session.damage_taken = {}; // unit_id -> total damage subito (in sessione)
session.cap_pt_used = 0; // Fase 1
session.cap_pt_max = 1; // Fase 1, letto da packs.yaml al boot
```

`session.damage_taken[target.id]` va aggiornato dentro `performAttack`
prima di mutare `target.hp`.

**Nuova funzione**: `emitKillAndAssists(session, attackEvent, killer, target)`.
Chiamata da `performAttack` se `target.hp === 0` post-attack. Scansiona
`session.events` al contrario finché `turn_now - event.turn <= 2`,
raccoglie gli actor_id distinti con `action_type === 'attack'`,
`target_id === target.id`, `result === 'hit'`, `damage_dealt >= 1`,
esclude il killer, e appende un evento `kill` + N eventi `assist`.

**File toccati**:

- `apps/backend/routes/session.js` — ~70-90 righe aggiunte
  (`buildAttackEvent`, `buildMoveEvent`, `appendEvent`, `performAttack`,
  `emitKillAndAssists` nuovo, costante `ASSIST_WINDOW_TURNS = 2`).

**Verifica**:

```bash
# 2-3 attack consecutivi finché unit_2.hp = 0, poi grep
grep '"action_type": "kill"' logs/session_*.json
grep '"turn":' logs/session_*.json | head -5
```

---

### FASE 1 — Fairness cap PT (hard enforcement)

**Scopo**: rifiutare con `400` qualsiasi azione che spenderebbe il
secondo `cap_pt` nella sessione.

**Shape richiesta `POST /action` aggiornata**:

```jsonc
{
  "actor_id": "unit_1",
  "action_type": "attack",
  "target_id": "unit_2",
  "cost": { "cap_pt": 1 }, // opzionale, default 0
}
```

**Flow del route handler**:

1. `requested = Number(body.cost?.cap_pt || 0)`
2. `checkCapPtBudget(session, requested, fairnessConfig)` → se `!ok`:
   ```jsonc
   400 {
     "error": "cap_pt_max exceeded",
     "cap_pt_used": 1,
     "cap_pt_max": 1,
     "requested": 1
   }
   ```
   senza mutare stato né scrivere eventi.
3. Se ok, dopo la risoluzione (attack o move), `consumeCapPt(session, requested)`
   e include `cost: { cap_pt: requested }` nell'evento appeso.

**Nuovo file `apps/backend/services/fairnessCap.js`** (~35 righe):

```js
function loadFairnessConfig(packsYamlPath?) -> { cap_pt_max: number }
function checkCapPtBudget(session, requested, config) -> { ok, used, max }
function consumeCapPt(session, amount) -> void
```

Pattern di caricamento YAML identico a `traitEffects.js::loadActiveTraitRegistry`
(`fs.readFileSync + yaml.load + fallback ENOENT con default 1`).

**File modificati**:

- `apps/backend/routes/session.js` — ~25 righe
- `apps/backend/app.js` — ~3 righe di wiring per passare
  `fairnessConfig` a `createSessionRouter`

**Nuova sezione in `engine/sistema_rules.md`**: `FAIRNESS_CAP_001`
(**non** una nuova `REGOLA_`, per non confondere con l'IA):

> **FAIRNESS_CAP_001** — In una singola sessione non può essere speso
> più di `cap_pt_max` cap_pt complessivi. Valore letto da
> `data/packs.yaml:pi_shop.caps.cap_pt_max`. Default 1. Enforcement in
> `apps/backend/routes/session.js` + `apps/backend/services/fairnessCap.js`.
> Il tentativo di superare il cap ritorna `400 { error: "cap_pt_max exceeded", ... }`
> senza mutare stato.

---

### FASE 2 — Modulo `vcScoring.js`

**Scopo**: un modulo **puro** che prende gli eventi di una sessione e
ritorna raw metrics + indici aggregati + MBTI + Ennea triggers. Nessun
side-effect; legge solo `data/core/telemetry.yaml` una tantum al boot.

**Nuovo file `apps/backend/services/vcScoring.js`** (~200 righe).

**API**:

```js
loadTelemetryConfig(yamlPath?) -> { indices, mbti_axes, ennea_themes, normalization }
computeRawMetrics(events, units) -> Record<actorId, RawMetrics>
computeAggregateIndices(raw, config) -> Record<string, { value, coverage } | null>
computeMbtiAxes(raw, aggregate, config) -> Record<"E_I"|"S_N"|"T_F"|"J_P", { value, coverage } | null>
computeEnneaArchetypes(aggregate, config) -> Array<{ id, triggered, condition, reason? }>
buildVcSnapshot(session, config) -> VcSnapshot
```

**Raw metrics derivabili dai log post-Fase 0** (non `null`):

- `attacks_started` — `count(events where action_type==attack)` per attore
- `attack_hit_rate` — `hits / attacks`
- `close_engage` — frazione di attacchi con `manhattan(pos_attacker, target_position_at_attack) <= 1`
- `first_blood` — `1` se l'attore è autore del primo `kill`, `0` altrimenti
- `kill_pressure` — `kills / max(1, turns_played)`
- `damage_taken_ratio` — `damage_taken_by_actor / total_damage_in_session`
- `damage_dealt_total` — `sum(event.damage_dealt)`
- `low_hp_time` — `count(events where hp_after < 0.3 * hp_initial) / total_events_of_actor`
- `assists` — `count(events where action_type==assist && actor_id==X)`
- `support_bias` — `(assists_norm + moves_ratio) / 2`
- `setup_ratio` — `count(move_before_attack) / attacks`
- `total_actions` — `count(events where action_type in [attack,move])`
- `cap_pt_used` — da `session.cap_pt_used` direttamente

**Raw metrics NON derivabili dai log attuali** (→ `null` onesto, niente
zero inventati):

`pattern_entropy`, `cover_discipline`, `pattern_break`, `formation_time`,
`1vX`, `self_heal`, `overcap_guard`.

**Indici aggregati**:

| Indice                                 | Coverage    | Motivo                                                                                                                                                                 |
| -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aggro`                                | **full**    | Tutti e 4 i componenti computabili (`attacks_started`, `first_blood`, `close_engage`, `kill_pressure`)                                                                 |
| `risk`                                 | **partial** | `1vX`, `self_heal`, `overcap_guard` → `null`. I pesi vengono **ridistribuiti** sui componenti rimanenti (`damage_taken_ratio`, `low_hp_time`) rinormalizzati a somma 1 |
| `cohesion`, `setup`, `explore`, `tilt` | **`null`**  | Dominati da variabili non derivabili. Ritornano `null` nel payload                                                                                                     |

Ogni indice calcolato dichiara la propria `coverage: "full" | "partial"`
nel payload, così il consumer sa cosa sta leggendo. Gli indici `null`
sono elencati in `meta.coverage.null` del payload.

**MBTI axes**:

| Asse  | Formula base (telemetry.yaml)                                        | Coverage in SPRINT_003                                                   |
| ----- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `E_I` | `1 - 0.6*cohesion - 0.2*assists - 0.2*formation_time`                | **null** (dipende da `cohesion`)                                         |
| `S_N` | `1 - 0.4*pattern_entropy - 0.3*cover_discipline + 0.3*pattern_break` | **null** (tutto non derivabile)                                          |
| `T_F` | `1 - 0.5*utility_actions + 0.5*support_bias`                         | **full** (utility_actions proxy = `setup_ratio`, support_bias calcolato) |
| `J_P` | `1 - 0.6*setup - 0.2*time_to_commit + 0.2*last_second`               | **partial** (setup parziale; `last_second` null → pesi rinormalizzati)   |

**Risultato garantito**: `T_F` e `J_P` numerici in ogni sessione, `E_I`
e `S_N` sempre `null`. Soddisfa la DoD "almeno 1 asse MBTI numerico".

**Ennea archetypes**:

Parsing delle `when` condition di `telemetry.yaml:ennea_themes` tramite
un **mini-parser whitelisted** (~40 righe). Tokens ammessi:

- identifier (`[a-z_]+`)
- comparatori `>`, `<`, `>=`, `<=`
- numeri float
- `&&`, `||`
- spazi

**Nessun `eval` o `new Function()`**. Se un identifier referenzia una
variabile `null` → `{ triggered: false, reason: "missing:<var>" }`. Se
il parser lancia → `{ triggered: false, reason: "parse_error" }`.

| Archetipo          | Condizione                    | Valutabile?         |
| ------------------ | ----------------------------- | ------------------- |
| `Conquistatore(3)` | `aggro > 0.65 && risk > 0.55` | ✅                  |
| `Coordinatore(2)`  | `cohesion > 0.70`             | ❌ missing:cohesion |
| `Esploratore(7)`   | `explore > 0.70`              | ❌ missing:explore  |
| `Architetto(5)`    | `setup > 0.70`                | ❌ missing:setup    |
| `Stoico(9)`        | `tilt > 0.65`                 | ❌ missing:tilt     |

Di 5 archetipi, **solo `Conquistatore(3)`** è valutabile. Lo scenario
`conquistatore` della Fase 4 deve triggerarlo.

**Shape del VC snapshot** (per attore):

```jsonc
{
  "session_id": "uuid",
  "per_actor": {
    "unit_1": {
      "raw_metrics": { "attacks_started": 5, "attack_hit_rate": 0.8, "...": "..." },
      "aggregate_indices": {
        "aggro": { "value": 0.71, "coverage": "full" },
        "risk": {
          "value": 0.33,
          "coverage": "partial",
          "missing": ["1vX", "self_heal", "overcap_guard"],
        },
        "cohesion": null,
        "setup": null,
        "explore": null,
        "tilt": null,
      },
      "mbti_axes": {
        "E_I": null,
        "S_N": null,
        "T_F": { "value": 0.62, "coverage": "full" },
        "J_P": { "value": 0.48, "coverage": "partial" },
      },
      "ennea_archetypes": [
        { "id": "Conquistatore(3)", "triggered": true, "condition": "aggro>0.65 && risk>0.55" },
        { "id": "Coordinatore(2)", "triggered": false, "reason": "missing:cohesion" },
        { "id": "Esploratore(7)", "triggered": false, "reason": "missing:explore" },
        { "id": "Architetto(5)", "triggered": false, "reason": "missing:setup" },
        { "id": "Stoico(9)", "triggered": false, "reason": "missing:tilt" },
      ],
    },
  },
  "meta": {
    "events_count": 17,
    "turns_played": 6,
    "cap_pt_used": 1,
    "cap_pt_max": 1,
    "coverage": {
      "full": ["aggro", "T_F"],
      "partial": ["risk", "J_P"],
      "null": ["cohesion", "setup", "explore", "tilt", "E_I", "S_N"],
    },
    "generated_at": "ISO8601",
    "scoring_version": "0.1.0",
  },
}
```

---

### FASE 3 — `GET /api/session/:id/vc`

Thin wrapper di ~15 righe sopra `buildVcSnapshot`. Nessuna mutazione
di stato.

```js
router.get('/:id/vc', (req, res, next) => {
  try {
    const { error, session } = resolveSession(req.params.id);
    if (error) return res.status(error.status).json(error.body);
    res.json(buildVcSnapshot(session, telemetryConfig));
  } catch (err) {
    next(err);
  }
});
```

**Attenzione routing conflict**: `/:id/vc` va registrato **dopo** tutte
le route statiche (`/start`, `/state`, `/action`, `/turn/end`, `/end`)
per evitare che `resolveSession('state')` intercetti la richiesta.

`telemetryConfig` caricato una tantum dentro `createSessionRouter`
(pattern identico a `traitRegistry` di SPRINT_002).

---

### FASE 4 — Seed script deterministico + DoD

**Nuovo file `scripts/seed-sessions.js`** (~90 righe, **deroga guardrail**
esplicita — è il delivery della Fase 4).

**3 scenari hardcoded** nell'array `SCENARIOS`:

| #   | Nome              | Cosa valida                                              | Script azioni                                                                                             |
| --- | ----------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | `conquistatore`   | `Conquistatore(3)` triggered, `T_F` numerico             | 2 unit aggressive, ~10-15 attack consecutivi per saturare `aggro` e portare unit_2 a 0 hp (emette `kill`) |
| 2   | `fairness_reject` | il 2° `POST /action` con `cost.cap_pt:1` ritorna **400** | 2 attacchi entrambi con `cost: { cap_pt: 1 }`, 2° con `expect_status: 400`                                |
| 3   | `mbti_baseline`   | `T_F` e `J_P` entrambi numerici                          | mix bilanciato attack/move per produrre `setup_ratio` e `support_bias` realistici                         |

**Flow per scenario**:

1. `POST /api/session/start` con `body.units` custom
2. Ciclo `POST /api/session/action` con `expect_status` opzionale
3. `GET /api/session/:id/vc` (solo smoke, lo script non asserisce il contenuto qui — le assertion sono nella DoD esterna)
4. `POST /api/session/end`
5. `fs.rename` del log generato in `logs/session_seed_<name>.json`

**Determinismo**: approccio "**asserzioni su soglie, non valori esatti**".
Nessuna modifica a `session.rng`. Le sequenze di azioni sono abbastanza
lunghe da convergere statisticamente verso gli esiti desiderati
(es. 10+ attack saturano `aggro` indipendentemente dal die singolo).

**Fallback** se il seed risulta flaky (>10% run falliti): aggiungere un
opt-in `rng_seed` nel body `/start` che sostituisce `session.rng` con
una PRNG deterministica xorshift32 (~15 righe in `session.js`). Non è
prerequisito — si attiva solo se il determinismo pseudocasuale si
dimostra insufficiente.

---

## Guardrail — cosa NON toccare

```
❌ .github/workflows/      — nessuna modifica CI
❌ analytics/              — zero analytics senza almeno 3 session log reali (e quelli arrivano solo con Fase 4)
❌ ops/ / migrations/      — nessuna infra
❌ services/generation/    — non toccare il generatore specie
❌ packages/contracts/     — non aggiornare gli schemi condivisi
❌ public/hud/             — non toccare l'overlay HUD
❌ prisma/                 — nessuna migrazione DB
❌ Sistema VC EMA (running average) — NON implementare; solo snapshot on-demand
```

**Nessuna nuova dipendenza npm o pip.** `js-yaml` è già dep del backend
(usato da `traitEffects.js`).

**Max ~50 righe fuori da `apps/backend/`** con una **deroga esplicita**:
`scripts/seed-sessions.js` (~90 righe) è fuori da `apps/backend/` ma è
il delivery stesso della Fase 4 (analogo a `tests/helpers/snapshotFixture.js`
in SPRINT_002). La deroga va documentata nel commit message della Fase 4
e **consuma l'intero budget di deroga dello sprint** — nessun altro file
fuori dal backend.

**Se devi aggiungere più di 2 raw metrics nuove oltre quelle elencate in
Fase 2, stai sovra-ingegnerizzando.** Ferma e segnala.

---

## Pattern da evitare

- `"Calcolo tutti gli indici anche quelli null, zero invece di null"` → no,
  `null` è onestà. Il payload dichiara esplicitamente cosa è full/partial/null.
- `"Aggiungo EMA running average al VC ora che ci sono"` → no, solo snapshot
  on-demand. L'EMA richiede schema persistence che è fuori scope.
- `"Parso telemetry.yaml con eval() così è veloce"` → no, parser whitelisted.
  Il YAML è untrusted.
- `"Il seed script usa Math.random senza pensarci"` → ok, ma asserzioni su
  soglie. Se flaky, introduce xorshift32 opt-in — non cambiare il default
  di `session.rng`.
- `"Aggiungo damage, guard, reaction nel session engine mentre ci sono"` → no,
  solo `kill` e `assist`. Gli altri eventi sono fuori scope.
- `"Calcolo MBTI su tutti e 4 gli assi anche se 2 sono null"` → no, `E_I`
  e `S_N` restano `null` finché non esistono le variabili. Onestà > completezza.
- `"Implemento tutti i 9 Ennea archetipo"` → no, solo i 5 in `telemetry.yaml`,
  e solo 1 è triggerabile dai dati attuali (`Conquistatore(3)`).

---

## Segnali che stai andando nella direzione giusta

✅ Stai modificando file in `apps/backend/routes/`, `apps/backend/services/`,
`engine/`, + il nuovo `scripts/seed-sessions.js`.
✅ `engine/sistema_rules.md` contiene una sezione **Fairness** con
`FAIRNESS_CAP_001` in italiano.
✅ `curl GET /api/session/<id>/vc` ritorna un payload con `meta.coverage`
che dichiara cosa è `full`/`partial`/`null`.
✅ Il 2° `POST /action` con `cost.cap_pt: 1` nella stessa sessione ritorna
`400 { error: "cap_pt_max exceeded", ... }`.
✅ `ls logs/session_seed_*.json | wc -l >= 3` dopo `node scripts/seed-sessions.js`.
✅ `node --test tests/api/*.test.js` → **80/80 pass** (zero regressioni).
✅ Il tuo commit message inizia con `feat(session):` e nomina esplicitamente
la fase (es. `feat(session): fairness cap_pt hard enforcement (sprint-003 fase 1)`).

---

## Ordine dipendenze tra le fasi

```
FASE 0 (log extension)
   │
   ├── FASE 1 (cap_pt)   ← parallelizzabile ma body /action cambia una volta
   │       │
   ▼       ▼
FASE 2 (vcScoring.js)    ← consuma log Fase 0 + state Fase 1
   │
   ▼
FASE 3 (GET /:id/vc)     ← thin wrapper su Fase 2
   │
   ▼
FASE 4 (seed + DoD)      ← esercita 0,1,2,3 insieme
```

**Commit plan suggerito** (1 PR finale, 5 commit progressivi):

1. `docs: SPRINT_003.md operativo (sprint-003)`
2. `feat(session): session log esteso con kill/assist e turn/action_index (sprint-003 fase 0)`
3. `feat(session): fairness cap_pt hard enforcement (sprint-003 fase 1)`
4. `feat(session): vcScoring module + GET /:id/vc (sprint-003 fasi 2+3)`
5. `feat(session): seed script deterministico + DoD end-to-end (sprint-003 fase 4)`

Un'unica PR `SPRINT_003 — Temperamenti MBTI/Ennea + Fairness cap PT` al
termine. Come SPRINT_001 e SPRINT_002.

---

## Issue collegate

Nessuna issue esistente copre queste feature — sono nuove.
Apri una issue per ognuna **solo dopo** che la fase è completata, come
documentazione. Non aprire issue preventive.

---

## Riferimenti

- **telemetry VC**: `data/core/telemetry.yaml` (pesi `indices`, formule
  `mbti_axes`, trigger `ennea_themes`, `normalization_params`)
- **cap PT**: `data/packs.yaml` (`pi_shop.caps.cap_pt_max`)
- **Ennea dataset**: `data/external/psychometrics/enneagramma/enneagramma_dataset.json`
  (9 tipi completi, solo reference)
- **Ennea themes doc**: `docs/evo-tactics-pack/ennea-themes.md`
- **Regole Sistema**: `engine/sistema_rules.md` (add `FAIRNESS_CAP_001`)
- **Pattern loader YAML**: `apps/backend/services/traitEffects.js::loadActiveTraitRegistry`
- **Session engine**: `apps/backend/routes/session.js` (post-SPRINT_002)
- **Sprint precedenti**: `SPRINT_001.md`, `SPRINT_002.md` (pattern doc + guardrail)
- **Session log di riferimento post-SPRINT_002**: qualunque `logs/session_*.json`
  generato in local con `POST /api/session/start` + `POST /api/session/action`
