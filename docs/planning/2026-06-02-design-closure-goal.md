---
doc_status: review_needed
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-02'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [goal, design-closure, worldgen-gap-c, reference-games, sot, style, pending-design]
---

# GOAL di riferimento — Design Closure (+ worldgen GAP-C frontier) (2026-06-02)

> **Questo è il doc operativo linkato dal `/goal`.** Il `/goal` (≤4000 char) dà solo
> obiettivo + vincoli minimi e punta qui. Tutto il dettaglio — canon da consultare,
> metodo di chiusura, inventario dei buchi di design — vive in questo file.
>
> **Scopo del GOAL (PRIMARIO = design-closure):**
>
> 1. **Design-closure** — chiudere/decidere i **buchi di design ancora in sospeso** (H2-H9, §3) usando il
>    canon (SoT + giochi di riferimento + knowledge archive + guide di design + Style), non a intuito.
> 2. **Build frontier (gated)** — GAP-C fase 2-4 worldgen meta-network (H1). ⚠️ **GAP-A ecosystem→spawn
>    è GIÀ SHIPPED (#2447)** — NON ricostruirlo (vedi §4 + verify-first).

---

## §0 — Principio cardine

Ogni decisione di design in questo GOAL si **fonda sul canon**, mai improvvisata. Pipeline obbligatoria
per ogni buco: **museum-first → SoT → giochi di riferimento → Style/guide → verdetto citato →
no-anticipated-judgment**. Verdetti soggettivi NON verificabili = `(⚠️ Claude-proposed, pending
master-dd review)` + preserva alternative (policy "No anticipated judgment", CLAUDE.md). Decidi in
autonomia solo i fork **reversibili** (doc/tool); STOP per balance/irreversibile/owner-gated.

---

## §1 — Canon da consultare (USE THESE, con path)

| Layer                                | File                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Cosa fornisce                                                                             | Quando                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **SoT design**                       | `docs/core/00-SOURCE-OF-TRUTH.md` (v5) + `90-FINAL-DESIGN-FREEZE.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                    | verità canonica loop/specie/mating/narrativa; 28 GDD OQ CLOSED (§19); loop §23            | SEMPRE prima di toccare design                                                                 |
| **Pilastri**                         | `docs/core/02-PILASTRI.md` + `docs/reports/PILLAR-LIVE-STATUS.md` (SoT 6 pilastri)                                                                                                                                                                                                                                                                                                                                                                                                                                      | i 6 pilastri + stato live reale per-pilastro                                              | per ogni buco: quale pilastro serve                                                            |
| **Loop/economia**                    | `docs/core/03-LOOP.md` · `26-ECONOMY_CANONICAL.md` · `25-REGOLE_SBLOCCO_PE.md` · `27-MATING_NIDO.md` · `28-NPC_BIOMI_SPAWN.md`                                                                                                                                                                                                                                                                                                                                                                                          | pool PP/SG max 3, PT max 12; PE=campaign-XP→PI; spawn/biomi                               | economia, PE, ecosystem→combat                                                                 |
| **Tattico/regole**                   | `docs/core/10-SISTEMA_TATTICO.md` · `11-REGOLE_D20_TV.md` · `15-LEVEL_DESIGN.md`                                                                                                                                                                                                                                                                                                                                                                                                                                        | d20, CT, AP, level design                                                                 | combat/wiring                                                                                  |
| **Giochi di riferimento (catalogo)** | **PRIMARIO `docs/guide/games-source-index.md`** — catalogo completo Tier S/A/B/C/D/E + sezione **"Mappa pilastri → top-3 source per pillar"** + **"Anti-reference (cosa NON copiare)"** + link research+museum per-gioco. Copre Triangle Strategy, Voidling Bound, Pokemon Pokopia (nido/housing), Dwarf Fortress (`ADR-2026-05-18-df-levels-integration`), Ancestors (`ADR-2026-04-27-ancestors-recovery`), Tactics Ogre, Wildermyth, Caves of Qud, RimWorld, Battle Brothers, Long War, XCOM, FFT, Brigandine, Spore… | il catalogo autoritativo: quale gioco-fonte per quale pilastro/feature + cosa NON copiare | per OGNI verdetto: parti dalla "Mappa pilastri → top-3", poi apri il research/museum del gioco |
| **Giochi — sintesi/deep-dive**       | Sintesi cross-game: `docs/research/2026-04-26-cross-game-extraction-MASTER.md` (§3 coverage-matrix per-pilastro, §6 anti-pattern, §7 status per-gioco) + `docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md`. Per-gioco: `docs/research/triangle-strategy-transfer-plan.md`, `docs/research/2026-04-26-voidling-bound-evolution-patterns.md`, `docs/reports/2026-04-26-nido-pokopia-housing-pattern.md`, museum cards (ancestors/tactics-ogre/wildermyth/coq/voidling). + `docs/guide/DESIGN-DATA-ATLAS.md` | il "come" dettagliato del transfer + i numeri                                             | dopo aver scelto il gioco dal catalogo                                                         |
| **Knowledge archive / map**          | `docs/museum/MUSEUM.md` (museum-first, Dublin-Core cards + reuse-path) + `docs/00-INDEX.md` (doc map) + `docs/governance/docs_registry.json`                                                                                                                                                                                                                                                                                                                                                                            | idee sepolte/curate già valutate; mappa dei doc                                           | PRIMA di WebSearch/dig su un dominio nuovo (CLAUDE.md museum-first)                            |
| **Guide di design**                  | `docs/core/*` (30 GDD numerati) + `docs/guide/` (how-to, integration, templates)                                                                                                                                                                                                                                                                                                                                                                                                                                        | spine di design + procedure                                                               | reference continuo                                                                             |
| **Style**                            | `docs/core/42-STYLE-GUIDE-UI.md` · `00E-NAMING_STYLEGUIDE.md` · `docs/frontend/styleguide.md` · `config/styleguide_sla.json` · `docs/COMMIT_STYLE.md`                                                                                                                                                                                                                                                                                                                                                                   | UI/HUD telegraph, naming, commit                                                          | ogni surface/naming/commit                                                                     |
| **Decisioni**                        | `OPEN_DECISIONS.md` (OD-XXX) + `DECISIONS_LOG.md` (30 ADR) + `LIBRARY.md`                                                                                                                                                                                                                                                                                                                                                                                                                                               | cosa è già deciso/aperto; reference sistemi esterni                                       | inventario + non-ricontraddire ADR                                                             |
| **Memory**                           | `~/.claude/projects/C--dev-Game/memory/` (`MEMORY.md` index + `project_*`)                                                                                                                                                                                                                                                                                                                                                                                                                                              | stato cross-session, lezioni, ground-truth                                                | leggi PRIMA di scoping (anti-pattern #19)                                                      |

> ⚠️ "Knowledge map": non esiste un file `knowledge-map.md` dedicato — il layer di navigazione della
> conoscenza = **MUSEUM.md + 00-INDEX.md + docs_registry.json**. Se master-dd intende un artefatto
> diverso (es. AA01/archon KM), aggiungerlo qui.

---

## §2 — Metodo di chiusura per ogni buco di design

Per OGNI buco (vedi §3), in quest'ordine:

1. **Verify-first ground-truth** (anti-pattern #19, lezione 2026-06-02 = 3× near-rework): `git fetch origin main`
   - `git log origin/main -S <simbolo>` + leggi la memory del dominio. **Marker/doc=ipotesi, origin/main+git=verità.** Non rifare lavoro shippato.
2. **Museum-first**: cerca in `MUSEUM.md` la card del dominio (reuse-path + effort + blast-radius) prima di ricercare da zero.
3. **SoT check**: il buco è già risolto/specificato nel SoT o nei 30 GDD? Se sì → applica il canon, non re-derivare.
4. **Reference-game lookup**: parti dal **catalogo `docs/guide/games-source-index.md`** → sezione **"Mappa pilastri → top-3 source per pillar"** (i 3 giochi-fonte del pilastro del buco) + **"Anti-reference"** (cosa NON copiare). Poi apri il research/museum del gioco scelto (es. Triangle Strategy / Voidling Bound / Pokopia / Dwarf Fortress / Ancestors / Tactics Ogre) + `cross-game-extraction-MASTER.md` §3/§7 per la sintesi. **Cita il gioco-fonte** come base del verdetto.
5. **Style/guide**: ogni surface rispetta `42-STYLE-GUIDE-UI` (telegraph/intent-preview) + `00E-NAMING`; ogni naming il naming-styleguide.
6. **Verdetto**: proponi 1 default con rationale + **citazione canon** (SoT §X / gioco Y / ADR Z). Se è un fork
   soggettivo/balance → `(⚠️ Claude-proposed, pending master-dd review)` + preserva alternative + museum card per scartati.
7. **Esecuzione**: reversibile (doc/tool) → decidi + ship. Irreversibile/balance/owner-gated → STOP per verdetto master-dd.
   Se richiede build → **Gate-5 engine-wired DoD** (player VEDE l'effetto <60s) + **flag OFF-default** + **band-verify** post-wire.

---

## §3 — Inventario buchi di design (CANDIDATI — verify-first ciascuno)

> Questi sono **ipotesi da verificare su origin/main**, non fatti. Stato al 2026-06-02 da memory/sessione.

| ID     | Buco                                                                                       | Stato presunto                                                                                                                                                                                                                                                 | Domanda di design                                                                         | Canon da consultare                                                                                                                                                        | Default proposto (caveato)                                                                                                                               | Gate                                               |
| ------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **H1** | **Worldgen frontier — GAP-C fase 2-4** (⚠️ GAP-A+B GIÀ SHIPPED #2447; GAP-C Stage-1 #2509) | GAP-A foodweb→spawn filter è **LIVE** (`reinforcementSpawner.js:158-173` `filterReinforcementPool`, Caves-of-Qud whitelist, kill-switch `policy.foodweb_filter`, Gate-5 console; test 8/8+23/23). GAP-C meta-network routing Stage-1 shipped flag OFF (#2509). | fase 2-4: arc-conditions full + Godot choice-UI + generative grammar — costruire o gated? | `BACKLOG.md:22-28` (GAP-A+B closed) + #2509 memory + ADR `2026-06-01` (#2500) + reference-game **Dormans mission-grammar + Into the Breach hand+random** (MASTER §3 P5)    | fase-2 arc-conditions = DATA-GATE autorizzato (#2500 ADR); UI/grammar = master-dd                                                                        | 🔴 BUILD + data-gate → spec → master-dd → flag-OFF |
| **H2** | **Economy combat cost-gate**                                                               | tutti i combat `cost_sg/pp/pt` DECORATIVI (solo `cost_ap` gated) + scale-incoerenti (valori 3..100 vs pool max PP/SG=3, PT=12)                                                                                                                                 | gate reale dei costi ultimate vs SoT pools?                                               | `26-ECONOMY_CANONICAL` (pool max) + spec `docs/superpowers/specs/2026-06-01-phasec-economy-cost-gate.md` (#2530-A2, opts A-rescale/B-consume-all/**C-hybrid rec**/D-leave) | C-hybrid (rank≤2 numerico, ultimate consume-all) — `(⚠️ pending master-dd)`                                                                              | 🟡 balance → STOP master-dd verdict                |
| **H3** | **Campaign-XP earn-wire**                                                                  | `first_kill_pe_bonus`/`minion_kill_pe_bonus` campaign-XP-UNWIRED post #2528                                                                                                                                                                                    | come accreditano XP→PI?                                                                   | `25-REGOLE_SBLOCCO_PE` + #2530-A3 wire-path + reference-game **XCOM perk / Wesnoth advancement** (MASTER §3 P3)                                                            | wire al campaign-reward accounting (debrief→advance) — `(⚠️ pending)`                                                                                    | 🟡 cross-layer → spec → master-dd                  |
| **H4** | **Cat F roll-tags**                                                                        | aberrant 5/7; 3 roll-tags + `phenotype_double_use` deferred (manca random-roll/cooldown system)                                                                                                                                                                | costruire il sub-system random-roll/cooldown o tagliare?                                  | `22-FORME_BASE_16` + mutation design + spec #2530                                                                                                                          | costruisci sub-system minimale dietro DoD, OR taglia con museum card                                                                                     | 🟡 design fork → master-dd                         |
| **H5** | **OQ-BOND / OQ-MINION residui**                                                            | symbiont fork + minion fork specificati (#2530 B4/B5) ma alcuni rami deferred                                                                                                                                                                                  | quali rami bond/minion canonizzare?                                                       | #2530 B4/B5 + reference-game **FFXIV Cover (bond)** + **pet/minion AI** (MASTER §7)                                                                                        | per-ramo: applica il rec del #2530 — `(⚠️ pending)`                                                                                                      | 🟡 master-dd                                       |
| **H6** | **Ecosystem-tier files dormant + 17 thin no-producer**                                     | combat usa i **foodweb files** (`data/foodwebs/<b>_foodweb.yaml`, LIVE via GAP-A #2447); gli `.ecosystem.yaml` tier-trofico sono letti SOLO da report/export; 17/18 hanno ZERO produttori                                                                      | i tier-trofico devono mai alimentare il combat? + producer-completeness dei 17            | `28-NPC_BIOMI_SPAWN` + `foodwebFilter.js` (verifica: legge foodweb vs ecosystem) + review `docs/planning/2026-05-31-d4-ecosystem-draft-review.md` (⚠️ STALE post-#2510)    | ecosystem-tier = report-only by-design (foodweb già copre il combat); producer-sourcing dei 17 = scelta master-dd SE/QUANDO i tier diventano combat-live | 🟡 design (no build urgente)                       |
| **H7** | **Pilastri 🟡 residui**                                                                    | 6/6 🟢 per PILLAR-LIVE-STATUS post #2516, ma surface-debt possibile                                                                                                                                                                                            | quali surface-gap restano (Engine-LIVE Surface-DEAD)?                                     | `PILLAR-LIVE-STATUS.md` + `02-PILASTRI` + Gate-5                                                                                                                           | audit Gate-5 per pilastro → wire i gap                                                                                                                   | 🟢 reversibile (wire)                              |
| **H8** | **1-HP-tail comment**                                                                      | RATIFICATO master-dd 2026-06-02 (both-KO a pool ≤1)                                                                                                                                                                                                            | — (deciso)                                                                                | `symbiontBond.js`                                                                                                                                                          | micro: togli "pending master-dd review" dal commento                                                                                                     | 🟢 micro-cleanup                                   |
| **H9** | **OD residui**                                                                             | OD-022 (evo-swarm gate, implicit-accept), OD-023 (Phase-B date, probabilmente MOOT post-cutover)                                                                                                                                                               | chiudere/archiviare?                                                                      | `OPEN_DECISIONS.md` (generato — NON editare a mano; usa `generate_open_decisions.py`)                                                                                      | verifica stato + archivia i moot                                                                                                                         | 🟢 reversibile (governance)                        |

> **Sequenza consigliata**: reversibili-prima → **H8** (micro cleanup) → **H7** (audit Gate-5 + wire surface-gap) → **H9** (OD governance). Poi batch verdetti gated master-dd: **H2/H3/H4/H5** (PHASEC) + **H6** (ecosystem-tier design). **H1** (GAP-C fase-2 build, data-gate) solo dopo spec + verdetto master-dd. NB il "build primario" NON è GAP-A (già shipped #2447) — il grosso del GOAL è **design-closure** (decidere, non costruire).

---

## §4 — H1 Worldgen: cosa è GIÀ FATTO vs la frontiera reale

⚠️ **Correzione (Codex #2551 P2, verify-first 2026-06-02)**: GAP-A NON è un buco — è **SHIPPED**.

- **GAP-A foodweb→spawn = LIVE** (PR #2447 `04a3920a`): `apps/backend/services/worldgen/foodwebFilter.js` `filterReinforcementPool` è importato + applicato in `apps/backend/services/combat/reinforcementSpawner.js:31` + `:158-173` (whitelist Caves-of-Qud sul pool di rinforzo per bioma; kill-switch `policy.foodweb_filter===false`; fallback band-safe che non svuota mai il pool; surface Gate-5 console/replay). Test: `foodwebFilter.test.js` 8/8 + `reinforcementSpawner.test.js` 23/23. **BACKLOG.md:22-28 lo conferma chiuso.** Quindi i biomi GIÀ shape-ano gli spawn di combat. La mia memory D4 "ecosystems combat-DORMANT / GAP-A NOT built" era STALE (anti-pattern #19).
- **Sfumatura**: il combat consuma i **foodweb files** (`data/foodwebs/<b>_foodweb.yaml`). Gli `.ecosystem.yaml` (tier-trofico, i 21 di #2505/#2510) restano report/export-only — vedi H6 (decisione design: serve mai farli combat-live, o è ridondante col foodweb?).
- **Frontiera build reale = GAP-C fase 2-4** (worldgen meta-network): Stage-1 routing shipped flag OFF (#2509 `d05fe323`). fase-2 arc-conditions (DATA-GATE autorizzato via #2500 ADR) + fase-3 Godot choice-UI + fase-4 generative grammar = NON costruiti. DoD Gate-5 (player VEDE la scelta di routing/condizione in <60s) + flag OFF-default + spec → verdetto master-dd PRIMA di build.
- **VERIFY-FIRST obbligatorio** prima di toccare worldgen: `git log origin/main -S filterReinforcementPool` + leggi BACKLOG:22-28 + #2509 memory. In questa sessione la stessa area ha prodotto **4× near-rework** su stato stale.

---

## §5 — Process & constraints

- **Worktree ISOLATO** off origin/main (`npm ci` se serve backend/build; docs-only NO). **MAI il main checkout** `C:/dev/Game` (= `claude/fix-ecotypes-enum` WIP altra sessione).
- **Commit**: ADR-0011 trailer (`Coding-Agent: claude-opus-4.8` + `Trace-Id` uuidv7, **NO** Co-Authored-By); prefix lowercase, subject ≤72, desc minuscola, **NO em-dash** (ASCII, anti-pattern #12); prettier pre-commit (`npm install --no-save prettier@3.3.3` nel worktree se manca).
- **Test**: `node --test tests/<dir>/*.test.js` (glob, node v24); TDD red→green; pre-commit gate `node -e "typeof require"` + parse logfile via PowerShell. Baseline AI 500/500 + progression + abilityExecutor.
- **Governance**: `python tools/check_docs_governance.py --strict` errors=0 per ogni `.md` in `docs/` (frontmatter sufficiente, NO edit manuale registry/DECISIONS_LOG/OPEN_DECISIONS = generati). `validate-datasets` + trace_hash regen (inline `_stable_digest` su 1 file, NO blanket) se tocchi yaml dati.
- **Forbidden paths**: `.github/workflows`, `migrations`, `packages/contracts`, `services/generation`. `data/core`+`packs` OK ma validate.
- **Babysit OGNI PR**: CI + Codex (`gh api .../pulls/<n>/comments`, address P1/P2 + reply+`resolveReviewThread`), auto-merge L3 SOLO a 7 gate verdi.
- **Collision-avoidance HARD**: `git worktree list` + `gh pr list` PRIMA. #2535 OD-058 woundSystem (combat, altra sessione) open → se tocca combat, coordina NO clobber. Verifica nessuna sessione attiva tenga i file editati.

---

## §6 — STOP conditions (chiedi, non auto-decidere)

- Verdetto design/balance su H1/H2/H3/H4/H5/H6 (gated master-dd).
- Flag GAP-A ON in produzione (decisione master-dd).
- Nuovo dep oltre l'esistente; schema/migration; forbidden path.
- Band-verify fuori banda ostinato dopo tuning (L-069).
- Verdetto canon ambiguo/contraddetto dal codice.

---

## §7 — Output atteso

1. Un **design-closure report** (`docs/reports/YYYY-MM-DD-design-closure.md`) con, per ogni buco lavorato:
   verdetto + citazione canon (SoT/gioco/ADR) + stato (deciso reversibile / pending master-dd / shipped).
2. PR per i fix reversibili (H7 wire, H8 cleanup, H9 governance) + spec/brainstorm doc per i gated (H1/H2/H3/H4/H5/H6).
3. Museum card per ogni idea scartata (additive-only, `repo-archaeologist`).
4. Memory update (`MEMORY.md` + `project_*`) + handoff a fine sessione.

---

## §8 — Provenienza

- Origine: sessione GOAL MASTER 2026-06-02 (PHASEC 32/32 COMPLETE → #2542 `0f9be016`; #2509 merged `d05fe323`; D4 promote già fatto #2505/#2510). Vedi memory `project_phasec_job_perks_plan.md` + `project_d4_biome_affinity_gate.md`.
- ⚠️ Doc autonomo Claude, `doc_status: review_needed` — i criteri/priorità/default sono **proposte pending master-dd**; il canon citato è verità, i verdetti proposti no.
