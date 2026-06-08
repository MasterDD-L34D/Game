---
title: 'Evo-Tactics ALIENA Enforcement and Narrative Lore (SPEC-H)'
date: 2026-06-08
type: design-spec
doc_status: review_needed
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
- Telemetria: ogni spawn modulato porta `_aliena_enforcement = { strength, aggregate,
factor }`; il sample ALIENA include `enforcement_factor` + `strength` cosi' il tuning e'
  data-informed (quale strength ha soppresso quale entry).
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
  come chiavi YAML obbligatorie (`data/codex/{id}.yaml`, 100-300 char ciascuna,
  TV-readable). Questo e' il punto in cui bio/eco/ancoraggio diventano dati, non prosa.
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
- **Coherence score nel Codex:** se e quanto il punteggio di coerenza (o un suo proxy
  diegetico) sia mostrato al giocatore = fork HA5 (di default: `secret`, vedi sez. 8).

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

Coerenza con la doctrine: il punteggio resta `secret` (il giocatore non vede "coerenza
0.62"), la lore e l'effetto restano visibili. Se HA5 sceglie di esporre un proxy
diegetico, resta comunque un descrittore (mai il numero grezzo) -- mirror del trattamento
ERMES (SPEC-I sez. 6).

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

## 10. Decisioni aperte (per Eduardo)

Fork NON canon-derivabili: l'esito non discende univocamente da §21 / design 2026-05-29 /
ADR / roadmap. Etichetta `HA#` per evitare clash con i fork delle altre spec
(F/G/H-di-SPEC-D/E/FC/TS/J/ER).

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

### HA3 -- Scope del soft-enforcement

Oggi il soft-enforcement modula solo lo spawn (`reinforcementSpawner`). Estenderlo?

- **Opzione A -- spawn-only (raccomandata).** Restare sulla selezione di spawn. Tradeoff:
  superficie minima, contratto chiaro, mirror del design 2026-05-29.
- **Opzione B -- estendere a reward/mutazioni.** Modulare anche pool reward / suggerimenti
  mutazione con la coerenza. Tradeoff: piu' coerenza pervasiva, ma piu' superfici da tarare
  - rischio di intrecciare con SPEC-G (carte) e l'economia.
- **Opzione C -- full (ogni superficie con un pool).** Tradeoff: massimo, ma esplode il
  tuning.
- **Raccomandazione:** A ora; B post-dati come estensione mirata.

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

## 11. Acceptance

SPEC-H e' implementabile/chiudibile quando:

1. i 3 sub-score runtime sono documentati e mappati a bio-plausibility / ecological
   plausibility / narrative anchoring (sez. 3);
2. il contratto del soft-enforcement (strength-knob, default-OFF, formula `factor`, floor
   epsilon, graceful, telemetria) e' fissato e il gate di attivazione (HA1) deciso, con il
   gate N=40 sul bioma pilota (cross-ref SPEC-I sez. 8);
3. gli authoring gate (6 dimensioni A.L.I.E.N.A. obbligatorie + rubrica) sono definiti con
   la durezza decisa in HA2, e i campi che il runtime legge sono coperti dal gate;
4. le tone guardrails (sez. 6) sono enumerate e il loro meccanismo di enforcement (HA4)
   deciso;
5. il surfacing Codex/wiki (contenuto 6-dim condiviso con l'authoring, unlock, fallback) e'
   contrattualizzato e la visibilita' della coerenza (HA5) decisa;
6. la visibilita' e' coerente con SPEC-B (coherence/enforcement `secret`, contenuto Codex
   `public`, unlock `private`) -- nessuna surface dove ALIENA contraddice il contratto B;
7. le Decisioni aperte HA1-HA5 sono ratificate da Eduardo; il flip `review_needed` ->
   `accepted` al merge del PR resta a lui (`source_of_truth:false` finche' non lo decide).
