# Target Audience — DRAFT

> Bozza GDD. Da promuovere in docs/core/ dopo review.

## Scopo

Definire chi gioca Evo-Tactics, perché ci gioca, e quali aspettative porta al tavolo. Serve a orientare ogni decisione di UX, difficoltà, onboarding e comunicazione.

## Pubblico primario

**Giocatori tattici co-op (25–40 anni)**

- Veterani di FFT, XCOM, Into the Breach, Fire Emblem, Divinity: Original Sin.
- Cercano profondità tattica leggibile: vogliono capire _perché_ hanno perso, non solo _che_ hanno perso.
- Giocano in sessioni di 30–90 minuti, spesso in coppia o piccolo gruppo (2–4).
- Piattaforma target: PC (Steam) → console (TV-first UI, couch co-op) → mobile companion (asincrono).
- Comfort con sistemi complessi ma intolleranza verso RNG puro senza agency.

## Pubblico secondario

**Creature builder / collezionisti (20–35 anni)**

- Fan di Spore, Pokémon, Monster Hunter, creature-collector con progressione.
- Attratti dall'evoluzione emergente: "come gioco modella ciò che la mia creatura diventa."
- Meno interessati alla tattica pura, più alla personalizzazione e scoperta.
- Touchpoint: albero evolutivo, mutazioni, estetica creature, sharing build online.

## Anti-pubblico (chi NON è il target)

- Speedrunner / min-maxer competitivi puri → il sistema VC scoraggia playstyle fissi.
- Giocatori casual mobile → complessità d20 troppo alta senza onboarding graduale.
- Fan di narrativa lineare → la storia emerge dal gameplay, non da cutscene.

## Player Personas

### Persona 1: "Il Tattico" (Marco, 32)

- Gioca XCOM e FFT da anni. Vuole posizionamento, facing, reazioni e combo.
- Sessione ideale: 45 min co-op con un amico, sul divano, in TV.
- Frustrazione: RNG che vanifica piani. Soddisfazione: vincere con una manovra a tenaglia preparata in 3 turni.

### Persona 2: "L'Evoluzionista" (Sara, 27)

- Fan di Spore e Pokémon. Vuole vedere creature crescere e specializzarsi.
- Sessione ideale: 20 min di crafting build + 40 min match per testare la build.
- Frustrazione: creature tutte uguali. Soddisfazione: sbloccare una mutazione rara che cambia il playstyle.

### Persona 3: "Il Direttore" (Luca, 38)

- Game master nato. Vuole giocare come Sistema/Director contro amici.
- Sessione ideale: raid PvE 4v1 con asymmetric AI.
- Frustrazione: AI stupida e prevedibile. Soddisfazione: orchestrare un'ondata che quasi uccide il team.

## Piattaforme e contesto d'uso

| Piattaforma  | Priorità         | Contesto                         | Input            |
| ------------ | ---------------- | -------------------------------- | ---------------- |
| PC (Steam)   | P0 — lancio      | Desk, monitor, sessioni lunghe   | Mouse + tastiera |
| Console (TV) | P1 — post-lancio | Divano, couch co-op, TV-first UI | Controller       |
| Mobile       | P2 — companion   | Pendolari, gestione asincrona    | Touch            |

## Competitor e posizionamento

| Gioco              | Similitudine                   | Differenziazione Evo-Tactics                       |
| ------------------ | ------------------------------ | -------------------------------------------------- |
| FFT / Tactics Ogre | Tattica a turni, grid, job     | Evoluzione emergente + co-op vs Sistema            |
| XCOM               | Tattica, coperture, permadeath | d20 trasparente, no permadeath, creature non umane |
| Into the Breach    | Tattica puzzle, prevedibilità  | Più profondità builds, meno puzzle deterministico  |
| Spore              | Creature evolution             | Tattica profonda (Spore è shallow nel combat)      |
| Pokémon            | Creature collection            | Evoluzione basata su comportamento, non level-up   |

## Decisioni confermate (da doc esistenti)

- **Modello business**: F2P etico — monetizzazione cosmetica, no pay-to-win. Tutti i contenuti gameplay ottenibili giocando. (Fonte: GDD archiviato, `archive/historical-snapshots/.../GDD.md:73`)
- **Localizzazione**: italiano + inglese al lancio (default "it-en"). Pipeline bundle `label_<lingua>` già strutturata per trait/species. Altre lingue post-lancio. (Fonte: `docs/process/localization.md`)
- **Controlli**: PC = mouse + tastiera (P0), Console = controller (P1 post-lancio), Mobile = touch (P2 companion). (Fonte: piattaforma matrix sopra)
- **Accessibilità**: colorblind mode (pattern/shape oltre colore), high contrast mode, font scalabili S/M/L. (Fonte: `draft-art-direction.md`)

## Gap aperti residui

- [ ] Età minima / rating PEGI target?
- [ ] Text-to-speech: requisito esplicito o solo UDL framework?
- [ ] Difficoltà regolabile: slider o presets (easy/normal/hard)?

## Riferimenti

- `docs/core/01-VISIONE.md` — statement di visione
- `docs/core/02-PILASTRI.md` — 6 pilastri di design canonical (P1-P6, ADR-2026-04-27)
- `docs/core/03-LOOP.md` — game loop
- Postmortem AI War (Arcen Games) — pubblico co-op vs AI asimmetrica
