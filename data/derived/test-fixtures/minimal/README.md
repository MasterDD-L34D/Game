# Dataset di test "minimal"

Questo dataset riproduce un set ridotto di sorgenti (`packs`, `telemetry`, `biomes`, `mating`, `species`) per verificare
l'interfaccia `docs/test-interface` senza dipendere dai dati completi di produzione.

## Comando di generazione

```bash
python scripts/generate_minimal_fixture.py --root data/derived/test-fixtures/minimal
```

- Commit di origine (ultima rigenerazione): `8e958f913312fd75960ff08580f731f4b9c50a49`

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
| `data/packs.yaml` | `8d6988ee2747c54c6fc70d0c3bba2f72e1765f797d7e337baab82d3160d2e31e` |
| `data/core/telemetry.yaml` | `ea76ac25807c13d5682027acd6f5fec857ababa7456c7e9d7addde07393f32a3` |
| `data/core/biomes.yaml` | `432f99794e7babb942fa8b408c6335a0c894082161ee329a246415006fa18540` |
| `data/core/mating.yaml` | `2a6fbe41ac33e07b2eb7a57d7f76ce1cc403d056225aa483b010ad4b1719cc72` |
| `data/core/species.yaml` | `02dfa4bb190cb082b314f11d581765a9814b7fc27ffad996f77b7ae2d985e3d3` |
