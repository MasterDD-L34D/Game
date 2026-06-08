---
title: 'Evo-Tactics SPEC-P Failure-as-Lore Loop (spec piena)'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
review_cycle_days: 30
source_of_truth: false
language: it
tags: [evo-tactics, spec-p, failure-as-lore, narrative, meta-loop, degrade, epilogue, telegraph]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics SPEC-P Failure-as-Lore Loop (spec piena)

Contratto Wave-4 (gap-harvest, cluster "Failure & telegraph"). Spec piena dello scope-doc
omonimo: chiude il loop run-fail come arco narrativo persistente ma **bounded** -- la
sconfitta diventa lore (epilogo + degrado meta-network + frammento Custode), NON game-over
secco, senza brickare la campagna. Recupera V3 B18/B16/B14. Pillar P2 (emergente) + P4
(identita' narrativa). Distinto dalla morte per-creatura (SPEC-J).

## 1. Scopo e non-scopo

**Scopo.** Definire il contratto del fallimento-come-lore a livello RUN: i trigger di
run-fail, l'epilogo run-end, l'aggiornamento Codex/wiki, il degrado meta-network cross-run
bounded (A13 write-side), il telegraph diegetico del degrado (A2 read-side), e la garanzia
anti-brick. SPEC-P ALIMENTA gli engine LIVE, non li riscrive.

**Non-scopo (esplicito).**

- SPEC-P NON ridecide la failure-as-lore **per-creatura**: i fork **J3** (cicatrice ->
  tratto/mutazione permanente) e **J5** (lineage automatica + Custode opt-in) sono
  ratificati in SPEC-J sez. 7. SPEC-P opera al livello RUN, non al livello creatura.
- **Sequenza ratificata (QA2):** su wipe/run-fail, **J5 scrive prima** la lineage/Custode
  per-creatura; **poi** l'epilogo SPEC-P CONSUMA quell'output. J5 = input dell'epilogo, non
  output.
- SPEC-P NON definisce lo scoring/threshold ERMES (engine-owned, SPEC-I) ne' il read-side
  StressWave (A2 = SPEC-I); possiede solo il write-side del degrado (A13, QA1).
- SPEC-P NON ridefinisce la tassonomia tier (eredita SPEC-A) ne' la visibilita' (eredita
  SPEC-B): le APPLICA (sez. 9).
- SPEC-P NON costruisce il container Codex (SPEC-H): vi emette eventi che il consumer Codex
  raccoglie.

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

| Engine / artefatto                                                  | Ruolo / stato                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `coopOrchestrator.run.outcome`                                      | Esito run: `victory` / `retreated` (retreat) / defeat-wipe / timeout (debrief). E' la SORGENTE del trigger run-fail.                                   |
| `services/worldgen/metaNetwork{Resolver,Routing,Completability}.js` | Meta-network arc-conditions LIVE (ADR-2026-05-31, GAP-C #2509); flag `META_NETWORK_ROUTING` OFF di default. NESSUN degrado cross-run.                  |
| `services/combat/biomeModifiers.getBiomeStressProfile`              | StressWave struct (`stresswave`, hazard) esposta read-only; il wire `stresswave -> pressure/spawn` e' DEAD (`:188` "separate combat PR, band-verify"). |
| SPEC-J `woundSystem` + sez. 7                                       | Morte/ferite per-creatura + J3 (cicatrice->trait) + J5 (lineage/Custode). LIVE/design. Input dell'epilogo.                                             |
| SPEC-H Codex (`data/codex/*.yaml`, `apps/play/src/codexPanel.js`)   | Codex Hades + A.L.I.E.N.A. 6-dim. Consumer degli eventi lore dell'epilogo (B14 progressive wiki).                                                      |
| SPEC-F export Custode                                               | Veicolo del frammento di lore (`voice_diary_portable`, o nuovo `failure_lore_fragment`).                                                               |
| event-log deterministico                                            | Sorgente di verita' degli eventi run; l'epilogo emette eventi tier-tagged (SPEC-A).                                                                    |

Invarianti ereditate:

- **0 hit `failureLore`** (verificato): l'intero loop SPEC-P e' da costruire; nessun
  epilogo/degrado oggi.
- **Doctrine "no numero opaco"** (mirror SPEC-I): il degrado e i suoi effetti sono telegrafati
  in modo diegetico, mai come float grezzo.
- **Bounded-output** (mirror ADR-21c/SPEC-I): il degrado meta-network ha un cap; nessuno stato
  rende la campagna ingiocabile.
- **ADR-2026-06-07 punto 6:** failure/StressWave tra i sistemi runtime da inventariare (SPEC-L).

## 3. Trigger run-fail

Il loop si attiva quando `run.outcome` non e' `victory`. Quattro trigger canonici:

| Trigger          | Sorgente                                            | Note                                |
| ---------------- | --------------------------------------------------- | ----------------------------------- |
| vittoria mancata | `objectiveEvaluator` -> `outcome: objective_failed` | obiettivo non-elim fallito (SPEC-O) |
| wipe             | party tutta KO -> `outcome: wipe`                   | loss_condition `player_wipe`        |
| ritirata         | `retreat()` -> `outcome: retreated`                 | early-end volontario                |
| timeout          | `time_limit` superato -> `outcome: timeout`         | sabotage/escape/escort (SPEC-O)     |

Ogni trigger emette un evento `run_failed { outcome, encounter_id, biome_id }` (event-log,
tier `public`) che apre l'epilogo (sez. 4).

## 4. Epilogo run-end (surface contract)

L'epilogo (~60s) traduce il fallimento in lore. **NON e' un round-beat** -> SPEC-D e'
round-scoped; l'ownership della surface epilogo run-end = fork **PA1** (sez. 11).

Contratto (chi-possiede-PA1-a-parte):

- **Trigger:** evento `run_failed` (sez. 3).
- **Input (QA2):** consuma l'output di J5 gia' scritto (caduti, lineage, Custode opt-in) +
  il `run.outcome` + il biome.
- **Contenuto:** voce Skiv/Custode (diegetica, prima persona) che narra i caduti e il
  degrado del bioma; aggancio Codex (sez. 5).
- **Payload tier (SPEC-B):** recap esito + bioma ferito = `public` (TV); il dettaglio
  per-creatura del giocatore (grief-state, scelte) = `private` (device); identita' dei caduti
  = opt-in self-disclosure (mirror SPEC-B F5). Vedi sez. 9.
- **Durata/skip:** ~60s, skippabile a recap sintetico (anti-cutscene-punitiva, sez. 8).

## 5. Wiki/Codex progressivo (SPEC-H)

Il fallimento e' un trigger di scoperta Codex (pattern Hades, B14):

- L'epilogo emette un evento lore (`codex_unlock` / `codex_update { entry_id, on:'failure' }`)
  che il consumer Codex di **SPEC-H** raccoglie (SPEC-P non costruisce il Codex).
- L'entry aggiornata usa lo schema 6-dim A.L.I.E.N.A. (SPEC-H sez. 5); il fallimento puo'
  sbloccare la dimensione "Ecologia/Norme" di una specie incontrata-nel-fallire.
- Coerenza doctrine: il Codex mostra lore, mai metriche di degrado grezze.

## 6. Degrado meta-network bounded (A13 write-side)

QA1 (ratificato): **SPEC-P possiede il write-side di A13** (degrado biome cross-run);
SPEC-I resta read-side della pressione.

Contratto del degrado:

- Un bioma in cui la run fallisce diventa "ferito": stato persistente cross-run sulla
  meta-network (`metaNetworkResolver`/state), additivo.
- **Bounded (cap):** il degrado e' limitato -- valore concreto del cap = fork **PA2**
  (es. max N biomi degradati simultanei + step di degrado limitato + recupero automatico
  dopo M run vinte). NESSUN cap -> rischio brick (vietato, sez. 8).
- **Effetto:** il bioma ferito alza la pressione ecologica (input a SPEC-I read-side) e/o
  apre rami narrativi; l'effetto sui modificatori passa per il cap bounded di SPEC-I
  (+/-2 combinato, ER2) -- SPEC-P non aggiunge un cap parallelo sulle stat.
- **Recupero:** una via di recupero DEVE esistere (vincere nel bioma ferito lo risana) per
  garantire l'anti-brick (sez. 8).

## 7. StressWave telegraph (A2, SPEC-I read-side)

QA1: SPEC-I fornisce il SEGNALE StressWave (read-side); SPEC-P lo consuma per telegrafare il
degrado.

- Oggi il wire `stresswave -> pressure/spawn` e' DEAD (`biomeModifiers.js:188`): da attivare
  (combat PR + band-verify) prima dell'uso runtime.
- Telegraph diegetico (mirror SPEC-I biomeChip): il bioma ferito si legge come descrittore
  ("bioma in cicatrice / instabile"), mai come numero. Granularita' direzionale eventuale =
  coerente con ER3.

## 8. Failure bounded (anti-brick)

Invariante P1: **nessuno stato rende la campagna ingiocabile.**

- Cap sul degrado (PA2) + via di recupero sempre presente (sez. 6).
- **Recovery leggibile (PA3):** il giocatore DEVE poter capire che la campagna e' ancora
  vincibile dopo fallimenti consecutivi -- il degrado e la via di recupero sono telegrafati
  in modo diegetico (no degrado silenzioso che "sembra" brick). Forma del telegraph di
  recupero = fork PA3.
- Anti-punizione UX: l'epilogo e' skippabile (sez. 4); il framing e' "la sconfitta e'
  memoria", mai patronizzante.

## 9. Visibilita' (eredita SPEC-B)

| Dato SPEC-P                                       | Tier                           | Razionale                                                                |
| ------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Esito run + bioma ferito (recap epilogo)          | `public`                       | recap del tavolo (TV), come gli altri esiti round/missione (SPEC-B 3.x). |
| Dettaglio per-creatura del caduto (grief, scelte) | `private`                      | sul device del giocatore proprietario.                                   |
| Identita' dei caduti nell'epilogo TV              | `aggregated` + opt-in          | anonimo/aggregato di default; opt-in self-disclosure (mirror SPEC-B F5). |
| Stato di degrado meta-network (valore grezzo)     | `secret`                       | interno engine; al player arriva solo il telegraph diegetico (sez. 7).   |
| Telegraph diegetico del degrado/recupero          | `public`                       | descrittore di bioma (HUD/TV), mai il numero.                            |
| Frammento lore Custode esportato                  | `private` -> `public` su gioco | come SPEC-F/Tri-Sorgente: privato finche' non condiviso.                 |

## 10. Relazione con altre spec

- **SPEC-J** (lethal/wounds): J3/J5 = livello creatura, scrivono PRIMA (QA2); SPEC-P =
  livello run, consuma dopo. Fence in Non-scopo.
- **SPEC-I** (ERMES pressure): QA1 -- SPEC-I read-side A2 StressWave + pressione; SPEC-P
  write-side A13 degrado. Il degrado alimenta la pressione SPEC-I (entro il cap ER2).
- **SPEC-H** (ALIENA/Codex): consumer degli eventi lore dell'epilogo (B14 progressive wiki).
- **SPEC-F** (Custode portable): veicolo del frammento di lore (export).
- **SPEC-D** (TV director): round-scoped; l'epilogo run-end e' surface separata (PA1).
- **SPEC-O** (mission templates): i fallimenti obiettivo (sabotage/escape/escort timeout)
  sono trigger run-fail (sez. 3).
- **SPEC-B/A**: visibilita' (sez. 9) + tier enforcement.
- **SPEC-L**: traccia lo stato (0-built oggi) del loop failure-as-lore.

## 11. Decisioni

**Ratificate (Eduardo 2026-06-08):**

- **QA1** -- A2/A13 ownership: SPEC-I read-side A2 StressWave; SPEC-P write-side A13 degrado
  cross-run (fence speculare in SPEC-I).
- **QA2** -- J5 vs SPEC-P: layered + sequenced (J5 per-creatura prima; epilogo SPEC-P dopo).

**Aperte (per Eduardo)** -- fork etichetta `PA#` (anti-clash con F/G/H/E/FC/TS/J/HA/ER/QA):

### PA1 -- Ownership della surface epilogo run-end

L'epilogo (~60s) e' un round-beat (SPEC-D) o una surface separata?

- **Opzione A -- SPEC-P possiede il contratto epilogo (raccomandata).** Trigger + payload +
  tier inline in SPEC-P; SPEC-D resta round-scoped. Tradeoff: confine netto, SPEC-D non si
  gonfia. Costo: una nuova surface da implementare.
- **Opzione B -- addendum run-end a SPEC-D.** SPEC-D estende lo scope a beat run-end.
  Tradeoff: riusa la regia cinematic, ma allarga SPEC-D oltre il round.
- **Raccomandazione:** A.

### PA2 -- Cap concreto del degrado A13

Quanto e' "bounded" il degrado?

- **Opzione A -- cap stretto + recupero (raccomandata).** Max ~2 biomi degradati
  simultanei, step di degrado piccolo (1 banda), recupero automatico vincendo nel bioma
  ferito (o dopo M=2 run vinte). Tradeoff: chiaramente anti-brick, leggibile.
- **Opzione B -- cap ampio, degrado cumulativo profondo.** Piu' tensione roguelike, ma
  rischio percezione-brick + richiede telegraph di recupero molto chiaro (PA3).
- **Opzione C -- degrado solo narrativo (no effetto meccanico).** Zero rischio bilanciamento,
  ma il degrado "non si sente".
- **Raccomandazione:** A (valori da ratificare N=40, mirror SPEC-I gate).

### PA3 -- Forma del telegraph di recupero

Come il player capisce che la campagna e' ancora vincibile?

- **Opzione A -- descrittore diegetico di bioma + hint recupero (raccomandata).** "Bioma in
  cicatrice -- una vittoria qui lo risana"; mai numeri. Tradeoff: leggibile, coerente
  doctrine.
- **Opzione B -- indicatore meta-map esplicito** (icona degrado sulla mappa campagna).
  Tradeoff: chiarissimo, ma piu' UI + meno diegetico.
- **Raccomandazione:** A; B come complemento meta-map eventuale.

## 12. Acceptance

SPEC-P e' implementabile/chiudibile quando:

1. i 4 trigger run-fail (sez. 3) emettono `run_failed` tier-tagged dall'event-log;
2. l'epilogo run-end (sez. 4) ha trigger + payload + tier definiti, con l'ownership decisa
   in PA1, e consuma l'output J5 (QA2);
3. l'aggancio Codex (sez. 5) emette eventi che il consumer SPEC-H raccoglie (no Codex
   costruito qui);
4. il degrado meta-network (sez. 6, A13 write-side) e' bounded con il cap deciso in PA2 +
   una via di recupero, passando per il cap +/-2 di SPEC-I (ER2) per gli effetti su stat;
5. il telegraph (sez. 7) e il recovery-telegraph (PA3) sono diegetici (nessun float, nessuna
   sigla; il wire StressWave va attivato lato combat);
6. l'invariante anti-brick (sez. 8) e' verificabile: nessuna sequenza di fallimenti rende la
   campagna ingiocabile (test meta-network + recovery path);
7. la visibilita' (sez. 9) e' coerente con SPEC-B (degrado grezzo `secret`, recap/telegraph
   `public`, dettaglio caduto `private`, identita' opt-in);
8. QA1/QA2 restano ratificati e PA1-PA3 sono ratificati da Eduardo; il flip
   `review_needed` -> `accepted` al merge resta a lui (`source_of_truth:false`).
