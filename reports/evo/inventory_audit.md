# Evo Inventory Audit — 2025-11-15

Questa sessione completa la bonifica dei duplicati Evo ancora presenti nelle cartelle legacy.
I controlli di uguaglianza sono stati effettuati calcolando gli hash SHA-256 dei file sorgente
verso le destinazioni definitive (`docs/`, `data/external/evo/`, `reports/evo/`).

## Sintesi interventi

| Ambito legacy | Duplicato del percorso finale | Azione | Archivio | Verifica |
| --- | --- | --- | --- | --- |
| `incoming/lavoro_da_classificare/traits/` | `data/external/evo/traits/` | Spostato in archivio | `incoming/archive/2025-11-15_evo_cleanup/lavoro_da_classificare/traits/` | `incoming/lavoro_da_classificare/inventario.yml` |
| `incoming/species/` | `data/external/evo/species/` | Spostato in archivio | `incoming/archive/2025-11-15_evo_cleanup/species/` | `incoming/lavoro_da_classificare/inventario.yml` |
| `incoming/lavoro_da_classificare/docs/wireframes/*.md` | `docs/wireframes/*.md` | Spostato in archivio | `incoming/archive/2025-11-15_evo_cleanup/lavoro_da_classificare/docs/wireframes/` | `incoming/lavoro_da_classificare/inventario.yml` |
| `incoming/lavoro_da_classificare/home/oai/share/**` | Artefatti già revisionati in `docs/` e `reports/evo/` | Spostato in archivio | `incoming/archive/2025-11-15_evo_cleanup/lavoro_da_classificare/home/oai/share/` | `incoming/lavoro_da_classificare/inventario.yml` |
| `incoming/lavoro_da_classificare/{backlog,catalog,config,data,docs,ops,templates,tests,workflows}` | Copie legacy di documentazione, dataset e automazioni già versionate (`docs/`, `.github/workflows/`, `incoming/scripts/`, `data/core/`) | Spostato in archivio / consolidato | `incoming/archive/2025-12-19_inventory_cleanup/lavoro_da_classificare/` | `incoming/lavoro_da_classificare/inventario.yml` |

## Dettaglio controlli

### Traits
- Confronto hash tra `incoming/lavoro_da_classificare/traits/*.json` e `data/external/evo/traits/*.json`.
- Nessuna discrepanza: i file sono già versionati nel dataset principale, quindi i duplicati sono stati archiviati.

### Species
- Verifica hash per tutte le specie in `incoming/species/*.json` contro `data/external/evo/species/*.json`.
- I duplicati coincidono con il dataset ufficiale; sono stati spostati nell'archivio `2025-11-15_evo_cleanup`.

### Wireframes
- I file `homepage.md` e `generatore.md` replicavano i contenuti presenti in `docs/wireframes/`.
- Sono stati archiviati mantenendo la stessa struttura per eventuali consultazioni future.

### Pacchetto share legacy
- Il pacchetto `home/oai/share/evo_tactics_game_creatures_traits_package` duplicava documenti e script già revisionati
  (report analitici, checklist sicurezza, script di backlog).
- L'intero albero è stato spostato in archivio per evitare conflitti con le versioni aggiornate.

Tutti gli spostamenti sono tracciati nell'inventario (`incoming/lavoro_da_classificare/inventario.yml`) con stato `archiviato`
e puntano alla cartella di archivio creata per questa bonifica.

## Verifica duplicati 2025-11-18

- Rimossi i duplicati residui in `incoming/lavoro_da_classificare/` per i report di analisi trait e la documentazione di
  sicurezza, mantenendo come fonte unica i percorsi sotto `docs/`.
- Aggiornato l'inventario segnando le copie legacy come `archiviato` con destinazione verso i file consolidati.
- Validati i file finali (`docs/analysis/*.md`, `docs/analysis/*.csv`, `docs/security/*.md`, `docs/prontuario_metriche_ucum.md`,
  `docs/traits_reference.md`) e i log QA (`reports/evo/qa/docs.log`, `reports/evo/qa/frontend.log`) dopo aver eseguito gli script
  `npm run docs:lint` e la suite Playwright documentata nel log stesso.
- Confermata la coerenza del mapping `data/external/evo/species/species_ecotype_map.json`, documentando nel riepilogo le classi
  senza corrispondenza.

## Provisioning secrets

- Secret e variabile `SITE_BASE_URL` configurati su GitHub Actions seguendo `docs/tooling/evo.md` (sezione "Configurazione secrets CI").
- Change su GitHub (branch `work`) che aggiorna `incoming/lavoro_da_classificare/inventario.yml` e i tracker Ops per tracciare lo stato `configurato`.
- QA log `reports/evo/qa/update-tracker.log` archivia l'esecuzione di `make update-tracker TRACKER_CHECK=1` post provisioning e conferma l'allineamento dei registri.

## Bonifica 2025-12-19

- Creato l'archivio `incoming/archive/2025-12-19_inventory_cleanup/` per raccogliere i duplicati residui di backlog, cataloghi,
  configurazioni e workflow presenti in `incoming/lavoro_da_classificare/`.
- Spostati in archivio i file di documentazione legacy (GDD, guide PDF/MD, report specie e trait, checklist) e i dataset di esempio
  ormai sostituiti dalle versioni consolidate sotto `docs/` e `data/core`.
- Allineati gli script duplicati (`init_security_checks.sh`, `setup_backlog.py`, `species_summary_script.py`, `trait_review.py`,
  `update_tracker_registry.py`) indicando come riferimento univoco `incoming/scripts/` e mantenendo le copie storiche solo in
  archivio.
- Validati i JSON ecotipi confermando che la fonte ufficiale è `data/external/evo/species/*.json`; le voci dell'inventario sono
  state annotate come consolidate.
- Aggiornato `incoming/lavoro_da_classificare/inventario.yml` marcando tutte le voci precedentemente `da revisionare` con lo
  stato finale (`archiviato` o `validato`) e riferimenti al nuovo archivio.

## Chiusura staging 2025-12-20

- Verificato che `incoming/lavoro_da_classificare/` contenga esclusivamente documentazione di riferimento e script di automazione
  attivi (`Makefile`, configurazioni QA, roadmap e README degli script).
- Spostati gli artefatti storici residui nel percorso `incoming/archive/` o rimosse le copie già versionate, lasciando in staging
  solo i file operativi di supporto.
- Aggiornato `incoming/lavoro_da_classificare/integration_batches.yml` con il campo `post_cleanup: completed` per attestare la
  chiusura del piano di integrazione.
- Eseguito `make update-tracker` per sincronizzare i registri interni dopo la bonifica finale.
