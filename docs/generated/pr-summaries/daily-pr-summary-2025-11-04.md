# Daily PR Summary — 2025-11-04

_Generato automaticamente da `tools/py/daily_pr_report.py`._

| PR                                                     | Titolo                                                        | Autore         | Merged (UTC)         |
| ------------------------------------------------------ | ------------------------------------------------------------- | -------------- | -------------------- |
| [#523](https://github.com/MasterDD-L34D/Game/pull/523) | Fix color token aliases for Support Hub docs                  | @MasterDD-L34D | 2025-11-04T01:24:17Z |
| [#528](https://github.com/MasterDD-L34D/Game/pull/528) | Refactor idea intake widget UI components                     | @MasterDD-L34D | 2025-11-04T11:25:45Z |
| [#529](https://github.com/MasterDD-L34D/Game/pull/529) | Refactor generator initialization into modular utilities      | @MasterDD-L34D | 2025-11-04T11:26:45Z |
| [#530](https://github.com/MasterDD-L34D/Game/pull/530) | Fix asset path resolution in embed module                     | @MasterDD-L34D | 2025-11-04T11:28:55Z |
| [#531](https://github.com/MasterDD-L34D/Game/pull/531) | Refactor generator utilities into shared modules              | @MasterDD-L34D | 2025-11-04T11:42:43Z |
| [#532](https://github.com/MasterDD-L34D/Game/pull/532) | Refactor generator workflow to use shared services            | @MasterDD-L34D | 2025-11-04T12:08:07Z |
| [#533](https://github.com/MasterDD-L34D/Game/pull/533) | Fix generator module imports for static bundle                | @MasterDD-L34D | 2025-11-04T12:23:06Z |
| [#534](https://github.com/MasterDD-L34D/Game/pull/534) | Fix: Convert Evo tactics doc utils to runtime-safe JavaScript | @MasterDD-L34D | 2025-11-04T12:25:03Z |
| [#535](https://github.com/MasterDD-L34D/Game/pull/535) | Refactor Evo pack generator panels into modular views         | @MasterDD-L34D | 2025-11-04T12:39:43Z |
| [#537](https://github.com/MasterDD-L34D/Game/pull/537) | Fix: re-export evo tactics typedefs                           | @MasterDD-L34D | 2025-11-04T13:52:47Z |
| [#536](https://github.com/MasterDD-L34D/Game/pull/536) | Add docs generator tests and flows coverage                   | @MasterDD-L34D | 2025-11-04T13:58:02Z |
| [#538](https://github.com/MasterDD-L34D/Game/pull/538) | Aggiorna backlog docs refresh con stato completato            | @MasterDD-L34D | 2025-11-04T14:08:21Z |
| [#539](https://github.com/MasterDD-L34D/Game/pull/539) | Refactor generator activity/export views                      | @MasterDD-L34D | 2025-11-04T16:48:07Z |
| [#540](https://github.com/MasterDD-L34D/Game/pull/540) | Refactor generator persistence and audio into services        | @MasterDD-L34D | 2025-11-04T17:08:31Z |
| [#541](https://github.com/MasterDD-L34D/Game/pull/541) | Refactor docs generator anchor navigation                     | @MasterDD-L34D | 2025-11-04T17:24:12Z |
| [#542](https://github.com/MasterDD-L34D/Game/pull/542) | Add unit tests for docs generator client and dossier exports  | @MasterDD-L34D | 2025-11-04T17:38:41Z |
| [#543](https://github.com/MasterDD-L34D/Game/pull/543) | Refactor generator workspace layout                           | @MasterDD-L34D | 2025-11-04T19:31:15Z |
| [#545](https://github.com/MasterDD-L34D/Game/pull/545) | Integrate Nebula snapshot into generator meta rail            | @MasterDD-L34D | 2025-11-04T19:51:20Z |
| [#544](https://github.com/MasterDD-L34D/Game/pull/544) | Fix telemetry export workflow YAML syntax                     | @MasterDD-L34D | 2025-11-04T19:57:23Z |
| [#546](https://github.com/MasterDD-L34D/Game/pull/546) | Fix styling for generator flow map cards                      | @MasterDD-L34D | 2025-11-04T20:04:39Z |
| [#547](https://github.com/MasterDD-L34D/Game/pull/547) | Fix generator navigation styles and bundle runtime assets     | @MasterDD-L34D | 2025-11-04T20:19:02Z |
| [#548](https://github.com/MasterDD-L34D/Game/pull/548) | docs: document modular generator handover                     | @MasterDD-L34D | 2025-11-04T20:33:20Z |
| [#550](https://github.com/MasterDD-L34D/Game/pull/550) | Extract idea widget styles into shared stylesheet             | @MasterDD-L34D | 2025-11-04T22:39:25Z |
| [#551](https://github.com/MasterDD-L34D/Game/pull/551) | Move standalone documentation folders into docs               | @MasterDD-L34D | 2025-11-04T22:59:40Z |

## #523 — Fix color token aliases for Support Hub docs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T01:24:17Z
- Link: https://github.com/MasterDD-L34D/Game/pull/523

> ## Summary
>
> - remove the self-referential color overrides in docs/site.css so the imported design tokens remain usable
>
> ## Testing
>
> - npx prettier --check docs/site.css
>
> ---
>
> Codex Task (riferimento interno)

## #528 — Refactor idea intake widget UI components

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T11:25:45Z
- Link: https://github.com/MasterDD-L34D/Game/pull/528

> ## Summary
>
> - modularize the idea widget by moving the multi-select, status banner, report card, and feedback card into dedicated modules under docs/public/ui
> - improve accessibility with aria-live regions, focus management, and aria-describedby wiring for multi-select fields and status messaging
> - lazy-load the feedback module after successful submissions and share a single clipboard fallback utility for report copying
>
> ## Testing
>
> - npm run build:idea-taxonomy
>
> ---
>
> Codex Task (riferimento interno)

## #529 — Refactor generator initialization into modular utilities

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T11:26:45Z
- Link: https://github.com/MasterDD-L34D/Game/pull/529

> ## Summary
>
> - add pure DOM resolver utilities for the generator UI
> - introduce session state factories that encapsulate export, composer, and history slices
> - update generator initialization to consume the new helpers while preserving existing behaviour
>
> ## Testing
>
> - npm run lint --workspaces --if-present
>
> ---
>
> Codex Task (riferimento interno)

## #530 — Fix asset path resolution in embed module

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T11:28:55Z
- Link: https://github.com/MasterDD-L34D/Game/pull/530

> ## Summary
>
> - compute the embed script base URL using import.meta.url when available
> - fall back to document.currentScript for non-module contexts and reuse the base URL for all asset resolution
>
> ## Testing
>
> - npm run lint --workspaces --if-present
> - eslint --max-warnings 0 --ext .ts,.tsx,.vue,.js,.mjs src tests scripts admin
> - eslint --max-warnings 0 --ext .ts,.tsx .
>
> ---
>
> Codex Task (riferimento interno)

## #531 — Refactor generator utilities into shared modules

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T11:42:43Z
- Link: https://github.com/MasterDD-L34D/Game/pull/531

> ## Summary
>
> - extract generator data utilities into dedicated utils modules
> - add shared normalizer and serializer helpers for filters and exports
> - update generator to consume the new utilities and shared random id helper
>
> ## Testing
>
> - npm run lint --workspaces --if-present
>
> ---
>
> Codex Task (riferimento interno)

## #532 — Refactor generator workflow to use shared services

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T12:08:07Z
- Link: https://github.com/MasterDD-L34D/Game/pull/532

> ## Summary
>
> - add a reusable generator API client that centralizes catalog and resource fetching with fallbacks
> - extract dossier export helpers for template loading, HTML/PDF generation, and preset serialization
> - update the Evo Tactics generator workflow to consume the new services and simplify inline logic
>
> ## Testing
>
> - npm run lint --workspaces --if-present
>
> ---
>
> Codex Task (riferimento interno)

## #533 — Fix generator module imports for static bundle

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T12:23:06Z
- Link: https://github.com/MasterDD-L34D/Game/pull/533

> ## Summary
>
> - add pure DOM resolver utilities for the generator UI
> - introduce session state factories that encapsulate export, composer, and history slices
> - update generator initialization to consume the new helpers while preserving existing behaviour
> - ensure the generator references JavaScript modules that can load in the static HTML page
>
> ## Testing
>
> - npm run lint --workspaces --if-present
>
> ---
>
> Codex Task (riferimento interno)

## #534 — Fix: Convert Evo tactics doc utils to runtime-safe JavaScript

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T12:25:03Z
- Link: https://github.com/MasterDD-L34D/Game/pull/534

> ## Summary
>
> - rewrite the Evo tactics documentation utilities (ids, normalizers, serializers, types) using runtime-valid JavaScript with JSDoc typedefs
> - ensure shared generator helpers no longer rely on TypeScript-only syntax so they can load directly in the browser
>
> ## Testing
>
> - npm run lint --workspaces --if-present
>
> ---
>
> Codex Task (riferimento interno)

## #535 — Refactor Evo pack generator panels into modular views

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T12:39:43Z
- Link: https://github.com/MasterDD-L34D/Game/pull/535

> ## Summary
>
> - introduce a panel registry that orchestrates generator panel setup and rendering
> - add view modules for each main generator panel exposing setup/render entry points
> - update generator state updates to trigger the new panel renderers instead of direct DOM manipulation
>
> ## Testing
>
> - npm run lint --workspaces --if-present
>
> ---
>
> Codex Task (riferimento interno)

## #537 — Fix: re-export evo tactics typedefs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T13:52:47Z
- Link: https://github.com/MasterDD-L34D/Game/pull/537

> ## Summary
>
> - restore explicit exports for the Evo tactics JSDoc typedefs so downstream imports resolve
> - keep RandomIdGenerator callback available alongside the other shared types
>
> ## Testing
>
> - npm run lint --workspaces --if-present
>
> ---
>
> Codex Task (riferimento interno)

## #536 — Add docs generator tests and flows coverage

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T13:58:02Z
- Link: https://github.com/MasterDD-L34D/Game/pull/536

> ## Summary
>
> - add a standalone Vitest configuration and npm script for the docs-generator suite
> - cover generator utilities with focused unit specs and a JSDOM integration harness that exercises state bootstrapping and filter handlers
> - extend the Playwright suite with a generator workflow scenario served from the existing tools/ts infrastructure
>
> ## Testing
>
> - npm run test:docs-generator
> - npm run test:web --workspace tools/ts _(fails: Chromium system dependencies such as libatk-1.0 are not available in the container)_
>
> ---
>
> Codex Task (riferimento interno)

## #538 — Aggiorna backlog docs refresh con stato completato

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T14:08:21Z
- Link: https://github.com/MasterDD-L34D/Game/pull/538

> ## Summary
>
> - sposta le attività completate del piano di refresh delle docs sotto una sezione "Done"
> - aggiorna la tabella del backlog per mostrare solo le attività ancora aperte e tracciare il debito tecnico CSS del widget
>
> ## Testing
>
> - npx prettier --write docs/ideas/refresh-plan.md
>
> ---
>
> Codex Task (riferimento interno)

## #539 — Refactor generator activity/export views

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T16:48:07Z
- Link: https://github.com/MasterDD-L34D/Game/pull/539

> ## Summary
>
> - extract the generator activity log and export preview rendering logic into dedicated view modules with explicit dependency wiring
> - update the generator bootstrap to delegate activity/export setup through the new modules while keeping state management in place
> - add Vitest + JSDOM integration tests that cover activity filters/pin handling and export preview refresh behaviour
>
> ## Testing
>
> - npm run test:docs-generator
>
> ---
>
> Codex Task (riferimento interno)

## #540 — Refactor generator persistence and audio into services

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T17:08:31Z
- Link: https://github.com/MasterDD-L34D/Game/pull/540

> ## Summary
>
> - add a storage helper with an in-memory fallback and wire generator persistence through it
> - extract audio cue/controls handling into a reusable service and update the generator to use it
> - cover the new services with unit tests for happy paths and fallbacks
>
> ## Testing
>
> - npm run test:docs-generator
>
> ---
>
> Codex Task (riferimento interno)

## #541 — Refactor docs generator anchor navigation

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T17:24:12Z
- Link: https://github.com/MasterDD-L34D/Game/pull/541

> ## Summary
>
> - extract the generator anchor/minimap/overlay logic into a dedicated `views/anchor.js` module that exposes `init`, `setActiveSection`, and `destroy`
> - update the generator bootstrap to use the new navigator API and expose helper methods for tests and consumers
> - add jsdom-based integration coverage for anchor navigation and adjust existing generator integration fixtures
>
> ## Testing
>
> - npm run test:docs-generator
>
> ---
>
> Codex Task (riferimento interno)

## #542 — Add unit tests for docs generator client and dossier exports

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T17:38:41Z
- Link: https://github.com/MasterDD-L34D/Game/pull/542

> ## Summary
>
> - add generator client unit tests covering candidate fetching, URL normalization, and error propagation
> - add dossier export unit tests for template caching, preset file generation, and incomplete input handling
> - update the docs generator Vitest config so the new unit suite runs (with jsdom for dossier tests)
>
> ## Testing
>
> - npm run test:docs-generator -- --run
>
> ---
>
> Codex Task (riferimento interno)

## #543 — Refactor generator workspace layout

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T19:31:15Z
- Link: https://github.com/MasterDD-L34D/Game/pull/543

> ## Summary
>
> - reorganize the Evo Tactics generator page into overview, workspace, and outcomes grids so controls, exports, and analysis panels sit side by side
> - update generator styles to support the new multi-column layout, flex panels, and state-aware history/compare treatments with responsive fallbacks
>
> ## Testing
>
> - npm run test:docs-generator
>
> ---
>
> Codex Task (riferimento interno)

## #545 — Integrate Nebula snapshot into generator meta rail

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T19:51:20Z
- Link: https://github.com/MasterDD-L34D/Game/pull/545

> ## Summary
>
> - add a Nebula snapshot panel to the generator meta rail with metrics, highlights, and manual refresh controls
> - fetch the Mission Console Nebula payload on load/refresh and surface coverage status with activity log instrumentation
> - expose the new Nebula elements/state helpers and apply dedicated styling consistent with the site tokens
>
> ## Testing
>
> - npm run test:docs-generator
>
> ---
>
> Codex Task (riferimento interno)

## #544 — Fix telemetry export workflow YAML syntax

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T19:57:23Z
- Link: https://github.com/MasterDD-L34D/Game/pull/544

> ## Summary
>
> - correct the recipients path definition to stay on a single line
> - adjust the Slack notification here-doc indentation to keep YAML valid
>
> ## Testing
>
> - npm run lint --workspaces --if-present
>
> ---
>
> Codex Task (riferimento interno)

## #546 — Fix styling for generator flow map cards

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T20:04:39Z
- Link: https://github.com/MasterDD-L34D/Game/pull/546

> ## Summary
>
> - add dedicated styling for the generator flow map so the new layout cards render with proper spacing, hierarchy, and status treatments
>
> ## Testing
>
> - npm run test:docs-generator
>
> ---
>
> Codex Task (riferimento interno)

## #547 — Fix generator navigation styles and bundle runtime assets

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T20:19:02Z
- Link: https://github.com/MasterDD-L34D/Game/pull/547

> ## Summary
>
> - update global navigation and chip styling to restore contrast and legibility against the dark canvas
> - ship an esbuild bundle for the generator and load it from the page so filters and actions work when deployed on GitHub Pages
> - exclude the bundled artifacts from Prettier checks to keep commits clean
>
> ## Testing
>
> - npm run test:docs-generator
>
> ---
>
> Codex Task (riferimento interno)

## #548 — docs: document modular generator handover

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T20:33:20Z
- Link: https://github.com/MasterDD-L34D/Game/pull/548

> ## Summary
>
> - document the new modular generator structure and testing flow in the Evo Tactics deploy guide
> - add an internal announcement outlining contribution guidelines for the refactored modules
> - provide an asynchronous handover note with dependency map, entry points, QA outcomes, and checkpoint plan
>
> ## Testing
>
> - npm run test:docs-generator
>
> ---
>
> Codex Task (riferimento interno)

## #550 — Extract idea widget styles into shared stylesheet

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T22:39:25Z
- Link: https://github.com/MasterDD-L34D/Game/pull/550

> ## Summary
>
> - add a docs/assets/styles/widget.css bundle with multi-select, feedback card, and report styling for the idea intake widget
> - load the shared stylesheet on the idea engine page and drop the redundant widget overrides from idea-intake.css
> - update the embed script to verify that widget styles are present and tag the container so the new selectors apply
>
> ## Testing
>
> - npm run lint
>
> ---
>
> Codex Task (riferimento interno)

## #551 — Move standalone documentation folders into docs

- Autore: @MasterDD-L34D
- Label: codex
- Merged: 2025-11-04T22:59:40Z
- Link: https://github.com/MasterDD-L34D/Game/pull/551

> ## Summary
>
> - move the standalone appendici materials under docs/appendici and update all references across tooling and documentation
> - relocate the ideas export drop folder into docs/ideas/submissions, updating workflows, guides, and helper scripts
> - refresh generated reports and trackers to use the new documentation paths
>
> ## Testing
>
> - npm run lint --workspaces --if-present
>
> ---
>
> Codex Task (riferimento interno)
