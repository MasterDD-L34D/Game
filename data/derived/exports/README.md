# Derived exports (QA / ChatGPT)

Catalogo degli export QA e delle conversazioni ChatGPT sincronizzate per reportistica. Collegato ai prerequisiti di `docs/planning/REF_PACKS_AND_DERIVED.md` (sezione `data/derived/exports/**`).

## Prerequisiti
- Inputs canonici: snapshot ChatGPT in `data/external/chatgpt/**` (vedi `data/external/chatgpt_sources.yaml`), telemetria QA curata in `data/derived/exports/qa-telemetry-export.json` e destinatari in `config/drive/recipients.yaml`.
- Validazione consigliata: `python tools/py/validate_export.py --export data/derived/exports/qa-telemetry-export.json --recipients config/drive/recipients.yaml`.

## Rigenerazione
1. Conversazioni ChatGPT (deterministico, scegliere snapshot esplicito):
   - `cp data/external/chatgpt/local/2025-10-24/snapshot-20251024T021902Z-local-export.json data/derived/exports/local-conversation.json`
   - `cp data/external/chatgpt/notes/2025-10-24/snapshot-20251024T021902Z-notes-export.json data/derived/exports/notes-conversation.json`
   - Le fonti attese sono tracciate anche in `logs/chatgpt_sync_last.json` e nel manifest mock `data/derived/mock/prod_snapshot/chatgpt_sources.yaml`.
2. Telemetria QA:
   - Aggiornare `qa-telemetry-export.json` con i casi QA correnti (schema in `docs/process/qa_reporting_schema.md`).
   - Validare e generare checksum: `python tools/py/validate_export.py --export data/derived/exports/qa-telemetry-export.json --recipients config/drive/recipients.yaml`.
3. Aggiornare il log operativo in `logs/agent_activity.md` indicando commit di origine e snapshot utilizzati.

## Checksum (sha256)
| File | sha256 |
| --- | --- |
| `data/derived/exports/local-conversation.json` | `c64b85850f62f22db2e88cddba09a3274408b69da61607ce36362c3c1ac54a89` |
| `data/derived/exports/notes-conversation.json` | `1f384e2c5adc71ea2fc09f07696922c95f2dd515548aa24c9eae202fa0cc496a` |
| `data/derived/exports/qa-telemetry-export.json` | `eac9e72bc98f4f80990fc757b298f4e188be67147513bfa8f4657955c14e7c18` |
