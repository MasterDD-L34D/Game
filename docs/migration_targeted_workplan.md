# Piano di attività mirate per avviare la migrazione

Questo piano elenca le attività operative a "lavori mirati" per avviare subito la migrazione, con priorità, owner e check di uscita.

## Obiettivi

- Sbloccare il gate 02A e preparare il freeze per le fasi 03A/03B.
- Ridurre il rischio operativo predisponendo snapshot/rollback prima delle patch.
- Garantire tracciabilità tramite log e artefatti di validazione.

## Attività ad alto impatto (sequenza consigliata)

1. **Riesecuzione 02A con fix mirati** (owner: dev-tooling + trait-curator)
   - Correggere errori di schema in `data/core/biomes.yaml` e completare sinergie/affinità mancanti nei trait.
   - Allineare stile e i18n dei trait per abbattere le 465 violazioni note.
   - Eseguire in report-only: `validate_datasets.py --schemas-only`, `trait_audit --check`, `trait_style_check` e archiviare gli output in `logs/`.
   - Uscita: log firmato e richiesta di approvazione a Master DD per chiudere il gate 02A.

### Riesecuzione 02A – check operativo

- Owner raccomandati: dev-tooling (correzioni e validazione) + trait-curator (i18n e stile trait).
- Frequenza: ripetere l'intero ciclo fino a ottenere un pass verde su tutti i validator.
- Checklist di esecuzione:
  - [x] Correzione schema applicata (tracce in diff e note su sinergie/affinità completate).
  - [x] Allineamento i18n/trait eseguito (stile e localizzazione uniformati).
  - [x] `validate_datasets.py --schemas-only` eseguito.
  - [x] `trait_audit --check` eseguito.
  - [x] `trait_style_check` eseguito.
  - [x] Log allegati (percorso obbligatorio in `logs/`): `logs/schema_only_2026-05-02.log`, `logs/trait_audit_2026-05-02.log`, `logs/trait_style_2026-05-02.log`, `logs/TKT-02A-VALIDATOR.rerun.log`.
  - [x] Firma Master DD: Master DD

#### Stato ultima riesecuzione (2026-05-02 00:00 UTC)

- [x] Correzione schema applicata → **OK** (validator schema-only in pass, solo 3 avvisi pack attesi).
- [x] Allineamento i18n/trait eseguito → **OK** (stile uniforme, solo 62 suggerimenti informativi su note bioma).
- [x] `validate_datasets.py --schemas-only` eseguito → log: `logs/schema_only_2026-05-02.log` (copia corrente in `logs/`, fonte in `reports/temp/patch-03A-core-derived/`).
- [x] `trait_audit --check` eseguito → log: `logs/trait_audit_2026-05-02.log` (copia corrente in `logs/`, fonte in `reports/temp/patch-03A-core-derived/`).
- [x] `trait_style_check` eseguito → log: `logs/trait_style_2026-05-02.log` (copia corrente in `logs/`, fonte in `reports/temp/patch-03A-core-derived/`).
- [x] Log allegati → `logs/TKT-02A-VALIDATOR.rerun.log` + log correnti in `logs/` e copie canoniche in `reports/temp/patch-03A-core-derived/`.
- [x] Firma Master DD → Master DD

2. **Preparazione freeze e snapshot per 03A/03B** (owner: coordinator + archivist)
   - Creare snapshot di core/derived e backup di incoming; predisporre script di rollback già elencati nel piano di fase 3.
   - Annotare in `logs/agent_activity.md` l'apertura del freeze fase 3→4, con riferimenti ai branch `patch/03A-core-derived` e `patch/03B-incoming-cleanup`.
   - Uscita: checklist freeze compilata e rollback testato a secco.

3. **Applicazione patch 03A (core/derived)** (owner: coordinator + dev-tooling)
   - Applicare le patch su core/derived solo dopo il pass verde di 02A.
   - Pubblicare changelog e includere i comandi di rollback rapidi.
   - Uscita: validazioni 02A verdi post-patch e changelog archiviato.

4. **Pulizia incoming 03B con redirect** (owner: archivist + asset-prep)
   - Ripulire/archiviare incoming dopo backup; verificare redirect/link e rieseguire validator 02A in smoke.
   - Chiudere il freeze registrando approvazione Master DD nel log attività.
   - Uscita: log di chiusura freeze e report redirect.

5. **Promozione CI progressiva** (owner: dev-tooling)
   - Raccogliere 3 run verdi su `patch/01C-tooling-ci-catalog` per: `data-quality`, `validate_traits`, `schema-validate`.
   - Mantenere `validate-naming` consultivo finché non è stabile la matrice core/derived; poi proporre passaggio a enforcing con rollback plan.
   - Uscita: memo con stato gate CI e decisione su enforcement.

6. **Allineamento trait/biomi post-migrazione** (owner: trait-curator + balancer)
   - Applicare pipeline trait (conversione, coverage, locale sync) e migrazione v1→v2 secondo il piano operativo trait.
   - Eseguire QA finale (validator, link checker) e aggiornare documentazione/indici.
   - Uscita: report QA finale e indicizzazione aggiornata.

## Note operative

- Modalità STRICT attiva: ogni step richiede log dell'esecuzione e owner dichiarato.
- Tutti gli output di validazione devono essere archiviati in `logs/` con timestamp e riferimento al branch.
- In caso di conflitto tra script o piani, segnalare al Master DD prima di procedere.
