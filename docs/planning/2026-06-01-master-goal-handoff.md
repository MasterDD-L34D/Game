---
title: 'Master GOAL handoff — chiusura backlog Evo-Tactics (PHASEC 32/32 + catalogo + cross-session)'
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-01'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, goal, phasec, catalog, cross-session, workflows, coordinator]
---

# Master GOAL handoff (2026-06-01, rev2 cross-repo)

> Messaggio `/goal` per una sessione coordinatrice unica: PHASEC perk 32/32 +
> audit/wire catalogo + triage/merge del lavoro cross-session. Verdetti master-dd
> (6 PHASEC + gate cross-session) gia' DECISI → gira end-to-end. **Rev2**: #2502
> MERGED; nuovi PR cross-session (#2532/#2535/#2536 OD-058 wound + species
> enrichment); vault → v7.2; snapshot altri repo (Ryzen).

## Stato cross-repo (ground-truth 2026-06-01, PC=CODEMASTERDD canonical)

- **Game main** → `b1321a8c` (#2502 merged). La sessione PHASEC ha shipped #2529 +
  #2530 + #2534 + babysittato #2502 a merge.
- **Game PR aperte**: #2536 (species-enrichment), #2535 (OD-058 woundSystem
  ENGINE), #2532 (OD-058 docs), #2527 (PHASEC PE-canon, recommend-close), #2512
  (weekly drift audit), #2509 (GAP-C fase-2). **#2502 NON piu' aperta (merged)**.
- **vault** (`/c/dev/vault`, git) → **v7.2** (§21 ALIENA-E groups + §22-C phone
  chart, #208-#211). Grounding 26-ECONOMY ancora valido; SoT piu' recente.
- **Game-Godot-v2** → link2 (#380-382: MetaApi campaign_id, MainNido roster,
  can_mate). Workstream SURFACE, separato dal backend Game (out-of-scope qui).
- **Game-Database** → JSDoc (#167-168, Jules bot). Catalog sink, low-touch.

## Come lanciare (checklist pre-lancio)

1. **Repo = `C:/dev/Game`** (Evo-Tactics). Tutto il lavoro vive li'. NON
   Game-Database / Game-Godot-v2 / vault (vault = grounding read-only).
2. **Worktree discipline**: il main checkout puo' essere su un branch di un'altra
   sessione con WIP. La sessione `/goal` **NON edita il main checkout** — worktree
   ISOLATI off `origin/main`. Inventario via `git fetch`.
3. **Chiudi le sessioni parallele PRIMA** (coordinatore unico → evita
   contaminazione shared-checkout). Branch/sessioni attivi 2026-06-01 (verifica
   live con `git worktree list` + `gh pr list`): GAP-C (`worldgen-gapc-fase2`), D4
   (`d4-ecoyaml`), OD-058 wound (`feat/od-058-d2-wound-system`, #2535),
   species-enrichment (`claude/species-enrichment`, #2536). Committa+pusha il WIP
   di ognuna prima di chiudere.
4. **Lancia**: cwd = `C:/dev/Game` → `/goal` → incolla il blocco sotto.

## Verdetti + gate (riferimento rapido)

| ID  | Item                     | Decisione                                                                 |
| --- | ------------------------ | ------------------------------------------------------------------------- |
| V1  | OQ-F-impl (Cat F 7/7)    | phenotype 1d6 Option A + use-cap 1/round (capstone 2)                     |
| V2  | OQ-ECON (cost-gate)      | Hybrid: rank<=2 numerico, ultimate consume-all + seed PT/PP pool          |
| V3  | OQ-BOND (symbiont 7 tag) | FFXIV Cover: bond@cast adiacente, redirect post-intercept, KO-capped      |
| V4  | OQ-MINION (8 tag)        | COSTRUISCI: player+owner_id, AI scriptata, espendibile, spike+coop-smoke  |
| V5  | shared_hp_pool           | pool combinato somma-HP, both-KO, supersede death-grace (PR a parte)      |
| V6  | A3 campaign-XP           | BUILD: debrief first_kill_actor_id + grantXp perUnitBonus                 |
| G1  | #2502 dep jsonschema     | ✅ **MERGED** (b1321a8c) — schema-drift fix incluso, fatto da PHASEC sess |
| G2  | #2509 GAP-C data         | ✅ APPROVATO merge (ADR accettato, flag OFF)                              |
| G3  | D4 promote               | ✅ auto-promote su band-pass (HC06 15-25% + HC07 30-50%)                  |

## Messaggio `/goal` (incolla questo)

```
GOAL MASTER — sei il COORDINATORE UNICO cross-session. Chiudi tutto il backlog Evo-Tactics: PHASEC perk 32/32 + audit/wire catalogo + triage/assorbi/mergia il lavoro delle altre sessioni. Verdetti master-dd INCLUSI e DECISI (PHASEC + gate cross-session) — niente da chiedere salvo imprevisti reali. Orchestra via /workflows: TU = main-thread coordinatore (inventario -> triage -> fan-out parallelo file-DISGIUNTO -> integra -> babysit ogni PR a merge). Self-contained.

## GATE master-dd DECISI (2026-06-01) — esegui, non richiedere
- #2502 (species ecotypes + species_catalog schema gate): GIA' MERGED (b1321a8c). NON ri-aprire.
- #2509 (GAP-C fase-2): APPROVATO merge (ADR-2026-05-31 ACCEPTED, flag OFF default, 2 edge + test). Babysit a merge.
- D4 18 draft ecosystems: AUTO-PROMOTE per-eco SOLO se band-verify passa (HC06 in [15-25%] E HC07 in [30-50%], seed 4242, N=40); falliti restano draft; rovine_planari OFF-LIMITS (D6).

## STEP 0 — Onboarding + INVENTARIO (PRIMA di tutto)
1. Memory: C:/Users/edusc/.claude/projects/C--dev-Game/memory/project_phasec_job_perks_plan.md + MEMORY.md (indice TUTTE le sessioni).
2. Handoff: docs/planning/2026-06-01-master-goal-handoff.md (questo) + docs/planning/2026-05-31-parallel-sessions-sync-handoff.md.
3. INVENTARIO LIVE: `gh pr list --state open`; `git worktree list`. Per ogni PR: mergeable + Codex comments. Mappa ready/gated/owned-da-altra-sessione.
4. MUSEO (museum-first OBBLIGATORIO): MUSEUM.md + M-2026-04-27-005 (Hades currency), M-2026-04-27-007 (MHS gene-grid + CoQ morphotype + Subnautica), M-2026-04-26-018 (biomes.yaml 2/7 campi a runtime = gap schede biomi), worldgen-bridge-species-network-glue.
5. SoT: vault C:/dev/vault/Spaces/Dev/Evo-Tactics/core/26-ECONOMY_CANONICAL.md (PT 0-12/PP 0-3 consume-all/SG 0-3; PE=XP campaign) — il vault e' ora v7.2, ri-leggi fresh se serve. + data/core/jobs_expansion.yaml + biomes.yaml + species_catalog.json.
6. PROCESSI: DECISIONS_LOG.md + OPEN_DECISIONS.md GENERATI (non editare a mano; tools/generate_*.py / migrator reconcile; CI fail-on-diff). MERGE-GATE = leggi Codex non solo CI. NB: il gate CI species_catalog-schema (#2502) e' ora ATTIVO su main (jsonschema) — se tocchi species_catalog/config/schemas rigenera `scripts/trait_audit.py` (no --check) + path POSIX.
7. Ground-truth: git fetch origin main; #2529 (54bc1eec) + #2530 (2181e11e) + #2534 + #2502 (b1321a8c) MERGED. Se NO -> STOP.

## VERDETTI PHASEC (tutti decisi -> 32/32 tag)
V1 OQ-F-impl (Cat F 7/7): phenotype_shift -> 1d6 random. Option A: 1=attack_mod+3, 2=defense_mod+3, 3=mobility+2 (mobility_bonus buff), 4=+1 ap_remaining immediato, 5=heal 4 (cap max_hp), 6=initiative+5 (buff durata). Cap base 1/round; capstone phenotype_double_use->2/round (use-counter per-round). double_phenotype_roll = 2 roll, stesso outcome stacka.
V2 OQ-ECON = Option C HYBRID: rank<=2 gate numerico esatto (rescala <=pool); ultimate (cost>=pool_max) = consume-all. PRIMA seeda pool PT+PP in normaliseUnit (mirror sg) + earn (PP +1 crit/+1 kill, PT per-round cap 12) + reset. Poi gate (check+deduct post-2xx) in executeAbility. band-verify HC06/HC07 seed 4242 OBBLIGATORIA. validate-datasets su cost_*.
V3 OQ-BOND (symbiont fase-1, 7 tag) [FFXIV Cover]: bond al cast su alleato adiacente, persiste, ri-castabile; redirect DOPO intercept-reroute su danno residuo; symbiont KO -> redirect capped al suo HP; dual_bond cap 100%; bond_no_distance_limit toglie gate adiacenza; opz. bond costa SG.
V4 OQ-MINION (COSTRUISCI, 8 tag) [Gloomhaven/Masterminds]: controlled_by 'player' + owner_id = beastmaster; AI scriptata minima + pack_command 1 ordine free/round (NO declareSistemaIntents pieno); morte espendibile (NON party-wipe); minion_resurrect_chance re-spawn 1HP; spawn adiacente libero (else 400); agisce nel turno del BM; cap=max_minions. Spike POC PRIMA + coop-phase-validator smoke gate pre-ship.
V5 shared_hp_pool (symbiont capstone): pool combinato somma-HP, danno split equo, ENTRAMBI KO a 0 (faithful). PR PROPRIO + edge-test + band-verify. bonded_death_grace SUPERSEDED quando attivo. Il piu rischioso -> ultimo dei symbiont.
V6 A3 campaign-XP (BUILD): combat debrief espone first_kill_actor_id; grantXpToSurvivors(units, amount, {perUnitBonus}) da _perk_passives (first_kill_pe_bonus / minion_kill_pe_bonus cap_per_round). Dopo V4.

## CROSS-SESSION (triage — owner-gated dove segnato; NON duplicare, NON clobbare)
- #2502 species: ✅ GIA' MERGED. Nulla da fare.
- #2535 OD-058 woundSystem (combat: woundSystem.js + statusModifiers.js + damage_curves.yaml): OPEN, altra sessione. ⚠️ COMBAT come PHASEC ma file DISGIUNTI (progressionApply/abilityExecutor/session vs woundSystem/statusModifiers). NON duplicare; se i PHASEC PR e #2535 toccano lo stesso stato di risoluzione -> SERIALIZZA + band-verify interazione. Babysit a merge solo se owner idle + Codex clean.
- #2536 species-enrichment (metaProgression + routes/meta + **prisma MIGRATION 0017** + schema.prisma): OPEN. ⚠️ MIGRATION = FORBIDDEN PATH -> coordinatore NON tocca, NON auto-merge; coordina soltanto.
- #2532 OD-058 docs (SoT canon 00-SOURCE-OF-TRUTH/00D/11/90 + species_resistances.yaml): OPEN. Tocca il SoT di grounding -> ri-leggi SoT fresh; species_resistances = combat data -> band-verify awareness.
- #2509 GAP-C fase-2: babysit a merge (approvato G2). Tocca meta_network_alpha.yaml -> validate-datasets.
- D4 18 draft: RUN band-verify -> auto-promote su band-pass (G3). rovine_planari escluso.
- #2512 drift audit: low-touch. #2527 PHASEC decision-doc: chiudi (recommend-close) o record.

## CATALOGO — audit + wire (museum-first, DISGIUNTO da species/D4/#2536)
1. AUDIT read-only -> docs/reports/2026-06-0X-catalog-mapping-audit.md: biomi (biomes.yaml 7 campi, 2/7 a runtime per card M-018), specie (species_catalog campo->consumer->scheda), creature (lifecycle/mutation->formsPanel). Tabella campo->consumer->UI.
2. WIRE gap DISGIUNTI: biome package Minimal card M-018 (diff_base/mod_biome/hazard.severity/StressWave -> sessionHelpers/biomeSpawnBias). NON toccare species_catalog.json/ecosystems se owned (#2536 enrichment attivo).
3. Ogni wire = Gate-5 (player vede effetto <60s) + band-verify se combat.

## RICERCA game di riferimento (gia fatta — riusa; WebSearch solo se museo non copre)
Symbiont=FFXIV Cover. Minion=comanda-una-volta-segue + cap + espendibile (Masterminds/D&D/Gloomhaven). Economy=Hades currency-split + Monster Train Pact (card M-005; campaign currency, distinta dal cost-gate combat V2). Mutation/creature=MHS gene-grid + CoQ soft-bias + Subnautica (card M-007).

## ORCHESTRAZIONE /workflows (tu = coordinatore)
- Fase A (serial, tu): inventario + triage PR aperte.
- Fase B (PARALLELO via Workflow, file-DISGIUNTO): catalog-audit (read-only) || D4 band-verify (misura) || babysit #2509 a merge. Un worktree per stream.
- Fase C (SERIAL): i PR PHASEC toccano progressionApply.js/abilityExecutor.js/session.js => NON parallelizzarli (conflitto #2525/#2526). Ordine: A1b -> A2 -> B4 fase-1 -> V5 shared_hp_pool -> B5 minion -> V6 A3. Rebase tra un merge e il successivo. #2535 woundSystem e' combat parallelo: se in volo, coordina lo stato combat.
- Fase D: babysit ogni PR (Codex+CI, P1/P2, resolve) + auto-merge L3.
- COLLISION-AVOIDANCE (HARD): combat e' CONTESO (PHASEC + #2535 woundSystem); species/catalog e' CONTESO (#2536 enrichment + catalog audit). Prima di editare un file verifica via inventario che nessuna sessione ATTIVA lo tenga; se collisione -> coordina, non clobbare (anti-pattern #19 + shared-cwd). Worktree ISOLATI off origin/main, MAI il main checkout.

## CONSTRAINTS
- Worktree ISOLATO off origin/main (branch off origin/main REF; npm ci). ADR-0011 trailer (Coding-Agent: claude-opus-4.8 + Trace-Id uuidv7, NO Co-Authored-By). Prefix lowercase, subject <=72, descrizione MINUSCOLA. prettier pre-commit. Governance strict (errors=0; DECISIONS_LOG/OPEN_DECISIONS generati). node --test tests/<dir>/*.test.js (glob, NON la dir).
- NO forbidden paths (.github/workflows, migrations, packages/contracts, services/generation) — NB #2536 ha una migration, NON e' il tuo lavoro. data/core OK ma validate-datasets. Trait solo active_effects.yaml.
- TDD OBBLIGATORIO (red->green). Gate pre-commit: node -e "typeof require(...)"=function + parse log test. Baseline AI 495/495 + progression + abilityExecutor.

## STOP (imprevisti reali)
- NUOVO dep oltre jsonschema, o data-gate/schema oltre scope #2509 -> chiedi.
- shared_hp_pool: regressioni party-wipe a contatto col codice -> STOP, presenta.
- Verdetto V1-V6 ambiguo/contraddetto dal codice -> STOP (L-069).
- Collisione file con sessione ATTIVA (combat #2535 / species #2536) -> coordina, no clobber.
- band-verify FAIL ostinato fuori banda dopo tuning -> presenta numeri (L-069/L-070).

## SUCCESS
PHASEC 32/32 merged verdi. #2509 merged. D4 band-verify + promote su band-pass. Catalog audit doc + >=1 wire biome-package. #2527 chiuso. Memory + handoff aggiornati. Ogni PR babysittato Codex+CI a merge.

Inizia da STEP 0 (inventario), poi Fase A triage, poi orchestra. Procedi autonomo fino a completamento o STOP imprevisto.
```

## Note rev2

- #2502 chiuso (merged) → un item cross-session in meno; il gate CI species_catalog-schema e' ora attivo su main.
- Nuovi contesi: **combat** (PHASEC vs #2535 woundSystem) + **species/catalog** (catalog audit vs #2536 enrichment+migration). Collision-avoidance rafforzata.
- vault v7.2 + Godot-v2 link2 + Game-Database JSDoc = contesto Ryzen, fuori scope del goal Game-backend ma in inventario.
