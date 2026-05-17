---
title: "Design Corpus Catalog V2 — Vision + Spec + Gap + External"
date: 2026-04-26
status: active
authority: A0
workstream: cross-cutting
owners: [eduardo]
purpose: "Inventario V2 esteso: vision (cosa è) + spec (cosa dovrebbe essere) + gap (cosa NON è ancora) + external (evo-swarm + GitHub issues + sibling repos). Estende [V1 catalog](2026-04-26-design-corpus-catalog.md) aggiungendo dimensione delta + fonti esterne."
sources:
  - V1 catalog (~700 file): docs/reports/2026-04-26-design-corpus-catalog.md
  - 9 deep-analysis report: docs/reports/2026-04-26-deep-analysis-*.md
  - Evo-swarm export 504 LOC: github.com/MasterDD-L34D/evo-swarm/docs/exports/EXPORT-FOR-GAME-REPO-2026-04-25-FINAL.md
  - GitHub issues: Game #1837 + #1858 + #1859 + #1673 + evo-swarm (zero issue, all PR-driven)
  - 3 agent paralleli 2026-04-26 (Explore + general-purpose)
---

# Design Corpus Catalog V2

## Indice

1. **§1 Vision** — cosa è il gioco (canonical fonti)
2. **§2 Spec** — cosa dovrebbe essere (promesse + roadmap + research)
3. **§3 Gap** — cosa NON è ancora (orphan + deferred + parked + open Q)
4. **§4 External** — fonti esterne (evo-swarm + GitHub + sibling repos)
5. **§5 Cross-ref** — mappa file→pilastro→stato runtime
6. **§6 Action map** — decisioni bloccanti utente

---

# §1 — VISION (cosa è il gioco)

## 1.1 Identità una-frase

> _"Tattica profonda a turni, cooperativa contro il Sistema, condivisa su TV: come giochi modella ciò che diventi."_ — `docs/core/01-VISIONE.md`

## 1.2 Spina dorsale canonical (Authority A1)

| File | LOC | Cosa contiene | Ultimo verified |
|---|---:|---|---|
| `docs/core/00-GDD_MASTER.md` | 179 | Entry point unico — vision + mechanics + scope | active |
| `docs/core/00-SOURCE-OF-TRUTH.md` | **1341** | 19 sezioni: tesi/first-game/worldgen/foodweb/species/forme/TV/companion/salotto/narrative | active |
| `docs/core/01-VISIONE.md` | 14 | Tesi una-frase | active |
| `docs/core/02-PILASTRI.md` | 35 | 6 pilastri di design + stato 🟢/🟡/🔴 | 2026-04-20 |
| `docs/core/03-LOOP.md` | 17 | Loop alto livello: meta → species draft → match → telemetry → mutation | active |
| `docs/core/40-ROADMAP.md` | 51 | Scope MVP → Alpha (cap content + 6 specie + 7 jobs + 2 maps) | active |
| `docs/core/90-FINAL-DESIGN-FREEZE.md` | **759** | Product synthesis + frozen systems + tuning rules (A3) | 2026-04-15 |

## 1.3 Hubs workstream (entry per area)

`docs/hubs/` × 8 file: README, combat, flow, atlas, backend, dataset-pack, ops-qa, incoming. Authority A1.

## 1.4 Mechanics canonical

| Modulo | File | Cosa specifica |
|---|---|---|
| Sistema d20 | `10-SISTEMA_TATTICO.md` + `11-REGOLE_D20_TV.md` | Init scatti + 2 AP + MoS + terrain + status + PT + Guard&Parry |
| Level design | `15-LEVEL_DESIGN.md` (154 LOC) | Encounter anatomy: bioma + layout + obj + wave + conditions |
| Screen flow | `17-SCREEN_FLOW.md` (153 LOC) | UI flow onboarding → mission → combat → telemetry |
| Specie | `20-SPECIE_E_PARTI.md` | Slot anatomici + budget + sinergie |
| Forme | `22-FORME_BASE_16.md` | 16 MBTI E/I S/N T/F J/P |
| Telemetria VC | `24-TELEMETRIA_VC.md` + `Telemetria-VC.md` | Behavioral → MBTI → Ennea → Disco-Elysium reveal (dedup pending) |
| Economy | `26-ECONOMY_CANONICAL.md` (171 LOC, A1) | PE/PI/PT/PP/SG/Seed glossario |
| Mating/Nido | `27-MATING_NIDO.md` + `Mating-Reclutamento-Nido.md` | Riproduzione + nesting + recruitment |
| UI TV | `30-UI_TV_IDENTITA.md` | TV-first identity (companion mission-console) |
| Onboarding 60s | `51-ONBOARDING-60S.md` (193 LOC) | Disco Elysium 3-stage |

## 1.5 Guide complete (italiano, 5,922 LOC totali)

`docs/evo-tactics/`:
- `evo_tactics_guide.md` (445 LOC, 56K)
- `guida-ai-tratti-1/2/3-evo-tactics/3-database.md` (3,391 LOC totali, 184K)
- `integrazioni-v2.md` (938 LOC, 52K)
- `Guida_Evo_Tactics_Pack_v2.md` (1,187 LOC, A1)

## 1.6 Pillars status (post-deep-analysis 2026-04-26)

| Pilastro | Pre-V2 | Post-V2 (verified) | Caveat |
|---|:-:|:-:|---|
| P1 Tattica leggibile | 🟢 | 🟡 | UI threat tile overlay missing (Fix #6 PR #1873? in PR-6 blocked) |
| P2 Evoluzione emergente | 🟢 c+ | 🟡++ | V3 mating engine LIVE 469 LOC zero frontend; OD-001 verdetto pending |
| P3 Specie×Job | 🟢 c+ | 🟡 | 44/45 species lifecycle YAML missing; XCOM perk live |
| P4 MBTI/Ennea | 🟡++ | 🟢 c | enneaEffects revived PR #1825-1830, Disco reveal Path A+B shipped 2026-04-26 |
| P5 Co-op vs Sistema | 🟢 c | 🟢 c | Playtest live TKT-M11B-06 unico bloccante umano |
| P6 Fairness | 🟢 c+ | 🟡 | hardcore-07 calibration deadlock; cautious AI broken |

**Score**: 0/6 🟢 + 2/6 🟢 candidato + 4/6 🟡.

---

# §2 — SPEC (cosa dovrebbe essere)

## 2.1 Final Design Freeze bundle (Authority A3, draft)

`docs/planning/EVO_FINAL_DESIGN_*.md` × 7 file (2,470 LOC):
- ROADMAPS_INDEX (208 LOC) — bundle index + reading order
- MASTER_ROADMAP (544 LOC) — tesi + 6 specie target + d20 + telemetry + scope lock
- MILESTONES_AND_GATES (395 LOC) — exit criteria + validator + smoke + rollback
- BACKLOG_REGISTER (382 LOC) — registro task FD-001..FD-100+
- SOURCE_AUTHORITY_MAP (283 LOC) — A0-A5 hierarchy
- CODEX_EXECUTION_PLAYBOOK (371 LOC) — strict-mode + fast-path
- GAME_DATABASE_SYNC (289 LOC) — cross-repo sync plan

## 2.2 Vision Gap V1-V7 sprint (2026-04-26)

`docs/planning/2026-04-26-vision-gap-sprint-handoff.md` — 7 promise audit. **6/7 chiusi PR #1726**:

| ID | Promise | Status |
|---|---|:-:|
| V1 | Onboarding 60s Phase B (Disco 3-stage) | ✅ shipped |
| V2 | Tri-Sorgente reward API Node-native | ✅ shipped |
| V3 | Mating/Nido full | 🔴 deferred (~20h post-MVP, OD-001 conflict) |
| V4 | PI-Pacchetti tematici 16×3 | ✅ shipped |
| V5 | SG earn formula Opzione C mixed | ✅ wired runtime |
| V6 | UI TV dashboard polish | 🔴 deferred (~6h post-playtest) |
| V7 | Biome-aware spawn bias | ✅ wired runtime |

## 2.3 Reality audit 2026-04-20 (honesty pass)

`docs/planning/2026-04-20-pilastri-reality-audit.md` (498 LOC) + `2026-04-20-design-audit-consolidated.md` (562 LOC) + `2026-04-20-design-audit-raw-questions.md`.

Honesty score precedente: **1/6 🟢 genuine** (P1), **5/6 🟡 inflated**. Esempi gap dichiarati:
- P2: 84 specie YAML → ZERO runtime evoluzione (no leveling, no trait acquisition in-game)
- P3: stat curves defined ma non applicati runtime (pre-perk wire)
- P5: ZERO WebSocket multi-client pre-M11 (modulation 8p era config only)
- P6: hardcore iter7 RED (0% defeat + 67% timeout deadlock)

## 2.4 Research / RFC (32 file)

### 2.4.1 docs/research/ (5 file Skiv + 1 cross-game)
- ⭐⭐⭐⭐⭐ `2026-04-25-skiv-lifecycle-visual-research.md` — visual progression industry (9 stages)
- ⭐⭐⭐⭐⭐ `2026-04-25-skiv-narrative-arc-research.md` — narrative arc + emotional beats
- ⭐⭐⭐⭐⭐ `triangle-strategy-transfer-plan.md` (65KB) — combat/UI/progression/coop transfer
- ⭐⭐⭐⭐ `2026-04-25-skiv-online-imports.md`
- ⭐⭐⭐⭐ `2026-04-25-skiv-prior-art-web.md`
- ⭐⭐⭐⭐ **NUOVO** `2026-04-26-voidling-bound-evolution-patterns.md` — 6 pattern (rarity-gated unlock + element path-lock + Spliced endpoint + 3-currency + factional affinity + visual mandatory)

### 2.4.2 docs/planning/research/ (27 file)
- README + intentional-friendly-fire + lore_concepts + Spore reference
- **enneagram-addon/** (8 file) — addon parked
- **sentience-branch-layout/** (5 file) — RFC sentience MVP T1-T6
- **sentience-rfc/** (2 file) — RFC formal v0.1 + sources

## 2.5 Ideas index (26 parked + 4D classification)

`docs/planning/ideas/IDEAS_INDEX.md` ⭐⭐⭐⭐⭐ — 26 idee parked, top-5: Fase C reazioni, Fog of intent, Action preview, 5v5+ stress test, Eval classifier. Anti-pattern guard kill-60.

## 2.6 Library + Games source index

| File | LOC | Scopo |
|---|---:|---|
| `LIBRARY.md` (root) | 17K | 70+ source + 40+ skill + 8 subagent + Workspace topology |
| `docs/guide/games-source-index.md` | NEW | Catalogo UNICO giochi: Tier S (12) + A (11) + B (15) + C (6) + D (7) + E (14) + Anti-ref (14) + Persona (7) |

**Tier S (vision donor)**: Triangle Strategy (P1+P3+P4), Spore (P2), FFT (P1), Tactics Ogre Reborn (P1 HUD), Fire Emblem (P3), Wesnoth (P1+P3+P6), AncientBeast (P1 hex), XCOM (P3 perks), Long War 2 (P6 timer), Jackbox (P5 coop), Disco Elysium (P4 thought cabinet), AI War (P5+P6), Fallout Tactics (P1+P6), Wildermyth (narrative), **Voidling Bound** (P2+P3 rarity-gating).

## 2.7 Museum curated (12 card + 8 excavations)

`docs/museum/MUSEUM.md` — Hades-Codex pattern reuse. Repo-archaeologist unico writer.

**12 card score 4-5/5**: mating orphan, Triangle Strategy, sentience, ennea mechanics, ennea dataset, ancestors, nido itinerante, MBTI gates, biome memory, magnetic rift, enneaeffects orphan, **NUOVO Voidling Bound evolution patterns**.

**8/8 domain coverage 100%**: ancestors, cognitive_traits, enneagramma, personality, mating_nido, old_mechanics, species_candidate, architecture.

**Skiv unblock**: 8/11 card hanno reuse path Skiv-aware (Sprint A: 2, Sprint B: 1, Sprint C: 4).

---

# §3 — GAP (cosa NON è ancora)

## 3.1 Critici 🔴 (blocca pilastro o feature)

| # | Gap | File | Score |
|---|---|---|:-:|
| G1 | **OD-001 V3 Mating engine** — LIVE 469 LOC + 7 endpoint + ZERO frontend wire (4 mesi dead path) | OPEN_DECISIONS OD-001 + museum card M-007 | 5/5 |
| G2 | **P2 Evoluzione runtime** — 84 specie YAML → ZERO runtime evoluzione (blueprint flow mai applicato) | pilastri-reality-audit | 5/5 |
| G3 | **Campaign structure zero** — "Core loop doc canonical" ma 1 tutorial only, no difficulty curve | design-audit-consolidated | 5/5 |
| G4 | **G1.2 Utility AI integration** — `utilityBrain.js` opt-in non wired round orchestrator | 2026-04-17-audit-gap-implementativo-docs | 4/5 |
| G5 | **Encounter YAML loader** — 9 templates orphan ✅ FIXED PR #1873 | (resolved this session) | 5/5 |
| G6 | **68 ancestor status no-op** — silently no-op vs runtime ✅ VERIFIED LIVE PR #1872 (audit false positive) | (resolved this session) | 5/5 |
| G7 | **Threat tile overlay rosso** — backend genera, frontend non disegna ✅ FIXED PR-6 (blocked push) | deep-analysis-ui | 4/5 |

## 3.2 Maggiori 🟡 (pilastro incompleto)

| # | Gap | File | Score |
|---|---|---|:-:|
| M1 | **OD-012 swarm trait magnetic_rift batch** — 1/5-10 shipped, 4-9 pending | OPEN_DECISIONS OD-012 | 4/5 |
| M2 | **OD-011 ancestors recovery** — Path A 22 ✅ + Path B 263 ZIP ⚠️ scope override | OPEN_DECISIONS OD-011 | 3/5 |
| M3 | **P4 MBTI axes parziali** — 2/4 axes live (E_I, S_N), T_F+J_P stub | pilastri-reality-audit | 3/5 |
| M4 | **P5 Network multi-client** — ZERO WebSocket pre-M11; 4-8 modulation = config-only | design-audit-consolidated | 4/5 |
| M5 | **P6 Fairness deadlock** — hardcore-07: 0% defeat + 67% timeout (multiplier exhausted) | design-audit-consolidated | 4/5 |
| M6 | **44/45 species lifecycle YAML missing** — solo dune_stalker_lifecycle.yaml esiste | deep-analysis-creature | 5/5 |
| M7 | **30/30 mutations senza visual_swap_it** — Voidling Bound P0 linter rule (anti-pattern guard active ma linter mancante) | voidling-bound-evolution-patterns | 4/5 |
| M8 | **TKT-P4-MBTI-003 recruit gating** — pre-req OD-001 Path A | OPEN_DECISIONS OD-013 residual | 3/5 |

## 3.3 Minori 🟠 (deferred polish + research)

| # | Gap | File | Score |
|---|---|---|:-:|
| m1 | OD-002 V6 UI TV dashboard polish | OPEN_DECISIONS | 2/5 |
| m2 | M4 Art integration orphan — 7 SVG + 3 PNG zero import render.js | 2026-04-18-M4-retrospective-art-integration-gap | 3/5 |
| m3 | TKT-07 tutorial sweep #2 N=10 | BACKLOG | 2/5 |
| m4 | TKT-10 harness retry+resume JSONL | BACKLOG | 2/5 |
| m5 | OD-003 Triangle Strategy rollout sequenza M14-A/B vs M15 | OPEN_DECISIONS | 2/5 |
| m6 | OD-004 Game-Database HTTP Alt B activation timing | OPEN_DECISIONS | 2/5 |
| m7 | OD-005 Balance Tuning skill install post-playtest | OPEN_DECISIONS | 2/5 |

## 3.4 Pattern: Orphan components

| Component | Status | Risk |
|---|:-:|---|
| `enneaEffects.js` | ✅ REVIVED PR #1825-1830 | NOW LIVE |
| Magnetic_rift_resonance | ✅ SHIPPED PR #1774 | LOW (pilot, batch in OD-012) |
| Art asset SVG/PNG | 🔴 ORPHAN VISUAL | HIGH (dead code) |
| Campaign structure docs | 🔴 ZERO IMPL | BLOCKING |
| Utility AI brain | 🟡 PARTIAL OPT-IN | MEDIUM |
| XP Cipher | 🔴 PARKED ADR-04-17 | LOW (out of scope) |

## 3.5 Recently resolved (sprint 2026-04-25 → 2026-04-26)

| Path | Resolution |
|---|---|
| TKT-ANCESTORS-RECOVERY | PR #1815 + #1813 + #1817 — 297/297 wire 22 + residual 90 |
| TKT-MUSEUM-ENNEA-WIRE | PR #1825-1830 — 9/9 archetype + 5/5 stat consumer |
| TKT-P4-MBTI-001/002 | Phased reveal + dialogue color codes shipped 2026-04-26 |
| OD-008/009/010 | Sentience backfill 45 species + Ennea hybrid sync + Skiv voice A/B |
| Vision Gap V1-V7 | 6/7 chiusi PR #1726 |
| **P0 batch session 2026-04-26** | **5 PR shipped (#1869-#1873) + 2 pending** |

---

# §4 — EXTERNAL (fonti esterne)

## 4.1 Evo-Swarm bridge (391 cicli swarm AI)

**Repo**: `MasterDD-L34D/evo-swarm` (sibling). Pipeline auto export Game→swarm bidirezionale via `scripts/swarm-to-game-export.py`.

**Export 2026-04-25 FINAL** (504 LOC, `docs/exports/EXPORT-FOR-GAME-REPO-2026-04-25-FINAL.md`):

| Topic | Cicli | Status Game-side |
|---|---:|---|
| 🌍 Biomi & ecosistemi | 120 | Material per biomes.yaml — focus Atollo Obsidiana + Frattura Abissale + Abisso Vulcanico + Caldera Glaciale |
| 🐙 Specie & creature | 50 | Design pronto per asset team — 30 cicli su `dune_stalker` (=Skiv canonical) |
| 🧬 Trait & abilità | 23 | Candidati `traits/active_effects.yaml` — RisonanzaMentale, ArtigliSetteVie, EMP, MagneticField |
| ⚙️ Meccaniche gameplay | 21 | Priority alta code-side (combat / synergy) — `resonance_tide`, `morph_budget` |
| 📖 Lore & narrativa | 22 | Hook narrativi — Fratellanze di Ossidiana ritualistic |

**Cross-ref Game-side**:
- `dune_stalker` → Skiv canonical (`Arenavenator vagans`, INTP, sentience T2-T3) — swarm non sapeva del rename
- `polpo_araldo_sinaptico` → legacy in `data/core/species.yaml` (risonanza mentale + ecoflash)

**Coverage gap (50 expansion species ignote allo swarm)**:
- arenavolux-sagittalis (Saettatore delle Dune)
- ferriscroba-detrita (Spazzino Ferroso)
- sonapteryx-resonans (Ala Risonante)
- + 47 altri

**Biomi nuovi proposti dallo swarm NON in `biomes.yaml`**:
- Atollo di Ossidiana (magnetic_spire affixes)
- Frattura Abissale (termico/sinaptico)
- Abisso Vulcanico (stresswave + eventi termici)
- Caldera Glaciale ⚠️ duplicato (esiste già `biomes.yaml:97-128`, swarm reinventato → child #1859)

## 4.2 GitHub Issues — Game OPEN (4 totali, all vision-relevant)

| # | Title | Relevance | Decision required |
|---|---|:-:|---|
| **#1837** | [swarm] First delivery 391 cycles | 5/5 | 4 opzioni: triage/integrate Skiv/feed reverse/discard |
| **#1858** | [swarm] Skiv design extension | 5/5 | Triage manuale ≥1 trait/synergy Sprint B/C |
| **#1859** | [swarm] Coverage gap (Caldera Glaciale duplicato) | 4/5 | Auto-action evo-swarm (inject biomes.yaml in specialist context) |
| **#1673** | [P2 parked] BiomeMemory | 3/5 | Implicito: integrate in PI pack v2 invece tabella dedicata |

## 4.3 Evo-swarm OPEN issues
**ZERO** — workflow PR-based (#29 export, #35 cross-ref, #44 L-E18 fix, #54 Atto 2 Scenario A "Integration drive").

## 4.4 Game OPEN PRs (snapshot 2026-04-26)

| PR | Title | Vision tag |
|---|---|---|
| **#1877** | feat(nido): Sprint C — mating roll + 3-tier visual feedback (OD-001 Path A 3/4) | OD-001 mating |
| **#1873** | feat(combat): encounter YAML loader opt-in (PCG G1 P0) | PCG (this session) |
| **#1872** | fix(combat): isTurnLimitExceeded + pin 68 ancestor status (P0) | ancestors+P0 (this session) |
| **#1871** | fix(scenario): objective string → schema object (PCG G2 P0) | PCG (this session) |
| **#1870** | fix(economy): orphan currency + difficulty key + PE→PI gate (P0) | economy (this session) |
| **#1869** | fix(balance): nerf trait outliers ipertrofia + sangue_piroforico (P0) | balance (this session) |
| **#1868** | feat(telemetry): VC compromesso completo | telemetry/VC |

Pattern: 5/7 PR aperti = stack P0 fix da deep-analysis 2026-04-26. **#1877 = OD-001 Sprint C mating** (vision-critical, P2 pillar gating).

## 4.5 Sibling repos topology (WORKSPACE_MAP)

| Repo | Path | Ruolo |
|---|---|---|
| **Game** | `C:/Users/VGit/Desktop/Game/` | Runtime SoT (questo repo) |
| **Game-Database** | `C:/Users/edusc/Documents/GitHub/Game-Database` | CMS taxonomy Prisma+Postgres (sibling) |
| **evo-swarm** | github.com/MasterDD-L34D/evo-swarm | Camel-agents swarm AI (4 PC) |
| **codemasterdd-ai-station** | locale | Archivio operativo + sprint files |
| Dafne | ~/Dafne/ 81MB | AI satellite locale |
| Archon Atelier | ~/aa01/ | AI satellite locale |
| openclaw | ~/.openclaw/ | runtime locale |

---

# §5 — CROSS-REF (file → pilastro → stato)

| File | Pilastro | Stato runtime |
|---|:-:|:-:|
| `00-SOURCE-OF-TRUTH.md` (1341 LOC) | tutti | spec canonica A1 |
| `90-FINAL-DESIGN-FREEZE.md` (759 LOC) | tutti | A3 product synthesis |
| `02-PILASTRI.md` | tutti | 0/6 🟢 + 2 candidato + 4 🟡 |
| `26-ECONOMY_CANONICAL.md` | P2/P6 | 🟡 (orphan SF+Seed fixed PR #1870, PE→PI gate live) |
| `15-LEVEL_DESIGN.md` + 9 YAML encounter | P1 | 🟡 → 🟢c (loader PR #1873 unlocked) |
| `22-FORME_BASE_16.md` + form_pack_bias.yaml | P2/P4 | 🟡++ |
| `24-TELEMETRIA_VC.md` + ai-policy-engine.md | P4 | 🟢c (Disco reveal + ennea wire shipped) |
| `30-UI_TV_IDENTITA.md` + 44-HUD | P5 | 🟡 (threat tile blocked PR-6) |
| `2026-04-26-voidling-bound-evolution-patterns.md` | P2/P3 | 🔴 (research only, runtime pending M14+) |
| `triangle-strategy-transfer-plan.md` | P1/P3/P4 | 🟢c Path A+B shipped 2026-04-26 |
| `Mating-Reclutamento-Nido.md` + metaProgression.js | P2 | 🔴 engine LIVE zero frontend (OD-001) |
| `Skiv CANONICAL.md` + 5 research file | P2/P3/P4 | 🟢c Sprint A done, B+C pending |
| `enneagram-addon/` + sentience-rfc/ | P4 | 🟡 RFC parked |
| `EVO_FINAL_DESIGN_*` (7 file) | tutti | A3 draft |
| `IDEAS_INDEX.md` | tutti | 26 parked, 4D classification |
| `MUSEUM.md` + 12 cards | tutti | 8/8 domain coverage |

---

# §6 — ACTION MAP (decisioni bloccanti utente)

## 6.1 1 decisione bloccante critica

**OD-001 V3 Mating Path A/B/C** — verdict required:
- **Path A** (~12-15h): activate engine via frontend wire — sblocca P2 🟢 candidato definitivo
- **Path B** (~2h): demolish engine 469 LOC — perdita sunk cost
- **Path C** (~5h): sandbox engine — keep alive ma escluso da MVP

**Status**: PR #1877 Sprint C mating roll già aperto su Path A 3/4. Verdict implicito = Path A in corso. **Conferma esplicita serve**.

## 6.2 1 decisione swarm integration (#1837)

4 opzioni:
1. **Triage selettivo** — leggere digest, scegliere 3-5 idee come PR/feature
2. **Integrate Skiv** — migrare design swarm su `dune_stalker`/Skiv canonical
3. **Feed reverse** — prossimo run swarm con 50 expansion species come input
4. **Discard** — chiudere senza azione

**Default suggerito**: combo (2)+(3) = integrate Skiv extension via #1858 + feed reverse 50 expansion via auto evo-swarm.

## 6.3 1 decisione MBTI surface (#1858)

Triage manuale 25+ cicli swarm `dune_stalker` → ≥1 trait/synergy Sprint B/C entro 24/05.

## 6.4 1 decisione Voidling Bound adoption

`docs/research/2026-04-26-voidling-bound-evolution-patterns.md` — 6 pattern, 3 livelli effort:
- **Minimal** (~1h): apri ticket + design debt flag
- **Moderate** (~5-6h): visual_swap_it 30 mutation + linter + Pattern 2 partial
- **Full** (~15-20h): wire all 6 pattern M14

## 6.5 P0 batch session 2026-04-26 — pending push

PR-6 UI (font WCAG + threat tile) + PR-7 docs (12 deep-analysis report) — sandbox blocked, serve OK esplicito utente per push.

---

# §7 — STATISTICHE V2

| Metrica | V1 | V2 |
|---|---:|---:|
| File totali catalogati | ~700 | ~700 + esterni |
| Vision canonical (core/) | 28 | 28 |
| ADR | 38 | 38 |
| Research/RFC | 32 | 33 (+voidling) |
| Museum cards | 11 | 12 (+voidling) |
| GitHub issues open Game | — | 4 (3 swarm + 1 BiomeMemory) |
| GitHub PR open Game | — | 7 (5 P0 batch + #1877 mating + #1868 telemetry) |
| Evo-swarm export cicli | — | 391 (504 LOC) |
| Gap critici 🔴 | 18 P0 | 7 (G1-G7, 3 fixed this session) |
| Gap maggiori 🟡 | 24 P1 | 8 (M1-M8) |
| Gap minori 🟠 | 20 P2/P3 | 7 (m1-m7) |
| Decisioni bloccanti utente | — | **4** (OD-001 + #1837 + #1858 + Voidling) |

---

# §8 — REFERENZE PARENT

- [`2026-04-26-design-corpus-catalog.md`](2026-04-26-design-corpus-catalog.md) — V1 catalog 22 macro-aree
- [`2026-04-26-deep-analysis-SYNTHESIS.md`](2026-04-26-deep-analysis-SYNTHESIS.md) — 9 agent synthesis + TOP-10 P0
- 9 deep-analysis report dedicati (balance/creature/narrative/pcg/economy/telemetry/ui/coop/outliers)
- [`OPEN_DECISIONS.md`](../../OPEN_DECISIONS.md) — 14 OD totali (5 risolti, 9 aperti)
- [`BACKLOG.md`](../../BACKLOG.md) — 60+ ticket open + closed
- [`LIBRARY.md`](../../LIBRARY.md) — reference index
- [`docs/museum/MUSEUM.md`](../museum/MUSEUM.md) — 12 cards curate
- [`docs/guide/games-source-index.md`](../guide/games-source-index.md) — 70+ giochi tier
