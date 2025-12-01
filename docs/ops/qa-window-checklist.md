# QA Activation Window Checklist

## Scopo
Runbook per gestire l'attivazione in finestra QA con controlli su calendario, smoke test e tracciamento dei ticket #1204/#1205.

## Prerequisiti
- Finestra QA primaria e finestra di fallback visibili nel calendario operativo.
- Accesso agli script/suite di smoke test e ai log dell'ambiente target.
- Ticket #1204 e #1205 aperti e assegnati all'owner dell'attività.

## Procedura
### 1. Verifica finestra QA
- Recupera la data/ora proposta e confrontala con la finestra QA **primaria** e la finestra **fallback**.
- Se c'è conflitto o overlap con una finestra QA già prenotata, ripianifica sul prossimo slot libero (aggiorna anche la finestra di fallback).
- Conferma agli stakeholder la finestra effettiva e la finestra di fallback riservata.

### 2. Smoke test pre-applicazione
- Rilancia la suite di smoke test sull'ambiente target prima di applicare modifiche.
- Se emergono esiti `FAIL`/`ERROR`, **non avanzare di gate**: interrompi l'attivazione, apri follow-up con il team tecnico e valuta una nuova pianificazione.
- Annota orario di esecuzione e log di riferimento.

### 3. Applicazione
- Procedi con l'attivazione solo se la verifica di calendario e il smoke test pre-applicazione sono andati a buon fine.
- Monitora l'ambiente per eventuali anomalie durante l'applicazione e prepara il piano di rollback.

### 4. Smoke test post-applicazione
- A fine attività, rilancia la stessa suite di smoke test.
- In caso di `FAIL`/`ERROR`, **non avanzare di gate** e valuta immediatamente il rollback. Segnala al team QA/ops con log e orari.

### 5. Logging su ticket #1204 / #1205
- Registra su entrambi i ticket:
  - finestra QA utilizzata (primaria o fallback) con orario di inizio/fine;
  - esito del smoke test **pre** (pass/fail, timestamp, link log);
  - esito del smoke test **post** (pass/fail, timestamp, link log);
  - eventuali ripianificazioni o rollback eseguiti.
- Chiudi il controllo QA solo dopo aver registrato gli esiti su entrambi i ticket.

### 6. Chiusura
- Conferma che i gate QA sono passati (entrambi gli smoke in `PASS`).
- Condividi breve riepilogo nel canale operativo e archivia i log secondo le policy del team.
