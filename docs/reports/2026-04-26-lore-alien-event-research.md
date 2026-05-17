---
title: 'Research — Lore "Evento Alieno destabilizzante": cosa dicono davvero i doc'
doc_status: active
doc_owner: lore-research
workstream: cross-cutting
last_verified: 2026-04-26
source_of_truth: false
language: it
review_cycle_days: 30
---

# Research — Lore "Evento Alieno destabilizzante" nei doc

> Task: l'utente ricorda doc che parlano di un **evento alieno** che destabilizza l'ecosistema, scatena strani eventi e abilita **evoluzione rapida**. Ho cercato sistematicamente in `docs/core/`, `docs/planning/`, `docs/biomes/`, `docs/research/`, `docs/archive/concept-explorations/`, `data/core/`, `incoming/`. Sotto, cosa ho trovato (e cosa NON ho trovato).

## 1. TL;DR (5 bullet)

1. **Non esiste una "lore evento alieno" canonica**. La premessa narrativa ufficiale (`docs/planning/draft-narrative-lore.md:10-22` + `docs/core/00-SOURCE-OF-TRUTH.md:385-432`) è esplicitamente **NON-aliena**: ecosistema primordiale in equilibrio instabile, creature che evolvono sotto pressioni ambientali, **Sistema = Director AI ecologico** (non antagonista cosmico). Dichiarato "**fantastico bio-plausibile, non magico**".
2. **Il framing che assomiglia a "evento alieno destabilizzante" è in realtà l'EVENTO MUTAGENO** — un meccanismo mid-match descritto nei Vertical Slice (`docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html:354`, `:1212-1216`): pressione mutagena cresce di +0.25/turno, raggiunge **soglia mutagena T2** (i nemici mutano), poi **rilascio T3** ("Il mondo è diverso. Voi siete diversi."). Conseguenza cross-bioma: spillover propaga la mutazione su biomi adiacenti.
3. **Strani eventi shipping in runtime sono solo 3** in `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml`: tempesta ferrosa (Badlands), ondata termica (Deserto Caldo), brinastorm (Cryosteppe). Tutti **eventi ecologici**, zero "alien". Lo schema `cross_events` supporta propagazione via `corridor`, `seasonal_bridge`, `trophic_spillover` — l'infrastruttura per "spillover mutageno" esiste, **ma il contenuto alien-event no**.
4. **Rapid evolution mechanic** è realizzato da 3 sistemi paralleli **indipendenti** dal narrative wrapper: (a) **Form evolution** M12 (MBTI-driven, reversibile), (b) **Job leveling** XP M13.P3 (irreversibile lineare), (c) **Mutation system** M14 design draft (`docs/planning/2026-04-25-mutation-system-design.md:21-69`, irreversibile branching, NON ancora wired runtime). Trigger della mutation includono "Pressure-driven: Sistema warning_signals attivo" — l'unico ponte semi-narrativo verso un "evento esterno", ma è ecologico.
5. **Sistema vs evento alieno**: sono concetti **diversi e indipendenti**. Il Sistema è "forza ecologica che mantiene tensione" (`draft-narrative-lore.md:19`) / Director AI (`02-PILASTRI.md:21`). Non è effetto né antagonista di alcun evento alieno. Il "Risveglio del Leviatano" (`docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html:388`) è una **boss fight climactic** in bioma Frattura Abissale Sinaptica, **non** un evento alieno cosmico — il Leviatano dorme nella Frattura Nera, è creatura locale.

---

## 2. Quote testuali canoniche

### 2.1 Premessa narrativa ufficiale (`docs/planning/draft-narrative-lore.md:12-22`)

> Il mondo non ha nome. Le creature che lo abitano non sanno di essere osservate.
> Tu sei il Sistema — o forse, sei chi resiste al Sistema.
>
> ### Backstory (bozza)
>
> Un ecosistema primordiale in equilibrio instabile. Creature modulari evolvono in risposta a pressioni ambientali: biomi che cambiano, predatori che si adattano, risorse che migrano. Non c'è "bene" o "male" — c'è **pressione selettiva e risposta adattiva**.
>
> Il **Sistema** (Director AI) è la forza ecologica che mantiene l'ecosistema in tensione: introduce predatori, altera terreni, scatena StressWave. Non è malvagio — è il test evolutivo che forgia le creature.

### 2.2 Tono dichiarato (`docs/planning/draft-narrative-lore.md:25-30`)

> | Asse                     | Posizione Evo-Tactics                                        |
> | ------------------------ | ------------------------------------------------------------ |
> | Realistico ↔ Fantastico | **Fantastico bio-plausibile (evoluzione accelerata, non magia)** |
> | Esplicito ↔ Suggerito   | Suggerito — lore emerge da gameplay, non da esposizione      |

Nota: "evoluzione accelerata" è qui esplicitato come **flavour bio-plausibile**, non come conseguenza di evento alieno.

### 2.3 Evento mutageno mid-match (`docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html:354-380`)

> MINUTO 2 · EVENTO MUTAGENO · SOGLIA
> EVENTO · PRESSIONE MUTAGENA  · 0.25 ▲ +0.25/turno  · SOGLIA T2  · RILASCIO T3

`:1212-1216`:

> T2 · escalation · soglia mutagena · nemici mutano · P1 agisce: conseguenza visibile.

`:1318-1328` (T3 conseguenza):

> Il mondo è diverso. Voi siete diversi.

### 2.4 Vertical Slice — Risveglio del Leviatano (`docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html:388-414`)

> CAP. VII · RISVEGLIO DEL LEVIATANO
> FRATTURA ABISSALE SINAPTICA · 3 STRATI
> La marea luminosa si ritira. Il canto della Frattura sale di un'ottava.

Soglie biome (`:550`): `SYNC 0.52 ▸ OVERLOAD 0.74 ▸ FRACTURE 0.90`. Il Leviatano è creatura del fondo (`:469` "Il Leviatano Risonante dorme al fondo"), boss biome-locale, **non incursione esterna**.

### 2.5 Mutation system trigger types (`docs/planning/2026-04-25-mutation-system-design.md:62-69`)

> ### 3.2 Trigger types (5 categorie)
>
> 1. **Combat XP**: "killed N enemies of trait X with this unit"
> 2. **Status applied**: "applied N panic / bleeding / fracture"
> 3. **Biome exposure**: "spent N rounds in biome X"
> 4. **Survival**: "took N hits without KO"
> 5. **Pressure-driven**: "Sistema warning_signals X attivo" (high pressure tier, narrative event)

Il trigger #5 "Pressure-driven" è l'unico che lega mutazione → evento di pressione → narrativa. Ma non è alieno: è ecologico.

---

## 3. Mappa concettuale — cosa esiste davvero

```
                ┌──── PREMESSA NARRATIVA (canonica) ────┐
                │  Ecosistema primordiale, no nome       │
                │  Creature modulari evolvono            │
                │  SISTEMA = Director AI ecologico       │
                │  Tono: fantastico bio-plausibile       │
                └───────────────┬───────────────────────┘
                                │
                                ▼
        ┌──────────────────────────────────────────────────┐
        │  PRESSIONE ECOLOGICA (gameplay layer)             │
        │   ├── StressWave (in-match, 0.0-1.0)              │
        │   ├── Pressure tier Sistema (Calm→Apex)           │
        │   ├── Spillover cross-bioma (corridor/bridge)     │
        │   └── Mutagen Event (concept slice, NOT shipped)  │
        └────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┴─────────────────────────────────────┐
        ▼                                                   ▼
┌───────────────────┐                               ┌──────────────────┐
│ STRANI EVENTI     │                               │ EVOLUZIONE       │
│ (ecological)      │                               │ RAPIDA           │
│  cross_events.yaml│                               │  (3 sistemi)     │
│   ├ tempesta ferro│                               │  ├ Form M12      │
│   ├ ondata termica│                               │  ├ Job XP M13    │
│   └ brinastorm    │                               │  └ Mutation M14  │
└───────────────────┘                               └──────────────────┘
```

**Quello che NON c'è**: alcuna entità "alien", "extramondo", "cosmica", "incursione", "portale dimensionale", "caduta meteorite", "risveglio cataclisma globale" come fonte canonica della destabilizzazione.

---

## 4. Rapid evolution mechanic — come è realizzato runtime

| Sistema             | File runtime                                                      | Trigger                 | Reversibile | Status (2026-04-26) |
| ------------------- | ----------------------------------------------------------------- | ----------------------- | ----------- | ------------------- |
| **Form evolution**  | `apps/backend/services/forms/formEvolution.js` (M12.A)            | VC axes confidence      | Sì (cooldown) | 🟢 candidato (Phase D shipped) |
| **Job leveling**    | `data/core/progression/perks.yaml` + ProgressionEngine (M13.P3)   | XP threshold            | No          | 🟢 candidato (Phase B shipped) |
| **Mutation**        | `data/core/mutations/mutation_catalog.yaml` (design only, M14)    | Multi (PE+PI+exposure)  | No          | 🟡 design draft, NON wired |
| **Tri-Sorgente reward** | `apps/backend/services/rewardOffer.js` (V2 vision-gap PR #1726) | Encounter end + softmax | One-shot    | 🟢 (Vision Gap chiuso) |

Riferimenti:

- `docs/core/00-GDD_MASTER.md:141` — formula MBTI surface + 16 forme + 7 pacchetti tematici PI
- `docs/planning/2026-04-25-mutation-system-design.md:24-32` — tabella diff Job/Form/Mutation
- `docs/core/02-PILASTRI.md:18` — Pillar 2 framing "**Wesnoth advancement tree + AI War pack unlock (NON Spore sim continuo)**"

**Conclusione**: l'evoluzione rapida c'è, ma è **derivata da gameplay** (telemetria + XP + pressione bioma), **non da evento alieno scatenante**.

---

## 5. Strani eventi catalogati — lista runtime

### 5.1 Eventi cross-bioma (runtime, additive `cross_events.yaml`)

| ID                      | Sorgente       | Propaga via                              | Effetto                                                    |
| ----------------------- | -------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `evento-tempesta-ferrosa` | BADLANDS     | corridor, seasonal_bridge                | polveri ferrose + carica magnetica, penalità visibilità/gear metallico |
| `evento-ondata-termica`   | DESERTO_CALDO | corridor                                 | ondata calore + ionizzazione, stress termico esteso        |
| `evento-brinastorm`       | CRYOSTEPPE    | seasonal_bridge, trophic_spillover       | ghiaccio fine sospensione, visibilità ridotta, attrito ↑   |

Source: `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml:1-32`. **Schema supporta espansione**: zero alien-event entry, ma struttura compatibile.

### 5.2 Hazard di bioma (per-encounter, `15-LEVEL_DESIGN.md:57`)

> StressWave (da `SistemaNPG-PF-Mutazioni.md`): **pressione ambientale che modifica terrain/hazard mid-match**.

Esempi hazard Frattura Abissale Sinaptica (`docs/biomes/Frattura_Abissale_Sinaptica_biome.md:35-59`):

- `photic_surge` + `synaptic_glare` (Cresta Fotofase, T1)
- `memory_fog` + `desync_field` (Soglia Crepuscolare, T2)
- `gravitic_shear` + `black_current` (Frattura Nera, T3)

Tutti **bio-elettrici / ambientali**, nessuno "alien".

### 5.3 Concept-only (Vertical Slice, NON shipped runtime)

- **Evento mutageno** (`Vertical Slice - Minute 2 Combat.html`) — pressione +0.25/turno → soglia T2 (nemici mutano) → rilascio T3 (mondo+squadra cambiano). Cross-bioma propagation visualizzata in slice (`:1253-1308`).
- **Spillover mutageno** (`Pitch Deck v2.html:543, :800`) — concetto "**creature che si contaminano**".
- **Risveglio del Leviatano** (`Vertical Slice - Risveglio del Leviatano.html`) — boss climax 3 strati, soglie SYNC/OVERLOAD/FRACTURE, **archiviato come "Exploration pura, non P0/P1"** (`docs/planning/2026-04-20-integrated-design-map.md:162`).

---

## 6. Sistema vs Evento Alieno — claim e fonti

| Claim                                         | Fonte                                                       | Verdict                |
| --------------------------------------------- | ----------------------------------------------------------- | ---------------------- |
| Sistema = Director AI ecologico               | `draft-narrative-lore.md:19`, `02-PILASTRI.md:21`           | ✅ Canonical           |
| Sistema = anti-corpo contro evento alieno     | (nessuna fonte)                                             | ❌ Non documentato     |
| Sistema = effetto di evento alieno            | (nessuna fonte)                                             | ❌ Non documentato     |
| Evento alieno destabilizza ecosistema         | (nessuna fonte canonica)                                    | ❌ Non documentato     |
| Evento mutageno destabilizza match            | `Vertical Slice - Minute 2 Combat.html:354, :1212`          | ✅ Concept slice (non shipped) |
| Evoluzione rapida via evento alieno           | (nessuna fonte)                                             | ❌ Non documentato     |
| Evoluzione rapida via VC + XP + biome exposure| `mutation-system-design.md:62`, `formEvolution.js`, `progressionEngine.js` | ✅ Canonical |

**Sintesi**: Sistema e "evento alieno" non hanno **alcuna relazione canonica documentata** nel repo. Il Sistema è puramente ecologico-meccanico.

---

## 7. Gap docs — cosa NON è chiaro / dove serve design decision

1. **Origine narrativa del Sistema**: chi/cosa lo ha creato? Da dove arriva il "test evolutivo"? `draft-narrative-lore.md` lo descrive come **postulato**, non come effetto. Decisione design pending.
2. **Mutagen event runtime**: il concept Vertical Slice ha **3 prove di stress** (concept-only). Nessun ticket M-NN nel BACKLOG corrente lo wira runtime. Se l'utente lo immagina come "evento alieno", **manca il design bridge** dal narrative concept a runtime mechanic.
3. **Cross-events espansione**: schema supporta più eventi, contenuto si limita a 3 entry meteo-ecologiche. Backlog implicito.
4. **Lore meta-narrativa di campagna** (`SOURCE-OF-TRUTH.md:413-417`): «il Sistema non è casuale; addestra, modella e mette pressione». **Climax** dichiarato («i giocatori capiscono che il Sistema li sta _addestrando_», `draft-narrative-lore.md:53`). Nessun arco climax con evento alieno. Possibile gap se l'utente vuole introdurre un "vero antagonista cosmico" come boss campaign.
5. **Ricordo utente vs doc reali**: l'utente potrebbe star ricordando un **design exploration archiviato** o una **conversazione precedente non commitata**. Worth checking: `docs/incoming/`, branch chiusi `gh pr list --search "alien"`, memory PC-local fuori repo.
6. **Possibile re-framing**: se si vuole dare a Evo Tactics un'identità più "sci-fi alien", il **Mutagen Event** + **Spillover** + **Frattura** sono i building blocks pronti per essere reframati. Effort: ~2-4h doc draft narrativo + decision ADR.

---

## 8. Path letti (audit trail)

- `docs/planning/draft-narrative-lore.md` (intero, 99 righe — fonte primaria narrativa)
- `docs/planning/research/lore_concepts.md` (intero, 55 righe — sandbox archetipi)
- `docs/core/00-SOURCE-OF-TRUTH.md:385-460` (§7 Premessa narrativa)
- `docs/core/01-VISIONE.md` (intero, 15 righe — solo tagline)
- `docs/core/02-PILASTRI.md` (intero, 36 righe)
- `docs/core/90-FINAL-DESIGN-FREEZE.md:1-80`
- `docs/biomes/Frattura_Abissale_Sinaptica_lore.md` + `_biome.md`
- `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html` (key sections)
- `docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html` (key sections)
- `docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 3 Consequence.html` (grep)
- `docs/archive/concept-explorations/2026-04/Evo Tactics Pitch Deck v2.html` (grep)
- `docs/planning/2026-04-25-mutation-system-design.md:1-100`
- `data/core/biomes.yaml` (grep alien/cataclism)
- `data/core/narrative/skiv_storylets.yaml` (intero — Skiv non aliena)
- `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml` (intero, 32 righe)
- `agents/lore-designer.md` (intero — agent può scrivere lore, no menzione alien)

**Glob negative**:

- `docs/research/*` — solo Skiv research + Triangle Strategy, nessun alien
- `incoming/lavoro_da_classificare/` — README placeholder, nessun alien
- `docs/skiv/CANONICAL.md` — Skiv canonical, no alien framing
- `docs/planning/EVO_FINAL_DESIGN_*.md` — bundle esecutivo, no alien

---

## 9. Raccomandazione sintetica

L'utente sta probabilmente ricordando un **mix di 3 cose**:

1. La **premessa narrativa** ("evoluzione accelerata, ecosistema in equilibrio instabile") — REALE ma **non aliena**.
2. L'**Evento Mutageno** dei Vertical Slice — REALE come concept ma **NON shipped runtime + non alien**.
3. Forse una **discussione di design fuori repo** (ChatGPT? Memory PC-local?) che ha framettato il sistema in chiave alien — **NON trovata in git**.

**Se l'utente vuole davvero introdurre un evento alieno destabilizzante** come arco di campagna, **manca**: ADR dedicato, draft narrativo, link a meccanica runtime (mutation triggers + cross_events espansione + boss climax). Effort design draft: ~2-4h. Effort wire runtime mutation system: ~12-16h (M14 design già pronto).

— Fine report.
