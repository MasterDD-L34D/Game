# Checklist QA Nebula Webapp

Questa checklist è pensata per la verifica manuale della webapp in tre scenari operativi:

- **Offline / fallback** (hosting statico o assenza di API remote)
- **Mock telemetry** (dataset reale ma telemetria simulata)
- **API reali** (ambiente online)

Ogni sezione include i passi da eseguire e gli esiti attesi. Segnare ogni punto completato con `[x]`.

## 1. Setup iniziale

- [ ] Installare le dipendenze (`npm install` nella root e in `apps/dashboard/` se necessario).
- [ ] Aggiornare i dati locali (`npm run export:qa` se serve rigenerare gli snapshot demo).
- [ ] Avviare la webapp (`npm --prefix apps/dashboard run dev`) oppure distribuire il build statico (`npm --prefix apps/dashboard run build`).
- [ ] Aprire la dashboard QA su `http://localhost:5173` (o URL deploy) e verificare il caricamento iniziale.

## 2. Scenario Offline / Fallback

- [ ] Simulare l'assenza dell'API remoto (es. disabilitando il proxy o avviando `npm --prefix apps/dashboard run preview` senza API).
- [ ] Confermare che lo snapshot iniziale venga caricato da **fallback** (badge "fallback" o "demo").
- [ ] Verificare che il dataset Nebula mostri l'etichetta "Dataset fallback" nella vista Atlas.
- [ ] Controllare nella barra di stato del Flow Shell la presenza del badge `fallback` o `demo` su Snapshot, Species e Trait diagnostics.
- [ ] Scaricare i log QA dal pannello (JSON o CSV) e annotare l'ID della richiesta di fallback.
- [ ] Registrare eventuali errori 500/404 in console e allegare i log nel report.

## 3. Scenario Mock Telemetry

- [ ] Forzare il caricamento demo della telemetria (es. comando "Attiva demo" nel modulo Nebula o query param `telemetry=mock`).
- [ ] Confermare che la modalità telemetria indichi `mock` nella sezione Nebula.
- [ ] Verificare che il grafico delle convalide mostri dati coerenti con il mock (timestamp recenti, label "Telemetria demo").
- [ ] Controllare nei log QA che venga tracciato l'evento `nebula.telemetry.mock.active` con livello `warning`.
- [ ] Ripristinare la modalità live e assicurarsi che lo stato torni a `live` o `fallback`.

## 4. Scenario API reali

- [ ] Ricollegare l'API orchestratore (`npm run start:api`) e aggiornare la pagina.
- [ ] Confermare che lo snapshot venga sincronizzato da remoto (badge rimosso, stato "Online").
- [ ] Eseguire una generazione specie e verificare che la risposta includa `endpoint_source: "remote"`.
- [ ] Assicurarsi che il pannello Quality Release aggiorni percentuali e timeline senza errori.
- [ ] Esportare i log QA e allegarli al report finale.

## 5. Raccolta evidenze

- [ ] Salvare uno screenshot per ciascuno scenario (offline, mock, real) con timestamp visibile.
- [ ] Allegare i log JSON/CSV all'issue di QA.
- [ ] Annotare eventuali deviazioni o regressioni nel report giornaliero.

---

Per richiamare rapidamente questa checklist: `npm run webapp:qa`.
