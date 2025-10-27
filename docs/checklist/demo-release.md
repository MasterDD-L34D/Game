# Checklist release demo pubblica

Questa checklist copre il rilascio del bundle demo dell'Evo Tactics Pack e le
attività di coordinamento cross-team.

## Pre-release

- [ ] Generare ecosistema di riferimento e salvare lo zip del preset
      **Bundle demo pubblico**.
- [ ] Validare i file esportati (`yaml`, `html`, `md`) aprendo il dossier e il
      press kit in locale.
- [ ] Aggiornare la documentazione di deploy (`docs/evo-tactics-pack/deploy.md`)
      con l'URL CDN scelto.
- [ ] Configurare l'override `pack-root` su staging e verificare il caricamento
      remoto.

## Qualità e test

- [ ] Eseguire `python tests/validate_dashboard.py` e allegare l'esito al
      changelog.
- [ ] Salvare le metriche della dashboard con
      `python tests/validate_dashboard.py --metrics-output logs/qa/run-<data>.json`
      (il file JSON viene anche aggiunto in append a `logs/qa/dashboard_metrics.jsonl`).
- [ ] Rigenerare o confrontare gli snapshot visivi con
      `python tools/py/visual_regression.py compare --engine auto`
      (per aggiornare la baseline hash salvata in `config/visual_baseline.json`
      usare il comando `record-baseline`). Gli screenshot generati restano in
      `logs/visual_runs/` o `logs/visual_baseline/` e vanno allegati al pacchetto
      QA solo se servono confronti manuali.
- [ ] Effettuare smoke test manuale del generatore (biomi, specie, seed) usando
      l'ecosistema demo.
- [ ] Condividere il bundle con QA per review rapida (focus su dossier HTML e
      press kit).

## Review finale (UI · Performance · Export)

- [ ] **UI** — confronto visivo con `public/showcase-dossier.svg` e verifica token (`--color-accent-400`, superfici soft) su landing e generator.
- [ ] **Performance** — profiling rapido del generatore (preset demo) con DevTools: mantenere TTI < 2.5s e nessun warning console.
- [ ] **Export** — aprire dossier HTML, decodificare il Base64 del PDF (`docs/presentations/showcase/evo-tactics-showcase-dossier.pdf.base64`) e validare il press kit Markdown confermando coerenza dati e link; rigenerare tutto via `python tools/py/build_showcase_materials.py`.

## Comunicazione e marketing

- [ ] Inviare il press kit Markdown al team Marketing/Comms con note sul target
      della demo.
- [ ] Aggiornare la newsletter o la landing page collegando il dossier HTML.
- [ ] Preparare materiale promozionale (screenshot, GIF) e allegarlo al press
      kit.

## Go-live

- [ ] Pubblicare i file demo sulla CDN o Pages di riferimento mantenendo la
      struttura `packs/evo_tactics_pack/`.
- [ ] Aggiornare `docs/changelog.md` con le note di release.
- [ ] Annunciare l'apertura della demo sui canali interni ed esterni.

## Post-release

- [ ] Monitorare i log del generatore per 24h (bundle demo) e raccogliere
      feedback marketing.
- [ ] Pianificare eventuali aggiornamenti del bundle demo per il successivo
      ciclo promozionale.
- [ ] Calendarizzare retro post-demo (entro 72h) coinvolgendo Marketing, QA e Live Ops; allegare note in `docs/presentations/demo-walkthrough-script.md`.

## Monitoraggio continuo

- [ ] Al primo giorno del mese eseguire il workflow `QA KPI & Visual Monitor`
      (GitHub Actions) o avviare manualmente i comandi sopra per verificare
      deviazioni dei KPI strutturali.
- [ ] Annotare nel changelog di prodotto l'esito della review mensile e le
      eventuali azioni correttive pianificate.

