# Politica di sicurezza e privacy

Questa politica descrive i principi e le procedure per garantire la sicurezza delle informazioni e la protezione dei dati personali all’interno del progetto **Evo‑Tactics**.  La sua applicazione è obbligatoria per tutti i membri del team e le controparti che hanno accesso al codice, ai dataset o ai sistemi di produzione.

## Principi guida

1. **Sicurezza by design:** integrare la sicurezza in ogni fase dello sviluppo (pianificazione, implementazione, test, distribuzione) seguendo il modello Secure SDLC【784092807998978†L3036-L3113】.
2. **Minimizzazione dei dati:** raccogliere solo i dati strettamente necessari e conservarli per il tempo minimo richiesto, anonimizzando o pseudonimizzando quando possibile.
3. **Gestione dei rischi:** identificare, valutare e mitigare i rischi attraverso un registro aggiornato e un programma di threat modeling periodico.
4. **Controlli di accesso:** applicare il principio del minimo privilegio e utilizzare l’autenticazione multifattore per gli ambienti di produzione.  Le chiavi, i token e i secret non devono mai essere committati nel repository.
5. **Trasparenza e responsabilità:** documentare le procedure, monitorare gli incidenti e comunicare tempestivamente eventuali violazioni.

## Raccolta e trattamento dei dati

* **Telemetria di gioco:** i dati raccolti (eventi di gioco, tiri, scelte) sono utilizzati esclusivamente per migliorare il bilanciamento e l’esperienza del giocatore.  Sono aggregati in forma anonima e conservati per un massimo di 90 giorni.
* **Dati personali:** eventuali informazioni identificative (es. nickname, indirizzo email) sono conservate separatamente, crittografate e accessibili solo a personale autorizzato.  Non vengono condivise con terze parti senza consenso esplicito.
* **Cookie e analytics:** la webapp utilizza cookie solo per sessioni e analytics interni; non vengono utilizzati tracker di terze parti per profilazione.

## Controlli di sicurezza

* **Analisi statica e scansioni:** i workflow CI/CD includeranno scansioni SAST (Bandit per Python, ESLint/Semgrep per TS), scansioni delle dipendenze (Dependabot, `npm audit`) e secret scanning.
* **Gestione dei secret:** utilizzare GitHub Actions `secrets` o un vault esterno per gestire token e chiavi.  È vietato committare credenziali o chiavi API.
* **Hardening della configurazione:** configurare correttamente server, database e servizi (es. CORS limitati, rate limiting, logging con rotazione).  Monitorare costantemente log e allarmi.
* **Backup e ripristino:** implementare backup regolari dei dati essenziali e testare procedure di ripristino.

## Responsabilità e ruoli

* **Security Officer:** nominare un responsabile della sicurezza incaricato di mantenere la politica, supervisionare le analisi dei rischi e coordinare la risposta agli incidenti.
* **Sviluppatori:** devono aderire alle linee guida di secure coding, eseguire i test di sicurezza e rimediare prontamente alle vulnerabilità.
* **DevOps:** garantire la sicurezza nelle pipeline, gestire secret e configurazioni, monitorare i sistemi.

## Revisioni e audit

La presente politica viene revisionata ogni 6 mesi o in occasione di modifiche sostanziali al progetto.  Ogni variazione viene documentata e comunicata al team.
