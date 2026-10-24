#!/usr/bin/env python3
"""
apply_phase3_polish_d5_d6.py
D.5 + D.6 master-dd authority polish batch — Phase 3 Path D HYBRID residue.

D.5: visual_description narrative polish (36 entries, per-clade voice register)
D.6: interactions.symbiosis ecology mutualism polish (9 Apex+Keystone entries)

Voice registers (Q3 verdict C+B):
- Apex:     EPICA — dominio, peso che spezza vento, registro mitico-tragico
- Keystone: SOLENNE — radice della rete trofica, senza cui crolla, registro liturgico-ecologico
- Threat:   TENSA — ogni passo un avviso, immobilità predatoria, registro sinistro
- Bridge:   CURIOSA — confine tra habitat, annusatore di soglie, registro lirico-osservativo
- Support:  DISCRETA — in ombra, ricuce e ripara, registro umile-meticoloso
- Playable: EMPATICA — cresce con tatto allenatore, registro affettivo-evolutivo
- Skiv-adjacent (pulverator_gregarius): desertic-sensoriale, sabbia/vento/voci nel vuoto

Encoding: UTF-8 explicit (CLAUDE.md §Encoding Discipline)
Do NOT change fields other than visual_description, interactions.symbiosis, _provenance.
"""

import json
import sys
from pathlib import Path

CATALOG_PATH = Path(__file__).parent.parent.parent / "data/core/species/species_catalog.json"

# ─────────────────────────────────────────────────────────────────────────────
# D.5 — VISUAL DESCRIPTION POLISH (36 entries)
# Key: species_id (or legacy_slug for pre-merge entries)
# Value: 2-3 sentence italian narrative prose, per-clade voice register
# Facts grounded in: default_parts, functional_signature, ecotypes, biome_affinity
# ─────────────────────────────────────────────────────────────────────────────

VISUAL_POLISH = {

    # ── APEX (6 entries) — voce EPICA, dominio, peso mitico-tragico ──────────

    "electromanta_abyssalis": (
        "Creatura silenziosa delle fratture abissali, vola su correnti magnetiche invisibili "
        "con un'eleganza che non ha bisogno di velocità — sa già dove arriverà la preda. "
        "Il campo bioelettrico le avvolge il corpo come un sudario luminoso; "
        "quando scarica, l'intero piano sinaptico trema."
    ),

    "sp_arenavolux_sagittalis": (
        "La coda è il suo metronomo: ogni oscillazione scandisce l'attesa, "
        "poi il midollo iperattivo innesca lo scatto prima che l'occhio lo registri. "
        "Predatore che vince non per forza ma per anticipo — il territorio è già suo "
        "nel momento in cui entra in scena."
    ),

    "sp_ferrimordax_rutilus": (
        "I denti ossidoferro non lacerano: franano, come una rupe che cede. "
        "Il carapace ferruginoso cattura la luce in riflessi bruciati che anticipano "
        "ogni combattimento prima che inizi. "
        "Dove passa, la rete trofica non si richiude per settimane."
    ),

    "sp_noctipedis_umbrata": (
        "Condensa ozono nelle ghiandole dorsali e lo rilascia come una firma olfattiva "
        "che marca il silenzio prima di lui. "
        "Predatore della soglia notturna, non insegue: aspetta che il buio porti "
        "la preda verso le sue zampe immobili. "
        "Il suo territorio si misura in ombre, non in metri."
    ),

    "sp_tempestarius_psionicus": (
        "Le antenne plasmatiche si erigono quando la pressione barometrica cala, "
        "trasformando ogni tempesta in un senso supplementare. "
        "Usa i sensori geomagnetici per triangolare le prede a distanze che sfidano "
        "la logica della caccia convenzionale. "
        "Quando attacca, lo fa dall'interno della tempesta — nessuno lo vede arrivare."
    ),

    "pulverator_gregarius": (
        # SKIV-ADJACENT: savana desertica, sabbia/vento/voci nel vuoto
        "Nato dove la savana smette di fingere e la sabbia governa senza appello, "
        "si muove in branco con la stessa logica del vento: non sceglie una direzione, "
        "la porta. "
        "I denti seghettati lasciano tracce che il suolo ricorda giorni dopo; "
        "gli artigli sette-vie incidono l'aria come scrittura che solo il territorio sa leggere. "
        "Dove il branco è passato, le voci nel vuoto tacciono."
    ),

    # ── KEYSTONE (8 entries) — voce SOLENNE, liturgico-ecologico ─────────────

    "symbiotica_thermalis": (
        "Galleggia sulla dorsale termale come un officiante sopra l'altare: "
        "il polso termico che emette non è aggressione, è redistribuzione. "
        "Senza il suo scheletro idraulico a pistoni che regola la pressione dei venti "
        "caldi, l'intera colonia corale sovrastante collassa in stagioni. "
        "Non è il più forte — è ciò senza cui il forte non esiste."
    ),

    "sp_ferriscroba_detrita": (
        "Scava nella materia morta con la pazienza di chi sa che il ciclo non ha fretta. "
        "Il suo corpo è il confine tra ciò che è stato e ciò che tornerà utile: "
        "ogni boccone di detrito che inghiotte è cibo restituito sotto altra forma "
        "a tre specie diverse. "
        "Toglietelo e la rete trofica inizia a digiunare."
    ),

    "sp_salifossa_tenebris": (
        "Nelle faglie saline più profonde dove la luce non ricorda di esistere, "
        "decompone con metodo liturgico: prima i composti solforati, "
        "poi i residui minerali, infine il vuoto che prepara per il prossimo ciclo. "
        "La sua assenza non si nota subito — si nota quando due specie di predatori "
        "iniziano a competere per una preda che non c'è più."
    ),

    "sp_arenaceros_placidus": (
        "Le membrane eliofiltranti trasformano ogni ora di luce in biomassa "
        "che non trattiene per sé: i brucatori la trovano già parzialmente pre-digerita "
        "nei solchi che gli artigli-radice lasciano nel suolo. "
        "Pascola senza fretta, perché sa di essere la condizione di possibilità "
        "di tutto ciò che pascola con lui."
    ),

    "sp_salisucta_alveata": (
        "Filtra senza sosta, alveolo dopo alveolo, "
        "trattenendo solo ciò che non serve ad altri "
        "e restituendo il resto alla corrente. "
        "L'ecosistema salino ruota attorno alla sua attività come una liturgia "
        "che nessuno ha scritto ma tutti rispettano: interrompila, e la torbidità "
        "uccide prima che lo faccia qualsiasi predatore."
    ),

    "sp_cryptolorca_medicata": (
        "Le cartilagini pseudometalliche riflettono le camere mirage "
        "che proietta nell'ambiente come un oracolo dell'habitat: "
        "le specie confinanti orientano i propri spostamenti stagionali "
        "sulle sue proiezioni senza sapere di farlo. "
        "È la chiave del bioma sotto forma di corpo."
    ),

    "sp_paludogromus_magnus": (
        "Si muove nell'acqua stagnante con la solennità di chi porta peso antico. "
        "Il suo ruolo non è combattere né fuggire: è mantenere, "
        "consolidare, rinsaldare i sedimenti che altrimenti andrebbero in deriva. "
        "Togli il magnus e la palude smette di essere palude — "
        "diventa un deserto sommerso."
    ),

    "sp_fumarisorba_sulfurea": (
        "Assorbe i fumi solforosi che ucciderebbero ogni altra forma di vita "
        "e li trasforma in substrato organico con una chimica "
        "che ancora sfida l'analisi. "
        "Nelle zone vulcaniche attive, è l'unica presenza che precede "
        "tutte le altre: arriva prima, prepara il terreno, "
        "poi si ritrae quando l'ecosistema non ha più bisogno di lei."
    ),

    # ── THREAT (9 entries) — voce TENSA, sinistro, immobilità predatoria ─────

    "sonaraptor_dissonans": (
        "Nell'istante prima dell'attacco, tutta la canopia ionica diventa silenziosa: "
        "il suo campo di interferenza acustica precede il corpo di due secondi. "
        "La lancia sonica che emette non è un grido — è la negazione del suono altrui, "
        "un vuoto che si espande fino a stordire prima che le zanne tocchino. "
        "Predatore che uccide il senso prima del corpo."
    ),

    "sp_lithoraptor_acutornis": (
        "L'intimidazione non è un segnale: è la sua prima arma. "
        "Le lamelle shear si aprono in ventaglio quando la distanza scende "
        "sotto la soglia di sicurezza, e il suono che producono "
        "è già abbastanza per fermare il cuore di una preda media. "
        "Chi non si ferma scopre le zanne nel modo sbagliato."
    ),

    "sp_pyrosaltus_celeris": (
        "Le zampe radianti accumulano calore nei tendini per ore, "
        "immobili, finché lo scatto è inevitabile come un crollo. "
        "I denti silice-termici entrano nella preda alla temperatura della fusione: "
        "non tagliano, cauterizzano nell'atto stesso. "
        "Cacciatore che non insegue — attende che la preda entri nel raggio del salto."
    ),

    "sp_limnofalcis_serrata": (
        "Galleggia appena sotto la superficie con la pazienza di chi sa "
        "che il tempo è sempre dalla sua parte. "
        "La dentatura serrata non è per uccidere veloce: è per trattenere "
        "mentre la corrente fa il resto del lavoro. "
        "Predatore d'acqua, geometria di agguato perfetta."
    ),

    "sp_tonitrudens_ferox": (
        "Onnivoro senza remore: non distingue tra preda e opportunità. "
        "La sua forza bruta è il segnale di pericolo che ogni specie del bioma "
        "ha imparato a riconoscere prima ancora di vederlo. "
        "Quando entra in un habitat, tutto ciò che può fuggire, fugge — "
        "il resto diventa cibo."
    ),

    "sp_cinerastra_nodosa": (
        "La colorazione cinerea lo rende indistinguibile dai substrati vulcanici "
        "su cui riposa per ore. "
        "Cacciatore in agguato puro: ogni nodul sporgente del corpo "
        "è un punto di ancoraggio che riduce il profilo termico "
        "finché la preda non è abbastanza vicina da non avere scelta."
    ),

    "sp_vitricyba_punctata": (
        "Si muove in cerca di cibo con una puntualità che sembra metodica: "
        "lo stesso percorso, la stessa ora, la stessa pazienza. "
        "È il predatore della routine altrui — impara i ritmi delle specie vicine "
        "e li sfrutta con una precisione che non lascia margine di scampo."
    ),

    "sp_siltovena_bifida": (
        "La biforcazione corporea le permette di occupare due traiettorie simultanee "
        "nella corrente limosa, avvicinandosi alla preda da angoli opposti. "
        "Non è veloce — è inevitabile: la geometria del suo attacco "
        "non lascia via di fuga che non sia già presidiata."
    ),

    "sp_magmocardium_furens": (
        "Il sangue piroforico scorre a temperature che rendono ogni ferita "
        "una doppia minaccia: il danno fisico e il calore che lo accompagna. "
        "Quando la circolazione supercritica entra in fase di collasso, "
        "il corpo diventa un'arma indiretta — "
        "avvicinarsi troppo ha un costo che la preda paga due volte."
    ),

    # ── BRIDGE (8 entries) — voce CURIOSA, lirico-osservativa ───────────────

    "psionerva_montis": (
        "Arrampica la caldera glaciale con l'attenzione di chi legge il paesaggio "
        "come testo: le corna psico-conduttive captano le correnti ferromagnetiche "
        "che altri esseri ignorano, traducendo il silenzio del ghiaccio "
        "in informazione navigabile. "
        "Abita la soglia tra il freddo e il psionico, curiosa di entrambi."
    ),

    "sp_sonapteryx_resonans": (
        "Le membrane soniche delle ali non servono solo al volo: "
        "sono uno strumento che suona il bioma mentre lo attraversa. "
        "Il canto di richiamo cambia frequenza a ogni habitat visitato, "
        "come se imparasse la lingua locale prima di posarsi. "
        "Dispersore che porta notizie di luoghi che nessun'altra specie ha visitato."
    ),

    "sp_ventornis_longiala": (
        "Le ali fulminee la portano oltre ogni confine di bioma "
        "prima che l'aria cambi di nuovo. "
        "Le membrane pneumatofore le permettono di planare senza battito "
        "per ore, leggendo le correnti come una mappa. "
        "Esplora i margini perché i centri non la interessano — "
        "è nei bordi che l'ecosistema si rivela."
    ),

    "sp_lucinerva_filata": (
        "Il carapace a segmenti logici si piega ad angoli diversi "
        "a seconda del substrato che attraversa, come se il corpo stesso "
        "stesse prendendo appunti sul territorio. "
        "Dispersore metodico: porta semi, spore e frammenti genetici "
        "tra habitat che altrimenti non si toccherebbero mai."
    ),

    "sp_cavatympa_sonans": (
        "Le antenne microonde cavernose le permettono di mappare "
        "le cavità rocciose dall'esterno, annusando l'architettura sotterranea "
        "senza entrarci. "
        "I tentacoli uncinati la ancorano alle pareti mentre scansiona: "
        "esploratore della soglia tra il mondo aperto e quello nascosto."
    ),

    "sp_glaciolabis_nitida": (
        "Predatrice di confine: si muove tra l'habitat glaciale e quelli adiacenti "
        "con una fluidità che i predatori strettamente specializzati "
        "non possono imitare. "
        "Non appartiene a nessun centro — la sua forza è essere a proprio agio "
        "in tutti i margini contemporaneamente."
    ),

    "sp_zephyrovum_fidelis": (
        "Trasporta spore e pollini attraverso le correnti d'aria "
        "con un'affidabilità stagionale che le specie vegetali circostanti "
        "hanno imparato a fare propria. "
        "Dispersore fedele: se il vento cambia rotta, la si trova già lì, "
        "adattata, pronta a ricominciare."
    ),

    "sp_arboryxis_lenis": (
        "Bruca lentamente, senza urgenza, "
        "seguendo il bordo tra la copertura arborea e lo spazio aperto "
        "come se cercasse il punto esatto dove un habitat lascia spazio all'altro. "
        "Non è il più veloce né il più forte: è il più presente, "
        "e la sua presenza rende permeabile ogni confine che incontra."
    ),

    # ── SUPPORT (4 entries) — voce DISCRETA, umile-meticolosa ───────────────

    "sp_basaltocara_scutata": (
        "Gli artigli vetrificati non sono armi — sono strumenti di ancoraggio "
        "nelle zone vulcaniche dove nessun altro può tenersi fermo. "
        "Le ghiandole di fango caldo riparano le fessure del substrato "
        "dove altre specie si insediano dopo di lei: "
        "lavora in silenzio, poi sparisce prima che gli inquilini arrivino."
    ),

    "sp_radiluma_pendula": (
        "Il biofilm luminescente che secerne non è esibizione: "
        "è un segnale che orienta le specie batteriche simbionti "
        "verso le zone del substrato dove il carapace abissale "
        "ha già pre-digerito i nutrienti. "
        "Lavora per altri, nella penombra, senza aspettare reciprocità."
    ),

    "sp_nebulocornis_mollis": (
        "Si muove tra le specie brucatrici con una discrezione "
        "che la rende quasi invisibile al comportamento collettivo del gregge. "
        "Ripara, redistribuisce, occcupa i vuoti che gli altri lasciano "
        "senza accorgersene. "
        "Il suo contributo si nota solo quando manca."
    ),

    "sp_magnetocola_pastoris": (
        "La circolazione bifasica le permette di regolare la temperatura corporea "
        "in modo che i parassiti termici che colpirebbero le specie circostanti "
        "vengano assorbiti e neutralizzati nel suo metabolismo. "
        "Guardiana silenziosa del gregge: non combatte, assorbe."
    ),

    # ── PLAYABLE (1 entry) — voce EMPATICA, affettivo-evolutiva ─────────────

    "fusomorpha_palustris": (
        "Creatura delle paludi salmastre che non ha ancora deciso quale forma preferisce: "
        "il flusso ameboide le lascia aperta ogni possibilità, "
        "e la fagocitosi che pratica non è solo alimentazione — "
        "è curiosità che incorpora il mondo per capirlo meglio. "
        "Cresce con chi la accompagna, cambia con le stagioni, "
        "porta addosso ogni incontro come uno strato in più."
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# D.6 — SYMBIOSIS POLISH (18 entries: 9 Apex+Keystone + 8 Bridge + 1 Skiv himself)
# 1-2 sentence ecology mutualism beat in Skiv-style voice
# Voice register: Skiv-style (concrete actor + concrete effect on ecosystem)
# Per-clade: Apex epica / Keystone solenne / Bridge curiosa / Skiv-canonical desertic
# Key: species_id / legacy_slug
# ─────────────────────────────────────────────────────────────────────────────

SYMBIOSIS_POLISH = {

    # ── APEX ─────────────────────────────────────────────────────────────────

    "pulverator_gregarius": (
        # Skiv-adjacent: sabbia/vento register + concrete dune_stalker link
        "Il branco segna la traiettoria notturna di migrazione "
        "che il dune_stalker usa per orientarsi nelle scansioni vibrazionali: "
        "senza il rumore dei passi collettivi, "
        "il cacciatore solitario perde il filo del suolo. "
        "La sabbia porta tracce di entrambi — non si separano mai del tutto."
    ),

    # ── KEYSTONE (8) ─────────────────────────────────────────────────────────

    "symbiotica_thermalis": (
        "Il pulso termico che irradia stabilizza le colonie batteriche "
        "chemiosintetiche della dorsale: senza la sua regolazione, "
        "la temperatura fluttua oltre la soglia di tolleranza "
        "e tre livelli trofici collassano in una stagione."
    ),

    "sp_ferriscroba_detrita": (
        "La sua attività di scavo redistribuisce detriti organici "
        "verso gli strati superficiali dove le specie fitofaghe possono raggiungerli: "
        "ogni carcassa che elabora diventa substrato per almeno "
        "due specie che non avrebbero trovato cibo da sole."
    ),

    "sp_salifossa_tenebris": (
        "Nelle fasce saline anossiche decompone con metodologia che libera "
        "fosfati assorbibili dalle radici delle specie alofite adiacenti: "
        "toglietela e le piante del margine salino iniziano "
        "a cedere in tre cicli."
    ),

    "sp_arenaceros_placidus": (
        "Le membrane eliofiltranti convertono la luce solare in exsudate "
        "che fertilizzano il suolo attorno ai percorsi di pascolo: "
        "i micro-organismi del suolo prosperano sui suoi sentieri "
        "e le specie detritivore seguono la sua rotta stagionale."
    ),

    "sp_salisucta_alveata": (
        "La filtrazione alveolare rimuove la torbidità che soffocherebbe "
        "le larve delle specie bentoniche circostanti: "
        "la sua presenza è la condizione di visibilità "
        "in cui tutta la catena alimentare del basso fondale opera."
    ),

    "sp_cryptolorca_medicata": (
        "Le proiezioni mirage delle camere cartilagine funzionano "
        "come calendari ambientali per le specie migratorie vicine: "
        "i pattern visivi che emette segnalano i cicli stagionali "
        "che sincronizzano la riproduzione di almeno quattro specie."
    ),

    "sp_paludogromus_magnus": (
        "Il passaggio del magnus consolida i sedimenti che altrimenti "
        "andrebbero in sospensione, mantenendo la chiarezza "
        "dell'acqua necessaria alle specie fotiche del livello superiore: "
        "è il fondamento strutturale della palude, non solo il suo abitante."
    ),

    "sp_fumarisorba_sulfurea": (
        "Neutralizza la tossicità sulfurea delle emanazioni vulcaniche "
        "abbassando la soglia di colonizzazione dell'habitat: "
        "ogni specie pioniera che arriva dopo di lei trova già "
        "un substrato respirabile che lei ha preparato senza rimanere ad aspettare ringraziamenti."
    ),

    # ── BRIDGE (8) — voce CURIOSA lirico-osservativa + Skiv-style mutualism ──

    "psionerva_montis": (
        "Le corna psico-conduttive traducono i sussurri ferromagnetici della caldera "
        "in segnali leggibili dalle specie più lente: tre clade montani usano i suoi "
        "pattern psionici come navigazione di gruppo. "
        "Senza il suo passaggio meditativo lungo i crinali, "
        "la rete di consapevolezza condivisa si frammenta in stagioni."
    ),

    "sp_sonapteryx_resonans": (
        "Le ali a membrana sonica modulano il canto di richiamo in frequenze "
        "che le specie sedentarie usano come cronometro stagionale: "
        "quando smette di passare, almeno due specie del sottobosco "
        "perdono il segnale per migrare e restano fuori finestra riproduttiva."
    ),

    "sp_ventornis_longiala": (
        "Le ali fulminee disperdono semi e spore su rotte aeree che nessun altro "
        "essere raggiunge: ogni traversata fertilizza i margini di biomi che il vento "
        "da solo non collegherebbe. "
        "È il filo invisibile che cuce gli habitat distanti."
    ),

    "sp_lucinerva_filata": (
        "Il carapace a segmenti logici codifica memoria di percorsi che le compagne "
        "usano per coordinare i raid di raccolta: traccia rotte vibrazionali "
        "che diventano via permanente per il clan, riducendo lo spreco di energia "
        "delle generazioni successive."
    ),

    "sp_cavatympa_sonans": (
        "Le antenne a microonde cavernose mappano cavità invisibili dove le specie "
        "troglofile si ricovrano nelle stagioni avverse: i suoi richiami aprono "
        "rifugi che altrimenti resterebbero introvabili — "
        "è la chiave acustica della sopravvivenza ipogea."
    ),

    "sp_glaciolabis_nitida": (
        "Predatore della soglia glaciale: rimuove le specie più deboli che "
        "altrimenti satureranno il margine e impedirebbero la nidificazione "
        "delle clade più rare. "
        "Senza la sua pressione selettiva, il margine si chiude in monocoltura "
        "e tre nicchie si estinguono in silenzio."
    ),

    "sp_zephyrovum_fidelis": (
        "Disperde uova di altre specie ovipare adese alle scaglie pneumatiche: "
        "le sue rotte aeree diventano corridoi riproduttivi per clade che non "
        "potrebbero attraversare zone aperte da sole. "
        "Trasporta il futuro genetico altrui come bagaglio inconsapevole."
    ),

    "sp_arboryxis_lenis": (
        "Il pascolo selettivo apre clearings tra le canopie dove le specie eliofile "
        "prosperano: ogni traccia di erba consumata diventa nicchia di luce "
        "per il sottobosco. "
        "Mangiando, costruisce — anche se non sa di farlo."
    ),

    # ── THREAT savana — Skiv canonical himself (dune_stalker) ──────────────────

    "dune_stalker": (
        # Skiv-canonical Skiv-style: italian, desertic, sabbia/vento/voci, third person
        "Le rotte di scavo notturne del dune_stalker tracciano la mappa dell'acqua "
        "profonda che il branco di pulverator gregarius usa per orientarsi al tramonto: "
        "senza il rumore collettivo dei pulverator, le sue scansioni vibrazionali "
        "perdono il fondo acustico — e senza i suoi tunnel, il branco perde la sete "
        "guida. La sabbia porta le tracce di entrambi: non si separano mai del tutto."
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# APPLY FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def get_species_id(sp: dict) -> str:
    return sp.get("species_id") or sp.get("legacy_slug") or ""


def apply_polish(catalog_path: Path) -> None:
    with open(catalog_path, encoding="utf-8") as f:
        data = json.load(f)

    catalog = data["catalog"]
    polished_vd = 0
    polished_sym = 0
    skipped_vd = []
    skipped_sym = []

    for sp in catalog:
        sp_id = get_species_id(sp)
        existing_prov = sp.get("_provenance")

        # D.5 — visual_description polish
        if sp_id in VISUAL_POLISH:
            vd_prov = (existing_prov or {}).get("visual_description", "")
            if "heuristic" in str(vd_prov):
                clade = (sp.get("clade_tag") or "unknown").lower()
                # Skiv-adjacent override
                if sp_id == "pulverator_gregarius":
                    prov_tag = "claude-polish-skiv-adjacent-savana"
                else:
                    prov_tag = f"claude-polish-per-clade-{clade}"
                sp["visual_description"] = VISUAL_POLISH[sp_id]
                sp["_provenance"]["visual_description"] = prov_tag
                polished_vd += 1
            else:
                skipped_vd.append((sp_id, vd_prov))

        # D.6 — symbiosis polish (Apex + Keystone + Bridge + Skiv)
        if sp_id in SYMBIOSIS_POLISH:
            sym_prov = (existing_prov or {}).get("interactions.symbiosis", "")
            if "heuristic" in str(sym_prov):
                clade = (sp.get("clade_tag") or "unknown").lower()
                if sp_id == "pulverator_gregarius":
                    prov_tag = "claude-polish-skiv-style-apex-savana"
                elif sp_id == "dune_stalker":
                    prov_tag = "claude-polish-skiv-canonical-savana"
                else:
                    prov_tag = f"claude-polish-skiv-style-{clade}"
                interactions = sp.setdefault("interactions", {})
                if not isinstance(interactions, dict):
                    interactions = {}
                    sp["interactions"] = interactions
                interactions["symbiosis"] = SYMBIOSIS_POLISH[sp_id]
                sp["_provenance"]["interactions.symbiosis"] = prov_tag
                polished_sym += 1
            else:
                skipped_sym.append((sp_id, sym_prov))

    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"D.5 visual_description polished:  {polished_vd} / {len(VISUAL_POLISH)}")
    print(f"D.6 symbiosis polished:           {polished_sym} / {len(SYMBIOSIS_POLISH)}")

    # Count remaining heuristic
    with open(catalog_path, encoding="utf-8") as f:
        data2 = json.load(f)
    remaining_vd_h = sum(
        1 for sp in data2["catalog"]
        if "heuristic" in str(sp.get("_provenance", {}).get("visual_description", ""))
    )
    remaining_sym_h = sum(
        1 for sp in data2["catalog"]
        if "heuristic" in str(sp.get("_provenance", {}).get("interactions.symbiosis", ""))
    )
    total_claude_polish = sum(
        1 for sp in data2["catalog"]
        for v in sp.get("_provenance", {}).values()
        if "claude-polish" in str(v)
    )
    print(f"Remaining heuristic visual_desc:  {remaining_vd_h}")
    print(f"Remaining heuristic symbiosis:    {remaining_sym_h}")
    print(f"Total claude-polish-* prov keys:  {total_claude_polish}")

    if skipped_vd:
        print(f"\nSkipped D.5 (not heuristic): {[x[0] for x in skipped_vd]}")
    if skipped_sym:
        print(f"Skipped D.6 (not heuristic): {[x[0] for x in skipped_sym]}")

    print(f"\nVerification: python3 tools/py/review_phase3.py --stats")
    print(f"  Expected: claude-polish-* sources >= {polished_vd + polished_sym}")


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else CATALOG_PATH
    if not path.exists():
        print(f"ERROR: catalog not found at {path}", file=sys.stderr)
        sys.exit(1)
    apply_polish(path)
    print("Done.")
