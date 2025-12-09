# COMMAND_LIBRARY.md

Libreria completa dei comandi Codex per Evo Tactics
Versione: 1.0

Questa libreria raccoglie TUTTI i comandi operativi per:

- routing agenti
- pipeline generali e specifiche
- patchset e integrazione dataset
- validazione schema e coerenza
- Golden Path globale

È pensata per essere letta da Codex all’inizio di ogni sessione.

> Per un riassunto rapido dei documenti di boot e di quando leggere questa libreria, vedi il **Quick start / Indice rapido** in `AGENTS.md`. Qui trovi solo la definizione dei comandi.

---

## Cheat sheet rapido

Prompt pronti all’uso per evitare conferme ripetute. Copia-incolla la voce che ti serve e verifica i prerequisiti indicati.

- **BOOT_PROFILE (avvio consigliato)** — [vai alla sezione](#01--boot_profile-avvio-consigliato)
  - Prompt: `Per favore, leggi e applica .ai/BOOT_PROFILE.md. Conferma strict-mode, router automatico, Command Library e Golden Path caricati; elenca gli agenti disponibili.`
  - Prerequisiti: nessuno; usalo all’avvio per avere tutte le protezioni e i riferimenti caricati.
- **MASTER_ENV (avvio inline)** — [vai alla sezione](#02--master_env-avvio-inline-senza-boot_profile)
  - Prompt: `MASTER_ENV` seguito dal blocco “Task” indicato nella sezione 0.2 (così attivi bootstrap completo in un unico messaggio).
  - Prerequisiti: nessuno; alternativa rapida se non vuoi citare il file BOOT_PROFILE.
- **ATTIVA ROUTER AUTOMATICO** — [vai alla sezione](#11--attivare-il-router-automatico)
  - Prompt: `ATTIVA ROUTER AUTOMATICO`.
  - Prerequisiti: serve quando lavori senza BOOT_PROFILE; necessario prima di usare i comandi di pipeline per avere assegnazione agenti.
- **SETUP SESSIONE AGENTI (profilo light)** — [vai alla sezione](#12--setup-sessione-agente-light)
  - Prompt: `SETUP SESSIONE AGENTI`.
  - Prerequisiti: nessuno; carica solo identità, strict-mode e router per consultazioni rapide senza Golden Path.
- **PIPELINE_DESIGNER** — [vai alla sezione](#21--disegnare-una-pipeline-standard-dal-template)
  - Prompt: `COMANDO: PIPELINE_DESIGNER` + descrizione chiara della feature da coprire.
  - Prerequisiti: router automatico attivo; prepara il testo della feature per evitare follow-up.
- **PIPELINE_EXECUTOR** — [vai alla sezione](#23--eseguire-un-singolo-step)
  - Prompt: `COMANDO: PIPELINE_EXECUTOR` + pipeline incollata + numero step da eseguire.
  - Prerequisiti: pipeline già definita; router attivo; specifica file da leggere/scrivere per ridurre chiarimenti.
- **PIPELINE_SIMULATOR** — [vai alla sezione](#24--simulare-una-pipeline-intera-dry-run)
  - Prompt: `COMANDO: PIPELINE_SIMULATOR` + pipeline completa.
  - Prerequisiti: pipeline definita; router attivo; utile per verificare output attesi senza toccare file.

> **Strict-mode e conferme**
>
> - I comandi che applicano patch o mutano file (es. APPLICA*PATCHSET*\*, PIPELINE_EXECUTOR quando richiede write) prevedono preview + conferma prima dell’esecuzione.
> - Se fornisci `FAST_PATH: true`, puoi evitare conferme ridondanti **solo** quando le condizioni di sicurezza della [sezione 0.3](#03--strict-mode--fast-path) sono rispettate.
> - Anche in fast path è obbligatorio riportare motivazione, ambito e riassunto delle modifiche per garantire tracciabilità.

---

# SEZIONE 0 — BOOT & MASTER ENV

Questa sezione definisce come avviare rapidamente l’ambiente agenti completo
(Golden Path + Router + Command Library) all’inizio di una sessione Codex.

## 0.1 — BOOT_PROFILE (avvio consigliato)

**File:** `.ai/BOOT_PROFILE.md`

Quando inizi a lavorare sul repo, puoi dire al modello:

```text
Per favore, leggi e applica il profilo di avvio:

.ai/BOOT_PROFILE.md

Da questo momento, lavora seguendo quel profilo (strict-mode, router automatico,
Command Library, Golden Path, ecc.). Conferma quando l’ambiente è pronto.
Questo attiva in automatico:

lettura di:

agent_constitution.md

agent.md

agents/agents_index.json

router.md

.ai/GLOBAL_PROFILE.md

docs/COMMAND_LIBRARY.md

docs/pipelines/GOLDEN_PATH.md

docs/PIPELINE_TEMPLATES.md

modalità:

STRICT MODE (nessun side-effect implicito, sempre piano + self-critique)

ROUTER AUTOMATICO (se non specifichi AGENTE:, sceglie lui l’agente e lo dichiara)

interpretazione di tutti i COMANDO: ... definiti in questo file come primitive di alto livello.
```

## 0.2 — MASTER_ENV (avvio “inline” senza BOOT_PROFILE)

Se vuoi fare il bootstrap senza usare direttamente .ai/BOOT_PROFILE.md, puoi usare:

```text
MASTER_ENV

Task:

1. Leggi i file fondamentali:
   - agent_constitution.md
   - agent.md
   - agents/agents_index.json
   - router.md
   - .ai/GLOBAL_PROFILE.md

2. Leggi i file di orchestrazione:
   - docs/COMMAND_LIBRARY.md
   - docs/pipelines/GOLDEN_PATH.md
   - docs/PIPELINE_TEMPLATES.md

3. Attiva STRICT MODE e ROUTER AUTOMATICO:
   - Se uso AGENTE: <nome> → usa quell'agente
   - Se non uso AGENTE: <nome> → seleziona tu l'agente migliore in base a router.md e agents_index.json
     e dichiara quale hai scelto e perché.

4. Interpreta tutti i `COMANDO: ...` secondo le definizioni in docs/COMMAND_LIBRARY.md.

5. Conferma l’avvio con un messaggio breve che include:
   - conferma di:
     • strict-mode attivo
     • router automatico attivo
     • Command Library & Golden Path caricati
   - la lista dei nomi degli agenti disponibili (da agents/agents_index.json).
```

Nota: BOOT_PROFILE è la forma più “pulita” e riutilizzabile;
MASTER_ENV è il corrispondente in forma di comando inline.

## 0.3 — Strict-mode & Fast Path

Questa sezione chiarisce dove strict-mode impone doppi passaggi e come attivare un bypass controllato.

### 0.3.1 — Dove esistono passaggi/conferme ridondanti

- **APPLICA*PATCHSET*\***: richiede preview diff + conferma esplicita prima di scrivere sui file.
- **PIPELINE_EXECUTOR** con step di scrittura: piano + sandbox + conferma sull’esecuzione dello step che modifica file.
- **CHECK\_\* che applicano fix** (se esplicitamente richiesto dal task): necessaria conferma prima di scrivere.

### 0.3.2 — Criteri per abilitare FAST_PATH (bypass conferma doppia)

Usa `FAST_PATH: true` nel blocco comando solo se TUTTI i criteri sono rispettati:

1. **Ambito a basso rischio**: solo file di testo/Markdown/config non eseguibili; nessun schema di gioco/dati core o codice runtime.
2. **Patch piccola e isolata**: ≤ 100 linee totali modificate, al massimo 3 file toccati, nessuna creazione/eliminazione di file.
3. **Assenza di effetti collaterali**: niente migrazioni DB, nessun cambio di pipeline di build, nessun trigger CI critico.
4. **Prerevisionato**: diff già condivisa o derivata da istruzioni dell’utente senza ambiguità.

Se uno dei criteri non è soddisfatto, ignora `FAST_PATH` e usa il flusso standard con conferma esplicita.

### 0.3.3 — Tracciabilità e limiti di sicurezza

- Anche in fast path, mostra sempre il riepilogo modifiche (file, linee, motivazione) e segnala che è stata usata la modalità fast path.
- Se durante l’esecuzione emergono rischi (es. scopri file sensibili), annulla il fast path e torna al flusso standard chiedendo conferma.
- Non usare fast path per comandi GOLDEN_PATH/PIPELINE_DESIGNER (solo design) né per task di lore/bilanciamento: non servono conferme multiple.

---

# SEZIONE 1 — ROUTER & SETUP

## 1.1 — Attivare il router automatico

ATTIVA ROUTER AUTOMATICO

Leggi router.md e .ai/auto_router/PROFILE.md

Da ora:

se scrivo AGENTE: … → usa quell’agente

se NON lo scrivo → scegli tu l’agente giusto

Rispondi indicando sempre quale agente hai scelto e perché.

## 1.2 — Setup sessione agente (light)

SETUP SESSIONE AGENTI
Leggi: agent_constitution.md, agent.md, agents/agents_index.json, .ai/GLOBAL_PROFILE.md
Attiva strict-mode + piano prima dell’esecuzione.

---

# SEZIONE 2 — PIPELINE DISEGNATE (TRAIT, SPECIES+BIOMES, ecc.)

## 2.1 — Disegnare una pipeline standard dal template

COMANDO: PIPELINE_DESIGNER

AGENTE: coordinator

Task:

Genera una pipeline multi-agente per questa feature:
[descrizione feature]

Usa gli agenti in agents_index.json

Usa lo schema:

Obiettivo

Step numerati (agente, input, output, rischio)

Non eseguire ancora, solo design.

## 2.2 — Ottimizzare una pipeline esistente

COMANDO: PIPELINE_OPTIMIZER

Task:

Prendi questa pipeline:
[incolla pipeline]

Rimuovi step inutili

Metti step in parallelo dove possibile

Ridistribuisci agenti corretti

Restituisci pipeline ottimizzata + rischi.

## 2.3 — Eseguire un singolo step

COMANDO: PIPELINE_EXECUTOR

Pipeline:
[incolla pipeline]

Task:
Esegui lo step N della pipeline:

piano (3–7 punti)

esecuzione sandbox

self-critique

file da leggere/scrivere

Opzioni:

- `FAST_PATH: true` (opzionale) → consente di eseguire lo step che scrive file senza una seconda conferma, solo se i criteri di sicurezza della sezione 0.3.2 sono tutti rispettati.

## 2.4 — Simulare una pipeline intera (dry-run)

COMANDO: PIPELINE_SIMULATOR

Pipeline:
[incolla pipeline]

Task:
Simula TUTTI gli step:

descrivi per ogni step cosa produrrebbe

file coinvolti

dipendenze

output finale

rischi globali

---

# SEZIONE 3 — PIPELINE SPECIFICHE

## 3.1 — Pipeline TRAIT (standard)

COMANDO: PIPELINE_TRAIT_REFACTOR

Famiglia: [nome famiglia trait]

Task:

Usa PIPELINE_TRAIT_STANDARD.md

Istanziarla per questa famiglia

Genera la pipeline completa ready-to-execute

## 3.2 — Pipeline SPECIE+BIOMA (standard)

COMANDO: PIPELINE_SPECIE_BIOMA

Feature:
[descrizione bioma + specie]

Task:

Usa PIPELINE_SPECIES_BIOMES_STANDARD.md

Istanziarla con file reali del repo

Genera la pipeline SPECIE+BIOMI completa

---

# SEZIONE 4 — PATCHSET / UPDATE REPO

## 4.1 — Applicare TUTTE le patch (patchset sandbox -> repo reale)

COMANDO: APPLICA_PATCHSET_FRATTURA_ABISSALE

Task:

Leggi docs/reports/Frattura_Abissale_Sinaptica_patchset_sandbox.md

Per ogni PATCH N:

apri file target

applica diff in modo corretto

verifica sintassi JSON/YAML

Restituisci lista file modificati

Non toccare file non presenti nel patchset

Opzioni:

- `FAST_PATH: true` (opzionale) → applica le patch dopo la preview senza seconda conferma solo se i criteri della sezione 0.3.2 sono tutti soddisfatti; logga sempre che il fast path è stato usato.

## 4.2 — Dry-run merge plan

COMANDO: DRY_RUN_PIANO_MERGE_FRATTURA_ABISSALE

---

# SEZIONE 5 — VALIDAZIONI & CONTROLLI

## 5.1 — Validazione schema & slug

COMANDO: CHECK_SCHEMA_E_SLUG_FRATTURA_ABISSALE

## 5.2 — Coerenza trait ↔ pool ↔ specie ↔ bioma

COMANDO: CHECK_COHERENZA_TRAIT_SPECIE_BIOMA_FRATTURA_ABISSALE

## 5.3 — Controlli CI / test logici

COMANDO: CHECK_TEST_E_PIPELINE_FRATTURA_ABISSALE

---

# SEZIONE 6 — GOLDEN PATH (Pipeline globale)

## 6.1 — Disegnare una nuova feature tramite Golden Path

COMANDO: GOLDEN_PATH_FEATURE

Feature:
[descrizione chiara]

Task:

Leggi GOLDEN_PATH.md

Genera pipeline istanziata secondo:
Fase 0 → Fase 7 del Golden Path

Non eseguire i singoli step

Restituisci pipeline pronta per l’esecuzione con PIPELINE_EXECUTOR

---

# SEZIONE 7 — STRUMENTI PER AGENZIA (REFINE / SCAN)

## 7.1 — Scansione completo del repo (specie + biomi + trait)

COMANDO: SCAN REPO PER AGENTI

## 7.2 — Refining di un singolo agente

COMANDO: REFINE_AGENT

Agente: [nome_agente]

## 7.3 — Refining completo di tutti gli agenti

COMANDO: REFINE_ALL_AGENTS

---

# SEZIONE 8 — COMANDI UNIVERSALI

## 8.1 — Router Auto

COMANDO: ROUTER_AUTO

## 8.2 — Esecuzione generica con agenti

AGENTE: [nome-agente]
TASK:
[descrizione task]

---

# SEZIONE 9 — NOTE FINALI

- Questa libreria va aggiornata ogni volta che nasce una nuova pipeline o un nuovo agente.
- Tutti i comandi sono compatibili con router.md e GOLDEN_PATH.md.
- Tutte le pipeline devono essere eseguite in modalità STRICT MODE / SANDBOX.
- L’applicazione delle patch è l’unico momento che richiede una verifica manuale finale.

[ FINE FILE ]
