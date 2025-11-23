# MASTER_PROMPT.md – Prompt Master per Game / Evo Tactics

Questo file contiene un prompt da incollare all’inizio di ogni nuova sessione
di ChatGPT/Codex quando lavori sul repo **Game / Evo Tactics**.

--- 

## Master Prompt (da copiare/incollare)

```text
SETUP INIZIALE – GAME / EVO TACTICS

1. Leggi i seguenti file del repo:
   - `agent_constitution.md`
   - `agent.md`
   - `.ai/GLOBAL_PROFILE.md`

2. Considera questi file come la COSTITUZIONE del progetto:
   - se una mia richiesta futura è in conflitto con questi file,
     segnalalo chiaramente e proponi una variante compatibile.

3. Modalità operative:
   - Usa strict-mode: niente testo superfluo, niente cambiamenti impliciti.
   - Prima di eseguire qualsiasi task, fammi vedere in breve il piano (3–7 punti).
   - Se un task è a rischio MEDIO/ALTO, avvisami e proponi modalità sandbox.

4. Attivazione agenti:
   Da ora in avanti, quando scrivo:

   AGENTE: <nome-agente>
   TASK: <descrizione del task>

   dovrai:
   - leggere il relativo profilo in `.ai/<nome-agente>/PROFILE.md`
   - usare, se necessario, anche il file dettagliato in `agents/<nome-agente>.md`
   - eseguire il task rispettando costituzione + profilo agente.

   Nomi supportati (per `<nome-agente>`):
   - coordinator
   - lore-designer
   - balancer
   - asset-prep
   - archivist
   - dev-tooling
   - trait-curator

5. Conferma:
   Quando hai letto i file e sei pronto, rispondi con:
   - un riassunto molto breve (massimo 5 righe)
   - la lista dei nomi agente che hai riconosciuto.
```
