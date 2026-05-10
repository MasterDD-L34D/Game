---
title: 'ADR-2026-05-10 — Trait Editor AngularJS 1.x → Vue 3 migration (PROPOSED)'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-10
source_of_truth: true
language: it-en
review_cycle_days: 90
related:
  - docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md
related_files:
  - apps/trait-editor/package.json
  - apps/trait-editor/src/main.ts
  - apps/trait-editor/src/app.module.ts
  - apps/trait-editor/vite.config.ts
tags: [adr, frontend, migration, vue3, angularjs, eol, trait-editor]
---

# ADR-2026-05-10 — Trait Editor AngularJS 1.x → Vue 3 migration

## Status

**PROPOSED 2026-05-10** — autonomous scoping document, master-dd verdict pending.

This ADR is a planning artifact only. **No implementation begins until master-dd promotes status to ACCEPTED** and selects a migration path (A / B / C) and a target framework. The framework recommendation here (Vue 3) is non-binding.

## Context

### AngularJS 1.x è End-of-Life dal 2022

- AngularJS 1.x (the legacy framework distinct from modern Angular ≥2) reached End of Life on **2022-01-01** (Long-Term Support window closed). The framework no longer receives security patches, bug fixes, or browser-compatibility updates.
- Continued use of AngularJS 1.x in production constitutes accumulating **technical debt with rising CVE exposure**: any future critical vulnerability in `angular`, `angular-route`, `angular-animate`, or `angular-sanitize` will not be patched upstream.
- The wider AngularJS 1.x ecosystem (community plugins, tooling, Stack Overflow signal) is in steep decline. Onboarding new contributors costs more each year as AngularJS-1.x knowledge becomes a niche skill.

### Stato attuale di `apps/trait-editor`

Inspection 2026-05-10:

- **Footprint**: 18 files in `src/` (15 `.ts` + 3 `__tests__/*.spec.ts`), **1 651 LOC totale** (compresi tests).
  - 4 services: `trait-data.service.ts`, `trait-state.service.ts`, `trait-parser.ts` (+ 3 spec)
  - 3 pages: `trait-library`, `trait-detail`, `trait-editor` (+ 1 spec)
  - 2 components: `trait-preview`, `trait-validation-panel`
  - 2 type modules + 1 utils (`trait-helpers`)
  - 1 sample data fixture (`traits.sample.ts`)
- **Bootstrap**: `src/main.ts` (25 LOC) — `angular.bootstrap(rootElement, [appModule.name], { strictDi: true })`.
- **Module**: `src/app.module.ts` (63 LOC) — `angular.module('traitEditorApp', ['ngRoute', 'ngAnimate', 'ngSanitize'])` + `$routeProvider` con 4 route (`/`, `/traits`, `/traits/:id`, `/traits/:id/edit`) + 7 register-fn.
- **Build**: Vite 5.4.8 (`vite.config.ts`, 37 LOC) — standard SPA, `outDir: dist`, manifest abilitato, `VITE_BASE_PATH` env override per deploy.
- **Tests**: Vitest 2.1.1 — 4 spec files coprono parser, state service, data service, editor page.
- **Workspace status**: `apps/trait-editor` **NON** è un npm workspace nel root `package.json` (workspace list = `apps/backend`, `apps/mission-console`, `apps/play`, `packages/*`, `tools/ts`). Il package è standalone — installa le proprie deps in locale.
- **Vendored AngularJS stubs già rimossi**: `packages/angular*` workspace stubs rimossi in [PR #1343](https://github.com/MasterDD-L34D/Game/pull/1343) (cfr. [ADR-2026-04-14](ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md)). Il trait-editor risolve oggi le 4 dipendenze `angular*` direttamente da npm registry (`^1.8.3`).

### Dipendenze AngularJS attive (`apps/trait-editor/package.json`)

```json
"dependencies": {
  "angular": "^1.8.3",
  "angular-animate": "^1.8.3",
  "angular-route": "^1.8.3",
  "angular-sanitize": "^1.8.3"
}
```

Nessuna di queste librerie riceve più aggiornamenti upstream.

### Allineamento canonical con Mission Console

La UI di produzione (Mission Console — `docs/mission-console/`) è un bundle pre-built **Vue 3** (cfr. `.vite/manifest.json` lista `ConsoleLayout.vue`, `FlowShellView.vue`, `atlas/*.vue`, `nebula/*.vue`). Il source dei componenti `.vue` non vive in questo repo (vedi ADR-2026-04-14 § "fork dichotomy").

Migrare il Trait Editor su Vue 3 produrrebbe **stack alignment** con la canonical UI, riducendo il debito di "due framework frontend nel monorepo".

### Posizionamento del Trait Editor nel sistema

- È uno **strumento interno** gated da JWT con ruoli `reviewer` / `editor` / `admin` (cfr. `apps/backend/routes/traits/*` — `TRAIT_EDITOR_TOKEN` / `TRAITS_API_TOKEN`).
- **Non** è un percorso critico user-facing del gioco (player non lo vedono mai).
- Backend API `/api/traits/*` è stabile; uno swap del frontend non causa ripple su backend o contracts.
- Una finestra di regressione UI breve (ore, non giorni) è accettabile dato il pubblico ridotto (3 ruoli).

## Decision (proposed)

**Decision proposta**: migrare `apps/trait-editor` da AngularJS 1.8.3 a **Vue 3** via **Path C (green-field rebuild)**, eseguito in un singolo PR.

**Razionale sintetico**:

1. **Allineamento canonical**: Vue 3 è già lo stack di Mission Console. Eliminare AngularJS 1.x dal repo lascia un solo framework frontend (Vue 3) da supportare.
2. **Path C su Path A**: data la dimensione contenuta (~1.6K LOC, ~80 % logic in services testati) il cost-delta tra rewrite incrementale (Path A) e rebuild green-field (Path C) è ridotto. Path C permette di **adottare pattern Mission Console** (Composition API, `<script setup>`, Pinia opzionale) fin dal commit-1 invece di portare convenzioni AngularJS-isms.
3. **Path B scartato**: dual-runtime AngularJS+Vue per ~1.6K LOC introduce overhead di bridging (Vue-in-AngularJS via `ngVueComponent` o reverse) sproporzionato rispetto al footprint. Il dual-runtime ha senso per app `>10K LOC` con migrazione `>4` settimane.

**Master-dd verdict richiesto su 4 punti**:

1. ✅/❌ Approvare la migrazione (vs. tenere AngularJS 1.x e accettare il rischio CVE residuo).
2. Selezionare framework target: **Vue 3** (raccomandato) / React 18 / Svelte 5 / altro.
3. Selezionare path: **Path C green-field** (raccomandato) / Path A big-bang preserving UX / Path B incremental.
4. Confermare effort budget: **~8–12 h** (Path C Vue 3) / ~12–15 h (Path A Vue 3).

## Alternatives considered

### Framework alternatives

| Framework    | Ecosystem fit                                     | Curva apprendimento             | Migration effort (LOC-equiv)          | Pros                                                                             | Cons                                                                          |
| ------------ | ------------------------------------------------- | ------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Vue 3** ✅ | **Alto** — match Mission Console canonical bundle | Bassa per chi conosce AngularJS | ~8–12 h (Path C) / ~12–15 h (Path A)  | Stack alignment, Composition API ergonomic, SFC `.vue`, Vite first-class support | Master-dd / contributor devono confermare familiarità Vue 3                   |
| React 18     | Medio — la community mission-console mixa Vue+JSX | Media                           | ~10–14 h (Path C) / ~14–18 h (Path A) | Ecosystem più ampio, hiring pool largo                                           | Allineamento parziale (mission-console primary = Vue 3); 2 paradigmi nel repo |
| Svelte 5     | Basso — nessun consumer interno usa Svelte        | Bassa                           | ~6–10 h (Path C) / ~10–14 h (Path A)  | Bundle size minore (<30 % vs Vue), runes API moderna                             | Zero allineamento monorepo, hiring pool ridotto, ecosistema npm più piccolo   |

**Vincitore**: Vue 3 per allineamento canonical. React 18 difendibile solo se master-dd ha preferenza personale documentata.

### Path alternatives (per Vue 3 target)

| Path                                            | Effort   | PR strategy    | Rischio                                                                 | Quando ha senso                                                           |
| ----------------------------------------------- | -------- | -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Path A — Big-bang rewrite preserving UX**     | ~12–15 h | 1 PR           | Finestra regressione UI (ore-giorno) durante review                     | UX attuale è "spec congelato", da preservare 1:1                          |
| **Path B — Incremental component-by-component** | ~15–25 h | Multi-PR (3–5) | Dual-runtime AngularJS+Vue 3 attivo per settimane; overhead di bridging | App `>5K` LOC con feature ship in parallelo durante migrazione            |
| **Path C — Green-field rebuild** ✅             | ~8–12 h  | 1 PR           | UX freeze totale durante rebuild; richiede "good enough" baseline       | App piccola (`<3K` LOC), UX rivedibile, allinea pattern canonical da zero |

**Vincitore**: Path C. Trait Editor footprint è 1 651 LOC totale (di cui ~30 % test); il green-field rebuild da `data/core/traits/active_effects.yaml` schema + 4 route + 2 components + 3 services arriva a parità funzionale in ~8–12 h, con il bonus di pattern Mission Console adottati da subito.

**Path A è il fallback** se master-dd richiede preservazione UX 1:1 (es. screenshots stabili in changelog). Costo aggiuntivo modesto (~+4 h) per ricostruzione fedele markup.

### Status quo (non-migrate)

Mantenere AngularJS 1.8.3 indefinitamente:

- ✅ Costo immediato zero.
- ❌ CVE risk crescente con il passare degli anni (nessun upstream patch).
- ❌ Onboarding nuovi contributor diventa progressivamente più costoso.
- ❌ Disallineamento permanente con Mission Console canonical Vue 3.
- ❌ Dipendenze npm `angular*@1.8.3` non installabili in futuro se npm registry deprecasse vecchi pacchetti (rischio basso ma non nullo).

**Verdict**: scartato. Il rischio CVE sale monotonamente; la migrazione costa 8–15 h una tantum.

## Consequences

### Pros

- **EOL closure**: rimozione di una dipendenza End-of-Life dal monorepo.
- **Stack alignment**: un solo framework frontend (Vue 3) tra Mission Console, Trait Editor, e futuri tool interni.
- **Vendor cleanup**: chiusura formale del capitolo `packages/angular*` aperto da ADR-2026-04-14 (gli stubs sono già stati rimossi in PR #1343, ma il trait-editor era rimasto come "ultimo consumer AngularJS" del repo).
- **Onboarding cost ridotto**: contributor nuovi non devono imparare AngularJS 1.x convenzioni (`$routeProvider`, `module.component`, `register*` pattern, strictDi annotations) — solo Vue 3 SFC.
- **Test surface preservata**: i 4 spec Vitest esistenti ricoprono logica pure (parser, state, data, helpers) — portabili 1:1 a Vue 3 (Vitest stesso).

### Cons

- **Dev time**: 8–15 h di lavoro effettivo (single-PR feasible). Non gratis.
- **UI regression window**: durante review/merge della PR di implementazione, la UI può essere temporaneamente non raggiungibile o cambiata. Mitigato dal fatto che il tool è gated `editor`/`admin` JWT, non player-facing.
- **Test coverage gap potenziale**: Path C green-field rebuild può non riprodurre tutti gli edge case visivi della UI esistente. Mitigato dalle acceptance criteria sotto (round-trip CRUD trait obbligatorio).
- **Governance ripple minimo**: la PR di implementazione dovrà aggiornare `docs/governance/docs_registry.json` se aggiunge nuovi doc; dovrà aggiornare `apps/trait-editor/README.md` per descrivere lo stack nuovo.

### Neutral / out-of-scope

- **Backend `/api/traits/*` invariato**: nessun cambio contratto, nessun ripple AJV.
- **Mission Console non toccato**: rewrite separato, non parte di questo ADR.
- **`apps/play` non toccato**: vanilla JS, non ha dipendenze AngularJS.

## Effort estimate

| Path       | Framework | Effort     | PR count | Single-session feasible |
| ---------- | --------- | ---------- | -------- | ----------------------- |
| Path A     | Vue 3     | 12–15 h    | 1        | ✅ (long session)       |
| Path A     | React 18  | 14–18 h    | 1        | ⚠️ (split possibile)    |
| **Path C** | **Vue 3** | **8–12 h** | **1**    | **✅ (target)**         |
| Path C     | React 18  | 10–14 h    | 1        | ✅                      |
| Path B     | Vue 3     | 15–25 h    | 3–5      | ❌ (multi-session)      |

**Allocazione tipica Path C Vue 3 (8–12 h)**:

1. Setup (1–1.5 h): scaffold Vue 3 + Vite + TS + Vitest, rimozione `angular*` deps, `vue-router` 4, `pinia` (opzionale), tsconfig refit.
2. Pages port (3–4 h): `trait-library` (list view), `trait-detail` (read-only), `trait-editor` (form CRUD) come SFC con Composition API + `<script setup>`.
3. Components port (1–1.5 h): `trait-preview`, `trait-validation-panel` come SFC.
4. Services port (1–2 h): `trait-data.service`, `trait-state.service`, `trait-parser` come modulo TS plain (no Vue dep) + `useTraitStore` Pinia/composable.
5. Tests port (1–2 h): 4 spec Vitest portati con minimal change (services stessi; page spec via `@vue/test-utils`).
6. Build + smoke (0.5–1 h): `npm run build`, `npm run test`, manual smoke `npm run dev` round-trip CRUD un trait.

## Acceptance criteria (per future implementation PR)

L'implementation PR sarà accettata se **tutti** i criteri sotto sono verificabili:

1. ✅ `npm run build` (in `apps/trait-editor/`) completa senza errori, output `dist/` con manifest valido.
2. ✅ `npm run test` (Vitest) verde con almeno coverage funzionale equivalente alle 4 spec attuali (parser, state, data, editor page).
3. ✅ `npm run dev` avvia Vite, browser carica `/`, redirect a `/traits` funziona.
4. ✅ **Round-trip CRUD trait** funzionale end-to-end:
   - `/traits` (library) → lista trait visibile da `data/core/traits/active_effects.yaml` o sample fixture.
   - `/traits/:id` (detail) → dettaglio trait read-only renderizzato.
   - `/traits/:id/edit` (editor) → form modifica trait + save round-trip API `/api/traits/*` (o local fixture in dev).
5. ✅ JWT auth flow preservato: header `Authorization: Bearer <token>` propagato a `/api/traits/*` invariato. Ruoli `reviewer` / `editor` / `admin` rispettati lato backend (no change).
6. ✅ Dipendenze AngularJS rimosse da `apps/trait-editor/package.json` (`angular`, `angular-animate`, `angular-route`, `angular-sanitize` → `0` occorrenze).
7. ✅ Vue 3 + ecosystem aggiunti come dipendenze esplicite (`vue@^3.x`, `vue-router@^4.x`, build-time `@vue/test-utils` per spec).
8. ✅ `apps/trait-editor/README.md` aggiornato: stack section riflette Vue 3 + comandi dev/build/test invariati.
9. ✅ Nessuna regressione su Mission Console (`docs/mission-console/`) — verificato `npm run docs:smoke` o equivalent build smoke.
10. ✅ Frontmatter `docs_registry.json` aggiornato se la PR aggiunge nuovi doc (es. `apps/trait-editor/docs/migration-vue3.md` cronistoria opzionale).
11. ✅ ADR-2026-05-10 status promosso a **ACCEPTED** con commit di riferimento + commit SHA della PR di implementazione.

## Risks + mitigations

| Rischio                                                                  | Probabilità | Impatto | Mitigazione                                                                                               |
| ------------------------------------------------------------------------ | ----------- | ------- | --------------------------------------------------------------------------------------------------------- |
| UX regression non identificata in review                                 | Medio       | Basso   | Tool gated JWT `editor`/`admin`, audience ridotta; smoke manuale CRUD round-trip mandatory in PR DoD      |
| Test coverage gap durante port spec da Karma-like AngularJS a Vitest+Vue | Basso       | Medio   | I 4 spec esistenti sono già Vitest; logica pura in `services/` e `utils/` portabile 1:1                   |
| Stack mismatch se master-dd preferisce React 18 invece di Vue 3          | Medio       | Basso   | ADR esplicita raccomandazione Vue 3 ma documenta React 18 come alternativa difendibile; verdict master-dd |
| Path C UX freeze rifiutato (master-dd vuole UX preservata 1:1)           | Medio       | Basso   | Path A Vue 3 è fallback documentato (~+4 h effort); decisione gate master-dd                              |
| Backend contract drift durante migrazione                                | Bassissimo  | Alto    | Backend `/api/traits/*` è frozen; nessun cambio in scope di questo ADR. Acceptance criterion 5            |
| Bundle size regression vs AngularJS bundle attuale                       | Bassa       | Basso   | Vue 3 bundle ~33 KB gz vs AngularJS ~57 KB gz — atteso miglioramento, non regressione                     |
| CVE patch necessaria su AngularJS 1.x mentre ADR è in PROPOSED           | Bassissima  | Alto    | Trigger d'emergenza: master-dd promuove ADR a ACCEPTED + ship Path A in priority lane                     |

## Out of scope (defer separate ADR / non in scope)

I seguenti elementi **non** sono coperti da questo ADR:

- **Mission Console rewrite** — già Vue 3 canonical, source non in repo (cfr. ADR-2026-04-14).
- **`apps/play/` migration** — è vanilla JS senza dipendenze AngularJS, nessuna migrazione richiesta.
- **Backend API `/api/traits/*` changes** — contract stabile, nessun ripple.
- **Game-Database integration** (cfr. ADR-2026-04-14-game-database-topology) — feature flag `GAME_DATABASE_ENABLED` indipendente.
- **Scelta Pinia vs vanilla composables per state management** — dettaglio implementativo, decisione in PR di implementazione.
- **Translation i18n / l10n** — il Trait Editor è italiano/inglese mixed; eventuale i18n proper è ADR separato.
- **Auth flow refactor** — JWT/Bearer invariato, nessun cambio in scope.

## References

- [ADR-2026-04-14 — Dashboard scaffold vs Mission Console bundle dichotomy](ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md) — superseded; documenta rimozione `packages/angular*` stubs e dichiarazione Mission Console come unica UI canonical.
- [PR #1343 — apps/dashboard removal](https://github.com/MasterDD-L34D/Game/pull/1343) — Option A eseguita 2026-04-16.
- [Vue 3 documentation](https://vuejs.org/guide/introduction.html) — Composition API, `<script setup>`, Vue Router 4.
- [Vite 5 documentation](https://vitejs.dev/) — build tool già adottato (no change tooling).
- [Vitest documentation](https://vitest.dev/) — già adottato in trait-editor (no change test runner).
- AngularJS 1.x End of Life announcement (Google, 2022) — riferimento alla policy upstream di non-maintenance.
- `apps/trait-editor/package.json` — current dependency manifest (4 angular deps).
- `apps/trait-editor/src/main.ts` + `src/app.module.ts` — current bootstrap pattern.
- `docs/mission-console/.vite/manifest.json` — riferimento canonical Vue 3 SFC patterns (ConsoleLayout, FlowShellView, atlas/, nebula/).

---

**Master-dd verdict gate**: in attesa di promozione status `proposed` → `accepted` con selezione esplicita di (framework, path, effort budget). Senza verdetto questo ADR resta scoping-only e nessuna PR di implementazione viene aperta.
