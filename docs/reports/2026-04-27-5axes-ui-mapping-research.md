---
title: '5-Axes UI Surface ↔ 4-MBTI Engine Mapping — Industry Research'
workstream: cross-cutting
category: research
doc_status: draft
doc_owner: claude-code
last_verified: '2026-04-26'
tags: [mbti, personality, ui, research, balance, p4]
---

# Research: 5-Axes UI Surface ↔ 4-MBTI Engine Mapping

**Data**: 2026-04-26 | **Mandato**: Opt 1/2/3 decision + formula asse incerti

---

## TL;DR 5 bullet

1. **Industry pattern dominante**: superficie THEMATIC (label creature-native) sopra engine numerico nascosto. Black & White, Spore, Creatures, Digimon Svolgono tutti questo pattern. Player non deve vedere "E_I=0.73" — vede "Solitario ●●●○○".
2. **Opt 3 Hybrid è il pattern corretto**: 3 axes MBTI-projections + 2 axes stat-derivatives. Nessun gioco di successo estende il proprio engine psicologico per pura convenienza UI — adattano la superficie ai valori esistenti.
3. **Agile/Robusto = stat-derivative puro**: non ha home naturale nei 4 MBTI. Derivare da `speed`/`hp` esistenti è il pattern Pokemon (Nature = +10% boost su stat underlyng). Effort <1h.
4. **Memoria/Istinto = behavioral-derivative**: derivare da `action_switch_rate` e `setup_ratio` già calcolati in `vcScoring.js:573-578`. Pattern Wildermyth (top-2 personality da score behaviourali). Effort <2h.
5. **Risk principale**: player vede 5 axes ma ne sente 3 (Simbiosi/Solitario/Esplorativo). Agile e Memoria sembrano stat RPG normali, non "temperamento creatura". Soluzione: frame narrativo creature-thematic per tutti e 5, oppure ridurre a 3 e spostare Agile/Robusto a scheda stat separata.

---

## Museum hit pre-research

Consultato MUSEUM.md 2026-04-26. Card rilevanti trovate:

- **M-009** (5/5): Triangle Strategy — Phased reveal + confidence_per_axis già proposta `vcScoring.js`. Allineato con Opt 3: la superficie mostra solo assi con confidence > 0.7.
- **M-010** (4/5): MBTI Gates Ghost — `mbti_gates.yaml` ghost file aveva schema `requires: {N: min:0.6}` per 16 forme. Direttamente rilevante per "Esplorativo/Cauto ↔ S_N + J_P" gating.
- **M-017** (4/5): 16 Forme MBTI seed evolutivi — `formPackRecommender.js` già operativo, campo `starter_bioma` undefined. Link Opt 3: bioma-seed → forma → pacchetto PI → axes UI.

---

## Industry Pattern Catalog

### P1 — Creatures (1996, Cyberlife/Steve Grand)

**Surface UI**: Norn emette segnali comportamentali (corre, mangia, piange). La Life Kit / Science Kit offre tab "Biochemistry" come tool avanzato.  
**Engine underlying**: 13 drive neurons (Pain, Hunger, Loneliness, Fear, Boredom, Sexdrive…) + 256 possibili biochimici. Engine opaco al player normale.  
**Mapping function**: `surface = behavior(drive_neurons)`. Player NON vede i valori numerici — deduce lo stato dal comportamento del Norn. La Science Kit è opt-in per nerd, non mainstream UI.  
**Reactivity**: immediata — il Norn cambia comportamento quando i drive cambiano chimicamente.  
**Feedback (design)**: Considerato rivoluzionario (1996 BAFTA Best Simulation). Pattern "behavior IS the surface" — l'azione della creatura proietta lo stato interno senza numeri espliciti. Limite: player non sa "perché" il Norn fa X. Guida richiesta per capire i drive.  
**Rilevanza per noi**: il pattern "comportamento combat = surface" è esattamente ciò che fa `vcScoring.js`. Player vede "Solitario" perché il Norn (unità) ha agito in isolamento. Valida la derivazione comportamentale.  
**Fonti**: [Creatures Wiki](https://creatures.wiki/Creatures) · [Alan Zucconi AI of Creatures](https://www.alanzucconi.com/2020/07/27/the-ai-of-creatures/)

---

### P2 — Black & White (2001, Lionhead)

**Surface UI**: 1 asse visible "Good/Evil" da -1.0 a +1.0. Visualizzato tramite aspetto fisico creatura (colore, postura, occhi). Zero UI numerica — il look IS the meter.  
**Engine underlying**: sistema reinforcement learning interno. Creatura apprende da approvazione/disapprovazione player in tempo reale. Centinaia di pesi comportamentali nascosti.  
**Mapping function**: `surface_look = f(accumulated_reward_history)`. La forma visiva è la proiezione diretta dell'engine RL. Non c'è un numero da leggere — c'è un aspetto da osservare.  
**Reactivity**: graduale (aura cresce, postura cambia, texture si modifica nel tempo).  
**Feedback**: [Wikipedia](https://en.wikipedia.org/wiki/Black_%26_White_(video_game)) cita il sistema come "innovative morality mechanic". Limite: 1 solo asse = troppo semplice per creature con personalità multidimensionale. Molyneux stesso ha dichiarato che il sistema doveva essere più complesso.  
**Rilevanza per noi**: pattern "visual appearance = surface axis". Agile/Robusto potrebbe essere espresso via animazione/sprite tint invece che barre UI — evita il problema "sembra stat RPG".  
**Fonti**: [Black & White Wiki Alignment](https://blackandwhite.fandom.com/wiki/Alignment) · [Wikipedia](https://en.wikipedia.org/wiki/Black_%26_White_(video_game))

---

### P3 — Spore Creature Stage (2008, Maxis/Will Wright)

**Surface UI**: 3 "path" visibili durante gioco: Social (verde), Predator (rosso), Adaptable (blu). Ogni body part ha score Social/Attack/Defense 0-5. Player vede i numeri sui parti del corpo.  
**Engine underlying**: accumulo DNA points per percorso. L'archetype finale (Tribes stage) deriva dall'accumulato. Body parts hanno proprietà multiple (social ability score + attack score) — il player vede entrambi ma pesa per percorso scelto.  
**Mapping function**: `archetype = argmax(social_dna, predator_dna, adaptable_dna)`. Ogni interazione incrementa uno dei 3 bucket. Surface mostra il bucket dominante come path indicator.  
**Reactivity**: immediata (DNA counter aggiornato dopo ogni kill/alliance).  
**Feedback**: GDC 2009 review ([GameSpot](https://www.gamespot.com/articles/gdc-2009-taking-spore-seriously/1100-6206650/)) nota che il sistema fu criticato per superficialità nell'esecuzione (ogni stage troppo breve). Tuttavia il pattern "3 axes + argmax label" è chiaro e leggibile.  
**Rilevanza per noi**: Pattern "labeled path con bucket score" = esattamente come potremmo mostrare 3 axes MBTI-proxy. "Simbiosi ●●●" = bucket T_F. Label creature-themed sopra score numerico nascosto.  
**Fonti**: [Spore Wikipedia](https://en.wikipedia.org/wiki/Spore_(2008_video_game)) · [StrategyWiki Creature Stage](https://strategywiki.org/wiki/Spore/Creature_Stage)

---

### P4 — Pokemon Natures + IVs/EVs (1996-2025, Game Freak)

**Surface UI**: 25 Nature labels (Adamant, Modest, Timid…) mostrati nella scheda Pokemon. Ogni Nature ha +10% a 1 stat, -10% a 1 stat (5 sono neutre). IVs (0-31) mostrati come stella/numeri in-game post-Gen 6. EVs (0-252 per stat) mostrati come medaglie/punti da Gen 3+.  
**Engine underlying**: 3 sistemi paralleli e distinti matematicamente. IVs = additive bonus a livello 100 (+0 a +31 per stat). EVs = additive ma divisi per 4 (ogni 4 EV = +1 stat a lv100). Nature = moltiplicatore ×1.1/×0.9 applicato DOPO IVs+EVs.  
**Mapping function**: `final_stat = floor((base + IV) × level/100 × nature_multiplier) + EV/4 + 5`. 3 layer separati con formula diversa ciascuno. I giocatori novizi non capiscono la differenza — i forum di community sono pieni di guide dedicate.  
**Reactivity**: nulla in-game (IVs/EVs fissi post-cattura per IVs, EVs accumulati con battling). Nature fissa alla cattura.  
**Feedback**: il sistema ha creato un layer "competitive metagame" separato dal casual gameplay. Pro: depth estrema per hardcore. Contro: [guida Serebii](https://forums.serebii.net/threads/a-basic-guide-to-evs-ivs-and-natures.499840/) citata come necessaria per capire i numeri — sistema opaco al casual player.  
**Rilevanza per noi**: **ANTI-PATTERN** per la UI surface (3 sistemi paralleli = confusione). **PRO-PATTERN** per la derivation formula di Agile/Robusto: prendere 2 stat raw (Speed, HP) + peso fisso = Agile/Robusto score. Semplice, preciso, zero refactor engine.  
**Fonti**: [Cave of Dragonflies EVs/Natures Math](https://www.dragonflycave.com/evs-natures-and-math/) · [Serebii EV guide](https://forums.serebii.net/threads/a-basic-guide-to-evs-ivs-and-natures.499840/)

---

### P5 — Crusader Kings III (2020, Paradox)

**Surface UI**: 3 slot personality trait (visibili nel portrait). Label archetipici forti: "Wroth", "Greedy", "Brave". Zero UI numerica — il player vede label, non score.  
**Engine underlying**: ogni trait ha parametri multipli: stress gain/loss modificatori, AI behavior weights, opinion modifiers, event eligibility flags. L'azione AI è guidata da pesi interni non visibili al player.  
**Mapping function**: `trait_label = fixed_assignment (at birth/childhood events)`. Non è derivato da accumulo comportamentale — è assegnato narrativamente. Il trait poi modifica i pesi dell'engine.  
**Reactivity**: solo su eventi specifici (cambio trait da stress breakdown, Focused/Diligent da events).  
**Feedback**: [Tanya X. Short (GD magazine)](https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities) cita CK2/3 come esempio di "extreme archetypes = detectable personality". La chiave: "Characters in CK2 are Wroth, not irritable." Bluntness over subtlety. Paradox [Dev Diary #58](https://forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-58-stre-ss-tching-the-traits.1472092/) discute il sistema stress come bridge tra engine-intent e surface-trait.  
**Rilevanza per noi**: **Design principle diretto**: label archetipico > score numerico per leggibilità. "Solitario" > "E_I=0.82". Non mostrare mai i valori MBTI raw — solo il label polarizzato.  
**Fonti**: [CK3 Wiki Traits](https://ck3.paradoxwikis.com/Traits) · [GD Procedural Personalities](https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities)

---

### P6 — Dwarf Fortress (2006-2024, Bay 12 Games)

**Surface UI**: 51 personality facets letti nella scheda personaggio come testo naturale ("Quick to love", "Slow to love"). Il player vede verbosità narrativa + summary phrase nel tooltip.  
**Engine underlying**: 51 facets numerici (range 0-100) derivati da una versione semplificata del NEO PI-R (Big Five). Tarn Adams ha confermato derivazione da Big Five. Effetti gameplay di molte facets "currently not entirely understood" (Dwarf Fortress Wiki).  
**Mapping function**: `text_description = lookup_table(facet_value, facet_name)`. Ogni valore ha bucket di testo (es. valor 0-10 = "Deeply pessimistic", 11-30 = "Cynical"…). Non c'è radar — c'è testo procedural.  
**Reactivity**: le facets evolvono lentamente con eventi (trauma, relazioni).  
**Feedback**: sistema lodato per depth ma criticato perché "many effects unknown" — i player non sanno cosa realmente cambia il comportamento. Steam discussions: "dwarf personalities are placebo?" con thread specifici.  
**Rilevanza per noi**: **ANTI-PATTERN**: 51 facets = troppo. Ma il pattern "Big Five → surface text" è esattamente il nostro caso. Pro: text naturale è più accessibile di radar. Contro: senza feedback chiaro ("questo facet ha causato X") il player ignora il sistema.  
**Fonti**: [DF Wiki Personality Facet](https://dwarffortresswiki.org/index.php/Personality_facet) · [Steam discussione](https://steamcommunity.com/app/975370/discussions/0/3716062978748076649/)

---

### P7 — Wildermyth (2021, Worldwalker Games)

**Surface UI**: 11 personality stats (Bookish, Coward, Goofball, Greedy, Healer, Hothead, Leader, Loner, Poet, Romantic, Snark). Il player vede i valori solo indirettamente — il sistema usa i top-2 per assegnare role in eventi procedurali. Nessun radar chart esplicito.  
**Engine underlying**: ogni stat ha score numerico che sale con azioni e eventi. I top-2 determinano eligibility per eventi specifici. Sistema event-pool: se nessuno in party ha stat X al livello richiesto, l'evento non appare.  
**Mapping function**: `event_eligibility = top_2_stats(character)`. Surface = role label ("il Bookish ha una visione") nel testo evento.  
**Reactivity**: aggiornamento post-evento. Player vede il label usato nel testo narrativo — implicito ma non esplicito come scheda separata.  
**Feedback**: [Aywren Nook review](https://aywren.com/2021/06/29/wildermyth-procedural-storytelling-rpg/) e community indicano il sistema come "invisibile ma impattante" — il player capisce gradualmente quali stats sono "sue" leggendo gli eventi.  
**Rilevanza per noi**: **Pattern prioritario per Memoria/Istinto**: non mostrare un numero — mostrare nel combat log "l'unità ha ricordato il pattern precedente" (se Memoria dominante) o "ha improvvisato" (se Istinto). La stat emerge narrativamente, non come radar.  
**Fonti**: [Wildermyth Wiki Personality](https://wildermyth.com/wiki/Personality) · [Steam discussion](https://steamcommunity.com/app/763890/discussions/0/3053985636038136274/)

---

### P8 — The Sims 4 (2014-2025, Maxis)

**Surface UI**: CAS mostra 3-4 trait slot (Emotional / Hobby / Lifestyle / Social). Ogni trait è un label + icona. Nessuna barra/radar.  
**Engine underlying**: ogni trait modifica moodlet weights, need decay rates, social outcome probabilities, skill gain modifiers. Layer "hidden traits" aggiuntivi acquisiti da life events (non visibili in CAS).  
**Mapping function**: `trait_label → bundle(moodlet_bias, need_delta, skill_mod)`. Il bundle è fisso per ogni trait, non derivato dal comportamento. Hidden traits aggiunti da gioco non mostrati di default (mod necessario per visualizzarli).  
**Reactivity**: immediata sui moodlets. Trait permanenti (non cambiano senza cheats).  
**Feedback**: community [EA Forums](https://forums.ea.com/discussions/the-sims-4-feedback-en/sims-4-base-game-trait-overhaul) ha chiesto ripetutamente "Trait Overhaul" perché il sistema è percepito come troppo semplice / poco impattante sui comportamenti reali. I hidden traits aggiunti da life events non vengono visti → feedback zero.  
**Rilevanza per noi**: **ANTI-PATTERN chiave**: hidden traits senza feedback visivo = player ignora il sistema. Tutti e 5 i nostri axes DEVONO avere almeno 1 feedback visibile per sessione (testo evento, icona combat log, barra HUD). Senza feedback → invisibile.  
**Fonti**: [Sims Wiki Trait](https://sims.fandom.com/wiki/Trait_(The_Sims_4)) · [EA Forum Trait Overhaul thread](https://forums.ea.com/discussions/the-sims-4-feedback-en/sims-4-base-game-trait-overhaul-%E2%80%93-the-personality-evolution/13223912)

---

### P9 — Digimon Story: Time Stranger (2025, Bandai Namco)

**Surface UI**: quadrant graph 2D (X=Y axis non nominati, si leggono come compass N/E/W/S). La UI mostra dove il Digimon si trova nel quadrante con un crosshair. Freccia gialla indica direzione di drift nel Digifarm.  
**Engine underlying**: ogni action di training muove il Digimon lungo 1 asse. Le stat priority nel levelup dipendono dalla posizione nel quadrante.  
**Mapping function**: `quadrant_position = integral(training_actions)`. La posizione è l'accumulo storico delle scelte di training.  
**Reactivity**: visibile nel Digifarm dopo ogni training session.  
**Feedback**: [Dexerto guide](https://www.dexerto.com/wikis/digimon-story-time-stranger/personality-system-explained-in-digimon-story-time-stranger/) e forum indicano confusione su "N/E/W/S cosa significa" — il sistema è opaco perché i label del quadrante non sono intuitive. Player chiedono spiegazione del sistema.  
**Rilevanza per noi**: **ANTI-PATTERN UI**: quadrante senza label creature-themed = player chiede "cosa è N?". I nostri axes DEVONO avere label creature-thematic chiare, non coordinate astratte. Label come "Simbiosi ↔ Predazione" > "asse X".  
**Fonti**: [Dexerto Personality Guide](https://www.dexerto.com/wikis/digimon-story-time-stranger/personality-system-explained-in-digimon-story-time-stranger/) · [GamerBraves Guide](https://www.gamerbraves.com/guide-digimon-story-time-stranger-personality-system-and-how-bonds-shape-your-digimon/)

---

## Struttura engine attuale (Evo-Tactics)

Da `apps/backend/services/vcScoring.js:523-651`:

| Asse MBTI | Formula engine | Raw metrics consumed | Coverage |
|-----------|----------------|----------------------|----------|
| E_I | `1 - 0.5*close_engage - 0.25*support_bias - 0.25*(1-time_to_commit)` | close_engage, support_bias, time_to_commit | full |
| S_N | `1 - 0.4*new_tiles + 0.3*setup_ratio - 0.3*evasion_ratio` | new_tiles, setup_ratio, evasion_ratio | full |
| T_F | `1 - 0.5*utility_actions + 0.5*support_bias` | utility_actions, support_bias | full |
| J_P | `1 - (0.6*setup_ratio + 0.2*time_to_commit)` | setup_ratio, time_to_commit | partial |

Raw metrics già calcolate e disponibili: `action_switch_rate`, `enemy_target_ratio`, `concrete_action_ratio`, `speed` (stat unità), `hp_max` (stat unità), `setup_ratio`, `time_to_commit`.

---

## Comparazione Opzioni

### Opt 1: Stretch MBTI — 5 axes = proiezioni 4 MBTI

```
UI axis 1: Simbiosi/Predazione → T_F (1=Feeling=Simbiotico, 0=Thinking=Predatore)
UI axis 2: Solitario/Sciame → E_I (1=Introvert=Solitario, 0=Extravert=Sciame)
UI axis 3: Esplorativo/Cauto → S_N * 0.5 + J_P * 0.5 (combo)
UI axis 4: Agile/Robusto → ??? (non mappabile su MBTI)
UI axis 5: Memoria/Istinto → ??? (non mappabile su MBTI)
```

**Pro**: zero engine refactor. Engine resta 4 MBTI.  
**Contro**:
- Agile/Robusto non ha casa MBTI — forzarlo su J_P è semanticamente sbagliato (J_P ≠ fisico). Crea mismatch semantico.
- Memoria/Istinto non ha correlato MBTI chiaro. Forzarlo su S_N è parzialmente valido (S=concreto/memoria, N=intuitivo/istinto) ma contestabile.
- 5 axes proiettati da 4 input = collinearità. Se S_N è già usato per Esplorativo/Cauto, usarlo anche per Memoria/Istinto crea duplicazione.
- Industry pattern: nessun gioco analizzato fa "stretch" di assi psicologici per comodità UI. Tutti costruiscono surface tematica separata.

**Verdict**: non raccomandato. Semanticamente forzato + collinearità.

---

### Opt 2: Extend Engine 4 → 6

```
Engine new:
  Physical axis: speed_normalized, agility_stat
  Cognitive axis: memory_score (action_repetition), reflex_score (action_switch_rate)

UI mapping:
  Agile/Robusto → Physical axis (direct)
  Memoria/Istinto → Cognitive axis (direct)
```

**Pro**: ogni UI axis ha una sola fonte. Semanticamente pulito.  
**Contro**:
- Refactor `vcScoring.js`, `buildVcSnapshot`, contratti schema (2 nuovi campi), telemetria. Blast radius ×2.
- Chi sono Physical e Cognitive nella narrativa del gioco? MBTI e Big Five non includono assi fisici. Crea incoerenza teorica: il sistema è "MBTI + roba".
- Industry warning: CK3, Wildermyth, Spore NON mescolano assi psicologici con assi fisici nello stesso radar. Sono sistemi separati (stat fisiche vs tratti carattere).
- Tempo: ~4-6h refactor + test regression (307/307 baseline da non rompere).

**Verdict**: non raccomandato. Alto effort per basso gain semantico. Crea sistema ibrido confuso.

---

### Opt 3: Hybrid — 3 MBTI projections + 2 stat-derivatives (RACCOMANDATO)

```
UI axis 1: Simbiosi/Predazione → T_F (diretto, già full-coverage)
UI axis 2: Solitario/Sciame → E_I (diretto, già full-coverage)
UI axis 3: Esplorativo/Cauto → S_N*0.6 + J_P*0.4 (blend, entrambi calcolati)
UI axis 4: Agile/Robusto → f(unit.speed, unit.hp_max) [stat snapshot, NON vcScoring]
UI axis 5: Memoria/Istinto → f(action_switch_rate, setup_ratio) [vcScoring derivati]
```

**Pro**:
- Axes 1-3: proiezioni pulite da engine MBTI esistente. Zero refactor engine.
- Axis 4 (Agile/Robusto): derivato da stat unità (già presenti in session state). Pattern Pokemon: Nature = stat bias. Implementazione <1h.
- Axis 5 (Memoria/Istinto): derivato da metriche già calcolate in vcScoring (action_switch_rate, setup_ratio). Aggiunta <2h.
- Ogni axis ha sistema d'origine distinto → no collinearità.
- Industry evidence: Wildermyth (comportamento → label) + Spore (accumulo → path label) + Sims (stat → trait label) usano tutti fonti multiple per axes diversi.

**Contro**:
- 2 sistemi paralleli (MBTI engine + stat-snapshot). Player potenzialmente sente discontinuità se Agile/Robusto "non cambia con l'esperienza" ma Simbiosi/Predazione cambia.
- Soluzione: Agile/Robusto = "fisso al reclutamento" (come IVs Pokemon). Memoria/Istinto = "evolve nel tempo" (come vcScoring MBTI). Frame narrativo: "fisico di nascita / mente che cambia con l'esperienza".

**Verdict**: RACCOMANDATO.

---

## Formule concrete (Opt 3)

### Axis 1: Simbiosi/Predazione

```javascript
// Fonte: vcScoring.js T_F axis
// Valore 0 = Predazione (Thinking, utility-focused)
// Valore 1 = Simbiosi (Feeling, support-focused)
axis_simbiosi = vcSnapshot.mbti_axes.T_F?.value ?? 0.5;
label = axis_simbiosi > 0.65 ? 'Simbiotico' : axis_simbiosi < 0.35 ? 'Predatore' : 'Opportunista';
```

### Axis 2: Solitario/Sciame

```javascript
// Fonte: vcScoring.js E_I axis
// Valore 0 = Sciame (Extravert, team-engaged)
// Valore 1 = Solitario (Introvert, isolated)
axis_solitario = vcSnapshot.mbti_axes.E_I?.value ?? 0.5;
label = axis_solitario > 0.65 ? 'Solitario' : axis_solitario < 0.35 ? 'Sciame' : 'Autonomo';
```

### Axis 3: Esplorativo/Cauto

```javascript
// Fonte: blend S_N (esplorazione) + J_P (pianificazione)
// S_N basso = Intuitive = Esplorativo
// J_P basso = Perceiving = Esplorativo/Improvvisato
// Blend: asse esplorativo = inverso di entrambi
const sn = vcSnapshot.mbti_axes.S_N?.value ?? 0.5;
const jp = vcSnapshot.mbti_axes.J_P?.value ?? 0.5;
// Entrambi bassi = molto esplorativo; entrambi alti = molto cauto/metodico
axis_esplorativo = 1 - (0.6 * sn + 0.4 * jp);
// Valore 0 = Cauto/Metodico, 1 = Esplorativo/Improvvisato
label = axis_esplorativo > 0.65 ? 'Esplorativo' : axis_esplorativo < 0.35 ? 'Cauto' : 'Adattivo';
```

**Note**: coefficienti 0.6/0.4 da tuning. S_N più peso perché "new_tiles" è proxy diretto di esplorazione spaziale. J_P contribuisce la componente pianificazione.

### Axis 4: Agile/Robusto (stat-derivative, fisso al reclutamento)

```javascript
// Fonte: unit.speed e unit.hp_max dal session state (NON vcScoring)
// Pattern Pokemon: stat bias derivato da base stats fissa
// Formula: normalizzare su range tipico del tier
const speed_norm = clamp01((unit.speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN));
const hp_norm = clamp01((unit.hp_max - HP_MIN) / (HP_MAX - HP_MIN));
axis_agile = 0.7 * speed_norm + 0.3 * (1 - hp_norm);
// Valore 0 = Robusto (lento + alto HP), 1 = Agile (veloce + basso HP)
// Coefficienti: speed pesa 0.7 (dominante), HP inverse pesa 0.3 (corroborante)
label = axis_agile > 0.65 ? 'Agile' : axis_agile < 0.35 ? 'Robusto' : 'Equilibrato';
```

**Costanti suggerite** (da calibrare su data esistente):
- `SPEED_MIN=1, SPEED_MAX=6` (range tipico unità da `data/core/species.yaml`)
- `HP_MIN=6, HP_MAX=20` (range tutorial encounters verificato)

**Frame narrativo**: "il corpo di nascita". Non cambia con l'esperienza — riflette la specie. Coerente con "Creatures biofisica fissa al DNA".

### Axis 5: Memoria/Istinto (behavioral-derivative, evolve in-session)

```javascript
// Fonte: vcScoring raw metrics già calcolate
// action_switch_rate: alta = impulsivo/istintivo (cambia tipo azione spesso)
// setup_ratio: alto = pianifica = usa memoria di pattern
// Inversa: Memoria = basso switch + alto setup
axis_memoria = clamp01(
  0.5 * (1 - raw.action_switch_rate) +   // basso switch = alta memoria
  0.5 * raw.setup_ratio                  // alto setup = usa pattern appresi
);
// Valore 0 = Istinto (impulsivo, non pianifica), 1 = Memoria (metodico, ricorda)
label = axis_memoria > 0.65 ? 'Memoria' : axis_memoria < 0.35 ? 'Istinto' : 'Intuitivo';
```

**Note**: `action_switch_rate` e `setup_ratio` già presenti in `vcScoring.js:573-578`. Non serve nuovo calcolo — solo aggregazione nuova.

---

## Effort Estimate

| Axis | Effort | Dove | Rischio |
|------|--------|------|---------|
| 1 Simbiosi/Predazione | 0.5h | Aggiungere alias in surface layer | Basso |
| 2 Solitario/Sciame | 0.5h | Aggiungere alias in surface layer | Basso |
| 3 Esplorativo/Cauto | 1h | Blend S_N + J_P, nuova funzione | Basso |
| 4 Agile/Robusto | 1h | Lettura stat unità + normalization | Basso (verifica SPEED_MIN/MAX) |
| 5 Memoria/Istinto | 2h | Aggregazione raw metrics vcScoring | Basso-Medio (verifica coverage) |
| UI surface (label display) | 2h | debriefPanel.js o scheda creatura | Basso |
| Test + smoke | 2h | unit test per formule + smoke session | Basso |
| **TOTALE** | **~9h** | | |

Prerequisito: nessun refactor engine. Smoke test baseline 307/307 deve reggere post-change.

---

## Risk Register

**R1 — Player percepisce discontinuità tra axes "dinamici" e "statici"**  
Axes 1-3 e 5 cambiano durante/tra sessioni (vcScoring evolve). Axis 4 (Agile/Robusto) è fisso alla specie. Il player potrebbe confondersi su "perché questo cambia ma quello no".  
Mitigazione: frame narrativo esplicito. Label tooltip: "Temperamento acquisito [dinamico]" vs "Fisico di nascita [fisso]". Oppure: mostrare Agile/Robusto in scheda Specie (non nella scheda Personalità) = risolve la discontinuità visuale.  
Probabilità: Media. Impatto: Medio.

**R2 — Esplorativo/Cauto blend S_N+J_P ha coverage "partial" per J_P**  
`vcScoring.js:573-578` documenta J_P come `coverage: 'partial'` (solo `setup_ratio` + `time_to_commit`, manca `last_second` → null nei log brevi). In sessioni corte, J_P può essere null → il blend fallback a solo S_N.  
Mitigazione: fallback esplicito `axis_esplorativo = 1 - sn` quando J_P null. Documentare nel codice. Nella UI: indicatore "coverage bassa" (es. barra punteggiata anziché piena) se J_P non disponibile.  
Probabilità: Alta (sessioni < 20 turni). Impatto: Basso (degradazione graceful).

**R3 — 5 axes UI genera cognitive overload nel player**  
Industry evidence (Tanya X. Short, GD): player gestisce bene 2-3 axes visibili simultaneamente. 5 axes in una scheda radar = rischio "guardo il grafico ma non capisco cosa fare".  
Mitigazione: mostrare SOLO i 2 axes dominanti nel HUD in-game (come Wildermyth top-2). Scheda completa 5-axes disponibile on-demand (click). Oppure: ridurre a 3 axes surface (Simbiosi / Solitario / Esplorativo) e mettere Agile+Memoria come stat secondarie in scheda Specie.  
Probabilità: Media. Impatto: Alto (P4 pillar clarity dipende da questo).

---

## Domande per master-dd

**Q1 — Agile/Robusto nella scheda Personalità o Specie?**  
Se Agile/Robusto riflette la specie (genetica), va nella scheda Specie con stats fisiche. Se vuoi che sia parte della "personalità creatura" vista dal player, resta nella scheda Personalità. La scelta cambia la UX profondamente (2 schede vs 1 radar completo).

**Q2 — Memoria/Istinto deve ACCUMULARSI tra missioni o resettare ogni sessione?**  
Se accumula (come vcScoring MBTI), il player sente la creatura "imparare". Se resetta ogni sessione, è più leggibile ma meno narrativamente significativo. Attuale vcScoring accumula — conferma?

**Q3 — Mostrare 5 axes sempre o solo quelli con confidence sufficiente?**  
Museum card M-009 (Triangle Strategy) suggerisce mostrare solo axes con confidence > 0.7 — phased reveal. Questo richiederebbe estendere vcSnapshot con `confidence_per_axis` (già proposto in Triangle card). Vale l'effort (~6-8h aggiuntive) per un'esperienza più narrativa?

---

## Fonti primary citate

- [Alan Zucconi — AI of Creatures (2020)](https://www.alanzucconi.com/2020/07/27/the-ai-of-creatures/) — Norns drive system
- [Creatures Wiki](https://creatures.wiki/Creatures) — gameplay + Science Kit
- [Black & White Wiki Alignment](https://blackandwhite.fandom.com/wiki/Alignment) — alignment design
- [Spore Wikipedia](https://en.wikipedia.org/wiki/Spore_(2008_video_game)) — creature stage archetypes
- [StrategyWiki Spore Creature Stage](https://strategywiki.org/wiki/Spore/Creature_Stage) — social/predator/adaptable paths
- [CK3 Wiki Traits](https://ck3.paradoxwikis.com/Traits) — 3-slot personality system
- [GD: Maximizing Procedural Personalities — Tanya X. Short](https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities) — design principles (CK2, Dwarf Fortress, Shrouded Isle)
- [CK3 Dev Diary #58 Traits/Stress](https://forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-58-stre-ss-tching-the-traits.1472092/) — surface-engine bridge
- [Dwarf Fortress Wiki Personality Facet](https://dwarffortresswiki.org/index.php/Personality_facet) — 51 facets Big Five derivation
- [Steam: DF Personality Placebo?](https://steamcommunity.com/app/975370/discussions/0/3716062978748076649/) — player feedback
- [Wildermyth Wiki Personality](https://wildermyth.com/wiki/Personality) — 11 stats top-2 eligibility
- [Wildermyth Aywren review](https://aywren.com/2021/06/29/wildermyth-procedural-storytelling-rpg/) — player perception
- [Sims 4 Trait Wiki](https://sims.fandom.com/wiki/Trait_(The_Sims_4)) — CAS visible/hidden traits
- [EA Forum Trait Overhaul](https://forums.ea.com/discussions/the-sims-4-feedback-en/sims-4-base-game-trait-overhaul-%E2%80%93-the-personality-evolution/13223912) — player feedback
- [Dexerto Digimon Personality](https://www.dexerto.com/wikis/digimon-story-time-stranger/personality-system-explained-in-digimon-story-time-stranger/) — quadrant UI confusion
- [Cave of Dragonflies EVs/Natures Math](https://www.dragonflycave.com/evs-natures-and-math/) — Pokemon multi-layer formula
- [Serebii EV/Nature guide](https://forums.serebii.net/threads/a-basic-guide-to-evs-ivs-and-natures.499840/) — Pokemon comprehension gap
- [Digimon Care Mistakes](https://gamefaqs.gamespot.com/ps/913684-digimon-world/answers/183075-what-are-all-the-care-mistakes) — hidden engine pattern

**Repo files citati**:
- `apps/backend/services/vcScoring.js:523-651` — computeMbtiAxes, computeMbtiAxesIter2, deriveMbtiType
- `docs/museum/cards/personality-triangle-strategy-transfer.md` — M-009 Triangle Strategy, Proposal A confidence_per_axis
- `docs/museum/cards/personality-mbti-gates-ghost.md` — M-010 mbti_gates.yaml ghost schema
- `docs/museum/cards/worldgen-forme-mbti-as-evolutionary-seed.md` — M-017 form_pack_bias.yaml starter_bioma
