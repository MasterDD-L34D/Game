# REF_REPO_MIGRATION_PLAN – Sequenza patchset

Versione: 0.3
Data: 2025-12-17
Owner: agente **coordinator** (supporto: archivist, dev-tooling)
Stato: PATCHSET-00 PROPOSTA – sequenziare i patchset con matrice dipendenze

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

- **Owner:** archivist (supporto: asset-prep per reperimento asset e metadati).
- **Prerequisiti:** approvazione PATCHSET-00; accesso all’elenco completo incoming (`REF_INCOMING_CATALOG`); calendario di freezing per evitare ingressi durante il censimento.
- **Criteri di successo:**
  - Tabella incoming consolidata con stato (usato/duplicato/da archiviare) e link alla fonte, firmata da coordinator.
  - Gap list per elementi senza mapping verso core/derived con owner proposti per la presa in carico.
- **Rollback:** ripristino tabella incoming precedente + annullamento link se il catalogo introduce ambiguità; riattivazione di eventuali ingressi congelati.
- **Note rischio:** rischio conflitti di nomenclatura e drifting durante il censimento → usare alias temporanei documentati e snapshot quotidiani.

**PATCHSET-01B – Core vs Derived**

- **Owner:** species-curator (supporto: trait-curator per mapping dei trait e archivist per fonti storiche).
- **Prerequisiti:** completamento 01A; `REF_REPO_SOURCES_OF_TRUTH` validato; definizione soglie P0/P1/P2 concordate con balancer.
- **Criteri di successo:**
  - Matrice core/derived aggiornata con dipendenze, priorità P0/P1/P2 e nota su fixture critiche.
  - Lista fixture che devono restare “core” e quelle promuovibili a “derived”, con rationale sintetico.
- **Rollback:** reintegro matrice precedente; revert dei tag core/derived nei file di riferimento e rimozione di flag temporanei.
- **Note rischio:** incoerenze tra pack legacy e definizioni core → prevedere flag temporanei per i casi borderline e richiesta di arbitration al coordinator.

**PATCHSET-01C – Catalogo tooling/CI (baseline)**

- **Owner:** dev-tooling (supporto: coordinator per priorità e sequenziamento).
- **Prerequisiti:** 01A–01B chiusi; inventario workflow esistenti (CI, lint, generatori); slot CI prenotato per prove non bloccanti.
- **Criteri di successo:**
  - Mappa dei job CI e script locali con input/output, ownership e impatti sui pack.
  - Elenco controlli mancanti per derived/incoming e decisione su dove inserirli (CI vs script locale), con piano di rollout progressivo.
- **Rollback:** ripristino configurazioni CI precedenti e rollback di eventuali esperimenti di hook non promossi; rimozione di pipeline pilota.
- **Note rischio:** modifiche premature ai workflow potrebbero bloccare pipeline esistenti → usare branch isolati e flag di sicurezza (report-only).

### Fase 3 (tooling/validazione)

**PATCHSET-02A – Tooling di validazione**

- **Owner:** dev-tooling (supporto: balancer per dati numerici e archivist per log dei casi noti).
- **Prerequisiti:** 01C approvato; schemi attuali consolidati (`REF_TOOLING_AND_CI`); ambienti di staging disponibili per dry-run.
- **Criteri di successo:**
  - Validator per core/derived/incoming eseguibile in locale e in CI (smoke + report differenze) con documentazione di setup.
  - Fixture di test minime per rilevare regressioni su pack derivati + baseline di risultati attesa.
- **Rollback:** disabilitare nuovo validator e ripristinare pipeline precedente; conservare log per diagnosi e issue di follow-up sui falsi positivi.
- **Note rischio:** falsi positivi possono bloccare release; prevedere modalità “report-only” nella prima esecuzione e whitelisting temporaneo.

### Fase 4 (applicazione patch)

**PATCHSET-03A – Applicazione patch core/derived**

- **Owner:** coordinator (supporto: species-curator per core, trait-curator per derived e balancer per verifiche numeriche critiche).
- **Prerequisiti:** 02A attivo in modalità report-only; approvazione owner umano per modifiche ad alto impatto; finestra di freeze per merge paralleli.
- **Criteri di successo:**
  - Patch applicate a core/derived con validator in pass; changelog e rollback script generati e pubblicati in `logs/`.
  - Nessuna regressione sui pack ufficiali secondo suite smoke e confronti numerici puntuali.
- **Rollback:** eseguire script di revert generati + disabilitare validator nuovo se blocca il deploy; ripristinare snapshot dei pack interessati.
- **Note rischio:** conflitti con branch paralleli → congelare merge di feature non correlate durante l’esecuzione e attivare codice di compatibilità temporaneo dove necessario.

**PATCHSET-03B – Pulizia incoming/archivio**

- **Owner:** archivist (supporto: asset-prep per migrazione asset e redirect).
- **Prerequisiti:** 03A completato; mapping incoming ↔ core/derived stabile; backup snapshot etichettato.
- **Criteri di successo:**
  - Incoming ripulito/archiviato con log per elementi rimossi o spostati e tag per data di archiviazione.
  - Aggiornamento indicizzazioni e redirect per evitare riferimenti orfani, verificati con scan automatico dei link.
- **Rollback:** ripristino snapshot incoming pre-pulizia; rollback delle entry di archivio aggiunte; ripristino redirect originari.
- **Note rischio:** perdita di referenze storiche → mantenere copia read-only del catalogo precedente e checklist post-pulizia.

---

## Matrice dipendenze tra patchset

| Patchset | Dipende da | Sblocco per        | Note                                                     |
| -------- | ---------- | ------------------ | -------------------------------------------------------- |
| 01A      | 00 (scope) | 01B, 01C           | Congelare nuovi ingressi durante il censimento.          |
| 01B      | 01A        | 01C, 02A           | Dipende dal catalogo per classificare core/derived.      |
| 01C      | 01A, 01B   | 02A                | Richiede matrice core/derived per configurare controlli. |
| 02A      | 01B, 01C   | 03A                | Validator necessita cataloghi e matrice consolidata.     |
| 03A      | 02A        | 03B                | Applicazione patch deve avere validator stabile.         |
| 03B      | 03A        | Conclusione fase 4 | Pulizia finale su incoming dopo patch core/derived.      |

Compatibilità GOLDEN_PATH: la sequenza mantiene allineamento con le Fasi 1–4 (analisi/catalogo → tooling/validazione → applicazione patch), senza introdurre attività delle Fasi 5–7.

---

## Prerequisiti generali prima di procedere

- Conferma owner umano per i patchset 02A+ (tooling) e 03A+ (patch applicative).
- Branch dedicati per ogni patchset e gate di review incrociato tra agenti (coordinator + owner di fase).
- Log centralizzato in `logs/agent_activity.md` per tracking di rischi, rollback e approvazioni.

---

## Changelog

- 2025-12-17: versione 0.3 – design completato e perimetro documentazione consolidato per PATCHSET-00, numerazione 01A–03B bloccata con richiamo alle fasi GOLDEN_PATH e prerequisiti di governance ribaditi (owner umano, branch dedicati, logging in `logs/agent_activity.md`).
- 2025-11-24: versione 0.3 – raffinata sequenza 01A–03B, aggiunta matrice dipendenze e nota compatibilità GOLDEN_PATH Fasi 1–4.
- 2025-11-23: versione 0.2 – sequenza patchset per Fasi 1–4 con owner, prerequisiti, successo e rollback.
- 2025-11-23: bozza di piano di migrazione basato su `REF_REPO_SCOPE` (coordinator).
