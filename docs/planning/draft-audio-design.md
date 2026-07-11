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

## Mappa eventi Path A -> classi suono (2026-07-10, implementabile)

Path A = flusso live Godot-v2: lobby -> character_creation -> form_pulse ->
world_seed -> scenario_brief -> combat -> debrief.

| Schermata Path A    | Eventi                                      | Classe suono                            |
| ------------------- | ------------------------------------------- | --------------------------------------- |
| lobby               | join, ready, countdown start                | UI stinger                              |
| character_creation  | select specie/job, confirm                  | UI (click morbido, tono positivo)       |
| form_pulse          | pulse, esito                                | evoluzione (cristallino, crescendo)     |
| world_seed          | reveal bioma                                | ambience bioma (attacco del loop)       |
| scenario_brief      | briefing in/out                             | drone briefing (10-15s, fade)           |
| combat (planning)   | selezione unita', intent dichiarato, commit | UI (soft lock-in, sigillo)              |
| combat (resolution) | attack/miss/crit, status, morte, telegraph  | SFX combat (tabella SFX Taxonomy sopra) |
| debrief             | vittoria/sconfitta, PE guadagnato           | fanfara / discendente / clink           |

## Criteri asset (input alla fase asset-hunt, spec studio-track Fase 2)

- **Licenze**: SOLO CC0 o CC-BY (con attribution file al primo import); esclusi
  CC-BY-SA e NC (EA premium).
- **Formati**: OGG per musica (streaming), WAV per SFX brevi; mono ok per SFX,
  stereo per musica; niente middleware in prima fase (player Godot nativo, la
  valutazione FMOD/Wwise resta nota storica sopra).
- **Tono**: biologico-alieno coerente con art direction (`41-ART-DIRECTION.md`):
  organico > metallico; UI "soft-organic", mai beep sintetici da menu anni-90.
- **Budget prima passata**: 40-60 SFX (~30 combat, ~15 UI, ~12 ambience/eventi
  bioma) + 6-8 tracce musicali (menu, draft, planning, risoluzione, turno critico,
  vittoria, sconfitta, evoluzione).

## Gap chiusi 2026-07-10 (in-session owner)

- Budget musicale: freesound/royalty-free per EA -- la decisione e' `00F` sez.3.1,
  questo doc la implementa.
- Prototipazione: si', placeholder liberi -> shortlist curata in `43-ASSET-SOURCING`.
- Indicatori visivi deaf/HoH: elenco eventi in `docs/core/45-ACCESSIBILITY.md`.
- Voci creature: canone vigente = NESSUNA voce, solo SFX ambientali e d'azione
  (`00F` sez.3.2, decisione chiusa); eventuale riapertura (sintetiche vs nessuna)
  = decisione owner alla slice F-A, non prima.

## Riferimenti

- `docs/planning/research/lore_concepts.md` — archetipi per leitmotif
- `docs/core/10-SISTEMA_TATTICO.md` — azioni che generano SFX
- `draft-art-direction.md` — coerenza mood visivo-audio
- `draft-screen-flow.md` — fasi che determinano musica
- Chris Taylor GDD Template — sezione Audio (unica fonte nella awesome list)
