---
title: "`receipt.source` e' il discriminante, non il numero di righe: distinguere una cicatrice da una bugia"
museum_id: M-2026-07-15-002
type: decision
domain: [architecture]
provenance:
  found_at: 'packs/evo_tactics_pack/data/species/**/*.yaml -- campo `receipt` (source + author)'
  git_sha_first: '089b6aa0'
  git_sha_last: 'aa92afed'
  last_modified: '2026-07-14'
  last_author: 'Eduardo Scarpelli'
  buried_reason: forgotten
relevance_score: 5
reuse_path: "packs/evo_tactics_pack/data/species/**/*.yaml:2-6 -- il campo `receipt` e' l'unico filtro affidabile prima di QUALSIASI recupero di massa da git"
related_pillars: [P1, P3, P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-07-15
last_verified: 2026-07-15
---

# `receipt.source` e' il discriminante, non il numero di righe

## Summary (30s)

- Questa card e' **la meta' opposta** di [M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md). Quella insegnava _remove-then-remeasure_: **rimuovi il falso**. Questa insegna il fallimento inverso: **uno stub onesto sopravvissuto a un restauro parziale NON e' uno stub fabbricato**, e trattarlo come tale **distrugge contenuto reale**.
- Un grep ingenuo -- _"recupera ogni stub da 3 righe che una volta aveva contenuto"_ -- restituiva **34 file**. **21** di quelli sono `*-trait-keeper.yaml` che in git pesano **59 righe**: sembrano ricchi. La loro ricevuta dice `source: coverage_autogen` / `author: automation`. Sono **esattamente lo strato fabbricato** che il repo aveva appena passato un giorno a rimuovere. Recuperarli avrebbe **re-introdotto la malattia**.
- **Il numero di righe non e' un segnale. La provenienza si'.** `receipt` e' il marcatore onesto che e' sopravvissuto a ogni strato di fabbricazione, ed e' l'unica cosa che permette di distinguere una **cicatrice** da una **bugia**.

## What was buried

Il campo `receipt`, in testa a ogni file specie del pack. Non e' consumato dal runtime, non e' letto da nessun gate, non compare in nessun report. E' l'unica cosa nel catalogo che dica **chi ha scritto questo file e da dove viene**.

### Le due ricevute

**Contenuto reale** (`e83c810c`, 2025-10-29 -- una delle 10 specie `rovine_planari`):

```yaml
schema_version: 1.7
receipt:
  source: PF1E.Bestiary.v1
  author: designer
  date: '2025-10-30'
  trace_hash: f47f771787d8d19cc44ceb22efef67e01b481d088b7e74815416c4462deca4cd
```

**Copertura fabbricata** (`089b6aa0`, 2025-10-29 -- stesso giorno, stesso repo, stessa dimensione d'ordine):

```yaml
schema_version: 1.7
receipt:
  source: coverage_autogen
  author: automation
  date: '2025-10-29'
  trace_hash: to-fill
```

`trace_hash: to-fill`. La ricevuta **lo dice a voce alta**.

### Il grep che stava per sbagliare

Il candidato ovvio dopo il recupero di `rovine_planari` (vedi [M-2026-07-15-001](worldgen-rovine-planari-recovery.md)) e': _"quanti altri stub da 3 righe una volta avevano contenuto?"_. Risposta pre-recupero: **34 file**. Composizione reale, verificata:

| gruppo                     | n   | righe in git | `receipt.source`   | `receipt.author` | verdetto             |
| -------------------------- | --- | ------------ | ------------------ | ---------------- | -------------------- |
| specie `rovine_planari`    | 10  | 88-108       | `PF1E.Bestiary.v1` | `designer`       | **RECUPERA** (fatto) |
| `*-trait-keeper.yaml`      | 21  | **59**       | `coverage_autogen` | `automation`     | **NON TOCCARE**      |
| 3 specie psioniche (sotto) | 3   | 80-81        | `PTPF.v1.0`        | `designer`       | reale, ma archiviato |

I 21 keeper sono i **piu' grossi** del gruppo dopo le specie vere. Se il criterio fosse stato "quanto contenuto c'era", sarebbero **passati**. E riportarli in tree avrebbe rimesso in piedi lo **strato 4** dei 5 strati di copertura fabbricata che [M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md) documenta -- dentro la stessa settimana in cui erano stati rimossi.

### I 3 recuperabili reali fuori da `rovine_planari`

Contenuto autentico, `author: designer`, `source: PTPF.v1.0`, ~80 righe, vivo in git a `5a06b64b^`:

- `psionic-canopy-scout` -- `canopia_psionica_leggera`
- `magnet-fathom-surveyor` -- `falde_magnetiche_psioniche`
- `orbital-ascendant` -- `orbita_psionica_inversa`

Vivono in biomi che l'ADR-2026-07-14 **archivia**: **non riducono il TARGET**. Ma sono contenuto autorato da un designer, e vanno registrati come **preservati in git** (`git show 5a06b64b^:<path>`), non come "stub da cancellare".

## Why it was buried

`receipt` non e' sepolto: e' **ignorato**. Nessun gate lo legge. Per sette mesi l'unica domanda posta al catalogo specie e' stata _"quante ce ne sono"_, mai _"chi le ha scritte"_.

Ed e' precisamente il motivo per cui e' sopravvissuto intatto attraverso cinque strati di fabbricazione: **un campo che nessuna metrica consuma e' un campo che nessuno ha interesse a falsificare.** L'automazione ha scritto onestamente `author: automation` perche' nessuno stava guardando.

## Why it might still matter

**E' la lezione, non l'artefatto.**

### La regola

> **Prima di qualsiasi recupero di massa da git, filtra per `receipt`, mai per dimensione.**
>
> - `author: designer` + `source` reale (`PF1E.Bestiary.v1`, `PTPF.v1.0`) -> **cicatrice**. Contenuto vero, ferito da un incidente. Recuperabile.
> - `author: automation` + `source: coverage_autogen` -> **bugia**. Copertura fabbricata. Recuperarla = re-introdurre il debito.
>
> **Un file grosso puo' essere una bugia. Un file da 3 righe puo' essere la lapide di qualcosa di vero.**

### La coppia di lezioni

| card                                                           | fallimento                                   | metodo                  |
| -------------------------------------------------------------- | -------------------------------------------- | ----------------------- |
| [M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md) | trattare il **fabbricato** come reale        | _remove-then-remeasure_ |
| **M-2026-07-15-002** (questa)                                  | trattare il **reale ferito** come fabbricato | _filter-by-provenance_  |

Sono **due meta' della stessa lezione**. Applicare solo la prima porta a cancellare cicatrici. Applicare solo la seconda porta a resuscitare bugie. Il repo ha corso entrambi i rischi **nella stessa settimana**.

### Perche' funziona

La provenienza e' l'unico attributo che **non degrada** con le trasformazioni successive. Righe, nomi, directory, conteggi: tutti riscrivibili da uno script. `receipt.author` racconta **l'atto di creazione**, e nessun restore-as-hollow-shell lo ha mai riscritto.

## Concrete reuse paths

1. **Minimal** (P0, ~0h -- gia' applicato): il recupero `aa92afed` ha usato questo filtro. Le 10 recuperate hanno tutte `author: designer`; i 21 keeper sono stati **lasciati stare**.
2. **Moderate** (P1, ~2h): rendi il filtro **eseguibile**. Uno script `tools/py/audit_receipts.py` che classifichi ogni file specie in `designer` / `automation` / `senza receipt` e stampi i conteggi. Il terzo gruppo -- **nessuna ricevuta** -- e' quello da guardare per primo: e' l'unico dove il metodo e' cieco.
3. **Full** (P2, ~4h): promuovi `receipt` da campo decorativo a **campo validato**: schema che richiede `source` + `author` non vuoti, e un gate che **rifiuta** `trace_hash: to-fill`. Un artefatto che dichiara di essere autogenerato e incompleto non dovrebbe poter entrare in `main`. Blast radius x2.0 (schema-changing) -> ~8h reali.

## Sources / provenance trail

Verificato in questa sessione:

- Ricevuta reale: `git show e83c810c:packs/evo_tactics_pack/data/species/rovine_planari/golem-runico.yaml` -> `source: PF1E.Bestiary.v1`, `author: designer`
- Ricevuta fabbricata: `git show 7c62b510^:packs/evo_tactics_pack/data/species/abisso_luminescente/abisso-luminescente-trait-keeper.yaml` -> **59 righe**, `source: coverage_autogen`, `author: automation`, `trace_hash: to-fill`
- Ricevuta reale archiviata: `git show 5a06b64b^:packs/evo_tactics_pack/data/species/canopia_psionica_leggera/psionic-canopy-scout.yaml` -> **80 righe**, `source: PTPF.v1.0`, `author: designer`
- Stub oggi in tree (<=4 righe): **24** file = **21** `*-trait-keeper.yaml` + **3** specie psioniche. (Erano **34** prima di `aa92afed`.)

| SHA        | data       | messaggio                                                 | ruolo                                 |
| ---------- | ---------- | --------------------------------------------------------- | ------------------------------------- |
| `089b6aa0` | 2025-10-29 | Add coverage trait keepers for Evo Tactics biomes         | nascita 38 keeper `coverage_autogen`  |
| `e83c810c` | 2025-10-29 | Add Pathfinder planar ruins biome with translated species | nascita 10 specie `designer`          |
| `7c62b510` | 2025-11-30 | Enhance Evo pack pipeline and derived outputs             | cancella i 38 keeper (59 righe l'uno) |
| `aa92afed` | 2026-07-14 | feat(species): recover 10 rovine_planari species          | recupero **filtrato per provenienza** |

## Risks / open questions

- **File senza `receipt`**: il metodo e' **cieco** dove la ricevuta manca. Non censito in questa sessione -- e' il primo buco da chiudere (reuse path Moderate).
- **`receipt` e' auto-dichiarato**: non e' firmato ne' verificato. Un'automazione futura _potrebbe_ scrivere `author: designer`. Oggi non e' successo (i 5 strati fabbricati hanno tutti dichiarato la verita' su se stessi), ma il campo regge **per convenzione**, non per costruzione.
- **I 21 keeper restano in tree** come stub da 3 righe. L'ADR-2026-07-14 li cancella. **Corretto: vanno cancellati, non recuperati.** Questa card esiste per garantire che qualcuno, tra sei mesi, non li veda in git a 59 righe e pensi di aver trovato un tesoro.

## Cross-links

- [M-2026-07-14-001 -- Coverage fabbricata: 5 strati impilati](lesson-coverage-fabrication-five-layers.md) -- **la meta' opposta di questa lezione**
- [M-2026-07-15-001 -- rovine_planari: una cicatrice, non un buco](worldgen-rovine-planari-recovery.md) -- il recupero che ha usato questo filtro
- [M-2026-07-15-003 -- Specie autorate prima del catalogo tratti](lesson-species-authored-ahead-of-trait-catalog.md)
