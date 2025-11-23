# Simulazione Pipeline TRAIT – Famiglia LOCOMOTIVO

Questa simulazione esegue virtualmente la pipeline «PIPELINE_TRAIT_REFACTOR» per la famiglia LOCOMOTIVO, senza modificare i file sorgenti. Ogni step indica agente, deliverable e dipendenze.

1. **Audit e validazione dataset locomotivo**  
   - **Agente:** Trait Curator  
   - **Output simulato:** report di validazione per `data/traits/locomotivo/*.json`, indice `data/traits/index.json`, affinità `data/traits/species_affinity.json`, schema `config/schemas/trait.schema.json`, glossario `data/core/traits/glossary.json`. Include errori di schema, duplicati, mismatch glossario e note su sinergie mancanti.  
   - **Dipendenze:** nessuna; step iniziale.

2. **Proposta di normalizzazione e mapping slug**  
   - **Agente:** Trait Curator  
   - **Output simulato:** piano di rename/mapping per slug e campi `famiglia_tipologia`, check-list per aggiornare glossario e locali. Basato sul report dello step 1, linee guida `Trait Editor/docs/howto-author-trait.md` e `docs/trait_reference_manual.md`.  
   - **Dipendenze:** richiede report dello step 1.

3. **Consolidamento catalogo e draft di aggiornamento**  
   - **Agente:** Trait Curator  
   - **Output simulato:** bozza di catalogo aggiornato (es. `docs/catalog/traits_inventory.json` o memo `docs/planning/traits_migration_loc-<data>.md`) con elenco file da modificare, note su sinergie/slot e aggiornamento di indice/affinità.  
   - **Dipendenze:** necessita mapping dello step 2 e dataset originali.

4. **Allineamento specie collegate**  
   - **Agente:** Species Curator  
   - **Output simulato:** piano di aggiornamento per `data/traits/species_affinity.json` ed eventuali riferimenti in `data/core/species.yaml`, con tabella di mapping slug e note di onboarding in `docs/planning/species_loc-<data>.md`.  
   - **Dipendenze:** mapping slug dello step 2 e draft catalogo dello step 3.

5. **Revisione impatti su biomi e pool**  
   - **Agente:** Biome & Ecosystem Curator  
   - **Output simulato:** report su copertura biomi e proposte di update per `data/core/traits/biome_pools.json`, alias e requisiti ambientali; draft in `docs/planning/biome_pools_loc-<data>.md`.  
   - **Dipendenze:** mapping e campi `biome_tags` definiti negli step 2-3.

6. **Piano di migrazione end-to-end**  
   - **Agente:** Coordinator  
   - **Output simulato:** roadmap di migrazione con task per ogni agente, impatti su `data/core/traits/biome_pools.json`, `data/core/species.yaml`, `docs/trait_reference_manual.md`, milestone e dipendenze.  
   - **Dipendenze:** output consolidati degli step 3-5.

7. **Documentazione e archiviazione**  
   - **Agente:** Archivist  
   - **Output simulato:** aggiornamento di linee guida naming e inventario in `docs/trait_reference_manual.md` e `docs/catalog/traits_quicklook.csv`, archiviazione report in `reports/traits/locomotivo/`.  
   - **Dipendenze:** roadmap dello step 6 e materiali precedenti.

8. **Supporto tooling (opzionale)**  
   - **Agente:** Dev-Tooling  
   - **Output simulato:** script per validazione batch locomotivo, sostituzione slug e rigenerazione indici in `tools/traits/`, con guida `tools/traits/README_loc-<data>.md`.  
   - **Dipendenze:** requisiti raccolti negli step 1-6; eventuale coordinamento con Archivist.

## Output finali attesi
- Report di audit e mapping slug consolidato, con allegati patch diff testuali per i file locomotivo e gli indici (`index.json`/`index.csv`).
- Draft di catalogo/roadmap di migrazione con piani per specie e biomi.
- Documentazione aggiornata e, se necessario, tooling dedicato alla famiglia LOCOMOTIVO.

## Punti critici e raccomandazioni
- Validare attentamente rename di slug per evitare rotture su specie e biomi.
- Pianificare la migrazione con milestone chiare e test di regressione sui dataset collegati.
- Coordinare l’Archivist per mantenere la documentazione allineata con i cambi proposti.
- Eseguire eventuali script tooling in sandbox prima di applicarli ai dati reali.
