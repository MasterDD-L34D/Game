---
title: 'Evo-Tactics Nido Groups, Party Select and Tribe (SPEC-E)'
date: 2026-06-08
type: design-spec
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-17'
source_of_truth: false
review_cycle_days: 30
language: it
tags: [evo-tactics, nido, party-select, tribe, social-group, sub-pack, device-authority]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics Nido Groups, Party Select and Tribe (SPEC-E)

Contratto Wave-2 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md` sez. 4).
Modella il **gruppo sociale per-player** (sotto-branco), il **party select**, la
**successione** e la **nascita della tribu'**, distinguendoli dal **branco comune**.

## 1. Scopo e non-scopo

**Scopo.** Definire il modello dati del gruppo sociale per-player (`player_id ->
sub_pack -> mvp -> units`), la distinzione branco-comune vs gruppi-sociali vs tribu',
e il contratto di surface (party select, creatura principale, reclute, mating/offspring,
successione, risorse Nido) con device-authority e visibilita'.

**Non-scopo (esplicito).**

- SPEC-E NON reimplementa gli engine meta: `rosterStore`, `metaProgression`,
  `mating/computeMatingEligibles`, `mating/coopMatingResolver`, `lineage/offspringRitual`,
  `lineage/offspringStore`, `meta/geneEncoder`, `biomeAffinity` sono LIVE (full-loop
  runner #2562-2589). SPEC-E e' il contratto di modello + surface, li ALIMENTA.
- SPEC-E NON ridefinisce la visibilita': la **eredita** da SPEC-B (sez. 3.7 Nido + 3.8
  mating/recruit). Qui la si applica al gruppo sociale.
- SPEC-E NON decide CHI guida le surface: e' SPEC-K (7.5/7.6, K-04). SPEC-E e' il modello.
- SPEC-E NON ridefinisce la genetica/scoring (geneEncoder + trust/affinity engine-owned).

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

| Engine / store                                            | Ruolo                         |
| --------------------------------------------------------- | ----------------------------- |
| `campaign/rosterStore`                                    | persistenza roster del branco |
| `metaProgression`                                         | progressione meta (Nido step) |
| `mating/computeMatingEligibles`                           | coppie mating eleggibili      |
| `mating/coopMatingResolver`                               | risoluzione mating co-op      |
| `lineage/offspringRitual` + `offspringStore`              | offspring + persistenza       |
| `meta/geneEncoder` + `meta/mutationTreeSwap`              | genetica/mutazioni            |
| `species/biomeAffinity`                                   | affinity bioma                |
| `tools/sim/*` (recruit-resolver, nido-economy, full-loop) | runner full-loop (#2562-2589) |

Reconstruction: **Fase 6** (sotto-branco), **Fase 13** (Nido). Ciclo dimostrato:
`campagna -> combat REALE -> advance -> Nido recruit -> choose -> completed`.
Risorse Nido: PE/PI/SG/PP/PT (o equivalenti).

Invarianti ereditate:

- **Reconstruction Fase 6:** ogni player controlla un SOTTO-BRANCO (1 MVP/anchor +
  1-N secondarie), con identita' propria ma parte del branco comune. Schema gap da
  chiudere: `player_id -> sub_pack -> mvp_unit_id -> unit_ids`.
- **SPEC-B 3.7/3.8:** Nido = `public` comune (lineage tree, risorse, Custode); azioni
  per-player (`private`); relazioni `aggregated`; scoring trust/affinity `secret`.
- **SPEC-K 6.4/7.6 + K-04:** party select e creatura principale = device-owned;
  successione/pensionamento = per-player consent; `PhoneNidoView` da mirror a action hub.

## 3. Modello dati: branco comune / gruppo sociale / tribu'

```text
branco_comune (party)
  - sub_pack[player_id]            # gruppo sociale per-player
      - mvp_unit_id                # creatura principale attiva (anchor)
      - unit_ids[]                 # secondarie (1-N)
      - recruits[]                 # reclute accettate
      - mating_pairs[]             # coppie / breeding in corso
      - lineage[]                  # storia genealogica del sotto-branco
      - custode_ref?               # Custode opzionale legato (popolato da SPEC-F)
  - eligible_pool[]                # SOLO creature unassigned (MVP/owned riservati, E4)
  - shared_resources               # PE/PI/SG/PP/PT comuni
  - lineage_tree                   # genealogia pubblica del branco
tribu' = emergente da sub_pack persistenti + lineage profonda (vedi E3)
```

- **Branco comune**: l'organismo collettivo del tavolo. La TV lo mostra come UNO (non 4
  schermate), Fase 6.
- **Gruppo sociale per-player** (sotto-branco): identita' del player; gestito sul device;
  MVP per leggibilita'/camera/debrief/identita' (l'MVP non blocca che una secondaria
  diventi importante).
- **Tribu'**: sedimentazione di sotto-branchi + lineage nel tempo (nascita = E3).

## 4. Contratto di surface (device-authority + visibilita' SPEC-B)

| Surface                    | Authority (SPEC-K) | public (TV)                                          | private (device)                   | aggregated                                             | secret                    |
| -------------------------- | ------------------ | ---------------------------------------------------- | ---------------------------------- | ------------------------------------------------------ | ------------------------- |
| Creatura principale (MVP)  | device             | MVP pubblico del branco                              | scelta/cambio MVP                  | --                                                     | --                        |
| Party select               | device             | composizione party committata                        | selezione dal proprio sotto-branco | --                                                     | --                        |
| Creature libere/eleggibili | device             | pool pubblico: solo unassigned (MVP/owned riservati) | shortlist filtrata del player      | --                                                     | --                        |
| Reclute                    | device             | lista candidati, ingresso roster                     | accept/reject sul device           | --                                                     | compatibility scoring     |
| Trust/affinity             | -- (lettura)       | --                                                   | valori delle PROPRIE creature      | coesione branco (categoria, non pair; SPEC-B 3.7 edge) | scoring interno           |
| Mating/breeding            | device             | tally + offspring reveal                             | mating vote/scelta pre-tally       | mating tally in corso                                  | epigenome roll pre-reveal |
| Offspring                  | device             | offspring reveal (promotion gate)                    | rituale sul device                 | --                                                     | epigenome pre-reveal      |
| Successione                | device (consent)   | esito successione                                    | conferma del player owner          | "in attesa" del consenso owner                         | --                        |
| Nido shared resources      | device/quorum (E6) | pool comune + spese                                  | proposta di spesa pre-commit       | --                                                     | --                        |
| Tribu' (nascita)           | sistema            | reveal nascita tribu'                                | --                                 | sedimentazione                                         | trigger interno (E3)      |

Dettaglio visibilita' = SPEC-B 3.7 (Nido) + 3.8 (mating/recruit). SPEC-E NON ri-tabula i
tier: rimanda a SPEC-B. Qui aggiunge solo il modello sociale sotto-stante.

> Fork ratificati 2026-06-08 (E1-E6, sez. 8): eligible-pool = solo creature unassigned
> (MVP/owned riservati all'owner); spesa risorse = quorum del branco. Tabella allineata.

## 5. Branco comune vs gruppi sociali (la distinzione)

- Decisioni di combat: il sotto-branco di ogni player committa i propri intent (SPEC-C),
  ma si combinano in un piano del branco comune (Fase 6: "le decisioni individuali devono
  potersi combinare in piano condiviso").
- La TV mostra il branco comune come organismo (public); il device mostra solo il proprio
  sotto-branco + info private (Fase 6 UX).
- Reclute/offspring entrano in un sotto-branco specifico (per-player), ma il roster e la
  lineage del branco comune restano pubblici.
- Risorse: condivise (branco comune); la spesa puo' essere quorum/device (vedi E-resource).

## 6. Successione (creatura principale)

- L'MVP puo' ritirarsi (pensionamento), morire o essere promosso. La successione (chi
  diventa il nuovo MVP) e' **device-owned + per-player consent** (SPEC-K 6.4): tocca
  l'agency/identita' del player, NON e' quorum.
- L'esito (nuovo MVP) e' `public`; la conferma e' `private` (device del player).
- Modello esatto (auto-promote bond-massimo vs scelta player vs ...) = **fork E2**.

## 7. Relazione con altre spec

- **SPEC-B**: eredita visibilita' Nido (3.7) + mating/recruit (3.8).
- **SPEC-K**: authority device per party/MVP/recruit/mating/successione (7.5/7.6, K-04).
- **SPEC-C**: il sotto-branco e' l'unita' di composizione combat (MVP + controlli extra).
- **SPEC-D**: MVP = camera focus / debrief identity (H1 salience).
- **SPEC-F** (Custode portable): un Custode puo' essere estratto da un sotto-branco;
  crossbreeding solo per Custodi biologici (SPEC-F).
- **SPEC-G** (Tri-Sorgente): scambio carte; eventuale trasferimento creature = **fork E5**.
- **SPEC-J** (lethal/wound): ferite/rituali propagano nel sotto-branco (Fase 13).
- **SPEC-A**: signal `social_orientation` deriva da decisioni di gruppo (sez. 6 SPEC-A).

## 8. Decisioni aperte (per Eduardo)

Fork non canon-derivabili. **RATIFICATI da Eduardo 2026-06-08**.

| Fork | Esito ratificato (2026-06-08)                                                          |
| ---- | -------------------------------------------------------------------------------------- |
| E1   | Cap soft (MVP + 3-4 secondarie attive; roster Nido illimitato)                         |
| E2   | Successione = scelta del player (default suggerito bond/lineage max)                   |
| E3   | Nascita tribu' ibrida: soglia sblocca + scelta narrativa conferma                      |
| E4   | Pool comune + claim device; MVP/owned RISERVATI all'owner (solo unassigned claimabili) |
| E5   | Trasferimento via consenso bilaterale (principio; dettaglio rifinito con SPEC-G)       |
| E6   | Spesa risorse = quorum/voto del branco (proposta device + tally TV)                    |

Sotto: opzioni/rationale originali (storia della decisione).

### E1 -- Cap dimensione sotto-branco

"1-N creature secondarie": c'e' un cap al sotto-branco per-player (party size)?

- **Opzione A -- cap soft per leggibilita' (raccomandata).** Es. MVP + 3-4 secondarie
  attive in missione, roster Nido illimitato. Tradeoff: combat leggibile (SPEC-C/D) +
  collezione libera nel Nido; serve tarare il numero.
- **Opzione B -- nessun cap.** Tutte le creature schierabili. Tradeoff: liberta', ma
  combat affollato + camera/UX pesante (contro Fase 6 "leggibilita'").
- **Raccomandazione:** A.

### E2 -- Modello di successione MVP

Quando l'MVP si ritira/muore, chi diventa il nuovo MVP?

- **Opzione A -- scelta del player (raccomandata).** Il player owner sceglie il nuovo MVP
  tra le proprie creature (per-player consent, SPEC-K 6.4). Tradeoff: massima agency;
  default suggerito = bond/lineage piu' alto.
- **Opzione B -- auto-promote (bond/lineage massimo).** Automatico. Tradeoff: zero UI, ma
  toglie un momento identitario (la successione e' narrativamente forte).
- **Raccomandazione:** A (con suggerimento B come default pre-selezionato).

### E3 -- Trigger di nascita della tribu'

Cosa fa emergere una "tribu'" dai sotto-branchi + lineage?

- **Opzione A -- soglia lineage+generazioni (raccomandata).** La tribu' nasce quando il
  branco raggiunge N generazioni / M membri con lineage condivisa. Tradeoff: emergente e
  leggibile; serve definire le soglie.
- **Opzione B -- evento narrativo (Tri-Sorgente/Custode).** La tribu' nasce da una scelta
  dottrinale (SPEC-G). Tradeoff: piu' autoriale, ma meno emergente.
- **Opzione C -- ibrido.** Soglia sblocca l'opzione, la scelta narrativa la conferma.
- **Raccomandazione:** C.

### E4 -- Pool creature eleggibili: condiviso o per-player?

Le "creature libere/eleggibili" per il party select sono un pool condiviso (chiunque
puo' prenderle) o per-player?

- **Opzione A -- pool comune con claim device (raccomandata).** Le eleggibili sono del
  branco comune; un player le claima sul proprio device (prima-arriva o quorum su
  conflitto). Tradeoff: coerente con "branco comune", ma serve gestire il conflitto
  (2 player, stessa creatura). Eco di Fase 5 ("stessa specie? stessa creatura no").
- **Opzione B -- per-player owned.** Ogni recluta entra gia' assegnata a un sotto-branco.
  Tradeoff: niente conflitto, ma meno fluidita' sociale.
- **Raccomandazione:** A (claim device). Sotto-decisione protocollo conflitto:
  first-backend-arrival vince + notifica al device perdente (o breve finestra
  simultaneo-reveal) -- da fissare con E4. Finche' E4 e' aperto, la cella `public`
  (eligible-pool) di sez. 4 resta condizionata.

### E5 -- Trasferimento creature tra sotto-branchi

Un player puo' cedere/scambiare una creatura a un altro sotto-branco?

- **Opzione A -- consenso bilaterale device (raccomandata).** Trasferimento via consenso
  dei due player (come il per-player consent SPEC-K 6.4); lega allo scambio carte di
  SPEC-G. Tradeoff: abilita dinamiche sociali; il FATTO e' `public`, il dettaglio
  negoziato e' `private` tra i due (coerente con F4).
- **Opzione B -- nessun trasferimento.** Le creature restano nel sotto-branco originale.
  Tradeoff: semplice, ma rigido (niente dono/sacrificio sociale).
- **Raccomandazione:** A. Forward-dep: il dettaglio dello scambio lega a SPEC-G (build
  dopo E). E5 si ratifica come PRINCIPIO ora (trasferimento via consenso bilaterale; FATTO
  `public` al commit, negoziato `private`) e si rifinisce con SPEC-G -- NON blocca il flip
  di SPEC-E.

### E6 -- Authority spesa risorse Nido

Le risorse comuni (PE/PI/SG/PP/PT) chi le spende? SPEC-K 7.6 NON elenca la spesa risorse
tra le azioni device, quindi va deciso.

- **Opzione A -- quorum/voto del branco (raccomandata).** Spesa comune = decisione
  condivisa (quorum device, come route/world); proposta sul device + tally TV (aggregato
  SPEC-B). Tradeoff: coerente con "risorse del branco comune"; serve UI proposta+voto.
- **Opzione B -- device leader/host-technical.** Un solo device propone+spende. Tradeoff:
  rapido, ma concentra l'agency.
- **Raccomandazione:** A.

## 9. Acceptance

SPEC-E e' implementabile/chiudibile quando:

1. il modello dati `player_id -> sub_pack -> mvp -> units` (+ recruits/mating/lineage) e'
   esplicito e alimenta gli engine LIVE (rosterStore/metaProgression/mating/lineage),
   senza reimplementarli; persistenza dichiarata (estendere `rosterStore` con proiezione
   per-player `sub_pack`, o thin `socialPackStore` che lo wrappa -- non un secondo store);
2. la distinzione branco-comune / gruppo-sociale / tribu' e' chiara e riflessa nella TV
   (branco come organismo) vs device (proprio sotto-branco);
3. ogni surface (sez. 4) rispetta la visibilita' SPEC-B (3.7/3.8) e l'authority SPEC-K
   (device-owned party/MVP/recruit/mating; per-player consent per successione);
4. successione, recruit, mating, offspring sono device-owned con consent dove tocca
   agency (SPEC-K 6.4);
5. le Decisioni aperte E1-E6 sono ratificate da Eduardo (FATTO 2026-06-08, sez. 8);
   resta a Eduardo il flip `review_needed` -> `accepted` al merge;
6. coerenza con SPEC-B (visibilita'), SPEC-C (sotto-branco = unita' combat), SPEC-F
   (Custode estraibile), SPEC-G (scambio), SPEC-J (ferite), SPEC-K (authority).
