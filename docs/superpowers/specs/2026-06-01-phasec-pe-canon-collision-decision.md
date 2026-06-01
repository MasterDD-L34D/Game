---
title: 'PHASEC PE-canon collision + aberrant combat-resource re-label — decision [no-impl]'
workstream: combat
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: '2026-06-01'
language: it
tags: [phasec, economy, pe, aberrant, sg, resource-canon, decision, no-impl]
---

# PHASEC PE-canon collision + aberrant combat-resource re-label

> **NO-IMPL.** Zero codice, zero data. Decision-doc gated master-dd. Tocca lavoro
> già merged (#2522 / #2524 / #2526) → serve verdict prima di toccarlo.
>
> Origine: durante la risoluzione del residuo `first_kill_pe_bonus` (stalker
> senza PE-sink) ho consultato la SoT economia (vault
> `core/26-ECONOMY_CANONICAL.md`) come richiesto → emersa una collisione di
> risorsa più profonda del residuo.

## 0. TL;DR per master-dd

`PE` nel codice combat PHASEC (#2522 slice-3, #2526) è un **misnomer**. La SoT
economia dice `PE = Punti Esperienza = XP campaign-wide` (5 PE → 1 PI, feeds
evolve trigger). NON è una risorsa combat per-job. Il lavoro PHASEC ha costruito
earn/spend combat sullo **stesso campo `unit.pe`** che il layer forms/evoluzione
usa per gli XP → **collisione latente** (corruzione XP campaign in flow
forms-session).

**Verdict richiesto**: come ri-allineare la risorsa combat dell'aberrante (vedi
§4: A re-label → SG / B namespace separato / C lasciare). Raccomandazione = **A
(SG)**.

## 1. Ground-truth: cos'è PE (vault `core/26-ECONOMY_CANONICAL.md`)

| Token  | Nome             | Scope    | Reset          | Use                           |
| ------ | ---------------- | -------- | -------------- | ----------------------------- |
| **PE** | Punti Esperienza | Campaign | Mai (campaign) | Checkpoint → PI (5 PE = 1 PI) |
| PI     | Pacchetto Invoc. | Campaign | Mai            | PI shop packs/trait/abilities |
| PT     | Punti Tecnica    | Combat   | **Per-round**  | Spinte, condizioni, combo     |
| PP     | Power Pool       | Combat   | Per-encounter  | Ultimate (3 PP consume all)   |
| SG     | Surge Gauge      | Combat   | Per-encounter  | Surge Burst ability           |

**PE = XP campaign** (3/5/8/12 base per tier + VC bonus), converte a PI per la
build progression, feeds `PE_EVOLVE_TRIGGER_THRESHOLD = 8`. Le risorse **combat**
sono **PT / PP / SG**.

## 2. La collisione (evidence su `origin/main` `410cd4fa`)

`unit.pe` è usato da DUE layer sullo stesso campo:

| Layer                         | Uso di `unit.pe`                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| forms/evoluzione (campaign)   | `formEvolution.js:147-150` legge + **scrive** `unit.pe = peAfter` (evolve **deduce** PE); `campaign.js:82,112` `peEarned >= PE_EVOLVE_TRIGGER(8)`                   |
| combat PHASEC (questo lavoro) | `sessionHelpers.js:115` normaliseUnit **preserva** `input.pe`; #2522 earn/spend (`cost_pe`, `first_kill_pe_bonus`), #2526 `applyBaseAbilityResourceEarn` (+1/round) |

**Conseguenza**: un'unità che porta PE-campaign (XP) in una combat forms-session
→ l'earn/spend PHASEC **muta gli XP campaign** (es. `aberrant_overdrive` -5 PE =
-5 XP; base-earn +1/round = false inflation → falso evolve trigger). `normaliseUnit`
preserva `input.pe` → il travaso avviene se il payload `/start` porta `pe>0`.

**Latente** (attivo nel flow forms-session combat, non nel tutorial /start
fresh-units pe=0). Ma è un design-collision reale, non solo cosmetico.

**Radice**: `data/core/jobs_expansion.yaml` (autonomous content sprint 2026-04-25)
ha dato all'aberrante `resource_usage.primary = PE` + `aberrant_overdrive
cost_pe:5`, intendendo una risorsa combat — ma il nome `PE` era già preso dagli
XP campaign.

## 3. Il residuo `first_kill_pe_bonus` (stalker) si dissolve

Era flaggato come "stalker guadagna PE ma non ha PE-sink → risorsa morta". **Con
PE = XP campaign**, NON è morto: `first_kill_pe_bonus` (+1 PE su primo kill) è un
**reward XP universale** (ogni job ne beneficia → PI build currency). Nessun sink
per-job serve. Il "residuo" era un mio misread (assunsi PE = risorsa combat).

→ Se si adotta §4-A, `first_kill_pe_bonus` resta com'è (reward XP), e ciò che
cambia è la risorsa SPEND dell'aberrante (overdrive) + l'earn combat di #2526.

## 4. Opzioni (verdict master-dd)

### A — Re-label risorsa combat aberrante → SG (RACCOMANDATA)

- `aberrant_overdrive cost_pe:5` → `cost_sg` (o `cost_pp`). L'aberrante ha già
  `resource_usage.secondary = SG`; SG è combat per-encounter con sink (Surge
  Burst) → fit canonico.
- #2526 `applyBaseAbilityResourceEarn` (+PE/round) → earn SG (oppure rimuovere:
  SG già si accumula via sgTracker damage-based).
- `unit.pe` torna **XP puro** (nessuna mutazione combat). `first_kill_pe_bonus`
  resta reward XP.
- **Effort**: M (re-label data + ri-puntare slice-3 gate/deduct su SG + test).
  **Blast su merged**: rivisita #2522 (PE pool/gate/deduct) + #2526 (base earn) →
  ri-targettati su SG. `normaliseUnit.pe` resta (XP), si rimuove l'earn/spend
  combat su di esso.
- **Pro**: canon-aligned, zero collisione, sink esiste. **Contro**: tocca 3 PR
  merged (re-label).

### B — Namespace combat-PE separato (`unit._combat_pe`)

- Tenere il combat-PE ma su un campo distinto da `unit.pe` (XP). Earn/spend
  PHASEC → `_combat_pe`; `unit.pe` resta XP.
- **Effort**: S (rinomina campo nel codice PHASEC). **Blast**: minore (no
  re-target su SG, solo rename `pe`→`_combat_pe` nelle 3 PR).
- **Pro**: minimo cambio, collisione chiusa. **Contro**: **due "PE"** (combat vs
  campaign) — confusione semantica permanente + diverge dalla SoT (che non prevede
  un combat-PE).

### C — Lasciare (accettare la collisione)

- Accettare che combat-PE e campaign-PE condividano `unit.pe`, documentando che
  il flow forms-session combat è fuori scope / le unità combat sono fresh.
- **Effort**: 0. **Blast**: 0. **Pro**: nessun rework. **Contro**: bug latente +
  misnomer permanente vs SoT economia. Sconsigliata.

## 5. Sequencing — Cat F sub-system prima dell'ultimo fork?

**Risposta: meglio Cat F prima dell'ultimo fork — MA fixare prima la risorsa
(§4).** Ordine raccomandato:

1. **PE-canon fix (§4)** — foundational. Cat F aggiunge altri tag aberrant
   (`mutation_status_extend`, `sg_on_mutation_burst` già live, ecc.) sulla stessa
   base-risorsa → non compoundare il misnomer prima di chiuderlo.
2. **Cat F sub-system** (random-roll + cooldown) → sblocca i 4 tag rimanenti,
   completa l'aberrante **7/7**: 1 job coeso, effort medio, **no nuovo unit type,
   basso rischio**.
3. **Symbiont fork** (OQ-BOND).
4. **Minion fork** ULTIMO — peggior ROI (8 tag / ~5 sess) + tocca co-op (rischio
   regressione P5) → deferred/post-MVP candidate.

**Perché Cat-F-prima-del-fork = meglio**: chiudi un job pulito (aberrante 7/7)
prima di aprire un fork pesante; il minion (il più costoso + rischioso) resta
ultimo. Caveat: il random-roll di Cat F è esso stesso un sub-sistema (effort) —
se vincolati a budget, i 3 Cat F event-pure (già fatti) + decisione-fork possono
bastare per una vertical slice aberrante minima.

## 6. Open questions (master-dd)

- **OQ-RES**: §4 → A (SG) / B (namespace) / C (lasciare)? [racc. A]
- **OQ-MIGRATE**: se A/B, migrare il combat-PE già merged (#2522/#2526) nello
  stesso PR del re-label, o follow-up?
- **OQ-SEQ**: confermi sequencing §5 (PE-fix → Cat F → symbiont → minion-deferred)?

## 7. Cosa questo doc NON fa

- NON tocca codice/data/merged PR. NON decide §4/§5 (gated). NON conferma se il
  flow forms-session combat è attivo in produzione (la collisione è dimostrata
  possibile via `normaliseUnit` preserve + `formEvolution` write; l'attivazione
  runtime = da verificare nello slice di fix).
