---
title: 'GAP-C fase-3/4 build-vs-gate — decisione H1 (design-closure)'
date: 2026-06-02
doc_status: review_needed
doc_owner: master-dd
workstream: worldgen
last_verified: '2026-06-02'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  [
    worldgen-gap-c,
    meta-network,
    godot,
    generative-grammar,
    pending-design,
    into-the-breach,
    dormans,
  ]
---

# GAP-C fase-3/4 build-vs-gate — decisione H1

> Deliverable gated del GOAL design-closure (§7.2, H1). La **decisione** (build-or-gate) e' Fase-1;
> l'eventuale **build** e' Fase-2. Verdetto proposto = **GATE (POST-MVP)**, Claude-proposed pending
> master-dd review. Le alternative sono preservate sotto + museum card M-2026-06-02-001.

## Stato verificato (verify-first 2026-06-02)

GAP-C (worldgen meta-network routing) e' gia in parte LIVE, flag `META_NETWORK_ROUTING` **OFF-default**:

- **Stage-1 routing** (#2483 `efa3e50d`): `metaNetworkRouting.selectNextNodes` (pure, Dormans
  lock-and-key, eligible candidates + preview, deterministic weight-desc/id-asc, no RNG) +
  `metaNetworkResolver` (read-only graph loader) + `GET /api/campaign/meta-network/next` (diagnostic,
  Gate-5 console/replay). 5 nodi / 12 edge (nodi = biomi).
- **fase-2 arc-conditions Stage-1** (#2509 `d05fe323`): `_evalEdgeConditions` (season +
  prior_node_cleared, AND/OR, fail-closed) + schema yaml 2.1 + `conditions.season:[winter]` su 2 winter
  bridge + endpoint `?season=`. ADR ACCEPTED via #2500.

**NON costruito**: (a) ulteriori arc-conditions data (piu' edge con `conditions:`), (b) **fase-3 Godot
choice-UI** (il player VEDE e sceglie la rotta), (c) **fase-4 generative grammar** (genera il
meta_network graph proceduralmente invece che hand-authored).

## Reference-game (docs/guide/games-source-index.md, pilastro P5)

- **Into the Breach** (Tier S, "Mappa pilastri -> top-3" P5): la rotta isola->isola e' **hand-authored +
  random**, **interamente leggibile dal player** prima di sceglierla (zero hidden info). Modello per la
  **fase-3 UI**: la scelta deve essere telegrafata (preview ricompensa/rischio per nodo) -> mappa sul
  `preview` gia ritornato da `selectNextNodes`.
- **Dormans mission/space grammar** (cross-game-extraction-MASTER §3 P5): grammar generativa
  lock-and-key per livelli/missioni. Modello per la **fase-4 generative grammar** (genera graph + edge +
  arc-conditions da regole invece che a mano).
- **Anti-reference** (games-source-index): NON copiare roguelike map-RNG opaco (Slay-the-Spire-style
  hidden branch) -- contraddice il pilastro P1 "tattica leggibile" + Into-the-Breach full-information.

## Opzioni

### A -- Build fase-3 UI ORA (Godot choice-screen)

Costruire la schermata di scelta rotta in Game-Godot-v2 che consuma `/api/campaign/meta-network/next`,
con preview Into-the-Breach. **Pro**: chiude il loop GAP-C end-to-end (player vede + sceglie). **Contro**:
(1) **cross-repo** (Game-Godot-v2, fuori dallo scope `C:/dev/Game` del goal); (2) il flag e' OFF -> o si
attiva (decisione balance/flow master-dd) o si costruisce UI per un path dormiente; (3) richiede asset +
UX design (Godot specialist). Effort: ~M-L cross-repo.

### B -- GATE / POST-MVP (proposto)

Lasciare Stage-1 + fase-2 come fondazione flag-OFF e rinviare fase-3/4 a quando master-dd attiva il
flag e scopa la UI. **Pro**: rispetta canon (goal §4 "residuo = master-dd se/quando"), Gate-5 (non si
costruisce surface per un sistema non-live), flag-OFF discipline, scope-repo (no cross-repo non
richiesto). **Contro**: il loop GAP-C resta non-visibile al player finche' master-dd non greenlighta.
Effort: 0 (decisione).

### C -- Partial: arc-conditions data ulteriore ORA (flag-OFF)

Aggiungere `conditions:` (season/prior_node_cleared) a piu' edge nel meta_network yaml, dietro flag OFF.
**Pro**: reversibile, prepara contenuto. **Contro**: **viola Gate-5** (flag OFF -> il player non vede
nulla; visibile solo nel diagnostic endpoint) + authoring stagionale = **design-call** (quali bridge,
quale season, quale arc) meglio fatto col worldgen designer/master-dd, non auto-generato.
**Sconsigliata** come build autonomo: e' contenuto-design, non un buco tecnico.

### D -- Build fase-4 grammar ORA

Implementare la generative grammar (Dormans) che produce il graph. **Pro**: massima ambizione worldgen.
**Contro**: scope **XL**, richiede design completo (regole grammar, vincoli, validazione), nessuna
urgenza (Stage-1 hand-authored copre l'MVP). **Sconsigliata** ora.

## Verdetto proposto

**B -- GATE / POST-MVP** `(⚠️ Claude-proposed, pending master-dd review)`.

Rationale: Stage-1 + fase-2 sono la **fondazione MVP** (hand-authored, deterministica, leggibile); il
residuo (UI/grammar) e' **POST-MVP** e tocca una decisione di **flow/flag** (attivare
`META_NETWORK_ROUTING`) che e' master-dd (STOP §6 "flag GAP-C ON in prod"). Build-now di fase-3
violerebbe lo scope-repo (cross-repo Godot) e Gate-5; arc-data-now (C) viola Gate-5 + e' design-call;
grammar (D) e' XL senza urgenza.

**Trigger di sblocco Fase-2** (quando master-dd vuole): (1) decide di attivare il flag
`META_NETWORK_ROUTING` (o un sub-flag per la sola UI) -> (2) spec fase-3 UI Into-the-Breach (preview per
nodo) in Game-Godot-v2, DoD Gate-5 (player vede la scelta <60s) -> (3) eventuale fase-4 grammar come
brainstorm separato. Tutto reversibile dietro flag.

## Alternative preservate

Le opzioni A/C/D NON sono scartate per sempre -- sono **rinviate**. Se master-dd attiva il flag, A
diventa il next-build; C diventa l'authoring-content che lo accompagna; D resta la visione long-term.
Museum card: `docs/museum/cards/worldgen-gapc-fase3-4-autonomous-build-discard.md`.
