# Piano di risposta agli incidenti

Questo piano descrive le procedure da seguire in caso di incidente di sicurezza (es. fuga di dati, compromissione di account, violazioni di sistema) all’interno del progetto **Evo‑Tactics**.

## Obiettivi

* Ridurre al minimo l’impatto sull’organizzazione e sugli utenti.
* Ripristinare rapidamente la disponibilità dei servizi.
* Preservare l’integrità delle prove per analisi forense.
* Comunicare con chiarezza e trasparenza alle parti interessate.

## Fasi del processo

1. **Identificazione:**
   * Rileva l’incidente tramite log, alert o segnalazioni esterne.
   * Classifica la gravità e la tipologia dell’incidente.
   * Notifica immediatamente il Security Officer e il team di risposta.

2. **Contenimento:**
   * Isola i sistemi compromessi (es. revoca chiavi, disconnessione servizi).
   * Attiva le procedure di failover o backup.
   * Blocca account o sessioni sospette.

3. **Eradicazione e recupero:**
   * Identifica la causa principale e rimuovi il malware/vettore.
   * Aggiorna le configurazioni o patch per prevenire il ripetersi.
   * Ripristina i sistemi da backup sicuri.

4. **Comunicazione:**
   * Informa gli stakeholder interni ed esterni (potenzialmente gli utenti) in modo appropriato.
   * Collabora con le autorità competenti se necessario.

5. **Post‑mortem:**
   * Documenta l’incidente, le azioni intraprese e le lezioni apprese.
   * Aggiorna le policy e il threat modeling in base alle nuove informazioni.
   * Valuta l’efficacia del piano e migliora le procedure.

## Contatti e responsabilità

* **Security Officer:** coordinate le azioni e prende decisioni operative.
* **Team DevOps:** gestisce l’isolamento e il ripristino dei servizi.
* **Legale/Comunicazione:** gestisce le comunicazioni ufficiali, verifica gli obblighi di notifica.

Tenere aggiornata la lista dei contatti e fornire formazione periodica al team.
