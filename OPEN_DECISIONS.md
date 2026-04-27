# OPEN_DECISIONS — Evo-Tactics

> **Scope**: decisioni ambigue ma non bloccanti, da risolvere con miglior default + review quando possibile.
> **Sorgente template**: `07_CLAUDE_CODE_OPERATING_PACKAGE/OPEN_DECISIONS.template.md` archivio.
> **Differenza da DECISIONS_LOG.md**: quello è index ADR storici (decisioni prese). Questo file = domande ancora aperte o proposte non ancora confermate.
> **Ciclo di vita**: una volta risolta (con ADR, test playtest, o decisione esplicita user), sposta in DECISIONS_LOG o chiudi con verdict.

---

## Aperte

### [OD-001] V3 Mating/Nido — scope e timing ✅ FULL CLOSURE 2026-04-27 notte

- **Livello**: game + system
- **Stato**: **FULL CLOSURE 2026-04-27 notte** — verdict user **Path A** confermato + PR #1877 superseded chiuso definitivamente. Sprint Nido Path A 4/4 SHIPPED end-to-end + UI Mating tab via combo:
  - Sprint A nestHub panel + biome_arc unlock (PR #1876)
  - Sprint B debrief recruit wire (PR #1875)
  - Sprint C backend mating roll + 3-tier offspring (PR #1879)
  - Sprint D lineage chain + tribe emergent (PR #1874)
  - Lineage tab UI nestHub (PR #1911)
  - **PR #1877** (Sprint C UI con conflict frontend) → **CLOSED-superseded 2026-04-27 notte** dopo verifica 51K LOC stale rispetto a main: tutto il content backend già live via #1879, UI Mating tab già coperta da Sprint A scaffold + Lineage tab. Niente perso, doppio shipping evitato.
  - **Breakthrough 2026-04-26**: tribe **emerge automaticamente** dalla catena Nido→offspring→`lineage_id` — Path C (replace job system ~40h breaking) deprecato dalla scoperta.
  - **Pillar P2 → 🟢 candidato def** (post Spore Moderate #1913+#1915+#1916 + Lineage tab #1911).
- **Storico (preservato)**: claim originale 2026-04-25 "runtime zero / green-field" era basato su audit incomplete. Reality: engine LIVE da 4 mesi. Vedi card [M-2026-04-25-007 Mating Engine Orphan](docs/museum/cards/mating_nido-engine-orphan.md).
- **Reality verified 2026-04-25**:
  - `apps/backend/services/metaProgression.js` (469 LOC): `canMate`, `rollMating`, `computeMatingRoll`, `setNest`, `tickCooldowns`, `recruitFromDefeat` engine D1+D2 LIVE. Intro `ea945a56` (PR #1435 Design Freeze v0.9), Prisma adapter `3272f844` (PR #1679, 2026-04-23)
  - `apps/backend/routes/meta.js` (119 LOC): 7 endpoint REST `/api/meta/{npg,affinity,trust,recruit,mating,nest,nest/setup}` LIVE
  - Prisma model `UnitProgression` + migration `0004` shipped
  - **ZERO frontend integration** (`grep -rn "/api/meta" apps/play/` = 0 hit) → engine = dead path completo
- **Decisione product P0 needed** (3 path):
  - **Path A — Activate** (~12-15h): wire frontend `apps/play/src/{debriefPanel,nestHub}.js` chiama `/api/meta/*`. Output: V3 🟢 reale. Pillar P2/P3 🟢. Cross-link card M-008 nido itinerante (Skiv vagans pilot).
  - **Path B — Demolish** (~2h): routes 410 Gone + service `// QUARANTINED` header + ADR. Output: drift docs/runtime risolto, sunk cost (~50-80h shippato) accettato. OD-001 chiude → "engine quarantined, V3 truly post-MVP".
  - **Path C — Sandbox** (~5h): feature-flag OFF + sandbox script + OpenAPI doc. Output: engine pronto a riattivare senza re-scoping completo.
- **Ambiguità originale residua**: solo se Path A → quanti tagli accettabili? Quale subset prioritario (recruit-only? mating-only? nest-only?)?
- **Perché conta**: pilastro P2 (Evoluzione emergente) sarebbe **già operativo** se Path A. Senza decisione → drift docs/runtime resta + futuri agent confusione.
- **Miglior default proposto**: **decisione product PRIMA del prossimo Sprint M14**. Path C (sandbox) è low-risk middle-ground se decisione blocked.
- **Rischio se ignorata**: 50-80h sunk cost + OD/runtime drift permanente.
- **File o moduli coinvolti**: `apps/backend/services/metaProgression.js`, `apps/backend/routes/meta.js`, `apps/backend/prisma/migrations/0004_unit_progression.sql`, frontend `apps/play/src/` (Path A only).
- **Prossima azione consigliata**: **user review card M-007 + decision verdict Path A/B/C**. Cross-card link M-008 (nido itinerante Skiv) per Path A content.
- **Skiv link**: weak diretto (vagans = loner mating-blocked). Indiretto: Path A abilita "recruit ex-nemico nel debrief" Skiv narrative beat (vagans seguendo vincente).
- **Ref**: card [M-2026-04-25-007 Mating Engine Orphan](docs/museum/cards/mating_nido-engine-orphan.md), [M-2026-04-25-008 Nido Itinerante](docs/museum/cards/mating_nido-canvas-nido-itinerante.md), [excavations/2026-04-25-mating_nido-inventory.md](docs/museum/excavations/2026-04-25-mating_nido-inventory.md).

### [OD-002] V6 UI TV dashboard polish — priorità vs playtest feedback

- **Livello**: repo (frontend UI)
- **Stato**: in attesa (deferred post-playtest)
- **Ambiguità**: V6 gap identificato = UI TV dashboard è funzionale ma non "polished". Priorità rispetto a altri UX fix dipende da feedback playtest.
- **Perché conta**: user-facing, prima impressione playtest. Ma polish senza feedback real = guessing.
- **Miglior default proposto**: deferred fino a post-TKT-M11B-06 playtest. Raccogli feedback, allora applica fix mirati.
- **Rischio se ignorata**: playtest "feels rough" → confusion player, blocca M14 sprint.
- **File o moduli coinvolti**: `apps/play/src/*.css`, `apps/play/src/lobbyBridge.js`, `docs/frontend/`.
- **Prossima azione consigliata**: invoke skill `design-critique` o `ux-copy` post-playtest su artefatti raccolti.

### [OD-003] Triangle Strategy rollout sequence — M14-A/B vs M15 priorità

- **Livello**: game + system
- **Stato**: proposta (`docs/research/triangle-strategy-transfer-plan.md` sezione "Suggested rollout")
- **Ambiguità**: 3 slice proposti (M14-A, M14-B, M15) sono sequenza o possono parallelizzare? Effort aggregate ~35h è fattibile in un singolo mega-sprint o va spezzato?
- **Perché conta**: ogni slice tocca pilastri diversi (1 Tattica, 4 MBTI, 3 Specie×Job). Sequenza sbagliata = blocco su pilastro con più dipendenze.
- **Miglior default proposto**: sequenza M14-A → M14-B → M15 come indicato nel transfer plan. M14-A (elevation + terrain) per Pilastro 1 (già 🟢, lo rafforza). M14-B (Conviction system) per Pilastro 4 (sblocca da 🟡++ a 🟢 candidato). M15 (CT bar + promotion) per Pilastro 3.
- **Rischio se ignorata**: transfer plan resta carta senza ticket reali.
- **File o moduli coinvolti**: `apps/backend/services/combat/` (elevation, terrain, reaction), `apps/backend/services/vcScoring.js` (MBTI), `apps/backend/services/roundOrchestrator.js` (CT bar).
- **Prossima azione consigliata**: aprire 3 ticket concreti (M14-A, M14-B, M15) con effort breakdown dopo playtest live.

### [OD-004] Game-Database HTTP runtime Alt B — quando attivare

- **Livello**: system + repo
- **Stato**: flag-OFF, scaffold esistente (ADR-2026-04-14)
- **Ambiguità**: Alt B HTTP runtime è dormiente. Quando attivarlo? Serve il sibling repo essere deployato prima? Test di smoke adeguato?
- **Perché conta**: trait glossary shared tra Game e Game-Database sarebbe valore reale (dual ownership content). Ma attivare senza repo sibling stable = rischio crash runtime.
- **Miglior default proposto**: mantenere flag-OFF finché Game-Database non è production-ready separatamente. Agent `game-database-bridge` (proposto in roster) dormiente, attivabile quando serve.
- **Rischio se ignorata**: drift schema tra Game e Game-Database se entrambi evolvono indipendentemente.
- **File o moduli coinvolti**: `packages/contracts/schemas/glossary.schema.json`, `apps/backend/services/catalog/`.
- **Prossima azione consigliata**: re-evaluate post-M14 sprint. Se Game-Database ancora non pronto, lasciare flag-OFF senza altre azioni.

### [OD-005] Integrazione `Game Balance & Economy Tuning` skill (mcpmarket)

- **Livello**: workflow
- **Stato**: identificata in shopping list, non installata
- **Ambiguità**: skill specifica per tuning items/weapons/economy/combat. Install dopo playtest round 2 (dati reali) o ora (proattivo)?
- **Perché conta**: Pillar 6 (Fairness) calibration iter 1-7 hardcore è lavoro ripetitivo. Skill potrebbe automatizzare pattern.
- **Miglior default proposto**: install post-TKT-M11B-06. Testarla su dati playtest raccolti (test-driven skill adoption).
- **Rischio se ignorata**: continui a fare calibration manuale, -30% efficienza.
- **File o moduli coinvolti**: `.claude/settings.json` (per skill install config).
- **Prossima azione consigliata**: post-playtest round 2, run skill su `docs/playtest/*-calibration.md` raccolti.

### [OD-008] Sentience index backfill scope ✅ RISOLTA 2026-04-25 → ⚠️ OVERRIDE 2026-04-25 sera

- **Livello**: game + system
- **Stato**: **OVERRIDE 2026-04-25 sera (user re-decisione)** — sostituisce verdict Opzione B precedente
- **Verdict NEW**: **Opzione A — backfill TUTTE 45 species esistenti** in single PR (~6h). Zero gap residuo, drift chiuso immediatamente.
- **Ragione override**: user vuole stato definito ora invece che drift "lazy" su 3-4 sprint. Sweep dedicato accettato come lavoro one-shot.
- **Implementation plan**:
  1. Per ogni species in `data/core/species.yaml` + `data/core/species_expansion.yaml` (45 totali), assegna `sentience_index: T0-T6` via matching:
     - T0 = species senza milestones definite
     - T1 = "Senses core" presente
     - T2 = "AB 01 Endurance" presente
     - T3-T5 = milestone progression aggregate
     - T6 = full sentience marker (NPG-eligible)
  2. Validate: `python3 tools/py/game_cli.py validate-datasets`
  3. Schema enum check: `npm run schema:lint`
  4. Test: `node --test tests/api/*.test.js` (regression)
- **Verdict precedente preservato (riferimento)**: Opzione B incrementale — superseded da OVERRIDE.
- **File o moduli coinvolti**: `data/core/species.yaml`, `data/core/species_expansion.yaml`, `schemas/core/enums.json` (enum già live).
- **Ref**: card [M-2026-04-25-001](docs/museum/cards/cognitive_traits-sentience-tiers-v1.md), gallery [galleries/enneagramma.md](docs/museum/galleries/enneagramma.md).
- **Skiv-voice motivation** (user feedback): "sabbia ha strati, marcare quando passi sopra — sufficiente". Override: "marcare TUTTI i passaggi ora, non quando capita".

### [OD-009] Ennea source canonical — `data/core/personality/` vs `packs/evo_tactics_pack/...` ✅ RISOLTA confermata 2026-04-25

- **Livello**: system + repo
- **Stato**: **risolta 2026-04-25 (user OK)** — vedi card M-2026-04-25-002 + M-2026-04-25-003
- **Verdict confermato**: **Option 3 hybrid** (entrambi mantenuti):
  - **Encyclopedia**: `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/` rimane source-of-truth completo (CSV + JSON + TS + PY + schema + README + 16 web sources cited)
  - **Runtime**: `data/core/personality/enneagramma_types.yaml` (NUOVO) = subset machine-readable per backend Node consumer
  - **Sync**: `scripts/sync_ennea_from_pack.js` (NUOVO ~50 LOC) converte pack JSON → data/core YAML
- **Pattern precedente**: `npm run sync:evo-pack` (`package.json:43`) fa già lo stesso per catalog. Pattern validato 1+ anno operativo.
- **Pro**: zero perdita info pack, runtime efficient, encyclopedia preservata. Pattern repo-coerente.
- **Con**: serve script sync ~50 LOC marginal cost.
- **Action plan**:
  1. Implementa wire M-006 (enneaEffects.js) con assunzione hybrid (legge da `data/core/personality/`)
  2. Convert dataset pack → `data/core/personality/enneagramma_types.yaml`
  3. Add sync script (deferrable, baseline copy manuale OK per M2 prima invocazione)
- **File o moduli coinvolti**: `data/core/personality/` (NUOVO), `scripts/sync_ennea_from_pack.js` (NUOVO), `apps/backend/services/enneaEffects.js` (extend), `apps/backend/services/vcScoring.js` (extend coverage 6/9 → 9/9).
- **Ref**: card [M-2026-04-25-002](docs/museum/cards/enneagramma-mechanics-registry.md), [M-2026-04-25-003](docs/museum/cards/enneagramma-dataset-9-types.md), gallery [galleries/enneagramma.md](docs/museum/galleries/enneagramma.md).

### [OD-010] Skiv voice palette default — Type 5 vs Type 7 ✅ RISOLTA confermata 2026-04-25

- **Livello**: game + narrative
- **Stato**: **risolta 2026-04-25 (user OK)** — skip-decision via A/B test data-driven
- **Verdict confermato**: **NON pre-decidere**. Implementare entrambe palette vocali (Type 5 Investigator stoico + Type 7 Enthusiast caotico), instrumentare telemetry `ennea_voice_type_used`, decisione default emerge da playtest data invece che a-priori user choice.
- **Skiv-voice motivation** (user feedback): "due voci nella mia testa. Una conta i granelli. L'altra ride mentre scivola. Lascia che il deserto scelga".
- **Sprint C deliverable rivisto**:
  ```
  data/core/narrative/ennea_voices/
  ├── type_5_investigator.yaml    # voce stoica taxonomica
  └── type_7_enthusiast.yaml      # voce caotica giocosa
  apps/backend/services/narrativeEngine.js
    pickVoice(unit) → vcSnapshot.ennea_archetypes[0]
                   → caso 5 || 7 → carica YAML matching
                   → fallback: type_5 (default arbitrario, non choosen design)
  ```
- **Pro**: zero arbitrary user decision. A/B test naturale nel playtest. Pattern futuro per altre creature canoniche.
- **Con**: 2× lavoro voice palette (~12h vs 6h single). Trade-off accettabile per data-driven design.
- **Tritype Skiv** (5-3-9 / 5-1-2 / altro): **rimane decision pending POST-playtest**, non pre-decidere ora.
- **File o moduli coinvolti**: `data/core/narrative/ennea_voices/` (NUOVO), `apps/backend/services/narrativeEngine.js` (extend), telemetry events.
- **Ref**: card [M-2026-04-25-003](docs/museum/cards/enneagramma-dataset-9-types.md), gallery [galleries/enneagramma.md](docs/museum/galleries/enneagramma.md).

### [OD-011] Ancestors recovery scope ✅ RISOLTA 2026-04-25 → ⚠️ OVERRIDE 2026-04-25 sera

- **Livello**: game + system
- **Stato**: **OVERRIDE 2026-04-25 sera (user re-decisione)** — full scope upgrade da Path A solo a Path A + Path B insieme
- **Verdict NEW**: **Opzione A FULL — recovery completo ~15-20h**:
  1. Wire 22 Self-Control trigger immediato (Path A originale ~5h)
  2. Estrai zip ancestors archive + restore 263 neuroni mancanti (Path B originale ~10-15h, ora **non deferred**)
  3. Integra dump completo in `data/core/traits/active_effects.yaml` o split per branch (CO/AB/SE/PA/etc.)
- **Ragione override**: user vuole gap chiuso completamente, non in fasi. Sprint B Skiv ottiene coverage massima invece che parziale.
- **Implementation plan rivisto**:
  1. Path A first (low-risk, ~5h): wire 22 CO trigger da `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv`
  2. Path B parallel (~10-15h): identifica zip source (RFC mention archive `.zip` 263 neuroni — verifica path), estrai, sanitize, deduplicate vs existing 22, integra in glossary
  3. Validate cross-pollution: nessun trait duplicato post-merge
  4. Test full: `pytest tests/scripts/test_trace_hashes.py` + `python3 tools/py/game_cli.py validate-ecosystem-pack`
- **Pre-req autonomous**: localizzare zip archive. RFC mention: probabilmente in `incoming/`, `reports/incoming/`, o esterno (Google Drive backup user). Se zip non locale → user upload prima del Path B start.
- **Verdict precedente preservato (riferimento)**: Path A wire 22 + Path B autonomous deferred — superseded da OVERRIDE.
- **File o moduli coinvolti**: `data/core/traits/active_effects.yaml`, `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv`, archive zip TBD.
- **Ref**: card [M-2026-04-25-004](docs/museum/cards/ancestors-neurons-dump-csv.md), backlog [TKT-ANCESTORS-RECOVERY](BACKLOG.md).
- **Skiv-voice motivation** override: "tracce fresche + scava le coperte. Vento o no, tutte le 297 marche o niente".
- **Skiv-voice motivation precedente**: "tracce fresche nelle dune — 34 marche chiare. Le altre 263... vento le ha coperte. Prima caccia ciò che vedi. Sabbia profonda dopo" (superseded).

### [OD-013] MBTI surface presentation — phased reveal vs accrual silenzioso vs full upfront ✅ RISOLTA Path A+B 2026-04-26

- **Livello**: game + system
- **Stato**: **RISOLTA 2026-04-26** — verdict user A+B entrambi shipped. **Path A** branch `feat/d1a-mbti-phased-reveal` (PR #1848 merged): `mbtiSurface.js` helper + `/vc` + `/pf` extension `mbti_revealed` + `debriefPanel` `#db-mbti-section` UI + 12/12 test. Threshold 0.7 default (env `MBTI_REVEAL_THRESHOLD` A/B). **Path B** branch `feat/d1b-mbti-dialogue-color-codes`: palette canonical 8 colori in `data/core/personality/mbti_axis_palette.yaml` (WCAG AA ≥5.02:1) + `mbtiPalette.js` (loader/lookup/tag/contrast helpers) + `dialogueRender.js` (DOM-free renderer reveal-gated compose Path A) + CSS axis classes con hover tooltip + print-safe + 26/26 test. P4 🟡 → 🟡++ (Path A+B both shipped; integration narrativeEngine + render.js pendente). Card M-009 reuse_path completato.
- **Stato precedente**: proposta 2026-04-25 (museum card [M-2026-04-25-009 Triangle Strategy](docs/museum/cards/personality-triangle-strategy-transfer.md) trigger)
- **Ambiguità**: P4 MBTI/Ennea attualmente 🟡. Triangle Strategy research doc propone 3 path per surface MBTI al player:
  - **Proposal A — Phased reveal** (Disco Elysium pacing): solo axis con `confidence_per_axis > 0.7` mostrato, reveal progressivo durante campaign
  - **Proposal B — Dialogue color codes** (diegetic): ogni MBTI axis ha color palette, player vede senza menu esplicito
  - **Proposal C — Recruit gating** (depends on M-007 mating engine): recruit fails if MBTI distance > threshold
- **Perché conta**: P4 closure path 🟡 → 🟢 senza nuova matematica. Triangle Proposals usano `vcScoring.js` esistente, ROI altissimo per effort moderato.
- **Miglior default proposto**: **Proposal A (Phased reveal)** come pilot, ~6-8h. Hook in `vcScoring.js` per `confidence_per_axis`, frontend filter in debriefPanel. A/B con full upfront via flag se time permette. Proposal B (color codes) come Sprint+1. Proposal C deferred a OD-001 Path A.
- **Rischio se ignorata**: P4 resta 🟡 indefinitamente, Triangle research stays buried. Skiv Sprint C voice palette manca contesto MBTI surface.
- **File o moduli coinvolti**: `apps/backend/services/vcScoring.js`, `apps/backend/routes/session.js`, `apps/play/src/debriefPanel.js`, telemetry events.
- **Prossima azione consigliata**: user verdict A/B/C/skip + promote a 3 ticket BACKLOG (TKT-P4-MBTI-001/002/003) come da card.
- **Ref**: card [M-2026-04-25-009 Triangle Strategy MBTI Transfer](docs/museum/cards/personality-triangle-strategy-transfer.md), gallery [galleries/enneagramma.md](docs/museum/galleries/enneagramma.md), source [docs/research/triangle-strategy-transfer-plan.md](docs/research/triangle-strategy-transfer-plan.md).

### [OD-012] Swarm trait integration scope ✅ RISOLTA 2026-04-25 → ⚠️ OVERRIDE 2026-04-25 sera

- **Livello**: game + system
- **Stato**: **OVERRIDE 2026-04-25 sera (user re-decisione)** — sostituisce single-shot con batch
- **Verdict NEW**: **Opzione B — batch 5-10 trait swarm** (~10h). Magnetic_rift come pilot incluso nel batch, ma scope esteso a 5-10 trait swarm in singolo PR.
- **Ragione override**: user vuole velocità di integrazione + cluster validation. Trade-off: rischio blast radius leggermente più alto, mitigato da test regression.
- **Implementation plan rivisto**:
  1. Sweep candidate da `feat/swarm-staging` branch + `incoming/swarm-candidates/traits/` per identificare 5-10 trait
  2. Pre-flight: `node --check` su ciascun YAML, schema lint AJV
  3. Magnetic_rift first (pilot, ~2h): biome `atollo_ossidiana` placeholder + `requires_traits` deps stub
  4. Batch wire altri 4-9 trait con pattern condiviso (`requires_traits`, `effect_trigger`, status mapping)
  5. Test full: `pytest tests/test_biome_synthesizer.py` + `npm run schema:lint` + `node --test tests/ai/*.test.js` (regression baseline)
  6. Status registry decision: per ogni nuovo status (`telepatic_link`, etc.), check existing (`linked`, `coordinated`) prima di add-only
- **Verdict precedente preservato (riferimento)**: Opzione A single-shot magnetic_rift only — superseded da OVERRIDE.
- **File o moduli coinvolti**: `data/core/traits/active_effects.yaml`, `data/core/biomes.yml`, `apps/backend/services/combat/biomeResonance.js`, `incoming/swarm-candidates/traits/*.yaml` (source pool), `feat/swarm-staging` branch (history mining).
- **Ref**: card [M-2026-04-25-005](docs/museum/cards/old_mechanics-magnetic-rift-resonance.md).
- **Skiv-voice motivation** override: "5-10 pietre alla volta. Sorelle insieme parlano meglio".

---

## Risolte (archivio OD chiuse)

### [OD-006] Master orchestrator prompt — adottare o no? ✅ RISOLTA

- **Livello**: workflow
- **Stato**: **risolta 2026-04-24**
- **Verdict**: **NON adottare**. L'archivio `07_CLAUDE_CODE_OPERATING_PACKAGE/CLAUDE_CODE_MASTER_ORCHESTRATOR.prompt.md` duplica funzionalmente:
  - Auto mode (gestisce multi-step esecuzione senza prompt esplicito)
  - `.claude/TASK_PROTOCOL.md` (7-fasi orchestration flow già formalizzato)
  - Skill `anthropic-skills:game-repo-orchestrator` (bootstrap projet + archivio, già installata)
  - Skill `anthropic-skills:first-principles-game` (audit design + refactor decisioni)
- **Conseguenza**: nessuna azione. `docs/reports/2026-04-24-repo-autonomy-readiness-audit.md` item C.5 marcato "non applicabile, coperto da auto mode + TASK_PROTOCOL".
- **Ref**: audit readiness section C.5.

### [OD-007] Sprint 3 archivio — chiudere o deferrere? ✅ RISOLTA

- **Livello**: workflow
- **Stato**: **risolta 2026-04-24** (questa sessione)
- **Verdict**: chiuso. BACKLOG.md + OPEN_DECISIONS.md + master orchestrator decision (OD-006) creati. Readiness score da 21.5/24 a 23.5/24 (gap residuo minore: C.5 "master orchestrator" marcato "non applicabile" = effettivo 5/5 relativo → **24/24 practical max**).
- **Ref**: commit Sprint 3, PR associata.

---

## Regola pratica

Se la decisione:

- **blocca davvero il gameplay core** (es. cambiare round flow, vision pilastri)
- **cambia visione o scope** (es. taglio feature centrale)
- **impatta più sistemi in modo irreversibile** (es. schema breaking change)

allora **non basta questo file**: serve **checkpoint umano** + **ADR ufficiale** in `docs/adr/`. OPEN_DECISIONS è per ambiguità tattiche operative.

**Anti-pattern**: accumulare OD senza review. Periodicamente (ogni 2-3 sprint) → batch review + chiusura o escalation ad ADR.

## Ref

- `DECISIONS_LOG.md` — index 30 ADR storici
- `docs/adr/` — ADR ufficiali
- CLAUDE.md — sprint context e pilastri
- `docs/reports/2026-04-24-repo-autonomy-readiness-audit.md` — audit readiness che motiva alcune OD
