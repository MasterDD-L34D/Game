# Checklist Triage Cartella `incoming/`

## Pre-sync (T-1 giorno)
- [ ] `AG-Orchestrator` apre il Support Hub (`docs/index.html`) → sezione "Incoming Pipeline" e verifica che il widget "Ultimo report triage" confermi la chiusura dei follow-up della sessione precedente.
- [ ] `AG-Orchestrator` esegue `./scripts/report_incoming.sh --destination sessione-AAAA-MM-GG`.
- [ ] `AG-Orchestrator` pubblica report HTML/JSON nel canale `#incoming-triage-agenti`.
- [ ] `AG-Orchestrator` menziona gli agent caretaker con elenco asset da revisionare.
- [ ] `AG-Toolsmith` verifica spazio libero per decompressioni temporanee (`/tmp`).
- [ ] `AG-Orchestrator` aggiorna board Kanban con nuove card in `Da analizzare`.

## Durante la sync
- [ ] `AG-Validation` condivide vista filtrata del report.
- [ ] `AG-Orchestrator` compila il template (`docs/templates/incoming_triage_meeting.md`).
- [ ] Ogni agente di dominio assume ownership esplicita.
- [ ] `AG-Orchestrator` registra dipendenze (compatibilità Enneagramma, hook telemetria, ecc.).
- [ ] Viene concordata l'etichetta: `Da integrare`, `Archivio storico`, `Scarto`.

## Post-sync (entro 24h)
- [ ] `AG-Orchestrator` sposta i file nelle cartelle definite (§3 del playbook).
- [ ] L'agente owner apre issue/PR per asset `Da integrare` con link al report.
- [ ] `AG-Orchestrator` aggiorna `incoming/archive/INDEX.md` per ogni elemento archiviato.
- [ ] `AG-Orchestrator` aggiorna board Kanban (colonna, owner, due date).
- [ ] `AG-Orchestrator` aggiorna knowledge base con summary e follow-up.
- [ ] `AG-Orchestrator` aggiorna il widget del Support Hub compilando `docs/process/incoming_review_log.md` con data e report corretti.

## Controlli periodici
- [ ] Ogni sprint: `AG-Orchestrator` rivede backlog `In integrazione` e pianifica sprint tematici.
- [ ] Ogni mese: `AG-Toolsmith` aggiorna lo stato manutenzione tool (log in `docs/process/tooling_maintenance_log.md`).
- [ ] Ogni quarter: `AG-Orchestrator` + agenti di dominio conducono retrospettiva asset in `Archivio`.
