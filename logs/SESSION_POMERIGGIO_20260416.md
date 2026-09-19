# Session Postmortem — 2026-04-16 pomeriggio

**Durata**: 12:00 → 14:00+ (~2 ore)
**Scope**: consolidamento playtest rules engine + estensione design (trait→stati, status fisici)
**Sprint completati**: **14** (da sprint-006 a sprint-019)
**PR mergiati**: **14**
**Commit su main**: 14 squash merge

## 📊 Riepilogo sprint

| Sprint | PR | Focus | Tipo | File primari |
|:-:|:-:|---|:-:|---|
| 006 | #1354 | attack_range per job + REGOLA_002 retreat | feat | session.js |
| 007 | #1355 | close_engage mutual range + adjacency bonus | feat | session.js, vcScoring.js |
| 008 | #1356 | AP cost granular (per distanza) | feat | session.js, Playtest.html |
| 009 | #1357 | SIS unstuck + badge AP cost UI | fix | session.js, Playtest.html |
| 010 | #1358 | AI module extraction `services/ai/` | refactor | routes/session.js → services/ai/\* |
| 011 | #1359 | Metriche 1vX + new_tiles | feat | vcScoring.js |
| 012 | #1360 | REGOLA_003 kite opportunistico | feat | services/ai/policy.js |
| 013 | #1361 | Stati emotivi panic/rage/stunned | feat | services/ai/policy.js, session.js |
| 014 | #1362 | UI feedback stati emotivi | feat | Playtest.html |
| 015 | #1363 | Test suite services/ai/ (45 test) | test | tests/ai/\* |
| 016 | #1364 | Doc architettura AI policy engine | docs | docs/architecture/ai-policy-engine.md |
| 017 | #1365 | Scenario picker (6 matchup) | feat | Playtest.html |
| 018 | #1366 | Trait → stati pipeline (ferocia/intimidatore/stordimento) | feat | traitEffects.js, session.js, active_effects.yaml |
| 019 | #1367 | Status fisici bleeding + fracture | feat | session.js, Playtest.html, active_effects.yaml |

## 🎯 Obiettivi raggiunti

### Backlog playtest originale: **9/9 chiuse o parziali per design**

| Issue | Priorità | Stato | Sprint |
|:-:|:-:|:-:|:-:|
| 1 | 🔴 | ✅ | 005 |
| 2 | 🟡 | ✅ | 010 + 012 |
| 3 | 🟡 | ✅ | 005 |
| 4 | 🟡 | ✅ | 007 |
| 5 | 🟢 | 🟡 parziale | 011 |
| 6 | 🟢 | ✅ | 006 |
| 7 | 🟢 | ✅ | 008 |
| 8 | 🟢 | ✅ | 005 |
| 10 | 🟡 | ✅ | 013 |

### Design doc alignment

Dal design doc `docs/core/10-SISTEMA_TATTICO.md`:

- ✅ **Economia azioni**: 2 AP + AP cost granular (sprint-006/008)
- ✅ **MoS**: tracked, +5 DC = step damage tramite `pt`
- ✅ **Status fisici**: Sanguinamento, Frattura implementati (sprint-019)
- ✅ **Status mentali**: Furia (rage), Panico (panic), Stordimento (stunned) implementati (sprint-013)
- ⚠️ **Iniziativa**: CT a scatti non implementato (turno fisso P1 → SIS)
- ⚠️ **Terreno/Altezze/Facing**: solo `posizione_sopraelevata` proxy
- ❌ **Guardia & Parata**: non implementata (campo `guardia` su unit esiste ma non è usato)
- ⚠️ **PT**: tracciato nel result ma formula hardcoded (15-19 +1, 20 +2, non configurabile)

## 🏗️ Architettura finale

```
apps/backend/
├── routes/session.js                    (router HTTP, state session, combat)
├── services/
│   ├── ai/                              (SPRINT-010 modularized)
│   │   ├── policy.js                   (pure: 7 funzioni + 3 costanti)
│   │   │   ├── selectAiPolicy           (decision tree principale)
│   │   │   ├── checkEmotionalOverrides  (helper stati)
│   │   │   ├── stepAway                 (retreat pathing)
│   │   │   └── DEFAULT_ATTACK_RANGE=2
│   │   └── sistemaTurnRunner.js        (217 linee, DI factory)
│   │       └── createSistemaTurnRunner  (async runner con mock deps)
│   ├── vcScoring.js                    (event → metric → index → ennea)
│   │   ├── 20+ raw metrics              (incluso 1vX, new_tiles, evasion)
│   │   ├── 6 aggregate indices          (aggro, risk, cohesion, explore, setup, tilt)
│   │   ├── 4 MBTI axes                  (T_F, J_P; E_I/S_N null)
│   │   └── 6 Ennea archetypes           (Conquistatore, Cacciatore, Coordinatore,
│   │                                     Esploratore, Architetto, Stoico)
│   └── traitEffects.js                 (two-pass: damage + apply_status)
│       ├── evaluateAttackTraits         (pass 1, pre-damage)
│       └── evaluateStatusTraits         (pass 2, post-damage con killOccurred)
│
├── public/
│   └── Evo-Tactics — Playtest.html      (UI: griglia, scenari, badge stati, log)
│
└── services/
    └── (altri invariati: fairnessCap, traitEffects già aggiornato)

data/core/
├── telemetry.yaml                       (6 Ennea themes + pesi indici)
└── traits/
    └── active_effects.yaml              (7 trait vivi: 2 legacy + 5 nuovi)

tests/
└── ai/
    ├── policy.test.js                   (34 test)
    └── sistemaTurnRunner.test.js        (11 test)
    → totale: 45 test, ~120ms, 100% pass

docs/
├── architecture/
│   └── ai-policy-engine.md              (310 linee, flusso + ricette)
└── core/
    └── 10-SISTEMA_TATTICO.md            (design doc — allineato al 70%)
```

## 🧬 Gameplay features implementate

### Regole IA (policy.js)

1. **REGOLA_001** — default: attack se in range, approach altrimenti
2. **REGOLA_002** — retreat se HP ≤ 30% del max
3. **REGOLA_003** — kite opportunistico se `actor.range > target.range`

### Stati emotivi (5 mentali + 2 fisici)

| Stato | Tipo | Effetto | Trigger naturale |
|---|:-:|---|---|
| **panic** | mentale | forza REGOLA_002 retreat | MoS ≥ 8 (auto) + trait intimidatore (melee) |
| **rage** | mentale | forza attack + `+1` damage | trait ferocia (on kill) |
| **stunned** | mentale | skip turno | trait stordimento (critico) |
| **focused** | mentale | dichiarato, non triggered | — |
| **confused** | mentale | dichiarato, non triggered | — |
| **bleeding** | fisico | `−1 HP/turno` non riducibile | trait denti_seghettati (hit) |
| **fracture** | fisico | `ap_remaining = min(1, ap)` | trait martello_osseo (critico) |

Priorità policy override: `stunned > rage > bleeding > fracture > panic > REGOLA_002 > REGOLA_003 > REGOLA_001`.

Decrement automatico per-unit a end-of-own-turn (sprint-019 fix).

### Trait vivi (7 in active_effects.yaml)

| Trait | Tipo effetto | Trigger |
|---|:-:|---|
| zampe_a_molla | +1 damage | MoS ≥ 5 + sopraelevato |
| pelle_elastomera | −1 damage | on hit (target) |
| ferocia | status rage 3 | on kill (actor) |
| intimidatore | status panic 2 | on hit + melee_only |
| stordimento | status stunned 1 | on hit + min_mos 8 |
| denti_seghettati | status bleeding 2 | on hit |
| martello_osseo | status fracture 2 | on hit + min_mos 8 |

### Scenari playtest (7 preset)

| Scenario | P1 | SIS | Focus |
|---|---|---|---|
| **Classico** | velox skirmisher r2 | carapax vanguard r1 | baseline |
| **Duello Ranger** | velox skirmisher r2 | falco ranger r3 | REGOLA_003 kite IA |
| **Caster vs Tank** | carapax vanguard r1 | volpina invoker r3 | player tank |
| **Mirror Ranger** | falco ranger r3 | falco ranger r3 | simmetria |
| **Berserker** | velox + ferocia | lupo + intimidatore | rage + panic combo |
| **Shock Troops** | velox | carapax + stordimento | critico + stun |
| **Bloody Mess** | velox + denti_seghettati | carapax + martello_osseo | status fisici |

### Balance validato (simulazione 200-run)

| Configurazione | close_engage WR | kite WR |
|---|:-:|:-:|
| Sprint-004 (pre-balance) | 46.5% | 100% |
| Sprint-006 (range per job) | 52.5% | 100% |
| Sprint-007 (+ adj bonus + mutual range) | 65.5% | 71% |
| **Sprint-008 (+ AP cost per distanza)** | **68.5%** | **74%** |

**Gap finale**: 5.5%. Entrambe le strategie viable, nessuna dominante.

## 🔄 Pattern architetturali consolidati

### 1. Policy engine estendibile

Aggiungere una nuova REGOLA:
1. Branch condizionale in `selectAiPolicy` (policy.js) prima di REGOLA_001
2. Il runner (sistemaTurnRunner.js) gestisce già gli intent `attack/approach/retreat/skip`
3. Test in `tests/ai/policy.test.js`

### 2. Trait → stati pipeline (two-pass)

Aggiungere un nuovo trait che applica stati:
1. Entry in `data/core/traits/active_effects.yaml`:
   ```yaml
   new_trait:
     applies_to: actor
     trigger: { action_type: attack, on_result: hit, min_mos: ?, melee_only: ? }
     effect: { kind: apply_status, target_side: actor|target, stato: X, turns: N }
   ```
2. Se lo stato è nuovo: aggiunto a `unit.status` defaults + emoji frontend + label + CSS chip/glow
3. Pipeline automatic via `evaluateStatusTraits` (pass 2 post-damage)

### 3. Dependency injection per test

- Business logic vive in factory con `createXxx(deps)` pattern
- Test mocks le deps, testano in isolamento
- Vedi `tests/ai/sistemaTurnRunner.test.js` per esempio

### 4. UI feedback per feature invisibili

Regola: **ogni feature di gameplay deve avere un layer di feedback visivo**. Sprint-014 ha reso visibili gli stati emotivi che altrimenti erano invisibili. Pattern riutilizzato in sprint-019 per status fisici.

## 📚 Lezioni apprese

### Cosa ha funzionato bene

1. **Sprint sequenziali piccoli** (~30-45 min ciascuno) con PR strutturate. 14 sprint in 2 ore è sostenibile SOLO se ogni sprint è atomico e testato in isolamento.

2. **Refactor come investimento** (sprint-010 AI extraction + sprint-015 tests + sprint-016 docs). Hanno reso possibili tutti gli sprint successivi senza paura di regression.

3. **Design doc come guida**: sprint-019 è nato leggendo `10-SISTEMA_TATTICO.md` e trovando il gap. Il design doc è la "lista TODO più autorevole".

4. **Dependency injection** ha permesso test unitari facili e ha reso l'estrazione AI indolore.

5. **Feedback loop veloce**: Claude Preview + eval script hanno permesso validazione live sub-secondo invece di avviare browser manuale.

### Cosa si sarebbe potuto fare meglio

1. **Troppe feature senza playtest manuali**. Dovrei aver fatto una run di playtest reale ogni 3-4 sprint invece che tutti tutti insieme alla fine. I bug scoperti nei playtest live (sprint-009 SIS stuck, diagonali) sarebbero emersi prima.

2. **CI lenta come collo di bottiglia**. I 3 merge sequenziali del "consolidating phase" (#1362 → #1363 → #1364) hanno perso ~15 min aspettando CI checks per unbloccare il successivo. Future: usare `auto-merge` o abilitare merge immediato su PR docs/test.

3. **Doc governance** ha un piccolo overhead (frontmatter + registry) che ho dovuto gestire manualmente. Bilanciato dalla garanzia di non drift.

4. **Nessun performance testing**. Il runner SIS gira in ~100ms, ma con una griglia più grande e più unità potrebbe essere un problema. Da testare in futuro.

### Design decisioni notevoli

1. **`close_engage` come "mutual range"** invece che "adiacente" (sprint-007). Evitato di trivializzare la metrica mantenendo semantica tattica.

2. **Stati mentali vs fisici** con priorità fissa `stunned > rage > bleeding > fracture > panic`. Stati fisici sopra panic perché più pericolosi meccanicamente (DoT + movement penalty).

3. **Two-pass trait evaluation** (sprint-018): necessario per trait con `on_kill` trigger che richiedono contesto post-damage. Pattern riutilizzato per status apply.

4. **Per-unit status decrement** (sprint-019 fix): il global decrement dava off-by-one sui fresh status. Timing corretto ora è consistente per tutti gli stati.

5. **Scenario picker + trait combinations** hanno trasformato il playtest da "1 matchup fisso" a "laboratorio configurabile" senza editing di codice.

## 🔜 Cosa resta per domani / future sessioni

### Backlog playtest ancora aperto

- **Issue #5** (metriche telemetria): `pattern_entropy`, `cover_discipline`, `formation_time`, `support_actions`, `time_in_fow`, `optionals`, `tilt`. Richiedono feature di gameplay non ancora implementate (heal action, guard system, fog of war, objective system, ecc.).

### Design doc gaps

- **Iniziativa CT a scatti** (sistema d'ordine turni, non turno fisso)
- **Facing/backstab** vero (non solo proxy altitudine)
- **Guardia & Parata** reattive (`d20` difensivo che riduce step damage e genera PT difensivi)
- **Stati fisici** mancanti: `disorientamento` (accuracy penalty)
- **Stati mentali** mancanti: `focused` con bonus hit rate, `confused` con target random
- **Multi-unit parties** (2v2, 4v4 dal loop doc)
- **Save/load session** su disco per recovery browser crash

### Tech debt minore

- Test suite per `traitEffects.js` (evaluator) — attualmente solo `services/ai/`
- Test suite per `vcScoring.js` — metriche + aggregate
- Doc architettura per il trait engine (sprint-018/019 non documentati formalmente)
- Gitignore hygiene (fatto in sprint-009 già, ma i session_*.json continuano a crescere)

## 📋 Stato finale sessione

- **main** al commit `dfe50282` (post sprint-019 merge incluso)
- **working tree** pulito
- **tests** 45/45 pass
- **CI** ultimi PR verdi (build Deploy site ha 1 FAILURE legacy non bloccante)
- **docs governance** errors=0 warnings=0
- **tempo** 12:00-14:00+ = ~2 ore (target 16:00, siamo molto avanti)

## 🕐 Rimangono ~2h fino alle 16:00

Opzioni per il residuo tempo:

1. **Playtest reale manuale** — giocati 3-4 scenari diversi dalla UI ricca, raccolta sensazioni, VC data finale
2. **Nuovo sprint-020** — una feature ambiziosa (es. initiative CT, guardia reattiva, multi-unit 2v2)
3. **Tech debt consolidation** — test per vcScoring/traitEffects, doc trait engine
4. **Chiusura anticipata** — handoff doc pronta, salvataggio contesto per domani

---

**Co-Authored-By**: Claude Opus 4.6 (1M context) + user (Master DD)
**Generated on**: 2026-04-16 14:00 locale
