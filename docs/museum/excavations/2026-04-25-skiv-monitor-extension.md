---
title: Skiv Monitor Extension — excavation inventory
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
domain: skiv-monitor-extension
scope: cross-domain (lifecycle + diary + voice + museum-cards)
status: excavated
---

# Skiv Monitor Extension — Excavation Inventory

> Scope: tutte le risorse non-integrate (o parzialmente integrate) rilevanti
> per arricchire `tools/py/skiv_monitor.py` + `apps/backend/routes/skiv.js` +
> `apps/play/src/skivPanel.js`. Monitor MVP live (PR #1831 + #1839). Questo
> scavo identifica cosa manca per: evoluzione dal giorno 0, saga completa,
> diary auto, voice palette ampia.

---

## FINDING F-01 — Lifecycle Phase + ASCII sprite assente dal monitor state

**found_at**: `data/core/species/dune_stalker_lifecycle.yaml` (249 righe) +
`data/derived/skiv_saga.json:69` (campo `aspect.lifecycle_phase: "mature"`)

**buried_reason**: unintegrated — lifecycle YAML shippato PR #1790, monitor
shippato PR #1831. I due PR non si "connettono": `state.json` in
`data/derived/skiv_monitor/` ha campo `lifecycle: MISSING` (verificato via
live state.json).

**gap concreto**:

- `skiv_saga.json` ha `aspect.lifecycle_phase`, `aspect.sprite_ascii`,
  `aspect.tactical_signature`, `aspect.mutation_morphology.aspect_token`
- `state.json` (monitor) NON ha nessuno di questi 5 campi
- `renderAsciiCard()` in `apps/backend/routes/skiv.js:107` usa sprite
  hardcoded `╱\_/\` + `(  o.o )` — SEMPRE fase mature, non evolve mai
- `render_card()` in `tools/py/skiv_monitor.py:480` stesso problema

**campi saga non surfaced in monitor** (lista completa):

1. `aspect.lifecycle_phase` (hatchling/juvenile/mature/apex/legacy)
2. `aspect.sprite_ascii` (4-line per fase da lifecycle YAML)
3. `aspect.tactical_signature` (1-frase combat state)
4. `aspect.mutation_morphology.aspect_token` (claws_glass etc.)
5. `aspect.label_it` / `aspect.label_en`
6. `progression.previous_job` (skirmisher → stalker job history)
7. `aspect.mbti_form_label` (INTP-leaning-I — più ricco di `form: "INTP"`)

**relevance_score**: 5/5 (age: 0 mesi, pillar: P4+P3+P2, reuse: diretto)

**reuse_path (Minimal ~2h)**:

- `tools/py/skiv_monitor.py` DEFAULT_STATE: aggiungi 5 campi lifecycle
- Funzione `sync_lifecycle_from_saga()`: leggi `data/derived/skiv_saga.json`,
  copia `aspect.*` in state prima di render
- `renderAsciiCard()` in `apps/backend/routes/skiv.js:107-120`: sostituisci
  sprite hardcoded con `state.phase_sprite` (array 4 righe join `\n`)
- Trigger: ogni volta che `apply_delta()` porta `level` a cambio fase,
  aggiorna `lifecycle_phase` + sprite

---

## FINDING F-02 — Lifecycle warning_zone + narrative_beat mai surfaceable

**found_at**: `data/core/species/dune_stalker_lifecycle.yaml:90`
(campo `warning_zone_it` per juvenile) + `lifecycle.yaml:116`
(campo `narrative_beat_it` per mature)

**buried_reason**: designed (doc + YAML esistono) ma pipeline di publish
assente. Non c'è consumer che legge `warning_zone_it` né `narrative_beat_it`
dalla YAML.

**gap concreto**:

- `warning_zone_it` = segnale pre-transizione ("Lv 3 raggiunto. Primo silenzio
  prolungato") — serve come diary entry `phase_signal` (pattern Emily Short
  pre-segnalazione citato nel planning doc)
- `narrative_beat_it` = prosa Skiv POV per ogni fase (5 testi di 3-5 righe
  ciascuno) — perfetti per diary event `phase_transition` non ancora esistente
  nell'ALLOWED_EVENT_TYPES di `diaryStore.js:42`
- `docs/planning/2026-04-25-skiv-aspect-evolution.md:159` tabella mappage
  fase→event_type è scritta ma non implementata

**campi mancanti in ALLOWED_EVENT_TYPES** (`apps/backend/services/diary/diaryStore.js:42`):

- `phase_transition` (warning + full beat)
- `phase_signal` (pre-transizione Emily Short pattern)

**relevance_score**: 4/5 (age: 0 mesi, pillar: P4+P5, reuse: +8 LOC diaryStore)

**reuse_path (Minimal ~1.5h)**:

- `apps/backend/services/diary/diaryStore.js`: aggiungi `phase_transition` +
  `phase_signal` a ALLOWED_EVENT_TYPES (riga 42-51)
- `tools/py/skiv_monitor.py`: aggiungi check `level_gate` in `apply_delta()`:
  se `state.level >= next_phase_gate.level` → emit `phase_signal` in feed
- `tools/py/skiv_monitor.py`: funzione `load_lifecycle_yaml()` → leggi
  `data/core/species/dune_stalker_lifecycle.yaml`, estrai `warning_zone_it`
  per fase corrente

---

## FINDING F-03 — Diary store live ma disconnesso da monitor feed

**found_at**: `apps/backend/services/diary/diaryStore.js` (182 LOC) +
`data/derived/unit_diaries/` (dir esiste, diary Skiv assente)

**buried_reason**: deferred — `diaryStore.js` shippato PR #1777 come
"backend-only MVP". `diaryStore.js:6` commento: "UI viewer deferred".
`tools/py/skiv_monitor.py` NON chiama mai `appendEntry()` — i due sistemi
non parlano.

**gap concreto**:

- `diaryStore` ha 8 event_type (form_evolved, thought_internalized,
  scenario_completed, mbti_axis_threshold_crossed, defy_used,
  synergy_triggered, mutation_acquired, job_changed)
- `skiv_monitor.py` ha propria categoria `feed.jsonl` con
  categoria-based voice (pr_merged, wf_fail, etc.)
- Le due pipeline sono PARALLELE non convergenti: nessun ponte
- Skiv diary (`data/derived/unit_diaries/skiv.jsonl`) non esiste
  (verificato: dir esiste ma file skiv assente)
- `skiv_saga.json` ha 8 diary entries hardcoded (simulazioni); sono
  SEED, non diary live accumulato run-to-run

**campi skiv_saga.json diary non trascritti in diaryStore**:

- `diary[0]` scenario_completed enc_savana_alpha
- `diary[1]` mbti_axis_threshold_crossed S_N 0.34→0.22
- `diary[2-3]` thought_internalized ×2
- `diary[4]` job_changed skirmisher→stalker
- `diary[5]` synergy_triggered echo_backstab
- `diary[6]` defy_used pressure 75→50
- `diary[7]` mutation_acquired artigli_grip_to_glass

**relevance_score**: 5/5 (age: 0 mesi, pillar: P4+P5, reuse: diretta)

**reuse_path (Minimal ~2h)**:

- `tools/py/seed_skiv_saga.py`: al termine del seed, itera
  `saga.diary[]` e chiama `diaryStore.appendEntry("skiv", entry)`
  via subprocess `node -e "require('./...').appendEntry(...)"` O
  via script Node separato `scripts/seed_skiv_diary.js`
- `apps/backend/routes/skiv.js`: aggiungi endpoint
  `GET /api/skiv/diary?limit=20` che chiama `diaryStore.tailDiary("skiv")`
  e restituisce array
- `apps/play/src/skivPanel.js`: aggiungi sezione "Saga" sotto feed eventi,
  mostra ultimi 5 diary entries con event_type + payload rilevante

---

## FINDING F-04 — Voice palette monitor: 12 slot, mancano 6 voice per events interni

**found_at**: `tools/py/skiv_monitor.py:101` (VOICE dict, 12 categorie)

**buried_reason**: monitor shippato con voice per soli eventi REPO (PR,
issue, workflow). Nessuna voce per eventi INTERNI creatura (defy_used,
synergy_triggered, thought_internalized, mutation_acquired, phase_transition).

**gap concreto**:

- VOICE dict copre: feat_p2/p3/p4/p5/p6, data_core, services, skiv_doc,
  issue_open/close, wf_fail/pass, fix, revert, default (14 categorie)
- Assenti (mai definite):
  - `defy_used`: Skiv ha usato SG per respingere pressione → voce resilienza
  - `synergy_triggered`: combo eco+backstab attivata → voce tattica
  - `thought_internalized`: nuovo pensiero interiorizzato → voce crescita
  - `mutation_acquired`: mutazione fisica → voce metamorfosi
  - `phase_transition`: cambio fase vitale → voce esistenziale
  - `bond_increase`: legame Vega/Rhodo cresce → voce relazione

**lifecycle YAML ha voice_it per ogni fase** (già scritta, mai portata
in monitor):

- hatchling: "Non so ancora cosa sono. So dove sono gli altri."
- juvenile: "Aspetto. Non e paura. E calibrazione."
- mature: "Il branco non mi segue. Mi evita. La differenza conta."
- apex: "Ho aspettato quando i numeri dicevano di muovermi..."
- legacy: "Non ero qui. Ero gia li prima che arrivassi."

**relevance_score**: 4/5 (age: 0 mesi, pillar: P4, reuse: puro additive)

**reuse_path (Minimal ~1h)**:

- `tools/py/skiv_monitor.py:101` VOICE dict: aggiungi 6 nuove chiavi
  con 3 voci ciascuna (18 righe totali)
- `tools/py/skiv_monitor.py:326` `map_event()`: case per event_type
  interni (quando il feed proviene da diary, non GitHub API)
- Portare `voice_it` dalle fasi lifecycle YAML come bucket `phase_voice`

---

## FINDING F-05 — Bond Vega/Rhodo in state.json ma non renderizzato nel card

**found_at**: `tools/py/skiv_monitor.py:71` DEFAULT_STATE
`"bond": {"vega_enfj": 3, "rhodo_istj": 2}` + `skiv_monitor.py:484`
`bond = state.get("bond", {})`

**buried_reason**: deferred — `apply_delta()` ha logica bond a riga 352
(`delta["bond.vega_enfj"] = 0  # cap`) ma il renderer `render_card()` riga
480-538 NON mostra bond in nessuna riga del card ASCII. La variabile
`bond` è estratta (riga 484) ma mai usata nel render.

**gap concreto**:

- `render_card()`: legge `bond = state.get("bond", {})` ma non la stampa
- `renderAsciiCard()` in `apps/backend/routes/skiv.js:107`: `FALLBACK_STATE`
  ha `bond: {}` (vuoto) — bond non trasferito da DEFAULT_STATE
- Canonical state Skiv: `bond.vega_enfj: 3` (♥♥♥) + `bond.rhodo_istj: 2` (♥♥)
- `docs/skiv/CANONICAL.md:90`: mostra "Bond: Vega ENFJ ♥♥♥, Rhodo ISTJ ♥♥"
  — questa info è nel CANONICAL ma non nel card ASCII live

**relevance_score**: 3/5 (age: 0 mesi, pillar: P5+P4, reuse: 4 LOC)

**reuse_path (Minimal ~0.5h)**:

- `tools/py/skiv_monitor.py:510` aggiungi riga bond al card render:
  `lines.append(f"║  BOND: Vega♥×{bond.get('vega_enfj',0)}  Rhodo♥×{bond.get('rhodo_istj',0)}")`
- `apps/backend/routes/skiv.js:37` FALLBACK_STATE: `bond: {"vega_enfj": 3, "rhodo_istj": 2}`
- `renderAsciiCard()` riga ~140: aggiungi bond display dopo cabinet line

---

## FINDING F-06 — Museum card M-001 (Sentience tiers) → monitor ha `sentience_tier: "T2-T3"` hardcoded

**found_at**: `apps/backend/routes/skiv.js:43` (`sentience_tier: 'T1'` in
FALLBACK_STATE) + `tools/py/skiv_monitor.py:76` (`"sentience_tier": "T2-T3"`)

**buried_reason**: M-001 (card `cognitive_traits-sentience-tiers-v1.md`,
score 5/5) ha mappa `{level_range} → sentience_tier` ma nessuno la consuma
nel monitor. Sentience tier è hardcoded stringa in DEFAULT_STATE.

**gap concreto**:

- `data/core/traits/active_effects.yaml` ha `sentience_tier` come campo
  per ogni trait ma monitor non lo legge
- Museum card M-001 nota reuse_path: "Skiv Sprint C diary unblock 3h"
- La logica di derive `sentience_tier` da `level` + `mutations_count` è in
  `incoming/sentience_traits_v1.0.yaml` (mai integrato, schema
  `T0: {level_range: [1,1]}, T1: {level_range: [2,3]}, T2: {level_range: [4,5]}`)
- `FALLBACK_STATE` in `skiv.js:43` ha `sentience_tier: 'T1'` mentre Skiv
  è Lv 4 → dovrebbe essere T2/T3

**relevance_score**: 3/5 (age: 6 mesi, pillar: P4, reuse: 1 funzione pura)

**reuse_path (Minimal ~1h)**:

- Funzione pura `derive_sentience_tier(level, mutations_count)` in
  `tools/py/skiv_monitor.py` usando mappa da museum card M-001
- Chiamare in `apply_delta()` dopo aggiornamento level
- Fix FALLBACK_STATE `skiv.js:43`: `sentience_tier: 'T2'`

---

## FINDING F-07 — Ennea voice: OD-010 A/B pending ma monitor ha solo `feat_p4` slot

**found_at**: `tools/py/skiv_monitor.py:112-115` (feat_p4: 3 voci generiche)

- `docs/skiv/CANONICAL.md:25` "Ennea candidate: Type 5 (Investigatore) o
  Type 7 (Entusiasta) — A/B test pending OD-010"

**buried_reason**: Museum card M-003 (Enneagramma Dataset 9 tipi, score 5/5)
ha 9 type con voce + mbti correlate. OD-010 è marcata `pending A/B`. Nel
frattempo `feat_p4` ha 3 voci generiche ("Voce nuova nella stanza interna").

**gap concreto**:

- `VOICE["feat_p4"]` = `["Voce nuova nella stanza interna.", "Penso una cosa
che non sapevo di sapere.", "L'ombra mi parla. Ascolto."]`
- Type 5 Investigatore ha voice archetype: distacco osservativo,
  "conosco X per sopravvivere", ansia da scarcità cognitiva
- Type 7 Entusiasta: connessione esperienziale, fuga da dolore, eccitazione
- Museum card M-002 (Enneagramma Mechanics Registry) ha 16 hook stub —
  include `onThoughtUnlock` e `onAxisCrystallize` non wirati
- Sblocco immediato non-bloccante: anche senza OD-010 verdict, aggiungere
  voice Type5 + Type7 come bucket separati senza scegliere quale "è" Skiv

**relevance_score**: 3/5 (age: 0 mesi, pillar: P4, reuse: additive voice)

**reuse_path (Minimal ~1h)**:

- `tools/py/skiv_monitor.py` VOICE dict: aggiungi `"ennea_type5"` (3 voci
  investigatore-isolato) + `"ennea_type7"` (3 voci entusiasta-fugace)
- In `map_event()`: per `feat_p4` events, 50/50 random hash tra type5/type7
  fino a OD-010 verdict
- Post OD-010 verdict: fissa bucket canonico

---

## Tabella riassuntiva

| ID   | Titolo                               | Score | Effort | Pillar   | Buried reason   | Ship now?       |
| ---- | ------------------------------------ | ----- | ------ | -------- | --------------- | --------------- |
| F-01 | Lifecycle phase + sprite in monitor  | 5/5   | ~2h    | P4+P3+P2 | unintegrated    | YES             |
| F-02 | warning_zone + narrative_beat diary  | 4/5   | ~1.5h  | P4+P5    | unintegrated    | YES             |
| F-03 | Diary store ↔ monitor bridge        | 5/5   | ~2h    | P4+P5    | deferred        | YES             |
| F-04 | Voice palette eventi interni (6 +)   | 4/5   | ~1h    | P4       | deferred        | YES             |
| F-05 | Bond Vega/Rhodo render mancante      | 3/5   | ~0.5h  | P5+P4    | forgotten       | YES (quick win) |
| F-06 | Sentience tier hardcoded vs derivato | 3/5   | ~1h    | P4       | unintegrated    | next sprint     |
| F-07 | Ennea voice Type5/Type7 in monitor   | 3/5   | ~1h    | P4       | deferred/OD-010 | post OD-010     |

**Total effort F-01+F-02+F-03+F-04+F-05 = ~9h** per monitor nettamente
arricchito (lifecycle-aware + diary-connected + voice ampia + bond visibile).

---

## Top 3 candidati curation immediata

1. **F-01 + F-03 bundle** — Lifecycle phase + diary bridge sono complementari.
   Implementarli insieme: `sync_lifecycle_from_saga()` + `seed_skiv_diary.js`.
   Nessun breaking change. ~4h totale.

2. **F-04** — Voice palette additive pura. Zero breaking change. ~1h.
   Precondizione per F-02 (le nuove voci servono quando il diary emette
   phase_transition).

3. **F-05** — Bond render. Quickwin 30 min. Skiv appare "più vivo" subito
   nel panel (♥ hearts visibili in card ASCII).

---

## Anti-pattern: NON re-inventare

- **NON** creare un secondo saga JSON — `data/derived/skiv_saga.json` è la
  fonte autorevole. Monitor legge da lì, non ridefinisce.
- **NON** duplicare voice_it dal lifecycle YAML in skiv_monitor.py —
  importarle via `load_lifecycle_yaml()`, non copy-paste.
- **NON** creare endpoint `/api/diary/skiv` separato — `diaryStore.tailDiary`
  è già esposto internamente; aggiungere route al router skiv esistente
  (`apps/backend/routes/skiv.js`), non nuovo router.
- **NON** toccare `packages/contracts/` per questi campi — sono tutti
  internal Skiv state, non payload contrattuale shared.
- **NON** ricreare logica sentience tier — usare la mappa di museum card M-001
  (`incoming/sentience_traits_v1.0.yaml` tier gates) come funzione pura.

---

## False positivi (già canonical)

- `docs/skiv/CANONICAL.md` — hub vivo, non sepolto
- `apps/backend/routes/skiv.js` — route live, non sepolto
- `apps/play/src/skivPanel.js` — frontend live, non sepolto
- `tools/py/skiv_monitor.py` — script live MVP, non sepolto
- `data/derived/skiv_saga.json` — canonical snapshot live, non sepolto

---

## Fonti provenance

- `data/core/species/dune_stalker_lifecycle.yaml` — shippato PR #1790
  `fa2c4435` (2026-04-25)
- `data/derived/skiv_saga.json` — shippato PR #1784 `9dda30e3`
- `apps/backend/services/diary/diaryStore.js` — shippato PR #1777
  `f0bd514e`
- `tools/py/skiv_monitor.py` — shippato PR #1831 `a18473dd`
- `apps/backend/routes/skiv.js` — shippato PR #1831
- `apps/play/src/skivPanel.js` — shippato PR #1839 (post #1831)
- Museum cards consultati: M-001 (sentience), M-002/M-003/M-006 (ennea),
  M-005 (biome), M-007/M-008 (mating nido — non direttamente rilevanti monitor)
