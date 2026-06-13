---
title: 'D.5 + D.6 Phase 3 Path D HYBRID — Polish Batch Collaborativo'
date: 2026-05-15
author: claude-autonomous + master-dd authority residue
status: ready-for-master-dd-ratification
workstream: dataset-pack
tags: [species, catalog, polish, visual-description, symbiosis, per-clade-voice]
---

# D.5 + D.6 Visual + Symbiosis Polish — Batch Collaborativo 2026-05-15

## Contesto

PR #2271 merged. Catalog v0.4.1 a `data/core/species/species_catalog.json` contiene
53 specie. Phase 3 Path D HYBRID ha generato 36 `visual_description` con provenance
`heuristic-pattern-A-tag-driven` e 9 `interactions.symbiosis` con provenance
`heuristic-ecology-mutualism` (filtro Apex+Keystone).

Verdict master-dd Q3 = C+B: voce per-clade + Skiv canonical per Skiv-adjacent.

Script di applicazione: `tools/py/apply_phase3_polish_d5_d6.py`

---

## 6 Registri Voce Per-Clade

### Apex — voce EPICA

Dominio, peso che spezza vento, registro mitico-tragico. Soggetto implicito: il territorio
appartiene già. Frasi lunghe con pausa finale che cade come verdetto. Nessuna
spiegazione — solo presenza.

Esempio applicato (`sp_ferrimordax_rutilus`):

> "I denti ossidoferro non lacerano: franano, come una rupe che cede. Il carapace
> ferruginoso cattura la luce in riflessi bruciati che anticipano ogni combattimento
> prima che inizi. Dove passa, la rete trofica non si richiude per settimane."

### Keystone — voce SOLENNE

Radice della rete trofica, senza cui crolla. Registro liturgico-ecologico. Il "senza di
lei" come conclusione inevitabile. Concretezza delle conseguenze, non dell'azione.

Esempio applicato (`symbiotica_thermalis`):

> "Galleggia sulla dorsale termale come un officiante sopra l'altare: il polso termico
> che emette non è aggressione, è redistribuzione. Senza il suo scheletro idraulico a
> pistoni che regola la pressione dei venti caldi, l'intera colonia corale sovrastante
> collassa in stagioni. Non è il più forte — è ciò senza cui il forte non esiste."

### Threat — voce TENSA

Ogni passo un avviso. Immobilità predatoria. Registro sinistro. Dettagli anatomici
come minaccia latente. Il predatore vince prima dell'azione.

Esempio applicato (`sonaraptor_dissonans`):

> "Nell'istante prima dell'attacco, tutta la canopia ionica diventa silenziosa: il
> suo campo di interferenza acustica precede il corpo di due secondi. La lancia
> sonica che emette non è un grido — è la negazione del suono altrui."

### Bridge — voce CURIOSA

Confine tra habitat, annusatore di soglie. Registro lirico-osservativo. Il personaggio
non appartiene a nessun centro, è attratto dai margini. Movimento come esplorazione,
non come fuga.

Esempio applicato (`psionerva_montis`):

> "Arrampica la caldera glaciale con l'attenzione di chi legge il paesaggio come testo:
> le corna psico-conduttive captano le correnti ferromagnetiche che altri esseri
> ignorano, traducendo il silenzio del ghiaccio in informazione navigabile.
> Abita la soglia tra il freddo e il psionico, curiosa di entrambi."

### Support — voce DISCRETA

In ombra, ricuce e ripara. Registro umile-meticoloso. Contributo che si nota solo
quando manca. Nessuna autocelebrazione — solo funzione.

Esempio applicato (`sp_basaltocara_scutata`):

> "Gli artigli vetrificati non sono armi — sono strumenti di ancoraggio nelle zone
> vulcaniche dove nessun altro può tenersi fermo. Le ghiandole di fango caldo
> riparano le fessure del substrato dove altre specie si insediano dopo di lei:
> lavora in silenzio, poi sparisce prima che gli inquilini arrivino."

### Playable — voce EMPATICA

Cresce con tatto allenatore. Registro affettivo-evolutivo. Aperta, mutevole, porta
ogni incontro come strato. Non ancora definitiva — in formazione.

Esempio applicato (`fusomorpha_palustris`):

> "Creatura delle paludi salmastre che non ha ancora deciso quale forma preferisce:
> il flusso ameboide le lascia aperta ogni possibilità, e la fagocitosi che pratica
> non è solo alimentazione — è curiosità che incorpora il mondo per capirlo meglio."

---

## Override Skiv-Adjacent: pulverator_gregarius

Specie savana, Skiv canonical extension. Clade Apex ma registro desertico-sensoriale
ibrido: terza persona descrittiva con metafore sabbia/vento/voci nel vuoto.
NON prima persona (non è Skiv — è Skiv-adjacent). Register: Skiv canonical extension.

Provenance target: `claude-polish-skiv-adjacent-savana` (visual_description)
e `claude-polish-skiv-style-apex-savana` (interactions.symbiosis).

---

## D.5 Conteggi Per-Clade

| Clade      | Count  | Provenance output                  |
| ---------- | ------ | ---------------------------------- |
| Apex       | 6      | `claude-polish-per-clade-apex`     |
| Keystone   | 8      | `claude-polish-per-clade-keystone` |
| Threat     | 9      | `claude-polish-per-clade-threat`   |
| Bridge     | 8      | `claude-polish-per-clade-bridge`   |
| Support    | 4      | `claude-polish-per-clade-support`  |
| Playable   | 1      | `claude-polish-per-clade-playable` |
| **Totale** | **36** | —                                  |

Nota: pulverator_gregarius conta come Apex ma riceve provenance
`claude-polish-skiv-adjacent-savana` per il registro override.

## D.6 Conteggi Symbiosis

| Clade      | Count | Provenance output                      |
| ---------- | ----- | -------------------------------------- |
| Apex       | 1     | `claude-polish-skiv-style-apex-savana` |
| Keystone   | 8     | `claude-polish-skiv-style-keystone`    |
| **Totale** | **9** | —                                      |

Nota: il task originale stimava 14 entries — la query reale su catalog v0.4.1
restituisce 9 (filtro `heuristic` + clade in {Apex, Keystone}). Conteggio reale
prevalente su stima di task spec.

---

## Metodologia

**Pattern A (Caves of Qud tag-driven)**: la pipeline heuristic aveva già estratto
i tag anatomici (`default_parts`, `functional_signature`, `ecotypes`) e li aveva
convertiti in frasi denotative. Il polish D.5 usa quegli stessi tag come fatti
anatomici verificati e li riscrive in voce narrativa per-clade.

**Regola di coerenza tag**: ogni visual_description polished RIFLETTE i tag reali
della specie. Non inventa anatomia assente dal catalog. Esempio: electromanta ha
`offense: electric_pulse` + `defense: bipolar_skin` + `senses: magnetic_olfaction`
— tutti e tre appaiono nel testo polished.

**Symbiosis voice (Skiv-style)**: ogni beat mutualistico cita un attore concreto
(nome specie, gruppo trofico, meccanismo) e un effetto concreto sull'ecosistema.
Evita il generic "possibili mutualismi" del placeholder heuristic.

**Collaborative autonomous mode**: polish scritto autonomamente da Claude con
master-dd ratification authority residue. Applicazione via script — nessun campo
modificato oltre `visual_description`, `interactions.symbiosis`, `_provenance`
(sole 2 chiavi interessate: `visual_description` e `interactions.symbiosis`).

---

## Come Applicare

```bash
python3 tools/py/apply_phase3_polish_d5_d6.py
# oppure con path esplicito:
python3 tools/py/apply_phase3_polish_d5_d6.py data/core/species/species_catalog.json
```

Output atteso:

```
D.5 visual_description polished:  36 / 36
D.6 symbiosis polished:            9 / 9
Remaining heuristic visual_desc:   0
Remaining heuristic symbiosis:     0  (o residuo da non-Apex/Keystone se presente)
Total claude-polish-* prov keys:  45
Done.
```

Verifica post-apply:

```bash
python3 tools/py/review_phase3.py --stats
# Expected: claude-polish-* sources >= 45
```

---

## Anti-pattern Guard

- NON polished entries con provenance != heuristic (script skips su condizione esplicita)
- NON modificati campi oltre visual_description + interactions.symbiosis + \_provenance
- NON inventata anatomia: ogni descrizione grounded su default_parts / functional_signature / ecotypes reali
- ensure_ascii=False + encoding UTF-8 esplicito per ogni open() (CLAUDE.md §Encoding Discipline)

---

## Authority Ratification

Master-dd verdict Q3 = C+B formalmente incorporated. Script ready for apply + verify.
Post-apply: master-dd review pass D.5 batch (~4-5h) per polish fine-grained su
36 entries, poi D.6 subset Skiv-style (~1-1.5h) secondo priorita` residue estimate.
