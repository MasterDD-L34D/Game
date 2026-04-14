---
title: "ADR-2026-04-14: Dashboard scaffold vs Mission Console bundle dichotomy"
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# ADR-2026-04-14: Dashboard scaffold vs Mission Console bundle dichotomy

- **Data**: 2026-04-14
- **Stato**: Accettato
- **Owner**: Platform Docs
- **Stakeholder**: Atlas team (futura UI), Backend squad (ownership di `apps/dashboard/`), Ops (deploy GitHub Pages)

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

1. **Verificare se i Vitest di `apps/dashboard/` passano**. Se sì, tenerli. Se no, valutare se cancellarli o sistemarli.
2. **Audit dei `packages/angular*` stub**: capire se qualcuno li usa davvero oltre `apps/dashboard/` e, se no, considerare la loro rimozione in una PR dedicata.
3. **Prendere una decisione strategica** tra archival completo (alternativa A) e rebuild (alternativa C) quando ci sarà bandwidth e contesto di business.
4. **Unificare `apps/dashboard/tests/manual/qa-checklist.md`** con la documentazione QA canonica in `docs/qa/` (referenzia `apps/dashboard/` ma è una checklist statica che può vivere altrove).

## Riferimenti

- Nota "Dashboard reality check" in [`CLAUDE.md`](../../CLAUDE.md) sezione "Architecture notes worth reading multiple files for"
- Pre-built Mission Console bundle: `docs/mission-console/index.html` + `docs/mission-console/.vite/manifest.json`
- Source scaffold: `apps/dashboard/src/`
- Stub AngularJS: `packages/angular/index.js`
- Git history: commit `20e014da` (AngularJS scaffold), `57e832db` (Vue bundle), `465d531c` (workspace rename)
