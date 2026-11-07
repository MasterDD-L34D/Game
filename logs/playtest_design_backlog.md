# Playtest Design Backlog — Evo-Tactics Playtest v0.1

Coda di issue di design emerse durante le sessioni di playtest del
`apps/backend/public/Evo-Tactics — Playtest.html`. Ordinate per priorità
(🔴 blocker UX, 🟡 gameplay, 🟢 polish).

Ultimo update: 2026-04-16 (sprint-008/009)

---

## 🟡 10. Stati emotivi IA (panic, rage, ecc.)

**Segnalato il**: 2026-04-16 durante sprint-009 hotfix
**Sintomo**: il sistema policy IA attuale (REGOLA_001/002) è triggerato
solo da condizioni statiche (HP ratio). Manca un layer di stati emotivi
temporanei che modificano il comportamento:
- **panic**: forza REGOLA_002 retreat anche con HP pieno (trigger: colpo
  critico subito, alleato morto vicino, trait nemico intimidatorio)
- **rage**: forza REGOLA_001 attack + bonus damage, ignora retreat
  anche sotto 30% HP (trigger: alleato ucciso, HP critico per berserker,
  trait `ferocia`)
- **confused**: IA attacca target random invece di lowest HP
- **stunned**: skip turno (gia' presente come effetto, non come stato)
- **focused**: bonus hit rate, range esteso di 1

**Impatto**: gameplay attuale è deterministico (HP-based). Gli stati
emotivi creerebbero momenti imprevedibili e narrativamente ricchi.

**Proposta di fix**: estendere `selectAiPolicy(actor, target)` con un
pre-processo che applica i flag temporanei dell'actor:
```js
function selectAiPolicy(actor, target) {
  if (actor.status?.rage)    return { rule: 'RAGE',   intent: 'attack' };
  if (actor.status?.panic)   return { rule: 'PANIC',  intent: 'retreat' };
  if (actor.status?.stunned) return { rule: 'STUN',   intent: 'skip' };
  // ... policy normale
}
```
Gli stati vengono settati da effetti trait (es. `ferocia: on_kill_ally`)
oppure da azioni specifiche (panic: su miss critico del player). Durata
in turni, decrementata a ogni turn/end.

**Dipendenze**:
- Issue #2 (estrazione `services/ai/`): andrebbe fatta prima per avere
  un posto pulito dove mettere gli stati
- Nuovo campo `actor.status = { rage_turns?, panic_turns?, ... }`
- Sistema effetti trait collegato agli eventi (già presente per
  damage_modifier, va esteso per status effects)

**File coinvolti**:
- `apps/backend/routes/session.js` (selectAiPolicy + runSistemaTurn)
- `apps/backend/services/ai/` (da creare, issue #2)
- `data/core/traits/active_effects.yaml` (triggers degli stati)

---

---

## ✅ 1. Griglia senza coordinate visibili — CHIUSO in sprint-005

**Segnalato il**: 2026-04-15
**Risolto il**: 2026-04-16 (sprint-005)
**Sintomo**: le celle non mostrano il proprio `(x,y)` in gioco. L'utente
deve dedurli contando dagli angoli, ma dal punto di vista dell'utente
le caselle "non hanno modo di essere identificate" anche se esistono
lato engine.

**Fix applicato**: aggiunta `.grid-frame` CSS grid che include
`.col-labels` (0-5 sopra) e `.row-labels` (0-5 a sinistra), indici
numerici coerenti con quelli usati lato backend (nessuna conversione
lettera→numero).

**Impatto**: qualsiasi consiglio tattico ("spostati a 3,4", "attacca dalla
casella adiacente") è illeggibile. Anche l'analisi post-partita via VC
score o log combattimento è difficile perché non c'è mappatura fra ciò
che si vede e le coordinate nei log.

**Proposta di fix**:
- Etichette numeriche discrete nei margini della griglia (A-F su X,
  1-6 su Y, stile scacchi) oppure `(x,y)` in corner piccolo su hover
- Mostrare sempre `(x,y)` sotto la cella selezionata nel pannello laterale
- Log combattimento: includere `(x,y)` anche nei messaggi "Mosso a" e
  "Attacco da"

**File coinvolti**:
- `apps/backend/public/Evo-Tactics — Playtest.html` (grid render +
  log format)

---

## 🟡 2. IA SIS: pathing greedy senza awareness tattico

**Segnalato il**: 2026-04-15
**Sintomo**: `stepTowards` in `services/rules`-like logic (vedi
`apps/backend/routes/session.js:187`) muove 1 casella ortogonale verso
il target senza considerare:
- Ostacoli (al momento non esistono, ma il design li prevede)
- Se già in range di attacco avrebbe preferito attaccare (risolto con
  il dual-action loop, ma il check è solo `distance <= attack_range`)
- Posizionamento difensivo (il SIS si offre al centro della griglia
  anziché cercare linee di tiro o copertura)

**Impatto**: l'IA è prevedibile e sfruttabile. Si comporta come una
targeting machine senza tattica.

**Proposta di fix**:
- Estrarre `runSistemaTurn` da `apps/backend/routes/session.js` in un
  modulo IA separato (es. `services/ai/rules_basic.js`), con policy
  pluggabile
- Aggiungere almeno 2 regole alternative: `REGOLA_002` (ritirata se HP
  basso) e `REGOLA_003` (kite se range > melee)

**File coinvolti**:
- `apps/backend/routes/session.js:397-483` (runSistemaTurn)
- possibile nuovo `services/ai/` o `services/rules/ai_policies.js`

---

## ✅ 3. Overlap unità sulla stessa cella — CHIUSO in sprint-005

**Segnalato**: implicito (scoperto analizzando il codice)
**Risolto il**: 2026-04-16 (sprint-005)
**Sintomo**: il branch `move` di `/action` non controlla se la cella di
destinazione è già occupata da un'altra unità. Due unità possono stare
sovrapposte.

**Fix applicato**: il branch `move` valida i blockers via
`session.units.find(u => u.hp > 0 && u.position === dest)` e rifiuta
400. Stesso check nel SIS `runSistemaTurn.stepTowards`: se bloccato
consuma AP e registra un `ia_actions[]` di tipo `skip` invece di
sovrapporsi. Nessun loop infinito.

**Impatto**: rompe la metafora tattica. In un gioco che premia
`close_engage` e distanza Manhattan, l'overlap banalizza il
posizionamento.

**Proposta di fix**:
- In `/action` branch move: rifiutare 400 se `session.units.find(u =>
  u.id !== actor.id && u.hp > 0 && u.position.x === dest.x &&
  u.position.y === dest.y)`.
- Stesso check in `runSistemaTurn` quando SIS fa stepTowards.

**File coinvolti**:
- `apps/backend/routes/session.js:577-621` (move branch) e
  `apps/backend/routes/session.js:450-463` (SIS move)

---

## 🟡 4. close_engage vs DPS: trade-off mal comunicato

**Segnalato il**: 2026-04-15 (analisi run 012632)
**Sintomo**: la metrica `close_engage` in `vcScoring.js:160` premia gli
attacchi da Manhattan ≤ 1, ma il gameplay attuale permette di attaccare
da Manhattan ≤ `attack_range` (default 2). Il giocatore razionale
ottimizza per DPS (restare a dist 2, 2 attacchi/turno) e azzera
`close_engage`, bloccando gli archetipi Ennea aggressivi
(Conquistatore 3).

**Impatto**: l'unico archetipo aggressivo triggerabile con le metriche
attuali è de facto inaccessibile.

**Proposta di fix** (richiede decisione design):
- **Opzione A**: cambiare soglia di `close_engage` a `distance <=
  attack_range` invece di `<= 1` (il più semplice, ma svaluta la
  metrica)
- **Opzione B**: dare bonus danno agli attacchi adiacenti (Manhattan
  1), così il giocatore ottimale usa la vicinanza
- **Opzione C**: malus a colpire a distanza massima (es. -2 al d20),
  così l'adiacenza è la scelta media più sicura

**File coinvolti**:
- `apps/backend/services/vcScoring.js:157-160` (formula)
- `apps/backend/routes/session.js:540-565` (attack resolution)
- `data/core/telemetry.yaml:28` (pesi aggro)

---

## 🟢 5. Metriche telemetria non implementate

**Segnalato il**: 2026-04-15
**Sintomo**: delle variabili richieste dagli indici VC, queste sono
sempre `null` nel loop attuale:
- `pattern_entropy` → blocca asse `E_I` e `S_N`
- `formation_time`, `support_actions` → blocca `cohesion`
- `1vX`, `self_heal`, `overcap_guard` → parziale `risk`
- tutti i componenti di `explore`, `setup`, `tilt`

**Impatto**: 4 dei 5 Ennea archetypes hanno `reason: missing:X` e sono
non-triggerabili. Solo Conquistatore(3) e Coordinatore(2) sono
tecnicamente raggiungibili, ma il secondo dipende da cohesion che è
anche parzialmente coperto.

**Proposta di fix**: incrementale, sprint dedicato a ciascun modulo.
Priorità suggerita:
1. `1vX` (facile: count attacchi dove `len(alive_enemies) == 1 &&
   len(alive_allies) == 1`)
2. `self_heal` (richiede introduzione azione `heal` / trait curativi)
3. `overcap_guard` (richiede sistema di Guard/Parata)
4. `support_actions`, `formation_time` (richiedono multi-unit coop)
5. `explore`, `setup`, `tilt` (richiedono ridisegno event stream)

**File coinvolti**:
- `apps/backend/services/vcScoring.js:15` (commento su variabili
  mancanti)
- `data/core/telemetry.yaml` (definizioni)
- `apps/backend/routes/session.js` (event emission)

---

## 🟢 6. attack_range hardcoded per tutte le unità

**Segnalato il**: 2026-04-15 (implementazione fase AP)
**Sintomo**: `DEFAULT_ATTACK_RANGE = 2` applicato uniformemente. Non
tiene conto di:
- `job` (skirmisher vs vanguard vs ranger)
- `species` (velox vs carapax)
- `traits` (alcuni tratti dovrebbero modificare il range)

**Impatto**: nessuna differenziazione tattica fra build.

**Proposta di fix**:
- Aggiungere `attack_range` a definizioni job in
  `data/core/` (es. skirmisher 2, vanguard 1, ranger 4)
- `normaliseUnit` legge range da job con fallback

**File coinvolti**:
- `apps/backend/routes/session.js:45,78-92` (DEFAULT_ATTACK_RANGE,
  normaliseUnit)
- `data/core/jobs.yaml` (se esiste) o analoghi

---

## 🟢 7. AP cost flat 1 per ogni azione

**Segnalato il**: 2026-04-15 (implementazione fase AP)
**Sintomo**: attack = 1 AP, move = 1 AP (max distance = `actor.ap`),
indipendentemente dalla distanza effettiva del movimento o dal tipo
di attacco. Nessuna granularità per azioni premium (es. carica, colpo
caricato).

**Impatto**: il trade-off AP è binario. Non puoi "pagare di più" per
un'azione più potente.

**Proposta di fix**: estendere `body.cost` oltre `cap_pt` (già
presente) per includere `ap_cost` esplicito, con validazione
`actor.ap_remaining >= ap_cost`. Alcune azioni potrebbero costare 2 AP.

**File coinvolti**:
- `apps/backend/routes/session.js:504-660` (action route)

---

## ✅ 8. Frontend: log non include coordinate — CHIUSO in sprint-005

**Segnalato il**: 2026-04-15 (legato a issue #1)
**Risolto il**: 2026-04-16 (sprint-005)
**Sintomo**: `addLog('move', 'Mosso a (1,1)')` ha le coordinate ma
`addLog('hit'/'miss', ...)` mostra solo roll/MoS/PT. Non sai da dove
stavi attaccando né dove era il target al momento del colpo.

**Fix applicato**:
- Response `/action` attack include `actor_position` e
  `target_position` (copia di `targetPositionAtAttack`)
- Response `/action` move include `position_from`
- `runSistemaTurn` actions array arricchite con le stesse coordinate
- Frontend `logAction` e `logIaAction` riformattati con
  `fmtPos()` helper: `Mosso (a,b)→(c,d)`,
  `Attacco (a,b)→(c,d) d20=…`, `SISTEMA (REGOLA_001) (a,b)→(c,d) …`
- Fix collaterale: `logIaAction` leggeva `ia.action_type` ma il
  backend emette `type`, quindi ogni attacco SIS veniva loggato come
  "si muove". Bug pre-esistente, ora corretto

**Proposta di fix**: includere `from` e `to` nei log attack, tipo
`Attacco da (2,4) → SIS (3,5) d20=18...`.

**File coinvolti**:
- `apps/backend/public/Evo-Tactics — Playtest.html:523-535`
  (logAction)

---

## Stato applicato in questa sessione di playtest

Quelli risolti nelle sessioni di chat precedenti (non più backlog):
- ✅ `express.static` su `apps/backend/public/`
- ✅ state nei response `/action` e `/turn/end`
- ✅ auto-advance turno SIS (un solo Fine Turno chiude il round)
- ✅ `controlled_by:'sistema'` passato dal frontend
- ✅ attack range check sul player (prima solo su SIS)
- ✅ AP consumption sulle azioni + reset su turn/end
- ✅ SIS IA dual-action (2 azioni/turno come player)
- ✅ Frontend: hint "Nessun AP residuo"
- ✅ Frontend: targetable/reachable highlight solo se AP > 0 e in range
