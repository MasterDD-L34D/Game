# Guida rapida al contributo trait

Questa guida riassume template, strumenti e controlli richiesti per proporre o
aggiornare i trait. È pensata come integrazione al template dati ufficiale e
alle checklist di processo già presenti nel repository e al vademecum operativo
[`README_HOWTO_AUTHOR_TRAIT.md`](../../README_HOWTO_AUTHOR_TRAIT.md).

## Riferimenti chiave

| Risorsa | Descrizione |
| --- | --- |
| [Template dati trait](../traits_template.md) | Spiega struttura, campi obbligatori e sezioni opzionali dei file in `data/traits`. |
| [Trait Reference & Glossario](../catalog/trait_reference.md) | Elenca label/description approvate e workflow per sincronizzare il glossario con le localizzazioni. |
| [Trait Data Reference & Workflow](../process/trait_data_reference.md) | Dettaglia percorso manuale, editor schema-driven e script collegati. |
| [Checklist iterativa tratti](../process/traits_checklist.md) | Elenca i gate di QA, telemetria e deploy da attraversare prima della consegna. |

## Template e struttura

- Ogni tratto deve rispettare lo schema JSON condiviso in
  `config/schemas/trait.schema.json` come descritto nel [template dati
  ufficiale](../traits_template.md). I campi obbligatori includono `id`,
  `label`, `famiglia_tipologia`, `slot`, `tier`, `mutazione_indotta`,
  `uso_funzione`, `spinta_selettiva`, `sinergie` e `conflitti`. I vincoli di
  formato (`^[a-z0-9_]+$`, valori non vuoti, array normalizzati) vengono
  applicati automaticamente dagli script di validazione.
- Le sezioni opzionali (`slot_profile`, `requisiti_ambientali`, `usage_tags`,
  `data_origin`, `completion_flags`, ecc.) vanno popolate quando disponibili per
  evitare lacune negli audit e nelle esperienze di gioco.
- Mantieni le liste ordinate alfabeticamente per ridurre diff rumorosi e
  garantire coerenza con gli strumenti di audit.

## Strumenti principali

| Strumento | Comando | Scopo |
| --- | --- | --- |
| Generatore indice trait | `node scripts/build_trait_index.js --output data/traits/index.csv` | Ricostruisce l'indice aggregato (CSV/JSON) usato da audit e dashboard. |
| Riepilogo campi + glossario | `python tools/py/collect_trait_fields.py --output reports/trait_fields_by_type.json --glossary-output reports/trait_texts.json` | Raccoglie i campi usati per tipologia e genera l'estratto dei testi approvati (label/description) dal glossario. |
| Sync localizzazioni | `python scripts/sync_trait_locales.py --language it --glossary data/core/traits/glossary.json` | Propaga i testi approvati nei bundle `locales/<lingua>/traits.json` sostituendo i valori con riferimenti `i18n:` nei file trait. |
| Report di coverage | `python tools/py/report_trait_coverage.py --out-json data/derived/analysis/trait_coverage_report.json --out-csv data/derived/analysis/trait_coverage_matrix.csv` | Aggiorna coverage su biomi/regole e fallisce in modalità `--strict` se scendono sotto le soglie definite. |
| Baseline trait | `python tools/py/build_trait_baseline.py <env_traits> <trait_reference> --trait-glossary data/core/traits/glossary.json` | Ricalcola la baseline tattica a partire dai cataloghi sincronizzati. |
| Audit completo | `python3 scripts/trait_audit.py --check` | Esegue la pipeline di verifica finale e produce `logs/trait_audit.md`. |
| Editor schema-driven | UI in `webapp` (`npm --prefix webapp run dev`) all'indirizzo `/console/traits` | Permette modifiche assistite con validazione AJV e versioning automatico dei file. |

Per setup locale ricorda di installare le dipendenze (`npm ci` e `python -m pip
install -r requirements-dev.txt`) prima di lanciare gli script di cui sopra.

## Autenticazione API e ruoli

L'API trait è protetta da JWT firmati tramite `AUTH_SECRET` con controllo RBAC
su tre ruoli (`reviewer`, `editor`, `admin`). Imposta almeno:

- `AUTH_SECRET`: secret condiviso per la verifica della firma (obbligatorio in
  ambienti condivisi).
- `AUTH_TOKEN_MAX_AGE`: durata massima accettata (es. `8h`).
- `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_CLOCK_TOLERANCE`: opzionali per
  restringere ulteriormente i token.
- `AUDIT_LOG_PATH`: percorso alternativo dove salvare l'audit trail.

Genera i token di lavoro includendo il claim `roles` con il permesso richiesto
(per esempio `['editor']` per modifiche e ripristini). Il repository espone un
helper rapido:

```bash
node -e "const { signJwt } = require('./server/utils/jwt'); \
  console.log(signJwt({ sub: 'local-editor', roles: ['editor'] }, process.env.AUTH_SECRET, { expiresIn: '8h' }));"
```

Il token ottenuto va passato nell'header `Authorization: Bearer <jwt>`. Il
vecchio `TRAIT_EDITOR_TOKEN` resta disponibile solo come fallback locale (non
abilita l'audit trail né i controlli sui ruoli).

## Flussi di revisione

### Percorso manuale (file + script)

1. Aggiorna `data/core/traits/glossary.json` con label/description ufficiali
   almeno per `it` ed `en`, validando il file con `python -m json.tool`.
2. Integra (o modifica) il trait in `data/traits/<tipologia>/<id>.json` seguendo
   il [template](../traits_template.md). Durante l'editing i campi testuali
   possono contenere stringhe reali.
3. Genera report campi + glossario:
   ```bash
   python tools/py/collect_trait_fields.py \
     --output reports/trait_fields_by_type.json \
     --glossary data/core/traits/glossary.json \
     --glossary-output reports/trait_texts.json
   ```
4. Sincronizza le localizzazioni nella lingua richiesta (esempio italiano):
   ```bash
   python scripts/sync_trait_locales.py \
     --traits-dir data/traits \
     --locales-dir locales \
     --language it \
     --glossary data/core/traits/glossary.json
   ```
5. Rigenera l'indice veloce:
   ```bash
   node scripts/build_trait_index.js --output data/traits/index.csv
   ```
6. Ricalcola baseline e coverage:
   ```bash
   python tools/py/build_trait_baseline.py \
     packs/evo_tactics_pack/docs/catalog/env_traits.json \
     packs/evo_tactics_pack/docs/catalog/trait_reference.json \
     --trait-glossary data/core/traits/glossary.json

   python tools/py/report_trait_coverage.py \
     --env-traits packs/evo_tactics_pack/docs/catalog/env_traits.json \
     --trait-reference packs/evo_tactics_pack/docs/catalog/trait_reference.json \
     --trait-glossary data/core/traits/glossary.json \
     --out-json data/derived/analysis/trait_coverage_report.json \
     --out-csv data/derived/analysis/trait_coverage_matrix.csv
   ```
7. Verifica naming, inventari e audit finali (`validate_registry_naming.py`,
   `scripts/trait_audit.py --check`) archiviando gli output in `logs/`.

### Percorso con editor UI

1. Configura il secret e, facoltativamente, la durata massima dei token, quindi
   avvia l'API:
   ```bash
   export AUTH_SECRET="$(openssl rand -hex 32)"
   export AUTH_TOKEN_MAX_AGE="8h"
   npm run start:api
   ```
2. Genera un token con il ruolo adeguato tramite `server/utils/jwt` (vedi
   esempio sopra) e tienilo a portata di mano.
3. In una seconda shell avvia la webapp: `npm --prefix webapp run dev`.
4. Apri `http://localhost:5173/console/traits`, inserisci il token Bearer e
   modifica i campi necessari. Ogni salvataggio crea automaticamente una
   versione in `data/traits/_versions/<trait_id>/` prima di sovrascrivere
   l'originale.
4. Chiudi il ciclo eseguendo comunque gli script di coverage/audit per
   allinearti con il percorso manuale.

## Esempi pratici

### Aggiunta di un nuovo tratto "shell_reactive"

1. Duplica il [template JSON](../traits_template.md#scheletro-minimo) in
   `data/traits/difesa/shell_reactive.json`, compilando i campi obbligatori e le
   sezioni opzionali pertinenti.
2. Aggiorna `data/core/traits/glossary.json` aggiungendo label e riferimento al
   nuovo file.
3. Aggiorna le sinergie reciproche negli altri trait coinvolti.
4. Lancia `node scripts/build_trait_index.js --output data/traits/index.csv` per
   verificare che l'indice includa il nuovo elemento.
5. Esegui `python tools/py/report_trait_coverage.py --strict` per confermare che
   non si aprano gap nelle matrici.
6. Registra nel PR quali validator (baseline, coverage, audit) sono stati
   eseguiti e allega eventuali log.

### Revisione tramite editor UI

1. Avvia API e webapp come descritto sopra e apri il tratto da aggiornare.
2. Modifica i campi richiesti (es. aggiunta di `usage_tags`).
3. Salva e verifica la nuova versione generata in
   `data/traits/_versions/<trait_id>/`.
4. Rigenera indice e coverage con gli script CLI per mantenere allineati i
   report (`build_trait_index.js`, `report_trait_coverage.py`).
5. Concludi eseguendo `python3 scripts/trait_audit.py --check` e allega l'esito
   alla nota di revisione.

## Check finali prima della PR

- Glossario aggiornato con label/description approvate (`it`, `en`) e report
  `reports/trait_texts.json` rigenerato.
- Localizzazioni sincronizzate con `scripts/sync_trait_locales.py` (specificare
  lingua/e e allegare output `--dry-run` se usato).
- Indice, baseline e coverage ricostruiti senza warning.
- Audit finale (`scripts/trait_audit.py --check`) verde e log archiviati.
- Documenta nel PR i comandi eseguiti e allega log o report aggiornati.
