---
title: 'Residual-gate register -- consolidated open gates by gate-type (2026-06-23)'
date: 2026-06-23
type: residual-register
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 30
tags: [evo-tactics, residual, gates, reconciliation, roadmap, spec-aq, in-flight]
---

# Residual-gate register (2026-06-23)

> **Scopo**: un solo posto che elenca OGNI gate residuo aperto, ground-truth su
> `origin/main` (non marker), ordinato **per tipo-di-gate** (cosa lo sblocca), NON per
> SPEC/priorita'. Copre i residui della suite reconstruction SPEC-A..Q **+** i
> workstream in-flight (trait-mechanics-engine, OD-024 sentience, codex-lore, TKT-P6,
> aa01-Impronta, canon-linter). Esclude i 100+ planning doc storici/superseded.
>
> **Verifica**: ogni riga = controllata contro git/codice il 2026-06-23 (local 6-behind
> -> fetchato + basato su `origin/main` @ `e590ac06` #2979). Anti-pattern #19 (marker=
> ipotesi, git=verita').
>
> **Roadmap-of-record**: `docs/core/40-ROADMAP.md` (strategica) + `BACKLOG.md` (residui
> operativi, ha il pointer a questo registro) + CLAUDE.md sprint pointer (live). Questo
> registro = vista trasversale; la singola fonte-di-dettaglio per workstream resta linkata.

## 0. Correzioni ground-truth (marker stale trovati nell'audit)

Prima dei residui: 4 cose erano marcate aperte/diverse ma git dice CHIUSE/cambiate.

| Item                         | Marker stale diceva                     | Git-verita' 2026-06-23                                                                                                           | Fonte                                                                           |
| ---------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| OD-024 interoception grant   | memory "flag OFF band-neutral"          | **FLIPPED ON in prod 2026-06-22** (master-dd auth, symmetric N=40 in-band, completion 0.625->0.525 = piu' difficile ma in banda) | `docs/ops/2026-06-22-od024-d7-interoception-flip-runbook.md` (Execution record) |
| Prod backend task resilience | `BACKLOG.md:141` "OPEN owner-gated"     | **APPLIED 2026-06-22** (master-dd run elevato; +AtStartup +RestartCount 999)                                                     | #2966 `faa62e20`                                                                |
| Prod Postgres auto-start     | D7 runbook "never auto-started"         | **RESOLVED 2026-06-22** (cmd PG-ensure; effetto al prossimo restart pulito del task)                                             | #2965 `0ab859d1`                                                                |
| Governance stale burn-down   | `BACKLOG.md:205` "P3 OPEN 181 warnings" | **CLOSED 397->0** (#2914 chiusa 36/36)                                                                                           | memory `project_governance_stale_burndown`                                      |

> NB residuo doc-hygiene: i marker BACKLOG:141 e BACKLOG:205 vanno flippati (sono testo,
> non gate reali). Fatto nel wiring BACKLOG di questo registro.

---

## 1. Gate = N=40 / calibration (flip o re-tune gated su batch + ratifica master-dd)

Tutti passano per l'orchestrator **G2** (`tools/sim/full-loop-batch.js` / `batch_calibrate_*`,
in-process supertest, MAI prod). G2 e' **BUILT** (P1-P5); il collo di bottiglia non e' piu'
l'harness ma **content + esperimento + ratifica**.

| Residuo                                                            | Workstream | Gate preciso                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Stato                                                            |
| ------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **PE_ratio -> contestedness** (sblocca SPEC-J + SPEC-H)            | G2 calib   | ✅ candidati #3000 + ✅ **N=100 orthogonality RUN #3008** (`E_dmg_margin` selezionato, 0.499<0.6) MA 🔴 **banda FALSIFICATA da harsh-review** (single-policy diagnostic corpora + banda 3-punti outlier-artifact). **FIX = re-run su corpora MULTI-POLICY canonici** = harness-work (`calibrate_parallel` greedy-only; full-loop = granularita' campagna) -> **chip calib-session** `task_<see-chip>`. Selezione E regge; banda no. Ratifica SDMG dopo il re-run canonico. Evidence `docs/playtest/2026-06-23-pe-contestedness-orthogonality-n100.md` |
| **SPEC-J `LETHAL_MISSIONS_ENABLED` flip**                          | SPEC-J     | (1) autora >=1 encounter `lethal:true` (content, master-dd: biome/roster/banda-attrition) + (2) lethal-mission N=40 in banda via G2                                                                                                                                                                                                                                                                                                                                                                                                                   | OPEN. Backend+Godot consent UI DONE; #2865 DEFER                 |
| **SPEC-H HA1 flip** `aliena_enforcement.enabled:true` + `strength` | SPEC-H     | N=40 su `enc_badlands_pilot_01` (WR in banda + no regressione)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | OPEN. Machinery+surface COMPLETE; e' l'unico residuo sostanziale |
| **SPEC-I ER7 flag-ON** (population tick per ruolo trofico)         | SPEC-I     | N=40 flag-ON                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | OPEN. ER7 build flag-OFF gia' shipped #2723                      |
| **A2 floor magnitude re-tune** (UPWARD-only)                       | SPEC-I/A2  | playtest umano -> re-tune `pressure_tier_floor` solo verso l'alto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | OPEN. A2 LIVE in prod, magnitude RATIFIED-PROVISIONAL            |
| **OD-024 STAMINA_FATIGUE_ENABLED flip** (engine #2)                | OD-024     | proprio N=40 + flip (incrementale, NON insieme a interoception)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | OPEN. Engine #2 build done; next incremental piece               |
| **OD-024 interoception re-tune** (opzionale)                       | OD-024     | scelta master-dd: (b) ammorbidire enemy scaling per ricentrare completion ~0.6 dopo il flip ON                                                                                                                                                                                                                                                                                                                                                                                                                                                        | OPEN-opzionale (knob, non blocker; il flip e' gia' band-safe ON) |
| **ER6 overrun carry-over fork** (TKT-ER6-CARRYOVER)                | SPEC-I     | nuova N=40 + verdetto master-dd (as-built = consume-once ratificato)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | OPEN P3                                                          |

---

## 2. Gate = decisione master-dd (design-call / verdetto; nessun build-blocker, serve scelta)

> ✅ **3 verdetti master-dd 2026-06-23** (stampati nelle righe sotto): SPEC-J scar->transform = trait MECCANICO / codex 19 orfani = replica pilot-cameo per-bioma / move-substrate (volo I + radici) = BUILD terrain-cost substrate. + correzione marker stale: H1 (GATE ratificato 06-02) + H2 (economy SHIPPED) NON erano aperti.

| Residuo                                            | Workstream      | Cosa decidere                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~H2 economy cost-gate~~                           | design-closure  | ✅ DECISO/SHIPPED: cost-gate reali consume-all (#2554/#2555/#2557/#2558). NON aperto -- marker NEXT GOAL stale (anti-pattern #19)                                                                                                                                                                                                                        |
| ~~H1 GAP-C fase-3/4~~                              | design-closure  | ✅ DECISO: GATE/POST-MVP ratificato master-dd 2026-06-02 (build greenlit sessione futura al flip). NON aperto -- marker NEXT GOAL stale                                                                                                                                                                                                                  |
| **H7 PILLAR re-ratifica**                          | design-closure  | `PILLAR-LIVE-STATUS.md` ~22gg stale: giugno non riflesso (item-1 17/17 + SPEC-J/K/H + dossier); refresh contenuto + re-verify owner (TKT-STALE-B6-PILLAR-REFRESH)                                                                                                                                                                                        |
| **SPEC-J scar->transform**                         | SPEC-J/E        | ✅ **BUILT flag-gated MERGED #2994 `76d2a078`** (NON ricostruire): `nidoRitual.transformScar` + `SCAR_TRAIT_MAP` PROPOSED + flag `SCAR_TRANSFORM_TRAIT_GRANT_ENABLED` OFF=band-neutral; testa-unmapped=gate; persist `acquiredTraitsByCreature`; chronicle registra il grant. Residuo owner-gated: ratifica/estendi map + N=40 + flip; costo E6 = SPEC-E |
| **codex-lore 19 orfani per-bioma**                 | codex-lore      | ✅ verdetto = replica pilot-cameo, MA **BLOCKED su input master-dd** (verify-first 06-23: HA2 validator = 0 orfani-codex attuali; il "19" NON ha lista [10 codex vs ~75 bestiario = tua curation]; gli orfani-roster derivabili mancano di master-record). Serve la lista 19 (o criterio) + prosa HITL -> poi scaffold                                   |
| **move-substrate: volo I + radici_ancora_planare** | trait-mechanics | ✅ verdetto = BUILD terrain-cost substrate -> **piano MERGED #2997 `3ab9f788`** (`docs/superpowers/plans/2026-06-23-move-terrain-cost-substrate-plan.md`) + chip `task_ea29f282`. Sessione dedicata (band-affecting N=40; `movement_profiles.yaml` 0-consumer; move=Manhattan in `abilityExecutor.js`; coord. sessione trait viva)                       |
| **GAP2 inert-trait mechanics**                     | trait-mechanics | 103 per-trait DB file inerti: proponi una meccanica per trait (design-gated)                                                                                                                                                                                                                                                                             |
| **aa01 D4 auto-timer defaulting**                  | aa01-Impronta   | "un imprint defaultato e' accettabile?"                                                                                                                                                                                                                                                                                                                  |
| **aa01 D6 axis->trait grant**                      | aa01-Impronta   | i 4 assi concedono trait meccanici (non-band-neutral, spec separata)                                                                                                                                                                                                                                                                                     |
| **aa01 D7 prose / hint-string**                    | aa01-Impronta   | copy player-facing "il tuo branco tende verso X" (HITL, boundary codex-lore)                                                                                                                                                                                                                                                                             |
| **aa01 D8 chain-lightning propagation**            | aa01/terrain    | `chainElectrified` multi-tile: raggio + danno per-tile (balance)                                                                                                                                                                                                                                                                                         |

---

## 3. Gate = superficie Godot (cross-repo Game-Godot-v2)

| Residuo                                             | Workstream          | Gate                                                                                                       |
| --------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **SPEC-K K-07 real-device playtest**                | SPEC-K              | unico residuo SPEC-K (6/7 DONE; AI smoke 8/8 PASS #2890; manca solo prova su device reale, mani master-dd) |
| **aa01 D1 TV cinematic**                            | aa01-Impronta       | phone+hint chip DONE (GGv2 #531); resta briefing TV / silhouette creatura                                  |
| **aa01 D2 `IMPRINT_BEAT_ENABLED` flip**             | aa01-Impronta       | D1 surface landed -> playtest + master-dd (NEXT gate aa01; NON autonomo)                                   |
| **aa01 D5 route-vote affinity weighting**           | aa01 + meta-network | gated `META_NETWORK_ROUTING` flip + Godot route-UI                                                         |
| **META_NETWORK_ROUTING route-UI**                   | meta-network/GAP-C  | build Godot choice-UI (gia' speccata #2594); poi flip env-only                                             |
| **GAP-C fase-3 choice-UI + fase-4 Dormans grammar** | worldgen            | POST-MVP, gate normale (~30-40h)                                                                           |

---

## 4. Gate = build / impl (engineering, in gran parte autonomo)

| Residuo                                                 | Workstream      | Cosa costruire                                                                                                                      | Stato                                                                                                                               |
| ------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **trait-mechanics slices 5-7**                          | trait-mechanics | slice 5 (filtri/membrane/volo-II-III) ; 7 LARGE (eco_sismico + pigmenti). volo-I + radici -> via move-substrate (verdetto bucket 2) | **~6.5/12 trait built** (slice 3 #2983 + slice 4 #2985 mergiati: +corteccia/nuclei-full/ally_aura + artigli/tessuti). Sessione viva |
| **13 creature canonizzazione**                          | trait-mechanics | spec gameplay + lore HITL + promote (dipendono dai loro kit-trait) + delete vecchi stub                                             | **0/14 canonizzate** (1 speccata: resonant_claw_hunter)                                                                             |
| **canon-linter follow-up**                              | CI tooling      | tune `scripts/data/verify_stopwords.txt` sui false-positive design-doc IT -> flip markdown-tier a `--strict`                        | OPEN non-bloccante                                                                                                                  |
| **SPEC-F offspring->playable lineage + QR/card export** | SPEC-F/E        | offspring giocabili (lineage SPEC-E) + export card                                                                                  | OPEN                                                                                                                                |
| **jsonschema-shadow follow-up**                         | tech-debt       | validation follow-ups esposti dalla rimozione stub (BACKLOG:990)                                                                    | OPEN P2                                                                                                                             |
| **stale trace_hashes**                                  | trait-mechanics | repo-wide refresh (PR separata)                                                                                                     | OPEN                                                                                                                                |

---

## 5. Gate = infra owner-gated / forbidden-path / mani-prod

| Residuo                                                  | Workstream      | Perche' gated                                                                                                                                                                                                    |
| -------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Final catalog/affinity re-baseline**                   | trait-mechanics | `species_catalog.json` + `data/traits/index.json` + `species_affinity.json` ancora stale (drift originale, /tmp provenance); rigenera deterministico + commit; guard va verde. jobs.yaml gia' re-baselined #2976 |
| **traitMechanics schema changes**                        | trait-mechanics | `packages/contracts/schemas/traitMechanics.schema.json` = forbidden-path (autorizzato caso-per-caso)                                                                                                             |
| **SPEC-F durable crossbreed cooldown**                   | SPEC-F          | campo schema `crossbreed_history` = `packages/contracts` forbidden-path (oggi cooldown in-memory)                                                                                                                |
| **SPEC-E ritual resource-cost (E6)**                     | SPEC-E          | balance + possibile schema                                                                                                                                                                                       |
| **CI-wire reproducibility guard**                        | trait-mechanics | `.github/workflows` = forbidden-path                                                                                                                                                                             |
| **Registrare i program-doc 2026-06-22 in docs_registry** | governance      | unregistered_document (warning-only); usa `tools/docs_governance_migrator.py`                                                                                                                                    |
| **D9 CAP-12 PlayerRunTelemetry canon-home**              | aa01 + SPEC-M   | migration = forbidden-path + ADR (vcSnapshot/selectedForm reconstruct-from-ledger doctrine)                                                                                                                      |
| **Prod flips (mani master-dd)**                          | vari            | `LETHAL_MISSIONS_ENABLED` / `aliena_enforcement` / `STAMINA_FATIGUE_ENABLED` / `IMPRINT_BEAT_ENABLED` / `META_NETWORK_ROUTING` = env keys.env + restart task (dopo i rispettivi gate sopra)                      |

---

## 6. Mappa rapida: cosa sblocca cosa

- **1 esperimento contestedness** (bucket 1, single-owner) -> sblocca i flip SPEC-J + SPEC-H (i 2 residui SPEC piu' pesanti).
- **trait-mechanics slices 3-7** (bucket 4) -> sbloccano le 13 creature (bucket 4) -> che insieme spingono verso il **final re-baseline** (bucket 5).
- **META_NETWORK route-UI** (bucket 3) -> sblocca aa01 D5 (bucket 3) + GAP-C.
- **Gate-5 (player-visible)**: aa01 D1-TV + SPEC-K K-07 = le uniche superfici Godot davvero residue.

## 7. Esplicitamente NON residui (gia' chiusi, per non re-aprirli)

item-1 SPEC-A..Q doc-flip (17/17 `active`); SPEC-H machinery+surface; SPEC-J backend+consent-UI;
SPEC-K 6/7; OD-024 D1-D7 interoception (FLIPPED ON); governance stale (397->0); prod-resilience
(applied) + Postgres auto-start (resolved); PHASEC 32/32; GAP-A/B; H2 economy; full-loop runner.
