---
title: 'Close-out master plan -- verified in-flight inventory + closure order (2026-06-29)'
date: 2026-06-29
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-29'
source_of_truth: false
language: it-en
review_cycle_days: 30
tags: [closeout, inventory, residual, gates, anti-wip, roadmap, spec-aq, in-flight, closure-order]
---

# Close-out master plan (2026-06-29)

> **Scopo**: chiudere COMPLETAMENTE i progetti in sospeso PRIMA di aprirne di nuovi
> (anti-WIP-sprawl). Questo doc = inventario verificato (ground-truth su `origin/main`
> `46706ae4`) + ordine di chiusura ratificato + decisioni owner. **NON apre feature nuove.**
>
> **Base**: estende il [`2026-06-23-residual-gate-register.md`](2026-06-23-residual-gate-register.md)
> (spine verificata 6 giorni fa) col delta 06-23 -> 06-29. Anti-pattern #19 applicato a
> ogni riga (marker = ipotesi, git = verita').
>
> **PR aperte**: ~0 su entrambi i repo (Game + Game-Godot-v2) -> nessun backlog-PR da chiudere.
> **OD formali**: OD-001..OD-059 tutti `resolved` -> le decisioni aperte vivono qui + nel register.

## 0. Delta 06-23 -> 06-29 -- chiuso dall'ultima sessione (STALE-DONE: solo marcare)

Verificato su `origin/main`. Questi NON sono piu' in-flight; il register/marker che li listava va flippato.

| Item                                       | Marker diceva                        | Git-verita' 2026-06-29                                                                                                            |
| ------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **move-terrain-cost substrate**            | register bucket-2 "BUILD plan #2997" | **FLIPPED LIVE in prod 2026-06-29** -- #3061 `8f4b15f7` + #3065 `927eb6ce` + #3043 `162737a7` + #3050 `8ab7b5e3`. Arc CLOSED      |
| **Final catalog/affinity re-baseline**     | register bucket-5 "ancora stale"     | **DONE via derived-canon arc** -- #3045 catalog + #3047 trait-bridge + #3055/#3056 derived-analysis + #3057 guard + #3060 aliases |
| **stale trace_hashes**                     | register bucket-4 "OPEN repo-wide"   | **NON-issue** -- il test e' non-empty-only (no content-match); arc reproducibility copre la generazione. Niente regen rischioso   |
| **GAP2 inert-trait mechanics (block 2+3)** | register bucket-2 "103 inerti"       | **12 wired** -- block-2 #3044 + block-3 #3068 `102ae13e`. Residuo = GAP2-next (45 boilerplate / 9 `*_2` / clusters)               |
| **SPEC-J scar->transform**                 | register bucket-2 "verdetto"         | **BUILT flag-OFF #2994 `76d2a078`** (`nidoRitual.transformScar` + `SCAR_TRAIT_MAP` PROPOSED). Residuo = ratify map + flip         |
| **PE_ratio -> contestedness**              | register bucket-1                    | **RESOLVED = drop-PE #3022 `eda7d9a8`** (composite = `0.70*WR + 0.30*kd`). Chokepoint PE rimosso (gia' nel register)              |
| **aa01 D1 TV cinematic**                   | register bucket-3 "follow-up"        | **DONE** -- #2974 `eda0f529` (GGv2 #535 host-open + TV cinematic). Phone+hint gia' #531                                           |
| **aa01 D4 auto-timer defaulting**          | register bucket-2 "decidere"         | **RESOLVED** -- #2977 `1dbd2ca7` verdetto master-dd = warning-only timer, mai auto-default                                        |
| **OD-024 interoception flip**              | memory "flag OFF"                    | **FLIPPED ON prod 2026-06-22** (register sez.0 gia' lo segnava; runbook D7)                                                       |
| **prod-resilience + Postgres auto-start**  | BACKLOG "OPEN owner-gated"           | **APPLIED 2026-06-22** -- #2966 `faa62e20` + #2965 `0ab859d1` (register sez.0)                                                    |
| **governance stale burn-down**             | BACKLOG "P3 OPEN 181 warnings"       | **CLOSED 397->0** (#2914 36/36); weekly drift ora a cadenza (#3058 `7a407357`). Chip `task_f62b339f` = process, non gate          |
| **issue #1673 BiomeMemory**                | issue OPEN "[P2 parked]"             | **codice SHIPPED #2784** (OD-059 option A); l'issue resta open solo per title stale -> CLOSE                                      |

> **Azione Tier-0**: marcare le righe sopra chiuse nel register + BACKLOG; chiudere issue #1673;
> dismiss chip `task_f62b339f`. = parte del tier housekeeping autonomo (autorizzato).

## 1. Inventario verificato -- TRULY-OPEN (progetti ancora in sospeso)

Ordinato **per tipo-di-gate** (cosa lo sblocca). Blocker: **CLOSE-NOW** (autonomo) /
**OWNER** (decisione master-dd) / **N=40** (calibration-gated) / **EXTERNAL**. Effort S/M/L.

### 1A. Gate = N=40 / calibration (lane single-owner via orchestrator G2)

| #   | Progetto                                            | Cosa manca per chiudere                                                             | Blocker     | Effort |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------- | ------ |
| N1  | **SPEC-J `LETHAL_MISSIONS_ENABLED` flip**           | autora >=1 encounter `lethal:true` (design-call biome/roster/banda) -> N=40 -> flip | OWNER+N=40  | M-L    |
| N2  | **SPEC-H HA1 `aliena_enforcement` flip**            | N=40 su `enc_badlands_pilot_01` + `strength` + flip. Machinery+surface COMPLETE     | OWNER+N=40  | S-M    |
| N3  | **SPEC-I ER7 flag-ON** (population tick)            | N=40 flag-ON. Build gia' shipped flag-OFF (#2723)                                   | OWNER+N=40  | S      |
| N4  | **OD-024 `STAMINA_FATIGUE_ENABLED` flip**           | N=40 proprio + flip incrementale. Engine #2 built flag-OFF (#2937)                  | OWNER+N=40  | M      |
| N5  | **A2 floor magnitude re-tune** (upward-only)        | playtest umano -> re-tune `pressure_tier_floor` solo verso l'alto. A2 gia' LIVE     | OWNER       | S      |
| N6  | **ER6 overrun carry-over fork** (TKT-ER6-CARRYOVER) | N=40 + verdetto (as-built = consume-once ratificato)                                | OWNER+N=40  | S (P3) |
| N7  | **OD-024 interoception re-tune** (opzionale)        | knob: ammorbidire enemy-scaling per ri-centrare completion ~0.6 (flip gia' safe)    | OWNER (opt) | S      |
| N8  | **move-terrain DR2=2 radici ratify**                | re-valida `DR2=2` con playtest umano hold-capable (RATIFIED-PROVISIONAL)            | OWNER       | S      |

### 1B. Gate = decisione master-dd (design-call; nessun build-blocker tecnico)

| #      | Progetto                                    | Cosa decidere / fare                                                                                                                                                                                                                                                   | Blocker       | Effort |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| O1     | **SPEC-J scar->transform map ratify**       | ratifica/estendi `SCAR_TRAIT_MAP` + N=40 + flip; costo E6 = SPEC-E. Built #2994                                                                                                                                                                                        | OWNER         | S/M    |
| O2     | **codex-lore 19 orfani** -> 13 draft        | **VERDETTO 06-29 = promuovi i 13 retired-creature lore DRAFT (#3038) via HITL**                                                                                                                                                                                        | OWNER (HITL)  | M      |
| ~~O3~~ | ~~**H7 PILLAR re-ratifica**~~               | **DONE 2026-06-30** -- VALORI 6/6 ri-ratificati master-dd + P1 restore `def++` (PILLAR delta 06-30, #3096 `a6e0c034`). Non piu' TRULY-OPEN                                                                                                                             | DONE          | S      |
| O4     | ~~**aa01 D6 axis->trait grant**~~           | **DONE 2026-06-30** -- ratified B + designated-axis locomotion; BUILT flag-OFF [#3083](https://github.com/MasterDD-L34D/Game/pull/3083) `b57319ad` (mapping PROPOSED -> N=40 flip)                                                                                     | DONE          | M      |
| O5     | **aa01 D7 player-facing prose**             | scaffold BUILT [#3084](https://github.com/MasterDD-L34D/Game/pull/3084) `3ad66130` (`brancoTendencyHint` = i18n_key + vars + TODO placeholder, NO prose); the "il tuo branco tende verso X" copy is **still master-dd HITL** (client i18n) -- TRULY-OPEN, not yet done | OWNER (HITL)  | S      |
| O6     | ~~**aa01 D8 chain-lightning propagation**~~ | **DONE 2026-06-30** -- BUILT flag-OFF [#3082](https://github.com/MasterDD-L34D/Game/pull/3082) `b138a7dd` (`chainLightningStrike`; PROPOSED radius 2 / shock 2 -> N=40 flip)                                                                                           | DONE          | S-M    |
| O7     | **GAP2-next mechanics**                     | **DEFERRED master-dd 06-30.** Residuo = 39 boilerplate (rewrite-first, prosa design-call) + cluster buff/recon (primitive engine nuove = forbidden-path). _(9 `*_2` DONE #3074; inert recount 91->76; small-slice block-4 = unica increment autonoma se ri-aperto)_    | OWNER (defer) | L      |
| O8     | **TKT-SALVAGE-A2 resistance_archetype**     | mapping archetipo-per-specie (default `adattivo`) + schema field + CI-guard. BUILD ratificato                                                                                                                                                                          | OWNER+build   | M      |

### 1C. Gate = superficie Godot (cross-repo Game-Godot-v2)

| #   | Progetto                                     | Gate                                                                          | Blocker          | Effort |
| --- | -------------------------------------------- | ----------------------------------------------------------------------------- | ---------------- | ------ |
| G1  | **SPEC-K K-07 real-device playtest**         | 2 telefoni + TV (mani master-dd). 6/7 DONE; AI smoke 8/8 PASS (#2890)         | OWNER (device)   | S      |
| G2  | **aa01 D2 `IMPRINT_BEAT_ENABLED` flip**      | playtest + master-dd. Consumer esiste (#2970), D1 surface landed              | OWNER (playtest) | S      |
| G3  | **META_NETWORK_ROUTING route-UI**            | build Godot choice-UI (speccata #2594) -> poi flip env-only                   | BUILD+OWNER      | M      |
| G4  | **aa01 D5 route-vote affinity weighting**    | gated su G3 (META flip + route-UI)                                            | dep G3           | S      |
| G5  | **GAP-C fase-3 choice-UI + fase-4 Dormans**  | POST-MVP, gate normale (~30-40h)                                              | BUILD            | L      |
| G6  | **move-terrain Godot engine-AP-enforcement** | far caricare l'AP terrain-weighted al motore Godot. N=40 Godot-scope + parity | N=40+BUILD       | M      |

### 1D. Gate = build / impl (in gran parte autonomo -- CLOSE-NOW)

| #   | Progetto                                        | Cosa costruire                                                                                                                                                                                                                                                                                                                                                                    | Blocker               | Effort |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| B1  | **trait-mechanics slices 5-7 remainder**        | **9.5/12 trait built** (slice 5+7 #2995/#2996); restano i pezzi finali                                                                                                                                                                                                                                                                                                            | CLOSE-NOW             | M      |
| B2  | **13 creature canonizzazione**                  | #3045 canonized + #3032 gameplay-spec + #3038 lore-draft; residuo = HITL promote + delete stub                                                                                                                                                                                                                                                                                    | OWNER(HITL)+CLOSE-NOW | M      |
| B3  | **canon-linter follow-up**                      | tune `verify_stopwords.txt` (autonomo) -> flip markdown-tier `--strict` (forbidden-path = owner)                                                                                                                                                                                                                                                                                  | CLOSE-NOW+OWNER       | S      |
| B4  | **SPEC-F offspring->playable lineage + export** | offspring giocabili (lineage SPEC-E) + QR/card export                                                                                                                                                                                                                                                                                                                             | BUILD                 | M      |
| B5  | **jsonschema-shadow follow-up**                 | validation follow-ups esposti dalla rimozione stub (BACKLOG:990)                                                                                                                                                                                                                                                                                                                  | CLOSE-NOW             | S (P2) |
| B6  | **TKT-KEEPER-CONTENT-DEBT**                     | ~138 trait portati da keeper-stub sintetici; autora specie reali nel tempo (band-neutral oggi)                                                                                                                                                                                                                                                                                    | BUILD (content)       | L      |
| B7  | **TKT-KEEPER-VALIDATOR-SCOPE**                  | estendi scope-dir di `run_all_validators.py` quando i keeper diventano specie reali                                                                                                                                                                                                                                                                                               | CLOSE-NOW             | S (P3) |
| B8  | **script repoint species.yaml** (TKT-STALE-B2)  | 🔁 verify-first 06-29 UPGRADE: **4 BROKEN** (frattura_abissale_validations.py:94 / evo_pack_pipeline.py:52 / data_health.py:124+:201) + **3 DEGRADED** (generator.py / build-idea-taxonomy.js / validate_datasets.py:542 silently 0-species). Logic repoint a `species_catalog.json` (loader `tools/py/lib/species_loader.py`). Bug-fix con test -> PR dedicata (NON marker-flip) | BUILD (tested PR)     | M      |

### 1E. Gate = infra owner-gated / forbidden-path / mani-prod

| #      | Progetto                                             | Perche' gated                                                                                                                                                                                                                                                                                                    | Blocker       | Effort   |
| ------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| I1     | **flip CI-wire reproducibility guard -> enforcing**  | togliere `--warn-only` quando l'advisory e' quieto. `.github/workflows` = forbidden                                                                                                                                                                                                                              | OWNER-merge   | S        |
| I2     | **ci.yml stale refs** (chip `task_3f09765d`)         | `Validate Species` ref `species.yaml` rimosso + `lighthouse-ci` ref assente. forbidden                                                                                                                                                                                                                           | OWNER-merge   | S        |
| I3     | **SPEC-F durable crossbreed cooldown**               | **PR #3101 PREPARED 2026-06-30** -- `campaign_id` schema field + cooldown da history persistente (no piu' in-memory Set); FIFO-edge doc'd `TKT-SKIV-COOLDOWN-FIFO`. forbidden-path (`packages/contracts`) -> master-dd merge pending                                                                             | OWNER-merge   | S        |
| I4     | **SPEC-E ritual resource-cost (E6)**                 | **DEFERRED 2026-06-30 (master-dd)** -- BLOCKED: no backend resource pool (Campaign senza balance PE/PI/SG, godotV2State read-only, no quorum-spend route). Unblock = nuovo resource-state + 4 design-call (tipo risorsa / cost-model / quorum-UX / pool shared-vs-per-player). Workstream SPEC-E, non infra-prep | OWNER (defer) | M        |
| ~~I5~~ | ~~registra program-doc 2026-06-22 in docs_registry~~ | ✅ **gia' fatto** (verify-first 06-29: `unregistered_document` = 0; i 10 program-doc 06-22 sono gia' nel registry). Marker stale                                                                                                                                                                                 | DONE          | -        |
| I6     | **D9 CAP-12 PlayerRunTelemetry canon-home**          | migration = forbidden-path + ADR (reconstruct-from-ledger doctrine)                                                                                                                                                                                                                                              | OWNER (defer) | L        |
| I7     | **2 keeper env_affinity orphans**                    | `laguna_bioreattiva` + `mangrovieto_cinetico` senza bioma canonico -> assegna o accetta                                                                                                                                                                                                                          | OWNER         | S        |
| I8     | **prod flips bundle** (mani master-dd)               | `LETHAL` / `aliena_enforcement` / `STAMINA_FATIGUE` / `IMPRINT_BEAT` / `META_NETWORK` = env keys.env + restart (post rispettivi gate)                                                                                                                                                                            | OWNER-hands   | umbrella |

### 1F. External / triage (issue, cross-repo)

| #      | Item                                                 | Stato                                                                              | Azione          |
| ------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------- |
| X1     | **#3053** calibration harness real terrain-cost band | il sim non risolve i pilot -> blocca move-terrain Godot N=40 (= dep di G6)         | BUILD (harness) |
| X2     | **#2888 / #2834** AI sim nightly regression          | issue auto-filed da cron regression -> triage: verifica risoluzione poi chiudi     | EXTERNAL        |
| X3     | **#2744** encounter YAML backport enrichments        | backport hand-authored (pressure floors / terrain / lethal). YAML non e' SoT piena | BUILD (content) |
| ~~X4~~ | ~~**#1673** BiomeMemory issue~~                      | ✅ **CLOSED 2026-06-29** (codice shipped #2784; title stale)                       | DONE            |
| X5     | **Godot #415** GDScript doc-comment campaign         | tracking issue Jules batches, cross-repo                                           | EXTERNAL        |

## 2. Ordine di chiusura ratificato (anti-WIP, master-dd 2026-06-29)

> **Verdetto Q1 = "Approve tiered sequence".** Chiudi cheapest-first, niente progetti nuovi
> finche' i tier 0-1 non sono drenati.

### Tier 0 -- marker-flip (~0 lavoro, gia' fatti, solo segnare) -- AUTONOMO

Sezione 0 sopra: flip register/BACKLOG su 12 STALE-DONE + chiudi issue #1673 (X4) + dismiss chip governance.

### Tier 1 -- housekeeping autonomo (CLOSE-NOW) -- AUTORIZZATO ("Yes, whole tier")

I5 (registra program-doc) / B8 (repoint species.yaml) / B3-stopwords (tune) / O3-refresh
(PILLAR-LIVE-STATUS content) / B5 (jsonschema-shadow) / B7 (keeper-validator-scope quando applicabile) /
B1 (trait-slices remainder). Ognuno = PR piccola, verify-before-done, auto-merge L3 se 7-gate verdi.

### Tier 2 -- decisioni owner batch (prossimi round AskUserQuestion)

O1 scar-map ratify / **O2 codex-lore = promuovi 13 draft #3038 (verdetto dato)** / O4/O5/O6 aa01 D6/D7/D8 /
O7 GAP2-next / O8 resistance_archetype mapping / I1/I2/I3 forbidden-path merge / G1 K-07 device /
I7 keeper orphans. Presentati <=4 per volta, recommended-default + reversibility-tag.

### Tier 3 -- flip N=40-gated (lane single-owner G2)

> **Verdetto Q2 = SPEC-J LETHAL per primo.**

1. **N1 SPEC-J LETHAL** -- autora encounter `lethal:true` (design-call) -> N=40 -> flip (⛔ permadeath).
2. **N2 SPEC-H HA1** -- N=40 badlands_pilot -> flip (🔄, cheapest-machinery-complete).
3. **N4 OD-024 STAMINA_FATIGUE** -> **N3 SPEC-I ER7** -> **N6 ER6 carry-over** -> **N5 A2 retune** ->
   **N8 DR2=2** -> **N7 interoception re-tune** (knob).
4. Godot lane parallela: **G3 META route-UI** -> G4 D5 / **G6 engine-AP** (dep X1 #3053) / **G5 GAP-C** (POST-MVP).

## 3. Decisioni owner ratificate (questa sessione, AskUserQuestion 2026-06-29)

| Q   | Domanda               | Verdetto                                                      | Tag |
| --- | --------------------- | ------------------------------------------------------------- | --- |
| Q1  | Ordine di chiusura    | **Approve tiered sequence** (Tier 0->1->2->3)                 | 🔄  |
| Q2  | Primo flip N=40-gated | **SPEC-J LETHAL_MISSIONS** (autora encounter -> N=40 -> flip) | ⛔  |
| Q3  | Housekeeping autonomo | **Si', esegui tutto il tier** (Tier 0+1)                      | 🔄  |
| Q4  | codex-lore 19 orfani  | **Usa i 13 retired-creature draft (#3038), HITL promote**     | 🔄  |

## 4. Stato esecuzione Tier-0/1 (2026-06-29, Q3 greenlight)

> Drain eseguito via Workflow recon (6-finder + critic adversariale): ogni closure
> ground-truthed su `origin/main` PRIMA di applicare. Verify-first ha ri-dimensionato 2 item.

**✅ FATTO questa sessione** (in PR #3072, doc-hygiene zero-runtime-risk):

1. **Issue #1673 CLOSED** (OD-059 shipped #2784, commento esplicativo).
2. **register flip** (`2026-06-23-residual-gate-register.md`): 8 righe STALE-DONE flippate + DELTA banner + sez.8 pointer + `last_verified` 06-29.
3. **BACKLOG flip**: trait-mechanics 2.5/12 -> 12/12 engine-path + bullet move-terrain FLIP-LIVE + codex-lore verdetto + header delta.
4. **PILLAR-LIVE-STATUS refresh (H7)** atomico (frontmatter + registry `last_verified` 06-29 + delta-history giugno; **VALORI 6/6 invariati = re-ratifica master-dd pending**).

**✅ gia' fatto (verify-first, marker stale)**: I5 program-doc registration (`unregistered_document` = 0).

**🔁 ri-dimensionati (NON marker-flip -> PR dedicata con test)**:

- **B8 script repoint** -- verify-first: NON 1-2 file ma **4 broken + 3 degraded** (logic repoint a `species_catalog.json`). Inventario preciso nella riga B8. Bug-fix QA-only (rotti da #2271, non urgenti) -> PR tested separata.
- **B3 stopwords** -- serve corpus di false-positive reali (run linter) prima del tune. **B5 jsonschema** + **B1 trait-slices remainder** = build, PR separate.

**Resto** (Tier 2 design-call, Tier 3 N=40 flip) = round owner-decision / sessione calibrazione.

## 5. Esplicitamente NON in-flight (gia' chiusi -- non ri-aprire)

item-1 SPEC-A..Q doc-flip (17/17 `active`); move-terrain-cost (LIVE); derived-canon reproducibility
arc (#3047-#3068); SPEC-H machinery+surface; SPEC-J backend+consent-UI; SPEC-K 6/7; OD-024 D1-D7
interoception (FLIPPED ON); governance stale (397->0); PE-drop (#3022); prod-resilience+Postgres;
PHASEC 32/32; GAP-A/B; H1/H2 economy; full-loop runner; aa01 D1/D4.

---

> **Roadmap-of-record**: `docs/core/40-ROADMAP.md` (strategica) + `BACKLOG.md` (operativo) +
> [`2026-06-23-residual-gate-register.md`](2026-06-23-residual-gate-register.md) (vista per-gate) +
> CLAUDE.md sprint pointer (live). Questo doc = snapshot di chiusura 2026-06-29; aggiorna al
> drenaggio dei tier.
