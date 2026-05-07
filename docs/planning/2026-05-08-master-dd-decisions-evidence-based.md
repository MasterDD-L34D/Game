---
title: 'Master-dd decisions outstanding 2026-05-08 — evidence-based + player-friendly'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-08
source_of_truth: true
language: it
review_cycle_days: 7
related:
  - OPEN_DECISIONS.md
  - docs/planning/2026-05-07-phase-a-handoff-next-session.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/museum/MUSEUM.md
tags: [decisions, evidence, player-friendly, phase-a, master-dd]
---

# Master-dd decisions outstanding 2026-05-08

> ✅ **CHIUSE 5/5 master-dd verdict 2026-05-08**: vedi sezione "Verdict finale" sotto. Doc preserved come reference + audit trail.

Doc canonical per master-dd review settimana 2026-05-08→14. **5 decisioni aperte** (OD-017→OD-021) tracciate canonical post sessione 2026-05-08 Day 2/7 monitoring window. Per ogni decisione: **contesto player-friendly + opzioni tecniche + raccomandazione + evidenze ricerca/museo**.

## Verdict finale 2026-05-08 — 5/5 chiuse

| OD                                      | Verdict master-dd                                                                                | Action                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| OD-017 Phase B trigger 2/3              | **DOWNGRADE nice-to-have** (NOT hard gate). Weekend playtest se launcher 1-2 click usability OK. | ADR-2026-05-05 §5 AMENDED                     |
| OD-019 Skiv Monitor fix                 | **Option A 1-click toggle**. Master-dd manual quando ha PC.                                      | NO Claude action                              |
| OD-018 Tier 2 PlayGodot+GodotTestDriver | **OVERRIDE Claude kill-60. KEEP both** in adoption roadmap. ETA realistic update.                | Workflow doc row 5+6 ETA update con caveat    |
| OD-021 Continuous monitoring            | **Option C ridotto** Day 3+5+7 only. Skip Day 4+6.                                               | Day 3 2026-05-09 trigger Claude rerun         |
| OD-020 Sprint Q+ scope freeze           | **FULL deep scope** Q.A→Q.E. NO incremental. Default 6 mutation Q-3 accept.                      | Gated post-Phase-B-accept (target 2026-05-14) |

---

## Sezione originale (pre-verdict, audit trail)

> **Lettura ordinata**: 1️⃣ Phase B trigger (più urgente) → 2️⃣ Skiv Monitor (più facile) → 3️⃣ Tier 2 PlayGodot (verdict tecnico) → 4️⃣ Continuous monitoring (low-stakes) → 5️⃣ Sprint Q+ scope freeze (gated, può aspettare).

## 1. OD-017 Phase B trigger 2/3 — Quale playtest serve davvero?

### Contesto player-friendly

Il **cutover Godot v2** è stato accettato 2026-05-07 (Phase A LIVE). Significa che il frontend principale del gioco ora è la versione Godot HTML5 sul telefono, non più la web v1 vecchia.

Per **archiviare definitivamente** la web v1 vecchia (Phase B), l'ADR-2026-05-05 dice che servono **3 condizioni**:

1. ✅ 7 giorni di "grace period" senza bug critici → finiscono **2026-05-14**
2. ⏸ **1 playtest "vero" con almeno 4 amici + tu** → ancora da fare
3. ✅ Zero bug critici durante monitoring → confermato Day 1+2

**La domanda**: quale tipo di playtest fai per soddisfare il punto 2?

### Opzioni

**Option α — Playtest sociale completo (canonical)**

- 4 amici via Discord/WhatsApp + tu = 5 player umani
- Setup: `./tools/deploy/deploy-quick.sh` → URL Cloudflare condiviso
- Combat 5 round full scenario
- Effort: ~1-2h userland, weekend ideale
- **Outcome**: ✅ trigger 2/3 satisfied canonical

**Option β — Solo tu con 2 device (lighter fallback)**

- PC + telefono tuo, 2-tab setup
- 5 round combat solo + 3 check hardware-only (WAN LTE / touch capacitive iOS / airplane reconnect)
- Effort: ~30min userland
- **Outcome**: ⚠️ trigger 2/3 BORDERLINE — soddisfa hardware residue ma NO componente sociale "co-op tactical TV" (P5 anchor)

**Option γ — Solo Claude synthetic (NON canonical)**

- Tier 1 phone smoke automatizzato già shipped (PR #2112 today, 15/16 verde)
- Continuous Day 3-7 ~5min/giorno autonomous
- Effort: zero userland
- **Outcome**: ❌ NON satisfies trigger ADR — manca social co-op + hardware fingertip
- **Valore**: regression detection growing dataset come supplement

### Raccomandazione tecnica + evidenze

**Option α canonical raccomandato**. Reasons:

1. **ADR contract esplicito**: §5 trigger 2/3 dice "4 amici + master-dd". NON automatable via Claude.
2. **P5 Co-op vs Sistema = pillar centrale**. Test 1-player NON valida core gameplay (memory canonical PILLAR-LIVE-STATUS.md). Co-op = "4 amici + TV master-dd" è il design intent.
3. **Evidence accumulated giustifica it**:
   - Tier 1 functional gate ZERO regression Day 1→Day 2 (PR #2112)
   - Bug bundle B5+B6+B7+B8+B9+B10 tutti fixed sessione 2026-05-07 (cross-repo cascade)
   - 297 ancestor passive trait surface unblocked (GAP-7 wire #210)
   - 14/15 audit godot-surface-coverage closed Day 2
4. **Master-dd 10min checklist** già canonical: `docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md` covers physical residue 3-item.

**Museum evidence**: [`coop-ns2-frozen-synapse-replay-asymmetric.md`](../museum/cards/coop-ns2-frozen-synapse-replay-asymmetric.md) (score 4/5) — NS2 Strategist pattern valida che social P5 co-op richiede REAL multiplayer test, NON simulation. Frozen Synapse pattern conferma replay cinematico è value-add post-playtest.

**Option β fallback OK** se 4 amici NON disponibili settimana 2026-05-08→14 (vacanza/lavoro). Soft trigger satisfied, master-dd verdict explicit "Phase B ACCEPTED Path β" + scrivi nota in ADR amendment.

**Option γ continuous è SUPPLEMENT, non sostituto**. Ship comunque (vedi OD-021).

### Action

Pick: **α (weekend 2026-05-10/11) | β (1 sera lavorativa) | defer 1 settimana**.

---

## 2. OD-019 Skiv Monitor scheduled fail — Fix 1-click vs workflow edit?

### Contesto player-friendly

Il workflow GitHub Actions chiamato **"Skiv Monitor"** gira ogni 4 ore e dovrebbe fare 2 cose:

1. ✅ Aggiornare lo stato di Skiv (la creatura canonical) leggendo i commit recenti del repo → **funziona**
2. ❌ Aprire automaticamente una pull request con le modifiche → **fallisce da 12 giorni** (30/30 ultimi run rossi)

**Errore**: `"GitHub Actions is not permitted to create or approve pull requests"`. Causa: una checkbox nelle impostazioni del repo è stata disabilitata dopo il 2026-04-25 (ultima PR auto andata a buon fine: #1836).

**Impact**: cosmetico. Skiv state si aggiorna comunque sul branch `auto/skiv-monitor-update`. Solo "PR auto-open" rotto. Tu lo vedi come "CI rosso continuo", noise notifications.

### Opzioni

**Option A — Toggle checkbox (RACCOMANDATO)**

- Vai a: `Settings → Actions → General → Workflow permissions`
- Spunta: **"Allow GitHub Actions to create and approve pull requests"**
- Effort: **30 secondi 1-click**
- Risk: 🟢 LOW (re-abilitazione stato pre-2026-04-25, comportamento storicamente verde 6+ mesi)

**Option B — Workflow graceful fallback (Claude può preparare PR ma forbidden path)**

- Modifica `.github/workflows/skiv-monitor.yml` per non fallire quando `gh pr create` perm denied
- Branch update preservato, workflow exit 0
- Tu apri PR manualmente quando vuoi (link compare URL emesso)
- Effort: ~10min impl + master-dd review
- **Forbidden path** `.github/workflows/` = manual review obbligatorio (NON auto-merge L3)
- Risk: 🟡 LOW-MED

**Option C — Skip PR create entirely**

- Sostituisci `gh pr create` con `::notice` GH Actions warning
- Branch updato + tu manual PR sempre
- Forbidden path edit
- Risk: 🟡 LOW-MED

**Option D — PAT secret swap**

- Crea Personal Access Token + secret `SKIV_MONITOR_PAT`
- Workflow usa PAT invece di GITHUB_TOKEN
- Effort: ~30min
- Risk: 🔴 MED-HIGH (PAT rotation burden)

### Raccomandazione tecnica + evidenze

**Option A 30-second 1-click**. Reasons:

1. **Zero code change**. Restore stato pre-2026-04-25 verde.
2. **Evidence forensic** (PR #2111): branch push works, ONLY `gh pr create` step fails. Setting toggle = single point of failure exact.
3. **Last successful PR auto #1836 2026-04-25** = setting era ON quel giorno, qualcosa l'ha disabilitato dopo.
4. **Anti-pattern check**: Option B/C = forbidden path edit `.github/workflows/`, scope creep per problem cosmetico. Option D = PAT rotation = ulteriore tech debt.

**Source**: [`docs/reports/2026-05-08-skiv-monitor-rca.md`](../reports/2026-05-08-skiv-monitor-rca.md) — full forensic + 4-option fix menu.

### Action

Pick: **A (1-click toggle weekend) | B (Claude prepare PR + tu review) | defer**.

---

## 3. OD-018 Tier 2 PlayGodot — kill-60 verdict accept o reject?

### Contesto player-friendly

Il documento `docs/playtest/AGENT_DRIVEN_WORKFLOW.md` lista futuri tool di test da adottare. Tra questi, **PlayGodot** (Python automation framework "tipo Playwright per Godot") con stima ~5h adoption "post Phase A".

Ho fatto research PR #2110 e ho scoperto che **5h era una stima sbagliata**:

- **PlayGodot**: richiede COMPILARE una versione custom di Godot (fork con automation branch). Non funziona con Godot stock. Reality = ~20-40h (build pipeline scons C++ + manutenzione cross-platform).
- **GodotTestDriver** (alternativa): solo C#. Il nostro Godot v2 stack è GDScript. Adoption = ~10-15h hybrid mess.
- **GUT** (già adottato): GDScript native, 1964 test verdi, zero blocker.

### Opzioni

**Option A — Accept kill-60 verdict (RACCOMANDATO)**

- REJECT PlayGodot + GodotTestDriver
- ACCEPT estendi GUT scenario fixture pattern (~3-5h post Phase B)
- Update workflow doc strikethrough row 5+6 + redirect a "GUT scenario ext"

**Option B — Override kill-60 (rischioso)**

- Spike timeboxed 4h: build custom Godot fork + 1 test fixture funzionante
- Se 4h non bastano → abort
- Default: keep GUT path se anche spike fallisce

### Raccomandazione tecnica + evidenze

**Option A accept kill-60**. Reasons:

1. **Custom Godot fork burden inaccettabile per solo-dev**:
   - scons C++ build pipeline + 5+ GB toolchain
   - 2-platform maintenance (Windows MSVC + macOS clang per master-dd)
   - Sync upstream Godot 4.7+ release = manual rebase automation branch
   - CI build time +30-60min per runner spin (vs current GUT ~3min)
2. **GodotTestDriver C# stack mismatch**: Godot v2 = pure GDScript. Hybrid C# = duplicate test patterns + GDExtension marshalling overhead.
3. **GUT corpus existing** = 202+ unit test + 2 integration test, 1964 verde Day 2. Stack-native zero deps.
4. **Coverage gap "signal→DOM bridge"** chiuso solo da PlayGodot, ma incremental ~5% non giustifica 20-40h burden.

**Source evidence**: PR #2110 + [PlayGodot README](https://github.com/Randroids-Dojo/PlayGodot) explicit custom fork requirement + [GodotTestDriver README](https://github.com/chickensoft-games/GodotTestDriver) C# only.

**Anti-pattern flag**: stima 5h originale = "scope speculative pre-research" pattern già flaggato in CLAUDE.md "ship and pray". Research-first = corretto pattern.

### Action

Pick: **A accept kill-60 (~5min review) | B override spike (~4h) | defer**.

---

## 4. OD-021 Continuous synthetic monitoring Day 3-7 — Confirm Claude rerun ogni giorno?

### Contesto player-friendly

PR #2112 oggi ha shippato Tier 1 phone smoke fresh capture localhost (15/16 verde, ZERO regression Day 1→Day 2). Pattern γ synthetic supplement.

**Proposta**: Claude rerun ~5min/giorno Day 3-7 monitoring window per regression detection autonomous. Total ~25-30min cumulative cycle 7gg. Tu zero burden.

### Opzioni

**Option A — Confirm schedule (RACCOMANDATO)**

- Day 3 2026-05-09 → synthetic iter2
- Day 4 2026-05-10 → skip weekend opzionale
- Day 5 2026-05-11 → synthetic iter3
- Day 6 2026-05-12 → synthetic iter4
- Day 7 2026-05-13 → synthetic iter5 final
- Day 8 2026-05-14 → master-dd Option α/β verdict (OD-017)

**Option B — Reject** (skip continuous, attendi Day 7 master-dd verdict only)

**Option C — Modify cadence** (es. Day 3 + Day 5 + Day 7 only, ridotto)

### Raccomandazione tecnica + evidenze

**Option A confirm**. Reasons:

1. **Zero master-dd burden** (Claude autonomous rerun)
2. **Earlier regression detection**: catch potenziale bug Day 3 vs Day 7
3. **Evidence dataset growing** pre-master-dd-canonical-playtest = supplement value
4. **Pattern già validato Day 2** (PR #2112 ZERO regression). Repeatable.
5. **Cost basso**: ~25-30min Claude cumulative + zero token waste se silent verde

### Action

Pick: **A confirm schedule | B reject | C modify (es. Day 3+5+7 only)**.

---

## 5. OD-020 Sprint Q+ pre-kickoff — 5 sub-decisione (gated post-Phase-B)

### Contesto player-friendly

PR #2109 ha shippato il **design doc Sprint Q+ LineageMergeService ETL scoping** — 12 ticket Q-1→Q-12, ~14-17h effort total.

Sprint Q+ chiude **GAP-12** ultimo gap audit godot-surface-coverage (14/15 chiuso Day 2). GAP-12 = Skiv-Pulverator alleanza completion: post-combat mating → offspring inheritance → debrief panel.

Il gap è cross-stack: Godot v2 engine LIVE (`lineage_merge_service.gd` + `mating_trigger.gd` 77+164 LOC), backend Game/ ambitionService LIVE, ma **nessun caller** collega i 3 layer.

**Gated post-Phase-B**: NON urgente ora. Solo dopo Phase B ACCEPTED (OD-017) ha senso pianificare.

### Opzioni (5 sub-decisioni)

**Q-1 Schema contract `lineage_ritual.schema.json`** — forbidden path `packages/contracts/`. Master-dd manual review obbligatorio.

**Q-2 Prisma migration `Offspring` model** — forbidden path `migrations/`. Master-dd manual approve.

**Q-3 MUTATION_LIST canonical** — narrative call. Default proposed PR #2109 Appendice A:

- `armatura_residua` (+5% defense_mod, scaglie indurite)
- `tendine_rapide` (+1 mp permanent)
- `cuore_doppio` (+10% max_hp)
- `vista_predatore` (+5% crit_chance)
- `lingua_chimica` (unlock chemioception scout buff)
- `memoria_ferita` (bond_hearts +1 starting next encounter, P6 anti-frustration)

**Q-4 HTTP API auth** `/api/v1/lineage/legacy-ritual` JWT? Default: usa JWT esistente cross-stack.

**Q-5 Scope freeze vs incremental** Q.A→Q.E in 1 settimana, OR Q.A only ship + master-dd review pre-Q.B kickoff?

### Raccomandazione tecnica + evidenze

**Hard gate Phase B ACCEPTED prima di toccare Q-1→Q-5**. Reasons:

1. **Pre-Phase-B impl rischia regressione `DebriefView`** cutover-critical surface (P5 Co-op anchor TV scene). NON anticipare.
2. **Q-3 default 6 mutation accept-as-spec'd**. Bilanciamento target tutte mutazioni < +10% raw stat. Cap 1 per ritual. Cap 5 cross-encounter FIFO mirror MAX_WOUNDS_PER_UNIT.
3. **Q-5 incremental Q.A only first** raccomandato. Permette master-dd review pattern + iterare narrative tone (es. mutation list expand) prima di lockare Prisma migration.
4. **Q-1+Q-2 hard gate** = forbidden path master-dd manual approve = automatic gate. NON skip.

**Museum evidence**:

- [`mating_nido-engine-orphan.md`](../museum/cards/mating_nido-engine-orphan.md) (**score 5/5**) — mating engine 469 LOC + 7 endpoint shipped 4 mesi fa, ZERO frontend = anti-pattern già diagnosticato. Sprint Q+ chiude finalmente.
- [`mating_nido-canvas-nido-itinerante.md`](../museum/cards/mating_nido-canvas-nido-itinerante.md) (**score 4/5**) — Skiv vagans direct fit, 3 mechanics legacy mai migrate.
- [`creature-wildermyth-battle-scar-portrait.md`](../museum/cards/creature-wildermyth-battle-scar-portrait.md) (**score 4/5**) — P3 narrative+visual permanent change pattern. Wound inheritance offspring mirror Wildermyth scar legacy.

**Research evidence**:

- [`docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md`](2026-04-29-sprint-n7-failure-model-parity-spec.md) §6 — Action 6 ambition tie-in spec canonical
- ADR `ADR-2026-04-28-deep-research-actions.md` §Action 3 effort estimate 3h originale (ora rivelato ~14-17h cross-stack)
- Engine LIVE: `Game-Godot-v2/scripts/lifecycle/lineage_merge_service.gd` (77 LOC, 3 static method)
- Engine LIVE: `Game-Godot-v2/scripts/session/mating_trigger.gd` (164 LOC, signal child_preview_ready)

### Action

Pick subset (può aspettare post-Phase-B):

- **Q-3 mutation list**: accept default 6-canonical | modify (suggerisci alternative narrative)
- **Q-5 scope freeze**: Q.A only first | full Q.A→Q.E 1 settimana

Q-1+Q-2+Q-4 = automatic hard gate (post-Phase-B-trigger).

---

## Sintesi action items master-dd

| OD     | Decisione                     |             Urgency             | Default raccomandato           |   Effort master-dd   |
| ------ | ----------------------------- | :-----------------------------: | ------------------------------ | :------------------: |
| OD-017 | Phase B trigger 2/3           | 🔴 hard gate (entro 2026-05-14) | Option α weekend 2026-05-10/11 |    1-2h userland     |
| OD-019 | Skiv Monitor fix              |           🟡 cosmetic           | Option A 1-click toggle        |         30s          |
| OD-018 | Tier 2 PlayGodot              |          🟡 strategic           | Option A accept kill-60        |     5min review      |
| OD-021 | Continuous monitoring Day 3-7 |           🟢 low-risk           | Option A confirm               |     5min review      |
| OD-020 | Sprint Q+ scope freeze        |      🔴 gated post-Phase-B      | Q-3 default + Q-5 incremental  | 10min review (gated) |

**Total master-dd effort settimana 2026-05-08→14**:

- ~1-2h Phase B social playtest (canonical Option α) OR ~30min solo (β fallback)
- ~30s Skiv Monitor toggle
- ~20min review verdict OD-018+OD-021
- Sprint Q+ verdict gated post-trigger (deferred)

**Tutti decisioni 5/5 possibili in <2.5h userland weekend**.

## Cross-ref

- [OPEN_DECISIONS.md](../../OPEN_DECISIONS.md) — full canonical entry OD-017→OD-021
- [BACKLOG.md](../../BACKLOG.md) — Phase A Day 2/7 monitoring section
- [docs/planning/2026-05-07-phase-a-handoff-next-session.md](2026-05-07-phase-a-handoff-next-session.md) — handoff parent
- [docs/museum/MUSEUM.md](../museum/MUSEUM.md) — top relevance card index
- [ADR-2026-05-05](../adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md) §5 — Phase B trigger contract canonical
