# Kickoff Fase 0 – Migrazione (sandbox)

Log sandbox per l'avvio della Fase 0: consolidare perimetro, rischi, deliverable e gate della migrazione prima di passare alle fasi 1–4.

## Riferimenti
- Piano di migrazione: `docs/planning/REF_REPO_MIGRATION_PLAN.md`
- Perimetro del refactor: `docs/planning/REF_REPO_SCOPE.md`
- Log fasi 0–4: `docs/planning/REF_MIGRATION_PHASE0-4_LOG.md`

## Responsabilità
- **Lead:** coordinator (governance e gating)
- **Supporto:** archivist (logging), dev-tooling (tooling/validator in report-only), species-curator & trait-curator (perimetro dati), balancer (priorità P0/P1/P2)

## Perimetro consolidato
- Applicazione del refactor in **STRICT MODE** su dati core/derived/incoming, documentazione e tooling/CI, senza nuove feature di gameplay.
- Priorità immediate (P0): definizione delle sorgenti di verità per trait/specie/biomi e isolamento di derived/snapshot/fixture, con catalogo `incoming/**` segmentato per stato.
- Priorità successive (P1–P2): consolidamento documentazione e allineamento tooling/CI ai core e alla rigenerazione dei pack; pulizia naming/slug e riordino `reports/`/script.
- Freeze e governance attive: baseline PATCHSET-00 approvata con gate 01A chiuso; 01B in revisione e 01C pianificato; logging obbligatorio su `logs/agent_activity.md`.

## Rischi principali
- Violazione di STRICT MODE o del Golden Path introducendo modifiche non gate-ate ai core/derived/incoming.
- Duplicazioni o drift tra core, derived, incoming e pack legacy per percorsi canonici non chiari.
- Tooling/CI non allineato ai core che genera regressioni o blocchi (validator, smoke redirect, rerun 02A).
- Mancata tracciabilità dei pack/backup e dei freeze attivi, con rollback non verificabili.

## Deliverable e gate (Fase 0)
- **Deliverable**
  - Perimetro ufficiale validato (riassunto P0–P2, freeze e governance correnti).
  - Matrice rischi preliminare con ownership e mitigazioni iniziali.
  - Registro decisioni di kickoff con link ai riferimenti (scope, migration plan, log 0–4).
- **Gate**
  - Conferma coordinator + Master DD del perimetro e dei rischi come baseline Fase 0.
  - Archiviazione del log in `docs/planning/` (sandbox) e aggiornamento di `logs/agent_activity.md` se richiesto.

## Azioni immediate
1. Validare con gli owner i punti di perimetro e i rischi sopra, allineandoli a scope e migration plan.
2. Registrare nel log eventuali delta (nuove priorità o rischi) rispetto a `REF_REPO_SCOPE` e `REF_REPO_MIGRATION_PLAN`.
3. Preparare handoff per Fase 1 (design) condividendo deliverable e gate approvati.

## Note operative
- Usare modalità **report-only** per qualunque validator/simulatore avviato in questa fase.
- Non alterare dati o workflow esistenti: ogni modifica deve passare per patchset dedicati e gate 01B/01C.
- Conservare eventuali differenze o decisioni in appendice a questo log e, se necessario, in `logs/agent_activity.md`.
