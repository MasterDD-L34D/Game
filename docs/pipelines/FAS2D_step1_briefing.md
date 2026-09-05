---
title: 'FASE 2D – Step 1 Kickoff (STRICT MODE / SANDBOX)'
description: "Briefing esecutivo per l'avvio della pipeline SPECIE+BIOMI – Frattura Abissale Sinaptica"
---

## Piano sintetico (3–7 punti)

1. Riesamina il perimetro e i vincoli di Step 1 dalla pipeline istanziata per Frattura Abissale Sinaptica.
2. Allinea i riferimenti ai dataset core (biomi, specie, pool di trait) e agli standard pipeline/tooling.
3. Mappa i gap: assenza del bioma nelle anagrafiche, assenza di pool dedicati ai tre livelli, nuove specie da pianificare.
4. Definisci i confini operativi dello Step 1 (solo analisi e checklist, nessuna scrittura di file dati).
5. Prepara output di perimetro e dipendenze per sbloccare Step 2 (lore) e Step 3 (modellazione bioma).

## Esecuzione simulata (STRICT MODE / SANDBOX)

### File da leggere

- agent_constitution.md (codice di condotta e regole agente)
- docs/PIPELINE_TEMPLATES.md (strutture pipeline)
- docs/pipelines/PIPELINE_SPECIES_BIOMES_STANDARD.md (pipeline standard a 10 step)
- docs/pipelines/PIPELINE_SPECIES_BIOMES_Frattura_Abissale_Sinaptica.md (pipeline istanziata di riferimento)
- data/core/biomes.yaml (anagrafica biomi esistenti)
- data/core/species.yaml (catalogo specie e struttura trait_plan)
- data/core/traits/biome_pools.json (pool ambientali esistenti)
- docs/trait_reference_manual.md (linee guida trait) – consultazione mirata se emergono dubbi di nomenclatura

### Vincoli incrociati (lettura repository, nessuna modifica)

- **Biomi (data/core/biomes.yaml):** struttura richiede `label`, `summary`, `diff_base`, `mod_biome`, `affixes`, blocchi `hazard`, `npc_archetypes`, `stresswave` e `narrative` con hook. La Frattura Abissale Sinaptica non è presente, quindi il nuovo bioma dovrà rispettare questo schema e introdurre tre livelli interni e correnti temporanee.
- **Pool di trait (data/core/traits/biome_pools.json):** schema_version 1.0 e pool definiti con `id/label`, `climate_tags`, `hazard` dettagliato, risorse ecologiche, `traits` (core/support) e `role_templates`. Servono tre pool nuovi (uno per livello) più eventuali entrate per correnti elettroluminescenti, mantenendo range size e stress_modifiers coerenti.
- **Specie (data/core/species.yaml):** le specie includono `biome_affinity`, `default_parts`, `trait_plan` (core/optional) e `synergy_hints`. Le quattro specie target non esistono: Step 1 deve solo delineare impatti e dipendenze, lasciando a Step 5 la definizione di trait_plan coerenti con i nuovi pool e con ruoli (support, swarm, boss form-shift, copier).
- **Pipeline di riferimento:** Step 1 deve consegnare perimetro e checklist impatti per abilitare Step 2–3–4. Nessuna creazione di asset o valori numerici.

### Draft perimetro feature

- **Bioma “Frattura Abissale Sinaptica”:** introdurre un nuovo bioma multi-livello (cresta fotofase, soglia crepuscolare, frattura nera) con correnti elettroluminescenti che applicano modificatori temporanei; richiederà alias/terraforming bands e hazard per ciascun livello.
- **Pool e trait ambientali:** tre pool dedicati (uno per livello), con trait core/support differenziati e un set di trait temporanei per le correnti; valutare interazione con climate_tags (luminescente/profondo/elettrico) e stress_modifiers dedicati.
- **Specie collegate:** quattro schede nuove con biome_affinity puntata al nuovo bioma/ai livelli; trait_plan da agganciare ai pool di livello e ai trait temporanei (buff/debuff bioma, swarm manipolazione, boss forma variabile, copia partial-traits).
- **Coerenza cross-dataset:** aggiornamenti previsti su data/core/biomes.yaml, data/core/traits/biome_pools.json, data/core/species.yaml e su documentazione collegata (docs/biomes.md, docs/trait_reference_manual.md, docs/catalog/...).
- **Boundary Step 1:** nessuna scrittura dataset; produrre solo briefing e checklist per passare a lore-designer (Step 2) e biome-ecosystem-curator (Step 3).

## Output (simulato) – da consegnare a Step 2/3

- Briefing di kickoff con: perimetro confermato, elenco file da toccare nei passi successivi, rischi preliminari.
- Tabella dipendenze: livelli bioma ↔ pool ↔ specie ↔ trait temporanei.
- Nota per il lore-designer: necessità di hook e toni distinti per ciascun livello e per le correnti.
- Nota per trait/species-curator: tenere conto di schema_version e strutture esistenti (pool con size/hazard, trait_plan con core/optional/synergy_hints).

---

## Self-critique (Step 1)

- **Rischi:** mancano placeholder per livelli multi-bioma nei file core; rischio di divergenza tra hazard/affixes del bioma e stress_modifiers nei pool se non coordinati; forma variabile del Leviatano richiederà linee guida numeriche da Step 6.
- **Ambiguità:** definizione precisa delle correnti elettroluminescenti (durata, stacking) e relazione tra livelli (transizioni dinamiche o scene statiche) non è ancora formalizzata.
- **Prerequisiti per Step 2:** decidere tono e hook per ciascun livello, nominare i tre pool con slug coerenti, chiarire se le correnti sono modellate come hazard temporaneo o trait applicabile.
