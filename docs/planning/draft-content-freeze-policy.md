# Content Freeze Policy — DRAFT

> Raccomandazione operativa. Da discutere con Master DD.

## Scopo

Ribilanciare il rapporto engine/content nel progetto. L'engine è a maturità alta (8.5/10), il contenuto giocabile è a maturità bassa (3/10). Senza intervento, il rischio è un engine perfetto senza gioco.

## Diagnosi

| Area                   | Maturità | LOC/file             | Test                   |
| ---------------------- | -------- | -------------------- | ---------------------- |
| Session engine         | 8.5      | 1759 LOC (4 moduli)  | 253 Node               |
| Rules engine Python    | 9        | ~800 LOC             | 217 pytest             |
| AI policy              | 8        | ~400 LOC             | 45 test                |
| Encounter giocabili    | 2        | 3 prototipi (draft)  | 0                      |
| Bilanciamento numerico | 4        | trait_mechanics.yaml | Solo schema validation |
| Asset visivi           | 0        | 0                    | —                      |
| Asset audio            | 0        | 0                    | —                      |

## Proposta: 3 sprint content-only

### Sprint C1: Foundation (contenuto base)

- [ ] Finalizzare 3 encounter prototipo → schema AJV validato
- [ ] Creare bridge: encounter YAML → rules engine → session engine (end-to-end)
- [ ] Bilanciare numeri reali per 5 species × 3 biomi (savana, caverna, frattura)
- [ ] Placeholder pixel art: 5 creature (idle + attack, 32×32)

### Sprint C2: Playable loop

- [ ] 10 encounter totali (tutorial chain 1-3, exploration 4-7, confronto 8-10)
- [ ] Briefing narrativi per tutti i 10 encounter
- [ ] Tileset pixel art per 3 biomi
- [ ] SFX placeholder (10 suoni base: attacco, hit, miss, critico, morte, UI×5)
- [ ] Primo playtest interno: loop completo draft→match→results→evolution

### Sprint C3: Polish & Balance

- [ ] Bilanciamento basato su dati playtest
- [ ] Data-level test scenarios (pattern wesnoth: YAML fixtures → rules engine)
- [ ] Musica placeholder (3 tracce: menu, planning, combat)
- [ ] Screen flow navigabile (wireframe clickabile o prototipo Figma)

## Cosa NON fare durante content freeze

- ❌ Nuove feature nel session engine
- ❌ Refactor del round orchestrator
- ❌ Nuovi endpoint API
- ❌ Nuovi schemi in packages/contracts/ (tranne encounter schema)
- ❌ Infrastruttura CI/tooling (tranne se blocca content pipeline)

## Cosa SÌ fare

- ✅ Bug fix su engine esistente
- ✅ Encounter YAML + briefing
- ✅ Asset placeholder (pixel art, SFX)
- ✅ Bilanciamento numeri in trait_mechanics.yaml
- ✅ Test di integrazione encounter→engine
- ✅ Documentazione (draft → core promotion)

## Metriche di uscita dal freeze

Content freeze finisce quando:

1. ≥10 encounter giocabili end-to-end
2. ≥5 creature con sprite placeholder
3. ≥1 playtest interno completato (feedback documentato)
4. Screen flow wireframe approvato
5. Bilanciamento numerico validato su ≥20 sessioni simulate

## Riferimenti

- Scorecard Evo-Tactics (sessione 2026-04-16)
- Wesnoth pattern: content > engine polish per longevità
- `docs/planning/encounters/` — 3 encounter prototipo
- `docs/planning/draft-art-direction.md` — pixel art confermato
