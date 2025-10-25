# Evo Tactics — Quickstart GM (v5, 2025-10-24)

## 1) Setup rapido
- Scegli **Bioma** (`biomes/*.yaml`) e applica hazard/modificatori.
- Tira su `director/encounter_tables.yaml` per **job** e **specie**.
- Prendi un **NPG One‑Pager** (`director/npg_*.yaml`) oppure usa gli **Spawn Pack JSON** (`exports/spawn_packs/*.json`).

## 2) Telemetria & Assi
- Aggiorna `telemetry/vc.yaml` a fine turno/scena.
- Proietta `PF_session` su assi (E/N/T/P) come da `telemetry/pf_session.yaml`.
- Applica **MBTI Gates (soft)**: `form/mbti_gates.yaml` (penalty del primo turno se soglia non rispettata).
- Applica bonus Ennea: `ennea/themes.yaml` e `form/mbti_gates.yaml` (sezione `ennea_bonuses`).

## 3) Ricompense
- Calcola *tier* e premi da `director/regista_rewards.yaml` (+ eventuale **mod di bioma**).
- Converti **PE→PI** a checkpoint: `rules/economy.md`.
...
- Esempi:
  - **7 Esploratore** → `scoperta_area` → +1 PE (1/incontro)
  - **3 Conquistatore** → `colpo_decisivo` → +1 PP (1/incontro)
  - **6 Lealista** → adiacente a un alleato → +1 AC (1/turno)
- Tutti i trigger sono elencati in `ennea/themes.yaml`; gli effetti sono implementati nei **hook** del modulo.


---
## 7) Profili temi (default/alt) — v8
- I profili si trovano in `modules/personality/enneagram/role_theme_mappings.yaml`.
- Selezione corrente: **alt** (vedi `role_theme_profile.yaml`).
- Spawn pack:  
  - v7 (default): `exports/spawn_packs/pack_biome_jobs_v7.json`  
  - v8 (alt): `exports/spawn_packs/pack_biome_jobs_v8_alt.json`
