# REF_REPO_PATCH_PROPOSTA – Applicazione iniziale dello scope

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **archivist** (coordinamento con coordinator/dev-tooling)
Stato: PROPOSTA – patch da validare

---

## Obiettivo

Tradurre `REF_REPO_SCOPE` in **PATCHSET-00**: una proposta neutrale che non altera i dati core ma prepara la struttura di documentazione e cataloghi per i refactor successivi.

## Stato attuale

- Deliverable proposti sono limitati a documentazione e mappature, senza toccare `data/core/**`, `packs/**` o tooling.
- Gli stub richiesti in §6.1 di `REF_REPO_SCOPE` esistono ma vanno completati con sezioni operative.
- Le cartelle `incoming/` e `docs/incoming/` sono solo censite; manca una tabella di stato condivisa.

## Rischi

- Mancata approvazione o ambiguità di scope potrebbero bloccare PATCHSET-01/02.
- Rischio di duplicare mappature se le tabelle di incoming non sono uniche e versionate.
- Se gli owner non sono nominati per ogni deliverable, le sezioni restano senza manutenzione.

## Dipendenze

- `REF_REPO_SCOPE` come bussola di perimetro e vincoli (STRICT MODE, Golden Path).
- Coordinamento con `REF_REPO_MIGRATION_PLAN` per sequenziare PATCHSET-01/02.
- Allineamento con `REF_INCOMING_CATALOG` e `REF_PACKS_AND_DERIVED` per evitare sovrapposizioni.
- Coinvolgimento di coordinator, archivist e dev-tooling per convalida e rollout.

## Prossimi passi

1. Validare formalmente PATCHSET-00 come change-set neutrale e approvare la struttura dei sei documenti di pianificazione.
2. Popolare `REF_INCOMING_CATALOG` con la tabella di stato condivisa per `incoming/` e `docs/incoming/`, nominando un owner.
3. Collegare `REF_REPO_SOURCES_OF_TRUTH` e `REF_PACKS_AND_DERIVED` con i percorsi canonici dei core e i criteri di derivazione.
4. Allineare `REF_TOOLING_AND_CI` sugli impatti nulli di PATCHSET-00 e preparare la checklist di compatibilità per PATCHSET-01.
5. Aggiornare `REF_REPO_MIGRATION_PLAN` con le exit/entry criteria e i trigger per passare da PATCHSET-00 a PATCHSET-01/02.

---

## Changelog

- 2025-11-23: prima proposta di patch basata su `REF_REPO_SCOPE` (archivist).
