# REF_REPO_SCOPE – Refactor globale repository Game / Evo Tactics

Versione: 0.6
Data: 2025-12-07 (milestone target)
Owner: **Master DD (owner umano)** con agente coordinator (supporto: archivist, dev-tooling)
Stato: PATCHSET-00 APPROVATA – baseline allineata alla milestone 07/12/2025 con approvazione Master DD e gate 01A chiuso

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

- Owner umano nominato per il ciclo PATCHSET-00 (Master DD) e registrato nei log di esecuzione; baseline approvata con **gate 01A chiuso**, **01B in revisione** e **01C pianificato** con approvazione richiesta prima di qualsiasi merge verso `main`.
- Branch dedicati per ogni passo successivo, evitando merge diretti su `main` senza gate incrociati.
- Logging delle attività e delle approvazioni in `logs/agent_activity.md` per audit e handoff.

## Nota di delta

- Milestone riallineata da 2025-12-30 a **2025-12-07** con compressione delle attività 01B–01C; il gate 01A già approvato resta il riferimento per mantenere lo scope neutrale e validare i collegamenti con i ticket collegati.

## Prossimi passi

1. Eseguire le attività operative previste da questo scope (baseline già approvata) entro 2025-12-07, mantenendo aggiornato il changelog. **Owner umano:** Master DD – branch attivo `patch/PATCHSET-00` con ticket 01B/01C collegati.
2. Portare a chiusura i documenti di pianificazione elencati in §6.1 (sources of truth, incoming, pack/derived, tooling/CI, migration plan) come deliverable operativi per 01B–01C. **Owner umano:** Master DD – branch attivo `patch/PATCHSET-00-docs`; rollback: ripristino dei documenti precedenti e lock del branch.
3. Consolidare etichette di stato e segmentazione di `incoming/**` e `docs/incoming/**` insieme al censimento iniziale per chiudere 01B. **Owner umano:** Master DD – branch attivo `patch/PATCHSET-00-incoming`; rollback: revert dedicato sul branch e riallineamento etichette in log 01B.
4. Mappare percorsi canonici dei core e regole di derivazione dei pack in coordinamento con trait/species/biome curators per preparare 01C. **Owner umano:** Master DD (supporto curators/dev-tooling) – branch attivo `patch/PATCHSET-00-sources`; rollback: reintroduzione snapshot precedente dei mapping e nota di blocco in log 01C.
5. Inventariare tooling/CI e validatori per adeguamenti senza regressioni prima del passaggio a PATCHSET-01. **Owner umano:** Master DD – branch attivo `patch/PATCHSET-00-tooling`; rollback: revert delle modifiche CI/tooling e ripristino configurazioni note in log 01C.
6. Preparare PATCHSET numerati con scope limitato, rischi noti e strategia di rollback coerente con Golden Path, includendo i trigger di approvazione 01C. **Owner umano:** Master DD – branch attivo `patch/PATCHSET-00-migration`; rollback: abort del merge, ripristino branch e aggiornamento log di gate 01C.

---

## Changelog

- 2025-12-07 10:30 UTC: baseline PATCHSET-00 approvata da Master DD con gate 01A chiuso; riferimenti log/ticket: approvazione 01A registrata in `logs/agent_activity.md` (ticket 01A), consegne operative 01B/01C collegate ai ticket dedicati e agli aggiornamenti log 01B–01C.
- 2025-12-07: versione 0.6 – milestone anticipata al 07/12/2025 con stato gate 01A approvato / 01B in revisione / 01C pianificato, delta di riallocazione e prossimi passi compressi entro la data target.
- 2025-12-30: versione 0.5 – intestazione riallineata al report v0.5, confermata la numerazione 01A–03B e lo scope come bussola per le patch successive.
- 2025-12-17: versione 0.3 – design completato, perimetro documentazione confermato, numerazione 01A–03B bloccata e riferimento alle fasi GOLDEN_PATH con prerequisiti di governance (owner umano, branch dedicati, logging) applicati a PATCHSET-00 (archivist).
- 2025-11-23: versione iniziale del perimetro di refactor (coordinator).
