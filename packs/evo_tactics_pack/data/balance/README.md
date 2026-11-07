# Layer di bilanciamento — `data/balance/`

Questo layer ospita i file di bilanciamento meccanico del rules engine d20
di Evo-Tactics. Il contenuto e' **consumato direttamente dal resolver** in
`services/rules/` (Fase 5 dell'ADR-2026-04-13-rules-engine-d20) e rappresenta
la fonte unica di verita' per i modificatori numerici dei trait.

Chi modifica file in questa directory assume il ruolo di **Balancer**. Ogni
valore deve essere giustificabile — lo schema e i test di regressione non
accettano invenzione silenziosa.

---

## File presenti

- **`trait_mechanics.yaml`** — catalog di `trait_id → mechanics_entry` per i
  30 core trait (tutti presenti). Struttura validata da
  `packages/contracts/schemas/traitMechanics.schema.json`. Ogni entry espone
  `attack_mod`, `defense_mod`, `damage_step`, `cost_ap`, `resistances[]`,
  `active_effects[]`, `notes?`. `schema_version` segue semver: bump la
  minor quando aggiungi entry o campi, la major quando cambi semantica.

## Framework delle 5 classi di trait

Un trait core appartiene a **una** classe. Le regole sono deterministiche,
ancorate a `famiglia_tipologia`, `usage_tags`, e `description_it` del pack
glossary (`packs/evo_tactics_pack/docs/catalog/trait_glossary.json`). Non
inventare classi.

| Classe | attack_mod | damage_step | defense_mod | cost_ap | Criterio |
|---|---|---|---|---|---|
| **offensive** | +1 | +1 | 0 | invariato | Tag `breaker` OR desc cita esplicitamente danno/colpo decisivo |
| **defensive** | 0 | 0 | +1 | invariato | Tag `tank` AND famiglia "Difensivo"/"Strutturale"/"Tegumentario" |
| **hybrid** | +1 | 0 | +1 | invariato | Tensione tra desc (offensiva) e famiglia/tag (difensivi) |
| **mobility** | 0 | 0 | 0 | `max(1, cost_ap - 1)` se FME Alto, altrimenti invariato | Famiglia "Locomotorio"/"Propulsivo" con desc su movimento, non combat |
| **utility** | 0 | 0 | 0 | invariato | Tutto il resto (sustain metabolici, sensoriali, support puri) |

**T3 bump**: se `tier == "T3"` e classe ≠ utility, +1 al mod dominante del
ruolo. Attualmente applicato solo a `mantello_meteoritico` (defensive +
T3 → `defense_mod: 2`).

### Mobility discount selettivo

Il discount `cost_ap → cost_ap - 1` si applica **solo** ai mobility con
`fattore_mantenimento_energetico` prefisso "Alto". Motivo: il test
`contracts-trait-mechanics.test.js` hardcoda l'invariante del mapping
`Basso→1 / Medio→2 / Alto→3` per `artigli_sette_vie`, `scheletro_idro_regolante`,
`criostasi_adattiva`. Uno sconto generico romperebbe il mapping. Il
discount premia i trait dove il costo alto e' "fisiologico" ma il ruolo
richiede velocita' di attivazione.

### Range numerici ancorati

Tutti i valori stanno in range derivati dai file baseline del repo, non
dalla sensibilita' del Balancer.

- `attack_mod`, `defense_mod` ∈ **[0, +2]** — base `attack per_level 1.0`
  in `traits/parts_scaling.yaml`. +1 = 1 livello parte. +2 e' tetto per
  trait core T1-T2 (bridge-keystone); +3 e' riservato a future espansioni
  apex (T4-T5).
- `damage_step` ∈ **[0, +1]** — cap rigido per evitare double-dip con
  `attack_mod` (il damage_step ha peso medio ~3.5 HP su d6, ~6.5 su d12).
  Violazioni del cap vengono rilevate dal test `damage_step cap`.
- `cost_ap` ∈ **[1, 3]** — mapping `fattore_mantenimento_energetico`:
  `Basso→1`, `Medio→2`, `Alto→3`.
- `resistances.modifier_pct` ∈ **[+10, +20]%** per bonus singolo —
  coerente con il range `[0%, +30%]` del Frattura draft (i `+30`
  restano riservati a trait apex/boss). Vulnerabilita' negative fino a
  `-15%` (non ancora usate in questo set di core).

## Canali di danno

Lo schema `combat.schema.json` definisce `damage_channel` come slug
permissivo (`^[a-z0-9_]+$`) senza enum chiuso, per permettere estensione
incrementale senza schema bump. Questo layer usa **canali canonici** dal
Frattura draft + un'estensione documentata.

### Canonici (dal Frattura draft)

`elettrico`, `psionico`, `fisico`, `fuoco`, `gravita`, `mentale`,
`taglio`, `ionico`.

Nota: `gravità` (con accento) viene slugificato come `gravita` per
conformita' al pattern ASCII-only usato in tutto il repo.

### Estensioni non-canoniche

- **`gelo`** — introdotto da `criostasi_adattiva` (`description_it`: "metabolismo
  sospeso che sopravvive a stagioni estreme"). Nessun canale canonico
  copriva il dominio del freddo. **Da stabilizzare nel prossimo combat
  pack**: quando Dev-Tooling introdurra' un enum chiuso dei canali, `gelo`
  andra' promosso o rinominato con coordinamento del Trait Curator.

Chi aggiunge nuovi canali deve documentarli qui con giustificazione
testuale dal dataset. **Non introdurre sinonimi** (non creare `freeze`
se esiste `gelo`; non creare `ice` o `frost`).

## Distribuzione attuale (2026-04-13, Fase 3-bis)

| Classe | Count | Trait |
|---|---|---|
| offensive | 4 | `artigli_sette_vie`, `spore_psichiche_silenziate`, `sangue_piroforico`, `frusta_fiammeggiante` |
| defensive | 9 | `struttura_elastica_amorfa`, `sacche_galleggianti_ascensoriali`, `scheletro_idro_regolante`, `mimetismo_cromatico_passivo`, `cute_resistente_sali`, `criostasi_adattiva`, `carapace_fase_variabile`, `secrezione_rallentante_palmi`, `mantello_meteoritico` |
| hybrid | 1 | `coda_frusta_cinetica` |
| mobility | 3 | `nucleo_ovomotore_rotante`, `respiro_a_scoppio`, `zoccoli_risonanti_steppe` |
| utility | 13 | il resto |

**Trait con mod non-zero**: 14/30 (47%).

**Ratio defensive/offensive**: 2.25x. Normale per un pool a dominanza
ecologica bridge-keystone (molti trait di sopravvivenza), ma rischia una
meta "tank stale" se il prossimo round di core non compensasse. Prossimo
pass Balancer dovrebbe aggiungere trait offensive quando arriveranno
T4/apex.

## Estendere il catalog

Quando aggiungi trait non-core al catalog:

1. **Controlla la description_it** nel pack glossary
   (`packs/evo_tactics_pack/docs/catalog/trait_glossary.json`). Se e'
   boilerplate generico (non distinguibile da altri trait), flagga il
   trait come `utility` con nota `candidato_defensive_future` e rimanda
   la classificazione a quando il testo sara' arricchito.

2. **Applica il framework**, non giudizio personale. Se hai dubbi tra
   due classi, usa `hybrid` o aggiungi un `notes` per documentare la
   scelta.

3. **Resistenze**: solo se la `description_it` giustifica esplicitamente
   il canale. Se stai inventando ("un sasso dovrebbe essere resistente
   al fuoco"), non mettere la resistenza.

4. **Run test**:
   ```bash
   node --test tests/api/contracts-trait-mechanics.test.js
   ```
   Tutti i test devono passare. Se il test "completezza 30 core" fallisce
   perche' hai rimosso o rinominato un core, aggiorna prima
   `docs/catalog/traits_inventory.json`.

5. **Bump schema_version**: patch per singoli trait, minor per
   ristrutturazioni, major per cambi di forma di `mechanics_entry`.

## Rapporto con il rules engine

Il resolver (in sviluppo, Fase 5 ADR-2026-04-13) leggera' questo file
via `services/rules/trait_effects.py`. L'hydration (Fase 4) aggreghera'
le `resistances[]` di tutti i trait attivi su un'unita' in un unico
`CombatUnit.resistances` risolto (sommando i `modifier_pct` per canale).
I cap (`[-100, +100]%` dallo schema `combat.schema.json`) vengono
applicati all'aggregato, non ai singoli trait.

## File linkati

- **Plan di design**: `docs/adr/ADR-2026-04-13-rules-engine-d20.md`
- **Schema del catalog**: `packages/contracts/schemas/traitMechanics.schema.json`
- **Schema combat** (consumer): `packages/contracts/schemas/combat.schema.json`
- **Balance draft di riferimento**: `docs/balance/Frattura_Abissale_Sinaptica_balance_draft.md`
- **Baseline scaling parti**: `traits/parts_scaling.yaml`
- **Inventario core trait**: `docs/catalog/traits_inventory.json`
- **Pack glossary (descriptions)**: `packs/evo_tactics_pack/docs/catalog/trait_glossary.json`
- **Agent profile**: `.ai/balancer/PROFILE.md`
