# Handover refactor generatore Evo Tactics Pack

## Obiettivo

Questa nota funge da handover asincrono per il team. Riassume la nuova struttura
modulare, i punti di integrazione aggiornati e l'esito del primo ciclo QA del
generatore documentazione.

## Mappa dipendenze

```
generator.js
 ├─ state/session.ts (sessione e persistence)
 ├─ services/
 │   ├─ storage.ts (preferenze utente, cache manifest)
 │   └─ audio.ts (cue rare/standard, controlli mute/volume)
 ├─ ui/elements.ts (query elementi DOM, anchor navigation)
 ├─ views/
 │   ├─ parameters.js
 │   ├─ traits.js
 │   ├─ biomes.js
 │   ├─ seeds.js
 │   ├─ composer.js
 │   ├─ insights.js
 │   ├─ activity.js
 │   └─ export.js
 └─ services/export/dossier.ts (preset zip, press kit, dossier)
```

`services/api/generatorClient.ts` rimane il layer di fetching verso cataloghi e
glossari remoti; i nuovi test in `tests/docs-generator/unit/generatorClient.test.ts`
ne validano gli errori e il fallback locale.

## Entry point aggiornati

- `generator.js` inizializza `createStorageService` e `createAudioService`, poi
  registra ogni vista tramite i resolver esportati in `ui/elements.ts` e
  `views/*`.
- Gli entry point di esportazione (`generateDossier*`, `buildPressKitMarkdown`,
  `generatePresetFileContents`) sono reindirizzati verso `services/export/dossier.ts`,
  mentre l'orchestrazione dei dati passa da `pack-data.js` e dalle API del
  catalogo (`fetchTrait*`, `fetchHazardRegistry`, `fetchSpecies`).
- Il navigatore di anchor (`createAnchorNavigator`) gestisce la sincronizzazione
  fra pannelli UI e indicatori di stato (`USER_FLOWS`, `FLOW_STATUS_LABELS`).

## QA ciclo 1

- **Test automatici** — `npm run test:docs-generator` (Vitest) verde su 9 file e
  33 test totali. Copre viste chiave, servizi audio/storage e generator client.
- **Log principali** — le suite di integrazione confermano l'interazione dei
  pannelli `activity`, `export`, `anchor` con il DOM virtuale; i test unitari
  verificano gestione errori API e serializzazione dossier.

## Azioni team

1. **Diffusione** — condividere questo riepilogo e l'[annuncio interno](./internal-announcement.md)
   nel canale `#evo-tactics` e nel documento di runbook.
2. **Sessione Q&A** — dedicare 20 minuti nel prossimo stand-up per domande sui
   moduli `views/*` e sulle convenzioni dei servizi.
3. **Checkpoint finale** — fissare un controllo a T+5 giorni dalla pubblicazione
   (calendar reminder) per raccogliere segnalazioni di regressione. In assenza di
   issue entro tale finestra dichiarare concluso il refactor e aggiornare il
   changelog interno.

Per ulteriori dubbi, referenti: @tech-lead (architettura), @qa-owner (suite
Vitest), @docs-owner (deploy catalogo).
