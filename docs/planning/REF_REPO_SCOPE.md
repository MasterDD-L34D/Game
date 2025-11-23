# REF_REPO_SCOPE – Refactor globale repository Game / Evo Tactics

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **coordinator** (supporto: archivist, dev-tooling)
Stato: DRAFT – usata come bussola per le pipeline di refactor

---

## 1. Obiettivo

Definire il **perimetro**, i **vincoli** e le **priorità** del refactor globale del
repository **Game / Evo Tactics**, usando il sistema di agenti e il Golden Path,
in modalità **STRICT MODE** (nessuna modifica implicita ai file, solo patch esplicite).

Il refactor deve:

- ridurre i file sparsi, ridondanze e duplicati;
- centralizzare i **cataloghi** (traits, specie, biomi, ecosistemi, pack);
- separare chiaramente:
  - dati **core** (sorgente di verità),
  - dati **derived / snapshot / test-fixtures**,
  - materiale **incoming / backlog / archivio**;
- allineare **documentazione, dati e codice/tooling**;
- preservare compatibilità con:
  - pack esistenti (`packs/evo_tactics_pack`),
  - CI, test, validatori,
  - pipeline GOLDEN PATH e Command Library.

---

## 2. Domini nel perimetro

Questa sezione descrive i **domini principali** che il refactor deve toccare.

### 2.1 Dati core & cataloghi

**Scope:**

- `data/core/**`
- `data/ecosystems/**`
- `data/traits/**` e `traits/**` (documentazione trait)
- `biomes/**`
- `configs/schemas/**` o equivalente (`schemas/`, `config/`)

**Obiettivo:**

- Identificare, per ogni dominio:
  - **Trait**: sorgente di verità per glossario, famiglie, pool di bioma.
  - **Specie**: sorgente di verità per specie/unità/NPC.
  - **Biomi / ecosistemi**: sorgente di verità per biomi ed ecosistemi giocabili.
- Allineare i dataset core con lo schema ALIENA (trait, specie, biomi, ST, UCUM).

---

### 2.2 Pack, snapshot, derived & test-fixtures

**Scope:**

- `packs/evo_tactics_pack/**`
- `data/derived/**` (mock, prod_snapshot, test-fixtures)
- eventuali struct pack in `packages/`, `examples/`, `reports/`, ecc.

**Obiettivo:**

- Distinguere:
  - **pack ufficiali** (es. `evo_tactics_pack`) → sempre derivati dai core;
  - **snapshot** (mock, prod_snapshot, test-fixtures) → usati per test/demo;
  - **vecchi pack** o layout legacy → candidati per archivio.
- Definire una regola chiara:
  - i **core** si modificano a mano;
  - i **pack/derived** si **rigenerano** da core tramite tooling/script.

---

### 2.3 Incoming, backlog, archivio caldo/freddo

**Scope:**

- `incoming/**` (pack zip, CSV, YAML, note, template, script)
- `docs/incoming/**`
- `docs/archive/**`
- eventuali `incoming` in altre aree (es. `reports/`, `analytics/`)

**Obiettivo:**

- Catalogare il contenuto di `incoming/**`:
  - pack già integrati,
  - pack ancora da integrare,
  - materiale puramente storico.
- Introdurre una struttura più esplicita, ad es.:
  - `incoming/buffer/` → materiale attivo da integrare;
  - `incoming/legacy/` → materiale vecchio ma ancora utile come riferimento;
  - `incoming/archive_cold/` → materiale storico che non deve più interferire.
- Dare una “etichetta di stato” (es. INTEGRATO / DA_INTEGRARE / STORICO) alle
  principali fonti che impattano trait/specie/biomi.

---

### 2.4 Documentazione & knowledge base

**Scope:**

- `docs/**`, in particolare:
  - `docs/00-INDEX.md` e indici correlati;
  - `docs/biomes/**`, `docs/species/**`, `docs/traits/**` e manuali;
  - `docs/evo-tactics-pack/**`;
  - `docs/archive/**`, `docs/incoming/**`;
  - `docs/COMMAND_LIBRARY.md`;
  - `docs/pipelines/**`;
  - `docs/AI_AGENT_AUDIT_LOG.md`.
- File top-level:
  - `README.md`,
  - `MASTER_PROMPT.md`,
  - `AGENTS.md`, `AGENT_WORKFLOW_GUIDE.md`,
  - `agent_constitution.md`, `agent.md`, `router.md`.

**Obiettivo:**

- Ridurre documenti duplicati o superati:
  - spostare il materiale obsoleto in `docs/archive/**`;
  - mantenere 1–2 **entrypoint chiari** per:
    - vision/overview (es. `README.md`, `docs/01-VISIONE.md`),
    - sistema agenti (es. `AGENTS.md`, `AGENT_WORKFLOW_GUIDE.md`),
    - pipeline (es. `docs/pipelines/GOLDEN_PATH.md`).
- Allineare la documentazione al **sorgente di verità dei dati**:
  - evitare di mantenere a mano copie dei cataloghi in `docs/` se possono
    essere generate o referenziate direttamente da `data/core/**`.

---

### 2.5 Tooling, engine, CI & test

**Scope:**

- Codice e runtime:
  - `src/**`, `engine/**`, `apps/**`, `webapp/**`, `Trait Editor/**`,
  - `services/**`, `packages/**`.
- Tooling & script:
  - `tools/**`, `scripts/**`, `ops/**`.
- Config & schema:
  - `config/**`, `schemas/**`.
- CI & test:
  - `.github/workflows/**`,
  - `tests/**`, fixture in `data/derived/**`,
  - qualunque validatore/schema-checker (es. `schema-validate`, ecc.).

**Obiettivo:**

- Allineare tooling e CI alla nuova struttura:
  - i validatori devono usare i **core** come input principale;
  - i test devono usare fixture consolidate e non snapshot duplicati.
- Identificare script/workflow **obsoleti, duplicati o sperimentali** da:
  - spostare in archivio,
  - o consolidare in pochi comandi standard.

---

## 3. Fuori scope (per questo ciclo di refactor)

Le seguenti attività NON sono obiettivo diretto di questo refactor (possono
emergere come follow-up, ma non guidano le decisioni):

- Design di **nuove feature di gameplay** (nuovi biomi/specie/trait).
- Riscrittura profonda dell’engine o delle app (es. migrazioni framework).
- Refactor di “stile” sui testi di lore (solo organizzazione, non contenuto).
- Evoluzione del **framework ALIENA** (solo applicazione alle strutture dati
  esistenti, non redesign concettuale).

---

## 4. Vincoli principali

1. **STRICT MODE**
   - Nessuna modifica diretta ai file.
   - Qualsiasi cambiamento strutturale deve essere proposto come
     **patch_proposta** (diff) e approvato prima di essere applicato.

2. **Compatibilità Golden Path**
   - Le pipeline in `docs/pipelines/GOLDEN_PATH*.md` devono restare valide
     come concetto e come entrypoint.
   - Il sistema di agenti (`AGENTS.md`, `agent_constitution.md`, `.ai/**`)
     deve rimanere allineato ai file che descrivono il repo.

3. **Pack esistenti**
   - `packs/evo_tactics_pack` è considerato un pack **ufficiale**.
   - Qualsiasi refactor che impatta i suoi asset deve:
     - essere tracciato,
     - prevedere, se possibile, una rigenerazione automatica dal core.

4. **CI, test e validazione**
   - I workflow `.github/workflows/**` non devono essere rotti senza un piano
     di aggiornamento.
   - I validatori di schema devono continuare a poter verificare i core
     e, dove ha senso, i pack derivati.

5. **ALIENA & metriche UCUM**
   - I dataset strutturati (trait, specie, biomi, ecosistemi) devono rimanere
     compatibili con:
     - lo schema ALIENA (trait species-agnostici, specie, biomi/ecosistemi),
     - le metriche in UCUM (nessuna regressione sui campi di misura).

---

## 5. Priorità (P0 / P1 / P2)

**P0 – Bloccanti / fondamentali**

- Definire le **sorgenti di verità** per:
  - trait,
  - specie,
  - biomi ed ecosistemi.
- Mappare e isolare i dataset **derived/snapshot/test-fixtures** che duplicano
  i core.
- Catalogare e contenere il rumore in `incoming/**` e `docs/incoming/**`.

**P1 – Importanti ma non bloccanti**

- Consolidare la **documentazione**:
  - entrypoint chiari per agenti, Golden Path, cataloghi.
- Allineare tooling/CI in modo che:
  - test e validatori usino i core come input principale,
  - i pack vengano rigenerati da core.

**P2 – Nice to have**

- Pulizia e standardizzazione di naming, slug, ecc. (compatibili con ALIENA).
- Migliorare la struttura di `reports/`, `analytics/`, log di playtest.
- Mikro-refactor su script e workflow minori.

---

## 6. Output attesi dal refactor

A valle delle pipeline di refactor, ci si aspetta di avere:

1. Un set di **documenti di pianificazione**:
   - `REF_REPO_SOURCES_OF_TRUTH.md`
   - `REF_INCOMING_CATALOG.md`
   - `REF_PACKS_AND_DERIVED.md`
   - `REF_TOOLING_AND_CI.md`
   - `REF_REPO_MIGRATION_PLAN.md`

2. Una struttura del repo più chiara:
   - `data/core/**` come unico spazio canonico per i dati giocabili;
   - `packs/**` generati dai core;
   - `data/derived/**` confinato a snapshot/test dentro regole precise;
   - `incoming/**` e `docs/archive/**` ripuliti e segmentati.

3. Un set di **patchset numerati** (PATCHSET-01, 02, …) con:
   - scope limitato,
   - rischi noti,
   - eventuale strategia di rollback.

---

## 7. Collegamento con Golden Path & sistema agenti

- Il refactor viene gestito come una “mega feature infrastrutturale” sotto
  il **GOLDEN_PATH**:
  - Fase 0: definizione scope (questo documento).
  - Fase 1–N: pipeline dedicate (incoming, core/pack, docs, tooling/CI).

- Agenti coinvolti:
  - **coordinator**: orchestrazione pipeline, prioritizzazione.
  - **archivist**: mappatura file, cataloghi, versioni.
  - **dev-tooling**: agreggio script, validatori, CI.
  - **trait-curator / species-curator / biome-ecosystem-curator**:
    - allineamento semantico dei dataset core con ALIENA.
  - **asset-prep** (se necessario): mappatura asset visivi/esterni.

Questo documento è la base condivisa per tutte le **PATCHSET** successive.
Eventuali cambiamenti di scope rilevanti vanno aggiunti come sezione “Changelog”
in coda a questo file.
