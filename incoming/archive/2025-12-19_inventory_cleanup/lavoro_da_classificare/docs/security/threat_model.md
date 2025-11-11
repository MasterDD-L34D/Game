# Threat Model – Evo‑Tactics

Questo documento riassume le potenziali minacce e le superfici d’attacco del progetto **Evo‑Tactics**, fornendo linee guida per la mitigazione dei rischi.

## Architettura ad alto livello

Il progetto è composto da:

* **Backend API:** server che espone endpoint REST/GraphQL per autenticazione, matchmaking, telemetria e gestione database.  Viene eseguito su infrastruttura cloud.
* **Database:** contiene dati di gioco (progresso, configurazioni, telemetria) e dati personali.  Accessibile solo tramite il backend con credenziali di servizio.
* **Client di gioco:** applicazione che gira sul dispositivo del giocatore, comunicando con l’API e caricando asset.
* **Webapp/Console:** interfaccia per dashboard e report, autenticata tramite ruoli.
* **CI/CD pipelines:** workflow GitHub che buildano, testano e distribuiscono l’applicazione.

## Potenziali minacce

| Minaccia                     | Descrizione e rischio                                                         | Mitigazioni                                                   |
|-----------------------------|-------------------------------------------------------------------------------|---------------------------------------------------------------|
| **Injection (SQL/NoSQL)**   | Attacchi che sfruttano input non sanificato per eseguire query maliziose.    | Validare e sanificare input; usare ORM con query parametrizzate; test di fuzzing. |
| **Exposure di secret**       | Commit di chiavi, token o password nel repo pubblico.                        | Usare GitHub Secrets/Vault; attivare secret scanning; rivedere le PR. |
| **XSS e CSRF**              | Script malevoli nella webapp o attacchi cross‑site request forgery.           | Applicare header di sicurezza (CSP, X‑Frame‑Options, SameSite); usare token CSRF. |
| **Privileged escalation**    | Utenti che ottengono permessi oltre il proprio ruolo.                        | Implementare RBAC, logging e audit; testare i controlli di accesso. |
| **DDoS e rate limiting**     | Sovraccarico dell’API con richieste massicce.                                | Abilitare rate limit, caching e meccanismi di throttling.     |
| **Leaks via telemetria**     | Invio di dati personali o sensibili tramite eventi.                          | Pseudonimizzazione, minimizzazione dati, crittografia TLS.    |
| **Supply‑chain attacks**     | Dipendenze compromesse che introducono codice malevolo.                      | Automatizzare verifiche (Dependabot, SCA), review manuale delle dipendenze. |

## Processo di threat modeling

1. **Identificazione degli asset:** dati utente, codice sorgente, infrastruttura, pipeline CI/CD.
2. **Elenco delle minacce:** individuare e classificare le minacce usando STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege).
3. **Analisi del rischio:** valutare probabilità e impatto di ogni minaccia; priorizzare le mitigazioni.
4. **Implementazione delle contromisure:** aggiornare la pipeline e il codice, definire controlli tecnici e procedurali.
5. **Verifica continua:** rieseguire threat modeling a ogni release major, documentare le modifiche e aggiornare il registro dei rischi.
