
# Enneagramma — Add‑on per `evo_pacchetto_minimo_v6`

Questa cartella contiene i file per agganciare il **Profilo Enneagramma** al pacchetto minimo.

## Come integrare (minimo indispensabile)
1. **Copia questa cartella** dentro il pacchetto: ad es. `modules/personality/enneagram/`.
2. **Importa lo schema** nella tua definizione di Scheda PG e aggiungi il blocco:
   ```yaml
   personality:
     enneagram:  # vedi pg_enneagram_template.yaml
       type_id: <1-9>
       wing_primary: "<TwX>"
       wings: ["<TwL>","<TwR>"]
       core_emotion: "<Rabbia|Vergogna|Paura>"
       social_style: "<Obbediente|Ritirato|Assertivo>"
       conflict_style: "<Ottimisti|Competenti|Reattivi>"
       object_relation: "<Attaccamento|Frustrazione|Rifiuto>"
       instinct_variant: "<SP|SO|SX>"
       stacking: "<sp/so|sp/sx|so/sp|so/sx|sx/sp|sx/so>"
   ```
3. **Carica il modulo meccanico**: `personality_module.v1.json` e **mappa STAT/EVENTI** con `compat_map.json`.
4. **(TS)** Collega `hook_bindings.ts` al tuo orchestratore/event bus per attivare i piccoli effetti **per 1 turno** (baseline).

## Adattamento nomi STAT/EVENTI
- Ho eseguito uno scan preliminare del pacchetto per cercare nomi candidati (vedi tabella sotto).
- Aggiorna `compat_map.json` inserendo i nomi reali delle tue **stat** e dei tuoi **eventi** (alias → canonici).

## Candidati trovati (euristica)
- STAT (top 20): ['burst_anaerobic', 'hp', 'solo', 'hp_base', 'encounter_tables.yaml', 'melee', 'ranged', 'supporto.', 'damage', 'damage_type', 'encounter', 'stealth', 'hp_from_morph', 'hp_from_job', 'burst', 'stealth.', 'ranged_focus', 'ranged_touch', 'support', 'burst_anaerobic.yaml']
- EVENTI (top 20): []

> Nota: i candidati sono **indicativi**; conferma su file specifici del tuo engine per una mappa 1:1.
