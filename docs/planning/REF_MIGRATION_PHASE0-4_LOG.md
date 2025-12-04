# Log sandbox – pipeline migrazione (Fasi 0–4)

Scopo: tracciare deliverable, gate e rischi per le fasi 0–4 del piano di migrazione, usando gli agenti dedicati.

## Fase 0 – Avvio
- **Responsabile**: coordinator
- **Azioni**: raccogliere perimetro e rischi dal piano di migrazione; allineare stakeholder iniziali.
- **Deliverable**: elenco perimetro, matrice rischi preliminare, registro decisioni iniziali.
- **Gate**: approvazione perimetro e rischi condivisa con team; log archiviato in sandbox.
- **Note**: conservare log in `docs/planning/` (sandbox) per audit.

## Fase 1 – Design
- **Responsabili**: lore-designer, species-curator, trait-curator; archivist per versioni.
- **Azioni**: redigere concept, alias e draft di specie/trait; mantenere versionamento delle bozze.
- **Deliverable**: documenti concept e alias in bozza, registro versioni dell’archivist.
- **Gate**: revisione congiunta team design; approvazione per passaggio alla modellazione.
- **Note**: assicurare coerenza con perimetro definito in Fase 0.

## Fase 2 – Modellazione
- **Responsabili**: trait-curator, species-curator; dev-tooling per validator; archivist per diff.
- **Azioni**: preparare mapping dati; eseguire validator schema in dry-run; produrre diff report.
- **Deliverable**: mapping dati (trait/specie), esiti validator dry-run, diff report archivist.
- **Gate**: validazione che i mapping siano compatibili con schema; approvazione archivist dei diff.
- **Note**: mantenere tracciabilità tra mapping e concept di Fase 1.

## Fase 3 – Bilanciamento
- **Responsabili**: balancer; dev-tooling per simulazioni; trait-curator/species-curator per note.
- **Azioni**: definire curve di bilanciamento; eseguire simulazioni previste (report-only); aggiornare note tecniche.
- **Deliverable**: curve di bilanciamento documentate, report simulazioni, note aggiornate.
- **Gate**: revisione dei report simulazione e curva da parte del team; consenso per validazione.
- **Note**: evitare modifiche dirette ai dati di produzione finché non superato il gate.

## Fase 4 – Validazione
- **Responsabili**: dev-tooling per aggregazione esiti; archivist per changelog/rischi.
- **Azioni**: aggregare risultati validator e simulator; compilare changelog e rischi aggiornati; preparare submit gate.
- **Deliverable**: pacchetto di validazione (validator+simulator), changelog, registro rischi finale.
- **Gate**: submit gate per passaggio alle fasi 5–7 con approvazione stakeholders.
- **Note**: includere lesson learned e deviazioni rispetto al piano iniziale.
