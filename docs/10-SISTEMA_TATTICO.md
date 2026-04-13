# Sistema Tattico (TV/d20)

## Economia del turno

- **Iniziativa**: CT a scatti; VEL puo' concedere riprese extra.
- **Economia azioni**: 2 AP (movimento/azione) + **Reazioni** (parry/counter/overwatch). AP si resetta a inizio turno (`ap.current = ap.max`).
- **Terreno/Altezze/Facing**: backstab da spalle; coperture; linee di tiro chiare.

## Tiro di attacco

Formula della CD (Classe Difficolta'):

```
CD = ATTACK_CD_BASE + target.tier + defense_mod_aggregato_target
```

dove `ATTACK_CD_BASE = 10`. Il tiro d20 dell'attaccante somma `attack_mod` aggregato dai trait attivi. Crit e fumble hanno override assoluto:

- **Nat 1** (fumble): fallimento automatico, indipendente dal totale.
- **Nat 20** (crit): successo automatico, anche se `total < CD`.

## MoS (Margin of Success) e step danno

```
MoS = max(0, total - CD)       (solo se successo)
step_count = MoS // 5 + trait_damage_step_bonus
```

Ogni step aggiunge un bonus piatto al danno rollato:

```
step_flat_bonus = floor(avg_base * 0.25 * step_count)
avg_base = count * (sides + 1) / 2 + modifier
```

dove `count`, `sides`, `modifier` vengono dal `damage_dice` dell'azione (es. 1d6+2).

## Pipeline danno

Ordine di applicazione dopo un attacco riuscito:

1. **Roll base**: tira `damage_dice` (XdY+Z).
2. **Step bonus**: somma il bonus piatto da step danno.
3. **Resistenze** (moltiplicative): `floor(danno * (1 - modifier_pct / 100))`. Il `modifier_pct` e' clampato a `[-100, +100]`.
4. **Armor** (DR-style): `max(0, danno_dopo_resist - armor)`.
5. Aggiorna HP del target.

Se la spesa PT "perforazione" e' attiva, l'armor effettivo e' ridotto di 2 (`PERFORAZIONE_ARMOR_REDUCTION`) solo per quel tiro.

## Punti Tecnica (PT)

Accumulo per attacco riuscito:

| Condizione              | PT guadagnati |
| ----------------------- | ------------- |
| Nat 15-19               | +1            |
| Nat 20                  | +2            |
| Ogni +5 di MoS sulla CD | +1            |

Costanti di soglia: `CRIT_PT_THRESHOLD = 15`, `NATURAL_MAX = 20`, `MOS_PER_STEP = 5`.

### Spese PT supportate

- **Perforazione**: costa PT, riduce armor del target di 2 per il tiro corrente. Il consumo avviene **prima** del roll — anche un fumble spreca i PT caricati.
- Spinte, condizioni, combo: rimandate a iterazioni future.

## Parata reattiva

Il target puo' tentare una parata se ha reazioni disponibili (`reactions.current > 0`). Consuma 1 reazione e tira d20 vs `PARRY_CD = 12`.

- **Successo**: riduce `step_count` di 1, genera `PARRY_PT_BASE = 1` PT difensivi (o `PARRY_PT_CRIT = 2` su nat 20).
- **Fallimento**: reazione consumata, nessuna riduzione.

## Status

### Fisici

- **Sanguinamento** (bleeding): `-intensity` HP a inizio turno del portatore.
- **Frattura** (fracture): `-intensity` allo `step_count` degli attacchi del portatore.
- **Disorientamento** (disorient): `-intensity * 2` all'`attack_mod` del portatore.

### Mentali

- **Furia** (rage): triggerata al breakpoint stress `>= 0.50` (durata 3 turni). Effetti gameplay futuri.
- **Panico** (panic): triggerato al breakpoint stress `>= 0.75` (durata 2 turni). Effetti gameplay futuri.

Semantica di refresh: se lo status e' gia' presente, `remaining_turns = max(esistente, nuovo)` e `intensity = max(esistente, nuovo)`. Lo stress e' un float `[0, 1]`; i breakpoint scattano una sola volta per transizione.

## Inizio turno (`begin_turn`)

1. Reset `ap.current = ap.max` e `reactions.current = reactions.max`.
2. Tick bleeding: ogni status bleeding attivo sottrae `intensity` HP (prima del decay).
3. Decay: tutti gli status perdono 1 turno; quelli con `remaining_turns <= 0` vengono rimossi.

## Riferimenti

- Resolver: `services/rules/resolver.py`
- ADR: `docs/adr/ADR-2026-04-13-rules-engine-d20.md`
- Layer bilanciamento: `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`
