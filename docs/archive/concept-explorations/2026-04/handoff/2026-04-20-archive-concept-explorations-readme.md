# Concept explorations — aprile 2026

> **Status: non canonico.** Questa cartella contiene materiale di concept-exploration prodotto fuori repo tra il 15 e il 20 aprile 2026. **Non è design di riferimento.** Le fonti canoniche restano `docs/core/90-FINAL-DESIGN-FREEZE.md` (A3), `docs/core/00-SOURCE-OF-TRUTH.md` (sintesi), e tutti gli ADR in `docs/adr/`.

## Cosa c'è dentro

| File                                        | Tipo                  | Cosa esplora                                                                                                            |
| ------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Evo Tactics Pitch Deck v2.html`            | Deck 16 slide         | Riassunto onesto stato progetto al 20 aprile, con reality audit Pilastri e 3 exploration-note                           |
| `Vertical Slice - Minute 0 Onboarding.html` | Mock HTML interattivo | Briefing pre-match + primo turno guidato (tutorial_01 skin)                                                             |
| `Vertical Slice - Evoluzione Visible.html`  | Mock HTML interattivo | Come rendere visibile al giocatore la transizione Spore→Forma (HANDWAVE in doc canonici, vedi Agent 3 audit Q_HIGH Q22) |
| `Vertical Slice - Nido Ritual.html`         | Mock HTML interattivo | UX di un rituale Nido (Convergenza/Veglia/Consiglio) citato in `Mating-Reclutamento-Nido.md` ma senza impl              |
| `Vertical Slice - Debrief Emotivo.html`     | Mock HTML interattivo | Debrief post-match con beat emotivo — risponde al gap P0 #2 dell'audit 4-agent (narrative arc framework)                |
| `deck-assets/`                              | Screenshot PNG        | Cattura runtime usata nel deck v2 per dimostrare cosa è già giocabile                                                   |
| `deck-stage.js`                             | Componente            | Shell web-component usato dal deck                                                                                      |

## Perché sono in `archive/`

Tre motivi:

1. **Sono ipotesi visive, non spec**. Le vertical-slice HTML mockano comportamenti che oggi **non esistono runtime** (evoluzione visibile, rituali Nido, debrief emotivo). Metterle sotto `docs/planning/` le farebbe sembrare spec di lavoro. Non lo sono.
2. **Il deck v2 cita dati di playtest e stato Pilastri**. Quei dati sono veri al 20 aprile ma invecchiano. Il documento canonico da leggere per lo stato Pilastri è sempre `docs/planning/2026-04-20-pilastri-reality-audit.md`.
3. **Coerenza con `0.1 Roadmap & Execution Files`**. Il Freeze §0.1 elenca i documenti di planning con autorità A3. Questi mock non sono in quella lista e non devono esserlo.

## Le 3 exploration-note che **valgono un triage**

Il deck v2 chiude con tre osservazioni emerse durante la concept-exploration. Queste tre, e solo queste, vanno valutate contro il Pilastro 2 (Evoluzione emergente, 🟡 post deep audit):

### Nota 1 — BiomeMemory

**Osservazione**: se una creatura sopravvive a N encounter nello stesso bioma, il bioma "la ricorda" — piccoli bonus adattativi persistenti che non passano per PI/PE ma sono registrati lato Nido.

**Dove aggancia il canonico**: `data/core/biomes.yaml` ha già `biome affinity` per specie. Il Freeze §17 dice "bioma come moltiplicatore del gameplay". L'audit Agent 4 "Topic 3 — Biome Ecosystem" segnala che il runtime Node non consuma `terrain_defense`, e la memoria per-unità è zero. La nota propone un uso narrativo di quella memoria mancante.

**Rischio**: è una quarta economia implicita (oltre PE/PI/seed). Freeze §19.3 avvisa "la stessa valuta non deve fare troppe cose".

**Decisione da prendere**: issue di triage su P2, flag "parcheggia o integra in PI pack v2".

### Nota 2 — Costo ambientale del trait

**Osservazione**: ogni trait dovrebbe avere un **costo ambientale** (es. `thermal_armor` penalizza mobilità in clima caldo), non solo un costo PI.

**Dove aggancia il canonico**: `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` oggi ha solo costi numerici meccanici. Guida_Evo_Tactics_Pack_v2 e SoT §5 parlano di "adattamento ambientale" ma non lo traducono in penalty numeriche per-bioma.

**Rischio**: esplosione tuning. Ogni trait × ogni bioma = matrice gigante.

**Decisione da prendere**: issue di triage su P2/P3, flag "pilot su 4 trait e 3 biomi shipping, poi generalizza".

### Nota 3 — Onboarding narrativo

**Osservazione**: i primi 60 secondi non devono spiegare regole, devono far **scegliere qualcosa di identitario** (un tratto, un ricordo di specie, una pressione evolutiva).

**Dove aggancia il canonico**: Agent 1 audit consolidato classifica "Narrative arc framework" come P0 blocking. Freeze §6 loop dice "onboarding sotto i 10 minuti" ma non specifica **cosa succede nei primi 60 secondi**.

**Rischio**: zero runtime. Oggi il tutorial_01 apre direttamente in match.

**Decisione da prendere**: issue di triage su P0 narrativo, owner Master DD.

## Link al pack di planning 20 aprile

- `docs/planning/2026-04-20-integrated-design-map.md` — mappa integrata Freeze + SoT + audit + questa cartella
- `docs/planning/2026-04-20-pilastri-reality-audit.md` — stato reale 6 Pilastri
- `docs/planning/2026-04-20-design-audit-consolidated.md` — audit 4-agent, 75 domande
- `docs/playtests/` — 4 playtest documentati

## Autori

- Master DD (concept exploration direction)
- Claude (design artifacts production)
