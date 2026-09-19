---
title: Bestiario creature-domain (lore canonizzata)
doc_status: active
doc_owner: lore-designer
workstream: dataset-pack
last_verified: '2026-06-23'
source_of_truth: false
language: it-en
review_cycle_days: 180
---

# Bestiario creature-domain -- lore canonizzata

Promozione HITL di tutte le 75 schede lore dalla bozza procedurale `data/core/species/_drafts/creature_lore.yaml` (pipeline qwen + critic mistral). Tutte hanno superato il gate render+lore (Fase 1 = 58 + Fase 1-bis regen = 7 + Fase 1-quater restyle = 10, recuperate via sweep forza-LoRA 0.4 + img2img d0.6).

> Stato `active`: prosa di origine macchina, poi pass diagnostico + light-edit IT (voce preservata) e ratificata da master-dd (boundary `docs/guide/procedural-lore-generation.md`). Nessun numero/bilanciamento qui.

Render approvato per ciascuna voce: vedi `docs/catalog/creature-domain-bestiary_assets_draft.md`.

> Manutenzione: doc ora curato a mano (pass diagnostico + light-edit IT, 2026-06-23: fix typo / concordanze / troncamenti / calchi inglesi, voce preservata). NON rigenerare da `gen_phase2.py` -- sovrascriverebbe la rifinitura prosa.

## Anguilla Geomagnetica -- `anguis_magnetica`

_Anguis magnetica | classe: Reptilia/Pisces | bioma: Atollo di Ossidiana | indice senziente: T1_

**Concetto.** L'Anguilla Geomagnetica ha sviluppato un integumento bipolare ed elettromagneti biologici che le permettono di orientarsi nel campo magnetico terrestre, catturare prede e schermarsi da interferenze esterne.

**Aspetto.** Serpiforme lucido, pelle scura con riflessi metallici; linea laterale evidente; movimenti fluidi senza rumore.

**Ambiente.** Vive nei luoghi dove la roccia vulcanica forma campi magneticamente attivi, consentendo alla creatura di muoversi in modo fluido e silenzioso attraverso il suo ambiente natio. Utilizza le sue capacita' elettromagnetiche per navigare senza rumore nei suoi habitat e per intercettare prede con precisione, sfruttando l'interferenza del sistema nervoso delle vittime.

**Tratti chiave.**

- `integumento_bipolare`: L'anguilla geomagnetica si orientava lungo le linee di campo del suo ambiente, muovendosi fluida e silenziosa.
- `elettromagnete_biologico`: Con un'interferenza elettromagnetica, l'anguilla geomagnetica disorientava la preda interrompendo i suoi impulsi nervosi.
- `scivolamento_magnetico`: L'anguilla geomagnetica scivolo' via con un movimento silenzioso, riducendo l'attrito grazie alla sua abilita' magnetica.
- `filtro_metallofago`: Il filtro metallofago dell'anguilla geomagnetica assorbiva metalli dal suo ambiente, sostenendo i suoi organi elettrogeni.
- `bozzolo_magnetico`: Per proteggersi dai campi elettromagnetici esterni, l'anguilla geomagnetica si avvolgeva in un bozzolo magnetico protettivo.

## Aurora Bridge Runner -- `aurora_bridge_runner`

_bioma: cryosteppe | indice senziente: T1_

**Concetto.** Si e' evoluto per sfruttare le risorse limitate dei criosteppe, specializzandosi nel consumo di vegetazione bassa. La sua capacita' di rilevare suoni a bassa frequenza e il suo olfatto acuto gli permettono di sopravvivere in condizioni estreme.

**Ambiente.** Si trova principalmente nei criosteppe, aree caratterizzate da inverni severi e stagioni di crescita brevi. Questo ambiente ha plasmato la sua dieta e comportamento, guidandolo a concentrarsi su vegetazione bassa e difficile da raggiungere. E' un animale solitario che evita il contatto con gli altri a meno che non sia necessario. Si muove a quattro zampe con un'andatura simile a quella dei cavalli, adatta alle lunghe distanze su terreni innevati.

## Gabbiano d'Aurora -- `aurora_gull`

_Glacilarus borealis | classe: Volatore planatore / disperdente-ponte | bioma: cryosteppe | indice senziente: T1_

**Concetto.** Occupa una nicchia di planatore migratore, utilizzando ali lunghe da aliante, zampe palmate e sacche gassose per controllare l'assetto e la profondita'.

**Aspetto.** Volatore slanciato dalle penne iridescenti che virano con la luce d'aurora, ali lunghe da aliante e zampe palmate per i suoli gelati.

**Ambiente.** Si muove attraverso le cryosteppe, sfruttando i gradienti termo-magnetici per migrare e disperdere spore e semi tra le zone di permafrost. Il comportamento si basa su gradienti termo-magnetici, con un sonar interno che mappa l'ambiente e un cervello che alterna il sonno tra emisferi.

**Tratti chiave.**

- `criostasi_adattiva`: Durante le stagioni estreme, il Gabbiano d'Aurora entra in un metabolismo sospeso per sopravvivere ai periodi di freddo intenso.
- `eco_interno_riflesso`: Utilizzando un sonar interno, il Gabbiano d'Aurora mappa l'ambiente attraverso vibrazioni corporee per navigare negli spazi innevati.
- `sonno_emisferico_alternato`: Il Gabbiano d'Aurora dorme con un emisfero cerebrale attivo mentre l'altro riposa, permettendogli di rimanere vigile durante le lunghe migrazioni.
- `sacche_galleggianti_ascensoriali`: Le sacche gassose regolabili del Gabbiano d'Aurora gli permettono di controllare l'assetto e la profondita' durante il volo.
- `occhi_infrarosso_composti`: Gli occhi infrarossi composti del Gabbiano d'Aurora seguono scie termiche nell'oscurita', aiutandolo a trovare cibo e direzioni durante la notte.

## Piaga Micotica -- `blight_micotico`

_Mycotabes corruptor | classe: Colonia fungina patogena / decompositrice | bioma: Foresta Temperata Umida | indice senziente: T1_

**Concetto.** Occupa una nicchia evolutiva come fungo patogeno dei boschi, contribuendo al ciclo detritico con la sua capacita' di decomporre e marcire la lettiera, accelerando il riciclo delle risorse naturali.

**Aspetto.** Chiazze fungine grigio-violacee che si estendono su tronchi e suolo, con corpi fruttiferi gonfi e velo di spore polverose.

**Ambiente.** Si sviluppa prevalentemente in foreste temperate, dove l'umidita' e la presenza di materiale organico morto favoriscono la sua crescita e la diffusione delle spore. Agisce seguendo istinti semplici, senza pianificazione ne' linguaggio, concentrando la sua energia nella ricerca di nutrienti e nella propagazione delle spore per la sua sopravvivenza.

**Tratti chiave.**

- `spore_psichiche_silenziate`: Le spore psioniche silenziate emettono un'onda di confusione che attutisce i segnali sensoriali degli animali vicini.
- `lingua_tattile_trama`: La lingua tattile trama esplora le superfici, rivelando microfratture nascoste nei tronchi.
- `ghiandola_caustica`: La ghiandola caustica rilascia un acido corrosivo che scioglie le corazze leggere dei nemici.
- `mimetismo_cromatico_passivo`: Il mimetismo cromatico passivo permette al fungo di mimetizzarsi lentamente sulle superfici circostanti.
- `filamenti_digestivi_compattanti`: I filamenti digestivi compattanti assorbono e trasformano i materiali inutilizzati, liberando spazio vitale per la crescita.

## Tessitore di Cactus -- `cactus_weaver`

_Cactotextor hydrophorus | classe: Produttore radicante / ingegnere idrico | bioma: deserto caldo | indice senziente: T1_

**Concetto.** Occupa una nicchia evolutiva come produttore ingegnere idrico, utilizzando le sue capacita' di tessitura per modificare l'ambiente e sostenere la vita in un ambiente estremo.

**Aspetto.** Groviglio di fusti spinosi intrecciati a rete, tessuti cerosi color giada e radici fittonanti che affondano verso le lenti d'acqua.

**Ambiente.** Si trova in ambienti desertici caldi, dove le sue radici fittonanti si estendono verso le lenti d'acqua sotterranee, creando isole d'ombra che supportano la fauna locale. Il cactus weaver opera in squadre per creare reti di radici e fusti succulenti, che catturano e redistribuiscono l'umidita'. Queste strutture forniscono un ambiente protetto per la fauna e contribuiscono al bilancio idrico del deserto.

**Tratti chiave.**

- `cuticole_cerose`: Le cuticole cerose si intrecciano con i fusti spinosi, formando una barriera impermeabile che cattura l'umidita' dell'aria e la converte in energia.
- `grassi_termici`: I grassi termici si accumulano nelle radici fittonanti, agendo come serbatoi termici che mantengono la temperatura corporea stabile durante le notti fredde.
- `pelli_cave`: Le pelli cave, con le loro sacche d'aria, riducono il trasferimento di calore, permettendo al Tessitore di Cactus di sopravvivere alle temperature estreme del deserto.
- `pigmenti_aurorali`: I pigmenti aurorali brillano sotto le tempeste magnetiche, mimetizzando il Tessitore di Cactus tra i bagliori elettrici del cielo.
- `proteine_shock_termico`: Le proteine shock termico si attivano durante i picchi di calore, proteggendo le cellule dalle denaturazioni e mantenendo la funzionalita' dei tessuti.
- `reti_capillari_radici`: Le reti capillari radici trasmettono calore e scambiano fluidi con le piante circostanti, creando un sistema di regolazione termica naturale.

## Aracnide Alchemico -- `chemnotela_toxica`

_Chemnotela toxica | classe: Artropode | bioma: Foresta Acida | indice senziente: T2_

**Concetto.** Adattandosi alle foreste acide, l'Aracnide Alchemico ha sviluppato articolazioni a leva idraulica per movimenti potenti e occhi analizzatori di tensione per monitorare la seta.

**Aspetto.** Ragno massiccio con cheliceri prominenti, filiere ispessite e addome rigonfio. Cuticola lucida con bande metalliche.

**Ambiente.** Questi ragni vivono in foreste acide dove la cuticola lucida con bande metalliche li protegge dall'ambiente corrosivo. L'Aracnide Alchemico costruisce tese trappole utilizzando seta elettroconduttiva per stordire le prede, mentre usa zanne idracide per uccidere.

**Tratti chiave.**

- `zanne_idracida`: Le zanne idrauliche dell'Aracnide Alchemico corrodono rapidamente la corteccia degli alberi della foresta acida.
- `seta_conduttiva_elettrica`: La seta elettroconduttiva che l'Aracnide Alchemico utilizza per costruire la sua tela puo' stordire gli intrusi con potenti scariche elettriche.
- `articolazioni_a_leva_idraulica`: Grazie alle sue articolazioni a leva idraulica, l'Aracnide Alchemico puo' compiere balzi sorprendentemente lunghi per catturare la preda.
- `filtrazione_osmotica`: Il sistema di filtrazione osmotica dell'Aracnide Alchemico gli permette di neutralizzare le tossine prodotte dalle sue stesse zanne idracide.
- `occhi_analizzatori_di_tensione`: Gli occhi analizzatori di tensione dell'Aracnide Alchemico gli permettono di rilevare i movimenti nella tela e identificare la posizione della preda.

## Lince Criogenica -- `cryo_lynx`

_Cryofelis nivalis | classe: Cursore quadrupede / predatore apex | bioma: cryosteppe | indice senziente: T1_

**Concetto.** Occupa la nicchia di apex predator nella criosteppe, con una strategia di sopravvivenza basata sull'adattamento al freddo e all'ambiente estremo.

**Aspetto.** Felino compatto dal manto folto screziato di bianco-azzurro, zampe larghe da neve e occhi riflettenti adattati alla penombra polare.

**Ambiente.** Si trova esclusivamente nelle cryosteppe, dove il suo metabolismo adattivo e le zampe a molla gli permettono di sopravvivere alle temperature estreme. Predatore da agguato, utilizza la sua pelliccia termo-isolante e gli artigli multipli per catturare prede su superfici ghiacciate.

**Tratti chiave.**

- `artigli_sette_vie`: Gli artigli multipli permettono alla lince criogenica di afferrare saldamente le prede sul ghiaccio irregolare.
- `carapace_fase_variabile`: La corazza che varia densita' aiuta la lince a bilanciare la protezione contro i nemici e la liberta' di movimento durante la caccia.
- `olfatto_risonanza_magnetica`: I bulbi olfattivi della lince riescono a tracciare campi magnetici e identificare vene metalliche nascoste sotto il ghiaccio.
- `criostasi_adattiva`: Il metabolismo sospeso della lince le permette di sopravvivere a mesi di estremo freddo senza cibo.
- `zampe_a_molla`: Le zampe a molla accumulano energia per permettere alla lince di fare salti rapidi e riposizionarsi sulle superfici ghiacciate.

## dune stalker -- `dune_stalker`

_Dune Stalker | bioma: Savana Ionizzata | indice senziente: T2_

**Concetto.** Il dune stalker occupa la nicchia di predatore, con un comportamento adattato all'ambiente e una coordinazione di gruppo che gli permette di cacciare efficacemente in vari biomi.

**Ambiente.** Questo predatore vive prevalentemente nelle savane, ma puo' anche adattarsi alle pianure salinate e alle foreste acide grazie alla sua capacita' di modificare la propria fisiologia per sopravvivere in diverse condizioni ambientali. Il dune stalker si muove in branchi coordinati, condividendo informazioni cruciali tra i membri del gruppo e utilizzando tattiche complesse per cacciare e difendersi. La sua ferocia aumenta quando e' sotto stress, facilitando attacchi ripetuti.

**Tratti chiave.**

- `artigli_sette_vie`: Il dune stalker si aggrappa saldamente alla roccia ruvida grazie ai suoi artigli multipli.
- `struttura_elastica_amorfa`: Il corpo amorfo del dune stalker si estende per sfuggire alla presa di un avversario.
- `scheletro_idro_regolante`: Modulando il contenuto idrico delle sue ossa porose, il dune stalker cambia massa per adattarsi meglio all'ambiente.
- `sensori_geomagnetici`: I cristalli cranici del dune stalker mappano i corridoi geomagnetici invisibili della savana.
- `coda_frusta_cinetica`: La coda elastica del dune stalker si accumula di slancio per poi colpire con forza devastante una preda.
- `sacche_galleggianti_ascensoriali`: Le sacche gassose regolabili del dune stalker permettono all'animale di controllare il proprio assetto e profondita' in acqua.
- `criostasi_adattiva`: Durante le stagioni estreme, il dune stalker entra in criostasi adattativa, riducendo drasticamente i suoi processi metabolici.
- `lamelle_termoforetiche`: Le lamelle respiratorie del dune stalker deviano rapidamente i gas estremi entrando e uscendo dal suo corpo con gradienti termici intensi.
- `legame_di_branco`: Il legame di branco del dune stalker amplifica le reazioni difensive collettive quando un membro sente il pericolo.
- `ferocia`: Quando sotto stress, il dune stalker entra in uno stato psicofisico ferocio che aumenta l'aggressivita' e la potenza offensiva.
- `biofilm_iperarido`: Il biofilm iperarido del dune stalker permette alle sue squadre di sincronizzare organismi alleati all'interno della savana.
- `antenne_dustsense`: Le antenne dustsense del dune stalker stabilizzano l'assorbimento multi-fonte nell'ambiente desertoico.
- `antenne_reagenti`: Le antenne reagenti del dune stalker sincronizzano i flussi mutualistici con organismi alleati all'interno della savana.
- `coda_coppia_retroattiva`: La coda coppia retroattiva del dune stalker disperde energia per attenuare impatti corrosivi o termici.
- `focus_frazionato`: Il cortex biforcato del dune stalker permette di sorvegliare attivamente due minacce contemporaneamente.
- `risonanza_di_branco`: La risonanza di branco amplifica i buff condivisi tra i membri del branco del dune stalker.
- `tattiche_di_branco`: Le tattiche di branco del dune stalker coordinano i focus e le prese condivise all'interno del gruppo.

## Ala d'Eco -- `echo_wing`

_Echopterus pollinifer | classe: Volatore planatore / impollinatore-disperdente | bioma: Calanchi Ferromagnetici | indice senziente: T1_

**Concetto.** Occupa una nicchia evolutiva specifica come pollinatore e dispersore di semi in ambienti rocciosi, sfruttando le risorse limitate del badlands senza competere con specie piu' avanzate.

**Aspetto.** Esile volatore dalle membrane translucide, grandi occhi composti e sacche ascensoriali che lo tengono in quota nelle termiche ferrose.

**Ambiente.** Vive in ambienti rocciosi e aridi, dove la cripto-flora cresce in nicchie protette e i calanchi offrono spazi per la dispersione dei semi. La sua biologia e' ottimizzata per sopravvivere in questi ecosistemi estremi. Naviga utilizzando una planata eco-orientata con sonar interno e visione infrarossa, impollinando la cripto-flora e disperdendo semi tra i calanchi. Il sonno emisferico alternato permette di ridurre i rischi in ambienti pericolosi.

**Tratti chiave.**

- `eco_interno_riflesso`: Utilizza il sonar interno per mappare l'ambiente attraverso vibrazioni corporee, permettendogli di navigare tra i calanchi.
- `occhi_infrarosso_composti`: Gli occhi a infrarosso composti seguono scie termiche nell'oscurita', aiutandolo a orientarsi nei terreni ferrosi.
- `sonno_emisferico_alternato`: Il cervello alternato permette a questo volatore di vegliare con un emisfero mentre l'altro riposa, ottimizzando la sopravvivenza nei continui spostamenti.
- `sacche_galleggianti_ascensoriali`: Le sacche gassose regolabili lo mantengono in quota nelle termiche ferrose, facilitando il planaggio tra i calanchi.
- `lingua_tattile_trama`: La lingua sensoriale legge vibrazioni e fratture nascoste, aiutandolo a trovare nidi e fonti di cibo nei terreni aspri.

## Viverna-Elastico -- `elastovaranus_hydrus`

_Elastovaranus hydrus | classe: Reptilia | bioma: Pianura Salina Iperarida | indice senziente: T2_

**Concetto.** L'evoluzione di questo rettile ha portato allo sviluppo di un rostro emostatico litico, uno scheletro idraulico a pistoni per i colpi-proiettile e una massiccia ipertrofia muscolare che gli permette di attaccare con rapidita' e precisione in ambienti pianeggianti salmastri.

**Aspetto.** Rettile allungato con cranio affusolato e rostro tubulare; fasci muscolari evidenti; squame opache con lamelle sensoriali. Postura semiflessa pronta allo scatto, coda come stabilizzatore. Colorazioni sabbia-oliva con pattern spezzato.

**Ambiente.** Questo rettile vive nelle pianure salmastre iperaride, dove la sua capacita' di muoversi rapidamente e attaccare con precisione e' essenziale per cacciare e sopravvivere in un ambiente scarsamente fornito di risorse. L'Elastovaranus hydrus si muove in modo semiflessibile, pronto allo scatto, utilizzando la sua sensibilita' sismica attraverso gli organi cutanei per localizzare prede nascoste e attaccare con un rostro tubulare che inocula tossine ed enzimi.

**Tratti chiave.**

- `rostro_emostatico_litico`: Il Viverna-Elastico scatto' in avanti, estendendo il suo rostro tubulare rigidizzato che trafisse la preda e inoculo' rapidamente le sue tossine ed enzimi letali.
- `scheletro_idraulico_a_pistoni`: Grazie al suo scheletro idraulico a pistoni, l'Elastovaranus hydrus pote' scagliare il cranio avanti con uno scatto fulmineo, colpendo la preda con precisione micidiale.
- `ipertrofia_muscolare_massiva`: Le fibre muscolari ipertrofiche dell'Elastovaranus hydrus si contrassero in un attimo, generando una forza tremenda che permise alla creatura di spingere il suo corpo attraverso la pianura salina.
- `ectotermia_dinamica`: Mentre l'Elastovaranus hydrus si preparava all'attacco, le sue microscosse isometriche innalzarono rapidamente la sua temperatura corporea, permettendogli di raggiungere i picchi prestazionali necessari per cacciare nel freddo clima della pianura salina iperarida.
- `organi_sismici_cutanei`: Le lamelle meccano-recettive presenti nelle squame del Viverna-Elastico vibrarono, catturando la presenza di una preda nascosta nel sottosuolo e avvertendo il rettile della sua posizione.

## Electromanta Abissale -- `electromanta_abyssalis`

_Electromanta abyssalis | classe: Apex | bioma: Frattura Abissale Sinaptica | indice senziente: T4_

**Concetto.** Occupa una nicchia evolutiva come predatore apice nella Frattura Abissale Sinaptica, sfruttando le proprieta' magnetiche e elettriche del suo ambiente per cacciare, difendersi e comunicare. La sua struttura biologica e' perfettamente adattata a questo ambiente estremo e dinamico.

**Aspetto.** Creatura silenziosa delle fratture abissali, vola su correnti magnetiche invisibili con un'eleganza che non ha bisogno di velocita' -- sa gia' dove arrivera' la preda. Il campo bioelettrico le avvolge il corpo come un sudario luminoso; quando scarica, l'intero piano sinaptico trema.

**Ambiente.** Si muove attraverso le correnti magnetiche invisibili della Frattura Abissale Sinaptica, sfruttando il suo scivolamento magnetico per muoversi senza attrito. Vive in un ambiente dove la luce non raggiunge, ma i campi elettrici e magnetici sono costanti. Come apex predator, utilizza il suo elettromagnete biologico per interferire con il sistema nervoso delle prede. La sua capacita' di scivolamento magnetico e la sua olfatto-risonanza magnetica gli permettono di cacciare in modo silenzioso e strategico, senza dover muoversi rapidamente.

**Tratti chiave.**

- `elettromagnete_biologico`: L'elettromagnete biologico emana impulsi che disturbano il sistema nervoso della preda, paralizzandone i movimenti.
- `scivolamento_magnetico`: Il corpo si muove silenziosamente lungo le correnti magnetiche, riducendo l'attrito e scivolando con eleganza.
- `integumento_bipolare`: L'integumento bipolare si orienta lungo le linee del campo magnetico, permettendo una navigazione precisa.
- `olfatto_risonanza_magnetica`: L'olfatto a risonanza magnetica traccia i campi magnetici, rivelando la posizione delle prede attraverso vene metalliche.
- `seta_conduttiva_elettrica`: Le sete conduttive elettriche stordiscono la preda con scariche che si propagano attraverso la tela.
- `capillari_fotovoltaici`: I capillari fotovoltaici assorbono energia luminosa, permettendo accelerazioni controllate su terreni estremi.
- `antenne_tesla`: Le antenne Tesla redistribuiscono carichi e modulano la rigidita' strutturale in ambienti estremi.
- `bioantenne_gravitiche`: Le bioantenne gravitiche leggono i shear gravitazionali e li convertono in segnali utili per la navigazione.
- `artigli_induzione`: Gli artigli di induzione canalizzano energia cinetica o elementale in colpi mirati durante gli scontri.
- `epidermide_dielettrica`: L'epidermide dielettrica permette di prevedere traiettorie e orchestrare attacchi complessi in ambienti tempestosi.
- `ghiandole_nebbia_ionica`: Le ghiandole a nebbia ionica ridistribuiscono carichi e modulano la rigidita' strutturale in ambienti estremi.
- `filamenti_superconduttivi`: I filamenti superconduttivi interpretano segnali psionici instabili, rivelando minacce nascoste in ambienti gelidi.
- `filamenti_magnetotrofi`: I filamenti magnetotrofi ridistribuiscono carichi e modulano la rigidita' strutturale in ambienti vulcanici.
- `barbigli_sensori_plasma`: I barbigli sensori plasma permettono di ottenere presa e accelerazioni controllate su terreni estremi.

## Ferrocolonia Magnetotattica -- `ferrocolonia_magnetotattica`

_Ferrocolonia magnetotacta | classe: Colonia radicante simbionte / predatore-regolatore | bioma: Calanchi Ferromagnetici | indice senziente: T3_

**Concetto.** Occupa una nicchia ecologica specifica nella regolazione del parassitismo nell'ecosistema magnetotattico, con una strategia di immobilizzazione delle prede tramite secrezioni rallentanti e una capacita' di adattamento visivo e sensoriale per sopravvivere in ambienti estremi.

**Aspetto.** Aggregato coloniale ancorato al suolo ferroso, filamenti magnetosensibili e tessuti che mutano colore per mimetismo passivo.

**Ambiente.** Si trova in ambienti rocciosi di Badlands, dove la sua capacita' di mimetismo cromatico passivo e la sua firma funzionale di colonia radicante magnetotattica le permettono di sopravvivere e regolare l'ecosistema locale. Si orienta lungo i campi magnetici, utilizza il mimetismo cromatico passivo per mimetizzarsi e usa rudimentalmente strumenti per immobilizzare le prede. La sua lingua tattile trama legge vibrazioni e fratture nascoste per rilevare prede e minacce.

**Tratti chiave.**

- `mimetismo_cromatico_passivo`: La ferrocolonia si mimetizza lentamente con il suolo ferroso, replicando i colori circostanti grazie ai cromatofori passivi.
- `sangue_piroforico`: Il sangue piroforico della ferrocolonia brucia l'aria intorno a chi la perfora, creando scintille violente.
- `secrezione_rallentante_palmi`: I palmi della ferrocolonia rilasciano un gel rallentante che immobilizza le prede veloci, permettendo di afferrarle.
- `lingua_tattile_trama`: La lingua tattile della ferrocolonia esplora la trama del suolo, rilevando movimenti nascosti e fratture sotterranee.
- `ventriglio_gastroliti`: Il ventriglio muscoloso della ferrocolonia si muove lentamente, macinando cibi duri grazie ai gastroliti interni.

## Fusomorfa Palustre -- `fusomorpha_palustris`

_Fusomorpha palustris | classe: Playable | bioma: Palude Tossica | indice senziente: T4_

**Concetto.** La specie occupa una nicchia evolutiva specifica all'interno delle paludi salmastre, dove la sua combinazione di flusso ameboide controllato, fagocitosi assorbente e capacita' di moltiplicazione per fusione le permette di adattarsi e crescere in modo dinamico. La sua evoluzione e' legata alla sua capacita' di integrare il mondo esterno attraverso la fagocitosi e la sensibilita' chimico-somatica.

**Aspetto.** Creatura delle paludi salmastre che non ha ancora deciso quale forma preferisce: il flusso ameboide le lascia aperta ogni possibilita', e la fagocitosi che pratica non e' solo alimentazione -- e' curiosita' che incorpora il mondo per capirlo meglio. Cresce con chi la accompagna, cambia con le stagioni, porta addosso ogni incontro come uno strato in piu'.

**Ambiente.** Si trova in ambienti palustri salmastri, dove la sua capacita' di filtrazione osmotica e le branchie microfiltri le permettono di gestire le condizioni estreme di salinita' e tossicita'. La sua relazione con il biome e' profonda e necessaria per la sua sopravvivenza. La Fusomorpha Palustris mostra comportamenti complessi come la fagocitosi assorbente, che non solo serve per l'alimentazione ma anche per l'apprendimento. Utilizza il flusso ameboide controllato e le branchie metalloidi per muoversi e interagire con l'ambiente. La sua intelligenza sociale e la sua capacita' di mutare forma la rendono un essere altamente adattivo.

**Tratti chiave.**

- `flusso_ameboide_controllato`: Scivola silenziosamente su superfici lisce, adattandosi al terreno con una fluidita' quasi invisibile.
- `fagocitosi_assorbente`: Assorbe e digerisce interi organismi, ma lo fa con una curiosita' che sembra quasi intuire la loro natura.
- `filtrazione_osmotica`: Sfrutta la filtrazione osmotica per neutralizzare tossine, un meccanismo che le permette di sopravvivere anche nel piu' acido ambiente.
- `ermafroditismo_cronologico`: Cambia sesso dopo 1-2 cicli di riproduzione, un processo che sembra legato al passare del tempo e alla sua evoluzione.
- `moltiplicazione_per_fusione`: Si moltiplica unendo unita', aumentando cosi' massa e intelligenza in modo straordinario.
- `branchie_metalloidi`: Le branchie metalloidi permettono alle squadre di ottenere presa e accelerazioni controllate in terreni estremi.
- `capillari_fluoridici`: I capillari fluoridici permettono alle squadre di interpretare segnali psionici instabili in un ambiente acido.
- `scheletro_idro_regolante`: Il suo scheletro idro-regolante modula l'acqua per mutare la massa, un adattamento perfetto per le paludi.
- `spore_paniche`: Rilascia spore neurotossiche che causano allucinazioni e panico, indirizzando le vittime verso la fuga.
- `branchie_microfiltri`: Le branchie microfiltri permettono alle squadre di disperdere energia e attenuare impatti termici o corrosivi.

## Glowcap Weaver -- `glowcap_weaver`

_bioma: Foresta Temperata Umida | indice senziente: T1_

**Concetto.** La sua nicchia evolutiva si basa sulla capacita' di costruire nidi intricati e sulla sensibilita' ai cambiamenti chimici nell'ambiente, permettendogli di adattarsi alle foreste temperate.

**Aspetto.** Arrampicatore arboricolo con testa a cappello fungino e arti slanciati.

**Ambiente.** Si muove principalmente tra gli alberi e costruisce nidi complessi tra le foglie, sfruttando la struttura arborea per proteggersi dai predatori. Solitario o in piccoli gruppi familiari, si dedica principalmente alla costruzione di nidi e alla ricerca di cibo, senza interazioni sociali complesse.

## Ghiotton-Scudo -- `gulogluteus_scutiger`

_Gulogluteus scutiger | classe: Mammalia | bioma: Canyon Risonanti | indice senziente: T2_

**Concetto.** Nell'ecologia canyonosa, il Gulogluteus Scutiger ha sviluppato un ruolo specializzato grazie alla sua capacita' di stabilizzare posizioni precarie con la coda e manipolare oggetti da distanze ravvicinate usando una lingua prensile, consentendogli di sfruttare risorse alimentari inaccessibili ad altre specie.

**Aspetto.** Mammifero robusto e basso, pelliccia scura lucida idrofoba; coda spessa prensile; regione glutea corazzata in rilievo; zampe corte ma molto mobili; lingua che si estende come una proboscide muscolare.

**Ambiente.** Questo mammifero robusto vive esclusivamente in aree canyonose caratterizzate da strettoie e pareti ripidissime, dove la sua pelliccia scura lucida ed idrofoba gli consente di muoversi con facilita' su superfici verticali. Il Ghiotton-Scudo si distingue per l'uso della lingua prensile e della coda prensile, capace di estendersi a lungo raggio per manipolare il cibo o controbilanciare durante le manovre in spazi angusti, mentre la sua placca dorsocheratinizzata fornisce una difesa passiva efficace.

**Tratti chiave.**

- `pelage_idrorepellente_avanzato`: Il Ghiotton-Scudo si arrampico' fuori dall'acqua del ruscello, la sua pelliccia scura e lucida idrofoba scintillo' mentre si scrollava, isolandolo dal freddo.
- `scudo_gluteale_cheratinizzato`: Quando il Ghiotton-Scudo senti' la minaccia avvicinarsi, prese una posizione difensiva, sollevando la sua regione glutea corazzata in rilievo per assorbire eventuali impatti posteriori.
- `articolazioni_multiassiali`: Il Ghiotton-Scudo muoveva con grazia le sue zampe corte e molto mobili, ruotandole in manovre intricate per attraversare il canyon stretto.
- `coda_prensile_muscolare`: Affidandosi alla sua coda spessa prensile, il Ghiotton-Scudo si controbilancio' mentre arrampicava su una parete rocciosa del canyon.
- `rostro_linguale_prensile`: Con grande destrezza, il Ghiotton-Scudo estese la sua lingua prensile all'esterno del suo nascondiglio roccioso e afferro' un frutto lontano.

## Leviatano Risonante -- `leviatano_risonante`

_Leviatano Risonante | bioma: Frattura Abissale Sinaptica | indice senziente: T5_

**Concetto.** Ha occupato una nicchia evolutiva cruciale come stabilizzatore delle shear gravitazionali attraverso l'uso degli emettitori voidsong, che emettono cori a frequenze profonde essenziali per la sua sopravvivenza.

**Aspetto.** Leviatano abissale enorme e allungato, profilo cetaceo con pinne ampie.

**Ambiente.** Vive nella frattura abissale sinaptica, un luogo dove la luce e' quasi assente e le forze della gravita' sono instabili, creando un habitat cruciale per la sua sopravvivenza e comportamento. I Leviatani Risonanti usano il canto risonante per comunicare all'interno del gruppo, armonizzandosi e riducendo lo stress, mentre le ghiandole eco mappanti permettono di interpretare i segnali minuti dell'ambiente.

**Tratti chiave.**

- `camere_risonanza_abyssal`: Il leviatano risonante risuonava attraverso le sue caverne interne, amplificando onde elettriche e gravitazionali per comunicare con i suoi simili nascosti nelle profondita' oceaniche.
- `emettitori_voidsong`: Gli emettitori voidsong del leviatano risonante producevano cori a frequenze profonde, creando un'armonia che stabilizzava la shear nella frattura abissale sinaptica.
- `corazze_ferro_magnetico`: Le corazze di ferro magnetico del leviatano risonante guidavano campi magnetici profondi, proteggendolo dalle forze abissali e integrando la sua struttura robusta.
- `bioantenne_gravitiche`: Le bioantenne gravitiche del leviatano risonante catturavano i shear gravitazionali della frattura abissale sinaptica e li convertivano in segnali utilizzabili.
- `emolinfa_conducente`: L'emolinfa conduttrice del leviatano risonante accumulava cariche energetiche, drenando energia nemica e trasformandola in forza per la creatura.
- `placche_pressioniche`: Le placche pressioniche del leviatano risonante disperdevano la forte pressione abissale, riducendo il trauma fisico che avrebbe potuto causare danni alla sua struttura.
- `filamenti_echo`: I filamenti echo del leviatano risonante rifrangevano le frequenze di squadra all'interno della frattura abissale sinaptica, attenuando shear e migliorando la comunicazione tra i membri della specie.
- `spicole_canalizzatrici`: Le spicole canalizzatrici del leviatano risonante assorbivano gli effetti negativi e li reindirizzavano, proteggendo la creatura dalle aggressioni ambientali.
- `lobi_risonanti_crepuscolo`: I lobi risonanti crepuscolo del leviatano risonante filtravano segnali instabili, mantenendo la stabilita' interna della creatura durante i cambiamenti ambientali.
- `pelle_piezo_satura`: La pelle piezo-satura del leviatano risonante accumulava carica piezoelettrica, riflettendo colpi e riducendo l'impatto fisico di eventuali attacchi.
- `canto_risonante`: Il canto risonante del leviatano risonante armonizzava il gruppo, diminuendo lo stress e creando una connessione psionica all'interno della frattura abissale sinaptica.
- `vortice_nera_flash`: Il vortice nera flash del leviatano risonante era un'implosione luminosa seguita da un vuoto temporaneo che permetteva alla creatura di teletrasportarsi brevemente.
- `ghiandole_eco_mappanti`: Le ghiandole eco mappanti del leviatano risonante interpretavano segnali minuti e pattern psionici instabili, permettendo alle squadre di navigare all'interno della frattura abissale sinaptica.
- `cuore_multicamera_bassa_pressione`: Il cuore multicamera bassa pressione del leviatano risonante pompe fluidi vitali con efficacia, permettendo alle squadre di interpretare segnali minuti e pattern psionici instabili.

## Lupo della Foresta -- `lupus_temperatus`

_Silvalupus temperatus | classe: Cursore quadrupede / predatore apex | bioma: Foresta Temperata Umida | indice senziente: T1_

**Concetto.** Si e' evoluto come predatore sociale di vertice, regolando le popolazioni di erbivori lungo i corridoi fluviali della foresta temperata.

**Aspetto.** Canide robusto dal mantello fulvo-grigio fitto, mascelle potenti e andatura instancabile da inseguitore di resistenza.

**Ambiente.** Si trova in aree di foreste temperate con vegetazione fitta e corsi d'acqua, dove predila i corridoi fluviali per la caccia. Operano in branco coordinato, con tattiche di caccia che sincronizzano le prese e mantengono la protezione del gruppo.

**Tratti chiave.**

- `empatia_coordinativa`: I lupi si sincronizzano per proteggere il cucciolo ferito mentre il branco caccia.
- `tattiche_di_branco`: I lupi si muovono in un'unica unita' per circondare la preda.
- `risonanza_di_branco`: La risonanza del branco amplifica la forza di ciascun membro durante la caccia.
- `focus_frazionato`: Un lupo tiene d'occhio il predatore mentre l'altro osserva il terreno.
- `occhi_infrarosso_composti`: I lupi seguono le scie termiche delle prede anche nel buio piu' fitto.

## Magneto Ridge Hunter -- `magneto_ridge_hunter`

_bioma: Calanchi Ferromagnetici | indice senziente: T1_

**Concetto.** Il Magneto Ridge Hunter ha occupato una nicchia ecologica specifica nei badlands, specializzandosi nella caccia a specie che vivono intorno ai magneto ridges. La sua evoluzione ha portato a una forte dipendenza da questo ambiente per la sua sopravvivenza e riproduzione.

**Aspetto.** Predatore quadrupede con cresta dorsale spinosa lungo la schiena.

**Ambiente.** Si adatta perfettamente ai terreni rocciosi e difficili dei badlands, dove trova rifugio tra le crepe e i crepacci. La sua sopravvivenza e' strettamente legata alla presenza di magneto ridges, che forniscono sia cibo che un ambiente adatto alla sua strategia di caccia. E' un predatore solitario che si muove lentamente tra le rocce, aspettando il momento giusto per attaccare. La sua strategia di caccia si basa sull'agguato, sfruttando la sua capacita' di mimetizzarsi e il suo olfatto acuto per individuare la preda.

## Myco Spire Warden -- `myco_spire_warden`

_bioma: Foresta Temperata Umida | indice senziente: T1_

**Concetto.** Ha occupato una nicchia evolutiva come guardiano delle spore, contribuendo alla riproduzione e alla diffusione delle specie vegetali nel suo habitat.

**Ambiente.** Si trova prevalentemente in aree di foresta temperata, dove le condizioni ambientali soddisfano le sue esigenze di sopravvivenza. Il comportamento e' guidato da istinti semplici, senza linguaggio o pianificazione, rispondendo principalmente alle stimolazioni ambientali.

## Fioritura di Nano-Ruggine -- `nano_rust_bloom`

_Oxidospora pestifera | classe: Colonia microbica decompositrice / minaccia patogena | bioma: Calanchi Ferromagnetici | indice senziente: T1_

**Concetto.** Occupa una nicchia ecologica unica come decompositore patogeno, svolgendo un ruolo chiave nella decomposizione di materiali organici e inorganici in ambienti estremi. La sua evoluzione e' guidata dall'adattamento a condizioni di scarsita' di risorse e alta pressione ambientale.

**Aspetto.** Patina coloniale rosso-ferro che fiorisce a chiazze, filamenti capillari e spore opache sospese nell'aria secca.

**Ambiente.** Si sviluppa in ambienti aridi e rocciosi, dove la sua capacita' di dissolvere metalli e carne rende possibile la sua sopravvivenza in aree inospitali. La sua struttura coloniale si adatta alle condizioni di scarsa umidita' e alta temperatura. Operano in modo istintivo, seguendo pulsioni semplici legate alla ricerca di nutrienti e alla diffusione delle spore. Non mostrano pianificazione, ma agiscono in modo coordinato per colonizzare nuovi substrati.

**Tratti chiave.**

- `filamenti_digestivi_compattanti`: I filamenti digestivi compattano i resti e liberano spazio vitale, accelerando la decomposizione.
- `spore_psichiche_silenziate`: Le spore psichiche silenziate sedano e confondono i bersagli vicini, indebolendone la reazione.
- `scheletro_idro_regolante`: Lo scheletro idro-regolante modula il contenuto idrico per mutare la massa e adattarsi alle condizioni ambientali.
- `carapace_fase_variabile`: Il carapace fase variabile cambia densita' per bilanciare difesa e mobilita', ottimizzando la sopravvivenza.
- `sangue_piroforico`: Il sangue piroforico incendia l'aria colpendo chi perfora la corazza, creando una barriera di fiamma.

## Nottola Termica -- `noctule_termico`

_Thermonoctus vagans | classe: Volatore planatore notturno / disperdente-ponte | bioma: deserto caldo | indice senziente: T1_

**Concetto.** La Nottola Termica occupa una nicchia evolutiva specifica nel deserto caldo, combinando capacita' di volo notturno, adattamenti termoregolatori e un ruolo ecologico nel trasferimento di polline tra le aree vegetate isolate.

**Aspetto.** Piccolo volatore dalle ali membranose scure, grandi padiglioni auricolari per l'ecolocalizzazione e occhi adattati al buio.

**Ambiente.** Si trova prevalentemente in ambienti desertici caldi, dove si muove tra le isole di vegetazione, sfruttando le zone piu' fresche per riposare e ripararsi dal calore del sole. E' un volatore notturno che caccia insetti durante il crepuscolo, impollinando i fiori notturni e contribuendo alla connessione tra le isole di vegetazione. Utilizza l'ecolocalizzazione per orientarsi nel buio.

**Tratti chiave.**

- `cuticole_cerose`: Le cuticole cerose assorbono e convertono energia da diverse fonti, aiutando il Nottola Termica a sopravvivere in ambienti dinamici come i deserti caldi.
- `grassi_termici`: I grassi termici permettono al Nottola Termica di stabilizzare l'assorbimento e la conversione energetica, essenziale per la sua sopravvivenza nel deserto caldo.
- `pelli_cave`: Le pelli cave, con sacche d'aria interne, fungono da barriera termica leggera, riducendo il trasferimento di calore in condizioni aride.
- `pigmenti_aurorali`: I pigmenti aurorali fluorescono sotto luce polare o tempesta magnetica, mimetizzando il Nottola Termica tra i bagliori atmosferici.
- `proteine_shock_termico`: Le proteine di shock termico stabilizzano i polipeptidi sotto stress termico, prevenendo la denaturazione cellulare durante i picchi di temperatura.
- `reti_capillari_radici`: Le reti capillari radici rimuovono calore e scambiano fluidi con i substrati vegetali, regolando la temperatura basale del Nottola Termica.

## Zannapiedi -- `perfusuas_pedes`

_Perfusuas pedes | classe: Mammalo-artropode | bioma: Caverna Risonante | indice senziente: T3_

**Concetto.** Come predatore cieco, ha sviluppato sonar e chimio-navigazione per esplorare e cacciare, con una strategia di sopravvivenza basata sull'estroflessione gastrica acida e l'artiglio cinetico a urto.

**Aspetto.** Corpo allungato corazzato da placche flessibili, centinaia di arti corti e rapidi. Regione cefalica protetta, un'appendice anteriore ipertrofica per l'urto. Addome con sacche ripiegabili.

**Ambiente.** Si muove in ambienti sotterranei, dove la sua locomozione miriapode ibrida gli permette di aderire e arrampicarsi su qualsiasi superficie. Possiede una sentienza T3, risolvendo problemi concreti e usando rudimentalmente strumenti, con comportamenti predatori basati su attacchi a urto e digestione extracorporea.

**Tratti chiave.**

- `ermafroditismo_cronologico`: Dopo ogni ciclo di incubazione, il Zannapiedi cambia sesso per adattarsi alle nuove condizioni ambientali delle caverne.
- `locomozione_miriapode_ibrida`: Il Zannapiedi si aggrappa e scala su pareti di roccia grazie a centinaia di arti rapidi e flessibili.
- `estroflessione_gastrica_acida`: Le sacche gastriche del Zannapiedi liquefanno i tessuti delle prede al contatto, assorbendone i nutrienti.
- `artiglio_cinetico_a_urto`: L'appendice ipertrofica del Zannapiedi genera onde d'urto che fratturano la corazza delle prede.
- `sistemi_chimio_sonici`: Il Zannapiedi, utilizzando chimica e suoni, mappa le caverne senza vista, individuando prede e correnti d'aria.

## Polpo Araldo Sinaptico -- `polpo_araldo_sinaptico`

_Polpo Araldo Sinaptico | bioma: Frattura Abissale Sinaptica | indice senziente: T5_

**Concetto.** Ha sviluppato membrane fotoconvoglianti e nodi sinaptici superficiali per amplificare segnali elettrici, permettendogli di operare come specie keystone nel suo ambiente.

**Aspetto.** Cefalopode dal corpo bulboso e tentacoli divaricati.

**Ambiente.** Si muove attraverso le fratture abissali sinaptiche, dove le correnti elettriche e la luce bioluminescente interagiscono per creare un ambiente estremamente dinamico e pericoloso. Utilizza i filamenti guidalampo per tracciare rotte sicure e i canti risonanti per ridurre lo stress nel gruppo. Le ghiandole mnemoniche conservano memorie attraverso segnali attenuati.

**Tratti chiave.**

- `impulsi_bioluminescenti`: Scariche ritmiche che abbagliano e sincronizzano alleati.
- `nodi_sinaptici_superficiali`: Reticolo di nodi che amplificano segnali superficiali.
- `membrane_fotoconvoglianti`: Tessuti che trasportano cariche luminose tra nodi sinaptici.
- `lobi_risonanti_crepuscolo`: Camere risonanti che filtrano segnali instabili.
- `filamenti_guidalampo`: Filamenti che tracciano rotte sicure nelle correnti.
- `sensori_planctonici`: Sensori diffusi che leggono pattern di plancton memetico.
- `ghiandole_mnemoniche`: Secrezioni che trattengono copie attenuate di buff.
- `secrezioni_antistatiche`: Film protettivo che disperde accumuli elettrici.
- `scintilla_sinaptica`: Scarica leggera che illumina connessioni e riflessi (temp).
- `canto_risonante`: Frequenze che armonizzano il gruppo e riducono stress (temp).
- `tentacoli_uncinati`: Tentacoli con uncini cheratinosi che afferrano e immobilizzano per 1 turno (frattura).

## Mutaforma Cellulare -- `proteus_plasma`

_Proteus plasma | classe: Protista complesso | bioma: Palude Tossica | indice senziente: T0_

**Concetto.** Occupa un ruolo ecologico come decompositore efficiente, sfruttando la sua plasticita' di forma per inglobare e digerire materia organica in ambienti con scarsa ossigenazione.

**Aspetto.** Massa semi-trasparente, iridescenze deboli; estroflessioni pseudopodiali costanti. Variazione volumetrica rapida.

**Ambiente.** Si trova principalmente in paludi e zone umide, dove la sua membrana plastica continua permette di adattarsi al substrato sabbioso e alla presenza di sostanze chimiche variabili. Il comportamento e' basato su reazioni istintive: si muove con flusso ameboide controllato, si nutre mediante fagocitosi e si riproduce attraverso fusione di unita'.

**Tratti chiave.**

- `membrana_plastica_continua`: La creatura si modella continuamente assumendo diverse forme e densita' per adattarsi al suo ambiente paludoso.
- `flusso_ameboide_controllato`: Scivola silenziosamente lungo le superfici lisce, muovendosi con un flusso ameboide controllato.
- `fagocitosi_assorbente`: Ingegna e digerisce interi frammenti di biomassa, assorbendo nutrienti attraverso la sua membrana plastica.
- `moltiplicazione_per_fusione`: Aumenta la sua massa e complessita' unendo altre unita' simili, senza alcun comportamento cognitivo.
- `cisti_di_ibernazione_minerale`: In condizioni avverse, si ritrae in una cistifera minerale, entrando in una stasi inattiva.

## Psionerva Montano -- `psionerva_montis`

_Psionerva montis | classe: Bridge | bioma: Caldera Glaciale | indice senziente: T4_

**Concetto.** La psionerva montis ha sviluppato una nicchia evolutiva unica all'interno della caldera glaciale, grazie alla sua capacita' di adattare il metabolismo a condizioni di criostasi e alla sua abilita' di comunicare e condividere energia con il branco. Questi adattamenti le permettono di sopravvivere e prosperare in un ambiente estremo e di sfruttare le risorse limitate del suo habitat.

**Aspetto.** Arrampica la caldera glaciale con l'attenzione di chi legge il paesaggio come testo: le corna psico-conduttive captano le correnti ferromagnetiche che altri esseri ignorano, traducendo il silenzio del ghiaccio in informazione navigabile. Abita la soglia tra il freddo e lo psionico, curiosa di entrambi.

**Ambiente.** La psionerva montis abita la caldera glaciale, un ambiente estremo caratterizzato da temperature estremamente basse e una scarsita' di risorse. La sua capacita' di adattare il metabolismo a condizioni di criostasi gli permette di sopravvivere a stagioni estreme e di sfruttare le risorse limitate del suo habitat. La psionerva montis si muove come un arrampicatore criogenico, utilizzando la sua abilita' di olfatto magnetico per navigare attraverso la caldera glaciale. Le corna psico-conduttive captano le correnti ferromagnetiche, traducendo il silenzio del ghiaccio in informazione navigabile, mentre il focus frazionato gli permette di mantenere due minacce in sorveglianza attiva.

**Tratti chiave.**

- `corna_psico_conduttive`: Le corna psico-conduttive della psionerva montis captano le correnti ferromagnetiche, traducendo il silenzio del ghiaccio in informazioni utili per il branco.
- `focus_frazionato`: Il focus frazionato permette alla psionerva montis di mantenere due minacce sotto sorveglianza attiva, aumentando la sua capacita' di risposta.
- `criostasi_adattiva`: La criostasi adattiva permette alla psionerva montis di sopravvivere a stagioni estreme prolungate, mantenendo un metabolismo sospeso.
- `olfatto_risonanza_magnetica`: L'olfatto di risonanza magnetica permette alla psionerva montis di tracciare campi magnetici e vene metalliche, guidandola attraverso il paesaggio.
- `metabolismo_di_condivisione_energetica`: Il metabolismo di condivisione energetica permette alla psionerva montis di trasferire substrati via contatto, sostenendo feriti o giovani con una riserva collettiva.
- `lobi_risonanti_crepuscolo`: I lobi risonanti crepuscolari filtrano segnali instabili, aiutando la psionerva montis a navigare tra le complessita' del suo ambiente.
- `antenne_tesla`: Le antenne Tesla permettono alle squadre di psionerve montis di ridistribuire carichi e modulare la rigidita' strutturale all'interno della caldera glaciale.
- `capillari_criogenici`: I capillari criogenici permettono alle squadre di psionerve montis di ridistribuire carichi e modulare la rigidita' strutturale all'interno della caldera glaciale.
- `artigli_sghiaccio_glaciale`: Gli artigli sghiaccio-glaciale congelano e fissano il bersaglio al contatto, rendendo la psionerva montis un predatore efficiente.
- `enzimi_antifase_termica`: Gli enzimi antifase termica permettono alle squadre di psionerve montis di ottenere presa e accelerazioni controllate su terreni estremi all'interno della caldera glaciale.
- `occhi_cristallo_modulare`: Gli occhi cristallo-modulare riallineano il fuoco tra spettro visibile e ionico, utili in microgravita' variabile.
- `lingua_cristallina`: La lingua cristallina permette alle squadre di psionerve montis di disperdere energia e attenuare impatti corrosivi o termici all'interno della caldera glaciale.
- `gusci_criovetro`: I gusci criovetro permettono alle squadre di psionerve montis di coordinare scambi di risorse e parametri di stabilizzazione di squadra all'interno della caldera glaciale.

## Razziatore di Polvere -- `pulverator_gregarius`

_Pulverator gregarius | classe: Apex | bioma: Savana Ionizzata | indice senziente: T2_

**Concetto.** Come specie apex, il pulverator gregarius occupa un ruolo dominante nella sua nicchia ecologica, sfruttando la sua capacita' di coordinazione di branco e la sua efficacia nella caccia per mantenere l'equilibrio del suo ambiente.

**Aspetto.** Nato dove la savana smette di fingere e la sabbia governa senza appello, si muove in branco con la stessa logica del vento: non sceglie una direzione, la porta. I denti seghettati lasciano tracce che il suolo ricorda giorni dopo; gli artigli sette-vie incidono l'aria come scrittura che solo il territorio sa leggere. Dove il branco e' passato, le voci nel vuoto tacciono.

**Ambiente.** Si muove in branco attraverso la savana, seguendo una logica simile al vento: non sceglie una direzione, la porta, sfruttando la sua adattabilita' al suolo asciutto e alle condizioni climatiche estreme. Il branco opera in sincronia, con tattiche di preda condivise e un comportamento focalizzato su attacchi mirati, mentre la risorsa condivisa e la comunicazione risonante mantengono la coesione del gruppo.

**Tratti chiave.**

- `denti_seghettati`: I denti seghettati lacerano la carne del bersaglio e applicano sanguinamento profondo (2 turni).
- `artigli_sette_vie`: Gli artigli multipli assicurano presa stabile su superfici irregolari.
- `voce_imperiosa`: La voce risonante paralizza la volonta' dei deboli applicando 2 turni di panic in melee.
- `circolazione_doppia`: La circolazione doppia permette alle squadre di coordinare scambi di risorse e parametri di stabilizzazione di squadra all'interno della savana.
- `olfatto_risonanza_magnetica`: I bulbi olfattivi tracciano campi magnetici e vene metalliche.
- `risonanza_di_branco`: La rete risonante amplifica buff condivisi del branco.
- `tattiche_di_branco`: Il protocollo tattico coordina focus e prese condivise.
- `focus_frazionato`: Il cortex biforcato mantiene due minacce in sorveglianza attiva.

## Camoscio Psionico -- `rupicapra_sensoria`

_Rupicapra sensoria | classe: Mammalia | bioma: Caldera Glaciale | indice senziente: T5_

**Concetto.** Il Camoscio Psionico occupa un ruolo keystone nel suo ambiente, grazie alla sua capacita' di condividere energia e risorse. Questo lo rende un elemento chiave per la stabilita' ecologica delle caldere glaciali, mantenendo l'equilibrio tra predazione e sopravvivenza.

**Aspetto.** Erbivoro agile, corna scolpite con circuiti naturali, zoccoli con micro-lamelle adesive; mantello bruno.

**Ambiente.** Si trova in caldere glaciali, dove la sua biologia e' perfettamente adattata a temperature estreme e a superfici ripide. Le sue unghie a micro-adesione gli permettono di muoversi con agilita' sugli scogli e sulle pareti rocciose. Il Camoscio Psionico vive in branco, utilizzando la sua rete psionica di branco per difesa e comunicazione. La sua coscienza diffusa dell'alveare permette una coordinazione sociale avanzata e una difesa collettiva contro i predatori.

**Tratti chiave.**

- `corna_psico_conduttive`: Le corna piezo-neurotoniche trasmettono e ricevono segnali neurali lenti per allertare il branco.
- `coscienza_d_alveare_diffusa`: La rete sinaptica inter-individuo temporanea fonde decisioni e memoria a breve termine.
- `aura_di_dispersione_mentale`: Il campo di odori avversivi ed emissioni deboli induce ansia e vertigini nei predatori.
- `metabolismo_di_condivisione_energetica`: Il trasferimento di substrati via contatto sostiene feriti o giovani con una riserva collettiva.
- `unghie_a_micro_adesione`: Le lamelle a micro-setole su zoccoli aderiscono a superfici ripide per fughe verticali e pascolo.

## Spazzino della Ruggine -- `rust_scavenger`

_Ferrivora saprophaga | classe: Saprofago corazzato / specie chiave | bioma: Calanchi Ferromagnetici | indice senziente: T1_

**Concetto.** La sua nicchia evolutiva si basa sulla capacita' di trasformare detrito in nutrienti, creando un ciclo di riciclaggio che supporta altri organismi. Questo lo rende un elemento indispensabile per la riproduzione e la crescita del suolo nel deserto dei metalli.

**Aspetto.** Corpo tozzo e corazzato a piastre rugginose, mandibole trituranti e sacche ventrali gonfie di gastroliti.

**Ambiente.** Si trova nei badlands, dove il terreno e' ricco di detrito ferroso e la scarsita' di acqua richiede un adattamento unico. Questo ambiente ha plasmato la sua struttura fisica e le sue funzioni vitali, rendendolo un elemento chiave del suolo. Il rust scavenger opera in modi istintivi, scavando e compattando detrito ferroso per riciclare i metalli. Le sue azioni creano spazi per nuove forme di vita, mantenendo un equilibrio ecologico.

**Tratti chiave.**

- `ventriglio_gastroliti`: Il ventriglio muscoloso macina con ferocia i detriti ferrosi, sfrigolando mentre i gastroliti li riducono in polvere.
- `respiro_a_scoppio`: Le valvole toraciche si aprono con un sibilo, rilasciando getti di aria calda che spostano la sabbia e aprono nuove aree di ricerca.
- `filamenti_digestivi_compattanti`: I filamenti digestivi si contraggono, compattando i resti di metallo e liberando spazio vitale per nuove sostanze.
- `nucleo_ovomotore_rotante`: Il nucleo rotante scivola lungo il terreno, trasformando il corpo in una ruota motrice che trascina i detriti verso il ventriglio.

## Scavatore delle Sabbie -- `sand_burrower`

_Arenofossor saliphilus | classe: Cursore quadrupede fossorio / detritivoro | bioma: Calanchi Ferromagnetici | indice senziente: T1_

**Concetto.** Occupa una nicchia fossoriale nel bioma delle dune aride, scavando gallerie per sopravvivere al calore estremo e trovare cibo. Il suo scheletro idro-regolante e il carapace a fase variabile gli permettono di adattarsi alle condizioni estreme del deserto.

**Aspetto.** Corpo basso e corazzato a fasi variabili, arti molleggiati e carapace opaco color ruggine che lo mimetizza nel suolo ferroso.

**Ambiente.** Si muove e si nasconde nei deserti aridi, dove la sua capacita' di scavare e la sua mimetizzazione lo rendono invisibile ai predatori e alle forze esterne. La sua sopravvivenza dipende dall'accesso a cripto-flora e detrito sottostante. Il sand burrower si muove a balzi, utilizzando zampe a molla per spostarsi tra le gallerie scavate. Il suo comportamento e' guidato da istinti semplici, senza pianificazione o linguaggio, e si concentra sulla ricerca di cibo e la difesa dal calore.

**Tratti chiave.**

- `nucleo_ovomotore_rotante`: Il nucleo rotante permette alla creatura di muoversi rapidamente sottoterra.
- `sacche_galleggianti_ascensoriali`: Le sacche gassose regolabili aiutano la creatura a mantenere l'equilibrio durante lo scavare.
- `scheletro_idro_regolante`: Lo scheletro poroso modula l'acqua per adattare la massa corporea al terreno.
- `carapace_fase_variabile`: Il carapace cambia densita' per bilanciare la difesa e la mobilita'.
- `zampe_a_molla`: Le zampe a molla accumulano energia per permettere balzi di riposizionamento.

## Sciame di Larve Neurali -- `sciame_larve_neurali`

_Sciame Larve Neurali | bioma: Frattura Abissale Sinaptica | indice senziente: T2_

**Concetto.** Le larve neurali occupano una nicchia evolutiva come predatori e avversari, sfruttando le proprieta' del loro ambiente per accumulare e redistribuire buff. La loro evoluzione ha portato a una serie di tratti che permettono l'assorbimento, la trasformazione e la duplicazione di effetti, rendendole efficienti nella gestione delle risorse sinaptiche e nella sopravvivenza in un ambiente caotico.

**Aspetto.** Ammasso di numerose piccole larve neurali (reso come corpo singolo segmentato dal limite LoRA).

**Ambiente.** Le larve neurali si muovono attraverso la frattura abissale sinaptica, un ambiente caratterizzato da un'alta concentrazione di segnali instabili e accumuli elettrici. Questo habitat offre loro la possibilita' di utilizzare le loro ghiandole mnemoniche e le spicole canalizzatrici per assorbire e reindirizzare buff. La loro biologia e' strettamente legata al mantenimento dell'equilibrio elettrico e alla gestione delle frequenze di squadra. Le larve neurali mostrano una determinazione intrinseca grazie al tratto spirito combattivo, che le protegge da status come panic e fear. Il loro comportamento e' guidato da un richiamo gregario attraverso il canto di richiamo, che amplifica la furia dopo un combattimento. Le loro azioni sono coordinate tramite il riverbero memetico, che duplica i buff a potenza ridotta, mantenendo la coesione del gruppo.

**Tratti chiave.**

- `nebbia_mnesica`: La nebbia mnesica si espande, offuscando le memorie e il senso dell'orientamento degli avversari.
- `lobi_risonanti_crepuscolo`: I lobi risonanti del crepuscolo filtrano segnali instabili, stabilizzando la comunicazione tra le larve.
- `ghiandole_mnemoniche`: Le ghiandole mnemoniche rilasciano secrezioni che trattengono copie attenuate di buff, amplificando la resistenza del gruppo.
- `organi_metacronici`: Gli organi metacronici sequenziano i furti di buff in catena, ottimizzando la distribuzione delle abilita'.
- `secrezioni_antistatiche`: Le secrezioni antistatiche creano un film protettivo che disperde gli accumuli elettrici, prevendone danni.
- `spicole_canalizzatrici`: Le spicole canalizzatrici assorbono i buff e li reindirizzano all'interno dello sciame, migliorando la sinergia.
- `filamenti_echo`: I filamenti echo rilanciano frequenze di squadra e attenuano lo shear, mantenendo la coesione del gruppo.
- `riverbero_memetico`: Il riverbero memetico genera un eco cognitivo che duplica i buff a potenza ridotta, aumentando la resistenza collettiva.
- `vortice_nera_flash`: Il vortice nera flash si forma in un'implosione luminosa, seguita da un vuoto e un teletrasporto breve che evita i danni.
- `spirito_combattivo`: Lo spirito combattivo mantiene la determinazione anche sotto pressione, resistendo a stati di panico e paura.
- `canto_di_richiamo`: Il canto di richiamo risuona post-kill, amplificando la furia per due turni e onorando la preda caduta.

## Sentinella Radice -- `sentinella_radice`

_Radicustos vigilans | classe: Organismo radicante sessile / ingegnere d'ecosistema | bioma: Foresta Temperata Umida | indice senziente: T3_

**Concetto.** L'evoluzione della sentinella radice e' orientata verso la protezione e la cooperazione tra le piante, svolgendo il ruolo di ingegneri radicanti semi-sessili che segnalano e contengono le minacce che attraversano il suolo.

**Aspetto.** Tronco-sentinella nodoso ricoperto di radici aeree sensoriali, con escrescenze a occhio che si schiudono al passaggio di intrusi.

**Ambiente.** Si trova in ambienti di foreste temperate, dove le sue radici aeree sensoriali e il suo sistema di tratti comportamentali gli permettono di interagire con il suolo e con gli altri organismi in modo altamente adattivo. Il comportamento della sentinella radice si basa su un focus frazionato, un pathfinder, un pianificatore, un random e un empatia coordinativa, che combinano problem-solving concreto e un uso rudimentale di strumenti per adattarsi ai cambiamenti ambientali.

**Tratti chiave.**

- `focus_frazionato`: La sentinella radice tiene sotto controllo due minacce contemporaneamente con il suo cortex biforcato, mantenendo una sorveglianza precisa e attiva.
- `pathfinder`: La sentinella radice utilizza la sua suite esplorativa per individuare e segnalare rotte sicure attraverso biomi imprevedibili, guidando la squadra verso zone protette.
- `pianificatore`: Il modulo strategico della sentinella radice organizza le priorita' e stabilisce finestre d'attacco coordinate, garantendo un'azione mirata e efficiente.
- `empatia_coordinativa`: La rete empatica della sentinella radice sincronizza le cure e le difese dell'intera squadra, creando una collaborazione armoniosa e reattiva.

## Fioritura di Silice -- `silica_bloom`

_Siliciflora pestifera | classe: Colonia microbica silicea / minaccia patogena | bioma: deserto caldo | indice senziente: T1_

**Concetto.** La nicchia evolutiva si basa sulla capacita' di colonizzare e modificare il substrato in modo aggressivo, sfruttando le condizioni estreme del deserto caldo. La sua struttura vetracea e la capacita' di assorbire e convertire energia multi-fonte le permettono di occupare un ruolo chiave nel ciclo di nutrienti e nella gestione termica dell'ambiente.

**Aspetto.** Efflorescenza cristallina bianco-opalescente che cresce a placche taglienti, scintillante di micro-schegge silicee.

**Ambiente.** Si trova principalmente in deserti caldi, dove la sua capacita' di incrostare i produttori con strutture vetrose permette di sfruttare il substrato e diffondere schegge patogene nel vento di polvere. Questa adattazione le consente di competere con altre specie per risorse limitate. Il comportamento e' guidato da istinti semplici, con una strategia di crescita aggressiva che mira a colonizzare aree di substrato disponibile. La sua espansione e' facilitata dal trasferimento di calore e la regolazione della temperatura basale attraverso reti capillari radicale.

**Tratti chiave.**

- `cuticole_cerose`: Le cuticole cerose assorbono e convertono l'energia del sole e del vento in modo efficiente, permettendo alla Fioritura di Silice di sopravvivere negli ambienti desertici estremi.
- `grassi_termici`: I grassi termici contribuiscono a mantenere un equilibrio termico interno, aiutando la creatura a resistere alle alte temperature del deserto.
- `pelli_cave`: Le pelli cave, con le loro sacche d'aria, agiscono come una barriera termica leggera, riducendo il calore assorbito durante le giornate torride.
- `proteine_shock_termico`: Le proteine di shock termico proteggono le cellule dalle denaturazioni causate da picchi di temperatura, garantendo la sopravvivenza della Fioritura di Silice.
- `reti_capillari_radici`: Le reti capillari radici scambiano calore e fluidi con i substrati vegetali, aiutando la creatura a regolare la sua temperatura basale in modo efficiente.

## simbionte corallino riflesso -- `simbionte_corallino_riflesso`

_Simbionte Corallino Riflesso | bioma: Frattura Abissale Sinaptica | indice senziente: T3_

**Concetto.** La loro nicchia evolutiva si basa sull'adattamento a un ambiente estremo, dove la capacita' di canalizzare energia elettromagnetica, gestire cariche e mantenere una struttura sinaptica stabile ha permesso loro di occupare un ruolo supportivo all'interno della frattura abissale sinaptica.

**Ambiente.** Risiedono all'interno della frattura abissale sinaptica, dove la combinazione di correnti elettromagnetiche e materiali biologici crea un ambiente ideale per la loro sopravvivenza. Questo habitat e' caratterizzato da una interazione dinamica tra energia e struttura biologica. I simbionti corallini riflessi mostrano un comportamento altamente coordinato, utilizzando i loro sensori planctonici per leggere pattern e comunicare attraverso scintille sinaptiche e canti risonanti. La loro capacita' di gestire e trasmettere buff attraverso organi metacronici e ghiandole mnemoniche li rende estremamente adatti al loro ambiente.

**Tratti chiave.**

- `coralli_sinaptici_fotofase`: Le barriere bioelettriche canalizzano luce e impulsi, creando un'illuminazione sinaptica che guida i movimenti del gruppo.
- `membrane_fotoconvoglianti`: I tessuti trasportano cariche luminose tra nodi sinaptici, rafforzando la comunicazione interna.
- `placca_diffusione_foschia`: Le placche diffondono e attenuano cariche erratiche, mantenendo la stabilita' del sistema.
- `organi_metacronici`: Gli organi sequenziano i furti di buff in catena, ottimizzando la distribuzione energetica.
- `nodi_sinaptici_superficiali`: Il reticolo di nodi amplifica segnali superficiali, migliorando la risposta ai cambiamenti ambientali.
- `filamenti_guidalampo`: I filamenti tracciano rotte sicure nelle correnti, guidando il gruppo verso zone protette.
- `ghiandole_mnemoniche`: Le secrezioni trattengono copie attenuate di buff, permettendo un ricordo parziale degli eventi.
- `sensori_planctonici`: I sensori diffusi leggono pattern di plancton memetico, individuando fonti di energia e minacce.
- `emolinfa_conducente`: Il fluido accumula carica e drena energia nemica, proteggendo il gruppo da attacchi.
- `scintilla_sinaptica`: La scarica leggera illumina connessioni e riflessi, migliorando la coordinazione istantanea.
- `riverbero_memetico`: L'eco cognitivo duplica buff a potenza ridotta, rafforzando la memoria collettiva.
- `canto_risonante`: Le frequenze armonizzano il gruppo e riducono stress, mantenendo la coesione sociale.
- `spirito_combattivo`: Il tratto comportamentale mantiene la determinazione sotto pressione, impedendo la diffusione del panico.
- `carapace_luminiscente_abissale`: Il guscio bioluminescente confonde i predatori nelle profondita', offrendo una difesa visiva.

## Slag Veil Ambusher -- `slag_veil_ambusher`

_bioma: Calanchi Ferromagnetici | indice senziente: T1_

**Concetto.** La sua evoluzione ha favorito un'adattamento al bioma dei badlands, con una capacita' di sopravvivere in condizioni di scarsita' di acqua e di cibo.

**Aspetto.** Predatore d'agguato dal profilo curvo, carapace drappeggiato a velo.

**Ambiente.** Si muove attraverso le aree rocciose e le zone desertificate, sfruttando le crepe e le gallerie per nascondersi e cacciare. E' un predatore solitario che si muove in silenzio, utilizzando l'udito e l'olfatto per individuare le prede, senza dipendere dalla vista.

## Sonaraptor Dissonante -- `sonaraptor_dissonans`

_Sonaraptor dissonans | classe: Threat | bioma: Canopia Ionica | indice senziente: T4_

**Concetto.** Occupa una nicchia predatoria nel canopia ionica, sfruttando le proprieta' acustiche e ottiche dell'ambiente per cacciare e comunicare senza essere rilevato, grazie ai suoi adattamenti multi-sensuali e alla sua capacita' di manipolare il suono.

**Aspetto.** Nell'istante prima dell'attacco, tutta la canopia ionica diventa silenziosa: il suo campo di interferenza acustica precede il corpo di due secondi. La lancia sonica che emette non e' un grido -- e' la negazione del suono altrui, un vuoto che si espande fino a stordire prima che le zanne tocchino. Predatore che uccide il senso prima del corpo.

**Ambiente.** Si muove nei livelli superiori della canopia ionica, dove la sua capacita' di modulare il suono e la sua visione multi-spettrale gli permettono di operare in condizioni di scarsa visibilita' e di sfruttare le proprieta' acustiche dell'ambiente. Utilizza il campo di interferenza acustica per mascherare la propria posizione e la sua lancia sonica per stordire la preda, mentre le antenne Tesla e le ali solari fotoni gli permettono di interagire con l'ambiente ionico.

**Tratti chiave.**

- `cannone_sonico_a_raggio`: Il Sonaraptor Dissonante lancia un raggio sonico che stordisce i nemici, sfruttando la sua capacita' di generare onde di pressione ad alta frequenza.
- `campo_di_interferenza_acustica`: Prima di attaccare, il Sonaraptor Dissonante crea un campo di interferenza acustica che blocca i suoni esterni, rendendolo invisibile e inascoltato.
- `sistemi_chimio_sonici`: Utilizzando i sistemi chimio-sonici, il Sonaraptor Dissonante mappa l'ambiente e le correnti d'aria senza dover dipendere dalla vista.
- `visione_multi_spettrale_amplificata`: La visione multi-spettrale amplificata del Sonaraptor Dissonante gli permette di vedere anche in condizioni di luminosita' estremamente bassa.
- `comunicazione_fotonica_coda_coda`: Il Sonaraptor Dissonante comunica con gli altri membri della sua specie tramite impulsi luminosi trasmessi attraverso la coda.
- `ali_fono_risonanti`: Le ali fono-risonanti del Sonaraptor Dissonante generano una vasta gamma di suoni durante il volo, utilizzati per comunicare e navigare.
- `antenne_tesla`: Le antenne Tesla del Sonaraptor Dissonante permettono alle squadre di ridistribuire carichi e modulare la rigidita' strutturale all'interno della canopia ionica.
- `ali_solari_fotoni`: Le ali solari fotoni del Sonaraptor Dissonante sono dotate di piume fotovoltaiche che convertono la luce in spinta e forniscono schermature contro la radianza.
- `denti_tuning_fork`: I denti tuning fork del Sonaraptor Dissonante permettono alle squadre di ridistribuire carichi e modulare la rigidita' strutturale all'interno di una canopia ionica.
- `coda_stabilizzatrice_vortex`: La coda stabilizzatrice vortex del Sonaraptor Dissonante canalizza l'energia cinetica o elementale in colpi mirati all'interno della canopia ionica.
- `branchie_eoliche`: Le branchie eoliche del Sonaraptor Dissonante interpretano segnali minuti e pattern psionici instabili all'interno della canopia ionica.

## Libellula Sonica -- `soniptera_resonans`

_Soniptera resonans | classe: Insecta | bioma: Canopia Ionica | indice senziente: T2_

**Concetto.** La specie occupa un'evoluzione specifica nel canopico ionico, dove la manipolazione sonora e il volo a bassa latenza sono vantaggi competitivi per sopravvivere e predare in un ambiente ad alta attivita' elettrica.

**Aspetto.** Insetto alato di grandi dimensioni; ali traslucide con venature ispessite; occhi composti lucidi; addome segmentato aerodinamico.

**Ambiente.** Si trova nei strati superiori delle foreste ioniche, dove le correnti elettriche e la presenza di onde sonore creano un ambiente ideale per il suo volo e manipolazione sonora. Utilizza il campo di interferenza acustica per evitare predatori e per cacciare prede, mentre il cannone sonico a raggio serve per difesa o attacco. Il cervello a bassa latenza permette manovre veloci e precise.

**Tratti chiave.**

- `ali_fono_risonanti`: Durante il volo, le ali traslucide emettono un suono risonante che copre l'intero spettro udibile.
- `cannone_sonico_a_raggio`: Il cannone sonico a raggio emette un impulso acustico potente che stordisce i nemici vicini.
- `campo_di_interferenza_acustica`: Il campo di interferenza acustica confonde i predatori, rendendo difficile individuare la posizione dell'insetto.
- `cervello_a_bassa_latenza`: Il cervello a bassa latenza permette al soniptera di eseguire manovre veloci e precise in volo.
- `occhi_cinetici`: Gli occhi cinetici permettono all'insetto di percepire le onde sonore come pattern visibili nell'aria.

## Vagabondo della Volta -- `sp_arboryxis_lenis`

_Arboryxis lenis | classe: Bridge | bioma: Foresta Temperata Umida | indice senziente: T1_

**Concetto.** La sua esistenza e' un ponte tra due biomi, permettendo una permeabilita' dei confini e facilitando un'interazione tra ecosistemi che altrimenti resterebbero separati.

**Aspetto.** Bruca lentamente, senza urgenza, seguendo il bordo tra la copertura arborea e lo spazio aperto come se cercasse il punto esatto dove un habitat lascia spazio all'altro. Non e' il piu' veloce ne' il piu' forte: e' il piu' presente, e la sua presenza rende permeabile ogni confine che incontra.

**Ambiente.** Si muove lungo i margini tra la foresta e lo spazio aperto, trovando un equilibrio tra la copertura vegetale e l'apertura, senza preferenze specifiche per un ambiente piu' che l'altro. Si muove lentamente e con intenzione, seguendo i confini tra habitat, come se cercasse di comprendere dove un ambiente termina e un altro inizia, senza urgenza ne' fretta.

## Brucatore di Polvere -- `sp_arenaceros_placidus`

_Arenaceros placidus | classe: Keystone | bioma: Savana Ionizzata | indice senziente: T1_

**Concetto.** Occupa una nicchia evolutiva come specie keystone, dove le sue membrane eliofiltranti e artigli radice influenzano positivamente l'ecosistema, permettendo a altri brucatori di beneficiare della sua biomassa pre-digerita.

**Aspetto.** Le membrane eliofiltranti trasformano ogni ora di luce in biomassa che non trattiene per se': i brucatori la trovano gia' parzialmente pre-digerita nei solchi che gli artigli-radice lasciano nel suolo. Pascola senza fretta, perche' sa di essere la condizione di possibilita' di tutto cio' che pascola con lui.

**Ambiente.** Si muove nei territori di savana, dove le sue membrane eliofiltranti lo proteggono dalle radiazioni e i suoi artigli radice permettono di scavare e prevedere traiettorie. Il comportamento e' guidato da istinti semplici, con un'attenzione particolare alla luce solare, che converte in biomassa per il sostentamento, senza trattenere nulla per se'.

**Tratti chiave.**

- `artigli_radice`: I brucatori di Polvere utilizzano gli artigli radice per scavare solchi nel suolo, lasciando una traccia di biomassa pre-digerita che altri animali possono trovare e consumare.
- `membrane_eliofiltranti`: Le membrane eliofiltranti dei brucatori di Polvere schermano le radiazioni e i patogeni sospesi, permettendo loro di sopravvivere in ambienti estremi della savana.

## Saettatore delle Dune -- `sp_arenavolux_sagittalis`

_Arenavolux sagittalis | classe: Apex | bioma: Savana Ionizzata | indice senziente: T2_

**Concetto.** Occupando un ruolo di apex predatore, la sua evoluzione si e' concentrata sulla capacita' di anticipare e reagire rapidamente, rendendolo un dominatore nei territori di savana.

**Aspetto.** La coda e' il suo metronomo: ogni oscillazione scandisce l'attesa, poi il midollo iperattivo innesca lo scatto prima che l'occhio lo registri. Predatore che vince non per forza ma per anticipo -- il territorio e' gia' suo nel momento in cui entra in scena.

**Ambiente.** Si trova in ambienti di savana, dove la sua capacita' di muoversi su terreni estremi e la sua strategia di caccia si integrano perfettamente con il suo ambiente. Utilizza la tecnica di caccia anticipatoria, scatenando una risposta adrenalinica immediata grazie al midollo iperattivo, permettendogli di attaccare prima che l'opponente reagisca.

**Tratti chiave.**

- `coda_contrappeso`: La coda contrappeso permette al Saettatore delle Dune di ottenere presa e accelerazioni controllate su terreni estremi, grazie alla sua abilita' nel mangrovieto cinetico.
- `midollo_iperattivo`: Il midollo iperattivo scatena 3 turni di rage ogni volta che il Saettatore delle Dune uccide, pompando adrenalina nel suo corpo.
- `pungiglione_paralizzante`: Il pungiglione paralizzante carica di neurotossina inibitrice applica 2 turni di stunned sui colpi precisi del Saettatore delle Dune.

## Custode di Basalto -- `sp_basaltocara_scutata`

_Basaltocara scutata | classe: Support | bioma: Abisso Vulcanico | indice senziente: T1_

**Concetto.** Occupa una nicchia evolutiva unica come supporto strutturale e costruttore di habitat, contribuendo alla stabilita' dei terreni estremi e facilitando l'insediamento di altre specie.

**Aspetto.** Gli artigli vetrificati non sono armi -- sono strumenti di ancoraggio nelle zone vulcaniche dove nessun altro puo' tenersi fermo. Le ghiandole di fango caldo riparano le fessure del substrato dove altre specie si insediano dopo di lei: lavora in silenzio, poi sparisce prima che gli inquilini arrivino.

**Ambiente.** Si trova nei vulcani sottomarini, dove la combinazione di calore e ghiaccio crea un ambiente unico. La sua presenza e' associata a zone con attivita' vulcanica attiva e substrati fragili. Operano in silenzio, utilizzando artigli vetrificati per ancorarsi e ghiandole di fango caldo per riparare il substrato. Non si fermano mai, spostandosi rapidamente per evitare la competizione con altre specie.

**Tratti chiave.**

- `artigli_vetrificati`: Gli artigli vetrificati permettono alle squadre di ridistribuire carichi e modulare rigidita' strutturale all'interno dell'abisso vulcanico.
- `ghiandole_fango_calde`: Le ghiandole fango calde permettono alle squadre di ottenere presa e accelerazioni controllate su terreni estremi all'interno di abisso vulcanico.

## Camminatore di Canne -- `sp_calamipes_gracilis`

_Calamipes gracilis | classe: Playable | bioma: Palude Tossica | indice senziente: T1_

**Concetto.** Occupa una nicchia ecologica specifica all'interno delle paludi, sfruttando le risorse disponibili senza competere con altre specie.

**Aspetto.** Trampoliere snello dalle lunghe zampe e collo sottile, da canneto.

**Ambiente.** Si trova prevalentemente in paludi e zone umide, dove la vegetazione fitta e l'acqua stagnante forniscono protezione e cibo. Il comportamento e' guidato da istinti semplici, come la ricerca di cibo e la fuga da predatori, senza pianificazione o linguaggio.

## Ascoltatore Cavo -- `sp_cavatympa_sonans`

_Cavatympa sonans | classe: Bridge | bioma: Caverna Risonante | indice senziente: T2_

**Concetto.** Ha evoluto come specie bridge, svolgendo un ruolo cruciale nella transizione tra gli ecosistemi superficiali e sotterranei, facilitando l'interazione tra entrambi senza entrare in contatto diretto con gli ambienti interni.

**Aspetto.** Le antenne microonde cavernose le permettono di mappare le cavita' rocciose dall'esterno, annusando l'architettura sotterranea senza entrarci. I tentacoli uncinati la ancorano alle pareti mentre scansiona: esploratore della soglia tra il mondo aperto e quello nascosto.

**Ambiente.** Si muove lungo le pareti di gallerie sotterranee, utilizzando le sue antenne microonde cavernose per mappare l'architettura rocciosa e i tentacoli uncinati per ancorarsi durante le scansioni. Esplora le cavita' esternamente, annusando l'architettura sotterranea e comunicando con le squadre tramite segnali che permettono di prevedere traiettorie e organizzare attivita' all'interno di ambienti complessi.

**Tratti chiave.**

- `antenne_microonde_cavernose`: Le antenne microonde cavernose permettono alla specie di mappare le cavita' rocciose dall'esterno, annusando l'architettura sotterranea senza entrare.
- `tentacoli_uncinati`: I tentacoli uncinati la ancorano alle pareti mentre scansiona, immobilizzando eventuali ostacoli per 1 turno.

## Spirale di Cenere -- `sp_cinerastra_nodosa`

_Cinerastra nodosa | classe: Threat | bioma: Abisso Vulcanico | indice senziente: T1_

**Concetto.** Occupa un'evoluzionistica nicchia come predatore stealth in ambienti vulcanici, sfruttando la sua capacita' di mimetizzarsi per catturare la preda senza essere rilevato.

**Aspetto.** La colorazione cinerea lo rende indistinguibile dai substrati vulcanici su cui riposa per ore. Cacciatore in agguato puro: ogni nodulo sporgente del corpo e' un punto di ancoraggio che riduce il profilo termico finche' la preda non e' abbastanza vicina da non avere scelta.

**Ambiente.** Si trova esclusivamente negli abissi vulcanici, dove la sua colorazione cinerea e la sua struttura nodulare gli permettono di mimetizzarsi perfettamente con il substrato. Come predatore in agguato, si muove lentamente e attivamente si nasconde tra i noduli, attendendo il momento giusto per attaccare le prede vicine.

## Riparatore Carsico -- `sp_cryptolorca_medicata`

_Cryptolorca medicata | classe: Keystone | bioma: Caverna Risonante | indice senziente: T2_

**Concetto.** Come specie keystone, occupa una nicchia evolutiva cruciale nel bioma caverna, influenzando gli spostamenti stagionali di altre specie attraverso le sue proiezioni oracolari.

**Aspetto.** Le cartilagini pseudometalliche riflettono le camere mirage che proietta nell'ambiente come un oracolo dell'habitat: le specie confinanti orientano i propri spostamenti stagionali sulle sue proiezioni senza sapere di farlo. E' la chiave del bioma sotto forma di corpo.

**Ambiente.** Si trova in ambienti cavernosi, dove le sue cartilagini pseudometalliche e le camere mirage permettono di interagire con il bioma e altre specie. Utilizza le cartilagini pseudometalliche per modulare la rigidita' strutturale e le camere mirage per prevedere traiettorie, orchestrando complessi setup multilivello.

**Tratti chiave.**

- `cartilagini_pseudometalliche`: Le cartilagini pseudometalliche permettono alle squadre di ridistribuire carichi e modulare rigidita' strutturale all'interno della caverna.
- `camere_mirage`: Le camere mirage permettono alle squadre di prevedere traiettorie e orchestrare setup multilivello all'interno della caverna.

## Martellatore Ferroso -- `sp_ferrimordax_rutilus`

_Ferrimordax rutilus | classe: Apex | bioma: Calanchi Ferromagnetici | indice senziente: T2_

**Concetto.** Occupa una nicchia di predatore apex nei badlands, dove il suo passaggio altera la rete trofica per settimane, ridisegnando l'equilibrio ecologico locale.

**Aspetto.** I denti ossidoferro non lacerano: franano, come una rupe che cede. Il carapace ferruginoso cattura la luce in riflessi bruciati che anticipano ogni combattimento prima che inizi. Dove passa, la rete trofica non si richiude per settimane.

**Ambiente.** Si adatta ai vulcani spenti e alle loro gallerie, dove la sua struttura fisica e le sue abilita' si integrano perfettamente con l'ambiente estremo. Utilizza l'apprendimento associativo e la memoria breve per adattarsi alle dinamiche del suo habitat, senza sviluppare capacita' di pensiero astratto.

**Tratti chiave.**

- `denti_ossidoferro`: I denti ossidoferro permettono alle squadre di prevedere traiettorie e orchestrare setup multilivello all'interno dei badlands.
- `carapaci_ferruginosi`: I carapaci ferruginosi permettono alle squadre di coordinare scambi di risorse e parametri di stabilizzazione di squadra all'interno dei badlands.

## Spazzino Ferroso -- `sp_ferriscroba_detrita`

_Ferriscroba detrita | classe: Keystone | bioma: Calanchi Ferromagnetici | indice senziente: T1_

**Concetto.** Occupando un ruolo keystone, la specie ha evolto per svolgere un'importante funzione ecologica nella sua nicchia, influenzando il ciclo trofico del suo ambiente.

**Aspetto.** Scava nella materia morta con la pazienza di chi sa che il ciclo non ha fretta. Il suo corpo e' il confine tra cio' che e' stato e cio' che tornera' utile: ogni boccone di detrito che inghiotte e' cibo restituito sotto altra forma a tre specie diverse. Toglietela e la rete trofica inizia a digiunare.

**Ambiente.** Si muove nei terreni inospitali dei badlands, dove la sua presenza e' cruciale per il ciclo degli elementi e la sopravvivenza di altre specie. Il suo comportamento si basa sulla pazienza nel scavare detriti, contribuendo alla riproduzione e alla sopravvivenza di tre specie diverse attraverso il consumo di detriti.

## Bevitore di Fumarole -- `sp_fumarisorba_sulfurea`

_Fumarisorba sulfurea | classe: Keystone | bioma: Abisso Vulcanico | indice senziente: T1_

**Concetto.** La Fumarisorba Sulfurea occupa una nicchia evolutiva unica come specie keystone, essenziale per la formazione di ecosistemi. La sua capacita' di trasformare i fumi solforosi in substrato organico la rende fondamentale per l'equilibrio biologico in questi ambienti estremi.

**Aspetto.** Assorbe i fumi solforosi che ucciderebbero ogni altra forma di vita e li trasforma in substrato organico con una chimica che ancora sfida l'analisi. Nelle zone vulcaniche attive, e' l'unica presenza che precede tutte le altre: arriva prima, prepara il terreno, poi si ritrae quando l'ecosistema non ha piu' bisogno di lei.

**Ambiente.** Si trova esclusivamente in abissi vulcanici, dove le condizioni estreme della temperatura e della chimica del suolo la rendono unica. Questo ambiente le permette di sopravvivere e di svolgere il ruolo di specie keystone. La specie si adatta ai fumi solforosi, assorbendoli e trasformandoli in substrato organico. Questo comportamento le permette di preparare il terreno per altre forme di vita, pur rimanendo invisibile agli occhi degli osservatori.

## Pattinatore Specchio -- `sp_glaciolabis_nitida`

_Glaciolabis nitida | classe: Bridge | bioma: Caldera Glaciale | indice senziente: T1_

**Concetto.** Come specie bridge, occupa una nicchia evolutiva unica, sfruttando le zone di transizione tra habitat diversi senza appartenere a nessun ecosistema specifico.

**Aspetto.** Predatrice di confine: si muove tra l'habitat glaciale e quelli adiacenti con una fluidita' che i predatori strettamente specializzati non possono imitare. Non appartiene a nessun centro -- la sua forza e' essere a proprio agio in tutti i margini contemporaneamente.

**Ambiente.** Si muove fluidamente tra la caldera glaciale e gli habitat limitrofi, sfruttando le zone di confine per la caccia e la sopravvivenza senza fissarsi in un singolo ambiente. Non possiede linguaggio ne' pianificazione, agendo in base a istinti semplici che le permettono di sfruttare le opportunita' offerte dai margini tra gli ecosistemi.

## Trebbiatore di Palude -- `sp_limnofalcis_serrata`

_Limnofalcis serrata | classe: Threat | bioma: Palude Tossica | indice senziente: T1_

**Concetto.** La sua nicchia evolutiva e' quella di predatore d'acqua, specializzato nell'adattamento alla percezione della corrente per catturare prede in modo efficiente e senza spostarsi apertamente.

**Aspetto.** Galleggia appena sotto la superficie con la pazienza di chi sa che il tempo e' sempre dalla sua parte. La dentatura serrata non e' per uccidere veloce: e' per trattenere mentre la corrente fa il resto del lavoro. Predatore d'acqua, geometria di agguato perfetta.

**Ambiente.** Si trova prevalentemente in paludi, dove la sua capacita' di galleggiare appena sotto la superficie e l'affinita' per le correnti lo rendono un predatore perfetto in questi ecosistemi. Utilizza la paziente attesa del tempo e l'agguato geometrico per catturare le prede, rimanendo immobile e sfruttando la corrente per muoversi senza essere rilevato.

## Cacciatore di Schegge -- `sp_lithoraptor_acutornis`

_Lithoraptor acutornis | classe: Threat | bioma: Canyon Risonanti | indice senziente: T1_

**Concetto.** La sua nicchia evolutiva si e' sviluppata in un ambiente di canyons risonanti, dove le sue capacita' di intimidazione e la capacita' di prevedere traiettorie attraverso le lamelle shear gli hanno permesso di diventare un predatore efficiente.

**Aspetto.** L'intimidazione non e' un segnale: e' la sua prima arma. Le lamelle shear si aprono in ventaglio quando la distanza scende sotto la soglia di sicurezza, e il suono che producono e' gia' abbastanza per fermare il cuore di una preda media. Chi non si ferma scopre le zanne nel modo sbagliato.

**Ambiente.** Si muove nei canyons risonanti, dove le sue lamelle shear possono produrre suoni potenti che si propagano attraverso le fenditure e i grotte, permettendogli di comunicare e intimorire le prede. Il comportamento e' basato su istinti semplici, con un uso strategico dell'intimidatore e delle lamelle shear per catturare prede e mantenere la posizione dominante nel suo ambiente.

**Tratti chiave.**

- `intimidatore`: Quando il Cacciatore di Schegge colpisce con un attacco melee riuscito, la sua presenza terrorizza gli avversari adiacenti, applicando 2 turni di panico.
- `lamelle_shear`: Le lamelle shear del Cacciatore di Schegge permettono alle squadre di prevedere traiettorie e orchestrare setup multilivello all'interno dei canyons risonanti.

## Tessitore di Luce -- `sp_lucinerva_filata`

_Lucinerva filata | classe: Bridge | bioma: Scogliera Luminescente | indice senziente: T2_

**Concetto.** Occupando una nicchia evolutiva di bridge, sp lucinerva filata svolge un ruolo cruciale nella connessione tra diversi ambienti. La sua funzione e' quella di facilitare il trasferimento di geni e materiali tra ecosistemi diversi, mantenendo la biodiversita'.

**Aspetto.** Il carapace a segmenti logici si piega ad angoli diversi a seconda del substrato che attraversa, come se il corpo stesso stesse prendendo appunti sul territorio. Dispersore metodico: porta semi, spore e frammenti genetici tra habitat che altrimenti non si toccherebbero mai.

**Ambiente.** Si muove tra le barriere coralline luminose, dove la sua capacita' di adattare il carapace a segmenti logici gli permette di integrarsi con l'ambiente circostante. Questo habitat e' il suo ambiente naturale e vitale. Il comportamento metodico di sp lucinerva filata e' centrato sulla dispersione precisa di semi, spore e frammenti genetici, garantendo la connessione tra aree ecologiche isolate. E' un stabilizzatore naturale per gli ecosistemi.

**Tratti chiave.**

- `carapace_segmenti_logici`: Il carapace a segmenti logici si piega ad angoli diversi a seconda del substrato che attraversa, come se il corpo stesso stesse prendendo appunti sul territorio.

## Cuore Furente -- `sp_magmocardium_furens`

_Magmocardium furens | classe: Threat | bioma: Abisso Vulcanico | indice senziente: T3_

**Concetto.** La circolazione supercritica e il sangue piroforico rappresentano la nicchia evolutiva chiave, permettendo di canalizzare energia cinetica e elementale per sopravvivere e cacciare nell'ambiente estremo dell'abisso vulcanico.

**Aspetto.** Il sangue piroforico scorre a temperature che rendono ogni ferita una doppia minaccia: il danno fisico e il calore che lo accompagna. Quando la circolazione supercritica entra in fase di collasso, il corpo diventa un'arma indiretta -- avvicinarsi troppo ha un costo che la preda paga due volte.

**Ambiente.** Si muove negli abissi vulcanici, dove la sua coda frusta cinetica e le lamelle shear permettono di navigare tra le rocce incandescenti e prevedere le traiettorie delle prede. La sua ferocia aumenta sotto stress, guidando attacchi multipli consecutivi, mentre il focus frazionato mantiene due minacce in sorveglianza attiva durante l'assalto.

**Tratti chiave.**

- `circolazione_supercritica`: Le squadre di Cuore Furente canalizzano energia cinetica o elementale in colpi mirati all'interno dell'abisso vulcanico.
- `sangue_piroforico`: Il fluido ematico incendia l'aria colpendo chi perfora la corazza.
- `coda_frusta_cinetica`: La coda elastica accumula slancio per un colpo cinetico devastante.
- `ferocia`: Lo stato psicofisico predatoriale aumenta l'aggressivita' e la potenza offensiva sotto stress, favorendo attacchi multipli consecutivi.
- `lamelle_shear`: Le lamelle Shear permettono alle squadre di prevedere traiettorie e orchestrare setup multilivello all'interno dell'abisso vulcanico.
- `midollo_iperattivo`: Il midollo osseo pompa adrenalina ad ogni uccisione, scatenando 3 turni di rage.
- `focus_frazionato`: Il cortex biforcato mantiene due minacce in sorveglianza attiva.

## Pastore Ferrico -- `sp_magnetocola_pastoris`

_Magnetocola pastoris | classe: Support | bioma: Atollo di Ossidiana | indice senziente: T2_

**Concetto.** La circolazione bifasica ha permesso a questa specie di occupare un'evoluzione nicchia all'interno dell'atollo di ossidiana, dove la sua capacita' di disperdere energia e attenuare impatti termici la rende indispensabile per la sopravvivenza del gregge.

**Aspetto.** La circolazione bifasica le permette di regolare la temperatura corporea in modo che i parassiti termici che colpirebbero le specie circostanti vengano assorbiti e neutralizzati nel suo metabolismo. Guardiana silenziosa del gregge: non combatte, assorbe.

**Ambiente.** Si trova prevalentemente nei bacini termali dell'atollo ossidiana, dove la sua circolazione bifasica gli permette di regolare la temperatura corporea e assorbire parassiti termici presenti nell'ambiente. Non combatte, ma assorbe i parassiti termici che colpiscono il gregge, agendo come guardiana silenziosa e proteggendo le specie circostanti attraverso il suo metabolismo.

**Tratti chiave.**

- `circolazione_bifasica`: La circolazione bifasica permette alle squadre di disperdere energia e attenuare impatti corrosivi o termici all'interno dell'atollo di ossidiana.

## Cervo di Nebbia -- `sp_nebulocornis_mollis`

_Nebulocornis mollis | classe: Support | bioma: Foresta Temperata Umida | indice senziente: T1_

**Concetto.** Occupa una nicchia evolutiva come specie support, contribuendo al gruppo senza essere riconosciuta, il che si nota solo quando la sua assenza diventa evidente.

**Aspetto.** Si muove tra le specie brucatrici con una discrezione che la rende quasi invisibile al comportamento collettivo del gregge. Ripara, redistribuisce, occupa i vuoti che gli altri lasciano senza accorgersene. Il suo contributo si nota solo quando manca.

**Ambiente.** Si muove in ambienti di foresta temperata, dove la sua discrezione e l'abilita' di occupare gli spazi vuoti del gregge le permettono di sopravvivere senza essere riconosciuta. Il comportamento e' caratterizzato da una discrezione estrema e opportunismo, riparando e redistribuendo gli spazi lasciati vuoti dal gregge per non essere notata.

## Corridore Notturno -- `sp_noctipedis_umbrata`

_Noctipedis umbrata | classe: Apex | bioma: Mezzanotte Orbitale | indice senziente: T2_

**Concetto.** La sua ghiandola condensa ozono ha permesso di sfruttare le condizioni atmosferiche estreme del suo ambiente, permettendogli di comunicare e cacciare in modo efficiente. La sua capacita' di ridistribuire carichi e modulare rigidita' strutturale ha reso la sua sopravvivenza possibile in un ambiente estremo.

**Aspetto.** Condensa ozono nelle ghiandole dorsali e lo rilascia come una firma olfattiva che marca il silenzio prima di lui. Predatore della soglia notturna, non insegue: aspetta che il buio porti la preda verso le sue zampe immobili. Il suo territorio si misura in ombre, non in metri.

**Ambiente.** Vive in ambienti di mezzanotte orbitale, dove la luce e' assente e le condizioni atmosferiche sono estreme. Il suo territorio non e' definito da distanze, ma da ombre e silenzio, con una presenza invisibile e immobile. Non insegue la preda, ma attende che il buio porti la preda verso di lui. Utilizza la sua firma olfattiva di condensa ozono per segnalare la sua presenza e catturare la preda senza muoversi.

**Tratti chiave.**

- `ghiandole_condensa_ozono`: Le ghiandole Condensa Ozono permettono al Corridore Notturno di ridurre la sua traccia olfattiva nella mezzanotte orbitale, marcando il silenzio prima della preda con un segnale impercettibile.

## Colosso Palustre -- `sp_paludogromus_magnus`

_Paludogromus magnus | classe: Keystone | bioma: Palude Tossica | indice senziente: T1_

**Concetto.** Come una specie keystone, ha occupato una nicchia evolutiva cruciale nel mantenere l'equilibrio ecologico dei biomi paludali, senza la quale la biodiversita' locale si ridurrebbe drasticamente.

**Aspetto.** Si muove nell'acqua stagnante con la solennita' di chi porta peso antico. Il suo ruolo non e' combattere ne' fuggire: e' mantenere, consolidare, rinsaldare i sedimenti che altrimenti andrebbero in deriva. Togli il magnus e la palude smette di essere palude -- diventa un deserto sommerso.

**Ambiente.** Si trova esclusivamente in biomi paludali, dove la sua presenza e' fondamentale per la conservazione della struttura del suolo e la prevenzione dell'erosione. Si muove con lentezza ma determinazione attraverso le acque stagnanti, consolidando i sedimenti e contribuendo alla formazione di un ambiente stabile per altre specie.

## Saltatore di Cenere -- `sp_pyrosaltus_celeris`

_Pyrosaltus celeris | classe: Threat | bioma: Abisso Vulcanico | indice senziente: T1_

**Concetto.** Occupa un'niche evolutiva basata sulla caccia passiva, utilizzando la sincronizzazione dei flussi mutualistici e la posizione sopraelevata per massimizzare il danno.

**Aspetto.** Le zampe radianti accumulano calore nei tendini per ore, immobili, finche' lo scatto e' inevitabile come un crollo. I denti silice-termici entrano nella preda alla temperatura della fusione: non tagliano, cauterizzano nell'atto stesso. Cacciatore che non insegue -- attende che la preda entri nel raggio del salto.

**Ambiente.** Si trova nei bacini vulcanici sottomarini, dove le sue zampe radianti e i denti silice-termici sono adatti alle temperature elevate e alla scarsita' di cibo. Non insegue la preda, ma attende che questa entri nel raggio del salto, sfruttando la sua capacita' di accumulare calore nei tendini per attacchi improvvisi.

**Tratti chiave.**

- `denti_silice_termici`: I denti silice-termici permettono alle squadre di sincronizzare organismi alleati e flussi mutualistici all'interno dell'abisso vulcanico.
- `zampe_radianti`: Le zampe radianti generano pulsazione cinetica al touch-down: +2 danno extra da posizione sopraelevata.

## Lanterna di Radici -- `sp_radiluma_pendula`

_Radiluma pendula | classe: Support | bioma: Frattura Abissale Sinaptica | indice senziente: T2_

**Concetto.** Occupa una nicchia evolutiva come ingegnere di ecosistemi simbiotici, utilizzando il biofilm e il guscio bioluminescente per creare e mantenere strutture luminose che sostenano la vita in profondita'.

**Aspetto.** Il biofilm luminescente che secerne non e' esibizione: e' un segnale che orienta le specie batteriche simbionti verso le zone del substrato dove il carapace abissale ha gia' pre-digerito i nutrienti. Lavora per altri, nella penombra, senza aspettare reciprocita'.

**Ambiente.** Si trova in fratture abissali sinaptiche, dove il biofilm luminescente e il guscio bioluminescente facilitano la comunicazione e la sopravvivenza in ambienti estremi. Lavora in modo cooperativo, prevedendo traiettorie e orchestrando setup multilivello all'interno di reef luminescenti. La sua motivazione e' supportare e facilitare la nutrizione per altre specie.

**Tratti chiave.**

- `biofilm_glow`: Il biofilm luminescente emette un segnale visivo che guida i batteri simbionti verso le aree nutrienti pre-digerite dal carapace abissale.
- `carapace_luminiscente_abissale`: Il guscio bioluminescente crea confusione tra i predatori, permettendo alla specie di sopravvivere nelle profondita' oscure.

## Corriere Spinato -- `sp_rubrospina_velox`

_Rubrospina velox | classe: Playable | bioma: Calanchi Ferromagnetici | indice senziente: T1_

**Concetto.** Occupa una nicchia evolutiva come specie giocabile, con adattamenti non specificati che gli permettono di esistere in un ambiente estremo e di interagire con il giocatore.

**Aspetto.** Quadrupede agile con lunghe spine dorsali.

**Ambiente.** Si trova prevalentemente nei badlands, dove la sua capacita' di muoversi su terreni difficili e la sua resistenza alle temperature estreme gli permettono di sopravvivere. Il comportamento e' guidato da istinti semplici, con un'assenza di pianificazione o linguaggio, che lo rende un essere totalmente reattivo alle stimoli ambientali.

## Scavatore Salino -- `sp_salifossa_tenebris`

_Salifossa tenebris | classe: Keystone | bioma: Pianura Salina Iperarida | indice senziente: T1_

**Concetto.** Occupa una nicchia evolutiva keystone, mantenendo l'equilibrio ecologico e influenzando il comportamento di specie predatrici.

**Aspetto.** Nelle faglie saline piu' profonde dove la luce non ricorda di esistere, decompone con metodo liturgico: prima i composti solforati, poi i residui minerali, infine il vuoto che prepara per il prossimo ciclo. La sua assenza non si nota subito -- si nota quando due specie di predatori iniziano a competere per una preda che non c'e' piu'.

**Ambiente.** Si trova nelle faglie saline piu' profonde, dove la luce non arriva e la sua attivita' decompositiva e' essenziale per il ciclo delle risorse. Opera seguendo un metodo liturgico, decomponendo prima i composti solforati, poi i residui minerali, infine preparando il vuoto per il prossimo ciclo.

## Filtratore Salmastro -- `sp_salisucta_alveata`

_Salisucta alveata | classe: Keystone | bioma: Pianura Salina Iperarida | indice senziente: T1_

**Concetto.** La sua nicchia evolutiva e' quella di una specie keystone, con adattamenti non specificati ma necessari per svolgere il ruolo fondamentale nell'ecosistema salino.

**Aspetto.** Filtra senza sosta, alveolo dopo alveolo, trattenendo solo cio' che non serve ad altri e restituendo il resto alla corrente. L'ecosistema salino ruota attorno alla sua attivita' come una liturgia che nessuno ha scritto ma tutti rispettano: interrompila, e la torbidita' uccide prima che lo faccia qualsiasi predatore.

**Ambiente.** Si trova esclusivamente in pianure saline iperaride, dove il suo ruolo di specie keystone e' essenziale per mantenere l'equilibrio dell'ecosistema salino. Il suo comportamento si basa sulla costante filtrazione dell'acqua, un'azione continua e inesorabile che sostiene la salute dell'ecosistema salino senza interruzione.

## Divisore del Delta -- `sp_siltovena_bifida`

_Siltovena bifida | classe: Threat | bioma: Palude Tossica | indice senziente: T1_

**Concetto.** La specie ha sviluppato una nicchia evolutiva basata sulla preda in acque ristrette, utilizzando la sua forma biforcazione per creare un attacco inevitabile. La sua esistenza e' strettamente legata agli ecosistemi palustri, dove la sua strategia ha vantaggio.

**Aspetto.** La biforcazione corporea le permette di occupare due traiettorie simultanee nella corrente limosa, avvicinandosi alla preda da angoli opposti. Non e' veloce -- e' inevitabile: la geometria del suo attacco non lascia via di fuga che non sia gia' presidiata.

**Ambiente.** Si trova in ambienti palustri, dove le correnti lente e i canali sotterranei favoriscono la sua strategia di attacco. La sua capacita' di muoversi in due direzioni contemporaneamente le permette di sorprendere la preda in acque poco profonde. Utilizza la simultaneita' di due approcci per aggredire la preda, sfruttando la sua biforcazione corporea. Si nasconde in sottovuoti e si muove silenziosamente per avvicinarsi alla preda da angoli opposti, senza essere rilevata.

## Ala Risonante -- `sp_sonapteryx_resonans`

_Sonapteryx resonans | classe: Bridge | bioma: Frattura Abissale Sinaptica | indice senziente: T2_

**Concetto.** Come specie bridge, sp sonapteryx resonans utilizza ali membrana sonica e canto di richiamo per interagire con il bioma e trasmettere informazioni attraverso la frattura abissale sinaptica.

**Aspetto.** Le membrane soniche delle ali non servono solo al volo: sono uno strumento che suona il bioma mentre lo attraversa. Il canto di richiamo cambia frequenza a ogni habitat visitato, come se imparasse la lingua locale prima di posarsi. Dispersore che porta notizie di luoghi che nessun'altra specie ha visitato.

**Ambiente.** Le membrane soniche delle ali non servono solo al volo: sono uno strumento che suona il bioma mentre lo attraversa, adattandosi al suono dell'habitat. Il canto di richiamo cambia frequenza a ogni habitat visitato, come se imparasse la lingua locale prima di posarsi, e il canto rituale post-kill amplifica la furia per 2 turni e onora la preda caduta.

**Tratti chiave.**

- `ali_membrana_sonica`: Le piastre vibranti delle ali assorbono l'energia del bioma frattura abissale sinaptica, attenuando i danni da impatti corrosivi durante il volo.
- `canto_di_richiamo`: Dopo aver ucciso, emette un canto rituale che amplifica la sua furia per due turni, onorando la preda caduta con un'eco che si perde nella frattura abissale sinaptica.

## Maestro della Tempesta -- `sp_tempestarius_psionicus`

_Tempestarius psionicus | classe: Apex | bioma: Frattura Abissale Sinaptica | indice senziente: T3_

**Concetto.** Come apex predator, ha evolto per dominare le fratture abissali sinaptiche attraverso una combinazione di sensori geomagnetici, antenne plasmatiche tempesta e una strategia di branco. La sua evoluzione e' stata guidata dalla necessita' di sopravvivere in un ambiente estremo e competitivo, dove la collaborazione e la precisione sono vitali per la sua sopravvivenza.

**Aspetto.** Le antenne plasmatiche si erigono quando la pressione barometrica cala, trasformando ogni tempesta in un senso supplementare. Usa i sensori geomagnetici per triangolare le prede a distanze che sfidano la logica della caccia convenzionale. Quando attacca, lo fa dall'interno della tempesta -- nessuno lo vede arrivare.

**Ambiente.** Si trova esclusivamente nei biomi di frattura abissale sinaptica, dove le correnti geomagnetiche e le tempeste sono costanti. Questo ambiente gli permette di utilizzare al meglio i suoi sensori geomagnetici e le sue antenne plasmatiche tempesta per cacciare e sopravvivere. Utilizza le antenne plasmatiche tempesta per convogliare fulmini atmosferici in attacchi mirati o scudi ionici. I sensori geomagnetici gli permettono di triangolare le prede a distanze impossibili per la caccia tradizionale. Quando attacca, lo fa dall'interno della tempesta, sfruttando la confusione causata dalle sue antenne plasmatiche.

**Tratti chiave.**

- `antenne_plasmatiche_tempesta`: Le antenne plasmatiche si erigono quando la pressione barometrica cala, trasformando ogni tempesta in un senso supplementare.
- `sensori_geomagnetici`: Usa i sensori geomagnetici per triangolare le prede a distanze che sfidano la logica della caccia convenzionale.
- `carapace_luminiscente_abissale`: Il guscio bioluminescente confonde i predatori nelle profondita'.
- `focus_frazionato`: Il cortex biforcato mantiene due minacce in sorveglianza attiva.
- `risonanza_di_branco`: La rete risonante amplifica buff condivisi del branco.
- `sinapsi_coraline_polifoniche`: Le sinapsi coralline trasmettono ordini tramite armoniche marine.
- `tattiche_di_branco`: Il protocollo tattico coordina focus e prese condivise.

## Rosicchiatore di Tuono -- `sp_tonitrudens_ferox`

_Tonitrudens ferox | classe: Threat | bioma: Stratosfera Tempestosa | indice senziente: T1_

**Concetto.** Occupa una nicchia ecologica di onnivoro senza remore, sfruttando le risorse disponibili nel bioma stratosfera tempestosa. La sua esistenza e' un esempio di adattamento a un ambiente estremo, dove la forza bruta e la reattivita' sono le caratteristiche principali.

**Aspetto.** Onnivoro senza remore: non distingue tra preda e opportunita'. La sua forza bruta e' il segnale di pericolo che ogni specie del bioma ha imparato a riconoscere prima ancora di vederlo. Quando entra in un habitat, tutto cio' che puo' fuggire, fugge -- il resto diventa cibo.

**Ambiente.** Si muove liberamente tra le correnti di vento e le tempeste, sfruttando la stratosfera tempestosa come ambiente naturale e vitale. La sua capacita' di integrarsi con il bioma lo rende un predatore e un consumatore di qualsiasi cosa possa trovare nel suo percorso. La sua sopravvivenza dipende dal comportamento di predazione istintivo, in cui non distingue tra preda e opportunita'. Il riconoscimento di segnali di pericolo e' un meccanismo chiave per evitare minacce, anche se non possiede una forma di pensiero complesso.

## Aliante della Mesa -- `sp_ventornis_longiala`

_Ventornis longiala | classe: Bridge | bioma: Canyon Risonanti | indice senziente: T1_

**Concetto.** La sua firma funzionale come specie bridge le permette di sfruttare le interfacce ecologiche, ridistribuendo carichi e leggendo le correnti come una mappa per sopravvivere ai margini instabili.

**Aspetto.** Le ali fulminee la portano oltre ogni confine di bioma prima che l'aria cambi di nuovo. Le membrane pneumatofore le permettono di planare senza battito per ore, leggendo le correnti come una mappa. Esplora i margini perche' i centri non la interessano -- e' nei bordi che l'ecosistema si rivela.

**Ambiente.** Si muove tra i confini di bioma, sfruttando le correnti atmosferiche e la complessita' dei canyons risonanti per planare senza battito per ore. Esplora i margini tra biomi, interpretando segnali psionici e modulando la rigidita' strutturale per adattarsi ai cambiamenti improvvisi dell'ambiente.

**Tratti chiave.**

- `ali_fulminee`: Le ali fulminee la portano oltre ogni confine di bioma prima che l'aria cambi di nuovo.
- `membrane_pneumatofori`: Le membrane pneumatofore le permettono di planare senza battito per ore, leggendo le correnti come una mappa.

## Beccatore di Vetro -- `sp_vitricyba_punctata`

_Vitricyba punctata | classe: Threat | bioma: Atollo di Ossidiana | indice senziente: T1_

**Concetto.** Ha sviluppato una nicchia evolutiva basata sull'osservazione e sfruttamento delle routine delle specie vicine, diventando un predatore invisibile e inattaccabile per chi non riesce a rompere la sua routine.

**Aspetto.** Si muove in cerca di cibo con una puntualita' che sembra metodica: lo stesso percorso, la stessa ora, la stessa pazienza. E' il predatore della routine altrui -- impara i ritmi delle specie vicine e li sfrutta con una precisione che non lascia margine di scampo.

**Ambiente.** Si trova in atolli di origine vulcanica, dove la roccia obsidiana domina il paesaggio e la fauna e' scarsa ma precisa nel suo comportamento. Predatore della routine altrui, si muove con una puntualita' metodica, sfruttando i ritmi di altre specie per cacciarle con una precisione inarrivabile.

## Nidificatore del Maestrale -- `sp_zephyrovum_fidelis`

_Zephyrovum fidelis | classe: Bridge | bioma: Stratosfera Tempestosa | indice senziente: T1_

**Concetto.** La specie occupa una nicchia ecologica chiave nella dispersione dei pollini e delle spore nella stratosfera tempestosa. I suoi adattamenti le permettono di svolgere un ruolo essenziale nella connessione tra le specie vegetali che vivono in quel ambiente.

**Aspetto.** Trasporta spore e pollini attraverso le correnti d'aria con un'affidabilita' stagionale che le specie vegetali circostanti hanno imparato a fare propria. Dispersore fedele: se il vento cambia rotta, la si trova gia' li', adattata, pronta a ricominciare.

**Ambiente.** Vive esclusivamente nella stratosfera tempestosa, dove le correnti d'aria sono intense e costanti. Questo ambiente le permette di muoversi senza bisogno di sforzi fisici, sfruttando il vento per la sua sopravvivenza. Si muove con le correnti d'aria per trasportare pollini e spore, seguendo rotte predeterminate. La sua affidabilita' stagionale e' un'abilita' imparata dalle specie vegetali circostanti, che hanno sviluppato una relazione simbiotica con essa.

## Bisonte Nano della Steppa -- `steppe_bison_mini`

_Nanobison tundrae | classe: Cursore quadrupede / ingegnere d'ecosistema | bioma: cryosteppe | indice senziente: T1_

**Concetto.** E' un ingegnere del suolo gregario che modella l'ambiente grazie al suo ventriglio, scheletro idro-regolante e sacche galleggianti ascensoriali.

**Aspetto.** Erbivoro tarchiato dal vello lanoso e fitto, corna corte ricurve e zoccoli larghi che distribuiscono il peso sulla crosta gelata.

**Ambiente.** Abita in criosteppe, zone caratterizzate da permafrost e neve persistente, dove si muove tra muschi e licheni. Vive in mandrie, compattando la neve e fertilizzando il permafrost per creare nicchie per i produttori.

**Tratti chiave.**

- `ventriglio_gastroliti`: Il bisonte nano della steppa utilizza il suo ventriglio muscoloso per macinare cibi duri, grazie ai gastroliti che lo aiutano a digerire muschi e licheni.
- `scheletro_idro_regolante`: Le ossa porose del bisonte nano della steppa modulano il contenuto idrico per mutare massa, adattandosi alle condizioni del cryosteppe.
- `respiro_a_scoppio`: Il bisonte nano della steppa usa le valvole toraciche per rilasciare getti propulsivi istantanei, permettendogli di muoversi rapidamente sulle superfici ghiacciate.
- `sacche_galleggianti_ascensoriali`: Il bisonte nano della steppa regola le sacche gassose per controllare l'assetto e la profondita', permettendogli di muoversi con agilita' nel cryosteppe.

## Simbionte Termale -- `symbiotica_thermalis`

_Symbiotica thermalis | classe: Keystone | bioma: Dorsale Termale Tropicale | indice senziente: T4_

**Concetto.** Come specie keystone, Symbiotica Thermalis ha sviluppato un metabolismo di condivisione energetica e un sistema di comunicazione risonante per coordinare le squadre, permettendo una gestione efficiente delle risorse e della difesa collettiva nei biomi termali estremi.

**Aspetto.** Galleggia sulla dorsale termale come un officiante sopra l'altare: il polso termico che emette non e' aggressione, e' redistribuzione. Senza il suo scheletro idraulico a pistoni che regola la pressione dei venti caldi, l'intera colonia corale sovrastante collassa in stagioni. Non e' il piu' forte -- e' cio' senza cui il forte non esiste.

**Ambiente.** Vive esclusivamente in dorsali termali tropicali, dove la sua struttura idraulica a pistoni e il metabolismo di condivisione energetica permettono di regolare la pressione termica e la circolazione di nutrienti necessari alla vita delle colonie corali. Si muove come un termofloater, emettendo pulsazioni termiche che redistribuiscono energia all'interno della dorsale termale. Utilizza il suo scheletro idra di pistoni per generare colpi-proiettile rapidi, e le sue ghiandole iodative per canalizzare energia in attacchi mirati.

**Tratti chiave.**

- `metabolismo_di_condivisione_energetica`: Sussurra energia attraverso il contatto, rifornendo i feriti e i giovani con una riserva collettiva che tiene unita la colonia.
- `scheletro_idraulico_a_pistoni`: Il suo scheletro idra, come una macchina vivente, scatta colpi-proiettile rapidi con un movimento di pistoni cranici.
- `filtro_metallofago`: Filtrando metalli, sostiene gli organi elettrogeni che alimentano la sua capacita' di interagire con l'ambiente estremo.
- `sacche_galleggianti_ascensoriali`: Le sacche gassose regolabili permettono di controllare l'assetto e la profondita', muovendosi con precisione tra le correnti termali.
- `risonanza_di_branco`: La rete risonante amplifica i benefici condivisi del branco, unendo i membri in un'armonia di forza e resistenza.
- `capillari_fluoridici`: I capillari fluoridici interpretano segnali psionici instabili, permettendo alle squadre di comunicare e coordinarsi in ambienti acidi.
- `branchie_metalloidi`: Le branchie metalloidi offrono presa e accelerazioni controllate, permettendo di muoversi con agilita' su terreni estremi.
- `batteri_termofili_endosimbiosi`: I batteri termofili endosimbiosi coordinano lo scambio di risorse e la stabilizzazione di squadra all'interno della dorsale termale.
- `denti_chelatanti`: I denti chelatanti canalizzano energia cinetica o elementale in colpi mirati, rendendo ogni attacco preciso e potente.
- `ghiandole_iodoattive`: Le ghiandole iodoattive canalizzano energia in colpi mirati, adattandosi alle condizioni estreme delle pianure saline.
- `enzimi_antipredatori_algali`: Gli enzimi antipredatori algali disperdono energia e attenuano impatti corrosivi, proteggendo la squadra nei reef luminescenti.
- `batteri_endosimbionti_chemio`: I batteri endosimbionti chemio stabilizzano l'assorbimento e la conversione energetica, permettendo di sfruttare diverse fonti di energia.
- `filamenti_termoconduzione`: I filamenti termoconduzione offrono presa e accelerazioni controllate, permettendo di muoversi con agilita' lungo le dorsali termali.
- `pelli_anti_ustione`: Lo strato dermico isolante dissipa calore radiante, proteggendo la creatura da ustioni causate da superfici roventi o ondate termiche.

## Megattera Terrestre -- `terracetus_ambulator`

_Terracetus ambulator | classe: Mammalia | bioma: Steppe Algoritmiche | indice senziente: T3_

**Concetto.** La sua coesistenza con specie keystone ha plasmato la sua evoluzione, rendendolo un elemento chiave nella regolazione dell'equilibrio ecologico delle steppe algoritmiche.

**Aspetto.** Colosso tondeggiante, ventre ampio con bande ciliari, arti vestigiali d'appoggio. Pelle spessa e rugosa, color blu-grigio, occhi piccoli; bocca ampia filtrante.

**Ambiente.** Si muove attraverso le steppe algoritmiche, dove il suo ventre ciliare e la pelle resistente gli permettono di sopravvivere in terreni difficili e temperature estreme. Utilizza il canto infrasonico per comunicare e difendersi, mentre il suo scheletro leggero e la sua locomozione a tappeto gli permettono di spostarsi senza sforzo su lunghe distanze.

**Tratti chiave.**

- `scheletro_pneumatico_a_maglie`: Il suo scheletro pneumatico a maglie permette di muoversi senza fatica per lunghi spostamenti terrestri.
- `cinghia_iper_ciliare`: La cinghia iper-ciliare lo aiuta a traslare il corpo su terreni piani o ruvidi.
- `rete_filtro_polmonare`: La rete filtro polmonare assorbe nutrienti aerodispersi direttamente dall'aria.
- `canto_infrasonico_tattico`: Il canto infrasonico tattico disorienta i predatori e permette la comunicazione a distanza.
- `siero_anti_gelo_naturale`: Il siero anti-gelo naturale impedisce la cristallizzazione del corpo a basse temperature.

## Marciume del Disgelo -- `thaw_rot`

_Geliputris liquefaciens | classe: Colonia microbica decompositrice / minaccia patogena | bioma: cryosteppe | indice senziente: T1_

**Concetto.** Occupa una nicchia evolutiva come decompositore criofilo, sfruttando il momento di disgelo per liberare nutrienti e mantenere l'equilibrio ecologico delle cryosteppe.

**Aspetto.** Patina viscida grigio-verde che fiorisce sulle superfici in disgelo, con filamenti gelatinosi e bolle di gas di fermentazione.

**Ambiente.** Si sviluppa prevalentemente nelle cryosteppe, dove i cicli di gelo e disgelo creano le condizioni ideali per la sua attivita' e proliferazione. Aumenta l'attivita' durante i disgeli, liquefacendo i tessuti gelati e diffondendo marciume, mentre emette gas di fermentazione come parte del suo metabolismo.

**Tratti chiave.**

- `filamenti_digestivi_compattanti`: I filamenti digestivi compattano gli scarti, liberando spazio vitale e accelerando la decomposizione.
- `spore_psichiche_silenziate`: Le spore psichiche silenziate confondono e sedano i bersagli vicini, riducendo la loro reattivita'.
- `sangue_piroforico`: Il sangue piroforico brucia l'aria quando colpisce la corazza, causando danni termici ai nemici.
- `secrezione_rallentante_palmi`: I palmi rilasciano una secrezione gelatinosa che blocca i bersagli rapidi, rallentandone i movimenti.
- `eco_interno_riflesso`: L'eco interno riflesso mappa l'ambiente attraverso vibrazioni corporee, permettendo di individuare ostacoli e prede.

## Raptor Termico -- `thermo_raptor`

_Thermoraptor aridus | classe: Cursore quadrupede / predatore apex | bioma: deserto caldo | indice senziente: T1_

**Concetto.** Occupa una nicchia ecologica come predatore dominante in ambienti estremi, grazie a una combinazione di adattamenti termoregolatori e un comportamento predatorio mirato alle prede fiacche in condizioni di calore intenso.

**Aspetto.** Predatore bipede asciutto dalla pelle squamosa chiara riflettente, arti posteriori potenti e creste dorsali termo-disperdenti.

**Ambiente.** Si muove nei deserti caldi, dove la sua pelle riflettente e le creste termo-disperdenti gli permettono di gestire il calore estremo senza sovraccarico metabolico. Predatore apex termofilo, attacca nelle ore piu' roventi, sfruttando il calore per indebolire le prede e lanciando attacchi brevi e letali con gli arti posteriori potenti.

**Tratti chiave.**

- `cuticole_cerose`: Le cuticole cerose assorbono e convertono l'energia del sole e del calore ambiente in modo efficiente, permettendo al Raptor Termico di muoversi senza sforzo in ambienti estremi.
- `grassi_termici`: I grassi termici forniscono al Raptor Termico una riserva di energia termica, che gli permette di sopravvivere ai picchi di calore senza perdere la sua agilita'.
- `pelli_cave`: Le pelli cave con sacche d'aria interne agiscono come una barriera termica leggera, aiutando il Raptor Termico a mantenere un equilibrio termico in ambienti aridi estremi.
- `proteine_shock_termico`: Le proteine di shock termico proteggono il Raptor Termico dalle alte temperature, mantenendo la sua struttura cellulare intatta durante le escursioni termiche estreme.
- `reti_capillari_radici`: Le reti capillari radici permettono al Raptor Termico di scambiare fluidi con le piante circostanti, aiutandolo a regolare la sua temperatura basale e a sopravvivere in ambienti estremi.

## Uccello Ombra -- `umbra_alaris`

_Umbra alaris | classe: Aves | bioma: Dorsale Termale Tropicale | indice senziente: T3_

**Concetto.** L'evoluzione dell'Uccello Ombra si e' sviluppata per sfruttare la scarsita' di luce e la presenza di calore nei dorsali termali tropicali, con tratti come il vello di assorbimento totale e la comunicazione fotonica coda-coda che lo rendono un predatore efficiente.

**Aspetto.** Volatile nero opaco, sagoma che assorbe la luce; occhi grandi lucenti; artigli lunghi; volo felpato e manovrato.

**Ambiente.** Si muove nei dorsali termali tropicali, luoghi dove la luce solare e' scarsa e le temperature sono elevate, permettendogli di utilizzare la sua invisibilita' ottica quasi totale. Utilizza attacchi ipotermici silenziosi e la sua visione multi-spettrale amplificata per cacciare prede in condizioni di scarsa luminosita', mentre il volo felpato e manovrato gli permette di muoversi senza rumore.

**Tratti chiave.**

- `vello_di_assorbimento_totale`: Il vello di assorbimento totale permette all'Uccello Ombra di rimanere invisibile in ambienti luminosi, assorbendo quasi tutta la luce incidente.
- `visione_multi_spettrale_amplificata`: La visione multi-spettrale amplificata consente all'Uccello Ombra di vedere in condizioni di luminanza estremamente bassa, anche nel buio piu' totale.
- `motore_biologico_silenzioso`: Il motore biologico silenzioso permette all'Uccello Ombra di volare per lunghi periodi senza emettere alcun rumore, rendendolo un predatore estremamente stealth.
- `artigli_ipo_termici`: Gli artigli ipotermici dell'Uccello Ombra possono indurre shock da freddo localizzato nei nemici, paralizzandoli senza danni fisici significativi.
- `comunicazione_fotonica_coda_coda`: La comunicazione fotonica coda-coda permette all'Uccello Ombra di scambiare impulsi luminosi tattili con altri membri della sua specie, comunicando senza emettere suoni.

## Zephyr Spore Courier -- `zephyr_spore_courier`

_bioma: cryosteppe | indice senziente: T1_

**Concetto.** Svolgono un ruolo chiave nell'ecosistema delle cryosteppe come diseminatori di spore, contribuendo alla riproduzione delle piante che popolano queste zone fredde e deserte.

**Aspetto.** Corriere alato dalle ali piumate che lasciano scie di spore.

**Ambiente.** Hanno un habitat limitato alle cryosteppe, dove il loro corpo compatto e solido li aiuta a resistere alle temperature estreme e alla mancanza di vegetazione. Si muovono con agilita' grazie ai tentacoli, sfruttando il vento per spostarsi rapidamente e cercano cibo come spore e microrganismi presenti nel loro ambiente.
