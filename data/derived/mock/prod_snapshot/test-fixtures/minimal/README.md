# Dataset di test "minimal"

Questo dataset riproduce un set ridotto di sorgenti (`packs`, `telemetry`, `biomes`, `mating`, `species`) per verificare
l'interfaccia `docs/test-interface` senza dipendere dai dati completi di produzione.

## Contenuto

| File | Descrizione |
| --- | --- |
| `data/packs.yaml` | Una singola forma con compatibilità, bias e tabella `random_general_d20`, oltre a un blocco PI shop minimale. |
| `data/core/telemetry.yaml` | Due indici sintetici per popolare la dashboard di telemetria. |
| `data/core/biomes.yaml` | Un bioma compatto con feature principali. |
| `data/core/mating.yaml` | Tabelle di compatibilità e punteggi base per la forma di prova. |
| `data/core/species.yaml` | Catalogo con uno slot, una sinergia e due specie prototipo per le viste dedicate. |

## Casi d'uso coperti

1. **Dashboard automatica** – caricando la pagina `index.html` con `?data-root=<root>/data/derived/test-fixtures/minimal/`
   i contatori principali (forme, indice random, biomi, slot specie) devono mostrare valori non vuoti
   e non devono comparire errori o fallback inattesi.
2. **Anteprima manuale** – la pagina `manual-fetch.html` deve riconoscere `packs.yaml` come dataset `packs`,
   generare il riepilogo dell'analisi e salvare il payload in coda (`et-manual-sync-payload`) quando la sincronizzazione automatica è attiva.
3. **Checklist e note** – la checklist operativa e l'area appunti devono partire con valori predefiniti vuoti,
   permettere modifiche e mantenere lo stato tra refresh tramite `localStorage`.

## Criteri di accettazione

- Tutti i file YAML si caricano correttamente tramite `loadAllData` senza generare eccezioni.
- I test end-to-end (`webapp/tests/playwright/console/interface.spec.ts`) utilizzano questo dataset e devono passare in CI.
- Eventuali modifiche al dataset devono aggiornare questa documentazione indicando l'impatto sui casi d'uso. 
