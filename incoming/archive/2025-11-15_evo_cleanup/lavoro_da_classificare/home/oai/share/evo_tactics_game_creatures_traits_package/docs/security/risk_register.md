# Registro dei rischi – Evo‑Tactics

Questo registro tiene traccia dei rischi individuati, valutati e gestiti durante lo sviluppo del progetto.  Ogni rischio è identificato con un ID univoco e aggiornato quando cambia il livello di rischio o la mitigazione.

| ID   | Descrizione della minaccia                      | Prob. | Impatto | Livello | Mitigazioni                                      | Stato        |
|------|--------------------------------------------------|-------|---------|---------|--------------------------------------------------|-------------|
| R‑01 | Exposure di credenziali nel repo                | Alta  | Alto    | Critico | Secret scanning attivo, review manuale PR, vault | Mitigato    |
| R‑02 | Iniezione SQL/NoSQL via input utente            | Media | Alto    | Alto    | Validazione input, query parametrizzate          | In corso    |
| R‑03 | Compromissione di dipendenze di terze parti      | Media | Medio   | Medio   | Dependabot, review dipendenze, lockfile          | Monitorato  |
| R‑04 | Furto di dati personali tramite API non sicure   | Bassa | Alto    | Medio   | Crittografia TLS, autenticazione forte, pseudonimizzazione | Aperto      |
| R‑05 | Sovraccarico di servizio (DDoS, abusi API)       | Bassa | Medio   | Basso   | Rate limiting, caching, WAF                      | Pianificato |

**Legenda:**

* **Prob.** – Probabilità di accadimento (Bassa/Media/Alta)
* **Impatto** – Severità in caso di realizzazione (Basso/Medio/Alto)
* **Livello** – Combinazione di Prob. e Impatto (Critico/Alto/Medio/Basso)
* **Stato** – Mitigato/In corso/Monitorato/Pianificato/Aperto

Aggiornare questo registro regolarmente, assegnando un owner a ciascun rischio e definendo una data di revisione.
