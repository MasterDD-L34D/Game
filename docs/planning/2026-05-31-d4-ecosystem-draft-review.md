---
doc_status: review_needed
doc_owner: master-dd
workstream: dataset-pack
last_verified: '2026-05-31'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [d4, worldgen, ecosystem, biome-affinity, triage, band-verify, master-dd]
---

# D4 — Triage dei 18 draft ecosystem (review aid pre band-verify)

> **Scopo**: de-rischiare il gate human-only `band-verify -> promote`. I 18 draft
> generati da `generate_ecosystem_yaml.py` (mergiati in [#2480](https://github.com/MasterDD-L34D/Game/pull/2480),
> `docs/planning/ecosystems-draft/`) NON sono food web pronti. Questo doc li
> classifica per readiness cosi master-dd non spreca run N=40 su draft strutturalmente rotti.
>
> **Niente e' stato promosso.** I draft restano in `docs/planning/`. `packs/.../data/ecosystems/`
> (canonical, band-gated) intoccato. `rovine_planari` off-limits (D6).

## ⚠️ Finding sistemico: 17/18 draft hanno ZERO produttori

Le 32 specie assegnate da D4 sono in stragrande maggioranza consumatori / apex /
threat. L'heuristic tier-inference (`generate_ecosystem_yaml.py`) le raggruppa in
tier, ma senza una base di **produttori** un `ecosistema.trofico` e' una catena
trofica senza fondamento -> food web rotto. **Solo `savana` ha 1 produttore**
(`sp_arenaceros_placidus`, trait `membrane_eliofiltranti`).

Implicazione: i draft sono un **aiuto di raggruppamento specie per bioma**, non
ecosistemi promuovibili as-is. Ogni promozione richiede prima una **fonte di
produttori** (vedi azioni sotto).

## Tabella readiness (conteggi tier per draft)

| bioma                       | vs canonical | prod | pri | sec | ter | dec | tot | flag                    |
| --------------------------- | ------------ | ---: | --: | --: | --: | --: | --: | ----------------------- |
| abisso_vulcanico            | NEW          |    0 |   1 |   0 |   3 |   1 |   5 | NO-PRODUCER             |
| atollo_obsidiana            | NEW          |    0 |   0 |   1 |   1 |   1 |   3 | NO-PRODUCER             |
| badlands                    | **MERGE**    |    0 |   0 |   1 |   1 |   1 |   3 | NO-PRODUCER             |
| caldera_glaciale            | NEW          |    0 |   1 |   2 |   0 |   0 |   3 | NO-PRODUCER             |
| canopia_ionica              | NEW          |    0 |   0 |   0 |   2 |   0 |   2 | NO-PRODUCER             |
| canyons_risonanti           | NEW          |    0 |   0 |   2 |   1 |   0 |   3 | NO-PRODUCER             |
| caverna                     | NEW          |    0 |   1 |   2 |   0 |   0 |   3 | NO-PRODUCER             |
| dorsale_termale_tropicale   | NEW          |    0 |   1 |   1 |   0 |   0 |   2 | NO-PRODUCER             |
| foresta_acida               | NEW          |    0 |   0 |   0 |   1 |   0 |   1 | NO-PRODUCER + SINGLETON |
| foresta_temperata           | **MERGE**    |    0 |   0 |   1 |   0 |   1 |   2 | NO-PRODUCER             |
| frattura_abissale_sinaptica | NEW          |    0 |   1 |   1 |   4 |   2 |   8 | NO-PRODUCER             |
| mezzanotte_orbitale         | NEW          |    0 |   0 |   0 |   1 |   0 |   1 | NO-PRODUCER + SINGLETON |
| palude                      | NEW          |    0 |   1 |   3 |   2 |   0 |   6 | NO-PRODUCER             |
| pianura_salina_iperarida    | NEW          |    0 |   2 |   1 |   0 |   0 |   3 | NO-PRODUCER             |
| reef_luminescente           | NEW          |    0 |   0 |   1 |   0 |   0 |   1 | NO-PRODUCER + SINGLETON |
| savana                      | NEW          |    1 |   0 |   0 |   3 |   0 |   4 | ok (food web minimo)    |
| steppe_algoritmiche         | NEW          |    0 |   1 |   0 |   0 |   0 |   1 | NO-PRODUCER + SINGLETON |
| stratosfera_tempestosa      | NEW          |    0 |   0 |   1 |   1 |   0 |   2 | NO-PRODUCER             |

Totali: **18 draft | NO-PRODUCER=17 | MERGE-into-canonical=2 | SINGLETON=4**.

## Triage in 3 categorie (ordine di promozione consigliato)

### 1. MERGE-into-canonical — rischio piu basso (2)

`badlands` e `foresta_temperata` hanno GIA' un ecosystem canonical ricco in
`packs/evo_tactics_pack/data/ecosystems/` (clima + composizione_aria + abiotico +
**produttori reali**, es. badlands `arbusti_xerofili / crostoni_criptofite /
cianobatteri`). Il draft NON va promosso come file: va **fuso** — aggiungere le
nuove specie consumer ai tier del canonical esistente. Il canonical fornisce gia'
i produttori, quindi il NO-PRODUCER del draft non e' un problema dopo il merge.

- `badlands` += `ferriscroba-detrita`, `ferrimordax-rutilus`, `rubrospina-velox`
- `foresta_temperata` += `nebulocornis-mollis`, `arboryxis-lenis`

⚠️ NON sovrascrivere il canonical col draft (si perderebbero clima/aria/abiotico/produttori).

### 2. NEW net-new che richiedono base produttori (12)

`abisso_vulcanico`, `atollo_obsidiana`, `caldera_glaciale`, `canopia_ionica`,
`canyons_risonanti`, `caverna`, `dorsale_termale_tropicale`,
`frattura_abissale_sinaptica`, `palude`, `pianura_salina_iperarida`, `savana`,
`stratosfera_tempestosa`.

Nessun ecosystem canonical esiste per questi biomi. Prima del band-verify ognuno
serve una **base di produttori** — scelta di design master-dd, due opzioni:

- (a) assegnare specie produttrici esistenti (chemiosintetiche/fotosintetiche) al bioma; oppure
- (b) autorizzare nuove specie produttrici per il bioma.

`savana` e' l'unico con 1 produttore -> food web minimo gia' presente (candidato pilota).

### 3. SINGLETON / troppo sottili (4)

`foresta_acida`, `mezzanotte_orbitale`, `reef_luminescente`, `steppe_algoritmiche`
= 1 specie ciascuno. Troppo sottili per un ecosystem stand-alone. Defer o fold
in un bioma adiacente fino a piu specie assegnate.

## Namespace: OK

`generate_ecosystem_yaml.py --id-field slug` emette slug runtime con trattino
(`ferriscroba-detrita`). Coincide con il namespace `reinforcement_pool.unit_id`
dei canonical esistenti (badlands usa `sand-burrower`, `rust-scavenger`). Quindi
`foodwebFilter` (GAP-A) matcha senza remap. ✅

## Checklist master-dd prima del band-verify (per draft promosso)

1. Risolvere il NO-PRODUCER (merge in canonical OR sourcing produttori, categorie 1-2).
2. Per i NEW: creare anche il companion `<biome>.biome.yaml` (+ `.manifest.yaml` se serve)
   come per i canonical esistenti — il draft emette solo `.ecosystem.yaml`.
3. Verificare i 5 pick C low-confidence (vedi PR #2480 body: `ventornis`,
   `nebulocornis`, `rubrospina`, `arboryxis`, `lucinerva`) — una riassegnazione
   cambia il bioma di destinazione del draft.
4. **N=40 band-verify** se il bioma tocca uno scenario reinforcement
   (HC06 [15-25%] / HC07 [30-50%] devono restare in banda) PRIMA di copiare in
   `packs/evo_tactics_pack/data/ecosystems/`.
5. `rovine_planari` resta off-limits (D6).

## Provenienza

- SOT catalog: `data/core/species/species_catalog.json` (53/53 `biome_affinity`, post #2480 squash `85d4e909`).
- Draft sorgente: `docs/planning/ecosystems-draft/*.ecosystem.yaml` (#2480).
- Tool: `tools/py/generate_ecosystem_yaml.py` (tier-inference heuristic).
- Questo doc = ⚠️ triage autonomo Claude, pending review master-dd (i criteri di
  readiness/priorita possono differire). Nessun file canonical modificato.
