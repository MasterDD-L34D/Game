# Style Guide Status Review

Questo documento traccia lo stato attuale dell'adozione della style guide su tratti e specie e
definisce il piano operativo per chiudere gli ultimi gap prima del completamento del progetto.

## Verifiche eseguite

- `python tools/py/styleguide_compliance_report.py --strict` conferma che tutti i KPI di
  conformità (nomi, descrizioni, unità UCUM) sono al 100 % e sopra le soglie SLA.
- `python tools/py/report_trait_coverage.py --strict` rigenera il report di coverage e
  certifica che i controlli bloccanti (minimo di specie collegate, assenza di regole prive di specie)
  sono soddisfatti.
- `node scripts/build_trait_index.js` aggiorna l'indice di riferimento garantendo che il database
  sia coerente e che non emergano errori sugli slug.

## Gap residui

Le verifiche mostrano che la guida di stile è applicata correttamente, ma rimangono dati
incompleti da colmare per considerare il progetto terminato.

| Area | Stato attuale | Fonte |
| --- | --- | --- |
| **Specie collegate** | Copertura completa | `data/traits/index.json`
| **Tag bioma** | 173 tratti ancora senza `biome_tags` | `reports/trait_progress.md`
| **Tag d'uso** | Copertura completa | `reports/trait_progress.md`
| **Origine dati** | Copertura completa | `reports/trait_progress.md`

## Piano di chiusura

1. **Mantenere la copertura delle specie collegate**
   - Verificare ogni nuovo tratto o revisione su `data/traits/` assicurandosi che `species_affinity` resti valorizzato.
   - Rieseguire `python tools/py/build_species_trait_bridge.py` dopo inserimenti massivi per intercettare regressioni sugli hook specie ↔ tratto.

2. **Popolare i `biome_tags` mancanti**
   - Priorità ai 173 tratti privi di annotazioni, soprattutto quelli già presenti nei pacchetti (`coverage_q4_2025`, `controllo_psionico`).
   - Usare `tools/py/normalize_trait_style.py --dry-run` per identificare i file scoperti e colmare gradualmente le liste di bioma con riferimento a `packs/evo_tactics_pack/docs/catalog/env_traits.json`.

3. **Presidiare i `usage_tags` tattici**
   - Continuare a usare il vocabolario in `docs/process/trait_data_reference.md` e validare che ogni nuovo tratto mantenga i tag esistenti.
   - Integrare il controllo nella checklist editoriale e rieseguire `npm run style:check` quando vengono introdotte nuove tipologie.

4. **Consolidare `data_origin` nel catalogo**
   - Riutilizzare la mappa sorgenti → slug del glossario editoriale e applicarla immediatamente ai nuovi tratti o alle revisioni.
   - Programmare verifiche periodiche con `tools/py/normalize_trait_style.py` per assicurare che la copertura resti completa dopo merge multipli.

Seguendo il piano sopra, la style guide risulterà completamente applicata a dati, workflow e
strumenti, chiudendo le ultime lacune operative.
