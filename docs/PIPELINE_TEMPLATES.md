[INIZIO FILE]

# PIPELINE_TEMPLATES.md – Template pipeline multi-agente

Questi template definiscono una serie di comandi riutilizzabili per progettare,
ottimizzare ed eseguire pipeline multi-agente nel progetto Game / Evo Tactics.

Ogni blocco qui sotto può essere copiato e incollato in una richiesta a Codex
per attivare il comportamento descritto.

---

## COMANDO: PIPELINE_DESIGNER

```text
COMANDO: PIPELINE_DESIGNER

AGENTE: coordinator
TASK:
Progetta una pipeline multi-agente ottimizzata per questa feature:

[DESCRIVI QUI COSA VUOI FARE]
(es. "nuova fazione di polpi mutaforma con 6 unità + 1 boss, bioma dedicato e set di trait")

Vincoli:
1. Usa SOLO gli agenti definiti in agents/agents_index.json
   (coordinator, lore-designer, balancer, asset-prep, archivist, dev-tooling, trait-curator, ecc.).
2. Struttura l’output così:

   ### Obiettivo
   - ...

   ### Step di pipeline (in ordine)
   1. Nome step
      - Agente principale:
      - Input necessari:
      - Output prodotti:
      - Rischio (basso/medio/alto):
   2. ...
   3. ...

3. NON eseguire ancora gli step, limitati a definire la pipeline ideale.
```

---

## COMANDO: PIPELINE_OPTIMIZER

```text
COMANDO: PIPELINE_OPTIMIZER

Task:
1. Leggi la seguente pipeline (testo incollato sotto) e trattala come bozza.

[INCOLLA QUI LA PIPELINE ATTUALE]

2. Migliorala secondo questi criteri:
   - riduci passaggi inutili o ridondanti
   - evidenzia dove più agenti possono lavorare in parallelo
   - segnala eventuali colli di bottiglia
   - allinea ogni step all’agente più adatto (in base a agents/agents_index.json)

3. Restituisci:
   - Pipeline ottimizzata
   - Sezione "Parallelo consigliato"
   - Sezione "Rischi & suggerimenti"

4. NON modificare file nel repo, solo proposta di processo.
```

---

## COMANDO: PIPELINE_EXECUTOR

```text
COMANDO: PIPELINE_EXECUTOR

Pipeline di riferimento:
[INCOLLA QUI LA PIPELINE CON GLI STEP NUMERATI]

Task:
Esegui lo step n. [NUMERO_STEP] della pipeline,
usando l’agente appropriato.

Formato:
1. Ripeti il titolo dello step (e l’agente previsto).
2. Mostra un piano sintetico (3–7 punti).
3. Esegui lo step (in strict-mode, senza cambiare file critici senza permesso).
4. Fai self-critique.
5. Lista file che andrebbero creati/modificati.

Nota:
- NON eseguire altri step della pipeline, solo quello richiesto.
```

---

## COMANDO: PIPELINE_SIMULATOR

```text
COMANDO: PIPELINE_SIMULATOR

Pipeline di riferimento:
[INCOLLA QUI LA PIPELINE]

Task:
Simula l’esecuzione COMPLETA della pipeline SENZA modificare alcun file.

Per ogni step:
1. Indica l’agente utilizzato.
2. Descrivi in 3–5 righe cosa produrrebbe (file, cartelle, cambi).
3. Evidenzia dipendenze tra gli step (cosa deve esistere prima).

Alla fine:
- Sezione "Output finali attesi"
- Sezione "Punti critici e raccomandazioni"
```

---

## COMANDO: PIPELINE_TRAIT_REFACTOR

```text
COMANDO: PIPELINE_TRAIT_REFACTOR

Obiettivo:
Ripulire e normalizzare i trait relativi a:
[es. "mobilità e difesa delle unità polpo mutaforma"]

Task:
1. Usa trait-curator per:
   - scan dei trait coinvolti nel repo
   - proposta di TRAITS_CATALOG.md
   - proposta di traits_mapping.json

2. Usa coordinator per:
   - trasformare il lavoro del trait-curator in un piano di migrazione (task + agenti).

3. Usa archivist per:
   - aggiornare/creare eventuali doc di guidelines su naming dei trait.

4. (Opzionale) Usa dev-tooling per:
   - proporre script che aiutino a cercare e sostituire i vecchi nomi trait.

Output atteso:
- elenco degli step con:
  - agenti coinvolti
  - file da creare/aggiornare
  - rischi e dipendenze.

NON eseguire ancora, definisci solo la pipeline TRAIT.
```

---

## COMANDO: PIPELINE_SPECIE_BIOMA

```text
COMANDO: PIPELINE_SPECIE_BIOMA

Feature:
[es. "Nuovo bioma 'Foresta di Corallo Ombra' + 3 specie di polpo adattate"]

Task:
Progetta una pipeline completa che includa:

- lore-designer:
  - descrizione bioma
  - ecosistema
  - 3 specie/creature

- trait-curator:
  - definizione/normalizzazione dei trait specifici di bioma e specie

- balancer:
  - effetti numerici del bioma
  - stats delle 3 specie

- asset-prep:
  - immagini/schede .md delle specie e del bioma

- archivist:
  - aggiornamento indici e struttura documentazione

- coordinator:
  - review finale della pipeline + report.

Struttura l’output in step numerati, come pipeline eseguibile.
```

---

## COMANDO: PIPELINE_DEV_TOOLING

```text
COMANDO: PIPELINE_DEV_TOOLING

AGENTE: dev-tooling
TASK:
1. Analizza la struttura attuale del repo (build, script, tool, eventuali CI).
2. Progetta una pipeline tecnica per:
   - validare dati di gioco (es. JSON/YAML)
   - validare coerenza di trait (se possibile)
   - generare asset derivati (es. conversione immagini)
   - eseguire test base.

3. Dividi la pipeline in:

   - Step manuali (per me)
   - Step automatizzabili (script/CI)

4. Per gli step automatizzabili, proponi:
   - nome script
   - percorso suggerito (es. tools/validate_traits.py)
   - breve descrizione cosa fa.

Non scrivere ancora codice, solo pipeline e specifiche.
```

---

## COMANDO: PIPELINE_MACRO_FEATURE

```text
COMANDO: PIPELINE_MACRO_FEATURE

Feature:
[descrivi la feature grosso modo, es. "nuovo set di 10 creature polpo per il bioma X con nuovi trait"]

Task:
1. Usa coordinator per creare una pipeline macro che:
   - includa:
     • lore-designer
     • trait-curator
     • balancer
     • asset-prep
     • archivist
     • dev-tooling (se necessario)
   - separi chiaramente:
     • fase di design
     • fase di dati/numeri
     • fase di asset
     • fase di doc/indici
     • fase di check finale

2. Struttura la pipeline come:
   - Step design (lore/specie/biomi)
   - Step trait
   - Step balance
   - Step asset
   - Step doc & index
   - Step scripts/CI (opzionale)
   - Step review finale

3. Evidenzia quali step possono andare in parallelo.

Non eseguire, solo definire la pipeline.
```

---

## Note d’uso

- Puoi copiare qualunque blocco “COMANDO: ...” in una nuova richiesta a Codex.
- Prima dell’uso, assicurati che Codex abbia già letto:
  - agent_constitution.md
  - agent.md
  - agents/agents_index.json
  - .ai/GLOBAL_PROFILE.md
  - (eventualmente router.md, se usi il router automatico).

[ FINE FILE ]
