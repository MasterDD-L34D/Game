# Guida completa ai **Trait** — Evo Tactics

Questa guida è il riferimento operativo per **progettare, scrivere e validare** i trait usati dalle specie/creature in Evo Tactics. Copre: principi di design, dizionario campi, tassonomia funzionale, metriche (UCUM), mappatura ambientale (ENVO), versionamento (SemVer), workflow di authoring e QA/validazione.

> Standard di riferimento: **JSON Schema Draft 2020‑12** (struttura/validazione), **SemVer 2.0.0** (versioning), **UCUM** (unità), **ENVO** (termini ambientali).
>
> • JSON Schema: https://json-schema.org/ (draft 2020‑12 e note di rilascio)  
> • SemVer: https://semver.org/  
> • UCUM: https://ucum.org/ucum  (codici comuni, es. `Cel` per °C, vedi anche HL7 THO)  
> • ENVO (OBO Foundry): https://obofoundry.org/ontology/envo.html, OLS: https://www.ebi.ac.uk/ols4/ontologies/envo/

---

## 1) Cos’è un trait (e cosa non è)
Un **trait** è un’unità funzionale atomica (abilità/adattamento/comportamento) che descrive **che cosa fa** una creatura e **come** lo fa (substrato morfo‑fisiologico + impulso evolutivo). È **riusabile** e **agnostico** rispetto alla specie; le specie vi puntano tramite `trait_refs`.

I trait sono oggetti **JSON** convalidati via **JSON Schema Draft 2020‑12** (vocabolari `core`/`validation`).

---

## 2) Dizionario campi (data‑model)

### Obbligatori (per *singolo* trait)
| Campo | Tipo | Vincoli | Descrizione |
|---|---|---|---|
| `trait_code` | string | `^TR-\d{4}$` | ID stabile univoco. |
| `label` | string | ≥ 3 caratteri | Nome breve ed evocativo. |
| `famiglia_tipologia` | string | — | Cluster funzionale (vedi §3). |
| `fattore_mantenimento_energetico` | string | — | Basso/Medio/Alto (costo narrativo/energetico). |
| `tier` | string | enum `T1`…`T6` | Scala potenza/complessità. |
| `mutazione_indotta` | string | — | Substrato bio/morfo da cui deriva il tratto. |
| `uso_funzione` | string | — | Che cosa fa in gioco. |
| `spinta_selettiva` | string | — | Motivo evolutivo/tattico. |
| `sinergie` | array[string] | non vuoto | Codici trait complementari. |
| `conflitti` | array[string] | — | Trait incompatibili. |
| `version` | string | SemVer 2.0.0 | Versione del trait. |
| `versioning` | object | `{created, updated, author}` | Date ISO (YYYY‑MM‑DD). |

### Opzionali utili
- **Liste/vettori**: `slot` (pattern `^[A-Z]$` per lettera singola), `limits`, `output_effects`.
- **Oggetti semplici**:  
  `slot_profile` (`core`, `complementare`);  
  `cost_profile` (`rest`, `burst`, `sustained`);  
  `testability` (`observable`, `scene_prompt`);  
  `applicability` (`clades`, `envo_terms` = URI ENVO, `notes`);  
  `sinergie_pi` (`co_occorrenze`, `forme`, `tabelle_random`, `combo_totale`).
- **Blocchi descrittivi**: `debolezza`, `morph_structure`, `primary_function`, `cryptozoo_name`, `functional_description`, `trigger`, `ecological_impact`, `notes`.
- **Requisiti ambientali** `requisiti_ambientali` (array di oggetti):  
  • `capacita_richieste`: array[string]  
  • `condizioni.biome_class`: string (nessuna extra prop)  
  • `fonte`: string  • `meta.expansion|tier|notes`

### Guida `tier` (T1–T6)
- **T1**: utility minori/condizionali, bonus situazionali ridotti.  
- **T2**: capacitá utilitarie stabili o micro‑buff/nerf d’area.  
- **T3**: abilità fisiologiche/sensoriali/locomotorie significative; sinergie base.  
- **T4**: impatto alto (raggio/portata/danni) e costo/limiti espliciti.  
- **T5**: capacità macro (volo iper‑sostenuto, metamimetismo); prerequisiti stringenti.  
- **T6**: tratti apicali/trasformativi (rari, heavy gating).

---

## 3) Tassonomia funzionale (`famiglia_tipologia`)
Formato consigliato: **`Macro/Subcluster`**

- **Locomotivo**: Aereo, Acquatico, Terrestre, Arboricolo, Scavo, Balistico.  
- **Sensoriale**: Visivo, Uditivo, Olfattivo, Tatto/Vibro, Interocettivo, Propriocettivo, Magneto‑/Elettro‑ricettivo, Meteo.  
- **Fisiologico**: Metabolico, Termico, Respiratorio, Idrico/Osmotico, Vegetale (fototrofico), Elettrico.  
- **Offensivo**: Termico, Elettrico, Perforante/Proiettili, Contusivo, Velenoso/Chimico, Controllo/Zona.  
- **Difensivo**: Corazza/Armatura, Camuffamento/Mimesi, Rigenerazione, Termoregolazione, Resistenze.  
- **Cognitivo/Sociale**: Pianificazione, Empatia/Coesione, Dominanza/Intimidazione, Apprendimento.  
- **Riproduttivo/Spawn**: Propaguli, Cicli, Nidificazione.  
- **Ecologico**: Impollinazione/Disseminazione, Simbiosi/Parassitismo, Ingegneria di nicchia.

---

## 4) Metriche & Unità (UCUM)

- Usa **UCUM** per unità non ambigue in messaggi elettronici. Esempi ricorrenti:  
  `m`, `s`, `m/s`, `N`, `Pa`, `W`, `J`, `V`, `A`, `Hz`, `dB`, `1` (dimensionless), `Cel` (grado Celsius).  
- Best practice metriche:  
  `name` snake-case tecnico (es. `pressione_getto`); `value` numero **o** qualitativo; `unit` UCUM; `conditions` opzionale (es. `terra|instabile`, `acqua|profonda`).

---

## 5) Requisiti ambientali & ENVO

Compila `applicability.envo_terms` con **URI PURL ENVO** (OBO). Esempi utili:
- Coastline — `http://purl.obolibrary.org/obo/ENVO_00000304`  
- Oceanic epipelagic zone biome — `http://purl.obolibrary.org/obo/ENVO_01000035`  
- Freshwater biome — `http://purl.obolibrary.org/obo/ENVO_00000873`  
- Savanna biome — `http://purl.obolibrary.org/obo/ENVO_01000178`  
- Tropical moist broadleaf forest biome — `http://purl.obolibrary.org/obo/ENVO_01000228`

**Procedura consigliata**
1) Definisci habitat primario/secondario (bioma/ecotopo).  
2) Cerca il termine su OBO Foundry/OLS → copia l’**URI PURL**.  
3) Se servono vincoli aggiuntivi, compila `requisiti_ambientali` con `biome_class`/`meta`.

---

## 6) Costi, limiti, trigger, testabilità

- **Costi**: `fattore_mantenimento_energetico` (Basso/Medio/Alto) + eventuale `metabolic_cost`/`cost_profile` (`rest`/`burst`/`sustained`).  
- **Limiti**: cap numerici, cooldown, timer, prerequisiti ambientali/slot.  
- **Trigger**: evento/scena che attiva la capacità.  
- **Testability**:  
  • `observable` = comportamento misurabile.  
  • `scene_prompt` = prova pratica.

---

## 7) Versioning & governance

Usa **SemVer 2.0.0** per `version`: `MAJOR.MINOR.PATCH[-prerelease][+build]`  
- **MAJOR**: cambi incompatibili.  **MINOR**: aggiunte retro‑compatibili.  **PATCH**: fix/typo.  
Mantieni `versioning.created/updated/author` (ISO) e un CHANGELOG per MAJOR/MINOR.

---

## 8) Workflow di authoring (dalla creatura al trait)

### 8.1 Raccolta input minimi
Firma funzionale; morfologia; fisiologia; locomozione; sensorio; offesa/difesa; cognitivo/sociale; riproduttivo/ecologico; habitat/biomi (→ ENVO); metriche (→ UCUM); costi/limiti/trigger; sinergie/conflitti.

### 8.2 Dalla firma ai trait (3‑pass)
**A — Scomposizione** (3–6 funzioni); **B — Normalizzazione** (cluster unico + tier + metrica chiave); **C — Legami** (≥1 sinergia + conflitti + requisiti ambientali).

---

## 9) QA & Validazione

Pipeline consigliata: lint JSON → validazione schema (Draft 2020‑12) → controlli semantici (sinergie presenti, unità UCUM valide, envo_terms = URI PURL) → gate SemVer (blocco MAJOR senza changelog). Integra `tools/py/trait_template_validator.py` in CI (exit 0/1/2).

---

## 10) Esempio trait (JSON)

```json
{
  "trait_code": "TR-1234",
  "label": "Mimesi Idromolecolare",
  "famiglia_tipologia": "Difensivo/Camuffamento",
  "fattore_mantenimento_energetico": "Medio",
  "tier": "T3",
  "slot": [],
  "slot_profile": { "core": "difensivo", "complementare": "sensoriale" },
  "sinergie": ["TR-1235"],
  "conflitti": ["TR-0099"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": [],
      "condizioni": { "biome_class": "acquatico_superficiale" },
      "fonte": "envo_mapping",
      "meta": { "expansion": "coverage_q4_2025", "tier": "T3", "notes": "" }
    }
  ],
  "mutazione_indotta": "Struttura cellulare con indice di rifrazione prossimo all'acqua.",
  "uso_funzione": "In acqua il profilo visivo viene diffuso, rendendo l'individuo difficile da individuare.",
  "spinta_selettiva": "Predazione d'agguato ed elusione in colonne d'acqua con alta pressione predatoria.",
  "debolezza": "Efficacia ridotta fuori dall'acqua o in acque torbide cariche di particolati.",
  "metrics": [
    { "name": "rilevabilita_visiva", "value": 0.3, "unit": "1", "conditions": "acqua|limpida" }
  ],
  "metabolic_cost": "Medio",
  "cost_profile": { "rest": "Basso", "burst": "Medio", "sustained": "Basso" },
  "trigger": "Immersione in acqua a profondità > 0.5 m",
  "limits": ["Non funziona in aria", "Ridotto in acque torbide"],
  "testability": {
    "observable": "Scompare alla vista laterale entro 10 m in acqua limpida",
    "scene_prompt": "Attraversa una vasca di 20 m con sfondo marcato; annota distanza di perdita visiva"
  },
  "applicability": {
    "clades": [],
    "envo_terms": [
      "http://purl.obolibrary.org/obo/ENVO_00000873",
      "http://purl.obolibrary.org/obo/ENVO_00000304"
    ]
  },
  "version": "0.1.0",
  "versioning": {
    "created": "2025-10-31",
    "updated": "2025-10-31",
    "author": "Master DD / GPT-5 Thinking"
  },
  "notes": "",
  "sinergie_pi": { "co_occorrenze": [], "forme": [], "tabelle_random": [], "combo_totale": 0 }
}
```

---

### Appendice — Link rapidi a standard
- JSON Schema Draft 2020‑12: https://json-schema.org/draft/2020-12/ (core/validation + release notes)
- SemVer 2.0.0: https://semver.org/
- UCUM: https://ucum.org/ucum  — HL7 THO (codici comuni): https://terminology.hl7.org/5.5.0/ValueSet-ucum-common.html
- ENVO (OBO): https://obofoundry.org/ontology/envo.html — OLS ENVO: https://www.ebi.ac.uk/ols4/ontologies/envo/
