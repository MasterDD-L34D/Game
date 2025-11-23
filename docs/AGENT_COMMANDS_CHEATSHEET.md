# AGENT_COMMANDS_CHEATSHEET.md

Guida rapida comandi agenti – Game / Evo Tactics

Questa guida raccoglie i comandi utili per lavorare con gli agenti:

---

## 0. ROUTER LIGHT

(uso rapido)

```text
AGENTE: <nome-agente>
TASK: <descrizione del task>

- Leggi il profilo in `.ai/<nome-agente>/PROFILE.md` e, se serve, `agents/<nome-agente>.md`.
- Applica la costituzione globale: `agent_constitution.md`, `agent.md`, `.ai/GLOBAL_PROFILE.md`.
- Usa strict-mode, piano iniziale, avviso se rischio medio/alto.
- Nomi supportati nel Master Prompt: coordinator, lore-designer, balancer, asset-prep, archivist, dev-tooling, trait-curator.
```

---

## 1. ROUTER_AUTO – scegliere automaticamente l’agente

(COMANDO)

```text
- Se la mia richiesta NON contiene “AGENTE: ...”:
  • valuta se il task ha senso per un agente specifico.
  • se sì → seleziona l’agente più adatto.
  • se no → rispondi come assistente generico.

- Quando trovi un task da instradare:
  1. Determina l’agente.
  2. Dillo esplicitamente: “Agente selezionato: X (motivo: …)”.
  3. Carica `.ai/<agente>/PROFILE.md`.
  4. Se serve, carica anche `agents/<agente>.md`.
  5. Esegui il task come se avessi ricevuto:
         AGENTE: <agente>
         TASK: <mia richiesta>
```

---

## 2. SCAN REPO PER AGENTI

(COMANDO)

```text
Task:
1. Scansiona queste aree del repo e fammi un report strutturato:

   - Dove sono definiti TRAIT:
     - file tipo `schema.prisma`, `*.schema.*`, eventuali enum, tipi, costanti.
     - file in `game_design/traits/` (se esistono).
     - riferimenti in `src/` (enum, type, const legati ai trait).

   - Dove sono definite SPECIE / UNITÀ:
     - cartelle tipo `game_design/creatures/`, `game_design/species/`, `docs/lore/`.
     - eventuali JSON/YAML con dati unità.

   - Dove sono definiti BIOMI / ECOSISTEMI:
     - `docs/biomes/`, `game_design/biomes/` (se esistono).
     - altri punti in cui compaiono concetti di ambiente/terrain.

   - Dove sono definiti o usati i RECORD/STATI (se schema/Prisma è importante per il gameplay).

2. Restituisci un report come:

   - TRAIT:
     - file principali:
     - esempi di enum/tipi/chiavi:
   - SPECIE/UNITÀ:
   - BIOMI/ECOSISTEMI:
   - ALTRI CONCETTI IMPORTANTI:

3. NON modificare ancora nessun file. Solo analisi.
```

---

## 3. REFINE_AGENT

(COMANDO)

```text
Agente da aggiornare: <nome>

Task:
1. Leggi:
   - `agents/<nome>.md`
   - `.ai/<nome>/PROFILE.md`
   - il report di scansione repo che hai prodotto prima
   - i file del repo realmente rilevanti per il dominio dell’agente

2. Aggiorna mentalmente la definizione dell’agente per:
   - usare i percorsi REALI di dati/schemi/tool
   - allineare la terminologia a quella del codice (nomi enum, tipi, costanti).

3. Proponi una NUOVA versione di:
   - `agents/<nome>.md`
   - `.ai/<nome>/PROFILE.md`

   in questo formato:

   --- INIZIO agents/<nome>.md ---
   [contenuto completo aggiornato]
   --- FINE agents/<nome>.md ---

   --- INIZIO .ai/<nome>/PROFILE.md ---
   [contenuto completo aggiornato]
   --- FINE .ai/<nome>/PROFILE.md ---

4. Non fare modifiche dirette al repo: limitati a proporre i nuovi contenuti,
   pronti da incollare.
```

---

## 4. REFINE_ALL_AGENTS

(COMANDO)

```text
Task:
Per ogni agente presente in `agents/agents_index.json`:

1. Leggi:
   - il suo file di definizione in `agents/<nome>.md`
   - il suo profilo in `.ai/<nome>/PROFILE.md`
   - i file del repo che hai identificato come rilevanti nella scansione (path veri).

2. Verifica:
   - che i percorsi citati siano reali o correggili
   - che i permessi (read/write) abbiano senso rispetto alla struttura del repo
   - che gli esempi di output puntino a cartelle esistenti o coerenti col design attuale.

3. Per ogni agente, proponi una versione aggiornata in questo formato:

   === AGENTE: <nome-agente> ===

   --- INIZIO agents/<nome-agente>.md ---
   [contenuto completo aggiornato]
   --- FINE agents/<nome-agente>.md ---

   --- INIZIO .ai/<nome-agente>/PROFILE.md ---
   [contenuto completo aggiornato]
   --- FINE .ai/<nome-agente>/PROFILE.md ---

4. Se necessario, proponi anche un update di `agents/agents_index.json` alla fine,
   indicandolo come diff o come file completo aggiornato.
```

---

## 5. CONSISTENCY_CHECK_SPECIE

(COMANDO)

```text
[Inserire qui il blocco operativo per controllare coerenza/specie.
Definisci input richiesti, passi di verifica su dataset specie/trait/biomi,
output attesi e formato di report.]
```

---

## 6. NOTION_DOC_AGENTS

(COMANDO)

```text
[Inserire qui il blocco operativo per generare/aggiornare documentazione
Notion degli agenti: sorgenti da leggere, struttura della pagina, output
previsto e limiti (no write su repo se non richiesto).]
```

Questo file serve come "manuale" per tutte le sessioni con gli agenti.

---

## COMANDO: CHECK_BIOME_FEATURE

```text
COMANDO: CHECK_BIOME_FEATURE

Feature:
[es. "Bioma frattura_abissale_sinaptica"]

Task:
1. Esegui una analisi di coerenza per la feature Bioma + Specie + Trait usando lo script dedicato.

2. Comandi consigliati da eseguire in locale:
   - `python tools/traits/check_biome_feature.py --biome frattura_abissale_sinaptica --dry-run --verbose`
   - eventuali comandi di lint/test del progetto (npm/pnpm/python/etc.).

3. Se ci sono problemi:
   - elencali per categoria:
     • schema / sintassi
     • slug mancanti / duplicati
     • inconsistenze trait_plan ↔ pool ↔ species_affinity
   - suggerisci in quale file intervenire.

4. NON modificare il repo nel contesto di questo comando, limitati a report e proposte.
```
