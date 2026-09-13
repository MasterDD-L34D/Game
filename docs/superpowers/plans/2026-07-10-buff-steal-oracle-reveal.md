# Buff-steal e oracle-reveal -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere meccanicamente vivi due tratti oggi inerti -- `nodi_micorrizici_oracolari` (reveal degli intent nemici) e `ghiandole_mnemoniche` (furto di un buff temporaneo, riapplicato a durata dimezzata).

**Architecture:** `nodi_micorrizici_oracolari` non richiede codice: una entry `passive` + `apply_status` + `stato: telepatic_link` in `active_effects.yaml` accende `passiveStatusApplier` -> `computeTelepathicReveal`, una pipe gia' wired ma senza produttori passivi. `ghiandole_mnemoniche` segue il pattern `persistent_marker` + modulo dedicato (come `cortecciaMemetica`): la logica vive in `combat/ghiandoleMnemoniche.js`, wired post-attacco in `routes/session.js`. Poiche' il sync round-model ricostruisce `unit.status` dall'array tracciato e il canale `_pendingStatusApplies` sa solo aggiungere (`applyMoraleStatus` = `Math.max`), serve un canale di rimozione simmetrico, estratto in un modulo puro per essere testabile.

**Tech Stack:** Node 22 (repo canonico), CommonJS, `node:test` + `node:assert/strict`, `js-yaml`.

**Spec:** `docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md`
**Branch:** `feat/trait-buff-steal-oracle-reveal` (da `origin/main`)

---

## File Structure

| File                                                     | Responsabilita'                               | Azione                  |
| -------------------------------------------------------- | --------------------------------------------- | ----------------------- |
| `data/core/traits/active_effects.yaml`                   | registro meccanico dei tratti                 | Modify (append 2 entry) |
| `apps/backend/services/combat/ghiandoleMnemoniche.js`    | logica pura del furto di buff                 | Create                  |
| `apps/backend/services/combat/pendingStatusRemovals.js`  | drain puro del canale di rimozione            | Create                  |
| `apps/backend/routes/sessionRoundBridge.js`              | drena il canale dopo il rebuild tracked->dict | Modify (~3 righe)       |
| `apps/backend/routes/session.js`                         | wire post-attacco del furto                   | Modify (~20 righe)      |
| `tests/services/combat/nodiMicorriziciOracolari.test.js` | inchioda la entry YAML + la pipe reveal       | Create                  |
| `tests/services/combat/ghiandoleMnemoniche.test.js`      | inchioda il furto, la whitelist, l'ordine     | Create                  |
| `tests/services/combat/pendingStatusRemovals.test.js`    | inchioda il drain di rimozione                | Create                  |

**Non toccare:** `tests/helpers/traitLiveness.js` (spec sezione 4 -- l'esclusione dei `persistent_marker` e' voluta).

---

### Task 0: Allineare lo spec ai fatti verificati su questo branch

Il commit dello spec (`3fadcb86a`) cita `sessionRoundBridge.js:2373` -- corretto sul branch `feat/trait-i18n-wiring-lotto1`, sbagliato qui: su `origin/main` la chiamata e' alla riga **2302**. Va corretto, e va documentato il canale di rimozione, che nello spec non c'era.

**Files:**

- Modify: `docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md`

- [ ] **Step 1: correggere il numero di riga**

Nel fatto (4) della sezione "Ground truth accertata", sostituire
`routes/sessionRoundBridge.js:2373` con `routes/sessionRoundBridge.js:2302`.

- [ ] **Step 2: aggiungere la sezione sul canale di rimozione**

Inserire dopo la sezione `### 2. ghiandole_mnemoniche -- un modulo dedicato`:

```markdown
### 2b. Canale di rimozione (`_pendingStatusRemovals`)

Il furto non persiste senza un canale dedicato. `_pendingStatusApplies` e' drenato
con `applyMoraleStatus` (`combat/morale.js:61`), che e'
`unit.status[s] = Math.max(cur, dur)` -- monotono crescente, non sa rimuovere. E il
loop di `syncStatusesFromRoundState` (`sessionRoundBridge.js:415-419`) riscrive
`sessionUnit.status` dall'array tracciato `roundUnit.statuses`, ripristinando
qualsiasi `delete` fatto a meta' attacco.

Senza rimozione, `ghiandole_mnemoniche` diventerebbe silenziosamente una COPIA nel
path round-model e un FURTO in quello legacy: due path dello stesso motore con
comportamento divergente.

Soluzione: `session._pendingStatusRemovals` (`[{unit_id, status}]`), drenato subito
dopo gli applies, cioe' DOPO il rebuild tracked->dict. `adaptSessionToRoundState`
(`sessionRoundBridge.js:297-309`) ri-deriva l'array tracciato dal dict, quindi la
cancellazione sopravvive al giro successivo.

Il drain vive in `combat/pendingStatusRemovals.js` -- funzione pura, testabile --
perche' `syncStatusesFromRoundState` e' una closure non esportata di
`createRoundBridge`.

Band-neutral: nessuna unita' pusha rimozioni se non porta il tratto.
```

- [ ] **Step 3: commit**

```bash
git add docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md
git commit -m "docs(spec): add removal channel, fix sessionRoundBridge line ref

Coding-Agent: claude-opus-4-8
Trace-Id: <nuovo uuidv7>"
```

---

### Task 1: `nodi_micorrizici_oracolari` -- entry YAML

**Files:**

- Modify: `data/core/traits/active_effects.yaml` (append in coda, dopo `pianificatore:`)
- Test: `tests/services/combat/nodiMicorriziciOracolari.test.js`

- [ ] **Step 1: scrivere il test che fallisce**

Creare `tests/services/combat/nodiMicorriziciOracolari.test.js`:

```js
// tests/services/combat/nodiMicorriziciOracolari.test.js
//
// nodi_micorrizici_oracolari -- oracle reveal (spec 2026-07-10).
// Il tratto e' data-only: applica passivamente `telepatic_link`, che
// computeTelepathicReveal consuma per rivelare gli intent nemici entro raggio 3.
// Nessun modulo dedicato: questi test inchiodano la entry YAML e la pipe.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const {
  applyPassiveAncestors,
} = require('../../../apps/backend/services/combat/passiveStatusApplier');
const {
  computeTelepathicReveal,
} = require('../../../apps/backend/services/combat/telepathicReveal');
const { isEngineLiveReliable } = require('../../helpers/traitLiveness');

const REGISTRY = yaml.load(
  fs.readFileSync(path.resolve(__dirname, '../../../data/core/traits/active_effects.yaml'), 'utf8'),
).traits;

const TRAIT = 'nodi_micorrizici_oracolari';

test('nodi: la entry esiste ed e riconosciuta engine-LIVE', () => {
  const def = REGISTRY[TRAIT];
  assert.ok(def, 'entry assente da active_effects.yaml');
  assert.equal(def.trigger.action_type, 'passive');
  assert.equal(def.effect.kind, 'apply_status');
  assert.equal(def.effect.stato, 'telepatic_link');
  assert.equal(isEngineLiveReliable(def), true);
});

test('nodi: applyPassiveAncestors concede telepatic_link', () => {
  const unit = { id: 'u1', traits: [TRAIT], status: {} };
  const events = applyPassiveAncestors(unit, REGISTRY);
  assert.equal(unit.status.telepatic_link, 2);
  assert.ok(events.some((e) => e.trait === TRAIT && e.stato === 'telepatic_link'));
});

test('nodi: un unita senza il tratto non riceve telepatic_link', () => {
  const unit = { id: 'u2', traits: [], status: {} };
  applyPassiveAncestors(unit, REGISTRY);
  assert.equal(unit.status.telepatic_link, undefined);
});

function sessionWith(enemyPos) {
  return {
    units: [
      {
        id: 'p1',
        controlled_by: 'player',
        hp: 10,
        position: { x: 0, y: 0 },
        status: { telepatic_link: 2 },
      },
      { id: 'e1', controlled_by: 'sistema', hp: 10, position: enemyPos, status: {} },
    ],
    roundState: {
      pending_intents: [{ unit_id: 'e1', action: { type: 'attack', target_id: 'p1' } }],
    },
  };
}

test('nodi: il portatore vede lintent nemico entro raggio 3', () => {
  const out = computeTelepathicReveal(sessionWith({ x: 2, y: 1 })); // manhattan 3
  assert.equal(out.length, 1);
  assert.equal(out[0].actor_id, 'p1');
  assert.equal(out[0].revealed[0].enemy_id, 'e1');
  assert.equal(out[0].revealed[0].intent_type, 'attack');
});

test('nodi: oltre raggio 3 lintent resta nascosto', () => {
  const out = computeTelepathicReveal(sessionWith({ x: 4, y: 0 })); // manhattan 4
  assert.equal(out.length, 0);
});
```

- [ ] **Step 2: eseguire il test e verificare che fallisca**

Run: `node --test tests/services/combat/nodiMicorriziciOracolari.test.js`
Expected: FAIL sul primo test -- `entry assente da active_effects.yaml`.
(Gli ultimi due passano gia': la pipe esiste; e' il produttore che manca.)

- [ ] **Step 3: aggiungere la entry YAML**

Appendere in coda a `data/core/traits/active_effects.yaml` (dopo il blocco `pianificatore:`, stessa indentazione a 2 spazi):

```yaml
# Oracle reveal -- spec docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md
# Primo produttore PASSIVO di telepatic_link: la pipe combat/telepathicReveal.js era
# wired (sessionRoundBridge begin-planning) ma affamata -- l'unico produttore,
# risonanza_magnetica, e' gated on_kill + min_mos 5 (boss-finish).
# telepatic_link non concede alcun delta statistico (statusModifiers.js:206-208):
# il tratto da' informazione, non forza. Contenimento = il raggio (manhattan 3),
# non la rarita'. Band-neutral: nessuna sim unit porta questo tratto.
nodi_micorrizici_oracolari:
  tier: T3
  category: sensoriale
  applies_to: actor
  trigger:
    action_type: passive
  effect:
    kind: apply_status
    stato: telepatic_link
    turns: 2
    log_tag: nodi_micorrizici_oracolari
  description_it: |
    Nodi micorrizici oracolari: la rete fungina simbiotica trasporta segnali
    premonitori. Il portatore percepisce le intenzioni delle creature ostili
    entro tre caselle prima che agiscano (fase di pianificazione). Non conferisce
    alcun bonus di attacco o difesa: e' informazione, non potenza.
```

- [ ] **Step 4: eseguire il test e verificare che passi**

Run: `node --test tests/services/combat/nodiMicorriziciOracolari.test.js`
Expected: PASS, 5/5.

- [ ] **Step 5: commit**

```bash
git add data/core/traits/active_effects.yaml tests/services/combat/nodiMicorriziciOracolari.test.js
git commit -m "feat(traits): nodi_micorrizici_oracolari -- passive oracle reveal

First passive producer of telepatic_link. The reveal pipe
(combat/telepathicReveal.js) was already wired into begin-planning but
starved: its only producer, risonanza_magnetica, is gated on_kill+min_mos 5.
telepatic_link carries no stat delta, so this is information, not power.

Coding-Agent: claude-opus-4-8
Trace-Id: <nuovo uuidv7>"
```

---

### Task 2: modulo `ghiandoleMnemoniche.js`

**Files:**

- Create: `apps/backend/services/combat/ghiandoleMnemoniche.js`
- Test: `tests/services/combat/ghiandoleMnemoniche.test.js`

- [ ] **Step 1: scrivere il test che fallisce**

Creare `tests/services/combat/ghiandoleMnemoniche.test.js`:

```js
// tests/services/combat/ghiandoleMnemoniche.test.js
//
// ghiandole_mnemoniche -- furto di buff (spec 2026-07-10).
// Su hit andato a segno il portatore strappa UN buff temporaneo alla preda e ne
// indossa una copia attenuata (50% della durata, minimo 1).
// Whitelist ordinata: frenzy, linked, sensed, coordinamento, risonanza_memetica.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  stealBuff,
  attenuate,
  hasTrait,
  GHIANDOLE_TRAIT,
  STEALABLE,
} = require('../../../apps/backend/services/combat/ghiandoleMnemoniche');

function carrier() {
  return { id: 'a1', traits: [GHIANDOLE_TRAIT], status: {} };
}
function prey(status) {
  return { id: 't1', traits: [], status: { ...status } };
}

test('attenuate: dimezza per eccesso, con floor 1', () => {
  assert.equal(attenuate(4), 2);
  assert.equal(attenuate(3), 2);
  assert.equal(attenuate(1), 1);
  assert.equal(attenuate(0), 0);
});

test('whitelist: frenzy e primo, risonanza_memetica ultimo', () => {
  assert.deepEqual(STEALABLE, [
    'frenzy',
    'linked',
    'sensed',
    'coordinamento',
    'risonanza_memetica',
  ]);
});

test('furto: linked 4 -> la preda lo perde, il portatore lo guadagna con 2', () => {
  const actor = carrier();
  const target = prey({ linked: 4 });
  const out = stealBuff({ actor, target });
  assert.equal(out.stato, 'linked');
  assert.equal(target.status.linked, undefined);
  assert.equal(actor.status.linked, 2);
});

test('furto: linked 1 -> il portatore lo guadagna con 1 (floor)', () => {
  const actor = carrier();
  const target = prey({ linked: 1 });
  stealBuff({ actor, target });
  assert.equal(actor.status.linked, 1);
});

test('furto: un solo buff per colpo, il primo in whitelist', () => {
  const actor = carrier();
  const target = prey({ sensed: 4, linked: 4 });
  const out = stealBuff({ actor, target });
  assert.equal(out.stato, 'linked'); // linked precede sensed
  assert.equal(target.status.sensed, 4); // sensed resta alla preda
});

test('furto: frenzy ha priorita su linked', () => {
  const actor = carrier();
  const target = prey({ linked: 4, frenzy: 2 });
  const out = stealBuff({ actor, target });
  assert.equal(out.stato, 'frenzy');
  assert.equal(target.status.frenzy, undefined);
  assert.equal(target.status.linked, 4);
  assert.equal(actor.status.frenzy, 1);
});

test('furto: nucleo_intatto e telepatic_link non sono rubabili', () => {
  const actor = carrier();
  const target = prey({ nucleo_intatto: 99, telepatic_link: 2 });
  assert.equal(stealBuff({ actor, target }), null);
  assert.equal(target.status.nucleo_intatto, 99);
  assert.equal(target.status.telepatic_link, 2);
});

test('furto: senza il tratto, nessun effetto', () => {
  const actor = { id: 'a2', traits: [], status: {} };
  const target = prey({ linked: 4 });
  assert.equal(stealBuff({ actor, target }), null);
  assert.equal(target.status.linked, 4);
});

test('furto: preda senza buff -> null, nessuna mutazione', () => {
  const actor = carrier();
  const target = prey({});
  assert.equal(stealBuff({ actor, target }), null);
  assert.deepEqual(actor.status, {});
});

test('furto: status_intensity della preda viene ripulito', () => {
  const actor = carrier();
  const target = prey({ linked: 4 });
  target.status_intensity = { linked: 2 };
  stealBuff({ actor, target });
  assert.equal(target.status_intensity.linked, undefined);
});

test('furto: non abbassa un buff gia posseduto dal portatore', () => {
  const actor = carrier();
  actor.status.linked = 3;
  const target = prey({ linked: 2 }); // attenuato -> 1
  stealBuff({ actor, target });
  assert.equal(actor.status.linked, 3); // max(3, 1)
});

test('hasTrait: accetta stringhe e oggetti {id}', () => {
  assert.equal(hasTrait({ traits: [GHIANDOLE_TRAIT] }, GHIANDOLE_TRAIT), true);
  assert.equal(hasTrait({ traits: [{ id: GHIANDOLE_TRAIT }] }, GHIANDOLE_TRAIT), true);
  assert.equal(hasTrait({ traits: [] }, GHIANDOLE_TRAIT), false);
});
```

- [ ] **Step 2: eseguire il test e verificare che fallisca**

Run: `node --test tests/services/combat/ghiandoleMnemoniche.test.js`
Expected: FAIL con `Cannot find module '.../ghiandoleMnemoniche'`.

- [ ] **Step 3: scrivere il modulo**

Creare `apps/backend/services/combat/ghiandoleMnemoniche.js`:

```js
// apps/backend/services/combat/ghiandoleMnemoniche.js
//
// ghiandole_mnemoniche -- furto di buff.
// Spec: docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md
//
// Intento autoriale (docs/traits/Frattura_Abissale_Sinaptica_trait_draft.md:57,
// role_template "Sciame Memetico"): "micro-larve che rubano buff temporanei e li
// riapplicano in forma ridotta". Su un colpo andato a segno il portatore strappa
// UN buff alla preda e ne indossa una copia attenuata.
//
// SCOSTAMENTO DAL CANONE, deliberato: il canone (trait_reference_manual.md:35, il
// gemello riverbero_memetico) dice "al 50%". La magnitudo di uno status NON e'
// scalabile in questo motore -- computeStatusModifiers legge status_intensity per
// il solo `abbagliato` (statusModifiers.js:241); tutti gli altri sono binari
// (isPositive -> delta fisso). Il 50% e' quindi reso sulla DURATA. Non "correggere"
// questo in magnitudo senza riaprire la decisione: toccherebbe ~12 rami di
// computeStatusModifiers e ri-bilancerebbe ogni tratto che produce quegli status.
//
// `frenzy` e' primo in whitelist per scelta di design: la priorita' e' TOGLIERE
// (tag `sabotaggio` del role_template), non massimizzare il guadagno. Ed e' l'unico
// buff il cui furto NON e' un guadagno netto: computeStatusModifiers legge lo STESSO
// status sui due lati -- +1 attacco quando si attacca (:202), -1 difesa quando si e'
// bersagliati (:253) -- quindi il ladro eredita anche la guardia abbassata.
//
// NB: questo tratto resta fuori da tests/helpers/traitLiveness.js di proposito (il
// mirror esclude ogni persistent_marker). Cosi' i path di grant automatico
// (imprintTraitGrant, brancoTraitEmergence) non lo pescheranno mai senza un ratify
// N=40 dedicato. Non e' una dimenticanza.
//
// Puro rispetto al modulo: muta in place gli status-map di actor e target, come i
// pari cortecciaMemetica / tessutiAdattivi. La PERSISTENZA della rimozione nel path
// round-model e' responsabilita' del chiamante (session.js pusha in
// session._pendingStatusRemovals; vedi combat/pendingStatusRemovals.js).
//
// Band-neutral: nessuna sim unit porta ghiandole_mnemoniche.

'use strict';

const GHIANDOLE_TRAIT = 'ghiandole_mnemoniche';

// Ordine di priorita' deterministico. Un solo buff per colpo.
const STEALABLE = ['frenzy', 'linked', 'sensed', 'coordinamento', 'risonanza_memetica'];

function hasTrait(unit, traitId) {
  const raw = unit && Array.isArray(unit.traits) ? unit.traits : [];
  for (const t of raw) {
    if (typeof t === 'string' && t === traitId) return true;
    if (t && typeof t === 'object' && t.id === traitId) return true;
  }
  return false;
}

/**
 * Durata attenuata: 50% arrotondato per eccesso, con floor 1 su input positivi.
 *
 * @param {number} turns
 * @returns {number} 0 se l'input non e' un numero positivo
 */
function attenuate(turns) {
  const t = Number(turns);
  if (!Number.isFinite(t) || t <= 0) return 0;
  return Math.max(1, Math.ceil(t / 2));
}

/**
 * Ruba il primo buff in whitelist posseduto dal target. Muta entrambe le unita'.
 *
 * @param {object} opts
 * @param {object} opts.actor  portatore del tratto (mutato: guadagna il buff)
 * @param {object} opts.target preda (mutata: perde il buff)
 * @returns {{stato: string, stolen_turns: number, granted_turns: number} | null}
 */
function stealBuff({ actor, target }) {
  if (!actor || typeof actor !== 'object') return null;
  if (!target || typeof target !== 'object') return null;
  if (!hasTrait(actor, GHIANDOLE_TRAIT)) return null;

  const ts = target.status;
  if (!ts || typeof ts !== 'object' || Array.isArray(ts)) return null;

  for (const stato of STEALABLE) {
    const turns = Number(ts[stato]);
    if (!Number.isFinite(turns) || turns <= 0) continue;

    const granted = attenuate(turns);
    delete ts[stato];
    if (target.status_intensity && typeof target.status_intensity === 'object') {
      delete target.status_intensity[stato];
    }

    if (!actor.status || typeof actor.status !== 'object') actor.status = {};
    const current = Number(actor.status[stato] || 0);
    actor.status[stato] = Math.max(current, granted);

    return { stato, stolen_turns: turns, granted_turns: actor.status[stato] };
  }
  return null;
}

module.exports = {
  stealBuff,
  attenuate,
  hasTrait,
  GHIANDOLE_TRAIT,
  STEALABLE,
};
```

- [ ] **Step 4: eseguire il test e verificare che passi**

Run: `node --test tests/services/combat/ghiandoleMnemoniche.test.js`
Expected: PASS, 12/12.

- [ ] **Step 5: commit**

```bash
git add apps/backend/services/combat/ghiandoleMnemoniche.js tests/services/combat/ghiandoleMnemoniche.test.js
git commit -m "feat(combat): ghiandoleMnemoniche buff-steal module

Steals one whitelisted buff per landed hit and re-applies it at half
duration (canon says 50%; magnitude is not scalable in this engine, so
the 50% lands on duration -- documented in the module).

frenzy is whitelisted first: sabotage priority, and it is the only steal
that is not a net gain (the thief inherits the lowered guard).

Coding-Agent: claude-opus-4-8
Trace-Id: <nuovo uuidv7>"
```

---

### Task 3: canale di rimozione puro

**Files:**

- Create: `apps/backend/services/combat/pendingStatusRemovals.js`
- Test: `tests/services/combat/pendingStatusRemovals.test.js`

- [ ] **Step 1: scrivere il test che fallisce**

Creare `tests/services/combat/pendingStatusRemovals.test.js`:

```js
// tests/services/combat/pendingStatusRemovals.test.js
//
// Canale di rimozione simmetrico a session._pendingStatusApplies.
// Serve al furto di buff (ghiandole_mnemoniche): applyMoraleStatus e' Math.max,
// quindi il canale di apply non sa rimuovere, e il rebuild tracked->dict
// ripristinerebbe qualsiasi delete fatto a meta' attacco.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  drainStatusRemovals,
} = require('../../../apps/backend/services/combat/pendingStatusRemovals');

function unitsMap(units) {
  return new Map(units.map((u) => [String(u.id), u]));
}

test('drain: rimuove lo status e la sua intensity', () => {
  const u = { id: 't1', hp: 10, status: { frenzy: 2, linked: 1 }, status_intensity: { frenzy: 1 } };
  const session = { _pendingStatusRemovals: [{ unit_id: 't1', status: 'frenzy' }] };
  drainStatusRemovals(session, unitsMap([u]));
  assert.equal(u.status.frenzy, undefined);
  assert.equal(u.status_intensity.frenzy, undefined);
  assert.equal(u.status.linked, 1);
});

test('drain: svuota la coda', () => {
  const u = { id: 't1', hp: 10, status: { frenzy: 2 } };
  const session = { _pendingStatusRemovals: [{ unit_id: 't1', status: 'frenzy' }] };
  drainStatusRemovals(session, unitsMap([u]));
  assert.deepEqual(session._pendingStatusRemovals, []);
});

test('drain: unita sconosciuta -> no-op, nessun throw', () => {
  const session = { _pendingStatusRemovals: [{ unit_id: 'ghost', status: 'frenzy' }] };
  drainStatusRemovals(session, unitsMap([]));
  assert.deepEqual(session._pendingStatusRemovals, []);
});

test('drain: unita senza status -> no-op, nessun throw', () => {
  const u = { id: 't1', hp: 10 };
  const session = { _pendingStatusRemovals: [{ unit_id: 't1', status: 'frenzy' }] };
  drainStatusRemovals(session, unitsMap([u]));
  assert.deepEqual(session._pendingStatusRemovals, []);
});

test('drain: coda assente o vuota -> no-op', () => {
  const u = { id: 't1', hp: 10, status: { frenzy: 2 } };
  drainStatusRemovals({}, unitsMap([u]));
  drainStatusRemovals({ _pendingStatusRemovals: [] }, unitsMap([u]));
  assert.equal(u.status.frenzy, 2);
});
```

- [ ] **Step 2: eseguire il test e verificare che fallisca**

Run: `node --test tests/services/combat/pendingStatusRemovals.test.js`
Expected: FAIL con `Cannot find module '.../pendingStatusRemovals'`.

- [ ] **Step 3: scrivere il modulo**

Creare `apps/backend/services/combat/pendingStatusRemovals.js`:

```js
// apps/backend/services/combat/pendingStatusRemovals.js
//
// Canale di RIMOZIONE degli status, simmetrico a session._pendingStatusApplies.
// Spec: docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md
//
// Perche' serve: il canale di apply e' drenato con combat/morale.applyMoraleStatus,
// che e' `unit.status[s] = Math.max(cur, dur)` -- monotono crescente, incapace di
// rimuovere. E syncStatusesFromRoundState riscrive sessionUnit.status dall'array
// tracciato roundUnit.statuses, ripristinando qualsiasi delete fatto a meta' attacco.
//
// Questo drain va invocato SUBITO DOPO quello degli applies, cioe' dopo il rebuild
// tracked->dict. adaptSessionToRoundState ri-deriva l'array tracciato leggendo il
// dict, quindi la cancellazione sopravvive al giro successivo.
//
// Estratto in un modulo proprio perche' syncStatusesFromRoundState e' una closure
// non esportata di createRoundBridge: qui e' testabile in isolamento.
//
// Best-effort: non lancia mai, non blocca il round.

'use strict';

/**
 * Applica e svuota session._pendingStatusRemovals.
 *
 * @param {object} session         oggetto sessione (mutato: la coda viene svuotata)
 * @param {Map<string,object>} unitsById  unita' vive per id (mutate: perdono lo status)
 * @returns {number} quante rimozioni sono state applicate
 */
function drainStatusRemovals(session, unitsById) {
  if (!session || !Array.isArray(session._pendingStatusRemovals)) return 0;
  if (session._pendingStatusRemovals.length === 0) return 0;

  let applied = 0;
  for (const pending of session._pendingStatusRemovals) {
    if (!pending || !pending.status) continue;
    const unit = unitsById && unitsById.get(String(pending.unit_id));
    if (!unit || !unit.status || typeof unit.status !== 'object') continue;
    delete unit.status[pending.status];
    if (unit.status_intensity && typeof unit.status_intensity === 'object') {
      delete unit.status_intensity[pending.status];
    }
    applied += 1;
  }
  session._pendingStatusRemovals = [];
  return applied;
}

module.exports = { drainStatusRemovals };
```

- [ ] **Step 4: eseguire il test e verificare che passi**

Run: `node --test tests/services/combat/pendingStatusRemovals.test.js`
Expected: PASS, 5/5.

- [ ] **Step 5: commit**

```bash
git add apps/backend/services/combat/pendingStatusRemovals.js tests/services/combat/pendingStatusRemovals.test.js
git commit -m "feat(combat): symmetric status-removal drain channel

_pendingStatusApplies can only ADD (applyMoraleStatus is Math.max), and
the tracked->dict rebuild restores anything deleted mid-attack. Without
this channel a buff steal would silently degrade to a buff copy in the
round-model path while remaining a steal in the legacy path.

Coding-Agent: claude-opus-4-8
Trace-Id: <nuovo uuidv7>"
```

---

### Task 4: wire nel bridge e nella route

**Files:**

- Modify: `apps/backend/routes/sessionRoundBridge.js` (dopo il drain degli applies, riga ~447)
- Modify: `apps/backend/routes/session.js` (require in testa; wire dopo il blocco `applyCortecciaReaction`, riga ~1636)

- [ ] **Step 1: drenare le rimozioni nel bridge**

In `apps/backend/routes/sessionRoundBridge.js`, dentro `syncStatusesFromRoundState`, **subito dopo** la riga `session._pendingStatusApplies = [];` che chiude il blocco degli applies (riga ~447), inserire:

```js
// Canale di RIMOZIONE (buff-steal, ghiandole_mnemoniche). Il drain sopra sa solo
// AGGIUNGERE (applyMoraleStatus = Math.max(cur,dur)) e il rebuild tracked->dict
// ripristinerebbe un delete fatto a meta' attacco. Qui siamo DOPO quel rebuild:
// il prossimo adaptSessionToRoundState ri-deriva l'array tracciato dal dict,
// quindi la cancellazione sopravvive. Best-effort; mai bloccante.
try {
  const { drainStatusRemovals } = require('../services/combat/pendingStatusRemovals');
  drainStatusRemovals(session, unitsById);
} catch {
  /* modulo assente -> nessuna rimozione, il round prosegue */
}
```

- [ ] **Step 2: importare il modulo in session.js**

In `apps/backend/routes/session.js`, accanto agli altri require di `services/combat/` (vicino alla riga 140, dove si importa `tessutiAdattivi`), aggiungere:

```js
const { stealBuff } = require('../services/combat/ghiandoleMnemoniche');
```

- [ ] **Step 3: agganciare il furto post-attacco**

In `apps/backend/routes/session.js`, **subito dopo** la chiusura del blocco `if (cortecciaReaction) { ... }` (riga ~1636), inserire:

```js
// ghiandole_mnemoniche: su un colpo andato a segno il portatore strappa UN buff
// temporaneo alla preda e ne indossa una copia a durata dimezzata. La rimozione
// ha bisogno del canale dedicato: il rebuild tracked->dict la annullerebbe.
// Spec: docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md
// Band-neutral: nessuna sim unit porta ghiandole_mnemoniche.
if (result.hit) {
  const stolen = stealBuff({ actor, target });
  if (stolen) {
    if (!Array.isArray(session._pendingStatusApplies)) {
      session._pendingStatusApplies = [];
    }
    if (!Array.isArray(session._pendingStatusRemovals)) {
      session._pendingStatusRemovals = [];
    }
    session._pendingStatusApplies.push({
      unit_id: actor.id,
      status: stolen.stato,
      duration: stolen.granted_turns,
    });
    session._pendingStatusRemovals.push({
      unit_id: target.id,
      status: stolen.stato,
    });
    evaluation.trait_effects = (evaluation.trait_effects || []).concat({
      trait: 'ghiandole_mnemoniche',
      triggered: true,
      effect: {
        kind: 'buff_steal',
        stato: stolen.stato,
        from: target.id,
        to: actor.id,
        stolen_turns: stolen.stolen_turns,
        granted_turns: stolen.granted_turns,
      },
    });
  }
}
```

- [ ] **Step 4: aggiungere la entry YAML di registrazione**

Appendere in coda a `data/core/traits/active_effects.yaml`:

```yaml
# Buff-steal -- spec docs/superpowers/specs/2026-07-10-buff-steal-e-oracle-reveal-design.md
# persistent_marker = registrazione: la logica vive in
# apps/backend/services/combat/ghiandoleMnemoniche.js, wired post-attacco in
# routes/session.js. Stesso pattern di corteccia_memetica / artigli_psionici.
# Band-neutral: nessuna sim unit porta questo tratto.
ghiandole_mnemoniche:
  tier: T2
  category: supporto
  applies_to: actor
  trigger:
    action_type: passive
  effect:
    kind: persistent_marker
    marker: ghiandole_mnemoniche
    log_tag: ghiandole_mnemoniche
  description_it: |
    Ghiandole mnemoniche: secrezioni che trattengono copie attenuate dei buff.
    Su un colpo andato a segno il portatore strappa alla preda un potenziamento
    temporaneo (priorita': frenesia, legame, percezione, coordinamento, risonanza)
    e ne indossa una copia per meta' della durata residua. Rubare la frenesia non
    e' un affare pulito: se ne eredita anche la guardia abbassata.
```

- [ ] **Step 5: verificare che nulla si sia rotto**

Run: `node --check apps/backend/routes/session.js && node --check apps/backend/routes/sessionRoundBridge.js`
Expected: nessun output (sintassi valida).

Run: `node --test tests/services/combat/`
Expected: PASS su tutti i file, inclusi i tre nuovi.

- [ ] **Step 6: commit**

```bash
git add apps/backend/routes/session.js apps/backend/routes/sessionRoundBridge.js data/core/traits/active_effects.yaml
git commit -m "feat(traits): wire ghiandole_mnemoniche buff-steal into the attack pipeline

persistent_marker registration + post-attack hook next to consumeRisonanza.
The stolen status is pushed to _pendingStatusApplies (gain, on the thief)
and _pendingStatusRemovals (loss, on the prey) so it survives the
round-model sync in both directions.

Coding-Agent: claude-opus-4-8
Trace-Id: <nuovo uuidv7>"
```

---

### Task 5: verifica band-neutral e chiusura

- [ ] **Step 1: la band AI non si muove**

Run: `node --test tests/ai/*.test.js`
Expected: 557/557 pass, byte-stable. Nessuna sim unit porta i due tratti, quindi
nessuna run cambia. **Se un solo test cambia risultato, fermarsi**: significa che un
carrier e' entrato in un roster e il change non e' piu' band-neutral -- serve un
ratify N=40, non un merge.

- [ ] **Step 2: la api-suite non regredisce**

Run: `npm run test:api`
Expected: zero `AssertionError`. Su Ryzen il full-run inonda le porte effimere
(`EADDRINUSE` a cascata, ~290): e' infrastruttura, non logica. Contano solo gli
`AssertionError`. Se compaiono, verificare per-file i soli test toccati.

- [ ] **Step 3: guardia ASCII + validazione tratti**

Run: `python tools/lint/trait_schema_gate.py data/core/traits/active_effects.yaml`
Expected: exit 0.

Run: `LC_ALL=C grep -n '[^ -~]' apps/backend/services/combat/ghiandoleMnemoniche.js apps/backend/services/combat/pendingStatusRemovals.js`
Expected: nessun output.

- [ ] **Step 4: `traitLiveness.js` e' rimasto invariato**

Run: `git diff --stat origin/main -- tests/helpers/traitLiveness.js`
Expected: nessun output. Se il file compare, e' un errore: lo spec (sezione 4) lo
esclude di proposito.

- [ ] **Step 5: PR**

```bash
git push -u origin feat/trait-buff-steal-oracle-reveal
gh pr create --title "feat(traits): buff-steal + oracle-reveal for 2 inert traits" --body "<vedi spec>"
```

PR **ready, mai draft** (policy master-dd). Poi `@codex review`, poll di review E
reaction, triage P1/P2/P3.

---

## Self-Review

**Copertura dello spec:** decisione 1 -> Task 1. Decisione 2 -> Task 2 + Task 4.
Decisione 2b (canale di rimozione, aggiunta) -> Task 3 + Task 4 Step 1. Decisione 3
(scostamento dal canone) -> docstring in Task 2 Step 3. Decisione 4 (`traitLiveness`
invariato) -> docstring in Task 2 Step 3 + guardia in Task 5 Step 4. Verifica ->
Task 5. Nessun requisito dello spec resta scoperto.

**Segnaposto:** nessuno. Ogni step che tocca codice mostra il codice. I `<nuovo uuidv7>`
nei messaggi di commit sono l'unico valore da generare al volo (uno per commit, come
richiede ADR-0011).

**Coerenza dei tipi:** `stealBuff` ritorna `{stato, stolen_turns, granted_turns}` in
Task 2 ed e' consumato con esattamente quei nomi in Task 4 Step 3.
`drainStatusRemovals(session, unitsById)` e' definito in Task 3 e invocato con quella
firma in Task 4 Step 1. `STEALABLE` e' asserito in Task 2 Step 1 e definito con lo
stesso ordine in Step 3.
