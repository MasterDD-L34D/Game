---
title: 'Evo-Tactics SPEC-N Localization i18n (spec piena)'
date: 2026-06-08
type: design-spec
doc_status: active
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-10'
review_cycle_days: 30
source_of_truth: false
language: it
tags: [evo-tactics, spec-n, localization, i18n, scaffold, loader, migration]
related: ADR-2026-06-08-i18n-unify-data-i18n
---

# Evo-Tactics SPEC-N Localization i18n (spec piena)

Contratto Wave-4 (gap-harvest). Spec piena dello scope-doc omonimo: fondazione i18n
orizzontale (it/en) per ogni stringa player-facing, prima che le surface device/TV
introducano literali hardcoded. Backing decisione: `ADR-2026-06-08-i18n-unify-data-i18n`
(QA3, `data/i18n` = sorgente unica). Roadmap di consegna: `docs/architecture/i18n-strategy.md`
(LOCAL, PR-1..PR-6).

## 1. Scopo e non-scopo

**Scopo.** Definire il contratto i18n end-to-end: scaffold `data/i18n` (gia' LIVE),
validazione parity (gia' LIVE), il loader runtime + `t()` (PR-3), la migrazione su `data/i18n`
(PR-4, QA3), lo split namespace (PR-5), e la policy no-hardcoded-strings. SPEC-N ALIMENTA
l'infra esistente, non la ricostruisce.

**Non-scopo (esplicito).**

- SPEC-N NON ricrea lo scaffold (`data/i18n/{it,en}/common.json` LIVE dal #1463) ne' la
  validazione (`validate_i18n_parity.py` = i18n-strategy PR-2, LIVE).
- SPEC-N NON ridecide QA3 (unify su `data/i18n`): e' ratificato in ADR-2026-06-08.
- SPEC-N NON traduce i contenuti (e' infrastruttura key/loader/migration); il riempimento
  delle stringhe (completion_percent -> 90%) e' content-production a parte.
- SPEC-N NON definisce le surface (Spec A..Q): fornisce le key che consumano.

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

| Engine / artefatto                                        | Ruolo / stato                                                                                                                                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/i18n/{it,en}/common.json`                           | Scaffold LIVE dal #1463 (2026-04-17): 10 namespace dentro `common` (ui/menu/combat/status/objective/result/settings/errors/difficulty/accessibility), `_meta.completion_percent: 5`. NON stub vuoti. |
| `tools/py/validate_i18n_parity.py` (`npm run i18n:check`) | Parity validator LIVE (i18n-strategy PR-2): key-parity + no-placeholder + mustache + completion. Gia' fatto.                                                                                         |
| `apps/mission-console/src/locales/`                       | Runtime vue-i18n COMPLETO ma con locali PROPRI (DEFAULT_LOCALE=it, FALLBACK_LOCALE=en); NON consuma data/i18n.                                                                                       |
| `docs/architecture/i18n-strategy.md` (LOCAL, active)      | Roadmap PR-1..PR-6 (scaffold/parity/loader/migration/split/CI-gate).                                                                                                                                 |
| `ADR-2026-06-08-i18n-unify-data-i18n` (QA3)               | data/i18n = SSOT; mission-console + nuove surface migrano; en->it fallback; gate no-hardcoded forward-only.                                                                                          |
| **404 / da costruire**                                    | migration mission-console + label-map apps/play (PR-4); split namespace separati (PR-5); schema formale (opz). (loader PR-3 = LIVE, sez.5)                                                           |

Invarianti ereditate:

- **QA3 (ADR-2026-06-08):** `data/i18n` e' la sorgente unica; nessun secondo key-space.
- **Backend: nessun loader i18n reale** (il prefisso `i18n:traits.*` e' convenzione di
  naming, non runtime). La localizzazione e' frontend/Godot (vedi NF1).
- **Default locale = it; `fallbackLocale = it`** (ogni locale con key mancante -> IT, la
  sorgente autorata completa; EN oggi ~5% -> un EN player vede IT, non key grezze). NB:
  mission-console oggi usa `fallbackLocale=en` (scelta legacy verificata in `locales/index.ts`)
  -> da riallineare a `it` in PR-4.
- **No-LLM:** le stringhe sono autorate, non generate a runtime.

## 3. Roadmap di consegna (i18n-strategy PR-1..PR-6)

| PR   | Cosa                                                  | Stato                           |
| ---- | ----------------------------------------------------- | ------------------------------- |
| PR-1 | scaffold `data/i18n/{it,en}/common.json`              | **DONE** (#1463)                |
| PR-2 | parity validator (`validate_i18n_parity.py`)          | **DONE**                        |
| PR-3 | loader runtime + `t()` helper                         | **DONE** (apps/play)            |
| PR-4 | migration mission-console -> data/i18n + debito       | WIP (objectivePanel + NF4 done) |
| PR-5 | split namespace combat/tutorial/narrative (file sep.) | TODO                            |
| PR-6 | CI gate completion_percent + no-hardcoded             | TODO                            |

> NB allineamento: la sequenza canonica resta `i18n-strategy.md`. La tabella SPEC-N raggruppa
> per fase logica; in strategy PR-5 = content-fill combat/tutorial, PR-6 = Ink bilingue export.
> Split-namespace + CI-gate sono fasi parallele; l'Ink bilingue export = post-MVP.

## 4. Struttura namespace + convenzione key

- Namespace: `common` / `combat` / `tutorial` / `narrative`. Oggi tutto dentro `common.json`;
  lo split in file separati = PR-5. Schema formale `_schema/i18n.schema.json` = NF2 (opzionale
  oltre la parity).
- Formato file: `data/i18n/{it,en}/<namespace>.json`. Interpolazione single-brace `{var}`
  (NF4 LIVE 2026-06-08: convertito da `{{var}}`, allineato a vue-i18n/mission-console; parity
  validator + loader aggiornati).
- Pluralizzazione: `{var}` non gestisce plurali/genere; le stringhe `{n}` possono mostrare
  grammatica errata per n=1 in IT (es. "1 turni"). ICU MessageFormat = post-MVP (debito noto,
  i18n-strategy).
- Convenzione key: dot-notation per dominio (es. `combat.your_turn`, `ui.confirm`).

## 5. Loader runtime + `t()` (PR-3)

**Stato: LIVE (2026-06-08).** `apps/play/src/i18nCore.js` (puro: `createT`/`resolveKey`/
`interpolate`, testato) + `apps/play/src/i18n.js` (bind a `data/i18n` via Vite JSON import).
NF1=frontend (apps/play), `fallbackLocale=it`. Interpolation single-brace `{var}` (NF4 LIVE).
PR-4 (NF3 incrementale) avviato: `objectivePanel` -> `t('objective_short.*')` + `thoughtsPanel`
-> `t('mbti_axis.*')` (IT invariato + EN coperto); restano ~6 label-map (biomeChip/ui/
characterPanel/enneaVoiceRender/...) + mission-console (interop JSON-attribute risolto:
`import ... with { type: 'json' }`).

- `t(key, params?, locale?)`: risolve la key, applica i params, fallback a IT (sorgente
  completa), ritorna la stringa. NON-LLM, deterministico.
- **Dove vive il loader = fork NF1** (frontend-only Godot/mission-console vs backend vs
  package condiviso). Default ragionato: frontend/Godot (la localizzazione e' player-facing;
  un loader backend e' prematuro -- nessuna surface backend lo richiede oggi).
- Consuma `data/i18n/{locale}/<ns>.json`; in dev hot-reload, in build bundle.

## 6. Migrazione su data/i18n (PR-4, QA3)

- mission-console migra dai locali co-locati a `data/i18n` (un solo key-space, QA3).
- Debito esistente (literali IT hardcoded) -> migrato a key. Inventario verificato: ~8 file in
  `apps/play/src/` con label-map IT -- `biomeChip` (`BIOME_LABELS`), `objectivePanel`
  (`TYPE_LABELS`, dup di `objective.*`), `ui` (`STATUS_LABELS`, dup di `status.*`),
  `enneaVoiceRender`, `innerVoiceRender`, `thoughtsPanel`, `characterPanel`, `speciesNames`
  -- piu' mission-console (~100 key). Inventario: `grep -rln LABELS apps/play/src/`. Approccio
  (incrementale per-surface vs big-bang) = fork NF3.
- Le nuove surface (Spec A..Q UI) nascono gia' key-based (gate sez. 7).

## 7. Policy no-hardcoded-strings (forward-only)

- Gate review: nessuna stringa player-facing hardcoded nelle surface create DOPO SPEC-N.
- Forward-only: il debito pre-esistente e' PR-4 (migration), non blocca le nuove surface.
- **Prerequisito:** il gate e' applicabile solo dopo il loader (PR-3); finche' manca, una
  nuova surface senza `t()` apre un ticket tech-debt invece di bloccare (evita gate-fantasma).
- Enforcement (PR-6): CI check (completion_percent + grep no-literal nelle surface nuove).

## 8. Visibilita' (eredita SPEC-B)

i18n e' INFRASTRUTTURA, non dato di gioco: le key/loader non sono ne' public ne' private/secret
(sono il VEICOLO con cui ogni tier viene reso leggibile). Le stringhe rese ereditano il tier
del dato che mostrano (un recap public localizzato resta public; un dettaglio private resta
private). Nessuna riga SPEC-B dedicata richiesta.

## 9. Relazione con altre spec

- **ADR-2026-06-08** (QA3): backing della unify su `data/i18n`.
- **SPEC-A..Q UI** (C/D/E/G/M + viewer Q): consumano le key da subito (gate sez. 7); SPEC-N e'
  orizzontale, fondante.
- **SPEC-K** (device authority/Godot surface): il loader (PR-3) vive lato Godot/frontend (NF1).
- **SPEC-L**: traccia lo stato (scaffold+parity LIVE; loader/migration/split TODO).

## 10. Decisioni

Fork etichetta `NF#` (anti-clash con F/G/H/E/FC/TS/J/HA/ER/QA/PA/MA/OA/QF).

**Ratificate (Eduardo 2026-06-08):**

| Fork | Esito ratificato (2026-06-08)                                                         |
| ---- | ------------------------------------------------------------------------------------- |
| NF1  | Loader `t()` frontend/Godot only (backend non localizza; B/C scartate)                |
| NF2  | Skip schema formale -- il parity validator basta                                      |
| NF3  | Migrazione incrementale per-surface (mission-console prima, poi debito apps/play)     |
| NF4  | Normalizzare data/i18n a single-brace `{var}` (vue-i18n) + aggiornare il parity regex |

Sotto: opzioni/rationale originali di ogni fork (storia della decisione).

### NF1 -- Dove vive il loader `t()` (PR-3)

- **Opzione A -- frontend/Godot only (raccomandata).** Il loader vive lato player-facing
  (Godot + mission-console); il backend non localizza. Tradeoff: nessun loader backend
  prematuro (oggi nessuna surface backend lo richiede); allineato a "localizzazione =
  frontend".
- **Opzione B -- package condiviso** (`packages/` loader riusato front+back). Tradeoff: un
  solo `t()` ovunque, ma tocca `packages/` (ripple, ADR) + e' over-engineering finche' il
  backend non localizza.
- **Opzione C -- anche backend.** Loader Node nel backend. Tradeoff: prematuro (engine-ahead).
- **Raccomandazione:** A (frontend/Godot; B solo se emerge un consumer backend reale).

### NF2 -- Schema JSON formale (`_schema/i18n.schema.json`)

- **Opzione A -- skip, la parity basta (raccomandata).** `validate_i18n_parity.py` (PR-2)
  copre key-parity + placeholder + mustache + completion. Uno schema AJV formale e' ridondante
  per file flat key->string. Tradeoff: zero nuovo artefatto.
- **Opzione B -- aggiungere lo schema** (contratto strict tipi/struttura). Tradeoff: piu'
  rigore, ma duplicazione con la parity per poco guadagno.
- **Raccomandazione:** A.

### NF3 -- Strategia di migrazione (PR-4)

- **Opzione A -- incrementale per-surface (raccomandata).** Migrare le surface a key una alla
  volta (mission-console prima, poi il debito apps/play), ognuna con la sua PR. Tradeoff:
  basso rischio, reviewabile; piu' PR.
- **Opzione B -- big-bang.** Tutto in un PR. Tradeoff: un colpo solo, ma rischio + review
  pesante.
- **Raccomandazione:** A.

### NF4 -- Formato interpolazione (normalizzazione in migrazione)

mission-console usa single-brace `{var}` (vue-i18n); data/i18n usa Mustache `{{var}}`. La
migrazione (PR-4) + il loader (PR-3) devono allineare il formato.

- **Opzione A -- normalizzare data/i18n a `{var}` (raccomandata).** Named Interpolation
  vue-i18n standard; aggiornare il regex del parity validator (tool nostro). Tradeoff: un solo
  formato ovunque, allineato al consumer LIVE (mission-console).
- **Opzione B -- tenere Mustache `{{var}}`** e convertire le stringhe mission-console
  `{var}` -> `{{var}}` in PR-4. Tradeoff: validator invariato; conversione a carico di PR-4.
- **Raccomandazione:** A (formato vue-i18n unico; il validator e' nostro, facile da aggiornare).

## 11. Acceptance

SPEC-N e' implementabile/chiudibile quando:

1. lo scaffold (`data/i18n/{it,en}/common.json`) + la parity (`validate_i18n_parity.py`) sono
   LIVE (FATTO: PR-1/PR-2);
2. il loader `t()` (PR-3) e' costruito (LIVE: `apps/play/src/i18nCore.js` + `i18n.js`,
   `fallbackLocale=it`, NF1 frontend); la migrazione dei consumer (label-map) = PR-4;
3. lo schema formale e' deciso (NF2: skip o build);
4. la migrazione (PR-4) su `data/i18n` segue l'approccio NF3, con il debito hardcoded
   (biomeChip/briefing) migrato o ticketato;
5. lo split namespace (PR-5) separa combat/tutorial/narrative in file dedicati (trigger: un
   namespace supera ~30 key non-`common`); Ink bilingue export = post-MVP (strategy PR-6);
6. la policy no-hardcoded e' applicata forward-only (gate dopo PR-3) + CI (PR-6);
7. le nuove surface (Spec A..Q) consumano key, non literali;
8. NF1-NF4 sono ratificati da Eduardo; il flip `review_needed` -> `accepted` al merge resta a
   lui (`source_of_truth:false`).
