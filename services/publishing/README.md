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

## Processo di staging automatico

Il comando `node services/publishing/staging.js` consente di allineare rapidamente l'ambiente di staging
con le ultime fonti validate:

1. Legge l'elenco dei pacchetti verificati (tramite `workflow.listPackages()` e il report di validazione).
2. Copia in `packs/evo_tactics_pack/out/staging/<pack>` solo i pacchetti conformi, aggiornando history e attori coinvolti.
3. Rigenera gli indici JSON per il sito (`index.json` e `site_manifest.json`) con metadati, elenco patch e stato approvazioni.

Opzioni disponibili:

- `--actor=<nome>` per personalizzare l'attore registrato nella history.
- `--include-unvalidated` per forzare lo staging anche dei pacchetti non presenti nell'ultimo report (sconsigliato).

L'esecuzione restituisce un riepilogo testuale con pacchetti elaborati e percorsi dei manifest generati, utile per le note QA
e per sincronizzare il calendario editoriale.

## API principali

- `listPackages()` → restituisce stato corrente (validazione, staging, approvazioni).
- `stagePackage(id, { actor, force })` → copia il pacchetto in staging, tracciando history e timestamp (opzionalmente bypassa la
  verifica della validazione con `force: true`).
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
