# Piano Rollout Sensienza (T1…T6)

Questo documento coordina l'adozione dei nomi/codici definitivi dei tier di
Sensienza all'interno del gioco e delle integrazioni esterne.

## 1. Aggiornamento componenti core

### Engine

- Sincronizzare i preset dei encounter generator con i nuovi slug
  (`incoming_sentience_traits_v1_0_t*`).
- Validare i gate AI/energia usando i milestone ufficiali:
  - T1 Proto‑Sentiente → _Senses (core)_
  - T2 Pre‑Sociale → _Senses mid_ + _AB 01 Endurance_
  - T3 Emergente → _Senses mid+_ + _AB 02–03 movement/carry_
  - T4 Civico → _Sound Awareness/Chemotopy full_ + _AB 05–09 climb/carry_
  - T5 Avanzato → _Memorie echoic/iconic multiple_ + _AB 11 pain_
  - T6 Sapiente → _Senses 37/37_ + _Ambulation 26/26_
- Verificare che i salvataggi serializzati non contengano più reference legacy
  (`*_protosentiente`, `*_culturale`, `*_proto_umano`). In caso contrario,
  applicare lo script di migrazione (`tools/migrations/traits_styleguide_migration.py`).

### Services (generation/orchestrator)

- Aggiornare le pipeline che popolano `data_origin` e metadati dei trait nei
  mock bundle di build: usare il nuovo manifest `incoming/sentience_traits_v1.0.yaml`.
- Rinfrescare i cataloghi condivisi (`docs/catalog/*.json`) e riesportare le
  build di test con la tassonomia aggiornata.
- Pianificare smoke test post-deploy con seed sensience per garantire che le
  build di demo non presentino mismatch.

### Analytics

- Allineare i dashboard (trait coverage, balance) ai nuovi label. Aggiornare
  eventuali filtri o pivot manuali che menzionano i tier legacy.
- Aggiornare i playbook di QA/BI in `reports/` con screenshot o note che
  evidenzino la nuova nomenclatura.
- Coordinare con Data Science il monitoraggio di regressioni post-rollout
  (telemetria sulle transizioni T1→T6 e uso degli hook interocettivi).

### Documentazione esterna (API / SDK)

- Pubblicare un estratto nel portale SDK con i nuovi codici tier + milestone
  (vedi `docs/public/sentience_sdk.md`).
- Aggiornare esempi e snippet di chiamate API che facevano riferimento alle
  sigle legacy `Sensienti`.
- Notificare partner e integratori tramite changelog pubblico.

## 2. Coordinamento contenuti condivisi

- **Team Game Design**: aggiornare manuali build, schede encounter e cheat-sheet
  usati nei playtest con i nuovi nomi e milestone.
- **Team Narrative/Localization**: rivedere copy e VO script per sostituire i
  vecchi termini (Proto‑Senziente, Sociale, Culturale, Proto‑Umano) con i nomi
  definitivi; confermare localizzazioni nelle lingue supportate.
- **Distribuzione materiali**: rigenerare `manuali/` e `demo/` nella cartella
  condivisa, allegando nota di versione con riferimento al manifest 1.0.

## 3. Compatibilità e migrazione

1. Eseguire lo script `tools/migrations/traits_styleguide_migration.py` in dry
   run sui branch di feature o sui dump delle build.
2. Se vengono rilevati riferimenti legacy, rilanciare con `--apply` (in un
   branch dedicato) e allegare il log al ticket di rollout.
3. Per salvataggi live:
   - Pianificare una finestra di manutenzione con Ops.
   - Eseguire backup prima della migrazione.
   - Applicare lo script in modalità batch sugli slot interessati.
4. Post-migrazione: verificare le sinergie e i gating con l'editor trait (`npm
run style:check`).

## 4. Piano di comunicazione

| Fase       | Azione                                                       | Owner               | Canale             |
| ---------- | ------------------------------------------------------------ | ------------------- | ------------------ |
| T‑3 giorni | Bozza release notes (ITA+EN) con elenco tier e milestone     | Narrative           | Docs + Notion      |
| T‑2 giorni | Annuncio interno su Mission Console con link al manifest 1.0 | Prod Ops            | Mission Console    |
| T‑1 giorno | Aggiornare FAQ SDK e changelog pubblico                      | Developer Relations | Portal SDK         |
| T          | Deploy + post su #launches con link a retro board            | Live Ops            | Slack              |
| T+1        | Raccolta feedback, monitor telemetria T1→T6                  | Analytics           | Dashboard dedicato |

**Feedback loop**

- Creare ticket su `QA/Sentience` per ogni regressione o bug segnalato.
- Monitorare grafici telemetrici (tempo medio transizione tier, uso hook) per 2
  settimane e condividere sintesi nel weekly sync.
