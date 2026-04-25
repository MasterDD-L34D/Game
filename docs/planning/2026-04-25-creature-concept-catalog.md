---
doc_status: draft
doc_owner: catalog-curator
workstream: dataset-pack
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
---

# Creature Concept Catalog — Evo-Tactics

> Sprint context: 2026-04-25 autonomous content sprint (notte). 40+
> creature concept cross-referenziate ai 20 biomi canonici e al glossary
> trait (275 entries) post wave 1-5. Baseline per M14 species expansion +
> M11 playtest seed packs. Italian fantasy flavor, snake_case IDs.
>
> Designed to extend (NOT conflict with) `data/core/species.yaml` +
> `packs/evo_tactics_pack/data/species/<biome>/`. Trait_loadout cita IDs
> reali del glossary (verificati 2026-04-25).

## Indice

1. [Design principles](#design-principles)
2. [Catalog — biome-by-biome (40+ creatures)](#catalog)
3. [Apex tier (8 boss-class)](#apex-tier)
4. [Encounter pack seeds (10 packs)](#encounter-pack-seeds)
5. [Mutation gateway creatures (5)](#mutation-gateway-creatures)
6. [Open design questions](#open-questions)

## Design principles

Ogni creatura segue 7 dimensioni canoniche:

1. **id**: `snake_case` con pattern `<famiglia>_<descrittore>`
2. **biome_primary**: 1 biome ID canonico
3. **role**: predator | prey | scavenger | ambusher | swarmer | apex |
   symbiont | parasite | nest_builder | herder
4. **size**: tiny | small | medium | large | huge
5. **trait_loadout**: 3-5 trait_id reali del glossary, annotati
   (offensive/defensive/utility/sensory)
6. **signature_hook**: 1-2 frasi sul tactical "feel" in combat
7. **mbti_tendency**: 1-2 axes (E/I, S/N, T/F, J/P)

**Anti-pattern blocklist**:

- ❌ Creature con tutti i trait di una sola categoria (no varietà di gameplay)
- ❌ Apex senza phase change (boss noiosi)
- ❌ Swarmers single-unit (definizione: ≥3 nello stesso encounter pack)
- ❌ Trait_loadout >5 entries (visual clutter HUD + balance hell)

---

## Catalog

### Biome: `savana`

#### `pista_corridor`

- **name_it**: Corridore della Pista
- **name_en**: Track Sprinter
- **role**: prey (alpha-prey, hunted by pack predators)
- **size**: medium
- **trait_loadout**:
  - `coda_balanciere` (utility — stabilità in corsa)
  - `zampe_a_molla` (offensive — kick di disengage)
  - `occhi_infrarosso_composti` (sensory — early warning)
- **signature_hook**: difficile da agganciare in melee; se un alleato
  riesce a immobilizzarlo, infligge danno extra al kick di fuga.
- **mbti_tendency**: S-P (reattivo, presente)
- **mutation_chain**: T1 `zampe_a_molla` → T2 `zampe_radianti` (kick aereo)

#### `cacciatore_dorato`

- **name_it**: Cacciatore Dorato
- **name_en**: Golden Hunter
- **role**: predator (pack alpha)
- **size**: medium
- **trait_loadout**:
  - `artigli_sette_vie` (offensive — presa stabile)
  - `denti_seghettati` (offensive — bleeding)
  - `circolazione_doppia` (utility — rage on kill)
  - `voce_imperiosa` (control — panic adiacenti)
- **signature_hook**: se uccide un bersaglio, entra in rage e applica
  panic agli alleati superstiti del bersaglio.
- **mbti_tendency**: E-T (decisivo, dominante)
- **mutation_chain**: T1 `circolazione_doppia` → T2 `circolazione_supercritica`

#### `branco_cucciolo`

- **name_it**: Cucciolo del Branco
- **name_en**: Pack Whelp
- **role**: swarmer (pack 3-5)
- **size**: small
- **trait_loadout**:
  - `denti_ossidoferro` (offensive — penetra scaglie leggere)
  - `coda_balanciere` (utility)
- **signature_hook**: solo è quasi inoffensivo; in pack sfrutta SquadSync
  focus_fire combo per +1 dmg condiviso.
- **mbti_tendency**: E-S (gregario, fisico)

---

### Biome: `caverna`

#### `risuonatore_chiroptero`

- **name_it**: Risuonatore Chirottero
- **name_en**: Chiropter Resonator
- **role**: ambusher (volante, attacchi in tuffo)
- **size**: small
- **trait_loadout**:
  - `ali_membrana_sonica` (offensive — panic on hit)
  - `antenne_microonde_cavernose` (sensory — stun on crit)
  - `occhi_infrarosso_composti` (sensory)
- **signature_hook**: combo doppio status (panic + stunned) se attacco
  con MoS ≥ 8 da posizione sopraelevata.
- **mbti_tendency**: I-N (calcolatore, anticipatore)
- **mutation_chain**: T1 `ali_membrana_sonica` → T2 `ali_fono_risonanti`

#### `verme_radice_pietra`

- **name_it**: Verme di Radice-Pietra
- **name_en**: Stoneroot Worm
- **role**: ambusher (sotterraneo)
- **size**: large
- **trait_loadout**:
  - `artigli_radice` (offensive — fracture on hit)
  - `corazze_ferro_magnetico` (defensive — DR2)
  - `scheletro_idro_regolante` (defensive)
  - `denti_chelatanti` (offensive — bleeding 3 turns)
- **signature_hook**: emerge da tile sotterraneo (telegraph 1 turno),
  applica fracture + bleeding al primo bersaglio.
- **mbti_tendency**: I-S (paziente, fisico)

#### `lichene_emette`

- **name_it**: Lichene Emettitore
- **name_en**: Emitter Lichen
- **role**: nest_builder (statico, hazard layer)
- **size**: tiny
- **trait_loadout**:
  - `spore_paniche` (control — panic 3 turns)
  - `biofilm_glow` (defensive — DR1 melee)
- **signature_hook**: tile-based; chi attacca in melee subisce panic.
  Lascia un alone luminoso che rivela bersagli stealth in tile adiacenti.
- **mbti_tendency**: I-J (statico, sistemico)

---

### Biome: `foresta_temperata`

#### `cervo_pellevera`

- **name_it**: Cervo dalla Pelle Vera
- **name_en**: Truepelt Stag
- **role**: prey (territoriale)
- **size**: medium
- **trait_loadout**:
  - `pelli_fitte` (defensive — DR2 melee)
  - `coda_contrappeso` (offensive — +2 dmg counter)
  - `occhi_cinetici` (sensory)
- **signature_hook**: contraccolpo (`coda_contrappeso`) se attaccato in
  melee da MoS ≥ 5; fuori da melee è inoffensivo.
- **mbti_tendency**: I-J (territoriale, ritirato)

#### `lupo_ombrelutto`

- **name_it**: Lupo Ombra-Lutto
- **name_en**: Mournshade Wolf
- **role**: predator (pack 2-3)
- **size**: medium
- **trait_loadout**:
  - `artigli_scivolo_silente` (offensive — +2 dmg crit)
  - `denti_seghettati` (offensive — bleeding)
  - `intimidatore` (control — panic adjacent on hit)
  - `circolazione_bifasica` (utility — rage on kill)
- **signature_hook**: pack tactic: 1 fa intimidatore (panic), gli altri
  capitalizzano con artigli su panicked target che non contrattacca.
- **mbti_tendency**: E-T (cooperativo, calcolatore)

#### `picchio_acaro_specchio`

- **name_it**: Picchio-Acaro Specchio
- **name_en**: Mirror-Mite Pecker
- **role**: scavenger (volante)
- **size**: tiny
- **trait_loadout**:
  - `ali_fulminee` (offensive — +2 dive)
  - `camere_mirage` (defensive — DR1 always)
  - `occhi_analizzatori_di_tensione` (sensory — extra dmg)
- **signature_hook**: difficile da bersagliare (DR1 + camere_mirage);
  attacco ranged dive +2 dmg da elevato.
- **mbti_tendency**: I-N (osservatore)

---

### Biome: `palude`

#### `serpente_spirale`

- **name_it**: Serpente Spirale
- **name_en**: Spiral Serpent
- **role**: ambusher (acquatico)
- **size**: large
- **trait_loadout**:
  - `tentacoli_uncinati` (control — fracture)
  - `enzimi_chelanti` (offensive — bleeding 2)
  - `branchie_osmotiche_salmastra` (defensive — DR2)
  - `coda_frusta_cinetica` (offensive — fracture on MoS5+)
- **signature_hook**: turn 1 tenta tentacoli (fracture immobilizing);
  turn 2 capitalizza con coda_frusta sullo stesso bersaglio (doppia
  fracture devastante).
- **mbti_tendency**: E-T (predatore di setup)

#### `paludino_velenoso`

- **name_it**: Paludino Velenoso
- **name_en**: Venomous Marshling
- **role**: prey (con difese chimiche)
- **size**: small
- **trait_loadout**:
  - `aculei_velenosi` (offensive — bleeding 3 melee)
  - `enzimi_antipredatori_algali` (defensive — DR2 melee)
  - `cuticole_cerose` (defensive — DR1 melee)
- **signature_hook**: chi attacca in melee è sempre punito (DR3 totale +
  3-turn bleeding). Forza gli avversari a usare ranged.
- **mbti_tendency**: I-S (passivo difensivo)

#### `coralluna_palustre`

- **name_it**: Coralluna Palustre
- **name_en**: Marsh Coralmoon
- **role**: nest_builder (statico, hazard)
- **size**: medium
- **trait_loadout**:
  - `ghiandole_nebbia_acida` (control — bleeding on hit)
  - `aura_scudo_radianza` (defensive — DR2 always)
  - `biofilm_iperarido` (defensive — DR1)
- **signature_hook**: forte difesa passiva (DR3 cumulato); chi la attacca
  in melee si avvelena. Risolve solo a ranged costoso.
- **mbti_tendency**: I-J (sentinella inerte)

---

### Biome: `cryosteppe` / `caldera_glaciale`

#### `lupo_glaciale_apex`

- **name_it**: Lupo Glaciale (Apex)
- **name_en**: Glacial Wolf (Apex)
- **role**: predator (apex pack)
- **size**: large
- **trait_loadout**:
  - `artigli_sghiaccio_glaciale` (offensive — fracture)
  - `artigli_ipo_termici` (offensive — stun on MoS5+)
  - `pelli_anti_ustione` (defensive — DR1)
  - `circolazione_supercritica` (utility — rage 3 turns on kill)
- **signature_hook**: doppio artiglio = doppio status (stun + fracture)
  su un crit in melee. Devastante contro tank slow.
- **mbti_tendency**: E-J (organizzatore, assertivo)

#### `mamma_orsa_blu`

- **name_it**: Mamma Orsa Blu
- **name_en**: Blue Mother Bear
- **role**: apex (territoriale, protegge cuccioli)
- **size**: huge
- **trait_loadout**:
  - `martello_osseo` (offensive — fracture on crit)
  - `carapace_fase_variabile` (defensive — DR3 on MoS5+)
  - `aura_scudo_radianza` (defensive — DR2 aura)
  - `midollo_iperattivo` (utility — rage 3 turns on kill)
  - `corno_di_caccia` _(NEW_TRAIT_PROPOSAL)_ — applies taunt to nearest enemy
- **signature_hook**: phase change a ≤50% HP: rage permanente + taunt
  forzato sull'attaccante (senza necessità di kill).
- **mbti_tendency**: I-F (protettiva, emozionale)

#### `linfo_glaciale`

- **name_it**: Linfa Glaciale
- **name_en**: Glacial Lymph
- **role**: scavenger (gel-form)
- **size**: small
- **trait_loadout**:
  - `capillari_criogenici` (control — stunned 1 melee)
  - `membrane_pneumatofori` (defensive — DR1)
  - `cuticole_neutralizzanti` (defensive — DR2 MoS5+)
- **signature_hook**: in melee infligge stun ai non-T (MoS ≥ 5);
  splatter di gel se uccisa lascia hazard tile slowed (1 round).
- **mbti_tendency**: I-P (passiva, opportunistica)

---

### Biome: `deserto_caldo` / `pianura_salina_iperarida`

#### `scorpione_sale`

- **name_it**: Scorpione di Sale
- **name_en**: Salt Scorpion
- **role**: ambusher (sotterraneo)
- **size**: medium
- **trait_loadout**:
  - `pungiglione_paralizzante` (control — stunned 2)
  - `corazze_ferro_magnetico` (defensive — DR2)
  - `cartilagini_pseudometalliche` (defensive — DR2)
- **signature_hook**: emerge da tile sabbia, primo attacco MoS5+ applica
  stunned 2 (target salta 2 turni). Tank-buster perfetto.
- **mbti_tendency**: I-T (calcolatore, paziente)

#### `lucertola_solare`

- **name_it**: Lucertola Solare
- **name_en**: Solar Lizard
- **role**: prey (calore-dipendente)
- **size**: small
- **trait_loadout**:
  - `ali_solari_fotoni` (offensive — +3 dmg dive on MoS5+)
  - `pelli_anti_ustione` (defensive)
  - `epidermide_dielettrica` (defensive)
- **signature_hook**: di giorno è quasi una piaga (dive +3); di notte
  inoffensiva. Encounter design: timer day/night cycle.
- **mbti_tendency**: E-S (energica al sole)

#### `mantide_ottocchio`

- **name_it**: Mantide Otto-Occhio
- **name_en**: Octoeye Mantis
- **role**: predator (specialist precision)
- **size**: small
- **trait_loadout**:
  - `occhi_cristallo_modulare` (offensive — +2 crit)
  - `occhi_infrarosso_composti` (sensory)
  - `artigli_vetrificati` (offensive — +2 dmg)
  - `denti_silice_termici` (offensive — bleeding)
- **signature_hook**: 4 trait offensivi: ogni hit MoS5+ infligge +2 +1 +
  bleeding 2t. Glass cannon (poca difesa).
- **mbti_tendency**: I-T (specialista chirurgico)

---

### Biome: `dorsale_termale_tropicale` / `abisso_vulcanico`

#### `salamandra_magmatica`

- **name_it**: Salamandra Magmatica
- **name_en**: Magma Salamander
- **role**: predator (apex termico)
- **size**: large
- **trait_loadout**:
  - `denti_silice_termici` (offensive — bleeding)
  - `filamenti_termoconduzione` (offensive — bleeding melee)
  - `pelli_anti_ustione` (defensive)
  - `lamelle_termoforetiche` (defensive — DR2)
  - `circolazione_doppia` (utility — rage)
- **signature_hook**: doppio bleeding (denti + filamenti) su un solo hit
  melee = 4 turni di sanguinamento sovrapposti. DoT specialist.
- **mbti_tendency**: E-S (impulsiva, fisica)

#### `geode_ascoltatore`

- **name_it**: Geode Ascoltatore
- **name_en**: Listener Geode
- **role**: nest_builder (statico, supporta altri spawner)
- **size**: medium
- **trait_loadout**:
  - `camere_risonanza_abyssal` (offensive — +2 dmg MoS5+)
  - `aura_scudo_radianza` (defensive — DR2)
  - `antenne_microonde_cavernose` (control — stun on crit)
- **signature_hook**: spawner di "echo_pulse" (NEW_TRAIT_PROPOSAL): ogni
  3 turni emette un pulse AOE che applica stunned ai non-T in 2 tile.
  Buff passivo: alleati entro 3 tile gain +1 attack_mod.
- **mbti_tendency**: I-N (sistemico)

#### `forgiatore_abissale`

- **name_it**: Forgiatore Abissale
- **name_en**: Abyssal Forger
- **role**: predator (boss-class minion)
- **size**: large
- **trait_loadout**:
  - `martello_osseo` (offensive — fracture on crit)
  - `corazze_ferro_magnetico` (defensive)
  - `carapace_segmenti_logici` (defensive — DR2 melee)
  - `aura_di_dispersione_mentale` (control — panic 2)
- **signature_hook**: pesante e lento, ma ogni hit è devastante (martello
  - 4 dmg base) e applica panic adiacenti contemporaneamente.
- **mbti_tendency**: I-T (metodico, brutale)

---

### Biome: `reef_luminescente` / `atollo_obsidiana`

#### `medusa_specchio`

- **name_it**: Medusa Specchio
- **name_en**: Mirror Jellyfish
- **role**: prey (gel-form, statico)
- **size**: medium
- **trait_loadout**:
  - `aura_di_dispersione_mentale` (control — panic 2)
  - `membrane_fotoconvoglianti` (defensive — DR2)
  - `biofilm_glow` (defensive — DR1 melee)
- **signature_hook**: in melee panicka l'attaccante; aura passiva DR3
  cumulato. Va aggirata o ranged.
- **mbti_tendency**: I-F (etereo, evitante)

#### `crostaceo_obsidiana`

- **name_it**: Crostaceo dell'Obsidiana
- **name_en**: Obsidian Crustacean
- **role**: predator (apex roccioso)
- **size**: huge
- **trait_loadout**:
  - `carapaci_ferruginosi` (defensive — DR2)
  - `carapace_fase_variabile` (defensive — DR3 MoS5+)
  - `coda_contrappeso` (offensive — +2 dmg melee MoS5+)
  - `coda_frusta_cinetica` (offensive — fracture)
  - `martello_osseo` (offensive — fracture on crit)
- **signature_hook**: triplo trait fracture-applicabile: probabilità
  alta di fracture stack 3+ turni. Counter di un Stalker o glass cannon.
- **mbti_tendency**: I-T (carro armato)

#### `pesce_lampada`

- **name_it**: Pesce Lampada
- **name_en**: Lamp Fish
- **role**: scavenger (illumina dark tile)
- **size**: small
- **trait_loadout**:
  - `biofilm_glow` (defensive)
  - `branchie_metalloidi` (defensive)
  - `ghiandole_inchiostro_luce` (control — panic 2 melee)
- **signature_hook**: utility creature: rivela tile stealth-occulte (per
  Sistema design: anti-Stalker). Inchiostro panic come emergency.
- **mbti_tendency**: I-P (esplorativo, gentile)

---

### Biome: `canopia_ionica` / `stratosfera_tempestosa`

#### `dragone_temporale`

- **name_it**: Dragone Temporale
- **name_en**: Storm Dragon
- **role**: apex (volante, AOE)
- **size**: huge
- **trait_loadout**:
  - `antenne_plasmatiche_tempesta` (offensive — +3 crit)
  - `ali_ioniche` (control — stun on dive)
  - `ali_solari_fotoni` (offensive — +3 dive MoS5+)
  - `corazze_ferro_magnetico` (defensive — DR2)
  - `circolazione_supercritica` (utility — rage 3)
- **signature_hook**: PHASE 1: ranged plasma (+3 crit) tutti turni.
  PHASE 2 (HP ≤50%): tuffo da elevato → ali_ioniche stun + ali_solari +3
  dmg = devastante singolo bersaglio.
- **mbti_tendency**: E-T (dominante aerea)

#### `aliante_tesla`

- **name_it**: Aliante Tesla
- **name_en**: Tesla Glider
- **role**: ambusher (volante, hit-and-run)
- **size**: medium
- **trait_loadout**:
  - `antenne_tesla` (offensive — +2 MoS5+)
  - `ali_fulminee` (offensive — +2 dive)
  - `filamenti_superconduttivi` (offensive — +2 melee MoS5+)
- **signature_hook**: hit-and-run aereo: dive +2 + colpo melee +2 con
  filamenti = +4 cumulato burst. Fragile (no defensive trait).
- **mbti_tendency**: E-P (impulsivo, opportunista)

---

### Biome: `foresta_acida` / `foresta_miceliale`

#### `ifa_psichedelica`

- **name_it**: Ifa Psichedelica
- **name_en**: Psychedelic Hypha
- **role**: nest_builder (statico, AOE control)
- **size**: small
- **trait_loadout**:
  - `spore_paniche` (control — panic 3 turns)
  - `aura_di_dispersione_mentale` (control — panic 2)
- **signature_hook**: doppia panic source: chi entra in melee subisce
  panic 3+2 stack (refresh). Hard counter di melee Vanguard.
- **mbti_tendency**: I-N (psichico)

#### `vespa_acida`

- **name_it**: Vespa Acida
- **name_en**: Acid Wasp
- **role**: swarmer (pack 4-6, volante)
- **size**: tiny
- **trait_loadout**:
  - `aculei_velenosi` (offensive — bleeding 3)
  - `enzimi_chelanti` (offensive — bleeding 2)
  - `ali_fulminee` (offensive — +2 dive)
- **signature_hook**: pack di 4+ : ogni hit applica bleeding (stack
  refresh max 3 turni). Pressure tank con DoT cumulato.
- **mbti_tendency**: E-S (gregaria, fisica)

#### `radice_carnivora`

- **name_it**: Radice Carnivora
- **name_en**: Carnivorous Root
- **role**: ambusher (statico, sotto la mappa)
- **size**: medium
- **trait_loadout**:
  - `tentacoli_uncinati` (control — fracture 1)
  - `artigli_radice` (offensive — fracture)
  - `enzimi_chelatori_rapidi` (offensive — bleeding 3 MoS5+)
- **signature_hook**: emerge da tile-erba; applica fracture (immobilizza)
  - bleeding (3 turni) sul primo hit MoS5+. Combo perfetta per pinning.
- **mbti_tendency**: I-J (paziente, pianificatore)

---

### Biome: `rovine_planari` / `mezzanotte_orbitale` / `steppe_algoritmiche`

#### `costrutto_logico`

- **name_it**: Costrutto Logico
- **name_en**: Logic Construct
- **role**: predator (geometrico, intelligente)
- **size**: medium
- **trait_loadout**:
  - `carapace_segmenti_logici` (defensive — DR2 melee)
  - `occhi_analizzatori_di_tensione` (offensive — +1 dmg)
  - `antenne_waveguide` (offensive — +1 MoS5+)
  - `armatura_pietra_planare` _(glossary)_ (defensive — DR2)
- **signature_hook**: AI sceglie sempre il bersaglio con HP più basso
  (logic-based prioritization). +1 dmg bonus ranged a target marked.
- **mbti_tendency**: I-T (calcolo puro)

#### `sciame_byte`

- **name_it**: Sciame Byte
- **name_en**: Byte Swarm
- **role**: swarmer (pack 5-7)
- **size**: tiny
- **trait_loadout**:
  - `filamenti_superconduttivi` (offensive — +2 melee MoS5+)
  - `antenne_wideband` (offensive — +1 always)
- **signature_hook**: pack denso: 5+ unit sullo stesso target = focus
  fire fa snowball rapido. Counter via AOE (Invoker/Aberrant).
- **mbti_tendency**: E-S (collettivo)

#### `oracolo_polverizzato`

- **name_it**: Oracolo Polverizzato
- **name_en**: Pulverized Oracle
- **role**: apex (statico, narrative-bound)
- **size**: huge
- **trait_loadout**:
  - `aura_di_dispersione_mentale` (control)
  - `aura_scudo_radianza` (defensive — DR2)
  - `camere_risonanza_abyssal` (offensive — +2 MoS5+)
  - `antenne_plasmatiche_tempesta` (offensive — +3 crit)
  - `circolazione_supercritica` (utility — rage 3)
- **signature_hook**: PHASE 1: aura panic permanente, attacca solo
  ranged plasma (+3 crit). PHASE 2 (HP ≤30%): rage permanente, melee
  con risonanza +2.
- **mbti_tendency**: I-N (visionario, criptico)

---

### Biome: `frattura_abissale_sinaptica` / `canyons_risonanti`

#### `eco_fenotipo`

- **name_it**: Eco-Fenotipo
- **name_en**: Echo Phenotype
- **role**: parasite (link a creatura ospite)
- **size**: tiny
- **trait_loadout**:
  - `filamenti_echo` (defensive — DR1)
  - `batteri_endosimbionti_chemio` (utility — rage on host kill)
  - `membrane_fotoconvoglianti` (defensive — DR2 MoS5+)
- **signature_hook**: si lega a una creatura in pack; quando l'host
  uccide, il parasite gain rage 3 turns e raddoppia la sua mossa.
- **mbti_tendency**: I-P (opportunista)

#### `voce_canyon`

- **name_it**: Voce del Canyon
- **name_en**: Canyon Voice
- **role**: nest_builder (statico, AOE control)
- **size**: large
- **trait_loadout**:
  - `voce_imperiosa` (control — panic 2 melee)
  - `canto_di_richiamo` (utility — rage on kill)
  - `camere_risonanza_abyssal` (offensive — +2)
- **signature_hook**: in pack con altri "voce_canyon" (2+) il panic
  dura 4 turni invece di 2 (synergy stack). Anchor di encounter.
- **mbti_tendency**: I-J (autoritaria)

---

### Biome: `badlands` / `pianura_salina_iperarida`

#### `sciacallo_arido`

- **name_it**: Sciacallo Arido
- **name_en**: Arid Jackal
- **role**: scavenger (pack 2-3)
- **size**: small
- **trait_loadout**:
  - `denti_seghettati` (offensive — bleeding)
  - `pelli_anti_ustione` (defensive)
  - `occhi_cinetici` (sensory)
- **signature_hook**: target preferito: bersagli con HP ≤ 50% (logic
  scavenger). Bonus +2 dmg implicito su low-HP target via AI policy.
- **mbti_tendency**: I-S (opportunista)

#### `mineralino_obtico`

- **name_it**: Mineralino Obtico
- **name_en**: Optic Mineralite
- **role**: prey (cristallino, fragile ma DR alto)
- **size**: tiny
- **trait_loadout**:
  - `ghiandole_minerali` (defensive — DR1)
  - `cuticole_neutralizzanti` (defensive — DR2 MoS5+)
- **signature_hook**: HP basso (3) ma DR3 cumulato vs MoS5+; fragile
  vs hit MoS<5 (raw damage passa intero). Decision puzzle.
- **mbti_tendency**: I-P (passivo)

---

## Apex tier

8 boss-class già descritti inline nei biomi (marcati come `apex` o
`huge` con phase change). Riassunto:

| ID                     | Biome                     | HP target | Phase change          | Lair action              |
| ---------------------- | ------------------------- | --------- | --------------------- | ------------------------ |
| `mamma_orsa_blu`       | cryosteppe                | 14        | ≤50% rage+taunt       | call cubs round 3        |
| `cacciatore_dorato`    | savana                    | 9         | ≤50% rage permanent   | summon `branco_cucciolo` |
| `verme_radice_pietra`  | caverna                   | 12        | round 3 emerge        | sotterraneo bypass       |
| `crostaceo_obsidiana`  | atollo_obsidiana          | 16        | ≤30% double fracture  | tile shatter wave        |
| `dragone_temporale`    | stratosfera_tempestosa    | 18        | ≤50% dive mode        | lightning AOE round 4    |
| `oracolo_polverizzato` | rovine_planari            | 15        | ≤30% rage perma       | reveal hidden truth      |
| `forgiatore_abissale`  | abisso_vulcanico          | 13        | round 4 reinforcement | magma surge tile         |
| `salamandra_magmatica` | dorsale_termale_tropicale | 12        | ≤40% bleeding 4 stack | thermal vent tile        |

## Encounter pack seeds

10 pacchetti di encounter con 2-5 creature mix-and-matched, role
balance, per playtest M14.

### Pack 1 — "Inseguimento sulla Pista" (savana, PT2)

`pista_corridor` × 2 (prey) + `cacciatore_dorato` × 1 (apex)

### Pack 2 — "Branco Notturno" (foresta_temperata, PT3)

`lupo_ombrelutto` × 3 + `picchio_acaro_specchio` × 1 (scout)

### Pack 3 — "Cantina Echo" (caverna, PT2)

`risuonatore_chiroptero` × 3 + `lichene_emette` × 2 (hazard tile)

### Pack 4 — "Imboscata Sotterranea" (caverna, PT4)

`verme_radice_pietra` × 1 (apex) + `lichene_emette` × 2

### Pack 5 — "Pantano Tossico" (palude, PT3)

`serpente_spirale` × 1 + `paludino_velenoso` × 3 + `coralluna_palustre` × 1

### Pack 6 — "Ondata Glaciale" (cryosteppe, PT4)

`lupo_glaciale_apex` × 2 + `linfo_glaciale` × 4 (mob layer)

### Pack 7 — "Calore d'Acciaio" (deserto_caldo, PT3)

`scorpione_sale` × 1 + `lucertola_solare` × 2 + `mantide_ottocchio` × 1

### Pack 8 — "Tempesta Aerea" (stratosfera_tempestosa, PT5 hardcore)

`dragone_temporale` × 1 (apex) + `aliante_tesla` × 3

### Pack 9 — "Sciame Algoritmico" (steppe_algoritmiche, PT3)

`sciame_byte` × 5 + `costrutto_logico` × 2

### Pack 10 — "Oracolo Polverizzato" (rovine_planari, PT5 BOSS)

`oracolo_polverizzato` × 1 (apex) + `costrutto_logico` × 2 + `sciame_byte` × 3

## Mutation gateway creatures

5 creature designate come "mutation showcase" — ogni una ha 2 mutation
chains documentate per dimostrare l'evoluzione:

### `cacciatore_dorato` (savana)

- Chain A: `circolazione_doppia` (T1) → `circolazione_supercritica` (T3)
  - Trigger: 3 kill consecutivi in 1 encounter
  - Effetto: rage durata da 2 → 3 turni
- Chain B: `voce_imperiosa` (T1) → `canto_di_richiamo` (T2)
  - Trigger: alleato della stessa specie ucciso adiacente
  - Effetto: panic on hit → rage on kill (shift comportamentale)

### `risuonatore_chiroptero` (caverna)

- Chain A: `ali_membrana_sonica` (T1) → `ali_fono_risonanti` (T2)
  - Trigger: 5 hit melee da elevato in 1 encounter
  - Effetto: panic 2 → stunned 1 (shift control type)
- Chain B: `antenne_microonde_cavernose` (T2) → `antenne_plasmatiche_tempesta` (T3)
  - Trigger: 1 critico ≥10 MoS
  - Effetto: stun on crit → +3 dmg crit

### `serpente_spirale` (palude)

- Chain A: `tentacoli_uncinati` (T1) → `coda_frusta_cinetica` (T1) replace
  - Trigger: 3 fracture stack in 1 encounter
  - Effetto: melee single-hit → reach 2 + fracture
- Chain B: `branchie_osmotiche_salmastra` (T2) → `branchie_metalloidi` (T2)
  - Trigger: 5 turni in biome non-acquatico
  - Effetto: DR2 vs hit → DR1 vs ranged + DR1 vs melee

### `lupo_glaciale_apex` (cryosteppe)

- Chain A: `artigli_ipo_termici` (T2) → `artigli_sghiaccio_glaciale` (T2)
  - Trigger: 3 stunned applicati in 1 encounter
  - Effetto: stun 1 turno → fracture 2 turni (shift type)
- Chain B: `pelli_anti_ustione` (T1) → `cartilagini_pseudometalliche` (T2)
  - Trigger: subito 5 hit critici in 1 encounter
  - Effetto: DR1 always → DR2 always

### `dragone_temporale` (stratosfera_tempestosa)

- Chain A: `ali_ioniche` (T1) → `ali_solari_fotoni` (T2)
  - Trigger: 1 critico ≥12 MoS
  - Effetto: stun on dive → +3 dmg dive MoS5+
- Chain B: `circolazione_supercritica` (T3) → NEW T4 `cuore_temporale`
  - Trigger: kill alleato della stessa specie (sacrificio)
  - Effetto: rage 3 → rage permanente (game-changer mutation)

## Open questions

1. **Naming consistency**: usare sempre nomi italiani (es. "Cacciatore
   Dorato") o accettare hybrid (es. "Coda Whip")? Decisione: italiano puro.
2. **Mutation gating**: i mutation chains dovrebbero essere visibili al
   player o nascosti come "evolution surprise"? Proposta: 1 chain visibile
   - 1 nascosta per creature.
3. **Apex HP scaling**: `dragone_temporale` HP=18 supera i tutti gli
   altri. È OK come "boss finale stagionale" o serve cap a 16? Da
   playtestare in PT5.
4. **NEW_TRAIT_PROPOSAL count**: 4 nuovi trait proposti (`corno_di_caccia`,
   `echo_pulse`, `feromoni_assalto`, `cuore_temporale`). Da aggiungere al
   glossary in M14 quando i loro effect.kind sono pronti.
5. **Encounter pack PT calibration**: i PT (party tier 1-5) sono stime;
   richiedono N=10 batch sim per validare win rate target 50-70% PT2-3,
   30-50% PT4, 15-25% PT5 hardcore.

## Cross-references

- `data/core/traits/glossary.json` (275 entries post 2026-04-25)
- `data/core/traits/active_effects.yaml` (111 trait mechanics)
- `data/core/biomes.yaml` (20 canonical biomes)
- `data/core/species.yaml` (existing canon, no conflict)
- `packs/evo_tactics_pack/data/species/<biome>/` (per-biome species dirs)
- `data/core/forms/mbti_forms.yaml` (16 MBTI forms — alignment hints)
- `docs/planning/2026-04-25-status-effects-roadmap.md` (status v2 roadmap)
