---
title: ADR-2026-04-13: Rules Engine d20 per il loop tattico giocabile
doc_status: superseded
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
superseded_by: docs/adr/ADR-2026-04-19-kill-python-rules-engine.md
---

# ADR-2026-04-13: Rules Engine d20 per il loop tattico giocabile

- **Data**: 2026-04-13
- **Stato**: Superseded da [ADR-2026-04-19](ADR-2026-04-19-kill-python-rules-engine.md) (Phase 3 closed 2026-05-05). Runtime canonical = Node, ex-`services/rules/` Python rimosso.
- **Owner**: Team Backend & Tools
- **Stakeholder**: Narrative Ops (regole), Trait Curator (schema trait), Frontend Squad (futuro consumer UI), QA Automation (snapshot test)

## Contesto

Oggi il repository è una toolchain di generazione e validazione: dataset YAML,
`SpeciesBuilder`, `biomeSynthesizer` e un orchestratore Python che produce
blueprint di specie e encounter statici (cfr.
`ADR-2025-12-07-generation-orchestrator.md`). **Non esiste codice che esegua
una risoluzione di turno tattico**: non c'è un tiro di dado, un resolver di
azione, una macchina di stato del combattimento. I log di playtest in
`logs/playtests/` sono import esterni e non output del repo.

Le regole del sistema tattico sono però già documentate in
`docs/10-SISTEMA_TATTICO.md` e `docs/11-REGOLE_D20_TV.md`: dado centrale d20,
economia 2 AP + reazioni, Margin of Success (ogni +5 sulla DC = +1 step
danno), Punti Tecnica su 15–19 (+1) e 20 naturale (+2), parata come d20
reattivo, status fisici (Sanguinamento, Frattura, Disorientamento) e mentali
(Furia, Panico). Manca la traduzione in codice.

Senza un motore regole eseguibile, i tre pilastri rimanenti per una prima
versione giocabile (session state nel backend, client di gioco nella
dashboard) non hanno su cosa poggiare.

## Decisione

Introduciamo un rules engine d20 sotto `services/rules/`, scritto in **Python**
e coordinato con il resto dell'ecosistema di generazione tramite gli stessi
pattern già consolidati. Le scelte strutturali sono quattro.

### 1. Linguaggio: Python

Il resolver vive in `services/rules/` come package Python, non in Node. Motivi:

- Riuso diretto di `tools/py/game_utils/random_utils.py` (RNG mulberry32 già
  deterministico e testato in `tests/test_random_utils.py`).
- Coerenza con `services/generation/` (`SpeciesBuilder`, `orchestrator.py`,
  `worker.py`): stesso linguaggio, stesso stile di test (snapshot JSON come in
  `tests/test_species_builder.py`), stesso bridge Node↔Python per l'eventuale
  esposizione HTTP futura.
- Le regole tattiche sono algoritmiche e facilmente testabili in unità; non
  beneficiano del runtime Node.

### 2. Gate sui trait meccanici — layer di bilanciamento separato

Lo schema trait esistente (`packs/evo_tactics_pack/docs/catalog/trait_entry.schema.json`)
è **descrittivo** e usa `additionalProperties: false` a livello root: campi
come `famiglia_tipologia`, `fattore_mantenimento_energetico`, `debolezza`,
`uso_funzione`, `cost_profile`, `sinergie`, `conflitti` catturano la semantica
biologico-narrativa del trait ma **nessuno di questi è un attributo numerico
consumabile da un resolver d20** (tipo `attack_mod`, `damage_step`,
`resistances`).

L'esplorazione dei 30 core trait (fonte: `docs/catalog/traits_inventory.json`
campo `core_traits`) ha inoltre mostrato che i dati esistenti non supportano
una derivazione meccanica euristica affidabile:

- `famiglia_tipologia` ha 21 valori distinti su 30 trait (17 famiglie
  contengono un solo trait) — dimensione troppo frammentata per predire il
  comportamento meccanico.
- `tier` non è un attributo univoco del trait: vive in
  `requisiti_ambientali[].meta.tier` e **varia per bioma**.
- `fattore_mantenimento_energetico` è testo libero (es. `"Medio (Attivazione
situazionale)"`), non un enum stretto.
- L'unica dimensione pulita e direttamente mappabile è `cost_profile.burst`,
  che assume valori `Basso`/`Medio`/`Alto` e può alimentare `cost_ap`.

**Decisione**: non modifichiamo `trait_entry.schema.json`. Introduciamo invece
un **layer di bilanciamento separato** in
`packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`, con uno schema
JSON dedicato in `packages/contracts/schemas/traitMechanics.schema.json`.
Questo layer è la **fonte unica di verità** per il rules engine: il resolver
Python legge `trait_mechanics.yaml` via path di pack, non tocca i trait-keeper
YAML esistenti.

Forma di ogni entry:

```yaml
trait_id:
  attack_mod: 0 # int, default 0
  defense_mod: 0 # int, default 0
  damage_step: 0 # int, default 0 (aggiunto a step base)
  resistances: [] # list[str], canali di danno ridotti
  active_effects: [] # list[effect_id], effetti attivabili a costo AP
  cost_ap: 1 # int, costo in AP dell'effetto attivo
```

**Popolamento iniziale** (euristica minimalista, limitata ai campi
affidabili dei dataset):

- `cost_ap` derivato da `cost_profile.burst` del trait: `Basso→1`, `Medio→2`,
  `Alto→3`. Se `cost_profile.burst` è assente, fallback a `1`.
- `attack_mod`, `defense_mod`, `damage_step` → `0` per tutti i 30 core.
  **Placeholder bilanciamento**: un passaggio dedicato del Balancer popolerà
  questi valori prima di qualunque playtest reale.
- `resistances` → `[]`. Il Balancer incrocerà `debolezza` per popolare le
  resistenze "positive" corrispondenti (es. trait con `debolezza: corrosione`
  non riceverà `corrosion` tra le resistenze).
- `active_effects` → `[]`. Verrà popolato quando il resolver definirà il
  registro degli effetti attivabili.

Il resolver **non parte** finché `trait_mechanics.yaml` non contiene tutti
e 30 i core trait validati contro lo schema. Il test di completezza in
`tests/api/contracts-trait-mechanics.test.js` verifica questa invariante.

I trait non core possono essere aggiunti al layer in modo incrementale senza
bloccare altre milestone.

**Nota 2026-04-13**: il numero dei core trait è **30**, non 29 come indicato
in bozze precedenti; la fonte canonica è `docs/catalog/traits_inventory.json`.

### 3. RNG namespacing

L'RNG esistente (`hash_seed(str) → mulberry32`) espone un singolo stream
deterministico per seed. Se il resolver usasse lo stesso stream della
generation, tiri di combat e tiri di trait selection si sovrapporrebbero e
lo stesso seed produrrebbe sequenze correlate non desiderate.

Estendiamo `tools/py/game_utils/random_utils.py` con una funzione additiva:

```python
def namespaced_rng(seed: str, namespace: str) -> Callable[[], float]:
    """RNG derivato deterministicamente da (seed, namespace).

    Due namespace diversi sullo stesso seed producono sequenze indipendenti.
    Lo stesso (seed, namespace) produce sempre la stessa sequenza.
    """
```

Namespace previsti per il resolver: `"init"`, `"attack"`, `"defense"`,
`"damage"`, `"status"`. La generation esistente continua a usare
`create_rng(seed)` senza modifiche: la funzione nuova è additiva e non rompe
chiamate esistenti.

### 4. Scope status: completi alla prima iterazione

La prima implementazione del resolver copre **tutti e cinque** gli status
documentati in `docs/10-SISTEMA_TATTICO.md`: Sanguinamento, Frattura,
Disorientamento (fisici) e Furia, Panico (mentali). Non facciamo due passate.
Motivo: gli status mentali interagiscono con lo stress tracker e con
`party_vc.cohesion` dell'encounter; implementarli in un secondo giro
richiederebbe rifattorizzare la macchina di stato del combattimento subito
dopo averla scritta.

## Conseguenze

### Positive

- Il rules engine diventa un modulo puro, senza I/O, testabile con snapshot
  JSON deterministici (stesso pattern di `test_species_builder.py`).
- Lo schema trait arricchito è riusabile da altri tool (balance, simulator,
  validator del pack) oltre al resolver.
- Il bridge Node↔Python già esistente (`services/generation/worker.py`)
  fornisce un template diretto per esporre il resolver come servizio quando
  servirà (Fase 6 del piano implementativo).

### Negative / rischi

- Il layer `trait_mechanics.yaml` introduce una **seconda fonte di verità**
  parallela ai trait-keeper YAML esistenti: i due possono divergere se il
  Trait Curator aggiorna un trait senza propagare al layer. Mitigazione: il
  test di completezza controlla che tutti i core siano presenti; il Balancer
  include il refresh del layer nella propria procedura.
- La patch iniziale usa defaults 0 per `attack_mod`/`defense_mod`/`damage_step`:
  il resolver girerà ma il combat sarà meccanicamente piatto finché il
  Balancer non popola i valori reali. **Nessun playtest reale** prima del
  pass Balancer. Il file YAML è esplicitamente marcato come "placeholder".
- L'ADR va **riaperto** se durante la Fase 5 (resolver core) emergono regole
  non esprimibili con la forma `mechanics` attuale (es. effetti condizionali
  su terreno, trigger reattivi): in quel caso lo schema del layer evolve e
  questa decisione viene esplicitamente rivista.

### Impatti su pipeline esistenti

- Nessun impatto su `services/generation/` (nessun file toccato).
- `tools/py/game_utils/random_utils.py`: modifica additiva, retrocompatibile
  (Fase 1 completata).
- `packages/contracts/`: aggiunti `combat.schema.json` (Fase 2) e
  `traitMechanics.schema.json` (Fase 3). Nessuna modifica ai tipi esistenti.
- `packs/evo_tactics_pack/data/balance/`: **nuova directory**, contiene il
  layer `trait_mechanics.yaml`. I trait-keeper YAML e
  `trait_entry.schema.json` non vengono toccati.
- `data/core/traits/`: nessun impatto.

## Fase 3-bis: pass Balancer manuale (2026-04-13)

Sezione aggiunta post-hoc per documentare il pass Balancer collaborativo
completato tra utente e assistente. Inizialmente la Fase 3-bis era stata
marcata "bloccata da handoff umano" perche nessun file del repo contiene
una tabella `trait_core → stat` o una formula di conversione. L'utente ha
scelto di lavorare insieme definendo un framework tracciabile dove ogni
valore poggia su un fatto letto, non su giudizio soggettivo.

### Framework delle 5 classi

Regole deterministiche applicate ai 30 core, derivate da:

- **`traits/parts_scaling.yaml`** — `attack per_level 1.0`,
  `speed per_level 0.5`, `ability level_max 5`. Conclusione operativa:
  `+1 attack_mod ≈ 1 livello parte`. Range difendibile per trait core
  (bridge-keystone, non apex): `[0, +2]`. Cap `damage_step ≤ +1` per
  evitare double-dip con attack_mod (il damage_step pesa ~3.5 HP su d6
  vs ~1 HP di attack_mod).
- **`docs/balance/Frattura_Abissale_Sinaptica_balance_draft.md`** —
  Armor 2-12, CD 14-18, resistenze `+0% ÷ +30%`, stress float 0-1.
  Range resistenze per trait singolo: `[+10, +20]%`.
- **`data/core/traits/biome_pools.json` role_templates** — apex=4,
  keystone=3, bridge=2, threat=3, event=2. I 30 core (24 T1, 5 T2, 1 T3)
  coprono bridge-keystone → nessun trait riceve +2 a parita' di tier.

| Classe    | attack_mod | damage_step | defense_mod | cost_ap                           | Criterio                                        |
| --------- | ---------- | ----------- | ----------- | --------------------------------- | ----------------------------------------------- |
| offensive | +1         | +1          | 0           | invariato (da FME)                | Tag `breaker` OR desc cita esplicitamente danno |
| defensive | 0          | 0           | +1          | invariato                         | Tag `tank` AND famiglia difensiva               |
| hybrid    | +1         | 0           | +1          | invariato                         | Tensione tra desc e famiglia/tag                |
| mobility  | 0          | 0           | 0           | `max(1, cost_ap - 1)` se FME=Alto | Famiglia locomotoria/propulsiva                 |
| utility   | 0          | 0           | 0           | invariato                         | Tutto il resto                                  |

**T3 bump**: +1 al mod dominante del ruolo non-utility. Solo
`mantello_meteoritico` e' T3 → `defense_mod: 2`.

**Mobility discount selettivo**: applicato solo ai mobility con
`fattore_mantenimento_energetico` prefisso "Alto", per non rompere
l'invariante del mapping `Basso/Medio/Alto → 1/2/3` hardcodato nel test
`contracts-trait-mechanics.test.js`. Discount applicato a
`nucleo_ovomotore_rotante` e `respiro_a_scoppio` (cost 3→2).

### Classificazione finale

| Classe    | Count | Trait                                                                                                                                                                                                                                                                                                                           |
| --------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| offensive | 4     | `artigli_sette_vie`, `spore_psichiche_silenziate`, `sangue_piroforico`, `frusta_fiammeggiante`                                                                                                                                                                                                                                  |
| defensive | 9     | `struttura_elastica_amorfa`, `sacche_galleggianti_ascensoriali`, `scheletro_idro_regolante`, `mimetismo_cromatico_passivo`, `cute_resistente_sali`, `criostasi_adattiva`, `carapace_fase_variabile`, `secrezione_rallentante_palmi`, `mantello_meteoritico`                                                                     |
| hybrid    | 1     | `coda_frusta_cinetica`                                                                                                                                                                                                                                                                                                          |
| mobility  | 3     | `nucleo_ovomotore_rotante`, `respiro_a_scoppio`, `zoccoli_risonanti_steppe`                                                                                                                                                                                                                                                     |
| utility   | 13    | `filamenti_digestivi_compattanti`, `grassi_termici`, `cuticole_cerose`, `olfatto_risonanza_magnetica`, `eco_interno_riflesso`, `ventriglio_gastroliti`, `sonno_emisferico_alternato`, `focus_frazionato`, `empatia_coordinativa`, `risonanza_di_branco`, `occhi_infrarosso_composti`, `lingua_tattile_trama`, `enzimi_chelanti` |

**Trait con mod non-zero**: 14/30 (47%).

### Casi dubbi risolti con scelta esplicita dell'utente

1. **`coda_frusta_cinetica`** (desc "colpo cinetico devastante" vs tag
   scout+tank vs famiglia "Locomotorio/Difensivo"): scelto **hybrid**
   (attack 1, defense 1, damage 0). Unico trait hybrid del set.
2. **`criostasi_adattiva`** (nessun canale canonico copre il freddo):
   scelto di introdurre canale non-canonico **`gelo +20%`**, documentato
   nel `README.md` di `data/balance/` come estensione "da stabilizzare
   nel prossimo combat pack".
3. **`cuticole_cerose`** (label suggerisce resistenza classica ma
   description_it generica boilerplate): resta **utility** con note
   `candidato_defensive_future`; no inferenza sul solo nome.

### Resistenze popolate (12 entry su 10 trait)

Solo dove la `description_it` del pack glossary giustifica esplicitamente
il canale.

| trait                      | canale   | modifier_pct | giustificazione                             |
| -------------------------- | -------- | ------------ | ------------------------------------------- |
| struttura_elastica_amorfa  | fisico   | +10          | "corpo amorfo che si estende e si compatta" |
| grassi_termici             | fuoco    | +10          | nome "termici" + ruolo isolante             |
| cute_resistente_sali       | fuoco    | +15          | desc: "attenuare impatti termici"           |
| cute_resistente_sali       | taglio   | +10          | cute come barriera meccanica                |
| spore_psichiche_silenziate | mentale  | +15          | emette psi → resiste psi                    |
| sonno_emisferico_alternato | mentale  | +10          | "mezzo cervello veglia"                     |
| sangue_piroforico          | fuoco    | +20          | produce fuoco → immune                      |
| criostasi_adattiva         | **gelo** | +20          | "stagioni estreme" (canale nuovo)           |
| carapace_fase_variabile    | fisico   | +15          | "corazza varia densita"                     |
| mantello_meteoritico       | fisico   | +20          | "strati ablativi vaporizzano l'impatto"     |
| mantello_meteoritico       | fuoco    | +20          | "convertendolo in impulso termico"          |
| frusta_fiammeggiante       | fuoco    | +10          | "plasma vincolato"                          |

I restanti 18/30 trait hanno `resistances: []` perche la `description_it`
non fornisce evidenza sufficiente per ancorare un canale specifico.
Questa e' **tracciabilita' negativa esplicita**, non omissione.

### Limiti del pass

- **Il framework e' minimalista.** I valori `+1` / `+2` sono ragionevoli
  ma non calibrati su playtest reale. Un secondo pass sara' necessario
  quando il resolver (Fase 5) sara' testabile end-to-end.
- **Ratio defensive/offensive 2.25x**. Normale per un pool bridge-keystone
  a dominanza ecologica, ma va monitorato quando T4/apex arriveranno.
- **`active_effects` resta vuoto ovunque.** Il registro degli effetti
  attivi va definito in Fase 5 dal resolver, non dal Balancer a priori.
- **Nessun trait ha vulnerabilita' (modifier_pct negativo).** Il Frattura
  draft le ammette (`fuoco -15%` per Sciame), ma per 30 core piatti non
  c'e' evidence testuale per attribuirle senza inventare.
- **Canale `gelo` e' un pagamento tecnico**. Quando Dev-Tooling formalizzera
  un enum chiuso dei canali, va riconciliato.

## Azioni di follow-up

- [x] Fase 1 — RNG namespacing additivo in `random_utils.py` + test.
- [x] Fase 2 — `combat.schema.json` e tipi condivisi in `packages/contracts/`
      (schema minimale, successivamente riallineato in Fase 2-bis).
- [x] Fase 2-bis — Riallineamento di `combat.schema.json` al sistema
      numerico reale documentato in
      `docs/balance/Frattura_Abissale_Sinaptica_balance_draft.md`:
      aggiunti `combat_unit.armor` (integer), `combat_unit.resistances`
      come lista di `{channel, modifier_pct}`, `combat_unit.stress` come
      float 0-1 (da int precedente), `action.damage_dice` opzionale con
      notazione `XdY+Z` (count, sides in [4,6,8,10,12,20], modifier),
      `$defs.damage_channel` con description dei canonici italiani
      slugificati (`elettrico, psionico, fisico, fuoco, gravita, mentale,
taglio, ionico`). Convenzione slug ascii-only confermata; nessun
      enum chiuso sul channel per permettere estensioni via pack.
      Tipi TS aggiornati (`CombatResistanceEntry`, `CombatDamageDice`,
      `CombatUnit`, `CombatAction`). Test combat esteso a 16 casi
      (24 totali con trait-mechanics), tutti verdi.
      Motivo dell'ADR bis: la Fase 2 originale era coerente con
      `docs/10-SISTEMA_TATTICO.md` ma sotto-dimensionata rispetto al
      Frattura draft; disallineamento scoperto durante la ricerca di
      fonti per la Fase 3-bis. Errore di priorità recuperato post-hoc.
- [x] Fase 3 — Layer di bilanciamento esterno: - [x] `packages/contracts/schemas/traitMechanics.schema.json` con
      `resistances` allineate a `{channel, modifier_pct}` (Fase 2-bis). - [x] `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` con
      30 entry core, `cost_ap` derivato da
      `fattore_mantenimento_energetico`, altri campi 0 + `breaker`/`tank`/T3 bump. - [x] Test di validazione e completezza dei 30 core (8 test).
- [x] **Fase 3-bis — Pass Balancer manuale collaborativo (2026-04-13).**
      Completata via sessione di lavoro congiunta utente + assistente.
      Vedi sezione dedicata "Fase 3-bis: pass Balancer manuale" nel body
      dell'ADR. Sintesi: definito un framework di 5 classi
      (offensive/defensive/hybrid/mobility/utility) con regole
      deterministiche ancorate a `parts_scaling.yaml`, Frattura draft,
      description_it del pack glossary. Classificati tutti i 30 core,
      applicati i valori numerici, popolate 12 entry resistances su
      10 trait con giustificazione testuale. Introdotto canale
      non-canonico `gelo` per `criostasi_adattiva`. Framework
      documentato in `packs/evo_tactics_pack/data/balance/README.md`.
      Test di regressione aggiunti: hybrid invariant, mobility discount
      selettivo, damage_step cap, resistance presence permissivo.
      **Il "no playtest prima del pass" resta valido**: i valori sono
      placeholder ragionevoli, non risultato di playtest. Il prossimo
      iter del Balancer (quando T4/apex entreranno in scope) dovra'
      rivedere la ratio defensive/offensive (attualmente 2.25x) e
      considerare il promuovere `cuticole_cerose` a defensive quando
      il pack glossary arricchira' la description_it boilerplate.
- [x] Fase 2-ter — Micro-rework schema: aggiunto `combat_unit.tier`
      (integer 1-6, obbligatorio) per permettere la formula CD =
      `10 + target.tier + defense_mod`. Motivo: la decisione di design
      della Fase 5 ("CD = 10 + tier target + defense_mod") richiedeva
      che ogni unit esponesse un tier. `index.d.ts` aggiornato,
      `buildMinimalUnit` fixture includes `tier: 3`, 3 nuovi test combat
      (rifiuto senza tier, rifiuto tier 0, rifiuto tier 7). Hydration
      aggiornata con `derive_tier_from_power(power) = clamp((power//3)+1, 1, 5)`
      per hostile e `DEFAULT_PARTY_TIER = 3` per party (override via kwarg).
      Snapshot `hydration_caverna.json` rigenerato. 4 nuovi test hydration.
- [x] Fase 4 — `services/rules/hydration.py`: encounter + party → CombatState.
      Modulo puro (nessun I/O globale, nessun randomness). API:
      `load_trait_mechanics`, `aggregate_resistances`, `build_party_unit`,
      `build_hostile_unit_from_group`, `hydrate_encounter`. Derivazioni
      numeriche ancorate al Frattura draft: hostile `hp = 40 + power*10`,
      `armor = clamp(2 + power//2, 2, 12)`, `initiative = 8 + power`;
      party baseline 50/4/12; AP.max fisso a 2 (da docs/10-SISTEMA_TATTICO).
      Resistances aggregate sommando i `modifier_pct` per canale dai trait
      attivi, clamp `[-100, +100]`, canali con somma 0 esclusi.
      Snapshot end-to-end in `tests/snapshots/hydration_caverna.json`
      prodotto da `encounter_caverna.txt` + party di 3 unita' con trait
      misti. Test Python (12 in `tests/test_hydration.py`) + cross-lang
      integrity check Node (7 in `tests/api/contracts-hydration-snapshot.test.js`):
      lo snapshot Python valida contro `combat.schema.json` via AJV.
- [x] Fase 5 — Resolver core: `services/rules/resolver.py` (modulo unico,
      pure functions, nessun I/O). Implementa `resolve_action(state, action,
catalog, rng) → {next_state, turn_log_entry}` con le 4 decisioni di
      design recepite dalla discussione utente: - **Step danno** = +25% del danno medio base:
      `floor(avg_base * 0.25 * step_count)` sommato al roll - **Armor DR-style**: `max(0, danno_dopo_resist - armor)` - **CD attack** = `10 + target.tier + target_defense_mod_aggregato` - **Resistenze moltiplicative**: `floor(danno * (1 - pct/100))`
      Pipeline attack: nat d20 + attack_mod aggregato → vs CD →
      crit/fumble override → MoS → step count (MoS//5 + trait bonus) →
      base rolled + step_bonus flat → apply_resistance(channel) →
      apply_armor → clamp 0 → update target HP. PT gained calcolato
      dalla formula del doc (nat 15-19 +1, nat 20 +2, +1 ogni 5 MoS)
      e scritto nel `TurnLog.roll` ma non accumulato in state.
      Action non-attack (`defend`/`parry`/`ability`/`move`) consumano
      AP senza roll: logica di risoluzione rimandata a iterazione futura.
      **Rimandi espliciti**: status trigger automatici non implementati
      (solo via `ability` esplicita in futuro), stress non modificato
      da attack base (coerente col Frattura draft che lo lega a hazard
      e forme), PT non persistiti in pool. 22 test in
      `tests/test_resolver.py`: formule pure (PT, step count, step flat
      bonus, resistance, armor) + scenari attack fissi con rng
      deterministico (success, fumble, crit, resist, armor clamp,
      attack_mod offensive, defense_mod difensivo) + immutabilita'
      input + integrazione con `namespaced_rng` reale di Fase 1.
- [x] Fase 2-quater — Schema update per PT pool + reazioni:
      `combat_unit.pt` (integer ≥ 0, obbligatorio) e `combat_unit.reactions`
      (`{current, max}`, obbligatorio) aggiunti a `combat.schema.json`.
      Nuovi `$defs`: `pt_spend` (enum `[perforazione]` attualmente, estendibile
      quando `spinte/condizioni/combo` verranno definite), `parry_response`
      (`{attempt, parry_bonus?}`), `parry_result` (loggato dentro
      `roll_result.parry`). `action.pt_spend` e `action.parry_response`
      opzionali. `roll_result.pt_spent` e `roll_result.parry` opzionali.
      `CombatUnit`, `CombatAction`, `CombatRollResult` in `index.d.ts`
      aggiornati con i nuovi campi + tipi `CombatPtSpend`, `CombatPtSpendType`,
      `CombatParryResponse`, `CombatParryResult`. Hydration inizializza
      `pt: 0` e `reactions: {1, 1}` su ogni unit (costanti
      `DEFAULT_PT_POOL`, `DEFAULT_REACTIONS_MAX`). Snapshot
      `hydration_caverna.json` rigenerato. 4 nuovi test combat (rifiuto
      senza `pt`/`reactions`, accettazione action con `pt_spend`,
      rifiuto `pt_spend.type` non enum), 2 nuovi test hydration (init
      `pt` e `reactions` su party e hostile).
- [x] Fase 7 — PT pool + Parry nel resolver: - **PT accumulo**: dopo ogni attack success, `actor.pt += pt_gained`
      (formula del doc: +1 nat 15-19, +2 nat 20, +1 ogni 5 MoS). - **Spesa `perforazione`**: costa 2 PT, riduce l'armor effettivo
      del target di 2 SOLO per il tiro di danno corrente. Consumo
      applicato **prima del roll** — per decisione utente esplicita
      "tutti i colpi caricati che mancano consumano comunque risorse":
      anche un attack fumble perde i PT caricati. Le altre 3 spese
      (`spinte`/`condizioni`/`combo`) sono rimandate con nota esplicita
      nell'enum dello schema. - **Parry reattivo**: action di attacco puo' includere
      `parry_response.attempt = true` come opt-in del client per conto
      del target. Il resolver, se attack success e target ha
      `reactions.current > 0`, consuma 1 reazione del target e tira
      d20 parry vs `PARRY_CD = 12`. Success → `step_count -= 1`,
      `target.pt += PARRY_PT_BASE` (1, oppure 2 su nat 20). La parata
      **contrapposta** (d20 vs d20) e' rimandata a un'iterazione futura:
      la versione corrente usa CD fissa per semplicita'. - **`begin_turn(state, unit_id)`**: nuova funzione pura, reset di
      `ap.current = ap.max` e `reactions.current = reactions.max` per
      l'unita' indicata. Il resolver NON la chiama automaticamente; il
      caller deve invocarla quando avanza il turno. - **Helper puri esportati**: `apply_pt_spend(actor, pt_spend)` che
      solleva `ValueError` su tipo non supportato / PT insufficienti,
      `resolve_parry(target, rng, parry_bonus)` che restituisce il
      `parry_result` dict senza mutare target. - **Pipeline attack aggiornata** (ordine): 1. `apply_pt_spend` (consumo PT caricato, raise su insufficient) 2. Aggregate trait mods (attack/defense/damage_step) 3. CD = 10 + tier + defense_mod 4. d20 attack + crit/fumble 5. Se success: parry opt-in mid-pipeline 6. step_count (da MoS + trait bonus - parry reduction) 7. Se success: roll damage_dice, step_flat_bonus, apply_resistance,
      apply_armor con `effective_armor = armor - 2` se perforazione,
      clamp, update HP 8. Accumulo `actor.pt += pt_gained` (su success) 9. Consume AP, costruisci `roll_result` (con `parry` e `pt_spent`)
      14 nuovi test in `tests/test_resolver.py`: `begin_turn` reset e
      immutabilita', `apply_pt_spend` validazione/consumo, PT accumulo
      nat 15-19 / nat 20 / MoS stack, `perforazione` consumo su miss,
      `perforazione` riduzione armor su hit, `perforazione` raise su
      insufficient, parry success (step -1 + defensive PT), parry fail
      (reazione consumata ma nessuna riduzione), parry ignorato se
      target no reazioni, parry nat 20 (+2 PT), `resolve_parry` helper.
      1 nuovo test bridge in `tests/server/rules-bridge.spec.js`:
      `attack` con `pt_spend` + `parry_response` insieme via worker,
      verifica `pt_spent`, `parry` non null, accumulo `actor.pt` finale.
- [x] Fase 6 — Worker bridge `services/rules/worker.py` + smoke test
      integrazione `tests/server/rules-bridge.spec.js`. Il worker clona il
      pattern di `services/generation/worker.py`: handshake `ready` all'avvio,
      heartbeat periodico (intervallo via `RULES_WORKER_HEARTBEAT_INTERVAL_MS`),
      richieste JSON line su stdin con shape `{id, action, payload}`, risposte
      `{type: "response", id, status, result|error|code}`. Catalog
      `trait_mechanics.yaml` caricato una volta al boot (path sovrascrivibile
      via `RULES_TRAIT_MECHANICS_PATH`). Azioni esposte: - `hydrate-encounter` → `hydrate_encounter(...)` → CombatState - `resolve-action` → `resolve_action(state, action, catalog,
namespaced_rng(seed, namespace))` → `{next_state, turn_log_entry}` - `shutdown` → clean exit
      Namespace RNG di default: `"attack"`, sovrascrivibile dal payload.
      4 test di integrazione spawn-del-worker: ready + hydrate + resolve,
      determinismo stesso seed/namespace, errore su azione sconosciuta,
      errore su payload malformato. **Chiude l'ADR**: da qui in poi i
      consumer (backend Express, CLI tool, UI) possono invocare il rules
      engine tramite lo stesso pattern bridge gia' usato per la generation
      pipeline.
- [x] Fase 2-quinquies — Schema `traitMechanics.schema.json` esteso con
      due campi opzionali: `on_hit_status` (`{status_id, duration, intensity,
trigger_dc}`) e `on_hit_stress_delta` (number `[-1, 1]`). Entrambi
      retrocompatibili: il catalog esistente non li richiede. `index.d.ts`
      aggiornato con `TraitMechanicsOnHitStatus` + campi opzionali su
      `TraitMechanicsEntry`. Popolato **un solo trait** nel yaml come
      caso demo testualmente giustificato: `spore_psichiche_silenziate`
      (desc: "spore psioniche che sedano e confondono") riceve
      `on_hit_status: {disorient, duration 2, intensity 1, trigger_dc 12}`
      e `on_hit_stress_delta: 0.05` (coerente col Frattura "1 stack
      stress 0.05 on hit" delle larve). Il Balancer umano estendera' gli
      altri trait quando ne varra' la pena, Zero invenzione.
- [x] Fase 8 — Status auto-trigger nel resolver: - **Nuovi helper puri** esportati: - `get_status(unit, status_id)` -> status dict o None (copia, safe
      da mutazione accidentale) - `apply_status(unit, status_id, duration, intensity, source_*)`
      con semantica "refresh duration + max intensity": se il target
      ha gia' lo status, `remaining_turns = max(existing, new)` e
      `intensity = max(existing, new)`, no stack all'infinito - `check_stress_breakpoints(target, before, after, ...)` -> lista
      di status applicati; ogni breakpoint scatta una sola volta per
      la transizione `before < BP <= after` - **`begin_turn` esteso**: la signature ora restituisce
      `{next_state, expired, bleeding_damage}`. Fa: reset AP/reactions,
      bleeding tick (prima del decay: l'ultimo turno del bleeding applica
      comunque il suo danno), decay di 1 turno di tutti gli status,
      rimozione dei decaduti con log in `expired`. **Breaking change**
      dalla Fase 7: i test esistenti sono stati aggiornati per leggere
      `result["next_state"]` invece del dict diretto. - **Pipeline attack estesa**: 1. Lookup attacker/target 2. `apply_pt_spend` (invariato Fase 7) 3. Aggregate trait mods + **malus status attore**: - disorient -> `attack_mod -= intensity * 2` (`DISORIENT_ATTACK_MALUS_PER_INTENSITY`) 4. CD = 10 + target.tier + defense_mod 5. d20 attack + crit/fumble 6. Parry opt-in (invariato Fase 7) 7. step_count da MoS + trait bonus + **malus status attore**: - fracture -> `step_count -= intensity * 1` (`FRACTURE_STEP_REDUCTION_PER_INTENSITY`) - parry reduction se success 8. Damage roll + step_flat_bonus + resistance + armor (con
      perforazione da PT spend) 9. **NUOVO — Status auto-trigger su attack success**: - Somma `on_hit_stress_delta` di tutti i trait dell'attaccante,
      applica al target (clamp [0,1]), chiama
      `check_stress_breakpoints` -> log in `statuses_applied` - Per ogni trait con `on_hit_status`: target tira d20+0 vs
      `trigger_dc`, fail -> `apply_status(target, ...)` -> log 10. Accumulo `actor.pt += pt_gained` (invariato) 11. Consume AP (invariato) 12. `roll_result` + `statuses_applied` nel `turn_log_entry` - **Effetti gameplay dei 5 status** (scelta utente): - bleeding: `-intensity` HP a `begin_turn` del portatore - fracture: `-intensity * 1` allo `step_count` degli attack del portatore - disorient: `-intensity * 2` all'`attack_mod` del portatore - rage: marcato, nessun effetto gameplay (futuro) - panic: marcato, nessun effetto gameplay (futuro) - **Breakpoint stress** (Frattura draft): 0.5 -> rage (intensity 1,
      duration 3), 0.75 -> panic (intensity 1, duration 2). Crossing
      singolo: `before < 0.5 <= after` scatta rage una volta sola,
      stress gia' sopra non retrigger. - 20 nuovi test in `tests/test_resolver.py`: apply_status
      add/refresh/max, get_status absent/copy, begin_turn decay + expired,
      bleeding tick + hp clamp, attacker disorient reduces attack_mod,
      attacker fracture reduces step_count, stress breakpoints crossing
      singolo/multiplo/no-retrigger, on_hit_stress_delta + rage crossing
      integrato, on_hit_status SV fail/success/miss, statuses_applied
      logged. 3 test schema in `tests/api/contracts-trait-mechanics.test.js`:
      invariante Fase 8 su spore_psichiche_silenziate, rifiuto
      `status_id` non enum, rifiuto `on_hit_stress_delta` fuori range.
- [ ] Riaprire questo ADR se cambiamenti del resolver (parry contestuali,
      rage/panic con effetti gameplay concreti, PT pool con spese
      aggiuntive, tick effects per rage/panic, saving throw con modifier)
      richiedono modifiche retrocompatibili allo schema `combat.schema.json`
      o alla shape del layer `trait_mechanics.yaml`.

## Consumer di prodotto

Questo ADR e' recepito come vincolo tecnico dal [`Final Design Freeze v0.9 §7.3 Resolver freeze`](../core/90-FINAL-DESIGN-FREEZE.md), che dichiara lo scope shipping delle API del resolver atomico come baseline di prodotto. Il freeze non sostituisce questo ADR: in caso di conflitto, **vince l'ADR** per tutto cio' che riguarda confini architetturali e contratti tecnici (vedi [`SOURCE_AUTHORITY_MAP §4.1`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md)).
