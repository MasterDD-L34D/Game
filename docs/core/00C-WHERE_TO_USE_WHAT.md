---
title: Where to Use What — Evo Tactics
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: '2026-05-06'
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Where to Use What — Evo Tactics

## 0. Scopo

Questo documento non spiega **cos'è** Evo Tactics.
Spiega **dove leggere cosa**, **quale fonte ha autorità**, e **quale documento usare per ogni decisione**.

Serve a evitare quattro errori comuni:

1. usare un file storico come se fosse canonico;
2. usare un draft/planning come se fosse runtime truth;
3. confondere gameplay HUD, Mission Console e tooling;
4. perdere tempo a cercare il file “giusto” quando il repo è qualche commit avanti e i nomi sono cambiati.

Se devi capire il progetto, leggere il GDD o modificare parti del gioco, usa prima questa guida, poi i documenti indicati qui.

---

## 1. Regola generale: prima cerca per ruolo, poi per filename

I filename possono cambiare tra commit o riorganizzazioni.
Quindi la regola è:

1. identifica **il tema**;
2. apri il relativo **hub** o il **registry**;
3. solo dopo vai al file specifico;
4. se esiste conflitto tra narrazione e runtime, vince il layer più vicino ai dati e alle regole attive.

Ordine consigliato di ricerca:

1. `docs/hubs/README.md`
2. `docs/governance/docs_registry.json`
3. `docs/core/*.md`
4. `docs/architecture/**`
5. `docs/planning/**`
6. `docs/appendici/**`
7. `docs/archive/**`
8. `data/**`, `packs/**`, `services/**`, `engine/**`, `validators/**`

---

## 2. Gerarchia di autorità

### 2.1 Scala pratica

| Priorità | Layer                                       | Uso corretto                                                       | Quando prevale                                                        |
| -------- | ------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1        | Runtime data / schema / validators / engine | Verità meccanica, shape dati, vincoli, regole effettive            | Quando una regola deve funzionare davvero nel gioco                   |
| 2        | Final freeze / core docs                    | Visione shipping, scope, naming canonico, regole di alto livello   | Quando devi capire cosa il prodotto sta cercando di essere            |
| 3        | Hubs / registry / governance                | Navigazione, ownership, stato del documento, autorità relativa     | Quando devi trovare la fonte giusta o capire se un file è ancora vivo |
| 4        | Architecture docs                           | Design dettagliato di un sottosistema                              | Quando il blocco è attivo ma non completamente spiegato nel core      |
| 5        | Planning / research                         | Idee vive, esplorazioni, esperimenti, future directions            | Quando stai investigando o recuperando idee disperse                  |
| 6        | Appendici                                   | Framework utili, support docs, metodi, materiale di supporto       | Quando ti serve contesto profondo ma non baseline operativa           |
| 7        | Archive / historical snapshots              | Estrarre idee, verificare provenienza, recuperare elementi perduti | Mai come prima fonte se esiste una fonte più recente                  |

### 2.2 Regola di conflitto

Se due file dicono cose diverse, usa questo ordine:

**runtime/schema/validators > final freeze/core > architecture active > planning/research > archive**

---

## 3. Entry points canonici

Questi sono gli entry point da aprire quasi sempre per primi:

- `docs/hubs/README.md`
- `docs/governance/docs_registry.json`
- `docs/core/00-GDD_MASTER.md`
- `docs/core/00-SOURCE-OF-TRUTH.md` _(o equivalente aggiornato)_
- `docs/core/00B-CANONICAL_PROMOTION_MATRIX.md`
- `docs/core/90-FINAL-DESIGN-FREEZE.md`

### Cosa fa ciascuno

| File                                          | Serve per                                             | Non usarlo per                                 |
| --------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| `docs/hubs/README.md`                         | capire da dove entrare nel corpus documentale         | definire regole di gioco dettagliate           |
| `docs/governance/docs_registry.json`          | capire stato, ownership e ruolo dei documenti         | spiegare il design al team da solo             |
| `docs/core/00-GDD_MASTER.md`                  | visione canonica compatta del gioco                   | dettaglio tecnico completo di ogni subsystem   |
| `docs/core/00-SOURCE-OF-TRUTH.md`             | ricostruzione ampia e collegata dei sistemi           | truth runtime se i dati contraddicono la prosa |
| `docs/core/00B-CANONICAL_PROMOTION_MATRIX.md` | capire cosa è core / research / appendix / historical | sostituire il GDD                              |
| `docs/core/90-FINAL-DESIGN-FREEZE.md`         | scope shipping, vincoli, priorità finali              | recuperare idee storiche perse                 |

---

## 4. Mappa rapida: dove leggere cosa

## 4.1 Visione generale del gioco

| Tema                   | Leggi prima     | Fonti primarie                                    | Fonti secondarie                           | Stato        | Non usare come fonte primaria |
| ---------------------- | --------------- | ------------------------------------------------- | ------------------------------------------ | ------------ | ----------------------------- |
| Cos'è Evo Tactics oggi | `00-GDD_MASTER` | `01-VISIONE`, `03-LOOP`, `90-FINAL-DESIGN-FREEZE` | `DesignDoc-Overview`, `00-SOURCE-OF-TRUTH` | core         | GDD storici interi            |
| Pitch/posizionamento   | `00-GDD_MASTER` | `01-VISIONE`, `90-FINAL-DESIGN-FREEZE`            | overview, publisher/pitch docs             | core-support | note planning isolate         |

## 4.2 Prima partita / onboarding / flow sessione

| Tema                  | Leggi prima                   | Fonti primarie                                     | Fonti secondarie                                      | Stato                   | Non usare come fonte primaria         |
| --------------------- | ----------------------------- | -------------------------------------------------- | ----------------------------------------------------- | ----------------------- | ------------------------------------- |
| Prima partita reale   | `00-GDD_MASTER`               | screen flow canonico o tutorial encounter del repo | `draft-screen-flow`, `enc_tutorial_01.yaml`, overview | core + planning support | vecchi onboarding separati in archive |
| Session flow completo | `03-LOOP` o flow doc corrente | flow UI / encounter tutorial / debrief docs        | `00-SOURCE-OF-TRUTH`                                  | core                    | pitch docs                            |

## 4.3 Combat / round model / regole tattiche

| Tema                           | Leggi prima                 | Fonti primarie                                                        | Fonti secondarie           | Stato          | Non usare come fonte primaria           |
| ------------------------------ | --------------------------- | --------------------------------------------------------------------- | -------------------------- | -------------- | --------------------------------------- |
| Round model                    | `90-FINAL-DESIGN-FREEZE`    | `docs/combat/round-loop.md`, `10-SISTEMA_TATTICO`, `11-REGOLE_D20_TV` | `00-GDD_MASTER`            | core           | vecchi doc su initiative non aggiornati |
| Resolver / priorità / reazioni | docs combat + rules runtime | `services/rules/**`, `engine/**`                                      | freeze, architecture notes | runtime + core | prose non allineata al runtime          |
| Job e ruolo tattico            | progression/core docs       | `21-JOBS.md` o equivalente, dataset job                               | GDD master, reports        | core           | vecchi concept sheets non promossi      |

## 4.4 Biomi / ecosistemi / foodweb / worldgen

| Tema               | Leggi prima             | Fonti primarie                                               | Fonti secondarie                  | Stato                   | Non usare come fonte primaria   |
| ------------------ | ----------------------- | ------------------------------------------------------------ | --------------------------------- | ----------------------- | ------------------------------- |
| Biomi              | core docs + data        | `data/core/biomes.yaml`                                      | `28-NPC_BIOMI_SPAWN`, GDD master  | runtime + core          | descrizioni puramente narrative |
| Ecosistemi         | pack data               | `packs/**/ecosystems/*.yaml`                                 | source of truth, rollout reports  | runtime-support         | solo overview                   |
| Foodweb            | pack data/validator     | `packs/**/foodwebs/*.yaml`, validator foodweb, trophic rules | `00-SOURCE-OF-TRUTH`, reports gap | runtime + promoted core | trattarla come semplice flavour |
| Eventi cross-bioma | ecosystem network files | network/meta-network/cross-events                            | reports, overview                 | runtime-support         | note lore isolate               |

### Regola pratica

Se la domanda è: “questa specie ha senso in questo bioma?”, non partire dalla prosa.
Parti da:

- foodweb,
- ecosystem pack,
- species pack,
- validator,
- poi verifica la formulazione nel core doc.

## 4.5 Specie / parti / morph / trait / Forme

| Tema                                 | Leggi prima             | Fonti primarie                               | Fonti secondarie                        | Stato             | Non usare come fonte primaria |
| ------------------------------------ | ----------------------- | -------------------------------------------- | --------------------------------------- | ----------------- | ----------------------------- |
| Specie e parti                       | `20-SPECIE_E_PARTI`     | `data/core/species.yaml`, species packs      | GDD master, ALIENA come framework       | core + runtime    | soli esempi storici           |
| Trait                                | data/trait + docs trait | dataset trait / validators                   | sandbox solo se esplicitamente promosso | runtime + support | sandbox come baseline         |
| Morph / corpo                        | species + parts docs    | data/species + part libraries                | source of truth                         | core/runtime      | pitch docs                    |
| Forme                                | `22-FORME_BASE_16`      | Forme YAML / core doc Forme                  | telemetry docs, identity UI docs        | core              | appunti non validati          |
| Telemetria VC / PF / assi identitari | `24-TELEMETRIA_VC`      | PF session / telemetry docs e runtime routes | GDD master                              | core + runtime    | ridurre tutto a flavour       |

## 4.6 Progressione / Tri-Sorgente / unlock

| Tema                         | Leggi prima                      | Fonti primarie                                                               | Fonti secondarie            | Stato                                | Non usare come fonte primaria          |
| ---------------------------- | -------------------------------- | ---------------------------------------------------------------------------- | --------------------------- | ------------------------------------ | -------------------------------------- |
| Progressione base            | freeze + progression docs        | unlock docs, progression rules, runtime economy                              | GDD master                  | core                                 | vecchi economy notes scollegati        |
| Tri-Sorgente                 | `00B-CANONICAL_PROMOTION_MATRIX` | `docs/architecture/tri-sorgente/*`, `engine/tri_sorgente/**`, examples cards | GDD master, source of truth | promoted core + architecture/runtime | trattarla come sistema “storico”       |
| Reward cards / 3 pick + skip | tri-sorgente docs                | card offer engine + biome cards examples                                     | QA docs                     | active/core                          | reward docs generici senza riferimenti |

### Regola pratica

Se stai modificando la progressione a carte:

- cambia prima engine/config/examples;
- poi aggiorna architecture docs;
- infine aggiorna GDD/master se l'impatto è sistemico.

## 4.7 Nido / Recruit / Mating / relazioni

| Tema                       | Leggi prima               | Fonti primarie                       | Fonti secondarie                   | Stato         | Non usare come fonte primaria |
| -------------------------- | ------------------------- | ------------------------------------ | ---------------------------------- | ------------- | ----------------------------- |
| Nido / meta-loop           | `27-MATING_NIDO` + freeze | requirements/data mating, nest docs  | source of truth, canvas restaurati | promoted core | considerarlo solo flavour     |
| Recruit / Trust / Affinity | meta docs attivi          | social docs + relevant runtime data  | overview, source of truth          | promoted core | vecchie note sociali isolate  |
| Mating                     | `27-MATING_NIDO`          | `data/core/mating.yaml` + rules docs | source of truth                    | promoted core | narrative notes senza gating  |

## 4.8 UI TV / companion / Mission Console / HUD

| Tema                         | Leggi prima                  | Fonti primarie                              | Fonti secondarie | Stato                  | Non usare come fonte primaria                     |
| ---------------------------- | ---------------------------- | ------------------------------------------- | ---------------- | ---------------------- | ------------------------------------------------- |
| UI TV gameplay               | `30-UI_TV_IDENTITA` + freeze | HUD/debrief docs, gameplay UI specs         | GDD master       | promoted core          | Mission Console docs come se fossero HUD in-match |
| Companion / device personali | UI/overview docs correnti    | screen flow + companion references          | GDD master       | core-support           | tooling notes da soli                             |
| Mission Console              | ADR / docs mission console   | mission-console bundle/docs, boundary notes | governance/hub   | promoted core boundary | confonderla con HUD gameplay                      |

> **Nota**: XP Cipher parcheggiato via [ADR-2026-04-17](../adr/ADR-2026-04-17-xp-cipher-official-park.md) — meccaniche XP-like coperte da jobs/mating/VC/economy, nessuna implementazione dedicata prevista.

### Boundary da ricordare sempre

- **Gameplay HUD** = ciò che il giocatore usa nel match.
- **Mission Console** = tooling / mission-control / support surface.
- **Debrief / telemetry UI** = superficie post-match e identitaria.

Sono collegati, ma non sono la stessa cosa.

## 4.9 Narrativa del Sistema / briefing / debrief

| Tema                           | Leggi prima                              | Fonti primarie                                | Fonti secondarie                                         | Stato                   | Non usare come fonte primaria    |
| ------------------------------ | ---------------------------------------- | --------------------------------------------- | -------------------------------------------------------- | ----------------------- | -------------------------------- |
| Premessa narrativa del Sistema | GDD master + overview narrativa corrente | lore/narrative docs attivi                    | `draft-narrative-lore`, briefing/debrief implementations | core + planning support | archive lore come baseline unica |
| Briefing/debrief con scelte    | narrative service docs correnti          | runtime narrative service / routes / ink docs | planning docs                                            | active/core-support     | pitch docs                       |

## 4.10 Sentience / A.L.I.E.N.A. / Sandbox / EchoWake

| Tema         | Leggi prima                      | Fonti primarie                                                   | Fonti secondarie                  | Stato                          | Non usare come fonte primaria                        |
| ------------ | -------------------------------- | ---------------------------------------------------------------- | --------------------------------- | ------------------------------ | ---------------------------------------------------- |
| Sentience    | `00B-CANONICAL_PROMOTION_MATRIX` | planning/research sentience docs, eventuali track files canonici | source of truth, GDD se integrato | research attiva                | dichiararla core se i file dati canonici mancano     |
| A.L.I.E.N.A. | appendice ALIENA + matrix        | `docs/appendici/ALIENA_*`                                        | species/worldgen docs             | active appendix                | usarla come runtime truth                            |
| Sandbox      | appendice sandbox + matrix       | `docs/appendici/sandbox/**`                                      | trait docs, design notes          | active sandbox                 | promuovere contenuti senza decisione esplicita       |
| EchoWake     | matrix + registry                | planning/research/EchoWake                                       | archive snapshots                 | research/historical extraction | riportarlo intero a canonico senza estrazione mirata |

## 4.11 Storico / archive / snapshot

| Tema                                  | Leggi prima           | Fonti primarie                       | Fonti secondarie            | Stato              | Non usare come fonte primaria                          |
| ------------------------------------- | --------------------- | ------------------------------------ | --------------------------- | ------------------ | ------------------------------------------------------ |
| Recuperare idee perdute               | registry + matrix     | `docs/archive/**` come fonte storica | GDD master, source of truth | historical_ref     | usarli direttamente per implementare senza cross-check |
| Verificare provenienza di una feature | archive + git history | snapshot/GDD storici                 | planning correnti           | historical support | assumere che “più vecchio = più vero”                  |

---

## 5. Decision tree rapido

### Se devi rispondere a “come funziona X?”

1. apri `docs/hubs/README.md`;
2. verifica `docs/governance/docs_registry.json`;
3. apri il relativo core doc;
4. controlla se esiste un runtime file o validator;
5. solo dopo consulta planning/appendix/archive.

### Se devi modificare una meccanica

1. trova il layer runtime vero;
2. aggiorna schema/config/engine/data;
3. aggiorna il doc specialistico;
4. aggiorna `00-GDD_MASTER` solo se cambia la lettura canonica del gioco;
5. aggiorna `00B-CANONICAL_PROMOTION_MATRIX` solo se cambia lo status del blocco.

### Se devi recuperare un'idea “persa”

1. controlla se esiste già nel registry come `active`, `draft`, `research`, `historical_ref`;
2. cerca una versione più recente in core/architecture/planning;
3. se esiste solo in archive, estrai il principio utile;
4. non promuovere interi corpus storici senza sintesi.

---

## 6. Regole editoriali consigliate

### 6.1 Quando creare un nuovo core doc

Crea un nuovo file in `docs/core/` solo se il contenuto:

- chiarisce il gioco per tutti i workstream;
- risolve una vera ambiguità canonica;
- non duplica un'architecture doc o un planning note.

### 6.2 Quando lasciare un file in planning/research

Lascia un file in planning/research se:

- esplora possibilità non ancora chiuse;
- non ha dataset o runtime di riferimento;
- esiste come ipotesi o direction, non come baseline.

### 6.3 Quando usare appendici

Usa appendici per:

- framework profondi,
- metodi di design,
- reference structures,
- materiale utile ma non necessario per capire il gioco giorno per giorno.

### 6.4 Quando archiviare davvero

Archivia davvero quando il file:

- è stato superseded;
- non rappresenta più il naming o lo scope attuale;
- sopravvive solo come riferimento storico;
- rischia di confondere più che aiutare.

---

## 7. Mappa finale dei blocchi più importanti

| Blocco                  | Stato consigliato              | Dove leggere per primo     | Dove sta la verità operativa            |
| ----------------------- | ------------------------------ | -------------------------- | --------------------------------------- |
| Visione generale        | core                           | `00-GDD_MASTER`            | core + freeze                           |
| Prima partita           | core                           | GDD master + flow corrente | tutorial/flow docs + encounter data     |
| Combat round model      | core                           | freeze/combat docs         | rules/runtime                           |
| Biomi                   | core                           | core docs                  | `data/core/biomes.yaml`                 |
| Foodweb                 | promoted core                  | source of truth + matrix   | foodweb pack + validators               |
| Specie/parti/morph      | core                           | species docs               | species data packs                      |
| Forme / MBTI / PF       | core                           | Forme + telemetry docs     | runtime/session data                    |
| Tri-Sorgente            | promoted core                  | matrix + architecture docs | engine/config/examples                  |
| Nido / Recruit / Mating | promoted core                  | mating/nido docs           | relevant data + rules                   |
| UI TV / HUD             | promoted core                  | UI core + freeze           | gameplay UI implementation              |
| Mission Console         | core-boundary                  | ADR / mission-console docs | mission-console bundle/docs             |
| XP Cipher               | promoted core gap              | freeze/backlog             | current implementation/task files       |
| Sentience               | research attiva                | matrix + research docs     | solo dove esistono track files canonici |
| A.L.I.E.N.A.            | active appendix                | appendice ALIENA           | non runtime truth                       |
| Sandbox                 | active appendix                | sandbox README             | solo dopo promozione                    |
| EchoWake                | research/historical extraction | matrix + research          | non promuovere in blocco                |
| GDD storici / snapshot  | archive                        | registry                   | historical_ref only                     |

---

## 8. Nota finale per repo avanti di commit

Se il repo reale è più avanti e i nomi sono cambiati:

- cerca prima il **tema**, non il filename;
- usa `docs_registry.json` per capire se un file è stato rinominato, spostato o superseded;
- se manca un file citato qui, cerca il suo equivalente per workstream, non una copia letterale del nome;
- aggiorna questa guida quando cambia il naming canonico dei documenti principali.

Questa guida deve restare stabile anche quando i path cambiano leggermente.
Il suo valore non è il nome esatto del file: è la **mappa di autorità** del progetto.
