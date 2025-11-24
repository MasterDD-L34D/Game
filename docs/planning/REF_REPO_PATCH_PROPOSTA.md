# REF_REPO_PATCH_PROPOSTA – Applicazione iniziale dello scope

Versione: 0.5
Data: 2025-12-30
Owner: **Master DD (owner umano)** – coordinamento con coordinator/dev-tooling
Stato: PATCHSET-00 PROPOSTA – patch da validare

---

## Obiettivo

Tradurre `REF_REPO_SCOPE` in **PATCHSET-00**: una proposta neutrale che non altera i dati core ma prepara la struttura di documentazione e cataloghi per i refactor successivi.

La numerazione delle uscite successive resta agganciata alla sequenza 01A–03B per il rollout graduale dopo approvazione.

## Numerazione e riferimenti

- Questa proposta è etichettata **PATCHSET-00** e mantiene l’allineamento con la sequenza di rollout 01A–03B prevista in `REF_REPO_SCOPE`.
- I documenti collegati (scope, migration plan, incoming catalog) devono riportare la stessa nomenclatura 01A–03B per evitare divergenze di numbering.
- Ogni nota di stato o approvazione deve citare esplicitamente il passo della sequenza (es. “01A approvata”, “03B in review”).

## Stato attuale

- **0.2 completato (design)**; in attesa di approvazione per esecuzione delle fasi 01A–03B.
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

## Prerequisiti generali

- Ogni PATCHSET applicativa deve partire da un branch dedicato per garantire tracciabilità e rollback controllato.
- Loggare le attività dell’agente su `logs/agent_activity.md` per mantenere audit trail e handoff tra owner umani.
- Ogni documento di pianificazione deve riportare l’owner umano responsabile e l’aggiornamento va registrato nel log quando la numerazione 01A–03B cambia di stato.
- Master DD agisce come approvatore umano per 01A–01C (strict mode), valida i freeze, gap list e assegnazioni prima di propagare modifiche ad altri reference.

## Prossimi passi

1. Validare formalmente PATCHSET-00 come change-set neutrale e approvare la struttura dei sei documenti di pianificazione. **Owner umano:** Master DD (coordinator in supporto) – riferimento 01A.
2. Popolare `REF_INCOMING_CATALOG` con la tabella di stato condivisa per `incoming/` e `docs/incoming/`, nominando un owner umano di riferimento (Master DD) e collegando la voce di stato alla fase 01B/02A.
3. Collegare `REF_REPO_SOURCES_OF_TRUTH` e `REF_PACKS_AND_DERIVED` con i percorsi canonici dei core e i criteri di derivazione. **Owner umano:** Master DD (supporto dev-tooling) – allineamento con 02B.
4. Allineare `REF_TOOLING_AND_CI` sugli impatti nulli di PATCHSET-00 e preparare la checklist di compatibilità per PATCHSET-01. **Owner umano:** Master DD – riferimento 03A.
5. Aggiornare `REF_REPO_MIGRATION_PLAN` con le exit/entry criteria e i trigger per passare da PATCHSET-00 a PATCHSET-01/02 (sequenza 01A–03B). **Owner umano:** Master DD con coordinator/dev-tooling.

---

## Changelog

- 2025-12-30: versione 0.5 – allineamento al report v0.5 con intestazione aggiornata e conferma del ruolo di PATCHSET-00 come proposta neutrale per la sequenza 01A–03B.
- 2025-12-17: versione 0.3 – design completato confermato, perimetro documentazione fissato, numerazione 01A–03B bloccata con richiamo alle fasi GOLDEN_PATH; prerequisiti di governance ribaditi (owner umano, branch dedicati, logging in `logs/agent_activity.md`).
- 2025-11-23: prima proposta di patch basata su `REF_REPO_SCOPE` (archivist).
