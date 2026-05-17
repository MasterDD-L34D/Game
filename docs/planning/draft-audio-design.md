# Audio Design — DRAFT

> Bozza GDD. Da promuovere in docs/core/ dopo review.

## Scopo

Definire la strategia audio di Evo-Tactics: pilastri sonori, musica per fase di gioco, tassonomia SFX, e audio adattivo. Il suono in Evo-Tactics deve rinforzare la leggibilità tattica e il senso di ecosistema vivo.

## Pilastri audio

### 1. Feedback tattico chiaro

Ogni azione di gioco ha un segnale audio distinto. Il giocatore deve poter _sentire_ cosa succede anche senza guardare lo schermo per un istante.

- Attacco: impatto proporzionale al danno (più forte = più danno).
- Critico (nat 20): suono speciale riconoscibile, breve e soddisfacente.
- Miss: suono neutro, non punitivo (swish, non buzz).
- Status applicato: tono specifico per tipo (fisico vs mentale).
- PT guadagnato: "clink" accumulativo (come monete, ma organico).

### 2. Ecosistema sonoro

Ogni bioma ha un soundscape unico che comunica luogo e tensione senza testo.

- Suoni ambientali continui (loop): vento, gorgoglii, ronzii, scricchiolii.
- Suoni di evento: StressWave annunciata da crescendo + rumble basso.
- Creature nemiche: richiami distintivi pre-spawn (avviso acustico).

### 3. Musica come stato emotivo

La musica non è decorazione — è informazione sullo stato della partita.

## Musica per fase

| Fase                         | Mood                        | Strumenti / Stile                       | Dinamica                                  |
| ---------------------------- | --------------------------- | --------------------------------------- | ----------------------------------------- |
| **Menu / Hub**               | Calma contemplativa         | Ambient pad, melodia minimale           | Statico, loop lungo                       |
| **Draft / Setup**            | Preparazione, anticipazione | Percussioni leggere, arpeggi            | Cresce man mano che si riempie la squadra |
| **Briefing**                 | Tensione narrativa          | Drone basso, melodia sospesa            | Breve (10-15s), fade in match             |
| **Planning**                 | Concentrazione              | Ambient ritmico lento, pochi elementi   | Sottofondo che non distrae                |
| **Risoluzione**              | Azione, intensità           | Percussioni + melodia attiva            | Scala con n. azioni per turno             |
| **Turno critico** (HP basse) | Urgenza                     | Tempo accelerato, bassi pesanti         | Trigger automatico da stato HP squadra    |
| **Vittoria**                 | Soddisfazione, relief       | Melodia risolutiva, armonia aperta      | Breve fanfara (5-8s)                      |
| **Sconfitta**                | Riflessione, non punizione  | Melodia discendente, fade to silence    | Breve (5s), non aggressiva                |
| **Evoluzione**               | Meraviglia, scoperta        | Suoni cristallini, riverbero, crescendo | Cresce quando si seleziona mutazione      |

## SFX Taxonomy

### Combattimento

| Evento         | Suono                                       | Varianti                             |
| -------------- | ------------------------------------------- | ------------------------------------ |
| Attacco melee  | Impatto fisico (slash, blunt, pierce)       | Per tipo danno                       |
| Attacco ranged | Proiettile + impatto                        | Per elemento                         |
| Parata         | Clang metallico/organico                    | Successo vs fallimento               |
| Schivata       | Swish rapido                                | —                                    |
| Danno critico  | Impatto rinforzato + accent                 | —                                    |
| Guardia attiva | Suono di barriera/scudo                     | —                                    |
| Status fisico  | Tono grave, organico                        | Per tipo (sangue, frattura, stun)    |
| Status mentale | Tono acuto, distorto                        | Per tipo (panico, furia, confusione) |
| Morte creatura | Suono specifico per specie + silenzio breve | —                                    |

### UI

| Evento               | Suono                             |
| -------------------- | --------------------------------- |
| Selezione unità      | Click morbido                     |
| Conferma azione      | Tono positivo breve               |
| Annulla              | Tono neutro discendente           |
| Intent dichiarato    | Soft lock-in                      |
| Commit round         | Suono di "sigillo" (tutti pronti) |
| Warning (budget, HP) | Beep urgente ma non fastidioso    |
| Notifica turno       | Chime breve                       |

### Ambiente (per bioma)

| Bioma             | Loop ambientale                       | Evento speciale          |
| ----------------- | ------------------------------------- | ------------------------ |
| Frattura Abissale | Gocciolii, eco, ronzio elettrico      | Scarica bioluminescente  |
| Zone Geotermiche  | Bolle, sisma basso, crepitio          | Eruzione magma           |
| Correnti Zefiri   | Vento, fischi, silenzio intermittente | Raffica che sposta unità |
| Foresta Radicale  | Fruscii, scricchiolii legno, insetti  | Radice che emerge        |

## Audio adattivo

### Trigger automatici

| Condizione                    | Risposta audio                                             |
| ----------------------------- | ---------------------------------------------------------- |
| HP squadra < 30%              | Musica passa a "turno critico"                             |
| Ultima unità viva             | Layer percussivo isolato, tensione massima                 |
| StressWave attivata           | Crescendo ambientale 3s prima, poi cambio soundscape bioma |
| Boss/Elite spawn              | Motivo musicale dedicato (leitmotif per archetipo)         |
| Vittoria imminente (1 nemico) | Musica alleggerisce, ritmo rallenta                        |

### Leitmotif per archetipo

Ogni archetipo da `lore_concepts.md` ha un frammento melodico riconoscibile:

- **Alveare Sinaptico**: ronzio armonico, pulsazioni sincronizzate
- **Custodi del Basalto**: percussioni profonde, ottoni bassi
- **Filatori d'Abisso**: glitch sonori, eco invertiti
- **Radici Erranti**: legni scricchiolanti, melodia terrestre
- **Corte degli Zefiri**: flauti eterici, armonici del vento

## Implementazione tecnica (note)

- Middleware: FMOD o Wwise per audio adattivo (valutare licensing).
- Formato: OGG per musica (streaming), WAV per SFX brevi.
- Spazializzazione: stereo per TV (no 3D audio in prima fase), opzionale surround.
- Budget: stimare N asset audio per milestone.

## Decisioni confermate (da doc esistenti + design session)

- **Volume default**: SFX > musica. Rationale: tattica > atmosfera. Il giocatore deve _sentire_ feedback azioni prima della musica. Mix suggerito: SFX 80%, musica 50%, ambiente 60% (default, regolabile). (Fonte: design session)
- **Accessibilità audio**: framework UDL (Universal Design for Learning) già documentato — "ingressi multipli, modalità di espressione varie (testo/audio/modello)." Indicatori visivi per eventi sonori critici da implementare. (Fonte: `ALIENA_documento_integrato.md`)

## Gap aperti residui

- [ ] Budget musicale: compositore dedicato o libreria royalty-free?
- [ ] Voci creature: vocalizzazioni sintetiche, registrate, o nessuna?
- [ ] Prototipazione: freesound.org per placeholder SFX iniziali?
- [ ] Indicatori visivi: quali suoni richiedono feedback visivo per deaf/HoH? (critico, status, wave spawn)

## Riferimenti

- `docs/planning/research/lore_concepts.md` — archetipi per leitmotif
- `docs/core/10-SISTEMA_TATTICO.md` — azioni che generano SFX
- `draft-art-direction.md` — coerenza mood visivo-audio
- `draft-screen-flow.md` — fasi che determinano musica
- Chris Taylor GDD Template — sezione Audio (unica fonte nella awesome list)
