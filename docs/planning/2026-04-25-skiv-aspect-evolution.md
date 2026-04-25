---
title: Skiv — Aspetto + Ciclo di Evoluzione (visual concept)
workstream: cross-cutting
category: planning
doc_status: draft
doc_owner: claude-code
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 30
tags:
  - skiv
  - lifecycle
  - aspect
  - creature-design
  - visual-concept
related:
  - data/core/species/dune_stalker_lifecycle.yaml
  - data/core/species.yaml
  - data/core/mutations/mutation_catalog.yaml
  - tools/py/seed_skiv_saga.py
---

# Skiv — Aspetto + Ciclo di Evoluzione

> Companion del Saga seed (#1784). Il file `dune_stalker_lifecycle.yaml`
> formalizza le 5 fasi di vita di Skiv (e di ogni Arenavenator vagans);
> questo doc è il **concept narrativo + visivo**: come si vede, come
> si racconta, come transita.

## Perché questo doc

Il Saga JSON shippato in #1784 era stat block (numeri, ids, counters).
Mancava la **fenomenologia**: come UN GIOCATORE percepisce Skiv mentre
cresce. Il rischio era che i 5 pillars saliti restassero sotto la
linea-di-galleggiamento dell'esperienza visibile. Questo doc allinea:

- **Aspetto** (cosa vedi sul tile)
- **Stage gating** (cosa serve per cambiare fase)
- **Diegetic events** (cosa appare nel diary / narrative log)

## Le 5 fasi — ASCII frontale + identità

```
╔══════════════════════════════════════════════════════════════╗
║  FASE 1 / HATCHLING                                           ║
║                                                              ║
║          .-.                Lv 1                              ║
║         ( o.o )             0 mutations                       ║
║          > ^ <              0 thoughts                        ║
║          ` ` `              MBTI: dead-band                   ║
║                                                              ║
║  Schiusa al margine arido. Pelliccia grigia polverosa.        ║
║  Echolocation latente. Niente abilities, niente branco.       ║
║  Skiv non sa ancora di essere Skiv.                          ║
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║  FASE 2 / JUVENILE                                            ║
║                                                              ║
║         ╱\_/\               Lv 2-3                            ║
║        (  o.o )             0 mutations                       ║
║         > -_- <             0 thoughts                        ║
║         \___/               MBTI: tier1 ≥1 axis               ║
║                                                              ║
║  Striature ocra sul dorso. Sand_claws affilati ma simmetrici. ║
║  Heat_scales traslucenti. Apprende silent_step.               ║
║  Prima identità MBTI inizia a polarizzarsi.                   ║
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║  FASE 3 / MATURE              ← Skiv saga corrente            ║
║                                                              ║
║         ╱\_/\        ✦      Lv 4-5                            ║
║        (  o.o )      ✦      ≥1 mutation                      ║
║         > ^ <               ≥2 thoughts internalized          ║
║         /|||\\               MBTI: polarity stable            ║
║                                                              ║
║  Artigli vetrificati (ossidiana riflettente).                ║
║  Cresta dorsale scura. Sguardo socchiuso.                    ║
║  Stalker Lv 4. Synergy echo_backstab live. 2/3 cabinet.      ║
║  ★ Skiv è QUI ★                                              ║
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║  FASE 4 / APEX                                                ║
║                                                              ║
║         ╱╲_/╲       ✦       Lv 6-7                            ║
║        ( ●_● )      ✦       ≥2 mutations                     ║
║         > ⌃ <               ≥3 thoughts (cabinet pieno)       ║
║         //|||\\\\           MBTI: tier3 ≥1 axis              ║
║                                                              ║
║  Manto quasi nero. Artigli a lamelle multiple.               ║
║  Cresta bioluminescente al crepuscolo. Voce interna sempre.  ║
║  Branco si separa al suo passaggio: territorio, non membro.  ║
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║  FASE 5 / LEGACY                                              ║
║                                                              ║
║         ╱─_/─               Lv 7 (apex maxed)                 ║
║        (  ─_─ )             3+ mutations                      ║
║         > _ <               cabinet pieno                     ║
║         ¯|||¯               lineage_id ready                  ║
║                                                              ║
║  Pelo argenteo. Artigli opachi (consumo).                    ║
║  Skiv non muore — diventa pattern. Lineage passa a creatura  ║
║  successiva del biome (V3 Mating/Nido gateway).              ║
║  Appare come narrative event QBN, non più combat actor.      ║
╚══════════════════════════════════════════════════════════════╝
```

## Mutation morphology — come UNA mutation cambia il corpo

Esempio canonico (Skiv saga shipped #1784):

**`artigli_grip_to_glass`** (`artigli_sette_vie` → `artigli_vetrificati`)

```
   PRE                        POST
   (sette_vie)                (vetrificati)
   ╲_/╲ ╲_/╲                  ┄_/┄ ┄_/┄
    > ║ <                      > ◇ <
    /||||\                     /◇◇◇◇\
                               (trasparenze ossidiana, scia iridescente)
```

L'aspetto traduce il tactical: `+1 always damage` (pre) →
`+2 damage on MoS≥5` (post). Il giocatore VEDE che lo svantaggio è
condizionale, non costante.

## MBTI form physical correlates

Quando un axis crystallizza (≥ tier1), Skiv **assume la postura**
visibile sul tile:

| Polarity | Manifestazione visiva                                              |
| -------- | ------------------------------------------------------------------ |
| **I**    | Postura chiusa, orecchie verso interno (ricezione, listening pose) |
| **T**    | Sguardo freddo socchiuso, decisioni rapide post-pausa breve        |
| **N**    | Movimenti sinuosi, scarsa pausa, "vede senza guardare"             |
| **P**    | Routine assente; cambia direzione su input minimi del biome        |

Skiv canonico è **INTP-leaning-I** → tutti e 4 i polari attivi:

```
  Postura: chiusa + sinuosa
  Orecchie: verso interno + indipendenti
  Sguardo: socchiuso freddo
  Movimento: imprevedibile (P) + meditato (I)
```

## Diary milestone events per fase

Quando Skiv passa di fase, scrive nel diary:

| Phase                | Event type                    | Payload chiave                                  |
| -------------------- | ----------------------------- | ----------------------------------------------- |
| Hatchling → Juvenile | `scenario_completed`          | primo encounter sopravvissuto                   |
| Juvenile → Mature    | `mbti_axis_threshold_crossed` | axis che ha cristallizzato (es. S_N: 0.34→0.22) |
| Mature               | `thought_internalized` (×2)   | i_osservatore + n_intuizione_terrena            |
| Mature → Apex        | `mutation_acquired` (×2nd)    | seconda mutation tier 2+                        |
| Apex                 | `defy_used` repeated          | counter-pressure agency dimostrato              |
| Apex → Legacy        | `form_evolved`                | passaggio a lineage memoria                     |

Il diary diventa **biography**, non log.

## Anti-pattern ribaditi

1. **NO aspetto cosmetic-only** — ogni cambio visivo deve avere un
   tactical correlate visibile sul tile (es. cresta bioluminescente
   = night encounter +1 attack_range)
2. **NO phases che floattano** — fase 3 (mature) richiede Lv 4 _e_
   ≥1 mutation _e_ ≥2 thoughts. Niente shortcut.
3. **NO mutation senza visual_swap** — `mutation_morphology` block
   YAML è obbligatorio per ogni nuovo mutation_id (linter consiglio
   per future PR del catalog)
4. **NO MBTI form senza polarity stable** — finché un axis è in
   dead-band 0.35-0.65 NON manifesta visivamente. Skiv juvenile
   sembra ancora "neutro".

## Replay

```bash
# Stato Skiv corrente
cat data/core/species/dune_stalker_lifecycle.yaml | yq '.skiv_saga_anchor'

# Re-genera saga JSON + creature card
python3 tools/py/seed_skiv_saga.py

# Vedi card visiva dopo regen
cat docs/playtest/2026-04-25-skiv-saga-state.md
```

## Open questions

1. **Lineage propagation** (V3 Nido): legacy phase deve esporre
   `inheritable_traits` API che la prossima creatura della genus
   eredita probabilisticamente? CK3 DNA pattern (P-B nell'agent
   `creature-aspect-illuminator`) suggerisce gene chain compatto
   ~50 byte trasmissibile.
2. **Sprite asset budget**: 5 fasi × N MBTI variants × M mutation
   stack = combinatorial. Wildermyth solution: layered composition
   con cache (RimWorld P11). LPC Universal Spritesheet (CC-BY-SA)
   come prototype-baseline (`external/lpc-generator/` proposed).
3. **Crystallization rollback**: se un axis MBTI scende sotto tier1
   (drift via gameplay opposto), Skiv **regredisce** visivamente
   o resta "scarred"? Wildermyth: scar è permanente
   (unidirectional). Citizen Sleeper: stress canonizzata
   (failure è story, non rollback).
4. **Frequency phase transitions**: 1 transizione per scenario è
   ragionevole? Player feedback target. Emily Short warning zone
   pattern: pre-segnale via diary `phase_signal: "<fase>_approaching"`
   _prima_ del cambio meccanico (in lifecycle YAML come
   `warning_zone_it`).

## Research provenance

Questo doc + lifecycle YAML sono il prodotto di 3 ricerche parallele
(2026-04-25 agent batch):

- **External repos** (general-purpose agent): 12 pattern primary-sourced
  da Wildermyth / CK3 / Caves of Qud / Monster Hunter Stories / Disco
  Elysium / Hades / Subnautica / Cogmind / RimWorld + LPC + Lai 2021.
  Top picks: Wildermyth layered + Qud morphotype gating + MHS gene
  grid + Disco portrait correlate.
- **UI audit** (ui-design-illuminator): 12 gap concreti file:line
  identificati nel client esistente (`apps/play/`). Top 3 P0:
  thoughtsPanel slot+researching state, render.js canvas font,
  Defy verb (assente UI surface).
- **Narrative arcs** (narrative-design-illuminator): 7 pattern
  - 5 narrative beats Skiv POV. Voice_it INTP-leaning-I:
    analitica, autocontenuta, traccia relazione con branco.
    Diary integration mapping per ciascuna transizione.

Il nuovo agent `.claude/agents/creature-aspect-illuminator.md`
compone tutto questo in un agent canonico per future species
(post Skiv canonical).

## Sources (primary)

- [Wildermyth Image layers wiki](https://wildermyth.com/wiki/Image_layers)
- [Wildermyth Story Inputs and Outputs wiki](https://wildermyth.com/wiki/Story_Inputs_and_Outputs)
- [Wildermyth Modular Storytelling design](https://cjleo.com/2022/12/26/the-power-of-wildermyths-modular-storytelling-in-game-design/)
- [Caves of Qud Mutations wiki](https://wiki.cavesofqud.com/wiki/Mutations)
- [Caves of Qud Modding:Genotypes](https://wiki.cavesofqud.com/wiki/Modding:Genotypes_and_Subtypes)
- [Crusader Kings 3 DNA dev diary](https://www.pcinvasion.com/crusader-kings-iiis-latest-dev-diary-explains-schemes-portraits-dna-council-members-and-your-court/)
- [CK3 Legends of the Dead expansion](https://www.paradoxinteractive.com/media/press-releases/press-release/great-deeds-confer-immortality-in-new-crusader-kings-iii-expansion)
- [Disco Elysium Thought Cabinet devblog](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet)
- [Monster Hunter Stories 3 Gene Grid - Game8](https://game8.co/games/Monster-Hunter-Stories-3/archives/586640)
- [Hades 2 Weapon Aspects wiki](https://hades2.wiki.fextralife.com/Weapon+Aspects)
- [Subnautica Ghost Leviathan wiki](https://subnautica.fandom.com/wiki/Ghost_Leviathan)
- [Citizen Sleeper Stress into Storytelling - Vice](https://www.vice.com/en/article/how-citizen-sleeper-turns-stress-into-intimate-storytelling/)
- [Slay the Princess Voices wiki](https://slay-the-princess.fandom.com/wiki/Voices)
- [Emily Short Narrative States](https://emshort.blog/2019/11/23/narrative-states/)
- [Emily Short Storylets](https://emshort.blog/2019/11/29/storylets-you-want-them/)
- [Frostpunk Emotional Narrative - GameDeveloper](https://www.gamedeveloper.com/design/frostpunk-an-analysis-of-emotional-narrative-engagement)
- [Lai 2021 Virtual Creature Morphology Wiley](https://onlinelibrary.wiley.com/doi/10.1111/cgf.142661)
- [Universal-LPC-Spritesheet GitHub](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)
- [Microsoft 10-foot Experience Guidelines](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/introduction-to-the-10-foot-experience-for-windows-game-developers)

## Refs

- Lifecycle YAML: `data/core/species/dune_stalker_lifecycle.yaml`
- Saga seed engine: `tools/py/seed_skiv_saga.py`
- Saga shipped state: `data/derived/skiv_saga.json`
- Saga creature card: `docs/playtest/2026-04-25-skiv-saga-state.md`
- Skiv canonical persona memory: `~/.claude/projects/.../memory/project_skiv_evolution_wishlist.md`
- Recap card format: `~/.claude/projects/.../memory/feedback_gamer_recap_creature_card_format.md`
