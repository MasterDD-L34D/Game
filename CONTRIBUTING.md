# Linee guida per contribuire

Grazie per l'interesse nel progetto! Questa guida copre il setup minimo,
gli script principali e il flusso di revisione per proporre modifiche in modo
coerente con le pipeline CI.

## Setup rapido dell'ambiente

1. **Node.js 18+ (raccomandato 22.19.0) e npm 11+**. Verifica con
   `node --version` e `npm --version`. Installa le dipendenze dalla radice del
   repository con `npm ci` e inizializza i Git hook eseguendo `npm run prepare`.
2. **Python 3.10+** con `pip`. Si consiglia un virtualenv dedicato. Installa i
   requisiti backend con `python -m pip install -r requirements-dev.txt`.
3. Consulta le checklist di progetto in `docs/checklist/project-setup-todo.md`
   per ulteriori dettagli su strumenti opzionali e configurazioni consigliate.

## Script chiave (npm workspaces)

Il repository usa [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
per orchestrare strumenti e webapp. I comandi principali sono già esposti nel
`package.json` di root e delegano ai workspace pertinenti.

| Script            | Descrizione                                                    |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Avvia il server Vite della webapp (`webapp`).                  |
| `npm run build`   | Esegue `build` su tutti i workspace che espongono lo script.   |
| `npm run test`    | Esegue i test API/TS e i test unitari della webapp.            |
| `npm run preview` | Avvia `vite preview` della webapp dopo un build locale.        |
| `npm run format`  | Applica Prettier ai file supportati. Usa `format:check` in CI. |

Per eseguire uno script in un workspace specifico puoi usare `npm run <script>
--workspace <nome-workspace>`.

## Standard di codice: Prettier e Husky

- **Prettier** fornisce la formattazione automatica (`.prettierrc.json`). Usa
  `npm run format` per applicare le regole o `npm run format:check` per una
  verifica non distruttiva.
- **Husky** installa un hook `pre-commit` che esegue un controllo Prettier sui
  file in staging. Assicurati di aver eseguito `npm run prepare` dopo il
  checkout per abilitare gli hook locali.

## Test e QA

- `npm run test` copre i test API (`node --test`), le suite TypeScript in
  `tools/ts` e i test unitari della webapp (`vitest`).
- `npm run build` e `npm run preview` verificano il bundle Vite con `base`
  relativo (`./`). Usa questi comandi quando modifichi asset front-end o
  configurazioni di deploy.
- Per script specifici (CLI, QA report, esportazioni) consulta le directory
  `tools/ts`, `tools/py` e `scripts/` oppure la documentazione dedicata.

## Backup, manifest e rollback

Segui queste regole quando lavori con snapshot o backup:

1. **Non committare archivi binari** in `reports/backups/**`: caricali in storage
   esterno mantenendo il percorso logico `reports/backups/<label>/` e registra il
   checksum (`sha256sum`) e l'URL nel manifest.
2. **Aggiorna il manifest** testuale (`reports/backups/<label>/manifest.txt`):
   per ogni archivio compila i campi `Archive`, `SHA256`, `Location`, `On-call`,
   `Last verified` e logga l'attività in `logs/agent_activity.md`.
3. **Rollback**: recupera gli URL dal manifest, verifica i checksum in una
   workspace temporanea (`sha256sum -c manifest.txt`), applica il ripristino in
   sandbox/staging senza committare artefatti e aggiorna `Last verified` + log.
4. Consulta il runbook `docs/planning/REF_BACKUP_AND_ROLLBACK.md` per i dettagli
   e le note operative aggiornate.

## Flusso PR e collegamento con la CI

1. Crea una branch descrittiva e collega eventuali issue.
2. Apri la PR solo dopo che il **validator di release è PASS senza regressioni**
   (allega il report): eventuali regressioni bloccano il merge.
3. Assicurati che l'approvazione del **Master DD** sia documentata (link a
   commento/issue) prima del merge.
4. Applica le checklist pertinenti (QA, telemetria, web) citate in
   `docs/process/traits_checklist.md` e allega log significativi nella PR.
5. Includi nella PR un **changelog** delle modifiche e un **piano di rollback
   03A** (link o allegato nella sezione Note del template).
6. Verifica in locale `npm run format:check`, `npm run test` e,
   per modifiche front-end, `npm run build`/`npm run preview`.
7. Le pipeline CI rilanciano test, build Vite con base relativa e uno
   smoke-test del preview server; assicurati che la tua PR non rompa questi
   step.

## Contributi sui trait

Per proposte e modifiche ai trait consulta la guida dedicata in
[`docs/contributing/traits.md`](docs/contributing/traits.md). Troverai template,
strumenti, workflow di revisione ed esempi passo-passo, oltre ai link diretti
agli script (`build_trait_index.js`, `report_trait_coverage.py`) e all'editor
schema-driven.
