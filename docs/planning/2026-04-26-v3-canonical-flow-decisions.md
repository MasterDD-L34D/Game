---
title: 'V3 Canonical Flow — Design decisions 2026-04-26'
workstream: planning
category: design-synthesis
status: draft
owner: master-dd
created: 2026-04-26
authority_level: A3
tags:
  - design-flow
  - worldgen
  - aliena
  - skiv
  - nido
  - tribe
  - leviatano
  - claude-code-handoff
related:
  - docs/core/00-SOURCE-OF-TRUTH.md
  - docs/core/90-FINAL-DESIGN-FREEZE.md
  - docs/planning/2026-04-20-integrated-design-map.md
  - docs/museum/galleries/worldgen.md
---

# V3 Canonical Flow — Design decisions 2026-04-26

> **Scopo.** Capture canonical delle decisioni di design prese in sessione 2026-04-26 (master-dd + Claude). Sintesi di 5 agent research + 4 quick-win PR + 5 follow-up agent in-flight. Da promuovere a SoT v6 dopo review.
>
> **Autorità.** A3 sintesi. In conflitto vince SoT v5 (oggi) o v6 (dopo promozione di questo doc).

## TL;DR

1. La worldgen vera (4-livelli bioma → ecosistema → foodweb → meta-network) era **dato canonical da 5 mesi, runtime ZERO**. Sessione di oggi ne ha aperto 4 wire runtime (PR #1862-#1865) + curato 7 museum card + lanciato 5 follow-up.
2. **6 design call** chiuse oggi: worldgen pattern (ITB hand-made + condizioni generative), assi Form (4 MBTI engine + 5 axes UI surface ibrido), A.L.I.E.N.A. (motore invisibile + wiki in-game progressiva + Skiv come voce diegetic), Forma (16 MBTI archetype + Forma I-X anatomical = ortogonali), lore alien-event (promote mutagen exploration to canon), compromessi accettati (failure as lore, XP invisible, map voto macro).
3. **1 breakthrough conceptuale**: tribe = lineage emergent, NON layer aggiuntivo. Job runtime resta + tribe emerge da catena Nido→offspring→`lineage_id`.
4. **Quick wins shipped oggi**: 4 PR (`#1862` role_templates spawn bias, `#1863` Skiv lifecycle visible TV, `#1864` bioma diff_base→pressure, `#1865` 16 starter_bioma trait + endpoint).
5. **Sprint pipeline pronto**: Telemetria VC compromesso (in volo, ~6h), Boss Leviatano 3-ADR draft (in volo), Skiv narrator integration (in volo). Next big rock: Sprint Nido Path A (~23h, 4 sub-sprint sequenziali).

## 1. Le 6 design call chiuse

### 1.1 Worldgen pattern: ITB hand-made + condizioni generative ✅

Source: agent `pcg-level-design-illuminator` (2026-04-26 mattina) — anti-pattern UO ecosystem simulation runtime. Encounter restano **hand-made** (Into the Breach), worldgen **non genera la mappa tattica** — genera le **condizioni**: quale biome è attivo, quali cross-events modificano pressure/hazard, quale subset di spawn è ecologicamente plausibile.

**Implications**:

- biomeSynthesizer continua a generare biomi sintetici per varietà
- meta_network è **dato campagna routing**, non simulation runtime
- foodweb = constraint statico spawn (whitelist trophic tier), non simulazione
- cross-events propagation = **modifier flat** su pressure/hazard del round (Rimworld pattern), NON simulation live (UO 2000 fail)

Reference: [docs/reports/2026-04-26-worldgen-pcg-audit.md](docs/reports/2026-04-26-worldgen-pcg-audit.md)

### 1.2 Assi Form: ibrido 4 MBTI engine + 5 axes UI surface ✅

Source: design call user 2026-04-26 sera.

- **Engine**: 4 MBTI canonical (E_I, S_N, T_F, J_P) — già wired in `vcScoring.js` con doppio iter
- **UI surface**: 5 axes player-felt creature-themed (Simbiosi/Predazione, Esplorativo/Cauto, Agile/Robusto, Solitario/Sciame, Memoria/Istinto)
- **Mapping** preliminare: Simbiosi/Predazione ≈ T_F · Solitario/Sciame ≈ E_I · Esplorativo/Cauto ≈ S_N+J_P · Agile/Robusto = nuovo asse fisico stat-based · Memoria/Istinto = nuovo asse cognitivo derivable
- 5 swipe Form micro-scenari concreti (user proposal v2) chiudono in **15s totali**, output sui 5 axes UI surface, retroage su 4 MBTI engine via mapping

Reference: [docs/reports/2026-04-26-telemetria-vc-repo-industry.md](docs/reports/2026-04-26-telemetria-vc-repo-industry.md) (agent text, file follow-up)

### 1.3 A.L.I.E.N.A. + wiki + Skiv-narrator ✅

Source: design call user 2026-04-26 sera + SoT §21 + `docs/skiv/CANONICAL.md`.

**3 layer concettuali separati**:

1. **A.L.I.E.N.A.** = motore invisibile autoriale (worldgen, foodweb constraints, narrative engine driver). Player non la vede, non la nomina, non interagisce. (SoT §21 conserved)
2. **Wiki in-game progressiva** = consultabile dal player, si sblocca pian piano ricordando/seguendo le scelte. Pattern Hades Codex. NUOVO. Effort design + runtime ⏳.
3. **Skiv-archetype** = pattern canonical narratore+compagno. Voice rule: prima persona, metafore bioma-specifiche, all'"allenatore" (user), closing rituale. **Istanza per run** generativa (avatar+nome+specie variano dalla worldgen, schema persiste).

**"Flint" droppato** dal mio v2 — sostituito da Skiv-archetype.

Reference: agent `skiv-narrator-companion-integration` (in volo) report `docs/reports/2026-04-26-skiv-narrator-companion-integration.md` ⏳.

### 1.4 Forma — 2 dimensioni ortogonali, naming TBD ✅

Source: design call user 2026-04-26 sera.

- **Dimension 1: 16 MBTI Forms** = chi sei (temperamento). Stub `22-FORME_BASE_16.md` (16 LOC), data dispersi.
- **Dimension 2: Forma I-X / lifecycle** = quanto sei sviluppato (complessità anatomica). Skiv canonical 5 fasi: hatchling/juvenile/mature/apex/legacy.

**Sospetto**: Forma I-X = lifecycle phase ribattezzata. Verifica + naming integration in volo.

Reference: agent `forme-naming-integration` (in volo) report `docs/reports/2026-04-26-forme-naming-integration.md` ⏳.

### 1.5 Lore alien-event: promote exploration to canon ✅

Source: design call user 2026-04-26 sera + agent `lore-alien-event-research` 2026-04-26.

**Status**: lore alien-event NON canonical (premessa narrativa ufficiale è "fantastico bio-plausibile, non magico"). Quello che assomiglia è **EVENTO MUTAGENO** in vertical slice archived `Vertical Slice - Minute 2 Combat.html`. **Concept exploration, not shipped**.

**Decision**: promuovere **evento mutageno** da exploration a canon. Effort: ~2-4h design doc + ~12-16h runtime mutation system M14 wire.

**Plus**: re-dig lore in **swarm-drop docs** (data/external/chatgpt, codex, ai-station satellites). User certo che esiste materiale aggiuntivo. Agent `swarm-drop-lore-redig` in volo ⏳.

Reference: [docs/reports/2026-04-26-lore-alien-event-research.md](docs/reports/2026-04-26-lore-alien-event-research.md) + report follow-up swarm-drop.

### 1.6 Compromessi accettati ✅

User: "Accetto tutti i compromessi" (2026-04-26 sera).

| Tensione user vs repo                                   | Compromesso accettato                                                                                                                  |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| User: no game-over · Repo: hardcore collapse            | **Failure as lore** — squadra non muore meccanicamente, run può fallire → lore persistent next-run                                     |
| User: no XP visible · Repo: 84 perks XCOM EU/EW shipped | **XP resta runtime, invisibile su phone**, perk pick come scelta narrativa al level-up ("La tua creatura ha imparato qualcosa")        |
| User: map travel non manuale · Repo: 12 archi typed     | **Voto macro** (riposa/esplora/spingi) → sistema sceglie arco compatibile con voto + composizione squadra + bridge species disponibili |

## 2. Breakthrough — Tribe = lineage emergent

Source: convergenza agent `tribe-mechanic-discovery` + `nido-pokopia-housing-pattern` 2026-04-26.

> **Tribe non è un layer aggiuntivo. È la conseguenza emergente della catena mating: Nido → offspring con `lineage_id` → catena multi-generazionale → N units stesso lineage = tribù implicita.**

- **Job resta runtime** (vanguard/skirmisher/etc.) come specializzazione tattica
- **Tribe emerge dal lignaggio** come identità diegetic di gruppo
- Sono **ortogonali**: stesso job in tribe diverse, stessa tribe con job diversi
- **Path B "tribe = aggregato species" (~25h) NON serve** se andiamo emergent
- "Clan Araldo" del v1 user = istanza concreta di questa tribù (12 Polpi del bioma con lineage condiviso)

**Effort**: ~5h Sprint D dell'OD-001 Path A wire (lineage chain).

References:

- [docs/reports/2026-04-26-tribe-mechanic-discovery.md](docs/reports/2026-04-26-tribe-mechanic-discovery.md)
- [docs/reports/2026-04-26-nido-pokopia-housing-pattern.md](docs/reports/2026-04-26-nido-pokopia-housing-pattern.md)

## 3. Flusso V3 — 18 beat sintetico

Diff vs v2 (mio) e v1+v2 (user). Beat invariati = come prima.

### Pre-game

- **B0** Patto stanza: codice 4-letter (no QR shipped). Mentre player joinano: 6 cerchi vuoti pulsano TV. _"Non c'è ancora un pianeta. C'è il vostro pensiero."_

### Form personale + worldgen Form-driven

- **B1** 5 swipe micro-scenari (15s) → 5 axes UI surface
- **B2** ⚡ Worldgen visibile DOPO Form. Punti-Form proiettano su matrice compatibilità. A.L.I.E.N.A. genera 5-6 biomi proporzionati. Voce **Skiv-archetype** (istanza generata) commenta diegetic.
- **B3** ⚡ Generazione foodweb runtime: ogni bioma popolato con role_templates ecologici (apex/keystone/bridge/threat/event) — wired QW3 PR #1862
- **B4** ⚡ Bioma di approdo per cluster: ogni player atterra nel bioma più affine al Form. Specie assegnata = istanza role_template. Forma I-X (lifecycle phase) iniziale = giovane/maturo selezionabile.

### Onboarding NON-tutorial

- **B5** ⚡ Test sociale clan emergent: bioma di approdo ha clan apex generato. Player rifiutati ritualmente. Test ecologico mini-puzzle (aiuta/ostacola/ignora). 3 esiti shifano Form di squadra.

### Combat round simultaneo

- **B6** Round model M15: planning condiviso 60-90s → commit → resolve sequenziale ordinato. Effetti **visibili sulla TV solo post-commit**.
- **B7** ⚡ Asymmetric world info per phone: ogni player vede world info DIVERSE in base a sensi/cognizione della propria creatura. NUOVO breakthrough.
- **B8** ⚡ Cross-event mid-encounter come scena: modifier silenzioso + cambio diegetic visibile (no popup numerico).
- **B9** ⚡ Memory_fog R2/R3 + scambio carte: hazard escalation premia improvvisazione.

### Debrief in-world + Tri-sorgente

- **B10** Debrief in-world 30s: voce Skiv-archetype poetic.
- **B11** ⚡ Form personale shift via Telemetria VC. Phone mostra una frase poetica + bar dell'asse spostato. NO numeri.
- **B12** ⚡ Tri-sorgente reward (3 carte da Contesto + Identità + Azioni recenti) + Skip → Frammenti Genetici **spendibili nel Nido**.

### Nido — Base che mancava

- **B13** ⚡ Nido sbloccato via biome_arc_completed + ≥3 missioni nel bioma affinity. Pattern Pokopia + Stardew + Citizen Sleeper. Sempre accessibile da menu tra missioni. Skiv eccezione: itinerante 2-anchor.
- **B14** ⚡ Lineage chain → tribe emergent. Offspring eredita `lineage_id` + 2 gene_slots da genitori + 1 mutazione ambientale.

### Campaign — meta-network reveal

- **B15** ⚡ Mappa campagna = meta_network_alpha reale (5 nodi + 12 archi typed). Player vota macro-direzione. Sistema sceglie arco basato su voto + composizione squadra + bridge species.
- **B16** ⚡ Loop con propagation memory: ecosystem state degrada in biomi "feriti" cumulativamente.

### Boss — Leviatano Risonante (canonical)

- **B17** ⚡ Risveglio del Leviatano: 3 strati canonical pool wired (`fotofase_synaptic_ridge` / `crepuscolo_synapse_bloom` / `frattura_void_choir`). 3 esiti aperti accordo/ritirata/combat. Schema multi-stage + parley enum + world-state persistence in 3 ADR draft (in volo).

### Spegnimento

- **B18** ⚡ Failure as lore. Squadra non muore meccanicamente, run può fallire → epilogo Skiv 60s che traduce fallimento in lore persistente. Wiki si aggiorna. Stato meta-network degradato.

## 4. Open design questions

Pendenti, aspetto chiusura.

| ID  | Question                                                                                                                   | Owner                           | Note                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| Q1  | Mapping concreto 5 axes UI ↔ 4 MBTI engine — formula, edge case Agile/Robusto, Memoria/Istinto                            | master-dd + agent telemetria VC | Iter2 default ON gestisce 4 MBTI; serve definire i 5 axes UI |
| Q2  | Wiki in-game pattern Hades Codex — schema entry, unlock trigger, persistenza cross-run                                     | master-dd                       | ⏳ agent skiv-narrator può proporre pattern                  |
| Q3  | Forma I-X naming canonical (5-stage Skiv vs 10-stage user proposal)                                                        | master-dd                       | ⏳ agent forme-naming in volo                                |
| Q4  | Evento mutageno spec — cosa è esattamente, come trigger in-encounter, effetti runtime                                      | master-dd                       | ⏳ agent swarm-drop-redig in volo                            |
| Q5  | Skiv-istanza per bioma — esempi: Echo-Wing foresta, Algida cryosteppe, Skiv canonical desertico. Solo nomi o profili full? | master-dd                       | ⏳ agent skiv-narrator                                       |
| Q6  | OD-001 Path A scope mini accept (4 sub-sprint ~23h)?                                                                       | master-dd                       | Effort già estimato                                          |
| Q7  | 3 ADR Leviatano firma — multi-stage / parley / world-state                                                                 | master-dd                       | ⏳ agent boss-leviatano-research draft                       |

## 5. Quick wins shipped oggi (4 PR open su main)

| PR                                                       | Scope                                                             | Test nuovi | AI regression |
| -------------------------------------------------------- | ----------------------------------------------------------------- | ---------- | ------------- |
| [#1862](https://github.com/MasterDD-L34D/Game/pull/1862) | role_templates → biomeSpawnBias (QW3 M-013)                       | 26         | 311/311 ✅    |
| [#1863](https://github.com/MasterDD-L34D/Game/pull/1863) | Skiv lifecycle + aspect_token visible canvas (QW4)                | 23         | 311/311 ✅    |
| [#1864](https://github.com/MasterDD-L34D/Game/pull/1864) | bioma diff_base + stress_modifiers → pressure runtime (QW1 M-018) | 12         | 311/311 ✅    |
| [#1865](https://github.com/MasterDD-L34D/Game/pull/1865) | 16 starter_bioma trait + formPackRecommender wire (QW2 M-017)     | 24         | 311/311 ✅    |

Pillar impact: P3 ↑ (role_templates), P4 ↑ (16 starter_bioma), P6 ↑ (diff_base scale), P2 + Skiv ↑ (lifecycle visible).

## 6. Sequencing recommendation per next sprint

Ordine consigliato (bias: low-effort high-impact first, dependencies resolved):

1. **Wait** — chiusura 5 agent in volo (Telemetria VC impl + 4 research). ~30-60min totali.
2. **Sprint Nido Path A** (~23h, 4 sub-sprint sequenziali). Sblocca tribe emergent + Tri-sorgente Frammenti Genetici spend + meta-loop completo. **Highest-impact next step**.
3. **Sprint v6 SoT promotion** + naming integration (Forma + 16 MBTI + 5 axes mapping). Dipende da agent forme-naming.
4. **Sprint Lore alien-event** (~14-20h) — promote evento mutageno + integrazione SoT §7. Dipende da agent swarm-drop-redig + master-dd decision Q4.
5. **Sprint Boss Leviatano A → B → C** (~75-90h totali, 3 ADR sequenziali). Highest-effort, biggest dramatic moment. Dipende da master-dd ADR sign-off.

**Reasoning**:

- Nido prima perché engine 469 LOC esiste da 4 mesi senza UI — gap maximum. Apre tribe emergent breakthrough automaticamente.
- Lore mutagen prima di Leviatano perché Leviatano è l'incarnazione del mutagen (presumibilmente). Ordine narrativo.
- Boss Leviatano alla fine perché 75-90h è impegno grosso che richiede tutti i precedenti chiusi.

## 6.1 Master-DD decisions captured 2026-04-26 sera (post-survey)

User ha risposto a 15 design call survey 2026-04-26 sera (post-Nido sprint shipping). Decisioni below superano i defaults proposti dove diverso. **Status: A3 sintesi → promotable a SoT v6**.

### A. Forme naming

- **A1** ✅ **10 stadi (I-X)** — NON 5 canonical. Granularità fine-grained richiesta. Sub-divisione delle 5 macro-fasi Skiv (`hatchling/juvenile/mature/apex/legacy`) o scala parallela — agent design in volo decide.
- **A2** ✅ **Consulta `docs/core/00E-NAMING_STYLEGUIDE.md`** + applica naming convention canonical
- **A3** ✅ **Dual layer** (tier generico + specie-specifico) **+ valuta opzione (d) cross-dimension** — label finale legata a 6+ dimensioni (Forma + Stadio + Sentience + Lineage + Bioma + Mutation). Esempio aspirazionale: _"Skiv (Stadio III · Apprendista) — Forma Analista (INTP, Tier 0.6) — Lineage KRNA-3 — Adattato Deserto"_

### B. Skiv narrator+companion

- **B1** ✅ **Pool ricco (8-12 nomi per bioma) + combo specie/tipo/bioma generata dalla worldgen** — non lookup hardcoded. Selezione vincolata: `worldgen.primary_biome → biome_pool[species_id × name_pool × closing_ritual] → istanza`
- **B2** ✅ **Codex unlock progressivo Hades-style** (encounter completato → entry unlock + Skiv-instance note diegetic)
- **B3** ✅ **Ibrido**: Skiv (`Arenavenator vagans` / `dune_stalker`) canonical SOLO per allenatore. Altri allenatori → istanza desertica con nome diverso pescato dal pool

### C. Boss Leviatano — 3 ADR sign-off

Tutti 5 decision points C1-C5 SIGNED OFF. ADR `proposed → accepted` ready (post-Nido sequencing C5).

- **C1** ✅ `enter_condition` flessibilità: **HP + turn count + objective** (pattern espressivo, vertical slice ha "round 3 hazard" + "HP threshold collapse")
- **C2** ✅ `retreat` outcome: **fail-state-lite** (penalty light, run continues)
- **C3** ✅ `parley` threshold: **5 azioni simbiotiche/comunicative** (vertical slice baseline)
- **C4** ✅ `WorldState` scope: **ibrido** (alcune cose campaign-level, altre account-level — es. lore unlocks account, biome health campaign)
- **C5** ✅ Sequencing: **Nido FIRST (~23h, shipped) → Leviatano (~75-90h)** — confermato

### D. V3 Open Questions residui

- **D1** ⏳ Mapping 5 axes UI ↔ 4 MBTI engine: **research industry pattern in volo** (agent `balance-illuminator`). User non ha certezze, vuole evidence prima di committare. Pattern candidates: Creatures, Spore, B&W, Pokemon natures+IVs, CK 2-3, DF Big-Five, Sims, Wildermyth.
- **D2** ✅ Wiki in-game pattern: **ibrido container Hades-style + content schema A.L.I.E.N.A. 6-dimensioni** (Ambiente / Linee evolutive / Impianto morfo-fisiologico / Ecologia / Norme socio / Ancoraggio narrativo). Skiv-instance note diegetic per entry come Hades Codex Zagreus pattern.
- **D3** ✅ Mutagen events: **a+b combinati** — pull from vertical-slice canon promotion + write 2-3 NEW spec per varietà. Anti-pattern UO: NON simulation runtime, eventi = modifier flat su pressure/hazard.

### Sprint pipeline post-decisions

| Sprint                                 |              Status               | Trigger                                            |
| -------------------------------------- | :-------------------------------: | -------------------------------------------------- |
| **OD-001 Path A** (Nido 4 sub-sprint)  |   ✅ shipped 4 PR (#1874-#1877)   | Done                                               |
| **Forme 10-stadi naming spec**         |      ⏳ design agent in volo      | Output: doc + naming proposal                      |
| **Skiv worldgen-aware companion pool** |      ⏳ design agent in volo      | Output: pool YAML + integration spec               |
| **5-axes UI mapping research**         |     ⏳ research agent in volo     | Output: industry pattern + raccomandazione formula |
| **Wiki Hades + ALIENA 6-dim schema**   |      ⏳ design agent in volo      | Output: schema YAML + 1 entry esempio              |
| **Mutagen events variety pack**        |      ⏳ design agent in volo      | Output: 3-4 events YAML draft + spec               |
| **Boss Leviatano A→B→C**               | 🟡 ADR signed, pending Nido merge | Effort: ~75-90h post-Nido                          |
| **Telemetria VC compromesso**          |        ✅ shipped PR #1868        | Done                                               |

## 6.2 Master-DD batch 2 decisions 2026-04-26 sera (post 5 specs)

User survey 15 questions risposta (master-dd 2026-04-26 sera, post-5-specs delivery):

- **N1** ✅ `Stadio I-X` (NOT Forma) — collisione MBTI canonical evitata
- **M1** ✅ 3-axes radar Personalità + Agile/Memoria stat scheda Specie. **Vincolo UX**: collegamento UI deve essere intuitivo (no jargon disconnesso)
- **M2** ✅ **Stat ibrido (base specie + modifier perk)** — user pick: max variabilità + unicità. Validation industry in research agent in volo
- **S1** ⏳ Skiv legato campagna MA esportabile come **compagno tamagotchi-like innovativo** — research agent in volo per pattern moderno (non Tamagotchi 1996 base)
- **S2** ✅ Avatar diverso per bioma (silhouette specie del bioma)
- **S3** ✅ Skiv-instance **visibile sulla TV agli altri player** + **interagibile dal phone** del singolo player. Mix shared identity + private interaction
- **W1** ✅ Nier-style staged unlock **MA** "deve essere possibile vedere quasi tutto in una sola campagna QUASI almeno a livello di team" — single team campaign può idealmente unlock ~80%+ entries
- **W2** ⏳ Skiv-note 44 specie non-Skiv: user incerto. **Inferenza Claude da incrocio risposte precedenti** (B1 worldgen-aware + B3 ibrido): per le 44 specie non-`dune_stalker`, voice è dell'**istanza Skiv del run corrente** (es. Echo per foresta parla di specie foresta). Voice template adattato al bioma del run.
- **W3** ✅ Tab Lignaggi **NON include ancestors OD-011** (297 neuroni) — user clarification: ancestors WIP non passato through style guide, ~90% repo work pending review style. Tab Lignaggi solo da mating Nido chain.
- **E1** ✅ Trait `strappo_planare` = nuovo trait (crea spec)
- **E2** ⏳ user "non capito" → default prudente (c) aspetta sprint M14 wire dedicato
- **E3** ✅ Bias bioma `nodo_neurale_rilascio` ampliato a tutti biomi `diff_base >= 4` (12 biomi totali). Applicato in `data/core/events/mutagen_events.yaml`.
- **P1** ✅ ADR Boss Leviatano `proposed → accepted` (3 ADR) 2026-04-26 sera
- **P2** ✅ Merge order accept (Wave A → B → C → D → E). Esecuzione pending P2-execution authorization
- **P3** ✅ Promote v3 → SoT v6 **dopo prossima review master-dd** (NOT subito, NOT dopo merge — aspetta review formale)

### Open clarifications residui

- **W2** Skiv-note 44 specie non-Skiv: validation user su inferenza incrocio (voice istanza Skiv del run = osservatore esterno della specie target). Default proposto se silenzio: applico inferenza.
- **E2** temp_traits schema spiegazione: schema dove memorizzare modifier temporanei eventi mutageni (es. `frenesia 3 round` da `nodo_neurale`). Default scelto (c) aspetta M14 wire = riusa M14 mutation_catalog quando wired runtime.
- **P2 execution**: confermi merge autonomous (Claude esegue Wave A→D) o manual (master-dd via GitHub UI)?

## 7. Reference inventory

**Reports created today**:

- [docs/reports/2026-04-26-worldgen-pcg-audit.md](../reports/2026-04-26-worldgen-pcg-audit.md)
- [docs/reports/2026-04-26-creature-emergence-audit.md](../reports/2026-04-26-creature-emergence-audit.md)
- [docs/reports/2026-04-26-lore-alien-event-research.md](../reports/2026-04-26-lore-alien-event-research.md)
- [docs/reports/2026-04-26-boss-event-files-audit.md](../reports/2026-04-26-boss-event-files-audit.md)
- [docs/reports/2026-04-26-tribe-mechanic-discovery.md](../reports/2026-04-26-tribe-mechanic-discovery.md)
- [docs/reports/2026-04-26-nido-pokopia-housing-pattern.md](../reports/2026-04-26-nido-pokopia-housing-pattern.md)

**Reports in flight (5 agents)**:

- `2026-04-26-telemetria-vc-repo-industry.md` (Sprint impl agent + research già completato inline)
- `2026-04-26-lore-alien-event-swarm-redig.md` (re-dig)
- `2026-04-26-forme-naming-integration.md` (Forma I-X + 16 MBTI naming)
- `2026-04-26-skiv-narrator-companion-integration.md` (Skiv pattern verify)
- `2026-04-26-boss-leviatano-research-summary.md` + 3 ADR + sprint plan

**Museum cards curated**:

- 7 worldgen cards (M-2026-04-26-012 through M-018) + 1 gallery `docs/museum/galleries/worldgen.md`
- Score range 3/5 → 5/5 con anti-pattern + reuse path tier 1/2/3

**Authority**: A3 sintesi. Promotable a SoT v6 dopo review master-dd.
