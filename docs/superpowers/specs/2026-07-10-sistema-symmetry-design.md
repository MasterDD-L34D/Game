---
title: 'Simmetria d''azione del Sistema -- 2 AP per creatura, retreat gated, telegraph solo-minacce (design)'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-10'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Simmetria d'azione del Sistema -- SPEC (decisioni owner 2026-07-10, build fattoriale)

Data: 2026-07-10 | Stato: DESIGN RATIFICATO in sessione (brainstorming protocol, decisioni
owner via AskUserQuestion), build NON iniziato | Decider: Eduardo (master-dd)
Feed: `docs/research/2026-07-10-sistema-cap-falsification.md` (falsificazione cap-ipotesi +
finding conversione ~0) + `docs/process/CANONICAL-AI-PLAYTEST.md` + ADR-2026-04-20
(damage_curves target bands) + ADR-2026-04-18 (plan-reveal).

## 1. Perche' (owner rationale + evidence)

**Rationale owner (Eduardo, 2026-07-10)**: le creature AI devono comportarsi come farebbe
un umano ed essere meccanicamente uguali ai PG, perche' il player **recluta i nemici
sconfitti** (`apps/backend/routes/meta.js` POST /api/v1/meta/recruit) e il combattimento
e' l'unico posto dove puo' valutare la creatura che otterra'. Una creatura che gioca con
un'economia diversa da nemica e' illeggibile come futura reclutata.

**Evidence a supporto (misurata, non ipotizzata)**:

1. Il gioco e' FUORI dalla propria banda di design ratificata: `damage_curves.yaml`
   (ADR-2026-04-20) per classe **standard** dichiara WR party [0.35, 0.55], defeat
   [0.25, 0.40], timeout [0.10, 0.20]. Misurato sui 3 grid_sized standard: WR **1.000**,
   defeat 0.000, timeout 0.000 (N=40 x3, substrate-ON). La simmetria non e' un capriccio:
   e' cio' che serve per rientrare in un ADR di aprile.
2. Il Sistema converte in attacco il **4.6%** delle attivazioni e spende ~55% in ritirate
   (intent-mix probe, 18 fight); togliere solo il cap NON muove la WR (dWR 0.000, doc
   cap-falsification). Ne' il numero di attivazioni ne' il cap sono la causa: e' il
   comportamento per-attivazione.
3. L'"Asymmetry invariant" (`ai_profiles.yaml` `sistema_resource_model.note`) NON e'
   ratificato: la fonte citata (`reference_tactical_postmortems.md` A.2) non esiste come
   file nel repo e nessun ADR lo copre. Questo design lo SUPERA formalmente (ADR a valle,
   sez. 9).

## 2. Decisioni owner (ratificate in sessione, 2026-07-10)

| # | Decisione | Scelta |
|---|-----------|--------|
| D1 | Scope simmetria (3 assi possibili) | SOLO **economia d'azione** (2 AP/creatura). `ignores_trait_costs` e `ignores_fog_of_war` restano asimmetrici (fuori scope, rivalutabili dopo) |
| D2 | Telegraph con ~14 azioni/round a regime | **Solo minacce**: attacchi su unita' player, ability rivelate, ingressi in zona obiettivo. Move/retreat non si telegrafano |
| D3 | Cervello | **utilityBrain resta** (personalita' MBTI/Ennea = pilastro); si gata la ritirata. NO sostituzione con lookahead2 |
| D4 | Percorso di build | **Fattoriale 2x2** (`retreat_gate` x `per_unit_ap`), N=10 paired -> N=40 solo su arm vincente |

## 3. Ground-truth verificato (pass Fable 2026-07-10 -- correzioni incluse)

Tutti i punti sotto sono stati verificati sul codice in sessione; DUE correggono il design
presentato a voce.

| Fatto | Path:riga | Nota |
|---|---|---|
| Decremento AP a risoluzione = TUTTI gli attori (Sistema incluso) | `sessionRoundBridge.js:1745` (move), `:1602` (attack), `:719` (else-branch) | **CORREZIONE**: il design a voce diceva "nessuno decrementa gli AP del Sistema" -- falso. Il ledger spendibile e' gia' vivo per il Sistema |
| Refill AP per round = TUTTE le unita' | `sessionRoundBridge.js:1231` -> `applyApRefill` (`sessionHelpers.js:887`) | Nessun filtro fazione; fracture/defy/chilled/slowed/wound gia' centralizzati |
| Il buco e' SOLO alla dichiarazione | `declareSistemaIntents.js` loop `:361` | 1 intent/unita', nessun check affordability; il player invece passa dal gate pending-sum (`sessionRoundBridge.js:145-160`, P1-3 hardening) |
| `resolveIntentApCost` estraibile con dipendenze iniettate | `sessionRoundBridge.js:351` | Cattura `resolveActionApCost` (:308, lazy-require abilityExecutor), `resolveMoveApCost` (:283, cattura `manhattanDistance`), `isValidGridDest` (:332, **cattura `gridSize`**) |
| Anti-double-charge ability da preservare | commento `:325-329` | Il bridge deduce il costo ma NON esegue l'effetto (abilityExecutor si auto-deduce su /round/execute) |
| Ritirate = 99% utilityBrain, non panic | misura intent-mix: 44/45 `retreat_by_UTILITY_AI`, 1 `REGOLA_003` | La soglia rule-based (`retreat_hp_pct: 0.15`) e' rispettata SOLO dal path legacy; utilityBrain la ignora |
| Perche' utilityBrain ritira: scoring di default | `utilityBrain.js:70-157` | `retreat` senza target -> TargetHealth/Distance neutri 0.5; SelfHealth lo PREMIA da ferito (peso 0.7). La ritirata vince per default, non per tattica |
| Soglia gia' raggiungibile dal declare loop | `declareSistemaIntents.js:43` importa `loadAiConfig`; `policy.js:49,65` `LOW_HP_RETREAT_THRESHOLD` da `retreat_hp_pct` (override per-profilo) | Il gate NON introduce knob nuovi |
| Multi-intent per unita' supportato | `roundOrchestrator.js:427` (W8k append) | Con gate AP player-side gia' esercitato (exploit P1-3 chiuso) |
| Punto di innesto telegraph | `sessionRoundBridge.js:2362+` (normalizzazione SIS intents -> threat preview, M8 ADR-2026-04-18) | Il filtro solo-minacce vive li'; `threatPreview.js` ha gia' l'icona `defend: 'shield'` inutilizzata |
| Bersaglio di bilanciamento | `damage_curves.yaml` classe standard | NON si tocca: e' il target, non la vittima |

## 4. Architettura (3 unita', confini netti)

### 4.1 `apps/backend/services/combat/apLedger.js` (nuovo)

Estrazione di `resolveIntentApCost` + `resolveMoveApCost` + `resolveActionApCost` +
`isValidGridDest` dal closure del bridge, con dipendenze INIETTATE (factory):
`createApLedger({ manhattanDistance, gridBounds })`. Aggiunge `canAfford(actor,
pendingIntents, action)` = il pending-sum gate del P1-3 hardening, riusabile.
Il bridge importa e delega: comportamento player **byte-identical** (gate anti-exploit
incluso), provato dai test di regressione esistenti del bridge. PR dedicata, zero
cambi di comportamento.

Vincolo preservato: la nota anti-double-charge (`:325-329`) migra col codice -- se un
futuro dispatch esegue l'effetto ability sul path bridge, la deduzione va tolta li'.

### 4.2 `declareSistemaIntents.js` -- dichiarazione a budget (flag `SISTEMA_PER_UNIT_AP_ENABLED`)

Flag ON: per ogni unita' Sistema viva, il loop decide (utilityBrain/policy come oggi) e
appende intent finche' `canAfford` dice si' (tipicamente move+attack = 2 AP, come un PG).
Flag OFF: byte-identical a oggi. Il flag `SISTEMA_PER_UNIT_ACTIONS_ENABLED` (#3246,
1 intent/unita' uncapped) resta come arm intermedio del fattoriale gia' misurato.

`PRESSURE_TIER_INTENT_CAP` NON si rimuove: cambia consumatore (sez. 4.4).
`sistema_pressure` resta: governa i rinforzi (`reinforcement_from_pressure`), invariato.

**Rischio di risoluzione (dai check Fable)**: l'ordine di risoluzione e' per priorita'
(`initiative + action_speed`), NON per ordine di dichiarazione -- un attack dichiarato
fuori gittata puo' risolversi PRIMA del move che doveva avvicinare. Mitigazione mirror
del player-sim (`lookahead2`): dichiarare attack solo se il target e' in gittata alla
posizione POST-move prevista, e test esplicito "move+attack della stessa unita' Sistema
risolvono entrambi" nel piano (primo test del gradino 2).

### 4.3 Gate ritirata (flag `SISTEMA_RETREAT_GATE_ENABLED`)

utilityBrain non puo' proporre `retreat` quando `hp_ratio > LOW_HP_RETREAT_THRESHOLD`
(la stessa `retreat_hp_pct: 0.15` per-profilo che il path rule-based rispetta gia').
Implementazione: filtro in `enumerateLegalActions` (o al call-site in
declareSistemaIntents) -- si toglie un'opzione, NON si toccano pesi/considerations.
Zero knob nuovi, zero calibrazione SDMG. Sotto soglia la ritirata resta con lo scoring
attuale. Personalita' (stickiness, commit_window, anti-flip #2147/#2008) intatte.

Rischio dichiarato: se retreat era il tappo del kite-cycle (#2008), toglierlo sopra
soglia puo' far riemergere oscillazione. Il probe intent-mix conta gia' i flip; esito
visibile nel fattoriale come pace fuori banda, non come sorpresa in prod.

### 4.4 Telegraph solo-minacce

Al punto di normalizzazione (`sessionRoundBridge.js:2362+`), si telegrafano SOLO:
attack su unita' player, ability rivelate (SPEC-Q reveal resta pubblico), ingresso in
`objective.target_zone`. Move/approach/retreat non producono righe di telegraph (il
movimento si vede sulla board). `PRESSURE_TIER_INTENT_CAP` diventa il tetto di
PRESENTAZIONE (le N minacce piu' gravi) -- non gata piu' l'azione.

**Interpretazione da ratificare in ADR (non data per scontata)**: ADR-2026-04-18
plan-reveal promette al player le MINACCE prima della risoluzione, non ogni passo di
ogni creatura. Il filtro e' conforme a questa lettura; la lettura va ratificata.

## 5. Misura (fattoriale 2x2, criterio = bande damage_curves)

Arm (tutti flag-gated, prod invariato): OFF/OFF (control = N=40 substrate-ON esistenti),
gate-only, AP-only, gate+AP. N=10 paired (seed 1..10) sui 3 grid_sized, stesso harness
`grid-band-probe.js` + `intent-mix-probe.js` per la composizione.

**Criterio di successo NUOVO**: non piu' "direction" (un delta qualsiasi) ma distanza
dalle bande ratificate di `damage_curves.yaml` classe standard (WR [0.35,0.55]).
L'arm vincente e' quello che AVVICINA il misurato alla banda. N=40 solo su quello.
Guardrail N-sample invariato (N=10 probe, N=40 ratifica, CI95).

Secondario (dal probe intent-mix): attack-conversion deve SALIRE (oggi 4.6%); una WR che
scende con conversion ferma = segnale di artefatto, non di fix.

## 6. Il conto (cosa questo lavoro invalida/tocca)

- **Bande pace 3 grid_sized**: da ri-ratificare N=40 sotto i flag vincenti (L-069:
  la semantica d'azione cambia la difficolta' reale). Con esse `grid_ratify_baseline.json`
  + tabella `15-LEVEL_DESIGN.md`.
- **xpBudget `action_economy`** (`dial_cap_reference: 3`, PROPOSED): quel 3 E' il cap.
  Con la simmetria si ricalibra (candidato naturale: scale -> 1 = neutro, il modello
  stat-mass torna sensato) o si ritira il termine. Decisione nel giro di ricalibrazione
  post-fattoriale, non qui.
- **OD-061** (predittore geometrico): resta aperto, contesto cambiato -- un Sistema che
  gioca davvero puo' produrre evidence non-ceiling PRIMA della zone-defense, sbloccando
  il prerequisito.
- **Spec-draft zone-defense** (fork ratificati 07-06): NON revocata; da rivalutare dopo
  il fattoriale (il finding conversione la indebolisce, sez. aggiornamento 07-10 nel
  draft stesso).
- **`damage_curves.yaml`**: INTOCCATA (e' il bersaglio).
- **Encounter authoring**: nessun YAML encounter cambia in questo arco.

## 7. Ordine dei lavori (ogni gradino = 1 PR, flag OFF, revert pulito)

1. ~~Base flag uncapped~~ (#3246 MERGED).
2. **`apLedger` extraction** -- refactoring puro, regressione bridge byte-identical.
3. **`SISTEMA_RETREAT_GATE_ENABLED`** + **`SISTEMA_PER_UNIT_AP_ENABLED`** -- due flag
   distinti, TDD (primo test: move+attack stessa unita' risolvono entrambi; test
   affordability declare-side; test flag-OFF byte-identical su suite AI intera).
4. **Fattoriale 2x2** N=10 paired + intent-mix -> report evidence.
5. **N=40 arm vincente** + ri-ratifica bande + baseline + 15-LEVEL_DESIGN.
6. **Telegraph solo-minacce** (puo' viaggiare in parallelo al 4-5: tocca presentazione,
   non outcome).
7. **ADR** (sez. 9) + flip owner-gated dei flag + rimozione della nota "Asymmetry
   invariant" da `ai_profiles.yaml` (sostituita dal riferimento ADR).

## 8. Rollback

Ogni gradino: revert della sua PR. I flag restano OFF fino all'ADR -> prod non cambia
mai prima della ratifica. Se il fattoriale dice che la simmetria peggiora (WR sotto
banda, oscillazione, pace rotta): i flag non flippano, l'evidence resta come negative
result documentato, la spec-draft zone-defense torna prima opzione.

## 9. ADR a valle (contenuto minimo, decider Eduardo)

1. Supera l'"Asymmetry invariant" sull'asse economia d'azione (fonte inesistente,
   mai ratificato; evidence: questo arco). `ignores_trait_costs` e `ignores_fog_of_war`
   restano e vengono ratificati ESPLICITAMENTE come asimmetrie volute (oggi sono
   solo commento).
2. Ratifica la lettura plan-reveal "telegraph = minacce" (sez. 4.4).
3. Ratifica il nuovo mestiere di `PRESSURE_TIER_INTENT_CAP` (presentazione) e di
   `sistema_pressure` (solo rinforzi).
4. Registra il contesto storico: il cap fu ALZATO post-playtest umano 2026-04-17
   ("solo 1 SIS muove") -- l'asimmetria nacque da feedback reale; la simmetria la
   sostituisce CON misura, non contro quella storia.

## 10. Gap dichiarati

- `ignores_trait_costs` fuori scope: una creatura reclutata paghera' PT/AP per tratti
  che da nemica usava gratis. Il gap di leggibilita' del reclutamento resta APERTO su
  quest'asse (D1 owner: un asse alla volta).
- Il fattoriale gira sul party canonico badlands (comparabilita' paired); party diversi
  = evidence futura.
- Telegraph load reale su TV: la soglia "quante minacce sono leggibili" si decide con
  lo schermo davanti (playtest fisico), non a tavolino -- il tetto presentazione resta
  tunabile.
