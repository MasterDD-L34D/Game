---
title: 'Per-creature volo grade -- design spec (move terrain-cost substrate gap-fix)'
date: 2026-06-23
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, terrain-cost, volo, adattamento_volo, substrate, spec, design-gap]
---

# Per-creature volo grade -- design spec

> **Origine**: design-gap segnalato nella PR di authoring #3018 (substrate phase 2).
> `evaluateVoloGrade` leggeva un grade GLOBALE dal registry, non per-creatura -> lo spec
> del substrate ("per-creature kits set grade 2/3") era irrealizzabile. Risolve il gap
> col mechanism per-unità. Verdetto master-dd 2026-06-23 (AskUserQuestion + verify-first).

## 1. Problema

Lo spec substrate (`2026-06-23-move-terrain-cost-substrate-design.md` sez.2.D) vuole il volo
GRADUATO per-creatura (g1 libera terreno normale / g2 dimezza hazard / g3 hazard-free). Ma
il resolver costruito legge un solo grade globale:

```js
// movementResolver.evaluateVoloGrade (origin/main)
const def = registry && registry[VOLO_TRAIT];
const grade = def && def.effect && Number(def.effect.grade);
return Number.isFinite(grade) && grade > 0 ? grade : 1;
```

Quindi tutti i carrier ottengono lo stesso grade globale (authored = 1 = default-assente).
Non esiste override per-unità. Inoltre il minion (`abilityExecutor` `evaluateVoloGrade(null, minion)`)
non ha accesso al registry.

## 2. Verify-first (load-bearing, eseguito 2026-06-23)

- ✓ `movement_profiles.yaml` prezza gli hazard (medium lava 1.5 / heavy lava 2.0 + acqua_profonda)
  -> la distinzione di grade è osservabile end-to-end.
- ✓ `applyVoloGrade` già corretto (g1 free-normal / g2 halve-hazard / g3 free-hazard; 11/11 test).
- ❌ **Approach scartato (trait-object `{id,grade}` sull'unità)**: `sessionHelpers.normaliseUnit`
  (riga ~47) fa `input.traits.filter(Boolean).map(String)` -> un trait-oggetto diventa
  `"[object Object]"` al session-start (grade perso, id distrutto). Far sopravvivere l'oggetto =
  rimuovere l'invariante "traits = stringhe" su cui contano tutti i consumer string-only =
  blast radius inaccettabile.
- ✓ **Approach scelto (campo `unit.volo_grade`)**: `normaliseUnit` è un whitelist-builder che già
  preserva campi opzionali con lo stesso pattern additivo (`morale_mod`/`speed`/`pt`/`pe`,
  commento ricorrente "silently-stripped fields never reach their consumer"). Aggiungere
  `volo_grade` è 1 riga idiomatica, back-compat (default null).

## 3. Decisione (verdetto master-dd)

Il grade per-creatura vive in un **campo unità `unit.volo_grade`** (non nel trait, non nel
species-record). Motivi: sopravvive al session-start (whitelisted), copre player+AI+minion
registry-free (chiude anche il gap minion), e il gate sulla presenza-trait evita il desync.

## 4. Mechanism (l'unica unità di codice che cambia: `evaluateVoloGrade`)

`evaluateVoloGrade(registry, actor) -> grade` (signature invariata). Ordine:

1. Non-carrier (nessun `adattamento_volo` come stringa o `{id}` in `actor.traits`) -> **0**.
2. Carrier con `actor.volo_grade` finito >= 1 -> **clamp(volo_grade, 1, 3)** (override per-unità).
3. Carrier, no `volo_grade` -> registry `effect.grade` (base globale) se finito >= 1.
4. Altrimenti -> **1**.

Clamp [1,3]: il range valido di design (g1/g2/g3); >3 -> 3, <1 (o non-finito) -> fallback.
Il gate "carrier" usa l'helper dual-shape esistente (string | `{id}`), così il campo `volo_grade`
su una non-carrier è ignorato (no desync). `applyVoloGrade` consuma il grade risolto invariato.

## 5. Wire (read-path, già in place)

- Player move-gate (`session.js`): già `evaluateVoloGrade(traitRegistry, actor)` -> raccoglie l'override.
- AI move (`session.js`): già `evaluateVoloGrade(traitRegistry, actor)` (threaded in phase 2).
- Minion (`abilityExecutor.js`): `evaluateVoloGrade(null, minion)` -> ora legge `minion.volo_grade`
  registry-free (gap minion chiuso senza file-read).
- `sessionHelpers.normaliseUnit`: + `volo_grade` whitelisted (preserve da input, default null).

## 6. Fuori scope (non in questo cambio)

- Assegnazione grade alle creature (kit/species data) = owner-gated (re-baseline catalog).
- Cambio del base globale (resta 1).
- Nessun nuovo schema, nessun cambio a `applyVoloGrade`/`resolveMovementProfile`.

## 7. Test (TDD)

- Unit (`movementResolver.test.js` o nuovo): ordine risoluzione (override > base > 1), clamp [1,3],
  override-su-base, string-form-cade-su-base, **minion registry-free** (`evaluateVoloGrade(null, {traits,volo_grade})`),
  non-carrier -> 0, `volo_grade` su non-carrier ignorato.
- `normaliseUnit` preserva `volo_grade` (whitelist test), clamp/null-guard.
- Integrazione (`tests/api/`): carrier `volo_grade:3` attraversa una tile lava più economico
  (ceil 1.0 = 1 AP) di un carrier `volo_grade:1` (ceil 1.5 = 2 AP), flag ON -- il comportamento
  che era intestabile finché il grade era globale.

## 8. Definition of Done

- TDD verde + prettier + tests/api (canon G3) + AI 557/557. Band-neutral (nessun carrier vivo;
  `volo_grade` assente di default). Compensating review (cavecrew). Aggiornare `docs/hubs/combat.md`.
