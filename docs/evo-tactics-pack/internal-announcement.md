# Annuncio interno — refactor generatore Evo Tactics Pack

## Sintesi

Il generatore dell'Evo Tactics Pack è stato modulato per separare viste,
servizi e suite di test dedicate. Il nuovo assetto semplifica l'onboarding dei
contributor, migliora la copertura QA e rende più prevedibili i deploy del
bundle demo descritti nella [guida di deploy](./deploy.md).

## Novità principali

- **Controller UI per vista** — ogni pannello del generatore vive in
  [`views/`](./views) con state management e listener dedicati.
- **Servizi riutilizzabili** — lo storage persistente e le cue audio sono stati
  estratti in [`services/storage.ts`](./services/storage.ts) e
  [`services/audio.ts`](./services/audio.ts) per permettere mocking mirato.
- **Test focalizzati** — la suite [`tests/docs-generator`](../../tests/docs-generator)
  include casi unitari e di integrazione su viste, servizi e orchestrazione
  generale, eseguibili con `npm run test:docs-generator`.

## Cosa devono sapere i contributor

1. **Entry point aggiornati** — `generator.js` importa i servizi modulari e
   registra le viste attraverso `resolveGeneratorElements`. Consultare la sezione
   "Nuova struttura modulare" nella [deploy guide](./deploy.md) per la mappa
   completa.
2. **Convenzioni per nuove viste** — riutilizzare gli helper offerti dai moduli
   esistenti (`init`, `render`, `attachHandlers`) e documentare ogni pannello in
   `views/README.md` (in preparazione).
3. **Testing obbligatorio** — ogni modifica ai moduli deve mantenere verdi i test
   `npm run test:docs-generator` e includere nuovi casi nella cartella unit o
   integration pertinente.
4. **Deploy demo** — verificare che i preset esportati dal comando "Scarica preset"
   rispettino la struttura `packs/evo_tactics_pack/out/generator/`.

## Prossimi passi

- Seguire il riepilogo di handover per la mappa dipendenze e le responsabilità
  operative.
- Registrare eventuali regressioni nel canale `#evo-tactics` entro il checkpoint
  finale (vedi sotto) per garantire che il refactor possa considerarsi concluso.
