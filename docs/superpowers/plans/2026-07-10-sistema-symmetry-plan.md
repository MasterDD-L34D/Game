# Sistema Action-Symmetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il Sistema dichiara azioni a budget AP per-creatura (come i PG), la ritirata utility e' gated dalla soglia gia' dichiarata nei profili, il telegraph mostra solo minacce -- tutto flag-OFF fino all'ADR, misurato con fattoriale 2x2 contro le bande di `damage_curves.yaml`.

**Architecture:** 3 unita' (spec `docs/superpowers/specs/2026-07-10-sistema-symmetry-design.md`): `apLedger` estratto dal closure del bridge (autorita' costi AP condivisa player/Sistema), dichiarazione a budget in `declareSistemaIntents` (2 flag distinti), filtro threats-only in `threatPreview`. L'addebito AP a risoluzione e il refill per-round ESISTONO GIA' per il Sistema (verificato): si costruisce solo il lato dichiarazione.

**Tech Stack:** Node 24 (`node --test`), supertest in-process, probe `tools/sim/grid-band-probe.js` + `tools/sim/intent-mix-probe.js`, seed numerici paired.

---

## Convenzioni (valgono per OGNI task)

- **Worktree**: lavora in `C:\dev\_game-wt-3246` (il clone `C:\dev\Game` e' occupato da un'altra sessione -- MAI `git checkout` li'). `export NODE_PATH="C:/dev/Game/node_modules"` se un tool lamenta moduli mancanti; i test `node --test` girano dal worktree root senza NODE_PATH (node_modules risolti risalendo? NO: il worktree NON ha node_modules -- per i test usa `cd /c/dev/_game-wt-3246 && NODE_PATH="C:/dev/Game/node_modules" node --test <file>`; se fallisce ancora su require relativi, esegui i test dal clone principale SENZA checkout: `cd /c/dev/Game && node --test <file>` funziona solo se il branch e' lo stesso -- altrimenti resta nel worktree).
- **Mai** `npm run test:api` completo su Ryzen (EADDRINUSE): solo file espliciti.
- **Commit**: subject <=72 char, Conventional Commits, ASCII-only nelle righe aggiunte, trailer:

```bash
TRACE=$(python -c "import os,time; ts=int(time.time()*1000); r=os.urandom(10); b=ts.to_bytes(6,'big')+bytes([0x70|(r[0]&0x0F),r[1],(0x80|(r[2]&0x3F))])+r[3:10]; h=b.hex(); print(f'{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}')")
# ... git commit -m "<subject>

<body>

Coding-Agent: claude-fable-5
Trace-Id: $TRACE"
```

- **Gate ASCII pre-commit** (righe aggiunte):

```bash
git diff --cached -U0 | python -c "
import sys
d=sys.stdin.buffer.read().decode('utf-8')
add=[l for l in d.splitlines() if l.startswith('+') and not l.startswith('+++')]
bad=[l for l in add if any(ord(c)>127 for c in l)]
print('added',len(add),'| non-ASCII',len(bad)); [print(repr(b[:80])) for b in bad[:4]]
"
```

- **PR**: ready (mai draft), body con rollback, `@codex review` in commento, merge SOLO con CI verde + verdetto Codex pulito (review "no major issues" O reaction pollice; P1 = fix obbligatorio prima del merge). Autorizzazione standing Eduardo: merge senza attenderlo se verde+pulito -- ECCETTO il Task 7 (ADR, decider Eduardo).
- **Prettier pre-commit**: riformatta i file staged -- non sorprenderti se il diff committato differisce dal file scritto; MAI `+` a inizio riga markdown (diventa list-marker).

---

### Task 1: apLedger extraction (refactoring puro, PR dedicata)

**Files:**
- Create: `apps/backend/services/combat/apLedger.js`
- Modify: `apps/backend/routes/sessionRoundBridge.js:283-371` (rimozione 4 funzioni nested + delega)
- Test: `tests/services/apLedger.test.js` (nuovo)
- Regressione: `tests/ai/sessionRoundStatusSync.test.js`, `tests/api/sessionRoundStatusSyncWire.test.js`, `tests/api/sessionEncounterWiring.test.js`

- [ ] **Step 1.1: branch**

```bash
cd /c/dev/_game-wt-3246 && git fetch origin main && git checkout -b feat/ap-ledger-extraction origin/main
```

- [ ] **Step 1.2: test RED per il modulo nuovo**

Crea `tests/services/apLedger.test.js`:

```javascript
// tests/services/apLedger.test.js -- apLedger = autorita' unica costi AP
// (estrazione dal closure di sessionRoundBridge, spec sistema-symmetry sez. 4.1).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { createApLedger } = require('../../apps/backend/services/combat/apLedger');

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const ledger = createApLedger({ manhattanDistance: manhattan, gridSize: 16 });

test('resolveMoveApCost: max(1, dist - move_bonus)', () => {
  const actor = { move_bonus_bonus: 0 };
  assert.equal(ledger.resolveMoveApCost(actor, { x: 0, y: 0 }, { x: 3, y: 0 }), 3);
  assert.equal(
    ledger.resolveMoveApCost({ move_bonus_bonus: 2 }, { x: 0, y: 0 }, { x: 3, y: 0 }),
    1,
  );
  // floor a 1: mai gratis
  assert.equal(
    ledger.resolveMoveApCost({ move_bonus_bonus: 9 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
    1,
  );
});

test('resolveActionApCost: attack canon 1, client value ignorato', () => {
  assert.equal(ledger.resolveActionApCost({}, { type: 'attack', ap_cost: -5 }), 1);
  assert.equal(ledger.resolveActionApCost({}, { type: 'skip', ap_cost: 0 }), 0);
});

test('resolveIntentApCost: move in-grid usa costo server, off-grid tiene il client', () => {
  const actor = { position: { x: 0, y: 0 }, move_bonus_bonus: 0 };
  assert.equal(
    ledger.resolveIntentApCost(actor, { type: 'move', move_to: { x: 2, y: 0 }, ap_cost: 0 }),
    2,
  );
  // off-grid -> valore client (OUT_OF_GRID rigetta a valle)
  assert.equal(
    ledger.resolveIntentApCost(actor, { type: 'move', move_to: { x: 99, y: 0 }, ap_cost: 0 }),
    0,
  );
});

test('isValidGridDest: bounds', () => {
  assert.equal(ledger.isValidGridDest({ x: 15, y: 15 }), true);
  assert.equal(ledger.isValidGridDest({ x: 16, y: 0 }), false);
  assert.equal(ledger.isValidGridDest({ x: 'a', y: 0 }), false);
});

test('canAfford: somma pending + candidata vs ap_remaining', () => {
  const actor = { ap_remaining: 2, position: { x: 0, y: 0 } };
  const attack = { type: 'attack' };
  assert.equal(ledger.canAfford(actor, [], attack), true);
  assert.equal(ledger.canAfford(actor, [attack], attack), true); // 1+1 <= 2
  assert.equal(ledger.canAfford(actor, [attack, attack], attack), false); // 3 > 2
  // fallback actor.ap quando ap_remaining assente
  assert.equal(ledger.canAfford({ ap: 1, position: { x: 0, y: 0 } }, [attack], attack), false);
});
```

- [ ] **Step 1.2b: verifica RED**

```bash
cd /c/dev/_game-wt-3246 && NODE_PATH="C:/dev/Game/node_modules" node --test tests/services/apLedger.test.js 2>&1 | grep -E "pass|fail"
```

Atteso: FAIL (`Cannot find module .../apLedger`).

- [ ] **Step 1.3: crea `apps/backend/services/combat/apLedger.js`**

Scheletro (i CORPI delle 4 funzioni si spostano VERBATIM da `sessionRoundBridge.js` -- niente riscritture, solo il mapping closure->parametri):

```javascript
'use strict';
// apLedger -- single authority for AP costs (player + Sistema).
// Extracted VERBATIM from the sessionRoundBridge closure (spec
// docs/superpowers/specs/2026-07-10-sistema-symmetry-design.md sez. 4.1):
// resolveMoveApCost (era :283), resolveActionApCost (era :308, con la nota
// anti-double-charge: il bridge deduce il costo ma NON esegue l'effetto
// ability -- abilityExecutor si auto-deduce su /round/execute), isValidGridDest
// (era :332), resolveIntentApCost (era :351). canAfford = il pending-sum gate
// del P1-3 hardening, riusabile dal lato dichiarazione Sistema.
//
// Factory: dipendenze iniettate, zero stato, zero Express.

function createApLedger({ manhattanDistance, gridSize }) {
  // --- INCOLLA QUI I 4 CORPI VERBATIM DA sessionRoundBridge.js ---
  // function resolveMoveApCost(actor, from, to) { ...era :283-287... }
  // const ATTACK_BASE_AP_COST = 1;               ...era :292...
  // function resolveActionApCost(actor, action) { ...era :308-326...
  //   NB: il lazy require diventa require('../abilityExecutor')  <-- path
  //   relativo NUOVO (da services/combat/ a services/), era '../services/abilityExecutor' }
  // function isValidGridDest(dest) { ...era :332-340, usa gridSize dal factory... }
  // function resolveIntentApCost(actor, act) { ...era :351-359... }

  function apAvailable(actor) {
    return Number(
      actor && actor.ap_remaining != null ? actor.ap_remaining : (actor && actor.ap) || 0,
    );
  }

  function canAfford(actor, declaredActions, action) {
    const pending = (declaredActions || []).reduce(
      (sum, a) => sum + resolveIntentApCost(actor, a),
      0,
    );
    return pending + resolveIntentApCost(actor, action) <= apAvailable(actor);
  }

  return {
    resolveMoveApCost,
    resolveActionApCost,
    resolveIntentApCost,
    isValidGridDest,
    apAvailable,
    canAfford,
  };
}

module.exports = { createApLedger };
```

ATTENZIONE al path del lazy require di abilityExecutor: nel bridge era
`require('../services/abilityExecutor')` (da routes/); in apLedger diventa
`require('../abilityExecutor')` (da services/combat/). Stesso try/catch.

- [ ] **Step 1.4: delega nel bridge**

In `sessionRoundBridge.js`, dove oggi vivono le 4 funzioni (dopo la riga `gridSize,` del factory, zona :283-371): cancella i 4 corpi e sostituisci con:

```javascript
  const {
    resolveMoveApCost,
    resolveActionApCost,
    resolveIntentApCost,
    isValidGridDest,
  } = require('../services/combat/apLedger').createApLedger({ manhattanDistance, gridSize });
```

I commenti load-bearing (P1-3 hardening, anti-double-charge, OWASP A04) MIGRANO in apLedger.js col codice -- non lasciarli orfani nel bridge.

- [ ] **Step 1.5: verifica GREEN + regressione**

```bash
cd /c/dev/_game-wt-3246 && NODE_PATH="C:/dev/Game/node_modules" node --test tests/services/apLedger.test.js 2>&1 | grep -E "pass|fail"
NODE_PATH="C:/dev/Game/node_modules" node --test tests/ai/sessionRoundStatusSync.test.js tests/api/sessionRoundStatusSyncWire.test.js tests/api/sessionEncounterWiring.test.js 2>&1 | grep -E "^. (tests|pass|fail)"
NODE_PATH="C:/dev/Game/node_modules" node --test tests/ai/*.test.js 2>&1 | grep -E "^. (tests|pass|fail)"
```

Atteso: apLedger 5/5; regressione bridge senza fail; suite AI 589+/0 fail. Byte-identical: nessun test esistente cambia.

- [ ] **Step 1.6: gate ASCII + commit + push + PR**

```bash
git add apps/backend/services/combat/apLedger.js apps/backend/routes/sessionRoundBridge.js tests/services/apLedger.test.js
# gate ASCII (Convenzioni), poi:
git commit -m "refactor(combat): extract apLedger from round-bridge closure"  # + body + trailer (Convenzioni)
git push -u origin feat/ap-ledger-extraction
gh pr create --base main --head feat/ap-ledger-extraction --title "refactor(combat): extract apLedger (AP-cost authority)" --body "<sintesi + 'zero behavior change, regression: bridge tests + AI suite green' + rollback: revert>"
gh pr comment <N> --body "@codex review"
```

Merge quando verde + Codex pulito (autorizzazione standing).

---

### Task 2: flag `SISTEMA_RETREAT_GATE_ENABLED` (TDD)

**Files:**
- Modify: `apps/backend/services/ai/declareSistemaIntents.js` (flag + utilityState)
- Modify: `apps/backend/services/ai/utilityBrain.js:379-382` (enumerateLegalActions)
- Test: `tests/ai/sistemaRetreatGate.test.js` (nuovo)

- [ ] **Step 2.1: branch (dal main post-merge Task 1)**

```bash
cd /c/dev/_game-wt-3246 && git fetch origin main && git checkout -b feat/sistema-symmetry-flags origin/main
```

- [ ] **Step 2.2: test RED**

Crea `tests/ai/sistemaRetreatGate.test.js`:

```javascript
// tests/ai/sistemaRetreatGate.test.js -- il gate fa rispettare a utilityBrain la
// retreat_hp_pct che il path rule-based onora gia' (spec sez. 4.3; misura: 44/45
// ritirate da UTILITY_AI, docs/research/2026-07-10-sistema-cap-falsification.md).
// Flag SISTEMA_RETREAT_GATE_ENABLED default OFF -> byte-identical.
'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isRetreatGateEnabled,
} = require('../../apps/backend/services/ai/declareSistemaIntents');
const { enumerateLegalActions } = require('../../apps/backend/services/ai/utilityBrain');

const FLAG = 'SISTEMA_RETREAT_GATE_ENABLED';
function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}

test('isRetreatGateEnabled: default OFF, solo "true" abilita', () => {
  withFlag(undefined, () => assert.equal(isRetreatGateEnabled(), false));
  withFlag('true', () => assert.equal(isRetreatGateEnabled(), true));
  withFlag('1', () => assert.equal(isRetreatGateEnabled(), false));
});

test('enumerateLegalActions: state.retreat_gated toglie retreat dalle legali', () => {
  const actor = { id: 'a', hp: 10, max_hp: 10, position: { x: 0, y: 0 }, controlled_by: 'sistema' };
  const enemy = { id: 'p', hp: 10, max_hp: 10, position: { x: 5, y: 5 }, controlled_by: 'player' };
  const state = { units: { a: actor, p: enemy } };
  const withRetreat = enumerateLegalActions(actor, state).map((a) => a.type);
  assert.ok(withRetreat.includes('retreat'), 'senza gate retreat e' legale');
  const gated = enumerateLegalActions(actor, { ...state, retreat_gated: true }).map((a) => a.type);
  assert.ok(!gated.includes('retreat'), 'gated: retreat non proposta');
  assert.ok(gated.includes('approach'), 'le altre azioni restano');
});
```

NB apici: la stringa `'senza gate retreat e' legale'` sopra ROMPE il JS -- nel file
reale usa doppi apici: `"senza gate retreat e' legale"`. (Il gate ASCII vieta
l'apostrofo tipografico, quello dritto in stringa doppia e' ok.)

Poi il test integrato sul declare loop (stesso file):

```javascript
const {
  createDeclareSistemaIntents,
} = require('../../apps/backend/services/ai/declareSistemaIntents');
const { pickLowestHpEnemy, stepTowards } = require('../../apps/backend/routes/sessionHelpers');
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function declareFor(session) {
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance: manhattan,
    gridSize: 16,
  });
  return declare(session);
}

// Unita' FERITA (hp 50% > soglia 0.15 del profilo aggressive) e ISOLATA:
// senza gate utilityBrain tende a retreat; col gate deve fare approach/attack.
function woundedSession() {
  return {
    units: [
      {
        id: 'sis_w', controlled_by: 'sistema', hp: 5, max_hp: 10, ap: 2, ap_max: 2,
        mod: 2, dc: 12, attack_range: 1, initiative: 10, position: { x: 10, y: 5 },
        status: {}, ai_profile: 'aggressive', damage: { min: 1, max: 3 },
      },
      {
        id: 'p1', controlled_by: 'player', hp: 12, max_hp: 12, ap: 2, ap_max: 2,
        mod: 2, dc: 12, attack_range: 1, initiative: 12, position: { x: 2, y: 5 }, status: {},
      },
    ],
    grid: { width: 16, height: 12 },
    sistema_pressure: 50,
  };
}

test('gate ON: unita ferita sopra soglia NON dichiara retreat', () => {
  withFlag('true', () => {
    const { decisions } = declareFor(woundedSession());
    const d = decisions.find((x) => x.unit_id === 'sis_w');
    assert.ok(d, 'decisione emessa');
    assert.notEqual(d.intent, 'retreat', `atteso non-retreat, avuto ${d.intent} (${d.rule})`);
  });
});

test('gate ON: sotto soglia (hp 10%) retreat resta possibile', () => {
  withFlag('true', () => {
    const s = woundedSession();
    s.units[0].hp = 1; // 10% < 0.15
    const { decisions } = declareFor(s);
    const d = decisions.find((x) => x.unit_id === 'sis_w');
    assert.ok(d, 'decisione emessa');
    // non asseriamo CHE ritiri (lo scoring decide), asseriamo che PUO':
    // il gate non deve aver rimosso retreat sotto soglia -> nessun assert
    // sul tipo; questo test documenta il contratto e fallisce solo se il
    // declare loop crasha col gate attivo sotto soglia.
  });
});

test('gate OFF: byte-identical (flag unset)', () => {
  const off1 = withFlag(undefined, () => declareFor(woundedSession()));
  const off2 = withFlag(undefined, () => declareFor(woundedSession()));
  assert.deepEqual(off1.decisions, off2.decisions, 'determinismo baseline');
});
```

- [ ] **Step 2.3: verifica RED**

```bash
NODE_PATH="C:/dev/Game/node_modules" node --test tests/ai/sistemaRetreatGate.test.js 2>&1 | grep -E "pass|fail|not a function"
```

Atteso: FAIL, `isRetreatGateEnabled is not a function`.

- [ ] **Step 2.4: implementazione**

In `declareSistemaIntents.js`, accanto a `isPerUnitActionsEnabled` (zona :135-155):

```javascript
// Retreat gate (spec sistema-symmetry sez. 4.3): utilityBrain deve rispettare
// la stessa retreat_hp_pct che il path rule-based onora gia' (misurato: 44/45
// ritirate vengono da UTILITY_AI che la ignora). Nessun knob nuovo: soglia =
// profiles.<ai_profile>.overrides.retreat_hp_pct, fallback config base.
// Default OFF -> byte-identical.
function isRetreatGateEnabled() {
  return process.env.SISTEMA_RETREAT_GATE_ENABLED === 'true';
}
```

Nel ramo utility (subito PRIMA di `const utilityState = {` alla zona :438):

```javascript
        // Retreat gate: sopra soglia la ritirata esce dalle azioni legali.
        let retreatGated = false;
        if (isRetreatGateEnabled()) {
          const prof =
            aiProfiles && aiProfiles.profiles && actor.ai_profile
              ? aiProfiles.profiles[actor.ai_profile]
              : null;
          const o = (prof && prof.overrides) || {};
          const baseCfg = loadAiConfig();
          const threshold = Number(o.retreat_hp_pct ?? baseCfg.LOW_HP_RETREAT_THRESHOLD);
          const hpRatio =
            Number(actor.max_hp) > 0 ? Number(actor.hp || 0) / Number(actor.max_hp) : 1;
          retreatGated = hpRatio > threshold;
        }
```

e nel literal `utilityState` aggiungi la riga:

```javascript
          retreat_gated: retreatGated,
```

In `utilityBrain.js` `enumerateLegalActions` (zona :379-382), sostituisci:

```javascript
  // Retreat (always available if HP > 0)
  if (actor.hp > 0) {
    actions.push({ type: 'retreat' });
  }
```

con:

```javascript
  // Retreat: legale se HP > 0 e non gated (retreat gate, spec sistema-symmetry
  // sez. 4.3 -- il flag vive in declareSistemaIntents, qui arriva via state).
  if (actor.hp > 0 && !(state && state.retreat_gated)) {
    actions.push({ type: 'retreat' });
  }
```

Esporta `isRetreatGateEnabled` nel module.exports di declareSistemaIntents
(accanto a `isPerUnitActionsEnabled`).

- [ ] **Step 2.5: GREEN + regressione + commit**

```bash
NODE_PATH="C:/dev/Game/node_modules" node --test tests/ai/sistemaRetreatGate.test.js 2>&1 | grep -E "^. (tests|pass|fail)"
NODE_PATH="C:/dev/Game/node_modules" node --test tests/ai/*.test.js 2>&1 | grep -E "^. (tests|pass|fail)"
git add tests/ai/sistemaRetreatGate.test.js apps/backend/services/ai/declareSistemaIntents.js apps/backend/services/ai/utilityBrain.js
# gate ASCII, poi commit:
git commit -m "feat(ai): retreat gate flag for utility brain (default OFF)"  # + body + trailer
```

Atteso: nuovo file tutto verde; suite AI 0 fail con flag unset.

---

### Task 3: flag `SISTEMA_PER_UNIT_AP_ENABLED` (TDD, stesso branch)

**Files:**
- Modify: `apps/backend/services/ai/declareSistemaIntents.js`
- Test: `tests/ai/sistemaPerUnitAp.test.js` (nuovo)

- [ ] **Step 3.1: test RED**

Crea `tests/ai/sistemaPerUnitAp.test.js` (stessi helper `withFlag`/`declareFor`/fixture del Task 2, flag `SISTEMA_PER_UNIT_AP_ENABLED`):

```javascript
// tests/ai/sistemaPerUnitAp.test.js -- dichiarazione a budget AP (spec sez. 4.2).
// Flag ON: ogni unita' Sistema dichiara fino al suo budget (mirror lookahead2:
// move, poi attack se in gittata dalla posizione POST-move). Flag OFF: 1 intent.
// RISCHIO COPERTO: la risoluzione e' per priorita', non per ordine di
// dichiarazione -> l'attack slot-2 si dichiara SOLO se in range dal move_to.
'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createDeclareSistemaIntents,
  isPerUnitApEnabled,
} = require('../../apps/backend/services/ai/declareSistemaIntents');
const { pickLowestHpEnemy, stepTowards } = require('../../apps/backend/routes/sessionHelpers');

const FLAG = 'SISTEMA_PER_UNIT_AP_ENABLED';
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}
function declareFor(session) {
  const declare = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance: manhattan,
    gridSize: 16,
  });
  return declare(session);
}
const sis = (id, x, y, over = {}) => ({
  id, controlled_by: 'sistema', hp: 10, max_hp: 10, ap: 2, ap_max: 2, mod: 2, dc: 12,
  attack_range: 1, initiative: 10, position: { x, y }, status: {},
  ai_profile: 'aggressive', damage: { min: 1, max: 3 }, ...over,
});
const pg = (id, x, y) => ({
  id, controlled_by: 'player', hp: 12, max_hp: 12, ap: 2, ap_max: 2, mod: 2, dc: 12,
  attack_range: 1, initiative: 12, position: { x, y }, status: {},
});
function session(units) {
  return { units, grid: { width: 16, height: 12 }, sistema_pressure: 50 };
}

test('isPerUnitApEnabled: default OFF, solo "true"', () => {
  withFlag(undefined, () => assert.equal(isPerUnitApEnabled(), false));
  withFlag('true', () => assert.equal(isPerUnitApEnabled(), true));
});

test('ON: target a 2 celle -> move + attack della stessa unita (2 intent, <= 2 AP)', () => {
  withFlag('true', () => {
    const { intents } = declareFor(session([sis('s1', 4, 5), pg('p1', 2, 5)]));
    const mine = intents.filter((i) => i.unit_id === 's1');
    assert.equal(mine.length, 2, 'move + attack slot-2');
    assert.equal(mine[0].action.type, 'move');
    assert.equal(mine[1].action.type, 'attack');
    // attack dichiarato SOLO perche' in gittata dal move_to (3->2 = dist 1)
    const cost = mine.reduce((s, i) => s + Number(i.action.ap_cost || 0), 0);
    assert.ok(cost <= 2, `costo totale ${cost} <= budget 2`);
  });
});

test('ON: gia in gittata -> attack + attack (focus fire simmetrico al player)', () => {
  withFlag('true', () => {
    const { intents } = declareFor(session([sis('s1', 3, 5), pg('p1', 2, 5)]));
    const mine = intents.filter((i) => i.unit_id === 's1');
    assert.equal(mine.length, 2);
    assert.ok(mine.every((i) => i.action.type === 'attack'));
    assert.notEqual(mine[0].action.id, mine[1].action.id, 'id univoci');
  });
});

test('ON: target a 3+ celle dal move_to -> SOLO move (niente attack a vuoto)', () => {
  withFlag('true', () => {
    const { intents } = declareFor(session([sis('s1', 9, 5), pg('p1', 2, 5)]));
    const mine = intents.filter((i) => i.unit_id === 's1');
    assert.equal(mine.length, 1, 'nessun attack fuori gittata post-move');
    assert.equal(mine[0].action.type, 'move');
  });
});

test('ON: ap_remaining 1 -> un solo intent; 0 -> zero intent con decisione NO_AP', () => {
  withFlag('true', () => {
    const one = declareFor(session([sis('s1', 3, 5, { ap_remaining: 1 }), pg('p1', 2, 5)]));
    assert.equal(one.intents.filter((i) => i.unit_id === 's1').length, 1);
    const zero = declareFor(session([sis('s1', 3, 5, { ap_remaining: 0 }), pg('p1', 2, 5)]));
    assert.equal(zero.intents.filter((i) => i.unit_id === 's1').length, 0);
    const d = zero.decisions.find((x) => x.unit_id === 's1');
    assert.equal(d.rule, 'NO_AP');
  });
});

test('OFF: 1 intent per unita, identico a oggi', () => {
  const off = withFlag(undefined, () => declareFor(session([sis('s1', 4, 5), pg('p1', 2, 5)])));
  assert.equal(off.intents.filter((i) => i.unit_id === 's1').length, 1);
});
```

- [ ] **Step 3.2: verifica RED**

```bash
NODE_PATH="C:/dev/Game/node_modules" node --test tests/ai/sistemaPerUnitAp.test.js 2>&1 | grep -E "pass|fail|not a function"
```

Atteso: FAIL, `isPerUnitApEnabled is not a function`.

- [ ] **Step 3.3: implementazione in declareSistemaIntents.js**

(a) Flag, accanto agli altri:

```javascript
// Per-unit AP declaration (spec sistema-symmetry sez. 4.2): ogni unita' Sistema
// dichiara fino al SUO budget (ap_remaining ?? ap), mirror del PG. L'addebito a
// risoluzione e il refill per-round esistono GIA' per il Sistema (bridge resolve
// loop + applyApRefill, nessun filtro fazione -- verificato 2026-07-10): questo
// flag chiude l'unico buco, l'affordability alla dichiarazione. Il cap globale
// resta per la PRESENTAZIONE telegraph (spec sez. 4.4). Default OFF.
function isPerUnitApEnabled() {
  return process.env.SISTEMA_PER_UNIT_AP_ENABLED === 'true';
}
```

(b) nel corpo di `declareSistemaIntents`, accanto a `const perUnitActions = ...`:

```javascript
    const perUnitAp = isPerUnitApEnabled();
```

e il check del cap diventa:

```javascript
      if (!perUnitActions && !perUnitAp && intentsEmitted >= intentsCap) {
```

(c) budget a inizio attore (subito dopo il check del cap):

```javascript
      // Budget AP dell'attore (solo flag ON; OFF -> percorso invariato).
      const apBudget = perUnitAp
        ? Number(actor.ap_remaining != null ? actor.ap_remaining : actor.ap || 0)
        : Infinity;
      if (perUnitAp && apBudget < 1) {
        decisions.push({
          unit_id: actor.id,
          rule: 'NO_AP',
          intent: 'skip',
          reason: `ap esauriti (${apBudget})`,
        });
        continue;
      }
```

(d) helper slot-2 nel closure del factory (fuori dal loop, accanto agli altri helper):

```javascript
  // Slot-2 (spec sez. 4.2, mirror lookahead2): dopo il primo intent, se il
  // budget regge, dichiara un attack SOLO se il target e' in gittata dalla
  // posizione VIRTUALE post-move e la LOS e' libera da li'. Niente re-run
  // della policy: deterministico, niente mutazioni (il modulo resta puro),
  // nessuna interazione col commit-window (bookkeeping invariato).
  function declareSecondAttack(ctx) {
    const { actor, target, policy, virtualPos, remaining, intents, decisions, takenTargetIds, session } = ctx;
    if (remaining < 1) return 0;
    if (!target || Number(target.hp || 0) <= 0) return 0;
    const range = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
    if (manhattanDistance(virtualPos, target.position) > range) return 0;
    if (!losClearForAi(session.grid, virtualPos, target.position, session.units)) return 0;
    const action = {
      id: `sis-attack2-${actor.id}`,
      type: 'attack',
      actor_id: actor.id,
      target_id: target.id,
      ability_id: null,
      ap_cost: 1,
      channel: pickExploitChannel(target),
      damage_dice: deps._damageDice || { count: 1, sides: 6, modifier: 2 },
      source_ia_rule: `${policy.rule}_AP2`,
    };
    intents.push({ unit_id: actor.id, action });
    takenTargetIds.add(target.id);
    decisions.push({
      unit_id: actor.id,
      rule: `${policy.rule}_AP2`,
      intent: 'attack',
      target_id: target.id,
    });
    return 1;
  }
```

(e) call-site 1 -- dopo l'emissione dell'ATTACK (zona :563-581, prima del `continue`):

```javascript
        if (perUnitAp) {
          intentsEmitted += declareSecondAttack({
            actor, target, policy,
            virtualPos: actor.position,
            remaining: apBudget - 1,
            intents, decisions, takenTargetIds, session,
          });
        }
        continue;
```

(f) call-site 2 -- dopo l'emissione del MOVE (zona :645-656). PRIMA del push del
move, aggiungi l'affordability del primo intent:

```javascript
      if (perUnitAp && moveAction.ap_cost > apBudget) {
        decisions.push({
          unit_id: actor.id,
          rule: 'NO_AP',
          intent: 'skip',
          reason: `move cost ${moveAction.ap_cost} > budget ${apBudget}`,
        });
        continue;
      }
```

e DOPO il `decisions.push({...})` del move:

```javascript
      if (perUnitAp) {
        intentsEmitted += declareSecondAttack({
          actor, target, policy,
          virtualPos: nextPos,
          remaining: apBudget - moveAction.ap_cost,
          intents, decisions, takenTargetIds, session,
        });
      }
```

(g) esporta `isPerUnitApEnabled` nel module.exports.

- [ ] **Step 3.4: GREEN + regressione + commit + PR**

```bash
NODE_PATH="C:/dev/Game/node_modules" node --test tests/ai/sistemaPerUnitAp.test.js tests/ai/sistemaRetreatGate.test.js tests/ai/sistemaPerUnitActions.test.js 2>&1 | grep -E "^. (tests|pass|fail)"
NODE_PATH="C:/dev/Game/node_modules" node --test tests/ai/*.test.js 2>&1 | grep -E "^. (tests|pass|fail)"
git add tests/ai/sistemaPerUnitAp.test.js apps/backend/services/ai/declareSistemaIntents.js
git commit -m "feat(ai): per-unit AP declaration flag (default OFF)"  # + body + trailer
git push -u origin feat/sistema-symmetry-flags
gh pr create --base main --head feat/sistema-symmetry-flags --title "feat(ai): symmetry flags -- retreat gate + per-unit AP (OFF)" --body "<2 flag, TDD, suite verde flag-unset, rollback: revert; fattoriale nel task successivo>"
gh pr comment <N> --body "@codex review"
```

Merge quando verde + Codex pulito.

---

### Task 4: fattoriale 2x2 (N=10 paired) + report

**Files:**
- Create: `docs/research/<data-esecuzione>-sistema-symmetry-factorial.md` (+ entry `docs/governance/docs_registry.json`)
- Output: `reports/sim/{dorsale-ferrosa,canyon-lungo,abisso-colata}-n10-{gate,ap,gateap}-on/`
- Log: `/c/dev/codemasterdd-ai-station/Extras/ollama-runs/<data>-sistema-symmetry-factorial.log`

- [ ] **Step 4.1: batch 3 arm x 3 encounter (control = `*-n40-terrain-on` seeds 1..10, gia' su main)**

```bash
cd /c/dev/Game && git pull --ff-only origin main   # i flag devono essere su main (Task 3 merged)
LOG=/c/dev/codemasterdd-ai-station/Extras/ollama-runs/$(date +%F)-sistema-symmetry-factorial.log
for arm in gate ap gateap; do
  case $arm in
    gate)   export SISTEMA_RETREAT_GATE_ENABLED=true;  unset SISTEMA_PER_UNIT_AP_ENABLED ;;
    ap)     unset SISTEMA_RETREAT_GATE_ENABLED;        export SISTEMA_PER_UNIT_AP_ENABLED=true ;;
    gateap) export SISTEMA_RETREAT_GATE_ENABLED=true;  export SISTEMA_PER_UNIT_AP_ENABLED=true ;;
  esac
  export MOVE_TERRAIN_COST_ENABLED=true XP_BUDGET_GEOMETRY_ENABLED=true
  for pair in "enc_badlands_dorsale_ferrosa_01:dorsale-ferrosa" "enc_badlands_canyon_lungo_01:canyon-lungo" "enc_abisso_colata_basaltica_01:abisso-colata"; do
    enc="${pair%%:*}"; stem="${pair##*:}"
    echo "--- ARM $arm PROBE $enc"
    node tools/sim/grid-band-probe.js --encounter "$enc" --n 10 --out "reports/sim/${stem}-n10-${arm}-on"
  done
done 2>&1 | grep -vE "^\[(jobs|plugin-loader|auth|trait-effects|fairness|vc-scoring|ai-profiles|prisma)|^unknown format" | tee -a "$LOG"
```

(Esegui in background se >5 min; checkpoint = runs.jsonl per dir, riesecuzione idempotente.)

- [ ] **Step 4.2: composizione intent per arm (3 seed x 3 encounter x 4 arm)**

```bash
cd /c/dev/Game && LOGM=/c/dev/codemasterdd-ai-station/Extras/ollama-runs/$(date +%F)-symmetry-intent-mix.jsonl
for armflags in "::" "SISTEMA_RETREAT_GATE_ENABLED:true:" ":SISTEMA_PER_UNIT_AP_ENABLED:true" "SISTEMA_RETREAT_GATE_ENABLED:SISTEMA_PER_UNIT_AP_ENABLED:true"; do
  : # per ogni arm setta/unsetta i flag come sopra, poi:
  for enc in enc_badlands_dorsale_ferrosa_01 enc_badlands_canyon_lungo_01 enc_abisso_colata_basaltica_01; do
    for seed in 1 2 3; do
      MOVE_TERRAIN_COST_ENABLED=true XP_BUDGET_GEOMETRY_ENABLED=true node tools/sim/intent-mix-probe.js --encounter "$enc" --seed "$seed" 2>/dev/null
    done
  done
done >> "$LOGM"
```

(Il for-armflags sopra e' schematico: replica il case/export dello Step 4.1 --
quattro blocchi espliciti vanno benissimo, la sostanza e' UNA riga jsonl per fight.)

- [ ] **Step 4.3: analisi paired + verdetto**

Per ogni arm/encounter, delta paired per-seed vs `*-n40-terrain-on` (seeds 1..10):

```bash
cd /c/dev/Game/reports/sim && for arm in gate ap gateap; do for d in dorsale-ferrosa canyon-lungo abisso-colata; do python - <<EOF
import json, statistics as st, math
base={r['seed']:r for r in (json.loads(l) for l in open('$d-n40-terrain-on/runs.jsonl'))}
on=[json.loads(l) for l in open('$d-n10-$arm-on/runs.jsonl')]
seeds=sorted(r['seed'] for r in on)
wr=sum(1 for r in on if r['outcome']=='victory')/len(on)
bwr=sum(1 for s in seeds if base[s]['outcome']=='victory')/len(seeds)
dr=[next(r for r in on if r['seed']==s)['rounds']-base[s]['rounds'] for s in seeds]
m=st.mean(dr); sd=st.stdev(dr); ci=1.96*sd/math.sqrt(len(dr))
ko=sum(r['kos'] for r in on)/sum(r['rosterN'] for r in on)
print(f"$arm/$d: WR {wr:.2f} (ctrl {bwr:.2f}) dWR {wr-bwr:+.2f} | KO {ko:.3f} | dPace {m:+.2f} [{m-ci:+.2f},{m+ci:+.2f}]")
EOF
done; done
```

**Criterio (spec sez. 5)**: vince l'arm che AVVICINA WR alla banda standard di
`damage_curves.yaml` [0.35, 0.55] (distanza = |WR - 0.55| se WR > 0.55, 0 se in
banda). Secondario: attack-conversion in salita (dal jsonl intent-mix); WR in
discesa con conversion ferma = artefatto, NON vittoria. A parita', arm piu'
semplice (meno flag).

- [ ] **Step 4.4: report + registry + PR**

`docs/research/<data>-sistema-symmetry-factorial.md`: frontmatter standard
(doc_status active, workstream combat, language it), tabella 4 arm x 3 encounter
(WR/dWR/KO/dPace/attack%), verdetto col criterio, arm vincente dichiarato,
gap dichiarati. Entry nel registry (stesso formato delle entry research esistenti).
Commit `docs(research): sistema symmetry factorial N=10 verdict` + PR + Codex +
merge standing.

---

### Task 5: N=40 sull'arm vincente + ri-ratifica bande

- [ ] **Step 5.1: N=40 paired (checkpoint riusa i 10 seed dell'arm vincente)**

```bash
cd /c/dev/Game && <export flag dell'arm vincente + MOVE_TERRAIN_COST/XP_BUDGET_GEOMETRY>
for pair in "enc_badlands_dorsale_ferrosa_01:dorsale-ferrosa" "enc_badlands_canyon_lungo_01:canyon-lungo" "enc_abisso_colata_basaltica_01:abisso-colata"; do
  enc="${pair%%:*}"; stem="${pair##*:}"
  mkdir -p "reports/sim/${stem}-n40-symmetry"
  cp "reports/sim/${stem}-n10-<arm>-on/runs.jsonl" "reports/sim/${stem}-n40-symmetry/runs.jsonl"
  node tools/sim/grid-band-probe.js --encounter "$enc" --n 40 --out "reports/sim/${stem}-n40-symmetry"
done
```

- [ ] **Step 5.2: verdetto N=40 e SOLO SE le metriche reggono il criterio** (WR
  avvicinata/in banda, 0 anomalie: timeout inattesi, oscillazione = pace sd
  esplosa vs arm control), aggiorna:
  - `docs/core/15-LEVEL_DESIGN.md` tabella bande (nuove bande pace se mosse,
    nota semantica "symmetry-ON <data>")
  - `data/core/balance/grid_ratify_baseline.json` (evidence_ref -> doc Task 4/5,
    ratified_at)
  - il report Task 4 si estende con la sezione N=40 (stesso doc, stessa PR o
    follow-up)
  - `tools/js/validate_encounter_grid_ratify.js` deve dare 0 warn

  **STOP owner-gated**: se il N=40 contraddice il N=10 (direction non regge),
  NON aggiornare le bande -- documenta il negative result e fermati: la
  decisione torna a Eduardo.

- [ ] **Step 5.3: xpBudget `action_economy`** -- nel giro di ricalibrazione della
  stessa PR: con l'arm vincente attivo, `dial_cap_reference: 3` non descrive
  piu' il throughput. Misura il ratio con lo script inline (audit arms, come il
  reprobe 07-10) e proponi il valore nuovo (candidato: rimozione dello scale =
  neutro 1) nel report, valori PROPOSED, decider Eduardo. NON flippare nulla.

---

### Task 6: telegraph solo-minacce (flag `SISTEMA_TELEGRAPH_THREATS_ONLY`)

**Files:**
- Modify: `apps/backend/services/ai/threatPreview.js:66-118` (buildThreatPreview)
- Test: `tests/ai/threatPreviewThreatsOnly.test.js` (nuovo)

Puo' partire in parallelo ai Task 4-5 (tocca presentazione, non outcome).

- [ ] **Step 6.1: test RED**

```javascript
// tests/ai/threatPreviewThreatsOnly.test.js -- telegraph threats-only (spec sez. 4.4).
// Flag ON: righe solo per attack su player + move dentro objective.target_zone
// (objective zone-based). Move/retreat ordinari NON telegrafati (si vedono in
// board). Cap presentazione = intentsCapForPressure. Flag OFF: byte-identical.
'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildThreatPreview } = require('../../apps/backend/services/ai/threatPreview');

const FLAG = 'SISTEMA_TELEGRAPH_THREATS_ONLY';
function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}

function fakeSession() {
  const units = [
    { id: 's1', controlled_by: 'sistema', hp: 5, position: { x: 1, y: 1 } },
    { id: 's2', controlled_by: 'sistema', hp: 5, position: { x: 2, y: 2 } },
    { id: 's3', controlled_by: 'sistema', hp: 5, position: { x: 3, y: 3 } },
    { id: 'p1', controlled_by: 'player', hp: 9, position: { x: 5, y: 5 } },
  ];
  return {
    units,
    sistema_pressure: 50, // Escalated -> cap presentazione 3
    encounter: { objective: { type: 'capture_point', target_zone: [7, 7, 9, 9] } },
    roundState: {
      pending_intents: [
        { unit_id: 's1', action: { type: 'attack', target_id: 'p1' } },
        { unit_id: 's2', action: { type: 'move', move_to: { x: 8, y: 8 } } }, // in zona
        { unit_id: 's3', action: { type: 'move', move_to: { x: 4, y: 4 } } }, // fuori zona
      ],
    },
  };
}

test('OFF: tutte le righe SIS come oggi (3)', () => {
  withFlag(undefined, () => {
    assert.equal(buildThreatPreview(fakeSession()).length, 3);
  });
});

test('ON: attack + move-in-zona si', () => {
  withFlag('true', () => {
    const rows = buildThreatPreview(fakeSession());
    const ids = rows.map((r) => r.actor_id).sort();
    assert.deepEqual(ids, ['s1', 's2'], 'move ordinario (s3) non telegrafato');
  });
});

test('ON: cap presentazione = tier (Escalated 3)', () => {
  withFlag('true', () => {
    const s = fakeSession();
    // 5 attack -> solo 3 righe (cap tier), attack prioritari
    s.roundState.pending_intents = ['a', 'b', 'c', 'd', 'e'].map((k, i) => ({
      unit_id: `s${i + 1}`,
      action: { type: 'attack', target_id: 'p1' },
    }));
    s.units = [
      ...[1, 2, 3, 4, 5].map((i) => ({
        id: `s${i}`, controlled_by: 'sistema', hp: 5, position: { x: i, y: i },
      })),
      { id: 'p1', controlled_by: 'player', hp: 9, position: { x: 5, y: 5 } },
    ];
    assert.equal(buildThreatPreview(s).length, 3);
  });
});
```

- [ ] **Step 6.2: RED, poi implementazione in threatPreview.js**

Dentro `buildThreatPreview`, dopo il guard iniziale:

```javascript
  // Threats-only (spec sistema-symmetry sez. 4.4): col Sistema simmetrico le
  // azioni/round salgono (~14 a regime); si telegrafano SOLO le minacce --
  // attack su unita' player, move dentro objective.target_zone (zone-based).
  // Il movimento ordinario si vede sulla board. Il tier cap (che non gata piu'
  // l'azione quando la dichiarazione e' a budget) diventa il tetto di
  // PRESENTAZIONE. ADR-2026-04-18 compliance: il plan-reveal promette le
  // MINACCE prima della risoluzione, non ogni passo (lettura da ratificare
  // nell'ADR di chiusura arco). Default OFF -> byte-identical.
  const threatsOnly = process.env.SISTEMA_TELEGRAPH_THREATS_ONLY === 'true';
  const zone = (() => {
    const o = session.encounter && session.encounter.objective;
    const zoneTypes = new Set(['capture_point', 'sabotage', 'escape', 'escort']);
    return o && zoneTypes.has(o.type) && Array.isArray(o.target_zone) ? o.target_zone : null;
  })();
  const inZone = (pos) =>
    zone && pos && pos.x >= zone[0] && pos.y >= zone[1] && pos.x <= zone[2] && pos.y <= zone[3];
```

nel loop, subito dopo il calcolo di `intentType`:

```javascript
    if (threatsOnly) {
      const isThreat =
        intentType === 'attack' ||
        ((intentType === 'move' || intentType === 'approach') && inZone(action.move_to));
      if (!isThreat) continue;
    }
```

e in coda, prima del `return preview;`:

```javascript
  if (threatsOnly && preview.length > 0) {
    // Cap di presentazione: attack prima, poi zone-entry; taglio al tier cap.
    let cap = preview.length;
    try {
      const { intentsCapForPressure } = require('./declareSistemaIntents');
      cap = intentsCapForPressure(session.sistema_pressure, session.pressure_tier_floor);
    } catch {
      /* cap lookup best-effort: senza, nessun taglio */
    }
    preview.sort((a, b) => (a.intent_type === 'attack' ? -1 : 1) - (b.intent_type === 'attack' ? -1 : 1));
    return preview.slice(0, cap);
  }
```

- [ ] **Step 6.3: GREEN + regressione (test threatPreview esistenti) + commit + PR + Codex + merge standing**

```bash
NODE_PATH="C:/dev/Game/node_modules" node --test tests/ai/threatPreviewThreatsOnly.test.js 2>&1 | grep -E "^. (tests|pass|fail)"
grep -rln "threatPreview\|buildThreatPreview" tests/ --include=*.test.js   # esegui anche quelli
```

---

### Task 7: ADR di chiusura arco (owner-gated -- NO merge autonomo)

**Files:**
- Create: `docs/adr/ADR-<data>-sistema-action-symmetry.md`
- Modify: `packs/evo_tactics_pack/data/balance/ai_profiles.yaml:22` (nota)

- [ ] **Step 7.1**: scrivi l'ADR (MADR, em-dash SOLO nel titolo per convenzione ADR)
  con i 4 punti della spec sez. 9: (1) superamento "Asymmetry invariant" sull'asse
  azione + ratifica ESPLICITA delle asimmetrie che restano (`ignores_trait_costs`,
  `ignores_fog_of_war`); (2) lettura plan-reveal "telegraph = minacce";
  (3) nuovo mestiere di `PRESSURE_TIER_INTENT_CAP` (presentazione) e
  `sistema_pressure` (solo rinforzi); (4) contesto storico (cap alzato
  post-playtest 2026-04-17 "solo 1 SIS muove"; la simmetria lo sostituisce CON
  la misura del fattoriale, ref ai doc research Task 4-5). Status: PROPOSED.
- [ ] **Step 7.2**: sostituisci la nota in `ai_profiles.yaml`:

```yaml
  note: "Action economy: symmetric per ADR-<data>-sistema-action-symmetry; trait/fog asymmetries ratified there"
```

- [ ] **Step 7.3**: PR con la dicitura esplicita "**Merge = Eduardo** (ADR +
  flip flag = decisione owner)". NIENTE merge autonomo, NIENTE flip di flag.
  Il flip in prod (keys.env Lenovo + restart) resta manuale owner.

---

## Self-review (fatto in scrittura)

- Spec coverage: sez. 4.1 -> Task 1; 4.2 -> Task 3; 4.3 -> Task 2; 4.4 -> Task 6;
  sez. 5 -> Task 4; sez. 6/conto -> Task 5 (bande+xpBudget) e OD-061 resta OD;
  sez. 7 ordine rispettato; sez. 9 -> Task 7. Nessun gap.
- Nessun TBD/TODO; l'unico "verbatim move" (Task 1) e' un'istruzione di
  refactoring con range di righe esatti, non un placeholder.
- Coerenza nomi: `isRetreatGateEnabled`/`isPerUnitApEnabled`/`declareSecondAttack`/
  `createApLedger` usati identici tra i task; flag names identici a spec.
- Rischio risoluzione-per-priorita' coperto dal test "SOLO move" (Task 3) +
  slot-2 range-checked dal move_to.
