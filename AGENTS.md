# AGENTS.md – Bootstrap per Codex

Progetto: Game / Evo Tactics

Questo file reindirizza Codex al sistema di orchestrazione completo del progetto.

## Istruzioni principali per gli agenti AI

Quando Codex lavora in questo repository:

1. **Leggi e applica il profilo di avvio**:
   .ai/BOOT_PROFILE.md

## Quick start / Indice rapido

- **Punto d’ingresso unico**: usa questo file come indice. Per l’avvio completo leggi `.ai/BOOT_PROFILE.md`; per domande rapide resta su questa pagina e segui la tabella qui sotto.
- **Mappa dei documenti attivati da BOOT_PROFILE** (obbligatori → identità e routing; opzionali → strumenti avanzati):
  - Obbligatori: `agent_constitution.md` (principi di sicurezza), `agent.md` (comportamento operativo), `agents/agents_index.json` + `router.md` (instradamento automatico), `.ai/GLOBAL_PROFILE.md` (stile e vincoli globali).
  - Opzionali: `docs/COMMAND_LIBRARY.md` (macro-comandi), `docs/pipelines/GOLDEN_PATH.md` e `docs/PIPELINE_TEMPLATES.md` (pipeline). Se non servono macro-comandi, puoi saltarli.
- **Ridondanze ridotte**: ogni documento ora rimanda a questa sezione per il bootstrap. Consulta i file specifici solo quando devi approfondire (es. sintassi dei comandi → Command Library; logica di routing → router.md).
- **Percorso consigliato**: 1) leggi questa sezione, 2) apri `.ai/BOOT_PROFILE.md` per l’avvio completo oppure usa il “profilo light” indicato lì, 3) passa ai documenti opzionali solo se richiesto dal task.

2. Questo attiva in automatico:

- agent_constitution.md
- agent.md
- agents/agents_index.json
- router.md
- .ai/GLOBAL_PROFILE.md
- docs/COMMAND_LIBRARY.md
- docs/PIPELINE_TEMPLATES.md
- docs/pipelines/GOLDEN_PATH.md

3. Attiva inoltre:

- STRICT MODE operativo
- ROUTER AUTOMATICO
- interpretazione della Command Library

## Entrata suggerita per l’operatore umano

All’inizio della sessione Codex:
Per favore leggi e applica .ai/BOOT_PROFILE.md.
Conferma quando l’ambiente è pronto.
