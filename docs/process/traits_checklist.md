# Checklist iterativa tratti

Queste checklist guidano ogni iterazione di aggiunta o revisione tratti,
seguendo step incrementali che coprono revisione design, QA e telemetria.

## 1. Preparazione design
- [ ] Validare la proposta con il glossario (`data/traits/glossary.json`) e
      aprire una nota di revisione nel documento di riferimento del pack.
- [ ] Aggiornare `env_traits.json` / `trait_reference.json` con tier, slot e
      requisiti ambientali, includendo eventuali note di bilanciamento.
- [ ] Aggiornare `docs/catalog/species_trait_matrix.json` con le nuove
      associazioni Forma↔bioma e indicare l'owner del tratto nelle note.

## 2. Revisione e QA automatizzato
- [ ] Eseguire `python tools/traits.py validate --matrix docs/catalog/species_trait_matrix.json`
      e archiviare l'output nei log QA.
- [ ] Rigenerare baseline e coverage (`build_trait_baseline.py`,
      `report_trait_coverage.py`) per aggiornare `data/analysis/*.yaml|csv`.
- [ ] Lanciare `python tools/py/validate_registry_naming.py` per verificare
      coerenza slug e traduzioni condivise.
- [ ] Eseguire `scripts/cli_smoke.sh` filtrando il profilo rilevante
      (`CLI_PROFILES="playtest telemetry"`) e annotare eventuali regressioni.

## 3. QA manuale & Playtest
- [ ] Aggiornare il generator (`docs/evo-tactics-pack/generator.js`) o la build
      companion per verificare l'esperienza utente con label e suggerimenti
      aggiornati.
- [ ] Registrare nel log playtest gli scenari coperti, indicando specie/biomi
      e target di pick-rate comparati con il report audit (`docs/reports/trait-env-alignment.md`).
- [ ] Se emergono gap >5% nei pick-rate o mismatch con la matrice specie,
      aprire task di bilanciamento e ripetere la sezione 2.

## 4. Telemetria & chiusura iterazione
- [ ] Integrare i dati raccolti in `data/telemetry.yaml` (nuove metriche o
      aggiornamento di quelle esistenti) e allegare i diff al report di
      playtest.
- [ ] Rieseguire `python tools/py/report_trait_coverage.py` per confermare che
      la matrice CSV rifletta le ultime scelte di design.
- [ ] Aggiornare il changelog o la roadmap con le decisioni prese, citando il
      tratto e il gate di qualità superato.
- [ ] Preparare la nota di rilascio o l'aggiornamento del canvas con i link a
      report, matrici e telemetria.
