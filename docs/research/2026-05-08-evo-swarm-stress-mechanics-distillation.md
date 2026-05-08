---
title: Evo-swarm distillation — run #5 raw output + verification status
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-05-08
source_of_truth: false
language: it
review_cycle_days: 30
---

# Evo-swarm distillation run #5 — raw output + verification status

> **Cosa è questo doc**: registrazione onesta dei cicli **25-30 del run #5 evo-swarm** (2026-05-07 sera, 22:20 → 23:28) con **cross-verification contro canonical Game data**. Non è un design proposal autoritativo: è un audit di cosa lo swarm ha prodotto vs cosa esiste davvero in `data/core/`.
>
> **Cosa NON è questo doc**: una specifica di sistema da implementare. Diversi claim del swarm sono risultati hallucinati o derivati da inferenze non verificate. Vedi sezione [Verification status](#verification-status) per il dettaglio.
>
> **Origine**: 6 specialist consecutivi accept score 7.5/10 nei cicli 25-30, dopo Dafne intervention al ~ciclo 23. Score swarm-side ≠ accuratezza canonical Game.

## Indice

1. [Contesto run #5](#contesto-run-5)
2. [Verification status](#verification-status)
3. [Output raw del swarm](#output-raw-del-swarm)
4. [Stress mechanics framework](#stress-mechanics-framework)
5. [Open questions per Game-side review](#open-questions-per-game-side-review)
6. [Source artifacts](#source-artifacts)

---

## Contesto run #5

| Cycle | Specialist | Tema dichiarato dal swarm |
|------:|------------|---------------------------|
| 25 | lore-designer | Verifica lore + bilanciamento |
| 26 | species-curator | Sezione guida bioma Abisso Vulcanico |
| 27 | balancer | Stress modifiers per abisso_vulcanico |
| 28 | trait-curator | Allineamento definizioni trait |
| 29 | biome-ecosystem-curator | Guida Atollo di Ossidiana |
| 30 | archivist | Schema meccaniche stress ambientali |

Tutti gli artifact con `co02_validation.status = "complete"`, score 7.5/10. Modello: `qwen3-coder:30b`. **`co02_validation.complete` valida la struttura JSON in output, non l'accuratezza dei contenuti contro canonical Game.**

Run stats: gameplay ratio 0.71 (vs target 0.40), 26/30 ok, 0 reject, direction_overrides 0. Cycle #24 errore `playtest-coordinator` non trovato (bug config risolto in [evo-swarm#69](https://github.com/MasterDD-L34D/evo-swarm/pull/69)).

---

## Verification status

Ogni claim del swarm verificato contro `data/core/` Game canonical (commit `46e90cab`). Tre livelli:

- ✅ **VERIFIED** — il claim corrisponde a canonical
- ⚠️ **PARTIAL** — nome esiste ma in contesto/struttura diversi da quanto detto
- ❌ **HALLUCINATED** — non esiste in canonical, swarm inferenza non fondata

| # | Claim swarm | Status | Note |
|---|-------------|--------|------|
| 1 | `abisso_vulcanico` esiste come bioma | ✅ VERIFIED | `data/core/biomes.yaml`, `biome_class: geothermal`, summary "Camini abissali con lava pressurizzata e fauna bio-termica" |
| 2 | Abisso Vulcanico ha affixes `termico, luminescente, spore_diluite, sabbia` | ❌ HALLUCINATED | biomes.yaml non elenca questi affixes; canonical descrive "lava pressurizzata + bio-termica" — natura diversa (deep vents, non sabbia) |
| 3 | Bioma "Atollo di Ossidiana" esiste | ⚠️ PARTIAL | Trovato solo in `biome_aliases.yaml` + `active_effects.yaml` (alias/reference), non come entry primaria in `biomes.yaml` |
| 4 | `dune_stalker` esiste come specie | ✅ VERIFIED | `data/core/species.yaml`, genus Arenavenator, T2 Threat |
| 5 | `dune_stalker` è "adatto" a Abisso Vulcanico | ❌ HALLUCINATED | Canonical: `biome_affinity: savana`. Lo swarm ha proposto reassign senza dichiararlo come tale |
| 6 | `polpo_araldo_sinaptico` esiste | ✅ VERIFIED | species.yaml, genus Synaptopus, T5 Keystone |
| 7 | `echolocation` è un "trait" | ❌ HALLUCINATED come categoria | Canonical: è una voce in `default_parts.senses` di dune_stalker (body part), NON un trait nel `trait_plan` |
| 8 | `sand_digest` è un "trait" | ❌ HALLUCINATED come categoria | Canonical: voce in `default_parts.metabolism` di dune_stalker, NON un trait |
| 9 | `impulsi_bioluminescenti` è un trait | ✅ VERIFIED | `data/core/traits/glossary.json` lo definisce come trait |
| 10 | `nodi_sinaptici_superficiali` è un trait | ✅ VERIFIED | glossary.json |
| 11 | `thermal_resistance` esiste come trait | ❌ HALLUCINATED | Non trovato in glossary.json, biome_pools.json, active_effects.yaml |
| 12 | `substrate_grip` è un trait esistente | ❌ HALLUCINATED | Non in alcun file canonical. Lo swarm correttamente lo flagga come "proposto, da creare" |
| 13 | `spore_filtration`, `eyestalk_protection` proposed nuovi | ✅ correct framing | Sono dichiarati come proposte, non come esistenti |

**Score onestà run #5 vs canonical**: 5/13 verified, 1/13 partial, 7/13 hallucinated. Il swarm ha **riconosciuto specie+trait reali** ma ha **inferito affinità+strutture+attributi non supportati da canonical**.

---

## Output raw del swarm

### Ciclo 26 — species-curator (claim su Abisso Vulcanico)

Lo swarm ha proposto: "Aggiungere una sezione dedicata al bioma Abisso Vulcanico con dettagli sulle specie adatte, trait e strategie tattiche".

Specie citate dal swarm con relativi default_parts/trait dichiarati come "adatti":

| Specie | Cosa swarm dice | Cosa canonical dice |
|--------|-----------------|---------------------|
| `dune_stalker` | "echolocation, sand_digest" come trait | `echolocation` ∈ default_parts.senses; `sand_digest` ∈ default_parts.metabolism. Trait reali (trait_plan): `artigli_sette_vie`, `struttura_elastica_amorfa`, `scheletro_idro_regolante`, `sensori_geomagnetici`. biome_affinity: **savana** (non abisso_vulcanico) |
| `polpo_araldo_sinaptico` | "impulsi_bioluminescenti, nodi_sinaptici_superficiali" | Entrambi sono trait reali in glossary.json. biome_affinity da verificare |

**Gap rilevato dal swarm** (cycle 26 `gaps`): "Nessuna specie specifica già marcata come `abisso_vulcanico`-native in `species.yaml`." Questo è verificabilmente **vero**: nessuna specie canonical ha `biome_affinity: abisso_vulcanico` in species.yaml. **Ma la conclusione del swarm — che dune_stalker e polpo_araldo siano i candidati — è inferenza non fondata** (dune_stalker è savana-affinity).

### Ciclo 27 — balancer (stress modifiers Abisso Vulcanico)

Lo swarm ha proposto stress modifier framework con vector termico/luminescenza/spore. **Le hook su `thermal_resistance` non sono valide** perché quel trait non esiste canonical. Le altre hook (`impulsi_bioluminescenti`) puntano a trait reali.

### Ciclo 29 — biome-ecosystem-curator (Atollo di Ossidiana)

Lo swarm ha caratterizzato Atollo di Ossidiana come "marine costiero con substrato vulcanico solidificato". Canonical Game ha solo riferimenti ad `atollo_ossidiana` in `biome_aliases.yaml` (alias) e `active_effects.yaml`, non una entry primaria. **Il swarm potrebbe avere caratterizzato un bioma che esiste solo as aliased reference**.

### Cicli 25 (lore), 28 (trait alignment), 30 (archivist schema)

Output meta-design (lore consistency, trait taxonomy, schema framework). Non producono claim verificabili contro canonical specifici.

---

## Stress mechanics framework

**Cross-cycle synthesis** (cycle 27 + 30). Lo swarm ha proposto la categoria gameplay "stress ambientale" distinta dal damage diretto:

1. **Accumulo graduale**: stress riduce capacità nel tempo, non danneggia direttamente.
2. **Recovery passivo**: in safe zone (es. nodi termali) decade per turn.
3. **Trait-mediated**: trait pertinenti annullano o trasformano lo stress.
4. **Feedback visibile**: leggibilità player (icona/anim/sound).

### Schema dati — versione corretta vs swarm output

**❌ Versione swarm (errata)** — il snippet originale era:

```yaml
# data/core/traits/active_effects.yaml — addendum proposto
stress_environmental:
  source: biome_affixes
  vector: [...]
  ...
```

**Problema (rilevato da Codex review su PR #2108)**: `active_effects.yaml` ha schema `version + traits:` map. Il loader runtime `loadActiveTraitRegistry` legge solo `parsed.traits`. `stress_environmental` come top-level sibling sarebbe **silently ignored**.

**✅ Versione corretta — opzione A: nest sotto traits map** (se stress_environmental è modellato come trait meccanico):

```yaml
# data/core/traits/active_effects.yaml — addendum proposto (UNDER traits:)
version: 1
traits:
  # ... trait esistenti SPRINT_002 ...
  stress_environmental:
    type: environmental_modifier
    source: biome_affixes  # FK a biomes.yaml
    vector: [termico, meccanico, chimico, percettivo]
    accumulation_rate: 0.0  # placeholder, balance TBD
    recovery_rate: 0.0      # placeholder
    threshold_debuff: 0     # placeholder
    mitigating_traits: []   # lista trait che riducono accumulation
    inverting_traits: []    # lista trait che convertono stress in bonus
```

**✅ Versione corretta — opzione B: nuovo file dedicato** (se stress è un sistema separato dai trait):

```yaml
# data/core/biomes/stress_modifiers.yaml — NEW FILE
# Loader nuovo richiesto in apps/backend/services/stressEffects.js
version: 1
stress_modifiers:
  - id: stress_termico_abisso_vulcanico
    biome_id: abisso_vulcanico  # FK a biomes.yaml
    vector: termico
    accumulation_rate: 0.0
    recovery_rate: 0.0
    mitigating_trait_ids: []
    inverting_trait_ids: []
```

Il design choice (nest vs separate file) dipende da se Game team considera "stress" un trait-effect o un sistema biome-level autonomous. L'output del swarm non si è posto la domanda.

---

## Open questions per Game-side review

1. **Scope Atollo di Ossidiana**: esiste come bioma primario (entry biomes.yaml) o solo come alias? Se solo alias, una caratterizzazione completa richiede prima la creazione canonical.
2. **Reassign biome_affinity**: il swarm propone implicitly che `dune_stalker` potrebbe vivere in `abisso_vulcanico`. Canonical lo dichiara `savana`. Dual-affinity? Reassign? O dune_stalker non c'entra?
3. **Trait `thermal_resistance` esiste?**: il swarm assume di sì, canonical no. È un trait da creare, è un alias di un altro trait, o è un'invenzione del swarm? Verifica necessaria.
4. **Distinzione `default_parts` vs `trait_plan`**: il swarm tratta `echolocation`/`sand_digest` come trait, ma canonical li mette in `default_parts`. Differenza intenzionale (parts = body component, trait = ability) — il prompt swarm non sembra distinguerli.
5. **Sistema "stress" pre-esistente in Game?**: il swarm non ha verificato. Game team confermi se esiste già qualcosa di simile da integrare invece di creare nuovo.
6. **YAML schema location**: stress_modifiers come trait sub-entry o file separato? Vedi opzioni A/B sopra.
7. **Calibrazione numerica**: tutti i `0.0` sono placeholder. Balance team Game assegna valori se framework approvato.

---

## Source artifacts

Artifact JSON in `evo-swarm/camel-agents/artifacts/` (timestamp 2026-05-07T23:xx):

| File | Cycle | Score | co02 |
|------|------:|------:|------|
| `lore-designer_2026-05-07T23-14-31.260316.json` | 25 | 7.5 | complete |
| `species-curator_2026-05-07T23-17-20.878602.json` | 26 | 7.5 | complete |
| `balancer_2026-05-07T23-19-51.936905.json` | 27 | 7.5 | complete |
| `trait-curator_2026-05-07T23-22-43.026815.json` | 28 | 7.5 | complete |
| `biome-ecosystem-curator_2026-05-07T23-25-01.542030.json` | 29 | 7.5 | complete |
| `archivist_2026-05-07T23-27-22.513526.json` | 30 | 7.5 | complete |

Modello: `qwen3-coder:30b`, latency media ~55s/artifact. Builder gate (level 0/10) ha approvato tutti e 6 — ma ricordare che **il gate valida la struttura JSON (CO-02 schema), non la fedeltà al canonical Game**.

**Per pull artifact pieni**: cycle log narrativo in `evo-swarm/camel-agents/artifacts/cycle-log.md`.

---

## Lezione meta per future distillation

Il run #5 è il primo run post 11gg dormancy con la decisione A "Riavvia swarm runtime" attuata. La verification ha rivelato che **il swarm ha tendenza a hallucinate-by-association**: prende nomi reali (`dune_stalker`, `impulsi_bioluminescenti`, `abisso_vulcanico`) e ne combina attributi non supportati dal canonical. `co02_validation.complete` non protegge da questo perché valida solo la struttura JSON.

**Implicazione per pipeline swarm→Game**: ogni distillation richiede cross-verification automatica contro canonical PRIMA di proporla come PR Game. Possibile follow-up: aggiungere uno script `scripts/verify-swarm-claims.py` che parse artifact + grep canonical, output un verification table tipo questa.

**Implicazione per Atto 2 score**: questa PR conta come 1/10 ma il valore reale è "audit del swarm output run #5", non "feature data integrata". Il counter non distingue le due cose — Game team valuta se è ricognoscibile come "integration" o se è meta-debt.

---

## Gate Atto 2

Conta come **1 PR Game** verso target ≥10 (decisione [evo-swarm#66](https://github.com/MasterDD-L34D/evo-swarm/issues/66) outcome A). Score 1/10 → **2/10** post-merge se Game team accetta come integration valid. Se Game team la considera meta-only, score resta 1/10 ma il doc serve come learning per pipeline swarm→Game.

Watch gate naturale: digest weekly evo-swarm 2026-05-14.
