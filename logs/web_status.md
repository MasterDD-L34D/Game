# Programmazione riesami sito web

I riesami del sito avvengono settimanalmente (lunedì, ore 10:00 CET) con la
partecipazione di referente design, QA e devops. Durante il riesame si
analizzano:

- lo stato dell'ultima pipeline CI/staging;
- le regressioni aperte e le mitigazioni pianificate;
- la copertura funzionale rispetto ai target (≥80%);
- i feedback qualitativi raccolti da marketing/supporto.

Al termine del riesame, aggiornare gli obiettivi prioritari per la settimana
successiva e registrare eventuali task di follow-up in roadmap.

## Azioni periodiche

- [ ] Eseguire `python tools/py/update_web_checklist.py` entro il giorno del
      riesame per garantire dati aggiornati.
- [ ] Pianificare i test manuali cross-device e allegare gli esiti nel channel
      `#web-status`.
- [ ] Riesaminare i ticket aperti in `docs/process/qa_reporting_schema.md` e
      aggiornare stato/owner.

## Registro stato

<!-- web_log:start -->
## 2025-11-05T09:20:00Z · foodweb coverage QA
- **Esito tool**: ✅ `python tools/py/report_trait_coverage.py`
  - Sezione `foodweb_coverage` aggiornata con soglia `species_per_role_biome = 2`.
  - Ruoli target OK: `predatore_terziario_apex` (dorsale), `ingegneri_ecosistema`
    (foresta), `dispersore_ponte` (mezzanotte).
- **Feedback playtest**:
  - Squadra Apex segnala picchi di danno magnetico troppo rapidi quando i due
    predatori spawnano simultaneamente; bilanciamento suggerito: ridurre il
    moltiplicatore iniziale del tratto `coda_frusta_cinetica` del 10%.
  - Nei biomi orbitali il pick rate giocabile è stabile (0.48) ma i corridoi
    di spore risultano difficili da leggere: proporre glow-intensity toggle
    lato UI.
- **Azioni**:
  - Monitorare nelle prossime sessioni se il conteggio `playable_count`
    rimane ≥1 per ruolo in ogni bioma sorvegliato.
  - Condividere il mock-up `docs/catalog/mockups/foodweb_roles.yaml` con il
    team UI per validare etichette e badge “foodweb ready”.
## 2025-10-27T10:49:20Z · run_deploy_checks.sh
- **Esito script**: ❌ `scripts/run_deploy_checks.sh`
  - `npm ci` (tools/ts) completato con dataset `data/mock/prod_snapshot`.
  - Installazione browser Playwright bloccata: errore HTTP 403 dal mirror `https://playwright.azureedge.net/builds/chromium/1194/chromium-linux.zip`; suite TypeScript/Playwright e `pytest` non eseguite.
- **Smoke test HTTP**: non avviato (script interrotto durante setup Playwright).
- **Note**:
  - Ambiente privo di accesso al mirror Playwright; necessario mirror alternativo o cache artefatti per sbloccare la pipeline.
## 2025-10-27T11:35:40Z · lighthouse:test-interface & test:web
- **Esito tool**: ✅ `npm --prefix tools/ts run test:web`
  - Suite Playwright completata (2 test) contro dataset `data/test-fixtures/minimal`.
  - Nessuna regressione di caricamento rilevata: warnings di storage attesi ma non bloccanti.
- **Audit Lighthouse**: ✅ `npm --prefix tools/ts run lighthouse:test-interface`
  - Performance 82 · Accessibilità 100 · Best Practices 92 · SEO 100.
  - Report generati: `logs/tooling/lighthouse-test-interface-2025-10-27T11-35-32-994Z.(html|json)`.
- **Note**:
  - App.js ottimizzato con render differito/caching HTML; card specie memoizzata per ridurre repaint.
  - CSS responsive aggiornato: controlli focus visibili, layout hero fluido ≤480 px, preferenze `prefers-reduced-motion` rispettate.
<!-- web_log:end -->
