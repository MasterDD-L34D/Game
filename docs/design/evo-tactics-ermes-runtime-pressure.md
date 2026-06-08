---
title: 'Evo-Tactics ERMES Runtime Pressure Contract (SPEC-I)'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
review_cycle_days: 30
language: it
tags:
  [evo-tactics, ermes, runtime-pressure, eco-pressure, bands, role-gap, telegraph, diegetic, flow]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics ERMES Runtime Pressure Contract (SPEC-I)

Contratto Wave-2 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md` sez. 4, SPEC-I).
Obiettivo della roadmap: "chiarire come ERMES influenza il gioco senza diventare numero
opaco". Questo documento fissa il contratto della pressione runtime di ERMES: dalle bande
low/medium/high alla pressione di bioma, ai modificatori runtime bounded col cap +/-2
combinato, al telegraph diegetico per il giocatore, fino al rollout su bioma pilota con
gate di promozione N=40. Disambigua inoltre ERMES (pressione ecologica) dal `sistema_pressure`
(meter SIS): due "pressioni" distinte che NON vanno confuse -- la confusione e' proprio il
"numero opaco" che la roadmap vuole evitare.

## 1. Scopo e non-scopo

**Scopo.** Definire il contratto della pressione runtime ERMES: (a) la disambiguazione tra
le due pressioni; (b) le bande discrete low/med/high della pressione di bioma; (c) il
role gap; (d) i modificatori runtime bounded e il cap +/-2 combinato; (e) il telegraph
diegetico player-facing; (f) il pilota + gate N=40. ERMES ALIMENTA gli engine LIVE, non li
riscrive.

**Non-scopo (esplicito).**

- SPEC-I NON reimplementa il bridge ERMES: `services/coop/ermesExporter.js`
  (`getErmesForBiome` / `getErmesBucketed` / `computeRoleGap`),
  `data/core/balance/ermes_bucket_thresholds.yaml` (bande + cap), `services/ermes/ermesRunner.js`
  e il consumer `traitEffects.applyErmesBiomeTraitCosts` sono LIVE
  (ADR-2026-05-29-ermes-runtime-bridge, TKT-BR-03..06). Qui se ne fissa il contratto.
- SPEC-I NON ridefinisce il `sistema_pressure` (meter SIS 0..100, AI War pattern,
  `packs/evo_tactics_pack/data/balance/sistema_pressure.yaml`): lo DISAMBIGUA da ERMES
  (sez. 3), non ne cambia le regole.
- SPEC-I NON ridefinisce la tassonomia tier (eredita SPEC-A) ne' la visibilita' delle
  surface (eredita SPEC-B): la APPLICA al caso ERMES (sez. 9).
- SPEC-I NON decide i valori-seme delle bande/cap (engine-owned, start-values L-069, lock
  = playtest N=40, sez. 8).
- SPEC-I NON tocca l'authority device/surface (SPEC-K).

Complementarieta' in una riga:

```text
ermes_bucket_thresholds.yaml = bande + cap         (i NUMERI bounded)
ermesExporter / traitEffects  = lettura + applica   (il MECCANISMO)
biomeChip                     = telegraph diegetico  (cosa VEDE il giocatore)
SPEC-I                        = contratto + gate     (semantica, disambiguazione, rollout)
```

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

| Engine / artefatto                                        | Ruolo                                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `services/coop/ermesExporter.getErmesForBiome`            | `(biomeId) -> { eco_pressure_score [0,1], bias{} }`. Sorgente: report ERMES, poi STATIC_FALLBACKS per-bioma, poi NEUTRAL 0.5.                    |
| `services/coop/ermesExporter.getErmesBucketed`            | Banda eco_pressure_score via `_bandFor` (low/med/high) + `caps` + `guards`. (mutation/encounter bias bandati solo col report completo).          |
| `services/coop/ermesExporter.computeRoleGap`              | `(partyJobs, biomeId) -> { role: present - demanded }`. `BIOME_ROLE_DEMANDS` (13 biomi). Mirror Godot v2 `ermes_role_gap.gd`.                    |
| `data/core/balance/ermes_bucket_thresholds.yaml`          | Bande discrete + delta + caps (`max_delta_any_stat:2`, `max_delta_per_round:2`, `max_buckets_active_per_unit:3`) + guards. Schema v1.0.          |
| `services/traitEffects.applyErmesBiomeTraitCosts`         | Consumer: accumula i delta delle bande attive e li clampa per-stat a `+/-2` (`_clampDelta`, capDelta = `max_delta_any_stat`). Max 3 bucket/unit. |
| `services/ermes/ermesRunner.js`                           | Reverse-index trait->pool + boot report (`latest_eco_pressure_report.json`); coda idempotente. Non-blocking allo startup.                        |
| `apps/play/src/biomeChip.ecoBandLabel`                    | Telegraph diegetico: low->"Bioma calmo", med->"Bioma in equilibrio", high->"Bioma in tensione". Tooltip "reazione del bioma ai tratti in gioco". |
| `apps/backend/services/worldgen/badlandsPilotScenario.js` | Bioma pilota `enc_badlands_pilot_01` (nemici derivati da YAML specie badlands reali). Banda win_rate [0.40,0.60].                                |
| `packs/.../sistema_pressure.yaml` (DISTINTO)              | Meter SIS 0..100 (AI War): tier Calm/Alert/Escalated/Critical/Apex -> intents_per_round + reinforcement_budget. NON e' ERMES (sez. 3).           |

Invarianti ereditate (non rinegoziabili qui):

- **ADR-2026-05-29 + ADR-21c:** il substrato continuo 0-1 e' INPUT; l'output sui mod
  runtime e' a BANDE discrete (low/med/high) con cap delta +/-2 (mirror ADR-21c). Niente
  numero continuo sui modificatori.
- **Doctrine "Per il giocatore" (ermesExporter + biomeChip):** il nome di sistema "ERMES"
  NON appare MAI al giocatore. L'output e' diegetico (descrittore di bioma), mai la sigla,
  mai il float grezzo. Mirror della doctrine ALIENA (SPEC-H sez. 2).
- **Guards (bucket thresholds):** `null_safe`, `bucket_miss_fallback: low`,
  `soft_fail_on_eco_pressure_missing` -- l'assenza del dato degrada a banda bassa / no-op,
  mai blocca o lancia.
- **Cross-repo parity:** `BIOME_ROLE_DEMANDS` e i band thresholds sono mirror del lato
  Godot v2; ogni edit qui DEVE atterrare anche di la' (anti-drift cross-repo).
- **L-069 start-values + N=40:** bande, cap e attivazione partono da valori-seme; il lock
  arriva da playtest N=40 (N-sample authority: N=10 = direction-probe, N=40 = ratify).

## 3. Le due pressioni (disambiguazione)

Il rischio "numero opaco" nasce dal fatto che esistono DUE pressioni distinte. SPEC-I le
separa esplicitamente:

| Aspetto             | ERMES eco_pressure                                         | sistema_pressure (SIS)                                        |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Cosa modella        | tensione ECOLOGICA del bioma (reazione dell'ambiente)      | escalation del SISTEMA/SIS (quanto e' aggressiva l'IA nemica) |
| Dominio             | substrato continuo 0..1 -> bande low/med/high              | integer 0..100 -> tier Calm..Apex                             |
| Effetto             | modificatori di stat bounded (+/-2 combinato) + spawn bias | intents_per_round + reinforcement_budget + tipi di intent     |
| Sorgente del delta  | bioma + tratti in gioco (eco) + role gap (sez. 5)          | eventi PG (victory/biome_clear: sale; PG-down: cala; decay)   |
| Telegraph al player | descrittore diegetico di bioma ("Bioma in tensione")       | meter esplicito con leve (AI War: "il player vede l'intero")  |
| File                | `ermes_bucket_thresholds.yaml`                             | `sistema_pressure.yaml`                                       |

Conseguenza di contratto:

- Le due pressioni hanno superfici e semantiche DIVERSE; non vanno sommate ne' mostrate
  come un unico numero. Confonderle = il "numero opaco" che la roadmap vieta.
- ERMES resta diegetico-bandato; `sistema_pressure` resta un meter leggibile con leve.
  Se unificarle in un'unica surface player-facing = fork ER4.

## 4. Bande low/medium/high + biome pressure

La pressione di bioma e' la banda discreta di `eco_pressure_score`
(`ermes_bucket_thresholds.yaml`, consumata da `getErmesBucketed` via `_bandFor`):

| Banda | Range `eco_pressure_score` | `delta_mod` | Telegraph diegetico (IT) |
| ----- | -------------------------- | ----------- | ------------------------ |
| low   | [0.00, 0.33)               | -1          | "Bioma calmo"            |
| med   | [0.33, 0.66)               | 0           | "Bioma in equilibrio"    |
| high  | [0.66, 1.00]               | +1          | "Bioma in tensione"      |

- L'input continuo (0..1) NON arriva mai ai modificatori: si banda prima. Questo e' il
  cuore dell'anti-"numero opaco" -- il giocatore percepisce 3 stati, non un float.
- Sorgenti dello score (in ordine di precedenza, `getErmesForBiome`): report ERMES runtime,
  poi STATIC_FALLBACKS per-bioma (es. savana 0.62, caverna 0.78, foresta_temperata 0.32),
  poi NEUTRAL 0.5. `bucket_miss_fallback: low` se la banda non risolve.
- Oltre a `eco_pressure_score`, lo schema definisce bande per `mutation_bias.*`
  (heat_resistance/burst_mobility/efficient_metabolism/sensory_alertness -> delta su
  defense_mod/mobility/rest_recovery/attack_mod) e `encounter_bias.ambush` (spawn_weight_mod);
  queste si bandano solo col report completo (lo static fallback porta il solo
  eco_pressure_score). Vedi sez. 6 per l'applicazione + cap.

## 5. Role gap

Il role gap e' il secondo segnale di pressione: misura quanto la composizione del branco
copre la domanda di ruoli del bioma (`ermesExporter.computeRoleGap`):

```text
role_gap[ruolo] = presenti[ruolo] - richiesti[ruolo]
```

- `BIOME_ROLE_DEMANDS` definisce la domanda per i 13 biomi (es. savana ->
  `{esploratore:1, guerriero:1}`; foresta_miceliale -> `{tessitore:2}`).
- gap negativo = ruolo sotto-organico (la domanda del bioma non e' coperta); gap positivo
  = ruolo in eccesso o non richiesto.
- LIVE: `computeRoleGap` e' una funzione pura, mirror del lato Godot
  (`ermes_role_gap.gd`); `worldEnricher` lo convoglia in `ermes.role_gap`;
  `coopOrchestrator` lo calcola sulla composizione reale del party;
  `listBiomeRoleDemands` lo espone come hint di onboarding/diagnostica.
- Stato del contratto: il role gap e' CALCOLATO ed ESPOSTO; il suo EFFETTO runtime (un
  branco sotto-organico alza la pressione/difficolta'? o resta solo un hint?) e'
  sotto-specificato a oggi = fork ER1. Qualunque effetto scelto rientra comunque nel cap
  +/-2 combinato (sez. 6).

## 6. Modificatori runtime bounded + cap +/-2 combinato

I modificatori sono SEMPRE bounded. Il consumer `applyErmesBiomeTraitCosts`:

```text
totalDelta[stat] = sum( delta delle bande attive su quella stat )
applicato        = _clampDelta(totalDelta[stat], capDelta)   // capDelta = max_delta_any_stat = 2
```

- **Cap +/-2 combinato (per-stat):** il delta accumulato da TUTTE le bande attive su una
  stat e' clampato a [-2, +2]. "Combinato" significa: piu' bande possono spingere la stessa
  stat, ma la somma e' comunque limitata a +/-2 (mirror ADR-21c). Nessuno stacking opaco.
- **`max_delta_per_round: 2`** -- limite anche per round.
- **`max_buckets_active_per_unit: 3`** -- al massimo 3 bande attive su una singola unit
  (leggibilita' di gameplay: niente unit con 6 modificatori simultanei).
- Se il role gap (ER1) avra' un effetto su stat/difficolta', deve passare per lo STESSO
  budget +/-2 combinato (un'unica riserva per stat), non aggiungere un cap parallelo =
  fork ER2.
- Guards: dato mancante -> banda low / no-op (`soft_fail`), mai un modificatore non
  bounded.

## 7. Telegraph player-facing (diegetico, no numero opaco)

Il telegraph e' come la pressione diventa leggibile SENZA esporre il float o la sigla
(`apps/play/src/biomeChip.js`):

- **Banda -> descrittore IT** (`ecoBandLabel`): low/med/high -> "Bioma calmo / in
  equilibrio / in tensione". Tooltip: "... (reazione del bioma ai tratti in gioco)".
- **Pressure tier** (`pressureTier`, TKT-ECO-A5): da `biomeModifiers` (hp_mult /
  pressure_initial_bonus / pressure_mult) -> indicatore `elevated` (warning) o `severe`
  (doppio warning), col tooltip che esplicita HP nemici / pressure init / tick.
- **Doctrine:** "ERMES" non compare; nessun numero grezzo (`eco_pressure_score 0.62` resta
  interno). Il giocatore legge uno STATO diegetico, non una metrica.
- **Granularita':** oggi il telegraph e' a banda (3 stati) + warning di pressure. Se
  aggiungere un hint di DIREZIONE/quale-stat (es. "i predatori sono piu' aggressivi" =
  attacco in salita) = fork ER3 (mai il numero).

Contrasto deliberato con `sistema_pressure`: quello e' un meter esplicito con leve (AI War,
il player vede l'intero e sa come abbassarlo); ERMES e' diegetico-bandato. Due linguaggi
diversi per due pressioni diverse (sez. 3) -- ciascuno leggibile, nessuno opaco.

## 8. Pilot biomi/trait + gate di promozione N=40

L'attivazione segue il pattern L-069 (start-values) + N-sample authority (N=40 ratify):

- **Pilota LIVE:** `enc_badlands_pilot_01` (`badlandsPilotScenario.js`) -- nemici derivati
  da YAML specie badlands reali, banda dedicata win_rate [0.40, 0.60] in
  `damage_curves.yaml`. Tre passate indipendenti `calibrate_parallel` N=40 hanno chiuso a
  WR 0.475-0.525 (pooled ~0.51) -> GREEN
  (`docs/playtest/2026-05-30-badlands-pilot-calibration.md`).
- **Gate di promozione:** una banda/cap (o l'attivazione di un effetto, es. role gap ER1)
  passa da start-values a "locked" / da OFF a ON SOLO dopo un playtest N=40 la cui metrica
  (win-rate dentro la banda del bioma, niente regressione fuori banda) e' GREEN. N=10 =
  direction-probe, mai promozione (CI95 che spanna il ceiling = insufficiente).
- **Trait pilota:** i trait i cui costi/bias ERMES sono in calibrazione restano sul subset
  pilota finche' il gate N=40 non li ratifica; poi si espande (cfr. `ermes_bucket_thresholds`
  - i playtest `2026-05-29-br12-ermes-band-tuning.md` / `2026-05-30-ermes-fase3-p2-calibration.md`).
- Lo scope del pilota (solo badlands vs piu' biomi) e i criteri esatti del gate = fork ER5.

## 9. Visibilita' (eredita SPEC-B)

Applicazione della tassonomia 4-tier (SPEC-A) e del contratto SPEC-B al caso ERMES:

| Dato ERMES                                         | Tier         | Razionale                                                                                   |
| -------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `eco_pressure_score` (float grezzo), `bias` grezzo | `secret`     | input interno; il nome ERMES non surfacing -> il float non lascia gli engine.               |
| Banda diegetica ("Bioma in tensione")              | `public`     | e' il telegraph voluto -- HUD/TV lo mostrano a tutti.                                       |
| Modificatori applicati alle unit (stat in campo)   | `public`     | i numeri di combat sono nel campo condiviso (gia' coperto SPEC-B 3.5/3.6).                  |
| `role_gap` grezzo                                  | `aggregated` | composizione del branco; la TV ne mostra al piu' l'aggregato/hint, non un per-player crudo. |
| Hint role gap di onboarding (per-player)           | `private`    | suggerimento sul device del singolo (es. "manca un esploratore"); non imposto in TV.        |
| `sistema_pressure` (integer 0..100)                | `public`     | per design e' un meter esplicito con leve (AI War) -- contrasto deliberato con ERMES eco.   |

Coerenza con la doctrine: il float ERMES resta `secret`, la banda diegetica e l'effetto
sono `public`. Il contrasto `sistema_pressure` (meter public) vs ERMES eco (banda public,
float secret) e' INTENZIONALE e va mantenuto distinto (ER4).

## 10. Relazione con altre spec

- **SPEC-A** (device-input-ledger): eredita tassonomia 4-tier + `tierFilter`; il float
  ERMES `secret` non lascia gli engine.
- **SPEC-B** (info contract): sez. 9 applica la matrice di visibilita' al caso ERMES.
- **SPEC-H** (ALIENA enforcement/lore): spec gemella. ALIENA = coerenza (CHI spawna),
  ERMES = pressione ecologica (QUANTO premono i modificatori). Condividono la doctrine "il
  nome di sistema non e' player-facing", il bounded-output e il gate N=40.
- **SPEC-D** (TV cinematic director): la regia consuma event-log `public`; la banda ERMES
  e i modificatori vi entrano come dati pubblici (non il float).
- **SPEC-K** (device authority): ortogonale; SPEC-I non tocca chi guida le surface.
- **SPEC-L** (runtime feature inventory): traccia lo stato LIVE/PARTIAL del bridge ERMES,
  del role gap (calcolato, effetto fork) e del rollout pilota.

## 11. Decisioni aperte (per Eduardo)

Fork NON canon-derivabili: l'esito non discende univocamente da ADR-2026-05-29 / ADR-21c /
roadmap. Etichetta `ER#` per evitare clash con gli altri fork (F/G/H/E/FC/TS/J/HA).

### ER1 -- Effetto runtime del role gap

Il role gap e' calcolato + esposto, ma il suo effetto su gioco e' sotto-specificato.

- **Opzione A -- modificatore soft entro il cap (raccomandata).** Un ruolo sotto-organico
  alza la pressione di poco (es. +1 su una stat nemica o sul tier), SEMPRE dentro il budget
  +/-2 combinato, e con telegraph. Tradeoff: il role gap "conta" senza diventare punitivo;
  mirror del bounded-output ERMES.
- **Opzione B -- solo hint, nessun effetto meccanico.** Resta un suggerimento di
  onboarding/diagnostica. Tradeoff: zero rischio di bilanciamento, ma il segnale non ha
  conseguenze (rischia di sembrare ornamentale).
- **Opzione C -- scaling duro (numero nemici/HP).** Tradeoff: effetto forte e leggibile, ma
  fuori dal paradigma bounded e potenzialmente punitivo per party piccoli.
- **Raccomandazione:** A (con gate N=40, sez. 8).

### ER2 -- Semantica del cap combinato tra sorgenti

Il cap +/-2 oggi e' per-stat sui bucket di `applyErmesBiomeTraitCosts`. Quando piu'
sorgenti (eco bande + role gap ER1 + altro) spingono la stessa stat, qual e' il budget?

- **Opzione A -- budget unico condiviso per-stat (raccomandata).** Tutte le sorgenti ERMES
  condividono UN solo +/-2 per stat (si sommano, poi si clampa una volta). Tradeoff: niente
  stacking nascosto, e' il modello piu' leggibile e anti-"numero opaco".
- **Opzione B -- cap per-sorgente.** Ogni sorgente ha il suo +/-2. Tradeoff: piu' effetto
  totale possibile (fino a +/-4 reali), ma reintroduce stacking poco trasparente.
- **Opzione C -- mantenere per-stat sui soli bucket (stato attuale), role gap a parte.**
  Tradeoff: minimo cambiamento, ma lascia ambiguo cosa succede quando i segnali si sommano.
- **Raccomandazione:** A.

### ER3 -- Granularita' del telegraph

Il telegraph e' a banda (3 stati) + warning. Aggiungere un hint di direzione/stat?

- **Opzione A -- banda + hint di direzione soft (raccomandata).** Oltre a "Bioma in
  tensione", un descrittore diegetico della direzione dominante (es. "predatori piu'
  aggressivi" = attacco su; "ambiente che logora" = recupero giu'), MAI il numero.
  Tradeoff: piu' leggibilita' tattica restando diegetico.
- **Opzione B -- solo banda (stato attuale).** Tradeoff: semplice, ma il giocatore sa "c'e'
  tensione" senza sapere verso cosa.
- **Opzione C -- esporre i numeri.** Tradeoff: massima informazione, ma viola la doctrine
  (numero opaco) -- escluso.
- **Raccomandazione:** A; mai C.

### ER4 -- ERMES eco vs sistema_pressure: separate o unificate?

Le due pressioni (sez. 3) restano superfici distinte o si unificano per il giocatore?

- **Opzione A -- separate, telegraph distinti (raccomandata).** ERMES = banda diegetica di
  bioma; `sistema_pressure` = meter SIS con leve. Due linguaggi per due cose. Tradeoff:
  fedele alla semantica, evita la conflazione che genera il "numero opaco".
- **Opzione B -- surface unificata.** Un'unica "pressione" mostrata al player. Tradeoff:
  meno elementi UI, ma somma mele e pere (ecologia + aggressione IA) in un numero -> proprio
  cio' che la roadmap vieta.
- **Opzione C -- engine separati, telegraph unificato.** Tradeoff: compromesso, ma rischia
  di suggerire che siano la stessa cosa.
- **Raccomandazione:** A.

### ER5 -- Scope del pilota + criteri del gate N=40

Quali biomi/trait nel pilota e quale metrica esatta promuove?

- **Opzione A -- badlands first, poi espansione (raccomandata).** Partire dal pilota LIVE
  `enc_badlands_pilot_01` (gia' GREEN a WR ~0.51), gate = win-rate dentro la banda del bioma
  - nessuna regressione fuori banda su N=40, poi estendere bioma per bioma. Tradeoff: lento
    ma data-safe (census anti-pattern: non toccare le bande hardcore ratificate).
- **Opzione B -- pilota a 3 biomi in parallelo.** Tradeoff: copertura piu' rapida, ma piu'
  superfici da tarare insieme + rischio di confondere le cause.
- **Opzione C -- attivazione all-biome dietro un solo gate.** Tradeoff: veloce, ma un solo
  N=40 non copre la varianza tra biomi.
- **Raccomandazione:** A.

## 12. Acceptance

SPEC-I e' implementabile/chiudibile quando:

1. la disambiguazione ERMES eco vs `sistema_pressure` (sez. 3) e' esplicita e nessuna
   surface le confonde in un unico numero;
2. le bande low/med/high della pressione di bioma + le relative soglie/telegraph sono
   documentate (sez. 4) e l'input continuo non raggiunge mai i modificatori;
3. il role gap e' definito come segnale (sez. 5) e il suo effetto runtime (ER1) deciso,
   entro il cap +/-2 combinato;
4. i modificatori runtime sono bounded e il cap +/-2 combinato (semantica ER2) e' fissato
   con `max_delta_per_round` e `max_buckets_active_per_unit`;
5. il telegraph player-facing e' diegetico (nessun float, nessuna sigla) con la granularita'
   decisa in ER3;
6. il pilota (ER5) e il gate N=40 sono definiti, con il pilota badlands LIVE come baseline
   GREEN;
7. la visibilita' e' coerente con SPEC-B (float `secret`, banda/effetto `public`, role gap
   `aggregated`/hint `private`) -- nessuna surface dove ERMES contraddice il contratto B;
8. le Decisioni aperte ER1-ER5 sono ratificate da Eduardo; il flip `review_needed` ->
   `accepted` al merge del PR resta a lui (`source_of_truth:false` finche' non lo decide).
