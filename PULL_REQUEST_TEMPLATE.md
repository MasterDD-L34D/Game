## Descrizione

<!-- Riassunto conciso delle modifiche proposte. -->

## Checklist guida stile & QA

- [ ] Nessuna modifica a `data/core/**`, `data/derived/**`, `incoming/**`, `docs/incoming/**` nella finestra freeze 2025-11-25T12:05Z–2025-11-27T12:05Z (salvo rollback autorizzati Master DD)
- [ ] Validator di release **PASS senza regressioni** (allega percorso report). Il merge rimane bloccato finché esistono regressioni aperte nel validator
- [ ] Approvazione **Master DD** registrata (link a commento/issue che conferma l'ok al merge)
- [ ] Changelog allegato alla PR e **piano di rollback 03A** incluso (link o allegato nella sezione Note)
- [ ] Chiavi i18n `i18n:traits.<id>.campo` verificate/aggiornate
- [ ] Tier, slot e `slot_profile` coerenti con la nomenclatura condivisa
- [ ] Requisiti ambientali (`meta.tier`, `meta.notes`) e `completion_flags` sincronizzati
- [ ] Eseguito `scripts/trait_style_check.js` (allega percorso report/artifact)
- [ ] Badge "Guida stile" dell'editor in stato "In linea" (suggerimenti applicabili gestiti)
- [ ] Generato `tools/py/styleguide_compliance_report.py` (link a JSON/Markdown)
- [ ] Aggiornato bridge `logs/qa/latest-dashboard-metrics.json` se il report è stato rigenerato
- [ ] Documentazione/processi aggiornati ove necessario

## Testing

- [ ] `npm run style:check`
- [ ] Altro: <!-- specificare -->

## Note

<!-- Link a report, artefatti o follow-up da pianificare. -->
