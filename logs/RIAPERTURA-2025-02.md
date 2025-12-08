# RIAPERTURA-2025-02 – Verifica branch 01B/01C e readiness (report-only)

## Sintesi esito
- **Branch dedicati assenti**: `patch/01B-core-derived-matrix` e `patch/01C-tooling-ci-catalog` non risultano presenti né localmente né sui remoti monitorati al momento della verifica.
- **Disponibilità owner confermata**: species-curator e trait-curator restano on-call per 01B (matrice core/derived), dev-tooling on-call per 01C (tooling/CI), con operatività **report-only** sui branch dedicati.
- **Ticket attivi invariati**: 01B → `TKT-01B-001`, `TKT-01B-002`; 01C → `TKT-01C-001`, `TKT-01C-002`. Nessuna variazione di scope/owner segnalata.
- **Freeze/unfreeze**: si mantiene il perimetro della finestra documentale 06/10/2025 → 13/10/2025; le attività restano **report-only fino a unfreeze** esplicito.
- **Sync confermativo programmato/eseguito**: mantenuto il kickoff 15' con owner=coordinator e partecipazione di archivist, trait-curator e species-curator per riaffermare il trigger Fase 1→2→3 e la milestone **07/12/2025**; nessuna variazione di durata/owner registrata.

## Dettaglio verifica
- **Controllo branch**: eseguito `git branch -a --list 'patch/01B-core-derived-matrix' 'patch/01C-tooling-ci-catalog'` e `git branch -r --list 'patch/01B-core-derived-matrix' 'patch/01C-tooling-ci-catalog'` → nessuna corrispondenza trovata.
- **Conferma owner/ticket**: fonti di stato (`reports/readiness_01B01C_status.md`, `docs/planning/REF_PLANNING_RIPRESA_2026.md`) confermano che 01B/01C sono in modalità report-only con owner species-curator/trait-curator/dev-tooling e ticket TKT-01B-001/002, TKT-01C-001/002.
- **Stato operativo**: mantenere logging in STRICT MODE; non aprire nuovi drop o modifiche finché l’unfreeze della finestra 06/10/2025 → 13/10/2025 non viene registrato.

## Azioni suggerite (senza esecuzione)
- Ricreare i branch dedicati da HEAD autorizzato prima del prossimo batch report-only.
- Aggiornare `logs/agent_activity.md` se viene emessa una decisione di unfreeze o se vengono riattivati i branch.

## Checklist PIPELINE 01A (pre-meeting)
- [ ] `logs/agent_activity.md` aggiornato con l'ultimo handoff rilevante.
- [ ] Cartella `_holding/` vuota (nessun drop in sospeso).
- [ ] Trait-curator: conferma prerequisiti dati/trait per l'avvio di 01A.
- [ ] Species-curator: conferma prerequisiti specie collegati a 01A.
- [ ] Checklist condivisa ai partecipanti prima del meeting.

## 2026-09-20 – Kickoff PATCHSET-00 e gate verso pipeline 01A (coordinator)
- Step: `[RIAPERTURA-2025-02-KICKOFF-2026-09-20T0000Z] owner=coordinator (con archivist, trait-curator, species-curator; approvatore Master DD); scope=PATCHSET-00; timeline=07/12/2025; durata=15'`; riferimento agenda: `docs/planning/agenda_PATCHSET-00_2025-12-07.md`.
- Decisioni: confermato trigger sequenziale Fase 1→Fase 2→Fase 3, perimetro invariato in STRICT MODE, readiness log/README gestita da archivist; trait-curator e species-curator on-call per prerequisiti 01A.
- Prossimo gate: `PIPELINE 01A → Fase 1` (handoff post-kickoff); prerequisiti: log aggiornati (`logs/agent_activity.md`), nessun drop nuovo in `_holding`, freeze 06/10/2025→13/10/2025 rispettato.
