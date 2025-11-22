# Task board — `incoming/lavoro_da_classificare`

Questo file traduce l'`INTEGRATION_PLAN.md` in attività granulari e
assegnabili. Ogni sezione indica obiettivi, deliverable e comandi chiave per
chiudere il batch corrispondente.

> Stato corrente aggiornabile tramite checkmark; sincronizzare anche con
> `tasks.yml` per l'automazione di report o creazione issue. Il runner
> `python tools/automation/evo_batch_runner.py` consente di lanciare in locale i
> comandi registrati per ogni batch (o di eseguire una dry-run).

> Directory operative già presenti nel repository: `docs/evo-tactics/`,
> `docs/security/`, `data/external/evo/`, `reports/evo/`,
> `incoming/archive/documents/`, `tools/automation/`, `docs/wireframes/evo/`.
> Utilizzarle per atterrare i deliverable mano a mano che i batch avanzano.

> Directory operative già presenti nel repository: `docs/evo-tactics/`,
> `docs/security/`, `data/external/evo/`, `reports/evo/`,
> `incoming/archive/documents/`, `tools/automation/`, `docs/wireframes/evo/`.
> Utilizzarle per atterrare i deliverable mano a mano che i batch avanzano.

## Batch `documentation`

- [x] **DOC-01 – Conversione sorgenti**
      _Owner_: docs-team
      _Output_: Markdown pulito sotto `docs/evo-tactics/` con frontmatter.
      _Passi_: eseguire `pandoc` sui `.docx`/`.pdf`, uniformare heading, collegare
      riferimenti interni.
      _Bloccanti_: conferma versioni ufficiali guide trait.
      _Note_: cinque guide convertite con anchor `evo-*` e metadata aggiornati.
- [x] **DOC-02 – Allineamento indice**
      _Owner_: docs-team
      _Output_: aggiornata la sezione indice in `docs/README.md` + link nel wiki.
      _Passi_: aggiungere anchor `evo-` in stile kebab-case, testare link locali.
      _Note_: sezione "Evo-Tactics" aggiunta con link ai nuovi capitoli; QA `reports/evo/qa/docs.log` conferma `npm run docs:lint` eseguito con esito positivo e follow-up definitivamente chiuso.
- [x] **DOC-03 – Archivio duplicati**
      _Owner_: docs-team
      _Output_: copia sorgenti spostata in `incoming/archive/documents/` e nota nel
      file inventario.
      _Note_: inventario aggiornato con stato `archiviato` e percorso archive.

## Batch `data-models`

- [x] **DAT-01 – Lint schemi**
      _Output_: esito `npm run schema:lint` senza errori.
      _Passi_: aggiornare percorsi, introdurre namespace `evo`.
      _Dipendenze_: nessuna.
      _Note_: stub `jsonschema` esteso e lint rieseguito con `PYTHONPATH=. npm run schema:lint -- --pattern schemas/evo/*.schema.json`; log QA in `reports/evo/qa/schema.log`.
- [x] **DAT-02 – Revisione enum gameplay**
      _Output_: commenti dal team gameplay su nuovi valori.
      _Passi_: estrarre enum tramite script `tools/schema_enum_diff.py`, allegare
      diff al ticket.
      _Note_: diff registrato in `docs/meeting-notes/evo-enum-review.md` con follow-up sui `metric_unit`.
- [x] **DAT-03 – Merge alias**
      _Output_: `data/core/species/aliases.json` aggiornato + changelog.
      _Passi_: usare `jq` per merge controllato, aggiungere test snapshot se
      presenti.
      _Note_: merge effettuato via `jq` e validato con `pytest tests/test_species_aliases.py`.

## Batch `species_ecotypes`

- [x] **SPEC-01 – Validazione JSON**
      _Output_: report `species_validation.log` in `reports/incoming/`.
      _Passi_: eseguire `scripts/validate.sh` con percorsi aggiornati.
      _Note_: validazione completata (`reports/evo/qa/dataset.log`): `make evo-validate` fallisce per ricette non tabulate, rieseguito via `AJV=/tmp/ajv-wrapper.sh bash incoming/scripts/validate.sh` (npx ajv-cli) con esito positivo su 5 trait e 11 specie.
- [x] **SPEC-02 – Report sommario**
      _Output_: `reports/evo/species_summary.md` generato da
      `species_summary_script.py`.
      _Passi_: schedare metriche chiave (count, ecosistemi coperti).
      _Note_: report Markdown con panoramica specie/ecotipi e copertura biome; confrontato con baseline esistente (`reports/evo/species_summary.md`) senza variazioni.
- [x] **SPEC-03 – Collegamento ecotipi**
      _Output_: mapping in `data/external/evo/species_ecotype_map.json`.
      _Passi_: confrontare con `data/ecosystems/` esistente, annotare mismatch nel
      file inventario.
      _Note_: mappate classi forestali/montane; restanti `acquatico_costiero`,
      `acquatico_dolce`, `sotterraneo` senza ecosistemi corrispondenti (registrati
      in `inventario.yml`).

## Batch `traits`

- [x] **TRT-01 – Audit duplicati**
      _Output_: CSV di `trait_review.py` archiviato in
      `reports/evo/traits_anomalies.csv`.
      _Passi_: eseguire script, commentare righe problematiche.
      _Note_: script esteso con flag `--input/--baseline/--out`; CSV rigenerato e marcato `action=add` per tutti i 50 trait, verificato contro l'artefatto `reports/evo/traits_anomalies.csv` (nessuna regressione).
- [x] **TRT-02 – Merge glossario**
      _Output_: `data/core/traits/glossary.json` aggiornato con nuovi ID.
      _Passi_: assicurare ordine alfabetico, rigenerare documentazione.
      _Note_: aggiunti 50 slug snake_case con traduzioni sintetiche EN e timestamp `updated_at` aggiornato.
- [x] **TRT-03 – Aggiornamento analisi**
      _Output_: `docs/analysis/trait_merge_proposals.md` completato con esiti.
      _Note_: documento riassuntivo con elenco slug, duplicati assenti e prossimi passi.

## Batch `tooling`

- [x] **TOL-01 – Uniformità script**
      _Output_: shebang, permessi e path coerenti in `incoming/scripts/`.
      _Passi_: ripuliti header Bash/Python, corretti i percorsi relativi, resi eseguibili gli script e spostate le versioni stabili
      da `lavoro_da_classificare/scripts/`.
- [x] **TOL-02 – Target Makefile**
      _Output_: nuovi target `make evo-validate`, `make evo-backlog` e `make traits-review`.
      _Passi_: integrate le chiamate agli script stabilizzati con controlli sulle variabili richieste.
- [x] **TOL-03 – Documentazione tooling**
      _Output_: sezione aggiornata in `docs/tooling/evo.md` con variabili ed esempi.
      _Passi_: documentati `validate.sh`, `setup_backlog.py` e `trait_review.py` evidenziando il collegamento con i nuovi target make.

## Batch `ops_ci`

- [x] **OPS-01 – Confronto workflow**
      _Output_: tabella comparativa `ops/workflow_diff.md`.
      _Passi_: diff con `.github/workflows/`, evidenziare step mancanti.
      _Note_: tabella aggiornata con differenze su `gh-pages`, centralizzazione config Lighthouse e workflow sicurezza mancante.
- [x] **OPS-02 – Site audit**
      _Output_: script armonizzati in `ops/site-audit/` con README aggiornato.
      _Passi_: integrare dipendenze, verificare esecuzione locale.
      _Note_: aggiunto `run.sh` con virtualenv, dipendenza `requests` e README aggiornato; suite eseguita via `bash ops/site-audit/run.sh`. Secret `SITE_BASE_URL` ora configurato (provisioning 2025-11-11, QA `reports/evo/qa/update-tracker.log`).
- [x] **OPS-03 – Config Lighthouse**
      _Output_: `config/lighthouse/evo.lighthouserc.json` e test `npm run lint:lighthouse`.
      _Note_: configurazione spostata sotto `config/lighthouse/` e script npm puntato al nuovo percorso. Secret `SITE_BASE_URL` validato in CI (provisioning 2025-11-11 con log QA `reports/evo/qa/update-tracker.log`).

## Batch `frontend`

- [x] **FRN-01 – Porting test Playwright**
      _Output_: suite in `tests/playwright/evo/` eseguibile con `npm run test:e2e`.
      _Passi_: adeguare helper, aggiornare fixture.
      _Note_: suite Playwright spostata da `webapp/tests/playwright/evo`; QA `reports/evo/qa/frontend.log` documenta run completo con esito positivo (`npx playwright install --with-deps chromium`) e follow-up definitivamente chiuso.
- [x] **FRN-02 – Sitemap**
      _Output_: `public/sitemap.xml` e `robots.txt` aggiornati + validazione link.
      _Passi_: lanciare `python tools/sitemap_link_checker.py public/sitemap.xml`.
      _Note_: sitemap rigenerata da `proposed_sitemap.xml`, robots copiato in `public/` e validazione registrata in `reports/evo/sitemap_validation.csv`.
- [x] **FRN-03 – Mockup & docs UI**
      _Output_: mockup in `docs/wireframes/` con pagina descrittiva.
      _Note_: immagine spostata in `docs/wireframes/evo/` e documentata in `docs/wireframes/evo/mockup_evo_tactics.md`.

---

Aggiornare questo file (e `tasks.yml`) al termine di ogni attività per rendere
tracciabile l'avanzamento e facilitare la creazione di issue dedicate.
