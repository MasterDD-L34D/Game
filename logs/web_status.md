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
  - `npm ci` (tools/ts) completato con dataset `data/derived/mock/prod_snapshot`.
  - Installazione browser Playwright bloccata: errore HTTP 403 dal mirror `https://playwright.azureedge.net/builds/chromium/1194/chromium-linux.zip`; suite TypeScript/Playwright e `pytest` non eseguite.
- **Smoke test HTTP**: non avviato (script interrotto durante setup Playwright).
- **Note**:
  - Ambiente privo di accesso al mirror Playwright; necessario mirror alternativo o cache artefatti per sbloccare la pipeline.
## 2025-10-27T11:35:40Z · lighthouse:test-interface & test:web
- **Esito tool**: ✅ `npm --prefix tools/ts run test:web`
  - Suite Playwright completata (2 test) contro dataset `data/derived/test-fixtures/minimal`.
  - Nessuna regressione di caricamento rilevata: warnings di storage attesi ma non bloccanti.
- **Audit Lighthouse**: ✅ `npm --prefix tools/ts run lighthouse:test-interface`
  - Performance 82 · Accessibilità 100 · Best Practices 92 · SEO 100.
  - Report generati: `logs/tooling/lighthouse-test-interface-2025-10-27T11-35-32-994Z.(html|json)`.
- **Note**:
  - App.js ottimizzato con render differito/caching HTML; card specie memoizzata per ridurre repaint.
  - CSS responsive aggiornato: controlli focus visibili, layout hero fluido ≤480 px, preferenze `prefers-reduced-motion` rispettate.
<!-- web_log:end -->
## 2025-10-28T23:39:35Z · run_deploy_checks.sh
- **Esito script**: ✅ `scripts/run_deploy_checks.sh`
  - Artefatti TypeScript già presenti in `tools/ts/dist`.
  - Bundle statico generato in `dist.ii91XC` con dataset `data/derived/mock/prod_snapshot`.
- **Smoke test HTTP: server Python attivo su http://127.0.0.1:40839/**
  - Dataset copiato con 48 file totali.
  - Richieste principali completate senza errori (index.html e dashboard).
- **Note**:
  - Lo script non esegue più test; utilizza gli artefatti generati dai passaggi CI precedenti.

## 2025-10-28T23:40:05Z · run_deploy_checks.sh
- **Esito script**: ✅ `scripts/run_deploy_checks.sh`
  - Artefatti TypeScript già presenti in `tools/ts/dist`.
  - Bundle statico generato in `dist.X6KqNP` con dataset `data/derived/mock/prod_snapshot`.
- **Smoke test HTTP: server Python attivo su http://127.0.0.1:57027/**
  - Trait generator: core=22 enriched_species=7 (time 10 ms).
  - Trait highlight: cuticole_cerose, grassi_termici, pelli_cave.
  - Report salvato in `logs/tooling/generator_run_profile.json`.
  - Dataset copiato con 48 file totali.
  - Richieste principali completate senza errori (index.html e dashboard).
- **Note**:
  - Lo script non esegue più test; utilizza gli artefatti generati dai passaggi CI precedenti.

## 2025-10-28T23:44:19Z · run_deploy_checks.sh
- **Esito script**: ✅ `scripts/run_deploy_checks.sh`
  - Artefatti TypeScript già presenti in `tools/ts/dist`.
  - Bundle statico generato in `dist.CLHuOR` con dataset `data/derived/mock/prod_snapshot`.
- **Smoke test HTTP: server Python attivo su http://127.0.0.1:45369/**
  - Trait generator: core=22 enriched_species=7 (time 10 ms).
  - Trait highlight: cuticole_cerose, grassi_termici, pelli_cave.
  - Report salvato in `logs/tooling/generator_run_profile.json`.
  - Dataset copiato con 48 file totali.
  - Richieste principali completate senza errori (index.html e dashboard).
- **Note**:
  - Lo script non esegue più test; utilizza gli artefatti generati dai passaggi CI precedenti.

## 2025-11-02T00:56:27Z · run_deploy_checks.sh
- **Esito script**: ✅ `scripts/run_deploy_checks.sh`
  - Artefatti TypeScript già presenti in `tools/ts/dist`.
  - Bundle statico generato in `dist.i18ig7` con dataset `data`.
- **Smoke test HTTP: server Python attivo su http://127.0.0.1:40457/**
  - Trait generator: core=30 enriched_species=12 (time 9 ms).
  - Trait highlight: cuticole_cerose, grassi_termici, pelli_cave.
  - Report salvato in `logs/tooling/generator_run_profile.json`.
Flow Shell go/no-go: REVIEW (3/5 ok · 2 warning · 0 fail)
⚠️ Quality Release → Snapshot: Snapshot di riferimento non ancora generato.
⚠️ Nebula Atlas → Generator: Stato generatore: unknown
  - Dataset copiato con 322 file totali.
  - Richieste principali completate senza errori (index.html e dashboard).
- **Note**:
  - Lo script non esegue più test; utilizza gli artefatti generati dai passaggi CI precedenti.

## 2025-11-02T19:22:19Z · run_deploy_checks.sh
- **Esito script**: ✅ `scripts/run_deploy_checks.sh`
  - Artefatti TypeScript già presenti in `tools/ts/dist`.
  - Bundle statico generato in `dist.g7GYKo` con dataset `data`.
- **Smoke test HTTP: server Python attivo su http://127.0.0.1:44517/**
  - Chromium Playwright inizializzato in `/tmp/tmp.zvedhqKIKW`.
  - Snapshot generation aggiornato in /workspace/Game/data/flow-shell/atlas-snapshot.json.
  - Trait generator: core=30 enriched_species=12 (time 14 ms).
  - Trait highlight: cuticole_cerose, grassi_termici, pelli_cave.
  - Report salvato in `logs/tooling/generator_run_profile.json`.
Flow Shell go/no-go: REVIEW (2/5 ok · 3 warning · 0 fail)
⚠️ Quality Release → Snapshot: Check non passati: species, biomes
⚠️ Quality Release → Trait diagnostics: Conflitti attivi: 24 · Mismatch matrice: 140
⚠️ Nebula Atlas → Telemetry: Incidenti alta priorità: 1 · Incidenti aperti: 2 · Ultimo evento: 2025-11-06T06:45:00.000Z
  - Dataset copiato con 323 file totali.
  - Richieste principali completate senza errori (index.html e dashboard).
- **Note**:
  - Lo script non esegue più test; utilizza gli artefatti generati dai passaggi CI precedenti.

