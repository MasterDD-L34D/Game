# Log sandbox – Fase 4 Validazione (aggregazione esiti e gate)

Log sandbox per la Fase 4: consolidare validator e simulator report-only, applicare criteri di gate e preparare l'handoff verso le fasi 5–7 mantenendo STRICT MODE.

## Riferimenti
- Piano di migrazione: `docs/planning/REF_REPO_MIGRATION_PLAN.md`
- Perimetro del refactor: `docs/planning/REF_REPO_SCOPE.md`
- Log fasi 0–4: `docs/planning/REF_MIGRATION_PHASE0-4_LOG.md`
- Kickoff Fase 0: `docs/planning/REF_MIGRATION_PHASE0_KICKOFF.md`
- Log Fase 1 Design: `docs/planning/REF_MIGRATION_PHASE1_DESIGN.md`
- Log Fase 2 Modellazione: `docs/planning/REF_MIGRATION_PHASE2_MODELING.md`
- Log Fase 3 Bilanciamento: `docs/planning/REF_MIGRATION_PHASE3_BALANCING.md`

## Responsabilità
- **Lead:** dev-tooling (esecuzione validator/simulator, aggregazione esiti, criteri di gate)
- **Supporto:**
  - balancer (verifica coerenza curve vs. simulazioni, note su tuning post-gate)
  - trait-curator (allineamento trait, scaling, flag, slot/tier con outcome validator)
  - species-curator (coerenza specie/affinità/biomi con report simulator)
  - archivist (versioning log, diff report, changelog e rischi residui)
  - coordinator (gestione gate, arbitrage su blocchi, prep fasi 5–7)

## Perimetro e obiettivi
- Consolidare gli esiti di validator schema (dry-run) e simulator (report-only) lanciati su dataset/mapping di Fase 2 e curve di Fase 3.
- Applicare STRICT MODE: nessuna modifica a `core/**`, `derived/**`, `incoming/**`, `docs/incoming/**`; lavorare in `docs/planning/` e `reports/temp/**`.
- Identificare deviazioni, failure e warning per trait/specie/biomi e collegarli a mapping/curve di riferimento.
- Definire criteri di gate per il passaggio alle fasi 5–7 includendo prerequisiti tecnici, blocchi noti e azioni correttive suggerite.
- Preparare handoff documentato (script usati, dataset, parametri) per asset-prep/documentation e successive patchset.

## Rischi principali
- Validator/simulator eseguiti su dataset non allineato a Fasi 2–3, generando falsi positivi/negativi o drift rispetto a `REF_REPO_SCOPE`.
- Output incompleti o non tracciati (assenza di log archivist) che impediscono audit, rollback o gating trasparente.
- Mancata corrispondenza tra curve di Fase 3 e parametri di simulazione, con rischio di regressioni non rilevate.
- Violazione di STRICT MODE (scrittura in core/derived/incoming) o esecuzione pipeline non autorizzate con effetti persistenti.
- Rischi di slittamento sulle fasi 5–7 per mancanza di prerequisiti o blocchi tecnici non formalizzati nel gate.

## Deliverable e gate (Fase 4)
- **Deliverable**
  - Report aggregato validator+simulator (report-only) con elenco di failure/warning e mapping ai trait/specie/biomi coinvolti.
  - Log archivist con diff report, rischi residui, decisioni di gating e referenze ai dataset/script usati.
  - Checklist di prerequisiti per fasi 5–7 (asset, documentazione, patchset) con owner e scadenze.
- **Gate**
  - Revisione congiunta dev-tooling + balancer + curator (trait/specie) dei report e delle deviazioni, con esito chiaro (pass/hold/fix).
  - Validazione coordinator/archivist che attesti l'aderenza a STRICT MODE, la tracciabilità completa e la presenza dei prerequisiti per fasi 5–7.

## Checklist validazione e tracciabilità
- Link ai report validator (schema dry-run) e simulator (report-only) utilizzati per il gate, con posizione in `reports/**`.
- Mapping dei finding verso trait/specie/biomi coinvolti, indicando slug o identificativi usati nei mapping/curve di Fase 2–3.
- Decisione di gate (pass/hold/fix) per ciascun blocco, con owner responsabile, data di review ed eventuale scadenza per la chiusura.
- Azioni correttive pianificate (patch, retuning, re-run) con next step, owner e finestra temporale.
- Riferimenti ai dataset e agli script eseguiti (percorso, commit, parametri) per garantire tracciabilità e ripetibilità dei report.

## Azioni immediate
1. Raccolta dei report validator schema (dry-run) e simulator (report-only) prodotti in Fasi 2–3; verificare dataset/parametri usati.
2. Aggregare esiti in un log unico indicando mapping/curve di riferimento, failure/warning e suggerimenti di fix o follow-up.
3. Condividere con balancer, trait-curator e species-curator per verificare coerenza e individuare tuning o patch necessarie.
4. Preparare il gate verso fasi 5–7: checklist prerequisiti, owner, blocchi, decisione (pass/hold) e canale di handoff.

## Note operative
- Operare solo in sandbox (`docs/planning/`, `reports/temp/**`), evitando modifiche a dati/core e pipeline produttive.
- Se i report richiedono dati aggiuntivi, allineare naming/slug con `REF_REPO_SCOPE` e tracciare le fonti nel log archivist.
- In caso di failure bloccanti, documentare rischio e proposta di mitigazione prima di proporre patchset; richiedere arbitration al coordinator se necessario.
- Mantenere collegamenti espliciti ai log delle Fasi 0–3 per garantire tracciabilità e supportare audit/rollback.
