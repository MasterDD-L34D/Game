# Checklist Triage Cartella `incoming/`

## Pre-meeting (T-1 giorno)
- [ ] Eseguire `./scripts/report_incoming.sh --destination sessione-AAAA-MM-GG`.
- [ ] Caricare report HTML/JSON nella calendar invite o nel canale `#incoming-triage`.
- [ ] Ping dei caretaker con elenco asset da revisionare.
- [ ] Verificare spazio libero per decompressioni temporanee (`/tmp`).
- [ ] Aggiornare board Kanban: nuove card in `Da analizzare` per asset arrivati durante la settimana.

## Durante il meeting
- [ ] Aprire il report HTML (ordine per esito validazione).
- [ ] Annotare decisioni su template meeting (`docs/templates/incoming_triage_meeting.md`).
- [ ] Assegnare owner/caretaker per ogni asset.
- [ ] Identificare dipendenze (es. compatibilità Enneagramma, hook telemetria).
- [ ] Decidere etichetta: `Da integrare`, `Archivio storico`, `Scarto`.

## Post-meeting (entro 24h)
- [ ] Spostare fisicamente i file nelle cartelle definite (§3 del playbook).
- [ ] Aprire issue/PR per asset `Da integrare` con link al report.
- [ ] Aggiornare `incoming/archive/INDEX.md` per ogni elemento archiviato.
- [ ] Aggiornare board Kanban (colonna, owner, due date).
- [ ] Aggiornare knowledge base con summary e follow-up.

## Controlli periodici
- [ ] Ogni sprint: rivedere backlog `In integrazione` per pianificare sprint tematici.
- [ ] Ogni mese: verificare stato manutenzione tool (log in `docs/process/tooling_maintenance_log.md`).
- [ ] Ogni quarter: retrospettiva asset in `Archivio` per recuperare idee.
