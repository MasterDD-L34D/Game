# Sandbox Lore: Concept Narrativi e Archetipi

## Scopo
Bozza di concept narrativi per Evo Tactics, mantenuta in sandbox per iterazioni rapide con i curatori di specie e biomi.

## Tono di gioco
- Meraviglia tattica: creature e ambienti strani ma leggibili a colpo d'occhio.
- Evoluzione dinamica: mutazioni come risposta creativa alle pressioni del bioma.
- Pragmatismo delle fazioni: ogni scelta narrativa deve avere un ritorno tattico.

## Archetipi chiave (bozze)
- **Alveare Sinaptico**: colonia bio-tecnologica che scambia impulsi neurali tramite polline luminescente. Offre sinergie di squadra, vulnerabile a interferenze sonore.
- **Custodi del Basalto**: guardiani geotermici che modellano placche basaltiche in armi e barriere; incarnano difesa posizionale e controllo del terreno caldo/freddo.
- **Filatori d'Abisso**: predatori abissali che tessono filamenti di luce fredda per guidare o confondere prede; focus su trappole e visibilità variabile.
- **Radici Erranti**: piante migranti che memorizzano pattern nemici nelle radici; combinano buff di memoria e assalti improvvisi dal sottosuolo.
- **Corte degli Zefiri**: entità d'aria che modulano pressioni e correnti; enfatizzano mobilità verticale e colpi di disturbo.

## Riferimenti interni e coerenza
- Allineare questi archetipi con biomi esistenti (es. bande di terraformazione in `biomes/terraforming_bands.yaml`).
- Rispettare nomenclature e trait nel glossario (`data/core/traits/glossary.json`) quando si derivano abilità testuali.
- Evitare di sovrascrivere slug/ID già presenti in `data/core/species.yaml` e `data/core/biomes.yaml`.

## Hook narrativi e spunti di missione
- Intercettare un nodo dell'Alveare Sinaptico per carpire tattiche avversarie senza scatenare l'intero sciame.
- Scalare una falesia vulcanica mentre i Custodi del Basalto riallocano il flusso di magma per bloccare le vie di fuga.
- Navigare nelle correnti degli Zefiri per depositare sonde che misurano la stabilità di un fronte di tempesta mutagena.

## Richiesta feedback
- **Curatore specie**: validare se gli archetipi hanno spazio tra le linee esistenti e se richiedono alias per evitare conflitti di naming.
- **Curatore bioma/ecosistemi**: segnalare biomi compatibili o pericolosi per ciascun archetipo (es. caldo estremo, bassa visibilità, gravità variabile) e proporre appoggi ambientali coerenti.
- Annotare eventuali sinergie/contrasti con spawn e cicli descritti in `docs/28-NPC_BIOMI_SPAWN.md`.

## Prossimi passi suggeriti
- Mappare ogni archetipo a 2-3 trait esistenti per verificare copertura e unicità narrativa.
- Preparare micro-schede di ecosistema in `docs/biomes/manifest.md` citando i nuovi archetipi come ospiti o minacce.
- Integrare feedback dei curatori prima di promuovere fuori dalla sandbox.
