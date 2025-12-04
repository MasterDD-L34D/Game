# Log sandbox – Fase 5 Asset & Catalogo

Log sandbox per la Fase 5: preparazione asset e cataloghi coerenti con gli output validati in Fase 4 e pronti per l'ingresso in patchset.

## Riferimenti
- Piano di migrazione: `docs/planning/REF_REPO_MIGRATION_PLAN.md`
- Perimetro del refactor: `docs/planning/REF_REPO_SCOPE.md`
- Gate Fase 4 (esiti validator/simulator): `docs/planning/REF_MIGRATION_PHASE4_VALIDATION.md`
- Log fasi 0–4: `docs/planning/REF_MIGRATION_PHASE0-4_LOG.md`
- Kickoff Fase 0: `docs/planning/REF_MIGRATION_PHASE0_KICKOFF.md`
- Log Fase 1 Design: `docs/planning/REF_MIGRATION_PHASE1_DESIGN.md`
- Log Fase 2 Modellazione: `docs/planning/REF_MIGRATION_PHASE2_MODELING.md`
- Log Fase 3 Bilanciamento: `docs/planning/REF_MIGRATION_PHASE3_BALANCING.md`

## Responsabilità
- **Lead:** asset-prep (naming asset, schede catalogo, template grafici)
- **Supporto:**
  - archivist (tracciabilità, versioning log, mapping asset ↔ specie/biomi)
  - coordinator (sincronizzazione con gate di Fase 4 e governance handoff)
  - lore-designer (coerenza narrativa per descrizioni catalogo)
  - species-curator / biome-ecosystem-curator (allineamento alias e bioma/specie)

## Perimetro e obiettivi
- Produrre naming e metadati asset in coerenza con i dataset validati in Fase 4, mantenendo STRICT MODE (solo log e draft in `docs/planning/` e `docs/catalog/` sandbox).
- Redigere schede catalogo (biomi/specie/asset) collegate ai mapping di Fase 2 e alle curve di Fase 3, rispettando vincoli/gate di Fase 4.
- Definire template grafici e requisiti tecnici per conversione asset (formati, dimensioni, cartelle target) senza toccare `assets/` produttivo.
- Preparare prerequisiti asset (naming, versioni, placeholder) per l'inclusione nel patchset di Fase 7.

## Rischi principali
- Drift rispetto al gate di Fase 4 (asset non allineati ai mapping o alle curve convalidate).
- Naming asset non aderente alle convenzioni o agli alias di specie/bioma, con rischio di collisioni o rollback.
- Schede catalogo incomplete o non tracciate, che ostacolano l'integrazione in documentazione e patchset.
- Vincoli tecnici (formati, pesi, dir) non dichiarati che bloccano conversioni o CI asset.

## Deliverable e gate (Fase 5)
- **Deliverable**
  - Lista naming asset con metadati (slug, formato, directory target) collegata ai mapping/alias di specie/bioma.
  - Schede catalogo sandbox (`docs/catalog/*_assets_draft.md`) con riferimenti a concept e curve validate.
  - Template/linee guida per conversione asset (formati supportati, checklist qualità, path sandbox).
  - Prerequisiti asset per Fase 7 con owner e scadenze: es. "placeholder webp biomi" (Owner: asset-prep, Scadenza: T+5d), "alias finali specie per naming" (Owner: species-curator, Scadenza: T+3d).
- **Gate**
  - Verifica congiunta coordinator + archivist che gli asset rispettino i blocchi/gate di Fase 4 e che i prerequisiti sopra siano chiusi o pianificati.
  - Approvazione asset-prep sul naming finale prima del passaggio a Fase 6/7 (nessuna scrittura in `assets/` prod finché il gate Fase 4 non è segnato PASS).

## Azioni immediate
1. Importare nel log i vincoli e le deviazioni indicati dal gate di Fase 4 (alias, mapping, curve) per usarli come checklist di asset.
2. Elaborare naming asset e schede catalogo in sandbox, mantenendo link espliciti ai mapping/alias e alle curve validate.
3. Registrare prerequisiti asset con owner e scadenze e condividere con coordinator per il tracking verso Fase 6/7.
4. Preparare un mini-handbook conversione (formati, dimensioni, directory staging) per evitare blocchi in CI/patchset.

## Note operative
- Operare solo in sandbox (`docs/planning/`, `docs/catalog/` bozze), senza modificare `assets/` o dataset core.
- Ogni asset deve avere mapping esplicito a specie/bioma e stato (placeholder/finale) per supportare audit e rollback.
- Se emergono gap dal gate di Fase 4, loggare rischio e proposta di fix prima di proporre integrazione nel patchset.
- Allineare nomenclature e alias con `REF_REPO_SCOPE` e i log delle fasi precedenti per prevenire collisioni.
