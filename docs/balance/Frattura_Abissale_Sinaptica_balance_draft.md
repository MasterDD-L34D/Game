---
title: 'Frattura Abissale Sinaptica – Step 6 (Bilanciamento, STRICT MODE / SANDBOX)'
description: 'Output balancer: numeri proposti per le 4 specie, forme dinamiche del Leviatano e parametri dei trait temporanei, senza modificare i dataset'
---

## Piano sintetico (3–7 punti)

1. Ancorare i range numerici ai role_templates dei pool (tier 2–5) e al sistema TV/d20, mantenendo margini per future iterazioni.
2. Stimare HP/Armor/Resist e scaling attacco/abilità per ciascuna specie, coerenti con il loro ruolo e biome_affinity.
3. Definire slot core/support/temp agganciati ai trait_plan di Step 5, con limiti anti-stacking dei buff bioma.
4. Stabilire pesature di difficoltà (tier) e impatti del bioma: stacking massimo, durate, cooldown dei bonus ambientali.
5. Modellare la doppia forma del Leviatano con trigger chiari (stress/correnti), costi e limiti di cumulazione.
6. Quantificare i trait temporanei da corrente (durata/intensità/stack) e bloccare interazioni vietate.
7. Fornire note per Step 7 su validazioni cross-dataset (schemi, alias, coerenza tra pool e trait_plan).

## Parametri specie (strict-mode, non scrivere nei dataset)

### Polpo Araldo Sinaptico (support, tier 3 keystone)

- **HP / Armor / Resist:** 90–110 HP; Armor 4–6 (biologica conduttiva); Resist: elettrico +20%, psionico +10%, fisico 0.
- **Attacco/Abilità:** attacco base 1d8+3 elettrico (melee tentacolare); abilità di buff area scaling su WIS/CON con coeff 0.6; CD effetti bioluminescenti 14–15.
- **Slot (core/support/temp):** 3 core, 3 support, 1 temp (dedicato a scintilla_sinaptica o canto_risonante).
- **Pesatura difficoltà (tier):** Tier 3 (keystone) allineato al pool fotofase_synaptic_ridge.
- **Effetti numerici dal bioma:** buff luminosi stackano max 2 volte; correnti concedono 1 temp_trait attivo; glow advantage dura 2 turni, cooldown 3.

### Sciame di Larve Neurali (swarm, tier 3 threat)

- **HP / Armor / Resist:** 45–60 HP per unità cluster; Armor 2–3; Resist: mentale +15%, elettrico +10%, fisico -10% (fragile), fuoco -15%.
- **Attacco/Abilità:** attacchi rapidi 1d6+2 (triplo strike a MoS alto); abilità furto buff CD 15 con coeff 0.5 su INT; applica 1 stack di stress 0.05 su successo.
- **Slot (core/support/temp):** 4 core, 2 support, 1 temp (riverbero_memetico o vortice_nera_flash).
- **Pesatura difficoltà (tier):** Tier 3 threat in linea con crepuscolo_synapse_bloom.
- **Effetti numerici dal bioma:** può sequestrare 1 buff/cluster attivo (max 2 totali); duplicazione ridotta al 50%; durata buff rubato 2 turni; cooldown furto 3 turni; se sovraccarico (≥3 stack), subisce 0.05 stress/turno.

### Leviatano Risonante (boss, tier 5 apex)

- **HP / Armor / Resist:** 280–320 HP; Armor 10–12 (placche pressioni); Resist: fisico +20%, elettrico +30%, gravità +30%, psionico +15%.
- **Attacco/Abilità:** attacchi principali 2d12+6 (danno elettrico/gravitazionale); abilità d’onda con coeff 0.75 su CON/INT; aura risonante impone SV CD 17 (stress 0.08) ogni 2 turni.
- **Slot (core/support/temp):** 4 core, 4 support, 2 temp (pelle_piezo_satura + canto_risonante/vortice_nera_flash in base alla forma).
- **Pesatura difficoltà (tier):** Tier 5 apex coerente con frattura_void_choir.
- **Effetti numerici dal bioma:** ottiene +10% danno elettrico e +1 DR vs shear in Frattura Nera; corrente attiva permette 1 switch forma senza costo (cooldown 4 turni minimo).

### Simbionte Corallino Riflesso (ibrido, tier 3–4 flex)

- **HP / Armor / Resist:** 95–115 HP; Armor 5–7; Resist: elettrico +15%, psionico +15%, fisico +5%, gravità 0.
- **Attacco/Abilità:** attacco medio 1d10+3 (taglio/ionico); abilità copia trait con CD 15 e coeff 0.55 su INT; copia ridotta al 50–75% efficacia per 2 turni.
- **Slot (core/support/temp):** 3 core, 3 support, 1 temp (scintilla_sinaptica o riverbero_memetico per copia rapida).
- **Pesatura difficoltà (tier):** Tier 3.5 (tra keystone e threat) per gestire copia e supporto.
- **Effetti numerici dal bioma:** può mantenere 1 trait copiato alla volta; ricopiazione richiede cooldown 3 turni; se copia un temp_trait, l’effetto è limitato al 50% e dura max 1 turno.

## Leviatano Risonante – Forma variabile

### Modalità Armonica (difesa/stabilità)

- **Bonus difensivi:** +2 Armor, +10% Resist psionica, riduzione danni area -20%.
- **Riduzione stress:** -0.04 stress ricevuto/turno; immunità a spostamenti minori.
- **Buff concentrazione:** vantaggio a prove di concentrazione e mantenimento canali risonanti.
- **Costo/Cooldown:** attivazione 1 AP; mantiene per 3 turni; cooldown 4 turni; se stress ≥ 0.6, costo aggiuntivo 1 stack fatigue.

### Modalità Shear (offensiva/controllo spazio)

- **Controllo_spazio:** spinte/attrazioni 2 celle; crea linea shear che infligge 2d10+5 elettrico/gravitazionale.
- **Elettrico/gravitazionale:** +15% danni elettrici; abilità shear impone SV CD 17 (prone/disorient).
- **Penalità ondata / rischio riflusso:** subisce +0.04 stress/turno e -1 Armor mentre attiva; se fallisce SV su overload, perde 1 temp_trait attivo.
- **Costo/Cooldown:** attivazione 1 AP + 0.05 stress; dura 2 turni; cooldown 3 turni.

### Trigger di cambio forma e regole anti-stacking

- **Trigger via stress:** se stress ≥ 0.5, può forzare Shear pagando 0.05 stress extra; se stress ≤ 0.25, può passare ad Armonica gratis 1/encounter.
- **Trigger via correnti elettroluminescenti:** una corrente attiva concede 1 switch free (non consuma AP) ma impone cooldown minimo 4 turni.
- **Regole anti-stacking:** non può avere Armonica e Shear sovrapposte; temp_traits simultanei limitati a 2; canto_risonante + pelle_piezo_satura insieme riducono la durata di entrambi di 1 turno; riverbero_memetico non può duplicare abilità di forma.

## Parametri numerici dei trait temporanei (correnti)

| trait_temp          | durata  | intensità (effetto)                                   | limite stack | interazioni proibite                                                                             |
| ------------------- | ------- | ----------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| scintilla_sinaptica | 2 turni | +1 priorità reazioni, +5% crit su abilità elettriche  | 2            | non cumulabile con boost iniziativa da altre fonti; niente duplicazione da riverbero_memetico    |
| riverbero_memetico  | 1 turno | duplica prossimo buff positivo ma -10% difesa mentale | 1            | non duplica buff già duplicati; vietato su canto_risonante e pelle_piezo_satura                  |
| pelle_piezo_satura  | 3 turni | -15% danni fisici, 5 danni elettrici da contatto      | 1            | non stacka con altre riduzioni fisiche >10%; se attivo con Armonica riduce durata a 2 turni      |
| canto_risonante     | 2 turni | vantaggio concentrazione, -0.02 stress incoming       | 1            | non cumulabile con altri effetti di vantaggio concentrazione; riverbero_memetico non applicabile |
| vortice_nera_flash  | 1 turno | teletrasporto 1 cella, azzera minaccia, +5 stress     | 1            | no loop di teletrasporto; non può essere copiato più volte dal Simbionte nel medesimo incontro   |

## Self-critique

- **Coerenza con sistema D20 TV:** i range seguono tier e CD tipici (14–17 per controllo, danni 1–2d12 per boss), ma vanno validati con game_functions e PT economy.
- **Rischi di power creep:** stacking di buff luminosi + concentrazione può alzare troppo la difesa del gruppo; limitati stack e durata, ma serve ribilanciare dopo playtest.
- **Vulnerabilità numeriche:** Sciame fragile a danni fisici/ustione; Leviatano può risultare eccessivo in Shear se non si applicano i costi di stress; Simbionte potrebbe abusare di copie se i cooldown non sono rigidi.
- **Note per Step 7:** verificare compatibilità con data/core/game_functions.yaml (stress, DR, CD); allineare tier con role_templates dei pool; aggiungere controlli su glossary/index per evitare trait_temp duplicati.
