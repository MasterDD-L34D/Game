---
title: 'Epigenome Lamarck-lite params -- research + decision (Fase-3 gate)'
date: 2026-05-27
status: PARAMS DECIDED (start-values; playtest-tune at Fase-3 build)
owner: claude (research) -> master-dd (ratify)
workstream: evo-tactics / Pilastro 2 (D-HEIR Layer-3)
language: it
related:
  - docs/superpowers/specs/2026-05-26-repro-heir-genetic-model-design.md (Layer-3 Epigenome)
  - docs/adr/ADR-2026-05-26-deep-genetics-phase1-supersede-freeze.md
  - apps/backend/services/vcScoring.js (telemetry substrate)
  - data/core/mating.yaml (inheritance_weight scale)
---

# Epigenome Lamarck-lite params -- research + decision

> **SUPERSEDED 2026-05-28**: `inheritance_weight` 0.3 -> 0.45 (ratified via lineage-sim perceptibility curve; gen-1 felt-shift doubled, anti-snowball unchanged). 0.3 values below are the original ratification record.

## 0. Scopo (chiude il GATE Decision #2)

Spec Decision #2: "Epigenome Lamarck-lite = ACCETTATO con decay obbligatorio
(anti-snowball); params TBD = a GATE, not done." Questo doc risolve il gate:
i params di `decay` / `regression-to-mean` / `inheritance_weight` per rendere
lo stato VC-appreso (vcScoring) **parzialmente ereditabile** senza snowball.

**Build status**: Fase-3 (non costruito). Questi sono **start-values di design**
-- il lock finale richiede playtest N>=40 quando l'engine epigenome esiste
(lezioni L-069/L-070/L-073: param gameplay = noise se armchair-final).

## 1. Metodo (research multi-source 2026-05-27)

- **Repo grounding**: scale `inheritance_weight` esistenti + substrato vcScoring.
- **Biologia**: durata/decay dell'eredita' epigenetica transgenerazionale.
- **Game-design**: pattern anti-snowball per stat ereditate (power-creep, regression).

## 2. Findings

### 2.1 Repo grounding

- `data/core/mating.yaml`: `inheritance_weight` gene-slot = **0.4-0.8**;
  `memoria_ambientale.inheritance_weight = 0.0` (commento "sempre generata dal
  bioma, non ereditata") = **hook epigenetico** da portare >0 per Lamarck-lite.
- `inheritGeneSlots` default weight 0.5 (`metaProgression.js:316`).
- `vcScoring.js`: telemetria VC -> assi normalizzati **0-1** (substrato epigenome).
- **decay / regression-to-mean = NET-NEW** (zero precedente nel backend).

### 2.2 Biologia (transgenerational epigenetic inheritance)

- Effetti epigenetici transgenerazionali transienti **decadono in ~3 generazioni**
  (rapid-decay <3 gen; transient 3-10 gen prima di revertire al baseline). Non
  copia permanente. -> supporta un **decay geometrico ~3-gen effective**, NON
  ereditarieta' indefinita. (fonti §5)

### 2.3 Game-design anti-snowball

- Power-creep = snowball cumulativo (+1 forza buff a catena). Mitigazioni:
  diminishing returns, curve non-lineari, **conservazione** (es. Mewgenics
  breeding trait-inherit + breeder XP-split anti-farm), **regression-to-mean**
  (tira l'ereditato verso la media -> nessun runaway). (fonti §5)

### 2.4 Coherence check vs comparables + SoT (2026-05-27)

**Comparables UFFICIALI** (`docs/archive/pitch/evo_tactics_publisher_sheet.md`
§Comparable References): **Spore** (fantasia evolutiva), **Descent**
(missione/squad/living-room), tactics-turni moderni (leggibilita'), run-based
(debrief). One-sentence sell: "il tuo stile di gioco evolve davvero le creature
che controlli" = **l'epigenome E' la USP headline**, non un layer secondario.
Tensione gia' risolta nel SoT: **Spore = anchor FANTASIA** (positioning) MA
Pilastro 2 = **"NON Spore sim continuo"** (mechanic = unlock discreto). Il
refinement discrete-expression (§3) allinea i due: fantasia-Spore via espressione
DISCRETA leggibile.

**Benchmark analitici** (mechanic-fit, complemento ai marketing-comparables):

- **Niche** (turn-based + genetica + roguelike = comparable piu' vicino):
  inheritance **DISCRETA Mendeliana** (2 alleli/gene, dom/rec, 50% pass,
  fenotipo = allele dominante = readable). = il nostro genotype
  `inheritGeneSlots` 2-parent weighted-pick. **STANDARD, coerente.**
- **Creatures** (norn neural-sim): learning -> heritable (= idea epigenome) MA
  **simulazione continua pesante** = cio' che il **Pilastro 2 RIFIUTA**
  ("evoluzione emergente ... NON Spore sim continuo"; pattern proven =
  Wesnoth/AI-War pack-unlock DISCRETO).
- **Vision (01-VISIONE) + P4**: "come giochi modella cio' che diventi" +
  VC-telemetria ludica = l'epigenome E' la fusione canonica P2xP4. Coerente.
- **Implicazione load-bearing**: il VC-bias continuo (0-1) e' **substrato
  INTERNO** (P4 telemetria); l'**ESPRESSIONE deve essere DISCRETA + leggibile**
  (P2 + spec readability "player vede esiti, NON loci/alleli"). L'epigenome NON
  deve diventare stat-drift continuo (anti-pattern Creatures); deve **biasare
  unlock/espressione DISCRETI** (soglia/probabilita' di quale trait-part si
  esprime) -> Niche-readable.

## 3. Params decisi (start-values)

| param                          | valore                       | rationale                                                                                          |
| ------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `epigenome_inheritance_weight` | **0.3**                      | bias, non copia. Sotto gene-slot 0.4-0.8 (epigenetico < genetico). `memoria_ambientale` 0.0 -> 0.3 |
| `epigenome_decay_per_gen`      | **0.6** retention/gen        | bio transient ~3 gen: 0.6^3 ~= 0.22 -> fade percepibile ma non-permanente                          |
| `epigenome_regression_to_mean` | **0.3**                      | offspring tirato 30% verso media-specie dell'asse VC                                               |
| `epigenome_bias_cap`           | **+/-0.2** per asse VC (0-1) | hard-bound: nessun runaway anche a max accumulo                                                    |

### Formula (per asse VC, a offspring-materialization)

```
offspring_epi[axis] = clamp(
  species_mean[axis]
    + (parent_avg_epi[axis] - species_mean[axis])
      * (1 - regression_to_mean)   // 0.7
      * inheritance_weight         // 0.3
      * decay_per_gen,             // 0.6
  -bias_cap, +bias_cap )           // +/-0.2
```

- `parent_avg_epi` = media epigenome dei 2 genitori (asse VC).
- `species_mean` = media popolazione/specie corrente (baseline regression).
- gen-1 retention della deviazione-genitore ~= 0.7 _ 0.3 _ 0.6 = **~0.13**, poi
  fade geometrico per `decay` ogni generazione successiva.

### Espressione DISCRETA (vincolo P2 + Niche-standard, da §2.4)

I 4 params governano la **forza** del bias; l'**OUTPUT** applicato all'offspring
e' un nudge su **espressione/unlock DISCRETI** (soglia/probabilita' di quale
trait-part si esprime), **NON** un drift continuo di stat. Il VC-axis continuo
resta substrato interno; il player vede esiti discreti leggibili. Questo tiene
l'epigenome dentro Pilastro 2 ("NON sim continuo") + readability spec.

### Anti-snowball -- proof

Ogni generazione l'effetto = `prev * decay (0.6)` + ri-ancoraggio a `species_mean`
via regression. Serie geometrica (ratio 0.6 < 1) **converge** + `bias_cap` bounded
-> impossibile accumulo runaway. Soddisfa Decision #2 "decay obbligatorio".

### Trade-off da tunare (playtest)

- Troppo decay/regression -> "how you play shapes what you become" impercettibile
  (feature inutile).
- Troppo poco -> snowball.
- Sweet-spot = playtest. Gli 0.3/0.6/0.3/0.2 = punto di partenza ragionevole, non lock.

## 4. Tuning gate (al build Fase-3)

- Validare via playtest **N>=40** (L-069: N=10 = noise; CI95 WR +/-15pp a N=40).
- Probe direzione (N=10) tra cambi-knob (L-072), no overshoot multi-knob (L-070).
- Metrica target: percepibilita' del bias parent-play in gen-1 **E** convergenza
  (no creature gen-5+ statisticamente fuori-banda vs gen-1). Tool:
  `tools/py/calibrate_drift_verify.py` pattern.
- Economy: l'epigenome alimenta i **Frammenti Genetici** Tri-Sorgente (spec §Economy)
  -- NON currency parallela.

## 5. Sources

- Transgenerational epigenetic inheritance -- Wikipedia
- Generational stability of epigenetic transgenerational inheritance -- PMC11305060
- Anti-Snowball Design -- Wayward Strategy
- The Snowball Effect (And How to Avoid It) -- Envato Tuts+
- Stat Balancing in Roguelikes -- Temple of The Roguelike

---

**END EPIGENOME PARAMS RESEARCH -- 2026-05-27. Gate Decision #2 params SET (start).**
