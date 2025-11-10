# Task board — `incoming/lavoro_da_classificare`

Questo file traduce l'`INTEGRATION_PLAN.md` in attività granulari e
assegnabili. Ogni sezione indica obiettivi, deliverable e comandi chiave per
chiudere il batch corrispondente.

> Stato corrente aggiornabile tramite checkmark; sincronizzare anche con
> `tasks.yml` per l'automazione di report o creazione issue.

> Directory operative già presenti nel repository: `docs/evo-tactics/`,
> `docs/security/`, `data/external/evo/`, `reports/evo/`,
> `incoming/archive/documents/`, `tools/automation/`, `docs/wireframes/evo/`.
> Utilizzarle per atterrare i deliverable mano a mano che i batch avanzano.

## Batch `documentation`

- [ ] **DOC-01 – Conversione sorgenti**  
  _Output_: Markdown pulito sotto `docs/evo-tactics/` con frontmatter.  
  _Passi_: eseguire `pandoc` sui `.docx`/`.pdf`, uniformare heading, collegare
  riferimenti interni.  
  _Bloccanti_: conferma versioni ufficiali guide trait.
- [ ] **DOC-02 – Allineamento indice**  
  _Output_: aggiornata la sezione indice in `docs/README.md` + link nel wiki.  
  _Passi_: aggiungere anchor `evo-` in stile kebab-case, testare link locali.
- [ ] **DOC-03 – Archivio duplicati**  
  _Output_: copia sorgenti spostata in `incoming/archive/documents/` e nota nel
  file inventario.

## Batch `data-models`

- [ ] **DAT-01 – Lint schemi**  
  _Output_: esito `npm run schema:lint` senza errori.  
  _Passi_: aggiornare percorsi, introdurre namespace `evo`.  
  _Dipendenze_: nessuna.
- [ ] **DAT-02 – Revisione enum gameplay**  
  _Output_: commenti dal team gameplay su nuovi valori.  
  _Passi_: estrarre enum tramite script `tools/schema_enum_diff.py`, allegare
  diff al ticket.
- [ ] **DAT-03 – Merge alias**  
  _Output_: `data/core/species/aliases.json` aggiornato + changelog.  
  _Passi_: usare `jq` per merge controllato, aggiungere test snapshot se
  presenti.

## Batch `species_ecotypes`

- [ ] **SPEC-01 – Validazione JSON**  
  _Output_: report `species_validation.log` in `reports/incoming/`.  
  _Passi_: eseguire `scripts/validate.sh` con percorsi aggiornati.
- [ ] **SPEC-02 – Report sommario**  
  _Output_: `reports/evo/species_summary.md` generato da
  `species_summary_script.py`.  
  _Passi_: schedare metriche chiave (count, ecosistemi coperti).
- [ ] **SPEC-03 – Collegamento ecotipi**  
  _Output_: mapping in `data/external/evo/species_ecotype_map.json`.  
  _Passi_: confrontare con `data/ecosystems/` esistente, annotare mismatch nel
  file inventario.

## Batch `traits`

- [ ] **TRT-01 – Audit duplicati**  
  _Output_: CSV di `trait_review.py` archiviato in
  `reports/evo/traits_anomalies.csv`.  
  _Passi_: eseguire script, commentare righe problematiche.
- [ ] **TRT-02 – Merge glossario**  
  _Output_: `data/core/traits/glossary.json` aggiornato con nuovi ID.  
  _Passi_: assicurare ordine alfabetico, rigenerare documentazione.
- [ ] **TRT-03 – Aggiornamento analisi**  
  _Output_: `docs/analysis/trait_merge_proposals.md` completato con esiti.

## Batch `tooling`

- [ ] **TOL-01 – Uniformità script**  
  _Output_: shebang, licenze e permessi coerenti in `incoming/scripts/`.  
  _Passi_: `chmod +x`, aggiungere header SPDX, verificare import Python.
- [ ] **TOL-02 – Target Makefile**  
  _Output_: nuovi target `make evo-validate` e `make evo-backlog`.  
  _Passi_: integrare chiamate a script, documentare in `incoming/README.md`.
- [ ] **TOL-03 – Documentazione tooling**  
  _Output_: sezione nel wiki o `docs/tooling/evo.md`.  
  _Passi_: descrivere variabili ambiente, esempi output.

## Batch `ops_ci`

- [ ] **OPS-01 – Confronto workflow**  
  _Output_: tabella comparativa `ops/workflow_diff.md`.  
  _Passi_: diff con `.github/workflows/`, evidenziare step mancanti.
- [ ] **OPS-02 – Site audit**  
  _Output_: script armonizzati in `ops/site-audit/` con README aggiornato.  
  _Passi_: integrare dipendenze, verificare esecuzione locale.
- [ ] **OPS-03 – Config Lighthouse**  
  _Output_: `config/lighthouse/evo.lighthouserc.json` e test `npm run lint:lighthouse`.

## Batch `frontend`

- [ ] **FRN-01 – Porting test Playwright**  
  _Output_: suite in `tests/playwright/evo/` eseguibile con `npm run test:e2e`.  
  _Passi_: adeguare helper, aggiornare fixture.
- [ ] **FRN-02 – Sitemap**  
  _Output_: `public/sitemap.xml` e `robots.txt` aggiornati + validazione link.  
  _Passi_: lanciare `python tools/sitemap_link_checker.py public/sitemap.xml`.
- [ ] **FRN-03 – Mockup & docs UI**  
  _Output_: mockup in `docs/wireframes/` con pagina descrittiva.

---

Aggiornare questo file (e `tasks.yml`) al termine di ogni attività per rendere
tracciabile l'avanzamento e facilitare la creazione di issue dedicate.

