---
title: In-game Codex + A.L.I.E.N.A. integration plan (Wave 9+)
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-19'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/appendici/ALIENA_documento_integrato.md'
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/planning/visual-roadmap-2026-04-19.md'
---

# In-game Codex + A.L.I.E.N.A. integration plan

Plan doc post research 2026-04-19 — user playtest feedback run5: "forse era A.L.I.E.N.A. ad avere questo compito didattico/wiki enciclopedia in gioco?".

## Gap identificato

Repo audit: **ZERO sistemi player-facing codex/wiki in-game** esistono.

- `A.L.I.E.N.A.` = metodo didattico/design specie (design-side only, `docs/appendici/ALIENA_documento_integrato.md`)
- `EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md` = playbook per Codex AI agent (design-side)
- `helpPanel.js` = help modal semplice, NO encyclopedia/bestiary
- Nessun sistema lookup interno per specie/job/trait/biome/meccaniche

A.L.I.E.N.A. era progettato come metodo design, non wiki player. Integrazione in-game = nuovo scope.

## 7 reference games analizzati

| Game                       | Pattern                                    | Steal per Evo-Tactics                 |
| -------------------------- | ------------------------------------------ | ------------------------------------- |
| Pokédex                    | Unlock-on-encounter, entries card          | Progressione "meet → unlock" dopamine |
| Stellaris Species          | Trait-forward, tabs biology/society/ethics | Grouped sections A/L/I/E/N/A          |
| Slay the Spire Compendium  | Sidebar icon toggleable, all visible       | Lightweight non-blocking peek         |
| Outer Wilds Ship Log       | Hierarchical tree navigator                | Species → biome → ecosystem filter    |
| Subnautica PDA             | Scan % progressive unlock                  | Partial info → 100% full dex          |
| Disco Elysium Encyclopedia | Searchable glossary + cross-link           | Search + keyword highlighting         |
| No Man's Sky Discoveries   | Photo/scan integration                     | Hazard/biome affinity visible         |

## A.L.I.E.N.A. → UI mapping

| A.L.I.E.N.A. field         | UI tab       | Player-facing content (semplificato)                     |
| -------------------------- | ------------ | -------------------------------------------------------- |
| **A** Ambiente             | "Ambiente"   | 3-4 fatti chiave (luce, gravità, venti, substrato)       |
| **L** Linee evolutive      | "Evoluzione" | 2-3 tagline pressures (es. "Bassa luce → echolocation")  |
| **I** Impianto morfo-fisio | "Forma"      | Icon list (🦵locomotion, 👁senses, ⚖weight) + 1-2 frasi |
| **E** Ecologia & comport   | "Ecologia"   | Ruolo trofico + habitat + threat level ⭐⭐⭐⭐          |
| **N** Norme socio (opt)    | "Società"    | Se senziente: 2-3 feature culturali                      |
| **A** Ancoraggio narr      | "Narrazione" | Theme + relazione Sistema + story hook                   |

**Player vs designer detail**:

- Remove schema-level (allometric formulas, metabolic Q10)
- Highlight game-mechanical impact (trait synergies, threat level)
- Icons + short sentences TV-readable
- Flavor-forward (lore hooks > facts)

## HUD placement

📖 **Codex button header** (accanto a ? Help, 📊 Eval, ⛶ Fullscreen).

```
🦴 Evo-Tactics | Turn 3 · Active: Predatore delle Dune | 📊 Eval 📖 Codex ? 🔊 ⛶
```

Rationale:

- TV-first visible @ 2m+ distance
- Allineato con pattern Help (?) esistente (entrambi reference docs, toggleable)
- No in sidebar (sidebar focus unit cards + log)
- Persistent, accessible mid-combat senza blocking

## Wave 9 MVP scope (6-10h)

### Feature set

1. **📖 Codex btn header** in `apps/play/index.html`
2. **Modal overlay** (stesso pattern tip modal W8i: backdrop dim + center + ESC dismiss)
3. **Tab navigation**:
   - Specie (default view)
   - Lavori
   - Tratti
   - Meccaniche
4. **Species tab**: grid 2-3 card/row
   - Card: display_name_it + genus/epithet + clade_tag + biome + threat ⭐ + summary 2-3 frasi
5. **Species detail** (click card → expand):
   - Sub-tabs A/L/I/E/N/A colored border
   - 300-500 char per section TV-readable
   - Trait list core bottom
6. **Data**: static JSON bundle pre-built
   - `data/codex-bundle.json` da species.yaml + new `data/core/species/codex.yaml` estensione
   - Build script `scripts/build-codex-bundle.js`
7. **NO unlock gate MVP** — tutto visibile (lock mechanic Wave 10+)

### Data structure proposta

`data/core/species/{id}/codex.yaml` (opzionale, fallback species.yaml se missing):

```yaml
species_id: dune_stalker
codex:
  summary: 'Cacciatore solitario notturno, adattato sabbia + cavità salmastre.'
  sections:
    ambiente:
      heading: 'Ambiente'
      content: 'Pianeta lock mareale, stella M-nana...'
      key_facts: ['Bassissima luce', 'Venti forti', 'Substrati conduttivi']
    evoluzione:
      pressures: ['Bassa luce → echolocation', ...]
      analogues: 'Convergente pipistrelli + pesci abissali'
    forma:
      body_plan: 'Bilaterale basso appiattito'
      locomotion: 'Piedi-pinna palmati, 6 zampe'
      senses: ['Echolocation 45-120 kHz', 'Elettrorecettori laterali']
    ecologia:
      role: 'Predatore apex notturno'
      threat_level: '⭐⭐⭐⭐'
    narrazione:
      theme: 'Autonomia evolutiva vs Sistema'
      story_hook: 'Alleato potenziale ma imperscrutabile'
  traits_core:
    - name: 'Artigli Sette Vie'
      description: '6 artigli + falce retrattile'
```

### Estimate 8h

- Data structure + codex.yaml extraction: 2h
- Modal UI HTML/CSS: 2h
- Tab navigation + species card grid: 2h
- A.L.I.E.N.A. detail panel + expand logic: 2h
- QA + responsive: inclusi

### Files nuovi / modified

- `data/core/species/{id}/codex.yaml` (nuovi, per ogni species shipping)
- `apps/play/src/codexPanel.js` (new, ~300-400 LOC)
- `apps/play/src/style.css` (+.codex-modal + .codex-card + .codex-tabs)
- `apps/play/index.html` (+📖 Codex btn + modal root)
- `scripts/build-codex-bundle.js` (new, pre-build script)

## Future iterations (Wave 10+)

| Wave | Scope                                                                                                  | Effort |
| ---- | ------------------------------------------------------------------------------------------------------ | :----: |
| W10  | Pokédex unlock gate (`evo:codex-seen-{id}` localStorage flag) + cross-ref unit tooltip "📖 Codex" link |   M    |
| W11  | Search full-text + filter (clade, biome, threat) + relational graph foodweb                            |   L    |
| W12  | Media: creature silhouettes (da W10 asset pipeline) + ambient soundscapes 10-15s per biome             |   L    |
| W13  | Narrative: player notes journal + encounter log timestamp + post-battle observations                   |   L    |

## Implementation checklist

- [ ] Extract A.L.I.E.N.A. framework → codex schema canonical
- [ ] Add `codex` field per 5-8 species shipping (dune_stalker, predoni_nomadi, etc.)
- [ ] `codexPanel.js` module (open/close/tab logic)
- [ ] CSS modal + cards (grid + responsive breakpoints)
- [ ] Build `dist/codex-bundle.json` da species.yaml + codex.yaml
- [ ] Header btn + modal root in index.html
- [ ] A11y: aria-label tabs, keyboard Tab/Shift+Tab, ESC dismiss
- [ ] QA: TV 42"@2m, mobile 375px, desktop 1280px
- [ ] Localization: display_name_it + display_name_en
- [ ] Unit test: data load + filter by species_id + modal open/close

## Integrazione con visual roadmap W9-W13

Aligna con roadmap esistente ([visual-roadmap-2026-04-19.md](visual-roadmap-2026-04-19.md)):

- **W9** Codex MVP + HTML moodboard + palette master (parallele, entrambe docs)
- **W10** Creature silhouettes → utilizzabili in codex cards (media integration)
- **W11** Tileset biome → codex biome tab visuals
- **W12** Animation → codex preview animato creatures

Codex diventa showcase delle progressioni visuali waves.

## Prossimo step

User decisione: quando partire Wave 9. Priorità attuale: completare playtest run5 con tip modal W8i correct + merge stack 15 PR pending review.

Codex = backlog concreto, plan ready per implementation quando sprint timing disponibile.

## Cross-ref

- [A.L.I.E.N.A. documento integrato](../appendici/ALIENA_documento_integrato.md)
- [Visual roadmap 2026-04-19](visual-roadmap-2026-04-19.md)
- [Visual research 2026-04-19](visual-research-2026-04-19.md)
- [Naming styleguide 00E](../core/00E-NAMING_STYLEGUIDE.md)
- [Art direction 41](../core/41-ART-DIRECTION.md)
