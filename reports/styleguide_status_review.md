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
| **Specie collegate** | 1 tratto (`random`) privo di `species_affinity` | `data/traits/index.json`
| **Tag bioma** | 173 tratti ancora senza `biome_tags` | `reports/trait_progress.md`
| **Tag d'uso** | 173 tratti privi di `usage_tags` | `reports/trait_progress.md`
| **Origine dati** | 173 tratti senza `data_origin` | `reports/trait_progress.md`

## Piano di chiusura

1. **Collegare i tratti orfani a specie specifiche**
   - Aggiornare `data/traits/strategia/random.json` completando `species_affinity` e riflettere il
     collegamento anche in `data/traits/index.json`.
   - Rieseguire `python tools/py/build_species_trait_bridge.py` per validare che gli hook
     specie ↔ tratto restino coerenti dopo l'aggiornamento.

2. **Popolare `biome_tags` e requisiti ambientali mancanti**
   - Priorità ai tratti già utilizzati nei pacchetti (`coverage_q4_2025`, `controllo_psionico`).
   - Usare `tools/py/normalize_trait_style.py --dry-run` per evidenziare i file privi di metadati
     e aggiornare gradualmente le liste di bioma, seguendo le corrispondenze in
     `packs/evo_tactics_pack/docs/catalog/env_traits.json`.

3. **Definire i `usage_tags` tattici**
   - Adottare il vocabolario documentato in `docs/process/trait_data_reference.md` e annotare i ruoli
     principali (es. `scout`, `breaker`, `support`).
   - Automatizzare il controllo aggiungendo i tag mancanti alla checklist dell'editor (`webapp`)
     e rieseguendo `npm run style:check` per assicurare la copertura completa.

4. **Compilare `data_origin` per il catalogo canonico**
   - Creare una mappa sorgenti → slug (`controllo_psionico`, `coverage_q4_2025`, ecc.) nel
     glossario editoriale e applicarla batch con `tools/py/normalize_trait_style.py`.
   - Aggiornare `docs/traits_template.md` con una nota rapida che ricordi di impostare sempre
     `data_origin` durante la creazione di nuovi tratti.

5. **Report di chiusura**
   - Dopo aver popolato i campi, rigenerare `reports/trait_progress.md` e `reports/styleguide_compliance.md`
     per ottenere un'istantanea finale.
   - Allegare gli output ai prossimi PR insieme alla checklist di conformità.

Seguendo il piano sopra, la style guide risulterà completamente applicata a dati, workflow e
strumenti, chiudendo le ultime lacune operative.
