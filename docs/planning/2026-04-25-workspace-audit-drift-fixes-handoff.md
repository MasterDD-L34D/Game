---
title: Handoff workspace audit + drift fixes
date: 2026-04-25
sprint: workspace-ecosystem-audit
doc_status: active
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
---

# Handoff workspace audit + drift fixes — 2026-04-25

## TL;DR

- **8 PR mergiati Game** (5 docs WORKSPACE_MAP + 3 BACKLOG drift fix) + 1 PR Game-Database simmetrico + 1 PR closed-redundant (caught race vs altro PC)
- **WORKSPACE_MAP completo** copre ecosystem reale: Game + Game-Database + evo-swarm + Dafne + AA01 + OpenClaw + C:/dev/ + 13 GitHub repos org
- **Stack Game-Database validated end-to-end** (Postgres :5433 → Express :3333 → 4 endpoint canonical → Game backend :3344 Alt B HTTP integration log-confirmed)
- **5 BACKLOG ticket stale chiusi con SHA** (M13 P3, M13 P6, SWARM-SKIV, ANCESTORS-22, ANCESTORS-RECOVERY, F-1/F-2/F-3, M14-A partial)
- **Museum card AI-hallucination fixed** (`ancestors-neurons-dump-csv.md`: numbers 22→12 + schema columns + esempi codici reali)

## PR mergiati (8 Game + 1 Game-Database)

| PR        | Scope                                                     | SHA        | Note                                                                |
| --------- | --------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| #1804     | WORKSPACE_MAP iniziale + clone Game-Database + path edusc | `ad23d0bf` | Mappa physical workspace + path stale fix `VGit→edusc`              |
| #1806     | Stack validation + Alt B runtime smoke PROVATO            | `113e832d` | 4 endpoint canonical 200 OK + Alt B log "HTTP integration ENABLED"  |
| #1809     | Synesthesia move                                          | `17aea1c0` | UPO esame spostato a `~/Documents/UPO/synesthesia/`                 |
| #1810     | WORKSPACE_MAP comprehensive (Dafne+swarm+AA01+OpenClaw)   | `effef40e` | Audit a fondo post user feedback "controlla a fondo"                |
| #1812     | WORKSPACE_MAP sweep finale (Desktop + WRITE-ACCESS)       | `148a5a75` | WRITE-ACCESS-POLICY canonical + Swarm Dashboard `:5000`             |
| #1814     | BACKLOG drift fix #1 (3 closures con SHA)                 | `bb19697b` | M13 P3, M13 P6, SWARM-SKIV chiusi                                   |
| #1818     | Ancestors drift fix #2 + card AI-hallucination fix        | `6b2670a3` | 2 ticket closures + card numbers (22→12) + schema reali + esempi FR |
| #1820     | BACKLOG drift fix #3 (F-1/F-2/F-3 + M14-A partial)        | `4ee9e30f` | Pre-playtest residui = 0                                            |
| #106 (DB) | Game-Database WORKSPACE_MAP simmetrico                    | `ea3791e`  | Cross-link bidirezionale, stack porte + bootstrap PowerShell        |

PR #1816 closed redundant (multi-PC race vs PR #1813 same scope OD-011).

## Pillar / milestone delta

| #   | Before  | After          | Note                                                                   |
| --- | ------- | -------------- | ---------------------------------------------------------------------- |
| P1  | 🟢      | 🟢             | M14-A elevation/terrain reactions partial (PR #1736, helpers shipped)  |
| P2  | 🟢c     | 🟢c            | Stable                                                                 |
| P3  | 🟡+/🟢c | 🟢c (verified) | BACKLOG drift fix #1 conferma chiusura PR #1697                        |
| P4  | 🟡+     | 🟡+            | enneaEffects.js confermato orphan (museum card audit), wire pending    |
| P5  | 🟡      | 🟡             | TKT-M11B-06 playtest userland resta unico bloccante                    |
| P6  | 🟡+/🟢c | 🟢c (verified) | BACKLOG drift fix #1 conferma chiusura PR #1698 (calibration userland) |

Nessun pillar mosso da questa sessione (lavoro principalmente discovery + drift fix), ma drift fix #1814 ha verificato P3 + P6 🟢c.

## Blockers residui

### Userland (richiede azione umana)

- [ ] **TKT-M11B-06** — Playtest live 2-4 amici. Unico bloccante P5 → 🟢 definitivo. Stack pronto, F-1/F-2/F-3 fixati, ngrok playbook in `docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md`.
- [ ] **M13 P6 calibration N=10 hardcore 07** — Eseguire `tools/py/batch_calibrate_hardcore07.py`, valutare win rate 30-50%.

### Autonomous (Claude può fare prossima sessione)

- [ ] **M14-A resolver wire residual** (~3-4h) — Helpers shipped (PR #1736), full resolver wire elevation multiplier + facing system pending.
- [ ] **TKT-MUSEUM-ENNEA-WIRE** (~7-9h) — wire enneaEffects.js orphan in sessionRoundBridge.js onRoundEnd. **Pre-req**: refactor `buildVcSnapshot` round-aware. Combat hot path = high blast radius.
- [ ] **TKT-MUSEUM-SKIV-VOICES** (~6h, depends on ENNEA-WIRE) — palette Type 5+7 in `data/core/narrative/ennea_voices/`.
- [ ] **F-3 test coverage** — phase-skip negative + multi-player disconnect race + host-transfer e2e + room-code regex purity + startRun untested. ~3-5h.
- [ ] **TKT-P4-MBTI-001/002/003** — Triangle Strategy MBTI surface tickets ~15-21h totali.
- [ ] **M14-B + M15** Triangle Strategy transfer ~27h totali.

### Cleanup workspace (deferred, non bloccante)

- [ ] **C:/dev/Game** — branch `swarm/register-biome-gameplay-integrator-2026-04-24` 121 commits behind + 376 LOC uncommitted (`agents/agents_index.json` + `docs/flint-status.json`). User decision: rebase+merge o discard.
- [ ] **C:/dev/synesthesia** + **C:/dev/aider-tty-test** — duplicati identici, candidati `rm -rf`.
- [ ] **C:/dev/codemasterdd-ai-station** — diversi commit da `gioco/codemasterdd-ai-station/`. Decidere canonical.
- [ ] **C:/dev/AA01** vs `~/aa01/` — versione tarball vs live.

## Next entry point

1. **First action userland**: organizza playtest live 2-4 amici (TKT-M11B-06). Comando:
   ```bash
   cd Game && npm run start:api &
   ngrok http 3334
   # Apri lobby URL su 4 phone, host segue docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md
   ```
2. **First action autonomous next session** (se Claude budget tempo): **M14-A resolver wire residual** (~3-4h, pure code, baseline 311/311 verde, low risk). Read [`hexGrid.js elevationDamageMultiplier`](apps/backend/services/combat/hexGrid.js) + [`terrainReactions.js`](apps/backend/services/combat/terrainReactions.js) + wire in `traitEffects.js` damage step.
3. **Reference docs**: `WORKSPACE_MAP.md` per topologia, `BACKLOG.md` post drift fix per signal pulito, `docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md` per F-\* original audit.
4. **Estimated effort prossima sessione**: 4-8h autonomous se M14-A wire + ENNEA-WIRE refactor preliminare.

## Memory candidates (already saved)

- ✅ [`feedback_workspace_audit_scope_lesson.md`](C:/Users/edusc/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_workspace_audit_scope_lesson.md) — "controlla a fondo" = filesystem-wide grep + GitHub org list + `~/.claude/projects/` cache. 5 PR per chiudere scope-miss iniziale.
- ✅ [`feedback_data_grounded_expert_pattern.md`](C:/Users/edusc/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_data_grounded_expert_pattern.md) — `awk`/`head -1` cross-check pre-trust card/BACKLOG. Catch AI-hallucinated card examples. Multi-PC parallel race detection via `gh pr list --state merged`.

## Pattern lezioni convalidate (3× in sessione)

1. **BACKLOG drift sistematico** — 5 ticket "open" già chiusi cross-session. Mitigation: pre-pick verify obbligatorio.
2. **Multi-PC parallel race** — 8 PR altro PC merged interleaved con questa sessione (OD-008/011/012, ancestors recovery 297/297). Mitigation: `gh pr list --state merged --search` pre-implementation.
3. **AI-generated card hallucinations** — museum card claim "22 SC + CO ## codes" smentito da awk count + head -1 CSV. Numbers reali 12 SC + FR codes. Mitigation: cross-check awk PRIMA di trust card.

## Stato test post-merge

- AI: **311/311** verde (baseline)
- Trait effects: **21/21** verde
- validate-datasets: 14 controlli, 0 avvisi (post 22 ancestors\_\* trait + 12 SC stub di altro PC)
