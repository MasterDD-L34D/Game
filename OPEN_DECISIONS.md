# OPEN_DECISIONS — Evo-Tactics

> **Scope**: decisioni ambigue ma non bloccanti, da risolvere con miglior default + review quando possibile.
> **Sorgente template**: `07_CLAUDE_CODE_OPERATING_PACKAGE/OPEN_DECISIONS.template.md` archivio.
> **Differenza da DECISIONS_LOG.md**: quello è index ADR storici (decisioni prese). Questo file = domande ancora aperte o proposte non ancora confermate.
> **Ciclo di vita**: una volta risolta (con ADR, test playtest, o decisione esplicita user), sposta in DECISIONS_LOG o chiudi con verdict.

---

## Aperte

### [OD-001] V3 Mating/Nido — scope e timing

- **Livello**: game + system
- **Stato**: in attesa (deferred post-MVP)
- **Ambiguità**: sistema Mating/Nido è "promessa centrale" in `docs/core/Mating-Reclutamento-Nido.md` ma runtime zero. Scope stimato ~20h. Va implementato? Quando? Con quali tagli accettabili?
- **Perché conta**: pilastro 2 (Evoluzione emergente Spore-core) sarebbe più forte con Mating. Senza, "evoluzione" rischia di ridursi a trait-pack-spender.
- **Miglior default proposto**: deferred post-MVP (dopo P5 🟢 definitivo via playtest live + M14 Triangle Strategy slice). Reassess a M16+ con dati playtest reali.
- **Rischio se ignorata**: pilastro 2 resta 🟢c (candidato) senza chiusura, vision-promise unkept.
- **File o moduli coinvolti**: `docs/core/Mating-Reclutamento-Nido.md`, nuovo `apps/backend/services/mating/` (green-field).
- **Prossima azione consigliata**: dopo M14 + M15 Triangle Strategy, valutare se Mating è ancora scope necessario o Form evolution M12+ basta.

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

### [OD-008] Sentience index backfill scope (45 species existing vs new only)

- **Livello**: game + system
- **Stato**: aperta (museum card M-2026-04-25-001 trigger)
- **Ambiguità**: enum `sentience_index` T0-T6 LIVE in `schemas/core/enums.json` da 2026-04-16 (commit `3e1b4f22`) ma 0 species in `data/core/species.yaml` lo usa. Backfillare 45 species esistenti (~8h) o assegnare solo a species nuove da Sprint C in poi (~0h)?
- **Perché conta**: silent drift schema-vs-runtime da 6 mesi. Senza backfill, l'enum resta tech debt latente.
- **Miglior default proposto**: **backfill incrementale durante Sprint C natural editing** (non sweep dedicato). Quando edit species per altre ragioni, assegna T1-T5 via milestone matching. Zero overhead, drift chiuso a regime.
- **Rischio se ignorata**: enum LIVE senza adoption diventa codice morto, futuri agent confusione su "è canonical?"
- **File o moduli coinvolti**: `data/core/species.yaml`, `data/core/species_expansion.yaml`, `schemas/core/enums.json`.
- **Prossima azione consigliata**: card review user, decisione tra: (A) backfill sweep dedicato 8h pre-Sprint-C, (B) incrementale durante Sprint C, (C) skip + flag enum deprecated.

### [OD-009] Ennea source canonical — `data/core/personality/` vs `packs/evo_tactics_pack/...` ✅ RISOLTA (proposed)

- **Livello**: system + repo
- **Stato**: **risolta 2026-04-25 (proposed via research)** — vedi card M-2026-04-25-002 + M-2026-04-25-003
- **Verdict proposto**: **Option 3 hybrid** (entrambi mantenuti):
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

### [OD-010] Skiv voice palette default — Type 5 vs Type 7 ✅ RISOLTA (proposed via skip-decision)

- **Livello**: game + narrative
- **Stato**: **risolta 2026-04-25 (proposed)** — skip-decision via A/B test data-driven
- **Verdict proposto**: **NON pre-decidere**. Implementare entrambe palette vocali (Type 5 Investigator stoico + Type 7 Enthusiast caotico), instrumentare telemetry `ennea_voice_type_used`, decisione default emerge da playtest data invece che a-priori user choice.
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

### [OD-011] Ancestors recovery scope — full 297 neuroni vs 34 sopravvissuti

- **Livello**: game + system
- **Stato**: aperta (museum card M-2026-04-25-004 trigger) — **decisione utente richiesta**
- **Ambiguità**: RFC Sentience v0.1 prometteva 297 neuroni Ancestors estratti. Attualmente solo 34 sopravvissuti in CSV sanitized (`reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv`). Gli altri 263 sono in binary `.zip` referenziati da validation reports MA assenti dal repo. Revivere full extraction (~15-20h dig su Drive/PR esterni) o lasciare T0-T6 canonical senza basi neuronali (status quo)?
- **Perché conta**: T0-T6 canonical attuale è solo descrittivo. 297 neuroni = base meccanica concreta per progression Spore-core e trait inheritance.
- **Miglior default proposto**: **subset Self-Control 22 trigger ora, full extraction deferred**. Wire 22 Self-Control come `effect_trigger` in `active_effects.yaml` (~5h, P0 Skiv Sprint B coverage). Decisione "revivere 263 binary mancanti" dopo MVP.
- **Rischio se ignorata**: T0-T6 resta scaffolding senza substance, gap promessa-runtime continua.
- **File o moduli coinvolti**: `data/core/traits/active_effects.yaml`, `reports/incoming/ancestors/`, possibili recovery da Drive/PR esterni (userland action).
- **Prossima azione consigliata**: card review user. Default: Minimal path (22 trigger Self-Control) come primo step.
- **Ref**: card [M-2026-04-25-004](docs/museum/cards/ancestors-neurons-dump-csv.md).

### [OD-012] Swarm trait integration scope — 1 vs 5-10 batch

- **Livello**: game + system
- **Stato**: aperta (museum card M-2026-04-25-005 trigger)
- **Ambiguità**: PR #1720 ha staged `magnetic_rift_resonance.yaml` come "first integration staging" — never followed up. PR potrebbe contenere 5-10 swarm-trait candidates pending. Integrare solo magnetic_rift (~2h Skiv Sprint A direct fit) o batch 5-10 (~12-15h)?
- **Perché conta**: swarm trait è categoria mancante in glossary. Ogni unitario richiede biome + status registry extension.
- **Miglior default proposto**: **single-shot magnetic_rift Sprint A**, batch deferred post-playtest. Validare pattern tier-extension `biomeResonance.js` su 1 trait prima di scalare.
- **Rischio se ignorata**: swarm system resta dormant, biome variety stunted.
- **File o moduli coinvolti**: `data/core/traits/active_effects.yaml`, `data/core/biomes.yml` (atollo_ossidiana stub), `apps/backend/services/combat/biomeResonance.js`.
- **Prossima azione consigliata**: dopo Skiv Sprint A wire validation, sweep PR #1720 staging branch per altri candidate via `git log feat/swarm-staging`.
- **Ref**: card [M-2026-04-25-005](docs/museum/cards/old_mechanics-magnetic-rift-resonance.md).

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
