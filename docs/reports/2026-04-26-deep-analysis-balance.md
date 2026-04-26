---
title: Deep Balance Analysis — Economy + Combat (2026-04-26)
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 14
tags:
  - balance
  - economy
  - combat
  - audit
related:
  - docs/core/26-ECONOMY_CANONICAL.md
  - docs/balance/macro-economy-source-sink.md
  - docs/adr/ADR-2026-04-20-damage-scaling-curves.md
  - docs/adr/ADR-2026-04-26-sg-earn-mixed.md
  - docs/balance/2026-04-25-encounter-xp-audit.md
---

# Deep Balance Analysis — Economy + Combat

> Audit 2026-04-26. Doc vs runtime cross-check. Sources: museum + 7 canonical doc + grep runtime.

---

## 1. Gap doc-vs-runtime (file:line concreti)

### G-01 — PE earn key `difficulty` vs `encounter_class` (MISMATCH CRITICO)

**Doc** (`26-ECONOMY_CANONICAL.md`): PE basata su encounter tier (tutorial 3 / standard 5 / elite 8 / boss 12).

**Runtime** (`rewardEconomy.js:12-17`): `PE_BASE_BY_DIFFICULTY` lookup via key `difficulty` (string). Valori `{ tutorial:3, standard:5, elite:8, boss:12 }`.

**Wire** (`session.js:2020-2021`):
```js
const peResult = computeSessionPE(vcSnapshot, {
  difficulty: session.difficulty || 'standard',
});
```

**Gap**: `session.difficulty` NON coincide con `session.encounter_class`. Il sistema damage-curves usa `encounter_class` (5 valori: tutorial / tutorial_advanced / standard / hardcore / boss). Il sistema PE usa `difficulty` (4 valori legacy). Scenario `enc_tutorial_06_hardcore` ha `encounter_class: 'hardcore'` ma `session.difficulty` non viene mai impostato da questo valore → fallback `'standard'` → PE 5 invece di 12 (boss-tier expected).

**Diagnosi**: PE earn non scala con difficulty reale. Player hardcore riceve stessa PE di standard.

**Fix richiesto**: `session.js /start` → `session.difficulty = deriveDifficultyFromClass(encounterClass)` OR `rewardEconomy.js` allineato a `encounter_class`. Effort ~1h.

---

### G-02 — SG tracker NON wired a `beginTurn` del round orchestrator

**Doc** (ADR-2026-04-26): `beginTurn(unit)` resetta `sg_earned_this_turn` ogni turno → anti-snowball cap 2/turn funziona.

**Runtime** (`session.js:272-277`):
```js
const sgTracker = require('../services/combat/sgTracker');
if (u && u.hp > 0) sgTracker.beginTurn(u);
```

**Wire** (`session.js:550-554`):
```js
sgTracker.accumulate(actor, { damage_dealt: damageDealt });
sgTracker.accumulate(target, { damage_taken: damageDealt });
```

**Trovato**: `beginTurn` è chiamato in session.js inline turn-start. `accumulate` chiamato post-attack. Ma `resetEncounter` in session.js `/start` (`line:1185-1197`) usa try/catch silente — se `sgTracker` non è già richiesto in quel path, reset non avviene.

**Verifica necessaria**: `session.js:1185` context (encounter start hook). Il sgTracker reset è dentro un try/catch che NON logga fallimenti → silent no-op possibile su first encounter.

---

### G-03 — `isTurnLimitExceeded` esportata ma mai chiamata in `session.js`

**Doc** (ADR-2026-04-20 + `damage_curves.yaml`): `turn_limit_defeat` definito per class (hardcore=25, boss=20, standard=30). Comportamento: defeat forced se turn >= limit.

**Runtime** (`damageCurves.js:157-158`): funzioni `getTurnLimitDefeat` + `isTurnLimitExceeded` esportate.

**Wire gap**: nessuna chiamata a `isTurnLimitExceeded` in `session.js` (grep: 0 match). Solo `sessionRoundBridge.js` usa `missionTimerTick` (separato). Due sistemi paralleli → solo il missionTimer tick applica turn-defeat, non il damageCurves path.

**Rischio**: scenari non co-op (single-player session route diretta, non round bridge) non ricevono il turn limit defeat → stalemate non risolto per single-player path.

---

### G-04 — `computeStatusModifiers` non invocata nel round bridge path

**Runtime** (`session.js:80` + `session.js:398`): `computeStatusModifiers` richiesta e chiamata in `performAttack` inline (session.js path diretto).

**Gap**: `sessionRoundBridge.js` — non importa né chiama `computeStatusModifiers`. Il round orchestrator resolve attack va attraverso un path separato che bypassa status modifiers (`linked`, `sensed`, `frenzy`, `attuned`).

**Effetto**: 4 status che danno bonus/malus attack sono attivi solo in single-action `/action` path, non in round co-op `/round/execute` path. Co-op players non vedono bonus `linked`.

---

### G-05 — `PE_BASE_BY_DIFFICULTY` manca chiave `hardcore` e `tutorial_advanced`

**Gap**: `rewardEconomy.js:12-17` ha solo 4 keys (`tutorial`, `standard`, `elite`, `boss`). `damage_curves.yaml` definisce 5 encounter classes inclusi `hardcore` e `tutorial_advanced`. Nessun mapping esplicito.

**Effetto**: `session.difficulty='hardcore'` → `PE_BASE_BY_DIFFICULTY['hardcore']` = `undefined` → fallback `standard` (5 PE). Boss encounter hardcore non premia il rischio.

---

### G-06 — `applyTurnRegen` wired solo in round bridge, non in session.js turn-end

**Runtime** (`sessionRoundBridge.js:46` + `sessionRoundBridge.js:665`): `applyTurnRegen` importata e chiamata fine-round.

**Gap** (`session.js:1886`): ha un `_applyTurnRegen` inline (renamed clone), NON usa il module di `statusModifiers.js`. Potenziale divergenza logica tra i due path.

---

## 2. Outlier balance identificati

### O-01 — Encounter XP audit: 6/8 scenari `too_easy` per modello statico

Doc `2026-04-25-encounter-xp-audit.md` mostra ratio 0.267-0.649 (target ≈1.0) per tutorial_03-07. Il modello usa +2 power per trait (flat). Trait AOE / bleeding / hazard non modellati.

**Effetto pratico**: il modello è diagnosticamente inutile per scenari avanzati. Può confondere calibration team in futuro.

**Raccomandazione**: non usare per pass/fail decision. Solo sanity-check diff tra scenari.

---

### O-02 — `ancestor_self_control_determination` bumped min_mos 3→5 (già fixato)

`active_effects.yaml:3168`: `min_mos: 5` + commento `bumped 3→5 post balance audit 2026-04-25 — peer T2 offensive parity`. Fix già applicato. Nessuna azione richiesta.

---

### O-03 — `coscienza_d_alveare_diffusa` (T3) ha `requires_ally_adjacent: true` — gated correttamente

`active_effects.yaml:2288`: trigger ha `requires_ally_adjacent: true`. `traitEffects.js:226` controlla questa flag via `passesBasicTriggers`. Funziona. OK.

---

### O-04 — `biochip_memoria` (T2) ha `requires_target_status: bleeding` — gated correttamente

`active_effects.yaml:2342`: trigger `requires_target_status: bleeding`. `traitEffects.js:229-230` gated. OK.

**Nota**: CLAUDE.md sprint context citava questi 2 come "fire ungated". Audit 2026-04-26 NON conferma — `passesBasicTriggers` li gestisce. Il bug era già fixato PRIMA di questo audit.

---

### O-05 — 68/267 ancestor traits silently no-op per status senza downstream consumer

Audit 2026-04-25 (CLAUDE.md) identifica status `linked`/`fed`/`healing`/`attuned`/`sensed`/`telepatic_link`/`frenzy` come silently no-op. Verifica 2026-04-26:

- `statusModifiers.js` ESISTE e implementa tutti i 7 status.
- `session.js:80+398` chiama `computeStatusModifiers` nel path `/action`.
- `sessionRoundBridge.js:665` chiama `applyTurnRegen` per `fed`/`healing`.

**Ma**: come G-04 mostra, round bridge NON chiama `computeStatusModifiers` → `linked`/`sensed`/`frenzy`/`attuned` ancora no-op nel co-op round path.

**Residuo reale**: 4 status su 7 no-op in co-op round path. `fed`/`healing` funzionano (applyTurnRegen wired in bridge). `telepatic_link` wired in `telepathicReveal.js` (separato).

---

### O-06 — SG underflow in tutorial (Gap 3 da macro-economy-source-sink.md)

Tutorial avg 10-15 dmg total → 2-3 SG max ciclo (threshold: 5 taken / 8 dealt). Ultimate richiede 1-3 SG. Surge Burst mai usabile in early tutorial.

Doc già identifica mitigazione: threshold tutorial-specific o +1 SG starter. Nessuna implementazione esistente.

---

### O-07 — SF (Skip Fragment) orphan currency — emessa, nessun sink

`rewardOffer.js:230-232`: SF emessa a skip. Nessun sink wired. Player accumula SF senza valore percepito. Già documentato come Gap 1 in `macro-economy-source-sink.md`.

---

### O-08 — Hardcore iter7 calibration stuck: defeat_rate=0%, timeout=66.7%

ADR-2026-04-20 calibration log: iter7 con `hardcore.enemy_damage_multiplier: 1.8` + `enrage_mod_bonus: 3` → wr 33.3%, defeat 0%, timeout 66.7%. Target: defeat 40-55%. **multiplier knob dichiarato exhausted** — structural fix M9 pending (NON ulteriori tune).

Structural fix options (da ADR):
1. Concentrate enemy aggro (AI focus-fire)
2. Ridurre player HP pool
3. `isTurnLimitExceeded` wiring (già in damageCurves ma non chiamato — G-03)

---

## 3. Hot-spot tuning prioritari

### P0 — G-01: PE earn mismatch difficulty vs encounter_class

**Impatto**: ogni hardcore encounter under-paga PE. Player progression più lenta del design intent.

**Fix**: 2 opzioni.
- A: `session.js /start` aggiunge `session.difficulty = mapEncounterClassToDifficulty(encounterClassUsed)` con mappatura `{ hardcore:'boss', tutorial_advanced:'standard', standard:'standard', boss:'boss', tutorial:'tutorial' }`.
- B: `rewardEconomy.js` accetta `encounter_class` direttamente, aggiunge chiave `hardcore:10` nel lookup.

Raccomando **B** — più clean. Effort ~30min. Test: `tests/api/rewardEconomy.test.js` (già esiste).

---

### P0 — G-03: `isTurnLimitExceeded` non chiamata in session.js → stalemate bug single-player

**Impatto**: single-player hardcore run senza round bridge non forza defeat a turn 25. Iter7 timeout=66.7% probabilmente causa questa path.

**Fix**: in `session.js` `/turn/end` handler, dopo turn increment:
```js
const { isTurnLimitExceeded } = require('../services/balance/damageCurves');
if (isTurnLimitExceeded(session.turn, session.encounter_class)) {
  session.outcome = 'defeat';
  // trigger session_end
}
```
Effort ~1h. Richiede test.

---

### P1 — G-04: `computeStatusModifiers` non chiamata in round bridge co-op path

**Impatto**: `linked`/`sensed`/`frenzy`/`attuned` silently no-op per co-op 4-8 player (round path). 4 status asset valoriale zero in modalità principale.

**Fix**: `sessionRoundBridge.js` import + call `computeStatusModifiers(actor, target, session.units)` pre-attack, revert post. Pattern identico a session.js:370-421. Effort ~2h.

---

### P1 — G-01 (corollario): aggiungi `hardcore` + `tutorial_advanced` a `PE_BASE_BY_DIFFICULTY`

Immediato dopo fix G-01 principale. Effort ~10min.

---

### P2 — O-06: SG underflow tutorial — aggiungere stub +1 SG starter

**Impatto**: tutorial players mai usano Surge Burst. Ridotta varietà tattica early game.

**Fix**: in `session.js /start` per encounter_class `tutorial`, dopo `sgTracker.resetEncounter(u)` aggiungi `u.sg = 1` per player units. Effort ~30min.

---

### P2 — G-05: macro-economy Gap 2 PE excess

PE avg ~8/encounter, sink primario = Form evolve (8 PE one-time). Post-evolve: overflow non drenato. Raccomando decisione su opzione A/B/C (doc già ha analisi). Effort decisione = user, impl = ~2h.

---

### P2 — O-07: SF orphan — disabilitare emission o aggiungere stub sink

**Opzione rapida** (Hades pattern): disabilita SF emission finché nido non wired. `rewardOffer.js:230-232` → commenta `skipFragmentStore.recordSkip()`. Effort ~15min.

---

## 4. Reuse path (effort stimato)

| ID | Asset riusabile | Dove | Effort |
|----|----------------|------|--------|
| R-01 | `isTurnLimitExceeded` già implementata | `damageCurves.js:144` | 1h wire |
| R-02 | `computeStatusModifiers` già implementata | `statusModifiers.js:55` | 2h wire round bridge |
| R-03 | `sgTracker` già completo (initUnit/accumulate/reset/beginTurn/spend) | `combat/sgTracker.js` | 30min verify reset path |
| R-04 | `PE_BASE_BY_DIFFICULTY` già struttura corretta | `rewardEconomy.js:12` | 30min aggiunge chiavi |
| R-05 | `museum/cards/enneagramma-enneaeffects-orphan.md` — enneaEffects.js 93 LOC non richiesto | `.claude/agents/` | 2h wire onRoundEnd |
| R-06 | `macro-economy-source-sink.md` Gap analysis completa | `docs/balance/` | già fatto, usare come roadmap |
| R-07 | `sprt_calibrate.py` per adaptive calibration | `tools/py/` | già implementato |

---

## 5. Summary scorecard

| Gap | Severity | Stato doc | Stato runtime | Fix effort |
|-----|----------|-----------|---------------|-----------|
| G-01 PE earn key mismatch | P0 | doc corretto | runtime bug | 30min |
| G-02 sgTracker reset path silente | P1 | doc corretto | non verificabile senza test | 30min verify |
| G-03 turn_limit_defeat non chiamato session.js | P0 | doc corretto | runtime gap | 1h |
| G-04 computeStatusModifiers non in round bridge | P1 | doc corretto | runtime gap | 2h |
| G-05 PE keys mancanti hardcore/tutorial_advanced | P0 (corollario G-01) | doc corretto | runtime bug | 10min |
| G-06 applyTurnRegen duplicato inline session.js | P2 | — | divergenza latente | 30min refactor |
| O-06 SG underflow tutorial | P2 | gap aperto | no impl | 30min |
| O-07 SF orphan currency | P2 | gap aperto | no impl | 15min |
| O-08 Hardcore defeat_rate=0% stuck | P0 archivio | knob exhausted | strutturale | G-03 fix + AI aggro |

**Top 3 azioni immediate**:
1. Fix G-01+G-05 (`rewardEconomy.js`) — 40min, zero rischio
2. Wire G-03 (`session.js` turn limit) — 1h, risolve iter7 stalemate
3. Wire G-04 (`sessionRoundBridge` status mods) — 2h, sblocca 4 status asset co-op

---

## Escalation

- Se iter8 calibration ancora RED post-G-03 fix → escalate a `balance-auditor` per AI aggro review (enemy focus-fire distribution).
- Se G-04 wire introduce regression su 307 AI test → `session-debugger` agent.
- Se PE economy post-G-01 fix rivela PE surplus massivo → OD pending su Gap 2 (PE excess sink).
