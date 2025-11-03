# Evo Tactics — Feature Map (v1 → v8) — 2025-10-24

Questa mappa riassume **tutte le feature** costruite finora, organizzate per area e con riferimento ai file principali nel pacchetto.

---

## 0) Timeline versioni (macro)

- **v1**: Pacchetto minimo (specie + morph base, ENTP, job skirmisher, regole core, arma/tag/surge base, biomi starter, social/nest, telemetria).
- **v2**: Trait (Focus Frazionato, Backstab), 5 job extra, Mating & Regista, economia & preferenze & privacy, sinergie aggiornate.
- **v3**: Biomi Desert/Cavern/Badlands espansi, template NPG + tabelle comportamento, MBTI↔Job micro-bonus, gear invoker, checklist e validation.
- **v4**: 3 nuove specie + morph dedicati, preferenze social cross-biome, 6 one-pager NPG, encounter tables, reward tiers.
- **v5**: MBTI Gates (soft), JSON Schemas (PG/NPG), Spawn Pack v1 (12 NPG), GM Quickstart, manifest.
- **v6**: Patch “playtest-needed”: feint_step, proficiency, checks, stances, units_grid, mating_biome_links, tuning, surge SG, tag avanzati.
- **v7**: **Add-on Enneagramma integrato**, temi 1..9 con hook, compat alias, validator, Quickstart aggiornato.
- **v8**: **Mappa ruoli→temi alternativa** e **Spawn Pack v8 (alt)**, profilo selettore.

---

## 1) Sistemi Core

- **Statistiche & Derivazioni**: `rules/stats.md` (HP, AC, Parry, Guardia, Move, Vel) → valide i valori di Klynn (13/13/+2/0/5/+1).
- **Risorse**: `rules/resources.md` (PT, PP, PI, PE, SG) + `rules/tuning.md` (cap & ritmo, _playtest-needed_).
- **Prove & CD**: `rules/checks.md` (d20, CD guideline, vantaggio/svantaggio, TS) _(playtest-needed)_.
- **Proficienze**: `rules/proficiency.md` _(playtest-needed)_.
- **Stance/Guardie**: `rules/stances.yaml` (6 stance base) _(playtest-needed)_.
- **Unità & Griglia**: `rules/units_grid.md` (1 casella = 1,5 m) _(playtest-needed)_.

## 2) Specie & Morph

- **Specie**: `species/dune_stalker.yaml`, `species/sand_burrower.yaml`, `species/echo_wing.yaml`, `species/rust_scavenger.yaml`, `species/species_index.yaml`.
- **Morph base**: `morph/spring_legs.yaml`, `acid_gland.yaml`, `elastomer_skin.yaml`, `echolocate.yaml`, `burst_anaerobic.yaml`.
- **Morph extra**: `burrow_claws.yaml`, `ferrous_carapace.yaml`, `mag_sense.yaml`, `glide_wings.yaml`, `iron_spine.yaml`, `aero_exchange.yaml`, `rust_ingest.yaml`.

## 3) Forme, MBTI & Enneagramma

- **Forme (MBTI)**: `form/ENTP.yaml` (assi 0–1, Baratto Tecnico, interazioni).
- **MBTI Affinity & Gates**: `form/mbti_job_affinities.yaml` (micro-bonus) + `form/mbti_gates.yaml` (soft-gating E/N/T/P con penalty primo turno).
- **Enneagramma (temi)**: `ennea/themes.yaml` con **1..9** completi (trigger coerenti con gli hook).
- **Add-on Enneagramma integrato**: `modules/personality/enneagram/`
  - `compat_map.json` (alias stat/eventi, incl. italiani),
  - `personality_module.v1.json` (hook meccanici per temi 1..9),
  - `enneagramma_dataset.json` & `enneagramma_schema.json`,
  - `hook_bindings.ts` (adapter eventi),
  - `role_theme_mappings.yaml` (**default** + **alt**), `role_theme_profile.yaml` (selettore),
  - `pg_enneagram_template.yaml`, `HOWTO_EVO_TACTICS.md`.
- **Sinergie**: `rules/synergies.yaml` (echolocate+flank_mastery, echolocate+backstab).

## 4) Job & Trait

- **Job**: `jobs/skirmisher.yaml` (+ `feint_step`), `vanguard.yaml`, `warden.yaml`, `artificer.yaml`, `invoker.yaml`, `harvester.yaml`.
- **Trait**: `traits/focus_frazionato.yaml`, `traits/backstab.yaml`.
- **Ultimate & SG**: introdotte nei job e supportate da `surge/overdrive.yaml` (consuma `sg:1`).

## 5) Gear, Tag, Surge

- **Armi**: `gear/weapons/twin_blades.yaml`, `gear/weapons/arc_rod.yaml`.
- **Tag**: `tags/weapon.yaml` (Tecnico, Impattante), `tags/weapon_extra.yaml` (Elettrico), `tags/weapon_advanced.yaml` (Vibrante, Cinetica, Ariosa, Bilanciata, Smorzata) _(playtest-needed)_.
- **Surge**: `surge/pierce.yaml`, `surge/spin.yaml`, `surge/chain.yaml`, `surge/pulse.yaml`, `surge/overdrive.yaml` (SG).

## 6) Biomi, Social & Nest

- **Biomi**: `biomes/starter_biomes.yaml`, `biomes/desert.yaml`, `biomes/cavern.yaml`, `biomes/badlands.yaml` (hazard, preferenze, modificatori).
- **Social**: `social/affinity_trust.md`, `social/species_preferences.yaml` (Piace/Non Piace).
- **Mating & Nest**: `social/mating.md`, `nest/requirements.yaml`, `rules/mating_biome_links.md` _(playtest-needed)_.

## 7) Telemetria & Sessione

- **Telemetry VC**: `telemetry/vc.yaml` (aggiornamento aggro/risk/cohesion/setup/explore/tilt).
- **PF_session**: `telemetry/pf_session.yaml` (proiezione assi E/N/T/P).

## 8) Regista / NPG

- **Director**: `director/regista.md`, `director/behavior_tables.md`.
- **NPG One-Pagers**: 8+ file (es.: `npg_skirmisher_desert.yaml`, `npg_warden_cavern.yaml`, `npg_vanguard_desert.yaml`, `npg_invoker_cavern.yaml`, `npg_artificer_badlands.yaml`, `npg_harvester_badlands.yaml`).
- **Incontri & Ricompense**: `director/encounter_tables.yaml`, `director/regista_rewards.yaml`.

## 9) Exports, Schemi & Tools

- **Spawn Packs**:
  - v1 (default): `exports/spawn_packs/pack_biome_jobs_v1.json` (12 NPG),
  - v7 (default temi): `exports/spawn_packs/pack_biome_jobs_v7.json`,
  - v8 (alt temi): `exports/spawn_packs/pack_biome_jobs_v8_alt.json`.
- **Schemas**: `schemas/pg.schema.json`, `schemas/npg.schema.json` per validazioni.
- **Tools**: `tools/validate_v7.py` (check integrazioni), `manifest.json` (versioning pacchetto).
- **Quickstart**: `GM_Quickstart.md` (con sezioni su temi, profili e setup).

---

## 10) Feature “beta / playtest-needed” (da bilanciare)

- `rules/checks.md`, `rules/proficiency.md`, `rules/stances.yaml`, `rules/units_grid.md`, `rules/mating_biome_links.md`, `rules/tuning.md`, `tags/weapon_advanced.yaml`.
- Numeriche hook temi (1..9) in `personality_module.v1.json`: **status: beta**.

---

## 11) Collegamenti chiave (cross-modulo)

- **ENTP “Baratto Tecnico” ↔ Tag _Tecnico_ ↔ Surge**: sconto PP + gestione PT/PP (prima Surge del turno).
- **skirmisher** ↔ **flanking** ↔ `echolocate` **(sinergie)**.
- **Biomi** ↔ **specie/morph** (hazard/modifiers) ↔ **Regista** (incontri & premi).
- **MBTI Gates** + **Temi Enneagramma** ↔ **Telemetry/PF_session** (soft influence e micro-bonus).

---

## 12) Cosa manca / possibili next steps

- **PDF Quickstart** impaginato /print.
- **Script switch profilo** e rigenerazione pack on-demand.
- **Spawn Pack v2** con varianti Rank/Elite/Boss.
- **Numeriche finali** post playtest (CD, bonus/malus, tag avanzati, stances).
