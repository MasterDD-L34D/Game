# Narrative & Lore — DRAFT

> Bozza GDD. Da promuovere in docs/core/ dopo review.
> NON duplica `docs/planning/research/lore_concepts.md` — lo inquadra in struttura narrativa coerente.

## Scopo

Definire il framing narrativo top-level di Evo-Tactics: backstory del mondo, tono, arco della campagna, e come la narrazione si integra nel gameplay senza cutscene tradizionali.

## Premessa narrativa

> Il mondo non ha nome. Le creature che lo abitano non sanno di essere osservate.
> Tu sei il Sistema — o forse, sei chi resiste al Sistema.

### Backstory (bozza)

Un ecosistema primordiale in equilibrio instabile. Creature modulari evolvono in risposta a pressioni ambientali: biomi che cambiano, predatori che si adattano, risorse che migrano. Non c'è "bene" o "male" — c'è pressione selettiva e risposta adattiva.

Il **Sistema** (Director AI) è la forza ecologica che mantiene l'ecosistema in tensione: introduce predatori, altera terreni, scatena StressWave. Non è malvagio — è il test evolutivo che forgia le creature.

I **giocatori** guidano una squadra di creature attraverso questo ecosistema, cercando di sopravvivere, adattarsi e prosperare. La cooperazione tra giocatori è la risposta emergente alla pressione del Sistema.

### Tono

| Asse                     | Posizione Evo-Tactics                                        |
| ------------------------ | ------------------------------------------------------------ |
| Serio ↔ Umoristico      | 70% serio, 30% meraviglia (non umorismo)                     |
| Realistico ↔ Fantastico | Fantastico bio-plausibile (evoluzione accelerata, non magia) |
| Epico ↔ Intimo          | Intimo — piccole squadre, non eserciti                       |
| Esplicito ↔ Suggerito   | Suggerito — lore emerge da gameplay, non da esposizione      |

Riferimento tono: `lore_concepts.md` → "Meraviglia tattica: creature e ambienti strani ma leggibili a colpo d'occhio."

## Struttura narrativa

La narrazione in Evo-Tactics NON è lineare. Segue il modello **Hades**: narrazione emergente che si costruisce partita dopo partita.

### Livello 1: Briefing / Debrief (per encounter)

- **Briefing**: 2-3 frasi che contestualizzano l'encounter. "Le radici si stanno ritirando. Qualcosa le spinge via dal nucleo geotermico."
- **Debrief**: risultato + implicazione. "Il nucleo è esposto. Il Sistema invierà Custodi del Basalto la prossima sessione."
- Formato: testo sovrapposto alla mappa pre/post match. No cutscene, no dialogo.

### Livello 2: Arco ecologico (per bioma)

- Ogni bioma ha un arco in 3-5 encounter: scoperta → conflitto → risoluzione/trasformazione.
- Es. Frattura Abissale: "Discesa → Scoperta dei Filatori → Confronto col nido → Frattura si espande o si stabilizza."
- L'arco si adatta alle scelte del giocatore (quali creature porta, come combatte → VC influenza esito).

### Livello 3: Meta-narrativa (campagna)

- Progressione tra biomi rivela pattern: il Sistema non è casuale, ha una logica.
- Climax: i giocatori capiscono che il Sistema li sta _addestrando_, non solo testando.
- Epilogo multiplo basato su VC aggregato della campagna (non scelte binarie).

## Archetipi e fazioni

Già definiti in `lore_concepts.md`:

- **Alveare Sinaptico** — sinergie di squadra, vulnerabile a interferenze sonore
- **Custodi del Basalto** — difesa posizionale, controllo terreno
- **Filatori d'Abisso** — trappole, visibilità variabile
- **Radici Erranti** — buff memoria, assalti dal sottosuolo
- **Corte degli Zefiri** — mobilità verticale, disturbo

Ogni archetipo funziona sia come alleato reclutabile che come nemico del Sistema. Il tono narrativo cambia in base alla relazione: reclutamento = curiosità reciproca; nemico = pressione ecologica.

## Integrazione gameplay → narrativa

| Evento gameplay              | Risonanza narrativa                       |
| ---------------------------- | ----------------------------------------- |
| Creatura evolve nuovo tratto | "Ha imparato a sopravvivere qui."         |
| Creatura muore               | "L'ecosistema non perdona l'inadatto."    |
| Reclutamento ex-nemico       | "La pressione crea alleanze improbabili." |
| StressWave cambia bioma      | "Il Sistema alza la posta."               |
| VC rileva pattern aggressivo | Briefing successivo riflette playstyle    |

## Decisioni confermate (da doc esistenti + design session)

- **Procedurale vs scritta**: ibrido modello Hades. Briefing/debrief scritti a mano (2-3 frasi per encounter). Arco ecologico per bioma (3-5 encounter, hand-crafted). Epilogo campagna procedurale basato su VC aggregato. (Fonte: design session 2026-04-16)
- **Voice-over**: solo testo. No VO nel piano. Delivery: overlay su mappa pre/post match. (Fonte: design approach, coerente con budget indie)
- **Personaggi**: creature anonime archetipali. 5 fazioni definite (Alveare Sinaptico, Custodi del Basalto, Filatori d'Abisso, Radici Erranti, Corte degli Zefiri). No NPC guida named. (Fonte: `lore_concepts.md`)
- **Lingua**: briefing localizzabili via pipeline `label_<lingua>`. Default it-en. (Fonte: `docs/process/localization.md`)
- **Tool authoring**: **Ink raccomandato** (inkjs runtime per browser). Yarn Spinner come alternativa. YAML sconsigliato per narrative branching complessa. (Fonte: `docs/guide/external-references.md`)

## Gap aperti residui

- [ ] Quanti briefing scripted servono per MVP? (stima: 10 encounter × 2 = 20 testi)
- [ ] Ink integration: quando nel roadmap? Pre o post content freeze?
- [ ] Tono verificato: playtest dei 3 briefing prototipo per validare mood

## Riferimenti

- `docs/planning/research/lore_concepts.md` — archetipi, tono, hook missioni
- `docs/biomes/Frattura_Abissale_Sinaptica_lore.md` — esempio lore bioma
- `docs/core/24-TELEMETRIA_VC.md` — VC come driver narrativo
- Postmortem Hades (GDC) — narrative integration in systems-heavy games
- Ink/Inky (inkle) — tool authoring narrativo candidato
