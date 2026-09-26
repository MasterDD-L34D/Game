---
title: '75 design questions — raw list per batch response'
workstream: planning
category: retrospective
status: published
owner: master-dd
created: 2026-04-20
tags:
  - audit
  - open-questions
  - user-input-needed
related:
  - docs/planning/2026-04-20-design-audit-consolidated.md
---

# 75 design questions — raw batch list

Lista flat estratta da 4-agent deep audit. User risponde per priority batch. Ogni Q = 1 design decision necessaria per unblock implementation.

**Format risposta**: `Q1: <opzione|valore>` per ogni question. Brevi OK.

## 🔴 BLOCKING P0 (8)

**Campaign structure**:

- Q46 Save storage: SQLite locale / NeDB / Prisma / Cloud?
- Q47 Campaign branching: lineare 1-2 scelte binarie / full DAG?
- Q50 Encounter unlock: sequenziale post-tutorial / open-world selezionabile?

**Economia contradictions**:

- Q11 Affinity/Trust scale canonical: ±3 (Mating) O ±2/0..5 (Freeze)?
- Q54 PP max: 3 (Freeze §7.2) O ≥10 per Ultimate (combat.md:117)?
- Q51 PT reset: per-turn O per-round?

**Character progression**:

- Q56 Tier advancement costo: PE amount / kill count / encounter count?
- Q58 Level cap MVP shipping: elite / mythic?

## 🟡 HIGH P1 (16)

**Economia earning + flow**:

- Q16 PE per encounter: tutorial=3 / standard=5 / elite=8 / boss=12 canonical?
- Q17 PE accumulabili cap: soft 18 (telemetry.yaml) O hard? Overflow perso?
- Q19 PE→PI checkpoint trigger: ogni mission / bioma clear / tier unlock?
- Q55 PE win/draw/loss differenziati? Style bonus stackable?

**Sistema pressure + Form**:

- Q1 Pressure visibile HUD O hidden (AI War vs Slay Spire)?
- Q21 Forma innata immutable O shifting mid-campagna?
- Q22 Form shift threshold numerica (es. asse > 0.7 per N round) + hysteresis?
- Q26 Ennea trigger condition complete per 6 archetipi?
- Q27 Ennea buff valori specifici (numeri, non strings)?

**Combat edge cases**:

- Q6 Focus-fire chain cap: 2p/3p/4p saturation?
- Q31 Reaction cap 1/actor canonizzare doc? Trait multi_reaction esiste?
- Q36 Hazard damage scaling per bioma tier O flat per type?
- Q37 Hazard permanente O temporaneo N turn?
- Q66 stress_modifiers (sandstorm: 0.06) unità: +0.06/turn StressWave / multiplier / additive CD?

**Meta progression**:

- Q41 Squad trust distinto da NPG trust?
- Q61 Reclutamento d20: probabilistico (DC vs tier) O threshold deterministico?

## 🟢 MEDIUM P2 (51)

**Pressure semantics**:

- Q2 Pressure_relief actions concrete oltre placeholder?
- Q3 round_decay sempre O solo zero-delta?
- Q4 Pressure per-sessione O per-campagna?
- Q5 Range 95-100 ulteriore tier hidden O stesso Apex?

**Focus-fire**:

- Q7 Diminishing returns formula?
- Q8 bonus_damage flat O damage_step?
- Q9 Valido su ability O solo attack?
- Q10 Cross-round O within-round strict?

**Mating d20**:

- Q12 Dialogo DC formula (`DC = 10 + target.npg_tier − player.social_mod`)?
- Q13 Dialogo AP cost in-match O hub-only?
- Q14 Reclutamento cooldown tra tentativi?
- Q15 "2 prove narrative" numerically definite?

**PI Pacchetti**:

- Q18 PE spending window: Nido / debrief d20 / both?
- Q20 Pack H "PE ×7" intentional su budget 11?

**Form transitions**:

- Q23 Form shift costo PE/PI/seed?
- Q24 Forma primaria + sub-form O mutex?
- Q25 Doc semantica `mbti_forms.yaml` (baseline+affinità+penalità)?

**Ennea effects**:

- Q28 Archetipi stackable O mutex?
- Q29 Buff duration: round / encounter / campagna?
- Q30 Apply round 0? Reset retreat/TPK?

**Reactions**:

- Q32 parry_bonus scaling (stat/trait/default)?
- Q33 overwatch_range = attack_range O dedicated?
- Q34 Intercept `ally_attacked_NON-adjacent` behavior?
- Q35 Reaction stacking (parry+counter) O mutex?

**Hazard**:

- Q38 Applica status in aggiunta damage?
- Q39 Passa species_resistances O ignora?
- Q40 Hazard/bleeding/status_decay order?

**Squad trust**:

- Q42 Unità misura scale?
- Q43 Gate numerici sbloccano cosa?
- Q44 Earn formula (assist/save/co-kill)?
- Q45 Decay su TPK/retreat/swap?

**Campaign specifics**:

- Q48 TPK granularity (bioma/intero/checkpoint)?
- Q49 PG permadeath cross-encounter?

**Economy PT/SG/Seed**:

- Q52 SG accumulation formula (dmg dealt/received)?
- Q53 Seed generation rate per harvester ability?

**Character progression detail**:

- Q57 Tier advancement stat_bump formula O solo trait slot?
- Q59 Perk choice: N pacchetti O auto-grant?
- Q60 Permadeath PG elite: cosa si perde?

**Reclutamento detail**:

- Q62 Recruit DC scales tier/biome/pressure?
- Q63 Fail state (scappa/ostile/retry)?
- Q64 Convertible tag % NPG?
- Q65 In-encounter O post-encounter only?

**Biome detail**:

- Q67 stresswave.escalation_rate formula?
- Q68 event_thresholds quali eventi?
- Q69 Affix bias modifica spawn numerically?
- Q70 hazard.severity low/medium/high mapping numerico?

**Timeout/defeat**:

- Q71 Timeout turn_limit scaduto: fail / partial / stretch bonus malus?
- Q72 TPK exact def (0 unità O leader down)?
- Q73 Retreat volontario opzione + penalty?
- Q74 Sopravvivenza grace turn se party wiped round N?
- Q75 Escort fail istantaneo O downed+revive window?

---

## Format risposta suggerito

```
# Risposta batch P0
Q46: Prisma (campagna persistente cross-session)
Q47: Lineare con 1-2 scelte binarie (Descent pattern)
Q50: Sequenziale rigido post-tutorial M9-M11
Q11: Freeze (-2..+2 Affinity, 0..5 Trust). Mating doc va aggiornato.
Q54: PP max 3 canonical. Ultimate "≥10" era errore combat.md (costo 3 PP stackato 3 turni? chiarire)
Q51: Per-round (round-model canonical)
Q56: PE amount: 20/40/80/160 (elite→mythic)
Q58: Elite max MVP. Mythic locked post-release.

# Risposta P1 (può arrivare dopo)
Q16: Conferma canonical
...
```

User risponde solo quando vuole. Ogni P0 risposto sblocca implementation relativa.
