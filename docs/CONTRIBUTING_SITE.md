# Come contribuire al sito e alla documentazione

Questa guida raccoglie le istruzioni operative per contribuire alle pagine statiche pubblicate in `/docs`. È pensata per chi aggiorna il Support Hub, l'Idea Engine o la documentazione correlata e deve assicurarsi che l'esperienza resti coerente con il blueprint del progetto.

## Prerequisiti

- Node.js LTS (18+) e npm installati nel repository (`npm install`).
- Accesso ai dataset che alimentano il widget Idea Engine (`npm run build:idea-taxonomy`).
- Facoltativo ma consigliato: backend Idea Engine in locale (`npm run start:api`).

## Struttura cartelle chiave

| Percorso                           | Contenuto                                                     | Note                                          |
| ---------------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| `docs/`                            | Sorgente GitHub Pages (HTML, CSS, JS, Markdown).              | Entry point `docs/index.html` e Support Hub.  |
| `docs/assets/styles/`              | Token, componenti e stili pagina condivisi.                   | Importati da `docs/site.css`.                 |
| `docs/ideas/`                      | Hub Idea Engine (index, changelog, feedback, asset dedicati). | Collega widget e tassonomie.                  |
| `docs/public/`                     | Asset condivisi (widget JS, tassonomie, script).              | Il widget Idea Engine vive qui.               |
| `config/idea_engine_taxonomy.json` | Sorgente tassonomie Idea Engine.                              | Rigenerare con `npm run build:idea-taxonomy`. |
| `scripts/docs-smoke.js`            | Utility per il smoke test locale.                             | Invocato tramite `npm run docs:smoke`.        |

## Flusso di lavoro consigliato

1. Crea un branch dedicato (`feature/<descrizione>`).
2. Allinea i contenuti con il design system (`docs/assets/styles/tokens.css`, `docs/assets/styles/components.css`).
3. Se modifichi tassonomie o dataset, esegui `npm run build:idea-taxonomy` prima del commit.
4. Verifica i contenuti in locale:
   - **Statico**: `npx serve docs -l 5000` oppure `npm run docs:smoke`.
   - **Con backend**: apri `http://127.0.0.1:5000/ideas/index.html?apiBase=http://localhost:3333` dopo aver avviato `npm run start:api`.
5. Controlla link interni, breadcrumb e microcopy aggiornati (Idea Engine, tutorial, changelog, FAQ).
6. Aggiorna changelog o README collegati se introduci nuove funzionalità o percorsi.
7. Prepara uno screenshot o una registrazione rapida quando modifichi l'interfaccia.

## QA e smoke test obbligatori

| Check               | Comando                                                                                                                  | Note                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Smoke test completo | `npm run docs:smoke`                                                                                                     | Avvia static server su `http://127.0.0.1:5000` e backend su `http://localhost:3333`. Interrompi con <kbd>Ctrl</kbd>+<kbd>C</kbd>. |
| Validazione HTML    | `npx html-validate docs/index.html docs/ideas/index.html`                                                                | Aggiungi eventuali altre pagine modificate.                                                                                       |
| Lighthouse desktop  | `SITE_BASE_URL=http://127.0.0.1:5000 npx lhci collect --url=$SITE_BASE_URL/index.html --collect.settings.preset=desktop` | Richiede server statico attivo. Registrare punteggi Performance ≥ 0.80, Accessibilità ≥ 0.90.                                     |
| Lighthouse mobile   | `SITE_BASE_URL=http://127.0.0.1:5000 npx lhci collect --url=$SITE_BASE_URL/index.html --collect.settings.preset=mobile`  | Verifica anche con backend inattivo per fallback export.                                                                          |
| A11y manuale        | Test focus visibile, ruoli ARIA e contrasto su pagine toccate.                                                           | Annotare outcome nella checklist QA.                                                                                              |

## Checklist PR

- [ ] Nessun errore in console durante il smoke test.
- [ ] Widget Idea Engine funziona con e senza backend.
- [ ] Documentazione correlata (README_IDEAS, changelog, tutorial) aggiornata.
- [ ] `npx html-validate` e gli audit Lighthouse desktop/mobile superati.
- [ ] Allegati screenshot o note QA rilevanti alla pull request.
- [ ] Aggiornato `docs/qa-checklist.md` con i risultati dell'ultimo ciclo.

## Risorse utili

- `docs/README.md` – panoramica dei flussi principali e link rapidi.
- `README_IDEAS.md` – istruzioni per il widget e il backend Idea Engine.
- `docs/ideas/changelog.md` – storico delle release del widget.
- `docs/qa-checklist.md` – stato dei controlli QA e follow-up.

## Supporto e feedback

- Per segnalare problemi o proporre miglioramenti apri una issue GitHub e tagga il maintainer di riferimento.
- Canale Slack `#feedback-enhancements` per domande rapide sul widget e sulle pagine statiche.
- Aggiorna questa guida dopo retrospettive o cambi di workflow significativi.
