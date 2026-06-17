---
title: 'Evo-Tactics Lethal Consent and Wound Rituals (SPEC-J)'
date: 2026-06-08
type: design-spec
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
review_cycle_days: 30
language: it
tags: [evo-tactics, lethal, wounds, consent, rituals, succession, device-authority]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics Lethal Consent and Wound Rituals (SPEC-J)

Contratto Wave-2 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md` sez. 4).
Chiude morte, ferite gravi e consenso lethal: default soft-death, lethal mission-flag con
conferma device, tier ferite/scar, rituali Nido, succession, failure-as-lore.

## 1. Scopo e non-scopo

**Scopo.** Definire il modello di morte/ferite/consenso: soft-death di default, il flag
lethal con conferma device per-player, i tier ferita (sopra il `woundSystem` LIVE), i
rituali Nido (healing/transformation), la succession e il failure-as-lore.

**Non-scopo (esplicito).**

- SPEC-J NON reimplementa il sistema ferite: `combat/woundSystem` (OD-058 D2, #2535) +
  `combat/woundedPerma` (scar legacy) sono LIVE. SPEC-J li ALIMENTA + aggiunge il layer
  lethal/consenso/rituali.
- SPEC-J NON ridefinisce la visibilita' lethal: la **eredita** da SPEC-B sez. 3.10 + fork
  F5 (ratificato: stato consenso anonimo di default + opt-in del coinvolto).
- SPEC-J NON decide l'authority: il consenso lethal = per-player device (SPEC-K 6.4).
- SPEC-J NON ridefinisce la successione MVP: e' SPEC-E E2 (scelta del player); qui la si
  aggancia al trigger morte/grave.

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

`apps/backend/services/combat/woundSystem.js` (OD-058 D2, ratify 2026-06-01, #2535):

- **3 severity tiers**: `lieve` / `media` / `grave` (SEVERITY_MALUS -1 / -1 / -2).
- **4 location -> stat** (`LOCATION_STAT`): `testa` -> accuracy (lieve/media; testa `grave`
  = -1 AP graduato), `torso` -> defense_mod, `arti_anteriori` -> attack_mod,
  `arti_posteriori` -> mobility. Location random-weighted (torso heaviest, testa lightest).
  `grave` = -2 (eccetto testa grave = -1 AP, hardcoded, non azzera l'AP budget).
- **Solo `grave` persiste cross-encounter** (= scar), come l'ex-`woundedPerma`.
- **Death-spiral guard**: `MAX_WOUNDS=3` totali + max 1 `grave` per location.
- Data model: `unit.status.wounds = Array<{location, severity, stat, malus}>`.
- Legacy `woundedPerma` (HP-penalty scar su player_wipe KO) ancora wired su campo
  disgiunto `unit.status.wounded_perma` (no double-apply). NB: enum severity inglese
  (`light`/`medium`/`severe`) vs woundSystem italiano (`lieve`/`media`/`grave`) -- campi
  disgiunti, no merge senza mappatura esplicita.

Lethal/soft-death/consenso/rituali = DESIGN (NON ancora in codice); `woundSystem` e' il
substrato. point 9 (sez. 7 reconstruction) gia' ratificato (default-off, mission-gated,
conferma device del player coinvolto).

Invarianti ereditate:

- **Reconstruction sez. 7 punto 9:** lethal default-off, mission-gated, conferma
  OBBLIGATORIA dal device del player coinvolto (NON quorum).
- **SPEC-B 3.10 + F5 (ratificato):** esistenza missione lethal-gated = `public`; conferma
  del coinvolto = `private`; stato "in attesa" = anonimo (`aggregated`) + opt-in del
  coinvolto a mostrarsi; signal `risk_posture` = `secret`. Delivery: notifica prioritaria
  non silenziabile, timeout dopo delivery-receipt (no deadlock).
- **SPEC-K 6.4:** per-player consent per missione lethal della propria creatura.

## 3. Modello di morte: soft-death di default

- **Default = soft-death**: il KO in combat NON e' permadeath. La creatura cade
  (incapacitata/ritirata) e recupera, eventualmente con una ferita (vedi J1).
- **Lethal = opt-in mission-flag**: una missione puo' essere flaggata lethal (rischio di
  morte reale). Default-off (point 9).
- **Consenso lethal per-player**: una missione lethal richiede la conferma device di OGNI
  player la cui creatura PARTECIPA alla missione ("a rischio" = partecipa, NON una soglia
  per-creatura); SPEC-K 6.4, NON quorum.
- **Morte != applyWound**: la morte lethal e' un cambio-stato (creatura rimossa dal roster),
  NON passa per `applyWound`; il cap MAX_WOUNDS non la blocca.

## 4. Tier ferite / scar (sopra woundSystem)

- Ferite in 3 tier (`woundSystem`): `lieve`/`media` = in-encounter (decay); `grave` =
  **scar** persistente cross-encounter (stat-malus per location).
- Death-spiral guard LIVE (MAX_WOUNDS 3 + 1 grave/location) previene il loop di morte.
- KO non-lethal -> conseguenza = **fork J1** (recupero pulito vs roll-ferita stile Battle
  Brothers, coerente con `woundedPerma`).
- Le scar entrano nel sotto-branco (SPEC-E) come stato persistente; alimentano i rituali
  Nido (sez. 6).

## 5. Consenso lethal (flusso)

```text
missione flaggata lethal (public: tutti sanno che e' a rischio)
  -> backend identifica i player con creature a rischio
  -> notifica prioritaria al device di ciascun coinvolto (non silenziabile)
  -> conferma device per-player (private)
  -> stato "in attesa" in TV = anonimo (aggregated), opt-in del coinvolto a mostrarsi (F5)
  -> tutti confermano (o timeout post-delivery con default) -> missione lethal parte
```

- Visibilita': SPEC-B 3.10 (esistenza public, conferma private, attesa anonima, signal
  secret) + F5 (anonimo + opt-in). Nessun nome forzato in TV.
- Anti-deadlock (DUE trigger distinti): (a) device online ma nessuna risposta -> timeout
  post delivery-receipt -> fallback; (b) delivery FALLITA (device offline, N-retry esauriti)
  -> fallback IMMEDIATO senza aspettare il receipt. Fallback default = NON parte lethal
  (soft-death). Mai loop bloccato.

## 6. Rituali Nido (healing / transformation)

- Le ferite `grave`/scar, al Nido, abilitano **rituali** (Fase 13): device-owned
  per-player (SPEC-K 7.6, SPEC-E).
- Due esiti possibili: **healing** (rimuove/riduce la scar) o **transformation** (la scar
  diventa un tratto/mutazione permanente -- failure-as-lore). Quale dei due = **fork J3**.
- I rituali costano risorse Nido (PE/PI/SG/...) -> spesa = quorum/E6 (SPEC-E).
- Visibilita': il rituale e' azione `private` device; l'esito (creatura guarita/trasformata)
  e' `public` (roster del branco).

## 7. Succession + failure-as-lore

- **Succession**: morte (lethal) o pensionamento (grave) della creatura principale ->
  succession del nuovo MVP (SPEC-E E2: scelta del player, per-player consent). Trigger
  esatto (morte-only vs anche grave-retirement) = **fork J4**.
- **Failure-as-lore**: una creatura caduta o segnata NON e' solo perdita -> diventa
  memoria del branco (lineage), eventualmente Custode narrativo (SPEC-F) o voce nel diary.
  Persistenza automatica vs opt-in = **fork J5**.

## 8. Visibilita' (eredita SPEC-B 3.10 / F5)

| Dato                                   | Tier                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------- |
| esistenza missione lethal-gated        | `public`                                                                  |
| conferma del player coinvolto          | `private` (device)                                                        |
| stato "in attesa di consenso"          | `aggregated` anonimo + opt-in del coinvolto (F5)                          |
| ferite/scar di una creatura            | `public` (stato roster) per esistenza; dettaglio per-creatura come SPEC-E |
| rituale Nido (azione)                  | `private` device; esito `public`                                          |
| signal `risk_posture` (dalla conferma) | `secret` (SPEC-A)                                                         |

## 9. Relazione con altre spec

- **SPEC-B** (3.10 + F5): visibilita' lethal (esistenza public, consenso private, attesa
  anonima+opt-in, delivery anti-deadlock).
- **SPEC-K** (6.4): per-player device consent per lethal.
- **SPEC-E** (E2): succession del MVP su morte/grave; ferite/scar nel sotto-branco; rituali
  costano risorse (E6).
- **SPEC-F**: una creatura caduta puo' diventare Custode narrativo (failure-as-lore).
- **SPEC-A**: la conferma lethal alimenta il signal `risk_posture` (`secret`).
- **SPEC-D**: morte/grave wound = beat di camera/recap (salience H1), event-log canonico.

## 10. Decisioni aperte (per Eduardo)

Fork non canon-derivabili (il `woundSystem` 3-tier e' LIVE; lethal/rituali = design).
**RATIFICATI da Eduardo 2026-06-08** (tutti opzione A; J2 chiuso da canon point-9).

| Fork | Esito ratificato (2026-06-08)                                         |
| ---- | --------------------------------------------------------------------- |
| J1   | KO non-lethal = roll-ferita (Battle Brothers; lieve/media/grave-scar) |
| J2   | (CHIUSO da canon: mission-gated, point-9 -- non un fork)              |
| J3   | Rituale Nido = heal O transform, scelta del player (transform=lore)   |
| J4   | Succession su morte + ritiro volontario (scelta player, SPEC-E E2)    |
| J5   | Failure-as-lore: lineage automatica, Custode opt-in (SPEC-F)          |

Sotto: opzioni/rationale originali (storia della decisione).

### J1 -- Conseguenza del KO non-lethal

Cosa produce un KO in una missione NON lethal?

- **Opzione A -- roll-ferita (Battle Brothers) (raccomandata).** Il KO non uccide ma puo'
  lasciare una ferita (lieve/media in-encounter; grave = scar) via `woundSystem`. Tradeoff:
  conseguenza reale senza permadeath; attrito che alimenta i rituali Nido. Coerente con
  `woundedPerma` (scar su wipe).
- **Opzione B -- recupero pulito.** Il KO = solo incapacitazione, nessuna ferita. Tradeoff:
  piu' morbido/accessibile, ma le ferite perdono peso e i rituali si svuotano.
- **Raccomandazione:** A.

### J2 -- Granularita' del flag lethal (CHIUSO da canon)

CHIUSO, NON un fork aperto: **mission-gated** (reconstruction sez. 7 punto 9, gia'
ratificato). Il flag lethal e' una proprieta' della missione/nodo; un solo consenso per
missione. Per-encounter/per-creatura = OUT of scope (consent-fatigue).

### J3 -- Rituale Nido: healing o transformation?

Una scar `grave` al Nido si cura o si trasforma?

- **Opzione A -- entrambi, scelta del player (raccomandata).** Il player sceglie:
  **heal** (rimuove la scar, costa risorse) o **transform** (la scar diventa un
  tratto/mutazione permanente = failure-as-lore). Tradeoff: agency + failure-as-lore reale;
  serve bilanciare i due costi/benefici.
- **Opzione B -- solo healing.** Le scar si curano e basta. Tradeoff: semplice, ma perde il
  failure-as-lore (la cicatrice non diventa storia).
- **Raccomandazione:** A.

### J4 -- Trigger della succession

La succession del MVP scatta su cosa?

- **Opzione A -- morte + pensionamento volontario (raccomandata).** Succession su morte
  (lethal) O ritiro volontario (anche per scar grave accumulate), sempre scelta del player
  (SPEC-E E2). Tradeoff: agency sul "quando passare il testimone", non solo forzato da morte.
- **Opzione B -- solo morte.** Succession solo su morte reale. Tradeoff: piu' netto, ma
  niente passaggio-di-testimone narrativo volontario.
- **Raccomandazione:** A.

### J5 -- Failure-as-lore: persistenza automatica o opt-in?

Una creatura caduta/segnata diventa memoria (lineage/Custode) automaticamente o su scelta?

- **Opzione A -- lineage automatica, Custode opt-in (raccomandata).** La creatura caduta
  entra SEMPRE nella lineage/memoria del branco (`public`); diventare Custode narrativo
  portabile (SPEC-F) e' opt-in del player. Tradeoff: la storia del branco e' sempre
  completa; l'export e' una scelta consapevole (coerente con SPEC-F opt-in).
- **Opzione B -- tutto opt-in.** Niente memoria senza scelta. Tradeoff: meno clutter, ma il
  branco puo' "dimenticare" i caduti (contro il failure-as-lore).
- **Raccomandazione:** A.

## 11. Acceptance

SPEC-J e' implementabile/chiudibile quando:

1. soft-death e' il default (KO != permadeath); lethal e' opt-in mission-flag (point 9);
2. una missione lethal richiede conferma device per-OGNI player coinvolto (SPEC-K 6.4),
   con visibilita' SPEC-B 3.10/F5 (esistenza public, conferma private, attesa anonima +
   opt-in) e delivery anti-deadlock (notifica non silenziabile + timeout post-receipt);
3. le ferite usano `woundSystem` LIVE (3-tier, grave=scar, location->malus, death-spiral
   guard) senza reimplementarlo;
4. i rituali Nido (heal/transform) sono device-owned, costano risorse (E6), esito `public`;
5. la succession aggancia SPEC-E E2 (scelta del player); trigger esatto (morte vs morte+grave) = J4;
6. il failure-as-lore porta i caduti nella lineage (+ Custode opt-in, SPEC-F);
7. le Decisioni aperte J1, J3, J4, J5 sono ratificate da Eduardo (FATTO 2026-06-08, sez. 10,
   tutte A; J2 chiuso da canon); resta a Eduardo il flip `review_needed` -> `accepted`;
8. coerenza con SPEC-B (3.10/F5), SPEC-K (6.4), SPEC-E (E2/E6), SPEC-F (Custode), SPEC-A
   (risk_posture secret), SPEC-D (death beat).

## 11. Verdetti master-dd 2026-06-17 (consent-timeout + flip)

Backend SPEC-J COMPLETE end-to-end (death-model #2789 + ritual #2790 + consent #2792 +
bridge #2794 + auto-timer sez.5 trigger-a #2798), flag `LETHAL_MISSIONS_ENABLED` default OFF.
Due design-call decise (evidence: workflow ricerca 5-finder + synth-critic, vedi handoff
2026-06-17 continuazione-3):

- **Consent auto-timeout value = `DEFAULT_TIMEOUT_MS` 120000 RATIFIED-PROVISIONAL.** Tuning
  value, non balance-lever; consistente con il ghost-timeout coop 120s. L'early-confirm
  esiste gia' (round -> `granted` appena TUTTI confermano), quindi il timeout morde SOLO il
  path non-responder ed e' osservabile solo quando il client Godot renderizza la countdown
  (item-3). Re-tune (probabile verso ~90s, UX-evidence) SOLO con dati device-roundtrip +
  playtest co-op reale. Per un consent-gate di permadeath err-long e' la scelta sicura
  (clock stretto = soft-resolve non voluto sotto pressione sociale).
- **Flip `LETHAL_MISSIONS_ENABLED=true` = DEFERRED** (NON flippare ora). Gate-5 surface-dead:
  0 encounter `lethal: true` in data + 0 handler `lethal_consent_*` nel client Godot-v2
  (broadcast unversioned -> silent drop) + backend inerte. Flip gated su TUTTI: (1) >=1
  encounter lethal authored, (2) Godot consent UI [prompt + countdown + handler
  open/waiting/resolved + confirm-sender + fallen/death surface + host-cancel], (3)
  lethal-mission N=40 / co-op playtest che prova la choreography end-to-end, (4) verdetto
  master-dd. Stesso pattern del defer `META_NETWORK_ROUTING` (validate-then-flip). NB: il
  lavoro Godot lato item-3 NON e' ancora tracciato in `Game-Godot-v2/docs/godot-v2/`.
- Reversibile: il flip e' env + restart; nessuna urgenza, validate-then-flip.
