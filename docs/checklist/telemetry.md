# Checklist — Telemetry Export & QA Filters

## Pre-run (giornaliero)
- [ ] Aggiorna la sorgente dati (`logs/playtests/...`) e lancia `convertYamlToSheetsDryRun()` verificando `filterSummary` per assicurarti che gli alert HUD previsti vengano mantenuti.【F:scripts/driveSync.gs†L31-L121】
- [ ] Esegui `python tools/py/validate_export.py --export data/exports/qa-telemetry-export.json --recipients config/drive/recipients.yaml` per validare schema, enum e routing destinatari.【F:tools/py/validate_export.py†L1-L211】
- [ ] Se il dry-run esclude alert attesi, modifica temporaneamente `DRIVE_SYNC_FILTER_RECIPIENTS`/`DRIVE_SYNC_FILTER_STATUSES` oppure imposta `DRIVE_SYNC_LOG_LEVEL=debug` per ottenere log dettagliati e allegali al report QA.【F:scripts/driveSync.gs†L1-L118】【F:scripts/driveSync.gs†L613-L765】

## Verifica UI export (settimanale)
- [ ] Apri l'interfaccia analytics (`public/analytics/export/ExportModal.tsx`) e conferma che i gruppi destinatari, lo stato e la guardia oraria siano preselezionati secondo `config/drive/recipients.yaml` (usa l'opzione Reset/Apply per verificare la propagazione dei filtri).【F:public/analytics/export/ExportModal.tsx†L1-L228】【F:config/drive/recipients.yaml†L1-L57】
- [ ] Esegui i test UI con `npx tsx tools/ts/tests/export-modal.test.tsx` (o `npm run test:ui` da `tools/ts`) prima di pubblicare modifiche alla modale export.【F:tools/ts/tests/export-modal.test.tsx†L1-L146】【F:tools/ts/package.json†L1-L26】

## Post-run / comunicazione
- [ ] Pubblica nel canale `#vc-telemetry` il riepilogo dello script (`validate_export.py` output + log Apps Script) evidenziando eventuali alert filtrati e i gruppi destinatari coperti dalla finestra corrente.【F:tools/py/validate_export.py†L1-L211】【F:config/drive/recipients.yaml†L1-L57】
- [ ] Aggiorna la sezione QA tracker nel foglio `[VC Logs] QA Tracker` con link all'export e note su owner/priority/status per garantire allineamento con la pipeline `telemetry-export.yml`.【F:.github/workflows/telemetry-export.yml†L1-L43】【F:docs/process/qa_reporting_schema.md†L1-L210】
