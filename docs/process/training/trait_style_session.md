# Trait Style Session

Sessione formativa dedicata alla guida di stile dei trait: nomenclatura,
descrizioni editorali e requisiti ambientali. La sessione combina teoria e
laboratorio pratico con l'editor interno aggiornato e i nuovi report automatici.

## Obiettivi

- Allineare designer, QA e data steward sulla struttura delle chiavi i18n e sui
  pattern di descrizione (`label`, `uso_funzione`, `spinta_selettiva`, ecc.).
- Rafforzare la coerenza tra `tier`, slot (`slot`, `slot_profile`) e note
  strategiche (`meta.notes`) nei requisiti ambientali.
- Introdurre il flusso di validazione in tempo reale dell'editor trait e il
  comando `scripts/trait_style_check.js` come gate obbligatorio.
- Definire responsabilità e tempistiche del nuovo processo di review
  nomenclatura/descrizioni.

## Preparazione

1. Rivedere la guida stile trait aggiornata nel repository (schemi + esempi
   recenti).
2. Installare le dipendenze (Node 20 + `npm install`) per poter usare
   l'editor interno e gli script di lint.
3. Portare un tratto reale da revisionare (ideale una bozza in `_drafts/`).
4. Creare una cartella condivisa per archiviare i report generati (`logs/trait_style/`).

## Agenda consigliata (90 minuti)

1. **Kickoff e recap (10')** – Obiettivi della sessione, novità rispetto alle
   procedure precedenti, overview dei materiali.
2. **Demo strumenti (20')** – Navigazione dell'editor con validazione live,
   spiegazione delle sezioni "Guida stile" e come interpretare badge/suggerimenti.
   Dimostrazione dell'applicazione automatica dei fix (bottoni "Applica") e
   del contatore "Applicabili" aggiornato in tempo reale.
3. **Laboratorio (35')** – Lavoro a gruppi: ciascuno corregge un tratto reale
   utilizzando i suggerimenti dell'editor e lo script CLI. Condivisione rapida
   dei fix trovati.
4. **Review process (15')** – Formalizzazione del flusso di approvazione
   nomenclatura/descrizioni (vedi sezione successiva). Definizione dei punti di
   controllo con QA e design.
5. **Chiusura (10')** – Q&A, raccolta feedback, assegnazione dei follow-up.

## Processo di review nomenclatura & descrizioni

1. **Check locale** – L'autore esegue `npm run style:check` (alias dello script
   `scripts/trait_style_check.js`) e allega i report JSON/Markdown al branch.
   Se presenti fix applicabili automaticamente, documenta nel PR quelli usati
   tramite l'editor.
2. **Revisione editoriale** – Il reviewer controlla che ogni campo testuale
   utilizzi il namespace i18n corretto (`i18n:traits.<id>.*`) e che `tier`/slot
   rispettino la guida (maiuscole, cluster condivisi, `slot_profile` completo).
3. **Requisiti ambientali** – Verificare che ogni voce abbia `meta.tier`
   allineato al tratto, note esplicative e `fonte` valorizzata; aggiornare
   `completion_flags` (`has_biome`, `has_species_link`) di conseguenza.
4. **Validazione automatica** – Se il report stile riporta errori, il PR viene
   bloccato finché `STYLE_ERRORS` = 0. I warning richiedono conferma esplicita
   nel commento di review. Il KPI report (`styleguide_compliance_report.py`)
   deve risultare "ok" oppure accompagnato da un piano di rientro.
5. **Documentazione** – Aggiornare il template PR (sezione "Checklist guida
   stile") e annotare l'esito nel log di manutenzione mensile.

## Output attesi

- Report JSON/Markdown della lint (archiviati in `reports/trait_style/` o nei
  log di manutenzione) con riferimento nel PR/issue.
- Snapshot aggiornato in `reports/styleguide_compliance.*` e aggiornamento del
  bridge `logs/qa/latest-dashboard-metrics.json` per alimentare i dashboard KPI.
- Note di review che indicano chi ha firmato la nomenclatura e le descrizioni.
- Eventuali follow-up (es. nuove chiavi i18n da localizzare) tracciati nel
  backlog di design o localization.

## Risorse

- Editor interno (`webapp` → Trait Editor) con suggerimenti in tempo reale.
- Script CLI: `scripts/trait_style_check.js` e shortcut `npm run style:check`.
- Cron job mensile `scripts/cron/traits_monthly_maintenance.sh` per monitorare
  regressioni e allegare i report QA + compliance (`styleguide_compliance`).
- Template aggiornati (`.github/ISSUE_TEMPLATE/trait_contribution.md`,
  `PULL_REQUEST_TEMPLATE.md`).
- Report KPI `tools/py/styleguide_compliance_report.py` (con bridge dashboard)
  per monitorare l'adozione in tempo quasi reale.
