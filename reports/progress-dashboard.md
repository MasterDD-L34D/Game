# Riepilogo avanzamento tracker — novembre 2025

Questo riepilogo consolida lo stato dei principali tracker e log operativi
classificati per macro-area (Ecosistemi, Telemetria, Web, QA, Operazioni).
Le percentuali sono ottenute contando i checkbox Markdown spuntati rispetto al
totale di ciascun tracker; quando un registro non prevede checkbox, viene
applicata una metrica surrogata con gli stati `On track = 100%`, `In corso = 50%`
oppure `Bloccato = 0%`.

## Dettaglio per tracker

| Macro-area | Tracker | Completati | Totale | Avanzamento |
| --- | --- | ---: | ---: | --- |
| Ecosistemi | `docs/checklist/milestones.md` (setup + encounter) | 4 | 4 | 100%【F:docs/checklist/milestones.md†L3-L14】 |
| Ecosistemi | `logs/traits_tracking.md` | 6 | 11 | 55%【F:logs/traits_tracking.md†L24-L44】 |
| Ecosistemi | `docs/process/traits_checklist.md` | 0 | 25 | 0%【F:docs/process/traits_checklist.md†L6-L95】 |
| Telemetria | `docs/checklist/milestones.md` (telemetria) | 6 | 7 | 86%【F:docs/checklist/milestones.md†L9-L23】 |
| Telemetria | `docs/checklist/telemetry.md` | 0 | 9 | 0%【F:docs/checklist/telemetry.md†L3-L16】 |
| Telemetria | `logs/exports/2025-11-08-filter-selections.md` (surrogato stato: On track) | 1 | 1 | 100%【F:logs/exports/2025-11-08-filter-selections.md†L3-L11】 |
| Web | `docs/checklist/milestones.md` (milestone web) | 3 | 5 | 60%【F:docs/checklist/milestones.md†L25-L32】 |
| Web | `logs/web_status.md` (checklist azioni) | 0 | 3 | 0%【F:logs/web_status.md†L15-L22】 |
| Web | `docs/process/web_pipeline.md` (checklist Go/No-Go) | 0 | 9 | 0%【F:docs/process/web_pipeline.md†L51-L61】 |
| Web | `docs/checklist/demo-release.md` | 0 | 23 | 0%【F:docs/checklist/demo-release.md†L6-L70】 |
| Web | `logs/web_status.md` (surrogato stato: mix esiti → 50%) | 0.5 | 1 | 50%【F:logs/web_status.md†L26-L96】 |
| QA | `docs/checklist/action-items.md` | 16 | 17 | 94%【F:docs/checklist/action-items.md†L19-L37】 |
| QA | `docs/checklist/bug-intake.md` | 0 | 17 | 0%【F:docs/checklist/bug-intake.md†L5-L28】 |
| QA | `docs/playtest/SESSION-2025-11-12.md` (checklist feedback) | 6 | 6 | 100%【F:docs/playtest/SESSION-2025-11-12.md†L34-L40】 |
| QA | `docs/checklist/milestones.md` (follow-up QA) | 0 | 2 | 0%【F:docs/checklist/milestones.md†L15-L17】 |
| Operazioni | `docs/checklist/project-setup-todo.md` | 45 | 47 | 96%【F:docs/checklist/project-setup-todo.md†L7-L87】 |
| Operazioni | `docs/support/token-rotation.md` | 2 | 3 | 67%【F:docs/support/token-rotation.md†L29-L33】 |
| Operazioni | `docs/adr/ADR-2025-11-18-cli-rollout.md` | 0 | 3 | 0%【F:docs/adr/ADR-2025-11-18-cli-rollout.md†L22-L25】 |
| Operazioni | `docs/adr/ADR-2025-12-07-generation-orchestrator.md` | 0 | 3 | 0%【F:docs/adr/ADR-2025-12-07-generation-orchestrator.md†L56-L61】 |
| Operazioni | `docs/adr/ADR-XXX-refactor-cli.md` | 1 | 4 | 25%【F:docs/adr/ADR-XXX-refactor-cli.md†L34-L38】 |
| Operazioni | `docs/checklist/milestones.md` (Canvas & comunicazione) | 1 | 1 | 100%【F:docs/checklist/milestones.md†L19-L23】 |

## Riepilogo per macro-area

| Macro-area | Completati | Totale | Percentuale (≈) | Stato |
| --- | ---: | ---: | --- | --- |
| Ecosistemi | 10 | 40 | **25%** | Carico elevato sui passi operativi e QA da completare. |
| Telemetria | 7 | 17 | **40%** | Checklist dedicate ferme, ma milestone telemetriche già validate. |
| Web | 3.5 | 41 | **10%** | Pipeline web quasi tutta da rilanciare; log stato ancora parziali. |
| QA | 22 | 42 | **50%** | Action item quasi chiusi, intake e follow-up QA ancora aperti. |
| Operazioni | 49 | 61 | **80%** | Setup e manutenzione quasi completati; restano ADR e tag release. |

_Nota:_ le percentuali sono arrotondate alla soglia di comunicazione più vicina (5%).

## Snippet README suggerito

```markdown
| Macro-area | Avanzamento |
| --- | --- |
| Ecosistemi | ![Ecosistemi 25%](https://progress-bar.dev/25/?title=Ecosistemi&width=180&suffix=%25) |
| Telemetria | ![Telemetria 40%](https://progress-bar.dev/40/?title=Telemetria&width=180&suffix=%25) |
| Web | ![Web 10%](https://progress-bar.dev/10/?title=Web&width=180&suffix=%25) |
| QA | ![QA 50%](https://progress-bar.dev/50/?title=QA&width=180&suffix=%25) |
| Operazioni | ![Operazioni 80%](https://progress-bar.dev/80/?title=Operazioni&width=180&suffix=%25) |
```

In alternativa, è possibile usare il tag HTML `<progress>`:

```html
<p><strong>Ecosistemi</strong>: <progress value="25" max="100"></progress> 25%</p>
<p><strong>Telemetria</strong>: <progress value="40" max="100"></progress> 40%</p>
<p><strong>Web</strong>: <progress value="10" max="100"></progress> 10%</p>
<p><strong>QA</strong>: <progress value="50" max="100"></progress> 50%</p>
<p><strong>Operazioni</strong>: <progress value="80" max="100"></progress> 80%</p>
```

## Osservazioni chiave

- **Ecosistemi** — L'inventario trait storico è parzialmente chiuso, ma la
  checklist iterativa resta da avviare: serve pianificare un batch dedicato per
  coprire i 25 task mancanti e consolidare `data/core/species.yaml`.【F:logs/traits_tracking.md†L24-L44】【F:docs/process/traits_checklist.md†L6-L66】
- **Telemetria** — La componente operativa giornaliera è ferma: nessuno dei nove
  passi della checklist è stato tracciato nonostante i run precedenti abbiano
  confermato la validità dei dati. Serve ripristinare le esecuzioni periodiche e
  allegare i log corrispondenti.【F:docs/checklist/telemetry.md†L3-L16】【F:docs/checklist/milestones.md†L9-L23】
- **Web** — Le checklist web e demo release sono vuote e il registro mostra un
  mix di successi e fallimenti, sintomo di blocchi infrastrutturali (download
  Playwright). Priorità: risolvere l'accesso agli asset browser e rilanciare
  `scripts/run_deploy_checks.sh`.【F:logs/web_status.md†L26-L96】【F:docs/checklist/demo-release.md†L6-L70】
- **QA** — Action item e report playtest sono aggiornati ma restano aperti il
  ticket Horde mode e l'intera checklist di bug intake; occorre completare il
  triage e definire owner sui campi obbligatori.【F:docs/checklist/action-items.md†L19-L37】【F:docs/checklist/bug-intake.md†L5-L28】
- **Operazioni** — L'avvio progetto è praticamente chiuso; mancano la creazione
  del tag release e tre follow-up ADR per completare il quadro operativo.
  Pianificare review dedicate nelle riunioni Ops.【F:docs/checklist/project-setup-todo.md†L53-L82】【F:docs/adr/ADR-2025-11-18-cli-rollout.md†L22-L25】
