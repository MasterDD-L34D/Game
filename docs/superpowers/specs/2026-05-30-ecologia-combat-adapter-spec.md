---
title: 'Adapter ecologia -> combat: spec (TKT-ADAPTER-ECO-COMBAT, keystone Wave 3)'
workstream: flow
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: 2026-06-20
language: it
tags: [worldgen, species, combat, ecologia, adapter, foodweb, calibration, spec, keystone]
---

# Adapter ecologia -> combat -- spec

> Spec di design (review master-dd PRIMA di implementare). Keystone di Wave 3 del
> [gap-resolution-plan](../../planning/2026-05-30-design-data-gap-resolution-plan.md) (D3b adapter-first),
> nasce dal [census ecologia-combat](2026-05-30-ecologia-combat-disconnect-strategy.md) (#2454):
> 0/53 specie canoniche hanno `hp/mod/dc`, solo 6 tutorial. Questo adapter e il ponte mancante.

## 0. TL;DR (per decidere in 30s)

- **Cosa**: funzione deterministica `specie-ecologica -> stat combat` (hp/mod/dc/guardia/...) cosi gli
  scenari girano su specie reali invece di creature inventate inline.
- **Come**: `threat_tier` + `role_class` (da `role_trofico`) -> stat base via tabelle; i `genetic_traits.core`
  passano through e l'esistente `traitEffects.js` applica i modifier a runtime (NO doppio conteggio).
- **Le tabelle base = knob di calibrazione** (tunate N=40, riusa `calibrate_parallel.py`).
- **Pilota**: 1 NUOVO encounter badlands (7 specie reali). **NON tocca hardcore_06/07** (bande ratificate).
- **Determinismo**: stesso input -> stesso output (no RNG nell'adapter; il combat resta stocastico a valle).

## 1. Output contract (oggetto creatura consumato dal combat)

Schema verificato da `tutorial/*.yaml` + `hardcoreScenario.js` (consumo). L'adapter produce i campi
**stat**; i campi di **staging** (position/facing/elevation/controlled_by) li mette l'autore dell'encounter.

```
{
  id: string,              // species_id
  species: string,         // ref species_id
  hp: number,              // ADAPTER. tutorial range 3-11
  ap: number,              // ADAPTER default 2 (3 se skirmisher/boss)
  mod: number,             // ADAPTER. tutorial 2-3 (BASE, pre-trait)
  dc: number,              // ADAPTER. tutorial 11-13
  guardia: number,         // ADAPTER. tutorial 0-1
  attack_range: number,    // ADAPTER. tutorial 1-2
  traits: string[],        // ADAPTER passthrough = genetic_traits.core
  job: string,             // ADAPTER passthrough = jobs_bias[0] (se presente)
  // --- staging (NON adapter, encounter-author) ---
  position: {x, y}, facing, controlled_by, ai_profile, elevation
}
```

I trait NON vengono bakati nelle stat: `traitEffects.js` gia applica `attack_mod/defense_mod/damage_step/
resistances` a runtime dalla lista `traits` (per tutorial + inline). L'adapter li passa e basta.

## 2. Input contract

Per specie, da `species-canonical-index.json` (SOT) + il file `data/species/<bioma>/<id>.yaml`:

| Campo                 | Fonte                  | Uso adapter                      |
| --------------------- | ---------------------- | -------------------------------- |
| `threat_tier` (T0-T5) | canonical-index        | chiave primaria stat base        |
| `role_trofico`        | canonical-index / yaml | -> `role_class` (tabella sez. 4) |
| `genetic_traits.core` | yaml per-bioma         | passthrough -> `traits[]`        |
| `jobs_bias`           | yaml per-bioma         | passthrough -> `job`             |
| `morphotype` / size   | yaml per-bioma         | `attack_range` + `ap` (sez. 3.5) |

Distribuzione `threat_tier` (53 specie): T0=1, T1=22, T2=16, T3=6, T4=5, T5=3.

## 3. Formula (deterministica; le tabelle sono KNOB)

### 3.1 HP

```
hp = round( KNOB_HP_BASE[threat_tier] * KNOB_ROLE_HP_MULT[role_class] )
```

`KNOB_HP_BASE` (ancorato al ground-truth tutorial T1~4 / T2~7 / T3=11):

| tier | T0  | T1  | T2  | T3  | T4  | T5  |
| ---- | --- | --- | --- | --- | --- | --- |
| hp   | 2   | 4   | 7   | 11  | 16  | 22  |

> T4/T5 = **estrapolati** (nessun ground-truth tutorial). FLAG-1: validare/tunare quando un T4/T5 entra in pilota.

### 3.2 mod / dc

```
mod = KNOB_MOD_BASE[threat_tier]                       // BASE pre-trait; traitEffects aggiunge a runtime
dc  = KNOB_DC_BASE[threat_tier] + KNOB_DC_ROLE_ADJ[role_class]
```

| tier     | T0  | T1  | T2  | T3  | T4  | T5  |
| -------- | --- | --- | --- | --- | --- | --- |
| MOD_BASE | 1   | 2   | 2   | 3   | 3   | 4   |
| DC_BASE  | 10  | 11  | 12  | 13  | 14  | 15  |

`KNOB_DC_ROLE_ADJ`: APEX +1, altri 0.

### 3.3 guardia

```
guardia = KNOB_GUARDIA_BASE[threat_tier] + KNOB_GUARDIA_ROLE_ADJ[role_class]
```

`KNOB_GUARDIA_BASE`: T0-T2 = 0, T3 = 1, T4 = 1, T5 = 2. `ROLE_ADJ`: TANK +1, altri 0.

### 3.4 ap

`ap = 2` default; `3` se `role_class in {SKIRMISHER}` o `encounter_role == boss`. (tutorial: tutti 2, boss 3.)

### 3.5 attack_range (morphotype)

`1` melee default; `2` se morphotype volatore/ranged; `3` riservato boss/special (encounter-author).
FLAG-2: i file per-bioma non hanno un campo `morphotype` pulito uniforme -> derivare da euristica
size/traits OPPURE default 1 + override encounter-author. Da decidere in impl.

## 4. Mappa `role_trofico` -> `role_class`

`role_trofico` ha 11+ valori; bucket in 6 `role_class` (tabella dati, estendibile):

| role_class | role_trofico (esempi)                                                                          | effetto                    |
| ---------- | ---------------------------------------------------------------------------------------------- | -------------------------- |
| APEX       | `predatore_apex_boss`, `predatore_terziario_apex`                                              | HP_MULT 1.15, DC +1        |
| TANK       | `difensore_territoriale`, `predatore_tutorial_tank`                                            | HP_MULT 1.30, guardia +1   |
| PREDATOR   | `predatore_tutorial_secondario`, `predatore_acquatico_agile`, `predatore_regolatore_simbionte` | HP_MULT 1.00 (baseline)    |
| PREY       | `erbivoro_primario`, `dispersore_ponte`                                                        | HP_MULT 0.90               |
| SUPPORT    | `ingegneri_ecosistema`, `scavenger`                                                            | HP_MULT 1.00, (mod -1 opt) |
| HAZARD     | `minaccia_microbica`, `evento_ecologico`                                                       | HP_MULT 0.80               |

`KNOB_ROLE_HP_MULT` = la colonna HP_MULT (default 1.00 per role non mappato). **Tutti tunabili N=40.**

## 5. Gap Explore risolti (5/7) + knob aperti (2)

Risolti dal design (l'adapter LEGGE dati esistenti, non inventa):

- **Trait selection**: NON seleziona -- legge `genetic_traits.core` esistente. (gap 6)
- **role -> job**: passthrough `jobs_bias`, ortogonale. (gap 5)
- **Elevation**: encounter-author, non adapter. (gap 7)
- **Trait -> stat**: applicati a runtime da `traitEffects.js`, non bakati. (gap 1 parziale)
- **mod derivation**: base-by-tier, trait a runtime. (gap 2 parziale)

Knob aperti (FLAG, tunati in pilota):

- **FLAG-1**: baseline T4/T5 (estrapolati, no ground-truth).
- **FLAG-2**: `attack_range` morphotype (no campo pulito) + domanda base-vs-post-trait sui valori tutorial
  (se i mod/dc autorali tutorial sono gia post-trait -> lieve doppio-conteggio per specie-adapter; il
  pilota N=40 lo rivela, si corregge KNOB_MOD_BASE).

## 6. Pilota (badlands) -- scope

- **NUOVO** encounter `enc_badlands_pilot_01` (o adatta un encounter tutorial-tier NON-band-ratificato).
  **MAI** hardcore_06/07 (bande ratificate 15-25% / 30-50%, anti-pattern census 5).
- Nemici = 4-6 delle 7 specie badlands piene (dune-stalker T3, rust-scavenger T1, sand-burrower T1,
  echo-wing T1, ferrocolonia T2, nano-rust-bloom T3) popolate via adapter.
- Verifica **GAP-A**: le specie sono nel foodweb badlands -> il filter le ACCETTA (non `all_excluded_fallback`).
- Banda target pilota: proposta **[40-60%]** (medium fresco). Da ratificare master-dd; tunata N=40.

## 7. Calibrazione (knob -> banda)

Riusa `tools/py/calibrate_parallel.py` (+ `--seed/--policy`). Disciplina lezioni:

- **L-069/L-073**: band-placement = **N=40** (objective N>=40, mai claim da N=10).
- **L-072**: tra cambi-knob, **N=10 direction probe** (confronta vs baseline prior, non target).
- **L-070**: NO multi-knob senza predire joint-effect; preferire 1 knob/iter.
- Knob ordine consigliato: HP_BASE -> ROLE_HP_MULT -> MOD_BASE/DC_BASE -> guardia.
- Determinismo adapter: smoke band-neutrality OK (stesso input -> stesso output; varianza = solo combat RNG).

## 8. Quality Gate (acceptance)

- **Step 1 smoke**: `adapter(badlands_species[i])` -> oggetto schema-valido per ogni specie pilota;
  determinismo (2 run identiche); sanity: i 6 input tutorial -> output dentro range tutorial (hp 3-11 etc.).
- **Step 2 ricerca (>=3 edge)**: specie con `ecology: null`; specie 0-trait; T4/T5 (FLAG-1); biome-alias
  (cryosteppe/deserto_caldo non top-level, #2455); specie-stub.
- **Step 3 tuning**: pilota N=40 dentro banda; delta knob before/after documentato (`docs/research/`).

## 9. Anti-pattern (da census 5 + calibration cluster)

- NO rinominare creature-scenario con id specie-stub vuote.
- NO inventare creature inline (peggiora buco-orfani).
- NO toccare bande hardcore_06/07 senza N=40 (questo pilota usa banda NUOVA, separata).
- NO claim banda da N=10 (L-069); NO multi-knob overshoot (L-070); NO optimizer su N<40 (L-073).
- NO bakare i trait nell'adapter (doppio conteggio vs `traitEffects.js`).

## 10. Effort + fasi

| Fase                                        | Output                            | Effort |
| ------------------------------------------- | --------------------------------- | ------ |
| Impl adapter (modulo + tabelle knob + test) | `ecologyCombatAdapter.js` + unit  | ~M     |
| Encounter pilota badlands                   | `enc_badlands_pilot_01` + staging | ~S     |
| Calibrazione N=40 (knob -> banda)           | banda hit + research doc delta    | ~M     |
| Generalizzazione (altri biomi gameplay)     | post-pilota, gated review         | TBD    |

## 11. Riferimenti

- Census (origine): [`2026-05-30-ecologia-combat-disconnect-strategy.md`](2026-05-30-ecologia-combat-disconnect-strategy.md) #2454
- Plan (D3b adapter-first): [`../../planning/2026-05-30-design-data-gap-resolution-plan.md`](../../planning/2026-05-30-design-data-gap-resolution-plan.md) #2456
- Output/input verificati: `data/species/tutorial/*.yaml`, `apps/backend/services/hardcoreScenario.js`, `docs/catalog/species-canonical-index.json`, `data/species/badlands/*.yaml`, `data/balance/trait_mechanics.yaml`
- Calibrazione: [`../../process/CANONICAL-AI-PLAYTEST.md`](../../process/CANONICAL-AI-PLAYTEST.md) + `tools/py/calibrate_parallel.py`
- Lezioni calibrazione: L-069 (N=10 noise), L-070 (multi-knob overshoot), L-072 (N=10 direction probe), L-073 (optimizer-on-noise)
