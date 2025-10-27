# Evo Tactics — Design Doc Overview

## Visione & Statement
- **Visione** — Co-op tattico TV/app dove cellule di resistenza guidano forme bio-meccanoidi in campagne generate, alternando briefing, incursioni e fasi Nido per difendere habitat in mutazione costante.【F:appendici/A-CANVAS_ORIGINALE.txt†L10-L24】
- **Statement** — "Trasformare l'ansia da tiro di dado in un'intesa condivisa": ogni scelta comunica impatto immediato (risk/cohesion) e conseguenze a lungo termine (stress, fiducia, reputazione) tramite HUD sincronizzato tra TV e companion.【F:appendici/A-CANVAS_ORIGINALE.txt†L26-L33】
- **Esperienza target** — Gruppi da 3-4 giocatori in sessioni da ~90 minuti con onboarding <10 minuti supportato da preset di Forme e direttive assistite.【F:appendici/A-CANVAS_ORIGINALE.txt†L35-L41】

## Pilastri
1. **Cooperazione situazionale** — Ruoli combinabili, scoreboard StressWave condiviso e strumenti per reagire ai picchi telemetrici.【F:appendici/A-CANVAS_ORIGINALE.txt†L43-L46】【F:docs/02-PILASTRI.md†L1-L6】
2. **Mutazione significativa** — Progressione morfologica e narrativa legata a tratti, parti e mutazioni sbloccate da comportamento.【F:appendici/A-CANVAS_ORIGINALE.txt†L47-L52】【F:docs/20-SPECIE_E_PARTI.md†L1-L10】
3. **Telemetria visibile** — Dashboard risk/cohesion, timeline eventi esportabile (`session-metrics.yaml`) e alert HUD condivisi.【F:appendici/A-CANVAS_ORIGINALE.txt†L53-L60】【F:data/telemetry.yaml†L1-L40】
4. **Narrazione reattiva** — Il Director AI adatta missioni, spawn e ricompense in base a affinità, fiducia e scelte morali.【F:appendici/A-CANVAS_ORIGINALE.txt†L61-L73】【F:appendici/C-CANVAS_NPG_BIOMI.txt†L1-L31】

## Loop Principale
1. **Briefing**: selezione missione, obiettivi, heatmap minacce e trend StressWave.【F:appendici/A-CANVAS_ORIGINALE.txt†L75-L86】
2. **Setup Squad**: drafting Forme/Job, moduli PI, check sinergie tramite companion.【F:appendici/A-CANVAS_ORIGINALE.txt†L87-L92】【F:data/packs.yaml†L1-L23】
3. **Incursione**: turni misti comando rapido + risoluzione d20 con combo cooperative e clock a segmenti.【F:appendici/A-CANVAS_ORIGINALE.txt†L93-L110】【F:docs/11-REGOLE_D20_TV.md†L1-L7】
4. **Eventi dinamici**: NPG reattivi, affissi bioma, escalation StressWave.【F:appendici/A-CANVAS_ORIGINALE.txt†L111-L116】【F:appendici/C-CANVAS_NPG_BIOMI.txt†L33-L82】
5. **Debriefing**: calcolo risk/cohesion finale, loot, aggiornamento telemetria e StressWave.【F:appendici/A-CANVAS_ORIGINALE.txt†L117-L121】【F:data/telemetry.yaml†L1-L49】
6. **Fase Nido**: investimenti infrastruttura, mutazioni e gestione comunità.【F:appendici/A-CANVAS_ORIGINALE.txt†L122-L124】【F:appendici/D-CANVAS_ACCOPPIAMENTO.txt†L1-L69】

## Progressione & Metriche Chiave
- **Livello Squadra** 1-10: sblocca slot PI e missioni avanzate; bilanciato con `pi_shop` e budget curve baseline/veteran/elite.【F:appendici/A-CANVAS_ORIGINALE.txt†L126-L135】【F:data/packs.yaml†L1-L20】
- **Prestigio Forma** (5 tier): concede tratti e mutazioni legate a Forme e Nido.【F:appendici/A-CANVAS_ORIGINALE.txt†L136-L141】【F:data/mating.yaml†L1-L101】
- **Reputazione Fazioni** e **StressWave**: impattano spawn, ricompense e soglie di allerta HUD (>0.60).【F:appendici/A-CANVAS_ORIGINALE.txt†L142-L151】【F:data/telemetry.yaml†L1-L25】

## Sistema TV/d20 & Companion
- **Risoluzione**: bande critico/successo/parziale/fallimento su d20 con modificatori PI, stance e Stress Mod legato a StressWave.【F:appendici/A-CANVAS_ORIGINALE.txt†L153-L164】【F:docs/11-REGOLE_D20_TV.md†L1-L7】
- **Clock**: segmenti d6 per eventi a tempo (evacuazione, anomalie).【F:appendici/A-CANVAS_ORIGINALE.txt†L165-L168】
- **Companion App**: drafting Forme/Job, macro azioni, chat tattica e upload telemetria JSON/YAML verso repo condiviso.【F:appendici/A-CANVAS_ORIGINALE.txt†L170-L184】
- **HUD**: overlay risk/cohesion con indicatori mismatch ruoli e supporto second screen per mappa tattica e Nido.【F:appendici/A-CANVAS_ORIGINALE.txt†L186-L198】【F:docs/03-LOOP.md†L1-L5】

## Job & Trait di base
- **Famiglie Job**: Vanguard, Skirmisher, Warden, Artificer, Invoker, Harvester — ciascuna con bias di pack (`job_bias`) e abilità signature documentate in `data/packs.yaml`.【F:data/packs.yaml†L21-L90】
- **Tratti**: `trait_T1`/`T2`/`T3` alimentano combo PI, sinergie e costi `pi_shop`; i validatori assicurano coerenza tra dataset e CLI (`tools/py` e `tools/ts`).【F:data/packs.yaml†L1-L20】【F:docs/20-SPECIE_E_PARTI.md†L5-L10】
- **Prestigio/Mutazioni**: progressioni Forma sbloccano nuove combinazioni di parti e tratti, con telemetria MBTI/Ennea a supporto del seed temperamentale.【F:data/telemetry.yaml†L41-L73】【F:docs/22-FORME_BASE_16.md†L1-L6】

## Workflow tratti end-to-end
1. **Allineare il glossario** — aggiungi/aggiorna l'entry in `data/traits/glossary.json` (label IT/EN, note sintetiche) e propaga la copia automatica in `docs/evo-tactics-pack/trait-glossary.json` / `packs/evo_tactics_pack/docs/catalog/trait_glossary.json` se necessario.【F:data/traits/glossary.json†L1-L118】【F:docs/evo-tactics-pack/trait-glossary.json†L1-L118】【F:packs/evo_tactics_pack/docs/catalog/trait_glossary.json†L1-L118】
2. **Sincronizzare registri** — collega il nuovo tratto nelle regole ambientali e nel reference genetico (`env_traits.json` e `trait_reference.json`, entrambi puntano al glossario condiviso).【F:packs/evo_tactics_pack/docs/catalog/env_traits.json†L1-L19】【F:packs/evo_tactics_pack/docs/catalog/trait_reference.json†L1-L23】
3. **Integrare nei biomi** — aggiorna `docs/catalog/species_trait_matrix.json` con le nuove associazioni Forma↔bioma↔tratto e usa `python tools/traits.py validate --matrix docs/catalog/species_trait_matrix.json` per assicurare che i mapping rispettino requisiti ambientali e morfotipi.【F:docs/catalog/species_trait_matrix.json†L1-L240】【F:tools/traits.py†L1-L236】
4. **Rigenerare baseline** — esegui `python tools/py/build_trait_baseline.py packs/evo_tactics_pack/docs/catalog/env_traits.json packs/evo_tactics_pack/docs/catalog/trait_reference.json --trait-glossary data/traits/glossary.json` per aggiornare `data/analysis/trait_baseline.yaml` e verificare archetipi/tier.【F:tools/py/build_trait_baseline.py†L1-L46】
5. **Validare naming** — usa `python tools/py/validate_registry_naming.py --trait-glossary data/traits/glossary.json` per controllare slug, mapping biomi/hazard/morphotype e coerenza del glossario referenziato in `config/project_index.json`.【F:tools/py/validate_registry_naming.py†L1-L270】【F:config/project_index.json†L1-L91】
6. **Copertura & diff** — genera il report matriciale con `python tools/py/report_trait_coverage.py --out-json data/analysis/trait_coverage_report.json --out-csv data/analysis/trait_coverage_matrix.csv` per confrontare biomi↔forme mappati dalle regole con quelli realmente assegnati alle specie.【F:tools/py/report_trait_coverage.py†L1-L85】【F:tools/py/game_utils/trait_coverage.py†L1-L249】
7. **QA interattivo** — ricarica il catalogo nel generator (`docs/evo-tactics-pack/generator.js`) per ottenere label dal glossario centralizzato e visualizzare i nuovi suggerimenti in UI senza duplicare stringhe.【F:docs/evo-tactics-pack/generator.js†L360-L449】【F:docs/evo-tactics-pack/generator.js†L666-L760】

## Quality Gates
- **Audit tratti ↔ ambienti** — consulta `docs/reports/trait-env-alignment.md` per verificare coperture, lacune e note di bilanciamento tra tratti PI e regole ambientali; usalo prima dei playtest per pianificare i pick consigliati e dopo per registrare gap emersi.【F:docs/reports/trait-env-alignment.md†L1-L80】
- **Matrice specie** — incrocia il report audit con `docs/catalog/species_trait_matrix.json` e il CSV generato (`data/analysis/trait_coverage_matrix.csv`) per individuare rapidamente specie o biomi sottorappresentati; durante i playtest annota il diff tra comportamento atteso e osservato e ri-esegui `report_trait_coverage.py` per aggiornare la telemetria di riferimento.【F:docs/catalog/species_trait_matrix.json†L1-L240】【F:data/analysis/trait_coverage_matrix.csv†L1-L40】
- **Gate di bilanciamento** — prima del freeze build, assicurati che i pick-rate raccolti (`data/telemetry.yaml`) rispettino le soglie suggerite dall'audit e che eventuali deroghe siano documentate nel log playtest; un diff >5% rispetto al target impone un nuovo ciclo di QA con `scripts/cli_smoke.sh` e validazione trait coverage per confermare la stabilità dei dataset.【F:data/telemetry.yaml†L1-L73】【F:scripts/cli_smoke.sh†L1-L120】

## Stato & Prossimi Passi
- Vertical slice VC con 3 missioni giocabili, telemetria StressWave integrata e companion app v0.9 già in test interno.【F:appendici/A-CANVAS_ORIGINALE.txt†L200-L214】
- Priorità correnti: migliorare onboarding, bilanciare pacchetti PI/EMA e ampliare contenuti Nido itinerante in linea con roadmap VC 2025.【F:appendici/A-CANVAS_ORIGINALE.txt†L215-L220】【F:docs/piani/roadmap.md†L1-L60】
