# Scala di senzienza T0–T5

Questa nota operativa definisce il significato del campo `sentience_index` usato nelle schede Specie/Tratti e fornisce linee guida per assegnarlo in modo coerente.

## Definizioni sintetiche

- **T0 · Reattivo**: risposte puramente istintive/riflessive; nessuna pianificazione, linguaggio o uso intenzionale di strumenti. Pattern motorio ripetitivo, nessuna memoria episodica rilevante.
- **T1 · Proto-intenzionale**: apprendimento associativo limitato, capacità di sfruttare l’ambiente in modo opportunistico (uso semplice di oggetti, tane, trappole rudimentali) ma senza rappresentazioni astratte o cultura trasmissibile.
- **T2 · Strategico**: comportamento tattico di base (coordinamento in gruppo semplice, inganni elementari), riconoscimento di individui e memoria spaziale estesa. Nessuna simbologia stabile o trasmissione culturale complessa.
- **T3 · Pre-simbolico**: capacità di problem solving multi-step, uso e fabbricazione di strumenti specifici, gerarchie sociali strutturate, segnali proto-linguistici contestuali. Cultura locale emergente ma non formalizzata.
- **T4 · Simbolico**: linguaggi o segnali convenzionali condivisi, trasmissione intergenerazionale di tecniche, rituali, mappe cognitive avanzate. Pianificazione a medio termine e cooperazione specializzata.
- **T5 · Metacognitivo**: linguaggio astratto complesso, tecnologia avanzata o modulare, teoria della mente sviluppata, capacità di negoziazione e pianificazione a lungo termine. Può modificare sistematicamente ecosistemi e modellare scenari futuri.

## Linee guida d’uso

- Assegna `sentience_index` **solo alle specie** (non ai tratti) e mantieni valori coerenti in tutti i file correlati (`species/*.json`, ecotipi, cataloghi aggregati).
- Prediligi il **livello minimo sufficiente**: se una specie mostra occasionali abilità del tier superiore ma non le sostiene in modo affidabile, usa il tier inferiore.
- Documenta nel campo `interactions` o `constraints` eventuali **abilità borderline** (es. T2 che impara un trucco T3 con addestramento) senza alzare il tier.
- Se un tratto implica un salto di senzienza (es. interfaccia neurale), verifica che **ecotipi e varianti** riflettano la stessa scelta oppure motivino deviazioni locali.
- Nelle esportazioni o report statistici, conserva i valori testuali `T0`…`T5` e usa fallback `Unknown` solo per dati incompleti; evita numeri interi o scale alternative.
