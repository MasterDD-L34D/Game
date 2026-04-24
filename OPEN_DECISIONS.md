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
