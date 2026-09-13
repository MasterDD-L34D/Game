---
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-07-10'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Studio track v0.9 -- GDD refresh, asset hunt, roadmap slice-first (design)

Data: 2026-07-10 | Decider: master-dd (brainstorming in-session, 6 decisioni sotto)
| Contesto: arco sistema-symmetry CHIUSO (ADR-2026-07-10 merged, flip flag-ON in prod,
bande quarta ratifica #3265). Richiesta owner: procedere come uno studio di sviluppo
-- GDD, poi asset gratuiti, poi roadmap, poi build fase per fase.

## Decisioni owner (in-session 2026-07-10)

1. **Forma GDD**: refresh della catena ESISTENTE (hub `00-GDD_MASTER` + SoT v5 +
   freeze v0.9 + specialistici). Niente GDD monolitico nuovo: il canone e' gia'
   distribuito al ~90%, si consolida e si colmano i gap (anti-shadow-duplicate).
2. **Gap da colmare**: tutti e quattro -- SoT sez.13 stale, target audience sez.18,
   piano audio implementabile, spec accessibilita' minima.
3. **Audience primaria**: creature-strategist (adulti cresciuti con creature-collector
   che vogliono sostanza tattica; la fantasia "plasmo la mia specie" guida, P2 e' il
   pilastro-pitch). Secondaria: tattici-profondi XCOM-like. Anti-audience dichiarata:
   party-casual puro.
4. **Asset hunt gratuita**: SOLO audio (SFX + musica) e VFX combat. Creature = pipeline
   LoRA custom (fuori scope); UI frames = ASSET-GEN-gated; ambiente = art direction 41.
5. **Traguardo build**: scope freeze v0.9 completo (4 specie, 6 job, 3 biomi, slice
   meta recruit/nido/mating) -> build EA Steam.
6. **Sequenza**: C "v0.9 slice-first" -- fasi doc seriali (GDD -> asset -> roadmap),
   build ordinata per consegnare prima una vertical slice vestita con playtest umano
   a meta' percorso, poi scala.

## Fase 1 -- GDD refresh (repo Game, 1 PR)

- **SoT sez.13** (stato implementativo, stale web-v1): sostituire il corpo con un
  puntatore all'overlay LIVE `Game-Godot-v2/docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md`
  - 5 righe di fotografia corrente (Path A live, simmetria flag-ON). Zero design nuovo.
- **SoT sez.18** (audience): scrivere la decisione owner n.3 (primaria/secondaria/anti)
  con le implicazioni: tono store copy, curva onboarding (60s resta), difficolta'
  (sconfitte by-design ok), priorita' feature quando confliggono.
- **Audio: piano implementabile** (estende `00F` + `draft-audio-design.md`, non nuovo
  doc authority): classi (SFX combat, ambience per-bioma, stinger UI, musica
  menu/combat/debrief), mappa eventi Path A -> classi suono, criteri asset (tono
  biologico-alieno da art direction 41, licenze CC0/CC-BY con attribution tracking,
  formati Godot-friendly ogg/wav), budget quantitativo di prima passata (~40-60 SFX,
  ~6-8 tracce).
- **Accessibilita' (spec minima, nuovo `45-ACCESSIBILITY.md`)**: colorblind-safe per
  telegraph/status (palette + shape-coding), text scaling TV (distanza divano),
  input remapping companion, baseline PEGI16/EA -- dichiarata v1, non certificazione.
- **Hub `00-GDD_MASTER`**: refresh righe di sintesi (simmetria flag-ON, bande quarta
  ratifica, audience) + link nuovo doc 45.
- Gate: CI verde + Codex review (o sostituto), merge standard.

## Fase 2 -- Asset hunt (web research, poi 1 PR)

- Deep-research multi-source su asset LIBERI: audio (freesound, Kenney, OpenGameArt,
  itch.io CC0/CC-BY, incompetech per musica) e VFX combat (sprite-sheet impatti,
  status panic/disorient, telegraph, surge).
- Selezione CONTRO i criteri della Fase 1 (tono, licenza, formato). Ogni candidato:
  URL, licenza esatta, autore, classe, note di fit.
- Deliverable: refresh `43-ASSET-SOURCING.md` con shortlist per classe + manifest
  scaricabile (nessun import massivo in repo: shortlist approvata dall'owner PRIMA
  del download).
- Gate: review owner sulla shortlist (le licenze CC-BY richiedono attribution file).

## Fase 3 -- Roadmap refresh (1 PR)

- Aggiornare `docs/core/40-ROADMAP.md` (roadmap-of-record) alla sequenza slice-first.
  `EVO_FINAL_DESIGN_MASTER_ROADMAP.md` e' `superseded` da 40-ROADMAP e resta storico:
  NON si tocca (evita di rianimare una seconda fonte roadmap). Sequenza:
  - **F-A vertical slice vestita**: 1 bioma (badlands, gia' misurato), 2 specie,
    Path A con audio+VFX veri, polish UI. Exit-gate: slice giocabile end-to-end vestita.
  - **F-B playtest N5**: co-op real-device CAMP-4 (gate umano). Exit-gate: report
    playtest + triage.
  - **F-C scala contenuto**: 4 specie, 6 job, 3 biomi (asset scale-out validato dalla
    slice). Exit-gate: contenuto freeze completo in build.
  - **F-D slice meta + EA-ready**: recruit/nido/mating + packaging Steam EA.
    Exit-gate: build candidata EA.
- Ogni fase con Quality Gate 3-step (smoke, ricerca edge, tuning con delta) prima di
  dichiararla chiusa. Mai fase successiva con gate precedente rosso.

## Fase 4 -- Build (sessioni dedicate, fuori scope di questo doc)

Ogni fase F-A..F-D: writing-plans -> implementazione (Game-Godot-v2 self-governed +
Game backend con i suoi gate) -> verifica. Le decisioni design-nuove emerse passano
da ADR come sempre.

## Error handling / rischi

- **Asset licence drift**: solo CC0/CC-BY con tracking per-file; CC-BY-SA e NC esclusi
  (EA premium). Attribution file obbligatorio al primo import.
- **Mix stilistico**: VFX/audio vagliati contro art direction 41; in dubbio -> owner.
- **Rework asset**: la slice F-A valida i criteri prima dello scale-out F-C (il costo
  di un criterio sbagliato resta confinato alla slice).
- **Doc drift**: i refresh NON duplicano contenuto fra hub e specialistici (il hub
  sintetizza e linka, regola esistente del GDD_MASTER).

## Testing / verifica

- Fasi doc (1-3): gate PR standard (CI, ASCII-guard, Codex/sostituto) + review owner.
- Fase 4: gate dei rispettivi repo (GUT Godot ~3450 test, CI Game, playtest N5 come
  gate umano di F-B).

## Fuori scope

- Creature visuals (LoRA Fase-2), UI frames ASSET-GEN, monetizzazione oltre quanto
  gia' in 00F, localizzazioni oltre it+en, accessibilita' oltre la baseline v1.
