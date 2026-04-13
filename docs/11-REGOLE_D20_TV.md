# Adattamento TV/d20 — Esempi concreti

## Interfaccia TV

- **Schermo condiviso** (app/sito TV): stato gruppo, mappa, log VC, consigli sblocchi.
- **Dadi**: d20 centrale; dadi "Descent-like" mappati su spese PT/PP (icona e pattern).
- **Condivisione tavolo**: ogni turno produce **eventi grezzi** per VC (no quiz).
- **Privacy**: toggle "profilazione stile" (on/off); reset profilo (amnesia evolutiva).

## Esempio: attacco con MoS e step danno

Scenario: attaccante con `attack_mod = +1` (trait offensivo) contro un target tier 2 con `defense_mod = +1`.

```
CD = 10 + 2 (tier) + 1 (defense_mod) = 13
Tiro: d20 naturale 18 + 1 (attack_mod) = 19
Successo (19 >= 13), MoS = 19 - 13 = 6
step_count = 6 // 5 + 1 (trait damage_step) = 2
```

Con `damage_dice = 1d6+2` (avg_base = 5.5):

```
step_flat_bonus = floor(5.5 * 0.25 * 2) = floor(2.75) = 2
Danno rollato: 4 (1d6) + 2 (mod) + 2 (step bonus) = 8
```

## Esempio: resistenze e armor

Target con resistenza `fuoco +20%` e armor 4. Attacco di canale `fuoco`:

```
Danno pre-resist = 8
Dopo resistenza: floor(8 * (1 - 20/100)) = floor(6.4) = 6
Dopo armor: max(0, 6 - 4) = 2
HP persi: 2
```

## Esempio: accumulo PT

| Tiro naturale | MoS | PT guadagnati | Ragione                       |
| ------------- | --- | ------------- | ----------------------------- |
| 12            | 3   | 0             | Sotto soglia 15, MoS < 5      |
| 16            | 8   | 2             | +1 (nat 15-19) + 1 (MoS >= 5) |
| 20            | 14  | 4             | +2 (nat 20) + 2 (MoS >= 10)   |
| 1             | 0   | 0             | Fumble, fallimento automatico |

Costanti: `CRIT_PT_THRESHOLD = 15`, `NATURAL_MAX = 20`, `MOS_PER_STEP = 5`.

## Esempio: parata reattiva

Target con 1 reazione disponibile. L'attacco ha successo con 2 step danno.

```
Parry: d20 naturale 14 + 0 (bonus) = 14 >= PARRY_CD (12)
Successo! step_count ridotto: 2 - 1 = 1
PT difensivi: +1 (PARRY_PT_BASE)
```

Su nat 20 della parata: `+2 PT difensivi` (PARRY_PT_CRIT).

## Esempio: spesa PT perforazione

Attaccante con 3 PT carica "perforazione" (costa 2 PT). Target ha armor 6.

```
PT prima: 3, dopo spesa: 1
Armor effettivo: 6 - 2 (PERFORAZIONE_ARMOR_REDUCTION) = 4
```

Se il tiro fallisce (nat 1 fumble), i 2 PT sono comunque consumati.

## Esempio: status trigger su attacco

Attaccante con trait `spore_psichiche_silenziate` (on_hit_status: disorient, trigger_dc 12, on_hit_stress_delta: +0.05). Attacco riuscito:

```
Stress target prima: 0.45, delta: +0.05
Stress dopo: 0.50 -> breakpoint rage! Rage applicata (intensity 1, durata 3)

SV target vs disorient: d20 = 8 < trigger_dc (12)
Fallito! Disorient applicato (intensity 1, durata 2)
```

## Riferimenti

- Resolver e costanti: `services/rules/resolver.py`
- Schema combat: `packages/contracts/schemas/combat.schema.json`
- ADR: `docs/adr/ADR-2026-04-13-rules-engine-d20.md`
