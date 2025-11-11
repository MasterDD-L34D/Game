# Evo Console — Mockup mission console

Questa pagina documenta il mockup di riferimento per la console Evo-Tactics
inclusa nel pacchetto di wireframe "Evo". L'obiettivo è fornire agli sviluppatori
e al team UX un'unica fonte per contenuti, flussi e punti di controllo
interattivi portati online nella riscrittura AngularJS.

## Asset visivo

- **Mockup console Evo – Mission Console &amp; Mission Control** → export 2025-11
  disponibile in `incoming/lavoro_da_classificare/mockup_evo_tactics.png`
  (derivato dal file sorgente Figma). Il repository applicativo non conserva
  duplicati binari: quando serve un asset locale copiarlo temporaneamente dalla
  cartella `incoming/` o richiedere l'ultima versione al team UX. Il frame
  include:
  - barra di navigazione aggiornata con i nuovi anchor _Mission Console_,
    _Mission Control_ ed _Ecosystem Pack_;
  - pannello Mission Console completo di metric grid e quick actions;
  - stato del drawer laterale in modalità espansa per verificare layout e
    comportamento responsive.

Per le revisioni incrociate allegare sempre il file dalla sorgente originale o
incorporare un link a Figma, evitando duplicazione di binari nel repository. Le
versioni approvate vengono archiviate nel bucket condiviso "evo-mockups" e
sincronizzate nella cartella `incoming/`.

## Elementi chiave UX

- **Navigation rail**: il menù primario si comporta come drawer off-canvas
  persistente. Il toggle in alto a sinistra deve aggiornare gli attributi
  `aria-expanded`/`aria-hidden` e attivare l'overlay per bloccare il contenuto
  retrostante. Il bordo attivo del topbar deve seguire la pagina corrente
  (Mission Control, Generatore, ecc.) come mostrato nel mockup nav.
- **Mission dashboard**: la hero area mostra la sintesi delle missioni con i
  contatori _In corso_, _Pianificate_, _Rischio_ e _Completate_. I valori vengono
  calcolati dal data store e devono mantenere il formato numerico compatto. Il
  pannello di riepilogo è affiancato dalle quick actions della console per
  garantire tempi di intervento contenuti.
- **Metric grid**: i quattro indicatori (Mission Readiness, Field Uptime, Intel
  Fidelity, Response Latency) includono badge di trend. Usare classi dedicate
  (`metric-grid__trend--up|down`) per supportare future personalizzazioni a
  colori e icone. Il mockup segnala le soglie "warning" e "critical" con badge
  addizionali da mantenere coerenti con la palette WCAG AA.
- **Mission list**: ogni scheda espone codice missione, riepilogo e azioni
  imminenti. L'etichetta di stato applica classi BEM (`mission-card__status--*`)
  per garantire leggibilità cromatica anche in modalità high-contrast. Le azioni
  prioritarie del pannello Mission Control riutilizzano la stessa struttura di
  carta con micro-copy operativo dedicato ed evidenziano il nuovo badge "quick
  response" per le escalation.
- **Event log**: le entry cronologiche devono evidenziare categoria e impatto.
  Il badge `event-log__impact` supporta tre livelli (high, medium, low) da mappare
  su palette accessibile WCAG AA. Ogni entry conserva timestamp ISO formattato
  lato client per l'adattamento locale.

- **Ecosystem Pack**: lista i bundle modulari con titoli sintetici e descrizione
  one-liner. Il mockup indica tre card statiche per il rilascio iniziale (Strategico,
  Biomi, Supporto AI) con icone dedicate opzionali e call-to-action _Scarica
  briefing_ per l'export dei pacchetti.

- **Toolkit Generatore**: tre entry primarie (Builder sequenziale, Profiler missione,
  Calcolo risorse) con descrizione condivisa; il mockup dettaglia il posizionamento
  nella prima piega della pagina e la gerarchia dei titoli.

## Note di implementazione

- I test Playwright in `tests/playwright/evo/` coprono interazione del drawer,
  la propagazione dello stato attivo tra le destinazioni topbar e la presenza dei
  contenuti principali (metriche, missioni, quick toolkit, azioni Mission Control,
  pacchetti Ecosystem). Gli scenari e2e aggiornati verificano inoltre le nuove
  quick actions del Mission Control e la visibilità delle call-to-action dei pack.
- La sitemap `public/sitemap.xml` elenca tutte le rotte Evo (root console,
  `/mission-console`, `/mission-control`, `/generator`, `/ecosystem-pack`,
  `/atlas`, `/traits`, `/nebula`), incluse le nuove sezioni Mission Control ed
  Ecosystem Pack, per allineare la pubblicazione statica con gli asset
  documentati.
- Quando vengono aggiunti nuovi moduli console (es. "Command Briefings"),
  aggiornare sia questa pagina sia la suite end-to-end per mantenere la
  coerenza tra mockup e comportamento runtime.
