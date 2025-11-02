# Guida stile EvoGene Deck UI

Questa guida documenta i requisiti di accessibilità e contrasto cromatico per i
componenti `webapp/src/components/evogene-deck`. Le regole valgono sia per la webapp
principale sia per le pagine statiche di riferimento (ad es.
`docs/test-interface/evogene-deck-cards.html`).

## Accessibilità

### EvoGeneDeckShell

- Il contenitore delle luci (`.evogene-deck-shell__lights`) espone `role="group"`
  con etichetta "Indicatori di stato EvoGene Deck" per aiutare la navigazione via
  screen reader.
- Ogni luce (`.evogene-deck-light`) deve avere `role="status"` e un attributo
  `aria-label` generato come `<etichetta>: <stato>` (es. "Snapshot: operativo").
  Gli stati consentiti sono mappati su etichette localizzate (`operativo`,
  `attenzione`, `errore critico`, ecc.).
- Il pannello log laterale usa `aria-live="polite"` e
  `aria-label="Registro missione"`; il contenuto deve restare coerente con il
  design per evitare annunci ridondanti.

### EvoGeneDeckTelemetryBadge

- Ogni badge è un gruppo logico con `role="group"`, `aria-labelledby` e
  `aria-describedby`. Le etichette puntano agli ID generati in modo deterministico
  tramite `useId` di Vue.
- I valori numerici devono rimanere nel nodo `.evogene-deck-telemetry__value`, così da
  essere annunciati correttamente dai lettori di schermo.

### Card specie/biomi

- Le card mantengono gerarchie semantiche valide (`<section>`/`<article>` con
  heading di livello `h3`/`h4`). Non rimuovere queste heading: servono come
  anchor per `aria-labelledby` implicito.
- Le liste di tag/operazioni usano elementi `<ul>` per preservare
  l’informazione strutturale.
- Quando si aggiungono badge o pulsanti, riutilizzare la semantica dei badge QA
  (role `group`) e assicurarsi che tutti i controlli abbiano `:focus-visible`
  evidente.

## Contrasto cromatico

- I token principali sono definiti in `webapp/src/styles/evogene-deck.css`:
  - Testo primario: `--evogene-deck-text-primary` (`#f2f8ff`) su
    `--evogene-deck-bg` (`#030912`) ⇒ contrasto > 12:1.
  - Testo secondario: `--evogene-deck-text-secondary`
    (`rgba(242, 248, 255, 0.7)`) da usare solo su superfici scure (>=
    `--evogene-deck-surface-soft`).
  - Bordi di stato: `--evogene-deck-success`, `--evogene-deck-warning`,
    `--evogene-deck-danger` mantengono contrasto ≥ 3:1 rispetto alle superfici scure.
- Per testo su badge o chip, non scendere sotto `0.75rem` e mantenere
  l’opacità minima al 55% per la leggibilità.

## Regressione visiva

- La pagina `docs/test-interface/evogene-deck-cards.html` raccoglie varianti
  stabili per screenshot Percy/Storybook e per lo script
  `python tools/py/visual_regression.py record-baseline --pages evogene-deck-cards`.
- Aggiungere nuove varianti direttamente in quella pagina per garantire che le
  metriche e i layout rimangano coerenti tra gli ambienti.
