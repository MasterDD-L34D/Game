---
title: 'ADR-2026-04-14: Dashboard scaffold vs Mission Console bundle dichotomy'
doc_status: superseded
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# ADR-2026-04-14: Dashboard scaffold vs Mission Console bundle dichotomy

- **Data**: 2026-04-14
- **Stato**: Risolto — scaffold rimosso 2026-04-16 (#1343, Option A eseguita)
- **Owner**: Platform Docs
- **Stakeholder**: Atlas team (futura UI), Backend squad, Ops (deploy GitHub Pages)

## Risoluzione (2026-04-16)

Option A eseguita: `apps/dashboard/` e `packages/angular*` rimossi dal repo (#1343). CI, scripts e backend già aggiornati con commenti di riferimento. Resta solo `docs/mission-console/` come bundle production (Vue 3, GitHub Pages). Se in futuro serve un dashboard dev, si partirà da zero con Vue 3 (Option B originale).

## Contesto

Durante una sessione di verifica end-to-end del dashboard, è emersa una dicotomia architetturale tra **due dashboard sovrapposti ma disconnessi** nel repo:

### `apps/dashboard/` — source scaffold

- Vite SPA registrata come npm workspace `@game/dashboard`
- Sorgente TypeScript reale in `src/`: `main.ts`, `app.module.ts`, `pages/`, `components/`, `services/`, `state/`, `types/`, `utils/`, `data/`
- Struttura: classic Angular-style (`*.component.ts`, `*.page.ts`, `angular.module(...)`)
- Dipende dai package workspace-local `packages/angular`, `packages/angular-route`, `packages/angular-animate`, `packages/angular-sanitize` — che sono **stub** (~180 righe per `angular/index.js`) con `version: "1.8.3-stub"` e una `bootstrap()` che tagga solo il root element senza montare nulla
- `npm run dev --workspace apps/dashboard` avvia Vite correttamente, serve tutti i file TS, ma il DOM renderizzato è `<app-root></app-root>` vuoto (verified in dev)
- Storia git: creato come "mission console" AngularJS nel commit `20e014da` (settembre 2025), rinominato da `webapp/` in `465d531c` (21 novembre 2025)

### `docs/mission-console/` — pre-built bundle

- 26 file di asset committati direttamente in `57e832db` (29 ottobre 2025) con messaggio "chore: build mission console bundle"
- Bundle **Vue 3**, non AngularJS, verificato via `.vite/manifest.json` che lista `src/layouts/ConsoleLayout.vue`, `src/views/FlowShellView.vue`, `src/views/NotFound.vue`, `src/views/atlas/*`, `src/views/nebula/*`
- `index.html` carica `assets/index-*.js` con runtime Vue
- Servito da GitHub Pages tramite `docs/index.html` che include `<a href="mission-console/index.html">Mission Console</a>`
- **Nessuno dei sorgenti Vue vive nel repo** — i componenti `.vue` non sono né in `apps/dashboard/src/` né in altri workspace

### Consumer di `apps/dashboard/`

Il workspace è profondamente cablato nel repo:

- 9 script npm nel `package.json` root: `dev`, `test`, `preview`, `test:e2e`, `ci:stack`, `webapp:deploy`, `webapp:qa`, `webapp:analyze`, più il chain `build --workspaces`
- `workspaces: ["apps/dashboard", ...]` nel root package.json
- Workflow CI in `.github/workflows/ci.yml` e `.github/workflows/qa-export.yml`
- Script shell `scripts/dev-stack.sh`, `scripts/test-stack.sh`
- Config Playwright per test E2E: `apps/dashboard/tests/playwright/playwright.config.mjs`
- Riferimenti in `CLAUDE.md`, `README.md`, `docs/hubs/atlas.md`, `docs/governance/workstream_matrix.json`
- Test Vitest interni al workspace (non verificati in questa investigazione)

### Nessun build path li connette

Non esiste alcuno script o workflow nel repo che:

- Builda `apps/dashboard/` verso `docs/mission-console/`
- Genera i file `.vite/manifest.json` di `docs/mission-console/` da sorgenti locali
- Importa asset da `apps/dashboard/dist/` verso la Mission Console pubblicata

Il bundle in `docs/mission-console/` è un snapshot frozen-in-time proveniente da un branch/repo esterno, committato una volta e mai aggiornato.

## Decisione

**Documentare la dicotomia come stato ufficiale e non tentare di risolverla in questo ADR**. Non archiviamo `apps/dashboard/`, non ricostruiamo la Mission Console da sorgenti locali. Lo stato attuale viene congelato come baseline:

1. `apps/dashboard/` rimane nel repo come **source scaffold non funzionante runtime** ma con infrastruttura Vite/Vitest/Playwright attiva (i suoi test unitari possono essere validi come logica pura anche senza render).
2. `docs/mission-console/` rimane come **artifact production frozen** servito da GitHub Pages.
3. CLAUDE.md documenta la "Dashboard reality check" note (aggiunta in PR #1323) perché agenti e contributor non sprechino tempo cercando di eseguire il dashboard aspettandosi un render.
4. Questo ADR diventa il riferimento canonico per la decisione, linkato da CLAUDE.md e da `docs/hubs/atlas.md`.

## Razionale

**Perché non archiviare `apps/dashboard/`?**

- L'archival fisico richiederebbe la rimozione di 9 npm script, la disattivazione di almeno 2 workflow CI, l'eliminazione del workspace, la gestione dei package `packages/angular*` e `packages/ui` che potrebbero essere consumati da altri (da verificare), e la sistemazione di shell script come `dev-stack.sh`.
- Il blast radius è grande (100+ file toccati) per un beneficio marginale: il codice dormiente non fa male di per sé; solo chi esegue `npm run dev --workspace apps/dashboard` si imbatte nel rendering vuoto, e questo è già documentato in CLAUDE.md.
- I Vitest del workspace potrebbero testare logica pura (servizi, formatter, state machines) indipendente dal render Angular. Butterli via sarebbe una perdita netta.

**Perché non ricostruire la UI?**

- Ricostruire la Mission Console come Vue app dentro `apps/dashboard/` significherebbe: rimpiazzare lo stub AngularJS con Vue reale, riscrivere tutti i `pages/*` e `components/*`, riprodurre lo stile visivo del bundle esistente, validare il risultato end-to-end. È lavoro da settimane, non da una PR.
- Il bundle esistente funziona (serve correttamente le pagine su GitHub Pages). Non c'è nessuna pressione di business che richieda un rebuild oggi.

**Perché non cancellare `docs/mission-console/`?**

- È l'unica UI pubblica del progetto servita da GitHub Pages. Cancellarla significherebbe down immediato del sito.
- Il bundle è funzionante e stabile; l'unico problema è che non ha un source path nel repo.

## Stato sorgente Vue (aggiornamento 2026-04-16)

Il progetto Vue 3 che ha prodotto il bundle in `docs/mission-console/` **non e' piu' disponibile**. Il repo/branch esterno originale non e' stato documentato al momento dell'import (commit `57e832db`, 2025-10-29) e il source e' considerato perso.

**Conseguenze operative:**

- Il bundle attuale e' l'unico artefatto esistente. Funziona, e' stabile, ed e' testato da 5 spec Playwright.
- **Se servono modifiche UI**, l'unica strada e' un **rebuild from scratch** come nuovo progetto Vue 3 + Vite nel repo (es. `apps/console/`).
- I dati statici (`data/flow/`, `data/nebula/`) sono rigenerabili via `npm run mock:generate`.
- Il layout e le rotte sono ricostruibili dal manifest Vite (`.vite/manifest.json`) che lista i component source originali: `ConsoleLayout.vue`, `FlowShellView.vue`, `atlas/*`, `nebula/*`, `NotFound.vue`.

**Effort stimato per rebuild**: 2-4 giorni per un dev Vue senior, usando il manifest come blueprint e i mock JSON come data source.

## Conseguenze

**Accettate:**

- **Dev server senza render**: chi esegue `npm run dev --workspace apps/dashboard` vede una pagina vuota. È documentato in CLAUDE.md e in questo ADR.
- **`npm run build --workspace apps/dashboard` produce un bundle non deployato**: il bundle va in `apps/dashboard/dist/` e non viene copiato da nessuna parte. È un no-op effettivo.
- **`npm run test --workspace apps/dashboard` potrebbe avere valore**: i test Vitest testano la logica TypeScript pura (se presenti); non è richiesta la UI per eseguirli.
- **`docs/mission-console/` non ha fonte di verità locale**: aggiornamenti futuri richiedono di importare nuovi asset dal repo/branch esterno che l'ha prodotto, o di avviare un progetto Vue separato e linkarlo.
- **CI workflow che buildano `apps/dashboard/` passano senza produrre nulla di utile**: accettabile come no-op finché non sono un bottleneck di tempo/costo.

**Non accettate (follow-up deliberati):**

- **Decidere quale dei due essere il "vero" dashboard**: è un cambio strategico che richiede discussione con Master DD e possibilmente uno step di migrazione dedicato. Non affrontato qui.
- **Build pipeline unificata**: un task architetturale dedicato potrà, in futuro, generare `docs/mission-console/` da una sorgente nel repo. Oggi fuori scope.

## Alternative considerate

### Alternativa A — Archival completo di `apps/dashboard/`

Sposta `apps/dashboard/` → `docs/archive/dashboard-scaffold/`, rimuovi workspace, rimuovi 9 npm script, aggiorna CI.

**Pro**: pulizia radicale, niente più runtime confusione.

**Contro**: 100+ file toccati, 2 workflow CI modificati, possibile rottura di test Vitest del workspace (non verificata), ownership di `packages/angular*` orfana, ci sono 21 file nel repo che referenziano `apps/dashboard` che andrebbero ripuliti. Rischio medio-alto senza un beneficio corrispondente.

### Alternativa B — Half-archive (src/ archiviato, package.json mantenuto)

Archivia solo `apps/dashboard/src/` mantenendo package.json e scripts come stub "no source".

**Contro**: stato ibrido peggio del problema originale (uno scaffold senza sorgente è più confuso di uno scaffold non funzionante).

### Alternativa C — Rebuild Mission Console come Vue app reale

Rimpiazza lo stub AngularJS con Vue, porta i componenti dal bundle decompressing la build, crea un build script che produce `docs/mission-console/` da `apps/dashboard/dist/`.

**Contro**: fuori scope, settimane di lavoro, richiede accesso al repo Vue esterno o reverse engineering dal bundle minificato.

### Alternativa D (scelta) — Documentare la dicotomia, fix orfani minimi, nessun cambio di stato

Questo ADR + fix di 1 test orfano (`tests/vfx/dynamicShader.spec.ts`) + aggiornamento CLAUDE.md linking. Zero rischio, costo minimo, nessuna perdita di opzionalità.

## Azioni operative in questa PR

- [x] Creato questo ADR (`docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md`)
- [x] Rimosso il test orfano `tests/vfx/dynamicShader.spec.ts` che importava da `apps/dashboard/src/vfx/index.js` (path mai esistito, nessuna implementazione di `buildMissionShader`/`createDynamicShader` nel repo)
- [x] Aggiornata `CLAUDE.md` per linkare questo ADR dalla "Dashboard reality check" note
- [x] Aggiornato `docs/hubs/atlas.md` per menzionare l'ADR nel riferimento al dashboard
- [x] Registrato nel `docs/governance/docs_registry.json`

## Follow-up candidati (backlog)

1. ~~**Verificare se i Vitest di `apps/dashboard/` passano**~~ — **completato 2026-04-14**, vedi sezione "Vitest audit results" sotto.
2. ~~**Audit dei `packages/angular*` stub**~~ — **completato 2026-04-14**, vedi sezione "Audit follow-up" sotto.
3. **Prendere una decisione strategica** tra archival completo (alternativa A) e rebuild (alternativa C) quando ci sarà bandwidth e contesto di business.
4. ~~**Unificare `apps/dashboard/tests/manual/qa-checklist.md`**~~ — **completato 2026-04-14**, spostato in [`docs/qa/nebula-webapp-checklist.md`](../qa/nebula-webapp-checklist.md) con frontmatter governance + entry in `docs_registry.json`.

## Audit follow-up

### 2026-04-14 — Audit `packages/angular*` stub

**Scopo**: verificare se gli stub AngularJS 1.8.3 in `packages/angular/`, `packages/angular-route/`, `packages/angular-animate/`, `packages/angular-sanitize/` siano consumati solo da `apps/dashboard/` (come ipotizzato) o anche da altro codice nel repo.

**Metodo**: grep di `from 'angular'`, `from 'angular-route'`, `require('angular*')` su tutto il repo (esclusi node_modules), confronto dei `package.json` dei consumer.

**Finding 1 — Consumer degli import**: 6 file importano da `angular`/`angular-*`:

| File                                 | Tipo                           |
| ------------------------------------ | ------------------------------ |
| `apps/dashboard/src/main.ts`         | app entry point                |
| `apps/dashboard/src/app.module.ts`   | module registration            |
| `packages/angular-route/index.js`    | stub (interno)                 |
| `packages/angular-animate/index.js`  | stub (interno)                 |
| `packages/angular-sanitize/index.js` | stub (interno)                 |
| `apps/trait-editor/src/main.ts`      | **app entry point (distinto)** |

**Finding 2 — Due consumer distinti con risoluzione opposta**:

- `apps/dashboard/package.json` ha `"angular": "file:../../packages/angular"` (più le `angular-*` sister) → **risolve agli stub locali** e quindi non monta nulla runtime.
- `apps/trait-editor/package.json` ha `"angular": "^1.8.3"` (più le `angular-*` sister) → **risolve all'AngularJS reale da npm** e quindi è una vera Angular app.

**Conclusione**:

Gli stub in `packages/angular*` sono **confinati a un unico consumer** (`apps/dashboard/`). Il `apps/trait-editor/` **NON li usa** pur condividendo il pattern di import. Gli stub sono quindi "dark code" di cui il destino è completamente legato alla decisione strategica sul dashboard scaffold (alternativa A/B/C di questo ADR).

**Implicazioni**:

1. **Non cancellare gli stub** senza cancellare o riscrivere `apps/dashboard/`. Farlo romperebbe il `npm ci` del workspace (impossibilità di risolvere la dipendenza `file:../../packages/angular`).
2. **Non confondere** `apps/trait-editor/` (app AngularJS funzionante e indipendente) con `apps/dashboard/` (scaffold stub). Sono due progetti AngularJS distinti nel monorepo, solo uno dei quali renderizza.
3. Quando sarà il momento di eseguire l'alternativa A (archival completo) di questo ADR, la rimozione degli stub `packages/angular*` diventa parte naturale del lavoro — non serve una PR dedicata.
4. Il `apps/trait-editor/` come app vera non è coperto dall'ADR attuale. Se diventasse canditato per sostituire la Mission Console, sarebbe un cambio strategico da discutere separatamente.

**Azione in questa PR**: nessuna modifica al codice. L'audit è solo informativo. Questa sezione dell'ADR viene aggiornata per marcare il follow-up come completato.

### 2026-04-14 — Vitest audit results

**Scopo**: eseguire la suite Vitest di `apps/dashboard/` e classificare ogni file test in GREEN/YELLOW/RED/SKIP, per decidere cosa tenere e cosa rimuovere.

**Metodo**: `npm --prefix apps/dashboard test` (baseline), poi ispezione degli import di ogni spec per verificare se i path source referenziati esistono nel `apps/dashboard/src/` corrente.

**Finding chiave**: il `vitest.config.ts` del dashboard ha include-pattern gated su `@vitejs/plugin-vue` + `@vue/test-utils`:

```ts
const includePatterns =
  vuePlugin && hasVueTestUtils
    ? [
        ...baseInclude,
        'tests/**/*.spec.ts',
        '../../tests/dashboard/**/*.spec.ts',
        '../../tests/vfx/**/*.spec.ts',
        '../../tests/analytics/**/*.test.ts',
      ]
    : [...baseInclude, '../../tests/analytics/squadsync_responses.test.ts'];
```

Il monorepo non ha Vue nelle dipendenze (gli stub `packages/angular*` rimangono AngularJS), quindi il fallback pattern gira, eseguendo solo 3 file test.

**Baseline run**: `Test Files 3 passed (3) | Tests 9 passed (9) | Duration 912ms`.

**Classificazione completa** (24 spec file totali):

| File                                                | Bucket         | Motivo                                                                                                                            |
| --------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `tests/config/dataSources.spec.ts`                  | **GREEN**      | Esegue, testa `src/config/dataSources.ts` (esiste)                                                                                |
| `tests/config/production-build.spec.ts`             | **GREEN**      | Esegue, smoke test Vite generico                                                                                                  |
| `../../tests/analytics/squadsync_responses.test.ts` | **GREEN**      | Esegue (fallback include), testa JSON fixtures                                                                                    |
| `tests/AtlasOverviewView.spec.ts`                   | **RED**        | Importa `../src/views/atlas/AtlasOverviewView.vue` (directory `src/views/` non esiste)                                            |
| `tests/AtlasTelemetryView.spec.ts`                  | **RED**        | Importa `../src/views/atlas/AtlasTelemetryView.vue` (assente)                                                                     |
| `tests/BiomesView.spec.ts`                          | **RED**        | Importa `../src/views/BiomesView.vue` (assente)                                                                                   |
| `tests/EncounterGenerator.spec.ts`                  | **RED**        | Importa `../src/state/generator/encounterGenerator.js` (`src/state/generator/` non esiste)                                        |
| `tests/EncounterPanel.spec.ts`                      | **RED**        | Importa `../src/components/EncounterPanel.vue` (assente, zero file `.vue` nel scaffold)                                           |
| `tests/GenerationFlow.spec.ts`                      | **RED**        | Importa `../src/components/SpeciesPanel.vue` (assente)                                                                            |
| `tests/NebulaAtlasView.spec.ts`                     | **RED**        | Importa `../src/views/NebulaAtlasView.vue` (assente)                                                                              |
| `tests/SpeciesPanel.spec.ts`                        | **RED**        | Importa `../src/components/SpeciesPanel.vue` (assente)                                                                            |
| `tests/SpeciesView.spec.ts`                         | **RED**        | Importa `../src/views/SpeciesView.vue` (assente)                                                                                  |
| `tests/components/SafeContent.spec.ts`              | **RED**        | Importa `../../src/components/common/SafeContent.vue` (assente)                                                                   |
| `tests/flow-shell-refresh.spec.ts`                  | **RED**        | Mocka `../src/services/generationOrchestratorService.js` (directory esiste ma file sconosciuto), monta componenti Vue inesistenti |
| `tests/flow-shell-telemetry.spec.ts`                | **RED**        | Come sopra                                                                                                                        |
| `tests/i18n.spec.ts`                                | **RED**        | Importa `../src/locales/en.json`, `../src/locales/it.json` (directory `src/locales/` non esiste)                                  |
| `tests/modules/useNebulaProgressModule.spec.ts`     | **RED**        | Importa `../../src/modules/useNebulaProgressModule` (`src/modules/` non esiste)                                                   |
| `tests/router/AppRouter.spec.ts`                    | **RED**        | Importa `../../src/router` (directory non esiste) + `vue-router` (non installato)                                                 |
| `tests/state/flowStores.spec.ts`                    | **RED**        | Mocka servizi che non esistono nel scaffold corrente                                                                              |
| `tests/validation/snapshot.spec.ts`                 | **RED**        | Importa `../../src/validation/snapshot` (directory `src/validation/` non esiste)                                                  |
| `tests/playwright/console/flow-shell.e2e.spec.ts`   | **PLAYWRIGHT** | Non eseguito da Vitest, usa Playwright runner                                                                                     |
| `tests/playwright/console/generator-flows.spec.ts`  | **PLAYWRIGHT** | Come sopra                                                                                                                        |
| `tests/playwright/console/idea-engine.spec.ts`      | **PLAYWRIGHT** | Come sopra                                                                                                                        |
| `tests/playwright/console/interface.spec.ts`        | **PLAYWRIGHT** | Come sopra                                                                                                                        |
| `tests/playwright/console/trait-dashboard.spec.ts`  | **PLAYWRIGHT** | Come sopra                                                                                                                        |

**Totali**: 3 GREEN, 17 RED, 5 PLAYWRIGHT, 0 YELLOW, 0 SKIP.

**Finding chiave**: **zero file `.vue` esistono in `apps/dashboard/src/`** (`find apps/dashboard/src -name "*.vue" | wc -l = 0`). Tutti i 17 spec RED sono stati scritti contro un albero sorgente Vue che è stato sostituito dal scaffold AngularJS. Non sono YELLOW perché anche se si installasse Vue, i source file mancherebbero comunque — sono orfani fino alla radice.

**Conclusione**: i 17 file RED sono dead code (come il `tests/vfx/dynamicShader.spec.ts` rimosso in PR precedente). Non possono essere riparati senza prima ricostruire il dashboard scaffold (decisione strategica di questo ADR, attualmente deferred). Vengono rimossi in questa PR, con history preservata via `git rm`.

**I 5 spec Playwright** restano intatti: girano contro il Mission Console bundle pre-built in `docs/mission-console/`, non contro il scaffold. La loro validità dipende da `npm run test:e2e` (suite separata) e non fa parte di questo audit.

**Azione in questa PR**:

1. Cancellati 17 file spec RED (elencati sopra)
2. Cancellate directory vuote residue se create dalle cancellazioni (es. `tests/components/`, `tests/state/`, `tests/router/`, `tests/modules/`, `tests/validation/`)
3. Questa sezione dell'ADR marca il follow-up #1 come completato

**Verifica post-PR**: `npm --prefix apps/dashboard test` → 3 Test Files passed, 9 tests passed (baseline invariata).

## Riferimenti

- Nota "Dashboard reality check" in [`CLAUDE.md`](../../CLAUDE.md) sezione "Architecture notes worth reading multiple files for"
- Pre-built Mission Console bundle: `docs/mission-console/index.html` + `docs/mission-console/.vite/manifest.json`
- Source scaffold: `apps/dashboard/src/`
- Stub AngularJS: `packages/angular/index.js`
- Git history: commit `20e014da` (AngularJS scaffold), `57e832db` (Vue bundle), `465d531c` (workspace rename)
