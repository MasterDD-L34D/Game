# AGENT_WORKFLOW_GUIDE.md – Guida passo passo per usare gli agenti

Questa guida spiega come usare la costituzione, gli agenti e i profili `.ai/`
all’interno del repo **Game / Evo Tactics**.

È pensata sia per l’uso umano, sia come riferimento da aggiornare se
cambiano i file:

- `agent_constitution.md`
- `agent.md`
- `agents/*`
- `.ai/*`

---

## 1. Preparazione nel repo

Struttura consigliata:

```text
Game/
├─ agent_constitution.md
├─ agent.md
├─ MASTER_PROMPT.md
├─ AGENT_WORKFLOW_GUIDE.md
├─ agents/
│  ├─ AGENT_TEMPLATE.md
│  ├─ coordinator.md
│  ├─ lore-designer.md
│  ├─ balancer.md
│  ├─ asset-prep.md
│  ├─ archivist.md
│  ├─ dev-tooling.md
│  ├─ trait-curator.md
│  └─ agents_index.json
├─ .ai/
│  ├─ README.md
│  ├─ GLOBAL_PROFILE.md
│  ├─ coordinator/PROFILE.md
│  ├─ lore-designer/PROFILE.md
│  ├─ balancer/PROFILE.md
│  ├─ asset-prep/PROFILE.md
│  ├─ archivist/PROFILE.md
│  ├─ dev-tooling/PROFILE.md
│  └─ trait-curator/PROFILE.md
└─ ... (resto del progetto)
```

`agents/` = definizioni lunghe (documentazione umana).  
`.ai/` = profili brevi per l’uso diretto da parte di ChatGPT/Codex.

---

## 2. Uso in ChatGPT/Codex – Passo per passo

### 2.1 Step 1 – Setup globale della sessione

Nel primo messaggio della sessione sul repo `Game`, incolla il contenuto di `MASTER_PROMPT.md`
(sezione “Master Prompt”), oppure qualcosa di equivalente a:

- Leggi: `agent_constitution.md`, `agent.md`, `.ai/GLOBAL_PROFILE.md`.
- Considerali come “legge” del progetto.
- Imposta strict-mode, piano prima di esecuzione, avviso per rischio medio/alto.

Quando condividi il piano preliminare e l’utente risponde con una conferma esplicita (es. “procedi”, “ok vai”), passa direttamente all’esecuzione senza riproporre lo stesso piano. Nuove richieste di conferma sono ammesse solo se emergono ambiguità inedite durante l’azione. La strict-mode sul piano iniziale non implica la ripetizione multipla del medesimo piano.

---

### 2.2 Step 2 – Attivare un agente specifico

Una volta fatto il setup, puoi attivare un agente con una sintassi standard:

```text
AGENTE: lore-designer
TASK:
Crea/espandi la mega specie polpo che unisce 5 tipi di polpo,
descrivendo concetto, aspetto, comportamento, tratti chiave e
interazioni di gioco SOLO in forma narrativa (nessun numero).
```

L’assistente:

- legge `.ai/lore-designer/PROFILE.md`
- opzionalmente consulta `agents/lore-designer.md`
- applica la costituzione globale.

Esempi:

- `AGENTE: coordinator` → piani e roadmap
- `AGENTE: lore-designer` → lore, narrative, creature
- `AGENTE: balancer` → stats, costi, probabilità
- `AGENTE: asset-prep` → asset, conversioni, schede
- `AGENTE: archivist` → indici, refactor documentazione
- `AGENTE: dev-tooling` → script, tool, validatori
- `AGENTE: trait-curator` → catalogo e governance dei trait

---

### 2.3 Step 3 – Pipeline multi-agente

Flusso consigliato per una nuova feature (es. nuova fazione polpo):

1. **Coordinator**
   - `AGENTE: coordinator`
   - Task: genera un piano di lavoro con task per Lore, Balancer, Asset, Archivist, Trait Curator.

2. **Trait Curator (opzionale ma consigliato)**
   - definisce/aggiorna il set di trait coinvolti nella feature.

3. **Lore Designer**
   - esegue i task di lore del piano.

4. **Balancer**
   - trasforma le descrizioni in stats numeriche.

5. **Asset Prep**
   - genera/converte immagini, prepara schede `.md`.

6. **Archivist**
   - aggiorna indici, organizza doc e link.

In ogni step, specifica sempre `AGENTE: ...` e il `TASK:` relativo.

---

## 3. Altri file di supporto

### 3.1 `agents/AGENT_TEMPLATE.md`

Template per nuovi agenti, con:

- scopo
- ambito
- input tipici
- output
- flusso operativo
- limitazioni
- versionamento.

### 3.2 `agents/agents_index.json`

File JSON che mappa ogni agente ai propri file:

- definizione lunga (`agents/*.md`)
- profilo `.ai/*/PROFILE.md`.

Questo è utile:

- per tool esterni (script, future API)
- per controlli automatici di coerenza.

---

## 4. Script e API necessari

Per usare questo sistema **con ChatGPT/Codex** non sono necessari script o API aggiuntive:

- il modello legge direttamente i file `.md` nel repo.
- le regole sono tutte in forma di testo.

Opzionale ma consigliato in futuro:

- script di validazione che controlla:
  - che ogni agente in `agents/` abbia il suo `.ai/<nome>/PROFILE.md`
  - che `agents/agents_index.json` sia coerente.
- script di linting per markdown (stile uniforme).

---

## 5. Manutenzione della guida

Quando modifichi:

- `agent_constitution.md`
- `agent.md`
- file in `agents/`
- file in `.ai/`

ricordati di:

- aggiornare se necessario questo `AGENT_WORKFLOW_GUIDE.md`
- aggiornare eventualmente `MASTER_PROMPT.md`
- aggiornare `agents/agents_index.json` se aggiungi o rimuovi agenti.

---

## 6. Changelog

- v0.1 – Prima versione della guida workflow agenti per Game / Evo Tactics.
