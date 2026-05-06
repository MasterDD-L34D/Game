---
title: Trait Trade-offs Guide
description: Costo, strength, weakness e counter per ogni trait del combat system.
tags: [combat, balance, traits]
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Trait Trade-offs Guide

Guida ai trade-off di ciascuno dei 33 combat trait. Per ogni trait: category, stat passivi, ability attiva, punti di forza, debolezze e counter.

Stat baseline: `attack_mod`, `defense_mod`, `damage_step` sono bonus passivi permanenti. `resistances` riducono damage % su canale specifico. `cost_ap` = costo in Action Point dell'ability attiva.

---

## Offensive Traits (6)

### artigli_sette_vie

- **Category**: offensive
- **Passive stats**: attack_mod +1, defense_mod 0, damage_step +1
- **Active ability**: Fendente a Sette Vie (`cleave_strike`, type: damage, cost_ap: 1)
- **Descrizione**: Attacco multiplo a costo AP minimo. Damage diretto senza condizioni.
- **Strength**: AP cost bassissimo (1 AP) con damage_step +1 passivo. Permette 2-3 attacchi per turno, massimizzando output e PT generation.
- **Weakness**: Zero difesa passiva, nessuna resistenza. Unit con questo trait crolla sotto focus fire.
- **Counter**: Concentrare 2+ attaccanti sullo stesso turno. Senza defense_mod, la CD resta bassa e ogni hit fa danno pieno.

### spore_psichiche_silenziate

- **Category**: offensive
- **Passive stats**: attack_mod +1, defense_mod 0, damage_step +1, resistenze: mentale 15%
- **Active ability**: Esplosione di Spore (`spore_burst`, type: apply_status, cost_ap: 3)
- **Descrizione**: Applica status debilitante (tipicamente disorient o panic) al bersaglio.
- **Strength**: Unico offensive trait con resistenza mentale. L'ability applica status che scala con intensity, potenzialmente disabilitando un bersaglio per turni multipli.
- **Weakness**: Cost_ap 3 = un'intera azione per turno. Se lo status viene resistito o curato, il turno e' sprecato. Nessuna difesa fisica.
- **Counter**: Portare unit con heal/cleanse per rimuovere lo status applicato. L'alto costo AP rende il trait prevedibile nel timing.

### sangue_piroforico

- **Category**: offensive
- **Passive stats**: attack_mod +1, defense_mod 0, damage_step +1, resistenze: fuoco 20%
- **Active ability**: Innesco Piroforico (`ignition_surge`, type: buff, cost_ap: 2)
- **Descrizione**: Buff temporaneo che potenzia le stat offensive della unit.
- **Strength**: Miglior resistenza fuoco tra gli offensive (20%). Il buff self-amplifica il damage gia' alto, creando spike turn devastanti.
- **Weakness**: Richiede 1 turno di setup (buff) prima di colpire a pieno potenziale. Vulnerabile durante il turno di buff.
- **Counter**: Punire durante il turno di setup quando la unit buffa se stessa invece di attaccare. Usare status disorient per negare il bonus.

### frusta_fiammeggiante

- **Category**: offensive
- **Passive stats**: attack_mod +1, defense_mod 0, damage_step +1, resistenze: fuoco 10%
- **Active ability**: Frustata Infuocata (`whip_lash`, type: damage, cost_ap: 2)
- **Descrizione**: Attacco diretto con canale fuoco.
- **Strength**: Damage diretto affidabile a costo AP moderato. Resistenza fuoco 10% offre minima sopravvivenza contro mirror match.
- **Weakness**: Nessun effetto secondario (no status, no buff). Meno efficiente di artigli_sette_vie per AP/damage ratio. Resistenza fuoco bassa rispetto a sangue_piroforico.
- **Counter**: Unit con resistenza fuoco alta (mantello_meteoritico, cute_resistente_sali) riducono significativamente il damage output.

### ipertrofia_muscolare_massiva

- **Category**: offensive
- **Passive stats**: attack_mod +1, defense_mod 0, damage_step +1
- **Active ability**: Colpo Devastante (`power_strike`, type: damage, cost_ap: 2)
- **Descrizione**: Attacco a damage elevato, singolo bersaglio.
- **Strength**: Damage puro senza condizioni. Ottimo per focus-fire su bersagli ad alta priorita'. Nessuna dipendenza da canale elementale.
- **Weakness**: Nessuna resistenza, nessuna utilita' secondaria. Completamente unidimensionale: se il bersaglio sopravvive, non offre nulla.
- **Counter**: Difensori con armor alto o buff defense_mod. Senza penetrazione o status, il damage viene mitigato facilmente.

### cannone_sonico_a_raggio

- **Category**: offensive
- **Passive stats**: attack_mod +1, defense_mod 0, damage_step +2
- **Active ability**: Detonazione Sonica (`sonic_blast`, type: damage, cost_ap: 3)
- **Descrizione**: Attacco devastante con damage_step piu' alto tra tutti i trait.
- **Strength**: Damage_step +2 passivo = miglior scaling di MoS nel gioco. Ogni hit converte MoS in damage superiore a qualsiasi altro trait.
- **Weakness**: Cost_ap 3 limita a 1 ability per turno. Zero difesa, zero resistenze. Bersaglio prioritario in ogni scontro.
- **Counter**: Rush down prima che accumuli PT. Con 0 defense_mod e 0 resistenze, qualsiasi attacco concentrato lo elimina.

---

## Defensive Traits (10)

### struttura_elastica_amorfa

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +1, damage_step 0, resistenze: fisico 10%
- **Active ability**: Assorbimento Elastico (`elastic_absorb`, type: buff, cost_ap: 1)
- **Descrizione**: Buff difensivo a basso costo che aumenta la resilienza.
- **Strength**: Cost_ap 1 = buff accessibile ogni turno senza sacrificare troppe azioni. Resistenza fisico copre il canale damage piu' comune.
- **Weakness**: Nessun contributo offensivo. In scontri lunghi diventa un peso morto se la squadra non ha DPS sufficienti.
- **Counter**: Ignorare e focalizzare i suoi alleati offensivi. Senza damage, non e' una minaccia diretta.

### sacche_galleggianti_ascensoriali

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +1, damage_step 0
- **Active ability**: Sollevamento Ascensionale (`buoyant_lift`, type: buff, cost_ap: 2)
- **Descrizione**: Buff posizionale/difensivo.
- **Strength**: Defense_mod +1 passivo rende la CD piu' alta. Il buff aggiunge ulteriore survivability nei turni critici.
- **Weakness**: Nessuna resistenza elementale. Attacchi con canale specifico bypassano completamente il vantaggio difensivo generico.
- **Counter**: Usare attacchi elementali (fuoco, gelo, acido) che ignorano la defense_mod nel calcolo resist.

### scheletro_idro_regolante

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +1, damage_step 0
- **Active ability**: Fortificazione Idrostatica (`hydro_fortify`, type: buff, cost_ap: 2)
- **Descrizione**: Buff defense_mod temporaneo che impila con il passivo.
- **Strength**: Stacking difensivo: defense_mod +1 passivo + buff = CD molto alta. Ottimo come frontline che assorbe attacchi per la squadra.
- **Weakness**: Identico a sacche_galleggianti: nessuna resistenza, nessun output. Richiede alleati offensivi per vincere lo scontro.
- **Counter**: Status disorient/rage per penalizzare la CD indipendentemente dai buff. Oppure bypassare con heal denial.

### mimetismo_cromatico_passivo

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +1, damage_step 0
- **Active ability**: Dissolvenza Cromatica (`chromatic_fade`, type: buff, cost_ap: 1)
- **Descrizione**: Buff evasivo a costo minimo.
- **Strength**: Cost_ap 1 permette di buffare e agire nello stesso turno. Ottima action economy difensiva.
- **Weakness**: Nessuna resistenza, defense_mod standard. Contro attaccanti con attack_mod alto o MoS farming, il buff non basta.
- **Counter**: Attacchi multipli a basso costo (artigli_sette_vie) per superare il buff con volume di azioni.

### cute_resistente_sali

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +1, damage_step 0, resistenze: fuoco 15%, taglio 10%
- **Active ability**: Indurimento Salino (`salt_harden`, type: buff, cost_ap: 2)
- **Descrizione**: Buff difensivo con doppia resistenza passiva.
- **Strength**: Doppia resistenza (fuoco + taglio) copre i due canali offensivi piu' comuni. Eccellente contro team fire-heavy.
- **Weakness**: Cost_ap 2 per il buff limita la flessibilita'. Vulnerabile a canali non coperti (gelo, acido, mentale).
- **Counter**: Attacchi su canale mentale, gelo o acido che bypassano entrambe le resistenze.

### criostasi_adattiva

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +1, damage_step 0, resistenze: gelo 20%
- **Active ability**: Criostasi Difensiva (`frozen_stasis`, type: buff, cost_ap: 3)
- **Descrizione**: Buff difensivo pesante con alta resistenza gelo.
- **Strength**: Resistenza gelo 20% = miglior counter a composizioni cryo. Il buff a 3 AP e' presumibilmente molto potente.
- **Weakness**: Cost_ap 3 = intero turno dedicato alla difesa. Nessun contributo offensivo e nessuna copertura su canali non-gelo.
- **Counter**: Attacchi fuoco o fisici che ignorano la resistenza gelo. Forzare engagement prima che attivi il buff.

### carapace_fase_variabile

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +1, damage_step 0, resistenze: fisico 15%
- **Active ability**: Sfasamento di Fase (`phase_shift`, type: buff, cost_ap: 3)
- **Descrizione**: Buff difensivo di alto livello.
- **Strength**: Resistenza fisico 15% + defense_mod +1 = eccellente contro attacchi fisici standard. Il buff a 3 AP dovrebbe fornire protezione significativa.
- **Weakness**: Mono-canale (solo fisico). Attacchi elementali bypassano la resistenza. Costo AP altissimo per l'ability.
- **Counter**: Attacchi elementali (fuoco, gelo, acido, mentale) che ignorano la resistenza fisico.

### secrezione_rallentante_palmi

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +1, damage_step 0
- **Active ability**: Tocco Rallentante (`slowing_touch`, type: apply_status, cost_ap: 2)
- **Descrizione**: Applica status rallentamento al bersaglio.
- **Strength**: Unico trait difensivo con apply_status offensivo. Rallentare un attaccante riduce la sua priority di risoluzione e potenzialmente le sue azioni.
- **Weakness**: Nessuna resistenza passiva. Lo status applicato deve superare eventuali resistenze del bersaglio.
- **Counter**: Unit con cleanse/heal per rimuovere lo status. Oppure attaccare da distanza senza entrare nel raggio del tocco.

### mantello_meteoritico

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +2, damage_step 0, resistenze: fisico 20%, fuoco 20%
- **Active ability**: Scudo Meteoritico (`meteoric_shield`, type: buff, cost_ap: 3)
- **Descrizione**: Il trait piu' difensivo del gioco. Doppia resistenza alta + defense_mod +2.
- **Strength**: Defense_mod +2 e' unico (miglior stat difensiva). Doppia resistenza 20% copre fisico e fuoco. Praticamente imbattibile in 1v1 contro physical/fire attackers.
- **Weakness**: Zero offesa, cost_ap 3 per il buff. Completamente passivo — la squadra avversaria puo' ignorarlo e eliminare i suoi alleati.
- **Counter**: Focus sugli alleati. Oppure usare canali non coperti (gelo, acido, mentale) per bypassare le resistenze.

### pelage_idrorepellente_avanzato

- **Category**: defensive
- **Passive stats**: attack_mod 0, defense_mod +1, damage_step 0, resistenze: cryo 25%, acido 15%
- **Active ability**: Scudo Idrorepellente (`hydro_shield`, type: buff, cost_ap: 2)
- **Descrizione**: Difesa specializzata anti-cryo e anti-acido.
- **Strength**: Resistenza cryo 25% = la piu' alta resistenza singola nel gioco. Copre la nicchia cryo+acido che pochi altri trait indirizzano.
- **Weakness**: Zero copertura su fisico e fuoco, i canali piu' comuni. Inutile contro composizioni physical/fire standard.
- **Counter**: Attacchi fisici o fuoco standard. La specializzazione estrema lo rende prevedibile e facile da bypassare.

---

## Hybrid Traits (1)

### coda_frusta_cinetica

- **Category**: hybrid
- **Passive stats**: attack_mod +1, defense_mod +1, damage_step 0
- **Active ability**: Frustata Cinetica (`tail_whip`, type: damage, cost_ap: 2)
- **Descrizione**: Attacco diretto con profilo bilanciato offesa/difesa.
- **Strength**: Unico trait con bonus sia offensivo (+1 atk) che difensivo (+1 def). Versatilita' senza pari: contribuisce in ogni fase dello scontro.
- **Weakness**: Jack of all trades, master of none. Damage_step 0 = damage inferiore agli offensive puri. Defense_mod +1 = meno tanky dei difensori dedicati.
- **Counter**: Specialisti puri lo superano nel loro dominio. Offensive con damage_step +1/+2 lo out-damage; difensori con +2 def lo out-tank.

---

## Utility Traits (16)

### filamenti_digestivi_compattanti

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Digestione Rigenerante (`digest_heal`, type: heal, cost_ap: 1)
- **Descrizione**: Heal a costo minimo.
- **Strength**: Cost_ap 1 = heal accessibile ogni turno. Ottimo per sustain in scontri prolungati. Permette di healare e agire nello stesso turno.
- **Weakness**: Zero stat passive. La unit non contribuisce ne' in attacco ne' in difesa. Heal raw senza buff e' limitato.
- **Counter**: Burst damage che supera il heal rate. Oppure apply_status bleeding per negare il sustain.

### grassi_termici

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0, resistenze: fuoco 10%
- **Active ability**: Impulso Termico (`thermal_pulse`, type: heal, cost_ap: 1)
- **Descrizione**: Heal leggero con minima resistenza fuoco.
- **Strength**: Identico a filamenti_digestivi ma con resistenza fuoco 10% bonus. Marginalmente migliore contro team fire.
- **Weakness**: Stessi limiti di filamenti: zero stat offensive/difensive. La resistenza 10% e' trascurabile.
- **Counter**: Ignorare e focalizzare i suoi alleati. Il heal a 1 AP non compensa il focus fire.

### cuticole_cerose

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Rivestimento Ceroso (`waxy_coat`, type: buff, cost_ap: 1)
- **Descrizione**: Buff protettivo leggero.
- **Strength**: Buff a 1 AP con ottima action economy. Puo' buffare alleati o se stesso a costo minimo.
- **Weakness**: Nessuna stat passiva, nessuna resistenza. Il buff a 1 AP sara' proporzionalmente debole.
- **Counter**: Dispel/purge dei buff oppure damage sufficiente a superare il buff.

### olfatto_risonanza_magnetica

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Senso Magnetico (`magnetic_sense`, type: buff, cost_ap: 2)
- **Descrizione**: Buff sensoriale/informativo.
- **Strength**: Buff utility che probabilmente fornisce vantaggi tattici (rilevamento, anti-stealth). Buon supporto per la squadra.
- **Weakness**: Zero contributo diretto al combat. Cost_ap 2 per un buff utility e' un investimento significativo senza ritorno immediato.
- **Counter**: Ignorare. Un utility puro senza stat e' il bersaglio a piu' bassa priorita' in campo.

### eco_interno_riflesso

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Impulso Ecolocativo (`echo_pulse`, type: buff, cost_ap: 2)
- **Descrizione**: Buff sensoriale/tattico.
- **Strength**: Informazione tattica per la squadra. Potenziale sinergia con mimetismo_cromatico_passivo (rivela unit nascoste).
- **Weakness**: Nessun impatto diretto su HP/damage. In scontri brevi, 2 AP per informazione e' un lusso.
- **Counter**: Non nascondere unit. Se nessuno usa stealth/mimetismo, il buff perde valore.

### nucleo_ovomotore_rotante

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Rotazione Esplosiva (`spin_burst`, type: buff, cost_ap: 2)
- **Descrizione**: Buff di mobilita'/velocita'.
- **Strength**: Buff di movimento che espande le opzioni tattiche. Utile per riposizionamento e flanking.
- **Weakness**: Zero stat passive. Il riposizionamento ha valore solo se la grid/posizione e' rilevante nello scontro.
- **Counter**: Zone control e status rallentamento per negare il vantaggio di mobilita'.

### focus_frazionato

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Focus Frazionato (`divided_focus`, type: buff, cost_ap: 2)
- **Descrizione**: Buff che divide l'attenzione su piu' compiti.
- **Strength**: Potenziale multi-tasking: buffando piu' stat contemporaneamente o supportando piu' alleati. Versatilita' utility.
- **Weakness**: "Diviso" implica efficienza ridotta per singola stat. In scontri dove serve un buff specifico, meglio uno specialista.
- **Counter**: Focalizzare attacchi su una singola unit per superare il supporto distribuito.

### ventriglio_gastroliti

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Scarica Energetica (`energy_burst`, type: buff, cost_ap: 2)
- **Descrizione**: Buff energetico che amplifica le performance.
- **Strength**: Buff offensivo da support: potenzia un alleato attaccante senza doverlo fare in prima persona. Buon amplificatore per spike turn.
- **Weakness**: Richiede un alleato offensivo forte per avere valore. Da solo non produce nulla.
- **Counter**: Eliminare l'alleato buffato prima che agisca. Senza il bersaglio del buff, il turno e' sprecato.

### sonno_emisferico_alternato

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0, resistenze: mentale 10%
- **Active ability**: Riposo Vigile (`vigilant_rest`, type: heal, cost_ap: 2)
- **Descrizione**: Heal con resistenza mentale passiva.
- **Strength**: Resistenza mentale 10% e' rara. Heal a 2 AP piu' potente dei heal a 1 AP. Buon sustain contro composizioni mentali.
- **Weakness**: Cost_ap 2 per heal = meno efficient dei healer a 1 AP. La resistenza mentale 10% e' marginale.
- **Counter**: Burst damage fisico/fuoco che ignora la resistenza mentale e supera il heal rate.

### respiro_a_scoppio

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Scatto Esplosivo (`explosive_rush`, type: buff, cost_ap: 2)
- **Descrizione**: Buff di velocita'/iniziativa.
- **Strength**: Buff initiative/speed modifica l'ordine di risoluzione. Agire prima dell'avversario puo' decidere uno scontro.
- **Weakness**: Valore situazionale: se la priority e' gia' favorevole, il buff e' ridondante. Zero stat passive.
- **Counter**: Status panic (-2 priority penalty per intensity) per negare il vantaggio di velocita'.

### empatia_coordinativa

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Coordinazione Empatica (`coordinated_boost`, type: buff, cost_ap: 2)
- **Descrizione**: Buff di squadra basato sulla coordinazione.
- **Strength**: Potenziale buff AoE che potenzia piu' alleati contemporaneamente. Scalamento eccellente in squadre numerose.
- **Weakness**: Richiede alleati vivi e vicini per massimizzare il valore. In scontri 1v1 o con alleati morti, inutile.
- **Counter**: Eliminare le unit buffate prima che agiscano. Oppure focalizzare l'empatico stesso per rimuovere la fonte del buff.

### risonanza_di_branco

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Richiamo del Branco (`pack_call`, type: buff, cost_ap: 1)
- **Descrizione**: Buff di coordinazione a basso costo.
- **Strength**: Cost_ap 1 = miglior action economy tra i buff utility. Permette di buffare e agire nello stesso turno. Sinergia con empatia_coordinativa.
- **Weakness**: Buff presumibilmente debole dato il costo 1 AP. Nessuna stat passiva.
- **Counter**: Irrilevante in scontri brevi dove il buff non ha tempo di accumulare valore.

### occhi_infrarosso_composti

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Scansione Termica (`thermal_scan`, type: buff, cost_ap: 1)
- **Descrizione**: Buff informativo che rivela informazioni termiche.
- **Strength**: Cost_ap 1 con funzione scouting. Rivela unit nascoste e fornisce informazioni tattiche a costo minimo.
- **Weakness**: Zero impatto su combat stats. Puramente informativo.
- **Counter**: Non fare affidamento su stealth/nascondimento.

### lingua_tattile_trama

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Assaggio delle Debolezze (`taste_weakness`, type: buff, cost_ap: 1)
- **Descrizione**: Buff che rivela le debolezze del bersaglio.
- **Strength**: Potenziale debuff scouting: conoscere le resistenze/debolezze del nemico permette di ottimizzare i canali d'attacco degli alleati.
- **Weakness**: Richiede alleati con canali elementali diversi per sfruttare l'informazione. Da solo non cambia nulla.
- **Counter**: Composizione monocolore (tutti i canali uguali) rende l'informazione sulle debolezze meno utile.

### enzimi_chelanti

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Neutralizzazione Tossine (`neutralize_toxin`, type: heal, cost_ap: 1)
- **Descrizione**: Heal/cleanse specializzato contro tossine e status chimici.
- **Strength**: Cost_ap 1 per cleanse e' eccellente. Counter diretto a status come bleeding e debuff chimici. Essenziale contro composizioni status-heavy.
- **Weakness**: Inutile se l'avversario non applica status. Contro composizioni pure-damage, e' uno slot sprecato.
- **Counter**: Non dipendere da status/tossine come win condition. Usare burst damage puro.

### zoccoli_risonanti_steppe

- **Category**: utility
- **Passive stats**: attack_mod 0, defense_mod 0, damage_step 0
- **Active ability**: Pestata Risonante (`resonant_stomp`, type: apply_status, cost_ap: 1)
- **Descrizione**: Applica status a costo minimo.
- **Strength**: Unico utility con apply_status a 1 AP. Eccellente action economy per applicare debuff. Permette di applicare status e agire nello stesso turno.
- **Weakness**: Zero stat passive. Lo status applicato sara' presumibilmente debole dato il costo 1 AP (bassa intensity/durata).
- **Counter**: Cleanse/heal per rimuovere lo status. Oppure resistenze specifiche al canale dello status.

---

## Sintesi bilanciamento

| Category  | Traits | Avg atk | Avg def | Avg dmg_step | Avg AP cost |
| --------- | :----: | :-----: | :-----: | :----------: | :---------: |
| Offensive |   6    |    1    |    0    |     1.17     |    2.17     |
| Defensive |   10   |    0    |   1.1   |      0       |    2.10     |
| Hybrid    |   1    |    1    |    1    |      0       |    2.00     |
| Utility   |   16   |    0    |    0    |      0       |    1.50     |

**Osservazioni chiave**:

- Offensive trait pagano il damage con 0 defense_mod e poche resistenze. Sono glass cannon per design.
- Defensive trait hanno il monopolio sulle resistenze elementali ma zero contributo offensivo. Richiedono team building attorno a loro.
- L'unico hybrid (coda_frusta_cinetica) e' il piu' versatile ma non eccelle in nulla.
- Utility trait compensano zero stat con cost_ap basso (media 1.5 vs 2.1+ delle altre categorie). Sono force multiplier, non standalone.
