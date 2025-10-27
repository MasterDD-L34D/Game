# Bug Intake Checklist

Utilizzare questa checklist prima di spostare una segnalazione dalla vista `Backlog - Triage` a `QA - Triaged` o prima di inviare un ticket al canale `#vc-ops`.

## 1. Dati obbligatori
- [ ] `Fonte` impostata sul canale corretto (`telemetry-log`, `drive-sync`, `visual-regression`, `playtest`, `support`, `altro`).
- [ ] `Timestamp evento` valorizzato con data/ora ISO o turno+data normalizzato.
- [ ] `Owner` assegnato.
- [ ] `Priorità` selezionata (`critical`, `high`, `medium`, `low`) in base alla scala impatto.
- [ ] `Riproducibilità` indicata (`confermata`, `parziale`, `non_riprodotta`).
- [ ] `Frequenza` selezionata (`sempre`, `intermittente`, `raro`, `non_riprodotto`) coerente con le evidenze.
- [ ] `Stato` in `open` o `triaged` con nota contestuale se si tratta di duplicato o escalation.

## 2. Evidenze
- [ ] Link a log principali allegati (`Link a evidenze` contiene almeno un URL valido o file caricato).
- [ ] Screenshot/video collegati quando l'impatto è visivo (riportare `N/A` motivato se non applicabile).
- [ ] Passi di riproduzione e risultato atteso/osservato documentati nella descrizione.

## 3. Controlli di qualità
- [ ] Confronto severità ↔ impatto: `critical`/`high` rispondono a definizioni della scala backlog.
- [ ] Frequenza confermata tramite test locali o riferimenti log (citare run/playtest nelle note).
- [ ] Stato di riproducibilità aggiornato nel template support (`confermata`, `parziale`, `non_riprodotta`).
- [ ] Automazioni Slack/email verificate (record appare nelle viste destinate ai team corretti).

## 4. Pre-revisione
- [ ] Ticket collegato a issue GitHub/Jira se `Priorità` ≥ `high`.
- [ ] Commento in `Note aggiuntive` con eventuali dipendenze o follow-up richiesti.
- [ ] Checklist completata e salvata (spuntare nel campo `Checklist QA` o allegare screenshot al ticket).

_Responsabile: QA Lead — aggiornare la checklist se cambiano campi obbligatori nel backlog._
