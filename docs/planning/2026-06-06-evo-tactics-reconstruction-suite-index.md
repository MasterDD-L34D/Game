---
title: 'Evo-Tactics reconstruction suite index'
date: 2026-06-06
type: suite-index
doc_status: review_needed
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-06'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, reconstruction, roadmap, godot, device-driven, tv-mirror]
---

# Evo-Tactics reconstruction suite index

Questo documento e' l'ingresso unico alla ricostruzione Evo-Tactics prodotta
tra il 2026-06-05 e il 2026-06-06.

Scopo: evitare che le decisioni ratificate in chat, i recap narrativi, il code
audit Game/Godot e le SPEC tecniche restino separati. La suite va letta come un
pacchetto: nessun singolo file basta da solo a dichiarare lo stato reale del
progetto.

## 1. Lettura consigliata

1. `docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md`
   - entrypoint operativo;
   - contiene baseline ratificata, decisioni aperte chiuse, roadmap SPEC-A...L;
   - usare per capire cosa va fatto subito.
2. `docs/planning/2026-06-05-evo-tactics-tv-device-campaign-flow-reconstruction.md`
   - ricostruzione del flusso player-facing;
   - copre join, Form Pulse, scelta creature, campagna, Nido, combat e resa TV;
   - usare quando serve ragionare sull'esperienza vista dai player.
3. `docs/planning/2026-06-05-evo-tactics-complete-game-systems-reconstruction.md`
   - ricostruzione completa dei sistemi di gioco;
   - copre Custodi, SKIV, Tri-Sorgente, ERMES, ALIENA, Forme, parti del corpo,
     trait/job/tribu', lineage, mating, failure-as-lore;
   - usare quando serve capire l'intero gioco, non solo il prossimo sprint.
4. `docs/planning/2026-06-06-game-godot-code-surface-reconcile.md`
   - audit code-first di `C:/dev/Game` e `C:/dev/Game-Godot-v2`;
   - distingue sistemi LIVE, LIVE/PARTIAL, branch skew, gate e wording storico;
   - leggere prima di aprire issue o PR implementative.
5. `docs/design/evo-tactics-godot-device-authority-reconciliation.md`
   - SPEC-K;
   - contratto TV mirror / device input / host table / system authority;
   - obbligatoria per qualunque modifica a Godot phone, TV, route, Nido,
     combat input o rituali.
6. `docs/design/evo-tactics-runtime-feature-inventory-reconcile.md`
   - SPEC-L;
   - matrice runtime per non dichiarare "missing" cio' che e' gia' LIVE,
     gated o partial;
   - obbligatoria prima di triage gap cross-repo.
7. `docs/planning/2026-06-06-evo-tactics-kl-operational-matrix.md`
   - tabella operativa K/L;
   - feature -> stato -> Game path -> Godot path -> gate -> next ticket;
   - usare come strumento quotidiano prima di aprire ticket o PR.
8. `docs/planning/2026-06-05-games-source-index-implementation-audit.md`
   - ponte tra reference games e implementazione Evo-Tactics;
   - usare per trasformare reference non implementate in pattern P0/P1/P2.

## 2. Regole di uso della suite

Prima di dichiarare un gap, controllare:

1. la roadmap per capire se e' gia' un punto SPEC;
2. SPEC-L per capire lo stato runtime;
3. il code-surface reconcile per capire branch skew e repo corretto;
4. SPEC-K se il gap tocca TV, host, phone, browser o device authority.

Prima di modificare Godot, controllare:

1. `C:/dev/Game-Godot-v2` main corrente;
2. `docs/planning/2026-06-06-game-godot-code-surface-reconcile.md`;
3. SPEC-K;
4. eventuale branch skew rispetto a `C:/dev/Game` `origin/main`.

Prima di riscrivere design narrativo, controllare:

1. la ricostruzione completa sistemi;
2. il flow TV/device/campagna;
3. `docs/planning/draft-narrative-lore.md`, soprattutto per ALIENA.

## 3. Statement ratificati da non perdere

### 3.1 TV, host e device

La TV e' solo tavolo, mirror, recap, regia e memoria comune. Non e' un
giocatore e non deve essere autorita' di input.

Tutte le interazioni di gameplay avvengono tramite device connessi:
telefono, browser o altro client personale.

Quando il codice o i vecchi doc dicono "host drives", quel wording va trattato
come storico o da correggere, non come direzione finale.

### 3.2 Combat

Il combat non e' un unico round. Il loop e':

```text
planning device
-> preview non canonica
-> commit device
-> Sistema/AI commit
-> event-log deterministico
-> piano-sequenza TV via animation planner
-> nuovo planning
```

Il loop continua finche' condizioni di vittoria, sconfitta, ritirata, timeout
o obiettivo non chiudono lo scontro.

### 3.3 Player, branco e controllo

In combat, ogni player controlla una creatura principale, con eccezioni
esplicite: companion, evocazioni, simbionti, possessioni, controlli temporanei
o effetti Tri-Sorgente.

Fuori combat, il player ha un gruppo sociale: creatura principale, amici,
compagni, mating, offspring, breeding e creature libere eleggibili come nuova
principale. La creatura principale puo' invecchiare, morire, uscire dal roster
o essere sostituita se la campagna lo consente.

### 3.4 Custodi, SKIV ed esportazione

SKIV e' una forma/template possibile di Custode, non il concetto totale di
Custode.

I Custodi devono poter vivere dentro e fuori la campagna. L'estrazione futura
non e' solo "pet/tamagochi": e' un'entita' con memoria, unicita',
risincronizzazione, incontri con altri Custodi e possibile ritorno in campagna
con nuove informazioni, in modo vicino al concetto pawn di Dragon's Dogma.

### 3.5 Tri-Sorgente, carte e sedimentazione

Lo scambio carte non va isolato come gimmick. Appartiene al sistema
Tri-Sorgente allargato: reward, scelte narrative/dottrinali, possessione o
scambio di vista, e sedimentazione delle decisioni nel branco, nel Nido e nella
campagna.

### 3.6 ERMES e ALIENA

ERMES e' gia' ponte runtime/lab in parte presente: exporter, runtime deltas,
runner e input di debrief. Va governato come pressione ecologica leggibile,
non come mutatore opaco.

ALIENA va trattata come enforcement progressivo e configurabile, non solo come
diagnostica. La direzione va allineata con
`docs/planning/draft-narrative-lore.md`.

## 4. Correzioni importanti rispetto a snapshot vecchi

| Tema          | Non dire piu'                          | Stato corretto                                                                           |
| ------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| PR Godot #423 | "PR #423 e' open / consumer dormiente" | PR #423 e' merged; `MatingGeneticsFacade` ha consumer phone live su Godot main           |
| Route vote    | "route-vote gap di progetto"           | route-vote e' su Game `origin/main`; il branch locale puo' essere indietro               |
| TV authority  | "host/TV drives gameplay"              | TV/host e' mirror/table; input gameplay dai device                                       |
| Nido          | "Nido assente"                         | backend + Godot hub esistono; restano phone authority, party-select e ritual UX          |
| Mating        | "solo design"                          | backend canonico avanzato + facade Godot; restano Canvas-D, UX finale e roster offspring |
| Form Pulse    | "questionario statico"                 | input continuo da device verso world setup, identita' e lettura MBTI-like                |

## 5. Code reality minima

`C:/dev/Game` branch corrente durante l'audit:

- branch: `claude/jules-test-coverage-batch-2026-06-03`;
- HEAD audit: `7f7f99af`;
- `origin/main`: `3e2546e2`;
- nota: route-vote e diversi fix meta-network sono su `origin/main`, non
  necessariamente nel branch corrente.

`C:/dev/Game-Godot-v2` durante l'audit:

- main pulito;
- HEAD audit: `38f1031`;
- route UI, phone route vote, routed enemies e KO-gated recruit sono su main;
- PR #423 e' gia' incorporato nella storia di main.

## 6. Come usare questa suite per il prossimo lavoro

La sequenza consigliata ora e':

1. usare la roadmap per scegliere una SPEC o una slice;
2. usare SPEC-L per classificare cosa e' LIVE, gated, partial o missing;
3. usare SPEC-K per correggere l'autorita' TV/device;
4. aprire issue/PR piccole, collegate alla SPEC;
5. aggiornare il documento della suite solo se cambia la verita' di progetto,
   non per ogni micro patch.

Priorita' naturale:

1. SPEC-K K-01/K-06: device authority inventory + contract tests;
2. matrice K/L operativa: mantenere feature/status/path/gate/ticket aggiornati;
3. SPEC-F Custode: estrazione, memoria, resync, incontri, ritorno;
4. SPEC-D Cinematic Round Director: animation planner sopra event-log;
5. SPEC-E Nido/lineage/offspring: party select, social group e rituali.

## 7. Stato del documento

Questo file e' un indice operativo, non una fonte di verita' autonoma.

Se un dettaglio confligge con codice verificato o con una SPEC piu' recente,
aggiornare prima il documento specifico e poi correggere qui la mappa di
lettura.
