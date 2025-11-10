# HOW‑TO — Autore di Trait (Evo Tactics)

Questa mini‑guida è la versione *operativa* della **Guida completa ai Trait**. È pensata per chi deve
scrivere nuovi trait in 10–15 minuti, con checklist, snippet e regole di stile.

> Standard: **JSON Schema 2020‑12** (struttura/validazione), **SemVer 2.0.0** (versioning),
> **UCUM** (unità) e **ENVO** (termini ambientali).

---

## 0) Naming & codifica (regole rapide)
- `trait_code`: `TR-####` (es. `TR-1041`), univoco e stabile.
- `label`: 2–4 parole, evocativo e funzionale (es. “Idro‑Cannoni Pressurizzati”).
- `famiglia_tipologia`: usa il formato **Macro/Subcluster** (es. `Offensivo/Termico`).
- `tier`: **T1–T6** (vedi README *traits_reference.md* per scala).
- `version`: SemVer (es. `0.1.0`). Aggiorna a **PATCH** per fix, **MINOR** per aggiunte compatibili,
  **MAJOR** per breaking changes.
- `metrics[*].unit`: codice **UCUM** (es. `m/s`, `Pa`, `Cel`, `V`, `1`).

---

## 1) Checklist fulminea (compilazione)
1. **Funzione**: che cosa fa? → `uso_funzione` (1 riga), `mutazione_indotta` (substrato bio), `spinta_selettiva` (perché).
2. **Cluster & tier**: `famiglia_tipologia` coerente + `tier` motivato.
3. **Ambiente**: `applicability.envo_terms` con **URI ENVO** (PURL) e, se serve, `requisiti_ambientali`.
4. **Costi & limiti**: `fattore_mantenimento_energetico`, `cost_profile`, `limits`, `trigger`.
5. **Metriche** (≥1): `metrics[{name,value,unit,conditions?}]` — unità **UCUM**.
6. **Legami**: `sinergie` (≥1 codice trait esistente), `conflitti` sensati.
7. **Testabilità**: `testability.observable` + `testability.scene_prompt` (una prova pratica).
8. **Versioning**: `version` + `versioning.{created,updated,author}` (ISO).

> Done? Esegui il validator schema e la CI (vedi §4).

---

## 2) Snippet minimi (copia‑incolla)

### 2.1 Trait JSON (scheletro minimo, **validabile**)
```json
{
  "trait_code": "TR-1999",
  "label": "Esempio Funzionale",
  "famiglia_tipologia": "Locomotivo/Terrestre",
  "fattore_mantenimento_energetico": "Medio",
  "tier": "T3",
  "slot": [],
  "sinergie": ["TR-1200"],
  "conflitti": [],
  "requisiti_ambientali": [
    {
      "capacita_richieste": [],
      "condizioni": { "biome_class": "terrestre_instabile" },
      "fonte": "envo_mapping",
      "meta": { "tier": "T3", "notes": "" }
    }
  ],
  "mutazione_indotta": "Tendini elastici ad alta restituzione.",
  "uso_funzione": "Migliora accelerazione e salto.",
  "spinta_selettiva": "Inseguimenti brevi su terreno instabile.",
  "metrics": [
    { "name": "accelerazione_0_10", "value": 6.5, "unit": "m/s2" }
  ],
  "cost_profile": { "rest": "Basso", "burst": "Medio", "sustained": "Basso" },
  "testability": {
    "observable": "Scatto 0–10 m in < 2 s",
    "scene_prompt": "Cronometra tre sprint 10 m; riporta il migliore"
  },
  "applicability": {
    "clades": ["Tetrapodi"],
    "envo_terms": ["http://purl.obolibrary.org/obo/ENVO_01000178"]
  },
  "version": "0.1.0",
  "versioning": {
    "created": "2025-10-31",
    "updated": "2025-10-31",
    "author": "Master DD / GPT-5 Thinking"
  }
}
```

### 2.2 Trait YAML (equivalente, se serve authoring umano)
```yaml
trait_code: TR-1999
label: Esempio Funzionale
famiglia_tipologia: Locomotivo/Terrestre
fattore_mantenimento_energetico: Medio
tier: T3
slot: []
sinergie: [TR-1200]
conflitti: []
requisiti_ambientali:
  - capacita_richieste: []
    condizioni: { biome_class: terrestre_instabile }
    fonte: envo_mapping
    meta: { tier: T3, notes: "" }
mutazione_indotta: Tendini elastici ad alta restituzione.
uso_funzione: Migliora accelerazione e salto.
spinta_selettiva: Inseguimenti brevi su terreno instabile.
metrics:
  - { name: accelerazione_0_10, value: 6.5, unit: m/s2 }
cost_profile: { rest: Basso, burst: Medio, sustained: Basso }
testability:
  observable: Scatto 0–10 m in < 2 s
  scene_prompt: Cronometra tre sprint 10 m; riporta il migliore
applicability:
  clades: [Tetrapodi]
  envo_terms:
    - http://purl.obolibrary.org/obo/ENVO_01000178
version: 0.1.0
versioning: { created: 2025-10-31, updated: 2025-10-31, author: Master DD / GPT-5 Thinking }
```

---

## 3) Pattern pronti (riuso rapido)

**Sinergie tipiche**
- Locomotivo/Aereo ↔ Sensoriale/Orientamento (navigatorio magnetico).
- Offensivo/Termico ↔ Fisiologico/Termico (termogenesi → fiato).
- Difensivo/Mimesi ↔ Sensoriale/Chimico (odor masking).

**Conflitti tipici**
- Termoregolazione “freddo‑ottimizzata” vs Pirocinesi ad alto `Cel`.
- Branchie cutanee vs Desertificazione (biome inconciliabile).

**Trigger ricorrenti**
- “Durante volo a quota > 100 m” • “Immersione > 0.5 m” • “Sforzo burst > 6 s”.

**Limits (cap/cooldown)**
- “Max +2 cumulativo a check equilibrio” • “Cooldown 1 min dopo 3 scariche”.

---

## 4) Validazione & CI
- Valida contro gli **schemi 2020‑12** (catalogo + entry). Falla fallire se: `sinergie` vuote,
  UCUM non valido, ENVO non PURL, codici duplicati.
- Gate **SemVer**: blocca MAJOR senza changelog; consenti PATCH per fix.
- Script consigliato: `tools/py/trait_template_validator.py` (exit 0/1/2).

---

## 5) Operativo (PR/commit)
1. Aggiungi/aggiorna il trait (JSON o YAML).
2. Esegui `validate_traits` in locale.
3. Commit con messaggio strutturato: `feat(trait): nuovo TR-1999 …` / `fix(trait): …`.
4. Apri PR con changelog *per trait*. Linka la validazione verde.
