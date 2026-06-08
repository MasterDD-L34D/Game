---
title: 'Evo-Tactics SPEC-Q DF-Levels Narrative and Simulation Depth (spec piena)'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
review_cycle_days: 30
source_of_truth: false
language: it
tags: [evo-tactics, spec-q, df-levels, narrative, reference-games, chronicle, identity, legacy]
related: ADR-2026-05-18-df-levels-integration-direction
---

# Evo-Tactics SPEC-Q DF-Levels Narrative and Simulation Depth (spec piena)

Contratto Wave-5 (game-reference harvest). Spec piena dello scope-doc omonimo: recupera la
PROFONDITA' narrativa/simulativa (DF-levels L1-L4) che le Spec A..P -- tutte superfici
device/TV -- avevano saltato come blocco. Harvest da `RECONCILIATION-MASTER.md` (A5 vault,
31 giochi -> DF-levels) + `ADR-2026-05-18-df-levels-integration-direction.md` (Game
ground-truth), git-verificato. 7 gap genuini: M-1..M-7.

## 1. Scopo e non-scopo

**Scopo.** Portare la profondita' DF-levels mancante come contratti Game-side: cronaca
cross-session (L4, M-7 keystone), identita' guadagnata (L1, M-2), eredita' tangibile (L3,
M-1+M-3), intelligenza Sistema leggibile (L2/P5, M-4), + 2 verify/constraint (M-5 P3, M-6 P2).
SPEC-Q ALIMENTA gli engine LIVE, NON li riscrive (la cronaca sta SOPRA il combat event-log,
non lo rimpiazza).

**Non-scopo (esplicito).**

- SPEC-Q NON ricostruisce il combat-round event-log (`sessionRoundBridge`, per-round, LIVE):
  la cronaca e' un layer narrativo cross-session SOPRA di esso.
- SPEC-Q NON ridefinisce lo scar-as-stat (`woundedPerma`/`woundSystem` = SPEC-J): qui = il
  LAYER identita' narrativa che lo riusa.
- SPEC-Q NON costruisce surface device/TV (Spec A..P) ne' la regia (SPEC-D); fornisce i dati
  (chronicle/identity) che quelle surface consumeranno.
- SPEC-Q NON ridecide lo scoring MBTI/Ennea/Conviction (engine-owned).
- L0 (Citizen Sleeper needs, Cocoon biome-rules) = deferred POST-MVP gated (non-scopo qui).

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

| Engine / artefatto                                         | Ruolo / stato                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `routes/sessionRoundBridge.js`                             | Combat event-log per-round LIVE. La cronaca (M-7) ci sta SOPRA, non lo rimpiazza.                                                    |
| `services/combat/woundedPerma.js` + `woundSystem.js`       | Scar-as-stat (SPEC-J). M-2 identity riusa lo scar come layer narrativo.                                                              |
| `services/generation/lineagePropagator.js`                 | Mating/lineage Game-side LIVE. M-3 named-mutation lineage vi si aggancia.                                                            |
| `data/core/mutations/mutation_catalog.yaml`                | 36 mutazioni; **24 con `derived_ability_id` null** -> M-6 visual-swap likely 0-runtime (verify).                                     |
| `services/narrative/qbnEngine.js` + `tools/py/skiv_qbn.py` | QBN non-LLM LIVE (+ inkjs). M-7 chronicle usa template parametrici QBN, non LLM.                                                     |
| `services/ai/declareSistemaIntents.js`                     | Intents Sistema. M-4 hidden-ability reveal vi aggiunge la regola soglia + addendum SPEC-H.                                           |
| `sentience_tier` (skiv_archetype_pool / mutagen_events)    | Dato sentience LIVE (#1808) -- input per M-2 identity tier.                                                                          |
| museum `creature-wildermyth-battle-scar-portrait.md`       | Reuse-path M-2: portrait overlay da evento formativo.                                                                                |
| `/api/v1/session/:id/*` route pattern                      | Pattern endpoint esistente (`/:id/objective`, `/:id/aliena-telemetry`...) -> dove vivra' `/:id/chronicle*`.                          |
| **404 greenfield**                                         | `services/{identity,eventlog}` (chronicle store+API ora LIVE -- vedi sez.4); named heirloom/artifact (0 hit); hidden-ability design. |

**NB diaryStore (verificato, reuse-first P1):** `services/diary/diaryStore.js` + `routes/diary.js`
sono LIVE = diary PER-UNIT cross-session (Pillar 5; JSONL append-only,
`data/derived/unit_diaries/<unit_id>.jsonl`, event_type whitelist incl. mutation_acquired /
form_evolved / job_changed; appendEntry/getDiary/tailDiary). La cronaca M-7 e' per-BRANCO; NON
va duplicato -- o estende diaryStore o e' uno store separato giustificato dallo scope (QF1).

Invarianti ereditate:

- **ADR-2026-05-18 DF-levels:** la direzione DF-levels e' la mappa di profondita' (L0-L5);
  l'authority origine (RECONCILIATION-MASTER) e' A5 vault = research/non-governing -> qui
  design-contract Game.
- **No-LLM runtime:** la cronaca usa template parametrici (QBN/inkjs gia' live), non LLM.
- **Reuse-first:** scar (SPEC-J), lineage (lineagePropagator), QBN, sentience_tier sono LIVE
  -- riusare, non ricostruire.
- **Keystone M-7:** A3 (failure-as-lore = SPEC-P) e A13 (biome-wound cross-run = SPEC-P)
  dipendono dalla cronaca -> M-7 primo nel build-order.

## 3. DF-levels coperti

| Livello | Cosa                                           | SPEC-Q gap     | Stato                  |
| ------- | ---------------------------------------------- | -------------- | ---------------------- |
| L1      | Identita' guadagnata (name/portrait/storia)    | M-2            | greenfield             |
| L2/P5   | Sistema leggibile (abilita' nascoste reveal)   | M-4            | 0 design               |
| L3      | Eredita' tangibile (heirloom + named-mutation) | M-1, M-3       | M-1 0; M-3 Godot-draft |
| L4      | Cronaca cross-session                          | M-7 (keystone) | chronicle 404          |
| P3/P2   | Job-identity constraint / visual-swap verify   | M-5, M-6       | design/verify          |

L0 (needs/biome-rules) e L5 = POST-MVP gated (non-scopo).

## 4. L4 -- Chronicle / Memory-mode (M-7, keystone)

Event-store narrativo cross-session SOPRA il combat event-log.

- **Sorgente:** eventi narrativi salienti (nascita/morte/mutazione/scar/legacy/failure)
  emessi dagli altri sistemi (SPEC-J wound, SPEC-P failure, M-2 identity, M-3 lineage) come
  `chronicle_event { type, actor_id, run_id, ts, payload, tier }`.
- **Contratto API (LIVE, QF1-A):** `services/chronicle/chronicleStore.js` (JSONL per-branco) +
  `POST /api/chronicle/:run_id` (append) + `GET /api/chronicle/:run_id` (read, filtrabile
  `?type=` / `?actor_id=`) + `/summary`. 9 event-type whitelist + tier public/private/secret.
  Emitter (A3 `run_failed`, M-2 `creature_named`, M-3 `mutation_lineage`...) + viewer = follow-up.
- **Viewer + Memory-mode home:** Loop Hero visual-emergence, Slay-the-Princess branching-state
  memory, DF template parametrici (QBN/inkjs LIVE, non LLM). Surface Godot = SPEC-K/D consumer.
- **Keystone:** SPEC-P (A3 failure-as-lore emette chronicle_event; A13 biome-wound cross-run
  legge la cronaca del bioma). M-7 = primo nel build-order (fan-out dipendenze).
- **Build-order (verificato):** M-7 (chronicle/store, definisce l'interfaccia append) PRIMA ->
  M-2 (identity, consuma l'append) -> M-4 (Sistema legibility) -> M-3/M-1 (L3 insieme, QF4=both;
  M-1 heirloom e' greenfield = build extra). M-5 (nota design) + M-6 (audit) = parallel.

## 5. L1 -- Identity-earned (M-2, Wildermyth/Triangle Strategy)

- **Name emergence** da lifecycle trigger: Hatchling anonima -> Juvenile nome -> Apex
  nome+MBTI reveal -> Legacy figura storica. Modello trigger = QF2.
- **Portrait/sprite overlay** da evento formativo (cicatrice visibile, non solo stat) --
  reuse museum `creature-wildermyth-battle-scar-portrait.md`.
- **Scar-as-identity:** riusa `woundedPerma` (SPEC-J); qui = il layer narrativo (la cicatrice
  diventa storia nella cronaca, non solo malus).
- `services/identity` = greenfield: nuovo servizio che legge lifecycle + sentience_tier
  (#1808) + scar e produce l'identita' emergente (nome/portrait/storia).

## 6. L3 -- Legacy artifacts (M-1 FFT + M-3 Wildermyth)

- **M-1 named heirlooms/artefatti** con provenienza tracciata (lignaggio -> oggetto). 0 hit
  oggi (greenfield). Cronaca entry-type `heirloom`. Scope/timing = QF4.
- **M-3 named-mutation lineage (contratto Game-side):** endpoint + schema Game per il draft
  Godot-v2 `named-mutations-l3-wildermyth-design.md`; si aggancia a `lineagePropagator.js`
  (mating lineage LIVE). Cronaca entry-type `mutation_lineage`. Timing = QF4.

## 7. L2/P5 -- Sistema legibility (M-4, Invisible Inc / AI War)

- Abilita' nemiche nascoste/evolventi rivelate a soglia (es. dopo 3 usi -> reveal diegetico
  via ALIENA). Regola in `declareSistemaIntents.js` + addendum SPEC-H.
- **Tensione di design (QF3):** telegraph P1 (tutto visibile pre-commit, Into the Breach,
  invariante WEGO) vs Sistema-impara (AI War, info nascosta che si rivela). Le due dottrine
  confliggono -> va deciso il confine.

## 8. P3 -- Job-identity constraint (M-5, Dicey Dungeons)

- Vincolo di design (non un sistema): ogni job risponde a UNA domanda core (Predator = "e se
  attacchi sempre?"; Symbiont = "e se l'HP e' condiviso?"). Anti feature-accumulation sui
  job-expansion (gap C6). Nota design -> SPEC-E (o sibling); SPEC-Q lo enuncia come principio.

## 9. P2 -- Visual-swap verify (M-6, Spore)

- Verify-gate (verificato): `mutation_catalog.yaml` ha **24/36 mutazioni con
  `derived_ability_id` null** -> quelle mutazioni sono visual-swap likely 0-runtime. Confermare
  caso per caso; se diventano una Godot-surface -> SPEC-K. NON un nuovo sistema, un audit.

## 10. Visibilita' (eredita SPEC-B)

| Dato SPEC-Q                                   | Tier                 | Razionale                                                                                                 |
| --------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| Cronaca pubblica del branco (eventi salienti) | `public`             | memoria del tavolo (TV/Memory-mode home), come recap/lineage SPEC-B.                                      |
| Cronaca per-creatura del player (dettaglio)   | `private`            | sul device del proprietario.                                                                              |
| Identita' emergente (nome/portrait/storia)    | `public` (al reveal) | il reveal nome/MBTI e' un promotion-gate (mirror offspring SPEC-B).                                       |
| Scoring sentience/MBTI interno                | `secret`             | engine-only.                                                                                              |
| Abilita' nemica nascosta (M-4) pre-reveal     | `secret`             | nascosta finche' la soglia non la rivela; il REVEAL (evento ALIENA, post-uso) e' `public` TV+device. QF3. |
| Heirloom/named-mutation provenance            | `public`             | lignaggio = memoria condivisa (Nido lineage tree).                                                        |

## 11. Relazione con altre spec

- **SPEC-P** (failure-as-lore): A3 emette chronicle_event; A13 biome-wound legge la cronaca.
  Back-ref gia' in SPEC-P sez. 10 (#2644). M-7 e' il keystone di entrambi.
- **SPEC-J** (scar/wounds): M-2 identity riusa `woundedPerma`; lo scar diventa entry cronaca.
- **SPEC-D** (cinematic): legge l'event-log/cronaca per la regia; consumer, non owner.
- **SPEC-E** (Nido/lineage): M-3 lineage + M-5 job-identity constraint hanno surface li'.
- **SPEC-H** (ALIENA): M-4 hidden-ability reveal = addendum SPEC-H (reveal diegetico).
- **SPEC-K** (device authority): viewer cronaca + visual-swap (M-6) = surface Godot.
- **SPEC-B/A**: visibilita' (sez. 10) + tier.
- **SPEC-L**: traccia lo stato (chronicle/identity 404; reuse LIVE).

## 12. Decisioni

Fork etichetta `QF#` (anti-clash con F/G/H/E/FC/TS/J/HA/ER/QA/PA/MA/OA).

**Ratificate (Eduardo 2026-06-08):**

| Fork | Esito ratificato (2026-06-08)                                                         |
| ---- | ------------------------------------------------------------------------------------- |
| QF1  | Nuovo `services/chronicle` per-BRANCO (diaryStore resta per-unit; no double-store)    |
| QF2  | Name emergence auto da lifecycle (Hatchling->Juvenile->Apex+MBTI->Legacy)             |
| QF3  | Hidden SOLO cross-incontro; intra-round sempre telegrafato (WEGO); first-use generico |
| QF4  | L3 COMPLETO nell'MVP: M-3 named-mutation + **M-1 heirloom (greenfield, build extra)** |

NB QF4=both: M-1 (heirloom) e' greenfield (0 hit oggi) -> piu' lavoro di build nell'MVP; il
build-order resta M-7 -> M-2 -> M-4 -> M-3/M-1 (L3 insieme).

Sotto: opzioni/rationale originali di ogni fork (storia della decisione).

### QF1 -- Architettura dello store cronaca

Il vero asse NON e' topologico ma di SCOPE: la cronaca e' per-UNIT (come `diaryStore` gia'
LIVE) o per-BRANCO/tavolo (storia condivisa, Memory-mode home)?

- **Opzione A -- nuovo `services/chronicle` per-BRANCO + persistenza (raccomandata).** Store
  dedicato (NeDB default / Prisma se `DATABASE_URL`), endpoint `/:id/chronicle*`, scope
  branco/sessione. Tradeoff: pulito per la storia del tavolo (TV Memory-mode); il per-unit
  resta su `diaryStore`. Giustificazione vs diaryStore = lo SCOPE (branco != unit).
- **Opzione B -- estendere `diaryStore`** (aggiungere `actor_id`/`run_id`/`tier` + scope branco
  a whitelist+schema). Tradeoff: reuse-first massimo (1 solo store cross-session); ma diaryStore
  e' nato per-unit -> va generalizzato a branco senza rompere i consumer attuali.
- **Opzione C -- estendere il combat event-log (`sessionRoundBridge`).** Scartata: per-round
  vs cross-session = il combat-log gonfia.
- **Raccomandazione:** A (chronicle per-branco separato; diaryStore resta per-unit); B se si
  preferisce un unico store cross-session. In ogni caso NON un secondo store per-unit
  (anti double-store con diaryStore).

### QF2 -- Modello di name emergence (M-2)

Come emerge il nome/identita' della creatura?

- **Opzione A -- auto da lifecycle (raccomandata).** Hatchling anonima -> Juvenile nome
  (pool QBN) -> Apex nome+MBTI reveal -> Legacy. Tradeoff: emergente, zero attrito,
  Wildermyth-like.
- **Opzione B -- player-named.** Il player nomina la creatura. Tradeoff: piu' agency, ma
  meno "identita' guadagnata dal gameplay".
- **Opzione C -- ibrido**: auto + override opt-in del player. Tradeoff: il meglio di entrambi,
  ma piu' UI/stato.
- **Raccomandazione:** A (con C come estensione opt-in eventuale).

### QF3 -- Reveal abilita' nascoste (M-4): telegraph-all vs hidden

Tensione doctrine: telegraph P1 (tutto visibile pre-commit, ItB/WEGO) vs Sistema-impara
(AI War, info nascosta rivelata a soglia).

- **Opzione A -- hidden con reveal diegetico a soglia, MAI pre-commit (raccomandata).** Le
  abilita' nemiche evolventi sono nascoste finche' una soglia (es. 3 usi) le rivela via
  ALIENA; ma l'invariante WEGO (intent del round visibile pre-commit) resta. Tradeoff:
  preserva il telegraph tattico P1 + aggiunge scoperta cross-incontro. Confine: "cosa fa il
  nemico QUESTO round" = telegrafato; "quale tattica evolvera'" = nascosto-fino-a-soglia.
- **Opzione B -- tutto telegrafato (no hidden).** Coerenza totale con P1; ma perde la
  profondita' Sistema-impara (M-4 diventa solo cosmetico).
- **Opzione C -- hidden anche intra-round.** Massima tensione AI-War; ma rompe l'invariante
  WEGO (telegraph P1) -- scartata salvo override esplicito.
- **Primo uso (edge):** la prima attivazione di un'abilita' nascosta e' comunque telegrafata
  intra-round come intent GENERICO (WEGO non si rompe); il reveal diegetico (cosa fosse + che
  evolvera') avviene POST-uso a soglia via ALIENA.
- **Raccomandazione:** A (hidden cross-incontro; intra-round SEMPRE telegrafato pre-commit;
  primo-uso = intent generico + reveal post-uso).

### QF4 -- Scope/timing L3 (M-1 heirloom + M-3 named-mutation Game-side)

Quanto di L3 nell'MVP?

- **Opzione A -- M-3 contratto Game-side ora, M-1 heirloom dopo (raccomandata).** M-3
  (named-mutation lineage) ha gia' il draft Godot + `lineagePropagator` LIVE -> contratto
  Game-side ora (endpoint+schema). M-1 (heirloom greenfield) = post-MVP. Tradeoff: sblocca
  il Godot draft senza aprire un sistema heirloom da zero.
- **Opzione B -- entrambi ora.** L3 completo, ma M-1 e' greenfield (piu' lavoro).
- **Opzione C -- entrambi dopo.** Solo cronaca (M-7) + identita' (M-2) nell'MVP; L3 tutto
  post-MVP. Tradeoff: MVP piu' snello.
- **Raccomandazione:** A.

## 13. Acceptance

SPEC-Q e' implementabile/chiudibile quando:

1. **L4 cronaca (M-7):** `chronicle_event` schema + `POST/GET /:id/chronicle*` definiti, store
   deciso (QF1), template QBN (no LLM); SPEC-P (A3/A13) emette/legge la cronaca; M-7 e' primo
   nel build-order;
2. **L1 identita' (M-2):** `services/identity` legge lifecycle + sentience_tier + scar
   (`woundedPerma`) e produce nome/portrait/storia; modello name-emergence deciso (QF2);
   reveal = promotion-gate (SPEC-B);
3. **L3 (M-1 + M-3, QF4=both nell'MVP):** M-3 named-mutation contratto Game-side agganciato a
   `lineagePropagator` + draft Godot; M-1 heirloom (greenfield) costruito con provenance
   tracciata + cronaca entry-type `heirloom`;
4. **L2/P5 (M-4):** regola reveal in `declareSistemaIntents` + addendum SPEC-H; il reveal si
   applica SOLO alla tattica evolutiva cross-incontro -- gli intent intra-round del Sistema
   restano telegrafati pre-commit (WEGO invariante), primo-uso = intent generico + reveal
   post-uso (QF3 opzione A);
5. **M-5 (P3, nota design -- non un done-gate di SPEC-Q):** il principio "1 job = 1 domanda" e'
   documentato in SPEC-E/sibling con back-ref a SPEC-Q M-5;
6. **M-6 (P2):** audit delle 24 mutazioni `derived_ability_id` null completato (0-runtime
   confermato o -> SPEC-K);
7. la visibilita' (sez. 10) e' coerente con SPEC-B (cronaca public/private, identita' al
   reveal, abilita' nascoste `secret`);
8. QF1-QF4 sono ratificati da Eduardo; il flip `review_needed` -> `accepted` al merge resta a
   lui (`source_of_truth:false`).
