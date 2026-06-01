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

# Master GOAL handoff (2026-06-01)

> Messaggio `/goal` da incollare in una sessione coordinatrice unica per chiudere
> l'intero backlog: PHASEC perk 32/32 + audit/wire catalogo + triage/merge del
> lavoro delle altre sessioni. Tutti i verdetti master-dd (6 PHASEC + 3 gate
> cross-session) sono gia' DECISI dentro il messaggio → gira end-to-end senza
> fermarsi a chiedere, salvo imprevisti reali.

## Come lanciare (checklist pre-lancio)

1. **Repo = `C:/dev/Game`** (Evo-Tactics). Tutto il lavoro vive li' (`apps/backend`,
   `data/core`, `docs/`, `packs/`, tutte le PR, `gh` configurato per
   `MasterDD-L34D/Game`, vault `C:/dev/vault` raggiungibile come grounding).
   NON Game-Database / Game-Godot-v2 / vault.

2. **Worktree discipline**: il main checkout `C:/dev/Game` e' ora su
   `claude/fix-ecotypes-enum` con WIP non committato. La sessione `/goal` **NON deve
   editare il main checkout** — lavora in worktree ISOLATI off `origin/main` (il
   messaggio lo impone). L'inventario legge `origin/main` via `git fetch`, non
   dipende dal branch del checkout.

3. **Chiudi le sessioni parallele PRIMA** (intento "coordinatore unico" → evita la
   contaminazione shared-checkout, lezione nota). Stato verificato 2026-06-01:

   - **GAP-C `claude/worldgen-gapc-fase2-impl`** (`_gamewt-gapc2impl`): **pulito** →
     chiudibile subito (lavoro in PR #2509).
   - **D4 `claude/d4-ecoyaml`** (`_gamewt-d4`): 1 file untracked
     (`docs/planning/2026-05-30-biome-affinity-draft.json`) → committa o conferma
     scartabile prima di chiudere.
   - **species `claude/fix-ecotypes-enum`** (main checkout): **6 file non
     committati** → ⚠️ committa+pusha su #2502 prima di chiudere (non perdere WIP;
     i file restano comunque su disco, ma meglio nel PR).

4. **Lancia**: cwd = `C:/dev/Game` → `/goal` → incolla il blocco sotto. La sessione
   fa subito STEP 0 (inventario) e crea i worktree isolati.

## Verdetti + gate (riferimento rapido)

| ID  | Item                     | Decisione                                                                |
| --- | ------------------------ | ------------------------------------------------------------------------ |
| V1  | OQ-F-impl (Cat F 7/7)    | phenotype 1d6 Option A + use-cap 1/round (capstone 2)                    |
| V2  | OQ-ECON (cost-gate)      | Hybrid: rank<=2 numerico, ultimate consume-all + seed PT/PP pool         |
| V3  | OQ-BOND (symbiont 7 tag) | FFXIV Cover: bond@cast adiacente, redirect post-intercept, KO-capped     |
| V4  | OQ-MINION (8 tag)        | COSTRUISCI: player+owner_id, AI scriptata, espendibile, spike+coop-smoke |
| V5  | shared_hp_pool           | pool combinato somma-HP, both-KO, supersede death-grace (PR a parte)     |
| V6  | A3 campaign-XP           | BUILD: debrief first_kill_actor_id + grantXp perUnitBonus                |
| G1  | #2502 dep jsonschema     | ✅ APPROVATO → babysit a merge                                           |
| G2  | #2509 GAP-C data         | ✅ APPROVATO merge (ADR accettato, flag OFF)                             |
| G3  | D4 promote               | ✅ auto-promote su band-pass (HC06 15-25% + HC07 30-50%)                 |

## Messaggio `/goal` (incolla questo)

```
GOAL MASTER — sei il COORDINATORE UNICO cross-session. Chiudi tutto il backlog Evo-Tactics: PHASEC perk 32/32 + audit/wire catalogo + triage/assorbi/mergia il lavoro delle altre sessioni (species #2502, GAP-C #2509, D4, governance). TUTTI i verdetti master-dd sono INCLUSI e DECISI (PHASEC + i 3 gate cross-session) — non c'e' nulla da chiedere salvo imprevisti reali. Orchestra via /workflows: TU = main-thread coordinatore (inventario -> triage -> fan-out parallelo file-DISGIUNTO -> integra -> babysit ogni PR a merge). Self-contained.

## GATE master-dd DECISI (2026-06-01) — esegui, non richiedere
- #2502 (species): dep `jsonschema>=4.18.0` APPROVATO (standard + fixa 96 ecotypes invalidi + gate CI). Babysit a merge.
- #2509 (GAP-C fase-2): APPROVATO merge (gia' ADR-2026-05-31 ACCEPTED, flag OFF default, 2 edge + test). Babysit a merge.
- D4 18 draft ecosystems: AUTO-PROMOTE per-eco SOLO se band-verify passa (HC06 in [15-25%] E HC07 in [30-50%], seed 4242, N=40); falliti restano draft + flaggati; rovine_planari OFF-LIMITS (D6).

## STEP 0 — Onboarding + INVENTARIO (PRIMA di tutto)
1. Memory: C:/Users/edusc/.claude/projects/C--dev-Game/memory/project_phasec_job_perks_plan.md (sezione SESSION 2026-06-01) + MEMORY.md (indice di TUTTE le sessioni).
2. Handoff cross-session: docs/planning/2026-05-31-parallel-sessions-sync-handoff.md (stato governance/D4/GAP-C + processi nuovi) + docs/planning/2026-06-01-master-goal-handoff.md (questo).
3. INVENTARIO LIVE: `gh pr list --state open --json number,title,isDraft,headRefName`; `git worktree list`. Per ogni PR: `gh pr view <n> --json mergeable,reviews` + `gh api .../pulls/<n>/comments`. Mappa ready vs gated vs owned-da-altra-sessione.
4. MUSEO (museum-first OBBLIGATORIO prima di WebSearch): docs/museum/MUSEUM.md + card M-2026-04-27-005 (Hades currency), M-2026-04-27-007 (MHS gene-grid + CoQ morphotype soft-bias + Subnautica), M-2026-04-26-018 (biomes.yaml 2/7 campi consumati = gap schede biomi), worldgen-bridge-species-network-glue.
5. SoT: vault C:/dev/vault/Spaces/Dev/Evo-Tactics/core/26-ECONOMY_CANONICAL.md (PT 0-12/PP 0-3 consume-all/SG 0-3; PE=XP campaign) + data/core/jobs_expansion.yaml + biomes.yaml + species_catalog.json.
6. PROCESSI NUOVI (handoff §3): DECISIONS_LOG.md + OPEN_DECISIONS.md GENERATI (NON editare a mano; tools/generate_*.py / docs_governance_migrator.py reconcile; CI fail-on-diff). MERGE-GATE = leggi Codex, NON solo CI.
7. Ground-truth: git fetch origin main; verifica #2529 (54bc1eec) + #2530 (2181e11e) MERGED. Se NO -> STOP.

## VERDETTI PHASEC (tutti decisi -> 32/32 tag, zero deferred)
V1 OQ-F-impl (Cat F 7/7): phenotype_shift -> 1d6 random. Mapping Option A: 1=attack_mod+3, 2=defense_mod+3, 3=mobility+2 (mobility_bonus buff), 4=+1 ap_remaining immediato, 5=heal 4 (cap max_hp), 6=initiative+5 (buff durata). Cap base 1/round; capstone phenotype_double_use->2/round (use-counter per-round generico). double_phenotype_roll = 2 roll, stesso outcome stacka additivo.
V2 OQ-ECON (cost-gate) = Option C HYBRID: rank<=2 gate numerico esatto (rescala a <=pool i cost che sforano); ultimate (cost>=pool_max) = consume-all. PRIMA seeda pool PT+PP in normaliseUnit (mirror sg) + earn (PP +1 crit/+1 kill, PT per-round cap 12) + reset. Poi gate (check + deduct post-2xx) in executeAbility. band-verify HC06/HC07 seed 4242 OBBLIGATORIA. validate-datasets su cost_*.
V3 OQ-BOND (symbiont fase-1, 7 tag) [FFXIV Cover]: bond al cast su alleato adiacente, persiste, ri-castabile; redirect DOPO intercept-reroute su danno residuo; symbiont KO -> redirect capped al suo HP; dual_bond cap 100%; bond_no_distance_limit (capstone) toglie gate adiacenza; opz. bond costa SG.
V4 OQ-MINION (COSTRUISCI, 8 tag Cat E) [Gloomhaven/Masterminds]: controlled_by 'player' + owner_id = beastmaster; AI scriptata minima (move-to/attack-nearest) + pack_command 1 ordine free/round (NO declareSistemaIntents pieno); morte espendibile, NON conta party-wipe; minion_resurrect_chance re-spawn 1HP fine-round; spawn tile adiacente libero (else 400); agisce nel turno del BM (no slot initiative); cap=max_minions. Spike POC (1 minion) PRIMA + coop-phase-validator smoke gate OBBLIGATORIO pre-ship (rischio P5).
V5 OQ-DEATH shared_hp_pool (symbiont capstone): pool combinato = somma HP dei 2 bonded, danno a uno splitta equo sui 2 bar, ENTRAMBI KO quando il combinato arriva a 0 (faithful al data). PR PROPRIO + edge-test pesanti (bond su unita gia bassa / KO mid-bond / re-bond) + band-verify. bonded_death_grace SUPERSEDED quando shared_hp_pool attivo (morte simultanea). Il piu rischioso -> ultimo dei symbiont.
V6 A3 campaign-XP (BUILD): combat debrief espone first_kill_actor_id; grantXpToSurvivors(units, amount, {perUnitBonus}); campaign advance costruisce perUnitBonus da _perk_passives (first_kill_pe_bonus -> first-killer; minion_kill_pe_bonus -> per minion-kill, cap_per_round). Dopo V4. first_kill_pe_bonus puo landare col canale debrief indipendentemente.

## CROSS-SESSION (gate DECISI sopra — esegui; NON duplicare, NON clobbare se sessione attiva)
- #2502 species: babysit a merge (dep approvato). Se la sua sessione e' ancora attiva sui file -> coordina, non clobbare.
- #2509 GAP-C: babysit a merge (approvato). Tocca meta_network_alpha.yaml (data) -> validate-datasets.
- D4: RUN N=40 band-verify per i 18 draft -> AUTO-PROMOTE su band-pass a packs/evo_tactics_pack/data/ecosystems/ (criterio gate sopra); presenta tabella. rovine_planari escluso.
- #2512 weekly drift audit: low-touch (babysit se ready+Codex-clean, else lascia).
- #2527 PHASEC decision-doc: chiudi (recommend-close gia commentato) o mergi come record.

## CATALOGO — audit + wire (museum-first, DISGIUNTO da species/D4)
1. AUDIT read-only -> docs/reports/2026-06-0X-catalog-mapping-audit.md: biomi (biomes.yaml 7 campi, oggi 2/7 a runtime per card M-018), specie (species_catalog campo->consumer->scheda), creature (lifecycle/mutation->formsPanel). Tabella campo->consumer->UI.
2. WIRE gap DISGIUNTI sicuri: biome package Minimal card M-018 (diff_base/mod_biome/hazard.severity/StressWave -> sessionHelpers/biomeSpawnBias, ~3h) = quick-win. NON toccare species_catalog.json/ecosystems se owned.
3. Ogni wire = Gate-5 (player vede effetto <60s) + band-verify se tocca combat.

## RICERCA game di riferimento (gia fatta — riusa; WebSearch solo se museo non copre)
Symbiont=FFXIV Cover (redirect totale, range-gate, costa gauge, ignora buff coperto). Minion=comanda-una-volta-segue + cap + espendibile (Masterminds/D&D/Gloomhaven). Economy=Hades currency-split + Monster Train Pact (card M-005; campaign currency, distinta dal cost-gate combat V2). Mutation/creature=MHS gene-grid + CoQ soft-bias + Subnautica (card M-007).

## ORCHESTRAZIONE /workflows (tu = coordinatore)
- Fase A (serial, tu): inventario + triage PR aperte (babysit-ready / absorb / close-superseded).
- Fase B (PARALLELO via Workflow, file-DISGIUNTO): stream catalog-audit (read-only doc) || stream D4 band-verify (misura) || babysit #2502/#2509 a merge. Un worktree per stream.
- Fase C (SERIAL obbligatorio): i PR PHASEC toccano progressionApply.js/abilityExecutor.js/session.js => NON parallelizzarli (lezione conflitto #2525/#2526). Ordine: A1b -> A2 -> B4 fase-1 -> V5 shared_hp_pool -> B5 minion -> V6 A3. Rebase su origin/main tra un merge e il successivo.
- Fase D: integra + babysit ogni PR (Codex+CI, address P1/P2, resolve thread) + auto-merge L3.
- COLLISION-AVOIDANCE (HARD): prima di editare un file, verifica via inventario che nessuna sessione/worktree ATTIVA lo tenga. Se collisione -> coordina, non clobbare (anti-pattern #19 + memory shared-cwd). Worktree ISOLATI off LATEST origin/main, MAI il main checkout.

## CONSTRAINTS (non-negoziabili)
- Worktree ISOLATO off origin/main (branch off origin/main REF; npm ci). ADR-0011 trailer (Coding-Agent: claude-opus-4.8 + Trace-Id uuidv7, NO Co-Authored-By). Prefix lowercase, subject <=72, descrizione MINUSCOLA. prettier pre-commit. Governance strict (errors=0; DECISIONS_LOG/OPEN_DECISIONS generati). node --test tests/<dir>/*.test.js (glob, NON la dir).
- NO forbidden paths (.github/workflows, migrations, packages/contracts, services/generation). data/core OK ma validate-datasets. Trait solo active_effects.yaml.
- TDD OBBLIGATORIO (red->green). Gate pre-commit: node -e "typeof require(...)"=function + parse log test. Baseline AI 495/495 + progression + abilityExecutor.

## STOP (solo imprevisti reali — il resto e' deciso)
- NUOVO dep oltre jsonschema, o NUOVO data-gate/schema oltre lo scope #2509 -> chiedi.
- shared_hp_pool: se la morte combinata crea regressioni party-wipe a contatto col codice -> STOP, presenta.
- Verdetto V1-V6 ambiguo/contraddetto dal codice -> STOP e segnala (L-069).
- Collisione file con sessione ATTIVA -> coordina (no clobber).
- band-verify FAIL ripetuto fuori banda dopo tuning -> presenta numeri, non forzare (L-069/L-070).

## SUCCESS
PHASEC 32/32 (Cat F 7/7 + economy gate + symbiont 7+shared_hp_pool + minion 8 + A3 PE) merged verdi. #2502 + #2509 merged. D4 band-verify runnata + promote su band-pass. Catalog audit doc + >=1 wire biome-package. #2527 chiuso. Memory + handoff + sprint aggiornati. Ogni PR babysittato Codex+CI a merge.

Inizia da STEP 0 (inventario), poi Fase A triage, poi orchestra. Procedi autonomo fino a completamento o STOP imprevisto.
```
