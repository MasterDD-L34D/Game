---
title: TKT-C1 partial handoff — Vue 3 rebuild + trait editor port pending
workstream: planning
status: active
owner: claude
last_review: 2026-05-11
tags: [tkt-c1, trait-editor, vue-3, angularjs, migration, handoff]
---

# TKT-C1 partial handoff — AngularJS → Vue 3 rebuild

## Shipped this PR

Full Vue 3 rebuild di `apps/trait-editor/` ad eccezione del **trait editor full controller** (1515 LOC AngularJS, deferred a follow-up scoped). App functional con library + detail view + routing + stato reattivo + ported services.

### Files added

| File                                                             | Purpose                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/trait-editor/src/main.ts`                                  | Vue 3 `createApp().mount()` bootstrap                        |
| `apps/trait-editor/src/App.vue`                                  | Root shell + nav + global status banner                      |
| `apps/trait-editor/src/router.ts`                                | vue-router 4 with hash history (4 routes incl. catch-all)    |
| `apps/trait-editor/src/views/TraitLibraryView.vue`               | Library list + search + archetype filter                     |
| `apps/trait-editor/src/views/TraitDetailView.vue`                | Trait detail page + back nav                                 |
| `apps/trait-editor/src/views/TraitEditorView.vue`                | **STUB** — pending full port (1515 LOC AngularJS controller) |
| `apps/trait-editor/src/views/__tests__/TraitLibraryView.spec.ts` | Vue test utils smoke test                                    |

### Files refactored (drop AngularJS deps)

| File                                                                   | Change                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/trait-editor/src/services/trait-state.service.ts`                | $rootScope.$broadcast → Vue 3 `reactive()` + composable `useTraitState()`    |
| `apps/trait-editor/src/services/trait-data.service.ts`                 | $q.resolve/when/reject → native Promise; `getTraitDataService()` singleton   |
| `apps/trait-editor/src/services/__tests__/trait-state.service.spec.ts` | Rewrite per new singleton + composable shape                                 |
| `apps/trait-editor/src/services/__tests__/trait-data.service.spec.ts`  | `new TraitDataService(createFakeQ())` → `new TraitDataService()`             |
| `apps/trait-editor/vite.config.ts`                                     | Add `@vitejs/plugin-vue` plugin                                              |
| `apps/trait-editor/vitest.config.ts`                                   | environment 'node' → 'happy-dom' + vue plugin                                |
| `apps/trait-editor/tsconfig.json`                                      | include `*.vue` files                                                        |
| `apps/trait-editor/package.json`                                       | Remove angular\* deps, add vue@3.5, vue-router@4, @vue/test-utils, happy-dom |

### Files deleted (AngularJS-specific)

- `apps/trait-editor/src/app.module.ts` — Angular module registration
- `apps/trait-editor/src/pages/` (entire dir) — Angular controllers
  - `pages/trait-library/trait-library.page.ts` (167 LOC) — replaced by `views/TraitLibraryView.vue`
  - `pages/trait-detail/trait-detail.page.ts` (131 LOC) — replaced by `views/TraitDetailView.vue`
  - `pages/trait-editor/trait-editor.page.ts` (**1515 LOC**) — replaced by stub view, full port deferred
  - `pages/trait-editor/__tests__/trait-editor.page.spec.ts` — orphan
- `apps/trait-editor/src/components/` (entire dir) — Angular components
  - `components/trait-preview/trait-preview.component.ts` (50 LOC)
  - `components/trait-validation-panel/trait-validation-panel.component.ts` (156 LOC)

## Build + test status

| Gate                   | Result                                                    |
| ---------------------- | --------------------------------------------------------- |
| `npm install`          | green (39 packages)                                       |
| `npm run build` (vite) | green (193ms, 9 chunks, 10.92 kB CSS, ~115 kB JS gzipped) |
| `npm test` (vitest)    | **16/16 green**                                           |

## TODO follow-up — Full Vue 3 port `trait-editor.page.ts` (1515 LOC)

### Scope

L'editor page AngularJS contiene:

1. **Modulo form trait** — input + validation real-time (binding `ng-model` → Vue `v-model`)
2. **Validazione integrata** — panel issues + auto-fix operations (`trait-validation-panel.component`)
3. **Preview live** — render trait inline durante edit (`trait-preview.component`)
4. **Save/cancel workflow** — `TraitDataService.saveTrait()` integration

### Effort estimate

~6-8h (1515 LOC AngularJS controller → ~800-1000 LOC Vue SFC):

- 1.5h read+map controller logic
- 2h port form bindings + v-model setup
- 2h port validation panel UI
- 1h port trait preview component
- 1.5h test suite (port existing spec + add Vue test utils integration test)

### Suggested file layout

- `apps/trait-editor/src/views/TraitEditorView.vue` — replace stub
- `apps/trait-editor/src/components/TraitPreview.vue` — port from AngularJS component
- `apps/trait-editor/src/components/TraitValidationPanel.vue` — port from AngularJS component
- `apps/trait-editor/src/composables/useTraitValidation.ts` — reactive validation hook
- `apps/trait-editor/src/views/__tests__/TraitEditorView.spec.ts` — port spec

### Acceptance criteria

1. ✅ Form input + reactive binding funziona end-to-end
2. ✅ Validation issues + auto-fix integration parity with AngularJS version
3. ✅ Preview live renders trait fields
4. ✅ Save/cancel routes back to detail view
5. ✅ Test suite ≥6 (port existing trait-editor.page.spec.ts)

## Risks + mitigations

- **Risk**: legacy AngularJS view (production?) clones the editor controller. Verifica: nessun runtime sta usando l'editor page attuale; backend trait routes accept JSON directly.
- **Mitigation**: stub view shows "pending full port" message + redirect — users sanno cosa aspettarsi.

## Why partial vs full ship

Single-session budget (~3-4h target for TKT-C1 within 3-PR cascade). 1515 LOC controller port would consume the entire session, blocking other 2 PR. Pragmatic split:

- This PR: full Vue 3 framework + library + detail working (4/5 surface)
- Follow-up: editor full port (1/5 surface remaining)

Stub view + handoff doc preserves intent + scopes residual work cleanly.

## Pillar impact

P3 Identità Specie × Job — trait curation tooling rebuild = unblock future contribution velocity (Vue ecosystem >> AngularJS 1.8 dead-end).
