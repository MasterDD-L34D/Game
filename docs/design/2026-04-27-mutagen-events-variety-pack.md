---
title: 'Mutagen Events Variety Pack — spec canonica (vertical slice promo + 3 nuovi)'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
category: design-spec
tags: [narrative, events, mutagen, cross-biome, pressure]
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 60
---

# Mutagen Events Variety Pack

## TL;DR

1. **Evento Mutageno promosso da concept a canonical** — `nodo_neurale_rilascio` esce da `Vertical Slice - Minute 2 Combat.html` (SHA de321c95) e diventa entry `data/core/events/mutagen_events.yaml`. Design intent preservato: 4 player choices (A/B/C/D), pressione +0.25/turno → T2 → T3.
2. **3 nuovi eventi distinti** (spillover_genetico_apex, surge_mnemonico_ko, corruzione_ferrosa_gear) — ognuno diverso per trigger, effetto e bioma. No clone.
3. **Anti-pattern UO rispettato** — tutti gli eventi sono modifier flat su session.stresswave e session.pressure. Zero simulazione runtime, zero nuovo physics engine.
4. **Schema v0.2 estende cross_events.yaml** con campi trigger/counterplay/narrative — retrocompatibile, additive.
5. **Wire estimate 3-5h per evento** (handler pattern esiste in reinforcementSpawner + sessionRoundBridge). Dataset ready, runtime not wired.

---

## 1. Promozione vertical-slice — `nodo_neurale_rilascio`

### Fonte

`docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html` (SHA de321c95, PR #1670 2026-04-19). Sezione "MINUTO 2 · EVENTO MUTAGENO · SOGLIA".

Status fonte: archiviato come "Exploration pura, non P0/P1" (`docs/planning/2026-04-20-integrated-design-map.md:162`). La promozione lo sposta a `data/core/events/` come canonical draft.

### Design intent estratto dalla vertical slice

| Campo          | Valore originale                            | Canonical YAML                                   |
| -------------- | ------------------------------------------- | ------------------------------------------------ |
| Trigger        | Pressure +0.25/turno → soglia T2            | `pressure_threshold: 0.50`                       |
| Durata         | 3 turni (T1→T2→T3)                          | `N_rounds: 3`                                    |
| Effetto nemici | nemici mutano, +trait frenesia (Sciame Mn.) | `random_30pct: apply_status frenesia, attack +1` |
| Effetto bioma  | Cresta perde 1 affix luminescente           | `bioma perde affix (pending wire)`               |
| Form shift     | 0.61 predatorio → 0.77 predatorio           | `note per writer, non wired automatico`          |
| Narrative T3   | "Il mondo è diverso. Voi siete diversi."    | `narrative.post`                                 |

### 4 scelte player (vertical slice, preserved)

La vertical slice specifica 4 path espliciti:

- **A — Sopravvivi** (3 turni): no gain, no cost aggiuntivo. Path passivo.
- **B — Raggiungi il nodo** (coordinazione alta): Form shift verso esploratore, stresswave_add halved.
- **C — Acquisisci la mutazione** (DC 14): trait neurale `strappo_planare` (+1 trait, bioma -1 affix). High risk/reward.
- **D — Proteggi il keystone** (difendi Polpo per 3 round): bioma stabile, Form shift verso simbionte.

Player agency: PASS. Quattro path distinti → esiti diversi → failure (Path A puro) è comunque valido.

### Differenza dalla versione archiviata

La promozione NON tenta di wired le UI choice (il sistema choice non esiste). Implementa:

- trigger automatico su pressure threshold
- effetto nemici (frenesia) come modifier flat
- narrative text nella response API
- counterplay come sub-objectives (stesso pattern objectiveEvaluator.js)

---

## 2. Tre nuovi eventi — razionale design

### 2a. `spillover_genetico_apex`

**Trigger**: kill apex unit (boss/elite con sentience_tier >= 2).

**Effetto**: il primo player adiacente eredita temporaneamente il trait[0] dell'apex per il resto dell'encounter.

**Razionale**: pattern Rimworld "Pawn gets disease from corpse" + Subnautica leviathan territorial (la creatura lascia traccia anche dopo la morte). La morte di un boss ha conseguenze narrative in Evo-Tactics — non finisce con il drop di XP. Player sceglie implicitamente l'esito con il positioning (chi è adiacente al kill?).

**Bilanciamento**: max 2 per encounter, cooldown 4 round. pressure_add 0.10 (la morte dell'apex destabilizza il bioma). Counterplay: stai fuori dal range del kill.

**Player sente**: "Ho appena visto qualcosa di più grande di me morire. Qualcosa rimane."

### 2b. `surge_mnemonico_ko`

**Trigger**: player unit va a 0 HP durante il round.

**Effetto**: per 2 round, gli intents del Sistema sono visibili nella response API (`intent_preview`).

**Razionale**: pattern Slay the Spire elite reveal (il danno subito rivela informazione sull'avversario) + XCOM sacrificio (perdere un soldato rivela il pattern nemico). Il KO è già penalità meccanica — non serve anche stresswave aggiuntivo. Invece, si regala info compensativa. Questo trasforma la caduta da pura punizione a scelta narrativa: forse è vantaggioso far cadere qualcuno?

**Bilanciamento**: max 3 per encounter, cooldown 2 round. pressure_add zero (il KO è già la penalità). Counterplay: revivi entro lo stesso round.

**Player sente**: "Quando cade, vede. È un dono o un debito."

### 2c. `corruzione_ferrosa_gear`

**Trigger**: round >= 3 AND pressure > 0.50 (badlands o atollo_obsidiana).

**Effetto**: melee_dmg -1, ranged_dmg +2 su tutti i player.

**Razionale**: pattern Project Zomboid sprinter event (discrete spike che cambia la tattica ottimale senza simulazione) + Stellaris anomaly (modifier flat per tutto l'encounter dopo trigger). La corruzione ferrosa è già nel bioma (affixes: ferrous_spike, dust_storm, magnetic_field_strength: 1.0 per atollo_obsidiana) — l'evento la porta a livello di gameplay modifier. Player deve cambiare approccio (più ranged, meno melee) senza che il gioco dica esplicitamente "cambia approccio".

**Bilanciamento**: max 1 per encounter. stresswave_add 0.03. Counterplay: kill 2 nemici ranged entro 2 round → la corruzione si stabilizza.

**Player sente**: "La polvere entra dentro. Non è cattiva. È solo nuova."

---

## 3. Industry patterns citati

### Stellaris anomalies + crisis events

**Pattern**: soglia trigger (tech/influence) → reveal narrativo → scelta con 2-4 outcome → modifier flat su economy/fleet. Non simulazione: modifier = numero aggiunto a variable. [Stellaris Wiki — Anomalies](https://stellaris.paradoxwikis.com/Anomaly)

**Applicato**: `nodo_neurale_rilascio` e `corruzione_ferrosa_gear` usano lo stesso loop: trigger threshold → narrative reveal → modifier applicato.

### Rimworld events

**Pattern**: event = modifier flat su world state (non simulazione). Random timer + condizione → popup → effetto immediato su stat/mood. "A wanderer has joined." = unit appare. "Toxic fallout." = outdoor_penalty += N. [Rimworld Wiki — Events](https://rimworldwiki.com/wiki/Events)

**Applicato**: tutti e 4 gli eventi sono flat modifier (stresswave_add, stat_delta, info reveal). Zero new physics.

**Anti-pattern evitato**: NON "la tempesta mutagena si propaga tile per tile e riduce HP di ogni unità in range". Quello sarebbe simulazione. L'evento è: "sei in un bioma badlands a round 3 con pressure > 0.50 → ricevi corruzione ferrosa (flat stat swap)".

### Slay the Spire elite/boss

**Pattern**: incontro elite mid-game cambia le stakes (reward unico + debuff persistente). La perdita di HP nel fight è penalità, ma l'informazione acquisita dall'affrontare l'elite compensa. [Slay the Spire Wiki — Elites](https://slay-the-spire.fandom.com/wiki/Elite_Monsters)

**Applicato**: `surge_mnemonico_ko` trasforma il KO da pura perdita in trade-off: perdi un player per 2 round ma guadagni intent_preview. Stessa logica degli elite sts.

### XCOM avenger event / project zomboid sprinter

**Pattern XCOM**: narrative pulse triggered da global progression (council mission → panic level). Il trigger non è casuale — è strutturale. [XCOM EU — Council Missions](https://xcom.fandom.com/wiki/Council_Missions)

**Pattern PZ**: sprinter event = discrete random spike (no warning) che altera tattica fondamentalmente. Risposta player: ricalibra approach. [Project Zomboid — Events](https://pzwiki.net/wiki/Events)

**Applicato**: `nodo_neurale_rilascio` triggered da pressure threshold strutturale (non casuale). `corruzione_ferrosa_gear` triggered da round count + pressure combo (discrete spike).

---

## 4. Counterplay table

| Evento                    | Counterplay                        | Effetto counterplay                      | Difficoltà                    |
| ------------------------- | ---------------------------------- | ---------------------------------------- | ----------------------------- |
| `nodo_neurale_rilascio`   | Sopravvivi 3 turni (A)             | Nessun debuff permanente                 | Facile                        |
| `nodo_neurale_rilascio`   | Raggiungi il nodo (B)              | Form shift, stresswave halved            | Media                         |
| `nodo_neurale_rilascio`   | Proteggi keystone (D)              | Bioma stabile, affix preservato          | Alta (3 round difesa)         |
| `spillover_genetico_apex` | Nessun player adiacente al kill    | Evento non si propaga                    | Richiede positioning conscio  |
| `spillover_genetico_apex` | Rifiuto attivo (1 AP)              | Trait non ereditato, pressure ridotto    | Basso costo                   |
| `surge_mnemonico_ko`      | Revivi il KO stesso round          | Evento non si attiva                     | Richiede heal disponibile     |
| `surge_mnemonico_ko`      | (nessun extend)                    | Info limitata a 2 round intenzionalmente | N/A                           |
| `corruzione_ferrosa_gear` | Kill 2 nemici ranged entro 2 round | stresswave_add reverted                  | Media (richiede ranged build) |
| `corruzione_ferrosa_gear` | Retreat da tile badlands           | Effetto sospeso per quel player          | Alta mobilità richiesta       |

---

## 5. Effort wire runtime

| Componente                        | File target                                                           | Effort stimato | Note                                                    |
| --------------------------------- | --------------------------------------------------------------------- | -------------- | ------------------------------------------------------- |
| Loader eventi YAML                | `apps/backend/services/combat/` (nuovo file `mutagenEventService.js`) | 2h             | Pattern da `reinforcementSpawner.js` loader YAML        |
| Trigger check                     | `apps/backend/services/sessionRoundBridge.js` — `onRoundEnd` hook     | 1h             | Controlla pressure threshold + round count + kill event |
| Effect applicator — frenesia      | `apps/backend/services/combat/policy.js`                              | 1h             | Pattern status application già presente                 |
| Effect applicator — temp_traits   | Session schema + `policy.js`                                          | 3h             | `temp_traits` array non esiste → extend schema          |
| Effect applicator — reveal intent | `sessionRoundBridge.js` + `declareSistemaIntents.js`                  | 2h             | `meta.reveal_sis_intent_rounds` counter                 |
| Effect applicator — stat_delta    | `resolveAttack` — legge `active_modifiers`                            | 2h             | Pattern da M14-A stat_buff/debuff                       |
| Counterplay evaluation            | `objectiveEvaluator.js` — sub-objective opzionale                     | 2h             | Pattern esistente per capture_point                     |
| API surface                       | `GET /api/session/state` → include `active_events[]`                  | 1h             | Additive                                                |
| **Totale**                        |                                                                       | **~14-16h**    | Sequenziale, un evento alla volta                       |

Raccomandazione wire order: `corruzione_ferrosa_gear` prima (più semplice: flat stat mod, trigger semplice, no new schema), poi `surge_mnemonico_ko` (reveal intent, solo meta counter), poi `nodo_neurale_rilascio` (più complessa, 4 path).

---

## 6. Anti-pattern — NON fare

- **No simulazione runtime**: l'effetto di ogni evento non dipende da calcoli fisici (propagazione tile per tile, contaminazione graduale). Flat modifier applicato in un colpo.
- **No più di 1 evento simultane**: `balance.max_simultaneous_events: 1`. Se più trigger si soddisfano nello stesso round, applicare priorità definita nel YAML.
- **No evento mid-combat con popup bloccante**: narrative text va nella response API come campo opzionale `event_narrative`. Il frontend può mostrarlo non-bloccante (stessa logica debrief). Mai `alert()`.
- **No Thought Cabinet abuse**: gli eventi NON sono thought cabinet trigger (quelli sono per onboarding). Namespace separato.
- **No content farm primary citations**: tutte le fonti in questo doc sono wiki primari o blog designatori verificati.
- **No strappo_planare in active_effects.yaml senza design review**: il trait neurale è citato nella vertical slice ma non esiste nel catalog (275 entries post 2026-04-25). Creare il trait richiede ciclo trait-lint + ADR.

---

## 7. Domande per master-dd

1. **Path C (acquisisci mutazione)**: la vertical slice specifica `+trait neurale strappo_planare`. Il trait non esiste in `data/core/traits/active_effects.yaml`. Vuoi crearlo? Oppure il Path C canonical mappa su un trait esistente (es. `risonanza_mentale` dalla mutation table t0_table_d12 in `data/core/biomes.yaml:30`)?

2. **temp_traits per spillover_genetico_apex**: il trait ereditato dall'apex è temporaneo (per-encounter). Serve estendere lo schema di sessione con `temp_traits: []` su ogni unit. Conflitto potenziale con M14 mutation system (che è permanente). Vuoi procedere con temp_traits separato da mutations, o aspettare il wire M14?

3. **Biome scope corretto per nodo_neurale_rilascio**: ho messo `frattura_abissale_sinaptica`, `rovine_planari`, `caldera_glaciale`. La vertical slice è ambientata in un bioma genericamente "Cresta" (non uno dei 20 shipping). Confermi il mapping su frattura + rovine_planari come biomi di alta pressione narrativa, o vuoi scope più ampio (tutti biomi diff_base >= 4)?

---

## 8. File prodotti

- `data/core/events/mutagen_events.yaml` — dataset canonical 4 eventi (schema v0.2)
- `docs/design/2026-04-27-mutagen-events-variety-pack.md` — questo documento

## 9. Fonti primary

- Vertical Slice "Minute 2 Combat" — [docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html](../archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html) (SHA de321c95)
- Museum card M-014 cross-bioma — [docs/museum/cards/worldgen-cross-bioma-events-propagation.md](../museum/cards/worldgen-cross-bioma-events-propagation.md)
- Lore research report — [docs/reports/2026-04-26-lore-alien-event-research.md](../reports/2026-04-26-lore-alien-event-research.md)
- [Stellaris Anomaly Wiki](https://stellaris.paradoxwikis.com/Anomaly)
- [Rimworld Events Wiki](https://rimworldwiki.com/wiki/Events)
- [Slay the Spire Elites Wiki](https://slay-the-spire.fandom.com/wiki/Elite_Monsters)
- [XCOM Enemy Unknown Council Missions](https://xcom.fandom.com/wiki/Council_Missions)
- [Project Zomboid Events](https://pzwiki.net/wiki/Events)
- [Emily Short — Beyond Branching QBN](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/) — pattern QBN per trigger eventi da qualities threshold
