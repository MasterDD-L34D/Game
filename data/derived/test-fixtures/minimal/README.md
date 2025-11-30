# Dataset di test "minimal"

Questo dataset riproduce un set ridotto di sorgenti (`packs`, `telemetry`, `biomes`, `mating`, `species`) per verificare
l'interfaccia `docs/test-interface` senza dipendere dai dati completi di produzione.

## Ultima rigenerazione

- Comando: `python scripts/generate_minimal_fixture.py --root data/derived/test-fixtures/minimal`
- Commit sorgente: `2c48bc8d0bce6bcb469befc1bd436813869e5f5c`
- Manifest con checksum: `data/derived/test-fixtures/minimal/manifest.json`
- Log operativo: `logs/agent_activity.md` → `[PIPELINE-EVO-PACK-2025-11-30]`

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

## Checksum (sha256)

| File | sha256 |
| --- | --- |
| `data/packs.yaml` | `a5593c4840dd06213b3305909eacd02a197a8c7b3356d2547966d9bd497d9296` |
| `data/core/telemetry.yaml` | `56f0267112f8fbb7aec589ceda1398eae716e3c2a59779a5d165fc15ba0d1a68` |
| `data/core/biomes.yaml` | `e427eae6cbe22f3118cdb4cb0b60d743b0439f42f094568a351c44f84aa627bd` |
| `data/core/mating.yaml` | `d6f4f0ab4f745f5bd36fdf1e3ed4d2b6f1e3eb74a4e7b414b34ee99e89f8e61d` |
| `data/core/species.yaml` | `4c03bd9eec4d4be87780d053b50d36c7d0cc88ef681eaf81118cf591e6ba8bd5` |
