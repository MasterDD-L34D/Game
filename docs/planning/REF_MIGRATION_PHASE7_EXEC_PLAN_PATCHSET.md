# Log sandbox – Fase 7 Piano esecutivo & Patchset

Log sandbox per la Fase 7: definire il piano esecutivo e il patchset derivato dai gate di Fase 4 e dagli output di asset/catalogo (Fase 5) e documentazione (Fase 6).

## Riferimenti
- Piano di migrazione: `docs/planning/REF_REPO_MIGRATION_PLAN.md`
- Perimetro del refactor: `docs/planning/REF_REPO_SCOPE.md`
- Gate Fase 4 (esiti validator/simulator): `docs/planning/REF_MIGRATION_PHASE4_VALIDATION.md`
- Log fasi 0–6: `docs/planning/REF_MIGRATION_PHASE0-4_LOG.md`, `docs/planning/REF_MIGRATION_PHASE5_ASSET_CATALOG.md`, `docs/planning/REF_MIGRATION_PHASE6_DOC_ARCHIVE.md`
- Kickoff Fase 0: `docs/planning/REF_MIGRATION_PHASE0_KICKOFF.md`
- Log Fase 1 Design: `docs/planning/REF_MIGRATION_PHASE1_DESIGN.md`
- Log Fase 2 Modellazione: `docs/planning/REF_MIGRATION_PHASE2_MODELING.md`
- Log Fase 3 Bilanciamento: `docs/planning/REF_MIGRATION_PHASE3_BALANCING.md`

## Responsabilità
- **Lead:** coordinator (piano esecutivo, sequencing patchset, governance gating)
- **Supporto:**
  - dev-tooling (script, validazioni, checklist CI/lint per applicazione patch)
  - archivist (tracciabilità patch, log decisioni, handoff finale)
  - asset-prep (integrazione asset approvati e prerequisiti tecnici)
  - trait-curator / species-curator / biome-ecosystem-curator (coerenza patch dati con mapping/alias)
  - balancer (verifica impatti numerici e controlli post-merge)

## Perimetro e obiettivi
- Costruire un execution plan che ordini patch e merge secondo i vincoli del gate Fase 4 e le disponibilità asset/doc definite in Fasi 5–6.
- Redigere patchset sandbox con blocchi diff strutturati e tracciabilità verso mapping, alias, asset e documentazione.
- Definire prerequisiti tecnici (branch, script, sequenza commit, controlli CI) e owner/scadenze per ciascun blocco patch.
- Garantire percorso di rollback e criteri di pass/fail gate prima dell'applicazione su branch produttivo.

## Rischi principali
- Sequenza patch non coerente con i vincoli del gate di Fase 4 o con la disponibilità di asset/doc, causando fallimenti CI o rollback.
- Patchset incompleto o non tracciato (assenza di mapping a dataset/asset/doc), rendendo difficile audit e recovery.
- Mancanza di prerequisiti tecnici (branch, script, dataset) o owner/scadenze, con rischio di slittamento o applicazione parziale.
- Controlli CI/lint non eseguiti o non documentati, con potenziali regressioni.

## Deliverable e gate (Fase 7)
- **Deliverable**
  - Execution plan sandbox (`docs/pipelines/<feature>_execution_plan.md`) con sequenza patch, branch consigliata, ordine commit, controlli CI/lint.
  - Patchset sandbox (`docs/reports/<feature>_patchset_sandbox.md`) con blocchi `--- PATCH N: path ---` collegati a mapping/alias/asset/doc.
  - Tabella prerequisiti patchset con owner e scadenze: es. "branch feature/<nome>" (Owner: coordinator, Scadenza: T+1d), "script validazione slug" (Owner: dev-tooling, Scadenza: T+2d), "pack asset finali" (Owner: asset-prep, Scadenza: T+4d).
  - Piano di rollback e checklist post-merge (controlli CI, validator, aggiornamento log archivist).
- **Gate**
  - Revisione congiunta coordinator + dev-tooling + archivist sul piano esecutivo e sul patchset sandbox, verificando copertura prerequisiti e allineamento al gate Fase 4.
  - Autorizzazione finale (PASS/HOLD) prima di qualsiasi applicazione su branch produttivo; i prerequisiti patchset devono risultare completati o avere scadenze/owner chiari.

## Azioni immediate
1. Importare nel log i prerequisiti aperti dai gate di Fase 4 e dai log di Fasi 5–6, trasformandoli in checklist patchset con owner/scadenze.
2. Bozzare l'execution plan (sequenza patch, branch, CI) e il relativo patchset sandbox, collegandoli a mapping/alias/asset/doc.
3. Validare con dev-tooling la lista di controlli (validator, lint, test) e inserire i punti di rollback nel piano.
4. Condividere la checklist con coordinator/archivist per ottenere decisione di gate (PASS/HOLD) prima di procedere a qualsiasi applicazione reale.

## Note operative
- Produrre solo log e draft in sandbox (`docs/planning/`, `docs/reports/`, `docs/pipelines/`), senza applicare patch ai dataset core o agli asset.
- Ogni patch deve riferire esplicitamente mapping, alias, asset e documentazione correlata per facilitare audit e rollback.
- In caso di conflitti o prerequisiti mancanti, documentare rischio e bloccare l'avanzamento finché il gate non viene risolto.
- Coordinare sequenza e proprietari con il calendario di scadenze definito nei prerequisiti per evitare sovrapposizioni e freeze violation.
