# Guida CLI modulare

Aggiornamento 2025-11-10 — Questa guida descrive la struttura dell'entrypoint
modulare `tools/py/game_cli.py`, i profili CLI definiti in `config/cli/` e gli
strumenti di automazione associati.

## Entrypoint modulare `game_cli`

L'entrypoint unico della CLI vive in [`tools/py/game_cli.py`](../../tools/py/game_cli.py)
ed espone i sottocomandi principali (`roll-pack`, `generate-encounter`,
`validate-datasets`, `validate-ecosystem-pack`, `investigate`). Il parser è
strutturato per essere estensibile:

1. Le funzioni `command_*` incapsulano la logica di ciascun sottocomando e
   restituiscono un exit code intero coerente con l'esecuzione della CLI.
2. `_normalize_argv` centralizza la compatibilità con alias legacy
   (`validate-ecosystem` → `validate-ecosystem-pack`).
3. `main()` accetta un parametro opzionale `argv` per consentire il riuso del
   parser in altri moduli o nei test (`pytest` usa questa modalità nei test di
   wiring).
4. L'helper `load_profile()` carica le configurazioni YAML dei profili e
   `apply_profile()` applica le variabili di ambiente prima di invocare il
   sottocomando richiesto.

Per aggiungere un nuovo comando basta:

```python
from tools.py import game_cli

# 1. definire la funzione command_<nome>()
# 2. registrare il parser nella funzione build_parser()
# 3. aggiungere il branch nella catena if/elif di main()
```

La CLI mantiene la compatibilità con il module entrypoint Python, quindi è
possibile invocarla anche con `python -m game_cli <comando>` se `tools/py` è nel
`PYTHONPATH`.

## Profili CLI (`config/cli/`)

I profili standard (`playtest`, `telemetry`, `support`) sono file YAML che
raccolgono variabili di ambiente, contatti di riferimento e note operative.
La struttura minima di un profilo è:

```yaml
name: <profilo>
description: <testo>
env:
  VARIABILE: valore
```

Campi addizionali (es. `smoke.commands`, `token_rotation`) vengono mantenuti
nel campo `metadata` del `ProfileConfig` e sono disponibili per tooling
personalizzato. La CLI applica solo la sezione `env`, mantenendo immutato il
resto dei metadati.

Il caricamento dei profili avviene secondo queste regole:

- `--profile <nome>` indica alla CLI quale file `config/cli/<nome>.yaml` usare.
- La variabile `GAME_CLI_PROFILES_DIR` permette di puntare a directory di
  override (utile per test o ambienti temporanei).
- In assenza di profilo la CLI si comporta come prima, senza alterare
  l'ambiente.

### Rotazione token del profilo `support`

Il profilo `support` include il blocco `token_rotation` concordato con
Support/QA. Il playbook è registrato in [`docs/support/token-rotation.md`](../support/token-rotation.md)
che dettaglia finestra temporale, owner e canali di notifica. La CLI espone la
variabile `GAME_CLI_ESCALATION_PLAYBOOK` per puntare al documento di riferimento.

## Smoke test CLI (`scripts/cli_smoke.sh`)

Lo script [`scripts/cli_smoke.sh`](../../scripts/cli_smoke.sh) esegue una
batteria di comandi per ciascun profilo registrato, riutilizzando la stessa
CLI modulare. È pensato sia per i run manuali (es. QA) sia per la pipeline CI.

Esempio di esecuzione manuale dalla root del repository:

```bash
./scripts/cli_smoke.sh            # esegue tutti i profili supportati
CLI_PROFILES="playtest support" ./scripts/cli_smoke.sh  # filtro personalizzato
```

Lo script termina con il primo exit code non-zero e raggruppa i log con le
annotazioni `::group::` per i workflow GitHub Actions.

## Tooling tratti

- `python tools/py/build_trait_baseline.py <env_traits> <trait_reference> --trait-glossary data/traits/glossary.json` — rigenera la baseline dei tratti includendo label dal glossario centrale e annota il percorso nelle metadati del report YAML.【F:tools/py/build_trait_baseline.py†L1-L46】【F:data/analysis/trait_baseline.yaml†L1-L24】
- `python tools/py/report_trait_coverage.py --out-json data/analysis/trait_coverage_report.json --out-csv data/analysis/trait_coverage_matrix.csv` — produce le matrici trait↔bioma↔morphotype e il diff tra regole ambientali e specie; accetta `--trait-glossary` per forzare path custom.【F:tools/py/report_trait_coverage.py†L1-L85】【F:tools/py/game_utils/trait_coverage.py†L1-L249】
- `python tools/py/validate_registry_naming.py --trait-glossary data/traits/glossary.json` — verifica slug e traduzioni utilizzando il glossario centralizzato referenziato in `config/project_index.json`.【F:tools/py/validate_registry_naming.py†L1-L270】【F:config/project_index.json†L1-L91】
- `python tools/traits.py validate --matrix docs/catalog/species_trait_matrix.json` — confronta automaticamente i tratti proposti dalle specie/eventi con la matrice curata, segnalando divergenze di archetipi o requisiti di bioma.【F:tools/traits.py†L1-L236】【F:docs/catalog/species_trait_matrix.json†L1-L240】

### Flusso end-to-end
1. Definisci il tratto nel glossario (`data/traits/glossary.json`) e sincronizza i registri (`env_traits.json`, `trait_reference.json`).
2. Aggiorna la matrice specie (`docs/catalog/species_trait_matrix.json`) e validala con `python tools/traits.py validate --matrix docs/catalog/species_trait_matrix.json` per prevenire incompatibilità su biomi e morfotipi.【F:docs/catalog/species_trait_matrix.json†L1-L240】【F:tools/traits.py†L1-L236】
3. Ricostruisci baseline e nomenclature (`build_trait_baseline.py`, `validate_registry_naming.py`) per mantenere allineati tier, slug e riferimenti dataset.【F:tools/py/build_trait_baseline.py†L1-L46】【F:tools/py/validate_registry_naming.py†L1-L270】
4. Genera coverage (`report_trait_coverage.py`) e ispeziona i diff JSON/CSV per verificare che il tratto compaia nei biomi previsti; prima di chiudere l'iterazione esegui gli smoke test (`scripts/cli_smoke.sh`) e logga i risultati nei report di playtest.【F:tools/py/report_trait_coverage.py†L1-L85】【F:data/analysis/trait_coverage_matrix.csv†L1-L40】【F:scripts/cli_smoke.sh†L1-L120】

## Integrazione CI

La pipeline di Continuous Integration (`.github/workflows/ci.yml`) invoca
`./scripts/cli_smoke.sh` dopo i test TypeScript/Python per garantire che i
profili CLI restino coerenti. Il documento [`docs/ci-pipeline.md`](../ci-pipeline.md)
riporta la sequenza aggiornata degli step.
