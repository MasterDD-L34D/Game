# Log sandbox – Fase 1 Design (concept & alias)

Log sandbox per la Fase 1: consolidare concept, alias e materiali di design prima di passare alla modellazione (Fase 2).

## Riferimenti
- Piano di migrazione: `docs/planning/REF_REPO_MIGRATION_PLAN.md`
- Perimetro del refactor: `docs/planning/REF_REPO_SCOPE.md`
- Log fasi 0–4: `docs/planning/REF_MIGRATION_PHASE0-4_LOG.md`
- Kickoff Fase 0: `docs/planning/REF_MIGRATION_PHASE0_KICKOFF.md`

## Responsabilità
- **Lead:** lore-designer (concept e alias)
- **Supporto:**
  - species-curator (specie, affinità, nomenclatura)
  - trait-curator (trait pool, effetti, nomenclatura)
  - archivist (versioning, changelog, delta vs Fase 0)
  - coordinator (gating e handoff verso Fase 2)

## Perimetro e obiettivi
- Allineare concept e alias con il perimetro **STRICT MODE** definito in Fase 0 (niente nuove feature di gameplay o modifiche ai core).
- Consolidare sorgenti di verità per trait/specie/biomi coerenti con `REF_REPO_SCOPE` e mapping previsti in `REF_REPO_MIGRATION_PLAN`.
- Distinguere materiale **draft** (sandbox) da contenuti destinati a Fase 2 (modelling) e Fase 3 (bilanciamento) per evitare drift.
- Preparare handoff strutturato a Fase 2 includendo requisiti di mapping dati e vincoli di compatibilità con schema/validator.

## Rischi principali
- Disallineamento tra concept/alias e perimetro Fase 0 (es. introduzione di nuove meccaniche non approvate).
- Nomenclatura incoerente tra trait/specie/biomi che genera conflitti nei mapping di Fase 2 o nei pack derived.
- Versioning incompleto delle bozze con perdita di tracciabilità o confusione tra draft e contenuti ready.
- Requisiti di validator/simulator non catturati, generando rework in Fase 2–3.

## Deliverable e gate (Fase 1)
- **Deliverable**
  - Documento concept e alias (draft) per specie/trait/biomi in scope, con note su compatibilità schema.
  - Registro versioni e delta rispetto a Fase 0 (archivist), incluso tracciamento di dipendenze e placeholder per mapping dati.
  - Elenco requisiti per Fase 2: mapping attesi, campi critici, vincoli di nomenclatura, prerequisiti per validator/simulator.
- **Gate**
  - Revisione congiunta design (lore-designer + species/trait-curator) e approvazione coordinator.
  - Handoff formale a Fase 2 con deliverable archiviati in `docs/planning/` (sandbox) e note per dev-tooling.

## Azioni immediate
1. Raccolta input da `REF_REPO_SCOPE` e `REF_REPO_MIGRATION_PLAN` per confermare perimetro e priorità P0–P2 applicate al design.
2. Redigere draft concept/alias con convenzioni di naming condivise (specie/trait/biomi) e marcatura draft vs ready.
3. Documentare requisiti di mapping e vincoli di schema/validator che dovranno essere applicati in Fase 2 (report-only).
4. Registrare versioni/delta in appendice e preparare handoff verso Fase 2 con note operative per dev-tooling.

## Note operative
- Mantenere i draft in modalità sandbox: nessuna modifica a dati `core/**`, `derived/**`, `incoming/**` o pack; usare log documentali.
- Applicare convenzioni di nomenclatura esistenti e verificare allineamento con freeze/gate attivi (`REF_REPO_SCOPE`, `REF_REPO_MIGRATION_PLAN`).
- Coordinarsi con archivist per loggare revisioni e con dev-tooling per validatori in modalità **report-only**.
