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

### [OD-008] Sentience index backfill scope ✅ RISOLTA 2026-04-25

- **Livello**: game + system
- **Stato**: **risolta 2026-04-25 (user verdict)**
- **Verdict**: **Opzione B — backfill incrementale**. Quando si edita una species per altri motivi (Sprint C, content sprint, balance tweak), assegnare `sentience_index` T1-T5 via milestone matching (T1 = "Senses core", T2 = "AB 01 Endurance", ecc.). Zero overhead dedicato, drift chiuso a regime entro 3-4 sprint.
- **Ragione**: sweep dedicato 8h è lavoro morto se non c'è use-case immediato runtime. Incrementale chiude drift senza overhead.
- **Implementation guidance**: ogni agent che edita `data/core/species.yaml` o `data/core/species_expansion.yaml` per QUALSIASI motivo deve, se non già presente, aggiungere `sentience_index: T<N>` derivando il livello dalle milestone esistenti della species. Pattern reusable, no PR dedicato.
- **File o moduli coinvolti**: `data/core/species.yaml`, `data/core/species_expansion.yaml`, `schemas/core/enums.json` (enum già live).
- **Ref**: card [M-2026-04-25-001](docs/museum/cards/cognitive_traits-sentience-tiers-v1.md), gallery [galleries/enneagramma.md](docs/museum/galleries/enneagramma.md).
- **Skiv-voice motivation** (user feedback): "sabbia ha strati, marcare quando passi sopra — sufficiente".

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

### [OD-011] Ancestors recovery scope ✅ RISOLTA 2026-04-25 (con remind autonomous)

- **Livello**: game + system
- **Stato**: **risolta 2026-04-25 (user verdict + remind autonomous task)**
- **Verdict**: **Opzione A — wire 22 Self-Control trigger subito** (~5h, alimenta Skiv Sprint B coverage). Path B (caccia 263 neuroni mancanti) **non scartato**: scheduled come task autonomous per ricerca online fonti.
- **Path A (immediate)**:
  - Estendi `data/core/traits/active_effects.yaml` con 22 nuovi entry mappati da `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv` (Self-Control branch, codici CO 01-22)
  - `effect_trigger` field già esiste (es. `on_take_damage`, `on_engage_choice`, `on_pressure_tier_up`)
  - Test: `python3 tools/py/game_cli.py validate-datasets`
  - Output: +22 trait reaction-aware in glossary, low-risk additive
- **Path B (deferred autonomous)**: vedi nuovo ticket [TKT-ANCESTORS-RECOVERY](BACKLOG.md#tkt-ancestors-recovery) — caccia online dei 263 neuroni mancanti via fonti pubbliche (Ancestors Wiki + Britannica + biology references già citate in RFC). Claude ricerca autonomously quando ha budget tempo, NON userland action.
- **Rationale**: 22 trigger sono già nelle mani, low risk, alimentano Skiv Sprint B (defy/counter). I 263 mancanti possono essere ricostruiti via research esterna invece di dipendere da `.zip` perduti.
- **File o moduli coinvolti**: `data/core/traits/active_effects.yaml`, `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv`.
- **Ref**: card [M-2026-04-25-004](docs/museum/cards/ancestors-neurons-dump-csv.md), backlog [TKT-ANCESTORS-RECOVERY](BACKLOG.md).
- **Skiv-voice motivation** (user feedback): "tracce fresche nelle dune — 34 marche chiare. Le altre 263... vento le ha coperte. Prima caccia ciò che vedi. Sabbia profonda dopo".

### [OD-012] Swarm trait integration scope ✅ RISOLTA 2026-04-25

- **Livello**: game + system
- **Stato**: **risolta 2026-04-25 (user verdict)**
- **Verdict**: **Opzione A — single-shot magnetic_rift Sprint A**, batch 5-10 deferred a PR successivo post-validation.
- **Ragione (consigli annessi)**:
  - **Validate pattern**: `biomeResonance.js` (PR #1785 shipped) supporta tier ladder ma non è ancora stato testato con tier-extension reale. Magnetic_rift è il primo banco di prova
  - **Limit blast radius**: se rompe qualcosa nel sistema reactionary, hai limitato il danno a 1 trait + 1 biome stub
  - **Skiv Sprint A direct fit**: trait T2 + biome `atollo_ossidiana` plug-in immediato per Sprint A (~2h)
  - **Batch deferred**: dopo validation con Skiv playtest (post-MVP), sweep `feat/swarm-staging` branch per altri 5-10 candidate via `git log feat/swarm-staging`. Scaling solo dopo prova
- **Implementation guidance**:
  1. Aggiungi biome `atollo_ossidiana` placeholder in `data/core/biomes.yml` con `magnetic_field_strength: 1.0` flag
  2. Aggiungi trait `magnetic_rift_resonance` in `data/core/traits/active_effects.yaml` con `requires_traits: [magnetic_sensitivity, rift_attunement]` (2 trait base mancanti, stub o decision se generalizzare)
  3. Map T2 → `biomeResonance.js` tier_2 ladder
  4. Test: `pytest tests/test_biome_synthesizer.py`
- **File o moduli coinvolti**: `data/core/traits/active_effects.yaml`, `data/core/biomes.yml`, `apps/backend/services/combat/biomeResonance.js`, `incoming/swarm-candidates/traits/magnetic_rift_resonance.yaml` (source).
- **Open sub-question**: status `telepatic_link` non esiste in registry. Add-only o map a status esistente (`linked` / `coordinated`)? — decisione lazy al wire time
- **Ref**: card [M-2026-04-25-005](docs/museum/cards/old_mechanics-magnetic-rift-resonance.md).
- **Skiv-voice motivation** (user feedback): "una pietra nuova. La giro nelle zampe. Sento il peso. Capisco la forma. Poi cerco le sorelle. Non prima".

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
