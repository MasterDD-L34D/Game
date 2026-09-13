# Dataset esterni Evo-Tactics

La cartella `data/external/evo/` è il punto di raccolta per specie, ecotipi e
trait importati dal pacchetto Evo-Tactics. I file verranno aggiunti batch per
batch secondo quanto descritto in `../../docs/incoming/lavoro_da_classificare/INTEGRATION_PLAN.md`.

## Convenzioni

- Ogni JSON deve rispettare gli schemi in `schemas/evo/` (batch `data-models`).
- I file specie vanno salvati in `data/external/evo/species/` con slug in
  kebab-case.
- I file trait vanno salvati in `data/external/evo/traits/` con ID `TR-####` e
  metadati completi.
- I report derivati (es. cataloghi) devono essere pubblicati in
  `docs/reports/evo/`.

Sono presenti file segnaposto `.gitkeep` per mantenere la struttura nel controllo
versione finché i dataset non saranno pronti.
