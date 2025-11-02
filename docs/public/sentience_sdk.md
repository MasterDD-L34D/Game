# Sentience Tier Reference (SDK)

Questo documento riepiloga i codici definitivi dei tier di Sensienza da
utilizzare nelle integrazioni API/SDK.

| Codice | Label | Milestone gating | Note |
| --- | --- | --- | --- |
| `T1` | Proto‑Sentiente | Senses (core) | Uso base sensoriale; nessun linguaggio strutturato. |
| `T2` | Pre‑Sociale | Senses mid; AB 01 Endurance | Bande opportunistiche, prime call vocali. |
| `T3` | Emergente | Senses mid+; AB 02–03 movement/carry | Grooming rituale, attenzione condivisa. |
| `T4` | Civico | Sound Awareness/Chemotopy full; AB 05–09 climb/carry | Ruoli sociali e strumenti lavorati. |
| `T5` | Avanzato | Memorie echoic/iconic multiple; AB 11 pain | Istituzioni, archivi, linguaggio semantico. |
| `T6` | Sapiente | Senses 37/37; Ambulation 26/26 | Città, diritto & scienza, linguaggio scritto. |

## Interoception Hooks

| ID | Label | Effetti |
| --- | --- | --- |
| `proprioception` | Propriocezione | `+1` step equilibrio/posizione; `-1` stack fatica sprint |
| `vestibular` | Equilibrio (Vestibolare) | Vantaggio contro cadute; penalità carico `-1` tier |
| `nociception` | Nocicezione | `quando Ferito: ritardi -1`; trigger difensivi reattivi |
| `thermoception` | Termocezione | Clock caldo/freddo; resistenze gear/ambiente |

### Integrazione
- Endpoint `POST /traits/import` accetta i nuovi slug `incoming_sentience_traits_v1_0_t*`.
- I client che consumano `GET /sentience/tiers` devono aggiornare la cache entro
  24h dal rollout per evitare mismatch con i salvataggi migrati.
