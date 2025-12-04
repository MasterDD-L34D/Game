# Log sandbox – Fase 3 Bilanciamento (curve & simulazioni)

Log sandbox per la Fase 3: definire curve di bilanciamento e simulazioni in modalità report-only, mantenendo allineamento con i mapping di Fase 2 e i concept di Fase 1.

## Riferimenti
- Piano di migrazione: `docs/planning/REF_REPO_MIGRATION_PLAN.md`
- Perimetro del refactor: `docs/planning/REF_REPO_SCOPE.md`
- Log fasi 0–4: `docs/planning/REF_MIGRATION_PHASE0-4_LOG.md`
- Kickoff Fase 0: `docs/planning/REF_MIGRATION_PHASE0_KICKOFF.md`
- Log Fase 1 Design: `docs/planning/REF_MIGRATION_PHASE1_DESIGN.md`
- Log Fase 2 Modellazione: `docs/planning/REF_MIGRATION_PHASE2_MODELING.md`

## Responsabilità
- **Lead:** balancer (curve, tuning, coerenza numerica)
- **Supporto:**
  - dev-tooling (simulazioni previste in modalità **report-only** e raccolta output)
  - trait-curator (note su trait, scaling, completion_flags, tier/slot_profile)
  - species-curator (coerenza specie/affinità, biomi e impatti su ecosistemi)
  - archivist (versioning log, link ai report simulazioni e tracciabilità con fasi precedenti)
  - coordinator (gating e rispetto freeze/gate definiti nel migration plan)

## Perimetro e obiettivi
- Definire curve di bilanciamento (HP, CD, scaling, drop, affinity) basate sui mapping di Fase 2 e sui concept di Fase 1, mantenendo **STRICT MODE** (niente modifiche a `core/**`, `derived/**`, `incoming/**`, `docs/incoming/**`).
- Eseguire simulazioni previste in **report-only** (senza scrivere nei pack o nelle pipeline di produzione) usando i bundle/mapping preparati in Fase 2.
- Annotare parametri critici (tier, slot_profile, meta.tier, completion_flags) e dipendenze tra curve e trait/specie per prevenire regressioni nei validator successivi.
- Preparare output riutilizzabile per Fase 4 (validazione), incluso elenco delle curve candidate, deviazioni note e ipotesi di tuning.
- Documentare eventuali constraint di naming/slug o prerequisite tecnici che influenzano le simulazioni o la successiva applicazione patchset.

## Rischi principali
- Simulazioni lanciate fuori modalità **report-only** o con dataset non allineato ai mapping di Fase 2, causando drift rispetto al perimetro `REF_REPO_SCOPE`.
- Curve incoerenti con i concept di Fase 1 o con i vincoli tier/slot_profile, generando blocchi nei validator o nei pack derivati.
- Mancata tracciabilità delle ipotesi di bilanciamento (assenza di log archivist), che ostacola rollback/audit e la preparazione di gate 03A/03B.
- Output simulazioni incompleti o non collegati a mapping/trait specifici, rendendo impossibile la revisione congiunta o il passaggio a validazione.
- Rischi di freeze violation (03A/03B) se vengono alterati file fuori sandbox o avviate pipeline non autorizzate.

## Deliverable e gate (Fase 3)
- **Deliverable**
  - Curve di bilanciamento documentate (scaling, threshold, affinity) collegate ai mapping di Fase 2 e ai concept di Fase 1.
  - Report delle simulazioni in **report-only**, con parametri di input/output e note sulle metriche osservate.
  - Log archivist con link ai report, note di tuning e richieste di follow-up per validator di Fase 4.
- **Gate**
  - Revisione congiunta balancer + dev-tooling dei report simulazione e coerenza con mapping (nessuna modifica ai dati core).
  - Approvazione coordinator/archivist per l’handoff verso Fase 4, con log archiviato in `docs/planning/` (sandbox) e indicazione di eventuali blocchi o precondizioni.

## Azioni immediate
1. Raccogliere dai log di Fase 1–2 i mapping/trait/specie e i parametri già marcati come critici (tier, slot_profile, meta, scaling) per impostare le curve iniziali.
2. Coordinarsi con dev-tooling per eseguire le simulazioni previste in **report-only** usando i mapping di Fase 2; registrare input/output e metrica osservata.
3. Annotare nel log archivist le curve candidate, le deviazioni rilevate e le ipotesi di tuning richieste per superare i gate 03A/03B.
4. Preparare handoff verso Fase 4 includendo prerequisiti tecnici (dataset, script, versioni) e rischi residui da monitorare.

## Note operative
- Operare in sandbox: non modificare `core/**`, `derived/**`, `incoming/**`, `docs/incoming/**`; usare `docs/planning/` e `reports/temp/**` per log/report.
- Se le simulazioni richiedono dataset aggiuntivi, allineare naming/slug con `REF_REPO_SCOPE` e registrare le fonti nel log.
- In caso di blocchi o metriche fuori soglia, loggare i rischi e richiedere arbitration al coordinator prima di proporre fix o patchset.
- Mantenere allineati i riferimenti e la tracciabilità verso Fasi 0–2 per evitare drift nei successivi validator e nel gating di Fase 4.
