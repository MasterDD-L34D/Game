---
title: 'ADR-2026-04-16: AI Sistema — Utility AI Architecture'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-16
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# ADR-2026-04-16: AI Sistema — Utility AI Architecture

- **Data**: 2026-04-16
- **Stato**: Proposto
- **Owner**: Team Backend & AI
- **Stakeholder**: Rules Engine (resolver.py), Balance (trait_mechanics.yaml), QA (AI behavior test)

## Contesto

AI SIS ha 3 regole hardcoded in `policy.js`:

- REGOLA_001: attacco/avvicinamento default
- REGOLA_002: ritirata a <=30% HP
- REGOLA_003: kite se raggio > target

`declareSistemaIntents.js` genera intenti puri per tutte le unita SIS. `ai_profiles.yaml` definisce 3 personalita (aggressive, balanced, cautious) e `ai_intent_scores.yaml` le costanti combat. Il sistema funziona ma non scala: aggiungere comportamenti richiede codice, non dati.

## Opzioni valutate

### A. GOAP (Goal-Oriented Action Planning)

- Pro: pianifica sequenze multi-step automaticamente (move + attack)
- Contro: A\* planning ogni turno = overhead per 3-5 azioni possibili. Richiede world state abstraction complessa. ~800 LOC minimo
- Reference: GOApy (Python), ReGoap (C#)
- Verdict: **overkill per turn-by-turn con poche azioni**

### B. Behavior Tree

- Pro: struttura leggibile, visual editor possibile
- Contro: rigido, albero statico meno adattivo a cambio parametri data-driven. Aggiungere nodi = codice
- Reference: Behaviac (Tencent, C++/C#)
- Verdict: **troppo rigido per sistema data-driven**

### C. Utility AI ← SCELTA

- Pro: score per azione da N considerations, curve configurabili, difficulty = weight tuning, ~400 LOC minimo, overhead zero per turn-based
- Contro: no planning multi-step (ogni azione indipendente), richiede tuning curve manuale
- Reference: UtilityAI (C#, ZorPastaman), yuka goal evaluators (JS)
- Verdict: **fit naturale**

### D. Yuka Goal Evaluators (hybrid)

- Pro: JS nativo, goal hierarchy, fuzzy logic built-in
- Contro: action enum manuale, ~500 LOC, piu complesso di utility puro
- Reference: yuka (Mugen87)
- Verdict: **backup se Utility AI insufficiente per goals gerarchici**

## Decisione

**Utility AI con considerations data-driven.** Port minimo da pattern UtilityAI.

## Architettura

```
selectAiPolicy(actor, gameState)
  1. enumerateLegalActions(state, actor.id) → [{type, target, params}]
  2. for each action:
       score = Π(consideration_i(action, actor, state))
  3. select(scores, difficulty_profile)
       hard  → argmax(scores)
       normal → weighted_random(top_3)
       easy   → random(all)
  → return {action, score, considerations_breakdown}
```

### Considerations proposte

| Consideration | Input                       | Curva              | Peso base |
| ------------- | --------------------------- | ------------------ | --------- |
| TargetHealth  | target.hp / target.max_hp   | Lineare inversa    | 1.0       |
| Distance      | hex_distance(actor, target) | Quadratica inversa | 0.8       |
| SelfHealth    | actor.hp / actor.max_hp     | Lineare            | 0.7       |
| Cover         | target_tile.cover           | Lineare inversa    | 0.5       |
| AllyProximity | count(allies in range 2)    | Log                | 0.4       |
| StressLevel   | actor.stress                | Quadratica         | 0.6       |
| CooldownReady | reaction.cooldown == 0      | Binaria            | 0.3       |

### Profili difficulty

Definiti in `ai_profiles.yaml` (estensione):

```yaml
difficulty_profiles:
  easy:
    selection: random
    noise: 0.3 # random noise su scores
    considerations_override: {}
  normal:
    selection: weighted_top3
    noise: 0.1
    considerations_override: {}
  hard:
    selection: argmax
    noise: 0.0
    considerations_override:
      Distance: 1.2 # pesa di piu avvicinamento
      Cover: 0.8 # cerca copertura target
```

## Motivazioni

1. **Data-driven**: aggiungere comportamento = aggiungere consideration + curva in YAML. Zero codice.
2. **Debuggable**: ogni decisione ha breakdown (`{action, score, considerations: [{name, raw, weighted}]}`). Log strutturato per playtest.
3. **Compatibile**: `selectAiPolicy` interface invariata. `declareSistemaIntents.js` chiama nuovo `selectAiPolicy` senza cambiare.
4. **Scalabile**: N considerations = O(actions × considerations) per turno. Per 5 azioni × 7 considerations = 35 valutazioni. Trascurabile.
5. **Testabile**: considerations sono funzioni pure. Unit test per curva. Integration test per selezione profilo.

## Conseguenze

### Positive

- Sistema AI controllabile da dati (YAML), non da codice
- Difficulty profiles senza fork logica
- Breakdown decisioni per debug/playtest
- Base per `enumerateLegalActions` (boardgame.io pattern) riusabile da UI (mostra azioni legali al giocatore)

### Negative

- Nessun planning multi-step (move+attack come azioni separate). Accettabile: round model gia prevede 1 azione per intent.
- Tuning curve richiede playtest. Proposta: `predict_combat()` (§13.2) come baseline automatica.

### Rischi

- Curve mal calibrate = AI stupida. Mitigazione: unit test con game state fixtures + assertion su azione attesa.
- `enumerateLegalActions` richiede grid/pathfinding operativo (§14). Implementare in parallelo.

## Implementazione proposta

1. **`services/ai/utilityBrain.js`** (~200 LOC): Brain, Action, Consideration base classes
2. **`services/ai/considerations.js`** (~150 LOC): 7 considerations iniziali (tabella sopra)
3. **`services/ai/enumerateActions.js`** (~100 LOC): lista azioni legali dato stato + grid
4. Estendere `ai_profiles.yaml` con `difficulty_profiles` e pesi consideration
5. Refactor `selectAiPolicy` per usare Brain. Interface invariata.
6. Test: 20+ casi (scelta attesa per stato dato, profili difficulty, edge cases stunned/panic)
