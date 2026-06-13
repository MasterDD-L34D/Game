---
title: 'Codex in-game — container Hades + schema A.L.I.E.N.A. 6-dim (spec)'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [codex, aliena, narrative, hades, wiki, spec]
related:
  - 'docs/planning/codex-in-game-aliena-integration.md'
  - 'apps/play/src/codexPanel.js'
  - 'data/codex/example_dune_stalker.yaml'
---

# Codex in-game — container Hades + schema A.L.I.E.N.A. 6-dim

**Spec post decisione D2 (2026-04-26 sera): ibrido container Hades + content A.L.I.E.N.A.**

ESTENDE `docs/planning/codex-in-game-aliena-integration.md` (Wave 9 8h plan).
NON sostituisce: aggiunge layer schema 6-dim + Skiv-instance note diegetic.

---

## TL;DR — 5 bullet

1. **Container Hades-style**: sidebar lista entry con badge unlock + tab progression (6 tab) + entry view a sezioni espandibili + Skiv-note footer diegetic.
2. **Content schema A.L.I.E.N.A. 6-dim**: ogni entry (specie / bioma / concept) strutturata su Ambiente · Linee evolutive · Impianto · Ecologia · Norme socio · Ancoraggio narrativo — 6 chiavi YAML obbligatorie, 100-300 char ciascuna, TV-readable.
3. **Skiv-instance note**: footer diegetic per ogni entry — pool di 3-5 voice line biome-aware, selezionate da `qbnEngine.js` in base al `biome_id` della run corrente. Prima persona, metafore desertiche, all'allenatore.
4. **Unlock progressivo QBN-style**: trigger multipli per entry (encounter_completed / thought_internalized / biome_resonance_crossed / mating_success). Locked entries visibili ma testo oscurato — "incontro [specie] per sbloccare".
5. **Effort delta rispetto Wave 9**: +2h dataset (6-dim content per 5 specie) + 1h Skiv voice pool + 1h QBN unlock hook = Wave 9 8h → **11h totale** per versione completa con 6-dim + Skiv note.

---

## Schema A.L.I.E.N.A. 6-dim (YAML canonical)

Schema `data/codex/{id}.yaml`. Fallback: se file mancante, UI mostra dati base da `data/core/species.yaml`.

```yaml
# Encoding: UTF-8
# Schema version: 1.0 (2026-04-27)
# Per ogni entry Codex (type: species | biome | concept | event)

codex_entry:
  id: dune_stalker # slug stabile, match species.yaml o biomes.yaml
  type: species # species | biome | concept | event
  display_name_it: Predatore delle Dune
  display_name_en: Dune Stalker
  subtitle_it: 'Arenavenator vagans — clade Threat'

  unlock:
    triggers:
      - encounter_completed # completato uno scontro con questa specie
      - thought_internalized # thought correlato internalizzato nel Cabinet
      - mating_success # solo per species: evento mating riuscito
    threshold: 1 # quanti trigger bastano per sblocco (OR)
    locked_preview: 'Incontro questa specie per sbloccare il Codex.'
    persistence: 'localStorage:evo:codex-seen-{id}'

  aliena_dimensions: # 6-dim content schema — OBBLIGATORIO per tutte le entry
    A_ambiente:
      heading: 'Ambiente'
      content: >
        Pianeta lock mareale attorno a stella M-nana. Savana ionizzata:
        dune fotoniche, substrato conduttivo, tempeste ioniche stagionali.
        Luce permanentemente radente, visibilità bassa, venti fino 120 km/h.
      key_facts:
        - 'Luce radente perenne (angolo <15°)'
        - 'Substrati sabbiosi conduttivi'
        - 'Tempeste ioniche: frequenza alta (biomes.yaml:savana)'
      cross_ref:
        - 'biome:savana'
        - 'biome:caverna' # rifugio tempeste (species.yaml:96-98)
      game_impact: 'Echolocation come sense primario — visibilità ottica irrilevante'

    L_linee_evolutive:
      heading: 'Linee evolutive'
      content: >
        Discendente da arenavenator paleozoico del piano desertico costiero.
        Tre pressioni principali: predazione notturna (bassa luce → echolocation),
        mobilità su sabbia instabile (zampe burrower), resistenza termica
        (squame calore → heat_scales). Convergenza con pipistrelli terrestri
        e pesci abissali sensoriali.
      pressures:
        - 'Bassa luce → echolocation 45-120 kHz'
        - 'Sabbia instabile → zampe burrower'
        - 'Calore intenso → heat_scales termoregolatrici'
      analogues_it: 'Convergente con pipistrelli + elettroretti marini'
      cross_ref:
        - 'species:arenavenator_paleo' # ancestrale ipotetico
      game_impact: 'Ogni trait_plan core riflette una pressione evolutiva reale'

    I_impianto:
      heading: 'Impianto morfo-fisiologico'
      content: >
        Bilaterale basso appiattito. 6 zampe a molla (burrower) per mobilità
        sabbiosa. Artigli sette vie (→ vetrificati in fase mature).
        Pelle elastomera con squame termoregolatrici. Echolocation 45-120 kHz
        + elettrorecettori laterali. Peso stimato 11 kg, budget biomassa 12.
      body_plan: 'Bilaterale basso appiattito'
      locomotion: '6 zampe burrower palmati'
      senses:
        - 'Echolocation 45-120 kHz (primary)'
        - 'Elettrorecettori laterali'
        - 'Fotosensori vestigiali'
      weight_kg: 11 # species.yaml:71
      anatomy_diagram: optional
      cross_ref:
        - 'trait:artigli_sette_vie'
        - 'trait:scheletro_idro_regolante'
      game_impact: 'Synergy echo_backstab: echolocation × sand_claws → +1 damage'

    E_ecologia:
      heading: 'Ecologia'
      content: >
        Predatore apex notturno. Ruolo nel foodweb: top-predator savana.
        Caccia solitaria fuori stagione tempeste, branco sciolto (2-4 unità)
        durante migrazione. Prede principali: fauna burrower media classe.
        Rifugio temporaneo nelle caverne salmastre durante le ionostorm.
      foodweb_position: apex
      social_pattern: solitary_pack_seasonal
      threat_level: 4 # su 5
      habitat_primary: savana
      habitat_secondary:
        - caverna # rifugio (species.yaml:96)
      cross_ref:
        - 'biome:savana'
        - 'species:predoni_nomadi' # competitor/prey pattern
      game_impact: 'Threat level 4 — scenario difficulty modifier biome:savana'

    N_norme_socio:
      heading: 'Norme socio'
      content: >
        Solitario in età adulta, territoriale post-juvenile. Branco sciolto
        (2-4) durante migrazione stagionale — coordinazione per echolocation
        sincronizzata, no gerarchia formale. Sentience T2: proto-sociale,
        comunicazione gestuale + canto ultrasonico rudimentale. Nessuna
        struttura politica. Riconosce il predatore-stalker come ruolo
        sociale all'interno del gruppo.
      social_pattern: solitary
      sentience_tier: T2 # species.yaml:65, skiv_saga.json
      communication:
        - 'Canto ultrasonico (45-120 kHz)'
        - 'Segnali gestuali posturali'
      hierarchy: none
      cross_ref:
        - 'species.yaml:sentience_tier'
        - 'docs/museum/cards/cognitive_traits-sentience-tiers-v1.md'
      game_impact: 'T2 proto-sociale — eligible per Thought Cabinet + voce interna'
      optional: false # obbligatorio per species sentience >= T2

    A_ancoraggio_narrativo:
      heading: 'Ancoraggio narrativo'
      content: >
        Tema: autonomia evolutiva vs Sistema. Non è neutrale — ha già scelto
        di non essere controllato. Alleato potenziale ma imperscrutabile:
        agisce per logica propria, non fedeltà. Il Sistema lo classifica
        come variabile non-ridondante (threat node). Le sue tracce iridescenti
        (artigli vetrificati) lasciano segni leggibili come messaggi nel
        paesaggio.
      theme_it: 'Autonomia evolutiva vs Sistema'
      story_hook_it: 'Alleato potenziale ma imperscrutabile — ha la sua logica'
      sistema_relation: 'threat_node — non-ridondante, classificato variabile autonoma'
      lore_seed_it: >
        «Lo si è visto camminare sul vetro vulcanico senza lasciare traccia
        di bruciatura. I guardiani delle dune dicono che il suolo lo
        riconosce.»
      cross_ref:
        - 'docs/reports/2026-04-26-lore-alien-event-swarm-redig.md'
        - 'docs/planning/draft-narrative-lore.md'
      game_impact: 'Flavor text briefing_pre scenario savana — tono Western sci-fi'

  # -------------------------------------------------------------------------
  # Skiv-instance note — layer diegetic Hades-style
  # -------------------------------------------------------------------------
  skiv_instance_note:
    voice_rule: >
      Prima persona. Italiano. Metafore desertiche (sabbia, vento, eco, ridge,
      sole basso). Parla all'allenatore. Breve (1-3 frasi). MAI tecnico puro.
      Closing tipico: "Sabbia segue." Dipende dal biome_id corrente della run.

    voice_pool: # QBN draw da qbnEngine.js
      savana:
        - >
          Il terreno qui vibra in modo diverso. Non so se sono io che cambio,
          o se il substrato impara. Sabbia segue.
        - >
          Ho sentito il mio stesso eco rimbalzare sulle dune prima che arrivassi.
          Forse mi stavo aspettando.
        - >
          I guardiani delle dune li sento arrivare. Non per suono — per il modo
          in cui il vento cambia traiettoria attorno a loro.
      caverna:
        - >
          Le caverne risonanti amplificano ogni errore. Qui il silenzio è informazione.
          Ascolto prima di muovermi.
        - >
          Nelle cavità salmastre il mio eco ritorna cambiato. Come se il cristallo
          volesse correggere la mia rotta.
      foresta_acida:
        - >
          Le piogge acide dissolvono le tracce troppo presto. Devo costruire
          mappe dal suono, non dai segni. È più onesto.
        - >
          La foresta non vuole essere letta. Io nemmeno. Forse è per questo
          che non ci attacchiamo.
      palude:
        - >
          L'acqua stagnante distorce l'eco. I miei sensi si adattano ma ci vuole
          un round. Nel primo round sono cieco come gli altri.
      default: # fallback se biome non ha pool specifico
        - >
          Ogni bioma ha la sua grammatica. Sto ancora imparando le lettere di
          questo posto. Ma il corpo capisce prima della mente.
        - >
          Non so dove siamo, ma so che le mie zampe già sentono la differenza
          nel substrato. Basta aspettare che la mappa arrivi.

    selection_rule: 'qbnEngine.draw(pool[biome_id] ?? pool.default) — random non-repeat'

  # -------------------------------------------------------------------------
  # Varianti biome-aware (override specifici per run istanza)
  # -------------------------------------------------------------------------
  variants:
    biome_specific_overrides:
      - biome: caverna
        A_ambiente_override: >
          In rifugio temporaneo: caverne salmastre iper-calde durante ionostorm.
          Eco amplificato — vantaggio tattico. Substrato umido riduce velocità burrower.
        game_impact_override: 'Echolocation bonus caverna:affixes.eco — +1 detection range'
      - biome: foresta_acida
        A_ambiente_override: >
          Bioma ostile per heat_scales: piogge acide erodono le squame termoregolatrici.
          Durata scontro ridotta — ogni round conta doppio.
        game_impact_override: 'heat_scales effectiveness -1 — compensare con burrower mobility'

  # -------------------------------------------------------------------------
  # Meccanica cross-ref (link per tab Tratti + tab Meccaniche nel Codex)
  # -------------------------------------------------------------------------
  traits_core:
    - id: artigli_sette_vie
      note_it: '6 artigli + falce retrattile. In fase mature: vetrificati (mutation artigli_grip_to_glass)'
    - id: struttura_elastica_amorfa
      note_it: 'Mobilità sabbiosa — riduce penalità burrower su terreni misti'
    - id: scheletro_idro_regolante
      note_it: 'Regolazione idrica — sopravvivenza in ambienti iper-aridi'
    - id: sensori_geomagnetici
      note_it: 'Rilevamento campo magnetico — orientamento senza riferimenti ottici'
  synergies:
    - id: echo_backstab
      note_it: 'echolocation × sand_claws → +1 danno backstab'
```

---

## Container Hades-style — spec UI

### Struttura pannello

Basata su `apps/play/src/codexPanel.js` (W8L live, 4 tab attuali).
Extension: 6 tab + sidebar lista + entry detail view.

```
┌─────────────────────────────────────────────────────────────────┐
│ 📖 CODEX                                              [ESC / ✕] │
├──────────┬──────────────────────────────────────────────────────┤
│ SIDEBAR  │  ENTRY VIEW                                          │
│          │                                                      │
│ [filter] │  Predatore delle Dune                                │
│          │  Arenavenator vagans · clade Threat · T2            │
│ 🟢 Pred. │  ────────────────────────────────────               │
│    Dune  │  [A Ambiente] [L Evoluz.] [I Impianto]              │
│ 🟢 Polpo │  [E Ecologia] [N Norme] [A Narrativo]               │
│ 🔒 [???] │                                                      │
│ 🔒 [???] │  ▼ A — Ambiente                                     │
│          │    Pianura ionizzata, dune fotoniche…               │
│ ──────── │                                                      │
│ TAB BAR  │  ▼ L — Linee evolutive                              │
│ Specie ✓ │    Bassa luce → echolocation…                       │
│ Biomi    │                                                      │
│ Mutaz.   │  ▼ I — Impianto                                     │
│ Concept  │    Bilaterale basso, 6 zampe burrower…              │
│ Eventi   │                                                      │
│ Lignaggi │  ▼ E — Ecologia                                     │
│          │    Predatore apex, threat ⭐⭐⭐⭐…                  │
│          │                                                      │
│          │  ▼ N — Norme socio                                  │
│          │    Solitario, T2 proto-sociale…                     │
│          │                                                      │
│          │  ▼ A — Ancoraggio narrativo                         │
│          │    Autonomia evolutiva vs Sistema…                   │
│          │  ────────────────────────────────────               │
│          │  [SKIV] Il terreno qui vibra in modo diverso…       │
│          │         Sabbia segue.          [🎲 nuova nota]       │
└──────────┴──────────────────────────────────────────────────────┘
```

### Tab list (6 tab)

| Tab          | Scope                              | Entry type | Unlock trigger            |
| ------------ | ---------------------------------- | ---------- | ------------------------- |
| Specie       | 45 specie `data/core/species.yaml` | species    | encounter_completed       |
| Biomi        | 20 biomi `data/core/biomes.yaml`   | biome      | biome_resonance_crossed   |
| Mutazioni    | Trait + mutation pool              | concept    | thought_internalized      |
| A.L.I.E.N.A. | Framework concept + lore event     | concept    | campaign_milestone        |
| Eventi       | Vertical slice events + lore hooks | event      | scenario_outcome          |
| Lignaggi     | Ancestor lineage + trait tree      | concept    | ancestors_wire (M-future) |

### Sidebar

- Lista entry con icona lock/unlock: verde (🟢 unlocked) / grigio (🔒 locked)
- Locked entry: mostra solo tipo + blurb generico — "Incontra questa specie per sbloccare"
- Filter bar: dropdown biome + search text
- Badge counter: "X/45 specie scoperte"
- Sorted: unlocked first, then locked alphabetical

### Entry view

- Header: `display_name_it` + `display_name_en` + clade_tag + sentience_tier
- 6 sezioni A.L.I.E.N.A. espandibili (accordion) — collassate di default, expand on click
- Ogni sezione: `heading` + `content` (100-300 char) + `key_facts` bullet list + `game_impact` inline callout
- Cross-ref links cliccabili: aprono l'entry collegata nello stesso pannello
- Footer: Skiv-instance note (vedi sotto) — sempre visibile, non espandibile
- Pulsante [🎲 nuova nota]: re-draw QBN pool stesso biome

### Pattern anti-interrupt

- NO apertura automatica mid-combat. Codex = solo on-demand (btn header).
- Thought Cabinet pattern (Disco Elysium): trigger solo post-scontro, mai durante round execution.
- ESC chiude senza side-effect su stato sessione.

---

## Skiv-instance note layer

### Responsabilità

Player sente: questa creatura ha qualcosa da dire su questo posto.
Skiv dice: prima persona, bioma-corrente, breve, non-tecnico.
Meccanismo: QBN draw da `qbnEngine.js` (già esistente nel repo) — `draw(pool, seen_ids)` no-repeat.

### Voice template

```
{bioma_sensory_observation}. {corpo_vs_mente_observation}. [Closing opzionale: "Sabbia segue."]
```

Regole:

- Max 3 frasi.
- MAI "questa specie è forte" o "threat level 4" — lore, non stat.
- MAI spiegare il meccanismo ("l'echolocation funziona così…") — impressione sensoriale, non tutorial.
- Bioma-specific: il bioma della run corrente modula quale pool viene pescato.
- Pulsante [🎲 nuova nota]: re-draw, no-repeat su nota precedente.

### 5 esempi cross-bioma (Skiv → Predatore delle Dune, entry propria)

**Bioma: savana (home)**

> Il terreno qui vibra in modo diverso. Non so se sono io che cambio, o se il substrato impara. Sabbia segue.

**Bioma: caverna (rifugio)**

> Le caverne risonanti amplificano ogni errore. Qui il silenzio è informazione. Ascolto prima di muovermi.

**Bioma: foresta_acida (ostile)**

> Le piogge acide dissolvono le tracce troppo presto. Devo costruire mappe dal suono, non dai segni. È più onesto.

**Bioma: palude (sensorialmente degraded)**

> L'acqua stagnante distorce l'eco. I miei sensi si adattano ma ci vuole un round. Nel primo round sono cieco come gli altri.

**Bioma: default (unknown)**

> Ogni bioma ha la sua grammatica. Sto ancora imparando le lettere di questo posto. Ma il corpo capisce prima della mente.

### Wire tecnica

```js
// In codexPanel.js — renderEntryDetail():
import { draw } from './qbnEngine.js'; // già esistente
const biomeId = state.session?.biome_id ?? 'default';
const pool =
  entry.skiv_instance_note.voice_pool[biomeId] ?? entry.skiv_instance_note.voice_pool.default;
const note = draw(pool, seenNotesKey); // no-repeat
```

---

## Unlock progression rules

Modello: Quality-Based Narrative (Failbetter/Fallen London) adattato.
Ogni specie/bioma/concept ha `unlock.triggers[]` + `unlock.threshold`.

### Trigger catalog

| Trigger                   | Quando                                      | Entry type |
| ------------------------- | ------------------------------------------- | ---------- |
| `encounter_completed`     | Fine scontro con specie nel roster nemici   | species    |
| `biome_resonance_crossed` | `biomeResonance.js` supera soglia per biome | biome      |
| `thought_internalized`    | Thought Cabinet internalize (già wired)     | concept    |
| `mating_success`          | Evento mating riuscito con specie target    | species    |
| `campaign_milestone`      | Advance scenario con outcome specifico      | event      |
| `ancestor_wire`           | Ancestor trigger fired (M-future)           | lineage    |

### Persistence

```
localStorage key: evo:codex-seen-{entry_id}
Valore: { unlocked: true, ts: ISO8601, trigger: "encounter_completed" }
```

Già referenziato in `docs/planning/codex-in-game-aliena-integration.md:148` (Wave 10 original plan) — anticipato a Wave 9 come MVP.

### Locked state

Entry locked: sidebar mostra `🔒 ???` + tipo. Entry view mostra:

```
Scopri questa [specie/bioma/concept] per sbloccare il Codex.
Suggerimento: [bioma_primario] — [locked_preview text]
```

NO spoiler su nome o content.

---

## Industry patterns primary-sourced

### 1. Hades Codex (Supergiant Games, 2020)

**Container**: sidebar lista entry unlock progressivo → click → detail view con note Zagreus.
**Content schema**: Name + background lore + Zagreus personal note (diegetic). Note sbloccano con dialogo con Achilles (relationship quality).
**Unlock pattern**: dialogo reiterato con NPC (quality-based — numero conversazioni come quality numeric).
**Diegetic voice**: Zagreus commenta ogni entry in prima persona, tono personale → "questo personaggio ha un rapporto con quella entità".
**Steal per Evo-Tactics**: container sidebar + diegetic Skiv-note footer + unlock progressivo. [Fonte: Hades Fandom Codex](https://hades.fandom.com/wiki/Codex)

### 2. Subnautica PDA (Unknown Worlds, 2018)

**Container**: scan → unlock entry PDA → sezioni Biology / Behavior / Lore / Assessment.
**Content schema**: 4 sezioni ordinate biologico → ecologico → lore → valutazione rischio.
**Unlock pattern**: scan fisico in-world (incontro diretto oggetto). Partial scan = partial info.
**Diegetic voice**: AI della tuta (Ryley Robinson companion) — tone distaccato-scientifico ma con micro-commenti personali.
**Steal**: schema multi-sezione ordinato (A.L.I.E.N.A. = Subnautica PDA sezioni) + partial unlock (sezioni progressive, non tutto subito). [Fonte: Subnautica Fandom PDA](https://subnautica.fandom.com/wiki/PDA)

### 3. Pokemon Pokédex (Game Freak, 1996-2022)

**Container**: lista specie per numero + search/filter + entry card.
**Content schema**: tipo + habitat + altezza/peso + flavor text region-specific (Hisui/Galar/Paldea — stessa specie, contesto narrativo cambia).
**Unlock pattern**: encounter = unlock entry. Catch = dati completi.
**Diegetic voice**: flavor text varia per region/game — stessa specie vista da cultura diversa.
**Steal**: flavor text biome-variant (come Skiv-note biome-specific) — stessa specie, contesto cambia. [Fonte: Bulbapedia Pokédex](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9dex)

### 4. Nier Automata weapon stories (PlatinumGames, 2017)

**Container**: inventory weapon → entries sbloccano Level 1/2/3/4 con upgrade.
**Content schema**: 4 livelli depth — L1 = chi era il proprietario, L2 = cosa gli è successo, L3 = destino, L4 = connessione ai temi cosmici.
**Unlock pattern**: upgrade weapon per livello narrative depth = commitment richiesta.
**Steal**: depth progressiva per entry — sezione A.L.I.E.N.A. base visibile subito, sezioni L/I/E progressive su re-encounter. "Conosci meglio questa specie = vedi di più". [Fonte: NieR Automata Wiki Weapon Stories](https://nierautomata.wiki.fextralife.com/Weapon+Stories)

### 5. Outer Wilds Ship Log (Mobius Digital, 2019)

**Container**: node-based discovery web. Ogni nodo = location/mystery. Lines connettono inferenze.
**Content schema**: non lineare — ogni nodo ha fragment info, player costruisce la mappa mentale.
**Unlock pattern**: fisical exploration → automatic log. Non serve "studiare" — basta essere stati lì.
**Steal**: cross-ref links cliccabili nell'entry view (A. Ambiente → biome:savana → biome entry apre inline). Discovery graph tra specie e biomi come worldgen card M-012. [Fonte: Outer Wilds Fandom Ship Log](https://theouterwilds.fandom.com/wiki/Ship_Log)

---

## Effort estimate

### Delta rispetto Wave 9 piano originale (8h)

| Componente                         | Wave 9 originale | Delta 6-dim + Skiv note         | Totale |
| ---------------------------------- | ---------------- | ------------------------------- | ------ |
| Data: schema + codex.yaml 5 specie | 2h               | +2h (6-dim content reale)       | 4h     |
| UI Modal HTML/CSS                  | 2h               | +1h (sidebar + accordion 6-dim) | 3h     |
| Tab navigation + species card grid | 2h               | +0.5h (6 tab invece 4)          | 2.5h   |
| A.L.I.E.N.A. detail panel + expand | 2h               | — (già coperto)                 | 2h     |
| Skiv-instance note layer           | —                | +1h (voice pool + QBN wire)     | 1h     |
| QBN unlock hook + localStorage     | —                | +1h (trigger catalog wire)      | 1h     |

**Totale: ~13.5h** (Wave 9 MVP 8h + 6-dim delta 3h + Skiv note 1h + unlock 1h + QA 0.5h).

### Breakdown per fase

- **Dataset (4h)**: `data/codex/` folder + 5 entry YAML (dune_stalker priority) + schema validation.
- **Runtime (3h)**: QBN draw hook + unlock trigger listener (biomeResonance, thoughtCabinet, session events) + localStorage persistence.
- **UI (6h)**: sidebar component + 6-dim accordion + Skiv note footer + 6 tab refactor codexPanel.js + CSS extension + a11y.
- **QA (0.5h)**: TV 42" @ 2m, mobile 375px, ESC dismiss, skip-button accessible.

---

## Domande aperte per master-dd

1. **Depth progressiva per sezioni A.L.I.E.N.A.**: le 6 sezioni sono tutte visibili al primo unlock, oppure sbloccano progressivamente (N/A ancoraggio solo dopo N re-encounter con specie)? Pattern Nier Automata suggerisce depth progressiva — ma aggiunge 2h dev + design content.

2. **Skiv-note per tutte le specie o solo Skiv su sé stesso?**: la nota "in prima persona Skiv" funziona per entry `dune_stalker` (è lui che parla di sé). Per altre 44 specie: Skiv osserva dall'esterno? Questo cambia il voice template radicalmente e richiede contenuto separato.

3. **Tab "Lignaggi" (ancestors)**: include link a `active_effects.yaml` ancestors branch (OD-011, 297 neuroni wired)? Se sì, richiede UI component separato (~3h extra) — potrebbe essere Wave 10.

---

## Cross-ref

- Piano Wave 9 originale: [`docs/planning/codex-in-game-aliena-integration.md`](../planning/codex-in-game-aliena-integration.md)
- Codex stub live: [`apps/play/src/codexPanel.js`](../../apps/play/src/codexPanel.js) — W8L, 4 tab
- Entry esempio: [`data/codex/example_dune_stalker.yaml`](../../data/codex/example_dune_stalker.yaml)
- Species data source: [`data/core/species.yaml:61`](../../data/core/species.yaml) — dune_stalker entry
- Biomes data source: [`data/core/biomes.yaml:643`](../../data/core/biomes.yaml) — savana entry
- Skiv canonical: [`docs/skiv/CANONICAL.md`](../skiv/CANONICAL.md)
- QBN engine: verificare path `apps/play/src/qbnEngine.js` prima di wire
- A.L.I.E.N.A. documento: [`docs/appendici/ALIENA_documento_integrato.md`](../appendici/ALIENA_documento_integrato.md)
- Museum card worldgen bioma: [`docs/museum/cards/worldgen-biome-as-gameplay-fiction-package.md`](../museum/cards/worldgen-biome-as-gameplay-fiction-package.md) — score 5/5, 5/7 biomes.yaml fields non consumati
