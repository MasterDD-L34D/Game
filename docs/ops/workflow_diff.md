---
title: OPS-01 · Workflow gap analysis
doc_status: draft
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# OPS-01 · Workflow gap analysis

| Workflow                 | Stato confronto           | Differenze principali                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e.yml`                | Allineato                 | Gli step (`checkout`, `setup-node`, installazione dipendenze, test Playwright) coincidono con la versione importata, nessuna azione richiesta.【F:.github/workflows/e2e.yml†L1-L61】【F:incoming/lavoro_da_classificare/workflows/e2e.yml†L1-L61】                                                                                                                                                              |
| `gh-pages.yml`           | Divergente                | Nel repository è presente uno step extra per sincronizzare gli asset del pacchetto Evo-Tactics prima della pubblicazione, assente nella versione da classificare (che rimuove anche il piccolo refuso sugli spazi).【F:.github/workflows/gh-pages.yml†L1-L41】【F:incoming/lavoro_da_classificare/workflows/gh-pages.yml†L1-L35】                                                                               |
| `lighthouse.yml`         | Configurazione da migrare | Entrambe le versioni risolvono `SITE_BASE_URL`, ma quella importata richiama direttamente `lhci autorun` sul file radice mentre la pipeline ufficiale usa lo script npm condiviso; la configurazione sarà spostata in `config/lighthouse/evo.lighthouserc.json` per uniformare i riferimenti.【F:.github/workflows/lighthouse.yml†L1-L35】【F:incoming/lavoro_da_classificare/workflows/lighthouse.yml†L1-L33】 |
| `schema-validate.yml`    | Allineato                 | Triggers, permessi e job coincidono: nessuna azione ulteriore.【F:.github/workflows/schema-validate.yml†L1-L30】【F:incoming/lavoro_da_classificare/workflows/schema-validate.yml†L1-L30】                                                                                                                                                                                                                      |
| `search-index.yml`       | Allineato                 | Entrambe le varianti installano Python 3.11, rigenerano l'indice e committano l'output; differenze non rilevate.【F:.github/workflows/search-index.yml†L1-L41】【F:incoming/lavoro_da_classificare/workflows/search-index.yml†L1-L41】                                                                                                                                                                          |
| `update-evo-tracker.yml` | Nuovo                     | Workflow riutilizzabile che installa le dipendenze Python e verifica che il tracker Evo sia sincronizzato via `make update-tracker TRACKER_CHECK=1` (supporta input opzionale `batch`).【F:.github/workflows/update-evo-tracker.yml†L1-L33】                                                                                                                                                                    |
| `security.yml`           | Mancante                  | La cartella `incoming/` contiene un workflow SAST/secret-scanning non ancora presente in `.github/workflows/`; richiede valutazione per eventuale integrazione futura.【F:incoming/lavoro_da_classificare/workflows/security.yml†L1-L52】                                                                                                                                                                       |

**Osservazioni**

- La configurazione Lighthouse verrà centralizzata in `config/lighthouse/evo.lighthouserc.json`
  e richiamata via `npm run lint:lighthouse` per mantenere un singolo punto di
  verità fra CI schedulata e job on-demand.
- Il workflow di deploy GitHub Pages in produzione include la sincronizzazione
  degli asset Evo: se la versione incoming venisse adottata, andrebbe
  reinserito lo step oppure gestito in un job separato per evitare regressioni
  sugli asset pubblicati.【F:.github/workflows/gh-pages.yml†L21-L33】

## Dipendenze da `SITE_BASE_URL`

I workflow Evo che richiedono il secret/variabile `SITE_BASE_URL` sono:

- `.github/workflows/ci.yml` – risolve il valore tramite `vars` o `secrets`
  per eseguire gli audit Lighthouse schedulati e gli script di site-audit.
  【F:.github/workflows/ci.yml†L483-L564】
- `.github/workflows/e2e.yml` – espone `BASE_URL` ai test Playwright Evo.
  【F:.github/workflows/e2e.yml†L1-L35】
- `.github/workflows/lighthouse.yml` – esegue `npm run lint:lighthouse`
  utilizzando la stessa variabile per determinare il dominio pubblico.
  【F:.github/workflows/lighthouse.yml†L1-L32】

Tutti gli altri workflow analizzati non dipendono da secret Evo dedicati.
