---
title: 'Istruttoria TKT-ANCESTOR-TRAIT-NATIVE-RENAME -- audit + rename-map + schema-ripple brief'
date: 2026-06-23
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [trait, ancestor, naming, rename, schema-ripple, istruttoria, master-dd-gated]
---

# Istruttoria -- TKT-ANCESTOR-TRAIT-NATIVE-RENAME

> **NATURA**: istruttoria (research/prep) READ-ONLY. NON una decisione di
> naming/design. Tutte le "RACCOMANDAZIONI" sotto sono advisory analyst-side
> (WARN Claude autonomous -- pending master-dd review). Il rename effettivo dei
> 290 `ancestor_*` id (e qualsiasi cambio della convention Phase-2 ratificata)
> resta una **decisione master-dd** + una PR di esecuzione separata e ratificata.
> Nessun file dati e' stato modificato (forbidden-path `data/core/traits/`).

## DECISIONE master-dd (2026-06-23)

> Aggiornamento post-review. Le sezioni 1-7 sotto sono l'istruttoria originale
> (analisi pre-decisione: raccomandava B). Questo blocco registra la scelta presa
> e PREVALE sulle raccomandazioni advisory.

- **Direzione scelta: Opzione C** -- blanket rename dei 290 `ancestor_*` a id nativi
  Evo-Tactics, nuova convention che supersede Phase-2 / `ADR-2026-04-27`.
- **La provenienza NON e' un vincolo.** master-dd chiarisce: i 297 neuron del wiki
  `ancestors.fandom.com` sono stati usati SOLO come ISPIRAZIONE; i trait derivati
  verranno trasformati sostanzialmente in lavorazione (effetti + nomi propri
  Evo-Tactics) fino a non essere piu' riconducibili all'originale. Quindi nessun
  obbligo di attribuzione CC BY-NC-SA da preservare e i campi `legacy_code` /
  `provenance` diventano inutili (da RIMUOVERE col rename, non da conservare).
  L'argomento "diluisce la tracciabilita' legale" tra i contro di C (sez. 7) DECADE.
- **Restano i costi TECNICI di C** (non legali), che governano l'esecuzione:
  136/290 collisioni in 79 gruppi -> servono ~215 nomi tematici/disambiguati (75 id
  hanno gia' un candidato meccanico univoco); policy DC-01 (design-block per-trait
  o emend del gate); ripple sulle 5 superfici live + generatore/proposal; supersede
  esplicito dell'`ADR-2026-04-27`.
- **Seed #2986 (`fr_06/07/08`): deferred** -- deciso dentro il piano di esecuzione C.

Il rename C resta una **PR separata e ratificata**. Questo doc + PR = istruttoria con
la decisione registrata; il piano di esecuzione C e' il prossimo step.

## TL;DR (il punto piu' importante)

Gli id "brutti" tipo `ancestor_autocontrollo_velocita_di_elaborazione_interna_fr_06`
**NON sono sludge di import** -- sono l'output di una **convention Phase-2 ratificata
da master-dd il 2026-04-27** (`ancestor_<branch_it>_<name_it>_<code_suffix>`) il cui
scopo esplicito e' **preservare la provenienza wiki** (CC BY-NC-SA 3.0,
`ancestors.fandom.com`) + il `legacy_code` + la tassonomia branch. Vedi
`ADR-2026-04-27-ancestors-recovery-canonical.md` + `tools/py/ancestors_apply_phase2.py`.

Tre conseguenze che cambiano la domanda:

1. **Il layer player-facing esiste gia'.** Ogni entry ha `label_it` pulito (il seed
   mostra "Velocita' di Elaborazione Interna"). Lo styleguide 00E dice esplicitamente
   che il bruttore dell'id si risolve col **display label, non col rename dell'id**
   ("Non rinominare slug legacy senza migration esplicita", 00E righe 18-22).
2. **Il prefisso `ancestor_` e' load-bearing.** `tools/lint/trait_schema_gate.py:129`
   ESENTA gli `ancestor_*` dal design-block obbligatorio (`tier`/`famiglia_tipologia`/
   `slot_profile`, policy DC-01). Rinominare a id nativo = perdere l'esenzione =
   **schema-gate HARD-FAIL** finche' non si backfilla il design-block o si cambia la gate.
3. **Lo strip meccanico collide in massa.** I 290 id collassano a **154 candidati
   nativi unici** (slugify del `label_it`): **136 andrebbero persi a collisione** (79
   gruppi). Il seed stesso e' una **collisione 3x** (`fr_06/07/08` hanno label
   identico) -- ed e' proprio per questo che l'utente ha proposto un nome *tematico*
   (`mente_focalizzata`) e non uno strip. Il `_<code_suffix>` esiste apposta per
   disambiguare questi tripli.

**Quindi il "rename a id nativi" non e' cleanup meccanico: e' o (A) un non-problema
risolto dal display layer, o (B) una promozione per-trait con naming tematico
master-dd al momento del consumo, o (C) un cambio-convention totale ad alto costo.**
Raccomandazione advisory: **B (promote-on-use)**, partendo dal seed gia' tirato in
Form-Pulse (#2986). Vedi sez. 6-8.

## 1. Provenienza: cosa sono gli `ancestor_*` trait

- **Fonte**: recovery del wiki `ancestors.fandom.com` (gioco "Ancestors: The
  Humankind Odyssey") -- 297 "neuron" trait. CSV immutabile
  `reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv`
  (manifest v07, sha pinnato). License nominale **CC BY-NC-SA 3.0**.
  **[Superato dalla DECISIONE 2026-06-23]**: master-dd chiarisce che il wiki e' stato
  solo ispirazione e i derivati sono trasformati sostanzialmente -> NESSUN obbligo di
  attribuzione da preservare. Questo punto NON e' piu' un blocco al rename.
- **Canonizzazione**: `docs/adr/ADR-2026-04-27-ancestors-recovery-canonical.md` +
  apply summary `docs/reports/2026-04-27-ancestors-phase-2-apply-summary.md`.
- **Stato orphan**: famiglia distinta dai 109 orphan core-wave (quelli nativi tipo
  `mente_lucida`/`cervello_predittivo` dell'istruttoria
  `2026-06-22-tkt-p6-trait-orphan-design-b-istruttoria.md`). L'audit-fonte nota:
  "gli `ancestor_*` NON sono nei 109 orphan core" -- sono i "+22 ancestor tag-gated".
  Museum card: `docs/museum/cards/ancestors-297-orphan-2026-05-10.md`.
- **Consumo attuale**: largamente orphan-by-species (0 ref in `species_catalog.json`);
  solo 30 id raggiungibili via PCG `biome_pools.json`. Il seed e' tirato ora in
  Form-Pulse minor-trait pool (Game #2986).

## 2. Il reframe: la convention Phase-2 e' ratificata, non accidentale

`tools/py/ancestors_style_guide_proposal_v2.py` (header) registra le 3 decisioni
master-dd del **2026-04-27 sera**:

- **Q1 = b**: convention `_<code_suffix>` (es. `..._fr_06`), marchio Evo-Tactics, NO `_NN`.
- **Q2 = B**: full editorial pass IT -- tutti i 297 hanno `label_it` valorizzato.
- **Q3 = B**: italianize ID base (`ancestor_autocontrollo_*` non `ancestor_self_control_*`).

Formato id canonico ratificato: **`ancestor_<branch_it>_<name_it>_<code_suffix>`**.

Lo styleguide A1 `docs/core/00E-NAMING_STYLEGUIDE.md` rinforza il modello a doppio
livello: **id canonico stabile (anche brutto) + display localizzato**. Per i trait
(00E "Trait / tratto"): code = `trait` EN snake_case in `active_effects.yaml`; prose
IT = `tratto`. Lo stesso principio "non rinominare slug legacy senza migration
esplicita" e' scritto a riga 18-22.

> **Implicazione**: il bruttore percepito e' nel CODE-id, ma il player vede gia'
> `label_it`. Il dolore reale dell'utente non e' display -- e' **ergonomia di
> authoring**: l'id lungo leakka nelle definizioni di pool/spec (#2986), nelle chiavi
> glossary, nei riferimenti. Questa distinzione e' la domanda-cardine per master-dd
> (sez. 8).

## 3. Audit ground-truth (2026-06-23, worktree off `origin/main` b9f35aa5)

Tool riproducibile: `tools/py/ancestors_native_rename_audit.py` (read-only) ->
artifact `docs/planning/ancestor-trait-native-rename-candidates.csv` (290 righe).

### 3.1 Inventario

| Metrica | Valore |
| --- | --- |
| `ancestor_*` trait-id keys in `active_effects.yaml` | **290** |
| entry in `glossary.json` (297 totali; 290 wired + 7 glossary-only) | 297 |
| con `label_it` pulito gia' iniettato | 290/290 |
| con `provenance.code` (legacy wiki code) preservato | 290/290 |
| candidati nativi UNICI (slugify del label_it) | **154** |
| righe perse a collisione se strip meccanico | **136** (79 gruppi) |
| collisione con id nativo gia' esistente | 1 |

### 3.2 Tassonomia (decode del pattern `ancestor_<branch>_<name>_<code>_<NN>`)

Branch (2o token): `medicina` 54, `sensi` 37, `destrezza` 33, `deambulazione` 26,
`motricita` 20, `comunicazione` 20, `intelligenza` 14, + genera ominine
(`ardipithecus` 13, `australopithecus` 12, `orrorin` 8 -- tema "ancestor"
intenzionale), `onnivoro` 11, `insediamento` 10, `schivata` 8, `autocontrollo` 8,
`attacco` 7, `nuoto` 5, `metabolismo` 4. Suffix-code (38 distinti: `ab` 26, `wa` 17,
`st` 15, `so` 15, ...) = abbreviazione branch+sequenza wiki, **disambiguatore di
collisione** (vedi 3.3).

### 3.3 La collisione e' il finding centrale

Top gruppi di collisione (candidato nativo -> quante entry collassano):

```
 10x  vie_dopaminergiche
  6x  metabolismo_xenobiotico
  5x  efficienza_dei_propriocettori
  4x  destrezza_manuale
  4x  chemotopia_odoranti
  3x  velocita_di_elaborazione_interna   <- IL SEED
  3x  contromanovra / azione_evasiva / resistenza_al_dolore / ...
```

**Seed worked example** -- `ancestor_autocontrollo_velocita_di_elaborazione_interna_fr_06`:

| old_id | label_it | tier | status | collisione |
| --- | --- | --- | --- | --- |
| `..._fr_06` | Velocita' di Elaborazione Interna | T1 | focused | INTRA x3 |
| `..._fr_07` | Velocita' di Elaborazione Interna | T1 | focused | INTRA x3 |
| `..._fr_08` | Velocita' di Elaborazione Interna | T1 | focused | INTRA x3 |

I 3 sono near-duplicati (stesso label/tier/effetto `focused`), distinti solo dal
trigger (fr_06 ha `requires_target_tag: predator`). Lo strip meccanico ->
`velocita_di_elaborazione_interna` x3 = **impossibile senza disambiguazione**. La
proposta utente `mente_focalizzata` e' un nome **tematico off-effect** (focused) per
fr_06 -- ma servirebbero **2 nomi distinti in piu'** per 07/08, OPPURE una decisione
di dedup (servono 3 applier di `focused`?). E' la stessa classe di domanda di
`antenne_wideband` near-dup nell'istruttoria 2026-06-22 -> **design-call master-dd**.

## 4. Il prefisso `ancestor_` e' load-bearing (DC-01)

`tools/lint/trait_schema_gate.py` righe 123-130:

```python
if str(trait_id).startswith("ancestor_"):
    continue   # DC-01: ancestor-prefixed esente da design-block
```

I trait non-`ancestor_` in path index-shaped / per-trait DEVONO avere
`tier`/`famiglia_tipologia`/`slot_profile` (HARD su per-trait file). Rinominare un
`ancestor_*` a id nativo lo fa **uscire dall'esenzione** -> il gate richiede il
design-block. Quindi ogni rename porta con se' **uno di**:

- (i) backfill `famiglia_tipologia` + `slot_profile` per ogni id rinominato, **oppure**
- (ii) un emendamento esplicito della policy DC-01 nel gate.

Questo NON e' nel grep degli id -- e' una dipendenza semantica del prefisso. E' il
motivo per cui un "rename = string-replace" sottostima il blast-radius.

## 5. Schema-ripple scope (deliverable #3) -- verificato per-superficie

Stato: **(LIVE)** ref reali presenti / **(NONE)** nessun ref (no ripple) /
**(POLICY)** dipendenza non-stringa.

| # | Superficie | ancestor ref | Impatto del rename |
| --- | --- | --- | --- |
| 1 | `data/core/traits/active_effects.yaml` (chiavi) | **290** (LIVE) | rinomina chiave trait |
| 2 | `active_effects.yaml` (`log_tag` self-ref) | **23** (LIVE) | rinomina valore log_tag in-block |
| 3 | `data/core/traits/glossary.json` (chiavi) | **297** (LIVE) | rinomina chiave glossary (+7 glossary-only) |
| 4 | `data/core/traits/biome_pools.json` (PCG pool membership) | **30 id distinti** (LIVE) | rinomina stringhe; ref orfana = pool rotto |
| 5 | `tests/services/enemyTagGate.test.js` | **5 id / 15 occorrenze** (LIVE) | rinomina ref test |
| 6 | `tools/lint/trait_schema_gate.py` (DC-01) | prefisso (POLICY) | esenzione persa -> backfill design-block o emend gate (sez. 4) |
| 7 | `tools/py/ancestors_apply_phase2.py` + `_v2.py` | generatori (POLICY) | id derivato da convention -> rigenerare o ritirare il generatore |
| 8 | `data/core/ancestors/ancestors_rename_proposal_v1/v2.yaml` | `id_new` source | superseded/aggiornato dalla nuova convention |
| 9 | `reports/incoming/ancestors/*.csv` | source immutabile | **NON rinominare** (provenienza CC BY-NC-SA / legacy_code) |
| 10 | `data/traits/index.json` + `index.csv` | **0** (NONE) | ancestors non indicizzati (gap separato, non ripple) |
| 11 | `packs/.../trait_mechanics.yaml` | **0** (NONE) | nessuna mechanics ancestor |
| 12 | `packs/.../docs/catalog/trait_glossary.json` + `trait_reference.json` | **0** (NONE) | non esportati al catalog |
| 13 | `Game-Database` (sibling repo) | **0** (NONE) | non sincronizzati -> nessun ripple DB |
| 14 | `data/core/species/*.json` (`trait_refs`) | **0** (NONE) | orphan-by-species (istruttoria 2026-06-22) |

**Minimo bundle atomico per un rename** = superfici **1+2+3+4+5** nella STESSA PR
(string refs) **+** decisione su **6** (DC-01) **+** **7/8** (generatore/proposal
allineati) **+** la nota provenienza **9**. Surfaces 10-14 = zero ripple oggi.

> Validare sempre con `/trait-lint` (cross-check A/M/G/C/R) + `python
> tools/lint/trait_schema_gate.py --check ...` DOPO ogni batch di rename. Il
> `git fetch + read origin/main` e' obbligatorio prima di scoping (questo doc gia'
> autorato off `origin/main`, non dal checkout detached stale).

## 6. Rename-map proposal (deliverable #2)

### 6.1 Convention nativa proposta (deterministica, floor)

`native_id = slugify(label_it)`  -- droppa `ancestor_` + branch + `_<code>`.
Es. "Velocita' di Elaborazione Interna" -> `velocita_di_elaborazione_interna`.
E' gia' "clean snake_case Italian" strutturalmente, ma **(a)** spesso ancora lungo,
**(b)** collide 136 volte (sez. 3.3). NON e' il nome tematico evocativo del seed.

### 6.2 La mappa completa = artifact CSV

`docs/planning/ancestor-trait-native-rename-candidates.csv` (290 righe, colonne:
`old_id, native_candidate, collision, label_it, label_en, tier, category,
effect_kind, status, prov_code, in_glossary, in_biome_pools, in_test,
logtag_selfref`). E' un **first-pass meccanico riproducibile**, NON una mappa
tematica ratificabile: le 136 righe `collision` richiedono naming per-trait.

### 6.3 Tier di naming (la decisione e' QUALE tier)

- **Tier-1 meccanico** (CSV): deterministico, ma 136 collisioni -> inadatto come-e'.
- **Tier-2 tematico** (es. `mente_focalizzata`): evocativo + disambigua, ma e'
  **~290 decisioni creative master-dd** (non automatizzabile; il seed lo dimostra).

### 6.4 Worked subset raccomandato (promote-on-use)

Invece di 290 nomi inventati, la mappa parte dai trait **effettivamente consumati
ora**. Il seed (Form-Pulse #2986):

| old_id | proposta tematica | nota |
| --- | --- | --- |
| `ancestor_autocontrollo_velocita_di_elaborazione_interna_fr_06` | `mente_focalizzata` | seed utente; off-effect `focused`; OK |
| `..._fr_07` | (TBD master-dd) | near-dup; dedup o nome distinto |
| `..._fr_08` | (TBD master-dd) | near-dup; dedup o nome distinto |

Per ogni id promosso: drop prefisso -> aggiungi design-block (DC-01) -> aggiorna
superfici 1-5 -> registra `legacy_id`/`legacy_code` (provenienza). Modello
"migration incrementale + legacy_slug" dello styleguide 00E applicato ai trait.

## 7. Opzioni + trade-off + blast-radius + RACCOMANDATO (advisory)

### Opzione A -- status quo + display layer (zero rename)
- **Cosa**: tieni gli `ancestor_*` id stabili; il player vede `label_it`; i pool/spec
  referenziano per id ma MOSTRANO label_it.
- **Trade-off**: 0 ripple, provenienza + DC-01 intatti, 0 rischio collisione. Ma
  l'ergonomia di authoring resta (id lunghi nelle definizioni pool/#2986).
- **Blast-radius**: nullo.

### Opzione B -- promote-on-use, naming tematico per-trait (advisory; NON scelta)
- **Cosa**: quando un `ancestor_*` entra in gameplay attivo (assegnato a specie o a un
  pool come #2986), gli dai un id nativo tematico in quel momento, con migration
  completa (superfici 1-5 + design-block + `legacy_id`). Gli altri restano `ancestor_*`.
- **Trade-off**: risolve il dolore dove conta (trait consumati), provenienza
  preservata via `legacy_id`, collisioni evitate perche' naming tematico per-trait.
  Costo: 1 mini-migration per trait promosso (piccolo, atomico).
- **Blast-radius**: per-trait, basso. Parte dal seed #2986.
- **RACCOMANDATO**: B. Allinea con lo styleguide 00E (migration esplicita) + con la
  natura orphan (la maggior parte non e' consumata -> non urge rinominarla).

### Opzione C -- blanket rename tutti i 290 (cambio-convention totale) -- SCELTA 2026-06-23
- **Cosa**: nuova convention "tutto nativo", supersede Phase-2 + `ADR-2026-04-27`.
- **Trade-off**: massimo cleanup. Costi TECNICI reali: 136 collisioni in 79 gruppi da
  disambiguare (215 trait), emend DC-01 o backfill design-block, ripple superfici 1-9,
  ritiro generatore/proposal. **Il contro "diluisce CC BY-NC-SA" DECADE**: master-dd ha
  chiarito uso-ispirazione (vedi DECISIONE in cima) -> i campi `provenance`/`legacy_code`
  vanno rimossi, non preservati.
- **Blast-radius**: massimo (tutte le superfici 1-9).
- **ESITO**: **SCELTA da master-dd il 2026-06-23.** La mia raccomandazione advisory era
  B, ma la rimozione del vincolo-provenienza cambia il bilancio costi/benefici a favore
  di C. Esecuzione = PR separata ratificata (vedi piano).

## 8. Cosa deve decidere master-dd

1. **Il dolore e' display o authoring?** Se display -> Opzione A (gia' risolto da
   `label_it`). Se authoring-ergonomia -> B o C.
2. **Convention**: tenere Phase-2 `ancestor_<branch>_<name>_<code>` (provenienza) o
   cambiarla? (C supersede l'ADR 2026-04-27 -> serve ratifica esplicita.)
3. **DC-01**: se si rinomina, backfill design-block per-trait (i) o emendare il gate (ii)?
4. **Seed #2986**: ratificare `mente_focalizzata` per fr_06 + decidere fr_07/08
   (dedup o 2 nomi distinti)?
5. **Tier di naming**: meccanico (CSV, ma 136 collisioni) vs tematico (~290 decisioni)?

## 9. Disclaimer

Questo doc NON decide nulla. Le RACCOMANDAZIONI sono advisory analyst-side e vanno
ratificate da master-dd (naming/trait design = master-dd subjective, CLAUDE.md).
Nessun file in `data/core/traits/`, `glossary.json`, `biome_pools.json` o sotto
`reports/incoming/ancestors/` e' stato modificato (istruttoria read-only). L'unico
output e' questo doc + il CSV candidate-map + il tool audit riproducibile.
