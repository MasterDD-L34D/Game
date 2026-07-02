---
title: 'Integrated design map 2026-04-20 — Freeze × SoT × audit × concept exploration'
workstream: planning
category: synthesis
status: draft
owner: master-dd
created: 2026-04-20
authority_level: A3
tags:
  - synthesis
  - lacune
  - claude-code-handoff
related:
  - docs/core/90-FINAL-DESIGN-FREEZE.md
  - docs/core/00-SOURCE-OF-TRUTH.md
  - docs/planning/2026-04-20-pilastri-reality-audit.md
  - docs/planning/2026-04-20-design-audit-consolidated.md
  - docs/planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md
  - docs/archive/concept-explorations/2026-04/README.md
---

# Integrated design map — Freeze × SoT × audit × concept exploration

> **Scopo.** Questo documento **non è canonico**. È una **mappa di lettura** che tiene insieme quattro fonti che oggi vivono in punti diversi del repo o del workflow, per identificare lacune residue e guidare i prossimi passi con Claude Code.
>
> **Autorità.** Livello A3 come il Freeze, subordinato a `EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`. In caso di conflitto vince sempre il SoT, poi l'ADR rilevante, poi il Freeze.

## TL;DR

1. Freeze v0.9, SoT v5 e audit 20 aprile sono **coerenti come direzione** ma hanno 11 lacune residue concrete.
2. 5 lacune sono **P0 blocking** per M9 (persistence P2, Pilastro 6 canonico, narrative arc, PT semantica, scala Affinity/Trust).
3. Il lavoro fuori repo (deck v2 + 4 HTML vertical-slice) tocca 3 punti specifici del P2 e 1 punto del P0 narrativo. Gli altri mock sono exploration pura, archiviabili.
4. Prossimo passo operativo: **4 prompt Claude Code in sezione 5**, da eseguire in ordine di dipendenza.

---

## 1. Le tre fonti, in una pagina

### 1.1 Final Design Freeze v0.9 (A3, `docs/core/90-FINAL-DESIGN-FREEZE.md`)

**Cosa è**: sintesi di prodotto. Dichiara lo scope shipping, i sistemi core congelati, le regole di tuning, le dipendenze tra repo.

**Cosa contiene che le altre fonti non contengono**:

- Tesi di design in 5 punti (§1).
- 5 Blocchi esecutivi mappati su milestone M1–M6 (§26).
- Vincolo architetturale non negoziabile Game vs Game-Database (§5).
- Definizione operativa di "design finale" in 7 condizioni (§28).

**Cosa NON contiene** (e che ti aspetteresti):

- Nessuna menzione del Pilastro 6 Fairness. Parla di "bilanciamento" ma non lo eleva a Pilastro.
- Nessun trattamento del Campaign structure (§6 loop parla di scelta/brief, non di progressione campagna).
- Pressure tier count non standardizzato (dice "hazard baseline ed escalation" ma non 5 tier).

**Authority relativa**: A3. **Non sostituisce** governance (A0), ADR (A1), core data/schema (A2).

### 1.2 Source of Truth v5 (sintesi, `docs/core/00-SOURCE-OF-TRUTH.md`)

**Cosa è**: lettura unificata del progetto. Ricostruita dal repo, non spec tecnica.

**Cosa contiene che il Freeze non contiene**:

- §2 "Come iniziava davvero una prima partita" — flow completo con `enc_tutorial_01`.
- §3 "Come veniva generato il mondo" — bioma → ecosistema → foodweb → network → eventi cross-bioma.
- §13 "Stato implementativo" — mappa design → codice con stati 🟢/🟡/🔴 per ogni sistema.
- §14–§18 deep dive su Grid, Level Design, Networking, Screen Flow, Audience.
- §20–§23 Tri-Sorgente, A.L.I.E.N.A., companion detail (ereditati da `evo_tactics_game_vision_reconstructed`).

**Cosa è stale dopo gli ADR di aprile**:

- §13.2 dice "Python rules engine canonical" → **ADR-2026-04-19 ha deprecato**. SoT stale.
- §14.1 dice "decisione grid aperta" → **ADR-2026-04-16 ha chiuso su hex axial**. SoT stale.
- §16.2 dice "Colyseus proposto" → ancora valido ma non più "proposto", mai adottato.

**Authority relativa**: sintesi (non listata in Source Authority Map come livello numerato). Vale come lettura guidata. In conflitto perde contro A0/A1/A2.

### 1.3 Audit 20 aprile (2 file in `docs/planning/`)

**`2026-04-20-pilastri-reality-audit.md`**: scopre che CLAUDE.md dichiarava 6/6 🟢 ma reality è **1/6 🟢 + 5/6 🟡** (dopo deep audit). Root cause: confusione dataset-shipped vs runtime-shipped.

**`2026-04-20-design-audit-consolidated.md`**: 4-agent audit. Scopre:

- 13/33 core docs sono stub <50 LOC (39%)
- P6 Fairness mentioned ma **non definito in canonical** — `02-PILASTRI.md` lista solo 5
- 10 contraddizioni cross-doc (PT semantica, Grid decision, Python engine, MoS cap, Pressure tier count, ...)
- 75 open design questions, di cui 8 BLOCKING P0
- 4 deep topic gap (Campaign ZERO, Economy medium, Biome ecosystem large, Reclutamento/Nido in-memory only)

**Cosa c'è di nuovo rispetto a Freeze + SoT**:

- Numeri onesti. Il Freeze dice "`active_effects` NOOP" (§25). L'audit dice **quali runtime ci sono e quali no**, endpoint per endpoint.
- Identifica il "dataset ≠ runtime ≠ network" come pattern ricorrente di status inflation.
- Traccia le 5 ADR recenti **non propagate** ai core docs.

**Authority relativa**: A3 come il Freeze, ma più recente (20 aprile vs 15 aprile).

---

## 2. Matrice 6 Pilastri × stato runtime × stato doc

Questa tabella sostituisce la confusione delle tre fonti con una riga per Pilastro.

| #   | Pilastro                        | Fonte canonica                                                     | Runtime (post audit)       | Doc coverage | Lacuna primaria                                                         |
| --- | ------------------------------- | ------------------------------------------------------------------ | -------------------------- | ------------ | ----------------------------------------------------------------------- |
| P1  | Tattica leggibile (FFT)         | 02-PILASTRI, 10-SISTEMA_TATTICO, 11-REGOLE_D20_TV                  | 🟢                         | 🟢           | Solo rifiniture (threat overlay, timer soft)                            |
| P2  | Evoluzione emergente (Spore)    | 05-EVOLUZIONE?? + 22-FORME_BASE_16 (stub 16L) + PI-Pacchetti-Forme | 🟡 (era 🔴 pre-deep-audit) | 🟡           | Persistence + PI pack spender runtime                                   |
| P3  | Identità Specie × Job           | 20-SPECIE_E_PARTI (stub) + PI-Pacchetti-Forme + job system diffuso | 🟡                         | 🟡           | Level curves non applicate, no character progression                    |
| P4  | Temperamenti MBTI/Ennea         | 24-TELEMETRIA_VC (stub) + Telemetria-VC                            | 🟡                         | 🟡           | Solo 2/4 assi MBTI, 6/9 Ennea, 4/16 Forms reachable                     |
| P5  | Co-op vs Sistema (TV condivisa) | 30-UI_TV_IDENTITA (stub) + 17-SCREEN_FLOW + DesignDoc-Overview     | 🟡                         | 🟡           | Network multi-client = ZERO. Modulation 8p è config local.              |
| P6  | Fairness                        | **Non in `02-PILASTRI.md`** ma citato in CLAUDE.md + ADR recenti   | 🟡                         | 🔴           | **P6 non è nemmeno un Pilastro canonico**. Hardcore deadlock 0% defeat. |

**Osservazione chiave**: P6 è il Pilastro più "fragile documentalmente". Citato ovunque, definito da nessuna parte canonica.

---

## 3. Lacune residue — 11 gap concreti

Classificate P0/P1/P2 per priorità. P0 = blocca M9 real work. P1 = blocca M10–M11. P2 = tecnica ma non urgente.

### P0 — Blocking (5)

| ID  | Lacuna                                                                  | Fonte che la rivela                                     | Owner suggerito                       | Effort stimato                               |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| L01 | **Pilastro 6 non definito canonicamente**                               | Audit consolidato §1                                    | Master DD + doc sync                  | 30 min (ADR o patch a `02-PILASTRI.md`)      |
| L02 | **Scala Affinity/Trust ambigua** (±3 vs ±2/0..5)                        | Audit consolidato §2 conflict #10                       | Master DD (design decision)           | 15 min decision + 1h propagazione            |
| L03 | **PT semantica doppia** (token da crit vs budget 3/turno)               | Audit consolidato §2 conflict #1                        | Master DD (design decision)           | 15 min decision + 2h propagazione doc + code |
| L04 | **Campaign structure ZERO** (doc + impl)                                | Audit consolidato Topic 1                               | Master DD (spec) + Claude Code (impl) | 12-16h spec + 30-40h impl                    |
| L05 | **Narrative arc framework ZERO** (debrief beat emotivo, onboarding 60s) | Audit consolidato §1 gap #2, concept-exploration nota 3 | Master DD                             | 4-8h design doc                              |

### P1 — M10/M11 (4)

| ID  | Lacuna                                                                                              | Fonte                       | Owner                             | Effort             |
| --- | --------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------- | ------------------ |
| L06 | **P2 persistence + PI pack spender runtime**                                                        | Pilastri reality audit      | Claude Code                       | 20-30h             |
| L07 | **Network multi-client (TV co-op reale)**                                                           | Pilastri reality audit P5   | Claude Code + ADR dedicata        | 20-30h             |
| L08 | **Biome runtime gap Node** (`terrain_defense`/movement_profiles/cover/LoS solo in Python deprecato) | Audit consolidato Topic 3   | Claude Code                       | ~50h               |
| L09 | **Save/Load co-op sync protocol**                                                                   | Audit consolidato §1 gap #5 | Master DD spec + Claude Code impl | 4h spec + 15h impl |

### P2 — Tecnico ma non blocking (2)

| ID  | Lacuna                                                                                                            | Fonte                | Owner                                 | Effort     |
| --- | ----------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------- | ---------- |
| L10 | **5 ADR non propagate ai core docs** (hex axial, coop-scaling, kill-python, resistance convention, damage curves) | Audit consolidato §2 | doc sync batch                        | ~4h totale |
| L11 | **13 core docs stub <50 LOC** (incluso `22-FORME_BASE_16.md` che punta a `forms.yaml` inesistente)                | Audit consolidato §1 | Master DD prioritizza quali espandere | variabile  |

---

## 4. Come il lavoro fuori repo si aggancia

Il deck v2 + 4 HTML vertical-slice + screenshots NON vanno in `docs/core/` o `docs/planning/`. Vanno in **`docs/archive/concept-explorations/2026-04/`** con il README già preparato. Tre di queste esplorazioni hanno contenuto **operativo** che tocca le lacune sopra.

| Exploration                                     | Tocca lacuna                                | Azione                                                                                                     |
| ----------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Nota 1 deck v2 — **BiomeMemory**                | L06 (P2 PI pack), L08 (Biome runtime)       | Issue di triage: parcheggia o integra in PI pack v2                                                        |
| Nota 2 deck v2 — **Costo ambientale del trait** | L06 (P2), L08 (Biome)                       | Issue di triage: pilot su 4 trait × 3 biomi shipping, poi generalizza                                      |
| Nota 3 deck v2 — **Onboarding narrativo 60s**   | **L05 (P0 narrative arc)**                  | Issue di triage: design doc primi 60s come spec P0                                                         |
| `Vertical Slice - Minute 2 Combat.html`         | L06 (P2 runtime) + Q22 form shift threshold | Usare come **UX reference** quando Claude Code implementa PI pack spender (evoluzione visibile mid-combat) |
| `Vertical Slice - Minute 3 Consequence.html`    | L05 (narrative arc)                         | Usare come **UX reference** per design doc debrief emotivo post-encounter                                  |
| `Vertical Slice - Minute 0 Onboarding.html`     | L05 + L04 (campagna)                        | Usare come **UX reference** minute-0 primo contatto giocatore                                              |
| `Vertical Slice - 60s Onboarding.html`          | L05 (narrative arc onboarding)              | Usare come **UX reference** onboarding compresso 60s                                                       |
| `Vertical Slice - Risveglio del Leviatano.html` | L04 boss climax + L08 biome runtime         | Exploration pura boss fight climactic. Archivia. Non P0/P1.                                                |

---

## 5. Piano per Claude Code — 4 prompt in ordine

Da eseguire **in questo ordine**. Ogni prompt assume che i precedenti siano stati mergiati.

### Prompt 1 — Doc sync batch (no design intent needed)

```
Leggi:
- docs/planning/2026-04-20-integrated-design-map.md
- docs/planning/2026-04-20-design-audit-consolidated.md (§6 Fix "no design intent needed")

Esegui i 9 action items in §6 dell'audit consolidato:
1. 00-SOURCE-OF-TRUTH.md §14.1 → rimuovi "decisione aperta", cita ADR-2026-04-16 hex axial
2. 00-SOURCE-OF-TRUTH.md §13.2 → marca Python rules engine deprecato, cita ADR-2026-04-19
3. 90-FINAL-DESIGN-FREEZE.md §7.3 → marca Python resolver deprecato
4. 15-LEVEL_DESIGN.md §2 → aggiorna grid 8/12/16 → 6/8/10 hex axial
5. 02-PILASTRI.md → aggiungi P6 Fairness definizione canonical (vedi integrated-design-map L01)
6. 00E-NAMING_STYLEGUIDE.md → estendi con encounter/missione/status EN-IT mapping
7. Cross-ref ADR-2026-04-20 damage curves da 15-LEVEL_DESIGN
8. Guida_Evo_Tactics_Pack_v2.md → risolvi T1-T5 vs T1-T6 intra-file
9. 10-SISTEMA_TATTICO.md → propaga MoS cap=6 dal SoT

Non decidere design intent. Solo propagazione. Commit atomico per ogni file.
Output: 9 commit + diff sommario.
```

### Prompt 2 — Playtest next step (M3 human, già citato)

```
Leggi docs/playtests/README.md e le note dei playtest
2026-04-17 / 2026-04-17-02 / 2026-04-17-03.

Le note citano un "M3 human playtest su T04/T05" come next step.
Le FRICTION #1-#3 sono chiuse (PR #1491). Restano aperte #4, #6, #7.

Dammi un micro-piano di setup per il prossimo playtest:
- Quali specie / bioma / job configurare
- Quali FRICTION aperte tentare di riprodurre o escludere
- Cosa mettere in setup.md prima di giocare
- Quali metriche raccogliere in notes.md dopo

Non scrivere codice. Solo piano di playtest.
```

### Prompt 3 — Triage exploration-note vs P2

```
Leggi:
- docs/planning/2026-04-20-integrated-design-map.md §4
- docs/archive/concept-explorations/2026-04/README.md §"Le 3 exploration-note"
- docs/planning/2026-04-20-pilastri-reality-audit.md §P2

Valuta ognuna delle 3 note contro P2 (Evoluzione emergente 🟡):
1. BiomeMemory
2. Costo ambientale del trait
3. Onboarding narrativo 60s

Per ognuna:
- Quale lacuna concreta chiude (L01-L11)
- Rischio di scope creep (Freeze §19.3 "stessa valuta non deve fare troppe cose")
- Raccomandazione: (a) issue P0 adesso, (b) issue P2 parcheggiata, (c) fuori perimetro Freeze
- Se issue, quale core doc toccare e quale ADR scrivere

Non scrivere codice. Dammi 3 issue draft in markdown.
```

### Prompt 4 — P0 persistence (solo dopo aver chiuso L02+L03 con Master DD)

```
PREREQUISITO: Master DD ha chiuso L02 (Affinity/Trust scale) e L03 (PT semantica)
via patch a 00-SOURCE-OF-TRUTH.md o ADR dedicata.

Leggi:
- docs/planning/2026-04-20-integrated-design-map.md §3 L06
- apps/backend/services/metaProgression.js (195 LOC in-memory)
- apps/backend/routes/meta.js (6 endpoint recruit/mating/nest/affinity/trust)
- docs/archive/concept-explorations/2026-04/Vertical Slice - Minute 2 Combat.html
  (solo come UX reference per evoluzione visibile mid-combat, non come spec)

Task: progetta la persistence Prisma per metaProgression.
- Schema: SquadMember, AffinityLog, TrustLog, NestState, MatingEvent
- Migrazione da in-memory a Prisma-backed senza rompere i 6 endpoint esistenti
- Test contract cover

Output: schema Prisma + migration plan + diff routes/meta.js.
Non implementare PI pack spender runtime — quello è task successivo.
```

---

## 6. Cosa questo documento NON fa

- **Non ridefinisce il Freeze.** Il Freeze v0.9 resta la sintesi di prodotto.
- **Non risolve design questions.** Le 75 open questions dell'audit restano aperte tranne quelle esplicitamente triaged come L01-L11.
- **Non promuove le vertical-slice HTML a spec.** Restano concept-exploration in `docs/archive/`.
- **Non sostituisce la Source Authority Map.** In conflitto, vince sempre la mappa delle autorità.

## 7. Autori

- Master DD (direzione, pushback "overoptimistic", concept-exploration)
- Claude (sintesi documentale, audit integration, piano Claude Code)
