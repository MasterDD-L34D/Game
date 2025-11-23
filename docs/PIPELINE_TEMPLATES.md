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

Pipeline di riferimento: docs/pipelines/PIPELINE_TRAIT_STANDARD.md

Step ufficiali (eseguire in ordine):
1. Audit e validazione dataset
   - Agente: Trait Curator
   - Input: data/traits/<famiglia>/*.json, data/traits/index.json, data/traits/species_affinity.json, config/schemas/trait.schema.json, data/core/traits/glossary.json
   - Output: Validazione schema; Errori glossario; Duplicati/legacy; Note sinergie/conflitti mancanti
   - Rischio: Medio

2. Proposta di normalizzazione e mapping slug
   - Agente: Trait Curator
   - Input: Report audit (step 1); Trait Editor/docs/howto-author-trait.md; docs/trait_reference_manual.md
   - Output: Piano mapping per slug e famiglie; Check-list per aggiornamenti glossario e locali
   - Rischio: Alto

3. Consolidamento catalogo e draft aggiornamento
   - Agente: Trait Curator
   - Input: Mapping (step 2); Dataset; Indice e affinità esistenti
   - Output: Draft inventario aggiornato; Note per Trait Editor su sinergie/slot; Elenco file da modificare
   - Rischio: Medio

4. Allineamento specie collegate
   - Agente: Species Curator
   - Input: species_affinity.json; species.yaml; Mapping slug
   - Output: Piano aggiornamento specie; Note onboarding
   - Rischio: Medio

5. Revisione impatti su biomi e pool
   - Agente: Biome & Ecosystem Curator
   - Input: mapping slug e biome_tags; data/core/traits/biome_pools.json
   - Output: Report copertura biomi; Note pool aggiornati; Draft requisiti ambientali
   - Rischio: Medio

6. Piano di migrazione end-to-end
   - Agente: Coordinator
   - Input: Output step 3–5; Schema/glossario
   - Output: Roadmap migrazione; Task per agenti; Impatti cross-dataset
   - Rischio: Basso

7. Documentazione e archiviazione
   - Agente: Archivist
   - Input: Roadmap Coordinator; Report curatori
   - Output: Aggiornamento trait_reference_manual.md; Aggiornamento traits_quicklook.csv; Archiviazione report
   - Rischio: Basso

8. Supporto tooling (opzionale)
   - Agente: Dev-Tooling
   - Input: Necessità emerse; Script in tools/traits
   - Output: Script validazione batch; Script sostituzione slug; README operativo
   - Rischio: Basso

Uso:
- Specifica la famiglia di trait prima di avviare la pipeline.
- Comando di avvio:
  COMANDO: PIPELINE_TRAIT_REFACTOR
  Famiglia: <nome-famiglia>
```

---

## COMANDO: PIPELINE_SPECIE_BIOMA

```text
COMANDO: PIPELINE_SPECIE_BIOMA

Feature:
[es. "Nuovo bioma 'Foresta di Corallo Ombra' + 3 specie di polpo adattate"]

Task:
Progetta una pipeline completa che includa:

- **Lore Designer**:
  - descrizione bioma (`docs/biomes.md`) ed ecosistema con hook narrativi per le 3 specie/creature.

- **Biome & Ecosystem Curator**:
  - validazione schema/alias del nuovo bioma (`config/schemas/biome.schema.yaml`, `data/core/biomes.yaml`, `data/core/biome_aliases.yaml`).
  - allineamento hazard/bande e pool ambientali (`biomes/terraforming_bands.yaml`, `data/core/traits/biome_pools.json`), con report in `docs/planning/biome_*.md`.

- **Species Curator**:
  - trait_plan e biome_affinity per le 3 specie in `data/core/species.yaml` (più eventuali alias in `data/core/species/aliases.json`).
  - integrazione con affinità trait (`data/traits/species_affinity.json`) e note di onboarding in `docs/planning/species_*.md`.

- **Trait Curator**:
  - definizione/normalizzazione dei trait legati a bioma/specie, con controlli su `data/traits/*/*.json`, `data/core/traits/glossary.json`, `docs/trait_reference_manual.md` e istruzioni del Trait Editor (`Trait Editor/docs/howto-author-trait.md`).
  - proposte di coverage/pool per il nuovo bioma in `data/core/traits/biome_pools.json` e aggiornamento dei cataloghi `docs/catalog/*.md|json|csv`.

- **Balancer**:
  - effetti numerici del bioma e stats delle specie, coordinando con i curatori per impatti su slot/tier.

- **Asset Prep**:
  - immagini e schede `.md` in `assets/` o `docs/catalog/` per specie e bioma, seguendo i naming esistenti.

- **Archivist**:
  - aggiornamento indici e struttura documentazione (`docs/`, `reports/`) per registrare pipeline e decisioni.

- **Coordinator**:
  - orchestri gli handoff, definisci dipendenze tra cartelle (data/core, data/traits, docs, Trait Editor) e prepara il report finale.

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
