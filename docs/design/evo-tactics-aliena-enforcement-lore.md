---
title: 'Evo-Tactics ALIENA Enforcement and Narrative Lore (SPEC-H)'
date: 2026-06-08
type: design-spec
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
review_cycle_days: 30
language: it
tags: [evo-tactics, aliena, enforcement, coherence, narrative, lore, tone, codex, authoring, flow]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics ALIENA Enforcement and Narrative Lore (SPEC-H)

Contratto Wave-2 della roadmap (`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md` sez. 4, SPEC-H).
Obiettivo della roadmap: "promuovere ALIENA da summary/diagnostic a enforcement
coerente". Questo documento definisce il contratto di quella promozione: cosa misura
ALIENA a runtime, come il soft-enforcement (gia' costruito, default-OFF) viene attivato
e tarato, quali gate di authoring garantiscono la coerenza bio/eco/narrativa, e come la
lore ALIENA arriva al giocatore via Codex -- senza che il nome di sistema "ALIENA"
diventi mai un termine player-facing.

## 1. Scopo e non-scopo

**Scopo.** Definire il contratto end-to-end di ALIENA: (a) le tre dimensioni di coerenza
runtime (bio-plausibilita, plausibilita ecologica, ancoraggio narrativo); (b) il
soft-enforcement a modulazione di peso (strength-knob, default-OFF) e il suo gate di
attivazione; (c) i gate di authoring (metodo A.L.I.E.N.A. 6-dim + rubrica); (d) le tone
guardrails; (e) il surfacing Codex/wiki. ALIENA ALIMENTA gli engine LIVE, non li
riscrive.

**Non-scopo (esplicito).**

- SPEC-H NON reimplementa lo scorer ALIENA: `services/authorial/alienaCoherence.js`
  (§21, scorer diagnostico 3-dim, SHIPPED #2420) e' LIVE. Qui se ne definisce il
  contratto d'uso, non la matematica.
- SPEC-H NON costruisce il soft-enforcement: la MACCHINA esiste gia' --
  `biomeSpawnBias.applyBiomeBias` con `opts.alienaEnforcement.strength` (modulazione di
  peso continua, default-OFF) + `reinforcementSpawner` che legge
  `policy.aliena_enforcement = { enabled:false, strength:0 }` (design APPROVED
  `docs/superpowers/specs/2026-05-29-aliena-enforcement-design.md`, test LIVE). SPEC-H
  ne definisce il contratto + il gate di attivazione/tuning, non il meccanismo.
- SPEC-H NON ridefinisce la tassonomia tier (eredita SPEC-A) ne' la visibilita' delle
  surface (eredita SPEC-B sez. 3): la APPLICA al caso ALIENA (sez. 8).
- SPEC-H NON costruisce il container Codex: lo schema Hades + A.L.I.E.N.A. 6-dim e' gia'
  specificato (`docs/design/2026-04-27-codex-aliena-hades-schema.md`). SPEC-H ne vincola
  il contratto di contenuto e la coerenza con l'enforcement.
- SPEC-H NON decide l'authority device/surface (SPEC-K).

Complementarieta' in una riga:

```text
alienaCoherence.js   = lo scorer 3-dim        (la MISURA)
biomeSpawnBias       = il soft-enforcement     (l'AZIONE, default-OFF)
SPEC-H               = contratto + gate        (QUANDO/QUANTO agire, come si autora, come si mostra)
```

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

| Engine / artefatto                                    | Ruolo                                                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/authorial/alienaCoherence.js`               | Scorer DIAGNOSTIC 3-dim: `scoreAlienaCoherence(entry, biomeConfig, opts) -> { aggregate 0..1, sub_scores, weights }`. Pesi frozen 0.4/0.4/0.2.    |
| `services/combat/biomeSpawnBias.applyBiomeBias`       | Soft-enforcement: `factor = max(0.0001, 1 - strength*(1 - aggregate))`, `weight = baseWeight*boost*factor`. Default-OFF (`strength` assente/0).   |
| `services/combat/reinforcementSpawner.tick`           | Legge `policy.aliena_enforcement = { enabled, strength }`; quando `enabled && strength>0` passa `alienaEnforcement` + `canonicalPool` allo spawn. |
| `services/combat/initialAlienaTelemetry.emitInitial`  | Emette il sample iniziale; drain via `GET /api/session/:id/aliena-telemetry`. Opt-in `emitAlienaCoherence` callback per-entry.                    |
| `docs/design/2026-04-27-codex-aliena-hades-schema.md` | Schema Codex Hades + A.L.I.E.N.A. 6-dim (`data/codex/{id}.yaml`), `apps/play/src/codexPanel.js`, unlock QBN, Skiv-note.                           |
| `docs/appendici/ALIENA_documento_integrato.md`        | Metodo A.L.I.E.N.A. (6 pilastri) + rubrica 4-livelli + workflow authoring (la fonte del gate di authoring).                                       |
| `docs/planning/draft-narrative-lore.md`               | Tone guardrails canonici (asse serio/meraviglia, fantastico bio-plausibile, intimo, suggerito), 5 fazioni, modello Hades.                         |

Invarianti ereditate (non rinegoziabili qui):

- **§21 + design 2026-05-29:** il soft-enforcement e' a MODULAZIONE DI PESO continua, NO
  hard-veto, NO threshold. Rationale: l'hard-veto rischia pool vuoto e richiede una soglia
  che e' data-blocked. Lo strength-knob continuo dissolve il blocco -- si spedisce
  `strength=0` (off) e si tara dopo dai dati. La macchina e' spedita, default-OFF.
- **Floor epsilon:** `factor >= 0.0001` -- nessuna entry va mai a peso esatto 0 (evita
  pool tutto-zero quando ogni entry e' incoerente + strength=1; la weighted-random resta
  valida).
- **Best-effort:** ogni chiamata allo scorer e' in try/catch -- un fallimento degrada a
  `factor = 1` (nessuna modulazione), mai blocca lo spawn.
- **ADR-2026-06-07 punto 6:** ALIENA e' tra i sistemi runtime da inventariare (cross-ref
  SPEC-L).
- **Doctrine "Per il giocatore":** il nome di sistema (ALIENA) NON e' un termine
  player-facing; al giocatore arriva solo contenuto diegetico (Codex/lore). Mirror della
  doctrine ERMES (SPEC-I sez. 6).
- **L-069 start-values:** i pesi e l'eventuale `strength` partono da valori-seme; il lock
  arriva dai dati di playtest (gate N=40, cfr. SPEC-I sez. 8).

## 3. Le tre dimensioni di coerenza runtime

Lo scorer mappa il metodo A.L.I.E.N.A. (6 pilastri) sui 3 sotto-score runtime-rilevanti;
i criteri di solo-authoring (originalita / giustificazioni / comunicazione) NON entrano a
runtime.

| Sub-score (peso)             | Cosa misura (roadmap)   | Come (LIVE)                                                                                             |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `plausibilita` (0.4)         | bio-plausibility        | entry nel pool canonico del bioma -> 1.0; match di un `role_template` del bioma -> 0.5; altrimenti 0.   |
| `coerenza_eco` (0.4)         | ecological plausibility | `biomeSpawnBias.biomeMatchScore(entry, biomeConfig)` (affinita' affix/archetipo col bioma), clamp 0..1. |
| `ancoraggio_narrativo` (0.2) | narrative anchoring     | `narrative_hooks[]` OR `lore_ref` OR `narrative_tag` presenti -> 1.0; altrimenti 0.5 (neutro, non 0).   |

`aggregate = 0.4*plausibilita + 0.4*coerenza_eco + 0.2*ancoraggio_narrativo`, clamp 0..1.

Note di contratto:

- I pesi 0.4/0.4/0.2 sono `Object.freeze` nello scorer: cambiarli e' una modifica
  engine-owned (richiede dati di telemetria + ratifica), non una scelta di questo doc.
- L'ancoraggio narrativo ha floor 0.5: l'assenza di hook narrativo NON azzera la coerenza
  (un'entry ecologicamente perfetta ma senza lore resta spawnabile). Questo e' coerente
  col tono "suggerito" (la lore arricchisce, non e' un cancello).
- La coerenza e' una proprieta' di IDENTITA' dell'entry (fit ecologico), distinta dalla
  probabilita' di spawn (il peso boostato). Il diagnostico itera il pool PRE-bias; il
  soft-enforcement modula il peso POST-bias (sez. 4).

## 4. Runtime soft enforcement (contratto)

Lo scorer da solo e' diagnostico. Il soft-enforcement (LIVE, default-OFF) converte la
coerenza in pressione di spawn, senza mai diventare un veto.

Contratto del meccanismo (gia' implementato -- qui lo si fissa come contratto):

```text
factor  = max(0.0001, 1 - strength * (1 - aggregate))
weight  = baseWeight * boost * factor
strength in [0, 1], default 0 (OFF)
```

- `strength = 0` (o `enabled !== true`): `factor = 1`, spawn byte-identici alla baseline
  diagnostica. Questo e' il default spedito.
- `strength = 1`: `factor = aggregate` -- entry incoerente ~0 (soft-veto), coerente
  invariata.
- `0 < strength < 1`: down-weight parziale e proporzionale degli incoerenti.
- Telemetria (stato reale, verificato): ogni spawn modulato porta `_aliena_enforcement =
{ strength, aggregate, factor }` SULL'ENTRY IN-MEMORY. NON e' ancora propagato al buffer
  drenato da `GET /api/session/:id/aliena-telemetry`: quel buffer (`aliena_coherence_telemetry`)
  e' alimentato dal callback diagnostico `emitAlienaCoherence` (opt-in via
  `aliena_coherence_telemetry === true`, itera il pool PRE-bias = coerenza-identita', non la
  soppressione effettiva) ed emette solo `{ entry_id, biome_id, aggregate, sub_scores }`.
  Propagare `enforcement_factor` + `strength` nel sample drenato (per un tuning data-informed)
  e' l'INTENT del design 2026-05-29, da implementare al flip di attivazione (HA1) -- NON e'
  gia' live.
- Errore: scorer-throw -> `factor = 1` (graceful), mai blocca.

Cio' che SPEC-H aggiunge al meccanismo:

- **Scope** del soft-enforcement = solo la selezione di spawn reale
  (`reinforcementSpawner`), NON il pre-pass di telemetria. Se estenderlo ad altre surface
  (reward pool, suggerimento mutazioni) = fork HA3.
- **Gate di attivazione** (flip `enabled:true` + valore `strength`): NON e' una scelta
  arbitraria, e' data-gated -- vedi HA1 + il gate N=40 (sez. 11 + SPEC-I sez. 8).
- **Invariante anti-coercizione di gioco:** il soft-enforcement modula CHI compare, mai
  CHE COSA il giocatore puo' fare; non e' un cancello sulle scelte del player (coerente
  con "niente furto di agency", SPEC-G).

## 5. Authoring gates (metodo A.L.I.E.N.A.)

La coerenza runtime e' a valle; la sorgente e' l'authoring delle specie/biomi. Il metodo
A.L.I.E.N.A. (`docs/appendici/ALIENA_documento_integrato.md`) e' il gate di authoring.

A.L.I.E.N.A. = **A**mbiente, **L**inee evolutive, **I**mpianto morfo-fisiologico,
**E**cologia e comportamento, **N**orme socioculturali, **A**ncoraggio narrativo.

Contratto di authoring:

- Ogni entry Codex (specie/bioma/concept/event) dichiara le **6 dimensioni** A.L.I.E.N.A.
  come chiavi YAML obbligatorie in `data/codex/{id}.yaml` (100-300 char ciascuna,
  TV-readable). Le chiavi esatte (schema codex 2026-04-27): `A_ambiente`, `L_linee_evolutive`,
  `I_impianto`, `E_ecologia`, `N_norme_socio`, `A_ancoraggio_narrativo`. Questo e' il punto
  in cui bio/eco/ancoraggio diventano dati, non prosa.
- I campi che lo scorer runtime legge (`narrative_hooks`/`lore_ref`/`narrative_tag` per
  l'ancoraggio; tag affix/archetipo + appartenenza al pool canonico per
  plausibilita'/coerenza_eco) devono essere popolati coerentemente con le 6 dimensioni:
  l'authoring gate garantisce che la specie abbia gli agganci che il runtime poi misura.
- La rubrica 4-livelli del documento integrato e' il criterio di qualita' editoriale; la
  durezza del gate (blocco CI vs warn) = fork HA2.

Anti-pattern (museum `personality-mbti-gates-ghost`, ripreso in SPEC-G TS2): un alto
punteggio di coerenza NON deve diventare un hard-gate accidentale (es. "solo specie
score>=0.8 spawnano"). Il gate authoring controlla la PRESENZA e la qualita' dei dati,
non impone una soglia di spawn (quella resta lo strength-knob continuo, sez. 4).

## 6. Tone guardrails

Le guardrail di tono (canon: `docs/planning/draft-narrative-lore.md`) vincolano l'authoring
narrativo (dimensione A_ancoraggio) e il testo Codex:

| Asse                    | Posizione canonica                                               |
| ----------------------- | ---------------------------------------------------------------- |
| Serio / Umoristico      | ~70% serio, ~30% meraviglia (meraviglia, NON umorismo)           |
| Realistico / Fantastico | fantastico **bio-plausibile** (evoluzione accelerata, non magia) |
| Epico / Intimo          | intimo (piccole squadre, non eserciti)                           |
| Esplicito / Suggerito   | suggerito (la lore emerge dal gameplay, non dall'esposizione)    |

Vincoli derivati:

- Niente magia/soprannaturale: ogni tratto/lore ha una spiegazione bio-plausibile
  (pressione selettiva, convergenza). Questo e' anche cio' che la dimensione `plausibilita`
  premia a runtime.
- Sistema = forza ecologica (Director AI), non antagonista morale ("non e' malvagio, e' il
  test evolutivo"). Il nome di sistema (ALIENA) resta dietro le quinte.
- 5 fazioni canoniche (Alveare Sinaptico, Custodi del Basalto, Filatori d'Abisso, Radici
  Erranti, Corte degli Zefiri) come cornice; nessun NPC named guida.
- Modello narrativo Hades (emergente, briefing/debrief brevi), coerente col Codex
  unlock-progressivo (sez. 7).

Il meccanismo con cui queste guardrail vengono verificate (checklist umana vs lint
macchina vs LLM-critic) = fork HA4.

## 7. Codex / wiki surfacing

Il Codex e' il canale con cui la coerenza ALIENA diventa esperienza per il giocatore,
restando diegetica (`docs/design/2026-04-27-codex-aliena-hades-schema.md`).

Contratto di surfacing:

- **Container** Hades-style (sidebar entry + badge unlock + 6 tab + entry a sezioni +
  Skiv-note footer diegetic). SPEC-H non lo costruisce; lo referenzia.
- **Contenuto** = le 6 dimensioni A.L.I.E.N.A. per entry (sez. 5): l'authoring gate e il
  Codex condividono lo STESSO schema 6-dim -- una sola fonte, nessuna divergenza
  prosa-vs-dato. Fallback: se `data/codex/{id}.yaml` manca, la UI mostra i dati base da
  `data/core/species.yaml`.
- **Unlock** QBN-style (encounter_completed / thought_internalized / biome_resonance /
  mating_success); entry locked visibili ma oscurate ("incontra X per sbloccare").
- **Nome di sistema:** "ALIENA" NON compare nel Codex player-facing; il Codex parla di
  ambiente/evoluzione/ecologia in linguaggio diegetico.
- **Coherence score nel Codex (HA5=B ratificato):** il punteggio grezzo resta `secret`; il
  Codex ne mostra un proxy DIEGETICO aggregato (descrittore qualitativo, es. "specie
  endemica" / "presenza inattesa"), mai il numero (sez. 8).

## 8. Visibilita' (eredita SPEC-B)

Applicazione della tassonomia 4-tier (SPEC-A) e del contratto di visibilita' (SPEC-B
sez. 3) al caso ALIENA:

| Dato ALIENA                                            | Tier      | Razionale                                                                                    |
| ------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------- |
| `aggregate` / `sub_scores` di coerenza (scorer)        | `secret`  | scoring interno, engine-only -- come gli altri scoring (SPEC-B regola: scoring = secret).    |
| `_aliena_enforcement` (strength/aggregate/factor)      | `secret`  | segnale di tuning, mai serializzato verso umani.                                             |
| Esito visibile dell'enforcement (CHI compare in campo) | `public`  | le creature spawnate sono nel campo combat (gia' coperto da SPEC-B righe 3.5/3.6).           |
| Contenuto Codex (6-dim A.L.I.E.N.A., lore)             | `public`  | e' lore -- mostrabile su TV/Codex; e' il canale diegetico voluto.                            |
| Stato unlock Codex per-player                          | `private` | il progresso Codex del singolo (localStorage) e' suo; eventuale aggregato di branco a parte. |
| Proxy diegetico di coerenza nel Codex (HA5=B)          | `public`  | descrittore qualitativo derivato dallo score (es. "specie endemica"), MAI il numero grezzo.  |

Coerenza con la doctrine: il punteggio resta `secret` (il giocatore non vede "coerenza
0.62"), la lore e l'effetto restano visibili. HA5=B (ratificato 2026-06-08): il Codex
espone un proxy DIEGETICO (descrittore qualitativo, mai il numero grezzo) -- mirror del
trattamento ERMES (SPEC-I sez. 6).

## 9. Relazione con altre spec

- **SPEC-A** (device-input-ledger): eredita tassonomia 4-tier + `tierFilter`; i segnali
  ALIENA `secret` non lasciano gli engine.
- **SPEC-B** (info contract): sez. 8 applica la matrice di visibilita' al caso ALIENA
  (coherence secret, Codex public).
- **SPEC-G** (tri-sorgente doctrine): la sedimentazione dottrinale alimenta il contesto di
  Sistema/ALIENA; SPEC-H eredita l'anti-pattern "niente hard-gate accidentale" (TS2) e
  "niente furto di agency".
- **SPEC-I** (ERMES runtime pressure): spec gemella -- entrambe convertono un segnale
  continuo in effetto runtime bounded e diegetico, con la doctrine "il nome di sistema non
  e' player-facing" e il gate N=40. ALIENA = coerenza (chi spawna); ERMES = pressione
  ecologica (quanto premono i modificatori).
- **SPEC-K** (device authority): ortogonale; SPEC-H non tocca chi guida le surface.
- **SPEC-L** (runtime feature inventory): traccia lo stato LIVE/PARTIAL/OFF dello scorer,
  del soft-enforcement (default-OFF) e del Codex.
- **SPEC-Q** (DF-levels narrative depth, M-4) -- ADDENDUM SPEC-H: la regola di reveal delle
  abilita' nemiche nascoste/evolventi vive in `services/ai/declareSistemaIntents.js`
  (`detectHiddenAbilityReveals`, SPEC-Q); ALIENA e' il canale di consegna diegetica del
  reveal. Il reveal scatta SOLO sulla tattica evolutiva cross-incontro a soglia (default 3
  usi -- knob master-dd; flag `SISTEMA_HIDDEN_ABILITY_REVEAL` OFF). L'invariante WEGO (intent
  intra-round telegrafati pre-commit) resta intatto: il reveal e' emesso a parte
  (`reveals[]`), non altera mai gli intent (QF3-A). Tier: ability pre-reveal `secret`, evento
  di reveal `public` TV+device (eredita SPEC-B). Primo uso = intent generico, reveal post-soglia.

## 10. Decisioni aperte (per Eduardo)

Fork NON canon-derivabili: l'esito non discende univocamente da §21 / design 2026-05-29 /
ADR / roadmap. Etichetta `HA#` per evitare clash con i fork delle altre spec
(F/G/H-di-SPEC-D/E/FC/TS/J/ER).

**RATIFICATI da Eduardo 2026-06-08** (HA3 = derivata, non un fork). Sintesi:

| Fork | Esito ratificato (2026-06-08)                                                      |
| ---- | ---------------------------------------------------------------------------------- |
| HA1  | Pilota + gate N=40 (OFF globale; attiva a strength basso su badlands, poi espande) |
| HA2  | Ibrido (HARD su presenza 6-dim + campi runtime, SOFT su qualita' rubrica)          |
| HA4  | Checklist umana + lint macchina su sottoinsieme (termini vietati, tag tono)        |
| HA5  | Hint diegetico aggregato (descrittore qualitativo, MAI il numero grezzo)           |

Sotto: opzioni/rationale originali di ogni fork (storia della decisione).

### HA1 -- Attivazione del soft-enforcement: quando e quanto?

Il meccanismo e' LIVE ma default-OFF (`strength=0`). Quando si flippa `enabled:true` e a
quale `strength`?

- **Opzione A -- pilota + gate N=40 (raccomandata).** Tenere OFF globalmente; attivare a
  `strength` basso (es. 0.3) su un bioma pilota (badlands, gia' scenario LIVE
  `enc_badlands_pilot_01`), misurare N=40 win-rate-band, poi espandere. Tradeoff: lento ma
  data-safe, mirror del rollout ERMES (SPEC-I HA/ER5).
- **Opzione B -- OFF a oltranza.** Spedire solo la macchina; l'attivazione e' una decisione
  futura separata. Tradeoff: zero rischio ora, ma ALIENA resta diagnostico (la roadmap
  voleva "enforcement coerente").
- **Opzione C -- ON globale a strength basso.** Attivare ovunque subito a strength=0.2-0.3.
  Tradeoff: effetto immediato, ma senza il gate N=40 puo' introdurre regressioni di
  win-rate non misurate.
- **Raccomandazione:** A.

### HA2 -- Durezza dell'authoring gate

Le 6 dimensioni A.L.I.E.N.A. + la rubrica: gate hard (blocca CI/PR) o soft (warn)?

- **Opzione A -- ibrido (raccomandata).** HARD sulla PRESENZA (le 6 chiavi YAML obbligatorie
  - i campi che il runtime legge); SOFT sulla QUALITA' (punteggio rubrica = warn + sguardo
    reviewer). Tradeoff: garantisce i dati che il runtime misura senza bloccare su giudizi
    editoriali soggettivi.
- **Opzione B -- hard pieno.** Blocca anche su rubrica sotto-soglia. Tradeoff: qualita'
  alta forzata, ma soglia editoriale = soggettiva e data-blocked (stesso problema del
  threshold di enforcement).
- **Opzione C -- soft pieno.** Solo warn. Tradeoff: nessun attrito, ma entry senza dati
  ALIENA passano e il runtime degrada a neutro silenzioso.
- **Raccomandazione:** A.
- **Implementazione + migrazione (qualunque opzione):** il gate non esiste ancora -- la
  docs-governance CI (`tools/check_docs_governance.py`) valida il frontmatter, NON lo schema
  delle entry `data/codex/*.yaml`; serve un check dedicato (AJV su uno schema codex in
  `packages/contracts/schemas/`, o uno script `tools/py` analogo). Il gate HARD si applica
  alle entry NUOVE e a quelle MODIFICATE post-merge; le entry esistenti hanno una finestra di
  migrazione (pattern `tools/docs_governance_migrator.py`), senza rompere la CI al primo PR.

### HA3 -- Scope del soft-enforcement (DERIVATA, non un fork aperto)

Lo scope attuale e' DERIVABILE dal canon, non un fork da ratificare: §21 + design 2026-05-29
hanno chiuso il meccanismo a SPAWN-ONLY (`reinforcementSpawner` / `biomeSpawnBias`), con
hard-veto e conditional-event-trigger esplicitamente DEFERRED (YAGNI). Quindi: oggi
spawn-only, punto.

Resta solo una nota di estensione FUTURA (non una decisione ora): estendere la modulazione a
reward pool / suggerimenti mutazione (rischio: superfici extra da tarare + intreccio con
SPEC-G/economia) sarebbe un'estensione mirata POST-dati, da aprire come fork proprio quando
ci saranno dati di tuning -- non e' richiesta a Eduardo adesso.

### HA4 -- Enforcement delle tone guardrails

Come si verificano le guardrail di tono (sez. 6)?

- **Opzione A -- checklist + lint subset (raccomandata).** Checklist umana per il giudizio
  - un lint macchina su un sottoinsieme verificabile (es. lista di termini "magia"/
    soprannaturale vietati, tag tono obbligatorio sull'entry). Tradeoff: copre il
    meccanizzabile senza pretendere che una macchina giudichi il tono.
- **Opzione B -- solo checklist umana.** Tradeoff: zero infra, ma nessun guardrail
  automatico (drift facile su corpus grande).
- **Opzione C -- LLM-as-critic sul testo.** Un giudice LLM valuta il tono. Tradeoff:
  copertura ampia, ma costo + non-determinismo + rischio falsi positivi (SDMG: euristica
  alto-errore, non decisione).
- **Raccomandazione:** A.

### HA5 -- Visibilita' della coerenza nel Codex

Il Codex mostra al giocatore un proxy della coerenza ALIENA?

- **Opzione A -- secret, nessun proxy (raccomandata).** Il punteggio resta engine-only; il
  Codex mostra solo lore. Tradeoff: coerente con SPEC-B (scoring=secret) e con la doctrine
  "no numero opaco"; il giocatore percepisce la coerenza come "questa creatura ci sta in
  questo bioma", non come metrica.
- **Opzione B -- hint diegetico aggregato.** Un descrittore qualitativo ("specie endemica"
  / "presenza inattesa"), mai il numero. Tradeoff: piu' leggibilita' ecologica, ma e'
  nuovo contenuto da autorare + rischia di guidare il meta.
- **Opzione C -- score per-specie esposto.** Mostrare "coerenza 0.62". Tradeoff: massima
  trasparenza, ma viola la doctrine e trasforma la coerenza in numero opaco.
- **Raccomandazione:** A; B come estensione diegetica eventuale, mai C.
- **RATIFICATO 2026-06-08: B** (hint diegetico aggregato: descrittore qualitativo tipo
  "specie endemica" / "presenza inattesa", mai il numero). Lo score grezzo resta `secret`;
  il Codex ne mostra il proxy diegetico (sez. 7-8).

## 11. Acceptance

SPEC-H e' implementabile/chiudibile quando:

1. i 3 sub-score runtime sono documentati e mappati a bio-plausibility / ecological
   plausibility / narrative anchoring (sez. 3);
2. il contratto del soft-enforcement (strength-knob, default-OFF, formula `factor`, floor
   epsilon, graceful) e' fissato e il gate di attivazione (HA1) deciso. Il gate e'
   autocontenuto qui (non blocca su SPEC-I): flip `enabled:true` + `strength` target SOLO
   dopo un playtest N=40 sul bioma pilota (`enc_badlands_pilot_01`) con win-rate dentro la
   banda + nessuna regressione fuori banda; SPEC-I sez. 8 e' la fonte condivisa del pattern,
   non un prerequisito. La propagazione di `enforcement_factor` nel sample telemetria (sez. 4)
   e' parte dell'implementazione del flip;
3. gli authoring gate (6 dimensioni A.L.I.E.N.A. obbligatorie + rubrica) sono definiti con
   la durezza decisa in HA2, e i campi che il runtime legge sono coperti dal gate;
4. le tone guardrails (sez. 6) sono enumerate e il loro meccanismo di enforcement (HA4)
   deciso;
5. il surfacing Codex/wiki (contenuto 6-dim condiviso con l'authoring, unlock, fallback) e'
   contrattualizzato e la visibilita' della coerenza (HA5) decisa;
6. la visibilita' e' coerente con SPEC-B (coherence/enforcement `secret`, contenuto Codex
   `public`, unlock `private`) -- nessuna surface dove ALIENA contraddice il contratto B; la
   doctrine "ALIENA non player-facing" e' verificabile (es. `grep -ri 'aliena' data/codex/` =
   0 hit nei campi content/heading/subtitle e nei template briefing/bark);
7. le sorgenti draft citate (`docs/design/2026-04-27-codex-aliena-hades-schema.md` doc_status
   draft; `docs/planning/draft-narrative-lore.md` bozza) sono promosse/ratificate prima della
   chiusura piena dei criteri 4-5, oppure il loro contenuto e' inlineato qui;
8. le Decisioni aperte HA1, HA2, HA4, HA5 sono ratificate da Eduardo (HA3 = derivata, non
   richiede ratifica); il flip `review_needed` -> `accepted` al merge del PR resta a lui
   (`source_of_truth:false` finche' non lo decide).

## 12. Flip verdict 2026-06-17 -- doc_status active (contract+ratifica completa)

Master-dd verdict (item-1 flip-plan, ultima spec): **flip review_needed -> `active`** (NB:
target governance = `active`, non `accepted` -- `accepted` non e' un valore valido in
`docs_registry.json`). Tutti i criteri sez.11 sono soddisfatti:

- crit 1-5: contract fissato + forks **HA1/HA2/HA4/HA5 RATIFICATI 2026-06-08** (sez.10), HA3
  derivata. crit 6: doctrine SPEC-B verificata (`grep -ri aliena data/codex/` = 0 hit
  player-facing nei campi content/heading). **crit 7 RISOLTO**: i 2 source-doc promossi
  (`2026-04-27-codex-aliena-hades-schema.md` draft->active; `draft-narrative-lore.md`
  frontmatter + active + registrato). crit 8: forks ratificati.
- **doc-flip != implementazione**: l'acceptance sez.11 e' contract+ratifica; il
  validator-CI HA2 (presence-check 6-dim) + la surface Codex 6-dim backend
  (`codexPanel.js` oggi TUNIC-glyph) + il flip runtime `enabled:true`/`strength` +
  propagazione `enforcement_factor` (post N=40 su `enc_badlands_pilot_01`) = **forward-work
  tracciato in BACKLOG**, NON blocker del doc-flip (precedent SPEC-I/K). La machinery
  baseline (sez.2) e' LIVE default-OFF. Runtime HA1 resta OFF.

Con questo flip **item-1 = 17/17 active** (suite reconstruction SPEC-A..Q completa a doc-level).
