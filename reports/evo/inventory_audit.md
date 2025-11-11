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
