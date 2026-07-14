---
title: 'rovine_planari: una cicatrice, non un buco -- 10 specie recuperate da un commit docs'
museum_id: M-2026-07-15-001
type: dataset
domain: [architecture]
provenance:
  found_at: 'packs/evo_tactics_pack/data/species/rovine_planari/ (10 file) + rovine_planari.ecosystem.yaml + rovine_planari_foodweb.yaml'
  git_sha_first: 'e83c810c'
  git_sha_last: 'aa92afed'
  last_modified: '2026-07-14'
  last_author: 'Eduardo Scarpelli'
  buried_reason: forgotten
relevance_score: 5
reuse_path: "packs/evo_tactics_pack/data/species/rovine_planari/*.yaml -- gia' recuperate in aa92afed; il METODO (ecosistema+foodweb come impronta -> git pickaxe -> recover) e' riusabile su ogni bioma con specie mancanti"
related_pillars: [P1, P3, P6]
status: revived
revived_by: 'aa92afed (branch fix/rovine-planari-recovery) -- 10 specie riportate dal loro commit di nascita e83c810c'
revived_on: 2026-07-14
excavated_by: repo-archaeologist
excavated_on: 2026-07-15
last_verified: 2026-07-15
---

# rovine_planari: una cicatrice, non un buco -- 10 specie recuperate da un commit docs

## Summary (30s)

- L'ADR-2026-07-14 (Decision 10) contava `rovine_planari` come **il buco piu' grande del gioco: +8 specie da inventare**. Non era un buco. Era una **cicatrice**: le 10 specie erano state **autorate per intero** il 2025-10-29 e **distrutte per danno collaterale** due giorni dopo, da un commit intitolato "docs".
- L'ecosistema e la foodweb sono **sopravvissuti** e nominavano tutte e 10 le specie **per id esatto**. Il bioma aveva l'impronta di dieci abitanti a ogni livello dello stack, e i corpi vuoti.
- **Recuperate** in `aa92afed`. Il TARGET nucleo-8 passa da ~35 a **~27 specie mancanti**. E il metodo ha un **controllo negativo**: applicato ad `atollo_obsidiana` **falsifica** il recupero -- quello e' un buco vero.

## What was buried

### La nascita -- `e83c810c` (2025-10-29)

Commit "Add Pathfinder planar ruins biome with translated species" (24 file, +2114). Autora `rovine_planari` **completo su tutti e quattro i livelli** dello stack worldgen (vedi [M-2026-04-26-012](worldgen-bioma-ecosistema-foodweb-network-stack.md)):

- bioma + ecosistema + foodweb + **10 specie autorate per intero** (88-108 righe ciascuna).
- Ogni specie con `schema_version: 1.7` e ricevuta onesta:

```yaml
receipt:
  source: PF1E.Bestiary.v1
  author: designer
  date: '2025-10-30'
  trace_hash: f47f771787d8d19cc44ceb22efef67e01b481d088b7e74815416c4462deca4cd
```

`author: designer`, non `automation`. `source: PF1E.Bestiary.v1`, non `coverage_autogen`. Questa e' la differenza che conta -- vedi [M-2026-07-15-002](lesson-receipt-provenance-scar-vs-lie.md).

Le 10: `archon-solare`, `balor-fission`, `banshee-risonante`, `bulette-fase`, `couatl-aurora`, `golem-runico`, `marilith-vault`, `otyugh-sentinella`, `rakshasa-corte`, `treant-portale`.

### La distruzione -- `5a06b64b` (2025-10-31)

Commit "docs(tri_sorgente): introduce variant docs (README, SPEC, PRIMER, CHANGELOG)".

```
932 files changed, 114 insertions(+), 302220 deletions(-)
```

**Trecentoduemiladuecentoventi righe cancellate da un commit intitolato "docs"**, workflow CI inclusi. Le 10 specie non erano il bersaglio: erano **danno collaterale**. Nessun ADR copre quel commit.

### Il restauro parziale -- `9acadc69` (2025-12-09)

"Restore Evo Tactics species inventory resources". Ha ripristinato `badlands` **con contenuto reale**, ma per `rovine_planari` e' riuscito a recuperare **solo i nomi**: 10 file da 3 righe, la cui nota lo dichiara da sola:

```yaml
notes: 'stub auto-generato per ripristinare inventario: sostituire con specifica completa.'
```

Da qui il conteggio "0 specie reali" che ha attraversato 7 mesi e l'ADR.

### Cio' che e' sopravvissuto -- l'impronta

L'ecosistema e la foodweb **non** sono stati toccati, e nominano tutte e 10 le specie **per id esatto**:

- `rovine_planari.ecosystem.yaml` -- le elenca su produttori / consumatori (primari, secondari, terziari) / decompositori; `links.species_dir` punta alla directory.
- `rovine_planari_foodweb.yaml` -- **14 nodi (10 `kind: species` + 4 `kind: resource`), 23 edge**.

Un bioma con la rete trofica intera e nessuno dentro.

## Why it was buried

Non e' stato sepolto per decisione. E' stato **raso al suolo per errore** e poi **mal ricostruito**: il "restore" ha ripristinato l'inventario (i nomi), non il contenuto. E lo stub era **onesto** -- diceva di essere uno stub -- ma nessuno ha piu' riletto la nota, e il conteggio automatico ha registrato "0 specie".

Il risultato: per 7 mesi il gioco ha creduto di **dover inventare** 8 creature che erano gia' state disegnate e vivevano nella storia di git.

## Why it might still matter

**E' gia' successo il recupero** -- `aa92afed`. Cio' che resta e' il **metodo**, ed e' quello a valere.

### Il metodo -- l'impronta prima dello scavo

1. **L'ecosistema e la foodweb sono l'impronta.** Se nominano specie per id, quelle specie **sono state pensate**. Non e' una prova che esistessero come file -- e' la domanda giusta da porre a git.
2. **Git pickaxe sull'id**: `git log --all --diff-filter=A -- '*<id>*'`. Se il file e' mai esistito, esce il commit di nascita. Se non esce nulla, non e' mai esistito.
3. **Recupera dal commit di nascita**, non dal successivo restauro (che potrebbe essere lo stub).

### Il controllo negativo (e' questo che lo rende affidabile)

Lo stesso metodo, applicato ad `atollo_obsidiana`, **falsifica** il recupero. Il suo ecosistema nomina 3 specie -- `anguis-magnetica`, `vitricyba-punctata`, `magnetocola-pastoris` -- e il pickaxe su tutti e tre **non restituisce nulla**: nessuna di esse e' **mai** esistita come file in git.

> `atollo_obsidiana` **e'** un buco vero. `rovine_planari` **era** una cicatrice. Un metodo che dice si' a tutto non serve a niente; questo dice no.

### Verifica di conformita' delle 10 recuperate

`rovine_planari.ecosystem.yaml` -> `rules.at_least` chiede **>=1** per ognuno di apex / keystone / bridge / threat / event. Il set recuperato consegna, dai `flags` delle specie: **apex 1, keystone 2, bridge 2, threat 3, event 1**. Tutte e cinque le regole soddisfatte. Tutte e 10 passano la Decision 5 di ADR-2026-07-14.

## Concrete reuse paths

1. **Minimal** (P0, ~0h -- gia' fatto): le 10 specie sono in tree su `fix/rovine-planari-recovery` (`aa92afed`). Nessuna azione.
2. **Moderate** (P1, ~2h): applica il metodo **impronta -> pickaxe -> recover** a **ogni altro bioma** con specie nominate dall'ecosistema e mancanti dal filesystem. Costo per bioma: ~15 min (il pickaxe risponde si'/no in un comando). Aspettativa realistica: **quasi tutti saranno buchi veri** -- come `atollo_obsidiana`. Il valore e' che il no costa 15 minuti e il si' vale 8 specie.
3. **Full** (P2, ~4h): promuovi il controllo a **gate**: uno script che, per ogni id specie nominato in un `*.ecosystem.yaml` o `*_foodweb.yaml` e assente da `data/species/`, cerca il commit di nascita e **fallisce con il SHA** se ne trova uno. Un file cancellato per sbaglio non dovrebbe poter diventare un requisito di design.

## Sources / provenance trail

Git history verificata in questa sessione (`git show <sha> --stat`):

| SHA        | data       | messaggio                                                         | ruolo                                            |
| ---------- | ---------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| `e83c810c` | 2025-10-29 | Add Pathfinder planar ruins biome with translated species         | nascita: bioma + eco + foodweb + **10 specie**   |
| `5a06b64b` | 2025-10-31 | docs(tri_sorgente): introduce variant docs                        | **932 file, -302220 righe** -- danno collaterale |
| `9acadc69` | 2025-12-09 | Restore Evo Tactics species inventory resources                   | ripristina i **nomi**: 10 stub da 3 righe        |
| `aa92afed` | 2026-07-14 | feat(species): recover 10 rovine_planari species lost in 5a06b64b | **recupero** (16 file, +2743)                    |

- Impronta ecosistema: [packs/evo_tactics_pack/data/ecosystems/rovine_planari.ecosystem.yaml](../../../packs/evo_tactics_pack/data/ecosystems/rovine_planari.ecosystem.yaml)
- Impronta foodweb: [packs/evo_tactics_pack/data/foodwebs/rovine_planari_foodweb.yaml](../../../packs/evo_tactics_pack/data/foodwebs/rovine_planari_foodweb.yaml) -- 10 nodi specie, 23 edge
- Specie recuperate: [packs/evo_tactics_pack/data/species/rovine_planari/](../../../packs/evo_tactics_pack/data/species/rovine_planari/)
- Controllo negativo: [packs/evo_tactics_pack/data/ecosystems/atollo_obsidiana.ecosystem.yaml](../../../packs/evo_tactics_pack/data/ecosystems/atollo_obsidiana.ecosystem.yaml) -- 3 specie mai esistite

## Risks / open questions

- **L'ADR va corretto**: Decision 10 di ADR-2026-07-14 dice `rovine_planari +8`. E' **coperto**. Il gap TARGET nucleo-8 scende da ~35 a **~27**. Finche' l'ADR non e' emendato, resta un documento che chiede di inventare cio' che esiste.
- **23 tratti orfani** viaggiano con le 10 specie recuperate. Non sono stati ne' scartati ne' fabbricati: sono preservati sotto `pending_trait_definitions:`. Vedi [M-2026-07-15-003](lesson-species-authored-ahead-of-trait-catalog.md). **Non regenerare il trait-bridge da quei riferimenti** senza averli prima autorati.
- **Movente ignoto**: perche' un commit di documentazione ha cancellato 302k righe e i workflow CI? Nessun ADR, nessuna issue. Stessa domanda aperta di [M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md) su `7c62b510`/`9acadc69`. Il pattern e' ricorrente: **i commit di "docs" e "restore" di questo repo hanno una storia di distruzione di dati**.

## Cross-links

- [M-2026-07-15-002 -- `receipt.source` e' il discriminante, non il numero di righe](lesson-receipt-provenance-scar-vs-lie.md) -- **la lezione di questo recupero**
- [M-2026-07-15-003 -- Specie autorate prima del catalogo tratti](lesson-species-authored-ahead-of-trait-catalog.md)
- [M-2026-07-14-001 -- Coverage fabbricata: 5 strati impilati](lesson-coverage-fabrication-five-layers.md) -- **la meta' opposta**: li' si rimuove il falso, qui si recupera il vero
- [M-2026-04-26-012 -- Worldgen Stack 4-livelli](worldgen-bioma-ecosistema-foodweb-network-stack.md) -- lo stack che ha reso possibile leggere l'impronta
