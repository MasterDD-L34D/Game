---
title: "Nido — housing+mutation pattern, repo audit + Pokopia reference"
workstream: cross-cutting
status: draft
created: 2026-04-26
author: creature-aspect-illuminator
related_od: OD-001
related_cards: [M-2026-04-25-007, M-2026-04-25-008]
---

# Nido — housing+mutation pattern, repo audit + Pokopia reference

## TL;DR — 5 bullet

1. **Engine esiste, frontend zero.** `metaProgression.js` (469 LOC) + 7 endpoint REST `/api/meta/*` sono LIVE da 4 mesi (PR #1435 + #1679). Zero hit in `apps/play/` — dead path completo. OD-001 Path A/B/C chiede decisione product.
2. **Nido = Base persistente tra archi narrativi.** Il pattern Pokopia / MHS / Stardew converge: la base si sblocca narrativamente (una volta, via bioma-arc o story-quest), poi e sempre accessibile. Non e opzionale dopo lo sblocco — e l'hub tra sessioni tattiche.
3. **Mutazione genetica via Nido e Layer 2, non Layer 1.** Layer 1 = mutation_catalog (self-encounter, M14). Layer 2 = offspring genetics da mating (Nido, V3). I due layer sono distinti per design semantico (confermato 2026-04-25 update su card M-007). Non mischiare.
4. **Tribe emerge dal lignaggio.** Linea: `Nido (base) → mating (pairing) → offspring (gene_slots inherited) → lineage_id chain → tribe`. Skiv legacy phase gia ha `lineage_id` come gateway (see `dune_stalker_lifecycle.yaml` legacy.aspect_it). Tribe e emergente, non una meccanica aggiunta.
5. **OD-001 verdict suggerito: Path A (Activate) con scope mini.** Industry pattern (Pokopia, MHS3, Stardew) mostrano che housing+base senza frontend e invisible ai player. 50-80h sunk cost si recupera con ~15-20h di wire. Path C (sandbox) e middle-ground se decisione bloccata.

---

## 1. Audit repo — stato attuale

### 1.1 Engine runtime (`metaProgression.js`)

**File**: `apps/backend/services/metaProgression.js:1` (469 LOC)

Engine D1+D2 LIVE. Funzioni verificate:

```
canMate(npcId)           // gate: trust >= 3 + nest.requirements_met
rollMating(npcId, ...)   // d20 vs DC 12, MBTI compat modifier ±3, trust bonus
computeMatingRoll(...)   // offspring_traits: union parent+npc, pick 3 random
setNest(biome, reqMet)   // nest state: {level, biome, requirements_met}
tickCooldowns()          // round-tick decrement mating_cooldown
recruit(npcId)           // gate: affinity >= 0 AND trust >= 2
```

In-memory + Prisma adapter (`UnitProgression` model, migration `0004`). Routes: `apps/backend/routes/meta.js:1` (119 LOC, 7 endpoint). **Zero frontend integration** — grep `/api/meta` in `apps/play/` = 0 hit.

### 1.2 Dataset (`data/core/mating.yaml`)

**File**: `data/core/mating.yaml:1` (477 LOC)

Canonical compat table: 16 MBTI forms con `likes`, `neutrals`, `dislikes`, `strengths`, `stress_triggers`, `collaboration_hooks`, `base_scores`. Consumato da `computeMatingRoll` via `compatTable` param.

Gap: `compat_ennea` (3 stub entries vs 9 Ennea types). Pack drift: `packs/evo_tactics_pack/data/mating.yaml` (393 LOC) manca 84 righe `gene_slots`.

### 1.3 Canonical design doc

**File**: `docs/core/Mating-Reclutamento-Nido.md:34` — Moduli Nido: Dormitori / Bio-Lab / Resonance Anchor / Hangar, tier 0-3. Ereditarieta: `2 gene_slots da genitori + 1 mutazione ambientale`. Nido itinerante: 2 Anchor, spostamento ogni 3 turni campagna (da Canvas D, mai migrata a runtime).

### 1.4 Lifecycle Skiv — Nido come gateway

**File**: `data/core/species/dune_stalker_lifecycle.yaml:166-176`

Fase `legacy` aspect_it: *"Diary persiste come 'saga reference' (V3 Mating/Nido futuro userebbe questo come gateway)"*. Il `lineage_id` e gia previsto come ponte verso offsprings. Connessione esplicita, non implicita.

### 1.5 OD-001 stato

**File**: `OPEN_DECISIONS.md:12-32`

Correzione 2026-04-25: engine LIVE, non "deferred no runtime". Tre path disponibili. **Decisione product pendente.**

### 1.6 Housing layer — esiste?

`nestHub.js` = NON esiste (`apps/play/src/`). UI housing = zero. Canvas D (`docs/appendici/D-CANVAS_ACCOPPIAMENTO.md`) ha schema moduli ma non e wired. Museum card M-008 (Nido Itinerante) ha 3 meccaniche mai migrate: 2-Anchor itinerante, Security Rating vs bioma, Legami pool rituale.

### 1.7 Narrative arc unlock — esiste gia?

Unlock pattern diegetic NON esiste in runtime. Forma base: il Nido si attiva via `setNest(biome, true)` ma nessun trigger narrativo lo chiama. Pattern piu vicino a unlock-diegetic e il biome_affinity field in `data/core/species.yaml` (spawn-locked per biome) e il `biomeSpawnBias.js` (V7, PR #1726). Estensione naturale: quando il party completa primo arc narrativo del biome_affinity di Skiv (savana), sblocca `nest_unlocked: true` per quella run.

---

## 2. Pokopia — deep dive reference

**Fonte primaria**: [VGC — Ruby and Sapphire inspired Pokopia](https://www.videogameschronicle.com/features/pokemon-pokopia/) + [Serebii Habitats](https://www.serebii.net/pokemonpokopia/habitats.shtml) + [Nintendo Life — No Evolution](https://www.nintendolife.com/guides/pokemon-pokopia-can-you-evolve-pokemon)

**Pokemia Pokopia** (Game Freak + Omega Force, Nintendo Switch 2, marzo 2026) e un social simulation game con 209+ tipi di habitat. Il giocatore controlla un Ditto che imita un umano e costruisce habitat per attrarre Pokemon.

### Meccaniche chiave applicabili a Evo-Tactics

**A. Housing come loop primario, non minigame.**
Il loop di Pokopia: `befriend → build habitat → attract → complete objectives → unlock currency → expand`. Non e una sidebar — e il gameplay centrale. Ogni Pokemon resident ha una classe (builder, etc.) e insegna mosse al player. Applicabilita: Nido in Evo-Tactics non e un cosmetico. Ogni creatura che "vive" nel Nido contribuisce meccanicamente (trait unlock, gene pool expansion, ritual bonus).

**B. Unlock narrativo via biome arc, non livello.**
Le aree si sbloccano completando Important Requests specifiche: befriendare Raikou per accedere a Bleak Beach, completare storyline Slowpoke per passare da Withered Wasteland. Non e level-gating puro — e diegetic (il bioma si apre perche la storia lo consente). Applicabilita: il Nido si sblocca quando il party "completa il primo arc narrativo" del bioma primario (es. savana per Skiv). Una volta sbloccato, resta accessibile.

**C. No evolution — ogni stadio e un'entita separata.**
Pokopia non ha evoluzione: ogni stadio evolutivo e un Pokemon distinto con habitat diverso, rarity tier, spawn condition. Applicabilita INVERSA: Evo-Tactics HA evoluzione (lifecycle Skiv 5 fasi). Ma il pattern "stadio precedente e presente coesistono" e interessante per Nido: il parent Skiv (mature/apex) e l'offspring (hatchling) possono coesistere nel Nido, ciascuno con ruolo diverso.

**D. Companion che abilita world interaction.**
Charmander accende fuochi, Scyther taglia alberi. Il companion resident nel Nido sblocca azioni nel bioma. Applicabilita: creature nel Nido con specifici trait_ids abilitano eventi nel bioma (es. Skiv apex con echolocation_3d nel Nido sblocca "rilevamento raid" automatico).

**E. Base sempre accessibile, no time-gating.**
Nessun cooldown forzato tra visite alla base. Applicabilita diretta: Nido sempre raggiungibile da menu tra missioni. Non e legato a round count.

---

## 3. Altri pattern primary-sourced

### 3.1 Monster Hunter Stories 3 — Gene Grid + Nest come home base

**Fonte**: [GAMES.GG MHS3 Genetics Guide](https://games.gg/monster-hunter-stories-3-twisted-reflection/guides/monster-hunter-stories-3-monstie-genetics-breeding-guide/) + [Kiranico gene db](https://mhst.kiranico.com/gene)

**Meccaniche**:
- **3x3 gene grid** per ogni Monstie: 9 slot, ogni gene ha tipo (Power/Speed/Technical) + elemento. Bingo = 3 same-type allineati → bonus meccanico stackabile.
- **Rite of Channeling**: trasferisce gene da un Monstie a un altro (inheritance attivo). Sblocca presto nella storia (early progression gate, non post-game).
- **Nest + Monster Den**: ogni specie ha den fisso nel bioma. Il den e la "casa" della specie — ci vai, prendi le uova, le fai schiudere. Upgrade post-game: Super Rare High Rank Den sblocca dopo finale.
- **Gene rarity visible**: uovo con glow rainbow = geni rari. Player vede qualita PRIMA del commitment. Tatto come segnale.

**Applicabilita a Evo-Tactics**:
- `gene_slots` gia in `data/core/mating.yaml` (84 righe mancanti nel pack) → pronto come seed.
- 3x3 grid visiva = UI panel per Nido Hub (pattern gia valutato in Pattern Library P0 MHS, creature-aspect-illuminator.md).
- Nido come den per species specifica = Skiv Nido e legato a `dune_stalker` bioma affinity. Non e nido generico.

### 3.2 Wildermyth — Lineage + visual morphology inheritance

**Fonte**: [Wildermyth wiki Upbringing](https://wildermyth.com/wiki/Upbringing) + [Category:Transformation](https://wildermyth.com/wiki/Category:Transformation)

**Meccaniche**:
- Offspring inherit hook/aspect dal parent (upbringing system). L'offspring ha set di origins separato ma bias verso trait genitori.
- Transformation (wolf arm, stone eye, flame wing) e visiva E meccanica — layer replacement nel portrait.
- Chapter beat triggerano visual change PRIMA del flavor text. Player vede → poi legge.

**Applicabilita**:
- `lineage_id` in `dune_stalker_lifecycle.yaml` legacy fase = gateway gia pensato. Offspring Skiv puo ereditare `aspect_token` (es. `claws_glass` da parent mature) con bias probabilistico.
- "Visual change prima del testo" = anti-pattern guard gia in creature-aspect-illuminator.md. Da applicare al momento Nido mating success: animazione/flash visual PRIMA del popup "offspring generato".

### 3.3 Stardew Valley — Farm come base sempre accessibile con unlock progressivo

**Fonte**: [Stardew Valley Wiki — The Farm](https://stardewvalleywiki.com/The_Farm) + [BisectHosting unlock guide](https://www.bisecthosting.com/clients/index.php?rp=%2Fknowledgebase%2F1088%2FStardew-Valley-unlockable-locations-guide.html)

**Meccaniche**:
- La farm e accessibile DAL GIORNO 1. Non si sblocca — e il punto di partenza.
- Altre aree si sbloccano narrativamente (lettera del giorno 5 → Mines; earthquake estate → Railroad; Community Center → Calico Desert).
- Una volta sbloccata un'area, e sempre accessibile. Non ci sono re-lock.
- La farm e il "ritorno" tra ogni avventura: piante, animali, costruzioni evolvono mentre il player e fuori.

**Applicabilita**:
- Pattern per Nido: non e la farm (non e il punto di partenza). E piu come "Calico Desert" — si sblocca una volta via arc narrativo, poi sempre disponibile.
- "Evolve mentre sei fuori": il Nido tra missioni puo tickare (cooldown mating, crescita offspring, risorse Legami). Simulazione passiva, non richiede attenzione attiva ogni sessione.

### 3.4 Citizen Sleeper — Housing come narrative anchor e unlock progressivo

**Fonte**: [Citizen Sleeper wiki — Derelict Unit](https://citizensleeper.fandom.com/wiki/Derelict_Unit) + [Player Homes category](https://citizensleeper.fandom.com/wiki/Category:Player_Homes)

**Meccaniche**:
- Player homes si sbloccano completando clock narrativi (Cycle Clocks). Non e un shop — e una quest completata.
- Una volta ottenuta, la casa e il trigger per eventi narrativi: lasciare casa attiva scene (bounty hunter, nuove aree).
- La casa e archivio della identita del personaggio. Visitarla = check-in con stato interno.

**Applicabilita**:
- Il Nido in Evo-Tactics e un Cycle Clock: una volta completato "primo arc narrativo bioma", il Nido si materializza. Poi visitarlo triggerata eventi (mating opportunity, offspring reveal, raid avviso).
- "Casa come archivio identita" = il Nido mostra `lineage_id` chain — chi eri, chi hai generato, chi vive qui ora. Diegetic memory.

### 3.5 Monster Hunter Stories / Pokemon Breeding — gene inheritance con variabilita

**Fonte**: [RPGSite — MHS2 understanding dens](https://www.rpgsite.net/feature/11466-monster-hunter-stories-2-understanding-dens-and-how-to-gets-the-best-eggs) + [Serebii MH Stories habitats](https://www.serebii.net/pokemonpokopia/habitats.shtml)

**Meccanica variabilita**: uovo glow (no-glow/gold/rainbow) = segnale qualita gene. Player sceglie quando rischiare den pericoloso per geni migliori. Rischio-ricompensa visibile.

**Applicabilita**: nella `rollMating` attuale (d20 vs DC 12), il risultato e binario success/fail. Aggiungere tier: `d20 + modifier >= 18` = offspring con `gene_rarity: rare` (1 trait aggiuntivo). Player vede "la schiusa brilla" prima del reveal offspring.

---

## 4. Proposta integrazione — Nido nel flow TV-on → TV-off

### 4.1 Architettura del flusso

```
[TV-on: Lobby] → [Character Creation] → [Biome Arc Missione 1-N]
                                              ↓
                                    (primo arc narrativo completato)
                                              ↓
                                    [NIDO SBLOCCATO per questo bioma]
                                              ↓
                        ┌─────────────────────────────────────────┐
                        │  NIDO — sempre accessibile da menu      │
                        │  ┌──────────┐  ┌──────────┐ ┌────────┐ │
                        │  │ Creature │  │ Mating   │ │ Gene   │ │
                        │  │ Residents│  │ Roll     │ │ Grid   │ │
                        │  └──────────┘  └──────────┘ └────────┘ │
                        │  ┌──────────┐  ┌──────────┐            │
                        │  │ Lineage  │  │ Legami   │            │
                        │  │ Chain    │  │ Rituale  │            │
                        │  └──────────┘  └──────────┘            │
                        └─────────────────────────────────────────┘
                                              ↓
                        [TV-off: Nido ticka passivamente]
                                              ↓
                        [TV-on: debrief → Nido mostra offspring / eventi]
```

### 4.2 Unlock narrativo — trigger specifico

**Condizione sblocco** (proposta, basata su Pokopia + Citizen Sleeper):

```
trigger: biome_arc_completed
condition:
  - biome_id: biome_affinity della species party (es. savana per Skiv)
  - missions_completed_in_biome: >= 3    # soglia da bilanciare
  - party_has_unit_with_nest_eligible: true  # trust >= 3 su almeno 1 NPC
event: nest_unlocked
effect:
  - nest.requirements_met = true
  - journal_entry: "Hai trovato un posto dove tornare."
  - ui: nestHub overlay disponibile da menu
```

**Non gating con livello numerico** — gating narrativo. Il player sente che il Nido e "guadagnato" dall'esperienza nel bioma, non da un counter XP.

### 4.3 Cosa si fa nel Nido

Priorita per Path A MVP (scope mini):

1. **Recruit ex-nemico** (gia in engine `recruit()`) → debrief panel action card. Effort: ~3h wire UI.
2. **Nest setup** (`setNest()`) → `nestHub.js` minimal: mostra stato nest + biome. Effort: ~4h.
3. **Mating roll** (`rollMating()`) → call da nestHub con visual feedback tier (no-glow/gold/rainbow). Effort: ~5h.
4. **Offspring preview** → mostra `offspring_traits` con aspetto visivo (aspect_token inherited). Effort: ~3h.

Total Path A MVP: ~15-20h (allineato a stima M-007 card).

### 4.4 Nido itinerante per Skiv (M-008 card)

Skiv = `vagans` (errante). Nido itinerante = 2-Anchor (dune_ridge + oasis). Switch ogni 3 round campagna. Meccanica mai migrata da Canvas D.

Implementazione minimal:
- `dune_stalker_lifecycle.yaml` aggiungere `nest_type: itinerante` + `nest_anchors_template: [dune_ridge, oasis]`
- `metaProgression.setNest()` estendere con param `anchors[]` opzionale
- `roundOrchestrator.tickCampaignTurn()` aggiungere anchor-switch ogni 3 round

Effort: ~3h (Skiv pilot). Non generalizzare prima di validare il pattern.

---

## 5. Tribe — emergenza da lignaggio Nido

User ha menzionato "tribe" come meccanica nuova. Connessione a Nido:

### 5.1 Tribe come emergenza, non input

**Non** e una meccanica che il player attiva dicendo "crea tribe". E un outcome emergente dalla catena:

```
Nido (base fisica) 
  → mating (pairing MBTI + trust)
    → offspring (gene_slots inheritati, 2 parent + 1 ambientale)
      → offspring cresce (lifecycle Lv 1-7)
        → offspring raggiunge mature/apex
          → offspring a sua volta puo fare mating
            → lineage_id chain estesa
              → N creature con lineage_id comune = TRIBE implicita
```

Il player non "crea" una tribe. Guarda come si forma osservando chi vive nel Nido nel tempo.

### 5.2 Connessione meccanica Skiv

In `dune_stalker_lifecycle.yaml:174`: *"il suo lineage_id passa a unit successivi della stessa genus"*. Questo e il seme. Tribe = insieme di units con `lineage_id` condiviso (o derivato via chain). Tribe size = conteggio units vivi con `lineage_id.startsWith(skiv_lineage)`.

### 5.3 Meccanica Legami come tribe resource

Canvas D (card M-008) ha `Legami` come risorsa pool per rituali. Non e in canonical runtime. Proposta: Legami = tribe currency. Si guadagna da interazioni Nido (mating riuscito, offspring in crescita, rituali coesione). Si spende per buff tribale (SquadSync bonus, StressWave reduction).

Connessione con V5 SG infrastructure gia live (PR #1726): Legami e parallelo a SG ma per dimension sociale (branco), non individuale (stress personale).

### 5.4 Tribe e Pokopia pattern

In Pokopia i Pokemon resident costruiscono il bioma insieme al player. Il player non comanda — facilita. Tribe in Evo-Tactics: le creature del Nido con lineage condiviso hanno comportamenti leggermente diversi in combat (es. SquadSync bonus se 2+ units stessa tribe nella stessa missione). Player non programa — emerge da chi ha nel Nido.

---

## 6. OD-001 Path A/B/C — verdict suggerito

**Raccomandazione basata su pattern industry: Path A (Activate) con scope mini.**

### Argomenti Path A

- Sunk cost reale (~50-80h): 469 LOC + 119 LOC + Prisma migration gia shippati. Demolire = perdita irrecuperabile.
- Pokopia mostra che housing senza frontend = invisible. Player non sperimenta mai il sistema.
- Effort minimo per feedback reale: ~15-20h per nestHub.js + debrief wire + mating visual. Non e un blocco grosso.
- Industry pattern (Pokopia, MHS, Stardew, Citizen Sleeper) converge: una volta sbloccata la base, e IL punto di differenziazione del gioco. Toglie Evo-Tactics dalla categoria "tattico puro" e lo porta in "tattico + ecosystem".
- Pillar P2 Evoluzione 🟢 candidato diventerebbe 🟢 reale. Senza wire, P2 resta debole sul dimension emergente.

### Argomenti contro Path B (Demolish)

- Perde 50-80h lavoro gia testato e funzionante.
- Non risolve il problema design (mating e nel GDD, serve una risposta a come si gestisce).
- Segnale sbagliato a futuri sprint: "V3 quarantined" blocca la conversazione per mesi.

### Argomenti contro Path C (Sandbox)

- Middle-ground senza beneficio: l'engine resta invisibile, ma non e nemmeno demolito. Drift docs/runtime persiste.
- "Pronto a riattivare" non e un vantaggio se il design e chiaro: gia pronto.
- Solo utile se decisione product davvero bloccata per 2+ sprint.

### Scope mini raccomandato per Path A

Non attivare tutto in una volta. Sequenza sicura:

1. **Sprint A-Nido (5h)**: `nestHub.js` minimal + setNest trigger da biome_arc_complete + UI panel vuoto ma navigabile. Player vede "il Nido esiste".
2. **Sprint B-Recruit (5h)**: debrief wire per `recruit()`. Player porta NPC nel Nido.
3. **Sprint C-Mating (8h)**: `rollMating()` con visual feedback tier + offspring preview. Player vede "qualcosa si genera".
4. **Sprint D-Lineage (5h)**: `lineage_id` propagazione + tribe emergente. Player vede "chi ho creato".

Total: ~23h in 4 mini-sprint sequenziali, ciascuno giocabile e verificabile.

---

## File chiave — path assoluti

- `apps/backend/services/metaProgression.js` — engine D1+D2 (469 LOC)
- `apps/backend/routes/meta.js` — 7 endpoint REST (119 LOC)
- `data/core/mating.yaml` — compat table 16 forms (477 LOC)
- `data/core/species/dune_stalker_lifecycle.yaml` — Skiv lifecycle 5 fasi + Nido gateway in legacy:174
- `docs/core/Mating-Reclutamento-Nido.md` — canonical design doc
- `docs/museum/cards/mating_nido-engine-orphan.md` — card M-007 (Path A/B/C detail)
- `docs/museum/cards/mating_nido-canvas-nido-itinerante.md` — card M-008 (3 meccaniche mai migrate)
- `OPEN_DECISIONS.md:12` — OD-001 correzione + path disponibili

---

## Anti-pattern guard (per questo dominio)

- NON creare nestHub.js prima di OD-001 verdict. Se demolish → spreco.
- NON mischiare mutation_catalog (Layer 1 self-encounter) con mating offspring genetics (Layer 2). Due sistemi distinti.
- NON trattare Tribe come meccanica da programmare — e emergenza da osservare. Aggiungere API `GET /api/meta/tribe/:lineage_id` solo quando lineage chain e funzionante.
- NON gating Nido con livello numerico — gating narrativo via biome_arc_complete (diegetic).
- NON generalizzare Nido itinerante prima di validare il pilot Skiv.

---

*Generato da creature-aspect-illuminator in modalita audit, 2026-04-26. Sources: Pokopia (VGC, Serebii, Nintendo Life), MHS3 (GAMES.GG, Kiranico), Wildermyth (wiki), Stardew Valley (wiki, BisectHosting), Citizen Sleeper (Fandom wiki). Nessuna fonte content-farm.*
