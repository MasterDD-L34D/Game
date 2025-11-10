# OPS-01 · Workflow gap analysis

| Workflow | Trigger | Ambito | Note principali |
| --- | --- | --- | --- |
| `ci.yml` | Push/PR su qualsiasi branch | Monorepo stack completo | Usa `dorny/paths-filter` per decidere i job necessari e accende job dedicati per site-audit e Lighthouse solo quando le aree interessate cambiano.【F:.github/workflows/ci.yml†L1-L38】【F:.github/workflows/ci.yml†L273-L364】 |
| `lighthouse.yml` | Schedulato quotidianamente + manuale | Lighthouse CI remoto | Riutilizza lo script npm condiviso dopo aver risolto `SITE_BASE_URL`, con upload artefatti per consultazione differita.【F:.github/workflows/lighthouse.yml†L1-L35】 |
| `search-index.yml` | Push su `main/master` con modifiche contenuti | Generazione indice ricerca | Installa Python 3.11, rigenera l'indice e lo committa automaticamente tramite `git-auto-commit-action` per mantenere allineati sia `ops/site-audit/_out` sia `public/`.【F:.github/workflows/search-index.yml†L1-L36】 |
| `schema-validate.yml` | Push/PR su `schemas/**` | Validazione schemi JSON | Esegue `jsonschema` in modalità batch per tutti i file in `schemas/`, fallendo in caso di schema invalido.【F:.github/workflows/schema-validate.yml†L1-L30】 |
| `validate-naming.yml` | Push/PR su asset registri | Naming registri trait | Esegue lisp python dedicato dopo aver installato le dipendenze CLI comuni (`tools/py/requirements.txt`).【F:.github/workflows/validate-naming.yml†L1-L34】 |

**Osservazioni**

- I controlli site audit e Lighthouse sono ora comandati dallo stesso script npm,
  garantendo coerenza tra job CI e workflow schedulato.
- I workflow dedicati (search index, naming, schema) restano separati e possono
  essere riattivati manualmente (`workflow_dispatch`) quando si ricaricano i
  dati storici.
