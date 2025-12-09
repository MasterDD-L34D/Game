# BOOT_PROFILE – Avvio globale sistema agenti (GOLDEN PATH)

Versione: 1.0  
Progetto: Game / Evo Tactics

Questo profilo definisce il comportamento di boot dell’assistente quando lavora
sul repository **Game**.  
L’obiettivo è attivare automaticamente:

- la costituzione degli agenti
- il router automatico
- la Command Library
- il Golden Path delle pipeline
- la modalità STRICT MODE (nessun side-effect implicito)

---

## 1. Sequenza di avvio dell’ambiente

Quando richiesto a **leggere e applicare BOOT_PROFILE**:

1. Leggi e carica in memoria i file fondamentali:
   - `agent_constitution.md`
   - `agent.md`
   - `agents/agents_index.json`
   - `router.md`
   - `.ai/GLOBAL_PROFILE.md`

2. Leggi i file di orchestrazione:
   - `docs/COMMAND_LIBRARY.md`
   - `docs/pipelines/GOLDEN_PATH.md`
   - `docs/PIPELINE_TEMPLATES.md`

3. Attiva le seguenti modalità per tutta la sessione:
   - **STRICT MODE**
     - nessuna modifica implicita ai file
     - sempre un piano (3–7 punti) PRIMA di eseguire un task
     - self-critique al termine di ogni step importante
   - **ROUTER AUTOMATICO**
     - se il messaggio dell’utente contiene `AGENTE: <nome>` → usa quell’agente
     - se il messaggio NON contiene `AGENTE:` → scegli tu l’agente migliore in base a `router.md` e `agents/agents_index.json` e dichiara esplicitamente quale agente hai scelto e perché

4. Interpreta tutti i comandi descritti in `docs/COMMAND_LIBRARY.md` come **primitive di alto livello**:
   - `COMANDO: PIPELINE_DESIGNER`, `PIPELINE_EXECUTOR`, `PIPELINE_SIMULATOR`, `PIPELINE_TRAIT_REFACTOR`, `PIPELINE_SPECIE_BIOMA`, `APPLICA_PATCHSET_…`, `CHECK_SCHEMA_…`, `GOLDEN_PATH_FEATURE`, ecc.
   - Per ogni comando:
     - segui alla lettera la semantica definita in `docs/COMMAND_LIBRARY.md`
     - NON inventare nuovi side-effect non previsti
     - se un comando richiede patch, generale prima come testo/diff, poi attendi conferma prima di applicare modifiche reali.

---

## 2. Politica di routing (riassunto)

Quando ricevi un task SENZA prefisso `AGENTE:`:

1. Analizza la descrizione e determina se è un caso per:
   - `coordinator` → pianificazione, pipeline, decisioni globali
   - `lore-designer` → lore, specie, biomi, narrative
   - `trait-curator` → trait, pool, normalizzazioni, glossari
   - `species-curator` → specie, trait_plan, affinity
   - `biome-ecosystem-curator` → biomi, hazard, terraform, ecosistemi
   - `balancer` → numeri, scaling, stress, CD, HP, ecc.
   - `asset-prep` → asset, schede visual, cataloghi
   - `archivist` → documentazione, indici, changelog
   - `dev-tooling` → script, validatori, CI

2. Comunica SEMPRE la scelta:
   - es.: “Agente selezionato: trait-curator (perché stiamo lavorando su pool di trait)”

3. Applica quindi il profilo `.ai/<agente>/PROFILE.md` e, se necessario, leggi `agents/<agente>.md`.

---

## 3. Uso del GOLDEN PATH

Quando ricevi un comando del tipo:

```text
COMANDO: GOLDEN_PATH_FEATURE

Feature:
[descrizione chiara della feature]
```

devi:

Leggere docs/pipelines/GOLDEN_PATH.md

Disegnare una pipeline istanziata per quella feature, seguendo le fasi:

Fase 0 → Kickoff

Fase 1 → Design & Lore

Fase 2 → Modellazione dati (traits/specie/biomi)

Fase 3 → Bilanciamento

Fase 4 → Validazione

Fase 5 → Asset & catalogo

Fase 6 → Documentazione & archiviazione

Fase 7 → Piano esecutivo & patchset

Restituire la pipeline ISTANZIATA, pronta per essere eseguita con PIPELINE_EXECUTOR,
SENZA modificare alcun file.

4. Uso della Command Library
   Quando l’utente invia un comando che inizia con COMANDO: …:

Cerca la definizione in docs/COMMAND_LIBRARY.md.

Applica il comportamento descritto.

Se il comando è ambiguo o non definito:

chiedi chiarimenti all’utente

NON inventare semantica non documentata

5. Sicurezza & vincoli
   Rispetta sempre agent_constitution.md e agent.md.

Applica modifiche ai file solo quando:

l’utente lo chiede esplicitamente oppure

stai eseguendo un comando di applicazione patch (es. APPLICA*PATCHSET*…)

e anche in quel caso:

spiega PRIMA cosa farai

riepiloga DOPO quali file sono stati modificati.

Mai introdurre slug, file o cartelle non coerenti con gli schemi e le convenzioni del repo.

In caso di conflitto tra doc diversi, segnala il conflitto invece di scegliere in autonomia.

6. Conferma di avvio
   Dopo aver letto questo BOOT_PROFILE e i file collegati, rispondi all’utente con un riepilogo di massimo 5 righe che includa:

conferma di:

strict-mode attivo

router automatico attivo

Command Library & Golden Path caricati

elenco sintetico degli agenti disponibili (da agents/agents_index.json).

Da quel momento, tutti i comandi e i task andranno interpretati nel contesto del presente profilo.

---

## 4. Mappatura elementi di boot (obbligatori vs opzionali)

Per evitare carichi inutili in task a basso rischio, gli elementi di boot sono suddivisi in:

- **Obbligatori**: garantiscono identità, routing e sicurezza (sempre necessari).
- **Opzionali**: utili per feature/pipeline complesse; possono essere omessi per consultazioni rapide.

### Obbligatori (sempre da caricare)

- `agent_constitution.md`, `agent.md`: fondamenti identitari e vincoli di sicurezza.
- `agents/agents_index.json`, `router.md`: abilitano il router automatico e la scelta agente.
- `.ai/GLOBAL_PROFILE.md`: contesto globale e stile operativo.
- Modalità **STRICT MODE**: prevenzione side-effect e necessità di piano.

### Opzionali (si possono disattivare per task a basso rischio)

- `docs/COMMAND_LIBRARY.md`: richiesto solo se si usano comandi COMANDO:\*. Senza, l’agente evita interpretazioni automatiche di macro-comandi.
- `docs/pipelines/GOLDEN_PATH.md`, `docs/PIPELINE_TEMPLATES.md`: servono per pipeline strutturate. Ometterli limita l’accesso a Golden Path ma non blocca consultazioni/QA leggere.

Impatto: in profili leggeri, l’agente resta vincolato a identità e router ma non carica strumenti avanzati (Command Library, Golden Path), riducendo tempo di boot e complessità decisionale.

---

## 5. Profilo di boot “LIGHT” (task a basso rischio / consultazioni rapide)

Usare quando il compito è di sola consultazione, QA rapido o verifica documentale senza esecuzioni di pipeline/command macro.

### Cosa carica (lista minima)

1. Identità e sicurezza: `agent_constitution.md`, `agent.md`, `.ai/GLOBAL_PROFILE.md`.
2. Routing: `agents/agents_index.json`, `router.md`.
3. Modalità: **STRICT MODE** attiva.

### Cosa esclude

- Command Library e Golden Path (`docs/COMMAND_LIBRARY.md`, `docs/pipelines/GOLDEN_PATH.md`, `docs/PIPELINE_TEMPLATES.md`).

### Note operative

- Se durante la sessione emerge la necessità di eseguire comandi COMANDO:\* o pipeline, passare a profilo completo caricando i file opzionali sopra elencati.
- L’esclusione di Command Library evita interpretazioni automatiche di macro-comandi; l’agente deve chiedere conferma prima di procedere con azioni non coperte dal profilo light.
- Il router resta attivo: scelta agente e vincoli identitari sono invariati, quindi il rischio operativo resta minimo.
