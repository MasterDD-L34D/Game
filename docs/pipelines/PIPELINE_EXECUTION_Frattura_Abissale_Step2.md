# Esecuzione Step 2 (Strict-Mode) – Frattura Abissale Sinaptica

## Titolo step
Bozza lore e identità bioma – Agente previsto: lore-designer

## Piano sintetico
1. Assorbire vincoli e perimetro da Step 1 e dal template PIPELINE_SPECIE_BIOMA.
2. Rileggere `docs/biomes.md`, `docs/biomes/manifest.md` e `docs/hooks` per allineare tono e hook narrativi.
3. Definire i tre livelli ambientali (cresta fotofase, soglia crepuscolare, frattura nera) con mood, minacce e relazioni con le correnti elettroluminescenti.
4. Elaborare ganci narrativi specifici per le 4 specie (Polpo Araldo Sinaptico, Sciame di Larve Neurali, Leviatano Risonante, Simbionte Corallino Riflesso) collegandoli ai livelli.
5. Mappare come gli elementi narrativi influenzeranno i campi tecnici futuri (biome_tags, requisiti_ambientali, trait plan) senza scrivere i file.
6. Produrre note strutturate per i curatori successivi (biome-ecosystem-curator, trait-curator, species-curator).

## Esecuzione (strict-mode)
- **Contesto**: si opera solo in analisi, senza modificare file. Si assume come baseline il perimetro e la checklist di Step 1.
- **Strutturazione livelli**:
  - `cresta fotofase`: luce residua filtrata, coralli nervo-luminescenti, correnti leggere che amplificano percezione sensoriale; atmosfera di vigilia.
  - `soglia crepuscolare`: penombra pulsante, correnti intermittenti che trasmettono impulsi elettrici, fauna nervosa che reagisce agli stimoli; instabilità moderata.
  - `frattura nera`: buio completo, fratture basaltiche con scariche caotiche, vortici che riscrivono temporaneamente i trait ambientali; pericolo massimo.
- **Hook narrativi per correnti elettroluminescenti**: eventi ciclici che “risuonano” con strutture neurali organiche e artigianali; possono sovraccaricare o spegnere i sensi; suggeriscono tag come `elettroluminescente`, `sinaptico`, `torsione_profonda` da valutare per biome_tags.
- **Specie collegate**:
  - *Polpo Araldo Sinaptico*: emissario che legge e modula le correnti; buff ai sensi in cresta fotofase, debuff sensoriali agli avversari in soglia crepuscolare, rischi di burnout in frattura nera.
  - *Sciame di Larve Neurali*: micro-sciame che trasporta impulsi; può riscrivere temporaneamente percezioni/slot degli avversari quando le correnti picchiano; più aggressivo in soglia crepuscolare.
  - *Leviatano Risonante*: colosso che cambia forma seguendo il picco delle correnti; forma di guardiano placido in cresta fotofase, predatore inquieto in soglia crepuscolare, avatar di scarica in frattura nera.
  - *Simbionte Corallino Riflesso*: ibrido corallo-carapace che copia pattern sensoriali; in cresta fotofase rispecchia potenziamenti alleati, in frattura nera rischia di imitare distorsioni nocive.
- **Impatti attesi (per step successivi)**:
  - Fornire al biome-ecosystem-curator mood e rischi per impostare `requisiti_ambientali`, bande di terraformazione e alias coerenti.
  - Informare il trait-curator su quali correnti richiedono trait temporanei legati a percezione/sovraccarico, con varianti per i tre livelli nei pool.
  - Guidare lo species-curator nel definire biome_affinity e trait_plan che reagiscano ai livelli (es. buff sensoriali, copie parziali, trasformazioni di forma).

## Output atteso (analitico, non scritto)
- Nota di lore strutturata per livello con hook per correnti elettroluminescenti.
- Ganci di design per ciascuna delle 4 specie collegati ai livelli.
- Elenco di tag/temi da valutare per `biome_tags` e trait temporanei.
- Punti di sincronizzazione per i curatori successivi.

## File da leggere / (non) scrivere
- **Da leggere**: `docs/biomes.md`, `docs/biomes/manifest.md`, `docs/hooks`, `docs/pipelines/PIPELINE_SPECIE_BIOMA_Frattura_Abissale_Sinaptica.md`, `docs/pipelines/PIPELINE_EXECUTION_Frattura_Abissale_Step1.md`.
- **Da scrivere**: nessuno (sandbox/strict-mode).

## Self-critique
- Mancano esempi concreti di slug o stringhe per biome_tags: andranno proposti con il trait-curator per evitare collisioni nel glossary.
- I livelli sono descritti narrativamente ma non ancora mappati su parametri numerici (intensità correnti, durata effetti) che serviranno al balancer.
- Alcuni hook di specie (es. copia distorta del Simbionte) richiedono verifica con `docs/10-SISTEMA_TATTICO.md`/`docs/11-REGOLE_D20_TV.md` per evitare stacking non regolamentato.
