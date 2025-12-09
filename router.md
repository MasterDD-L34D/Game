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

### Zone grigie e priorità

- **Lore vs bilanciamento**: se una richiesta chiede sia storia/contesto sia numeri, il default-coordinator orchestra. Il flusso consigliato è lore-designer → balancer; il balancer interviene solo su valori/equazioni senza alterare la narrativa.
- **Trait vs specie**: quando si definiscono nuovi trait per una specie, il trait-curator normalizza il trait e lo documenta, poi il species-curator lo aggancia al catalogo specie (e al bioma se rilevante). Se la specie richiede numeri → passa al balancer.
- **Biomi vs effetti di gioco**: se un bioma introduce effetti numerici o hazard, il lore-designer descrive il contesto mentre il balancer verifica scaling e stress. Per variazioni su alias/terraform → biome-ecosystem-curator.
- **Tooling a supporto del design**: script o validatori per dati di lore/bilanciamento vanno a dev-tooling; le decisioni di contenuto restano ai ruoli di design/bilanciamento.

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

### Criteri di escalation e handoff

- **Quando coinvolgere più agenti**: se il task tocca contemporaneamente narrativa e numeri, o dati condivisi tra specie/biomi/trait, attiva il coordinator per orchestrare almeno due agenti. Esempio: lore-designer → balancer per numeri, con eventuale biome-ecosystem-curator se il bioma è modificato.
- **Passare da un agente all’altro**: quando l’output richiesto cambia dominio (es. da descrizione a scaling numerico, o da normalizzazione trait a inserimento in catalogo specie). Il passaggio va dichiarato e deve rispettare i permessi dei profili in `.ai/<agente>/PROFILE.md`.
- **Priorità**: il dominio “dati strutturali” (trait, specie, biomi) ha precedenza sulla narratologia per evitare incoerenze; il balancer non modifica lore ma può chiedere al lore-designer di aggiustare il contesto se i numeri richiedono limiti tematici.
- **Escalation al coordinator**: obbligatoria se l’impatto è medio/alto, se emergono conflitti tra agenti, o se servono decisioni trasversali (es. update a formati globali o più di due agenti coinvolti).

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
- "Descrivi un nuovo bioma tossico e bilancia il danno nel tempo" → default-coordinator; routing a lore-designer per la descrizione, poi handoff a balancer per DOT/scaling. Se il bioma richiede alias o terraform, aggiungi biome-ecosystem-curator.
- "Definisci un nuovo trait per questa specie e dammi valori indicativi" → default-coordinator; trait-curator normalizza il trait, species-curator lo collega alla specie, balancer fornisce i numeri. Ogni passaggio va dichiarato.
- "Scrivi lore per un’unità e crea lo script di validazione YAML" → due rami: lore-designer per la parte narrativa, dev-tooling per lo script; il coordinator decide l’ordine e verifica che lo script non alteri i dati di bilanciamento.

# 7. Versionamento

- v1.0 – Prima versione del router automatico agenti.

## 8. Scenari di test (validazione routing)

1. **Missione + effetti ambientali**: richiesta di missione in un bioma che applica danni periodici. Atteso → default-coordinator loggato; lore-designer descrive missione e bioma, balancer calcola danni/mitigazioni; se si aggiornano alias del bioma, coinvolgere biome-ecosystem-curator.
2. **Nuova specie con trait unico**: creazione specie con un trait nuovo e valori stimati. Atteso → trait-curator per la definizione e normalizzazione del trait, species-curator per collegarla, balancer per i numeri; coordinator se servono revisioni incrociate.
3. **Tool di controllo coerenza**: richiesta di uno script che validi che le carte rispettino il lore esistente. Atteso → dev-tooling implementa lo script; se lo script suggerisce modifiche narrative, passa al lore-designer; il coordinator supervisiona perché coinvolge policy cross-dominio.

[ FINE FILE ]
