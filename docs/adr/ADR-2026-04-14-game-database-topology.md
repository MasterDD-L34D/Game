---
title: 'ADR-2026-04-14: Game ↔ Game-Database topology and integration boundary'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# ADR-2026-04-14: Game ↔ Game-Database topology and integration boundary

- **Data**: 2026-04-14
- **Stato**: Accettato
- **Owner**: Platform Docs
- **Stakeholder**: Game backend team, Game-Database maintainer (Codex), Atlas (dashboard), Ops (deploy topology)

## Contesto

Il progetto Evo-Tactics è distribuito su due repository sorelle che si sono evoluti in parallelo senza una documentazione formale della loro relazione architetturale:

### Game (`MasterDD-L34D/Game`)

- **Ruolo**: runtime del gioco. Ospita il rules engine d20, il generation pipeline (biome + species + trait orchestration via Python workers), il backend Express che serve l'API di gameplay e la pipeline di validazione.
- **Storage traits/biomi**: dopo la rimozione di MongoDB (PR #1317, aprile 2026) il catalog service di Game legge **file locali JSON** in `data/core/traits/glossary.json`, `data/core/traits/biome_pools.json`, `docs/catalog/catalog_data.json`. Non esiste più un datastore esterno per questi cataloghi.
- **API HTTP**: il backend Express espone endpoint di gameplay (`/api/v1/generation/*`, `/api/v1/quality/*`, `/api/ideas/*`, `/api/traits/*`, `/api/v1/atlas/*`, ecc.) e gira di default sulla porta **3334** (cambiata da 3333 nell'aprile 2026, vedi sezione "Port allocation").
- **Dashboard**: `apps/dashboard/` è uno scaffold AngularJS stub che non renderizza nulla runtime — vedi [ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md](ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md). Il vero UI spedito è il bundle frozen in `docs/mission-console/`.

### Game-Database (`MasterDD-L34D/Game-Database`)

- **Ruolo**: CMS di taxonomy per trait, species, biomes, ecosystems. Fornisce un'interfaccia di editing (dashboard React) + una REST API di lettura.
- **Stack**: Node + Express + Prisma + PostgreSQL 15 + React (Vite) + TanStack Table/Query + MUI.
- **API HTTP**: endpoint REST `/api/traits`, `/api/biomes`, `/api/species`, `/api/ecosystems`, + junctions `/api/species-traits`, `/api/species-biomes`, `/api/ecosystem-biomes`, `/api/ecosystem-species`. No API versioning (non c'è `/v1`). CORS aperto (`origin: true`). Auth: solo operazioni di scrittura richiedono il ruolo `taxonomy:write` o `admin`; le letture GET sono aperte.
- **Port**: **3333** (default invariato).
- **Import pipeline**: `server/scripts/ingest/import-taxonomy.js`, invocato via `npm run evo:import`, legge file da questo repo (Game) sotto `packs/evo_tactics_pack/docs/catalog/*`:
  - `trait_glossary.json`
  - `trait_reference.json`
  - `env_traits.json`
  - `catalog_data.json`
  - `species/**/*.json`
  - `../data/ecosystems/*.biome.yaml`
  - `../data/ecosystems/*.ecosystem.yaml`
- **Stato**: attivamente sviluppato. Ultimi 20 commit concentrati su import hardening, test coverage, taxonomy consultation UX.

## Problemi che questo ADR risolve

### Problema 1 — Port collision

Entrambi i backend usano **porta 3333** come default. Tentare di eseguirli in parallelo sulla stessa macchina fa fallire il secondo a partire con `EADDRINUSE`. La soluzione attuale (prima di questo ADR) richiede override manuale di `PORT=...` su uno dei due lati, che è facile da dimenticare e rende fragile qualsiasi script di dev stack multi-servizio.

### Problema 2 — Topologia non documentata

Chi arriva ai repo oggi — sia un umano che un agente AI — deve inferire che:

- Game e Game-Database sono sibling repo, non un monorepo
- Esiste una pipeline di import unidirezionale Game → Game-Database
- Game-Database è il CMS di editing, Game è il runtime che **non scrive** nel Game-Database
- I dati condivisi tra i due sono un **sottoinsieme** di quelli che Game usa a runtime (vedi schema mismatch sotto)

Senza un ADR esplicito, questa conoscenza rimane tacita, si perde tra contributor, e porta a tentativi di integrazione mal indirizzati (ad esempio: "sostituiamo i file locali di Game con chiamate HTTP al Game-Database" — che non funzionerebbe per metà dei dati).

### Problema 3 — Schema mismatch nascosto

Un'integrazione HTTP runtime (letta Game ← Game-Database) coprirebbe solo una **parte** dei dati che Game usa. Il resto non esiste nel Prisma schema di Game-Database. Questa limitazione deve essere resa esplicita per evitare che un futuro tentativo di integrazione fallisca a runtime.

## Decisione

**Approccio A — Documentazione + port fix + env var stub, nessun cambio runtime.**

Questo ADR formalizza:

1. La topologia dei due repo e il confine del loro ruolo
2. La pipeline di import unidirezionale come **unica** integrazione attualmente supportata
3. Il port fix: Game backend default `3334`, Game-Database resta `3333`
4. Due env var riservate (`GAME_DATABASE_URL`, `GAME_DATABASE_ENABLED`) per una futura integrazione HTTP, **lette ma non consumate** al boot del backend di Game
5. La mappa esplicita dei campi condivisi vs esclusivi, così chi pianifica l'integrazione futura sa cosa è realmente accessibile

**Cosa NON cambia in questa PR:**

- Il catalog service di Game continua a leggere file locali
- Nessuna HTTP call dal Game al Game-Database
- Nessun cambio al repo Game-Database
- Nessun cambio al Prisma schema di Game-Database
- Nessuna modifica alla pipeline di import (che è già funzionante)

## Topologia

```
┌────────────────────────────────────┐       ┌────────────────────────────────────┐
│  Game (runtime)                    │       │  Game-Database (taxonomy CMS)      │
│                                    │       │                                    │
│  - Express backend :3334           │       │  - Express + Prisma :3333          │
│  - Python generation orchestrator  │       │  - PostgreSQL                      │
│  - Rules engine d20                │       │  - React dashboard :5173 (Vite)    │
│  - Catalog loaded from JSON files: │       │                                    │
│    data/core/traits/glossary.json  │       │  REST API:                         │
│    data/core/traits/biome_pools.json       │    GET /api/traits    (list+page)  │
│    docs/catalog/catalog_data.json  │       │    GET /api/biomes    (list+page)  │
│                                    │       │    GET /api/species   (list+page)  │
│  Dashboard scaffold (stub,         │       │    GET /api/ecosystems             │
│  non-rendering, see ADR)           │       │    +4 junction endpoints           │
│  docs/mission-console/ (frozen     │       │    GET /api/dashboard              │
│  Vue bundle)                       │       │                                    │
└────────────┬───────────────────────┘       └──────────────┬─────────────────────┘
             │                                              │
             │   Unidirectional build-time import           │
             │   (Game-Database side, invoked manually)     │
             │                                              │
             │   npm run evo:import  ─────────────────▶     │
             │                                              │
             │   Reads from Game:                           │
             │     packs/evo_tactics_pack/docs/catalog/     │
             │       trait_glossary.json                    │
             │       trait_reference.json                   │
             │       env_traits.json                        │
             │       catalog_data.json                      │
             │       species/**/*.json                      │
             │     packs/evo_tactics_pack/data/ecosystems/  │
             │       *.biome.yaml                           │
             │       *.ecosystem.yaml                       │
             │                                              │
             │   Writes into Game-Database Postgres:        │
             │     Trait, Biome, Species, Ecosystem tables  │
             │     + junction tables (normalized)           │
             │                                              │
             └────────▶  NO runtime HTTP from Game → Game-Database today.
                        GAME_DATABASE_URL / GAME_DATABASE_ENABLED
                        env vars are contract placeholders only.
```

## Port allocation

| Service                              | Port (default) | Override env                    | Note                                                                                              |
| ------------------------------------ | -------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Game backend (Express)               | **3334**       | `PORT`                          | Cambiato da 3333 in questo ADR. Legacy override: `PORT=3333`                                      |
| Game-Database backend (Express)      | **3333**       | `PORT` (side del Game-Database) | Invariato per non disturbare Codex                                                                |
| Game dashboard (scaffold Vite)       | 5173           | `PORT` di Vite                  | Non renderizza, vedi altro ADR                                                                    |
| Game-Database dashboard (React/Vite) | 5173           | `PORT` di Vite                  | **Conflitto potenziale col Game scaffold** — usare porte diverse se entrambi avviati              |
| Game Postgres (via docker-compose)   | 5432           | -                               | Invariato                                                                                         |
| Game-Database Postgres               | 5432           | -                               | **Conflitto potenziale** — chi usa docker-compose su entrambi i repo deve scegliere porte diverse |

**Implicazioni pratiche:**

- Chi vuole avviare entrambi i backend insieme deve usare **3333 per Game-Database e 3334 per Game backend** (default di questo ADR).
- Chi ha script personali o environment files con `http://localhost:3333` puntati al Game backend deve aggiornarli a `3334` oppure usare l'override `PORT=3333` per il Game backend.
- I dashboard Vite su 5173 non coesistono nativamente — è responsabilità dello sviluppatore variarli (usando le env var di Vite) se servono entrambi.
- Il Postgres conflict è gestito dalla separazione fisica dei due docker-compose: si usa uno alla volta, oppure si modifica `docker-compose.yml` per esporre porte diverse.

## Env var stub

Il backend di Game legge al boot (`apps/backend/index.js`) due env var **riservate** che sono **contract placeholders** per una futura integrazione HTTP. Non vengono consumate runtime:

```js
const gameDatabaseUrl = process.env.GAME_DATABASE_URL || 'http://localhost:3333';
const gameDatabaseEnabled = process.env.GAME_DATABASE_ENABLED === 'true';

if (gameDatabaseEnabled) {
  console.log(`[game-database] integration declared enabled at ${gameDatabaseUrl}`);
  console.log(
    '[game-database] NOTE: runtime integration is not yet wired — see docs/adr/ADR-2026-04-14-game-database-topology.md',
  );
}
```

**Scopo**:

1. **Prenotare il naming** delle variabili per evitare bikeshedding o duplicazione quando arriverà l'implementazione
2. **Dare un'opt-in esplicita** (`GAME_DATABASE_ENABLED=true`) così il futuro consumer può essere acceso senza cambi di codice
3. **Informare immediatamente** chi settasse il flag oggi che l'integrazione non è ancora cablata (evitando di perdere tempo a cercare bug inesistenti)

## Schema mismatch (campi condivisi vs esclusivi)

### Traits

| Campo                     | In Game (local files) | In Game-Database (Prisma)             |
| ------------------------- | --------------------- | ------------------------------------- |
| id/slug                   | ✅                    | ✅                                    |
| name / labels IT+EN       | ✅                    | ✅ (`name`, `description`)            |
| category                  | ✅                    | ✅                                    |
| dataType                  | (implicito)           | ✅ (BOOLEAN/NUMERIC/CATEGORICAL/TEXT) |
| allowedValues             | ✅                    | ✅ (JSON)                             |
| range (min/max)           | ✅                    | ✅ (`rangeMin`, `rangeMax`)           |
| `environments`            | ✅                    | ❌                                    |
| `synergies` / `conflicts` | ✅                    | ❌                                    |
| `energy_profile`          | ✅                    | ❌                                    |
| `selective_drive`         | ✅                    | ❌                                    |
| `usage_tags`              | ✅                    | ❌                                    |
| `species_affinity`        | ✅                    | ❌                                    |
| `completion_flags`        | ✅                    | ❌                                    |
| `weakness`                | ✅                    | ❌                                    |
| `mutation`                | ✅                    | ❌                                    |

### Biomes

| Campo                                              | In Game (biome_pools.json) | In Game-Database (Prisma Biome)                               |
| -------------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| id/slug                                            | ✅                         | ✅                                                            |
| name / label                                       | ✅                         | ✅                                                            |
| description / summary                              | ✅                         | ✅                                                            |
| `climate` / `climate_tags`                         | ✅                         | ✅ (`climate`, stringa)                                       |
| `parentId` (hierarchy)                             | ❌                         | ✅                                                            |
| `size` (min/max)                                   | ✅                         | ❌                                                            |
| `hazard` (severity, description, stress_modifiers) | ✅                         | ❌                                                            |
| `ecology` (biome_type, food_web, ecc.)             | ✅                         | ❌                                                            |
| `traits.core` + `traits.support` pool              | ✅                         | ❌ (indiretto via `SpeciesBiome` junction, diversa semantica) |
| `role_templates` (role, preferred_traits, tier)    | ✅                         | ❌                                                            |
| `metadata` (schema_version, updated_at)            | ✅                         | ❌ (campo createdAt/updatedAt sostituisce)                    |

### Species

Il matching qui è più ricco lato Game-Database (che ha tutti i campi taxonomy: kingdom → epithet, status, scientific/common name) ma il Game usa species solo come metadati per la generation pipeline. Le species in Game sono consumate tramite `catalogService.loadTraitCatalog()` che restituisce un Map di trait, non di species. Quindi questa è un'area dove **Game non ha bisogno del Game-Database** per funzionare runtime.

### Conclusioni del mismatch

- **Solo il trait glossary (labels + descriptions)** è coperto al 100% da entrambi i lati. Questa è l'unica area dove un'integrazione HTTP runtime sarebbe drop-in.
- **I biome_pools ricchi** (ecology, hazard, role_templates, core/support trait pool) NON sono modellati in Game-Database. Il Game dovrebbe continuare a leggerli da file locale.
- **Il trait catalog ricco** (environments, synergies, conflicts, energy_profile, ecc.) NON è modellato in Game-Database. Il Game dovrebbe continuare a leggerlo da file locale.

Per avere un'integrazione HTTP **completa**, il Prisma schema di Game-Database dovrebbe essere **esteso** con i campi ricchi. Questo richiederebbe:

1. Aggiungere colonne/tabelle al Prisma schema
2. Aggiornare `import-taxonomy.js` per mappare i campi ricchi
3. Aggiungere endpoint REST che espongano i dati ricchi (oppure estendere quelli esistenti)
4. Coordinare la release con Codex che mantiene il Game-Database

Questo è scope C nelle alternative considerate sotto, e richiede una discussione cross-repo che non può vivere in un singolo ADR del Game.

## Pipeline di import (come si aggiorna il Game-Database)

Su una macchina con entrambi i repo clonati:

```bash
# 1. Game: assicurati che i file catalog siano aggiornati
cd /path/to/Game
npm run sync:evo-pack   # rigenera docs/catalog/ e mirror

# 2. Game-Database: esegui l'import
cd /path/to/Game-Database
npm run evo:import      # legge da ../Game/packs/evo_tactics_pack/docs/catalog/
```

Il comando `evo:import` ha flag utili:

- `--dry-run` — stampa cosa verrebbe scritto senza toccare il DB
- `--verbose` — dettagli per record
- `--repo <path>` — sovrascrive il path del repo Game (default: `../Game`)

L'import è **idempotente** (upsert by slug). Può essere rilanciato senza side effect.

Il report finale produce contatori per: totals, normalized, complete/partial, discarded, errors per dominio. Da loggare in `logs/agent_activity.md` del Game-Database (non di Game).

## Automation recommendations (evo:import)

Oggi `npm run evo:import` gira **a mano** sul lato Game-Database quando l'operatore decide di sincronizzare. Per ridurre il drift tra i due repo si possono adottare uno dei tre pattern seguenti. **Nessuno è wired oggi** — questa sezione documenta le opzioni per chi in futuro implementerà l'automazione.

### Pattern A — GitHub Actions `repository_dispatch` (cross-repo trigger)

**Flow**: Game esegue `sync:evo-pack` in una PR di dataset. Quando la PR viene mergiata su `main`, un workflow `.github/workflows/notify-game-database.yml` firma un payload e invoca `repository_dispatch` verso `MasterDD-L34D/Game-Database`. Lato Game-Database, un workflow `on: repository_dispatch: types: [evo-catalog-updated]` lancia `npm run evo:import`, apre una PR di sync, e notifica Slack/Ops.

**Pro**: disaccoppiato, audit trail completo (entrambi i repo loggano l'evento), rollback chiaro (revert del merge su Game = nessuna nuova dispatch).
**Contro**: richiede un PAT (Personal Access Token) o GitHub App con `repo` scope + `contents:write` sul Game-Database. Configurazione iniziale dei secret non banale.
**Effort**: Medium (2 workflow file + 1 GitHub App + documentazione onboarding).
**Stakeholder**: Ops + Master DD.

### Pattern B — Cron job Game-Database side (pull periodico)

**Flow**: Game-Database lancia una GitHub Action schedulata (`cron: '0 */6 * * *'`) che fa `git clone https://github.com/MasterDD-L34D/Game` (o fetch su submodule/subtree), esegue `npm run evo:import`, e se ci sono diff apre una PR `chore(evo): sync catalog YYYY-MM-DD`.

**Pro**: vive interamente dentro Game-Database, zero secret cross-repo, facile disattivazione (commenta il cron).
**Contro**: lag di 6h worst-case, clone completo ad ogni run (spreca bandwidth), nessun trigger event-driven.
**Effort**: Small (1 workflow file nel Game-Database).
**Stakeholder**: Codex / Game-Database maintainer.

### Pattern C — Git hook Game side (push-time validation)

**Flow**: un `pre-push` hook lato Game rileva modifiche a `packs/evo_tactics_pack/docs/catalog/**` e, se presenti, esegue `evo:import --dry-run` puntando a un clone locale del Game-Database. Il hook blocca il push se il dry-run segnala error/dropped records > 0.

**Pro**: feedback immediato allo sviluppatore, impedisce push di catalog rotti.
**Contro**: richiede Game-Database clonato localmente e path env var configurato; hook bypassabile con `--no-verify`; nessun aggiornamento automatico del Game-Database remoto (solo gate).
**Effort**: Very Small (1 file in `.husky/` + doc).
**Stakeholder**: Master DD (decide se gate).

### Raccomandazione

**Pattern B** è il candidato naturale per un primo deploy: zero secret cross-repo, nessun impatto sul Game workflow, e già oggi c'è GitHub Actions sul Game-Database (cron di tracker refresh). La PR generata è review-able a valle e offre un ponte naturale verso Pattern A quando ci sarà una GitHub App condivisa.

**Pattern C** può essere aggiunto in parallelo come safety net a costo quasi-zero. Pattern A resta il target di lungo periodo per event-driven sync ma richiede lavoro di setup che oggi non ha ROI.

Nessun pattern viene wired in questa ADR. Il naming `evo:import` è riservato al comando in Game-Database e non cambia con l'automazione scelta.

## Alternative considerate

### Alternativa A (scelta) — Documentazione + port fix + env var stub

Vedi sezione "Decisione". Zero runtime changes, low risk, alto valore documentale.

### Alternativa B — HTTP-first con fallback sul glossario trait

Implementare in `apps/backend/services/catalog.js` un branch che, se `GAME_DATABASE_URL` è impostata e `GAME_DATABASE_ENABLED=true`, proverebbe a fetchare `GET /api/traits` e convertirebbe la risposta nella shape che `loadTraitGlossary()` produce oggi. In caso di errore HTTP, fallback sul file locale.

**Pro**: dà un valore immediato (il dashboard di Game-Database può editare i label IT/EN di un trait e il Game backend li vede senza restart, a condizione che il cache venga invalidato).

**Contro**:

- Richiede progettazione di cache/retry/timeout/circuit-breaker
- Richiede ~20-30 aggiornamenti di test esistenti (mock HTTP, snapshot)
- Copre solo il trait glossary (labels), non i biome_pools né il trait catalog ricco
- Introduce runtime dependency, riduce reliability di Game backend
- Il valore è incrementale e il ROI non è chiaro senza un use case forte

**Decisione**: rinviato. Quando arriverà un driver business concreto (es. il dashboard di Game-Database deve propagare modifiche al Game runtime senza rebuild) si riapre la discussione.

#### Implementation status — scaffold 2026-04-14 (feature-flagged OFF)

> Aggiornamento del 2026-04-14: lo scaffold del client HTTP è stato implementato in `apps/backend/services/catalog.js` ma è **disabilitato di default**. Quando `GAME_DATABASE_ENABLED` non vale `'true'`, il comportamento è identico a prima (lettura da file locale).

Cosa c'è già nel codice (Game side):

- `fetchRemoteGlossary(httpBase, fetchFn, timeoutMs)` in [`apps/backend/services/catalog.js`](../../apps/backend/services/catalog.js) — chiama `${httpBase}/api/traits/glossary` con AbortController + timeout, accetta payload `{ traits: [...] }` o `{ docs: [...] }` o array piatto, e converte tramite `mapGlossaryFromTraits` esistente.
- `createCatalogService` accetta nuove opzioni: `httpEnabled`, `httpBase`, `httpTimeoutMs` (default 5000ms), `httpTtlMs` (default 5 minuti), `httpFetch` (override per i test), `logger`.
- `loadCatalog()` ha un branch `loadGlossarySource()` che, se HTTP è attivo, prova prima il fetch e su qualsiasi errore (HTTP 5xx, timeout, parse fail) fa fallback al file locale. `lastSource` viene aggiornato a `'http'` / `'local-fallback'` / `'local'` per riflettere l'origine effettiva dell'ultimo load.
- Cache TTL-based (`isCacheValid()`): la prima `loadTraitGlossary()` colpisce HTTP, le successive entro `httpTtlMs` riusano la cache. `reload()` invalida.
- `healthCheck()` e `getSource()` riflettono lo stato HTTP-vs-local-vs-fallback.
- Wire env: `GAME_DATABASE_URL`, `GAME_DATABASE_ENABLED`, `GAME_DATABASE_TIMEOUT_MS`, `GAME_DATABASE_TTL_MS` letti in [`apps/backend/index.js`](../../apps/backend/index.js) e propagati a `createApp({ gameDatabase })`.
- Test in [`tests/api/catalogHttpClient.test.js`](../../tests/api/catalogHttpClient.test.js): 7 casi (disabled-by-default, http-200, http-500-fallback, timeout-fallback, cache-hit, reload-invalida, http-disabled-ignora-base).

Cosa **manca** per attivare la feature in produzione:

- ~~**Endpoint Game-Database `GET /api/traits/glossary`**~~ ✅ **Implementato** (aprile 2026). L'endpoint è stato aggiunto in `Game-Database/server/routes/traits.js` con response shape `{ traits: [{ _id, labels: { it, en }, descriptions: { it, en } }] }`, allineato al contract atteso da `fetchRemoteGlossary()`. Test aggiunto in `taxonomyRouters.test.js`. Schema condiviso in `packages/contracts/schemas/glossary.schema.json` (Game) e `server/schemas/glossary.schema.json` (Game-Database, copia con `$comment` canonical).
- **Decisione cache invalidation** (TTL-based vs webhook). Lo scaffold usa TTL fisso a 5 minuti. Se l'editor del Game-Database aggiorna labels e ne vuole vedere il riflesso nel Game runtime sub-minuto, va aggiunto un meccanismo di invalidation (push o long-poll). Per il primo rilascio TTL è sufficiente.
- **Documentazione operativa** (run-book, dashboard `source: http | local-fallback | local`, alert se la `local-fallback` rate sale sopra una soglia). Da scrivere quando l'integrazione viene attivata.

Lo scaffold è progettato per essere safe-by-default: nessuna delle funzionalità esistenti dipende da `GAME_DATABASE_ENABLED=true`, e `npm run test:api` resta verde con la flag spenta (80/80 test, inclusi i 7 nuovi).

### Alternativa C — Full integration con schema extension

Estendere il Prisma schema di Game-Database per includere biome_pools ricchi, trait ecology, synergies/conflicts, ecc. Poi wire Game per fetchare tutto via HTTP.

**Pro**: soluzione architetturalmente pulita, single source of truth per dati taxonomy.

**Contro**:

- Richiede PR cross-repo
- Coordinamento settimanale con Codex che sta iterando su Game-Database
- Settimane di lavoro (schema design + migration + ingest update + Game client + test)
- Rischio di rompere il Game-Database attuale che funziona bene
- Fuori scope per una singola sessione

**Decisione**: candidato a medio/lungo termine. Da riaprire se e quando ci sarà bandwidth per un tech debt epico cross-repo.

### Alternativa D — Unified deploy topology (docker-compose multi-servizio)

Un singolo `docker-compose.yml` (in un repo terzo o nel Game) che avvia Game backend + Game-Database backend + Postgres + eventuali dashboard in una volta sola.

**Contro**: richiede decisione strategica su dove vive il compose file, su chi owna il deploy, e introduce dipendenze di path relative che potrebbero rompersi con i rinomi di cartelle. Non aggiunge valore se non ci si integra runtime (A non lo fa).

**Decisione**: rinviato. Contestuale a B/C.

## Trigger conditions for deferred alternatives

Le alternative B, C e D sono state rinviate non perché sbagliate, ma perché oggi mancano i driver che le giustificherebbero. Questa sezione formalizza **quali eventi** dovrebbero riaprire ognuna, **chi** è lo stakeholder decisionale, **quanto effort** ci aspettiamo e **quali dipendenze** esistono fra loro. Scopo: evitare che un futuro implementer debba rifare l'analisi da zero, e dare a Master DD/Ops un set di "segnali d'allerta" da monitorare.

### Alternativa B — HTTP runtime integration (trait glossary)

**Trigger conditions (uno solo è sufficiente per riaprire)**:

- Un editor non-tecnico inizia a modificare labels IT/EN di trait nel dashboard Game-Database e lamenta che serve una rebuild del Game backend per vedere il cambio in produzione.
- Una feature di gameplay richiede hot-reload del catalog trait senza rebuild del Game (es. LiveOps che pubblicano nuovi trait mid-season).
- Il catalog service di Game supera 500ms di cold-read su avvio e un fetch HTTP con cache in-memory diventa più economico.
- Ci sono almeno **3 richieste distinte** (PR, issue, Slack thread) che chiedono sync runtime tra i due repo in un periodo di 4 settimane.

**Stakeholder decisionale**: Master DD per l'approvazione, backend team per l'implementazione, Codex per validare che i contratti REST del Game-Database siano stabili.

**Effort stimato**: **Large (1-2 settimane)**. Include progettazione cache/retry/circuit-breaker, aggiornamento di ~20-30 test (mock HTTP, snapshot), validazione che il fallback file locale resti il default se `GAME_DATABASE_ENABLED` è false.

**Dipendenze**:

- Dipende dal fatto che Game-Database mantenga stabili gli endpoint `GET /api/traits` (no breaking change nel contract shape).
- **Pre-requisito**: decidere se il cache è TTL-based o event-driven (per cache invalidation serve una forma di webhook o pub/sub, che oggi non esiste).
- **Blocca parzialmente C**: se B viene wired prima di C, le stesse primitive HTTP client possono essere riusate; farlo dopo C significa refactor.
- **Non blocca D**: B e D sono ortogonali.

### Alternativa C — Full integration con schema extension

**Trigger conditions (tutti e due richiesti)**:

- Esiste un use case confermato dove Game-Database deve essere **single source of truth** per biome_pools, trait ecology, synergies/conflicts (non solo per labels) — tipicamente perché un editor non-tecnico cura questi dati ricchi tramite UI e il doppio-commit su file locale del Game diventa insostenibile.
- Master DD e Codex hanno **allineato un budget cross-repo** (settimane dedicate, non fill-in) e concordato uno schema di release/rollback coordinato.

**Stakeholder decisionale**: **Codex** come owner del Game-Database (decide schema e migration), Master DD per approvare il costo cross-repo, backend team di Game per il client HTTP.

**Effort stimato**: **Very Large (3-6 settimane)**. Include:

1. Schema design Prisma + migration (Codex, ~1 settimana)
2. Aggiornamento `import-taxonomy.js` per mappare i campi ricchi (~3 giorni)
3. Nuovi endpoint REST (o estensione di quelli esistenti) che espongano i campi ricchi (~3-5 giorni)
4. Client HTTP + validation + test lato Game (~1 settimana)
5. Rollout coordinato con feature flag (~3-5 giorni)

**Dipendenze**:

- **Pre-requisito forte**: Alternativa B deve essere già wired (o il lavoro di B va fatto come parte di C). Senza un client HTTP rodato sul glossario trait semplice, saltare direttamente ai campi ricchi è ad alto rischio.
- **Co-requisito**: coordinamento settimanale con Codex. Senza questo, C non si può iniziare.
- **Blocca D**: un deploy unificato ha senso solo dopo che C è in produzione, altrimenti si deploya un legame HTTP che non si usa.

### Alternativa D — Unified deploy topology (docker-compose multi-servizio)

**Trigger conditions**:

- **Almeno B è in produzione** (runtime HTTP integration), perché un compose unificato senza runtime HTTP è puro overhead.
- Ops team segnala che avviare manualmente Game + Game-Database + Postgres + dashboard in parallelo su una stessa macchina (CI, staging, demo env) causa > 2 incidenti/errori config al mese.
- C'è un ambiente ufficiale (staging o preview) che deve esporre entrambi i servizi insieme.

**Stakeholder decisionale**: **Ops** per ownership, Master DD per endorsement. Non richiede coinvolgimento di Codex se il compose vive nel Game.

**Effort stimato**: **Medium (3-5 giorni)**. Include:

1. Decisione su dove vive il compose file (Game, Game-Database, o repo terzo)
2. Setup dei service Postgres (uno condiviso o due separati con porte diverse)
3. Health-check + ordering (Game-Database deve essere pronto prima che Game tenti connessioni HTTP se B/C attivi)
4. Script di onboarding + documentazione

**Dipendenze**:

- **Richiede B o C** (almeno uno) in produzione. Senza runtime integration, un compose unificato non aggiunge valore rispetto a due `docker compose up` separati.
- **Indipendente da Codex** (una volta deciso dove vive il compose).

### Sequenza consigliata se tutte e tre si attivano

```
Alt B (glossary HTTP)  →  Alt C (schema extension)  →  Alt D (unified deploy)
     ~1-2 settimane         ~3-6 settimane               ~3-5 giorni
     1 stakeholder          Cross-repo (2 team)          1 stakeholder (Ops)
```

Saltare B per andare direttamente a C è possibile ma ad alto rischio (nessun client HTTP rodato, debug su migrazione schema e client in parallelo). Saltare C per andare direttamente a D è inutile (niente da unificare).

### Monitoring dei trigger

Oggi nessuno sta attivamente tracciando i segnali sopra. Se vogliamo essere disciplinati:

- Aggiungere un `TODO-REVIEW-2026-Q3.md` in `docs/planning/` che Master DD rivede ogni trimestre per chiedersi: "qualche trigger è scattato?".
- Etichettare eventuali issue GitHub rilevanti con `needs: game-database-sync` per farle galleggiare in un filtro.
- In mancanza di entrambi, questa sezione resta come memoria istituzionale e chiunque tocchi il Game backend può tornare a leggerla.

**Stato attuale (2026-04-16)**: Alternativa B parzialmente implementata (endpoint glossary + schema condiviso + import pipeline ottimizzato), feature-flagged OFF di default. Nessun trigger per C o D è scattato. Prossima review raccomandata: 2026-Q3 o on-demand se un use case emerge prima.

## Conseguenze

**Accettate:**

- **Port default change**: chi aveva script locali con `http://localhost:3333` puntati al Game backend deve aggiornarli a `3334` oppure usare `PORT=3333` override. Breaking change minore, mitigato dall'env var.
- **Env var stub non consumata**: `GAME_DATABASE_URL` e `GAME_DATABASE_ENABLED` esistono ma non fanno niente runtime. Chi le setta vede un warning nel log. Zero side effect.
- **Schema mismatch rimane**: Game continua a dipendere da file locali per biome_pools e trait catalog. Game-Database non li copre, e questo è documentato esplicitamente.
- **Import pipeline rimane unidirezionale**: Game → Game-Database, senza ritorno. I cambi fatti nel Game-Database via UI non si propagano automaticamente al Game. Servono re-export manuali (o un'integrazione B in futuro).

**Non accettate (follow-up deliberati):**

- **Runtime HTTP integration**: rinviato. Richiede progettazione dedicata e uno use case chiaro.
- **Schema extension del Game-Database**: rinviato. Richiede coordinamento cross-repo.
- **Unified deploy topology**: rinviato. Contestuale alle decisioni sopra.

## Azioni operative in questa PR

- [x] Creato questo ADR
- [x] Aggiornato `apps/backend/index.js`: default `PORT=3334`, stub env var `GAME_DATABASE_URL` + `GAME_DATABASE_ENABLED`
- [x] Aggiornato `docker-compose.yml`: `PORT=3334`, `ports: - '3334:3334'`
- [x] Aggiornato `scripts/dev-stack.sh` e `scripts/test-stack.sh`: `VITE_API_BASE_URL` default a `http://localhost:3334`
- [x] Aggiornato `tests/load/orchestrator-load.k6.js` e `tests/playwright/serve-mission-console.mjs`: base URL default a `3334`
- [x] Aggiornato `CLAUDE.md`: port reference + nuova sezione "Sibling repo topology" nella "Architecture notes"
- [x] Aggiornato `README.md`: port reference in "Backend Idea Engine" e "Docker + Postgres + Prisma"
- [x] Registrato questo ADR in `docs/governance/docs_registry.json`

## Follow-up candidati (backlog)

1. **Integrazione HTTP runtime (alternativa B)** — da riaprire quando ci sarà uno use case concreto (es. edit dashboard Game-Database deve riflettersi nel Game backend senza rebuild). Trigger conditions formalizzate nella sezione "Trigger conditions for deferred alternatives" sopra.
2. **Schema extension di Game-Database (alternativa C)** — cross-repo, richiede coordinamento con Codex. Trigger conditions nella sezione "Trigger conditions for deferred alternatives" (pre-requisito: B già wired).
3. **Docker compose unificato (alternativa D)** — contestuale a B/C. Trigger conditions nella sezione "Trigger conditions for deferred alternatives" (pre-requisito: almeno B in produzione).
4. **Automazione del `evo:import`** — oggi è manuale. Un hook post-commit sul Game che triggera l'import lato Game-Database sarebbe utile ma fuori scope.
5. **CI cross-repo** — verificare che una PR sul Game non rompa l'import lato Game-Database prima di mergeare.

## Riferimenti

- Game-Database repo: `MasterDD-L34D/Game-Database` (Prisma schema in `server/prisma/schema.prisma`, import script in `server/scripts/ingest/import-taxonomy.js`)
- Game backend entry point: [`apps/backend/index.js`](../../apps/backend/index.js)
- Game catalog service: [`apps/backend/services/catalog.js`](../../apps/backend/services/catalog.js)
- File locali catalog Game: `data/core/traits/glossary.json`, `data/core/traits/biome_pools.json`, `docs/catalog/catalog_data.json`
- PR #1317 (rimozione MongoDB da Game)
- ADR complementare sul dashboard: [`ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md`](ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md)

## Runbook operativo

Il piano operativo che traduce questo ADR in runbook (cadenza sync, dry-run, `sync:evo-pack`/`evo:import`, trigger per riaprire alternative avanzate) vive in [`docs/planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md`](../planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md). Il piano consumer **non sovrascrive** questo ADR: in caso di conflitto, vince l'ADR per tutto cio' che riguarda il confine architetturale (vedi [`SOURCE_AUTHORITY_MAP §4.1`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md)).

Il [`Final Design Freeze v0.9 §5 Vincolo architetturale non negoziabile`](../core/90-FINAL-DESIGN-FREEZE.md) recepisce questo ADR come baseline di prodotto: qualunque proposta di introdurre dipendenze runtime `Game ← HTTP ← Game-Database` va trattata come ADR separato, non come patch di design.

## Changelog

| Data       | Modifica                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-14 | ADR creato. Approccio A (doc + port fix + env var stub) accettato. Scaffold client HTTP (Alt B) implementato feature-flagged OFF.                                                                                                                                                                                                                                             |
| 2026-04-16 | Alt B: endpoint `GET /api/traits/glossary` implementato in Game-Database. Schema condiviso `glossary.schema.json` aggiunto a `@game/contracts` e copiato in Game-Database. Import pipeline ottimizzato con batch Prisma `$transaction` + metriche. Fix conflitto porta Postgres (Game-Database docker-compose: host 5432→5433). `.env.example` aggiornati in entrambi i repo. |
