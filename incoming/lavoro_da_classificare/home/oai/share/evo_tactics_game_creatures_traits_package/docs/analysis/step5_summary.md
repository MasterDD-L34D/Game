# Step 5 – Integrazione della gestione della sicurezza (Secure SDLC)

## Analisi dello stato attuale

Il repository Evo‑Tactics non contiene documentazione esplicita di threat modeling o risk assessment, né script dedicati alla scansione di sicurezza. Le pipeline CI/CD, pur solide, si concentrano su build, test e validazioni funzionali; non sono presenti controlli per vulnerabilità di dipendenze, analisi statica di sicurezza, rilevamento di segreti o procedure di risposta agli incidenti. Non vi è traccia di misure per la protezione dei dati dei giocatori o per l’adempimento del GDPR.

Le best practice per lo sviluppo sicuro del software suggeriscono di integrare la sicurezza in tutte le fasi del ciclo di vita attraverso analisi dei rischi, threat modeling, controlli di sicurezza automatizzati e pianificazione della risposta agli incidenti【784092807998978†L3036-L3113】. È quindi necessario definire un Secure Software Development Lifecycle (Secure SDLC) adattato al progetto e al team.

## Proposte di integrazione della sicurezza

1. **Definizione di una politica di sicurezza e privacy**
   - **Politica di sicurezza interna**: redigere un documento che definisca gli obiettivi di sicurezza (riservatezza, integrità, disponibilità), le responsabilità del team e le normative applicabili (es. GDPR per la gestione dei dati dei giocatori).  
   - **Policy di gestione dei segreti**: stabilire linee guida su come gestire API key, token e credenziali, prevedendo l’uso di GitHub Secrets e `.env` non versionati.  
   - **Modello di minacce**: creare un threat model che identifichi superfici di attacco (servizi web, database di telemetria, file di configurazione) e mitigazioni. Può essere un diagramma con attori, risorse e flussi di dati.

2. **Analisi dei rischi e threat modeling**【784092807998978†L3036-L3113】
   - **Risk assessment periodico**: definire un processo per valutare periodicamente i rischi e classificare le vulnerabilità in base a impatto e probabilità. Utilizzare checklist o strumenti come OWASP SAMM per strutturare l’analisi.  
   - **Threat modeling all’inizio di ogni feature**: prima dello sviluppo di nuove funzionalità (es. telemetria, overlay HUD) redigere uno scenario di minacce e assicurarsi che le contromisure siano implementate (es. rate‑limiting, autenticazione).  
   - **Tracciabilità**: documentare i rischi identificati e lo status delle mitigazioni in un registro (es. file `docs/security/threat_register.md`).

3. **Automazione dei controlli di sicurezza nella CI/CD**
   - **SAST (Static Application Security Testing)**: integrare strumenti come `bandit` per Python e `eslint --plugin security` o `npm audit` per il codice TypeScript. Questi strumenti analizzano il codice sorgente e segnalano pattern vulnerabili (injection, uso improprio di librerie, etc.).  
   - **Dependency scanning**: aggiungere step a GitHub Actions che eseguano `pip-audit` per le dipendenze Python e `npm audit` per pacchetti Node. È utile anche configurare GitHub Dependabot per aggiornare automaticamente le dipendenze vulnerabili.  
   - **Secret scanning**: configurare `truffleHog` o `gitleaks` per scansionare il repository alla ricerca di segreti accidentalmente committati. GitHub offre una funzionalità di secret scanning integrata che può essere abilitata.  
   - **Analisi Code QL**: attivare l’azione GitHub `codeql` (gratuita per progetti open source) per eseguire analisi avanzate su Python e JavaScript/TypeScript.  
   - **Check di conformità alle policy**: integrare script che verificano l’aderenza alle policy di sicurezza (es. assenza di dati personali nei log, uso di protocolli cifrati).  
   - **Pipeline di sicurezza dedicata**: creare un workflow `security.yml` che si attivi su ogni push/PR per eseguire tutti i controlli sopra. Questo workflow potrà fallire la build se vengono rilevate vulnerabilità gravi.

4. **Protezione dei dati e privacy**
   - **Minimizzazione dei dati**: assicurarsi che i file di telemetria raccolgano solo dati necessari al game design.  
   - **Pseudonimizzazione**: implementare meccanismi per anonimizzare gli ID dei giocatori nei log e nei report.  
   - **Gestione consensi**: documentare (nel GDD e nell’app) come viene richiesto e registrato il consenso al trattamento dei dati.  
   - **Crittografia in transito e a riposo**: utilizzare HTTPS per le API e crittografare i database dove sono conservate statistiche e telemetria.  
   - **Piano di retention**: definire la durata di conservazione dei dati di telemetria e la procedura per la loro cancellazione automatica.

5. **Formazione e cultura della sicurezza**
   - Organizzare sessioni interne per formare il team su secure coding, OWASP Top 10, gestione dei segreti e privacy.  
   - Predisporre un canale dedicato (es. chat o board del progetto) per comunicare vulnerabilità, aggiornamenti di sicurezza e best practice.  
   - Prevedere code review con checklist di sicurezza (Injection, XSS, gestione errori, logging sicuro).  
   - Incorporare la verifica della sicurezza nei criteri di accettazione delle user stories.

6. **Piano di risposta agli incidenti**
   - Definire una procedura da seguire in caso di violazione della sicurezza: rilevamento, contenimento, analisi, recupero e comunicazione.  
   - Preparare un documento di contingenza e un team responsabile con ruoli chiari.  
   - Eseguire esercitazioni periodiche per testare la prontezza del team.

## Prossimi passi

- Creare una directory `docs/security/` nel repository (da realizzare tramite commit) in cui collocare:  
  - la **politica di sicurezza e privacy**,  
  - il **threat model** (diagramma e descrizione delle superfici di attacco),  
  - il **registro dei rischi** con stato aggiornato,  
  - il **piano di risposta agli incidenti**.  
- Implementare il workflow `security.yml` in `.github/workflows/` per automatizzare i controlli (SAST, dependency auditing, secret scanning).  
- Configurare e abilitare GitHub Dependabot, secret scanning e Code QL dalle impostazioni del repository.  
- Aggiornare la documentazione dell’onboarding per includere la formazione sulla sicurezza.

## Conclusioni

Integrare la sicurezza nel ciclo di vita del progetto Evo‑Tactics non è un compito una tantum ma un processo continuo. Creando politiche chiare, effettuando threat modeling e risk assessment regolari e automatizzando i controlli nelle pipeline, è possibile ridurre drasticamente la superficie d’attacco e aumentare la fiducia degli utenti. Seguendo le linee guida del Secure SDLC【784092807998978†L3036-L3113】, il team potrà prevenire vulnerabilità e proteggere i dati dei giocatori fin dalle prime fasi di sviluppo.
