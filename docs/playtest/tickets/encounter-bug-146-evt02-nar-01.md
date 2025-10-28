# [Encounter bug] EVT-02 – Branch cooperativo richiama dialogo di tradimento

- **ID ufficiale**: #146
- **Data creazione**: 2025-11-12
- **Scenario**: EVT-02 "Alleanza inattesa"
- **Build**: `branching-v3` (sessione pilota EVT-02)
- **Owner**: Narrative QA (A. Conti)
- **Etichette**: `event-special`, `narrative-flow`, `encounter-balance`

## Descrizione
Durante la run cooperativa dell'evento speciale, dopo aver scelto di collaborare con l'alleato il flusso narrativo devia sul nodo di tradimento "Rinegoziazione forzata" anziché su "Accordo provvisorio". Il risultato è un doppio prompt incoerente che porta i tester a rieseguire la stessa decisione senza ottenere l'effetto previsto dalla storyline cooperativa.

## Risultato atteso
La scelta cooperativa deve instradare il dialogo sul nodo "Accordo provvisorio" mantenendo l'alleanza attiva e impostando il flag `evt02_alliance_state = cooperative`. Nessuna ripetizione della scelta di tradimento deve comparire nella sequenza.

## Risultato osservato
Il branch cooperativo apre immediatamente "Rinegoziazione forzata", riproponendo la scelta di tradimento e resettando l'alleanza. I flag narrativi mostrano `evt02_alliance_state = renegotiation_pending`, impedendo la progressione coerente al capitolo successivo.

## Passi di riproduzione
1. Caricare il save `story-branch-ev02` sulla build `branching-v3`.
2. Avviare la sequenza negoziazione e selezionare tutte le risposte cooperative.
3. Confermare la scelta finale di cooperazione.
4. Osservare l'apertura del nodo "Rinegoziazione forzata" e il prompt duplicato.

## Allegati
- Log flag: `logs/pilot-2025-11-12/evt-02/flags/evt02_flags_20251028T120659.json`
- Clip video: `logs/pilot-2025-11-12/media/evt02-nar-01_branch-misfire.mp4`

## Note di triage
- Probabile regressione introdotta dal merge del branch `evt02_coop_fix` nel build `branching-v3`.
- Priorità alta per sessione di validazione narrativa del 2025-03-05.
- Richiesto check incrociato con diagramma flow chart e tool flag sync.
