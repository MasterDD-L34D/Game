---
doc_status: draft
doc_owner: trait-curator
workstream: combat
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
---

# Status Effects Roadmap — Evo-Tactics

> Sprint context: 2026-04-25 autonomous content sprint (notte). Espande
> il sistema status che oggi gira con 5 stati live (rage, panic, stunned,
> bleeding, fracture) e propone 12 nuovi stati con design intent + runtime
> hook map.

## 1. Stato attuale (live, runtime)

Pipeline (vedi `apps/backend/services/traitEffects.js` + `session.js performAttack`):

1. Trait con `effect.kind = apply_status` valuta `passesBasicTriggers`
2. Se trigger include `on_kill`, valuta `killOccurred`
3. Push `statusApplies[]` a `performAttack`
4. `performAttack` muta `unit.status[<stato>] = { turns, source_trait }`
5. Il policy engine (`services/ai/policy.js`) legge `unit.status` per decisione AI

### Stati live oggi (5)

| ID           | Categoria       | Effetto runtime                              | Trigger tipico                                                   | Decay           |
| ------------ | --------------- | -------------------------------------------- | ---------------------------------------------------------------- | --------------- |
| **rage**     | comportamentale | No retreat (REGOLA_002), +1 dmg sui successi | trait `on_kill` (es. `ferocia`, `circolazione_*`)                | turns countdown |
| **panic**    | comportamentale | Fugge invece di contrattaccare (STATO_PANIC) | trait `on hit` melee (es. `intimidatore`, `voce_imperiosa`)      | turns countdown |
| **stunned**  | traumatico      | Salta il prossimo turno                      | trait `min_mos: 8` (es. `stordimento`, `martello_osseo` su crit) | turns countdown |
| **bleeding** | fisiologico     | 1 PT non riducibile a fine turno target      | trait `on hit` (es. `denti_seghettati`, `enzimi_chelanti`)       | turns countdown |
| **fracture** | traumatico      | `ap_remaining = 1` al reset (mobility -50%)  | trait `min_mos: 8` (es. `martello_osseo`)                        | turns countdown |

### Distribuzione attuale (post wave 1-4 sprint 2026-04-25)

| stato    | trait count |
| -------- | ----------- |
| rage     | 7           |
| panic    | 6           |
| stunned  | 11          |
| bleeding | 11          |
| fracture | 8           |

Totale apply_status: **43** trait. Buona copertura ma manca varianza
strategica: tutti i 5 stati sono "obstruction" o "amplification". Mancano
stati di SHAPING (controllo posizione/scelte) e RESONANCE (sinergia squadra).

## 2. Vision per stati v2 (proposta)

Stratificare in 4 tier semantici:

- **Obstruction** (oggi) — limita azioni del bersaglio (stunned, fracture)
- **Drain** (oggi) — danno passivo (bleeding, panic-fuga)
- **Amplification** (oggi) — buff dell'attaccante (rage)
- **Shaping** (NUOVO) — modifica posizione, focus, target priority
- **Resonance** (NUOVO) — sinergia squadra (PT/PP/SG mod aura-style)
- **Curse** (NUOVO) — effetti narrativi a lungo termine (1+ encounter)

## 3. Roadmap nuovi stati (12 proposte)

### Tier 1 (basso rischio runtime, additive)

#### 3.1 `slowed` (Obstruction)

- **Categoria**: traumatico
- **Effetto runtime**: `unit.mobility -= 1` (min 1) per `turns` turni
- **Trigger ideale**: trait su MoS >= 5, melee_only false (anche ranged: rete)
- **Trait candidati**: `tentacoli_uncinati` (downgrade da fracture), `ghiandole_fango_calde` (downgrade), nuovo `tela_appiccicosa`
- **Implementazione**: nuovo case in `policy.js` per ricalcolare BFS movement range
- **LOC stimato**: ~20 LOC traitEffects.js + ~15 policy.js
- **Risiko**: basso (numerico semplice)

#### 3.2 `marked` (Shaping)

- **Categoria**: comportamentale
- **Effetto runtime**: prossimo attaccante alleato del marker riceve +1 dmg vs questo target (`unit.status.marked = { source_unit_id, turns }`)
- **Trigger**: trait `on hit` ranged (es. `occhi_analizzatori_di_tensione`)
- **Trait candidati**: `occhi_*` family — i sensori "vedono il punto debole"
- **Sinergia**: combo Skirmisher+Ranger (mark+execute)
- **LOC**: ~30 (ricerca alleati + bonus pipeline in performAttack)
- **Risiko**: medio (richiede consultare squad_id)

#### 3.3 `burning` (Drain)

- **Categoria**: fisiologico
- **Effetto runtime**: 2 PT non riducibili a fine turno target per `turns` (più severo di bleeding)
- **Trigger**: trait `on hit` con MoS >= 5 e descrittore termico
- **Trait candidati**: `denti_silice_termici` (upgrade), `filamenti_termoconduzione`, nuovo `respiro_acido`
- **Decay accelerato**: -1 turno se target sta in biome "acquatico"
- **LOC**: ~20 traitEffects + interazione biome
- **Risiko**: basso

#### 3.4 `chilled` (Obstruction soft)

- **Categoria**: fisiologico
- **Effetto runtime**: `attack_mod_bonus -= 1` + `mobility -= 1` per `turns`
- **Trigger**: trait con descrittore freddo (es. `artigli_ipo_termici` upgrade da stunned)
- **Sinergia**: combo con `burning` → applicazione di entrambi rimuove `burning` con bonus heal 1 PT
- **LOC**: ~15 traitEffects + interaction matrix
- **Risiko**: basso

#### 3.5 `disoriented` (Shaping)

- **Categoria**: comportamentale
- **Effetto runtime**: prossimo attacco del target ha penalty -2 attack_mod (1 turno)
- **Trigger**: trait `min_mos: 5` con descrittore sonoro/luce (es. `ali_membrana_sonica` variant)
- **Trait candidati**: `ali_*` sonic, `ghiandole_inchiostro_luce` (upgrade)
- **LOC**: ~10 (pure penalty in resolveAttack)
- **Risiko**: bassissimo

### Tier 2 (medio rischio, richiede policy update)

#### 3.6 `taunted` (Shaping aggressivo)

- **Categoria**: comportamentale
- **Effetto runtime**: target costretto a usare prossima azione contro `source_unit_id` se in range; altrimenti "approach"
- **Trigger**: trait `aggro_pull` style (Vanguard sinergy)
- **Trait candidati**: nuovo `presenza_dominante`, `aura_di_dispersione_mentale` (variant)
- **Sinergia P5 co-op**: tank pulls aggro per liberare alleati squishy
- **LOC**: ~40 (policy.js target selection override + DM viz)
- **Risiko**: medio-alto (cambia AI behavior)

#### 3.7 `linked` (Resonance) — symbiont mechanic

- **Categoria**: comportamentale
- **Effetto runtime**: damage taken da `linked_to_unit_id` viene mitigato 50% trasferendo l'altra metà a self
- **Trigger**: ability "Symbiotic Bond" (esclusivo job futuro Symbiont)
- **Decay**: linked è permanente fino a death di una delle due
- **LOC**: ~50 (resolver delle pipe damage cross-unit)
- **Risiko**: alto (pipeline damage modificata)

#### 3.8 `swarming` (Resonance offensivo)

- **Categoria**: comportamentale
- **Effetto runtime**: ogni alleato adiacente al target riceve +1 attack_mod sui propri attacchi vs target
- **Trigger**: trait `on hit` di una creature swarmer in melee
- **Trait candidati**: nuovo `feromoni_assalto`, `canto_di_richiamo` variant
- **Sinergia**: SquadSync focus_fire moltiplicatore
- **LOC**: ~25 (consultare adjacency + apply al damage step)
- **Risiko**: medio

### Tier 3 (alto rischio, narrative-bound)

#### 3.9 `infected` (Curse)

- **Categoria**: fisiologico
- **Effetto runtime**: -1 max_hp per `turns` (se 0, recovery a fine encounter)
- **Persistente cross-round**: stato sopravvive 1 encounter intero, decade nel debrief
- **Trigger**: trait `on kill` di parasitic creatures
- **Sinergia**: M14 mutation system trigger evolution path "parasitic"
- **LOC**: ~60 (debrief panel hook + persistenza forme)
- **Risiko**: alto (state cross-encounter)

#### 3.10 `enlightened` (Resonance positivo)

- **Categoria**: comportamentale
- **Effetto runtime**: +1 PE earn rate per `turns` rounds
- **Trigger**: ability "Insight" su MBTI N axis high
- **Sinergia**: P3 progression accelerata
- **LOC**: ~20 (XP grant hook)
- **Risiko**: basso

#### 3.11 `cursed_evolution` (Curse) — narrative

- **Categoria**: comportamentale
- **Effetto runtime**: alla mutation roll successivo, applica trait_swap forzato (no choice)
- **Trigger**: encounter outcome failure + Sistema pressure tier 3+
- **Sinergia**: Disco Elysium-style permanent narrative consequence
- **LOC**: ~30 (mutation engine override)
- **Risiko**: alto (player agency vs narrative weight)

#### 3.12 `attuned` (Resonance squadra)

- **Categoria**: comportamentale
- **Effetto runtime**: tutti gli alleati a Manhattan <= 2 ricevono +1 SG cap (max 4 instead of 3) per `turns`
- **Trigger**: ability di Invoker / Bard-like
- **Sinergia**: P5 co-op SquadSync
- **LOC**: ~25 (SG pool modifier)
- **Risiko**: medio

## 4. Implementation phasing

### Phase A — Tier 1 stati (slowed, marked, burning, chilled, disoriented)

Effort: ~110 LOC backend + 5 trait mechanics esempio. Test coverage:
+5 unit test (uno per stato).

Wave singola, low-risk, additive. Sblocca trait families currently
sotto-rappresentate (occhi*\*, ali*\_ sonic, ghiandole\_\_).

### Phase B — Tier 2 (taunted, swarming)

Effort: ~65 LOC. Test: +4 unit + 1 e2e (taunt vs squad).

Richiede aggiornare `policy.js` AI target selection. Da fare quando si
aggiungono job Vanguard expansion / Beastmaster.

### Phase C — Tier 2 advanced (linked) + Tier 3 (infected)

Effort: ~110 LOC. Test: +6 unit + 1 e2e link, +1 e2e infected debrief.

Sblocca job Symbiont (linked) e M14 parasitic mutation chain (infected).
Richiede design call utente su persistenza cross-encounter.

### Phase D — Tier 3 narrative (enlightened, cursed_evolution, attuned)

Effort: ~75 LOC + narrative engine integration. Test: +4 unit + e2e
narrative branch.

Da fare in parallelo con M14 mutation system + narrative engine inkjs.

## 5. Open design questions

1. **Stack rules**: due fonti di `bleeding` allo stesso target → stackano i turni o refresh? Proposta: refresh max(turns).
2. **Cleanse**: esiste un'azione "purificazione"? Proposta: ability di Warden expansion che rimuove 1 status (player choice).
3. **Visibility**: il client vede status del nemico? Oggi sì (state.units include status). UI gap: HUD per status.
4. **DoT cap**: `bleeding`+`burning`+`infected` su stesso target = 4 PT/turno + 1 max_hp drain. Sano? Proposta: limite 3 status simultanei per unit.
5. **Persistence model**: `infected`/`cursed_evolution` → Prisma write-through o session-only? P0 design call.

## 6. Telemetry hooks proposti

Eventi da emettere via `POST /api/session/telemetry`:

- `status_applied` — `{ stato, source_trait, target_unit_id, turns, round }`
- `status_decayed` — `{ stato, target_unit_id, round_remaining }`
- `status_cleansed` — `{ stato, target_unit_id, source_action }`
- `status_combo` — `{ statuses_present: [...], target_unit_id }` (es. burning+chilled)

## 7. Trait expansion candidates (Phase A unlock)

Nuovi trait_id glossary da aggiungere quando si implementano gli stati Tier 1:

| trait_id             | stato target | famiglia          |
| -------------------- | ------------ | ----------------- |
| `tela_appiccicosa`   | slowed       | new (spider-like) |
| `respiro_acido`      | burning      | aura-like         |
| `feromoni_assalto`   | swarming     | comportamentale   |
| `presenza_dominante` | taunted      | comportamentale   |
| `sussurro_psichico`  | disoriented  | mente             |
| `marchio_predatorio` | marked       | occhi             |
| `aura_glaciale`      | chilled      | aura              |

## 8. Anti-pattern blocklist

- ❌ NON aggiungere stati che si annullano con se stessi (es. "stunned" che azzera "stunned" esistente — confusione UX)
- ❌ NON creare status >5 turni di durata default (visual clutter HUD)
- ❌ NON applicare status senza damage_modifier coerente (un trait "deve fare qualcosa di numerico" oltre lo status, altrimenti player feel "wasted action")
- ❌ NON inventare effect.kind nuovi senza prima validare runtime support (errore tipico: "kind: heal_target" → silenzioso fail)

## 9. References

- **Slay the Spire**: powers stack additivi (per turni o intensità)
- **XCOM 2 Long War**: bleeding+stunned+disoriented combo a cascata
- **Path of Exile**: ailment ratio system (chill+freeze chain)
- **Into the Breach**: telegraph 1-turn anticipation (stunned simile)
- **Disco Elysium**: narrative permanent status (cursed_evolution inspiration)

## 10. Cross-references

- `apps/backend/services/traitEffects.js` (evaluator)
- `apps/backend/services/ai/policy.js` (policy reactions)
- `apps/backend/routes/session.js` performAttack (status mutation point)
- `data/core/traits/active_effects.yaml` (89 trait mechanics post 2026-04-25)
- `data/core/traits/glossary.json` (275 entries post 2026-04-25)
- `docs/core/10-SISTEMA_TATTICO.md` (canonical status spec)
