# REF_REPO_PATCH_PROPOSTA – Applicazione iniziale dello scope

Versione: 0.7
Data: 2025-12-07 (milestone target)
Owner: **Master DD (owner umano)** – coordinamento con coordinator/dev-tooling
Stato: PATCHSET-00 BASELINE APPROVATA – allineata alla milestone 2025-12-07 con gate 01A–01C approvati

---

## Obiettivo

Tradurre `REF_REPO_SCOPE` in **PATCHSET-00**: una proposta neutrale che non altera i dati core ma prepara la struttura di documentazione e cataloghi per i refactor successivi.

Lo scope è confermato neutrale: limita le attività a documentazione/cataloghi senza modificare `data/core/**`, `packs/**` o tooling esistente.

La numerazione delle uscite successive resta agganciata alla sequenza 01A–03B per il rollout graduale dopo approvazione.

## Numerazione e riferimenti

- Questa proposta è etichettata **PATCHSET-00** e mantiene l’allineamento con la sequenza di rollout 01A–03B prevista in `REF_REPO_SCOPE`.
- I documenti collegati (scope, migration plan, incoming catalog) devono riportare la stessa nomenclatura 01A–03B per evitare divergenze di numbering.
- Ogni nota di stato o approvazione deve citare esplicitamente il passo della sequenza (es. “01A approvata”, “03B in review”).

## Stato attuale

- **0.2 completato (design)**; milestone confermata al 2025-12-07 per la sequenza 01A–01C.
- Deliverable proposti sono limitati a documentazione e mappature, senza toccare `data/core/**`, `packs/**` o tooling.
- Gli stub richiesti in §6.1 di `REF_REPO_SCOPE` esistono ma vanno completati con sezioni operative.
- Le cartelle `incoming/` e `docs/incoming/` sono solo censite; manca una tabella di stato condivisa.
- **Gate 01A approvato il 2025-11-28 da Master DD (owner umano)** con ambito neutrale confermato e blocco dei merge diretti su `main`; **01B approvato il 2025-12-05** con conferma di perimetro neutrale; **01C approvato il 2025-12-07** per consolidare la baseline PATCHSET-00.

## Nota di delta

- Milestone confermata a **2025-12-07** con approvazione completa dei gate 01A–01C; le attività già approvate restano prerequisiti e base di rollback per la sequenza successiva.

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
- Per PATCHSET-00 è attivo il branch dedicato `patch/PATCHSET-00` (originato da `work`) e il merge diretto su `main` resta bloccato salvo rilascio coordinato post-01C e controlli di baseline.
- Loggare le attività dell’agente su `logs/agent_activity.md` per mantenere audit trail e handoff tra owner umani.
- Ogni documento di pianificazione deve riportare l’owner umano responsabile e l’aggiornamento va registrato nel log quando la numerazione 01A–03B cambia di stato.
- Master DD agisce come approvatore umano per 01A–01C (strict mode), valida i freeze, gap list e assegnazioni prima di propagare modifiche ad altri reference.

## Prossimi passi

1. Stabilizzare la baseline approvata di PATCHSET-00 mantenendo attivo il branch `patch/PATCHSET-00` e registrando in `logs/agent_activity.md` gli handoff su ticket legati alle uscite 02A–03B. **Owner umano:** Master DD (supporto coordinator).
2. Attivare i branch derivati (`patch/PATCHSET-00-incoming`, `patch/PATCHSET-00-sources`, `patch/PATCHSET-00-tooling`, `patch/PATCHSET-00-migration`) per completare le sezioni operative dei reference collegati, con ticket dedicati per ogni deliverable documentale.
3. Applicare criteri di rollback coerenti con la baseline: revert su `patch/PATCHSET-00` tramite tag di freeze post-01C, blocco merge verso `main` fino a verifica incrociata con `REF_REPO_MIGRATION_PLAN`, e ripristino delle tabelle di stato se le nuove uscite violano il perimetro neutrale.

---

## Changelog

- 2025-12-07: versione 0.7 – baseline approvata con gate 01A–01C completati, stato aggiornato e prossimi passi orientati a branch/ticket post-approvazione con criteri di rollback allineati alla milestone.
- 2025-12-07: versione 0.6 – milestone anticipata al 07/12/2025, stato gate 01A approvato / 01B in revisione / 01C pianificato, con delta di riallocazione e prossimi passi compressi.
- 2025-12-30: versione 0.5 – allineamento al report v0.5 con intestazione aggiornata e conferma del ruolo di PATCHSET-00 come proposta neutrale per la sequenza 01A–03B.
- 2025-12-17: versione 0.3 – design completato confermato, perimetro documentazione fissato, numerazione 01A–03B bloccata con richiamo alle fasi GOLDEN_PATH; prerequisiti di governance ribaditi (owner umano, branch dedicati, logging in `logs/agent_activity.md`).
- 2025-11-28: approvazione 01A (Master DD) su PATCHSET-00 con conferma di scope neutrale e blocco dei merge diretti su `main` fino al gate superato; creato branch dedicato `patch/PATCHSET-00` da `work`.
- 2025-11-23: prima proposta di patch basata su `REF_REPO_SCOPE` (archivist).
