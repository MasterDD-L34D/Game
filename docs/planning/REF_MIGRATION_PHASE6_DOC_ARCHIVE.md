# Log sandbox – Fase 6 Documentazione & Archiviazione

Log sandbox per la Fase 6: consolidare la documentazione di alto livello e gli indici, allineati ai gate di Fase 4 e alle decisioni asset/catalogo di Fase 5.

## Riferimenti
- Piano di migrazione: `docs/planning/REF_REPO_MIGRATION_PLAN.md`
- Perimetro del refactor: `docs/planning/REF_REPO_SCOPE.md`
- Gate Fase 4 (esiti validator/simulator): `docs/planning/REF_MIGRATION_PHASE4_VALIDATION.md`
- Log fasi 0–5: `docs/planning/REF_MIGRATION_PHASE0-4_LOG.md`, `docs/planning/REF_MIGRATION_PHASE5_ASSET_CATALOG.md`
- Kickoff Fase 0: `docs/planning/REF_MIGRATION_PHASE0_KICKOFF.md`
- Log Fase 1 Design: `docs/planning/REF_MIGRATION_PHASE1_DESIGN.md`
- Log Fase 2 Modellazione: `docs/planning/REF_MIGRATION_PHASE2_MODELING.md`
- Log Fase 3 Bilanciamento: `docs/planning/REF_MIGRATION_PHASE3_BALANCING.md`

## Responsabilità
- **Lead:** archivist (appendici, indici, changelog, tracciabilità)
- **Supporto:**
  - coordinator (governance gate, allineamento con prerequisiti asset/doc/patchset)
  - asset-prep (link schede catalogo e naming asset verso i README/indici)
  - trait-curator / species-curator / biome-ecosystem-curator (coerenza con dataset e alias)
  - lore-designer (verifica narrativa delle descrizioni pubbliche)

## Perimetro e obiettivi
- Aggiornare documentazione sandbox (appendici, README, manuali) riflettendo gli output validati in Fase 4 e le decisioni di Fase 5, senza modificare dataset core.
- Consolidare indici/specie/biomi/trait in versione draft, collegandoli ai mapping e alle curve approvate.
- Preparare changelog e note di rilascio per l’handoff verso il piano esecutivo/patchset di Fase 7.
- Registrare prerequisiti documentali (appendici, indici, note pubbliche) con owner e scadenze, derivati dal gate Fase 4 e dagli asset di Fase 5.

## Rischi principali
- Desallineamento con il gate Fase 4 o con le schede asset/catalogo di Fase 5, generando documentazione incoerente.
- Mancanza di tracciabilità tra indici, alias e dataset, ostacolando audit e validazioni successive.
- Appendici/README incompleti che non coprono vincoli tecnici o naming, causando errori in patchset/CI.
- Rischi di sovrascrittura di documenti produttivi se non mantenuto il perimetro sandbox.

## Deliverable e gate (Fase 6)
- **Deliverable**
  - Appendici e integrazioni sandbox (es. `docs/biomes.md`, `docs/trait_reference_manual.md`, `docs/catalog/*`) con note di differenza rispetto a dataset attuale.
  - Indici/specie/biomi/trait aggiornati in bozza con collegamenti a mapping/alias e schede asset.
  - Changelog/archivio decisioni (log archivist) con riferimenti ai gate Fase 4 e alle approvazioni di Fase 5.
  - Prerequisiti documentali con owner e scadenze: es. "appendice alias specie" (Owner: archivist, Scadenza: T+4d), "nota pubblica formati asset" (Owner: asset-prep, Scadenza: T+2d).
- **Gate**
  - Revisione coordinator + archivist per verificare che la documentazione rifletta fedelmente i vincoli di Fase 4 e le uscite di Fase 5, con tracciabilità completa.
  - Accordo con asset-prep/curator su indici e alias prima di passare a Fase 7; i prerequisiti documentali devono risultare chiusi o schedulati.

## Azioni immediate
1. Importare nel log i prerequisiti e i blocchi registrati nel gate Fase 4 e nel log asset di Fase 5, marcandoli come requisiti documentali.
2. Aggiornare bozze di appendici/indici in sandbox collegando mapping, alias e schede asset; evidenziare le parti da congelare in patchset.
3. Registrare changelog e note di rilascio preliminari con owner e scadenze e condividerli con coordinator per il gating.
4. Preparare matrice di tracciabilità (dataset ↔ alias ↔ asset ↔ doc) per supportare Fase 7.

## Note operative
- Lavorare esclusivamente in sandbox (`docs/planning/`, `docs/catalog/` bozze, `docs/reports/` draft) senza toccare dataset o manuali produttivi.
- Ogni sezione aggiornata deve citare il gate Fase 4 e i riferimenti asset di Fase 5 per evitare drift.
- In caso di discrepanze tra alias/indici e schede asset, documentare rischio e richiesta di fix prima del passaggio a Fase 7.
- Mantenere naming e slug aderenti a `REF_REPO_SCOPE` e ai log precedenti per assicurare continuità nei validator.
