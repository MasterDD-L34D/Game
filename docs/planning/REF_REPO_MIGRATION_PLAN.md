# REF_REPO_MIGRATION_PLAN – Sequenza patchset

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **coordinator** (supporto: archivist, dev-tooling)
Stato: DRAFT – sequenziare i patchset

---

## Obiettivi

- Definire la timeline dei patchset (PATCHSET-00, 01, 02, …) derivati da `REF_REPO_SCOPE`, con criteri di entrata/uscita e responsabilità.
- Rendere espliciti rischi, mitigazioni e strategie di rollback per ogni patchset.
- Collegare ogni patchset ai deliverable attesi su dati core, pack/derived, incoming e tooling/CI.

## Stato attuale

- PATCHSET-00 è neutrale (documentazione e mappature) e dipende dall’approvazione di `REF_REPO_PATCH_PROPOSTA`.
- Le fasi successive non hanno ancora un calendario né criteri di completamento definiti.
- I rischi e le dipendenze tra patchset non sono stati documentati; manca una matrice P0/P1/P2 condivisa.

## Rischi

- Avvio di patchset successivi senza criteri di uscita potrebbe lasciare il repo in stato intermedio.
- Mancata sincronizzazione con tooling/CI può introdurre regressioni nei workflow esistenti.
- Sovrapposizione tra patchset (es. incoming vs derived) può causare conflitti o doppi sforzi.

## Dipendenze

- `REF_REPO_SCOPE` e `REF_REPO_PATCH_PROPOSTA` come base di perimetro e patch neutrale.
- `REF_REPO_SOURCES_OF_TRUTH`, `REF_PACKS_AND_DERIVED`, `REF_INCOMING_CATALOG`, `REF_TOOLING_AND_CI` per i deliverable specifici di ogni fase.
- Golden Path e Command Library per orchestrare le pipeline e garantire compatibilità con STRICT MODE.

## Prossimi passi

1. Formalizzare la sequenza minima: PATCHSET-00 (doc neutrale) → PATCHSET-01 (censimento derived/fixture) → PATCHSET-02 (rigenerazione pack ufficiale) → eventuali PATCHSET-03+ (pulizia incoming/archivio, adeguamenti CI).
2. Definire per ogni patchset entry/exit criteria, owner, rischi, rollback e impatto previsto su dati, pack, tooling e documentazione.
3. Allineare le priorità P0/P1/P2 con le dipendenze cross-documento (sources of truth, incoming, pack/derived, tooling/CI).
4. Integrare nel piano gli hook di validazione/CI che devono accompagnare la chiusura di ciascun patchset.
5. Pubblicare la timeline in `docs/planning/` e collegarla ai ticket/patch di implementazione, aggiornandola a ogni approvazione.

---

## Changelog

- 2025-11-23: bozza di piano di migrazione basato su `REF_REPO_SCOPE` (coordinator).
