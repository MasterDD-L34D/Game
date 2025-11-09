# QA checklist – Support Hub & Idea Engine

Questa checklist centralizza i controlli da eseguire prima di pubblicare modifiche al Support Hub (`docs/index.html`) e all'Idea Engine.

## Controlli obbligatori

- [ ] Smoke test locale (`npm run docs:smoke`).
- [ ] Validazione HTML con `npx html-validate` sulle pagine toccate.
- [ ] Audit Lighthouse desktop (Performance ≥ 0.80, Accessibilità ≥ 0.90).
- [ ] Audit Lighthouse mobile (Performance ≥ 0.80, Accessibilità ≥ 0.90).
- [ ] Verifica accessibilità manuale (focus visibile, landmark, ruoli ARIA, contrasto).
- [ ] Aggiornare questo file con l'esito del ciclo QA.

## Comandi rapidi

| Check                 | Comando                                                                                                                  | Note                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Smoke test            | `npm run docs:smoke`                                                                                                     | Avvia server statico (porta 5000) e backend Idea Engine (porta 3333). |
| Validazione HTML      | `npx html-validate docs/index.html docs/ideas/index.html`                                                                | Aggiungere eventuali file modificati.                                 |
| Lighthouse desktop    | `SITE_BASE_URL=http://127.0.0.1:5000 npx lhci collect --url=$SITE_BASE_URL/index.html --collect.settings.preset=desktop` | Richiede Chrome/Chromium installato.                                  |
| Lighthouse mobile     | `SITE_BASE_URL=http://127.0.0.1:5000 npx lhci collect --url=$SITE_BASE_URL/index.html --collect.settings.preset=mobile`  | Assicurarsi che il backend sia opzionalmente attivo.                  |
| Accessibilità manuale | Navigazione tastiera + strumenti (es. axe, contrast checker).                                                            | Annotare note e follow-up.                                            |

## Storico esecuzioni

### 2025-11-04 – Ciclo 1

| Tipo               | Stato         | Dettagli                                                                                                                                        | Riferimenti                                                                                                |
| ------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Smoke test         | ✅ Completato | `npm run docs:smoke` avvia server statico e API; pagina principale raggiungibile.                                                               | `curl -I http://127.0.0.1:5000/index.html` 【428577†L1-L6】, avvio server 【19f465†L1-L8】【6dcfd3†L1-L5】 |
| Validazione HTML   | ⚠️ Bloccato   | `npx html-validate` fallisce con `npm ERR! 403 Forbidden` (registry non accessibile offline). Follow-up: predisporre dipendenza locale o cache. | 【eecccb†L1-L8】                                                                                           |
| Lighthouse desktop | ⚠️ Bloccato   | `npx lhci collect` non eseguito: pacchetto non disponibile senza accesso al registry. Da ripetere in ambiente con cache.                        | —                                                                                                          |
| Lighthouse mobile  | ⚠️ Bloccato   | Come sopra, impossibile installare `lhci`.                                                                                                      | —                                                                                                          |
| A11y manuale       | ✅ Parziale   | Verificati landmark `<main>` e `<nav>` e bottoni focusabili in `docs/index.html`; struttura coerente con blueprint. Nessun errore evidente.     | 【F:docs/index.html†L33-L109】【F:docs/index.html†L204-L247】                                              |

**Follow-up aperti:**

1. Pre-caricare le dipendenze `html-validate` e `@lhci/cli` per ambienti offline o aggiungere mirror interno.
2. Rieseguire gli audit Lighthouse (desktop/mobile) appena le dipendenze risultano disponibili.
