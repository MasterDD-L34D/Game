# Procedura post-sessione di playtest

Questa procedura descrive i passaggi da completare immediatamente dopo ogni sessione di playtest.

## 1. Creazione documentazione della sessione
1. Copiare il template `SESSION-template.md` e rinominarlo in `SESSION-YYYY-MM-DD.md` nella cartella `docs/playtest/`.
2. Compilare tutte le sezioni con i dati raccolti (partecipanti, scenari eseguiti, metriche, sintesi feedback).
3. Allegare alla sezione finale i link o i percorsi ai log, screenshot e registrazioni.

## 2. Archiviazione materiali
1. Creare la cartella `logs/SESSION-YYYY-MM-DD/` (o equivalente specificata nel piano di sessione).
2. Salvare in cartella:
   - Log di gioco esportati e file telemetrici.
   - Screenshot e registrazioni video rinominati con convenzione `SCENARIO-ID_descrizione_estensione`.
   - Feedback compilati (`feedback-template.md`) in sottocartella `feedback/`.
3. Verificare che i file siano sincronizzati con il drive condiviso (se applicabile).

## 3. Gestione bug
1. Rivedere la lista problemi emersi con il QA Lead.
2. Per ogni bug confermato relativo agli incontri o al bilanciamento, aprire una issue sul tracker e applicare l'etichetta `encounter-balance`.
3. Collegare l'issue alla sessione di playtest (riferimento al documento `SESSION-YYYY-MM-DD.md`).

## 4. Retrospettiva breve
1. Annotare nel documento della sessione eventuali follow-up necessari (design, engineering, narrative).
2. Programmare una riunione di revisione se il numero di bug critici supera la soglia concordata.

Seguire questa procedura garantisce tracciabilità e coerenza nella raccolta dati dei playtest.
