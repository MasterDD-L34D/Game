# REF_PACKS_AND_DERIVED – Pack, snapshot e fixture

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **archivist** (supporto: dev-tooling, coordinator)
Stato: DRAFT – separazione core vs derived

---

## Obiettivi

- Mappare pack ufficiali, snapshot e fixture (`packs/**`, `data/derived/**`, `examples/`, eventuali layout legacy) e definirne lo stato di derivazione dai core.
- Stabilire regole per la rigenerazione dei pack a partire dai core, compresi i requisiti di tooling e validazione.
- Identificare duplicati o asset legacy da archiviare per ridurre il rischio di regressioni.

## Stato attuale

- `packs/evo_tactics_pack` è considerato pack ufficiale ma non è documentato se e come venga rigenerato automaticamente dai core.
- `data/derived/**` contiene snapshot/mock/fixture senza un catalogo unico che ne spieghi scopo, data di origine e rischio di divergenza.
- Alcuni esempi o report potrebbero contenere layout pack legacy non tracciati.
- Non esiste una policy documentata per collegare i derived ai test/CI o per marcarli come deprecati.

## Rischi

- Derived non allineati ai core possono introdurre incoerenze nei test o nei pack distribuiti.
- Rigenerazioni manuali senza checklist possono rompere compatibilità con CI o con gli schemi ALIENA/UCUM.
- Pack legacy non etichettati possono essere riutilizzati erroneamente come sorgente di verità.

## Dipendenze

- `REF_REPO_SOURCES_OF_TRUTH` per i percorsi canonici dei core da cui rigenerare.
- `REF_TOOLING_AND_CI` per definire script e workflow che producono/validano pack e derived.
- `REF_REPO_MIGRATION_PLAN` per decidere quando archiviare o rigenerare specifici derived.
- Supporto di dev-tooling per standardizzare i comandi di rigenerazione e di coordinator per le priorità.

## Prossimi passi

1. Redigere una tabella dei pack ufficiali e derived con colonne: percorso, tipo (ufficiale/snapshot/fixture/legacy), origine dai core, owner, rischio.
2. Documentare il processo di rigenerazione di `packs/evo_tactics_pack` e verificare se esiste tooling automatizzato o manuale.
3. Inventariare `data/derived/**` specificando quali directory sono fixture di test e quali snapshot legacy da archiviare.
4. Collegare ciascun derived ai test/CI che lo consumano, segnando l’impatto di eventuale rigenerazione.
5. Proporre criteri di deprecazione/archiviazione per pack/derived non più supportati, da attuare nelle patch successive.

---

## Changelog

- 2025-11-23: struttura iniziale separazione core vs derived (archivist).
