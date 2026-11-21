---
title: Friendly Fire Intenzionale — Meccaniche Evolutive ed Emergenti
doc_status: draft
doc_owner: master-dd
workstream: incoming
last_verified: '2026-04-16'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Friendly Fire Intenzionale — Meccaniche Evolutive ed Emergenti

## Origine

Durante il primo playtest digitale (2026-04-16, batch N=10) e' emerso che le unita' AI nemiche attaccavano i propri compagni di fazione (`e_nomad_1` → `e_nomad_2`). Bug fixato in [#XXXX] — di default l'AI ora targetta solo unita' di fazione opposta.

**Pero'** il bug ha aperto una direzione di design interessante: il friendly fire NON dovrebbe essere sempre disabilitato. In un mondo ecologico vivo come Evo Tactics, ci sono ragioni narrative e meccaniche per cui creature della stessa fazione si attaccano.

## Casi d'uso da progettare (futuro)

### 1. Fame / bisogno di nutrirsi

Creature con `metabolism` predatorio o opportunista possono attaccare compagni feriti per nutrirsi se `hunger >= soglia`. Soglia influenzata da:

- `species.metabolism` (es. `fast_burn` consuma piu' energia)
- Turni passati senza kill / loot
- Stress level (StressWave > 0.6)
- Trait specifici (es. `cannibal_drift`, `scavenger_instinct`)

### 2. Status confusione

Status effect `confused` (gia' nel sistema status) puo' fare scattare attacco random invece che target tattico. Probabilita' di self/friendly fire:

- `confused`: 30% target random (incluso friendly)
- `panic`: 50% friendly fire o flee
- `rage`: 20% friendly fire ma con bonus damage

### 3. Abitudini evolutive ereditate

Trait `evolutionary_imprint` o `ancestral_instinct`: creature che durante mating/recruit hanno ereditato comportamenti aggressivi possono attaccare compagni con specie/Forma incompatibile. Esempio:

- Specie `Apex` con `predator_imprint` attacca `Playable` con HP basso
- Forma `INTJ` con `cold_calculation` puo' sacrificare compagno per vantaggio tattico

### 4. Eventi stagionali / territoriali

Periodi di accoppiamento (mating season da EventScheduler — vedi 00D) possono triggare aggressivita' tra maschi della stessa specie. Territorial breaks tra clade Threat/Apex.

### 5. Frammenti di personalita' (MBTI/Ennea)

Trigger Ennea `Conquistatore` con stress alto puo' attivare azioni autodistruttive (incluso danno a compagni che lo trattengono). Buff `Ennea_breaker` rare ma drammatico.

## Implementazione futura

Quando promosso a piano:

1. **Schema `data/core/ai/friendly_fire_triggers.yaml`** — enum trigger + condizioni numeriche
2. **Servizio `apps/backend/services/ai/friendlyFire.js`** — logica trigger + override target selection
3. **Test cases**: simulare scenari hunger/confused/cannibal e verificare che friendly fire avvenga con probabilita' attesa
4. **UI feedback**: HUD deve segnalare chiaramente quando una creatura attacca un compagno (icona warning + ragione narrativa)
5. **Player agency**: per unita' player friendly fire deve essere SEMPRE prompted, mai automatico

## Bilanciamento

- Friendly fire NON deve dominare il gameplay
- Frequenza target: <5% delle azioni AI in condizioni normali, >20% in condizioni stress estremo
- Sempre riconducibile a una causa narrativa visibile (status, hunger meter, trait imprint)

## Riferimenti

- [`00D-ENGINES_AS_GAME_FEATURES.md`](../../core/00D-ENGINES_AS_GAME_FEATURES.md) — EventScheduler ecological events
- [`27-MATING_NIDO.md`](../../core/27-MATING_NIDO.md) — Recruitment imprint inheritance
- [`Telemetria-VC.md`](../../core/Telemetria-VC.md) — Tilt index e StressWave triggers
- [`active_effects.yaml`](../../../data/core/traits/active_effects.yaml) — status confusion/panic/rage gia' implementati

## Stato

- 🟢 **Identificato** come opportunita' di design (2026-04-16)
- ⚪ Non ancora pianificato
- ⚪ Non ancora prototipato

Reseguire come task quando si pianifichera' il combat advanced (post-vertical-slice).
