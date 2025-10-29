# Publishing Workflow

Il modulo `services/publishing` coordina la promozione dei pacchetti generati dal pack Evo-Tactics sulle
infrastrutture di staging e produzione. Si appoggia alle directory già presenti nel repository:

- `packs/evo_tactics_pack/out/patches` → sorgente dei pacchetti validati.
- `packs/evo_tactics_pack/out/staging` → artefatti promossi in staging.
- `packs/evo_tactics_pack/out/production` → artefatti disponibili per la produzione.

## Utilizzo rapido

```js
import { createPublishingWorkflow } from './workflow.js';

const workflow = await createPublishingWorkflow();
const packages = await workflow.listPackages();

await workflow.stagePackage('badlands', { actor: 'QA Core' });
await workflow.requestApproval('badlands', 'Creative Lead', 'Verifica narrativa Nebula');
await workflow.approvePackage('badlands', 'Creative Lead');
await workflow.promoteToProduction('badlands', { actor: 'Release Ops' });
```

Ogni operazione aggiorna `services/publishing/workflowState.json` mantenendo approvazioni e history. Il workflow
riconosce automaticamente l'esito dell'ultima validazione (`out/validation/last_report.json`) per evitare la promozione di
pacchetti non sanitizzati.

## API principali

- `listPackages()` → restituisce stato corrente (validazione, staging, approvazioni).
- `stagePackage(id, { actor })` → copia il pacchetto in staging, tracciando history e timestamp.
- `requestApproval(id, approver, note)` → registra una richiesta di approvazione.
- `approvePackage(id, approver, note)` → segna l'approvazione e abilita la promozione.
- `promoteToProduction(id, { actor, force })` → distribuisce su produzione (dal folder di staging se presente).
- `summary()` → fornisce riepilogo numerico utile per i report nel pannello Quality & Release.

Tutti i percorsi sono configurabili passando opzioni al costruttore (`sourceRoot`, `stagingRoot`, `productionRoot`,
`validationReport`, `stateFile`).

## Stato e history

Ogni pacchetto mantiene una history cronologica con attore, azione e note. Il file di stato è pensato per essere
committato nel repository: permette al pannello “Quality & Release” di visualizzare lo storico e bloccare deploy senza
approvazione.
