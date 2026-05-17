---
title: 'Frattura Abissale Sinaptica – Step 2 (Identità e lore, STRICT MODE / SANDBOX)'
description: 'Output narrativo per lore-designer a supporto di biome-ecosystem-curator e trait/species-curator'
---

## Piano sintetico (3–7 punti)

1. Riprendi il perimetro di Step 1 e conferma i vincoli cross-dataset (biomi assenti, pool e specie da creare) per evitare scope creep.
2. Definisci tono e motivi ricorrenti per i tre livelli, mantenendo coerenza tra gradienti di luce/pressione e l’elemento elettrico/sinaptico.
3. Caratterizza le Correnti Elettroluminescenti come fenomeno ricorrente che influenza slot/trait e percezione, con effetti temporanei utili per Step 3–4.
4. Redigi hook narrativi per le quattro specie, indicando relazioni con livelli e correnti; segnala bisogni di trait (buff/debuff, swarm manipulation, forma dinamica, copia partial-traits).
5. Prepara note operative per biome-ecosystem-curator (Step 3) e trait/species-curator (Step 4–5): tag/climate suggeriti, hazard tematici, spunti per pool e trait temporanei.

## Produzione narrativa

### Livello 1 – Cresta Fotofase

- **Identità:** dorsali luminescenti in cui filamenti corallini bioelettrici emettono bagliori ritmici. Correnti superficiali trasportano particelle memetiche che amplificano i segnali neuronali degli organismi.
- **Esperienza:** zone relativamente accessibili ma instabili: impulsi elettrici intermittenti alterano temporaneamente sensi e orientamento.
- **Tono e temi:** meraviglia cauta, sincronia ritmica, alleanze effimere.
- **Ganci meccanici:** hazard a impulsi (stun/paralysis breve), bonus di coordinamento se gli organismi risuonano con il ritmo locale; potenziali slot di supporto per trait luminosi e sensoriali.

### Livello 2 – Soglia Crepuscolare

- **Identità:** fascia di transizione dove la luce decade in pattern intermittenti; masse di plancton sinaptico creano “nebbie cognitive” che confondono percezione e memorie a breve termine.
- **Esperienza:** visibilità ridotta, segnali elettrici erratici che disallineano team e stormi; le correnti portano schegge di dati bioelettrici che possono essere assimilati o respinti.
- **Tono e temi:** incertezza, dubbi identitari, tensione cooperativa.
- **Ganci meccanici:** hazard che forzano test di controllo/volontà; opportunità di hackerare temporaneamente trait altrui; trait di soppressione sensoriale/rumore.

### Livello 3 – Frattura Nera

- **Identità:** canyon abissale senza luce diretta, dominato da eco elettriche profonde e risonanze gravitazionali. Archi di pietra ferro-magnetica canalizzano correnti massive.
- **Esperienza:** pressione estrema, eco ritmiche che destabilizzano morfologie; zone di quiete magnetica in cui i trait si resettano brevemente prima di esplodere.
- **Tono e temi:** reverenza, minaccia sovrastante, metamorfosi forzata.
- **Ganci meccanici:** hazard persistenti con stacking (stress + distorsione trait); slot per trasformazioni condizionate; affinità con trait gravitazionali/ferro-elettro.

### Fenomeno – Correnti Elettroluminescenti

- **Descrizione:** flussi intermittenti di particelle bioelettriche che attraversano tutti i livelli, modulando temporaneamente i trait. Agiscono come “aggiornamenti di firmware” ambientale, con durata breve e ciclica.
- **Effetti narrativi:** creano finestre di potenziamento o vulnerabilità, intensificano i legami sinaptici tra specie, generano eco di memorie collettive.
- **Spunti meccanici (per Step 3–4):**
  - Applicare buff/debuff temporanei su slot ambientali/parte-equipment.
  - Trigger di risonanza: se più unità condividono tag elettrico/sinaptico, la corrente amplifica/duplica un trait support.
  - Sfasamento: al termine della corrente, un tratto può “scintillare” (copiato in forma ridotta o sopito per 1 turno).

### Hook narrativi per le specie collegate

- **Polpo Araldo Sinaptico (support, buff/debuff bioma):** emissario che legge il ritmo delle correnti e lo traduce in segnali di squadra. Hook: missioni di sincronizzazione tra squadre rivali; scelta morale tra stabilizzare o sovraccaricare la Cresta Fotofase.
- **Sciame di Larve Neurali (swarm, manipolazione trait avversari):** micro-organismi che scrivono/riscrivono sinapsi usando le correnti come vettore. Hook: infestare equipaggiamento per intercettare memorie; rischio di creare “echo-loop” che attirano predatori della Frattura Nera.
- **Leviatano Risonante (boss, forma variabile per fase bioma):** colosso che cambia assetto in base al livello attraversato; assorbe correnti per modulare carapace e sonar. Hook: caccia rituale per ottenere armonie; possibilità di renderlo alleato se si accordano i tre livelli.
- **Simbionte Corallino Riflesso (ibrido, copia partial-traits):** formazione corallina specchiante che apprende dalle correnti; replica tratti incompleti per creare sinergie inattese. Hook: negoziare con colonie multiple che riflettono strategie diverse; rischio di assimilare difetti oltre ai pregi.

## Output formattato

--- INIZIO docs/biomes/Frattura_Abissale_Sinaptica_lore.md ---
[questo file]
--- FINE docs/biomes/Frattura_Abissale_Sinaptica_lore.md ---

## Self-critique (Step 2, STRICT MODE / SANDBOX)

- **Coerenza con Step 1 e dati esistenti:** confermata l’assenza del bioma e delle specie nei dataset core; i tre livelli e le correnti sono descritti in modo da supportare pool distinti e trait temporanei coerenti con schema_version 1.0 dei pool. Non sono stati toccati file dati.
- **Rischi narrativi:** correnti troppo potenti potrebbero oscurare l’identità dei livelli; occorre limitare durata/stacking. Necessario evitare sovrapposizione di temi (luminoso vs gravitazionale) senza ancorarli a tag/affixes precisi.
- **Cosa serve al Biome/Ecosystem Curator per Step 3:** suggerimenti per `biome_tags` (luminescente, profondo, elettrico, gravitazionale), hazard per livello (impulsi/stun, nebbie cognitive, distorsione gravitazionale), naming dei pool (es. fotofase_surge, crepuscolo_synapse, frattura_rift) e chiarimenti su come modellare le correnti come hazard ciclico o trait temporaneo associato ai pool.
