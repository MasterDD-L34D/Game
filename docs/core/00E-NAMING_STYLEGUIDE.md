---
title: Naming Styleguide — Specie e Biomi (Bilingue IT/EN)
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-16
source_of_truth: true
language: it-en
review_cycle_days: 30
---

# Naming Styleguide — Specie e Biomi

Style guide canonica per il naming di specie e biomi in Evo Tactics. Stratifica nomi tecnici (codice) e nomi player-facing (display) con supporto bilingue.

**Autorita'**: livello **A1** (hub). Vincoli formali al livello A2 (schema). Vedi [`00B-CANONICAL_PROMOTION_MATRIX.md`](00B-CANONICAL_PROMOTION_MATRIX.md).

## Principio di base

> **Codice in inglese, display primario in italiano, display alternativo in inglese.**

- Slug, id, genus, epithet, schema fields → **inglese ASCII**
- `display_name` → **italiano** (player-facing primary, TV/HUD)
- `display_name_en` → **inglese** (i18n alternate)

## Modello a doppio livello

Ogni specie/bioma ha:

1. **Layer canonico (codice)**: stabile, non localizzato, machine-readable
2. **Layer player-facing (display)**: leggibile, localizzato, TV-first

```yaml
# Esempio specie
- id: sp_arenavolux_sagittalis
  slug: arenavolux-sagittalis # canonico (kebab-case ASCII)
  genus: Arenavolux # canonico
  epithet: sagittalis # canonico
  clade_tag: Apex # enum
  display_name: 'Predatore delle Dune' # IT player-facing
  display_name_en: 'Dune Skiver' # EN alternate
  legacy_slug: dune_stalker # opzionale, per migrazione
```

```yaml
# Esempio bioma
- id: ferrous-badlands
  slug: ferrous-badlands # canonico
  biome_class: arid # enum
  display_name: 'Calanchi Ferrosi' # IT player-facing
  display_name_en: 'Ferrous Badlands' # EN alternate
  legacy_slug: badlands # opzionale
```

## Regole formali — Specie

### genus

- Una parola, iniziale maiuscola, ASCII
- 4-18 caratteri
- No spazi, apostrofi, diacritici
- Terminazioni latinizzanti preferite (`-us`, `-a`, `-ax`, `-ops`, `-eros`)
- Deve suggerire affinita' o analogie del taxon (Madrid Code 2025)
- Regex: `^[A-Z][a-z]{3,17}$`

### epithet

- Una parola, minuscola, ASCII
- 3-30 caratteri (limite editoriale, coerente con Madrid Code 2026)
- Esprime habitat, funzione, forma, comportamento
- Suffissi geografici: `-ensis`, `-(a)nus`, `-inus`, `-icus`
- Suffissi funzionali: `-cola`, `-fer`, `-ptera`, `-denta`, `-scuta`
- Regex: `^[a-z][a-z-]{2,29}$`

### clade_tag

Enum strettamente controllato. Non incluso nello slug (stabile vs balance changes):

- `Apex` — predatore di vertice
- `Keystone` — specie chiave dell'ecosistema
- `Bridge` — connettore cross-bioma
- `Threat` — minaccia tattica primaria
- `Playable` — disponibile come unita' giocatore
- `Support` — ruolo di supporto

### display_name (italiano)

- 2 parole preferite, 3 max
- Title Case in italiano
- Pattern: `[Habitat / Materiale / Comportamento] + [Corpo / Ruolo]`
- Esempi: "Predatore delle Dune", "Spazzino Ferroso", "Ala Risonante"

### display_name_en

- 2 parole preferite, 3 max
- Title Case in inglese
- Stesso pattern semantico
- Esempi: "Dune Skiver", "Rust Scavenger", "Echo Wing"

### slug

- Derivato dal nome canonico (genus-epithet), kebab-case ASCII
- **Mai** dal display name (evita i18n problems)
- Esempio: `arenavolux-sagittalis`

### id

- Prefisso `sp_` + slug normalizzato underscore
- Esempio: `sp_arenavolux_sagittalis`

### legacy_slug (opzionale)

- Slug esistente pre-migrazione
- Mantenuto per backward compat foodweb/ecosystem/test
- Esempio: `legacy_slug: dune_stalker`

## Regole formali — Biomi

### slug

- Lowercase ASCII, kebab-case
- Descrittivo: `[Materiale/Processo/Clima] + [Landform/Habitat]`
- Esempi: `ferrous-badlands`, `basalt-grottos`, `cold-mirror-fen`

### biome_class

Enum controllato:

- `arid`, `subterranean`, `wetland`, `upland`, `canopy`
- `littoral`, `geothermal`, `salt`, `deltaic`, `clastic`

### display_name (italiano) e display_name_en

- 2-3 parole, Title Case
- Stesso pattern descrittivo nelle due lingue
- IT esempio: "Calanchi Ferrosi" / EN: "Ferrous Badlands"

### Regola toponimi

I core biomes **non** usano proper noun o toponimi narrativi. Solo descrittivi e trasferibili. Eccezione: contenuti campagna specifici.

## Morph slots (specie)

Chiavi obbligatorie, snake_case:

- `locomotion`, `offense`, `defense`, `senses`, `metabolism`

Pattern valori:

- `locomotion`: `*_legs`, `*_pads`, `*_wings`, `*_fins`, `*_tendrils`
- `offense`: `*_claws`, `*_fangs`, `*_beak`, `*_jaws`, `*_spurs`
- `defense`: `*_hide`, `*_frill`, `*_scutes`, `*_carapace`, `*_quills`
- `senses`: `*_eyes`, `*_ocelli`, `*_pinnae`, `*_whiskers`, `*_pits`
- `metabolism`: `*_gland`, `*_filter`, `*_lung`, `*_gut`, `*_rumen`

## Diacritici e translitterazione

**Campi canonici** (slug, id, genus, epithet) = ASCII-only.
**Campi display** possono contenere diacritici se servono.

Tabella translitterazione:

| Originale | ASCII |
| --------- | ----- |
| ä         | ae    |
| ö         | oe    |
| ü         | ue    |
| é è ê     | e     |
| ñ         | n     |
| ø         | oe    |
| å         | ao    |
| æ         | ae    |
| œ         | oe    |
| ß         | ss    |

## Palette fonemiche

**Bias, non gabbia.** Naming deve restare leggibile e semanticamente motivato.

### Ferro-xeno (Apex/Threat, biomi metallici/aridi/subterranei)

- Cluster: `k`, `t`, `kr`, `sk`, `tr`, `ct`, `x`, `r`
- Vocali agili/taglienti: `i`, `e`
- Vocali massive: `o`, `u`
- Esempi: Lithoraptor, Ferrimordax, Pyrosaltus

### Bio-liminale (Keystone/Bridge/Support, canopy/wetland/airy)

- Sonoranti: `m`, `n`, `l`, `s`, `v`, `r`
- Sillabe `CV`/`CVCV`, code sonore
- Vocali grandi/placide: `o`, `u`, `a`
- Vocali leggere: `e`, `i`
- Esempi: Lucinerva, Cavatympa, Nebulocornis

## Unicita' e collisioni

- `slug` unico per tipo entita'
- Coppia `(genus, epithet)` unica tra tutte le specie
- `display_name` warning su duplicato (non hard fail)
- `biome.slug` unico globalmente
- `foodweb.node_id` unico almeno nel pack

**Chiave di collisione normalizzata**: due varianti ortografiche stretto-simili (`ae`/`oe`/`e`, `i`/`j`/`y`, `u`/`v`, `c`/`k`, `ph`/`f`, doppie consonanti) collidono dopo normalizzazione → CI fallisce.

## Pipeline di validazione

Vedi [`docs/guide/naming-pipeline.md`](../guide/naming-pipeline.md) per regex completi, JSON Schema, e check linter.

```mermaid
flowchart LR
  A[Nuovo nome] --> B[ASCII normalize]
  B --> C[Regex genus/epithet]
  C --> D[JSON Schema]
  D --> E[Phonotactic lint]
  E --> F[Unique slug + homonym key]
  F --> G[Referential integrity<br/>species ↔ biomes ↔ foodweb]
  G --> H[A.L.I.E.N.A. semantic check]
  H --> I[CI pass]
```

## Migrazione da naming legacy

Le specie/biomi esistenti pre-2026-04 mantengono il loro slug originale come `legacy_slug` durante la migrazione. Il nuovo `slug` (genus-epithet) e' aggiunto incrementalmente. Nessun rename forzato dei foodweb/ecosystem esistenti finche' la migrazione non e' completa.

Esempio:

```yaml
# Prima
- id: dune_stalker
  display_name: 'Dune Stalker'

# Dopo
- id: sp_arenavolux_sagittalis # nuovo id canonico
  slug: arenavolux-sagittalis # nuovo slug
  legacy_slug: dune_stalker # mantenuto
  genus: Arenavolux
  epithet: sagittalis
  display_name: 'Predatore delle Dune'
  display_name_en: 'Dune Stalker' # preserva nome originale come EN
```

## Terminologia canonica generale (IT/EN mapping)

Estensione 2026-04-20 (Prompt 1 §6 integrated-design-map). Risoluzione drift terminology del 4-agent audit consolidato (#1663 §2).

### Encounter / Missione / Scenario

| Contesto                   | Termine canonico       | Sinonimi tollerati | Esempio                                                              |
| -------------------------- | ---------------------- | ------------------ | -------------------------------------------------------------------- |
| **Schema / code / config** | `encounter` (EN)       | —                  | `schemas/evo/encounter.schema.json`, `encounter_id: enc_tutorial_01` |
| **Player-facing prose IT** | `missione`             | scontro, partita   | "Prossima missione: Caverna di Eco"                                  |
| **Dev-facing prose EN**    | `encounter`            | —                  | "enc_tutorial_06_hardcore validates"                                 |
| **Playtest artifact**      | `scenario` (EN legacy) | —                  | `tutorialScenario.js`, `hardcoreScenario.js`                         |

Mai mixare nella stessa frase. `missione` in briefing narrativo, `encounter` in tech docs.

### Sistema (antagonist AI)

| Contesto                    | Termine canonico                       | Note                                            |
| --------------------------- | -------------------------------------- | ----------------------------------------------- |
| Design docs prose IT        | `Sistema`                              | Player-facing antagonist (non "AI")             |
| Tabelle compact / diagrammi | `SIS`                                  | Abbreviazione tollerata solo cella tabella      |
| Code identifiers            | `sistema` (snake*case) o `SIS*` prefix | `controlled_by: 'sistema'`, `SIS_PRESSURE_TIER` |
| Architecture docs           | `AI Sistema`                           | Implementazione AI data-driven                  |

**Non ammesso**: mixare "AI" generico con "Sistema" nella stessa sezione senza disambiguazione.

### Status fisici e mentali (IT ↔ EN)

Canonical code keys EN (snake_case). Display IT in prose + UI briefing.

| EN (code)      | IT (prose/UI)   | Categoria |
| -------------- | --------------- | --------- |
| `bleeding`     | Sanguinamento   | fisico    |
| `fracture`     | Frattura        | fisico    |
| `disorient`    | Disorientamento | fisico    |
| `sbilanciato`  | Sbilanciato     | fisico    |
| `stunned`      | Stordito        | mentale   |
| `rage`         | Furia           | mentale   |
| `panic`        | Panico          | mentale   |
| `focused`      | Concentrato     | mentale   |
| `confused`     | Confuso         | mentale   |
| `taunted_by`   | Provocato       | mentale   |
| `aggro_locked` | Bersaglio fisso | mentale   |

**Regola**: tabella reference canonical. In prose IT usare forma maiuscola ("Sanguinamento"); in code `bleeding`. Mapping doc `docs/core/10-SISTEMA_TATTICO.md §Status` + `apps/backend/services/statusEffectsMachine.js`.

### Economia risorse (PE/PT/PP/SG/PI/Seed)

Vedi `docs/core/26-ECONOMY_CANONICAL.md` per glossario completo. Sintesi drift recenti:

| Token    | Canonical                              | Scope                                     | Note                                                 |
| -------- | -------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| **PE**   | Punti Esperienza                       | campaign-wide progression currency        | NON build currency (era ambiguo pre-2026-04-20)      |
| **PI**   | Pacchetto Invocazione (build currency) | campaign-wide                             | Earned via 5 PE → 1 PI conversion                    |
| **PT**   | Punti Tecnica                          | combat-scoped, per-round reset (P0 Q51 B) | NON budget azione (precedente ambiguità Freeze §7.2) |
| **PP**   | Power Pool                             | combat-scoped, max **3** (P0 Q54 A)       | Ultimate costa 3 PP consume all                      |
| **SG**   | Surge Gauge                            | combat-scoped, 0..3                       | Formula accumulation Q52 P2 pending                  |
| **Seed** | Seed gene                              | campaign-wide, non scalare                | Mating + Harvester ability                           |

**Mai confondere**: PE = progression, PI = build (distinti). PT token-driven (crit/MoS), PP pool cap 3 (non 10).

### Archetype / archetipo

- Code + schemas: `archetype` (EN snake/kebab) — `archetype_field`, `species_resistances.yaml`
- Prose IT: `archetipo` — "archetipo corazzato resiste a fisico"
- Mixing OK solo dove si cita campo code inline (backtick)

### Forma / Form / form

- Prose IT + title canonical: `Forma` (MBTI-based 16 Forms)
- Code + YAML: `form` (EN lowercase) — `mbti_forms.yaml`, `form_seed_bias`
- Plurale IT: `Forme` (title case quando riferito al sistema 16 Forms)

### Stadio / Stage / stage

Termine canonical Dimension 2 ("a che punto del ciclo di vita una creatura
si trova"). Distinto da `Forma` (Dimension 1, MBTI temperament). Vedi
`docs/planning/2026-04-27-forme-10-stadi-naming-spec.md` per spec completa.

- Prose IT + title canonical: `Stadio` (10 stadi anatomici I-X)
- Plurale IT: `Stadi`
- Code + YAML: `stadio` (integer 1-10) + `stadio_roman` (`I`..`X` ASCII)
- Player-facing label: `Stadio + roman + bullet + label` (es. `Stadio VI · Maturo`)
- 16 MBTI Forms × 10 Stadi sono assi ortogonali — mai confondere

**Mapping a 5 macro-fasi Skiv canonical (2:1 sub-divisione)**:

| Macro-fase  | Stadi    | Stadi label IT canonical (tier generico) |
| ----------- | -------- | ---------------------------------------- |
| `hatchling` | I-II     | Schiuso, Cucciolo                        |
| `juvenile`  | III-IV   | Giovane, Adolescente                     |
| `mature`    | V-VI     | Adulto, Maturo                           |
| `apex`      | VII-VIII | Veterano, Apice                          |
| `legacy`    | IX-X     | Antico, Lascito                          |

**Dual-layer label**:

- `stadio_label_it` / `stadio_label_en` = tier generico cross-specie (es. `Maturo` / `Mature`)
- `<species>_specific_label_it` / `<species>_specific_label_en` = override specie-specifico (es. `Predatore Maturo` / `Mature Stalker`)
- Regola cascade: se species_specific_label assente → fallback tier generico.

**ASCII-only canonical fields**: `stadio` integer + `stadio_roman` ASCII (no diacritici).
Display label può contenere diacritici se servono.

**Termini scartati** (vedi spec): `Fase` collide con round phase combat; `Età` non
copre `legacy` post-mortem; `Forma` riservato MBTI.

### Trait / tratto

- Code + schemas: `trait` (EN) — `trait_mechanics.yaml`, `active_effects.yaml`, `trait_T1/T2/T3`
- Prose IT: `tratto` / `tratti`

### Altri termini stabili

| Termine               | Canonical                                              | Note                                                      |
| --------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| intent/intento        | `intent` code, `intento` prose IT                      |                                                           |
| action/azione         | `action` code, `azione` prose IT                       |                                                           |
| resistance/resistenza | `resistance` code EN, `resistenza` prose IT            | ADR-2026-04-19 convention                                 |
| pressure/pressione    | `pressure` (Sistema tier system), `pressione` prose IT | 5 tier canonical Calm-Apex (vedi `sistema_pressure.yaml`) |

## Riferimenti

- ICZN — codice zoologico
- IAPT Madrid Code 2025 (botanico)
- Treccani — nomenclatura binomia
- Hayes & Wilson — fonotattica MaxEnt
- Speculative evolution: Dixon (After Man, New Dinosaurs), All Yesterdays
- Documento sorgente: `Naming di specie e biomi per Evo Tactics.docx` (utente, 2026-04-16)
- 4-agent audit (2026-04-20, #1663) — terminology drift §2
- `docs/core/26-ECONOMY_CANONICAL.md` — economia tokens full glossario
