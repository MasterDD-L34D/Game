# ROUTER.md – Router automatico degli agenti (Game / Evo Tactics)

Questo file definisce le regole per l’instradamento automatico dei task
verso i vari agenti presenti nel progetto, secondo:

- agent_constitution.md
- agent.md
- agents/agents_index.json
- profili in .ai/

Il contenuto di questo file DEVE essere letto a inizio sessione Codex insieme a:

- MASTER_PROMPT.md
- .ai/GLOBAL_PROFILE.md

> Per il percorso di avvio e la lista dei documenti attivati da BOOT_PROFILE consulta il **Quick start / Indice rapido** in `AGENTS.md`; questo file descrive solo le regole di instradamento.

---

# 1. Regola base del Router

Quando l’utente usa la sintassi:

AGENTE: <nome-agente>
TASK: <testo>

il sistema DEVE:

1. Leggere `.ai/<nome-agente>/PROFILE.md`.
2. Se necessario, leggere `agents/<nome-agente>.md`.
3. Eseguire il task secondo:
   - agent_constitution.md
   - agent.md
   - permessi dell'agente
4. Usare strict-mode:
   - nessuna deduzione non giustificata
   - nessuna modifica implicita
   - piano → esecuzione → self-critique.

---

# 2. Router Automatico (AUTO_ROUTER)

Se l’utente NON indica “AGENTE: …”, comportati così:

1. Analizza il contenuto della richiesta.
2. Determina se è adatta a un agente specifico:
   - coordinator → piani/roadmap
   - lore-designer → specie, biomi, storie, fazioni
   - balancer → numeri, stats, costi, regole
   - asset-prep → immagini, schede, asset
   - archivist → indici, refactor documentazione
   - dev-tooling → script, tool
   - trait-curator → trait, normalizzazione, cataloghi
   - species-curator\* → specie avanzate (se presente)
   - biome-curator\* → ecosistemi (se presente)

3. Se un agente è appropriato:
   - Dichiaralo apertamente:
     “Agente selezionato: X (motivo: …)”
   - Carica i suoi file profilo.
   - Esegui il task come se fosse stato espresso come:
     AGENTE: X  
     TASK: <richiesta utente>

4. Se NESSUN agente è appropriato:
   - Rispondi come assistente generale sul repo.

### Modalità default-coordinator (AUTO_ROUTER)

- Per richieste generiche o miste che non richiedono un agente specifico, attiva automaticamente il **default-coordinator** senza necessità di dichiarazione esplicita.
- Quando scatta il default-coordinator, il router DEVE loggare nella risposta la scelta effettuata (es.: “Modalità default-coordinator: instradato a coordinator per richiesta generica/mista”).
- Il coordinator tratta la richiesta come fallback intelligente, mantenendo strict-mode e gli altri vincoli del router.

---

# 3. Gerarchia decisionale del Router

1. Se la richiesta riguarda organizzazione o pianificazione → coordinator
2. Se riguarda lore, specie, biomi → lore-designer
3. Se riguarda numeri, bilanciamenti, valori → balancer
4. Se riguarda asset, immagini, schede → asset-prep
5. Se riguarda documentazione, indici, refactor → archivist
6. Se riguarda script, tool, automazioni → dev-tooling
7. Se riguarda TRAIT o normalizzazioni semantiche → trait-curator
8. In caso di dubbio:
   - chiedi chiarimento OPPURE
   - usa coordinator (fallback intelligente)

---

# 4. Come attivare il Router nella sessione (richiesta utente)

L’utente può fare:

"Attiva AUTO_ROUTER secondo router.md"

ooppure:

"Da ora usa il router in router.md per ogni mia richiesta."

---

# 5. Note operative

- Il router NON deve mai ignorare la costituzione.
- Il router NON può modificare file senza esplicita autorizzazione.
- Il router NON deve inventare cartelle o path inesistenti.
- Ogni agente deve lavorare con piani brevi e self-critique finale.

---

# 6. Esempi rapidi per richieste miste

- "Mi serve un breve piano di missione e, se serve, aggiungi due idee visive base" → default-coordinator attivo, log nella risposta e suddivisione del task verso coordinator con eventuale consulto di asset-prep se necessario.
- "Fammi un sommario delle regole e proponi un bilanciamento iniziale" → default-coordinator attivo; la risposta deve indicare il log di routing e, se opportuno, segnalare coinvolgimento balancer come passo successivo.

# 7. Versionamento

- v1.0 – Prima versione del router automatico agenti.

[ FINE FILE ]
