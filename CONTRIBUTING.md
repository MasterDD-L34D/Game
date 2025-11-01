# Linee guida per contribuire

Grazie per l'interesse nel progetto! Questa pagina riassume le aspettative di
setup e indirizza alla documentazione specifica per i contributi sui trait.

## Requisiti tecnici

- **Node.js 18+** e npm aggiornato (`node --version`, `npm --version`) come
  indicato nella checklist di setup. Le pipeline sono verificate con Node
  22.19.0 / npm 11.6.2. Prima di contribuire esegui `npm ci` dalla radice per
  installare le dipendenze.  
  _Riferimento: `docs/checklist/project-setup-todo.md`._
- **Python 3.10+** con `pip` attivo. Crea, se possibile, un virtual environment
  dedicato e installa i requisiti con `python -m pip install -r
  requirements-dev.txt`.  
  _Riferimento: `docs/checklist/project-setup-todo.md`._
- **Lint e QA**: le pipeline web verificano che `npm run test:web`,
  `npm run lint:web` e `npm run audit:web` siano verdi prima della promozione.
  Riproduci gli stessi comandi in locale quando tocchi asset front-end o trait.  
  _Riferimento: `docs/process/traits_checklist.md`._

## Contributi sui trait

Per proposte e modifiche ai trait consulta la nuova guida dedicata in
[`docs/contributing/traits.md`](docs/contributing/traits.md). Troverai template,
strumenti, workflow di revisione ed esempi passo-passo, oltre ai link diretti
agli script (`build_trait_index.js`, `report_trait_coverage.py`) e all'editor
schema-driven.

## Apertura di PR

1. Apri una branch descrittiva.
2. Segui le checklist pertinenti (QA, telemetria, web) e allega log/risultati.
3. Assicurati che i test richiesti siano verdi prima di richiedere la revisione.
