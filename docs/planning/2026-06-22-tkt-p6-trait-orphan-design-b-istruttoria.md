---
title: 'Istruttoria TKT-P6-TRAIT-ORPHAN-DESIGN-B -- B-defer orphan traits decision brief'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [trait, orphan, design-call, istruttoria, backlog, master-dd-gated]
---

# Istruttoria -- TKT-P6-TRAIT-ORPHAN-DESIGN-B (B-defer orphan traits)

> **NATURA**: istruttoria (research/prep). NON una decisione di design/balance.
> Tutte le "RACCOMANDAZIONI" sotto sono advisory analyst-side
> (WARN Claude autonomous -- pending master-dd review). La design-call su trait/
> balance resta master-dd (CLAUDE.md). Questo doc presenta opzioni + evidenza.

## TL;DR (il punto piu' importante)

L'audit-fonte ha **43 giorni** (2026-05-10). Verificato git/codice ground-truth
oggi (anti-pattern #19: marker = ipotesi, git = verita'): **la maggior parte delle
"design-call" e' gia' decaduta** perche' SPRINT_020 + la status-engine extension
(PR #1811/#1822) + gli evaluator-gate (`requires_target_status`/`requires_target_tag`)
sono atterrati DOPO l'audit.

Riscoping del ticket dopo ground-truth (11 trait enumerabili, non 14 -- vedi sez. 2):

| Bucket post-verifica                                                                                                        | N     | Cosa serve davvero                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| **Design/balance call GENUINA (master-dd)**                                                                                 | **3** | `antenne_wideband`, `mente_lucida`, `cervello_predittivo`                                               |
| **Blocco risolto -> ora A-class** (status/evaluator wired; serve solo assegnare a specie, scelta content-direction leggera) | **7** | cluster magnetico (3) + `aura_glaciale` + `tela_appiccicosa` + `marchio_predatorio` + `biochip_memoria` |
| **BUG-FIX, non design-call**                                                                                                | **1** | `sussurro_psichico` (status key mismatch `disoriented` vs runtime `disorient`)                          |

Il ticket "14 B-defer design-call" e' effettivamente **3 design-call + 1 bug-fix + 7
assegnazioni sbloccate**. Decisione richiesta a master-dd molto piu' piccola del previsto.

## 1. Provenienza ticket + cosa significa "B-defer"

- **Fonte audit**: [`docs/research/2026-05-10-trait-orphan-audit-batch-review.md`](../research/2026-05-10-trait-orphan-audit-batch-review.md)
  (balance-auditor, Sonnet 4.6). Scope: trait core-wave in `data/core/traits/active_effects.yaml`
  con ZERO assegnazione a specie E senza valori in `trait_mechanics.yaml`.
- **Ticket** (BACKLOG.md riga ~593): `TKT-P6-TRAIT-ORPHAN-DESIGN-B (~2h)` = "14 B-defer
  traits design call".
- **Ticket correlato** (BACKLOG.md riga ~599): `TKT-P6-TRAIT-MECHANICS-SYNC (~1h)` = aggiungi
  subset trait A-class a `trait_mechanics.yaml` (famiglie wave 1-3 senza balance values). Vedi sez. 6.
- **Re-flag**: [`docs/reports/2026-06-22-drift-audit.md`](../reports/2026-06-22-drift-audit.md) riga ~65
  classifica entrambi come `DORMANT_TICKET` (~43gg, "design-gated master-dd" / "pre-balance-gated").

**Tassonomia dell'audit** (3 verdetti per orphan):

- **A (keep / content backlog)**: trait pulito, schema-compliant, riusabile -- serve solo
  assegnarlo a una specie in una futura wave. NESSUNA design-call.
- **B (defer / design-call)**: trait con problema di implementazione o naming che richiede
  una breve decisione di design PRIMA dell'assegnazione.
- **C (delete)**: rotto/non-canonico/duplicato -- da rimuovere.

"B-defer" = "non assegnare finche' master-dd non risolve la domanda di design X".

## 2. Riconciliazione del conteggio (il "14" non e' enumerabile)

L'audit-fonte ha **incoerenze interne di conteggio**:

- Sez. 4 "B -- Defer": _"B total (non-ancestor): **12**"_ (riga 314).
- Tabella "Revised totals" (riga 349): _"B defer **14**"_ (= 109 - 91 A - 4 C, per sottrazione).
- Righe di tabella effettivamente marcate verdetto `B` ed enumerabili: **11** (dopo le 2
  riclassificazioni a A: `aura_scudo_radianza` B->A, `antenne_flusso_mareale` -> A).
- Variante "+22 ancestor tag-gated" -> 34 (gli ancestor\_\* NON sono nei 109 orphan core).

**Set canonico actionable usato in questa istruttoria = 11 trait enumerabili** (sotto). Il
"14" del ticket e' un artefatto aritmetico della fonte, non una lista. _Questa fuzziness e'
essa stessa un finding: lo scope del ticket andava ridefinito a prescindere._

I 2 trait gia' riclassificati a A dall'audit (fuori scope B, confermati puliti oggi):

- `aura_scudo_radianza` (T2, `damage_reduction` -2, pulito) -- A-class.
- `antenne_flusso_mareale` (T2, `extra_damage` +2, MoS>=5) -- A-class; **ora ha pure mechanics**
  in `trait_mechanics.yaml:683`.

## 3. Metodo + fonti verificate (ground-truth 2026-06-22)

Worktree isolato off `origin/main` (`2f6e8f05`). Cross-check stile `/trait-lint` + validator.

| Fonte                                                      | Verificato                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `data/core/traits/active_effects.yaml`                     | tutti gli 11 trait PRESENTI (sotto `traits:`)                                                                                              |
| `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` | nessuno degli 11 presente (solo `antenne_flusso_mareale`, gia' A)                                                                          |
| `data/core/traits/glossary.json`                           | tutti gli 11 hanno label (nessun "missing glossary")                                                                                       |
| `data/core/species/species_catalog.json` (`trait_refs`)    | **0 ref** per tutti gli 11 -> orphan-by-species CONFERMATO (true negative: meccanismo `trait_refs` validato vs `sensori_geomagnetici:215`) |
| `data/core/traits/biome_pools.json` (PCG)                  | 3 degli 11 PRESENTI: `aura_glaciale:43`, `antenne_wideband:47,80`, `tela_appiccicosa:519`                                                  |
| `apps/backend/services/combat/statusModifiers.js`          | consuma 7 status: `linked/fed/healing/attuned/sensed/telepatic_link/frenzy`                                                                |
| `apps/backend/routes/session.js` + `sessionHelpers.js`     | consuma `chilled/slowed/marked/disorient/panic/stunned`                                                                                    |
| `apps/backend/services/traitEffects.js:320-329`            | implementa `requires_ally_adjacent`, `requires_target_status`, `requires_target_tag`                                                       |
| `scripts/trait_audit.py`                                   | run clean (0 inconsistenze schema/catalog sugli 11; side-effect `reports/schema_validation.json` ripristinato)                             |

## 4. Tabella per-trait (definizione corrente + verdetto audit vs ground-truth)

| #   | trait_id                  | def corrente (tier / effetto / status)                                                                      | audit 2026-05-10 (failure mode B)                              | GROUND-TRUTH 2026-06-22                                                                                                                                           | failure mode ORA                                                                      |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | `magnetic_sensitivity`    | T1 / apply_status self / `sensed` 1t                                                                        | stub no-op, `sensed` runtime-inert                             | `sensed` -> +1 attack_mod (statusModifiers.js:198) **WIRED**                                                                                                      | RISOLTO -> orphan-by-species                                                          |
| 2   | `rift_attunement`         | T2 / apply_status self / `attuned` 2t, MoS>=8                                                               | stub no-op, `attuned` inert                                    | `attuned` -> +1 defense_mod (statusModifiers.js:212) **WIRED**                                                                                                    | RISOLTO -> orphan-by-species                                                          |
| 3   | `magnetic_rift_resonance` | T2 / apply_status self / `telepatic_link` 5t, on_kill MoS>=5; requires_traits [1,2]; biome atollo_obsidiana | status `telepatic_link` non-canonico/inert; propagazione TBD   | `telepatic_link` -> guida `telepathicReveal.js` (foresight intent nemici) **WIRED**                                                                               | RISOLTO (residuo minore: requires_traits non enforced runtime; ally-propagation TODO) |
| 4   | `aura_glaciale`           | T1 / apply_status target / `chilled` 2t                                                                     | "quale status? stunned/fracture?"                              | `chilled` -> -1 AP (sessionHelpers.js:850) + -1 atk (session.js:568) **WIRED**; in PCG pool:43                                                                    | RISOLTO -> orphan-by-species (o PCG-reachable)                                        |
| 5   | `tela_appiccicosa`        | T1 / apply_status target / `slowed` 3t                                                                      | "fracture o custom?"                                           | `slowed` -> -1 AP (sessionHelpers.js:851) **WIRED**; in PCG pool:519                                                                                              | RISOLTO -> orphan-by-species (o PCG-reachable)                                        |
| 6   | `marchio_predatorio`      | T1 / apply_status target / `marked` 2t                                                                      | "marked o bleeding proxy?"                                     | `marked` -> +1 dmg prossimo attaccante, consumato (session.js:726) **WIRED**                                                                                      | RISOLTO -> orphan-by-species                                                          |
| 7   | `biochip_memoria`         | T2 / extra_damage +1; trigger `requires_target_status: bleeding`                                            | evaluator NON implementa il check -> fire incondizionato       | `requires_target_status` IMPLEMENTATO (traitEffects.js:323) **WIRED**                                                                                             | RISOLTO -> orphan-by-species (dipendenza combo: serve fonte bleeding)                 |
| 8   | `sussurro_psichico`       | T1 / apply_status target / `disoriented` 1t, MoS>=5                                                         | "panic o stunned?"                                             | applica `disoriented` MA runtime legge SOLO `disorient` (session.js:576, :122 cap, policy.js:263, roundOrchestrator.js:271). Long-form `disoriented` = 0 consumer | **BUG (key mismatch)** -> inert finche' non si allinea la key                         |
| 9   | `antenne_wideband`        | T1 / extra_damage +1; trigger NO min_mos (ogni hit)                                                         | fires ogni hit, near-dup di `antenne_dustsense` (T1 MoS>=5 +1) | confermato: strict-upgrade di dustsense (nessuna soglia); in PCG pool come preferred_traits tier-3 (:80)                                                          | DESIGN-CALL genuina (dedup/differenzia/delete)                                        |
| 10  | `mente_lucida`            | T2 / apply_status target / `panic` 2t, MoS>=3                                                               | panic 2t a MoS>=3 = molto forte a T2, near-dominant            | confermato invariato; `panic` live (slow_down + action_speed -2/intensity)                                                                                        | DESIGN/BALANCE-CALL genuina (soglia/durata)                                           |
| 11  | `cervello_predittivo`     | T3 / apply_status target / `stunned` 2t, MoS>=6                                                             | stun 2t high-value ma nessuno slot specie T3                   | confermato invariato; `stunned` live                                                                                                                              | DESIGN-CALL genuina (tier-slot / magnitude)                                           |

## 5. Disposizioni per gruppo (opzioni + trade-off + blast-radius + RACCOMANDATO advisory)

Legenda opzioni: **(a)** assegna a >=1 specie -- **(b)** implementa mechanics/effetto mancante --
**(c)** retire/delete -- **(d)** keep deferred.

### Gruppo 1 -- blocco di design RISOLTO dopo l'audit (7 trait)

Lo status/evaluator e' ora wired: il "design-call" originale (quale status / implementa il
check) E' DECADUTO. Restano orphan SOLO per assegnazione-a-specie. La scelta residua e'
**content-direction leggera** (assegnare ora vs tenere parcheggiati), non una balance-call.

- **`magnetic_sensitivity` (1), `rift_attunement` (2), `magnetic_rift_resonance` (3)** -- cluster magnetico.
  - Opzioni: (a) assegnare come BUNDLE a 1 specie apex di `atollo_obsidiana` (3 = capstone, 1+2 = prereq narrativi); (d) tenere parcheggiato come lore-marker.
  - Trade-off: (a) sblocca un kit tematico completo (self-accuracy + self-defense + foresight reveal); blast-radius basso (additive, 0 ref esterne). Caveat verify-first: `requires_traits` NON e' enforced a runtime (disciplina di authoring: la specie deve avere anche 1+2); verificare che `atollo_obsidiana` sia bioma canonico (`data/core/biomes.yaml`); ally-propagation del reveal = enhancement opzionale, non blocco.
  - **RACCOMANDATO (advisory)**: (a) bundle-assign a 1 specie atollo_obsidiana, OPPURE (d) se master-dd vuole gate il cluster a un futuro contenuto atollo. Non e' piu' un design-call sullo status.
- **`aura_glaciale` (4), `tela_appiccicosa` (5)** -- gia' nei PCG biome_pools (PCG li puo' gia' rollare).
  - Opzioni: (a) assegnare anche a specie hand-authored; (d) accettare reachable-solo-via-PCG.
  - **RACCOMANDATO (advisory)**: (d-soft) gia' raggiungibili via PCG; (a) opzionale se serve presenza in roster fisso.
- **`marchio_predatorio` (6)** -- `marked` = combo team-play (+1 dmg focus-fire); non in PCG pool, non in specie.
  - Opzioni: (a) assegnare a una specie pack/predator (sinergia focus-fire); (d) keep.
  - **RACCOMANDATO (advisory)**: (a) ottimo content per una specie da branco.
- **`biochip_memoria` (7)** -- conditional combo (richiede target con `bleeding`).
  - Opzioni: (a) assegnare a una specie che ha ANCHE un applicatore di `bleeding` (o team-comp che lo garantisce); (d) keep.
  - **RACCOMANDATO (advisory)**: (a) con consapevolezza della dipendenza-combo (altrimenti spesso no-op per design).

### Gruppo 2 -- BUG-FIX, non design-call (1 trait)

- **`sussurro_psichico` (8)** -- applica status `disoriented` ma TUTTO il runtime consuma la key
  canonica `disorient` (session.js:573 lo dichiara esplicito "canonical key, parity PART C
  2026-06-07"; c'e' pure `tests/services/combat/onHitStatusDisorientParity.test.js`). Il
  long-form non ha consumer -> il trait e' inert nonostante "sembri" wired. Mai emerso perche'
  e' orphan (mai esercitato).
  - Opzioni: **(b)** fix key `disoriented` -> `disorient` in active_effects.yaml (~1 riga), poi diventa A-class (assegna); (c) delete se non desiderato.
  - **RACCOMANDATO (advisory)**: (b) correzione di correttezza, NON una design-call. NB: e'
    in `data/core/traits/` (forbidden-path per QUESTA istruttoria read-only) -> eseguire in una PR follow-up separata.

### Gruppo 3 -- DESIGN/BALANCE-CALL genuina (3 trait, master-dd)

- **`antenne_wideband` (9)** -- T1, nessun min_mos, +1 ogni hit = **strict upgrade** di
  `antenne_dustsense` (T1, MoS>=5, +1). In PCG pool come preferred_traits tier-3 (`biome_pools.json:80`).
  - Opzioni: (a) **differenziare** (es. wideband = bonus ranged/scan vs dustsense melee, o alzare min_mos); (c) **delete** (ma blast-radius: va rimosso ANCHE da `biome_pools.json` x2, altrimenti pool-ref orfana); (d) keep (accettare due sensori low-bar quasi identici).
  - **RACCOMANDATO (advisory)**: (a) differenziare se si vuole coesistenza; altrimenti (c) delete + pulizia biome_pools. Domanda di design originale, balance-call master-dd.
- **`mente_lucida` (10)** -- T2, `panic` 2t a MoS>=3. `panic` e' forte (action_speed -2/intensity in
  roundOrchestrator + AI-avoid). Soglia bassa a T2 = near-dominant tra i peer status-applier T2.
  - Opzioni: (a) alzare MoS>=5; (b) ridurre a panic 1t; (c) keep; (d) spostare tier.
  - **RACCOMANDATO (advisory)**: alzare soglia a MoS>=5 OPPURE panic 1t per allineare ai peer T2.
    Balance-call master-dd; un N=40 sim potrebbe quantificare (WR delta).
- **`cervello_predittivo` (11)** -- T3, `stunned` 2t a MoS>=6. Stun 2t = salta 2 turni, molto forte;
  slot specie T3 scarsi (roster T3/T4 limitato per Voidling-bound rarity gating, museum M-2026-04-26-001).
  - Opzioni: (a) riservare a unlock T4; (b) loosen a T2 / alzare soglia; (c) keep T3 + assegna quando esistono specie T3; (d) ridurre stun a 1t.
  - **RACCOMANDATO (advisory)**: tenere T3 ma assegnare solo a un apex T3/T4 quando lo slot esiste
    (di fatto (d)-finche'-slot), OPPURE stun 1t se assegnato prima. Balance + pacing-roster master-dd.

## 6. Nota su TKT-P6-TRAIT-MECHANICS-SYNC (correlato)

`trait_mechanics.yaml` contiene valori di balance per trait con `ability_id` (es.
`antenne_flusso_mareale_strike`). Degli 11 B-trait, **nessuno** e' in `trait_mechanics.yaml`:
quasi tutti usano `apply_status` o `extra_damage` semplici (gestiti da `traitEffects.js`,
NON richiedono entry mechanics). Quindi TKT-P6-TRAIT-MECHANICS-SYNC e' **ortogonale** al
design-call B: riguarda l'aggiunta di mechanics per le famiglie A-class wave 1-3, non gli 11 B.
Va tenuto separato (resta `pre-balance-gated`); non bloccato da questa istruttoria.

## 7. Cosa puo' procedere SENZA design-call vs cosa serve a master-dd

| Item                            | Tipo                    | Gating                                                         |
| ------------------------------- | ----------------------- | -------------------------------------------------------------- |
| `sussurro_psichico` key fix (8) | bug-fix correttezza     | NON design-call. Serve solo PR data follow-up (forbidden-path) |
| Gruppo 1 assegnazione (1-7)     | content-direction       | scelta leggera "assegna ora vs parcheggia"; non balance-call   |
| `antenne_wideband` (9)          | design (dedup)          | **master-dd**                                                  |
| `mente_lucida` (10)             | balance (soglia/durata) | **master-dd** (+N=40 opz.)                                     |
| `cervello_predittivo` (11)      | balance + roster-pacing | **master-dd** (+slot T3/T4)                                    |

## 8. Sub-findings (verify-first, additive, non-bloccanti)

1. **Commenti inline stale** in `active_effects.yaml`: il cluster magnetico ha ancora commenti
   "no-op runtime" / "non consumato da policy.js" (righe ~2786, ~2807) che PRECEDONO la
   status-engine extension -> oggi FALSI (gli status sono consumati da statusModifiers.js +
   telepathicReveal.js). Doc-hygiene: aggiornare i commenti in una PR data follow-up (non toccati qui).
2. **`disoriented` vs `disorient`**: il long-form esiste solo in active_effects.yaml + glossary.json
   - doc storici; 0 consumer runtime. Allineare la glossary key insieme al fix (8).
3. **Blast-radius delete**: `aura_glaciale`/`antenne_wideband`/`tela_appiccicosa` sono in
   `biome_pools.json`. Qualsiasi `(c) delete` deve pulire ANCHE biome_pools (altrimenti pool-ref orfana).

## 9. Disclaimer

Questo doc NON decide nulla. Le RACCOMANDAZIONI sono advisory analyst-side e vanno ratificate
da master-dd (trait/balance design = master-dd subjective, CLAUDE.md). Nessun file in
`data/core/traits/` o `trait_mechanics.yaml` e' stato modificato (istruttoria read-only).
