# Flusso di verifica QA per la webapp

Questo documento riassume la procedura di QA manuale per la webapp Nebula e come raccogliere i log quando l'applicazione è pubblicata su hosting statico.

## 1. Preparazione ambiente

1. Installare le dipendenze nella root del repository (`npm install`) e nel pacchetto webapp (`npm --prefix webapp install`).
2. Aggiornare gli snapshot QA e i dataset demo se necessario (`npm run export:qa`).
3. Per richiamare la checklist dei test manuali eseguire:
   ```bash
   npm run webapp:qa
   ```
   Il comando stampa i passaggi da verificare per gli scenari **offline/fallback**, **telemetria mock** e **API reali**.

## 2. Verifica locale

1. Avviare l'API di orchestrazione (`npm run start:api`) se si vuole validare il flusso con servizi reali.
2. Avviare la webapp (`npm --prefix webapp run dev`) oppure il build statico (`npm --prefix webapp run preview`).
3. Annotare gli esiti della checklist per i tre scenari:
   - **Offline / fallback:** disattivare l'API e verificare i badge `fallback` o `demo` in Flow Shell, Nebula Atlas e Species.
   - **Mock telemetry:** attivare la modalità demo dal modulo Nebula e controllare l'evento `nebula.telemetry.mock.active` nei log.
   - **API reali:** riabilitare l'API, eseguire una generazione e verificare che `endpoint_source` sia `remote`.
4. Esportare i log QA dal pannello (JSON o CSV) e allegarli al report di sessione.

## 3. Raccolta log in hosting statico

Quando la webapp è distribuita come sito statico (es. su CDN o su `npm --prefix webapp run preview`):

1. Aprire il pannello QA (icona "Log" nella barra superiore) e filtrare per `scope` (es. `nebula`, `species`, `snapshot`).
2. Utilizzare l'azione **Esporta log** scegliendo il formato desiderato:
   - JSON (`qa-flow-logs.json`) per analisi dettagliata.
   - CSV (`qa-flow-logs.csv`) per report tabellari.
3. Se il download automatico è bloccato, usare il pulsante "Copia JSON" e incollare il contenuto in un file locale.
4. Per raccogliere log di fallback senza interfaccia interattiva, è possibile leggere direttamente il file `webapp/tests/manual/qa-checklist.md` dal repository.

## 4. Evidenze e report

- Salvare uno screenshot per ciascuno scenario di test (offline, mock, real) con timestamp visibile.
- Allegare i log esportati e la checklist compilata all'issue o al report QA.
- In caso di errori riproducibili includere sempre l'ID della richiesta (`request_id`) presente nei log.

## 5. Riferimenti rapidi

- Checklist manuale: `webapp/tests/manual/qa-checklist.md`
- Comando di riferimento: `npm run webapp:qa`
- Logger client: pannello QA in Flow Shell oppure `webapp/src/utils/logger.ts` per integrazioni custom.
