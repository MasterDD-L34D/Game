# Proposta: i 23 tratti orfani di `rovine_planari`

- **Autore**: `trait-curator` (agent) -- carta: `agents/trait-curator.md`, `.ai/trait-curator/PROFILE.md`
- **Data**: 2026-07-14
- **Issue**: #3307 -- PR di riferimento: #3306 (`fix/rovine-planari-recovery`)
- **Stato**: PROPOSTA. **Nulla di quanto segue e' stato applicato.** Nessun file sotto `data/` e' stato toccato.
- **Ratifica**: master-dd. Numeri/tier -> **Balancer**. Framing narrativo -> **Lore Designer**.

---

## 0. TL;DR

| Verdetto               | Numero | Tratti                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **create**             | **13** | `campo_di_fase`, `fotosintesi_bifase`, `ghiandole_nettare_memetico`, `intangibilita_parziale`, `lamenti_diradanti`, `maschera_illusoria`, `nodi_micotici`, `proboscide_polifaga`, `riflessi_preternaturali`, `rinforzi_modulari`, `secrezioni_antisepsi`, `sinapsi_riflettenti`, `visione_spettrale` |
| **duplicate-of**       | **2**  | `sensori_chimici` -> `acuita_chemorecettiva` -- `voce_spettrale` -> `voce_imperiosa`                                                                                                                                                                                                                 |
| **drop-the-reference** | **8**  | `respirazione_biologica`, `metabolismo_attivo`, `ciclo_vitale_completo`, `assenza_respirazione`, `metabolismo_sostentato`, `ciclo_vitale_anomalo`, `origine_artificiale`, `fisiologia_predatoria`                                                                                                    |

**Il risultato principale di questa analisi e' negativo.** 8 dei 23 non sono tratti: sono **marcatori di fisiologia auto-derivati dall'import Pathfinder**, copiati per inerzia nel file specie. Definirli nel glossario avrebbe aggiunto 8 voci che **non discriminano niente** -- esattamente la forma della copertura fabbricata di `M-2026-07-14-001`, ma stavolta con l'alibi di una "definizione vera".

Il numero onesto di tratti da autorare non e' 23. E' **13**.

---

## 1. La prova: gli 8 non sono tratti, sono l'`import`

### 1.1 Il segnale

`git grep` dei 23 id, escludendo `packs/.../rovine_planari/`:

- **8 su 23** compaiono in **`data/external/pathfinder_bestiary_1e.json`**.
- **15 su 23** non compaiono **da nessuna parte** nel repo. (Verificato: 0/23 nel glossario, 0/23 come file `data/traits/*/*.json`.)

Gli 8 sono esattamente: `respirazione_biologica`, `metabolismo_attivo`, `ciclo_vitale_completo`, `assenza_respirazione`, `metabolismo_sostentato`, `ciclo_vitale_anomalo`, `origine_artificiale`, `fisiologia_predatoria`.

### 1.2 Cosa sono in quel file

`data/external/pathfinder_bestiary_1e.json` (`meta.record_count: 1211`) da' a **ogni** creatura un blocco `biology` di booleani e un array `genetic_traits` **derivato meccanicamente da quei booleani**:

```json
"biology": { "needs_food": true, "needs_water": true, "breathes": true, "has_growth_cycle": true },
"genetic_traits": ["ciclo_vitale_completo", "metabolismo_attivo", "respirazione_biologica"]
```

Il vocabolario **completo** di `genetic_traits` nell'import e' di **10 id**, con queste frequenze su 1211 creature (misurate, non stimate):

| id                       | occorrenze | mappa da                    |
| ------------------------ | ---------- | --------------------------- |
| `ciclo_vitale_completo`  | 1077       | `has_growth_cycle: true`    |
| `metabolismo_attivo`     | 1077       | `needs_food: true`          |
| `respirazione_biologica` | 1052       | `breathes: true`            |
| `fisiologia_predatoria`  | 376        | carnivoria (tipo/dieta)     |
| `assenza_respirazione`   | 159        | `breathes: false`           |
| `ciclo_vitale_anomalo`   | 134        | `has_growth_cycle: false`   |
| `metabolismo_sostentato` | 134        | `needs_food: false`         |
| `origine_artificiale`    | 134        | non-nato (undead/costrutto) |
| `adattamento_volo`       | 417        | movimento `fly`             |
| `adattamento_acquatico`  | 95         | movimento `swim`            |

Gli ultimi due sono gli unici del gruppo che il repo ha **promosso a tratto reale**: `adattamento_volo` **e'** nel glossario ed **e' consumato** dalle specie. Gli altri 8 no. Non per svista: perche' **non sono tratti**.

### 1.3 La partizione che lo dimostra

Sulle 10 specie recuperate i marcatori formano una **partizione perfetta e complementare**:

- 8 specie "vive" (archon, balor, bulette, couatl, marilith, otyugh, rakshasa, treant) portano **tutte e tre** `ciclo_vitale_completo` + `metabolismo_attivo` + `respirazione_biologica`. Nessuna eccezione.
- 2 specie non-biologiche (banshee = `undead`, golem = costrutto) portano **tutte e quattro** `assenza_respirazione` + `metabolismo_sostentato` + `ciclo_vitale_anomalo` + `origine_artificiale`. Nessuna eccezione.

Un tratto portato dal **100%** dei membri di una classe e dallo **0%** dell'altra non e' un tratto: e' **l'etichetta della classe**. Non differenzia nessuna build, non entra in nessuna sinergia, non ha nessun conflitto. Se lo si definisce nel glossario, il contatore sale di 8 e **il gioco non cambia di una virgola**.

> E' il modo di fabbricare copertura che `M-2026-07-14-001` descrive, travestito da lavoro onesto: la definizione **esisterebbe davvero**, ma non **direbbe** niente.

### 1.4 Il caso a parte: `fisiologia_predatoria` su `bulette-fase`

`fisiologia_predatoria` e' riferito da **una sola specie**, `bulette-fase` -- e la contraddice in **tre punti indipendenti**:

| fonte                                                            | dice                                                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bulette-fase.yaml` -> `role_trofico`                            | `erbivoro_primario`                                                                                                                                   |
| `bulette-fase.yaml` -> `functional_tags`                         | `prede`, `detritivoro`                                                                                                                                |
| `rovine_planari.ecosystem.yaml` -> `trofico.consumatori.primari` | `[bulette-fase]` (unico)                                                                                                                              |
| `rovine_planari_foodweb.yaml`                                    | `treant-portale -> bulette-fase` type **`herbivory`** (0.5); `balor-fission -> bulette-fase` type **`predation`** (0.5) -- la bulette e' **la preda** |

L'origine e' evidente: nel bestiario Pathfinder la bulette **e'** un carnivoro (`type: magical beast`, `genetic_traits` include `fisiologia_predatoria`). Il design pass Evo l'ha **ri-castata come erbivoro primario**, perche' l'ecosistema aveva bisogno di un consumatore primario e non ne aveva altri. Il marcatore dell'import e' rimasto attaccato.

**Verdetto**: `drop-the-reference`. Il modello trofico -- due file, quattro asserzioni concordi -- vince su un token ereditato dall'import. L'alternativa (ri-assegnare il `role_trofico` della bulette a carnivoro) **spezzerebbe l'unico link erbivoro dell'ecosistema** e lascerebbe il treant senza consumatore: e' una decisione da **Species Curator + Biome/Ecosystem Curator**, non da qui, e la sconsiglio.

### 1.5 Cosa fare degli 8, concretamente

**Non** definirli. Due opzioni, entrambe fuori dal mio ambito di scrittura:

- **Opzione A (raccomandata)**: promuoverli a **campo di specie**, non a tratto -- p.es. un `physiology:` con `breathes: bool`, `growth_cycle: natural|anomalous`, `origin: natural|artificial`, `diet: ...`. E' informazione **vera e utile** (serve gia' a `rules.at_least` e ai ruoli trofici), ma appartiene alla **tassonomia della specie**, non al catalogo tratti. Richiede una modifica a `schema_version 1.7` delle specie -> **Species Curator + schema owner**.
- **Opzione B (minima)**: rimuovere le 8 voci da `pending_trait_definitions` e chiudere il punto, annotando nel file specie che derivano dall'import. Costo zero, perdita di informazione zero (il dato originale resta in `data/external/pathfinder_bestiary_1e.json`, indicizzato per `id` di creatura).

In entrambi i casi: **nessuna voce di glossario**, **nessun file `data/traits/`**, **nessuna entry nel bridge**.

---

## 2. Verdict table completa

`sp.` = specie che lo riferiscono (da `pending_trait_definitions`).

| #   | trait id                     | verdetto                                 | sp.              | motivo                                                                                                                                        |
| --- | ---------------------------- | ---------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `assenza_respirazione`       | **drop**                                 | banshee, golem   | marcatore `biology.breathes:false` dell'import PF (159/1211). Etichetta di classe, non tratto.                                                |
| 2   | `campo_di_fase`              | **create**                               | golem            | Campo di stabilizzazione emesso. Ancora agli edge `fortification` del golem verso archon/couatl e a `deploy_barrier`.                         |
| 3   | `ciclo_vitale_anomalo`       | **drop**                                 | banshee, golem   | marcatore `biology.has_growth_cycle:false` (134/1211).                                                                                        |
| 4   | `ciclo_vitale_completo`      | **drop**                                 | 8 specie vive    | marcatore `biology.has_growth_cycle:true` (1077/1211). Portato dal 100% dei vivi: zero potere discriminante.                                  |
| 5   | `fisiologia_predatoria`      | **drop**                                 | bulette          | Contraddetto da `role_trofico: erbivoro_primario`, da `functional_tags: [prede]` e da **due** edge del foodweb. Vedi sez. 1.4.                |
| 6   | `fotosintesi_bifase`         | **create**                               | treant           | Il treant e' l'**unico** `produttore` dell'ecosistema. Zero tratti fotosintetici in 501 voci di glossario.                                    |
| 7   | `ghiandole_nettare_memetico` | **create**                               | couatl           | Edge `couatl-aurora -> treant-portale` type `pollination` (0.5) + risorsa `spore_memetiche` + meteo `vento_memetico`.                         |
| 8   | `intangibilita_parziale`     | **create**                               | banshee          | `required_capabilities: phase_shift`. Nessun tratto di incorporeita' nel catalogo.                                                            |
| 9   | `lamenti_diradanti`          | **create**                               | banshee          | Gli **unici due** edge `disruption` del foodweb partono dalla banshee (-> balor 0.5, -> rakshasa 0.4). Questo tratto **e'** quegli edge.      |
| 10  | `maschera_illusoria`         | **create**                               | rakshasa         | `required_capabilities: infiltrate` + `services_links: minaccia:corruzione_iconica` + `parasitism` verso archon e treant.                     |
| 11  | `metabolismo_attivo`         | **drop**                                 | 8 specie vive    | marcatore `biology.needs_food:true` (1077/1211).                                                                                              |
| 12  | `metabolismo_sostentato`     | **drop**                                 | banshee, golem   | marcatore `biology.needs_food:false` (134/1211).                                                                                              |
| 13  | `nodi_micotici`              | **create**                               | otyugh, treant   | Edge `otyugh-sentinella -> treant-portale` type `nutrient_cycle` (0.4). **Collisione da arbitrare**: vedi sez. 4.1.                           |
| 14  | `origine_artificiale`        | **drop**                                 | banshee, golem   | marcatore non-nato dell'import (134/1211).                                                                                                    |
| 15  | `proboscide_polifaga`        | **create**                               | otyugh           | Tre edge in entrata: `spore_memetiche` (detritus 0.6), `detrito` (0.5), `bulette-fase` (waste 0.3).                                           |
| 16  | `respirazione_biologica`     | **drop**                                 | 8 specie vive    | marcatore `biology.breathes:true` (1052/1211).                                                                                                |
| 17  | `riflessi_preternaturali`    | **create**                               | marilith         | `required_capabilities: multi_attack` + `encounter_role: elite` + edge `contest` verso il balor.                                              |
| 18  | `rinforzi_modulari`          | **create**                               | golem            | `morphotype: scavenger_corazzato` + `resistance_archetype: corazzato` + hazard `cedimenti_portale`.                                           |
| 19  | `secrezioni_antisepsi`       | **create**                               | otyugh           | `required_capabilities: purge_toxins` + `services_links: regolazione:depurazione_residui`. Distinto da `secrezioni_antistatiche` (elettrico). |
| 20  | `sensori_chimici`            | **duplicate-of `acuita_chemorecettiva`** | otyugh           | Il catalogo ha gia' **6** tratti di chemocezione. Vedi sez. 3.1.                                                                              |
| 21  | `sinapsi_riflettenti`        | **create**                               | rakshasa         | `resistance_archetype: psionico` + `required_capabilities: disrupt_psionics`. Distinto da `neurone_specchio` (vedi sez. 4.2).                 |
| 22  | `visione_spettrale`          | **create**                               | archon, marilith | Le due specie con `functional_tags: sentinella` e `sentient: true`, nel bioma che ospita una banshee incorporea.                              |
| 23  | `voce_spettrale`             | **duplicate-of `voce_imperiosa`**        | banshee          | Collide meccanicamente con un tratto esistente **e** con `lamenti_diradanti` sulla stessa creatura. Vedi sez. 3.2.                            |

---

## 3. I due duplicati

### 3.1 `sensori_chimici` -> `acuita_chemorecettiva`

`sensori_chimici` e' il nome piu' generico possibile per una funzione che il catalogo copre **sei volte**:

| id esistente               | `description_it`                                                 |
| -------------------------- | ---------------------------------------------------------------- |
| `acuita_chemorecettiva`    | "The range for detection of the source of an odor is increased." |
| `chemotopia_odoranti`      | identificazione automatica odori non minacciosi                  |
| `chemotopia_delle_minacce` | identificazione automatica odori minacciosi                      |
| `chemiorecettori_bromuro`  | (boilerplate, bioma-specifico: pianura salina)                   |
| `olfatto`                  | range di rilevamento odore                                       |
| `sistemi_chimio_sonici`    | "Mappare spazio e correnti d'aria senza vista."                  |

Il bisogno dell'otyugh -- fiutare cibo e tossine nel liquame delle fogne astrali -- e' **interamente coperto** da `acuita_chemorecettiva`. Aggiungere un settimo tratto di chemocezione con il nome piu' vago dei sette e' bloat di catalogo.

**Raccomandazione**: **Species Curator** sostituisce il riferimento in `otyugh-sentinella.yaml` con `acuita_chemorecettiva`, che ha gia' voce nel glossario. **Zero nuove definizioni.**

> Nota separata, fuori scope: `acuita_chemorecettiva`, `olfatto`, `chemotopia_*`, `riflesso_di_ritiro`, `azione_evasiva_predator` e `neurone_specchio` hanno tutti come `description_it` **testo inglese non tradotto importato dal dump Ancestors** ("MOVE (button) to choose direction", "ask clan members to mimic..."). E' un problema di qualita' del glossario **preesistente e non mio**, ma va segnalato: sono voci che il censimento non conta tra le 116 boilerplate e che sono comunque rotte.

### 3.2 `voce_spettrale` -> `voce_imperiosa` (**escalation Lore Designer**)

`voce_imperiosa` gia' esiste: _"Voce risonante che paralizza la volonta' dei deboli applicando 2 turni di panic in melee."_ E', meccanicamente, il wail della banshee.

Il problema aggiuntivo e' **interno**: la banshee riferisce **due** tratti vocali, `voce_spettrale` **e** `lamenti_diradanti`. Definirli entrambi le da' tre effetti sonori (contando `risonanza_di_branco`, gia' consumato) su una creatura `event` che compare a `densita: event`. `lamenti_diradanti` e' il tratto che **il foodweb modella davvero** (i due edge `disruption`). `voce_spettrale` no: non ha nessun aggancio strutturale al di la' del nome.

**Verdetto**: `duplicate-of voce_imperiosa`. Il riferimento va sostituito, non definito.

**Ribalta a `create` solo se** il **Lore Designer** stabilisce che il _wail_ della banshee deve essere un tratto nominato proprio (e' iconico in PF1E, e "voce imperiosa" ha una connotazione di **comando**, non di **lutto**). **Non decido io.** Se il verdetto e' `create`, serve comunque una separazione meccanica netta da `lamenti_diradanti` -- e quella e' una decisione **Balancer**.

---

## 4. Collisioni segnalate (non risolte da me)

### 4.1 `nodi_micotici` vs `nodi_micorrizici_oracolari` (esistente)

Esiste gia': `nodi_micorrizici_oracolari` -- _"Nodi micorrizici che anticipano minacce tramite segnali fungini."_ E' un tratto **sensoriale** (preveggenza via rete fungina).

`nodi_micotici` come lo ancoro io e' un tratto **trofico**: il tubo di trasferimento nutrienti fra decompositore (otyugh) e produttore (treant), cioe' l'edge `nutrient_cycle` 0.4. Semanticamente distinti; nominalmente vicinissimi.

Propongo `create`, ma segnalo l'alternativa: **collassare** i due in `nodi_micorrizici_oracolari` estendendone lo scope e fare `drop-the-reference`. E' una decisione sulla **forma del catalogo** (quanti tratti fungini vogliamo) -> **master-dd**, con parere **Lore Designer** sul naming. Se resta `create`, valutare un rename a qualcosa di meno confondibile (p.es. `rete_micotica_detritica`) -- ma il rename tocca i file specie, quindi **Species Curator**.

### 4.2 `visione_spettrale` vs `visione_multi_spettrale_amplificata` (esistente)

`visione_multi_spettrale_amplificata` significa, nella sua descrizione, _"Vedere in luminanza estremamente bassa"_ -- e' **visione notturna**, malgrado il nome. `visione_spettrale` che propongo significa **vedere l'incorporeo**. Sono cose diverse, ma i due nomi si leggono come sinonimi. **Non e' un duplicato**; e' una **trappola di naming**, e la segnalo perche' qualcuno la calpestera'. Rename dell'uno o dell'altro -> **Lore Designer**.

### 4.3 `sinapsi_riflettenti` vs `neurone_specchio` (esistente)

Non e' un duplicato: `neurone_specchio` e' imitazione motoria (e la sua descrizione e' testo Ancestors non tradotto, vedi sez. 3.1). `sinapsi_riflettenti` e' **riflessione psionica** (rimanda al mittente). Ancorato a `resistance_archetype: psionico` + `disrupt_psionics` del rakshasa. `create` senza riserve.

---

## 5. Patch proposta -- glossario (13 voci)

> **NON APPLICATA.** Patch testuale per `data/core/traits/glossary.json`, chiave `traits` (dict alfabetico, 501 voci -> 514).
> Prosa autorata. `label_en` **tradotta** (nessuna voce lascia `label_en` uguale a `label_it`, e nessuna usa il pattern "X permette alle squadre di..." -- misurato: **116 su 501** voci esistenti hanno quel pattern, non ne aggiungo una).
> Le descrizioni sono **draft del Curator**: richiedono **co-firma Lore Designer** (sez. 2.3 della carta).

```diff
--- a/data/core/traits/glossary.json
+++ b/data/core/traits/glossary.json
@@ traits @@
+    "campo_di_fase": {
+      "label_it": "Campo di Fase",
+      "label_en": "Phase Field",
+      "description_it": "Emettitore runico che intreccia una sottile membrana fuori-fase attorno al portatore e agli alleati adiacenti: cio' che l'attraversa perde un istante di sincronia con questo piano, e arriva smorzato.",
+      "description_en": "Runic emitter weaving a thin out-of-phase membrane around the bearer and adjacent allies: whatever crosses it loses a moment of sync with this plane, and lands blunted."
+    },
+    "fotosintesi_bifase": {
+      "label_it": "Fotosintesi Bifase",
+      "label_en": "Two-Phase Photosynthesis",
+      "description_it": "Doppio apparato fotosintetico: clorofilla ordinaria nella quiete planare, tessuto radianzo-attivo quando i flussi di radianza montano. Accumula nella calma e converte nella tempesta -- ed e' l'unica bocca da cui l'energia entra nelle rovine.",
+      "description_en": "A twin photosynthetic apparatus: ordinary chlorophyll during planar calm, radiance-reactive tissue when the radiance flows surge. It stores in the lull and converts in the storm -- and it is the only mouth through which energy enters the ruins."
+    },
+    "ghiandole_nettare_memetico": {
+      "label_it": "Ghiandole di Nettare Memetico",
+      "label_en": "Memetic Nectar Glands",
+      "description_it": "Ghiandole che distillano un nettare carico di frammenti di memoria altrui. Chi lo raccoglie riceve nutrimento e, insieme, un ricordo che non e' suo: e' la moneta con cui il couatl paga il treant per l'impollinazione.",
+      "description_en": "Glands distilling a nectar laced with fragments of other minds. Whoever gathers it takes food and, with it, a memory that is not their own: the coin the couatl pays the treant for pollination."
+    },
+    "intangibilita_parziale": {
+      "label_it": "Intangibilita' Parziale",
+      "label_en": "Partial Intangibility",
+      "description_it": "Il corpo non e' mai del tutto qui. Attraversa muri e corpi come se fossero un disegno mal ricalcato, ma paga la traversata: ogni passaggio lo sfuoca, e cio' che e' sfuocato non puo' afferrare nulla.",
+      "description_en": "The body is never entirely here. It passes through walls and bodies as through a badly traced drawing, but the crossing costs: each passage blurs it, and what is blurred can grip nothing."
+    },
+    "lamenti_diradanti": {
+      "label_it": "Lamenti Diradanti",
+      "label_en": "Thinning Laments",
+      "description_it": "Un lamento a bassa frequenza che non ferisce: separa. I gruppi che lo ascoltano perdono la coesione e si sparpagliano, e nelle rovine e' l'unica forza capace di rompere una muta di balor a fissione.",
+      "description_en": "A low-frequency wail that does not wound: it separates. Groups that hear it lose cohesion and scatter, and in the ruins it is the only force able to break a pack of fission balors."
+    },
+    "maschera_illusoria": {
+      "label_it": "Maschera Illusoria",
+      "label_en": "Illusory Mask",
+      "description_it": "Non un camuffamento della pelle, ma dello sguardo altrui: il rakshasa indossa il volto che l'osservatore si aspettava di vedere. Regge finche' nessuno lo guarda con un senso che non sia la vista.",
+      "description_en": "Not a disguise of the skin but of the onlooker's gaze: the rakshasa wears the face the observer expected to see. It holds until someone looks with a sense that is not sight."
+    },
+    "nodi_micotici": {
+      "label_it": "Nodi Micotici",
+      "label_en": "Mycotic Nodes",
+      "description_it": "Noduli fungini che saldano radice e intestino: il decompositore restituisce al produttore l'azoto strappato al detrito senza che nessuno dei due si muova. E' il condotto lungo cui la materia risale la rete trofica.",
+      "description_en": "Fungal nodules welding root to gut: the decomposer returns to the producer the nitrogen torn from detritus, without either of them moving. It is the duct along which matter climbs back up the food web."
+    },
+    "proboscide_polifaga": {
+      "label_it": "Proboscide Polifaga",
+      "label_en": "Polyphagous Proboscis",
+      "description_it": "Proboscide muscolare priva di specializzazione: ingoia carcasse, spore, scorie minerali e reliquie corrose con la stessa indifferenza. Cio' che le rovine non digeriscono, lo digerisce lei.",
+      "description_en": "A muscular, unspecialised proboscis: it swallows carcasses, spores, mineral slag and corroded relics with equal indifference. Whatever the ruins cannot digest, it digests."
+    },
+    "riflessi_preternaturali": {
+      "label_it": "Riflessi Preternaturali",
+      "label_en": "Preternatural Reflexes",
+      "description_it": "Sei braccia governate da un tronco nervoso che non aspetta il proprio turno: la marilith risponde mentre il colpo e' ancora in volo, e non le resta un lato cieco da cui aggirarla.",
+      "description_en": "Six arms governed by a nerve trunk that does not wait its turn: the marilith answers while the blow is still in the air, and she is left with no blind side to be flanked from."
+    },
+    "rinforzi_modulari": {
+      "label_it": "Rinforzi Modulari",
+      "label_en": "Modular Reinforcements",
+      "description_it": "La corazza non guarisce: si sostituisce. Il golem stacca le piastre incrinate e le rimpiazza con detriti di pietra planare raccolti sul posto, restando in piedi mentre si ricostruisce.",
+      "description_en": "The plating does not heal: it is replaced. The golem sheds cracked plates and swaps in planar stone rubble gathered on the spot, staying upright while it rebuilds itself."
+    },
+    "secrezioni_antisepsi": {
+      "label_it": "Secrezioni di Antisepsi",
+      "label_en": "Antiseptic Secretions",
+      "description_it": "Muco battericida che riveste bocca e canali digestivi. E' cio' che consente di vivere immersi nei residui delle fogne astrali senza esserne infettati -- e, colato nell'acqua ferma, la rende potabile per gli altri.",
+      "description_en": "Bactericidal mucus lining mouth and gut. It is what allows life immersed in the sludge of the astral sewers without infection -- and, spilled into standing water, it makes that water drinkable for others."
+    },
+    "sinapsi_riflettenti": {
+      "label_it": "Sinapsi Riflettenti",
+      "label_en": "Reflecting Synapses",
+      "description_it": "Sinapsi rivestite di uno strato che rimanda indietro cio' che riceve: l'intrusione psionica torna al mittente, portandosi dietro un frammento di cio' che era venuta a leggere.",
+      "description_en": "Synapses sheathed in a layer that sends back what it receives: the psionic intrusion returns to its sender, carrying with it a fragment of what it had come to read."
+    },
+    "visione_spettrale": {
+      "label_it": "Visione Spettrale",
+      "label_en": "Spectral Sight",
+      "description_it": "Occhi tarati sulla banda in cui le rovine tengono i propri morti: vedono cio' che e' presente solo a meta'. E' il senso che separa una sentinella da una preda, in un bioma dove meta' delle minacce non proietta ombra.",
+      "description_en": "Eyes tuned to the band in which the ruins keep their dead: they see what is only half present. It is the sense that separates a sentinel from prey, in a biome where half the threats cast no shadow."
+    },
```

---

## 6. Patch proposta -- file per-tratto (13 file)

> **NON APPLICATI.** Conformi a `config/schemas/trait.schema.json` (`schema_version: "2.0"`, `additionalProperties: false`).
> Modelli usati (file reali, ben autorati, stessa lineage `pathfinder_dataset`): **`data/traits/difensivo/armatura_pietra_planare.json`** e **`data/traits/sensoriale/antenne_waveguide.json`**.
> `data_origin: pathfinder_dataset` / `fonte: pathfinder_import` -- **mai** `coverage_autogen` (e' il marcatore dello strato fabbricato rimosso il 2026-07-14).

### 6.1 Campi che NON decido io

Ogni file sotto riporta `"tier": "<<BALANCER>>"`. **Lo schema richiede `tier` con pattern `^T[1-6]$`: i file NON sono validi cosi' come sono, ed e' voluto.** Non posso applicarli neanche volendo. Il Balancer sostituisce il placeholder e allora diventano validi.

Ownership:

| campo                                                                                      | owner                          |
| ------------------------------------------------------------------------------------------ | ------------------------------ |
| `tier`, `slot`, `slot_profile`                                                             | **Balancer**                   |
| `data/core/traits/active_effects.yaml` (meccanica + numeri runtime)                        | **Balancer** (+ runtime owner) |
| `conflitti` (sono vincoli di gameplay)                                                     | **Balancer**                   |
| `label`/`mutazione_indotta`/`uso_funzione`/`spinta_selettiva`/`debolezza` (stringhe i18n)  | **Lore Designer**              |
| `sinergie`, `famiglia_tipologia`, `requisiti_ambientali`, `biome_tags`, categoria/cartella | **Trait Curator** (io)         |
| spostamento da `pending_trait_definitions` a `genetic_traits`                              | **Species Curator**            |

Le `sinergie` che propongo puntano **solo** a tratti gia' esistenti nel glossario (verificato uno per uno).

### 6.2 I file

**`data/traits/difensivo/campo_di_fase.json`** -- golem-runico

```json
{
  "schema_version": "2.0",
  "id": "campo_di_fase",
  "label": "i18n:traits.campo_di_fase.label",
  "famiglia_tipologia": "Difesa/Campo",
  "fattore_mantenimento_energetico": "Alto (emissione continua)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": [
    "armatura_pietra_planare",
    "nuclei_di_controllo",
    "matrice_antimagia",
    "aura_scudo_radianza"
  ],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": ["deploy_barrier"],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "Ancora agli edge `fortification` golem -> archon / couatl / treant del foodweb."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.campo_di_fase.mutazione_indotta",
  "uso_funzione": "i18n:traits.campo_di_fase.uso_funzione",
  "spinta_selettiva": "i18n:traits.campo_di_fase.spinta_selettiva",
  "debolezza": "i18n:traits.campo_di_fase.debolezza",
  "usage_tags": ["support", "tank"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/metabolico/fotosintesi_bifase.json`** -- treant-portale

```json
{
  "schema_version": "2.0",
  "id": "fotosintesi_bifase",
  "label": "i18n:traits.fotosintesi_bifase.label",
  "famiglia_tipologia": "Metabolismo/Autotrofia",
  "fattore_mantenimento_energetico": "Basso (autotrofo)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": [
    "pigmenti_aurorali",
    "reti_capillari_radici",
    "radici_ancora_planare",
    "nodi_micotici"
  ],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": [],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "Il treant e' l'unico `produttore` in rovine_planari.ecosystem.yaml; risorsa `flussi_radianza`, meteo `quiete_planare` vs hazard `tempesta_radianza`."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.fotosintesi_bifase.mutazione_indotta",
  "uso_funzione": "i18n:traits.fotosintesi_bifase.uso_funzione",
  "spinta_selettiva": "i18n:traits.fotosintesi_bifase.spinta_selettiva",
  "debolezza": "i18n:traits.fotosintesi_bifase.debolezza",
  "usage_tags": ["support"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/simbiotico/ghiandole_nettare_memetico.json`** -- couatl-aurora

```json
{
  "schema_version": "2.0",
  "id": "ghiandole_nettare_memetico",
  "label": "i18n:traits.ghiandole_nettare_memetico.label",
  "famiglia_tipologia": "Simbiosi/Impollinazione",
  "fattore_mantenimento_energetico": "Medio (secrezione ciclica)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": [
    "ghiandole_mnemoniche",
    "ali_solari_fotoni",
    "empatia_coordinativa",
    "fotosintesi_bifase"
  ],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": [],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "Edge `couatl-aurora -> treant-portale` type `pollination` (0.5); risorsa `spore_memetiche`; meteo `vento_memetico`."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.ghiandole_nettare_memetico.mutazione_indotta",
  "uso_funzione": "i18n:traits.ghiandole_nettare_memetico.uso_funzione",
  "spinta_selettiva": "i18n:traits.ghiandole_nettare_memetico.spinta_selettiva",
  "debolezza": "i18n:traits.ghiandole_nettare_memetico.debolezza",
  "usage_tags": ["support"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/difensivo/intangibilita_parziale.json`** -- banshee-risonante

```json
{
  "schema_version": "2.0",
  "id": "intangibilita_parziale",
  "label": "i18n:traits.intangibilita_parziale.label",
  "famiglia_tipologia": "Difesa/Fase",
  "fattore_mantenimento_energetico": "Medio (perdita di coerenza)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": ["carapace_fase_variabile", "eco_sismico", "adattamento_volo"],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": ["phase_shift"],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "`required_capabilities: phase_shift` della banshee; hazard `fratture_planari`."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.intangibilita_parziale.mutazione_indotta",
  "uso_funzione": "i18n:traits.intangibilita_parziale.uso_funzione",
  "spinta_selettiva": "i18n:traits.intangibilita_parziale.spinta_selettiva",
  "debolezza": "i18n:traits.intangibilita_parziale.debolezza",
  "usage_tags": ["skirmisher"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/offensivo/lamenti_diradanti.json`** -- banshee-risonante

```json
{
  "schema_version": "2.0",
  "id": "lamenti_diradanti",
  "label": "i18n:traits.lamenti_diradanti.label",
  "famiglia_tipologia": "Offesa/Sonico",
  "fattore_mantenimento_energetico": "Alto (scarica emozionale)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": ["eco_sismico", "risonanza_di_branco", "intangibilita_parziale"],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": ["sonic_control"],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "Gli unici due edge `disruption` del foodweb: banshee -> balor (0.5), banshee -> rakshasa (0.4). Il tratto E' quegli edge."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.lamenti_diradanti.mutazione_indotta",
  "uso_funzione": "i18n:traits.lamenti_diradanti.uso_funzione",
  "spinta_selettiva": "i18n:traits.lamenti_diradanti.spinta_selettiva",
  "debolezza": "i18n:traits.lamenti_diradanti.debolezza",
  "usage_tags": ["breaker"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/cognitivo/maschera_illusoria.json`** -- rakshasa-corte

```json
{
  "schema_version": "2.0",
  "id": "maschera_illusoria",
  "label": "i18n:traits.maschera_illusoria.label",
  "famiglia_tipologia": "Cognitivo/Illusione",
  "fattore_mantenimento_energetico": "Medio (proiezione sostenuta)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": [
    "artigli_psionici",
    "tessuti_adattivi",
    "sinapsi_riflettenti",
    "mimetismo_cromatico_passivo"
  ],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": ["infiltrate"],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "Edge `parasitism` rakshasa -> archon (0.3) e -> treant (0.3); `services_links: minaccia:corruzione_iconica`. La maschera e' il vettore del parassitismo."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.maschera_illusoria.mutazione_indotta",
  "uso_funzione": "i18n:traits.maschera_illusoria.uso_funzione",
  "spinta_selettiva": "i18n:traits.maschera_illusoria.spinta_selettiva",
  "debolezza": "i18n:traits.maschera_illusoria.debolezza",
  "usage_tags": ["scout", "skirmisher"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/simbiotico/nodi_micotici.json`** -- otyugh-sentinella, treant-portale -- **vedi sez. 4.1**

```json
{
  "schema_version": "2.0",
  "id": "nodi_micotici",
  "label": "i18n:traits.nodi_micotici.label",
  "famiglia_tipologia": "Simbiosi/Micorrizica",
  "fattore_mantenimento_energetico": "Basso (passivo)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": [
    "reti_capillari_radici",
    "fotosintesi_bifase",
    "filtri_bioattivi",
    "nodi_micorrizici_oracolari"
  ],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": [],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "Edge `otyugh-sentinella -> treant-portale` type `nutrient_cycle` (0.4): l'unico ritorno di nutrienti al produttore. Collisione di naming con nodi_micorrizici_oracolari: arbitrato pendente (master-dd)."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.nodi_micotici.mutazione_indotta",
  "uso_funzione": "i18n:traits.nodi_micotici.uso_funzione",
  "spinta_selettiva": "i18n:traits.nodi_micotici.spinta_selettiva",
  "debolezza": "i18n:traits.nodi_micotici.debolezza",
  "usage_tags": ["support"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/alimentazione/proboscide_polifaga.json`** -- otyugh-sentinella

```json
{
  "schema_version": "2.0",
  "id": "proboscide_polifaga",
  "label": "i18n:traits.proboscide_polifaga.label",
  "famiglia_tipologia": "Alimentazione/Detritivoria",
  "fattore_mantenimento_energetico": "Medio (masticazione continua)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": ["filtri_bioattivi", "membrane_osmotiche", "secrezioni_antisepsi", "nodi_micotici"],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": ["anchor_waste"],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "Tre edge in entrata sull'otyugh: `spore_memetiche` (detritus 0.6), `detrito` (0.5), `bulette-fase` (waste 0.3). Tre fonti diverse, una sola bocca."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.proboscide_polifaga.mutazione_indotta",
  "uso_funzione": "i18n:traits.proboscide_polifaga.uso_funzione",
  "spinta_selettiva": "i18n:traits.proboscide_polifaga.spinta_selettiva",
  "debolezza": "i18n:traits.proboscide_polifaga.debolezza",
  "usage_tags": ["support"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/nervoso/riflessi_preternaturali.json`** -- marilith-vault

```json
{
  "schema_version": "2.0",
  "id": "riflessi_preternaturali",
  "label": "i18n:traits.riflessi_preternaturali.label",
  "famiglia_tipologia": "Nervoso/Reattivita",
  "fattore_mantenimento_energetico": "Alto (vigilanza continua)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": [
    "focus_frazionato",
    "artigli_sette_vie",
    "articolazioni_multiassiali",
    "visione_spettrale"
  ],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": ["multi_attack"],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "`required_capabilities: multi_attack` + `encounter_role: elite`; edge `contest` marilith -> balor (0.4): contende l'apex senza esserlo."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.riflessi_preternaturali.mutazione_indotta",
  "uso_funzione": "i18n:traits.riflessi_preternaturali.uso_funzione",
  "spinta_selettiva": "i18n:traits.riflessi_preternaturali.spinta_selettiva",
  "debolezza": "i18n:traits.riflessi_preternaturali.debolezza",
  "usage_tags": ["skirmisher"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/strutturale/rinforzi_modulari.json`** -- golem-runico

```json
{
  "schema_version": "2.0",
  "id": "rinforzi_modulari",
  "label": "i18n:traits.rinforzi_modulari.label",
  "famiglia_tipologia": "Struttura/Modularita",
  "fattore_mantenimento_energetico": "Medio (ricambio piastre)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": ["armatura_pietra_planare", "campo_di_fase", "nuclei_di_controllo"],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": [],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "`morphotype: scavenger_corazzato` + `resistance_archetype: corazzato`; hazard `cedimenti_portale` fornisce la pietra di ricambio."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.rinforzi_modulari.mutazione_indotta",
  "uso_funzione": "i18n:traits.rinforzi_modulari.uso_funzione",
  "spinta_selettiva": "i18n:traits.rinforzi_modulari.spinta_selettiva",
  "debolezza": "i18n:traits.rinforzi_modulari.debolezza",
  "usage_tags": ["tank"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/escretorio/secrezioni_antisepsi.json`** -- otyugh-sentinella

```json
{
  "schema_version": "2.0",
  "id": "secrezioni_antisepsi",
  "label": "i18n:traits.secrezioni_antisepsi.label",
  "famiglia_tipologia": "Escrezione/Antisepsi",
  "fattore_mantenimento_energetico": "Medio (produzione mucosa)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": ["filtri_bioattivi", "membrane_osmotiche", "proboscide_polifaga"],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": ["purge_toxins"],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "`services_links: regolazione:depurazione_residui` + `supporto:riciclo_nutrienti`; hazard `invasione_vite_dimensionali`. Distinto da `secrezioni_antistatiche` (dispersione elettrica)."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.secrezioni_antisepsi.mutazione_indotta",
  "uso_funzione": "i18n:traits.secrezioni_antisepsi.uso_funzione",
  "spinta_selettiva": "i18n:traits.secrezioni_antisepsi.spinta_selettiva",
  "debolezza": "i18n:traits.secrezioni_antisepsi.debolezza",
  "usage_tags": ["support"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/nervoso/sinapsi_riflettenti.json`** -- rakshasa-corte

```json
{
  "schema_version": "2.0",
  "id": "sinapsi_riflettenti",
  "label": "i18n:traits.sinapsi_riflettenti.label",
  "famiglia_tipologia": "Nervoso/Psionico",
  "fattore_mantenimento_energetico": "Alto (schermatura attiva)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": ["artigli_psionici", "maschera_illusoria", "tessuti_adattivi", "focus_frazionato"],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": ["disrupt_psionics"],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "`resistance_archetype: psionico`; hazard `eco_mnemonico`. Il rakshasa e' l'unico bersaglio dell'edge `suppression` della marilith (0.4): la riflessione e' la sua risposta."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.sinapsi_riflettenti.mutazione_indotta",
  "uso_funzione": "i18n:traits.sinapsi_riflettenti.uso_funzione",
  "spinta_selettiva": "i18n:traits.sinapsi_riflettenti.spinta_selettiva",
  "debolezza": "i18n:traits.sinapsi_riflettenti.debolezza",
  "usage_tags": ["skirmisher", "support"],
  "data_origin": "pathfinder_dataset"
}
```

**`data/traits/sensoriale/visione_spettrale.json`** -- archon-solare, marilith-vault -- **vedi sez. 4.2**

```json
{
  "schema_version": "2.0",
  "id": "visione_spettrale",
  "label": "i18n:traits.visione_spettrale.label",
  "famiglia_tipologia": "Sensoriale/Spettrale",
  "fattore_mantenimento_energetico": "Basso (passivo)",
  "tier": "<<BALANCER>>",
  "slot": [],
  "sinergie": [
    "occhi_infrarosso_composti",
    "sensori_geomagnetici",
    "focus_frazionato",
    "riflessi_preternaturali"
  ],
  "conflitti": [],
  "biome_tags": ["rovine_planari"],
  "requisiti_ambientali": [
    {
      "capacita_richieste": [],
      "condizioni": { "biome_class": "rovine_planari" },
      "fonte": "pathfinder_import",
      "meta": {
        "expansion": "pathfinder_dataset",
        "notes": "Riferito dalle due specie con `functional_tags: sentinella` e `sentient: true` (archon, marilith), in un bioma che ospita una banshee `phase_shift`. Naming da disambiguare vs `visione_multi_spettrale_amplificata` (che e' visione notturna)."
      }
    }
  ],
  "mutazione_indotta": "i18n:traits.visione_spettrale.mutazione_indotta",
  "uso_funzione": "i18n:traits.visione_spettrale.uso_funzione",
  "spinta_selettiva": "i18n:traits.visione_spettrale.spinta_selettiva",
  "debolezza": "i18n:traits.visione_spettrale.debolezza",
  "usage_tags": ["scout"],
  "data_origin": "pathfinder_dataset"
}
```

---

## 7. Sequenza di applicazione (per chi ratifica)

**Non eseguirla ora.** Ordine vincolante -- il passo 5 e' l'unico che tocca il bridge, ed e' l'ultimo.

1. **master-dd** ratifica la verdict table (13 create / 2 duplicate / 8 drop) e arbitra sez. 4.1.
2. **Lore Designer** co-firma le 13 descrizioni di glossario (sez. 5) e riempie le stringhe i18n; verdetto su `voce_spettrale` (sez. 3.2) e sui rename di sez. 4.1/sez. 4.2.
3. **Balancer** sostituisce i 13 `<<BALANCER>>`, decide `slot`/`slot_profile`/`conflitti` e -- se e quando servono effetti runtime -- le entry in `data/core/traits/active_effects.yaml`. Finche' i placeholder ci sono, **i file non validano**: e' il guard.
4. **Species Curator** modifica i 10 YAML: rimuove gli 8 marcatori (sez. 1.5), sostituisce i 2 duplicati (`sensori_chimici` -> `acuita_chemorecettiva`, `voce_spettrale` -> `voce_imperiosa`), sposta i 13 da `pending_trait_definitions` a `genetic_traits`/`derived_from_environment`. `pending_trait_definitions` sparisce da tutti e 10.
5. **Solo allora** rigenerare il bridge + `check_derived_reproducible.py --deep` + verifica invariante glossario.

### 7.1 Il `setdefault` resta un buco

`tools/py/build_species_trait_bridge.py:145` fa ancora `trait_index.setdefault(trait_id, {})`. Se qualcuno esegue il passo 5 **prima** dei passi 1-4, il bridge **fabbrica 23 voci nude** e nessun gate se ne accorge. La proposta **non lo risolve** (non e' nel mio ambito di scrittura): resta il reuse path 3 di `M-2026-07-15-003` -- sostituire `setdefault` con un **fail esplicito**. Raccomando di farlo **prima** del passo 5, non dopo.

### 7.2 L'invariante da difendere

Misurato ora, su questo branch:

- `data/traits/species_affinity.json`: **204 trait id, 204 con voce di glossario. Zero mancanti.**
  (L'issue #3307 dice "203/203": il numero misurato oggi e' **204**. Discrepanza minima, segnalata per onesta'; il rapporto -- 100% -- e' identico.)
- Trait id privi di file per-tratto: **3** (`pigmenti_termici`, `proteine_shock_termico`, `reti_capillari_radici`) -- tolleranza confermata.
- File per-tratto totali: **309**. Voci di glossario: **501**.

Applicando questa proposta nell'ordine dato, l'invariante **resta a 100%**: le 13 voci di glossario **precedono** il consumo dei 13 id.

---

## 8. Domande aperte per master-dd

1. **Gli 8 marcatori**: opzione A (campo `physiology:` nello schema specie 1.7) o opzione B (rimozione secca)? A conserva informazione ed e' gia' implicitamente usata dai ruoli trofici; B costa zero. **Non ho preferenza forte, ma A e' piu' onesta.**
2. **`fisiologia_predatoria` / bulette**: confermi che il modello trofico (erbivoro primario) vince sull'origine Pathfinder (carnivoro)? Se **no**, l'ecosistema resta senza consumatori primari e il foodweb ha un edge `herbivory` da riscrivere -- e la questione diventa Species + Biome Curator, non trait.
3. **sez. 4.1 `nodi_micotici`**: due tratti fungini (uno trofico, uno oracolare) o uno solo esteso? Decide la forma del catalogo.
4. **sez. 3.2 `voce_spettrale`**: il wail della banshee e' un tratto proprio (lore) o e' `voce_imperiosa` (riuso)? Serve il **Lore Designer**.
5. **Le 15 sinergie che propongo puntano a tratti esistenti, ma non ho verificato la reciprocita'** (sez. 7.2 della carta: "non rimuovere sinergie/conflitti senza verifica di reciprocita'"). Aggiungere `nodi_micotici` alle `sinergie` di `reti_capillari_radici` ecc. sarebbe una modifica a file **esistenti**, e non l'ho proposta. Va fatta? Da chi?
6. **Quante altre specie riferiscono tratti fuori dal glossario?** `M-2026-07-15-003` lo dichiara non verificato. Le 10 di `rovine_planari` sono le uniche controllate. Vale un audit sull'intero catalogo specie **prima** di toccare il bridge.

---

## 9. Cosa NON ho fatto (dichiarato)

- **Non ho scritto nulla fuori da questo file.** `data/traits/**`, `data/core/traits/*.json`, `data/traits/species_affinity.json`, i file specie, gli `*-trait-keeper.yaml` e le regole env: **intatti**. (`git status` lo conferma.)
- **Non ho deciso nessun `tier`, `slot`, numero o effetto runtime** -- Balancer.
- **Non ho scritto le stringhe i18n** (`mutazione_indotta` / `uso_funzione` / `spinta_selettiva` / `debolezza`): sono lore, e sono del **Lore Designer**. Le descrizioni di glossario in sez. 5 sono **draft che richiedono la sua co-firma**, non testo finale.
- **Non ho rigenerato il bridge, non ho eseguito i gate, non ho committato, non ho aperto PR.**
- **Non ho verificato** che il resto del catalogo specie (le ~95 specie fuori da `rovine_planari`) sia pulito rispetto al glossario. Domanda aperta #6.
