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

## Assunzioni di bilanciamento

- Referenza di potenza: role_templates tier 2–5 del TV/d20, con CD controllo 14–17 e danni single-target per boss 2d12 baseline.
- Economy: 1 AP per switch forma o attivazioni di stato; stress scala come metrica di rischio (0–1) con breakpoints 0.25/0.5/0.75.
- Biomi: buff luminosi e correnti sono trattati come temp_trait; stacking limitato per prevenire power creep e loop di copia.

## Parametri specie (strict-mode, non scrivere nei dataset)

### Polpo Araldo Sinaptico (support, tier 3 keystone)

| metrica                | valore base                                                                                 | range PT (sicurezza) | note                                             |
| ---------------------- | ------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------ |
| HP / Armor / Resist    | 100 HP / Armor 5 / Resist: elettro +20%, psionico +10%, fisico 0                            | 95–110 HP; Armor 4–6 | margine per build più tanky con parti conduttive |
| Attacco base / abilità | 1d8+3 elettrico; abilità AoE coeff 0.6 su WIS/CON; CD 14                                    | CD 14–15             | coeff 0.6 mantiene utility senza burst           |
| Slot core/support/temp | 3 / 3 / 1 (slot temp riservato a scintilla_sinaptica o canto_risonante)                     | invariato            |                                                  |
| Impatto bioma          | buff luminosi stack ≤2; glow advantage dura 2 turni (CD 3); 1 temp_trait da correnti attivo | range 1–2 stack      | evita cumulazioni oltre +15% efficacia media     |

### Sciame di Larve Neurali (swarm, tier 3 threat)

| metrica                | valore base                                                                                                       | range PT (sicurezza)                    | note                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| HP / Armor / Resist    | 55 HP per cluster; Armor 2; Resist: mentale +15%, elettrico +10%, fisico -10%, fuoco -15%                         | 50–60 HP; Armor 2–3                     | cluster fragile, vulnerabile a AoE |
| Attacco base / abilità | triplo strike 1d6+2; furto buff CD 15 coeff 0.5 su INT; applica 1 stack stress 0.05 on hit                        | CD 15–16; stress 0.04–0.06              | stress limita spam di buff rubati  |
| Slot core/support/temp | 4 / 2 / 1 (riverbero_memetico o vortice_nera_flash)                                                               | invariato                               |                                    |
| Impatto bioma          | sequestra 1 buff/cluster (max 2 totali); duplicazione efficacia 50%; durata buff rubato 2 turni; cooldown furto 3 | stress self-tick 0.05/turno se ≥3 stack | evita runaway stacking             |

### Leviatano Risonante (boss, tier 5 apex)

| metrica                | valore base                                                                                                       | range PT (sicurezza)       | note                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------- |
| HP / Armor / Resist    | 300 HP; Armor 11; Resist: fisico +20%, elettrico +30%, gravità +30%, psionico +15%                                | 290–320 HP; Armor 10–12    | regolabile in base al party level       |
| Attacco base / abilità | 2d12+6 elettrico/gravitazionale; abilità d’onda coeff 0.75 su CON/INT; aura SV CD 17 (stress 0.08) ogni 2 turni   | CD 17–18; stress 0.07–0.09 | 2d12+6 = 13–30 dmg, coerente con apex   |
| Slot core/support/temp | 4 / 4 / 2 (pelle_piezo_satura + canto_risonante/vortice_nera_flash)                                               | invariato                  |                                         |
| Impatto bioma          | +10% danno elettrico e +1 DR vs shear in Frattura Nera; 1 switch forma free se corrente attiva (cooldown 4 turni) | +8–12% danno               | switch free limitato da cooldown minimo |

### Simbionte Corallino Riflesso (ibrido, tier 3–4 flex)

| metrica                | valore base                                                                                                      | range PT (sicurezza)           | note                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------ |
| HP / Armor / Resist    | 105 HP; Armor 6; Resist: elettrico +15%, psionico +15%, fisico +5%, gravità 0                                    | 95–115 HP; Armor 5–7           | flessibile tra frontline leggera e support |
| Attacco base / abilità | 1d10+3 taglio/ionico; copia trait CD 15 coeff 0.55 su INT; efficacia copia 60%                                   | CD 15–16; efficacia 50–75%     | baseline 60% evita super-scaling           |
| Slot core/support/temp | 3 / 3 / 1 (scintilla_sinaptica o riverbero_memetico)                                                             | invariato                      |                                            |
| Impatto bioma          | mantiene 1 trait copiato alla volta; ricopia cooldown 3 turni; se copia temp_trait efficacia 50% per 1 turno max | efficacia 45–60% su temp_trait | previene abusi di copia catena             |

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

| trait_temp          | durata  | intensità (effetto)                                                              | limite stack | interazioni proibite                                                                             |
| ------------------- | ------- | -------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| scintilla_sinaptica | 2 turni | +1 priorità reazioni, +5% crit su abilità elettriche                             | 2            | non cumulabile con boost iniziativa; no duplicazione da riverbero_memetico                       |
| riverbero_memetico  | 1 turno | duplica prossimo buff positivo (cap 120% del valore base) ma -10% difesa mentale | 1            | non duplica buff già duplicati; vietato su canto_risonante e pelle_piezo_satura                  |
| pelle_piezo_satura  | 3 turni | -15% danni fisici, 5 danni elettrici da contatto                                 | 1            | no stack con altre riduzioni fisiche >10%; se attivo con Armonica durata 2 turni                 |
| canto_risonante     | 2 turni | vantaggio concentrazione, -0.02 stress incoming                                  | 1            | non cumulabile con altri effetti di vantaggio concentrazione; riverbero_memetico non applicabile |
| vortice_nera_flash  | 1 turno | teletrasporto 1 cella, azzera minaccia, +5 stress                                | 1            | no loop di teletrasporto; il Simbionte non può copiarlo più di 1 volta/encounter                 |

## Self-critique

- **Coerenza con sistema D20 TV:** valori ancorati a tier e CD 14–18; danni boss 2d12+6 coerenti con apex, ma da validare con game_functions e PT economy.
- **Rischi di power creep:** stacking luminoso + concentrazione può alzare troppo la difesa; limite stack=2 e cap 120% su duplicazioni mitigano ma va retestato.
- **Vulnerabilità numeriche:** Sciame resta fragile a AoE fisiche/ustione; Leviatano rischia burst in Shear se stress non scala; Simbionte può abusare copia se cooldown ignorato.
- **Note per Step 7:** verificare compatibilità con data/core/game_functions.yaml (stress, DR, CD); allineare tier con role_templates dei pool; aggiungere controlli su glossary/index per evitare trait_temp duplicati.
