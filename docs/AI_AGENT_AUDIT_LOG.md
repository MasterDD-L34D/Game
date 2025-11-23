# AI_AGENT_AUDIT_LOG.md – Diario lavori sistema agenti

Questo file traccia le modifiche e le verifiche fatte sul sistema di agenti,
router, trait, specie e biomi del progetto Game / Evo Tactics.

---

## Fase 0 – Setup iniziale (infrastruttura agenti)

- [x] Verificata presenza di:
  - agent_constitution.md
  - agent.md
  - agents/ + .ai/
  - agents/agents_index.json
  - router.md
  - MASTER_PROMPT.md
  - docs/AGENT_COMMANDS_CHEATSHEET.md
  - docs/PIPELINE_TEMPLATES.md

Note:
- Base infrastrutturale OK.

---

## Fase 1 – Trait System & Trait Curator

- [ ] Analisi completa doc trait (README_TRAITS, trait-editor, trait_reference_manual, ecc.)
- [ ] Allineamento agents/trait-curator.md ai file reali
- [ ] Allineamento species-curator e biome-ecosystem-curator
- [ ] Disegno pipeline TRAIT specifica per Evo Tactics
- [ ] Esecuzione test pipeline TRAIT su un caso reale

---

## Fase 2 – Specie, biomi, ecosistemi

- [ ] Mappa delle sorgenti dati per specie / biomi
- [ ] Revisione profili lore-designer / species-curator / biome-ecosystem-curator
- [ ] Definizione Pipeline SPECIE_BIOMA adatta al repo
- [ ] Test pipeline SPECIE_BIOMA su una feature reale

---

## Fase 3 – Pipeline operative

- [ ] Test PIPELINE_DESIGNER su una feature reale
- [ ] Test PIPELINE_EXECUTOR / SIMULATOR
- [ ] Documentazione di una pipeline “golden path” (es. nuova specie + nuovi trait + nuovo bioma)

---

## Fase 4 – Dev Tooling & CI

- [ ] Analisi docs/ci-pipeline.md
- [ ] Proposte di script di validazione dati/trait
- [ ] Integrazione con dev-tooling

---

## Note generali

Annota qui decisioni, problemi e soluzioni man mano che lavoriamo.
