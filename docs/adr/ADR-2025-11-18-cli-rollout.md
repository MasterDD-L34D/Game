# ADR-2025-11-18: Rollout refactor CLI e onboarding Support/QA

- **Data**: 2025-11-09
- **Stato**: Proposto
- **Owner**: Lead Dev Platform
- **Stakeholder**: Team Tools, Support, QA, Narrative Ops, Analytics

## Contesto
Il consolidamento del refactor CLI (ADR-2025-11) è pronto per l'adozione completa da parte dei team Support/QA durante le sessioni di onboarding del 18 novembre 2025. È necessario definire criteri di rollout, materiali formativi e meccanismi di feedback per garantire continuità operativa e conformità con le nuove policy di log e telemetria.

## Decisione
1. **Abilitare distribuzione graduale** con finestra di test dal 2025-11-11 al 2025-11-17, utilizzando i profili `playtest`, `telemetry` e `support` aggiornati (`config/cli/*.yaml`).
2. **Standardizzare la reportistica CLI** archiviando i log quotidiani in `logs/cli/<data>.log` e allegandoli alle checklist di progetto (`docs/checklist/`).
3. **Vincolare l'accesso ai token** all'esito positivo degli smoke test (`scripts/cli_smoke.sh`) eseguiti da Support/QA entro il 2025-11-16.
4. **Integrare l'onboarding** con materiali dedicati (`docs/presentations/2025-11-18-onboarding.md`, registrazioni e FAQ) e raccolta feedback tramite form condiviso entro il giorno successivo alla sessione.

## Conseguenze
- Richiede aggiornamento delle sezioni procedurali in `docs/README.md` e `docs/piani/roadmap.md` con i checkpoint CLI.
- I team Support/QA devono confermare la disponibilità dei log e dei token prima di operare sui playtest post-onboarding.
- La pipeline Drive Sync deve accettare i nuovi metadati CLI per garantire la tracciabilità dei report.

## Azioni di follow-up
- [ ] Concludere i test di tutti i profili CLI e documentare gli esiti in `docs/chatgpt_sync_status.md`.
- [ ] Allegare alle slide onboarding gli script aggiornati e la guida rapida CLI.
- [ ] Aggiornare `docs/faq.md` con le domande raccolte durante la retro Support/QA del 2025-11-12.
