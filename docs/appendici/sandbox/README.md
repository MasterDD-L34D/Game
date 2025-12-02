# Appendice Sandbox — Concept, Trait e Bilanciamento (draft)

## Scopo e stato

- Bozza per allineare concept narrativi sandbox con traiettorie di trait e note di bilanciamento.
- Fonte primaria dei concept: [Sandbox Lore: Concept Narrativi e Archetipi](../../design/sandbox/lore_concepts.md).
- Pensata per iterazioni rapide con curatori di specie/biomi e per raccogliere il feedback di bilanciamento prima della promozione fuori dalla sandbox.

## Concept narrativi attivi

- **Alveare Sinaptico** — sinergie di squadra ad impulsi neurali; vulnerabile a interferenze sonore. (Rif: sezione Archetipi in lore sandbox.)
- **Custodi del Basalto** — difesa posizionale e controllo termico tramite placche basaltiche.
- **Filatori d'Abisso** — trappole a visibilità variabile con filamenti di luce fredda.
- **Radici Erranti** — buff di memoria e assalti dal sottosuolo basati su pattern nemici.
- **Corte degli Zefiri** — mobilità verticale e colpi di disturbo via variazione pressoria.

## Hook di trait e glossario

- Mappare 2–3 trait esistenti per ciascun archetipo partendo dal [Trait Reference & Glossario](../../catalog/trait_reference.md) e dalle note di stile in [README_HOWTO_AUTHOR_TRAIT.md](../../README_HOWTO_AUTHOR_TRAIT.md).
- Validare nomenclature/slug rispetto al glossario canonico (`data/core/traits/glossary.json`) e alle linee guida in [STYLE_GUIDE_NAMING.md](../STYLE_GUIDE_NAMING.md).
- Per allineamento operativo e copertura, incrociare con il tracker [traits_tracking.md](../../logs/traits_tracking.md) e con la checklist iterativa [traits_checklist.md](../../process/traits_checklist.md).

## Bilanciamento preliminare

- Registrare i primi pass di tuning (CD, durata effetti, stacking) usando gli archetipi sopra come scenario di prova rapido.
- Condividere gap o conflitti nel glossario/trait reference e annotare dipendenze da biomi o specie per evitare regressioni nelle spawn list (`../../28-NPC_BIOMI_SPAWN.md`).
- Preparare un breve estratto per il changelog quando un archetipo completa il giro di feedback (design → trait → bilanciamento) e passa allo stadio "ready for release".

## Nota di rilascio preliminare

- Scope: consolidamento dei concept sandbox con indicazioni minime di trait/bilanciamento per le squadre di design e QA.
- Prossimi passi: collegare i trait candidati per ciascun archetipo, raccogliere telemetria pilota e promuovere la checklist di bilanciamento in appendice stabile.
