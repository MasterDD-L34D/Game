# Evo Console — Mockup mission console

Questa pagina documenta il mockup di riferimento per la console Evo-Tactics
inclusa nel pacchetto di wireframe "Evo". L'obiettivo è fornire agli sviluppatori
e al team UX un'unica fonte per contenuti, flussi e punti di controllo
interattivi portati online nella riscrittura AngularJS.

## Asset visivo

> Nota: lo screenshot "mission-console-overview" è conservato nell'archivio
> design condiviso e non viene versionato nel repository per evitare file binari.
> Per visualizzarlo, usare il collegamento Figma nella dashboard di progetto o
> consultare la cartella condivisa "Evo Console / Mockups" sul drive del team.

## Elementi chiave UX

- **Navigation rail**: il menù primario si comporta come drawer off-canvas
  persistente. Il toggle in alto a sinistra deve aggiornare gli attributi
  `aria-expanded`/`aria-hidden` e attivare l'overlay per bloccare il contenuto
  retrostante.
- **Mission dashboard**: la hero area mostra la sintesi delle missioni con i
  contatori *In corso*, *Pianificate*, *Rischio* e *Completate*. I valori vengono
  calcolati dal data store e devono mantenere il formato numerico compatto.
- **Metric grid**: i quattro indicatori (Mission Readiness, Field Uptime, Intel
  Fidelity, Response Latency) includono badge di trend. Usare classi dedicate
  (`metric-grid__trend--up|down`) per supportare future personalizzazioni a
  colori e icone.
- **Mission list**: ogni scheda espone codice missione, riepilogo e azioni
  imminenti. L'etichetta di stato applica classi BEM (`mission-card__status--*`)
  per garantire leggibilità cromatica anche in modalità high-contrast.
- **Event log**: le entry cronologiche devono evidenziare categoria e impatto.
  Il badge `event-log__impact` supporta tre livelli (high, medium, low) da mappare
  su palette accessibile WCAG AA.

## Note di implementazione

- I test Playwright in `tests/playwright/evo/` coprono interazione del drawer
  e la presenza dei contenuti principali (metriche, missioni, quick toolkit).
- La sitemap `public/sitemap.xml` elenca tutte le rotte Evo (`/console/*`) per
  allineare la pubblicazione statica con gli asset documentati.
- Quando vengono aggiunti nuovi moduli console (es. "Command Briefings"),
  aggiornare sia questa pagina sia la suite end-to-end per mantenere la
  coerenza tra mockup e comportamento runtime.
