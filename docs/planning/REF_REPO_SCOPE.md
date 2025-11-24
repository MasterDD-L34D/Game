# REF_REPO_SCOPE – Refactor globale repository Game / Evo Tactics

Versione: 0.5
Data: 2025-12-30
Owner: **Master DD (owner umano)** con agente coordinator (supporto: archivist, dev-tooling)
Stato: PATCHSET-00 PROPOSTA – bussola per le pipeline di refactor

---

## Obiettivi

- Definire il perimetro, i vincoli e le priorità del refactor in **STRICT MODE**.
- Centralizzare cataloghi (trait, specie, biomi, pack) distinguendo chiaramente core, derived/snapshot/test-fixtures e incoming/backlog.
- Allineare documentazione, dati e tooling al Golden Path e ai vincoli di compatibilità (pack esistenti, CI, validatori).

## Stato attuale

### Domini coperti e scopo

- **Dati core & cataloghi** (`data/core/**`, `data/ecosystems/**`, `data/traits/**`, `biomes/**`, `traits/**`, `schemas/**`): identificare sorgenti di verità per trait, specie, biomi/ecosistemi, garantendo compatibilità con schema **ALIENA** e metriche UCUM.
- **Pack, snapshot, derived & fixture** (`packs/evo_tactics_pack/**`, `data/derived/**`, `examples/`, `reports/`): distinguere pack ufficiali, snapshot/mock/test-fixtures e layout legacy; definire che i pack devono essere rigenerati dai core tramite tooling.
- **Incoming/backlog/archivio** (`incoming/**`, `docs/incoming/**`, `docs/archive/**`): catalogare materiale attivo vs legacy, applicando etichette di stato (INTEGRATO / DA_INTEGRARE / STORICO) e segmentazione (buffer, legacy, archive_cold).
- **Documentazione & knowledge base** (`docs/**`, entrypoint top-level come `README.md`, `AGENTS.md`, `MASTER_PROMPT.md`, pipeline): ridurre duplicati, spostare l’obsoleto in `docs/archive/**`, mantenere 1–2 entrypoint chiari per vision, agenti e pipeline.
- **Tooling, engine, CI & test** (`src/**`, `engine/**`, `apps/**`, `services/**`, `packages/**`, `tools/**`, `scripts/**`, `ops/**`, `.github/workflows/**`, `tests/**`): assicurare che validatori e test usino i core come input principale e identificare workflow/script obsoleti o duplicati.

### Vincoli e priorità

- **Fuori scope attuale**: nuove feature di gameplay, riscritture profonde dell’engine/app, redesign di ALIENA; solo organizzazione e allineamento.
- **Priorità P0**: definire sorgenti di verità per trait/specie/biomi, isolare derived/snapshot/fixture duplicati, catalogare `incoming/**`.
- **Priorità P1**: consolidare documentazione e allineare tooling/CI ai core e alla rigenerazione dei pack.
- **Priorità P2**: pulizia naming/slug, riordino `reports/` e script minori.

## Rischi

- Violare **STRICT MODE** o Golden Path introducendo modifiche ai core senza patch approvate.
- Incertezza sui percorsi canonici può creare duplicati tra core, derived e incoming.
- Aggiornamenti incompleti del tooling/CI possono rompere validatori o workflow esistenti.
- Mancata tracciabilità dei pack legacy può impedire rollback o rigenerazione affidabile.

## Dipendenze

- Sistema agenti (`AGENTS.md`, `.ai/**`, `router.md`) e Command Library per orchestrare pipeline.
- Pack ufficiale `packs/evo_tactics_pack` da mantenere compatibile come derivato dei core.
- Validatori/schema checker esistenti e workflow CI in `.github/workflows/**`.
- Documenti collegati: `REF_REPO_PATCH_PROPOSTA`, `REF_REPO_SOURCES_OF_TRUTH`, `REF_INCOMING_CATALOG`, `REF_PACKS_AND_DERIVED`, `REF_TOOLING_AND_CI`, `REF_REPO_MIGRATION_PLAN`.

## Prerequisiti di governance

- Owner umano nominato per il ciclo PATCHSET-00 (Master DD) e registrato nei log di esecuzione; approvazione esplicita di Master DD richiesta per i gate 01A–01C.
- Branch dedicati per ogni passo successivo, evitando merge diretti su `main` senza gate incrociati.
- Logging delle attività e delle approvazioni in `logs/agent_activity.md` per audit e handoff.

## Prossimi passi

1. Approvare questo scope come riferimento condiviso per tutte le PATCHSET e registrare variazioni nel changelog del file.
2. Completare i documenti di pianificazione elencati in §6.1 (sources of truth, incoming, pack/derived, tooling/CI, migration plan).
3. Definire le etichette di stato e la segmentazione di `incoming/**` e `docs/incoming/**` insieme al censimento iniziale.
4. Mappare i percorsi canonici dei core e le regole di derivazione dei pack in coordinamento con trait/species/biome curators.
5. Inventariare tooling/CI e validatori per pianificare gli adeguamenti senza regressioni.
6. Preparare PATCHSET numerati con scope limitato, rischi noti e strategia di rollback coerente con Golden Path.

---

## Changelog

- 2025-12-30: versione 0.5 – intestazione riallineata al report v0.5, confermata la numerazione 01A–03B e lo scope come bussola per le patch successive.
- 2025-12-17: versione 0.3 – design completato, perimetro documentazione confermato, numerazione 01A–03B bloccata e riferimento alle fasi GOLDEN_PATH con prerequisiti di governance (owner umano, branch dedicati, logging) applicati a PATCHSET-00 (archivist).
- 2025-11-23: versione iniziale del perimetro di refactor (coordinator).
