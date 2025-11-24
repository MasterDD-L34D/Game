# REF_REPO_MIGRATION_PLAN – PATCHSET-00

Versione: 0.4 (sequenza 01A–03B con trigger espliciti)
Data: 2025-11-23
Owner: Laura B. (supporto: coordinator, dev-tooling)
Stato: DRAFT – sequenza 01A–03B in attesa di approvazione

---

## Sequenza proposta (GOLDEN_PATH Fasi 1–4)

- 01A – Catalogo incoming (`REF_INCOMING_CATALOG`, README incoming/docs): criteri di successo = tabella completa, stati assegnati; rollback = nessuna modifica ai file sorgente.
- 01B – Core vs derived/pack (`REF_PACKS_AND_DERIVED`, `REF_REPO_SOURCES_OF_TRUTH`): criteri di successo = mappa relazioni e gap; rollback = mantenere solo documentazione.
- 02A – Validazioni/schema (checklist in `REF_TOOLING_AND_CI`): criteri di successo = check-list approvata con comandi; rollback = disabilitare esecuzioni automatiche.
- 02B – Allineamento core/pack: dipende da 01A/01B/02A; criteri di successo = regola di rigenerazione concordata.
- 03A – Esecuzione validazioni e rigenerazione simulata; 03B – Applicazione patch operative (solo dopo gate umano).

## Dipendenze e trigger

- 02A dipende dalla chiusura di 01A e 01B (catalogo + mappa core/derived/pack).
- 03A richiede 02A approvata; 03B richiede esiti positivi di 03A e conferma owner umano.
- Ogni step deve citare la fase (es. “01A approvata”) e registrare log in `logs/agent_activity.md`.
- Branch dedicato per ogni PATCHSET, con gate incrociati prima di toccare dati/tooling.

## Governance

- Stato corrente: PATCHSET-00 in PROPOSTA, versione 0.4 design-completato e inventario 01A pronto.
- Owner umano: Laura B.; agenti di supporto: coordinator, dev-tooling.
- Logging: `logs/agent_activity.md` per ogni avanzamento e per i test dry-run di 03A.

## Checklist di uscita/ingresso

- Uscita 01A: catalogo incoming completato e condiviso; nessun file spostato.
- Uscita 01B: mappa core/derived/pack con gap noti e riferimenti a tooling; pronta per 02A/02B.
- Uscita 02A: checklist validazioni approvata con comandi concreti; nessuna modifica ai dati.
- Ingresso 03A: branch dedicato, dry-run validazioni con log; 03B solo dopo conferma owner.

## Changelog

- v0.4 – Trigger e checklist ingresso/uscita esplicitati; ribaditi branch/gate/log e stato PROPOSTA v0.4.
- v0.3 – Sequenza 01A–03B formalizzata con dipendenze/trigger, criteri di successo e rollback; governance ribadita.
- v0.2 – Stato design completato, numerazione PATCHSET-00 allineata a 01A–03B.
- v0.1 – Stub iniziale.
