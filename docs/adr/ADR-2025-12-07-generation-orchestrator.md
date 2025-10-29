# ADR-2025-12-07: Orchestratore pipeline generazione specie

- **Data**: 2025-12-07
- **Stato**: Approvato
- **Owner**: Team Backend & Tools
- **Stakeholder**: Frontend Squad, Narrative Ops, QA Automation

## Contesto

La generazione delle specie e degli encounter utilizzava due percorsi separati:
il frontend invocava direttamente il sintetizzatore biome/species in Node.js,
mentre i validator Python del pack Evo Tactics venivano eseguiti via endpoint
dedicati. L’assenza di un coordinamento centrale comportava tre criticità:

1. **Assenza di coerenza sugli input** — la UI inviava richieste con forme
   differenti a seconda del widget (encounter vs specie singola) e non esisteva
   un normalizzatore condiviso.
2. **Validazioni opzionali** — i controlli runtime venivano richiamati solo in
   scenari manuali, per cui gli utenti potevano ricevere blueprint non conformi
   senza feedback immediato.
3. **Mancanza di tracciamento** — il flusso non lasciava traccia strutturata
   dei fallback e dei motivi di rigetto delle specie.

## Decisione

Introduce un orchestratore Python unico (`services/generation/orchestrator.py`)
con responsabilità di:

1. **Normalizzazione delle richieste** provenienti dal frontend (trait ids,
   seed, metadati UI) e gestione di un `request_id` deterministico.
2. **Invocazione del generatore** `SpeciesBuilder` per costruire il blueprint
   narrativo/meccanico.
3. **Chiamata ai validator runtime** (`packs.evo_tactics_pack.validators`) per
   correggere e validare l’output prima della consegna all’UI.
4. **Fallback automatico** su insiemi di trait garantiti quando i validator
   segnalano errori bloccanti oppure la richiesta contiene trait sconosciuti.
5. **Logging strutturato** degli esiti (`event`, `request_id`, `fallback_used`,
   `validation_outcome`) così da alimentare alerting e dashboard QA.

Il server Express (`server/app.js`) espone il nuovo endpoint
`POST /api/generation/species` che delega all’orchestratore via bridge
Node↔Python, garantendo un’API omogenea alla UI Vue.

## Conseguenze

- L’UI può contare su un contratto JSON stabile (`blueprint`, `validation`,
  `meta`) e su messaggi di warning coerenti con i validator Python.
- I log strutturati alimentano pipeline di osservabilità e permettono di
  monitorare i fallback applicati.
- Il tempo di risposta aumenta leggermente (invocazione Python), ma viene
  compensato dalla qualità dei dati consegnati.
- DevOps deve gestire una singola dipendenza Python per il servizio di
  generazione, semplificando la configurazione rispetto alle multiple utility
  precedenti.

## Azioni di follow-up

- [ ] Collegare i log dell’orchestratore al sistema di metriche (Grafana / ELK).
- [ ] Esporre endpoint analoghi per encounter e biome generation una volta
      consolidato il flusso specie.
- [ ] Automatizzare la rigenerazione dei fallback trait tramite checklist QA.
