# Idea Engine Docs Refresh Blueprint

## 1. Analisi attuale & mappa dei contenuti

### Entry-point e percorsi chiave

| Percorso                                   | Contenuto                                                                                             | Note flusso                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/docs/index.html` → sezione "Support Hub" | Hub generale con collegamenti rapidi verso Idea Engine e altri strumenti                              | Richiede aggiornamento per rendere visibili i journey principali e i link al backend/README.                                                                                                                                                                                |
| `/docs/ideas/index.html`                   | Pagina principale Idea Engine con hero, reminder tassonomia, widget montato via `window.IdeaWidget`   | Supporta override URL `?apiBase`, `?apiToken`, `?module`, `?biomes`, `?ecosystems`, `?species`, `?traits`, `?functions`, `?priority`, `?categoriesUrl`, `?feedbackChannel`. Carica tassonomia da `../config/idea_engine_taxonomy.json`. 【F:docs/ideas/index.html†L1-L124】 |
| `/docs/ideas/changelog.md`                 | Storico rilasci widget/backend                                                                        | Deve essere collegato dal Support Hub e da README_IDEAS per la consultazione rapida. 【F:docs/ideas/changelog.md†L1-L21】                                                                                                                                                   |
| `/docs/ideas/feedback.md`                  | Template per note follow-up                                                                           | Da collegare come risorsa nelle CTA post-submit del widget.                                                                                                                                                                                                                 |
| `/docs/public/embed.js`                    | Widget Idea Intake: multi-select tassonomie, export `.md`, invio backend, modulo feedback contestuale | Gestisce fallback categoria/tassonomia, supporta lazy fetch e fallback su file statici. Richiede refactor per separare componenti UI, migliorare accessibilità e performance. 【F:docs/public/embed.js†L1-L210】                                                            |

### Sezioni operative da mettere in evidenza

- **Flow** – orchestratore e validator con strumenti Python/TS (`services/generation/`, `tools/py`, `tools/ts`). 【F:docs/README.md†L13-L17】
- **Atlas** – webapp Vite (`webapp/`) e pannelli statici (`docs/test-interface/`). 【F:docs/README.md†L17-L19】
- **Backend Idea Engine** – servizi Express (`server/`, `services/`) che producono report Codex. 【F:docs/README.md†L19-L20】
- **Dataset & pack** – fonte unica (`data/`, `packs/`, `reports/`) da mantenere sincronizzata con workflow CI. 【F:docs/README.md†L20-L23】

## 2. Journey UX prioritari

1. **Invio idea senza backend**
   - Passi: apri `/docs/ideas/index.html` → compila form → usa "Anteprima / Export .md" → salva file in `ideas/`.
   - Attriti: messaggio CTA poco evidente; mancano istruzioni inline su dove salvare il file; feedback stato download affidato al browser.
   - Microcopy proposti: "Scarica il Markdown e caricalo in `ideas/`" con nota su workflow CI.

2. **Invio con backend + report Codex GPT**
   - Passi: config `apiBase`/`apiToken` (config o query) → invia → visualizza report → copia/condividi.
   - Attriti: toggle override slug poco visibile; area report collassata nel widget, difficile distinguere stati; mancano stati di caricamento espliciti.
   - Microcopy: pulsante "Invia al backend (genera report Codex GPT)" + banner stato con spinner e testo ARIA-live.

3. **Consultazione changelog e README**
   - Passi: dalla pagina Idea Engine o README_IDEAS aprire changelog; dal README principale navigare verso tutorial.
   - Attriti: collegamenti secondari nascosti nel footer/lead; manca breadcrumb tra hub, changelog e tutorial.
   - Microcopy: sezione "Aggiornamenti recenti" con link ai release note e README_IDEAS.

4. **Aprire tutorial/guide operative**
   - Passi: da Support Hub individuare tutorial CLI / Idea Engine.
   - Attriti: indice non evidente; sovrapposizione tra README_IDEAS e docs/tutorials.
   - Microcopy: CTA "Vai al tutorial interattivo" nella sezione hero.

5. **Inviare feedback post-submit**
   - Passi: compilare modulo feedback inline dopo invio, oppure seguire link a `feedback.md`/Google Form.
   - Attriti: stato di invio non ARIA-friendly; campi non etichettati con `aria-describedby`; fallback su Slack generico.
   - Microcopy: indicare durata stimata, canale Slack/issue template.

## 3. Tassonomia contenuti proposta

- **Indice & panoramica** – `/docs/index.html`, aggiornato con sezione Idea Engine.
- **Quick start Idea Engine** – card principale in `/docs/ideas/index.html` + README_IDEAS.
- **Guide dettagliate** – link a `/docs/tutorials/idea-engine.md` (nuovo) con step per export/backend.
- **API backend** – sezione dedicata in README_IDEAS con esempi fetch e risposta.
- **Changelog** – `/docs/ideas/changelog.md` con ancora per versioni.
- **FAQ** – consolidare `docs/faq.md` con sezione Idea Engine.
- **Come contribuire** – nuova pagina (bozza sotto) + riferimento a dataset/workflow.

## 4. Accessibilità & performance

### Interventi A11y

- Aggiungere landmark semantici (`<header>`, `<main>`, `<aside>` già presenti) con `aria-labelledby` per i panel hero/reminder. 【F:docs/ideas/index.html†L15-L115】
- Gestire focus visibile su token multi-select e bottoni rimozione; aggiungere `aria-live="polite"` ai messaggi stato del widget/report. 【F:docs/public/embed.js†L67-L143】
- Fornire etichette `aria-describedby` per input multi-select con hint errori (attualmente `div` nascosto senza associazione).
- Introdurre ruoli `role="status"` per area feedback/report e testo per caricamento tassonomie.
- Assicurare contrasto minimo 4.5:1 per bottoni `button--secondary` e pill token (palette rivista sotto).

### Ottimizzazioni performance (senza regressioni)

- Estrarre CSS widget in file statico (`docs/assets/styles/components.css`) e rimuovere iniezione runtime dove possibile.
- Lazy-load modulo feedback: montare solo dopo esito submit, sfruttare `requestIdleCallback` e `IntersectionObserver`.
- Gestire fallback `navigator.clipboard` con verifica già presente, ma incapsulare in utility e loggare una sola volta. 【F:docs/public/embed.js†L210-L420】
- Minificare asset tassonomia (`idea-taxonomy.json`) con build script esistente `npm run build:idea-taxonomy`. 【F:README_IDEAS.md†L56-L74】
- Aggiungere header cache-control statici via config Pages (documentare).

## 5. Mini design system

### Token CSS (docs/assets/styles/tokens.css)

```css
:root {
  --color-bg: #0f172a;
  --color-surface: #ffffff;
  --color-surface-muted: #f3f5ff;
  --color-border: #d0d6e1;
  --color-border-strong: #94a3b8;
  --color-text-primary: #0b1120;
  --color-text-secondary: #334155;
  --color-text-inverse: #f8fafc;
  --color-accent: #5165ff;
  --color-accent-strong: #3346d3;
  --color-success: #1a7f3b;
  --color-warning: #b45309;
  --color-danger: #b91c1c;
  --shadow-soft: 0 12px 32px rgba(15, 23, 42, 0.08);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --font-sans: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --type-xs: 0.75rem;
  --type-sm: 0.875rem;
  --type-md: 1rem;
  --type-lg: 1.25rem;
  --type-xl: 1.5rem;
  --type-2xl: 2rem;
  --line-tight: 1.2;
  --line-normal: 1.5;
  --container-max: 1120px;
  --container-wide: 1280px;
}
```

### Componenti core (docs/assets/styles/components.css)

- **Surface panel** – padding `var(--space-4)`, background `var(--color-surface)`, border `var(--color-border)`, shadow `var(--shadow-soft)`.
- **Button** – default accent, variante secondaria outline su sfondo scuro, stato focus con `box-shadow: 0 0 0 3px rgba(81,101,255,0.35)`.
- **Form field** – label uppercase `var(--type-xs)`, input border `var(--color-border)`, stato errore `var(--color-danger)`.
- **Tag/Pill** – background `var(--color-surface-muted)`, testo `var(--color-accent-strong)`, icon optional.
- **Banner di stato** – ruoli `status/alert`, layout flessibile con icona + testo + azioni.
- **Card "Report Codex GPT"** – header con titolo + badge versione, contenuto scrollabile, azioni copia/download.

### Layout e tipografia (docs/assets/styles/pages.css)

- Grid responsiva 12 colonne >1024px; layout 1-col mobile (<640px), 2-col medio (<1024px) per main + aside.
- Titoli hero `var(--type-2xl)` desktop, `var(--type-xl)` mobile; body `var(--type-md)` con interlinea `var(--line-normal)`.
- Breakpoint: `--bp-sm: 480px`, `--bp-md: 768px`, `--bp-lg: 1024px`, `--bp-xl: 1280px`.
- Palette: fondo blu-notte, superfici neutre, accent blu elettrico (richiama "Idea/Engine" tecnologico).

## 6. Wireframe descrittivi

- **Hub Idea Engine** – Hero full-width con titolo, sottotitolo, CTA (Quick Start, Configura backend, Consulta changelog). Sezione successiva con 3 card: "Invia un'idea", "Genera report Codex", "Leggi tutorial". Aside con badge stato ultima release.
- **Pagina Invia idea** – Layout due colonne: a sinistra card widget (header con istruzioni, form embed), sotto sezione "Checklist export". A destra aside con promemoria tassonomia (accordion) e pannello report: header, spinner stato, contenuto tabellare, CTA feedback.
- **Changelog & Tutorial index** – Pagina elenco con hero breve, filtri (release/tag), due sezioni: timeline changelog (cards con data, link PR) e griglia tutorial (card con descrizione e durata). Footer con CTA "Suggerisci modifica".

## 7. Piano operativo organizzato

### 7.1 Workstream & dipendenze

| Milestone                                    | Obiettivo                                         | Dipendenze                 | Output principali                                               |
| -------------------------------------------- | ------------------------------------------------- | -------------------------- | --------------------------------------------------------------- |
| **M0 – Preparazione** (settimana 1)          | Creare base design system e allineare tassonomie  | Nessuna                    | Token CSS condivisi, schema file, issue board                   |
| **M1 – UI & contenuti** (settimane 2-3)      | Restyle hub Idea Engine + navigazione docs        | M0                         | Pagina `docs/ideas/index.html` aggiornata, indice docs coerente |
| **M2 – Widget & backend UX** (settimane 3-4) | Rifattorizzare embed, stati ARIA e feedback       | M1 parziale (token pronti) | `docs/public/embed.js` modulare, lazy load feedback             |
| **M3 – QA & contributi** (settimana 4)       | QA accessibilità/performance e guida contributori | M2                         | Checklist QA eseguita, nuova guida `docs/CONTRIBUTING_SITE.md`  |

### 7.2 Backlog Kanban (Issues/PR)

| Stato target          | Titolo                                             | Scope file                                                  | Criteri di accettazione                                                   |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| **To Do**             | Eseguire QA accessibilità & performance            | `docs/ideas/`, `docs/public/embed.js`, `webapp/`            | Checklist QA completata, report con esiti e follow-up documentati         |
| **To Do**             | Documentare guida contributori Idea Engine         | `docs/CONTRIBUTING_SITE.md`, `README_IDEAS.md`              | Guida pubblicata e collegata dall'hub, include checklist PR e workflow CI |
| **To Do**             | Automatizzare script smoke-test widget Idea Engine | `scripts/`, `docs/public/embed.js`                          | Script eseguibile da CI, verifica export `.md` e invio backend            |
| **M2→M3 · Tech Debt** | Estrarre CSS widget in asset statico               | `docs/assets/styles/components.css`, `docs/public/embed.js` | CSS dedicato generato in build, rimozione iniezione runtime e fallback OK |

#### Done

- Setup design tokens & reset CSS (`docs/assets/styles/tokens.css`, `docs/assets/styles/components.css`, `docs/site.css`).
- Ristrutturato `docs/ideas/index.html` con layout 2-col e CTA aggiornate.
- Aggiornati `docs/README.md` e `README_IDEAS.md` con indice e tutorial.
- Rifattorizzati i componenti UI di `docs/public/embed.js` (completato, precedentemente bloccato in attesa dei tokens).

### 7.3 Sequenza PR suggerita

1. **PR #1 – Design foundation**  
   _Branch_: `feature/docs-tokens`  
   _Scope_: creare `tokens.css`, `components.css`, import in `docs/site.css`. Aggiornare 1-2 componenti esistenti come prova.  
   _Test_: `npx prettier --check docs/assets/styles`, validazione rendering manuale.

2. **PR #2 – Restyle Hub**  
   _Branch_: `feature/idea-hub-layout`  
   _Scope_: ristrutturare `docs/ideas/index.html`, aggiungere hero, CTA, aside, includere checklist export.  
   _Test_: `npm run build:idea-taxonomy`, validazione HTML (`npx html-validate docs/ideas/index.html` se disponibile).

3. **PR #3 – Aggiornamento navigazione & contenuti**  
   _Branch_: `feature/docs-nav-refresh`  
   _Scope_: aggiornare `docs/README.md`, `README_IDEAS.md`, `docs/ideas/changelog.md`, creare pagina tutorial se mancante.  
   _Test_: controllo link (`npm run lint:links` o script manuale), verifica breadcrumb e CTA.

4. **PR #4 – Refactor widget embed**  
   _Branch_: `feature/idea-widget-ui`  
   _Scope_: estrarre componenti UI, stati ARIA, lazy load feedback/report, ottimizzare clipboard fallback.  
   _Test_: `npm run build:idea-taxonomy`, `npm run start:api` + invio idea, test export `.md`.

5. **PR #5 – QA & contributori**  
   _Branch_: `feature/docs-contributing`  
   _Scope_: pubblicare `docs/CONTRIBUTING_SITE.md`, aggiungere checklist QA centralizzata, documentare anteprima Pages.  
   _Test_: `npx prettier --write docs/CONTRIBUTING_SITE.md`, eseguire smoke test `npx serve docs`.

### 7.4 Riti di progetto & coordinamento

- **Kick-off** (giorno 1): review blueprint, assegnazione owner per ogni milestone, apertura issue GitHub corrispondenti.
- **Sync settimanale**: verificare avanzamento, aggiornare tabella backlog, registrare impedimenti (es. dipendenze dataset).
- **Design crit** (prima di PR #2): walkthrough wireframe low-fi e component library.
- **QA day** (fine M2): eseguire audit Lighthouse/Axe, raccogliere screenshot per documentare stato prima del deploy.
- **Retro finale** (dopo M3): raccogliere feedback su processi, aggiornare `docs/CONTRIBUTING_SITE.md` con lezioni apprese.

### 7.5 Script e workflow obbligatori

- `npm run build:idea-taxonomy` – rigenera tassonomia widget. 【F:README_IDEAS.md†L56-L74】
- `npm run start:api` – testare backend in locale. 【F:README_IDEAS.md†L31-L40】
- `npm run test:api` / `npm run webapp:deploy` (richiamati in README docs) per assicurare sincronizzazione dataset. 【F:docs/README.md†L20-L23】
- Workflow CI: verificare che `daily-pr-summary` continui a girare senza modifiche, documentando eventuali impatti. 【F:docs/workflows/daily-pr-summary-2025-10-29.md†L1-L40】
- Audit Lighthouse manuale e validazione HTML da registrare in `docs/qa-checklist.md` (nuovo artefatto proposto).

## 8. Checklist di accettazione per journey

- **Export Markdown senza backend**: la pagina carica tassonomia, bottone export mostra toast successo, file scaricato con naming coerente.
- **Invio con backend**: configurazione via query string funziona, stato loading e messaggi ARIA, report Codex visibile con pulsanti copia/download funzionanti anche senza clipboard API.
- **Feedback post-submit**: modulo appare solo dopo invio, validazione accessibile, fallback Slack/documento visibile.
- **Consultazione changelog**: link dal hero e dal report, breadcrumb presente, timeline leggibile su mobile.
- **Accesso rapido ai tutorial**: sezione "Tutorial" con card cliccabile, link ai README/guide aggiornato.

## 9. Anteprima Pages & QA

- **Pubblicazione**: GitHub Pages configurato su branch `main`, directory `/docs` (setup già documentato). 【F:README_IDEAS.md†L25-L34】
- **Anteprima**: creare branch `feature/idea-engine-ui`, abilitare Pages su branch dedicato (`gh-pages` temporaneo) o usare GitHub Pages Preview su environment.
- **QA checklist**:
  - Verificare su browser desktop/mobile (Chrome, Firefox, Safari responsive).
  - Eseguire audit Lighthouse (Performance >80, A11y >90).
  - Validare HTML (validator.w3.org) e contrasto (axe DevTools).
  - Testare fallback offline (disconnettere backend, usare export).

- **Test locali**:
  - Statico: `npm run build:idea-taxonomy` → aprire `docs/ideas/index.html` con `npx serve docs`.
  - Con backend: `npm run start:api` → `http://localhost:3333` → caricare pagina con `?apiBase=http://localhost:3333`.

## 10. Bozza README "Come contribuire al sito/Docs"

```
# Come contribuire al sito e alla documentazione

## Prerequisiti
- Node.js LTS, npm installato nel repository (`npm install`).
- Accesso ai dataset per rigenerare tassonomie (`npm run build:idea-taxonomy`).
- Facoltativo: backend Idea Engine (`npm run start:api`).

## Struttura cartelle chiave
- `docs/` — sorgente GitHub Pages (HTML/CSS/JS, guide).
- `docs/assets/styles/` — token, componenti e stili di pagina.
- `docs/ideas/` — hub Idea Engine (index, changelog, feedback, CSS).
- `docs/public/` — asset condivisi (widget JS, tassonomie).

## Flusso di lavoro
1. Crea branch dedicato (`feature/<nome>`).
2. Aggiorna i contenuti seguendo il design system (token e componenti).
3. Esegui `npm run build:idea-taxonomy` se tocchi dataset/tassonomie.
4. Testa in locale:
   - Statico: `npx serve docs` (export `.md`).
   - Con backend: `npm run start:api` + query `?apiBase=http://localhost:3333`.
5. Verifica accessibilità (focus visibile, ruoli ARIA, contrasti) e che i link interni puntino a percorsi relativi.
6. Aggiorna changelog o README se introduci nuove feature.
7. Apri PR includendo screenshot o registrazione rapida se modifichi UI.

## Checklist PR
- [ ] Nessun errore console in locale.
- [ ] Widget Idea Engine si monta correttamente con e senza backend.
- [ ] Documentazione correlata (README_IDEAS, changelog) aggiornata.
- [ ] Test di regressione minima: export `.md`, invio backend, modulo feedback.
- [ ] Allegato risultato Lighthouse o note QA.

## Risorse
- Config tassonomie: `config/idea_engine_taxonomy.json`.
- Workflow CI: `.github/workflows/idea-intake-index.yml`, `daily-pr-summary`.
- Canale feedback: `#feedback-enhancements`.
```
