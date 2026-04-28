---
title: Final Design Freeze v0.9 — Evo Tactics
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: '2026-04-28'
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Final Design Freeze v0.9 — Evo Tactics

## 0. Scopo e perimetro normativo

Questo documento e' la **sintesi di prodotto** di Evo Tactics: dichiara lo scope shipping, i sistemi core congelati, le regole di tuning e le dipendenze tra repo. Non e' una specifica tecnica completa e non sostituisce gli strumenti di verita' del repo. La sua autorita' relativa e' definita in [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) (livello **A3**).

Il freeze **non sostituisce**:

- la governance documentale ([`docs/governance/*`](../governance/README.md)) per naming, registry e stato dei file (**A0**);
- gli ADR e gli hub canonici per i confini architetturali e di workstream (**A1**);
- i core data/YAML e gli schema per la verita' meccanica e numerica (**A2**).

Il freeze e' stato consolidato usando come base:

- la documentazione canonica del repo `Game` (visione, combat hub, ADR architetturali, roadmap);
- materiali sorgente esterni ora **gia' assorbiti nel repo** sotto `data/core/`, `packs/evo_tactics_pack/data/` e `docs/` (provenance storica: pacchetto parametrico `evo_tactics_param_synergy_v8_3` e devkit/validator `EvoTactics_FullRepo_v1.0`, non piu' usati come fonte runtime).

Obiettivo: trasformare documentazione sparsa in una decisione di produzione chiara, chiudendo scope, sistemi core, contenuti minimi, regole di tuning, validazione e dipendenze tra repo.

## 0.1 Roadmap & Execution Files

Il freeze va letto insieme al bundle esecutivo in [`docs/planning/`](../planning/):

- [`EVO_FINAL_DESIGN_ROADMAPS_INDEX`](../planning/EVO_FINAL_DESIGN_ROADMAPS_INDEX.md) — indice del bundle e ordine di lettura consigliato.
- [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — **leggere per primo** in caso di conflitto tra fonti.
- [`EVO_FINAL_DESIGN_MASTER_ROADMAP`](../planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md) — fasi, milestone, owner matrix.
- [`EVO_FINAL_DESIGN_MILESTONES_AND_GATES`](../planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md) — gate formali, exit criteria, rollback.
- [`EVO_FINAL_DESIGN_BACKLOG_REGISTER`](../planning/EVO_FINAL_DESIGN_BACKLOG_REGISTER.md) — task esecutivi per epic (FD-IDs).
- [`EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK`](../planning/EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md) — guida operativa per Codex / agenti.
- [`EVO_FINAL_DESIGN_GAME_DATABASE_SYNC`](../planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md) — piano cross-repo Game ↔ Game-Database.

## 1. Tesi di design

Evo Tactics va chiuso come **gioco tattico cooperativo a turni con progressione evolutiva leggibile**.

In termini pratici:

1. il **combat d20** è il nucleo da congelare;
2. la **progressione Specie × Job × Forma × telemetry/unlock** è il secondo asse da fissare;
3. i sistemi di **UI/telemetry** devono spiegare e validare il comportamento del gioco;
4. **Nido / Recruit / Mating** devono entrare come meta-slice controllata, non come simulazione totale;
5. `Game` resta il runtime source of truth; `Game-Database` resta CMS/taxonomy + import target, non fonte runtime.

## 2. Gerarchia delle fonti

La gerarchia completa delle autorita' e le regole di risoluzione conflitti sono in [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md). Questa sezione elenca solo le fonti che il freeze consulta direttamente.

### 2.1 Fonti primarie (canoniche, A1)

- [`docs/core/01-VISIONE.md`](01-VISIONE.md)
- [`docs/core/10-SISTEMA_TATTICO.md`](10-SISTEMA_TATTICO.md)
- [`docs/core/40-ROADMAP.md`](40-ROADMAP.md)
- [`docs/hubs/combat.md`](../hubs/combat.md)
- [`docs/combat/README.md`](../combat/README.md)
- [`docs/combat/round-loop.md`](../combat/round-loop.md) — shared planning → commit → ordered resolution (ADR-2026-04-15)
- [`docs/adr/ADR-2026-04-13-rules-engine-d20.md`](../adr/ADR-2026-04-13-rules-engine-d20.md)
- [`docs/adr/ADR-2026-04-14-game-database-topology.md`](../adr/ADR-2026-04-14-game-database-topology.md)
- [`docs/adr/ADR-2026-04-15-round-based-combat-model.md`](../adr/ADR-2026-04-15-round-based-combat-model.md)

### 2.2 Fonti secondarie operative (dati runtime, A2)

Path reali del repo `Game`, leggibili dal rules engine e dai validator:

- `data/core/species.yaml`, `data/core/biomes.yaml`, `data/core/mating.yaml`, `data/core/telemetry.yaml` — dataset runtime canonici.
- `packs/evo_tactics_pack/data/species/**` — set esteso species pack.
- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` — layer numerico (balance separato).
- `packs/evo_tactics_pack/data/balance/action_speed.yaml` — tabella speed modifier del round orchestrator (ADR-2026-04-15).
- `data/core/traits/active_effects.yaml` — registry dei trait attivi hidratati dal resolver.
- `packages/contracts/schemas/combat.schema.json`, `packages/contracts/schemas/traitMechanics.schema.json` — contratti di shape.

### 2.3 Fonti di supporto (tooling)

Validator e smoke tool veramente presenti nel repo:

- `services/rules/resolver.py`, `services/rules/round_orchestrator.py`, `services/rules/hydration.py` — rules engine Python.
- `services/rules/demo_cli.py` — CLI dimostrativa + smoke combat.
- `tools/py/game_cli.py` — validator datasets + ecosystem pack (`validate-datasets`, `validate-ecosystem-pack`).
- `tools/check_docs_governance.py` — validator docs (schema + registry + strict mode).
- `scripts/run_deploy_checks.sh` — gate di deploy.
- `tests/test_resolver.py`, `tests/test_hydration.py`, `tests/test_round_orchestrator.py` — regression pytest del rules engine.
- `tests/api/contracts-combat.test.js`, `tests/api/contracts-trait-mechanics.test.js` — contract tests lato Node.

## 3. Visione e promessa del prodotto

Visione dichiarata: “Tattica profonda a turni in cui come giochi modella ciò che diventi.”

Traduzione di design:

- il giocatore non sceglie solo abilità; costruisce identità ludica;
- il combattimento deve essere tecnico e leggibile;
- la progressione deve essere conseguenza del comportamento giocato, non solo della vittoria;
- ogni scelta build deve avere un costo, un contesto d’uso e una controparte.

## 4. Perimetro finale del prodotto

### 4.1 In scope per il freeze

- combat d20 a turni con risoluzione deterministica testabile;
- 4 specie base nel pacchetto attuale, con struttura estensibile a 6 nel target roadmap;
- 6 job base;
- forme / assi caratteriali / gating soft;
- telemetria VC + PF session projection;
- biomi base (desert, cavern, badlands) + tabelle incontro;
- director/regista per NPG dinamici;
- recruit / trust / mating / nido in forma slice;
- validazione schema + pack + spawn pack + quickstart GM.

### 4.2 Fuori scope per il freeze

- simulazione sociale profonda multi-generazionale;
- integrazione runtime HTTP completa con Game-Database;
- estensione indiscriminata di trait attivi oltre il set supportato dal resolver;
- UI totale e dashboard cross-repo in tempo reale;
- bilanciamento definitivo T4/apex senza iter di playtest.

## 5. Vincolo architetturale non negoziabile

- `Game` = runtime del gioco, rules engine, backend, cataloghi locali.
- `Game-Database` = CMS/taxonomy, editing, import target, REST read API.
- Oggi l’integrazione supportata è **unidirezionale**: Game → Game-Database via import.
- Il runtime del gioco continua a leggere file locali.
- Qualunque piano che richieda Game ← HTTP runtime dal Game-Database è fuori freeze e va trattato come ADR separato.

## 6. Core loop finale

Loop canonico:

1. scelta/brief del contesto;
2. setup build (Specie + Morph + Job + Forma/Gates);
3. missione tattica;
4. aggiornamento telemetry e PF session;
5. debrief con ricompense;
6. unlock / conversione PE→PI / seed / respec soft;
7. recruit/nido/mating quando le condizioni lo permettono;
8. iterazione build successiva.

Regola di governance: ogni feature deve dichiarare in quale punto del loop impatta. Se non impatta il loop, non entra nello scope del freeze.

## 7. Combat system finale

### 7.1 Nucleo canonico

- **iniziativa come reaction speed** (non piu' turn order rigido): semantica consolidata in [ADR-2026-04-15](../adr/ADR-2026-04-15-round-based-combat-model.md) e [`docs/combat/round-loop.md`](../combat/round-loop.md);
- **round loop** shared planning → commit → ordered resolution sopra il resolver atomico;
- 2 AP base + reazioni come intent first-class con trigger conditions;
- attacco d20 vs CD target;
- MoS con +1 step danno ogni +5;
- PT generati da roll alti e MoS;
- parry contestata (integrata nella pipeline del resolver o dichiarata come reaction intent);
- status effect fisici e mentali;
- terrain/facing/cover rilevanti.

### 7.2 Risorse di combattimento

- PT: budget di azione tattica; tuning base 3/turno nel pacchetto param;
- PP: risorsa di potenza per surge/abilità; max 3 salvo override;
- SG: barra burst 0..3, caricata nel corso dello scontro;
- PI: valuta di build;
- PE: valuta di progressione convertibile.

### 7.3 Resolver freeze

> ⚠️ **DEPRECATO 2026-04-19** (ADR-2026-04-19-kill-python-rules-engine). Runtime canonical Node `apps/backend/services/combat/` + `apps/backend/routes/session.js`. Python preservato solo riferimento spec storico. Vedi `services/rules/DEPRECATED.md`. **M12+ phase 3 removal pending**.

Il **resolver atomico legacy Python** (`services/rules/resolver.py`) supportava stabilmente:

- `resolve_action` — risoluzione atomica di una singola intenzione (attack / defend / parry / move / ability stub)
- `begin_turn` — reset AP/reactions per unita' + decay status + bleeding tick
- `resolve_parry` — parry contestata d20
- `apply_pt_spend` — consumo PT (`perforazione`, `spinta`)
- `apply_status` — applicazione status effect (bleeding/fracture/disorient/rage/panic)
- hydration da encounter/party a CombatState (`services/rules/hydration.py`)

Il **round orchestrator** (`services/rules/round_orchestrator.py`, ADR-2026-04-15) aggiunge il loop di round sopra il resolver atomico:

- `begin_round`, `declare_intent`, `clear_intent`, `commit_round` — fase planning preview-only
- `build_resolution_queue`, `resolve_round` — risoluzione ordinata deterministica
- `preview_round` — simulazione what-if su deep copy senza consumare il rng canonico
- `declare_reaction` — reazioni come intent first-class con trigger conditions (`event`, `source_any_of`)
- `compute_resolve_priority`, `action_speed`, `load_action_speed_table` — helper per il calcolo di priorita' dal balance pack YAML

Per i contratti di shape e le garanzie di determinismo vedi [`docs/combat/round-loop.md`](../combat/round-loop.md) e [`docs/combat/resolver-api.md`](../combat/resolver-api.md).

### 7.4 Status Phase-1

In scope:

- bleeding
- fracture
- disorient
- rage
- panic

Deferred:

- trait active_effects consumati come vere skill action di Fase 3 avanzata.

### 7.5 Formula tattica da fissare nel rulebook

Il rulebook finale deve definire una volta sola:

- formula CD target;
- formula damage step;
- ordine delle mitigazioni (armor/resistance/parry/status);
- timing begin_turn e tick di status;
- timing parry rispetto a hit e PT spend;
- stacking e cap.

## 8. Balance layer

### 8.1 Decisione

Il balance layer vive in `trait_mechanics.yaml` separato dai trait keeper YAML.

### 8.2 Implicazioni

Pro:

- il resolver legge numeri puliti;
- il test schema può garantire completezza;
- il tuning può evolvere senza rompere il catalogo semantico.

Contro:

- seconda fonte di verità;
- rischio drift;
- richiede procedura Balancer obbligatoria.

### 8.3 Regola operativa

Nessun playtest usato per decisioni di tuning finale è valido se:

- manca copertura completa dei trait core nel layer meccanico;
- i placeholder 0 non sono stati rivisti per il set shipping;
- i test contracts-combat e contracts-trait-mechanics non sono verdi.

## 9. Specie e struttura biologica

Pacchetto corrente:

- Dune Stalker
- Sand Burrower
- Echo Wing
- Rust Scavenger

Ogni specie definisce:

- biomi preferiti;
- morph budget max;
- hp_base;
- stat_mods base;
- requirement obbligatori per 5 slot: locomotion, offense, defense, senses, metabolism;
- suggested parts;
- likes/dislikes ambientali o tattici.

### 9.1 Decisione di freeze sulle specie

Le specie non sono solo skin: sono contenitori di budget, ecologia e identità tattica.

Quindi il freeze deve imporre:

- 5 slot morfologici obbligatori per tutti i PG giocabili;
- budget massimo inviolabile per specie;
- suggerimenti parte-specie come raccomandazione di onboarding, non hard lock;
- preferenze/disgusti usati come hook per social, recruit, mating e bioma modifiers.

### 9.2 Note di ruolo emergente

- Dune Stalker: predatore elastico e generalista d’imboscata;
- Sand Burrower: ambusher di sottosuolo/flanking;
- Echo Wing: controllo quota, ecosonar, mobilità fragile ma tecnica;
- Rust Scavenger: bruiser/scavenger con identità metallurgica e badlands affinity.

## 10. Morph design

I morph file definiscono parti con costo e identità funzionale. Il design finale deve trattarli come mattoni, non come talenti liberi.

### 10.1 Regole da fissare

- ogni build deve coprire i 5 ruoli morfologici minimi;
- il costo totale deve restare entro budget specie;
- i morph sono il primo asse di differenziazione del corpo;
- i trait e i job devono amplificare o deviare il corpo, non sostituirlo.

### 10.2 Esempi di funzione sistemica

- `echolocate` = sensi + sinergie con flanking/LoS oscurata;
- `ferrous_carapace` = difesa / identità badlands;
- `burst_anaerobic` = sprint / spike mobilità;
- `burrow_claws` = accesso tattico al posizionamento da sottosuolo;
- `glide_wings` = quota / mobilità / linee di tiro.

## 11. Job system finale

Set base presente nel pacchetto:

- skirmisher
- vanguard
- warden
- artificer
- invoker
- harvester

### 11.1 Regola di design

Ogni job deve avere:

- 1 fantasia di ruolo leggibile;
- 2 unlock Rank 1;
- 1 unlock Rank 2;
- 1 ultimate opzionale (quando prevista);
- costi PI chiari;
- uso PT/PP/SG coerente;
- almeno una sinergia naturale con almeno una specie e un bioma.

### 11.2 Ruoli finali

- Skirmisher = mobile DPS / positioning
- Vanguard = initiator / frontline tank
- Warden = controller / defender
- Artificer = support / utility / micro-resource
- Invoker = ranged blaster / directional control
- Harvester = resource/growth / meta-economy bridge

### 11.3 Decisioni chiave per job

- nessun job deve essere auto-sufficiente su tutto;
- ogni job deve dichiarare dove eccelle e dove dipende da setup o alleati;
- i job che creano risorse (Artificer, Harvester) vanno tenuti sotto controllo per non rompere il pacing del core combat.

## 12. Traits, surge e armi

### 12.1 Traits presenti nel pacchetto

- `backstab`
- `focus_frazionato`

### 12.2 Surge presenti

- `pierce`
- `spin`
- `chain`
- `pulse`
- `overdrive`

### 12.3 Armi presenti

- `twin_blades`
- `arc_rod`

### 12.4 Decisione di sistema

Le surge vanno trattate come micro-acceleratori tattici.

Regole:

- devono usare PT/PP/SG in modo leggibile;
- devono avere compatibilità arma esplicita;
- devono essere poche, identitarie e testabili;
- `overdrive` resta chiaramente marcata playtest-needed e non può definire da sola il meta.

## 13. Forme, assi caratteriali e profilo giocatore

### 13.1 Due layer distinti

1. **VC telemetry** — cosa fai in partita;
2. **PF session / MBTI axes** — come questi eventi proiettano lentamente il profilo.

### 13.2 Assi correnti

PF session usa:

- E
- N
- T
- P

Gli eventi aggiornano lentamente il profilo a fine sessione per evitare swing eccessivi.

### 13.3 Gating soft

`mbti_gates.yaml` conferma che i gate non sono hard lock.

Regola finale:

- il giocatore può forzare una fantasia job non perfettamente allineata;
- il costo è una penalità di primo turno/scena o un sovrapprezzo PI;
- questo mantiene agency senza cancellare l’identità del sistema.

### 13.4 Decisione di freeze

Le forme non devono diventare psicologia simulata.
Sono un dispositivo di:

- onboarding;
- profiling adattivo opzionale;
- raccomandazione build;
- leggera modulazione reward/penalty.

## 14. Enneagramma

Il pacchetto integra i temi 1..9 come add-on.

### Decisione finale

- Enneagramma resta modulo attivo ma secondario;
- va usato per micro-trigger di ritmo (+PE, +PP, +AC, support, ecc.);
- non deve dominare il bilanciamento primario del combat;
- il profilo `alt` e gli spawn pack v7/v8 sono validi come varianti di sperimentazione, non base immutabile finché non emergono dati di playtest.

## 15. Telemetria finale

### 15.1 VC metrics attive

- aggro
- risk
- cohesion
- setup
- explore
- tilt

### 15.2 Regola d’uso

La telemetria serve a:

- leggere il comportamento del party;
- guidare suggerimenti adattivi;
- alimentare unlock e debrief;
- offrire dati al tuning.

Non deve essere presentata come diagnosi psicologica.

### 15.3 PF session

Gli eventi di sessione aggiornano lentamente assi E/N/T/P e informano gates e affinità.

### 15.4 Decisione di freeze

- VC è sistema di osservazione + reward routing;
- PF session è sistema di proiezione lenta dell’identità;
- nessun sistema live deve punire il giocatore in modo opaco o permanente.

## 16. UI/HUD finale

La roadmap canonica include una “UI identità”.

### 16.1 Cosa deve mostrare obbligatoriamente

In missione:

- PT / PP / SG
- AP e stato reazioni
- condizioni/status
- bonus da bioma attivi
- sinergie attive rilevanti
- warnings di positioning (flank, obscured, cover, parry disponibile)

Nel debrief:

- andamento VC
- eventi PF_session
- PE/PI/seed ottenuti
- unlock sbloccati o prossimi
- cambi di profilo/forma suggeriti

Nel meta:

- specie e budget morph usato
- gates soddisfatti/non soddisfatti
- recruit/nest/mating prerequisites

### 16.2 Decisione

La UI deve chiarire il perché delle conseguenze, non solo l’esito.

## 17. Biomi finali

Set attuale:

- Desert
- Cavern
- Badlands

Ogni bioma definisce:

- hazard;
- preferenze specie/job;
- modifier tattici;
- reward o token scene;
- collegamenti con nest/mating.

### 17.1 Decisione di design

Il bioma non è sfondo: è un moltiplicatore del gameplay.

Regole:

- ogni bioma deve modificare almeno visibilità, mobilità o resource economy;
- ogni bioma deve favorire almeno una specie e un job;
- l’hazard non deve impattare oltre ~10–20% delle azioni totali di scena, salvo encounter speciali.

## 18. Director / Regista

Il Regista genera NPG dinamici in base a:

- bioma
- archetipo job
- forma/tratti
- agenda
- hook sociali

### 18.1 Output minimo finale per NPG

- species
- morph budget
- job con 1–2 unlock
- 1–2 traits
- gear basilare
- tabella comportamento

### 18.2 Decisione di freeze

Il Director deve servire tre scopi soltanto:

1. generare combattimento leggibile;
2. generare varietà controllata;
3. aprire possibilità di social/recruit.

Non deve ancora diventare un sistema narrativo autonomo con branch troppo profondi.

## 19. Reward economy finale

### 19.1 Valute

- PE = progressione accumulata
- PI = build currency
- Seed = respec / breeding / growth economy
- PP/SG = combat layer resources

### 19.2 Conversioni e reward

- 5 PE → 1 PI a checkpoint
- elite/boss e scoperte area alimentano PE/PI/seed
- Harvester e Mating possono generare seed

### 19.3 Regola di stabilità economica

La stessa valuta non deve fare troppe cose nello stesso layer.

Perciò:

- PT/PP/SG restano da missione/scena/combat;
- PE/PI restano macro progressione;
- seed restano ponte tra crescita organica, respec soft e meta-sistemi.

## 20. Recruit / Affinity / Trust

### 20.1 Scale attuali

- Affinity: -2..+2
- Trust: 0..5

### 20.2 Gate finali

- Recruit: Affinity ≥ 0 e Trust ≥ 2 salvo eccezioni
- Mating: Trust ≥ 3 + requisiti nido

### 20.3 Decisione

Recruit e trust devono essere leggibili, mission-driven e non eccessivamente grindosi.

## 21. Nido / Mating / meta-progression

### 21.1 Stato del pacchetto

Esistono già:

- requisiti nido;
- collegamenti bioma↔nest;
- sistema mating;
- species preferences;
- trust/affinity.

### 21.2 Decisione di freeze

Per il design finale shipping si definisce una slice minima:

- 1 livello di nido con requisiti chiari;
- recruit possibile su subset di NPG;
- mating sbloccabile solo con trust + nest validi;
- output principale: 1–2 seed oppure nuovo membro campagna in casi specifici.

### 21.3 Cosa rinviare

- genetica complessa;
- genealogie profonde;
- ecosistema riproduttivo a lungo termine;
- simulazione cross-mission molto ricca.

## 22. Matchmaking / privacy / reset

Il pacchetto documenta profiling on/off e reset telemetry/PF_session.

### Decisione finale

- profiling deve essere opzionale;
- reset va mantenuto come strumento di testing, onboarding o narrativa;
- nessun sistema adattivo deve essere imposto senza opt-in chiaro.

## 23. Validazione finale

### 23.1 Gate hard

- budget morph ≤ budget specie
- formule HP/AC/Parry/Guardia/Move/Vel valide
- sinergie coerenti con asset realmente presenti
- cap risorse rispettati
- unlock job coerenti con rank/pi_costs
- schema PG/NPG valido
- spawn pack valido

### 23.2 Gate tecnici di repo

- tests resolver green
- tests hydration green
- contracts-combat green
- contracts-trait-mechanics green
- validation ecosystem / package green
- smoke CLI green

## 24. Contenuto shipping consigliato

Nota di progressione: le due slice seguenti rappresentano **orizzonti distinti**. La **shipping slice attuale** e' cio' che va congelato con il freeze; la **target roadmap** e' cio' che [`docs/core/40-ROADMAP.md`](40-ROADMAP.md) dichiara come orizzonte MVP → Alpha.

### 24.1 Shipping slice attuale (freeze baseline)

- 4 specie shipping immediate dal pacchetto attuale
- 6 job complete
- 3 biomi completi
- 2 armi base
- 5 surge
- 2 trait esempio
- recruit/trust/mating slice
- spawn pack VTT già pronto

### 24.2 Target roadmap (post-freeze, da [`40-ROADMAP`](40-ROADMAP.md))

Quando la roadmap canonica va chiusa:

- 6 specie base (shipping attuale 4 → target 6: 2 specie extra da validare)
- 6 job base
- 12 regole sblocco
- UI identità
- 2 mappe forti
- 50 partite di playtest mirato predator/counter

## 25. Debito aperto da gestire con disciplina

1. `active_effects` nel resolver ancora NOOP.
2. parte del bilanciamento trait resta placeholder o da ritarare.
3. alcune regole sono ancora marcate playtest-needed.
4. Game-Database integration runtime non pronta.
5. enneagram profile variations non ancora stabilizzate.

## 26. Piano esecutivo consigliato

I **Blocchi** seguenti sintetizzano il piano di lavoro dal punto di vista prodotto. Il mapping verso le fasi/milestone esecutive del [`MASTER_ROADMAP`](../planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md) e' esplicitato qui sotto — usa il MASTER_ROADMAP e i gate di [`MILESTONES_AND_GATES`](../planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md) come driver di esecuzione.

| Blocco freeze                            | Contenuto                                                                                                                       | Milestone roadmap corrispondente                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Blocco 1 — System Freeze                 | combat rulebook, formula CD/damage/parry/status order, trait mechanics shipping set, caps PT/PP/SG                              | M1 Combat Freeze + M2 Balance Freeze             |
| Blocco 2 — Content Freeze                | 4 specie correnti, 6 job base, biomi + reward tables, surge/armi/synergy baseline                                               | M3 Content Shipping Slice                        |
| Blocco 3 — Identity & Progression Freeze | PF_session + VC, MBTI gates soft, PE→PI e seed economy, debrief UI requirements                                                 | M2 Balance Freeze + M4 UX/HUD/Telemetry Shipping |
| Blocco 4 — Meta Slice Freeze             | recruit/trust, nest requirements, mating rewards, reset/privacy/profiling UX                                                    | M5 Meta Slice & Cross-Repo Readiness             |
| Blocco 5 — QA & Playtest                 | 3-5 round medi per scontro, 60-70% hit chance pari livello, 50-60% vs elite, audit predator/counter, monitoraggio spike seed/PI | M6 Release Candidate                             |

### Blocco 1 — System Freeze

- chiudere combat rulebook
- chiudere formula CD/damage/parry/status order
- allineare trait mechanics al set shipping
- definire caps definitivi PT/PP/SG

### Blocco 2 — Content Freeze

- validare 4 specie correnti
- chiudere le 6 job base
- validare biomi e reward tables
- congelare surge/armi/synergy baseline

### Blocco 3 — Identity & Progression Freeze

- confermare PF_session + VC
- chiudere MBTI gates soft
- bloccare PE→PI e seed economy
- bloccare debrief UI requirements

### Blocco 4 — Meta Slice Freeze

- recruit/trust
- nest requirements
- mating rewards
- reset/privacy/profiling UX

### Blocco 5 — QA & Playtest

- 3–5 round medi per scontro
- 60–70% hit chance pari livello
- 50–60% vs elite
- audit predator/counter
- monitoraggio spike economici di seed/PI

## 27. Raccomandazione finale

La scelta più professionale non è espandere ancora il design.
La scelta corretta è:

- congelare il combat,
- congelare il layer numerico,
- chiudere una slice contenutistica completa,
- usare telemetry e playtest per rifinire,
- rinviare il resto.

## 28. Definizione operativa di “design finale” per Evo Tactics

Evo Tactics è in design finale quando queste condizioni sono tutte vere:

1. il combat resolver supporta tutte le regole core shipping senza NOOP critici;
2. il balance layer copre in modo coerente il set shipping;
3. specie, job, biomi, surge e reward economy formano una matrice completa e giocabile;
4. il debrief spiega chiaramente come il gioco ha interpretato il comportamento del player;
5. recruit/nido/mating funzionano come meta-slice e non rompono il pacing;
6. tutti i gate di validazione sono verdi;
7. il runtime non dipende da integrazioni architetturali non ancora adottate.

## 29. Documenti correlati

Bundle esecutivo (planning) che applica questo freeze:

- [`EVO_FINAL_DESIGN_ROADMAPS_INDEX`](../planning/EVO_FINAL_DESIGN_ROADMAPS_INDEX.md) — indice del bundle.
- [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — regole di risoluzione conflitti tra fonti (**leggere per primo** se emerge un disallineamento).
- [`EVO_FINAL_DESIGN_MASTER_ROADMAP`](../planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md), [`MILESTONES_AND_GATES`](../planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md), [`BACKLOG_REGISTER`](../planning/EVO_FINAL_DESIGN_BACKLOG_REGISTER.md), [`CODEX_EXECUTION_PLAYBOOK`](../planning/EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md), [`GAME_DATABASE_SYNC`](../planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md) — execution plan del freeze (vedi §0.1 per i dettagli).

Fonti tecniche canoniche richiamate dal freeze:

- [`docs/hubs/combat.md`](../hubs/combat.md), [`docs/combat/README.md`](../combat/README.md), [`docs/combat/round-loop.md`](../combat/round-loop.md)
- [`ADR-2026-04-13 Rules Engine d20`](../adr/ADR-2026-04-13-rules-engine-d20.md), [`ADR-2026-04-14 Game-Database topology`](../adr/ADR-2026-04-14-game-database-topology.md), [`ADR-2026-04-15 Round-based combat model`](../adr/ADR-2026-04-15-round-based-combat-model.md)
- [`docs/governance/README`](../governance/README.md) — contratto governance docs (A0).
