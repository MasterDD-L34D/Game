# Legacy Triage Workflow

## Fase 0 - Verifica repo

- `git status`
- `git branch --show-current`
- leggere `README.md`, `AGENTS.md`, `CLAUDE.md` se presenti
- controllare docs rilevanti e ultimi PR/commit locali

## Fase 1 - Inventario legacy

Per ogni file legacy:

| Campo       | Descrizione                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| path        | percorso nel legacy pack                                                                   |
| categoria   | species, morph, jobs, rules, social, nest, ennea, director, surge, tags, traits, telemetry |
| id          | id logico estratto                                                                         |
| match Game  | equivalente in repo canonico                                                               |
| match Godot | equivalente nel client                                                                     |
| stato       | exact, semantic, partial, unmapped, obsolete, design_reference                             |
| rischio     | low, medium, high                                                                          |
| azione      | archive, compare, promote_candidate, reject                                                |

## Fase 2 - Classificazione

- `already_absorbed`: non reimportare.
- `semantic_match`: usare solo come confronto.
- `partial_match`: verificare se manca qualcosa di valore.
- `unmapped`: candidato backlog, non codice.
- `obsolete`: archiviare.
- `design_reference_only`: utile per lore/sistema, non runtime.

## Fase 3 - Promozione

Un candidato utile riceve una design card:

- problema che risolve;
- fantasia/identita';
- dipendenza da dataset;
- effetto runtime;
- test necessari;
- compatibilita' con sistemi moderni;
- rischio regressione.

## Fase 4 - Piano PR

Prima di codice:

- decidere repo target (`Game` o `Game-Godot-v2`);
- decidere se serve ADR/spec;
- indicare test;
- indicare rollback;
- ottenere gate umano.
