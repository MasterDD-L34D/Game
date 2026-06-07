---
title: 'Evo-Tactics Device Input Ledger (SPEC-A)'
date: 2026-06-07
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-07'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, device-input, ledger, identity, mbti, conviction, privacy, device-authority]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics Device Input Ledger (SPEC-A)

Contratto Wave-1 #1 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md`).
Formalizza la catena:

```text
device_input_event -> derived signal -> scoring engine -> campaign effect
```

E' il primo contratto perche' gate degli altri: senza, Godot rischia UI che
contraddice la device-authority o duplica scoring gia' live.

## 1. Scopo e non-scopo

**Scopo.** Definire COME gli input dai device diventano segnali di identita' e
effetti di campagna: schema eventi, derivazione, tassonomia di visibilita',
mapping agli engine, retention/consenso.

**Non-scopo (esplicito).** SPEC-A NON ridefinisce la matematica di scoring. Gli
engine `convictionEngine`, `mbtiPalette`/`mbtiSurface`/`mbtiInsights`, `vcScore`/
`vcSnapshot` sono gia' LIVE e restano owner del peso. Il ledger li ALIMENTA, non
li sostituisce. SPEC-A non costruisce sistemi da zero: e' contratto + plumbing.

## 2. Baseline e vincoli

Baseline ratificata: `ADR-2026-06-07` (device-authority / TV-mirror canon).

Invarianti (non negoziabili):

- **TV = mirror, 0 input di gameplay.** Tutte le scelte/conferme dai device.
- **Raw mai sul wire, mai sulla TV.**
- **Engine owner della matematica;** il ledger e' routing + record sottile.

Gia' LIVE (verificato 2026-06-07, non ricostruire):

- Engine identita': `convictionEngine.js`, `mbtiPalette.js`, `mbtiSurface.js`,
  `narrative/mbtiInsights.js`, `vcScore`/`vcSnapshot` (diffuso). Ennea = parziale
  (`docs/reports/2026-05-06-mbti-ennea-audit.md`).
- Decision-events via WS drains: `form_pulse_submit`, `world_vote`, `route_vote`,
  `mating_vote`, `lineage_choice`, `reveal_acknowledge` in
  `apps/backend/services/network/wsSession.js` + `coopOrchestrator.js`.

Anti-pattern da evitare (museum `personality-mbti-gates-ghost`): MBTI come
hard-gate. I signal sono input morbidi, mai cancelli netti.

## 3. Decisioni di design (brainstorming 2026-06-07)

| #   | Decisione    | Scelta                                                                                                                     |
| --- | ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Granularita' | **Fine-grained**: ogni interazione device (tap/hover/timing/undo/preview-scrub) + le scelte.                               |
| Q2  | Localita'    | **Edge-first**: raw locali/effimeri sul device; il device deriva i signal; al backend vanno solo signal + decision-events. |
| Q3  | Architettura | **A -- Signal-bus + feed engine**: thin `deviceInputLedger` instrada signal agli engine LIVE e registra i decision-events. |

## 4. Architettura

### 4.1 Componenti

1. **Capture (Godot client).** Raw fine-grained in buffer locale effimero. Raw
   non lascia il device.
2. **Derivation (Godot client).** Raw -> signal tipati (vedi sez. 6) + emissione
   dei decision-events canonici (riusa i WS drain esistenti). Deterministica.
3. **Wire contract.** device -> backend: `signal_events` (derivati, tier-tagged)
   - `decision_events` (canonici). Mai raw. Mai dalla TV.
4. **`deviceInputLedger` (backend, nuovo, thin).**
   - valida + registra i `decision_events` (campaign / debrief / Custodi);
   - instrada i `signal_events` agli engine LIVE come input aggiuntivi;
   - applica il tier di visibilita' (sez. 5) e decide cosa la TV puo' mirror-are.
5. **Consumers (esistenti).** Engine di scoring -> effetti gia' live (recruit,
   mating, Nido, ERMES/ALIENA, Tri-Sorgente, debrief). Alimentati, non sostituiti.

### 4.2 Data flow

```text
raw (device, effimero)
  -> derive (device)
  -> [signal_events + decision_events, tier-tagged]
  -> wire
  -> deviceInputLedger { record decision ; route signal -> engine }
  -> effetti di campagna esistenti
  -> debrief / Custodi
```

## 5. Tassonomia tier visibilita'

Ogni evento e' taggato all'emissione con uno di 4 tier.

| Tier         | Chi vede                                  | TV mirror | Esempi                                                                                |
| ------------ | ----------------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| `public`     | tutti i player + TV                       | SI        | esiti di gruppo: world_vote, route da quorum, offspring reveal                        |
| `private`    | solo il device del player owner           | NO        | scelta pre-commit, planning-preview, signal individuali del proprio turno             |
| `aggregated` | TV + tutti, SOLO come aggregato di gruppo | SI (agg.) | "il branco e' indeciso", commit-latency medio, mood collettivo                        |
| `secret`     | solo il Sistema/engine                    | NO        | profilo comportamentale che alimenta MBTI/Conviction; "intuizione" del Sistema/ALIENA |

Regole:

1. **Default-tier per classe d'evento** (no tagging manuale ovunque): signal
   comportamentali -> `secret`/`private`; decision di gruppo -> `public`;
   metriche di gruppo -> `aggregated`. Override esplicito ammesso.
2. **La TV puo' mirror-are SOLO `public` + `aggregated`** -- enforced nel ledger.
3. **Promotion gate**: `private`/`secret` -> `public`/`aggregated` solo via evento
   esplicito (`reveal_acknowledge`, debrief). Mai automatico.
4. **`secret` != nascosto-al-player**: il player vede sempre i propri (`private`);
   `secret` = nascosto a tutti gli umani, solo Sistema.

SPEC-B (TV/Public vs Device/Private Contract) eredita questa tassonomia per il
contratto di surface completo.

## 6. Signal canonici v1

Il device deriva; l'engine resta owner del peso. SPEC-A dichiara: il signal
esiste, da cosa deriva, chi lo consuma, il tier default.

| signal (derivato)    | da                                                                        | feed engine LIVE                  | tier default                  |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------- | ----------------------------- |
| `commit_latency`     | timing opzioni -> commit                                                  | MBTI (J/P), Conviction (firmness) | `secret` (+`aggregated` mood) |
| `hesitation_score`   | undo + option-switch pre-commit                                           | MBTI (J/P), Conviction            | `secret`/`private`            |
| `preview_dwell`      | tempo su preview non-canonica                                             | MBTI (S/N, exploration)           | `secret`                      |
| `choice_consistency` | decision-events vs stance dottrinali precedenti                           | Conviction                        | `secret` (+ debrief)          |
| `social_orientation` | decision-events (vota-col-gruppo vs solo, initiative recruit/mating)      | MBTI (E/I, F/T)                   | `secret`/`aggregated`         |
| `risk_posture`       | decision-events (lethal-confirm, route aggressiva, opzioni high-variance) | Conviction, contesto ERMES        | `secret`/`aggregated`         |

Regole:

- v1 mappa **MBTI + Conviction** (engine piu' maturi). **Ennea = DEFERRED v2**
  (engine parziale). `vcSnapshot` = consumer che aggrega questi cross-run.
- Ogni signal e' un **input-proposal**: l'engine decide l'influenza.
- Derivazione **deterministica** dato il raw (requisito per i test).
- YAGNI: 6 signal v1, niente behavioral esotici (microgesture, ecc.) finche' il
  full-loop runner non porta evidenza.

## 7. Retention / consenso / privacy

1. **Raw**: effimero sul device, mai persistito, mai sul wire, scartato a fine
   turno/interazione.
2. **Signal derivati**: in-session per alimentare gli engine; persistiti SOLO in
   forma aggregata/snapshot (`vcSnapshot` cross-run), non lo stream grezzo.
   Retention default per-campaign.
3. **Decision-events**: persistiti (game-state canonico).
4. **Consenso profiling `secret`**: opt-in diegetico all'onboarding ("il Sistema
   ti osserva per adattarsi"). Opt-out -> ledger in modalita' **decision-only**
   (solo decision-events guidano lo scoring); il gioco resta giocabile (graceful
   degrade).
5. **Export / Custodi**: porta solo aggregati/snapshot consentiti (tier-respecting),
   mai raw, mai secret-individuale non consentito. Lega SPEC-F.
6. **Right-to-reset**: il player puo' azzerare il proprio profilo derivato.

## 8. Error handling

- **Device offline / disconnect**: i decision-events sono autoritativi server-side
  (WS drain); i signal persi in offline = graceful degrade, nessun blocco loop.
- **Signal malformato / schema-mismatch**: validato vs schema -> scartato + logged,
  mai crash engine. Decision-event invalido = rifiutato (e' game-state).
- **Engine assente / non-subscribed**: signal senza consumer = no-op. Il ledger
  non assume engine presenti.
- **Clock-skew device**: i timing-signal (`commit_latency`) normalizzati relativi
  all'evento server, non al clock assoluto del device.

## 9. Testing / acceptance

- **Contract-test wire**: schema `signal_events` + `decision_events` (validazione,
  tier-tag obbligatorio, no-raw-enforcement).
- **Derivation determinism**: dato raw fisso -> signal deterministico.
- **Tier enforcement**: il canale TV-mirror riceve solo `public` + `aggregated`
  (mai `private`/`secret`).
- **Graceful degrade**: opt-out profiling -> path decision-only funzionante.
- **Engine feed**: signal instradato all'engine corretto (mock subscription).

Acceptance: la spec e' implementabile quando i signal v1 hanno schema + derivazione

- routing definiti, la tassonomia tier e' enforced sul wire, e il path decision-only
  gira senza profiling.

## 10. Open points / VERIFY (pre-implementazione)

- **VERIFY engine API**: l'interfaccia esatta di subscription/ingest di
  `convictionEngine` / `mbti*` / `vcScore` va letta sul codice e confermata
  prima di redigere il piano (Currency Gate). Il mapping in sez. 6 e' proposto,
  non ancora verificato contro l'API.
- **VERIFY device buffer**: capacita'/lifecycle del buffer raw lato Godot
  (memoria, scarto) da dimensionare con il client.
- **Full-loop metric**: indicare quali metriche del full-loop runner misureranno
  l'effetto dei signal (es. relationship_progress, roster_composition) -- da
  collegare quando SPEC-E/full-loop maturano.
- **Ennea v2**: riattivare quando l'engine Ennea passa da parziale a maturo.

## 11. Relazione con altre spec

- **SPEC-B** eredita la tassonomia tier per il contratto TV/device completo.
- **SPEC-C** (WEGO composer) e' un emettitore primario di raw + decision-events
  (planning/commit).
- **SPEC-D** (cinematic director) consuma solo eventi `public`/`aggregated`.
- **SPEC-F** (Custode portable) consuma snapshot consentiti per l'export.
- **SPEC-L** (runtime inventory) traccia lo stato LIVE/PARTIAL del ledger e degli
  engine consumer.
