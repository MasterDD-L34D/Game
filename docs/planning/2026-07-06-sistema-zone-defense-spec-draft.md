---
title: Spec-draft zone-defense Sistema (lever D4 comportamentale)
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-06'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Sistema zone-defense / intent-type per tier -- SPEC-DRAFT (SDMG: decider Eduardo)

Data: 2026-07-06 | Stato: ACTIVE (fork ratificati sez. 6; resta ZERO build) | Autore: claude-fable-5 (sessione autonoma)
Feed: `docs/research/2026-07-06-intents-roster-scaling-ab.md` (negative result A/B #3231) +
`docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md` sez. "Limite di modello".
Pattern spec di riferimento: `docs/planning/2026-07-06-sistema-intents-roster-scaling-spec.md`
(protocollo 3-approcci, knob PROPOSED, SDMG). Lever: D4 comportamentale (il fratello del
D4 threat-dial gia' shippato flag OFF).

## 1. Problema (misurato, non ipotizzato)

Due evidenze convergenti, stessa giornata (HEAD `94cd791c`):

**(a) Limite di modello (grid-ratify dorsale 16x12).** Sul driver round-model il throughput
Sistema e' cappato: party 4 unita' x 2 AP = 8 azioni/round vs Sistema 1-4 intents GLOBALI
(tier pressure). Seed strumentato: 2 attacchi Sistema in 17 round contro 21 del party.
Roster grandi peggiorano (2/13 = 15% attivo). Letalita' AI-vs-AI = ceiling su QUALSIASI
authoring provato: faithful, hp+3/mod+1/dc+1, +range4 -> tutti WR 1.0, 0 KO.

**(b) Negative result A/B roster-scaling (PR #3231, flag OFF).** Lo scaling per-roster del
dial `intents_per_round` e' wired e ATTIVO (divergenza per-seed B0-B2 10/10 = falsificazione
wiring) ma NON rompe il ceiling a N=10: B1/B2 (flag ON, 13 nemici) KO-rate 0.025 vs B0 0.050,
WR 1.0 ovunque; interazione con range (C1 vs C0) KO 0.075 vs 0.050, pace 19.8 vs 20.7 --
direzione giusta, magnitudine trascurabile. Nessun arm soddisfa il criterio direction
(dWR <= -0.2 / dKO >= +0.05 / pace fuori banda, tutti delta treatment-vs-control).

**Ipotesi di lavoro che ne segue** (da testare, NON conclusa a N=10): il collo di bottiglia
e' la CONVERSIONE delle attivazioni, non il loro numero -- le unita' extra si attivano,
avanzano closest-target, muoiono in approccio. Il prossimo lever e' COMPORTAMENTALE:
un verbo di zona / intent-type differenziato per tier che trasformi l'attivazione in minaccia.

> **AGGIORNAMENTO 2026-07-10 -- l'ipotesi-conversione e' ora MISURATA, non piu' ipotesi.**
> Evidence: `docs/research/2026-07-10-sistema-cap-falsification.md`.
>
> 1. Terzo negative result convergente: rimuovere del tutto il cap (flag
>    `SISTEMA_PER_UNIT_ACTIONS_ENABLED`, 3 -> 7 unita' attive a regime) lascia dWR **0.000**
>    su 3/3 encounter, N=10 paired, wiring falsificato (6-8/10 seed divergenti).
> 2. `tools/sim/intent-mix-probe.js` (18 fight) MISURA la conversione: il Sistema spende
>    **~55% delle attivazioni in `retreat`** e ne converte in `attack` solo il **4.6%**
>    (control); a cap rimosso gli attacchi **calano** (11 -> 6). Dorsale seed 1-2: ZERO
>    attacchi in 15 round.
> 3. Causa candidata (grep-verificata, non ancora A/B): 1 azione/unita' vs 2 AP del PG +
>    gittata Sistema 1 vs `p_ranger`/`p_warden` a 2 + `SelfHealth` che premia `retreat`
>    quando ferito (`utilityBrain.js`, peso 0.7). Il Sistema arriva ferito e scappa.
>
> **Conseguenza per questa spec**: il problema non e' il verbo MANCANTE (`defend_zone`) ma
> il verbo SBAGLIATO (`retreat`) -- un `defend_zone` nuovo rischia di essere scartato dalla
> stessa consideration che oggi scarta `attack`. Il doc raccomanda **retreat-gating prima
> di defend_zone**: stesso costo, testa la causa misurata, e non viola l'invariante di
> asimmetria (`ai_profiles.yaml` `sistema_resource_model.note`, che vieta di rispecchiare
> le regole del player). I fork sez. 6 NON sono revocati: restano owner-gated.
>
> **Correzione recon (sez. 2.1)**: il cap non seleziona per merito. Il loop `:361` scorre
> `session.units` in ordine di inserimento; le prime vive consumano il tetto e la coda
> riceve `PRESSURE_CAP -> skip`. I rinforzi, accodati, sono **statue** finche' non muore un
> membro della wave-1: la metrica `avg_reinforcements: 4.00 (a cap)` dei ratify N=40 misura
> lo **spawner**, non l'attivita' dei rinforzi.

**Corollario content**: la variante capture_point della dorsale e' pronta nel layout
(grid-ratify, Gap dichiarati) ma resta ceiling finche' l'AI Sistema non difende una zona --
il player-sim insegue le zone, il Sistema no (asimmetria misurabile, sez. 2).

## 2. Recon ground-truth (grep 2026-07-06, tutti i path verificati)

### 2.1 Dove il Sistema decide gli intent

| Cosa                 | Path:riga                                                                                                                                                                             | Verificato |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Dial runtime intents | `apps/backend/services/ai/declareSistemaIntents.js:114-120` `PRESSURE_TIER_INTENT_CAP` = 1/2/3/3/4                                                                                    | OK         |
| Choke-point cap      | `declareSistemaIntents.js:148` `intentsCapForPressure(pressure, floor, aliveSistema)` (terzo arg = roster-scaling #3231, flag OFF); call-site `:309`; skip a cap raggiunto `:365-370` | OK         |
| Verbi emessi runtime | `attack` / `approach` / `retreat` (-> move) / `skip` -- vedi `policy.js:21` e resolve `declareSistemaIntents.js:493-546`                                                              | OK         |
| Policy rule-based    | `apps/backend/services/ai/policy.js:133-234` (STATO_STUNNED/RAGE/PANIC + REGOLA_001/002/003). Nessuna lettura di `session.encounter.objective`                                        | OK         |
| Utility brain        | `apps/backend/services/ai/utilityBrain.js:372-385` generateActions = attack/approach/retreat/skip; `:422` intent = `action.type`. Nessun candidate zone-anchored                      | OK         |
| Tier pressure (HUD)  | `apps/backend/services/ai/aiProgressMeter.js:28-34` PRESSURE_TIERS Calm/Alert/Escalated/Critical/Apex                                                                                 | OK         |

### 2.2 Dove vive il vocabolario intent (data-side)

- `data/core/ai/ai_profiles_extended.yaml:31-39` -> `intent_weights` per personality
  (attack, execution, multi_attack, flank, retreat, **defend**, heal) + `signature_actions`.
- **DORMANT**: grep repo-wide -> `intent_weights` ha ZERO consumer runtime (solo il YAML
  stesso + un handoff 2026-04-27).
- **Correzione al contesto della sessione** (Currency Gate): il loader
  `aiPersonalityLoader.js` NON esiste piu' -- DELETED in PR #2058 (2026-05-05,
  TKT-SERVICES-ORPHAN, 121 LOC, zero callers; evidence `BACKLOG.md:1131`). Il loader vivo e'
  `apps/backend/services/ai/aiProfilesLoader.js:36`, che carica
  `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` (flag `use_utility_brain`),
  NON l'extended. Qualunque fork che "riusa il defend weight" deve prima RI-WIRARE
  l'extended YAML (o migrare i weight nel YAML canonico del loader vivo).
- `defend` runtime oggi = solo `apps/backend/services/ai/threatPreview.js:30`
  (`defend: 'shield'`, icon map del telegraph): la surface UI per un verbo difensivo
  esiste gia' a costo zero, il verbo no.

### 2.3 Dove vive objective.target_zone a runtime

- Schema: `schemas/evo/encounter.schema.json:88` enum `objective.type` =
  elimination/capture_point/escort/sabotage/survival/escape; `:90-96` `target_zone`
  = [x1,y1,x2,y2].
- Session: `apps/backend/routes/session.js:2454-2463` costruisce `encounterPayload`
  (req.body.encounter O `loadEncounter(encounter_id)` YAML); `:2578`
  `session.encounter = encounterPayload`. Consumo: `evaluateObjective` require
  `:2851-2852` (per-round) + `:4324-4325` (final).
- Consumer zona: `apps/backend/services/combat/objectiveEvaluator.js:115` (capture_point),
  `:192` (escort extraction), `:205` / `:279` (escape / altro). Valuta SOLO la victory
  condition: nessun feedback verso l'AI Sistema.
- Player-sim (l'asimmetria): `tools/sim/combat-policy.js:26` `ZONE_PURSUIT_OBJECTIVES` =
  capture_point/sabotage/escape/escort; `:148-151` pursuit di un tile libero in zona.
  E' la policy del PLAYER: lato Sistema non esiste alcun equivalente.

### 2.4 Cosa manca per un intent "difendi zona" (gap sintetico)

1. Nessun modulo AI Sistema (`declareSistemaIntents` / `policy` / `utilityBrain`) legge MAI
   `session.encounter.objective` -- l'objective e' invisibile all'AI.
2. Nessun verbo posizionale zone-anchored nel vocabolario runtime (solo closest-attack /
   approach / retreat).
3. Nessun encounter con objective zone-based autorato che eserciti il verbo:
   `docs/planning/encounters/enc_badlands_dorsale_ferrosa_01.yaml:54-55` e' `elimination`;
   la variante capture_point NON e' autorata (loader dirs:
   `apps/backend/services/combat/encounterLoader.js:22-23` = `docs/planning/encounters` +
   `encounters-draft`).
4. `intent_weights.defend` esiste solo come dato dormiente (2.2).

## 3. Fork espliciti per Eduardo (SDMG: decider = master-dd, tutti i valori PROPOSED)

### Fork A -- Dove vive il verbo: intent NUOVO vs riuso pattern

- **A1 (raccomandato dal draft): intent nuovo `defend_zone`, decision-layer-only.**
  Nuovo ramo in `declareSistemaIntents` (o modulo dedicato stile `sistemaTurnRunner`
  consideration): se `session.encounter.objective.type` e' zone-based e l'unita' e'
  assegnata alla zona -> move verso tile in `target_zone` / attack su nemici in zona o
  adiacenti. Il verbo si RISOLVE in move/attack GIA' esistenti: raw event schema
  `{action_type,...}` INVARIATO, vcScoring intatto. Telegraph: icona `defend` gia'
  mappata (threatPreview). Costi: nuovo ramo decisionale + test; naming nel log decisions
  (`intent: 'defend_zone'` e' additivo, il campo e' testo libero lato decisions).
  Blast-radius: MEDIO (solo `services/ai/`, fuori forbidden-path).
- **A2: riuso pattern esistente (bias posizionale, nessun verbo nuovo).** Target selection /
  approach anchor = la zona invece del nemico piu' vicino, pesato da `intent_weights.defend`
  (richiede ri-wire dell'extended YAML, oggi dormant -- 2.2) oppure da un param encounter.
  Costi: wire di un file data oggi morto + ambiguita' semantica (il weight `defend` nasce
  per self-defense da personality, non per zone-defense da objective). Blast-radius: BASSO
  sul contratto, MEDIO sulla leggibilita'/debuggability (nessuna decision esplicita nel log).
- Non-goal comune: NESSUN cambio a `packages/contracts` ne' al raw event schema in entrambe.

### Fork B -- Unlock: tier-gated vs per-encounter authored

- **B1: tier-gated** (es. Critical+ o Apex-only, soglia PROPOSED): zone-defense entra nel
  mix solo a tier alto. Pro: coerente col tema D4 "intent-type per tier" e con la scala
  canonica (PRESSURE_TIERS); zero authoring. Contro: si attiva su TUTTI gli encounter
  zone-based esistenti/futuri al tier -> band-impact potenziale globale; un capture_point
  giocato a tier basso resta indifeso.
- **B2: per-encounter authored** (campo YAML, es. `objective.sistema_defends: true`):
  opt-in esplicito, default assente = byte-identical (mirror del pattern `board_scale`,
  ADR-2026-07-03). Pro: band-neutral by construction; A/B pulito per-encounter. Contro:
  campo nuovo in `schemas/evo/encounter.schema.json` = **forbidden-path additivo** (stesso
  precedente autorizzato di `board_scale` #3199: additivo OK ma va SEGNALATO, non silente).
- **B3: combinazione** -- authored opt-in (B2) + intensita' scalata per tier (quante unita'
  assegnate alla zona cresce col tier). Il piu' fedele al lever "intent-type per tier",
  il piu' costoso da ratificare (2 knob).
- Raccomandazione dal draft: B2 per il primo A/B (isolamento massimo), B3 come direzione v2.

### Fork C -- Criterio di misura "morde" (proposta)

- **C1 (raccomandato): A/B sulla variante capture_point della dorsale.** Prerequisito
  content: autorare `enc_badlands_dorsale_ferrosa_02_capture` (stesso layout 16x12 gia'
  ratificato, objective capture_point + `target_zone` sul chokepoint) O objective-override
  nel probe. Arm control = zone-defense OFF; arm treatment = ON. N=10 direction -> N=40
  ratify. Metriche delta (treatment-vs-control, TUTTI delta espliciti ex-ante -- lesson
  harsh-review del negative result: mai disambiguare a dati visti): KO-rate, pace,
  **zone-contest** (round con >=1 unita' Sistema viva in target_zone; oggi NON esposta
  dal probe -> estensione richiesta, sez. 4) e hold-delay (round extra che il party impiega
  a soddisfare hold_turns).
- **C2: misura anche su elimination** (zone-defense come formazione difensiva generica su
  encounter senza zona). RISCHIO NOTO: verbo mai esercitato (objective senza target_zone)
  = false-null by construction -- lesson D8 fire-count: prova che il verbo SPARA (liveness
  count > 0) PRIMA di leggere qualsiasi banda.
- Soglie "morde" PROPOSED (decider Eduardo, da confermare PRIMA del run): dKO-rate >= +0.05
  o zone-contest ratio >= 0.5 o hold-delay >= +3 round vs control.

### Fork D -- Composizione col dial roster-scaling #3231

- **D1 (raccomandato): probe fattoriale 2x2** -- scaling OFF/ON x zone-defense OFF/ON,
  STESSI seed numerici appaiati sui 4 arm. Misura l'interazione: l'ipotesi del negative
  result e' esattamente che lo scaling diventi utile SOLO quando la conversione migliora
  (piu' attivazioni x verbo migliore > somma dei singoli). Costo: 4 arm x N=10 = 40 run
  (fattibile in sessione); N=40 SOLO sull'arm vincente.
- **D2: sequenziale** -- prima zone-defense da solo, combo solo se morde. Piu' economico,
  ma non distingue "nessuno dei due morde da solo ma la combo si'" (il caso che l'ipotesi
  di lavoro predice).
- Vincolo di composizione: qualunque arm combo usa i knob probe GIA' shippati
  (`--intents-scaling` / `--intents-k`, dorsale-ferrosa-band-probe) -- zero build extra
  per il lato scaling.

## 4. Criterio evidence (proposta, NESSUN build in questa spec)

- **Protocollo**: N=10 direction -> N=40 ratify (L-069 / N-sample authority). Niente flip,
  niente cambio a `data/core/balance/grid_ratify_baseline.json` senza N=40 verde + verdetto
  Eduardo. Negative result a N=10 -> si documenta e si ferma (precedente: A/B #3231).
- **Seed NUMERICI appaiati** (lesson_numeric_seeds_paired_sim): seed stringa non-hashata
  non seeda l'RNG combat (`session.js:~2102`) -> Math.random -> armi NON appaiate e
  non-riproducibili. Verifica rerun byte-identical su un seed prima del batch.
- **Harness (PROPOSTA)**: estendere `tools/sim/grid-band-probe.js` (harness generico
  grid_sized, ha gia' i calibration overlay knobs) con: (a) knob `--zone-defense` che setta
  l'env flag dell'arm treatment; (b) metrica `zone_contest` per-round nel summary;
  (c) victory objective-aware (hold_turns) per la variante capture_point. Alternativa:
  harness dedicato mirror di `dorsale-ferrosa-band-probe.js` (checkpoint JSONL, drain-gate
  TIME_WAIT, in-process supertest). Scelta implementativa = sessione di build, NON qui.
- **Liveness gate prima della banda**: count decisioni `defend_zone` > 0 nell'arm treatment
  (strumentato nel summary), altrimenti il confronto e' false-null (lesson D8).
- **Flag runtime (futuro, PROPOSED)**: pattern A2/`PRESSURE_TIER_FLOOR_ENABLED` -- env
  `=== 'true'`, letto per-call, default OFF = byte-identical, probe-friendly.

## 5. Cosa NON fa questa spec

- **Zero build**: nessuna riga di codice, nessun flag creato, nessun encounter autorato,
  nessun probe esteso. Solo questo documento + entry registry.
- **Zero flip**: qualunque flag futuro nasce default OFF; flip = solo Eduardo, post N=40.
- **Tutti i valori PROPOSED**: soglie tier (Fork B1), campo YAML (B2), soglie "morde"
  (Fork C), disegno fattoriale (Fork D) -- decider Eduardo (SDMG: metodo progettato
  dall'agente = ipotesi alto-errore, non decisione).
- **Fork decisi post-draft**: A/B/C/D ratificati in sez. 6 (verdetti owner 2026-07-06
  via AskUserQuestion; il draft nasceva coi fork aperti).
- **Non tocca** `packages/contracts`, raw event schema, `.github/workflows/`. Se il
  verdetto B sceglie il campo YAML -> PR dedicata con segnalazione forbidden-path
  additiva esplicita (precedente `board_scale` #3199).

## 6. Verdetti owner (2026-07-06, ratificati in sessione)

Decisi da Eduardo via AskUserQuestion (sessione merge-wave 2026-07-06 sera), qui ratificati:

| Fork         | Verdetto                                                                                                                                                                                            | Nota di build                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A (verbo)    | **Intent NUOVO `defend_zone`** decision-layer-only, si risolve in move/attack esistenti                                                                                                             | raw-event schema INVARIATO (vcScoring salvo); icona telegraph `defend` gia' mappata          |
| B (unlock)   | **Per-encounter authored** (campo YAML opt-in, mirror `board_scale` ADR-2026-07-03)                                                                                                                 | additivo su `schemas/evo` = forbidden-path da SEGNALARE nella PR di build (precedente #3199) |
| C+D (misura) | **Fattoriale 2x2** (roster-scaling #3231 x zone-defense) su variante capture_point della dorsale, stessi seed appaiati, N=10 -> N=40 SOLO su arm vincente + liveness gate (`defend_zone` count > 0) | prereq content: autorare la variante capture della dorsale (layout gia' pronto, doc dorsale) |

Correlati decisi nello stesso giro: calibrazione D9 = fork (a) lettura relativa RATIFIED
(doc `docs/research/2026-07-06-xpbudget-geometry-calibration.md` sez. 5); flip
`XP_BUDGET_GEOMETRY_ENABLED` = staged-latent keys.env (owner, host CODEMASTERDD).
Il build zone-defense = arco dedicato (prossima lane), NON in questa PR.
