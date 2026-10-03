# Lunch Break Handoff — 2026-04-16 14:12

Sessione pomeridiana in **pausa pranzo**. Al rientro verrà introdotto un
nuovo sistema con nome in codice **CaveMan**. Questo documento prepara
tutto il necessario per riprendere con contesto completo.

---

## ✅ Stato di chiusura — completo e pulito

### Repository Evo-Tactics

| Verifica | Stato |
|---|:-:|
| **Branch** | `main` (post merge #1368) |
| **Ultimo commit** | `2f5673c5 docs(session): postmortem pomeriggio 2026-04-16 (14 sprint) (#1368)` |
| **Working tree** | pulito (solo `.claude/scheduled_tasks.lock` artifact) |
| **Preview server** | stopped |
| **PR open** | nessuno |
| **Test suite** | 45/45 pass (`node --test tests/ai/*.test.js`) |
| **Docs governance** | errors=0 warnings=0 |

### Totale sessione pomeridiana 12:00 → 14:12

- **15 PR** aperti e mergiati (#1354 → #1368)
- **14 feature sprint** (006 → 019) + **1 postmortem doc**
- **Backlog playtest originale**: 9/9 chiuse o parziali per design
- **Design doc alignment**: ~70% delle voci di `docs/core/10-SISTEMA_TATTICO.md` implementate
- **Riepilogo esteso**: [`logs/SESSION_POMERIGGIO_20260416.md`](SESSION_POMERIGGIO_20260416.md)

---

## 🏔️ CaveMan — nuovo sistema (TBD al rientro)

**Stato**: annunciato come prossimo focus, **dettagli da definire al rientro**.

### Informazioni note

- Nome in codice: **CaveMan**
- Contesto: "nuovo sistema nel repo" — non chiaro se DENTRO Evo-Tactics
  (sottomodulo/feature) o in un repo separato da creare/clonare
- Introdotto durante la pausa pranzo del 2026-04-16
- Non ancora esistente sul filesystem locale (`Documents/GitHub/` ha
  solo Game, Game-Database; nessun repo CaveMan trovato)

### Domande da chiarire al rientro

1. **Dove vive CaveMan?**
   - [ ] Sottocartella dentro `apps/` o `services/` di Evo-Tactics?
   - [ ] Repo separato (da creare su GitHub / clonare)?
   - [ ] Branch esplorativo su Evo-Tactics?
2. **Che cos'è CaveMan?**
   - [ ] Un sistema di combattimento alternativo / antagonista all'IA SIS?
   - [ ] Un generatore di contenuti (bioma, trap, encounter)?
   - [ ] Un tool di telemetria / analisi post-partita?
   - [ ] Un'interfaccia UI diversa per il playtest (es. console ASCII)?
   - [ ] Un sistema di progressione personaggio (PE, evoluzione)?
   - [ ] Altro?
3. **Quale l'interfaccia con Evo-Tactics?**
   - [ ] Legge gli stessi event log in `logs/session_*.json`?
   - [ ] Consuma `services/vcScoring.js` per metriche?
   - [ ] Estende `services/ai/policy.js` con nuove regole?
   - [ ] HTTP API parallela al backend esistente?
4. **Stack tecnologico?**
   - [ ] JavaScript/Node (consistente col backend)?
   - [ ] Python (consistente con tools/py)?
   - [ ] Altro linguaggio?
5. **Database / persistenza?**
   - [ ] Condivide Prisma/NeDB con Evo-Tactics?
   - [ ] Storage separato?

### Preparazione pre-rientro — cosa ho già pronto per CaveMan

Al rientro potremmo avere bisogno di agganciarci a varie parti del
sistema Evo-Tactics. Ecco dove vive cosa, in modo che il CaveMan
onboarding sia rapido.

#### Eventi di gioco (input principale per un sistema esterno)

- **Raw event log**: `logs/session_*.json` — un file per sessione,
  array di event objects con `action_type`, `turn`, `actor_id`,
  `target_id`, `damage_dealt`, `result`, `position_from`, ecc.
- **Schema events**: implicitamente definito in
  `apps/backend/routes/session.js` via `buildAttackEvent`,
  `buildMoveEvent`, `emitKillAndAssists`, + status events (`bleeding`).
- **Action types**: `attack`, `move`, `kill`, `assist`, `bleeding`
  (sprint-019).

#### VC scoring (metriche analytics già pronte)

- `apps/backend/services/vcScoring.js` — esporta `buildVcSnapshot(session, config)`
  che produce raw metrics + aggregate indices + MBTI + Ennea archetypes.
- Input: `session.events` + `session.units` + gridSize.
- Output: completamente serializzabile.
- Metriche disponibili: 20+ raw, 6 aggregate, 4 MBTI, 6 Ennea.
- Config caricato da `data/core/telemetry.yaml`.

#### AI engine (decision policy estraibile)

- `apps/backend/services/ai/policy.js` — funzioni pure per riuso:
  `selectAiPolicy`, `stepAway`, `checkEmotionalOverrides`.
- `apps/backend/services/ai/sistemaTurnRunner.js` — factory con DI,
  riutilizzabile con nuovi helper.
- Documentato in `docs/architecture/ai-policy-engine.md`.

#### Trait system (effetti con trigger/effect kind)

- `apps/backend/services/traitEffects.js` — evaluator two-pass
  (`evaluateAttackTraits` + `evaluateStatusTraits`).
- Trait config in `data/core/traits/active_effects.yaml` (7 trait
  vivi: 2 legacy + 5 sprint-018/019).
- Aggiungere un nuovo trait richiede solo una entry in YAML.

#### Status system (stati temporanei su unit)

- `unit.status = { panic, rage, stunned, focused, confused, bleeding,
  fracture }` — ogni chiave è durata in turni.
- Decrement automatico per-unit al fine-proprio-turno in
  `routes/session.js:/turn/end`.
- UI feedback in `Evo-Tactics — Playtest.html` (badge + glow + chip +
  log diff).

#### Scenario system (configurazioni di matchup)

- `SCENARIOS` in `Evo-Tactics — Playtest.html` — 7 preset selezionabili.
- Ogni scenario è `{ label, desc, units: [{id, species, job, traits,
  position, controlled_by}] }`.
- Il backend `/api/session/start` accetta l'array units direttamente.

---

## 🔌 Comandi di ripresa rapida

```bash
# Verifica stato
cd /c/Users/VGit/Desktop/Game
git status                           # dovrebbe essere pulito
git log --oneline -5                 # 2f5673c5 come HEAD

# Preview backend (quando servira' testare)
# (via Claude Preview MCP: preview_start backend)
# Oppure shell: npm run start:api  → http://localhost:3334

# Test automatici
node --test tests/ai/*.test.js       # 45 test, ~120ms
npm run format:check                 # prettier verde

# Docs governance
python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
```

## 📂 File chiave per orientarsi rapidamente

- **[logs/SESSION_POMERIGGIO_20260416.md](SESSION_POMERIGGIO_20260416.md)** — postmortem pomeriggio (276 linee)
- **[logs/playtest_design_backlog.md](playtest_design_backlog.md)** — backlog issue tracker
- **[docs/architecture/ai-policy-engine.md](../docs/architecture/ai-policy-engine.md)** — architettura IA
- **[docs/core/10-SISTEMA_TATTICO.md](../docs/core/10-SISTEMA_TATTICO.md)** — design doc combat
- **[apps/backend/routes/session.js](../apps/backend/routes/session.js)** — router + state engine
- **[apps/backend/services/ai/policy.js](../apps/backend/services/ai/policy.js)** — decisioni IA
- **[apps/backend/services/vcScoring.js](../apps/backend/services/vcScoring.js)** — telemetry
- **[apps/backend/services/traitEffects.js](../apps/backend/services/traitEffects.js)** — trait evaluator
- **[data/core/traits/active_effects.yaml](../data/core/traits/active_effects.yaml)** — 7 trait vivi
- **[apps/backend/public/Evo-Tactics — Playtest.html](../apps/backend/public/Evo-Tactics%20%E2%80%94%20Playtest.html)** — UI playtest (700+ linee)

## 🎯 Sequenza consigliata al rientro

1. **Riapri questo file** (`LUNCH_BREAK_HANDOFF_20260416.md`) per ricordare contesto
2. **Chiarisci CaveMan** rispondendo alle 5 domande sopra (o descrizione libera)
3. **Decidi scope iniziale**: prima iterazione MVP di CaveMan (30-60 min)
4. **Crea branch dedicato**: suggerisco `feat/caveman-bootstrap-sprint-020`
5. **Se CaveMan è un sottomodulo**: crea `apps/caveman/` o `services/caveman/`
6. **Se CaveMan è un repo separato**: crea il repo su GitHub e clona accanto a
   `Desktop/Game` (pattern gia' usato con Game-Database)

## 🛑 Chiusura ordinata

- [x] Tutti i PR mergiati (15/15)
- [x] `main` sincronizzato
- [x] Working tree pulito
- [x] Preview server stopped
- [x] Test suite verde
- [x] Postmortem sessione committato
- [x] Questo handoff committato (appena si fa il PR)

**Buon pranzo.** 🍝

---

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
