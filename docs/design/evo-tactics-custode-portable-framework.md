---
title: 'Evo-Tactics Custode Portable Framework (SPEC-F)'
date: 2026-06-08
type: design-spec
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
review_cycle_days: 30
language: it
tags: [evo-tactics, custode, portable, skiv, export, crossbreeding, privacy, device-authority]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics Custode Portable Framework (SPEC-F)

Contratto Wave-2 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md` sez. 4).
Generalizza **Skiv** in un framework Custodi portabili: Custode di campagna e personale,
export card/JSON/QR firmato, privacy whitelist, import/rientro, risincronizzazione,
incontri asincroni, distinzione biologico vs narrativo.

## 1. Scopo e non-scopo

**Scopo.** Definire il framework dei Custodi portabili: i 4 livelli (voce / entita' /
companion / estratto), il contratto di export (card/JSON/QR + firma + whitelist),
import/rientro/resync, gli incontri asincroni, e cosa puo' il crossbreeding vs cosa
esporta solo memoria.

**Non-scopo (esplicito).**

- SPEC-F NON reimplementa il portable store: `skiv/companionStateStore` (schema v0.2.0:
  `companion_card_signature`, `crossbreed_history`, `lineage_id`, `voice_diary_portable`,
  `share_url`, whitelist privacy, cap 10 ambassador/Nido) e gli endpoint Skiv sono
  LIVE/parziali (ADR-2026-04-27). SPEC-F GENERALIZZA Skiv -> Custodi, non riscrive.
- SPEC-F NON ridefinisce la tassonomia di export: il whitelist tier-respecting e' SPEC-A
  sez. 7 (export porta solo aggregati/snapshot consentiti, mai raw/secret).
- SPEC-F NON ridefinisce la genetica: `meta/geneEncoder` + crossbreed gene-mix (ADR-04-27)
  restano engine-owned.
- SPEC-F NON e' un care-sim: Skiv = "creatura-memoria portabile", NON Tamagotchi
  (niente feeding/sleep obbligatorio; reconstruction 3.3/3.4).

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

`apps/backend/services/skiv/companionStateStore.js` (schema v0.2.0, ADR-2026-04-27) +
`companion/companionPicker.js` + `coop/ermesExporter.js`. Endpoint `routes/skiv.js`:

| Endpoint                                               | Stato                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `GET /api/skiv/status` `/feed` `/card` `POST /webhook` | LIVE (monitor/dashboard esterna)                                         |
| `POST /api/skiv/crossbreed` (+ `/confirm`, `/history`) | DA IMPLEMENTARE: schema+store live, route HTTP ASSENTI in routes/skiv.js |
| `GET /api/skiv/share/:lineage_id?format=json`          | DA IMPLEMENTARE: whitelist nello store, route HTTP ASSENTE               |

Campi store v0.2.0: `unit_id`, `species_id`, `biome_id`, `mbti_axes`, `progression`,
`cabinet`, `mutations`, `aspect`, `diary`, `lineage_id`, `companion_card_signature`,
`crossbreed_history[]`, `voice_diary_portable`, `share_url`. Defaults ratificati
(ADR-04-27 + store): cap 10 ambassador/Nido (FIFO eviction), `voice_diary_portable` max 5,
`crossbreed_history` max 10 (FIFO), ambassador permanente, cooldown crossbreed 1/campagna,
rate-limit import 10/h IP. `companion_card_signature = sha256(canonicalJson(whitelist))`;
il server verifica all'import (mismatch -> 400).

Invarianti ereditate:

- **ADR-2026-06-07 punto 4:** i Custodi sono entita' persistenti/esportabili con memoria,
  resync, incontri e ritorno (riferimento pawn di Dragon's Dogma; Skiv = template concreto,
  non il concetto totale).
- **SPEC-A sez. 7:** l'export rispetta i tier -- solo aggregati/snapshot consentiti, mai
  raw, mai secret-individuale non consentito.
- **Reconstruction punto 5 + 3.4:** crossbreeding SOLO per Custodi con `species_id`/lineage
  biologico; i Custodi narrativi esportano dossier/memoria, NON genetica. Un Custode estratto
  NON esporta dati privati/effimeri (`session_id`, `hp_current`).

## 3. I quattro livelli del Custode

Modello a livelli (reconstruction sez. 4): un Custode puo' stare a uno o piu' livelli.

| Livello                  | Cos'e'                                                                                                    | Esempio / file                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| A -- voce                | grammar/voce che commenta outcome/lineage/bond/trauma                                                     | `custode_voice_engine.gd`, `custode_grammar.json` |
| B -- entita' di campagna | id/nome/forma/bioma/voce/relazione/memoria/role (i "2-4 Custodi named" del SoT)                           | --                                                |
| C -- companion           | superficie interattiva: appare su phone, parla in debrief, consiglia, diary, puo' diventare MVP narrativo | Skiv (avanti qui)                                 |
| D -- estratto            | esce dalla campagna: card/QR/JSON/dashboard/share-safe/lineage/ambassador/crossbreed/import in altro Nido | companionStateStore v0.2.0                        |

## 4. Custode biologico vs narrativo

Distinzione canon (reconstruction pt5), NON un fork:

- **Custode biologico**: ha `species_id` + lineage biologico. PUO' fare crossbreeding
  (gene-mix geneEncoder, env-mutation dal bioma del partner). Esporta genetica + memoria.
- **Custode narrativo**: solo memoria/dossier/voce. Esporta dossier/memoria, NON genetica;
  NON puo' essere genitore di crossbreed.

Un Custode estratto da un sotto-branco (SPEC-E `custode_ref`) eredita la natura della
creatura di origine (biologica se ha `species_id`). La natura e' fissata allo SNAPSHOT di
estrazione; una reclassificazione post-estrazione richiede re-estrazione.

## 5. Export contract (card / JSON / QR + firma)

- Un Custode estratto (livello D) diventa: **card** leggibile, **JSON firmato**, **URL/QR**
  condivisibile, presenza dashboard, memoria consultabile, ambassador importabile, pedina
  async, eventuale genitore crossbreed -- "non una copia generica, ma quella stessa entita'
  con storia verificabile" (reconstruction 3.4).
- **Whitelist share-safe** (canonica = `companionStateStore.WHITELIST_TOP_FIELDS`,
  ADR-04-27 sez. D): export include SOLO `schema_version`, `unit_id`, `species_id`,
  `biome_id`, `lineage_id`, `companion_card_signature`, `mbti_axes` (numerici),
  `progression` (level/job/perk), `cabinet` (thought-slot = espressione build pubblica),
  `mutations`, `aspect` (lifecycle/label/sprite), `crossbreed_history` (`session_id` null
  per entry), `voice_diary_portable` (opt-in, max 5 recenti), `share_url`, `generated_at`.
- **Esclusi** (mai esportati): `session_id`, `hp_current`, stato effimero, dati privati di
  altri player, scoring secret non consentito, `partner_card_url` (anti-tracking).
- **Firma/tamper**: `companion_card_signature = sha256(canonicalJson(whitelist SENZA il
campo `companion_card_signature` stesso))` (`signatureFor`). Il server verifica
  all'import; mismatch -> 400. NB: la firma garantisce INTEGRITA' del trasporto, NON
  autenticita' dell'origine (vedi FC4).
- L'export e' il **tier-filter finale** di SPEC-A: cio' che lascia il sistema e' gia'
  `public`/snapshot-consentito; mai raw/secret.

## 6. Import / rientro / resync / incontri asincroni

- **Import**: una card (JSON/QR) viene importata in un altro Nido come ambassador
  (verificata via signature). Cap 10 ambassador/Nido, ambassador permanente (ADR-04-27).
- **Crossbreed async cross-player**: `POST /crossbreed` con `partner_card_url|json` ->
  offspring proposal (gene-mix + env-mutation dal bioma locale) -> `/crossbreed/confirm`
  appende a `crossbreed_history` + Nido. Cooldown 1/campagna, rate-limit 10/h IP.
- **Incontri asincroni**: un Custode estratto puo' incontrare altri Custodi/Nidi fuori
  campagna e rientrare con eventi verificati. Cosa l'incontro produce al rientro = **fork FC2**.
- **Rientro/resync**: il Custode rientra in campagna; lo stato home puo' essere avanzato
  rispetto allo stato portato (eventi esterni). La policy di riconciliazione = **fork FC1**.

## 7. Visibilita' (eredita SPEC-A/B)

- L'export e' la prova vivente dell'enforcement SPEC-A sez. 7 / SPEC-B: solo i campi
  whitelist (public/snapshot-consentito) lasciano il device/sistema. `secret`
  (scoring identita') e raw (`hp_current`, `session_id`) non escono MAI.
- `voice_diary_portable` esce SOLO se consentito (opt-in self-disclosure SPEC-B):
  **default opt-out** (`voice_diary_portable = []` nell'export se il consenso manca);
  consenso acquisito all'estrazione o nei settings Nido; l'export strippa il campo se il
  flag e' assente. Il diario e' identita' del player/creatura.
- Sul TV/dashboard, il Custode mostra solo il subset `public` (card/lineage/memoria
  consentita); nessun dato privato di altri player.

## 8. Relazione con altre spec

- **SPEC-A** (sez. 7): il whitelist export E' il tier-respecting di SPEC-A; SPEC-F lo applica.
- **SPEC-B**: la card mostra solo `public`/consentito; `voice_diary` = opt-in self-disclosure.
- **SPEC-E**: un Custode si estrae da un sotto-branco (`custode_ref`); biologico se la
  creatura ha `species_id`. Crossbreed offspring rientra nel Nido (SPEC-E lineage).
- **SPEC-G** (Tri-Sorgente): lo scambio carte puo' includere card Custode (memoria/influenza).
- **Skiv canonical** (`docs/skiv/CANONICAL.md`): Skiv = il template concreto del framework
  (livelli C+D gia' avanti). SPEC-F generalizza, non sostituisce Skiv.

## 9. Decisioni aperte (per Eduardo)

Fork non canon-derivabili (gran parte del framework e' gia' ADR-2026-04-27). Etichetta
`FC#` per non confondere con i fork F1-F6 di SPEC-B. **RATIFICATI da Eduardo 2026-06-08**
(tutti opzione A).

| Fork | Esito ratificato (2026-06-08)                                                     |
| ---- | --------------------------------------------------------------------------------- |
| FC1  | Resync additivo, home-authoritative (canon vince sui conflitti)                   |
| FC2  | Incontri async = memoria/eventi verificati, NO stat-boost diretto                 |
| FC3  | Estrazione = Custode named + companion maturo (no export di massa)                |
| FC4  | Trust v1 = signature + rate-limit (firma=integrita' non autenticita'; B se abuso) |

Sotto: opzioni/rationale originali (storia della decisione).

### FC1 -- Policy di resync al rientro

Quando un Custode estratto rientra e lo stato home e' divergente (campagna avanzata +
eventi esterni del Custode), come si riconcilia?

- **Opzione A -- additivo, home-authoritative (raccomandata).** Gli eventi esterni
  (crossbreed_history, diary) si APPENDONO; in conflitto su stat/lineage vince lo stato
  home canonico. Tradeoff: niente perdita di memoria, niente import che sovrascrive il
  canon; serve merge additivo.
- **Opzione B -- card-authoritative.** La card importata sovrascrive. Tradeoff: semplice,
  ma un import puo' regredire/forgiare lo stato (rischio abuse).
- **Raccomandazione:** A.

### FC2 -- Effetto degli incontri asincroni al rientro

Cosa produce un incontro async (con altri Custodi/Nidi) quando il Custode rientra?

- **Opzione A -- memoria + eventi verificati, no stat-boost diretto (raccomandata).**
  L'incontro aggiunge diary/lineage/crossbreed_history (verificati via signature), ma NON
  da' stat/power direttamente: l'effetto in-game passa dagli engine canonici. Tradeoff:
  niente power-creep da import esterni; l'incontro e' memoria + opportunita' (crossbreed),
  non un buff.
- **Opzione B -- effetto meccanico diretto.** L'incontro da' bonus/stat. Tradeoff: piu'
  tangibile, ma apre power-creep/abuse via card-farming.
- **Raccomandazione:** A. Shape minimo evento: `{ encounter_ts, partner_lineage_id,
encounter_type, verified_signature }` (signature = integrita' trasporto, non
  autenticita' -- stesso caveat di FC4).

### FC3 -- Eleggibilita' all'estrazione (quale creatura/Custode)

Chi puo' essere estratto come Custode portable?

- **Opzione A -- Custode named + companion maturo (raccomandata).** I Custodi di campagna
  (livello B, "2-4 named") + companion maturati (livello C, es. Skiv). Tradeoff: l'estrazione
  resta un evento significativo (identita'/storia), non un export di massa.
- **Opzione B -- qualunque creatura del roster.** Tradeoff: massima liberta', ma diluisce
  il concetto di Custode (ogni unit diventa una card).
- **Raccomandazione:** A.

### FC4 -- Trust model import cross-player

All'import di una card altrui: basta la signature valida, o serve un registry/allowlist?

- **Opzione A -- signature + rate-limit (raccomandata).** Si accetta qualunque card con
  `companion_card_signature` valida (tamper-detect) + rate-limit 10/h IP + cooldown
  1/campagna (ADR-04-27). Tradeoff: aperto e semplice; l'abuso e' limitato da rate/cooldown,
  non da una allowlist (che richiederebbe infra social).
- **Opzione B -- registry/allowlist (amici).** Solo card da Nidi/player conosciuti.
  Tradeoff: piu' sicuro contro spam, ma serve un sistema social/identita'.
- **Raccomandazione:** A per v1 (signature+rate-limit gia' LIVE); B se emerge abuso.
- **Disclosure (load-bearing per la scelta):** la `companion_card_signature` rileva
  CORRUZIONE, non FORGERY -- l'algoritmo e' pubblico (sha256, nessun secret server),
  quindi un player puo' generare una firma valida per valori gonfiati. A = MVP onesto
  (rate-limit + cooldown LIMITANO l'abuso, non lo impediscono); B (registry/allowlist o
  secret server) e' la vera difesa anti-forgery. Edge noto: cap-10 FIFO -> flood di
  ambassador low-quality puo' evictare quelli buoni.

## 10. Acceptance

SPEC-F e' implementabile/chiudibile quando:

1. il framework copre i 4 livelli (voce/entita'/companion/estratto) e generalizza Skiv
   senza reimplementare `companionStateStore` (lo estende);
2. l'export usa SOLO `WHITELIST_TOP_FIELDS` (canonica nello store) con firma
   `companion_card_signature` (self-escludente) verificata; `session_id`/`hp_current`/
   `partner_card_url`/secret mai esportati;
3. la distinzione biologico vs narrativo gate-a il crossbreeding (solo biologici) vs
   memory-only (narrativi);
4. import/crossbreed/resync rispettano i default ADR-04-27 (cap 10, cooldown 1/campagna,
   rate-limit 10/h, signature-verify); resync non regredisce il canon (FC1);
5. `voice_diary_portable` esce solo opt-in (SPEC-B self-disclosure);
6. le Decisioni aperte FC1-FC4 sono ratificate da Eduardo (FATTO 2026-06-08, sez. 9, tutte
   A); resta a Eduardo il flip `review_needed` -> `accepted` al merge;
7. coerenza con SPEC-A (export-tier), SPEC-B (card public-only), SPEC-E (estrazione da
   sotto-branco), Skiv canonical (template, non sostituito).
