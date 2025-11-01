# Linee guida accessibilità UI

Questo documento riepiloga le convenzioni adottate nella console web per garantire accessibilità, contrasto e inclusione.

## Mappa componenti interattivi

| Componente | Percorso | Interazioni principali | Note accessibilità |
|------------|----------|------------------------|--------------------|
| NebulaShell | `src/components/layout/NebulaShell.vue` | Navigazione a schede tramite pulsanti, cambiamento pannello | Ruoli WAI-ARIA `tablist`/`tab`/`tabpanel`, gestione frecce sinistra/destra e Home/End con focus programmato.<br>Contenuto `tabpanel` focalizzabile alla selezione. |
| AppBreadcrumbs | `src/components/navigation/AppBreadcrumbs.vue` | Navigazione gerarchica | Link con `aria-current` e `aria-label` descrittivi, elenco con ruolo `list` e token stato annunciati. |
| ProgressTracker | `src/components/navigation/ProgressTracker.vue` | Schede di stato cliccabili | Contenitore `list`/`listitem`, pulsanti con `aria-label` e `role="progressbar"` centrale per screen reader. |
| TraitFilterPanel | `src/components/species/TraitFilterPanel.vue` | Filtri checkbox per tratti | Gruppi racchiusi in `fieldset`/`legend`, liste con ruolo semantico e highlight accessibili. |
| SpeciesPreviewGrid | `src/components/species/SpeciesPreviewGrid.vue` | Aggiornamento anteprime, stato caricamento/errori | Stati annunciati con `role="status"`/`role="alert"`, lista carte con ruoli e `aria-busy`. |
| NebulaProgressModule | `src/components/flow/NebulaProgressModule.vue` | Telemetria, grafici, azioni di copia | Regione `aria-live` per stato demo/offline, annunci condivisi e output `role="status"`. |
| SparklineChart | `src/components/metrics/SparklineChart.vue` | Grafici sparkline | `figure` con sommario numerico leggibile, titolo dinamico e `figcaption`; fallback senza dati con `aria-live`. |
| StateBanner / StateToken | `src/components/metrics` | Badge di stato | `role="status"` con `aria-live="polite"`, annuncio concatenato e varianti ad alto contrasto. |
| SpeciesPanel | `src/components/SpeciesPanel.vue` | Azioni rapide, suggerimenti sinergie | Pulsanti con `aria-label` contestuale, errori con `role="alert"` e tab dinamiche. |

## Sistema di temi e contrasto

* File chiave: `src/styles/theme.css`, importato da `src/main.js`.
* Variabili CSS (`--color-*`) governano sfondi, testi, bordi e stati per temi scuro/chiaro (toggle tramite `data-theme` sul `body`).
* Le superfici principali (App shell, NebulaShell, schede, banner, progress tracker) utilizzano le variabili per mantenere contrasto >= 4.5:1 su testi primari/secondari.
* Classi di utilità: `.visually-hidden` per testo solo screen reader e focus ring uniforme.

## Alternative testuali e annunci

* `SparklineChart` genera sommario numerico (min, max, ultimo, trend) visibile e annunciato dai lettori di schermo.
* `NebulaProgressModule` segnala modalità demo/offline tramite regione `aria-live` e badge con colori ad alto contrasto.
* Griglie e liste dinamiche espongono stati “loading”, “empty”, “error” con `aria-live="polite"` o `role="alert"`.

## Test manuali consigliati

1. **Axe DevTools o componenti Lighthouse**
   * Eseguire `npm run dev` e aprire l'interfaccia.
   * Lanciare scansione Axe o audit Lighthouse (Accessibility) assicurandosi di non avere violazioni critiche.
2. **Navigazione da tastiera**
   * Verificare che TAB e SHIFT+TAB coprano tutti i controlli, in particolare le schede di `NebulaShell` (freccia sinistra/destra/Home/End) e i pulsanti di `ProgressTracker`.
3. **Modalità demo/offline**
   * Simulare props `telemetryStatus.offline = true`: confermare annuncio verbale (“Telemetria in modalità demo…”) e badge leggibile.
4. **Contrasto visivo**
   * Con strumenti tipo DevTools color picker, controllare che testi su superfici `var(--color-bg-surface*)` abbiano rapporto >= 4.5:1.
5. **Grafici senza vista**
   * Con screen reader (VoiceOver/NVDA) posizionarsi su `SparklineChart`: verificare lettura del titolo e del riassunto numerico.

Annotare eventuali regressioni o casi limite direttamente in questo file per mantenere la copertura manuale aggiornata.
