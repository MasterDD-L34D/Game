# Piano di rollout trait editor & revisione

Questo piano coordina il lancio delle nuove funzionalità trait (editor collaborativo,
report di validazione e processo di revisione esteso) assicurando che i team
interessati siano pronti e che il rollout sia monitorato passo-passo.

## Fasi di rollout

| Fase | Finestra | Obiettivi principali | Owner | Dipendenze |
| --- | --- | --- | --- | --- |
| Preparazione | 15-22 gennaio | Finalizzare backlog v1.0, chiudere bug critici, validare dati di partenza | Trait Ops | QA per checklist v1.0 |
| Pilot interno | 23-29 gennaio | Abilitare editor e report al team gioco, raccogliere feedback guidato | Game Design | Sessioni training completate |
| Rollout controllato | 30 gennaio - 5 febbraio | Aprire l'accesso ai team Lore & Analytics, monitorare metriche e issue | Trait Ops + Analytics | Action items pilot |
| General availability | 6 febbraio | Estendere a tutti i redattori, comunicare note di rilascio e supporto | Publishing | Tutte le correzioni prioritarie |

## Checklist di readiness

### Prima di v1.0 (Preparazione)
- [ ] QA approvato per editor (`tests/traits_editor_spec.js`) e pipeline di revisione (`tests/review_flow.test.ts`).
- [ ] Dataset iniziale validato con `scripts/traits/validate_catalog.py` e log archiviati in `logs/trait_rollout/`.
- [ ] Documentazione aggiornata: `docs/traits_template.md`, `docs/process/trait_review.md`, nuove guide inline in editor.
- [ ] Supporto on-call confermato (Trait Ops + Tooling) per la prima settimana di pilot.

### Prima di apertura al pilot
- [ ] Calendario training completato e conferme di partecipazione raccolte dal team gioco.
- [ ] Report di validazione (`reports/traits/validation_summary.md`) consegnato con stato "green".
- [ ] Canale `#trait-rollout` creato con routing automatico dalle nuove form di feedback.

### Prima della disponibilità generale
- [ ] KPI di pilot ≥ 90% soddisfazione, < 5% issue bloccanti rilevate.
- [ ] Playbook incident (`docs/process/incident_reporting_table.md`) aggiornato con scenari trait.
- [ ] Checklist localizzazione (`docs/process/localization.md`) applicata per i nuovi label.
- [ ] `reports/trait_texts.json` generato dal nuovo flusso glossario + sync e condiviso con Localization.
- [ ] Piano di comunicazione GA approvato da Publishing e Game Design.

## Coordinamento training team di gioco

| Sessione | Data | Focus | Format | Facilitatori | Partecipanti target |
| --- | --- | --- | --- | --- | --- |
| Editor collaborativo | 23 gennaio, 10:00-12:00 | Navigazione, template, suggerimenti | Workshop live + demo registrata | Tooling (M. Bianchi) | Game designers, narrative leads |
| Report & dashboard | 24 gennaio, 15:00-16:30 | Lettura report QA, esportazioni, tag alert | Live demo + Q&A | Analytics (S. Russo) | QA gameplay, Game Design |
| Processo di revisione | 25 gennaio, 11:00-12:30 | Flusso review, checklist, escalation | Esercitazione guidata | Trait Ops (F. Conti) | Trait reviewers, coordinatori squad |

Azioni correlate:
- Inviti calendario inviati entro il 17 gennaio con allegato materiale pre-lettura (`docs/traits_template.md`).
- Registrazioni caricate su Drive/Canvas entro 24h dalla sessione.
- Sondaggio post-training automatizzato via `forms/training_feedback.json`.

## Calendario versioni

| Versione | Finestra rilascio | Milestone | Criteri di completamento |
| --- | --- | --- | --- |
| v1.0 Pilot | 23 gennaio | Editor e report disponibili al team gioco, onboarding completato | Tutti i test automatici verdi, checklist Preparazione e Pilot completate, zero bug P0 aperti |
| v1.1 Rollout controllato | 30 gennaio | Accesso cross-team, integrazione analytics | KPI pilot soddisfatti, integrazione Slack automation attiva, backlog P1 ≤ 3 |
| v1.2 GA | 6 febbraio | Disponibilità generale, comunicazioni pubbliche | KPI rollout controllato verdi, training completati per nuovi utenti, supporto L2 coperto |

## Impatti cross-team

| Team | Impatti | Supporto richiesto |
| --- | --- | --- |
| Game Design | Aggiornamento flussi editor, nuove metriche di revisione | Partecipare ai training, validare backlog priorità |
| Narrative & Lore | Revisione etichette e descrizioni, dipendenza da localizzazione | Coordinare aggiornamenti con Localization, fornire feedback sulla UX |
| Analytics | Manutenzione report, monitoraggio KPI | Configurare dashboard `reports/traits/` e alert BigQuery |
| Publishing | Comunicazioni, note di rilascio, supporto post-GA | Preparare post interno, aggiornare guide per redattori |
| Tooling | Manutenzione editor, pipeline CI | Monitorare logs, reagire agli incidenti, supportare QA |

## Monitoraggio e comunicazione post-rollout
- Issue tracker: tab "Trait Rollout" in `incoming_agent_backlog.md` con triage giornaliero.
- Post interno: aggiornare `docs/publishing_calendar.md` con annuncio GA e reminder supporto.
- Canali Slack: `#trait-rollout` per supporto operativo, `#analytics-alerts` per segnalazioni KPI.
- Report settimanale: sintesi in `reports/traits/rollout_status.md` condivisa ogni lunedì.
