# Log sandbox – Fase 2 Modellazione (mapping & validator)

Log sandbox per la Fase 2: preparare mapping dati e verifiche schema in modalità report-only, mantenendo coerenza con i concept di Fase 1 e con il perimetro di Fase 0.

## Riferimenti
- Piano di migrazione: `docs/planning/REF_REPO_MIGRATION_PLAN.md`
- Perimetro del refactor: `docs/planning/REF_REPO_SCOPE.md`
- Log fasi 0–4: `docs/planning/REF_MIGRATION_PHASE0-4_LOG.md`
- Kickoff Fase 0: `docs/planning/REF_MIGRATION_PHASE0_KICKOFF.md`
- Log Fase 1 Design: `docs/planning/REF_MIGRATION_PHASE1_DESIGN.md`

## Responsabilità
- **Lead:** trait-curator (mapping trait e coerenza nomenclatura)
- **Supporto:**
  - species-curator (mapping specie/affinità e allineamento con biomi)
  - dev-tooling (validator schema in dry-run / report-only)
  - archivist (diff report e versioning, link ai log di fase precedenti)
  - coordinator (gating e coerenza con freeze/gate del migration plan)

## Perimetro e obiettivi
- Mappare trait/specie/biomi dalle bozze di Fase 1 verso gli schemi attuali, mantenendo **STRICT MODE** (nessuna modifica a `core/**`, `derived/**`, `incoming/**`, `docs/incoming/**`).
- Preparare mapping dati per 01B/01C già censiti in scope e migration plan, distinguendo materiale **draft** da contenuti pronti per Fase 3.
- Eseguire validator schema in **dry-run/report-only** (es. bundle 02A) per verificare compatibilità e campi critici, senza alterare pack o workflow esistenti.
- Assicurare tracciabilità tra mapping e concept/alias di Fase 1, includendo note su campi bloccanti e dipendenze di naming/slug.
- Produrre output riutilizzabile per balancer (curve, fixture) e per dev-tooling (input successivi di simulazione), senza sbloccare gate 03A/03B finché non approvati.

## Rischi principali
- Drift tra mapping e concept di Fase 1 o con il perimetro P0/P1/P2 dello scope (`REF_REPO_SCOPE`), con potenziali regressioni sui pack derivati.
- Esecuzione di validator o script fuori modalità **report-only**, violando freeze 03A/03B o alterando dati core/derived/incoming.
- Nomenclatura incoerente (slug, alias, affinità) che blocca lo schema o genera difformità nei report diff.
- Diff report incompleti o non archiviati dall'archivist, che impediscono audit e rollback.
- Mancata copertura dei campi critici richiesti dai validator 02A/03A (es. meta.tier, slot_profile, completion_flags) prima del passaggio a Fase 3.

## Deliverable e gate (Fase 2)
- **Deliverable**
  - Mapping dati per trait/specie/biomi allineati agli schemi attuali, con marcatura draft vs ready e note su campi critici.
  - Esito validator schema in dry-run/report-only (inclusi eventuali whitelisting temporanei) con percorso ai report.
  - Diff report dell'archivist che confronta mapping vs baseline precedente e registra delta/log per audit.
- **Gate**
  - Validazione congiunta trait-curator/species-curator + dev-tooling sui mapping e sui risultati del validator (nessuna modifica ai core).
  - Approvazione coordinator/archivist del diff report e dell'handoff per Fase 3; log archiviato in `docs/planning/` (sandbox).

## Azioni immediate
1. Riesaminare concept/alias di Fase 1 e il perimetro P0/P1/P2 per derivare i mapping iniziali (trait/specie/biomi) marcati draft.
2. Coordinarsi con dev-tooling per lanciare validator schema in **report-only** (dry-run 02A) sui mapping preparati; raccogliere output e whitelisting necessari.
3. Far produrre all'archivist un diff report che evidenzi delta vs baseline (incluso naming/slug, meta, completion_flags) e collegarlo ai log di Fase 0–1.
4. Preparare handoff verso balancer e dev-tooling per le simulazioni previste in Fase 3, documentando prerequisiti e campi bloccanti.

## Note operative
- Non modificare dati in `core/**`, `derived/**`, `incoming/**`, `docs/incoming/**`: tutte le attività restano in sandbox/log.
- Mantenere log e report sotto `docs/planning/` e `reports/temp/**` (se generati) con timestamp e link ai gate di riferimento.
- Se emergono regressioni o blocchi da validator, registrare il rischio nel log e richiedere arbitration al coordinator prima di proporre fix.
- Allineare naming/slug alle convenzioni di `REF_REPO_SCOPE` per evitare drift in Fase 3 (bilanciamento) e nei pack derivati.
