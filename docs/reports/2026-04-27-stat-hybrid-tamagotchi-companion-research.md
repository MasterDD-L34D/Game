---
title: "M2 Stat Hybrid + S1 Tamagotchi Companion — Industry Research"
workstream: cross-cutting
category: research
doc_status: draft
doc_owner: claude-code
last_verified: '2026-04-27'
tags: [stat-hybrid, companion, tamagotchi, skiv, species, perk, portable, research]
---

# M2 Stat Hybrid + S1 Tamagotchi-like Exportable Companion — Industry Research

**Data**: 2026-04-27 | **Mandato**: validation M2 opzione C ibrida + innovazione S1 Skiv companion portabile

---

## TL;DR — 5 bullet

1. **M2 CONFERMATO: ibrido base-specie + modifier-perk e il pattern dominante.** Pokemon (IVs+EVs+Nature su base-stat specie), Monster Hunter Stories (gene grid su stat base Monstie), CK3 (congenital+lifestyle), Wildermyth (stat base classe + transformation acquired) convergono tutti su: identita specie immutabile + layer acquisito modificabile. Nessun gioco di successo usa solo fisso (opzione a) o solo run-derivable (opzione b) — il solo-fisso produce clone-senza-anima, il solo-run-derivable produce identita-di-specie-zero.

2. **Variabilita + unicita senza rompere identita: il segreto e il cap sul layer acquisito.** Pokemon: base stat fissa, EV cap 252 per stat / 510 totale. MHS3: 9 slot gene grid fissi, breeding swap ma layout cap. CK3: trait genetico (immutabile) + trait lifestyle (max 5, sostituibile). Il cap garantisce che due Skiv della stessa specie siano riconoscibili come "dune_stalker" MA tatticamente diversi. Effort wire M2: <2h (i perk gia esistono come modifier in `progressionEngine.js`).

3. **S1 verdict: non Tamagotchi 1996 — pattern target e "async creature-ambassador".** Spore Sporepedia (export recipe compatta → share community), Pokemon HOME (identity persistente cross-game, "Visit" status), CK3 DNA string (lineage trasmissibile), Wildermyth legacy character (passa a capitolo successivo con scars+stats). Innovazione richiesta = non care simulation puro ma **racconto di vita portabile**: il player porta con se la storia di Skiv (saga JSON), non solo la stat card.

4. **MVP minimo S1 feasible in 3-5h**: export `skiv_saga.json` come file scaricabile + QR-code link + shareable URL `GET /api/skiv/card?format=share`. Companion "vive" fuori campagna come read-only card — cresce solo in campagna. Innovazione differenziante: diary entries portabili + MBTI form visibile + lineage_id come "stemma di famiglia".

5. **Due domande aperte per master-dd**: (A) il Skiv esportato e per-player (ogni membro della squadra ha il suo snapshot Skiv della run condivisa) o e lo stesso oggetto condiviso tra tutti? (B) la persistenza fuori campagna e local-file (JSON export), cloud (account Game), o entrambi? La risposta determina ~15h di effort in piu (cloud) o ~3h (local export).

---

## 1. M2 Stat Hybrid — Pattern Industry

### 1.1 Pokemon IVs + EVs + Nature (Game Freak, 1996-2026)

**Schema**: `final_stat = floor((base_stat + IV) * level/100 * nature_mult) + EV/4 + 5`

- **Surface**: player vede "Adamant" (Nature label) + stelle IV in scheda. Il numero esatto e nascosto (Gen 6+: sistema stelle 0-6).
- **Tre layer distinti**: base_stat (fisso per specie, non modificabile) + IV (0-31, fisso alla nascita, "patrimonio genetico") + EV (0-252 per stat, 510 totale, "training acquisito") + Nature (moltiplicatore 1.1/0.9, "temperamento").
- **Invarianza specie**: due Pikachu hanno SEMPRE gli stessi base stats. Ma un Pikachu "Adamant / 31 IV Atk / 252 EV Atk" e tatticamente diversissimo da uno "Timid / 0 IV Atk / 252 EV Speed". Stessa specie, build unica.
- **Variabilita reale**: 31 IV * 6 stat * 25 Nature * 510 EV combinazioni = spazio enorme di unicita preservando identita specie.
- **Postmortem player feedback**: il sistema ha creato metagame competitivo separato dal casual (Smogon, VGC). La complessita e il punto di forza per hardcore, ma opaca per casual → lesson: la surface deve essere leggibile anche senza capire l'engine. 25 anni di franchise vivo.
- **Fonti**: [Smogon EVs/IVs through the ages](https://www.smogon.com/smog/issue28/evs_ivs) · [Bulbapedia Individual Values](https://bulbapedia.bulbagarden.net/wiki/Individual_values) · [VGC guide base stats](https://www.vgcguide.com/base-stats)

**Applicabilita Evo-Tactics**: base_stat = valori fissi specie in `data/core/species.yaml` (gia esiste). Layer acquisito = perk modifier da `progressionEngine.js` (gia esiste). Manca solo la formula di composizione e l'esposizione in scheda.

---

### 1.2 Monster Hunter Stories 3 — Gene Grid (Capcom, 2025)

**Schema**: ogni Monstie ha stat base fisse per specie + gene grid 3x3 (9 slot acquisibili via breeding/channeling).

- **Layer base**: stats (HP/Atk/Def/Speed) fissi per specie e tier star. Mutated Monstie upgrapa il tier → stat base migliori MA il pattern identitario rimane (es. Rathalos resta Rathalos).
- **Layer gene**: 9 slot, ogni gene ha tipo (Power/Speed/Technical) + elemento + effetto. Bingo = 3 same-type allineati → bonus meccanico stackabile (Speed boon, Crit Rate, ecc.). Breeding e Rite of Channeling permettono gene swap.
- **Variabilita**: due Rathalos possono avere gene grid completamente diversi → build offensive vs build speed. Player sceglie consapevolmente.
- **Cap visivo**: 9 slot fissi = max 9 combinazioni. Designer cap deliberato — gestibile cognitivamente, non sovrascrive identita specie.
- **Feedback player**: gene bingo visibile come griglia illuminata. Player capisce "ho allineato 3 Speed → bonus Speed". Feedback immediato + comprensibile.
- **Fonti**: [GAMES.GG MHS3 Genetics Guide](https://games.gg/monster-hunter-stories-3-twisted-reflection/guides/monster-hunter-stories-3-monstie-genetics-breeding-guide/) · [Gamer Guides Gene Grid](https://www.gamerguides.com/monster-hunter-stories-3-twisted-reflection/guide/getting-started/gameplay/gene-grid-and-gene-bingos-explained) · [Kiranico gene db](https://mhst.kiranico.com/gene)

**Applicabilita**: mutation grid in creature-aspect-illuminator.md Pattern Library P0 gia mappato. Per M2: i perk da `data/core/progression/perks.yaml` (84 canonical) possono essere la "gene grid" di Skiv — visibile come slot nella UI.

---

### 1.3 Crusader Kings 3 — Congenital + Lifestyle Trait Hybrid (Paradox, 2020)

**Schema**: personaggio ha `traits[]` split in congenital (ereditati, immutabili salvo eventi rari) + lifestyle (acquisiti, massimo 5, sostituibili con stress breakdown).

- **Layer immutabile**: congenital traits (`Genius`, `Strong`, `Beautiful`) — arrivano da genitori, non si cambiano. Se entrambi i genitori hanno stesso congenital → 80% probabilita figlio lo eredita. Trait a 3 livelli (es. Attractive → Very Attractive → Lustrous) con 50% upgrade chance se entrambi i parent condividono lo stesso livello.
- **Layer acquisito**: lifestyle traits (dalla conclusione di perk tree o eventi). Max 5 trait totali (congenital + lifestyle). Se stress porta a breakdown, si puo perdere un lifestyle trait.
- **Identita personaggio**: due personaggi della stessa "specie" (es. dinastia) con stesso background genetico sono riconoscibili come imparentati MA diversi per lifestyle.
- **Postmortem**: [Paradox Dev Diary #58](https://forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-58-stre-ss-tching-the-traits.1472092/) discute stress come bridge tra engine intent e surface trait. Sistema "blunt archetypes" (Wroth, non irritable) produce leggibilita massima.
- **Fonti**: [CK3 Wiki Traits](https://ck3.paradoxwikis.com/Traits) · [Neoseeker Breeding Guide](https://www.neoseeker.com/crusader-kings-iii/Breeding_Guide) · [Thegamer Genetic Traits Guide](https://www.thegamer.com/crusader-kings-3-genetic-traits-guide/)

**Applicabilita**: congenital = trait fissi specie (da `species.yaml:trait_plan`). Lifestyle = perk acquisiti in campagna. Cap 5 total visibili = leggibilita TV-screen.

---

### 1.4 D&D 5e Floating Racial Bonus (Wizards of the Coast, 2014-2024)

**Schema**: specie da +2 a 1 stat + +1 a 1 stat (fisso per specie nella vecchia versione). Nuova versione 2020+: floating — player sceglie dove mettere i +2/+1 (non bloccati su stat predefinite specie).

- **Vecchio pattern**: Elf sempre +2 DEX → pigeonholed in classe. Riduce variabilita intra-specie.
- **Nuovo pattern (floating)**: il player sceglie. Elf con +2 STR = possible ma flavor-rompente per puristi. Soluzione: floating bonus ma con lista stat "consigliata" (non obbligatoria).
- **Lesson design**: rigidita specie→stat riduce variabilita ma aumenta identita. Floating aumenta variabilita ma diluisce identita specie. Il trade-off e consapevole.
- **Fonti**: [DNDBeyond Reimagining Racial Ability Scores](https://www.dndbeyond.com/posts/563-reimagining-racial-ability-scores) · [ScreenRant D&D New Stat Rules](https://screenrant.com/dungeons-dragons-new-stat-rules-playable-races-dnd/)

**Applicabilita Evo-Tactics**: pattern suggerito = base specie fisso (no floating) + perk modifier scelto dal player. Preserva identita dune_stalker (Agile innato) ma il perk scelta player amplifica o compensa.

---

### 1.5 Wildermyth — Stat Base Classe + Transformation Acquired (Worldwalker Games, 2021)

**Schema**: ogni hero ha stat base fisse per classe (Warrior: HP alto, Acc bassa / Mystic: HP basso, Acc alta) + trasformazioni acquisite da eventi che SOSTITUISCONO/AGGIUNGONO body parts con stat bonus.

- **Base immutabile**: classe assegnata a inizio campagna. Warrior resta Warrior in termini di base stat.
- **Layer acquisition via transformation events**: wolf arm (+atk, new ability), stone eye (+perception), flame wing (+mobility). Ogni transformation aggiunge stat bonus + visual layer cambio portrait.
- **Uniqueness**: due Warrior con diverse transformations sono tatticamente distinti. La visual change IS the stat signal — player vede la differenza prima di leggere il numero.
- **Legacy inheritance**: il personaggio "legato" (legacy) porta scars + transformation in campagna successiva. Identita persiste cross-campagna.
- **Fonti**: [Wildermyth wiki Theme](https://wildermyth.com/wiki/Theme) · [Wildermyth wiki Character Sheet](https://wildermyth.com/wiki/Character_Sheet) · [Category:Transformation](https://wildermyth.com/wiki/Category:Transformation) · [10 Turns Interview Wildermyth developer](https://turnbasedlovers.com/10-turns-interview/with-wildermyth-developer/)

**Applicabilita diretta Skiv**: lifecycle phase = transformation event. Ogni fase ha `aspect_it` + `tactical_correlate` (gia in `dune_stalker_lifecycle.yaml`). I perk M2 devono avere un `visual_correlate` per rispettare la Wildermyth lesson "player vede prima di leggere".

---

### 1.6 Sintesi M2 — Verdict e Raccomandazione

**Verdict: opzione C ibrida CONFERMATA come la piu efficace dalla letteratura.**

Tabella comparativa:

| Sistema | Base fisso (a) | Solo acquisito (b) | Ibrido (c) |
|---|---|---|---|
| Pokemon | IVs base fissi | EVs puri (b non esiste) | IVs+EVs+Nature ibrido |
| MHS3 | Stat base fissi | Gene grid puri (impraticabile) | Stat base + gene grid |
| CK3 | Congenital fissi | Solo lifestyle (identity loss) | Congenital + lifestyle |
| D&D 5e | Rigido vecchio | Floating nuovo | Floating con bias consigliato |
| Wildermyth | Classe fissa | Solo transformation (identity loss) | Classe + transformation |

**Perche (a) fallisce**: due dune_stalker identici in stat = nessuna ragione di investimento emotivo. Player non "alleva" — incontra.

**Perche (b) fallisce**: se tutto e run-derivable, la specie diventa cosmetica. Skiv perderebbe il suo "DNA" di dune_stalker. Player non sente identita cross-run.

**Perche (c) vince**: identita di specie (riconoscibilita, affetto) + unicita di istanza (investimento strategico, orgoglio build). La letteratura e unanime.

**Regola di oro (da Pokemon + CK3)**: il layer acquisito deve avere un CAP. Senza cap → power creep che rompe bilanciamento. In Evo-Tactics: 84 perks canonical, max 6 livelli, max 1 perk per livello → max 6 perk modifier per unita. Gestibile.

**Effort wire M2**: `progressionEngine.js` gia ha `effectiveStats()` (file `apps/backend/services/progression/progressionEngine.js`). Il wire e: `final_stat = species_base_stat + sum(active_perk_modifiers)`. Stima: <2h per formula + test + scheda UI.

---

## 2. S1 Tamagotchi-like Exportable Companion — Pattern Industry

### 2.1 Tamagotchi Uni + Paradise — Modern Digital Pet (Bandai Namco, 2023-2025)

**Persistenza**: dati su hardware fisico (egg device) + Wi-Fi sync opzionale a Tamaverse (cloud account).

**Portabilita**: Tamaverse online = creature visibile su browser quando device e connesso. Tamagotchi Uni (2023): portali Tamaverse, eventi globali, community interaction cross-device. Paradise (2025): 50,000+ possibili creature outcomes, 4 viste bioma (spazio → cellulare).

**Care simulation**: feed / play / sleep / clean. Ciclo diurno reale — la creatura muore se non curata.

**Innovation factor**: da device isolato (1996) a community cloud (2023). Tamaverse = social layer. Ma ancora fondamentalmente care simulation con visual cute.

**Gap vs Evo-Tactics**: care simulation puro non e l'obiettivo. Skiv non "muore di fame" — cresce tatticamente. L'innovazione deve essere sulla dimensione narrativa e strategica, non sul nurturing puro.

**Fonti**: [GDC 2023 Classic Postmortem Tamagotchi](https://www.gamedeveloper.com/marketing/-tamagotchi-the-virtual-pet-that-changed-the-world-gets-a-gdc-2023-classic-game-postmortem) · [Tamagotchi Revival EX NIHILO 2025](https://exnihilomagazine.com/tamagotchi-revival-sales-2025/) · [Tamagotchi Fandom modern franchise](https://tamagotchi.fandom.com/wiki/Tamagotchi_(modern_franchise))

---

### 2.2 Pokemon HOME — Cross-Game Identity Persistente (The Pokemon Company, 2020-2026)

**Persistenza**: cloud account Pokemon HOME. Il Pokemon "vive" nell'account player, non nel gioco. I giochi si connettono all'account per prendere/depositare.

**Portabilita**: cross-game nativa. Da Sword/Shield → Scarlet/Violet → Pokemon Champions (2026). In Champions: sistema "Visit" — il Pokemon mantiene tutti i suoi dati (Nature, IVs, EVs, nickname, Caught date, OT) traversando giochi con engine diversi.

**Care simulation**: nessuna. HOME e storage, non nurturing. Il Pokemon non "evolve" in HOME — evolve nei giochi. HOME e memoria persistente.

**Innovation factor (vs Tamagotchi)**: identita trasferibile come documento. Il Pokemon e lo stesso oggetto in giochi diversi. Non una copia — lo stesso. Nickname, storia di cattura, tutto preservato. Il player e l'"original trainer" permanente.

**Lesson per Skiv**: HOME = il `skiv_saga.json` come identita portabile. Non e una copia del Skiv — e il Skiv, esportabile e reimportabile. Il player porta la sua istanza Skiv da campagna a campagna, da device a device.

**Fonti**: [Pokemon HOME official](https://home.pokemon.com/) · [Pokemon Champions HOME Connect guide](https://www.pokemonchampions.wiki/home/Pokemon-Champions-connect-Pokemon-HOME) · [Insider Gaming transfer guide](https://insider-gaming.com/how-to-connect-pokemon-champions-to-pokemon-home/)

---

### 2.3 Spore Sporepedia — Creature Export + Community Identity (Maxis/EA, 2008)

**Persistenza**: creature salvata come file locale (PNG con dati embedded) + sync automatico su Sporepedia (server EA) via account.

**Portabilita**: chiunque in community puo usare il tuo creature nel proprio gioco. La "recipe" e compatta per design deliberato: `"we need to keep the 'recipe' for the creature very small so we can transmit it over the wire"` (Chris Hecker, Liner Notes).

**Care simulation**: nessuna. La creatura e un artefatto creativo, non un essere da nutrire.

**Innovation factor**: identita cross-player nativa. Il tuo creature appare nel mondo degli altri player come NPC. Il tuo nome appare come "creator" in rollover tooltip. Forma di immortalita creativa.

**Player attachment**: momento chiave identificato da Hecker: `"when players first attach limbs and your creature turns to look at its new limb and roars — players are delighted by something they just created."` L'attachment arriva dalla creazione partecipata, non dal nurturing.

**Lesson per Skiv**: il momento-attachment di Skiv non e "nutrirlo" ma e la prima volta che il player vede il suo Skiv con la propria mutation acquisita riflessa visivamente nell'aspect_it. Diary entry + visual change = momento-Spore.

**Fonti**: [Chris Hecker Liner Notes for Spore](https://chrishecker.com/My_Liner_Notes_for_Spore) · [Creature Creator SporeWiki](https://spore.fandom.com/wiki/Creature_Creator) · [remptongames Spore Creature Creator](https://remptongames.com/2022/08/07/how-the-spore-creature-creator-works/)

---

### 2.4 CK3 DNA String + Legacy Character (Paradox, 2020)

**Persistenza**: DNA string compatta nel save file (gene index → value, encoded). Trasmissibile via breeding in-game. "Legacy character" cross-campagna con traits + scars + storia.

**Portabilita**: il DNA string e leggibile e condivisibile. Community di CK3 ha tool per decodificare DNA e creare "beautiful/genius" characters da importare. Non ufficialmente supportato ma pattern de facto.

**Innovation factor**: il lignaggio e portabile. Il tuo dynasty founder con congenital `Genius Lvl 2` trasmette questa caratteristica attraverso generazioni. I discendenti hanno il tuo DNA, letteralmente.

**Lesson per Skiv**: `lineage_id` in `dune_stalker_lifecycle.yaml:legacy` e gia il seed di questo pattern. Skiv legacy = fondatore del lignaggio. Gli offspring in V3 Nido ereditano `lineage_id` chain. La "famiglia Skiv" e portabile e riconoscibile.

**Fonti**: [CK3 wiki Characters modding](https://ck3.paradoxwikis.com/index.php?title=Characters_modding) · [Paradox Dev Diary CK3 portraits/DNA](https://www.pcinvasion.com/crusader-kings-iiis-latest-dev-diary-explains-schemes-portraits-dna-council-members-and-your-court/)

---

### 2.5 Pikmin Bloom — Async Social Companion GPS (Niantic/Nintendo, 2021-2025)

**Persistenza**: cloud Niantic account. Pikmin seguono il player nelle walks GPS-tracked. Amicizia si accumula nel tempo.

**Portabilita**: cross-device (iOS/Android), cross-social (friend code QR). Decor Pikmin (friendship max) = forma di status symbol condivisibile.

**Care simulation leggero**: feed + walk + pluck. Non "muoiono" — si allontanano se non curati. Pressione minore di Tamagotchi.

**Innovation factor**: companion che cresce con il comportamento reale del player (passi fisici → progresso gioco). Postcards = forma di comunicazione asincrona cross-player mediata dai Pikmin. Party Walk = evento socializzante async.

**Lesson per Skiv**: Pikmin Bloom mostra che il companion portabile piu coinvolgente e quello che registra il comportamento reale del player (in Bloom: passi fisici; in Skiv: azioni tattiche in campagna). La "care" di Skiv e il giocare bene nelle run — non nutrirlo separatamente.

**Fonti**: [Niantic Pikmin Bloom new features](https://nianticlabs.com/news/pikminbloomnewfeatures?hl=en) · [Nintendo Pikmin Bloom social](https://www.nintendo.com/us/whatsnew/mobilenews-pikmin-bloom-introduces-new-ways-to-play-together/) · [Pikipedia Friendship](https://www.pikminwiki.com/Friendship)

---

### 2.6 Digimon V-Pet Color + Cross-Device (Bandai Namco, 2024-2025)

**Persistenza**: hardware device con battery save + USB-C per backup opzionale.

**Portabilita**: Color series cross-device battle connectivity. Monster Hunter collaboration (2025): Digimon Color X si connette con device precedenti per crossover battles. Non cloud-native ma proximity-based.

**Innovation 2024-2025**: schermo colore full + vibrazione + LED + pedometro (Vital Hero). Fitness integration: piu cammini → benefici Digimon. Cross-franchise collaboration (MH).

**Gap vs Skiv**: proximity-only (non async cross-internet), care simulation puro, no narrative layer.

**Fonti**: [Digivicemon 20th anniversary](https://digivicemon.com/digimon-celebrates-20th-anniversary-upgraded-original-digivice-virtual-pet/) · [Toy People Digimon x MH launch](https://www.toy-people.com/en/?p=93531-0928)

---

### 2.7 Animal Crossing Villagers — Emotional Persistence (Nintendo, 2020)

**Persistenza**: villager legato alla singola isola (save file). Se il villager "si trasferisce", scompare. Community ha creato mercato secondary (Nookazon) per trasferire villager tra save.

**Care**: talk every day → dialogo diverso. Gift → friendship level. High friendship → special dialogue subtypes.

**Innovation**: system rewards daily engagement, non session-length. `"Players who humanize villagers report 40% higher emotional attachment and are 60% less likely to let them move away."` (da community research).

**Lesson per Skiv**: il villager emotional attachment nasce dalla continuita narrativa (ogni giorno dice qualcosa di diverso, ricorda cio che hai fatto ieri). Il Skiv diary (`skiv_saga.json:diary[]`) e gia questo pattern — eventi storici che Skiv "ricorda". Portare questo diary visibile nel companion = emotional attachment.

**Fonti**: [Nookipedia Villager](https://nookipedia.com/wiki/Villager) · [Animal Crossing Wiki Personalities](https://animalcrossing.fandom.com/wiki/Category:Personalities)

---

## 3. Proposta Concreta — Skiv come Companion Portabile

### 3.1 Cosa e memorizzabile (in `skiv_saga.json`, gia esiste)

| Campo | Schema esistente | Note |
|---|---|---|
| lifecycle_phase | `aspect.lifecycle_phase` | mature / apex / legacy |
| MBTI Form | `aspect.mbti_form_label` | INTP-leaning-I |
| lineage_id | `_notes` (seed, non ancora campo) | Da aggiungere come campo esplicito |
| mutations acquisite | `mutations[]` | artigli_grip_to_glass + future |
| diary entries | `diary[]` | 8 eventi storici gia presenti |
| thought cabinet | `cabinet.internalized[]` | i_osservatore, n_intuizione_terrena |
| stat snapshot | `progression.level`, `picked_perks[]` | Lv 4, st_r1_marksman |
| MBTI axes values | `mbti_axes{}` | E_I:0.68, T_F:0.72, S_N:0.22, J_P:0.32 |

### 3.2 Cosa e portabile (formato export)

**Export MVP**: il `skiv_saga.json` esistente e gia l'export. Serve:
1. `GET /api/skiv/card?format=share` — endpoint che restituisce versione sanitizzata (senza `_notes` interni, senza session_id) con `lineage_id` esplicito.
2. `GET /api/skiv/card?format=qr` — QR code che punta a `/api/skiv/card?unit_id=skiv&format=html` (HTML card leggibile senza login).
3. Download diretto `skiv_saga.json` dal panel UI (button nel `skivPanel.js`).

**Formato portabile**: JSON con schema version pinned + checksum. Il JSON e auto-sufficiente — non richiede il gioco installato per essere letto.

### 3.3 Cosa fa Skiv fuori campagna

**Pattern raccomandato**: read-only companion card (non care simulation).

Skiv fuori campagna:
- **Non cresce** (nessun EXP, nessun perk)
- **Non muore** (nessun degrado)
- **Mostra la storia**: diary entries, MBTI form, mutations acquisite, lineage_id
- **E condivisibile**: URL permanente `skiv.card/{unit_id}` leggibile da chiunque
- **Reagisce async (futuro polish)**: se un altro player ha Skiv con stesso `lineage_id` → tooltip "Skiv della stessa famiglia di [PlayerName]"

Questo segue il pattern **Pokemon HOME** (storage + identity, non nurturing) combinato con **Spore Sporepedia** (recipe condivisibile, identita cross-community).

### 3.4 Innovazione differenziante vs Tamagotchi 1996

| Feature | Tamagotchi 1996 | Skiv Companion |
|---|---|---|
| Care model | Feed/play/sleep su schedule | Nessuno — cresce solo in campagna |
| Persistenza | Device locale | JSON export + URL share |
| Identita | Creature generica | Istanza unica con storia verifica |
| Cross-player | No | Lineage_id riconoscimento tra player |
| Narrative layer | Nessuno | Diary entries + thought cabinet |
| Morte | Si (se non curato) | No — Skiv e sempre il tuo Skiv |
| Personalita | Nessuna | MBTI Form + Ennea (futuro) |
| Tatticamente rilevante | No | Si — mutations impattano combat stats |

**Differenziazione core**: Skiv non e un pet da nutrire. E un **resoconto vivente di una campagna**. Il player non "cura" Skiv fuori dal gioco — porta la prova di cio che Skiv ha vissuto. Piu simile a un "diario di guerra esportabile" che a un Tamagotchi.

### 3.5 Async crossbreeding (polish ambizioso, V3+)

Pattern CK3 DNA + Wildermyth legacy: se due player hanno Skiv con `lineage_id` diversi, possono fare async pairing (via Nido, V3) → offspring eredita trait da entrambi i lignaggi. Il "social" di Skiv companion non e chat — e genetics.

Questo pattern e quello piu innovativo rispetto a qualsiasi companion esistente: **il tuo Skiv contribuisce biologicamente al Skiv di un altro player**. Non e un battle, non e un trade — e un contribution genetico asincrono. Richiede V3 Nido (OD-001 Path A verdict pending).

---

## 4. Schema Dati Persistence — Skiv Exportable

```
skiv_saga.json (esistente, file locale in data/derived/)
├── schema_version           → pinned per compatibilita cross-versione
├── generated_at             → timestamp export
├── unit_id                  → "skiv"
├── lineage_id               → [NEW CAMPO] "skiv-alpha-2026-0425" (run-unique)
├── species_id               → "dune_stalker"
├── biome_id                 → "savana"
├── mbti_axes{}              → gia presente
├── progression{}            → gia presente (level, perks)
├── cabinet{}                → gia presente (internalized thoughts)
├── mutations[]              → gia presente
├── aspect{}                 → gia presente (lifecycle_phase, MBTI correlates, visual)
└── diary[]                  → gia presente (8 eventi storici)

MISSING per export MVP:
├── lineage_id               → campo esplicito (ora solo in _notes)
├── export_checksum          → SHA256 dei campi principali (anti-tamper)
└── share_url                → "https://[base]/api/skiv/card?id={unit_id}"

Campaign-state (rimane server-side, NON exportato):
├── session_id               → non portabile
├── hp_current               → non portabile (stato momento)
├── sg_current               → non portabile
└── pressure_tier            → non portabile

Portable-state (in skiv_saga.json export):
├── tutto quanto sopra       → identita + storia + progression + mutations

Shared-state (futuro V3):
├── lineage_id_chain[]       → array di lineage_id dei parent (per crossbreeding async)
└── offspring_ids[]          → array di unit_id generati da questo Skiv
```

---

## 5. Effort Estimate

### M2 wire stat hybrid

| Task | File | Effort |
|---|---|---|
| Formula composizione `final_stat = base + perk_mods` | `apps/backend/services/progression/progressionEngine.js` | ~1h |
| Esposizione in scheda `/api/skiv/card` | `apps/backend/routes/skiv.js` | ~30min |
| Aggiungi `species_base_stats` a lookup in `species.yaml` | `data/core/species.yaml` | ~30min |
| Test unit + smoke | `tests/api/` | ~30min |
| **Totale M2** | | **~2.5h** |

### S1 MVP minimal (local export + shareable URL)

| Task | File | Effort |
|---|---|---|
| Aggiunta campo `lineage_id` a `skiv_saga.json` e schema | `data/derived/skiv_saga.json` + `tools/py/seed_skiv_saga.py` | ~30min |
| Endpoint `GET /api/skiv/card?format=share` | `apps/backend/routes/skiv.js` | ~1h |
| HTML card template per `?format=html` | `apps/backend/` | ~2h |
| Download button in `skivPanel.js` | `apps/play/src/skivPanel.js` | ~30min |
| QR code generation (libreria `qrcode` npm, zero-dep) | `apps/backend/routes/skiv.js` | ~1h |
| **Totale S1 MVP** | | **~5h** |

### S1 polish ambizioso (cross-player lineage recognition)

| Task | Effort |
|---|---|
| Lineage_id registry endpoint (lookup altri Skiv con stesso lignaggio) | ~4h |
| Async pairing request (V3 Nido, pending OD-001) | ~15-20h |
| Public Skiv gallery page | ~6h |
| **Totale S1 polish** | **~25-30h (richiede V3 Nido)** |

---

## 6. Domande per master-dd

**Q1 — Ownership modello companion**: ogni membro della squadra ha il suo snapshot Skiv dalla run condivisa (ognuno porta a casa la propria istanza) oppure c'e un unico Skiv condiviso che appartiene alla run? La risposta impatta direttamente il `unit_id` e il `lineage_id` schema.

**Q2 — Persistenza infrastruttura**: l'export e (A) solo local-file (JSON download, ~5h MVP), (B) cloud account Game (richiede auth service, ~15-20h), o (C) entrambi con fallback? Raccomandato: A per MVP, poi B come upgrade. Se si sceglie B subito, NECESSITA un auth decision prima di scrivere codice.

**Q3 — Care simulation: si o no?** Il pattern industry raccomanda NO care simulation (Pokemon HOME, Spore) per un companion narrativo. Ma se il goal del user e avere qualcosa da "tenere vivo" fuori dal gioco (Tamagotchi feeling), serve un minimal care loop (es. "visita Skiv ogni N giorni per tenere il suo thought cabinet fresco"). Quale feeling vuoi prioritizzare?

---

## Anti-pattern guard

- NON implementare care simulation (feed/play/sleep) per Skiv — rompe il design "Skiv cresce solo in campagna". Se il player non gioca, Skiv non cambia.
- NON esportare campaign-state (hp_current, sg_current, session_id) — sono effimeri e non ha senso fuori contesto.
- NON fare export senza `schema_version` pinned — se il formato cambia, i file vecchi diventano illeggibili.
- NON blokkare M2 wire su S1 — sono indipendenti. M2 e 2.5h, fattibile subito.
- NON lanciare S1 polish (crossbreeding async) prima di OD-001 Path A verdict — richiede V3 Nido come prerequisito.

---

## File chiave referenziati

- `data/derived/skiv_saga.json` — schema export esistente (8 eventi diary, mutations, MBTI, progression)
- `apps/backend/routes/skiv.js` — `/api/skiv/card` endpoint live
- `apps/play/src/skivPanel.js` — panel UI live
- `data/core/species/dune_stalker_lifecycle.yaml` — lifecycle 5 fasi + lineage_id gateway in `legacy` fase
- `apps/backend/services/progression/progressionEngine.js` — `effectiveStats()` per M2 formula
- `data/core/progression/perks.yaml` — 84 perk canonical (modifier layer M2)
- `data/core/species.yaml:71` — dune_stalker entry con base stat e trait_plan

---

*Generato da creature-aspect-illuminator, research mode ISFP-A, 2026-04-27.*
*Sources primary: Smogon (smogon.com), Bulbapedia (bulbapedia.bulbagarden.net), VGC Guide (vgcguide.com), GAMES.GG MHS3, Gamer Guides MHS3, Kiranico (mhst.kiranico.com), CK3 Wiki (ck3.paradoxwikis.com), Neoseeker CK3, Thegamer CK3, DNDBeyond, ScreenRant D&D, Wildermyth Wiki (wildermyth.com), Turnbased Lovers Interview, GDC 2023 Tamagotchi Postmortem (gamedeveloper.com), Tamagotchi Fandom, Pokemon HOME (home.pokemon.com), Pokemon Champions Wiki, Chris Hecker Liner Notes (chrishecker.com), SporeWiki (spore.fandom.com), Niantic Pikmin Bloom, Nintendo Pikmin Bloom, Pikipedia, Digivicemon, Toy People, Nookipedia (nookipedia.com), Animal Crossing Fandom.*
*Nessuna fonte content-farm (medium.com / towardsdatascience.com / emergentmind.com escluse).*
