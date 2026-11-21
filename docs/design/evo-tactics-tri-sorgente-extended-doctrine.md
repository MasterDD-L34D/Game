---
title: 'Evo-Tactics Tri-Sorgente Extended Doctrine (SPEC-G)'
date: 2026-06-08
type: design-spec
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-17'
source_of_truth: false
review_cycle_days: 30
language: it
tags: [evo-tactics, tri-sorgente, doctrine, reward-cards, card-exchange, agency, device-authority]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics Tri-Sorgente Extended Doctrine (SPEC-G)

Contratto Wave-2 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md` sez. 4).
Estende Tri-Sorgente oltre le reward card: scelte narrative/dottrinali, sedimentazione
delle decisioni, scambio carte come meccanica di informazione/influenza, con la guardia
di sicurezza UX "niente furto di agency opaco".

## 1. Scopo e non-scopo

**Scopo.** Definire l'estensione di Tri-Sorgente: i tre tipi di sorgente (reward /
narrativa / dottrinale), la sedimentazione delle decisioni (branco/Nido/campagna), lo
scambio carte, e il modello di potere delle carte (suggerimento vs vista vs controllo
reale) con la sicurezza di agency.

**Non-scopo (esplicito).**

- SPEC-G NON reimplementa il reward engine: `rewards/rewardOffer` (V2 Tri-Sorgente,
  ADR-2026-04-26: 3 card + skip-fragment, weighting roll/personality/action) +
  `rewardEconomy` + `rewardPoolLoader` sono LIVE. SPEC-G estende il modello, non riscrive.
- SPEC-G NON ridefinisce la visibilita' dello scambio: la **eredita** da SPEC-B sez. 3.9
  - fork F4 (ratificato: esito scambio `public`, contenuto carta `private` tra i 2 trader).
- SPEC-G NON decide l'authority delle surface: device-authority/quorum = SPEC-K.
- SPEC-G NON ridefinisce lo scoring identita'/conviction (engine-owned).

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

| Engine                     | Ruolo                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `rewards/rewardOffer`      | V2 Tri-Sorgente: 3 card + skip (skip_fragment_delta=0 DORMANTE, M10+ nest-sink pending), weighting roll/personality(MBTI)/action |
| `rewards/rewardPoolLoader` | carica il pool carte                                                                                                             |
| `rewardEconomy`            | economia PE/PI/Seed del debrief -- separata, NON e' la pipeline card Tri-Sorgente                                                |

Fonte: `docs/architecture/tri-sorgente/overview.md` (pipeline). SoT sez. 20. Reconstruction
Fase 12 (Tri-Sorgente) + sez. 7 punto 10.

Invarianti ereditate:

- **ADR-2026-06-07 punto 3:** Tri-Sorgente esteso a dottrina = reward + scelte
  narrative/dottrinali + sedimentazione (branco/Nido/campagna) + scambio/eco carte tra
  player. NON un gimmick reward-card isolato.
- **Reconstruction Fase 12 + pt10:** ponte tra bioma, comportamento in run e identita';
  se si saltano le 3 opzioni -> conversione in frammenti genetici; lo "scambio carte" e'
  meccanica di informazione/influenza/memoria condivisa.
- **SPEC-B F4 (ratificato):** il FATTO dello scambio + la sedimentazione = `public`; il
  contenuto della carta resta `private` tra i 2 trader finche' non viene giocato.
- **Anti-pattern (museum `personality-mbti-gates-ghost`):** le carte/dottrine NON sono
  hard-gate; i signal sono input morbidi (vedi TS2).

## 3. Le tre sorgenti

Tri-Sorgente = 3 sorgenti di carte/scelte al debrief (reconstruction Fase 12):

1. **Reward** (LIVE): 3 card pescate dal pool, pesate da roll + personality (MBTI) +
   action recenti; skip -> frammento genetico (infra LIVE ma `skip_fragment_delta=0`,
   riattivabile a M10+ nest-sink; oggi lo skip non accumula).
2. **Narrativa**: scelte di storia/evento (driver: un evento/decisione in-run emette una
   choice al debrief) che sedimentano nel branco/Nido (estensione).
3. **Dottrinale**: scelte che orientano la dottrina del branco (pacifista/predatore/
   simbionte...), con effetto morbido su future opzioni (TS2).

Le 3 sorgenti convergono nello stesso momento debrief; il player sceglie una opzione per
sorgente o skippa (skip -> frammento).

## 4. Modello di potere delle carte: suggerimento / vista / controllo reale

Ogni carta dichiara il proprio **livello di potere** (sicurezza UX, "niente furto di
agency opaco"). NB: `power_level` e' un campo NUOVO dello schema card YAML
(`data/core/rewards/*.yaml`), non presente nel pool corrente -- da aggiungere in
implementazione. Il tipo di sorgente (sez. 3) NON vincola il livello: ogni carta lo
dichiara indipendentemente.

| Livello             | Cosa fa                                                                                      | Authority                                                                   | Visibilita'                               |
| ------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------- |
| **suggerimento**    | bias morbido (FairMath/weight) su scoring/opzioni future                                     | nessun consenso extra                                                       | effetto `secret`/`aggregated`             |
| **vista**           | rivela informazione (telegraph, lore, intel)                                                 | device owner sceglie di guardare                                            | `private` (owner) o `public` se condivisa |
| **controllo reale** | concede controllo/effetto tangibile (es. cedere una PROPRIA creatura/carta, offrire un buff) | **consenso esplicito** del player impattato, su device privato (SPEC-K 6.4) | FATTO `public`, dettaglio `private` (F4)  |

Regola di sicurezza: una carta di **controllo reale** NON puo' agire su un altro player
senza consenso esplicito (mai furto di agency opaco). VIETATE: carte che forzano
voto/azione altrui (anche con consenso "per alzata di mano", vedi TS1); carte che
"sembrano suggerimento" ma alterano stato reale altrui. Il consenso si da' su **device
privato** (anti-coercizione, come F5 lethal). Il livello di potere e' SEMPRE dichiarato
prima di giocare la carta.

## 5. Sedimentazione delle decisioni

- Le scelte narrative/dottrinali SEDIMENTANO: diventano stato persistente del branco/Nido
  (dottrina collettiva) e contesto per Sistema/ALIENA/Custode.
- La sedimentazione e' `public` (memoria del tavolo, via evento esplicito es.
  `doctrine_settled`/`narrative_resolved`) + `aggregated` (lean dottrinale del branco); lo
  scoring identita'/conviction che ne deriva resta `secret` (SPEC-B 3.9).
- Il lean dottrinale ha **cap/decay**: N scelte della stessa dottrina NON chiudono un ramo
  (anti hard-gate accidentale da accumulo; coerente con TS2 soft-bias).
- Quanto lontano sedimenta (single-campaign vs cross-campaign via Custode/SPEC-F) = **TS3**.

## 6. Scambio carte

- Lo scambio carte e' "meccanica di informazione/influenza/memoria condivisa" (pt10).
- Visibilita' (SPEC-B F4 ratificato): il FATTO dello scambio + la sedimentazione = `public`;
  il contenuto della carta = `private` tra i 2 trader finche' non giocato. Reveal del
  contenuto via evento esplicito `card_played` (tier `public`); prima di quell'evento il
  contenuto NON raggiunge la TV.
- Consenso: lo scambio richiede consenso bilaterale dei 2 player (come E5 creature
  transfer); il dettaglio negoziato e' `private` (F4).
- Se lo scambio puo' includere card Custode (SPEC-F) e/o creature (SPEC-E E5), riusa quelle
  infra (signature/whitelist per Custode; consenso bilaterale per creature). Medium dello
  scambio carte-dottrina = **TS4**.

## 7. Relazione con altre spec

- **SPEC-B** (3.9 + F4): visibilita' Tri-Sorgente; esito scambio `public`, contenuto `private`.
- **SPEC-E** (E5): trasferimento creature via consenso bilaterale -- stesso pattern dello
  scambio carte; la dottrina del branco lega ai gruppi sociali.
- **SPEC-F**: lo scambio puo' veicolare card Custode (memoria/influenza); riusa
  signature/whitelist.
- **SPEC-A**: le scelte alimentano i signal identita'/conviction (`secret`), mai hard-gate.
- **SPEC-H/I** (ALIENA/ERMES): la dottrina sedimentata e' contesto per enforcement/pressione.
- **SPEC-K**: device-authority -- le carte di controllo reale richiedono consenso device.

## 8. Decisioni aperte (per Eduardo)

Fork non canon-derivabili. Etichetta `TS#` per non confondere con i fork G1-G5 di SPEC-C.
**RATIFICATI da Eduardo 2026-06-08** (tutti opzione A).

| Fork | Esito ratificato (2026-06-08)                                                |
| ---- | ---------------------------------------------------------------------------- |
| TS1  | Controllo reale solo con consenso, ambito limitato (no coercizione)          |
| TS2  | Dottrina = soft-bias (FairMath/weight + cap/decay), mai hard-gate            |
| TS3  | Sedimentazione single-campaign + eco cross-campaign via Custode (SPEC-F)     |
| TS4  | Scambio: SPEC-F per card persistenti, medium leggero in-session per dottrina |

Sotto: opzioni/rationale originali (storia della decisione).

### TS1 -- Carte "controllo reale": quale ambito e' ammesso?

Una carta di controllo reale puo' agire su cosa?

- **Opzione A -- solo con consenso, ambito limitato (raccomandata).** Controllo reale
  ammesso SOLO su: cedere una PROPRIA carta/creatura, offrire un buff, proporre una scelta
  -- mai forzare voto/azione altrui senza consenso. Tradeoff: niente furto di agency;
  l'influenza passa da proposta + consenso, non da imposizione.
- **Opzione B -- controllo reale ampio (anche coercitivo).** Carte che forzano voto/azione
  altrui. Tradeoff: piu' "politico", ma viola la sicurezza UX (furto di agency).
- **Raccomandazione:** A (B vietato dalla regola di sicurezza sez. 4).

### TS2 -- Bindingness della dottrina: soft-bias o hard-gate?

Le scelte dottrinali bloccano opzioni future (hard-gate) o le pesano (soft)?

- **Opzione A -- soft-bias (FairMath/weight) (raccomandata).** La dottrina pesa le opzioni
  future, non le cancella (coerente con anti-pattern MBTI-hard-gate, museum). Tradeoff:
  identita' emergente senza vicoli ciechi; rigioco vario.
- **Opzione B -- hard-gate.** Una dottrina chiude rami. Tradeoff: scelte piu' "pesanti",
  ma rischio dead-end + l'anti-pattern museum sconsiglia.
- **Raccomandazione:** A.

### TS3 -- Scope della sedimentazione (single vs cross-campaign)

Fin dove sedimentano le decisioni?

- **Opzione A -- single-campaign + eco via Custode (raccomandata).** La dottrina vive nella
  campagna; cross-campaign passa SOLO via Custode esportato (SPEC-F memoria/dossier).
  Tradeoff: ogni campagna ha identita' propria; la continuita' e' opt-in (Custode).
- **Opzione B -- cross-campaign persistente (account-level).** La dottrina persiste tra
  campagne. Tradeoff: continuita' forte, ma serve persistenza account + rischio di
  lock-in identitario tra run diverse.
- **Raccomandazione:** A.

### TS4 -- Medium dello scambio carte-dottrina

Lo scambio carte-dottrina riusa l'infra Custode (SPEC-F signature/whitelist) o e' un medium
leggero separato?

- **Opzione A -- riusa SPEC-F per card persistenti, medium leggero in-session (raccomandata).**
  Le card Custode/biologiche usano signature/whitelist (SPEC-F); le card dottrina effimere
  in-session usano uno scambio leggero (consenso bilaterale, no export). Tradeoff: una sola
  infra pesante (Custode) + scambio rapido per l'in-session; serve distinguere i due tipi.
- **Opzione B -- tutto via infra Custode.** Ogni scambio passa da signature/whitelist.
  Tradeoff: uniforme, ma overhead per scambi effimeri in-session.
- **Raccomandazione:** A.

## 9. Acceptance

SPEC-G e' implementabile/chiudibile quando:

1. le 3 sorgenti (reward/narrativa/dottrinale) convergono al debrief, estendendo
   `rewardOffer` (3 card + skip; nota: `skip_fragment_delta=0` dormante fino a M10+) senza
   reimplementarlo; sorgente narrativa/dottrinale assente -> assente, non sostituita;
2. ogni carta dichiara il livello di potere (suggerimento/vista/controllo reale) e una
   carta di controllo reale NON agisce su un altro player senza consenso esplicito
   (sicurezza UX "niente furto di agency opaco", sez. 4);
3. la sedimentazione e' `public`/`aggregated` (dottrina del branco) con scoring `secret`
   (SPEC-B 3.9); la dottrina e' soft-bias non hard-gate (TS2);
4. lo scambio carte rispetta SPEC-B F4 (esito `public`, contenuto `private`) + consenso
   bilaterale;
5. le Decisioni aperte TS1-TS4 sono ratificate da Eduardo (FATTO 2026-06-08, sez. 8, tutte
   A); resta a Eduardo il flip `review_needed` -> `accepted` al merge;
6. coerenza con SPEC-B (visibilita'/F4), SPEC-E (E5 transfer), SPEC-F (card Custode),
   SPEC-A (signal soft, no hard-gate), SPEC-K (consenso device per controllo reale);
7. test anti-agency-theft: una carta `controllo reale` senza consenso NON altera lo stato
   dell'actor impattato (smoke/unit test); ogni carta dichiara `power_level`.
