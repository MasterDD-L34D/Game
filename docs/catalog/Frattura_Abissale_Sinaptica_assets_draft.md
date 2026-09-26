---
title: 'Frattura Abissale Sinaptica – Step 8 (Asset e schede visual, STRICT MODE / SANDBOX)'
description: 'Output asset-prep: naming asset, schede .md sandbox, template card/illustrazioni e mappa file catalogo'
---

## Piano sintetico (3–7 punti)

1. Allineare naming asset per livelli, specie e correnti alle convenzioni esistenti (slug lowercase con underscore, directory per bioma/specie).
2. Definire schede `.md` sandbox per bioma e specie, in stile catalogo, senza toccare i dataset core.
3. Proporre template visivi per card/illustrazioni che riflettano i gradienti di luce/pressione e le correnti elettroluminescenti.
4. Mappare i file in `docs/catalog/` da creare/aggiornare per supportare asset e schede.
5. Evidenziare rischi di naming duplicato e dipendenze per l’Archivist (Step 9).

## Naming asset proposto (nessuna creazione reale)

### Livelli del bioma

- `assets/biomes/frattura_abissale_sinaptica/cresta_fotofase_keyart.png`
- `assets/biomes/frattura_abissale_sinaptica/soglia_crepuscolare_keyart.png`
- `assets/biomes/frattura_abissale_sinaptica/frattura_nera_keyart.png`

### Specie collegate

- `assets/species/polpo_araldo_sinaptico/portrait.png`
- `assets/species/polpo_araldo_sinaptico/action_support.png`
- `assets/species/sciame_di_larve_neurali/swarm_field.png`
- `assets/species/sciame_di_larve_neurali/infestation.png`
- `assets/species/leviatano_risonante/boss_form_armonica.png`
- `assets/species/leviatano_risonante/boss_form_shear.png`
- `assets/species/simbionte_corallino_riflesso/core_cluster.png`
- `assets/species/simbionte_corallino_riflesso/mirror_copy.png`

### Effetti correnti elettroluminescenti (icone)

- `assets/effects/correnti_elettroluminescenti/scintilla_sinaptica.png`
- `assets/effects/correnti_elettroluminescenti/riverbero_memetico.png`
- `assets/effects/correnti_elettroluminescenti/pelle_piezo_satura.png`
- `assets/effects/correnti_elettroluminescenti/canto_risonante.png`
- `assets/effects/correnti_elettroluminescenti/vortice_nera_flash.png`

## Schede `.md` sandbox (struttura proposta)

### Bioma – `docs/catalog/biomes/frattura_abissale_sinaptica.md`

```
---
title: 'Frattura Abissale Sinaptica'
biome_id: frattura_abissale_sinaptica
levels:
  - cresta_fotofase
  - soglia_crepuscolare
  - frattura_nera
assets:
  keyart: assets/biomes/frattura_abissale_sinaptica/cresta_fotofase_keyart.png
  currents_icon: assets/effects/correnti_elettroluminescenti/scintilla_sinaptica.png
---

## Sintesi
[breve descrizione tecnica, ripresa da Step 3]

## Livelli
- **Cresta Fotofase:** [tag, hazard, palette colori]
- **Soglia Crepuscolare:** [tag, hazard, palette colori]
- **Frattura Nera:** [tag, hazard, palette colori]

## Correnti elettroluminescenti
- descrizione breve + icone associate

## Specie native/collegate
- Polpo Araldo Sinaptico (support)
- Sciame di Larve Neurali (swarm)
- Leviatano Risonante (boss variabile)
- Simbionte Corallino Riflesso (ibrido copia)
```

### Specie – struttura condivisa (esempio per Polpo Araldo Sinaptico)

`docs/catalog/species/polpo_araldo_sinaptico.md`

```
---
title: 'Polpo Araldo Sinaptico'
species_id: polpo_araldo_sinaptico
role: support
biome_affinity:
  primary: cresta_fotofase
  secondary: soglia_crepuscolare
assets:
  portrait: assets/species/polpo_araldo_sinaptico/portrait.png
  action: assets/species/polpo_araldo_sinaptico/action_support.png
---

## Sintesi
[ruolo, ganci narrativi da Step 2]

## Trait Plan (draft)
- Core: [slug]
- Support: [slug]
- Temp: [slug]

## Note visive
- palette suggerita, pattern luminosi, silhouette
```

Replicare la struttura per:

- `sciame_di_larve_neurali.md` (role: swarm)
- `leviatano_risonante.md` (role: boss forma variabile, due immagini dedicate alle forme armonica/shear)
- `simbionte_corallino_riflesso.md` (role: ibrido copia, con callout per effetti mirror).

## Template card/illustrazioni (sandbox)

- **Formato card bioma:** 1080x720, cornice blu-scuro → gradienti da fotofase a nero; overlay per hazard/icona corrente. Slot testo: titolo, livello, 2 bullet hazard, 2 bullet affixes.
- **Formato card specie:** 720x1024 verticale; bande laterali per tag ruolo (support/swarm/boss/ibrido); area centrale per illustrazione; footer con slug trait core/tempo.
- **Icone corrente:** 128x128, sfondo neutro con bordo elettrico; usare tonalità distintive per ciascun slug (giallo, verde acqua, viola profondo, azzurro, bianco).
- **Kit PSD/figma (proposta):** cartella `assets/templates/frattura_abissale_sinaptica/` con layer per fondo, frame, tipografia (font sans condensa) e placeholder trait.

## Mappa file catalogo da creare/aggiornare (non eseguire ora)

- Creare `docs/catalog/Frattura_Abissale_Sinaptica_assets_draft.md` (questo draft, da revisionare in Step 9).
- Nuove schede sandbox:
  - `docs/catalog/biomes/frattura_abissale_sinaptica.md`
  - `docs/catalog/species/polpo_araldo_sinaptico.md`
  - `docs/catalog/species/sciame_di_larve_neurali.md`
  - `docs/catalog/species/leviatano_risonante.md`
  - `docs/catalog/species/simbionte_corallino_riflesso.md`
- Aggiornare indici esistenti se presenti (es. `docs/catalog/catalog_data.json`, `docs/catalog/trait_reference.md`) per collegare nuove schede e icone dopo approvazione Step 9.

## Self-critique (Step 8)

- **Coerenza naming schema:** slug lowercase con underscore e cartelle dedicate per bioma/specie/effects; verificare che `correnti_elettroluminescenti` non confligga con altre cartelle effetti (possibile refactor in `correnti_elettroluminescenti`).
- **Rischi duplicati asset:** asset specie potrebbero sovrapporsi a convenzioni precedenti; controllare `assets/species/` per nomi simili prima della creazione reale.
- **Dipendenze per Step 9 (Archivist):** validare con `catalog_data.json` l’inserimento di nuove schede, aggiornare indici/manifest e linkare ai draft di lore/biome/trait/species/balance; valutare allineamento con linee guida grafiche globali in `docs/templates`.
