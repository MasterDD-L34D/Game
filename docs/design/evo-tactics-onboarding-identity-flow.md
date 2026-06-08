---
title: 'Evo-Tactics SPEC-M Onboarding Identity Flow (spec piena)'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
review_cycle_days: 30
source_of_truth: false
language: it
tags: [evo-tactics, spec-m, onboarding, device-driven, identity, form-pulse, per-player]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics SPEC-M Onboarding Identity Flow (spec piena)

Contratto Wave-4 (gap-harvest). Spec piena dello scope-doc omonimo: definisce i primi ~60s
del giocatore (pre-Act-0) come catena device-driven di scelte identitarie che seedano Forma,
bioma e (bias) Custode -- sostituendo lo slider MVP/debug con un onboarding diegetico.
Estende il canon `51-ONBOARDING-60S` (A3) sull'asse device-authority (ADR-2026-06-07):
l'input identitario arriva dai DEVICE, non dalla TV/host.

## 1. Scopo e non-scopo

**Scopo.** Definire la catena onboarding 60s: le 3 scelte identitarie (ADR-2026-04-21b), il
Form Pulse, il modello PER-PLAYER (map + readiness-gate, #2638), il landing biome-form, il
social/clan ritual, e il mapping verso VC/MBTI/Ennea/Conviction -- con device-authority e
visibilita' SPEC-B. SPEC-M ALIMENTA gli engine LIVE, non li riscrive.

**Non-scopo (esplicito).**

- SPEC-M NON ridefinisce lo scoring VC/MBTI/Ennea/Conviction (engine-owned: `vcScoring.js`,
  `convictionEngine.js`); ne consuma l'input (assi soft, mai hard-gate).
- SPEC-M NON costruisce la surface Godot char-creation device-driven (SPEC-K) ne' il tutorial
  giocato Act 0 (terzo strato ADR-2026-06-07 punto 2, fuori scope).
- SPEC-M NON ridefinisce la tassonomia tier (SPEC-A) ne' la visibilita' (SPEC-B F1/F6): le
  APPLICA (sez. 9).
- SPEC-M NON ridecide il seeding bias Custode (ADR-2026-06-07 punto 4); lo referenzia come
  consumer del Form Pulse aggregato.

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

| Engine / artefatto                                     | Ruolo / stato                                                                                                                                                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coopOrchestrator.submitOnboardingChoice` (#2638)      | **Per-player LIVE**: `{allPlayerIds}` -> `onboardingChoices` Map + readiness-gate (advance solo se tutti submettono) + `onboardingReadyList()`. Senza -> legacy host-only single (backward-compat). |
| `routes/campaign.js` `POST /api/campaign/start`        | `initial_trait_choice` (option_a/b/c) -> `acquiredTraits[]` (LIVE). Le 3 trait in `active_effects.yaml` + `default_campaign_mvp.yaml` (`onboarding:`).                                              |
| `coopOrchestrator.submitFormPulse` + `form_pulse_list` | Form Pulse backend LIVE (axes per-player, store, broadcast, ready-gate; phone W4/W7). UX micro-scenari swipe = DESIGN-ONLY (Godot).                                                                 |
| `vcScoring.js` / `convictionEngine.js`                 | VC axes + MBTI + Ennea + Conviction scoring LIVE. Consumer (soft) degli assi onboarding/Form Pulse.                                                                                                 |
| `51-ONBOARDING-60S.md` (A3, source_of_truth:true)      | Canon: flusso 60s, 3 opzioni A/B/C, timer 30s, auto-select A. Modello canon = 1 scelta per il branco (vedi MA1).                                                                                    |
| ADR-2026-04-21b                                        | Onboarding narrativo 60s: 3 scelte identitarie pre-Act-0 + trait pre-slot.                                                                                                                          |
| `coopOrchestrator` DEBT host-only                      | `submitOnboardingChoice` legacy ha guard `host_only`; da rimuovere/estendere lato wsSession+Godot (sez. 5, follow-up cross-repo).                                                                   |

Invarianti ereditate:

- **Canon 51-ONBOARDING-60S:** budget 60s hard-cap; briefing 10s; deliberazione 30s ->
  auto-select OPZIONE A (tutorial gentle); 3 opzioni A/B/C -> trait pre-slot.
- **Device-authority (ADR-2026-06-07):** input dai device; la TV e' splash/mirror
  dell'identita' emergente, MAI input. Riconcilia il wording host-only del canon (debito).
- **Soft-signal, no hard-gate** (museum `personality-mbti-gates-ghost`): gli assi spostano i
  pesi VC, NON fissano archetipi ne' cancellano rami.
- **Opt-in self-disclosure** (SPEC-B F1/F6): default privato, promozione a public solo
  player-initiated.

## 3. Catena onboarding 60s

Estensione device-driven del canon 51-ONBOARDING-60S (i tempi restano):

```text
[00:00] splash "Sopravvivi all'Apex"
[00:10] briefing audio (2-3 frasi): "Il tuo branco e' stato marcato. Come vuoi che ti ricordino?"
[00:20] 3 scelte identitarie (sez. 4) -- input PER-PLAYER dal device (sez. 5), 30s, auto-A
[00:50] transizione "Cosi' sara'."
[01:00] enter enc_tutorial_01 (Act 0)
```

Estensioni oltre il canon (oggi DESIGN-ONLY lato UX):

- **Form Pulse** (sez. 6): 5 micro-scenari swipe (~15s) tra briefing e scelta, che spostano
  i pesi VC.
- **Biome-form affinity landing** (sez. 7, V3 B4): il mondo atterra nel bioma piu' affine
  alla Forma emergente del branco.
- **Social/clan ritual** (sez. 7, V3 B5): prima interazione ecologica (help/hinder/ignore).

## 4. Le 3 scelte identitarie

Canon ADR-2026-04-21b / 51-ONBOARDING-60S:

| Opzione | Label player              | Trait pre-slot     | Stat prevalente |
| ------- | ------------------------- | ------------------ | --------------- |
| A       | "Come veloce e sfuggente" | `zampe_a_molla`    | mobilita' +1    |
| B       | "Come duro e inamovibile" | `pelle_elastomera` | defense +1      |
| C       | "Come letale e preciso"   | `denti_seghettati` | bleeding on-hit |

- Timer deliberazione 30s; oltre -> auto-select A (tutorial gentle).
- Le 3 trait esistono in `active_effects.yaml` (def) + `default_campaign_mvp.yaml`
  (`onboarding:`); `POST /api/campaign/start { initial_trait_choice }` le applica.
- A CHI si applica il trait (creatura del singolo vs branco) = fork **MA1** (sez. 11).

## 5. Modello per-player + readiness-gate (#2638)

Estensione device-authority del canon (che era 1-scelta-per-branco host-driven):

- `submitOnboardingChoice(playerId, choice, { allPlayerIds })`: ogni device player submette la
  PROPRIA scelta -> `onboardingChoices` Map (player_id -> choice); advance a
  character_creation SOLO quando TUTTI gli expected player hanno submesso (readiness-gate);
  `onboardingReadyList()` per il broadcast (mirror `characterReadyList`). Nessun host-gate.
- Backward-compat: senza `allPlayerIds`, modalita' legacy host-only single (il canon
  originale) -- nessuna regressione del flusso Godot attuale.
- **Follow-up wiring (Gate-5, cross-repo):** `wsSession` resta legacy (passa `{hostId}`); va
  aggiornato a passare `allPlayerIds` + broadcast `onboarding_ready_list` + advance gate su
  all-ready QUANDO il client Godot invia `onboarding_choice` per-player. Finche' Godot non e'
  aggiornato, il gate per-player resta opt-in backend.
- Timer/auto-select (sez. 4): in per-player, l'auto-select A scatta per i player non-pronti
  alla scadenza (cosi' il gate non va in deadlock); il timeout va mostrato in TV come stato
  del tavolo (SPEC-K), il consenso/scelta resta device.

## 6. Form Pulse

- 5 micro-scenari swipe (~15s) -> assi creature-themed (Simbiosi/Predazione, Esplorativo/
  Cauto, Agile/Robusto, Solitario/Sciame, Memoria/Istinto). NON e' un test psicologico.
- Backend LIVE (`submitFormPulse` + `form_pulse_list`, per-player + ready); UX swipe = Godot
  DESIGN-ONLY.
- Effetto: SPOSTA i pesi VC/Forma (soft), non li fissa. Magnitudine del weight = fork **MA3**.
- Authority/visibilita' = SPEC-B sez. 3.2 + F1 (TV = radar aggregato di default; per-player
  opt-in, mai imposto). SPEC-M esegue, non ridecide.

## 7. Biome-form affinity landing + social/clan ritual

- **Biome-form affinity landing (V3 B4):** dopo il Form Pulse, il mondo atterra nel bioma
  piu' affine alla Forma emergente del branco; la specie iniziale e' un'istanza di un
  `role_template` del bioma. Determinismo del landing (most-affine vs scelta vs weighted) =
  fork **MA4**. Stato: DESIGN-ONLY (il world-setup esiste; l'affinity-landing va wired).
- **Social/clan ritual (V3 B5):** prima interazione ecologica (help / hinder / ignore) verso
  un'entita' del bioma; 3 esiti che SPOSTANO la Forma del branco (soft). Magnitudine =
  parte di MA3. Stato: DESIGN-ONLY.

## 8. Mapping VC / MBTI / Ennea / Conviction

- Gli assi onboarding + Form Pulse + ritual alimentano (soft) il VC engine (`vcScoring.js`)
  e il Conviction tracker (`convictionEngine.js`) -- engine-owned, SPEC-M non li ridefinisce.
- **Anti-pattern (museum `personality-mbti-gates-ghost`):** i signal sono input MORBIDI; non
  fissano un archetipo ne' hard-gate-ano rami futuri. Coerente con SPEC-G TS2 / SPEC-H HA.
- Il bias Custode (ADR-2026-06-07 punto 4) consuma l'aggregato del Form Pulse (non per-player).

## 9. Visibilita' (eredita SPEC-B)

| Dato onboarding                           | Tier               | Razionale                                                               |
| ----------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| Scelta identitaria del singolo (3-choice) | `private` + opt-in | F6 ratificato: privata, opt-in self-disclosure; mai imposta in TV.      |
| Risposte Form Pulse + assi del singolo    | `private`          | il player vede i propri; effetti di scoring = `secret` (engine).        |
| Radar/ripple Form Pulse del branco        | `aggregated`       | F1: TV mostra l'aggregato; per-player solo opt-in.                      |
| Esito ritual / Forma emergente del branco | `aggregated`       | mood del branco; il per-player resta privato.                           |
| Scoring VC/MBTI/Ennea/Conviction          | `secret`           | engine-only (come gli altri scoring).                                   |
| Readiness onboarding (N/M submitted)      | `aggregated`       | conteggio readiness in TV (no timing-tell per-player; mirror planning). |
| Bioma di landing + ecosistema             | `public`           | reveal del mondo (TV), gia' coperto SPEC-B 3.3.                         |

## 10. Relazione con altre spec

- **51-ONBOARDING-60S (A3)**: canon base; SPEC-M lo ESTENDE sull'asse device-authority
  (per-player input) -- vedi MA1 per la riconciliazione del modello 1-branco vs per-player.
- **SPEC-A** (device ledger): accetta `initial_trait_choice` + `form_pulse_submit` (gia'
  dinamico, nessuna whitelist enum richiesta).
- **SPEC-B** (info contract): sez. 9 applica la matrice (F1 Form Pulse, F6 onboarding).
- **SPEC-K** (device authority): la surface Godot char-creation device-driven (sostituisce
  slider) + la rimozione del debito host-only (sez. 5).
- **SPEC-H/G** (ALIENA/Tri-Sorgente): il soft-signal no-hard-gate e' lo stesso pattern.
- **SPEC-L**: traccia lo stato (per-player backend LIVE; UX device + landing/ritual design).

## 11. Decisioni aperte (per Eduardo)

Fork etichetta `MA#` (anti-clash con F/G/H/E/FC/TS/J/HA/ER/QA/PA).

**Gia' ratificato (2026-06-08):** modello PER-PLAYER (map + readiness-gate, #2638) -- SPEC-M
adotta il per-player input; resta da decidere la SEMANTICA dell'applicazione (MA1).

### MA1 -- Semantica per-player: trait del singolo o del branco?

Il canon 51-ONBOARDING (A3) = 1 scelta -> 1 trait per TUTTO il branco. Il per-player (#2638)
da' a ogni device una scelta. A chi si applica il trait scelto?

- **Opzione A -- trait per-creatura (raccomandata).** Ogni player sceglie l'identita' della
  PROPRIA creatura (party eterogeneo). Tradeoff: piena device-authority + diversita' di
  party; supera il canon "1 trait per branco" (riconciliazione esplicita 51-ONBOARDING).
- **Opzione B -- per-player vote -> 1 trait branco.** Ogni device vota; l'esito aggregato
  da' un solo trait al branco (preserva il canon). Tradeoff: fedele al canon, ma "device
  input" diventa un voto, non una scelta identitaria personale.
- **Opzione C -- ibrido**: trait personale + un trait-branco emergente dall'aggregato.
  Tradeoff: ricco, ma due effetti da bilanciare + UI.
- **Raccomandazione:** A (riconcilia 51-ONBOARDING su device-authority; il backend #2638 gia'
  mappa per-player). Richiede aggiornare/superare 51-ONBOARDING-60S (A3) con nota di
  supersede sull'asse modello.

### MA2 -- Gesto di input (swipe vs tap) + accessibilita'

Il Form Pulse assume "swipe". Canonizzarlo?

- **Opzione A -- swipe + fallback tap (raccomandata).** Swipe come gesto primario, tap
  alternativo (accessibilita' motoria). Tradeoff: copre disabilita' senza perdere il feel.
- **Opzione B -- solo swipe.** Piu' coeso, ma esclude accessibilita'.
- **Raccomandazione:** A (review accessibilita' con SPEC-K).

### MA3 -- Magnitudine soft del Form Pulse + ritual

Di quanto Form Pulse + social ritual spostano i pesi VC/Forma?

- **Opzione A -- delta bounded + N=40 (raccomandata).** Spostamento piccolo e bounded (mai
  hard-set), ratificato da playtest N=40 (mirror SPEC-I/ERMES). Tradeoff: data-safe,
  anti-hard-gate.
- **Opzione B -- delta forte.** Identita' piu' marcata subito, ma rischio di "fissare"
  l'archetipo (anti-pattern MBTI-gate).
- **Raccomandazione:** A.

### MA4 -- Determinismo del biome-form affinity landing

Dopo il Form Pulse, come si sceglie il bioma di atterraggio?

- **Opzione A -- most-affine deterministico (raccomandata).** Atterri nel bioma piu' affine
  alla Forma emergente. Tradeoff: leggibile, premia l'identita' espressa.
- **Opzione B -- weighted random sulla affinity.** Piu' varieta', meno prevedibile.
- **Opzione C -- scelta tra 2-3 candidati affini (Descent-style).** Agency esplicita, ma e'
  un altro momento di scelta (allunga l'onboarding).
- **Raccomandazione:** A; C come estensione se serve agency.

## 12. Acceptance

SPEC-M e' implementabile/chiudibile quando:

1. la catena 60s (sez. 3) rispetta il canon 51-ONBOARDING (budget/timer/auto-A) con input
   device per-player;
2. le 3 scelte identitarie (sez. 4) sono wired al `initial_trait_choice` LIVE, con la
   semantica MA1 decisa (trait per-creatura vs branco);
3. il modello per-player (#2638) e' wired end-to-end: wsSession passa `allPlayerIds` +
   broadcast `onboarding_ready_list` + Godot invia `onboarding_choice` per-player + debito
   host-only rimosso (Gate-5 cross-repo);
4. il Form Pulse (sez. 6) sposta i pesi VC in modo bounded (MA3) con UX swipe (MA2) + ready;
5. biome-form landing (MA4) + social ritual sono wired (oggi DESIGN-ONLY);
6. il mapping VC/MBTI/Ennea/Conviction resta soft (no hard-gate), engine-owned;
7. la visibilita' (sez. 9) e' coerente con SPEC-B (scelta `private`+opt-in F6, Form Pulse
   `aggregated` F1, scoring `secret`);
8. MA1-MA4 sono ratificati da Eduardo (+ eventuale supersede-nota su 51-ONBOARDING-60S per
   MA1); il flip `review_needed` -> `accepted` al merge resta a lui (`source_of_truth:false`).
