# REF_PLANNING_RIPRESA_2026 – Checkpoint rapido di riapertura

Versione: 0.1
Data: 2026-01-02
Owner: **Master DD (owner umano)** con agente archivist (routing automatico attivo)
Stato: NOTE OPERATIVE – checklist per riattivare PATCHSET-01A → 03B

Scope della ripresa: riattivare i flussi preparatori su incoming/01A–03B senza introdurre nuove fonti dati o variazioni di scope rispetto ai reference già approvati.

---

## Obiettivi

- Definire un checkpoint compatto per riprendere il lavoro sui patchset 01A–03B senza riaprire l’intero ciclo di design.
- Allineare rapidamente owner, branch e log in `logs/agent_activity.md` prima di toccare dati o pack.
- Collegare le attività di riapertura ai riferimenti esistenti (`REF_REPO_SCOPE`, `REF_REPO_MIGRATION_PLAN`, `REF_INCOMING_CATALOG`).

## Prerequisiti lampo (da confermare entro 24h)

- **Owner e agenti:** Master DD conferma disponibilità; coordinator e archivist attivi per il kickoff; trait/species/balancer reperibili on-call.
- **Branch di lavoro:** creare/aggiornare branch dedicati per 01A–03B; nessun commit diretto su `main`.
- **Freeze:** confermare se il freeze soft su `incoming/**` e `docs/incoming/**` è ancora valido o se va riaperto (vedi `REF_INCOMING_CATALOG`).
- **Log:** verificare ultima voce in `logs/agent_activity.md`; aprire nuova entry con ID “RIAPERTURA-2026-01” prima di modificare tabelle.
- **Allineamento reference:** ristudiare `REF_REPO_SCOPE` e `REF_REPO_MIGRATION_PLAN` per validare che i gate 01A/01B/01C non richiedano aggiornamenti preliminari.
- **Stato ticketing:** verificare ticket aperti per 01A–03B e chiudere/aggiornare quelli già superati prima di pianificare nuovi step.

## Checklist di riapertura (48h)

1. **Kickoff rapido (coordinator):** convocare 15’ per ribadire scope PATCHSET-00 e i trigger fase 1→2→3 (`REF_REPO_MIGRATION_PLAN`).
2. **Stato catalogo incoming (archivist):** rileggere tabelle 01A e segnare gap list aperte; niente spostamenti file.
3. **Readiness owner per 01B/01C:** raccogliere conferma species-curator/trait-curator/dev-tooling su disponibilità e ticket aperti.
4. **Validare freeze + holding:** controllare se esistono nuovi drop in `incoming/_holding`; loggare decisione (integrare o archiviare) senza muovere file.
5. **Aggiornare README mirati:** se emergono variazioni, sincronizzare solo `incoming/README.md` e `docs/incoming/README.md` con note di stato e ticket.
6. **Gate di uscita riapertura:** una volta chiusi i punti 1–5, loggare in `logs/agent_activity.md` “RIAPERTURA-2026-01 chiusa” e passare alla pipeline 01A.

### Ruoli e responsabilità durante la riapertura

- **Owner (Master DD):** approva freeze/unfreeze, sblocca gate 1–6, valida note di rischio.
- **Coordinator:** governa kickoff, conferma routing degli agenti, mantiene la timeline.
- **Archivist:** fotografa stato `incoming/01A`, registra gap list, prepara update README.
- **Species/Trait-curator:** verificano readiness 01B/01C e validano matrice core/derived preliminare.
- **Dev-tooling:** prepara inventario workflow CI/script (report-only) e propone next step di automazione.

## Sequenza operativa express (dopo checklist)

- **01A (archivist, supporto coordinator/asset-prep):** riprendere triage tabelle con label DA_INTEGRARE/LEGACY/STORICO; aggiornare note di rischio.
- **01B (species-curator + trait-curator):** preparare matrice core/derived preliminare usando la gap list aggiornata; nessuna patch ai pack.
- **01C (dev-tooling):** inventario workflow CI + script locali con input/output; predisporre modalità report-only per validator futuri.

Deliverable minimi post-checklist:

- **Log riapertura** completo in `logs/agent_activity.md` (ID, owner, decisioni freeze, file toccati).
- **Gap list 01A** aggiornata e referenziata dai README mirati.
- **Nota di readiness 01B/01C** con elenco agenti on-call e ticket in carico.
- **Inventario tool CI/script** con stato “report-only” e puntamento a repository/script.

## Gate, log e comunicazioni

- Ogni micro-step deve avere log sintetico (ID, owner, file toccati, rischio) in `logs/agent_activity.md`.
- Decisioni su freeze o archiviazione devono citare il ticket/patchset e l’approvazione Master DD.
- Se si rilevano conflitti tra documenti di riferimento, fermarsi e aprire issue a coordinator prima di proseguire.
- Aggiornare i README solo dopo aver loggato l’esito del gate di riapertura, mantenendo coerenza con le note di freeze.

## Note rapide di rischio

- Riattivare patchset senza confermare il freeze può introdurre ingressi non tracciati → eseguire sempre controllo su `_holding`.
- Mancata sincronizzazione dei README può rendere invalida la gap list 01A → priorità alta agli aggiornamenti mirati post-triage.
- Evitare patch o spostamenti file fino alla chiusura del gate di riapertura; questa nota è solo per preparare la ripartenza.
- Mancanza di inventario CI/script può rallentare la pipeline 01C → produrre almeno un elenco “report-only” prima di riaprire validator.

---

## Changelog

- 2026-01-02: versione 0.1 – checkpoint di riapertura per riprendere i patchset 01A–03B senza modificare lo scope di riferimento.
