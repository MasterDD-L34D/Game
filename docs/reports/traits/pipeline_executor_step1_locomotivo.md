# Pipeline TRAIT – Famiglia LOCOMOTIVO (Step 1)

## Step 1: Audit e validazione dataset locomotivo — Agente: Trait Curator

### Piano sintetico
1. Elencare il perimetro dati (file locomotivo) e le fonti di riferimento per schema/glossario.
2. Controllare coerenza formale dei campi obbligatori (id, label, famiglia_tipologia, tier, sinergie/conflitti, narrativa base).
3. Mappare copertura di metadati avanzati (versioning, usage_tags, slot_profile, species_affinity) vs. schema/linee guida.
4. Verificare allineamento di provenienza (`data_origin`) e classificazione (`famiglia_tipologia`, biome) tra file.
5. Incrociare la presenza in indici globali (`index.json`, `index.csv`) e link specie/biomi.
6. Raccogliere anomalie e next step per normalizzazione (senza modificare file).

### Esecuzione (strict-mode)
- **Perimetro e schema di riferimento.** Analizzati 11 file in `data/traits/locomotivo/` e lo schema `config/schemas/trait.schema.json` per valutare i campi richiesti e i limiti sulle proprietà aggiuntive.
- **Completezza base.** Ogni file locomotivo include i campi minimi richiesti (id, label, famiglia_tipologia, fattore_mantenimento_energetico, tier, slot, sinergie, conflitti, mutazione_indotta, uso_funzione, spinta_selettiva) con struttura consistente e blocchi `cost_profile`, `testability`, `requisiti_ambientali` e `applicability`. Esempi: `ali_fono_risonanti.json` (Locomotivo/Aereo) e `scheletro_idraulico_a_pistoni.json` (Locomotivo/Balistico) rispettano lo schema base.
- **Metadati avanzati mancanti o disallineati.** Nessun file espone `usage_tags`, `slot_profile` o `species_affinity`, limitando l’integrazione con editor e pool. Solo `scheletro_idraulico_a_pistoni.json` ha un blocco `version`/`versioning`, mentre gli altri 10 file ne sono privi, indicando una versione dati non allineata.
- **Data origin e copertura indici.** Dieci file condividono `data_origin: coverage_q4_2025`; `scheletro_idraulico_a_pistoni.json` usa invece `incoming_tr1100_pack`, generando eterogeneità nelle provenance. Negli indici globali, `data/traits/index.json` non include il gruppo locomotivo, mentre `data/traits/index.csv` contiene solo la riga del tratto a pistoni (senza gli altri 10), segnalando lacune di indicizzazione.
- **Sinergie e conflitti.** Le sinergie sono presenti ma limitate (1–2 voci per tratto) e tutti i conflitti sono vuoti; servirà una revisione incrociata con glossario/affinità per arricchire o validare queste relazioni.

### Patch testuali suggerite (non applicate)
- **Allineare `data_origin` e versioning.** Portare `scheletro_idraulico_a_pistoni.json` su `coverage_q4_2025` e aggiungere blocco `version`/`versioning` coerente agli altri 10 file (bozza):

  ```diff
  diff --git a/data/traits/locomotivo/scheletro_idraulico_a_pistoni.json b/data/traits/locomotivo/scheletro_idraulico_a_pistoni.json
  -  "data_origin": "incoming_tr1100_pack",
  +  "data_origin": "coverage_q4_2025",
  +  "usage_tags": [],
  +  "slot_profile": {},
  +  "species_affinity": [],
  +  "version": "2.0.1",
  +  "versioning": {
  +    "created": "2025-11-04",
  +    "updated": "2025-11-23",
  +    "author": "Master DD / GPT-5 Pro"
  +  }
  ```

  Per gli altri file `data/traits/locomotivo/*.json`, replicare blocco `usage_tags`/`slot_profile`/`species_affinity` vuoti e aggiungere un `version` iniziale, es.:

  ```diff
  diff --git a/data/traits/locomotivo/ali_fono_risonanti.json b/data/traits/locomotivo/ali_fono_risonanti.json
  +  "usage_tags": [],
  +  "slot_profile": {},
  +  "species_affinity": [],
  +  "version": "1.0.0",
  +  "versioning": {
  +    "created": "2025-11-04",
  +    "updated": "2025-11-23",
  +    "author": "Master DD / GPT-5 Pro"
  +  }
  ```

- **Recuperare copertura negli indici.** Aggiungere il gruppo locomotivo a `data/traits/index.json` e inserire tutte le 11 righe nel CSV (esempio per una riga):

  ```diff
  diff --git a/data/traits/index.json b/data/traits/index.json
  +    "scheletro_idraulico_a_pistoni": {
  +      "id": "scheletro_idraulico_a_pistoni",
  +      "label": "Scheletro Idraulico a Pistoni",
  +      "famiglia_tipologia": "Locomotivo/Balistico",
  +      "data_origin": "coverage_q4_2025",
  +      "slot": [],
  +      "usage_tags": [],
  +      "species_affinity": [],
  +      "completion_flags": {
  +        "has_biome": false,
  +        "has_data_origin": true,
  +        "has_species_link": false,
  +        "has_usage_tags": false
  +      }
  +    },
  ```

  ```diff
  diff --git a/data/traits/index.csv b/data/traits/index.csv
  +scheletro_idraulico_a_pistoni,i18n:traits.scheletro_idraulico_a_pistoni.label,Locomotivo,Balistico,data/traits/locomotivo/scheletro_idraulico_a_pistoni.json,,coverage_q4_2025,,false,false
  ```

### Self-critique
- Non è stata eseguita una validazione automatica contro lo schema JSON; le conclusioni si basano su ispezione manuale e query mirate.
- L’assenza di voce in `index.json` è dedotta dall’assenza di occorrenze “locomotivo” (ricerca testuale); una validazione strutturata dell’indice potrebbe confermare meglio.
- Non è stata verificata la copertura delle chiavi i18n in `locales/` né la presenza nel glossario, che andrebbero controllate negli step successivi.

### File da leggere (nessuna modifica eseguita)
- `data/traits/locomotivo/*.json`
- `config/schemas/trait.schema.json`
- `data/traits/index.json`
- `data/traits/index.csv`
- (per step futuri) `data/traits/species_affinity.json`, `docs/trait_reference_manual.md`, `data/core/traits/glossary.json`

### File che andrebbero creati/modificati (non eseguito)
- Aggiornamento o aggiunta voci locomotivo in `data/traits/index.json` e `data/traits/index.csv`.
- Allineamento `data_origin`, `versioning`, `usage_tags`, `slot_profile`, `species_affinity` nei singoli file locomotivo.
- Eventuali integrazioni a `docs/trait_reference_manual.md` e `data/core/traits/glossary.json` per definizioni e regole.

### Rischi
- Propagazione di slug incompleti negli indici/species pool se l’allineamento non viene eseguito nel prossimo step.
- Incoerenza di provenienza (`data_origin`) che può complicare filtri e migrazioni.
- Mancanza di metadati avanzati limita automazioni (es. check su slot/usage) e può introdurre conflitti nascosti con altri trait.

