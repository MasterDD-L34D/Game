---
title: Skiv Companion — Worldgen-Aware Istanza Generativa
doc_status: draft
doc_owner: design-team
workstream: cross-cutting
last_verified: 2026-04-27
tags: [skiv, companion, worldgen, species, biome, generative]
---

# Skiv Companion — Worldgen-Aware Istanza Generativa

> **Spec v0.1** — 2026-04-27. Derivato da user decisioni B1+B3 (2026-04-26 sera).
> Pool + schema generativo. Codice impl: companion runtime Sprint post-spec.

---

## 1. TL;DR (5 bullet)

- **Pool ricco**: 8 biomi shipping coperti, 8-12 nomi each (96+ nomi totali pool), 2-3 specie per bioma cross-verificate con `data/core/species.yaml`, 2-3 closing ritual distinti per bioma.
- **Schema generativo**: il companion emerge da 3 input worldgen (`primary_biome` + `squad_dominant_form` + `ecological_role_gap`) — non è lookup statico, è selezione vincolata da matrice bioma×ruolo×MBTI.
- **B3 ibrido**: Skiv canonical (`dune_stalker`, INTP, savana) override totale per l'allenatore originale. Altri run / altri allenatori → generazione completa da `data/core/companion/skiv_archetype_pool.yaml`.
- **Voice rule invariante**: prima persona + metafore bioma-specifiche + interlocutore "allenatore" + closing rituale per bioma. NON si generalizza a sabbia per tutti i biomi.
- **Effort minimal ~3h**: `companionService.js` (NEW ~100 LOC) + wire a `skivPanel.js` già esistente + biome_id in session `/start`. Senza toccare session engine.

---

## 2. Schema Generativo — come worldgen produce un'istanza

```
worldgen.primary_biome ─────────────────────────────┐
                                                     ▼
vcScoring squad aggregate → cluster.dominant_form → MBTI personality bias
                                                     ▼
biome_pools.json role_templates → ecological_role_gap ─┐
                                                       ▼
                                 ┌─────────────────────────────────┐
                                 │   companionService.selectInstance │
                                 │                                   │
                                 │  1. lookup biome_pools[biome]     │
                                 │  2. filter species by role_gap    │
                                 │  3. random_seeded name from pool  │
                                 │  4. pick voice_metaphor_set       │
                                 │  5. pick closing_ritual           │
                                 │  6. apply MBTI voice_modifier     │
                                 └─────────────────────────────────┘
                                                     ▼
                              { species_id, name, starting_phase: hatchling,
                                voice_metaphor_set, closing_ritual,
                                personality_bias }
```

**Input 1 — `worldgen.primary_biome`** (required):
Slug da `data/core/biomes.yaml`. Lookup diretto su `biome_pools` in `skiv_archetype_pool.yaml`.
Se bioma non in pool → fallback savana (WARN in log).

**Input 2 — `cluster.dominant_form`** (optional):
MBTI type aggregato dalla squadra via `vcScoring.deriveMbtiType()` già live.
Influenza solo `voice_modifier` (tono), non la specie selezionata.
Se null (squadra non ancora classificata) → nessun bias, voice neutra.

**Input 3 — `ecological_role_gap`** (optional):
Da `biome_pools.json` (Museum M-2026-04-26-013, `catalog.js:145` già carica).
Logica: conta clade_tag presenti in sessione, pick ruolo con 0 istanze.
Default fallback: `bridge` (sempre disponibile come ruolo mediatore).

**Regola di esclusione Apex**: specie con `clade_tag: Apex` (es. `leviatano_risonante`)
non possono essere companion — sono boss/antagonisti. Hard-exclude da pool selection.

**Starting phase**: sempre `hatchling` (lifecycle canonical `dune_stalker_lifecycle.yaml`).
Il companion repart da zero ogni run — non importa il tier del companion precedente.

---

## 3. Pool Ricco Completo

Pool definito in `data/core/companion/skiv_archetype_pool.yaml` (file:1).
Riassunto qui. Per nomi completi + metaphor set + closing → vedi YAML.

| Bioma (slug)                  | Specie candidate (species.yaml verified)                                                                                | Nomi pool                                                                         | Closing ritual                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `savana`                      | `dune_stalker` (Threat/T2)                                                                                              | Vrak, Krenn, Yorà, Mara, Nael, Oren, Sabe, Tiro, Vena, Zhan, Khàl, Drav           | "Sabbia segue." / "Vento ricorda." / "La duna non dimentica."                       |
| `caverna`                     | `perfusuas_pedes` (Bridge/T1)                                                                                           | Prell, Drusk, Keth, Mord, Voss, Crenn, Grul, Thal, Avel, Nusk, Brak, Sonn         | "L'eco porta lontano." / "La pietra ascolta." / "Profondo tiene."                   |
| `foresta_temperata`           | `chemnotela_toxica` (Threat/T2), `soniptera_resonans` (Threat/T2), `umbra_alaris` (Playable/T3)                         | Lyss, Vehl, Tara, Kael, Nyrr, Wren, Sova, Meli, Bryn, Lonn, Faen, Thel            | "La radice tiene." / "Nebbia porta tracce." / "Il bosco ricorda chi passa."         |
| `badlands`                    | `gulogluteus_scutiger` (Playable/T2), `elastovaranus_hydrus` (Playable/T2)                                              | Gorra, Rost, Drev, Klar, Hrann, Skrel, Vorn, Brast, Tolm, Grann, Frek, Rast       | "Ferro tiene." / "La tempesta insegna." / "Ruggine ricorda tutto."                  |
| `atollo_obsidiana`            | `anguis_magnetica` (Bridge/T1)                                                                                          | Ossi, Tael, Varn, Kress, Maris, Onda, Shard, Reav, Lorn, Zaph, Nael, Cors         | "La marea ricorda." / "Ossidiana riflette." / "L'onda porta lontano."               |
| `frattura_abissale_sinaptica` | `polpo_araldo_sinaptico` (Keystone/T5), `simbionte_corallino_riflesso` (Support/T3), `sciame_larve_neurali` (Threat/T0) | Synna, Pholx, Abys, Lumis, Crest, Voidd, Nexyn, Fosfa, Halys, Trenn, Ekonn, Riftl | "La rete porta lontano." / "L'abisso ascolta." / "La luce sale dal basso."          |
| `terrestre_montano`           | `rupicapra_sensoria` (Keystone/T5)                                                                                      | Crest, Alvar, Pinnk, Stern, Brael, Khorn, Vreth, Raan, Holm, Geld, Skeld, Thron   | "La vetta aspetta." / "Pietra tiene sempre." / "Il vento porta più in alto."        |
| `rovine_planari`              | `elastovaranus_hydrus` (Playable/T2)_, `anguis_magnetica` (Bridge/T1)_                                                  | Rifta, Eonn, Plaen, Archn, Vaex, Shrel, Orvyn, Psyke, Vexil, Dimen, Threx, Eclip  | "Il portale ricorda." / "L'eco porta oltre." / "Le rovine insegnano chi resisteva." |

\*Nota rovine_planari: nessuna specie in `species.yaml` ha `biome_affinity: rovine_planari`.
Pool usa specie con alta plasticità ecologica (Bridge clade + Playable). Design intent: bioma raro
= companion raro = specie "sopravvissuta" a transizione planare, non nativa.

**Biomi senza pool** (fallback → savana): `palude`, `dorsale_termale_tropicale`,
`foresta_acida`, `foresta_miceliale`, `canopia_ionica`, `canyons_risonanti`,
`reef_luminescente`, `pianura_salina_iperarida`, `stratosfera_tempestosa`,
`mezzanotte_orbitale`, `steppe_algoritmiche` + tutti biomi expansion.
Priorità futura: espandere pool quando nuove specie vengono assegnate a questi biomi.

---

## 4. B3 Ibrido — Override Canonical per l'Allenatore

Decisione user 2026-04-26: **Skiv canonical è invariante per l'allenatore originale**.
Per altri allenatori (altri player nel co-op o altri run) → generazione completa.

```yaml
# In session config o player profile:
canonical_trainer_id: <trainer_id dell'allenatore che ha 'scelto' Skiv>

# companionService.selectInstance():
if (trainer.id === config.canonical_trainer_id): return SKIV_CANONICAL # dune_stalker, INTP, savana, "Sabbia segue."
else: return generateFromPool(worldgen.primary_biome, squad_form, role_gap)
```

**Chi è il canonical_trainer?** Il player che ha iniziato la campagna originale con Skiv.
In co-op: l'host (player 1) se non specificato altrimenti. Configurabile in session `/start`
con `companion.canonical_trainer_id`.

**Implicazione co-op (4p)**: host vede Skiv canonical. P2/P3/P4 vedono companion generati
dal bioma del run corrente — nomi diversi, specie diverse, closing diversi.
**Coesistenza**: tutti i companion seguono lo stesso lifecycle hatchling → legacy.

---

## 5. Edge Case — Fallback

| Situazione                               | Comportamento                              | Log                                                                    |
| ---------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `primary_biome` non in pool              | Usa pool `savana`                          | `WARN: biome [X] no companion pool, defaulting savana`                 |
| `ecological_role_gap` null               | Default `bridge`                           | nessun log                                                             |
| `squad_dominant_form` null               | Nessun MBTI bias, voice neutra             | nessun log                                                             |
| Species selezionata ha `clade_tag: Apex` | Esclude, riseleziona                       | `WARN: apex species excluded from companion pool`                      |
| Pool bioma vuoto (zero specie valide)    | Usa `dune_stalker` come fallback assoluto  | `WARN: empty pool for biome [X], using dune_stalker archetype`         |
| `canonical_trainer_id` non configurato   | Tutti i player ricevono companion generato | `INFO: canonical_trainer_id not set, generative mode for all trainers` |

**Anti-pattern guard**:

- NON inventare specie non in `data/core/species.yaml` — il pool è bounded dai dati reali.
- NON usare "sabbia" come metafora universale — ogni bioma ha il suo vocabolario sensoriale.
- NON assegnare Apex come companion (leviatano_risonante, rupicapra_sensoria non è Apex ma Keystone — OK come companion).

---

## 6. Effort Wire Runtime

Tre path progressivi. Tutti partono da `skivPanel.js` già esistente.

### Path Minimal (~3h) — nome + closing bioma-aware

1. `data/core/companion/skiv_archetype_pool.yaml` (questo file — done).
2. `apps/backend/services/companion/companionService.js` (NEW, ~100 LOC):
   - `selectInstance(biome_id, trainer_id, run_seed)` → `{ species_id, name, closing_ritual }`
   - Legge YAML via `js-yaml` (già in deps).
   - random_seeded con `run_seed` per riproducibilità.
3. `apps/play/src/skivPanel.js`: aggiunge `renderCompanionName(name, closing)` nel header panel.
4. Session `/start`: accetta `companion.canonical_trainer_id` optional.
5. Test: 3 unit (savana canonical → Skiv / foresta → Lyss + closing radice / bioma fallback).

**Dipendenze**: skivPanel.js (esistente), biomes.yaml (esistente), js-yaml (esistente).

### Path Moderate (~8h) — MBTI personality bias + ecological role

Path Minimal +

1. Legge `vcScoring.deriveMbtiType()` aggregate per squadra → `voice_modifier`.
2. Wire `biome_pools.json` (`catalog.js:145` già carica) per `role_gap` detection.
3. Companion mostra voice differenziata in UI (testo diverso per T_high vs F_high).
4. Lifecycle tracking: companion inizia `hatchling`, avanza con sessione.
5. Test: +5 unit per MBTI bias + role_gap selection.

**Dipendenze**: vcScoring.js (esistente), biome_pools.json (esistente, Museum M-2026-04-26-013).

### Path Full (~18h) — multi-trainer + diary + legacy

Path Moderate +

1. Multi-trainer: ogni player in co-op ha companion separato persistente.
2. Diary integration (PR #1777 già shipped): companion ha diary entries per fase.
3. Legacy phase → `lineage_id` pass a sessione successiva (V3 Mating/Nido hook).
4. ADR companion persistence schema.
5. UI: panel companion mostra fase corrente + ASCII sprite from lifecycle.

**Dipendenze**: OD-001 Mating/Nido decision pending, diary già shipped.

---

## 7. Domande per master-dd

**D1 — Canonical trainer ID persistenza**: `canonical_trainer_id` vive in session config
o in un profilo player persistente? Se multiplayer cross-session (stessa campagna continuata),
serve persistenza. Se ogni sessione è fresh, può essere parametro di `/start`.
Risposta impatta path minimal vs moderate scope.

**D2 — Companion con species diversa: visual gap**: `gulogluteus_scutiger` (badlands) ha
aspetto diverso da `dune_stalker` — oggi il companion panel mostra l'ASCII sprite del lifecycle
canonical Skiv (dune_stalker). Per companion con species diversa serve lifecycle YAML dedicato
o basta un placeholder sprite? Blocca visual fidelity ma non il pool funzionale.

**D3 — Co-op visibility**: nel co-op 4p, ogni player vede il proprio companion e quello
degli altri? O solo il proprio? Impatta UI layout `skivPanel.js` (overlay vs sidebar multipla).

---

## Appendice — Museum cards citate

- **M-2026-04-26-013** (`worldgen-species-emergence-from-ecosystem.md`): `biome_pools.json`
  contiene `role_templates` già parsati in `catalog.js:145` — usabili per `ecological_role_gap`.
- **M-2026-04-26-017** (`worldgen-forme-mbti-as-evolutionary-seed.md`): `formPackRecommender.js`
  già operativo, `deriveMbtiType()` in `vcScoring.js:843` — squad aggregate MBTI è disponibile.
- **M-2026-04-26-018** (`worldgen-biome-as-gameplay-fiction-package.md`): `biomes.yaml`
  contiene tono narrativo e hooks per bioma — biome_metaphor_set è coerente con questi dati.

---

## File

- `data/core/companion/skiv_archetype_pool.yaml` — pool + generative rules + effort estimate
- `docs/design/2026-04-27-skiv-companion-worldgen-integration.md` — questo file (spec)
