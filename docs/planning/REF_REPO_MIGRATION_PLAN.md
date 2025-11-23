# REF_REPO_MIGRATION_PLAN – Sequenza patchset

Versione: 0.2 (bozza)
Data: 2025-11-23
Owner: agente **coordinator** (supporto: archivist, dev-tooling)
Stato: DRAFT – sequenziare i patchset

---

## Obiettivi

- Allineare i patchset alla GOLDEN_PATH: Fase 0 già completata (scope), Fasi 1–2 per analisi/catalogo, Fase 3 per tooling/validazione, Fase 4 per applicazione patch.
- Definire per ogni sotto-patch owner, prerequisiti, criteri di successo, rollback e rischi principali.
- Ridurre conflitti tra incoming, core/derived e tooling/CI, mantenendo rollback chiari per ogni passaggio.

## Riferimenti GOLDEN_PATH

- **Fase 0 – Scope (completata):** perimetro e patch neutrale (`REF_REPO_SCOPE`, `REF_REPO_PATCH_PROPOSTA`).
- **Fase 1–2 – Analisi e Catalogo:** mappatura incoming, core vs derived, fixture e dipendenze.
- **Fase 3 – Tooling e Validazione:** introdurre strumenti e CI di verifica, senza ancora applicare patch destructive.
- **Fase 4 – Applicazione patch:** esecuzione patch su dati/core/derived/incoming con controlli di regressione.

## Sequenza patchset

### Fase 1–2 (analisi/catalogo)

**PATCHSET-01A – Catalogo incoming**

- **Owner:** archivist (supporto: asset-prep).
- **Prerequisiti:** approvazione PATCHSET-00; accesso all’elenco completo incoming (`REF_INCOMING_CATALOG`).
- **Criteri di successo:**
  - Tabella incoming consolidata con stato (usato/duplicato/da archiviare) e link alla fonte.
  - Gap list per elementi senza mapping verso core/derived.
- **Rollback:** ripristino tabella incoming precedente + annullamento link se il catalogo introduce ambiguità.
- **Note rischio:** rischio conflitti di nomenclatura; usare alias temporanei documentati.

**PATCHSET-01B – Core vs Derived**

- **Owner:** species-curator (supporto: trait-curator, archivist).
- **Prerequisiti:** completamento 01A; `REF_REPO_SOURCES_OF_TRUTH` validato.
- **Criteri di successo:**
  - Matrice core/derived aggiornata con dipendenze e priorità P0/P1/P2.
  - Lista fixture che devono restare “core” e quelle promuovibili a “derived”.
- **Rollback:** reintegro matrice precedente; revert dei tag core/derived nei file di riferimento.
- **Note rischio:** incoerenze tra pack legacy e definizioni core → prevedere flag temporanei per i casi borderline.

**PATCHSET-01C – Catalogo tooling/CI (baseline)**

- **Owner:** dev-tooling (supporto: coordinator).
- **Prerequisiti:** 01A–01B chiusi; inventario workflow esistenti (CI, lint, generatori).
- **Criteri di successo:**
  - Mappa dei job CI e script locali con input/output e impatti sui pack.
  - Elenco controlli mancanti per derived/incoming e decisione su dove inserirli (CI vs script locale).
- **Rollback:** ripristino configurazioni CI precedenti e rollback di eventuali esperimenti di hook non promossi.
- **Note rischio:** modifiche premature ai workflow potrebbero bloccare pipeline esistenti → usare branch isolati.

### Fase 3 (tooling/validazione)

**PATCHSET-02A – Tooling di validazione**

- **Owner:** dev-tooling (supporto: balancer per dati numerici).
- **Prerequisiti:** 01C approvato; schema attuali consolidati (`REF_TOOLING_AND_CI`).
- **Criteri di successo:**
  - Validator per core/derived/incoming eseguibile in locale e in CI (smoke + report differenze).
  - Fixture di test minime per rilevare regressioni su pack derivati.
- **Rollback:** disabilitare nuovo validator e ripristinare pipeline precedente; conservare log per diagnosi.
- **Note rischio:** falsi positivi possono bloccare release; prevedere modalità “report-only” nella prima esecuzione.

### Fase 4 (applicazione patch)

**PATCHSET-03A – Applicazione patch core/derived**

- **Owner:** coordinator (supporto: species-curator, trait-curator).
- **Prerequisiti:** 02A attivo in modalità report-only; approvazione owner umano per modifiche ad alto impatto.
- **Criteri di successo:**
  - Patch applicate a core/derived con validator in pass; changelog e rollback script generati.
  - Nessuna regressione sui pack ufficiali secondo suite smoke.
- **Rollback:** eseguire script di revert generati + disabilitare validator nuovo se blocca il deploy.
- **Note rischio:** conflitti con branch paralleli → congelare merge di feature non correlate durante l’esecuzione.

**PATCHSET-03B – Pulizia incoming/archivio**

- **Owner:** archivist (supporto: asset-prep).
- **Prerequisiti:** 03A completato; mapping incoming ↔ core/derived stabile.
- **Criteri di successo:**
  - Incoming ripulito/archiviato con log per elementi rimossi o spostati.
  - Aggiornamento indicizzazioni e redirect per evitare riferimenti orfani.
- **Rollback:** ripristino snapshot incoming pre-pulizia; rollback delle entry di archivio aggiunte.
- **Note rischio:** perdita di referenze storiche → mantenere copia read-only del catalogo precedente.

---

## Prerequisiti generali prima di procedere

- Conferma owner umano per i patchset 02A+ (tooling) e 03A+ (patch applicative).
- Branch dedicati per ogni patchset e gate di review incrociato tra agenti (coordinator + owner di fase).
- Log centralizzato in `logs/agent_activity.md` per tracking di rischi, rollback e approvazioni.

---

## Changelog

- 2025-11-23: versione 0.2 – sequenza patchset per Fasi 1–4 con owner, prerequisiti, successo e rollback.
- 2025-11-23: bozza di piano di migrazione basato su `REF_REPO_SCOPE` (coordinator).
