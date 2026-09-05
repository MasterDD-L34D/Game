# Enneagramma — Dataset Completo (Tipi, Triadi, Ali, Varianti)

Questa cartella centralizza i file di riferimento per integrare l'Enneagramma in **Gioco Evo Tactics**. Trovi sia le rappresentazioni JSON utilizzate dai generatori sia i CSV documentali basati sul pacchetto storico.

## File inclusi
- **enneagramma_dataset.json** — Replica lo schema principale dei 9 tipi (centro/triade, emozione e motivazioni di base, passione, fissazione, virtù, punti di stress/crescita e ali disponibili con le denominazioni ufficiali EI).
- **enneagramma_master.csv** — Tabella piatta equivalente per fogli di calcolo e analisi rapida dei tipi.
- **enneagramma_wings.csv** — Dettaglio delle 18 combinazioni wing (1w9, 1w2, ecc.) con descrizioni operative.
- **enneagramma_triadi_complete.csv** — Catalogo delle triadi Centri, Hornevian, Harmonic e Object Relations.
- **enneagramma_varianti_istintive.csv** — Sintesi delle varianti istintive (SP, SO, SX).
- **enneagramma_stackings.csv** — Le sei combinazioni di stacking con note applicative.
- **enneagramma_schema.json** — Definisce lo schema di validazione utilizzato dagli strumenti `validate_v7.py` e dai generatori Ennea.
- **compat_map.json** — Alias per le statistiche e gli eventi di gioco più comuni, con limiti operativi e preferenze di stacking.
- **hook_bindings.ts** — Layer TypeScript che collega gli hook telemetrici ai bus/eventi del motore.
- **hydrate_profile.py** — Utility Python per idratare automaticamente un blocco `personality.enneagram` con i dati derivati.
- **personality_module.v1.json** — Modulo Enneagramma pronto per l'importazione nell'engine Evo Tactics.

> I CSV rispecchiano i contenuti storici (`enneagramma_master.csv`, `enneagramma_wings.csv`, `enneagramma_triadi_complete.csv`, `enneagramma_varianti_istintive.csv`, `enneagramma_stackings.csv`) e possono essere usati per QA manuale o per pipeline che richiedono formati tabellari.

## Note terminologiche (IT)
- Le traduzioni di *passions/fixations/virtues* e le etichette italiane dei tipi seguono l'uso più comune in Italia. Dove utile, viene mantenuto il nickname EI in inglese (es. "1w9 – The Idealist").
- *Stress* e *Crescita/Sicurezza* corrispondono alle direzioni di **disintegrazione** e **integrazione** (o *security*/*stress points*) delle linee dell'Enneagramma.

## Fonti principali (di riferimento)
- Wikipedia — *Enneagram of Personality* (tabella con *basic fear/desire*, passioni, fissazioni, virtù e punti di stress/crescita):  
  https://en.wikipedia.org/wiki/Enneagram_of_Personality
- The Enneagram Institute (Riso & Hudson) — Pagine di tipo (per *Basic Fear/Desire* e nomi delle ali):
  - Tipo 1: https://www.enneagraminstitute.com/type-1  
  - Tipo 2: https://www.enneagraminstitute.com/type-2  
  - Tipo 3: https://www.enneagraminstitute.com/type-3  
  - Tipo 4: https://www.enneagraminstitute.com/type-4  
  - Tipo 5: https://www.enneagraminstitute.com/type-5  
  - Tipo 6: https://www.enneagraminstitute.com/type-6  
  - Tipo 7: https://www.enneagraminstitute.com/type-7  
  - Tipo 8: https://www.enneagraminstitute.com/type-8  
  - Tipo 9: https://www.enneagraminstitute.com/type-9  
  - "How the System Works" (ali e linee): https://www.enneagraminstitute.com/how-the-enneagram-system-works/
- Hornevian & Harmonic Groups — sintesi e definizioni operative:  
  - Hornevian: https://enneagramexplained.com/enneagram-hornevian-groups/  
  - Harmonic: https://enneagramexplained.com/enneagram-harmonic-groups/
- Object Relations (Attachment/Frustration/Rejection):  
  - Introduzione: https://heathdavishavlick.com/the-enneagram-and-object-relations-theory/  
  - Riepilogo triadi: https://www.raenahubbell.com/enneagram-attachment-styles/
- Varianti istintive & Subtypes (Narrative Enneagram):  
  - https://www.narrativeenneagram.org/instinctual-subtypes/  
  - https://www.narrativeenneagram.org/programs/instincts-and-subtypes/

> **Avvertenza**: L'Enneagramma non è un modello scientificamente convalidato e viene criticato in ambito accademico. Usarlo nel progetto come **strumento descrittivo/ludico** è appropriato; evitare pretese diagnostiche.

---

# Personality Enneagram — Mechanical Integration (Draft)

Questa bozza unifica **dataset**, **registry meccanico** e la **mappa di compatibilità** (stats/eventi/limiti). I file elencati sono allineati con gli hook introdotti in `ennea-themes.md`.

## File
- `personality_module.v1.json` — Modulo unico pronto per l'import nel motore con hook primari e secondari (multi-trigger).
- `compat_map.json` — Alias per **stat** ed **eventi** + regole di stacking/limiti (versione 0.2.0 verificata sugli entry point correnti).
- `hook_bindings.ts` — Binding TypeScript per attivare gli hook telemetrici e aggregare requisiti/trigger per tema.
- `hydrate_profile.py` — Script di idratazione dei profili PG basato sul dataset canonico.

## Collegamento con `themes.yaml`
- `packs/evo_tactics_pack/tools/py/ennea/themes.yaml` (v0.3.0) ora espone per ciascun tema requisiti di telemetria, preferenze di mating e sinergie con triadi/Hornevian/Harmonic.
- Le stesse informazioni sono replicate in `personality_module.v1.json` (`dataset.themes`) così da avere una fonte unica sia per gli script Python sia per i bindings TS.
- Ogni voce del registry (`mechanics_registry.hooks[*]`) espone il blocco `links` con i metric-ids di telemetria, gli alias di compatibilità e i ganci secondari (`triad.*`, `hornevian.*`, `harmonic.*`) per favorire l'interconnessione fra dataset e modulo meccanico.
- Gli hook tematici espongono ora blocchi `triggered_effects` per riflettere tutti i trigger/effect descritti in `themes.yaml`.
- `hook_bindings.ts` aggrega trigger primari e secondari, includendo finestre di telemetria, preferenze di mating e note operative per i tool.


## Come usarlo
1. Parser della scheda PG → leggi `personality.enneagram` seguendo lo schema definito in `enneagramma_schema.json`.
2. Adapter → risolvi `stats/events` reali usando `compat_map.json` (alias).
3. Engine → attiva gli hook in `mechanics_registry.hooks` (inclusi i `triggered_effects`) rispettando i limiti per turno/incontro.
4. Schema/QA → usa `hydrate_profile.py` per riempire i campi derivati (`readOnly`) direttamente dal dataset prima di serializzare le schede.

> Nota: i valori sono conservativi (baseline) fino al bilanciamento con le statistiche canoniche. Gli alias di `compat_map.json` sono allineati allo stato `aliases_verified_v1`, ma riconferma le mappature quando introduci nuove statistiche o eventi nel motore.

---

# Enneagramma — Add-on per `evo_pacchetto_minimo_v6`

Questa cartella contiene i file per agganciare il **Profilo Enneagramma** al pacchetto minimo.

## Come integrare (minimo indispensabile)
1. **Copia questa cartella** nel pacchetto (ad es. `modules/personality/enneagram/`).
2. **Importa lo schema** in `personality_module.v1.json` e aggiungi il blocco alla scheda PG:
   ```yaml
   personality:
     enneagram:  # vedi enneagramma_schema.json per i campi obbligatori
       type_id: <1-9>
       wing_primary: "<TwX>"
       wings: ["<TwL>", "<TwR>"]
       core_emotion: "<Rabbia|Vergogna|Paura>"
       social_style: "<Obbediente|Ritirato|Assertivo>"
       conflict_style: "<Ottimisti|Competenti|Reattivi>"
       object_relation: "<Attaccamento|Frustrazione|Rifiuto>"
       instinct_variant: "<SP|SO|SX>"
       stacking: "<sp/so|sp/sx|so/sp|so/sx|sx/sp|sx/so>"
   ```
3. **Carica il modulo meccanico** `personality_module.v1.json` e mappa **STAT/EVENTI** con `compat_map.json`.
4. **(TS)** Collega `hook_bindings.ts` al tuo orchestratore/event bus per attivare gli effetti di breve durata.

## Adattamento nomi STAT/EVENTI
- Effettua uno scan del tuo motore per individuare i nomi canonici delle statistiche. Aggiorna `compat_map.json` sostituendo gli alias placeholder.
- Gli script di validazione (`validate_v7.py`) evidenziano eventuali alias mancanti.

> Nota: i candidati elencati nei vecchi pacchetti (`burst_anaerobic`, `hp`, `solo`, ecc.) erano generati euristicamente e potrebbero non coincidere con la nomenclatura aggiornata. Conferma e sostituisci caso per caso.

