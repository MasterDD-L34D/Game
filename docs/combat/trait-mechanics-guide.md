---
title: Trait Mechanics Guide
description: Come popolare e modificare trait_mechanics.yaml, la fonte unica dei valori meccanici consumati dal resolver d20.
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Trait Mechanics Guide

Il file `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` è la **fonte unica di verità** per i valori meccanici dei trait consumati dal rules engine. Se un trait non è in questo file, per il resolver è come se non avesse effetti meccanici (viene silenziosamente ignorato in `aggregate_mod`).

Questo documento spiega la struttura del file, la semantica dei campi, il processo di validazione e come aggiungere o modificare una entry.

## Struttura del file

```yaml
schema_version: '0.2.0'
generated_from: >
  <descrizione delle fonti del pass Balancer>
notes: >
  <policy, canali canonici, distribuzione>
traits:
  <trait_id>:
    attack_mod: 0
    defense_mod: 0
    damage_step: 0
    cost_ap: 1
    resistances: []
    active_effects: []
    notes: 'opzionale'
  <altro_trait_id>: ...
```

Il top-level espone 3 campi:

- `schema_version`: versione semantica del layer (attualmente `"0.2.0"`)
- `generated_from` / `notes`: metadati descrittivi non consumati dal resolver
- `traits`: mapping `trait_id → mechanics_entry`

Lo schema formale è in `packages/contracts/schemas/traitMechanics.schema.json` e viene validato automaticamente dai contract test.

## Campi di una entry

Ogni entry sotto `traits.<trait_id>` ha i seguenti campi:

### `attack_mod` _(int, default 0)_

Modificatore additivo al tiro d20 di attack quando il trait è attivo sull'attore. Viene sommato da `resolve_action` via `aggregate_mod(actor.trait_ids, catalog, "attack_mod")`. Valori tipici: `-2` … `+2`. Positivo = aggressive, negativo = handicap.

### `defense_mod` _(int, default 0)_

Modificatore additivo alla CD di attack del target quando il trait è attivo sul difensore. Formula CD: `10 + target.tier + aggregate(target.trait_ids, "defense_mod")`. Valori tipici: `-1` … `+2`.

### `damage_step` _(int, default 0)_

Step di danno "già maturato" quando il trait è attivo sull'attore. Viene sommato al `step_count` derivato dal MoS nella formula `compute_step_count(mos, trait_damage_step_bonus)`. Effetto netto: un attaccante con `damage_step: 1` parte già con +1 step di danno anche a MoS 0.

Il cap del Balancer è `+1` per trait singolo. I test contract (`tests/api/contracts-trait-mechanics.test.js`) verificano che nessun trait superi `damage_step: 2`.

### `cost_ap` _(int, default 1)_

AP richiesti per un'azione di tipo ability che attiva il trait. **Non è consumato dal resolver nella fase attuale** (le ability sono NOOP), ma è tracciato nel layer per future iterazioni. Usa 1 per trait leggeri, 2 per trait impegnativi, 3 per trait definitivi.

### `resistances` _(list di `{channel, modifier_pct}`)_

Lista di resistenze per-canale che vengono **aggregate sul target** durante l'hydration e applicate dal resolver in `apply_resistance` con formula moltiplicativa `floor(damage * (1 - pct/100))`.

- `channel` _(string, slug)_: canale di danno. Canali canonici: `elettrico, psionico, fisico, fuoco, gravita, mentale, taglio, ionico`. Canale non-canonico attualmente usato: `gelo` (solo `criostasi_adattiva`).
- `modifier_pct` _(int, clamp [-100, 100])_: percentuale di riduzione. Positivo = riduce danno (resistenza); negativo = amplifica (vulnerabilità).

L'aggregazione via `hydration.aggregate_resistances` somma i `modifier_pct` sullo stesso `channel` attraverso tutti i trait attivi, poi clampa a `[-100, 100]`.

### `active_effects` _(list di string, default [])_

Lista di identifier di effetti attivi (es. `"apply_disorient_on_hit"`, `"bleeding_on_crit"`). Il campo **esiste nello schema ma è NOOP nella Fase 2**: non viene letto dal resolver. È popolato solo come preparazione per la Fase 3 (ability implementation). Vedi [action-types-guide.md](action-types-guide.md) per il piano.

### `notes` _(string, opzionale)_

Documentazione inline: motivazione di un valore non ovvio, riferimento a un draft di bilanciamento, flag "candidato per revisione", ecc. Non consumato dal resolver.

## Tre esempi worked

### Esempio 1 — offensive: `artigli_sette_vie`

```yaml
artigli_sette_vie:
  attack_mod: 1
  defense_mod: 0
  damage_step: 1
  cost_ap: 1
  resistances: []
  active_effects: []
```

Un trait pienamente offensive: `+1 attack_mod` garantisce tiri più accurati, `+1 damage_step` aggiunge un flat bonus al danno a prescindere dal MoS, `cost_ap: 1` lo rende spammabile. Tipico early-game trait di un predatore. Non ha resistenze perché è orientato all'offesa, non alla sopravvivenza.

### Esempio 2 — defensive: `criostasi_adattiva`

```yaml
criostasi_adattiva:
  attack_mod: 0
  defense_mod: 1
  damage_step: 0
  cost_ap: 3
  resistances:
    - { channel: gelo, modifier_pct: 20 }
  active_effects: []
  notes: 'canale non-canonico gelo (estensione da stabilizzare nel prossimo combat pack)'
```

Trait defensive: nessun bonus offensivo, ma `+1 defense_mod` alza la CD di attack del target, e una resistenza del 20% al canale `gelo`. Il `cost_ap: 3` è alto perché l'attivazione (quando le ability saranno implementate) sarà impegnativa. Il campo `notes` documenta che `gelo` è un canale non-canonico introdotto da questo trait; andrà stabilizzato nel prossimo pack di combat content.

### Esempio 3 — hybrid: `coda_frusta_cinetica`

```yaml
coda_frusta_cinetica:
  attack_mod: 1
  defense_mod: 1
  damage_step: 0
  cost_ap: 2
  resistances: []
  active_effects: []
```

Trait hybrid: `+1 attack_mod` e `+1 defense_mod`, nessun damage_step extra. Non eccelle in nessun ruolo ma è versatile. Il `cost_ap: 2` bilancia il doppio bonus. Tipico trait di scout/tank.

## Catalog coverage gate

Il resolver **rifiuta di avviarsi** se il catalog non contiene tutti i core trait elencati in `docs/catalog/traits_inventory.json` (campo `core_traits`). Attualmente sono **33 core trait** (bumpati da 30 in PR #1298).

Il gate è enforced da due test:

- `tests/api/contracts-trait-mechanics.test.js::trait_mechanics.yaml contiene tutti e 33 i core trait di traits_inventory.json` — scorre i core e verifica che ogni id sia presente in `catalog.traits`.
- `tests/api/contracts-trait-mechanics.test.js::trait_mechanics.yaml valida contro traitMechanics schema` — valida la struttura completa contro `traitMechanics.schema.json`.

Se aggiungi un nuovo trait al catalog (es. dal Balancer pass), **devi aggiornare entrambi** `trait_mechanics.yaml` e `docs/catalog/traits_inventory.json` nello stesso commit.

## Procedura: aggiungere un nuovo trait

### 1. Aggiungere al catalog inventory

Apri `docs/catalog/traits_inventory.json` e aggiungi l'id del nuovo trait a `core_traits`:

```json
{
  "core_traits": ["...", "nuovo_trait_id"]
}
```

### 2. Aggiungere a trait_mechanics.yaml

Apri `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` e aggiungi una entry sotto `traits:`:

```yaml
traits:
  ...
  nuovo_trait_id:
    attack_mod: 0      # riempi secondo la classe (offensive/defensive/hybrid/mobility/utility)
    defense_mod: 0
    damage_step: 0
    cost_ap: 1
    resistances: []    # opzionale, lista di {channel, modifier_pct}
    active_effects: [] # NOOP in Fase 2, lascia vuota a meno che non stia implementando una ability
    notes: "motivazione dei valori scelti"
```

### 3. Aggiornare il test count

Il test `tests/api/contracts-trait-mechanics.test.js` ha un'asserzione hardcoded sul numero di core trait:

```js
test('trait_mechanics.yaml contiene tutti e 33 i core trait di traits_inventory.json', () => {
  ...
  assert.equal(coreIds.length, 33, 'traits_inventory.json deve esporre 33 core');
  ...
});
```

Aggiorna `33` al nuovo conteggio nel title e nell'assertion.

### 4. Verificare

```bash
# Contract validation (inventory ↔ mechanics ↔ schema)
node --test tests/api/contracts-trait-mechanics.test.js

# Test end-to-end del resolver (assicura che l'aggregazione funzioni)
PYTHONPATH=services/rules pytest tests/test_resolver.py tests/test_hydration.py
```

### 5. Committare entrambi i file insieme

Il catalog inventory e il mechanics file sono accoppiati. Un commit parziale (solo uno dei due) rompe il gate di coverage. Esempio di commit message:

```
feat(combat): add trait <nuovo_trait_id> to mechanics catalog

- attack_mod: 0, defense_mod: 2, damage_step: 0 (defensive)
- cost_ap: 2 (attivazione media)
- resistances: [{channel: ionico, modifier_pct: 15}]
- Bump core_traits count 33 → 34 in traits_inventory.json
- Update contract test assertion 33 → 34
```

## Procedura: modificare un trait esistente

1. Edita l'entry in `trait_mechanics.yaml`. Il campo `notes` è il posto giusto per giustificare il cambio.
2. Se il nuovo valore invalida scenari nei test del resolver (es. alzi l'`attack_mod` di `artigli_sette_vie` e ora il test `test_resolve_attack_with_artigli_hits_at_mos_0` fallisce perché il MoS cambia), **aggiorna il test**, non bypassa l'asserzione.
3. Esegui `node --test tests/api/contracts-trait-mechanics.test.js` e `pytest tests/test_resolver.py` per verificare.
4. Se il cambio invalida le snapshot di hydration (`tests/snapshots/hydration_caverna.json`), rigenera lo snapshot seguendo [testing.md](testing.md).

## Framework Balancer (sintesi)

Il pass Balancer assegna ogni trait a una **classe** basandosi su `description_it` + `family_type` + `usage_tags`:

| Classe    | Allocazione tipica                                                      | Quota attuale               |
| --------- | ----------------------------------------------------------------------- | --------------------------- |
| offensive | `attack_mod: +1`, `damage_step: +1`, `cost_ap: 1`                       | 4/33                        |
| defensive | `defense_mod: +1..+2`, `resistances: [...]`, `cost_ap: 2..3`            | 9/33                        |
| hybrid    | `attack_mod: +1`, `defense_mod: +1`, `cost_ap: 2`                       | 1/33                        |
| mobility  | `damage_step: 0`, modifiers neutri, effetti futuri via `active_effects` | 3/33                        |
| utility   | neutrale, `cost_ap: 1..2`, spazio per `active_effects` in Fase 3        | 13/33 (15/33 con i 3 nuovi) |

Le regole sono deterministiche: ogni valore è giustificato da un fatto del repo, non da intuizione. Per il framework completo vedi `packs/evo_tactics_pack/data/balance/README.md` e `docs/balance/Frattura_Abissale_Sinaptica_balance_draft.md`.

## Errori comuni

- **Campo YAML con la virgola invece che con `- { key: val }`**: lo schema richiede array di object. `resistances: gelo, 15` non è valido; usare `resistances: [{ channel: gelo, modifier_pct: 15 }]`.
- **`cost_ap` a 0**: lo schema richiede `cost_ap >= 1`. Usare 1 per trait passivi che potrebbero avere un'activation cost in Fase 3.
- **`modifier_pct > 100`**: il clamp effettivo è `[-100, 100]`, un valore oltre viene clampato silenziosamente. Meglio scrivere esplicitamente il valore effettivo.
- **Canale non-canonico senza `notes`**: se introduci un canale fuori dalla lista canonica, documenta la scelta in `notes` per non perderla.
- **Trait dimenticato nel inventory**: se aggiungi a `mechanics.yaml` ma non a `traits_inventory.json`, il test gate non vede il mismatch. Ricordati sempre di aggiornare entrambi.

## Riferimenti

- Schema formale: `packages/contracts/schemas/traitMechanics.schema.json`
- Balancer framework: `packs/evo_tactics_pack/data/balance/README.md`
- ADR per le decisioni di layer separato: [ADR-2026-04-13: Rules Engine d20](../adr/ADR-2026-04-13-rules-engine-d20.md)
- Contract test gate: `tests/api/contracts-trait-mechanics.test.js`
- Resolver API che consuma il catalog: [resolver-api.md](resolver-api.md)
