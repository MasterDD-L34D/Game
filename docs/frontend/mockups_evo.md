# Evo Console — Mockup mission console

Questa pagina documenta il mockup di riferimento per la console Evo-Tactics
inclusa nel pacchetto di wireframe "Evo". L'obiettivo è fornire agli sviluppatori
e al team UX un'unica fonte per contenuti, flussi e punti di controllo
interattivi portati online nella riscrittura AngularJS.

## Asset visivo

- **Mockup console** → `incoming/lavoro_da_classificare/mockup_evo_tactics.png`
  (versione 2025-11, include Mission Console + drawer esteso). Le annotazioni UX
  principali sono riportate di seguito nella sezione "Elementi chiave UX" per
  evitare duplicazione di file binari.

Per le revisioni incrociate allegare sempre il file dalla sorgente originale o
incorporare un link a Figma, evitando di duplicare i binari nella repository.

## Elementi chiave UX

- **Navigation rail**: il menù primario si comporta come drawer off-canvas
  persistente. Il toggle in alto a sinistra deve aggiornare gli attributi
  `aria-expanded`/`aria-hidden` e attivare l'overlay per bloccare il contenuto
  retrostante. Il bordo attivo del topbar deve seguire la pagina corrente
  (Mission Control, Generatore, ecc.) come mostrato nel mockup nav.
- **Mission dashboard**: la hero area mostra la sintesi delle missioni con i
  contatori *In corso*, *Pianificate*, *Rischio* e *Completate*. I valori vengono
  calcolati dal data store e devono mantenere il formato numerico compatto.
- **Metric grid**: i quattro indicatori (Mission Readiness, Field Uptime, Intel
  Fidelity, Response Latency) includono badge di trend. Usare classi dedicate
  (`metric-grid__trend--up|down`) per supportare future personalizzazioni a
  colori e icone.
- **Mission list**: ogni scheda espone codice missione, riepilogo e azioni
  imminenti. L'etichetta di stato applica classi BEM (`mission-card__status--*`)
  per garantire leggibilità cromatica anche in modalità high-contrast. Le azioni
  prioritarie del pannello Mission Control riutilizzano la stessa struttura di
  carta con micro-copy operativo dedicato.
- **Event log**: le entry cronologiche devono evidenziare categoria e impatto.
  Il badge `event-log__impact` supporta tre livelli (high, medium, low) da mappare
  su palette accessibile WCAG AA. Ogni entry conserva timestamp ISO formattato
  lato client per l'adattamento locale.

- **Ecosystem Pack**: lista i bundle modulari con titoli sintetici e descrizione
  one-liner. Il mockup indica tre card statiche per il rilascio iniziale (Strategico,
  Biomi, Supporto AI) con icone dedicate opzionali.

- **Toolkit Generatore**: tre entry primarie (Builder sequenziale, Profiler missione,
  Calcolo risorse) con descrizione condivisa; il mockup dettaglia il posizionamento
  nella prima piega della pagina e la gerarchia dei titoli.

## Note di implementazione

- I test Playwright in `webapp/tests/playwright/evo/` coprono interazione del drawer,
  la propagazione dello stato attivo tra le destinazioni topbar e la presenza dei
  contenuti principali (metriche, missioni, quick toolkit, azioni Mission Control,
  pacchetti Ecosystem).
- La sitemap `public/sitemap.xml` elenca tutte le rotte Evo (`/console/*`),
  incluse le nuove sezioni Mission Control ed Ecosystem Pack, per allineare la
  pubblicazione statica con gli asset documentati.
- Quando vengono aggiunti nuovi moduli console (es. "Command Briefings"),
  aggiornare sia questa pagina sia la suite end-to-end per mantenere la
  coerenza tra mockup e comportamento runtime.
