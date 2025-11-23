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

## Fase 1 – Trait System & Curatori

- [x] Analisi completa trait system
- [x] Aggiornati doc di riferimento
- [x] Aggiornati agenti trait-curator / species-curator / biome-ecosystem-curator
- [x] Allineata pipeline TRAIT in PIPELINE_TEMPLATES
- [x] Promossa pipeline TRAIT standard ufficiale

---

## Fase 2 – Specie & Biomi (COMPLETA)

- [x] 2A – Scan specie/biomi completato
- [x] 2B – Refining agents (species-curator, biome-ecosystem-curator)
- [x] 2C – Pipeline SPECIE+BIOMI standard creata e promossa
- [x] 2D – Pipeline SPECIE+BIOMI eseguita (Steps 1–10)
- [x] Step 1 – Kickoff
- [x] Step 2 – Lore
- [x] Step 3 – Scheda tecnica bioma
- [x] Step 4 – Trait ambientali + temporanei
- [x] Step 5 – Specie + trait_plan
- [x] Step 6 – Bilanciamento
- [x] Step 7 – Validazione incrociata dataset
- [x] Step 8 – Asset & schede visual
- [x] Step 9 – Archivist finale
- [x] Step 10 – Piano esecutivo finale

**Stato:** La feature “Frattura Abissale Sinaptica” è pienamente definita in sandbox e pronta per il passaggio

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
