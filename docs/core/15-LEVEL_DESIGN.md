---
doc_status: active
doc_owner: master-dd
workstream: dataset-pack
last_verified: '2026-04-16'
source_of_truth: false
language: it
review_cycle_days: 30
---

# Level Design

> Promosso da docs/planning/draft-level-design.md (2026-04-16). Schema AJV in `schemas/evo/encounter.schema.json`.

## Scopo

Definire come si progettano encounter, mappe e livelli in Evo-Tactics. Colma il gap tra biomi (sistema ecologico) e gameplay concreto (cosa vede il giocatore quando inizia una partita).

## Anatomia di un livello

Un livello Evo-Tactics è composto da:

```
Livello = Bioma + Layout Griglia + Obiettivo + Wave Config + Condizioni Speciali
```

### 1. Bioma (contesto ambientale)

Determina: terreno base, hazard ambientali, pool specie nemiche, palette visiva, soundscape.
Fonte dati: `data/core/biomes.yaml`, `packs/evo_tactics_pack/data/balance/`.

### 2. Layout Griglia

- **Dimensione** (post ADR-2026-04-16 hex axial + ADR-2026-04-17 coop-scaling): piccola (6×6, 1-2 party), media (8×8, 2-4 party), grande (10×10, 4-8 party raid). Vedi `data/core/party.yaml` modulation preset. **Vecchio 8/12/16 obsoleto pre-coop-scaling**.
- **Elementi**: terreno piatto, alture (vantaggio tiro/backstab), coperture (half/full), terreno difficile, caselle speciali (spawn, obiettivo, interattive).
- **Simmetria**: co-op vs Sistema → asimmetria intenzionale. Giocatori partono da zona protetta; Sistema controlla punti strategici.

### 3. Obiettivo

Non tutti i livelli sono "elimina tutti i nemici." Varietà:

| Tipo obiettivo    | Descrizione                                   | Tensione         |
| ----------------- | --------------------------------------------- | ---------------- |
| **Eliminazione**  | Sconfiggi tutte le unità nemiche              | Attrition        |
| **Cattura punto** | Controlla zona per N turni                    | Posizionamento   |
| **Escort**        | Proteggi unità alleata fragile fino a uscita  | Gestione risorse |
| **Sabotaggio**    | Distruggi struttura nemica sotto timer        | Tempo            |
| **Sopravvivenza** | Resisti N wave con risorse limitate           | Economia azioni  |
| **Fuga**          | Raggiungi zona evacuazione entro turni limite | Mobilità         |

### 4. Wave Config (Director)

Il Sistema/Director controlla il ritmo tramite wave:

- **Wave spawn**: ogni N turni, nuove unità da punti spawn predefiniti.
- **Escalation**: wave successive più forti (tier specie, affissi, status).
- **StressWave** (da `SistemaNPG-PF-Mutazioni.md`): pressione ambientale che modifica terrain/hazard mid-match.
- Config in YAML: `{ wave_id, turn_trigger, spawn_points, units[], affixes[] }`.

### 5. Condizioni Speciali

Modificatori opzionali per varietà:

- **Nebbia di guerra**: FOV limitato, favorisce scout/Filatori d'Abisso.
- **Terreno instabile**: caselle che si distruggono dopo N turni.
- **Rinforzi alleati**: NPC che si uniscono a metà match.
- **Mutazione ambientale**: bioma cambia proprietà mid-match (StressWave).

## Encounter Template

Formato YAML proposto per definire un encounter:

```yaml
encounter_id: enc_frattura_01
name: 'Discesa nella Frattura'
biome_id: frattura_abissale_sinaptica
grid_size: [12, 12]
objective:
  type: capture_point
  target_zone: [5, 5, 7, 7]
  hold_turns: 3
player_spawn: [[0, 5], [0, 6], [1, 5], [1, 6]]
waves:
  - wave_id: 1
    turn_trigger: 0
    spawn_points: [[11, 5], [11, 6]]
    units:
      - species: filatore_abisso
        count: 2
        tier: base
  - wave_id: 2
    turn_trigger: 4
    spawn_points: [[11, 3], [11, 8]]
    units:
      - species: custode_basalto
        count: 2
        tier: elite
        affixes: [volcanic_shield]
conditions:
  - type: fog_of_war
    fov_radius: 4
  - type: stress_wave
    trigger_turn: 6
    effect: terrain_collapse
difficulty_rating: 3 # 1-5
estimated_turns: 10
```

## Progressione difficoltà (post ADR-2026-04-17 hex axial + coop-scaling)

Grid size deriva da **deployed PG** via `party.yaml` grid_scaling: 1-4 PG → 6×6, 5-6 PG → 8×8, 7-8 PG → 10×10. La tabella sotto riporta modulation tipica e grid risultante.

| Fase campagna       | Deployed | Grid  | Wave    | Obiettivi             | Condizioni          | Class (ADR-04-20)        |
| ------------------- | -------- | ----- | ------- | --------------------- | ------------------- | ------------------------ |
| Tutorial (1-3)      | 2 PG     | 6×6   | 1 wave  | Eliminazione          | Nessuna             | tutorial (1.0x)          |
| Tutorial_adv (4-5)  | 2 PG     | 6×6   | 2 wave  | Hazard + boss tier-1  | Status + hazard     | tutorial_advanced (1.1x) |
| Esplorazione (6-10) | 4 PG     | 6×6   | 2 wave  | Mix (cattura, escort) | Fog leggera         | standard (1.2x)          |
| Confronto (11-18)   | 6 PG     | 8×8   | 3 wave  | Mix completo          | StressWave, terrain | hardcore (1.8x)          |
| Endgame (19-25)     | 8 PG     | 10×10 | 4+ wave | Multi-obiettivo       | Tutto + enrage      | boss (2.0x)              |

Turn_limit_defeat (ADR-2026-04-20 + M9 P6): hardcore=25, boss=20 (force decision pressure Long War pattern).

**Note**: encounter tutorial 01-05 usano 6×6 perché modulation scout (2 PG). Hardcore-06 override esplicito 10×10 via `grid_size: 10` (8 PG full modulation). Vedi `apps/backend/services/party/loader.js` `gridSizeFor(deployed)`.

## Relazione Bioma → Livello

Ogni bioma produce N livelli con flavor diverso:

- **Frattura Abissale**: verticalità, poca luce, trappole luminose → FOV ridotto, terrain instabile.
- **Zone Geotermiche**: coperture basaltiche, flussi magma → terrain che cambia, zone danno.
- **Correnti Zefiri**: piattaforme aeree, correnti → mobilità forzata, caselle che spostano unità.
- **Foresta Radicale**: sottobosco denso, radici emergenti → coperture dense, imboscate.

## Decisioni confermate (da doc esistenti)

- **Editor livelli**: YAML manuale + Python CLI (`tools/py/generate_encounter.py`) per generazione rapida. Nessun GUI editor previsto per MVP. (Fonte: tools/py/)
- **Procedurale vs hand-crafted**: biomi generati proceduralmente (`generator.js`, `generator_encounter.py`); livelli/encounter hand-crafted dentro i biomi. (Fonte: `docs/planning/tactical-lessons.md`)
- **Difficulty rating**: scala 1-5 stelle. Parametri `diff_base` + `mod_biome` definiti per ogni bioma in `data/core/biomes.yaml`. (Fonte: biomes.yaml)
- **Multiplayer**: co-op vs Sistema è primario. PvP e raid esplicitamente fuori scope MVP. (Fonte: `docs/core/90-FINAL-DESIGN-FREEZE.md`, Tesi #1)
- **Schema AJV**: combat schema + trait mechanics schema esistono in `packages/contracts/schemas/`. Encounter template schema da aggiungere come estensione. (Fonte: CLAUDE.md)

## Gap aperti residui

- [ ] Schema AJV specifico per encounter template (estendere contracts)
- [ ] Formula esatta difficulty: come combinare diff_base, mod_biome, wave count, unit tier?
- [ ] Encounter 4-10: progettare remaining encounter per chain tutorial→endgame

## Riferimenti

- `docs/core/10-SISTEMA_TATTICO.md` — combat system
- `docs/core/28-NPC_BIOMI_SPAWN.md` — NPG, biomi, affissi, director
- `docs/planning/research/lore_concepts.md` — archetipi e hook missioni
- `SistemaNPG-PF-Mutazioni.md` — StressWave e tabelle spawn
- Postmortem Fallout Tactics — level design lessons per tactical squad combat
