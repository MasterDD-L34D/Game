---
title: Evo-swarm distillation — stress mechanics + biomi extreme (run #5)
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-05-08
source_of_truth: false
language: it
review_cycle_days: 30
---

# Evo-swarm distillation — stress mechanics + biomi extreme

> Distillazione progettuale dei cicli **25-30 del run #5 evo-swarm** (2026-05-07 sera, 22:20 → 23:28). 6 specialist consecutivi accept score 7.5/10 dopo Dafne intervention al ~ciclo 23 ("swarm bloccato su INFRA non gameplay → forza prototipi giocabili"). Tema emergente: **meccaniche di stress + biomi extreme + feedback ambientale**.
>
> Stato Atto 2 evo-swarm (2026-05-07): 1/10 artifact integrati Game (target ≥10 entro 2026-05-24). Questa è la prima distillazione di run #5 verso Game, in seguito alla decisione A "Riavvia swarm runtime" ([evo-swarm#66](https://github.com/MasterDD-L34D/evo-swarm/issues/66)).

## Indice

1. [Contesto run #5](#contesto-run-5)
2. [Bioma Abisso Vulcanico](#bioma-abisso-vulcanico)
3. [Bioma Atollo di Ossidiana](#bioma-atollo-di-ossidiana)
4. [Stress mechanics framework](#stress-mechanics-framework)
5. [Trait alignment notes](#trait-alignment-notes)
6. [Open questions per Game-side review](#open-questions-per-game-side-review)
7. [Source artifacts](#source-artifacts)

---

## Contesto run #5

| Cycle | Specialist | Output type | Tema |
|------:|------------|-------------|------|
| 25 | lore-designer | lore | Verifica lore + bilanciamento per assegnazione coordinator |
| 26 | species-curator | species | Sezione guida bioma Abisso Vulcanico |
| 27 | balancer | balance | Stress modifiers + impact player in abisso_vulcanico |
| 28 | trait-curator | trait | Allineamento definizioni trait per nuovo doc guida |
| 29 | biome-ecosystem-curator | biome | Guida Atollo di Ossidiana con meccaniche stress |
| 30 | archivist | schema | Guida meccaniche stress ambientali + feedback |

Tutti gli artifact con `co02_validation.status = "complete"`, score 7.5/10. Modello: `qwen3-coder:30b` per i specialist, `qwen3:8b` per coordinator/Builder gate.

Gameplay ratio finestra finale: **0.71** (vs target 0.40, vs run #4 baseline 0.50). Direction overrides: 0 (rotation naturale). Errori: 1 (cycle #24 `playtest-coordinator` non trovato — bug di config risolto in [evo-swarm#69](https://github.com/MasterDD-L34D/evo-swarm/pull/69), unrelated a contenuto).

---

## Bioma Abisso Vulcanico

**Tipologia**: geothermal con affixes `termico`, `luminescente`, `spore_diluite`, `sabbia`.

**Caratterizzazione ambientale** (cycle 26 species-curator + cycle 27 balancer):

- Stress vector primario: termico (eruzioni periodiche, gradient termico verticale).
- Stress vector secondario: luminescenza variabile (cicli buio/abbagliamento).
- Risorsa critica: spore diluite (cibo + segnale chimico per specie endemiche).
- Substrato: sabbia vulcanica con copertura idrotermale.

**Specie candidate adatte** (citate dal swarm, da verificare contro `data/core/species.yaml` canonical):

| Specie | Trait abilitanti | Affinità bioma |
|--------|------------------|----------------|
| `dune_stalker` | `echolocation`, `sand_digest` | Sabbia + segnale chimico |
| `polpo_araldo_sinaptico` | `impulsi_bioluminescenti`, `nodi_sinaptici_superficiali` | Luminescenza + termico |

**Gap rilevato dallo swarm** (cycle 26 `gaps`):

- Nessuna specie specifica già marcata come `abisso_vulcanico`-native in `species.yaml`.
- Mancano le interazioni dettagliate specie ↔ ambiente (regole stress applicate, feedback environmental).

**Stress modifiers proposti** (cycle 27 balancer, da ratificare game-side):

- **termico_pulse**: durante eventi eruttivi, stress +X% per N turni → trigger su trait `thermal_resistance` (riduzione %), trigger debuff su specie senza il trait.
- **luminescenza_cycle**: pattern abbagliamento → riduce `perception_range` di specie senza `impulsi_bioluminescenti` o `eyestalk_protection`.
- **spore_drift**: corrente di spore = vettore di passive feeding per specie con `spore_filtration`, debuff respiratorio per altre.

Numeri X / N restano da calibrare lato Game balance team.

---

## Bioma Atollo di Ossidiana

**Tipologia**: marine costiero con substrato vulcanico solidificato (cycle 29 biome-ecosystem-curator).

**Caratterizzazione**:

- Substrato ossidianico: tagliente, riflettente, basso adesivo per piedi/tentacoli senza adattamento.
- Pool termali costieri: micro-biomi termici dispersi.
- Stress vector primario: meccanico (taglio + impatto da onde su substrato duro).
- Stress vector secondario: termico locale (pool isolati, gradient brusco).

**Meccaniche feedback ambientale proposte**:

- **substrate_grip**: trait richiesto per movimento efficiente su ossidiana. Senza, accumulo `damage_micro` per turn → degradation di `mobility_score`.
- **thermal_pool_haven**: nodi termali fungono da safe zone per specie geothermal-dependent. Crea cluster point per encounter dinamici.
- **reflection_stealth_break**: ossidiana riflessa interferisce con stealth visivo → bonus a chi attacca, malus a chi si nasconde.

**Sinergia con Abisso Vulcanico**: i due biomi condividono geothermal lineage (entrambi vulcanici) ma divergono per stato fisico (sabbia vs ossidianica solida). Specie con `thermal_resistance` adatte a entrambi; specie con `sand_digest` solo Abisso, specie con `substrate_grip` solo Atollo.

---

## Stress mechanics framework

**Cross-cycle synthesis** (cycle 27 balancer + cycle 30 archivist):

Lo stress ambientale come categoria gameplay distinta dal damage diretto. Caratteristiche:

1. **Accumulo graduale**: stress non danneggia direttamente, ma riduce capacità nel tempo.
2. **Recovery passivo**: in zone safe (es. `thermal_pool_haven`), stress decade per turn.
3. **Trait-mediated**: trait pertinenti annullano o trasformano lo stress in vantaggio.
4. **Feedback visibile**: ogni stress accumulato deve essere leggibile dal player (icona, anim, sound) — pillar leggibilità scacchistica swarm.

**Schema dati proposto** (da raffinare con Game data team):

```yaml
# data/core/traits/active_effects.yaml — addendum proposto
stress_environmental:
  source: biome_affixes  # stringa, FK a biomes.yaml
  vector: [termico, meccanico, chimico, percettivo]
  accumulation_rate: float  # per turn in tile bioma
  recovery_rate: float  # per turn in safe zone
  threshold_debuff: int  # punti stress oltre cui scatta debuff
  mitigating_traits: [...]  # lista trait che riducono accumulation_rate
  inverting_traits: [...]   # lista trait che convertono stress in bonus
```

---

## Trait alignment notes

**Cycle 28 trait-curator** ha verificato l'allineamento di trait esistenti vs nuovo framework stress. File toccati nell'analisi (non modificati, solo verificati):

- `data/core/traits/glossary.json`
- `data/traits/index.json`
- `apps/trait-editor/docs/trait-guide.md`

**Trait esistenti da rivedere** per integrazione stress mechanics:

- `thermal_resistance` (esistente) → `mitigating_traits` per `termico` vector.
- `impulsi_bioluminescenti` → potrebbe essere `inverting_traits` per `percettivo` (luminescenza diventa offesa).
- `sand_digest` → `mitigating_traits` per `chimico` (digerisce spore).
- `substrate_grip` (proposto, da creare) → `mitigating_traits` per `meccanico` (Atollo Ossidiana).

**Nuovi trait suggeriti** (da approvare game-side):

- `substrate_grip` (Atollo Ossidiana)
- `spore_filtration` (Abisso Vulcanico filtri respiratori)
- `eyestalk_protection` (luminescenza schermata)

---

## Open questions per Game-side review

1. **Calibrazione numerica stress modifiers**: i punti X / N proposti per `termico_pulse` ecc. sono placeholder. Balance team deve assegnare valori in linea con scale damage esistenti.
2. **Conflitto vs sistema esistente**: lo swarm non ha verificato se Game ha già un sistema "stress" (es. mental stress in altri contesti). Game review richiesta.
3. **Specie `abisso_vulcanico`-native**: il gap rilevato suggerisce di creare nuove entry in `species.yaml`. Quante? Quali trait combinations? Decidere se generare via swarm cycle dedicato o manualmente.
4. **Trait validation**: i 3 trait nuovi proposti (`substrate_grip`, `spore_filtration`, `eyestalk_protection`) richiedono review trait-curator-Game (non lo stesso del swarm) per coerenza con glossary.
5. **Priority Atollo vs Abisso**: il run ha trattato entrambi parallelamente. Per integration in roadmap Game, deciderne ordine di implementazione concreta.

---

## Source artifacts

Artifact JSON in `evo-swarm/camel-agents/artifacts/` (timestamp 2026-05-07T23:xx, file hash + co02_validation.score in artifact stesso):

| File | Cycle | Score | co02 |
|------|------:|------:|------|
| `lore-designer_2026-05-07T23-14-31.260316.json` | 25 | 7.5 | complete |
| `species-curator_2026-05-07T23-17-20.878602.json` | 26 | 7.5 | complete |
| `balancer_2026-05-07T23-19-51.936905.json` | 27 | 7.5 | complete |
| `trait-curator_2026-05-07T23-22-43.026815.json` | 28 | 7.5 | complete |
| `biome-ecosystem-curator_2026-05-07T23-25-01.542030.json` | 29 | 7.5 | complete |
| `archivist_2026-05-07T23-27-22.513526.json` | 30 | 7.5 | complete |

Modello: `qwen3-coder:30b`, latency media ~55s/artifact. Builder gate (0/10 score) ha approvato tutti e 6 (gate passato).

**Per pull artifact pieni**: cycle log narrativo in `evo-swarm/camel-agents/artifacts/cycle-log.md` (table format, 1 row per cycle).

---

## Gate Atto 2

Questa distillazione conta come **1 PR Game** verso il target ≥10 di Atto 2 Scenario A "Integration drive" (decisione [evo-swarm#66](https://github.com/MasterDD-L34D/evo-swarm/issues/66) outcome A). Score corrente: 1/10 → **2/10** post-merge. Watch gate naturale: digest weekly evo-swarm 2026-05-14.
