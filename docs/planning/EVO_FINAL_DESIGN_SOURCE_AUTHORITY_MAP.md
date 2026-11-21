---
title: Evo Final Design — Source Authority Map
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-06-06
source_of_truth: true
language: it-en
review_cycle_days: 180
---

# Evo Final Design — Source Authority Map

> **2026-06-06 re-verify**: la gerarchia di autorita resta valida. Aggiornamenti
> operativi: per TV/device, Nido, Custodi/Skiv, ALIENA/ERMES, route-vote e
> SPEC-K/L leggere anche la ricostruzione TV/device e la K/L operational matrix.
> La TV e' mirror/tavolo, non input authority; i device sono la superficie di
> scelta/commit. I planning storici non riaprono gap gia' live/gated su Game
> `origin/main` o Game-Godot-v2 `main`.

## 1. Scopo

Questo file definisce **chi vince in caso di conflitto** tra freeze, hub, ADR, YAML/core data,
Canvas storici e file operativi per agenti.

Serve a evitare drift documentale, patch corrette sul piano tecnico ma sbagliate sul piano
dell'autorita, e merge che mescolano prodotto, tooling e storico.

## 2. Principio guida

Il repo usa piu livelli di verita. Non esiste una sola sorgente universale per ogni domanda.
La regola corretta e:

- **governance** decide esistenza, stato e collocazione dei documenti;
- **ADR e hub canonici** decidono confini architetturali e contratti di workstream;
- **core data e schema** decidono la verita meccanica, numerica e validabile;
- **Final Design Freeze** decide la sintesi di prodotto e lo scope shipping;
- **file operativi per agenti** decidono come eseguire il lavoro senza rompere il repo;
- **Canvas e roadmap storiche** aiutano a capire l'intento, ma non vincono da soli.

## 3. Mappa delle autorita

ADR canonici attualmente in vigore al livello A1:

- [`ADR-2026-04-13-rules-engine-d20`](../adr/ADR-2026-04-13-rules-engine-d20.md) — scelta Python, balance layer separato, RNG namespacing.
- [`ADR-2026-04-14-game-database-topology`](../adr/ADR-2026-04-14-game-database-topology.md) — confine runtime Game vs Game-Database.
- [`ADR-2026-04-15-round-based-combat-model`](../adr/ADR-2026-04-15-round-based-combat-model.md) — round loop shared-planning → commit → resolve, semantica di `initiative` come reaction speed.
- [`ADR-2026-04-16-session-engine-round-migration`](../adr/ADR-2026-04-16-session-engine-round-migration.md) — piano di migrazione del Node session engine (`apps/backend/routes/session.js`) al round-based model, con feature flag `USE_ROUND_MODEL` e checklist in 17 step.

| Livello | Autorita                                                                                       | Cosa governa                                                                               | In caso di conflitto vince su                                                            | Non puo sovrascrivere da sola                                       |
| ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| A0      | `docs/governance/*`, `docs/governance/docs_registry.json`                                      | Path, frontmatter, stato dei file, ownership, classificazione canonico/storico             | planning docs, index locali, convenzioni ad hoc                                          | design di gameplay, valori numerici, ADR                            |
| A1      | `docs/hubs/*`, `docs/combat/README.md`, `docs/combat/round-loop.md`, `docs/adr/*`              | Confini architetturali, topology, contratti di workstream, runtime boundary, scope tecnico | freeze se contraddice un boundary tecnico non aggiornato, roadmap operative, note agente | metadata registry, numeri YAML puntuali                             |
| A2      | `data/core/*`, `packs/evo_tactics_pack/data/*`, `packages/contracts/schemas/*`                 | Verita meccanica, numerica, schema, tuning producibile, validazione                        | documenti descrittivi, overview vecchie, Canvas, tabelle non allineate                   | path docs, ownership, topology architetturale                       |
| A3      | `docs/core/90-FINAL-DESIGN-FREEZE.md`                                                          | Sintesi di prodotto, scope shipping, priorita di design, ordine di consolidamento          | roadmap storiche, overview parziali, planning docs, interpretazioni operative locali     | governance docs, ADR/hub, dati/schema senza aggiornamento esplicito |
| A4      | `AGENTS.md`, `.ai/BOOT_PROFILE.md`, `docs/ops/COMMAND_LIBRARY.md`, `CLAUDE.md`                 | Modalita operativa degli agenti, strict-mode, guardrail di modifica, DoD locale            | prompt improvvisati, workflow ad hoc, scorciatoie di esecuzione                          | decisioni di design finale, authority canonica, valori dati         |
| A5      | Canvas, appendici, checklist storiche, action-items storici, deep research storico di supporto | Contesto, intenzione, baseline narrativa, backlog storico, gap analysis                    | solo note locali non versionate                                                          | freeze, ADR, hub, core data, governance                             |

> **Nota sul livello A4**: `CLAUDE.md`, `AGENTS.md` e i file operativi degli agenti governano **come** si lavora, non **cosa** diventa canonico nel design. Un fix di modalita' operativa non e' un argomento di design.

## 4. Regole pratiche di risoluzione conflitti

### 4.1 Conflitto tra freeze e ADR / hub

Vince **ADR / hub canonico** finche non esiste una modifica esplicita dell'ADR o del documento hub.
Il freeze deve essere corretto o aggiornato, non applicato alla cieca.

### 4.2 Conflitto tra freeze e YAML / schema

Vince **core data / schema** per tutto cio che riguarda numeri, mapping, shape dei payload,
validator e truth meccanica. Il freeze va riallineato oppure bisogna aprire una patch dati/contratti.

### 4.3 Conflitto tra planning docs e freeze

Vince **Final Design Freeze**. Le roadmap esistono per eseguire il freeze, non per ridefinirlo.

### 4.4 Conflitto tra file agente e documenti di design

I file operativi (`CLAUDE.md`, `AGENTS.md`, `.ai/BOOT_PROFILE.md`, `COMMAND_LIBRARY`) decidono **come** si lavora,
non **cosa** diventa canonico nel design.

### 4.5 Conflitto tra Canvas storici e documenti 2026

I Canvas valgono come baseline storica ricca. Se un punto e stato riallineato in hub, ADR, core data o freeze,
la versione piu recente e canonica vince.

### 4.6 Provenienza del taxonomy content (Game-Database, RFC #4 -- ratificato 2026-06-11)

Game-Database e' la source-of-truth UPSTREAM del taxonomy content (prima ondata: traits;
seconda ondata: species, RFC #4 "Species S2") che alimenta
`packs/evo_tactics_pack/docs/catalog/*` e i derivati `data/core/traits/*`:
una `TaxonomyVersion` con status `released` (immutabile, versionata, auditata) e' l'origine
canonica del contenuto; i file in questo repo restano la verita' meccanica A2 per il runtime.
Attivazione a fasi (RFC Game-Database `docs/rfc/2026-06-11-bidirectional-sync.md`):

- **Oggi (fase S1)**: flusso import-only invariato -- i file pack di questo repo sono
  l'input e nessun file e' generato dal DB. Questa regola dichiara la direzione ratificata,
  non cambia ancora il flusso.
- **Da S2 (export-on-release)**: i file taxonomy generati arrivano SOLO via branch+PR
  (header `GENERATED FROM Game-Database <tag>`), passano `evo-import-gate` (round-trip
  errori=0) e il merge resta umano (Eduardo). Un edit manuale a un file generato = drift:
  va riportato nel DB, non difeso nel file.
- **Seconda ondata -- species (RFC #4 "Species S2")**: 🔴 **CORRETTO 2026-06-19 (REVERSAL ratificato GG-DB #225)**.
  La superficie export-on-release `<slug>.json` + marker `_generated_from` **NON e' piu' il piano**:
  Game-Database #225 ha rescopato l'export species a **fidelity-shadow ONLY** (il DB MISURA il loss
  vs i file Game, NON scrive per-file shipping; ladder export-on-release CANCELLATA). biome/eco =
  import-only indefinitamente (GG-DB #227). **SoT authoring species INVARIATO = file-side**
  `data/core/species/species_catalog.json` (ADR-2026-05-15) -- il DB non e' diventato upstream.
  S3 DB-as-SoT = SOLO scoping (GG-DB #228, raccomandazione lean keep-files). Reconciliation
  corrente file-side = `docs/planning/2026-06-18-taxonomy-reconciliation-plan.md` (#2827).
- In conflitto sul CONTENUTO taxonomy tra un released snapshot DB e un file pack non
  generato/non aggiornato: vince la released version DB; la correzione passa da un nuovo
  export PR, mai da edit divergenti su entrambi i lati.

## 5. Matrice domanda -> fonte da consultare per prima

| Domanda                                                                   | Prima fonte da leggere                                                            | Seconda fonte                                                   | Terza fonte              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------ |
| Questo file deve esistere? dove va? con che metadata?                     | `docs/governance/docs_registry.json`                                              | `docs/governance/README.md`                                     | `CLAUDE.md`              |
| Il runtime puo dipendere da Game-Database?                                | `docs/adr/ADR-2026-04-14-game-database-topology.md`                               | `docs/hubs/backend.md` / hub rilevante                          | freeze                   |
| Da dove proviene il taxonomy content del pack catalog?                    | sezione 4.6 (Game-Database released version, RFC #4)                              | Game-Database `docs/rfc/2026-06-11-bidirectional-sync.md`       | `data/core/*` (A2)       |
| Quali regole combat sono in scope shipping?                               | `docs/hubs/combat.md`                                                             | `docs/combat/README.md`                                         | freeze                   |
| Qual e il round loop di combat / modello di fase planning-commit-resolve? | `docs/combat/round-loop.md`                                                       | `docs/adr/ADR-2026-04-15-round-based-combat-model.md`           | `docs/hubs/combat.md`    |
| Qual e il contratto TV/device/join/Nido corrente?                         | `docs/planning/2026-06-05-evo-tactics-tv-device-campaign-flow-reconstruction.md`  | `docs/planning/2026-06-06-evo-tactics-kl-operational-matrix.md` | Game/Godot code surfaces |
| Qual e lo stato operativo feature -> path -> gate -> next ticket?         | `docs/planning/2026-06-06-evo-tactics-kl-operational-matrix.md`                   | SPEC-K/SPEC-L e code-surface reconcile                          | BACKLOG / OPEN_DECISIONS |
| Skiv e Custodi sono sistemi separati?                                     | `docs/planning/2026-06-05-evo-tactics-tv-device-campaign-flow-reconstruction.md`  | `docs/core/00F-ART_AUDIO_BUSINESS.md`                           | `docs/skiv/CANONICAL.md` |
| Cos'e' il resolver atomico e quali API espone?                            | `docs/combat/resolver-api.md`                                                     | `services/rules/resolver.py`                                    | `docs/combat/README.md`  |
| Quali numeri o mapping sono veri?                                         | `data/core/*` / `packs/evo_tactics_pack/data/*`                                   | `packages/contracts/schemas/*`                                  | freeze                   |
| Qual e il prodotto che stiamo chiudendo?                                  | freeze                                                                            | `docs/core/01-VISIONE.md` / overview                            | deep research / Canvas   |
| Come deve lavorare Codex/Claude?                                          | `AGENTS.md` / `.ai/BOOT_PROFILE.md` / `docs/ops/COMMAND_LIBRARY.md` / `CLAUDE.md` | playbook Codex                                                  | roadmap                  |
| Una roadmap storica del 2025 e ancora valida?                             | freeze                                                                            | authority map                                                   | file storico stesso      |

## 6. Guardrail per agenti ed esecutori

| Stato | Task                                        | Dettagli operativi                                                                                                              |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ☑     | Non promuovere automaticamente file storici | Canvas, action items e checklist storiche non diventano canonici senza passaggio esplicito nel freeze o nei documenti canonici. |
| ☑     | Non usare il DB come scorciatoia di design  | `Game-Database` non risolve conflitti aperti nel design finale e non diventa runtime authority nel freeze.                      |
| ☑     | Non hardcodare verita dati nei documenti    | Se un numero o mapping vive in YAML/schema, il documento deve puntare a quella fonte.                                           |
| ☑     | Non inventare comandi agente                | Seguire `AGENTS.md`, `.ai/BOOT_PROFILE.md`, `docs/ops/COMMAND_LIBRARY.md` e `CLAUDE.md`.                                        |
| ☑     | Escalare i conflitti veri                   | Se due fonti di pari livello sembrano incompatibili, aprire nota di conflitto invece di scegliere arbitrariamente.              |

## 7. Decisioni immediate di merge

| Stato | Task                                                          | Dettagli operativi                                                      |
| ----- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| ☐     | Pubblicare questo file insieme al freeze                      | Il bundle non va mergiato senza authority map.                          |
| ☐     | Linkare questo file da freeze, roadmap index e playbook Codex | Deve diventare il primo riferimento per risoluzione conflitti.          |
| ☐     | Usarlo in PR description                                      | Chiarire che i planning docs eseguono il freeze e non lo ridefiniscono. |
| ☐     | Aggiornare registry docs nello stesso commit                  | Evita drift tra repo e governance.                                      |

## 8. Formula sintetica da ricordare

**Governance colloca. ADR delimita. YAML prova. Freeze decide il prodotto. Agent docs eseguono. Storico ispira ma non governa.**

## 9. Documenti correlati

- [`90-FINAL-DESIGN-FREEZE`](../core/90-FINAL-DESIGN-FREEZE.md) — sintesi di prodotto A3 che questa authority map regola.
- [`EVO_FINAL_DESIGN_ROADMAPS_INDEX`](EVO_FINAL_DESIGN_ROADMAPS_INDEX.md) — indice del bundle e ordine di lettura.
- [`EVO_FINAL_DESIGN_MASTER_ROADMAP`](EVO_FINAL_DESIGN_MASTER_ROADMAP.md) — piano esecutivo che recepisce le decisioni di authority.
- [`EVO_FINAL_DESIGN_MILESTONES_AND_GATES`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md) — gate formali di avanzamento.
- [`EVO_FINAL_DESIGN_BACKLOG_REGISTER`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md) — task operativi che implementano i gate.
- [`EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK`](EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md) — guida per agenti Codex, deve rispettare questa authority map.
- [`EVO_FINAL_DESIGN_GAME_DATABASE_SYNC`](EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md) — piano cross-repo, applica il confine topology A1.
- [`docs/governance/README`](../governance/README.md) — contratto operativo governance (A0).
