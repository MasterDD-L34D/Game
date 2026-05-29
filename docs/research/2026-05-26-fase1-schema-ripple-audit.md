---
title: 'Fase-1 Spore Moderate -- schema-ripple audit (RECON-04a)'
date: 2026-05-26
status: AUDIT COMPLETE -- negative confirmation (zero downstream ripple) + cost-charging contract guard added
owner: claude (Claude Code Ryzen)
workstream: evo-tactics / Pilastro 2
language: it
related:
  - docs/superpowers/plans/2026-05-26-fase1-spore-moderate-reconciliation-plan.md
  - docs/handoff/2026-05-26-fase1-spore-recon-claude-code-handoff.md
  - docs/research/2026-05-26-fase1-spore-e2e-baseline.md
  - tests/api/mutations.cost-charging-contract.test.js
---

# Fase-1 Spore Moderate -- schema-ripple audit (RECON-04a)

## 0. Scopo

Gate **G1 SCHEMA-RIPPLE** (handoff §6): ogni edit allo schema di
`mutation_catalog.yaml` (RECON-02 populera' `derived_ability_id` su 10-15 entry)
deve verificare che i servizi downstream NON consumino i campi schema del
catalog. Se zero coupling -> RECON-02 e' ripple-safe (edit additivo non rompe
progression/reward/form). Questo doc e' la **negative-confirmation evidence**
pre-RECON-02 (read-only audit, NO modifica catalog -- parallelo a RECON-02).

## 1. Metodo

- READ-ONLY grep cross-codebase sui 3 servizi downstream citati nel plan.
- Pattern schema-field: `mp_cost | body_slot | applied_mutations | derived_ability`.
- Pattern coupling-largo: `mutation | catalog | spore | mpTracker | mutationEngine`.
- Verifica empirica path-exist PRIMA del grep (harsh-review P0 #3 lesson:
  non assumere path da plan, verificare file:line reale).

## 2. Target verificati (path empirici, esistono)

| Servizio          | Path                                                     | Esiste |
| ----------------- | -------------------------------------------------------- | ------ |
| progressionEngine | `apps/backend/services/progression/progressionEngine.js` | SI     |
| rewardOffer       | `apps/backend/services/rewards/rewardOffer.js`           | SI     |
| formEvolution     | `apps/backend/services/forms/formEvolution.js`           | SI     |

## 3. Findings

### 3.1 Negative confirmation -- zero schema-field coupling (G1 SAFE)

| Servizio          | `mp_cost\|body_slot\|applied_mutations\|derived_ability` | `mutation\|catalog\|spore\|mpTracker\|mutationEngine` |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| progressionEngine | **0 hit**                                                | **0 hit**                                             |
| rewardOffer       | **0 hit**                                                | **0 hit**                                             |
| formEvolution     | **0 hit**                                                | 1 hit (false-positive, vedi 3.2)                      |

Conclusione: i 3 servizi downstream **non leggono alcun campo dello schema
`mutation_catalog.yaml`** ne' importano `mutationEngine`/`mpTracker`. Popolare
`derived_ability_id` (RECON-02) e' un edit additivo **ripple-safe**: nessun
percorso progression/reward/form lo consuma. G1 gate **SODDISFATTO** per lo
scope RECON-02.

### 3.2 False-positive `formEvolution.js:174`

```
174:  /** Raw form catalog snapshot (for GET /registry). */
```

Si riferisce al **catalog delle FORME** (form-evolution), concern distinto dal
mutation_catalog. Nessun accoppiamento col mutation schema. Non e' un ripple.

### 3.3 Finding collaterale -- `tests/routes/` orfano da ogni runner (out-of-scope)

Durante la verifica del path per il contract test (handoff §15 lo collocava in
`tests/routes/mutations.cost-charging-contract.test.js`) ho riscontrato che:

- `scripts/run-test-api.cjs:10` globba **solo** `tests/api/*.test.js`.
- `grep -rn "tests/routes"` sui runner (`*.cjs/js/ts/json`) = **0 match**.
- `tests/routes/companion.test.js` esiste ma **non e' eseguito da nessuno script**
  di test (orfano dal glob -> zero copertura CI).

Implicazione: un guard test in `tests/routes/` sarebbe **silenziosamente
mai-eseguito** in CI (anti-pattern "file fuori dal glob non gira"). Per questo il
contract test e' stato collocato in `tests/api/` (vedi §4).

**Flag (NON Fase-1 scope)**: `tests/routes/companion.test.js` potrebbe essere
copertura morta. Candidato cleanup separato -- o aggiungere `tests/routes/*.test.js`
al glob di `run-test-api.cjs`, o spostare companion in `tests/api/`. Non risolto
qui (fuori scope RECON-04a).

## 4. Contract test aggiunto -- cost-charging deferred_m13_p3 guard

File: `tests/api/mutations.cost-charging-contract.test.js` (4 test, tutti PASS).

Indirizza harsh-review **P0 #4** (silent double-charge risk). Le route
`/eligible` e `/apply` ritornano `cost_charging: 'deferred_m13_p3'`:
il costo PE/PI e' **mostrato ma NON addebitato** (display-only, deferred a M13.P3
progression integration). Solo MP e' realmente deducted (via `mpTracker` +
`applyMutationPure deductMp`).

Invariante lockata dal guard:

1. `/eligible` e `/apply` dichiarano il marker `deferred_m13_p3`.
2. `/apply` espone i campi `pe_cost`/`pi_cost` (display).
3. **DOUBLE-CHARGE GUARD**: applicare una mutazione deduce **solo MP**; i campi
   `unit.pe` / `unit.pi` passano **invariati** (verificato: `applyMutationPure`
   fa `{ ...unit, trait_ids, applied_mutations, mp }`, `mutationEngine.js:154-159`
   -- nessun touch a pe/pi).
4. Back-compat: unit senza `mp/pe/pi` applica comunque + marker presente, nessun
   campo pe/pi sintetico introdotto.

Razionale guard: quando M13.P3 wire-era il charging reale di PE/PI, **deve**
onorare il marker. Un wire naive che deduce PE/PI qui -- mentre la route gia'
mostra il costo -- causerebbe double-charge silenzioso. Se un cambio futuro
inizia a dedurre `unit.pe`/`unit.pi`, questi assert falliscono -> decisione
esplicita invece di regressione silenziosa.

Run evidence:

```
✔ cost-charging: /eligible carries deferred_m13_p3 marker (cost shown, not charged)
✔ cost-charging: /apply declares deferred_m13_p3 + displays PE/PI cost fields
✔ cost-charging: DOUBLE-CHARGE GUARD — apply deducts MP only, never PE/PI store
✔ cost-charging: back-compat — unit without mp/pe/pi still applies + marker present
ℹ tests 4  ℹ pass 4  ℹ fail 0
```

## 5. Conclusione

- **G1 ripple SAFE** per RECON-02: zero downstream coupling con lo schema
  mutation_catalog. Populate `derived_ability_id` non rippla in
  progression/reward/form.
- **P0 #4 chiuso**: contract test lock dell'invariante deferred_m13_p3 +
  double-charge guard, eseguito da CI (`tests/api/` glob).
- **Deviazione path documentata**: contract test in `tests/api/` (non
  `tests/routes/`) per garantire esecuzione CI (finding 3.3).

## 6. Out-of-scope flags (non risolti qui)

- `tests/routes/` orfano dal glob test runner (finding 3.3) -- cleanup separato.
- RECON-04b complexity-budget Sigma c <= C_max enforce mating-side (G2 gate
  MISSING) -- ticket separato Wave-3.

---

**END RIPPLE AUDIT RECON-04a -- 2026-05-26.**
