# Snapshot dataset mock

Questa cartella contiene snapshot dei dataset di produzione utilizzati come fallback locale per i deploy checks. Ogni snapshot è organizzato per ambiente/sorgente (`prod_snapshot/`) e replica la struttura originale della directory `data/` al momento della copia.

## Prerequisiti (vedi `docs/planning/REF_PACKS_AND_DERIVED.md`)
- Assicurarsi che gli input canonici `data/core/**` e i pack siano validati (PATCHSET-01A + PATCHSET-02A) prima di eseguire la copia.
- Il file di configurazione `data/derived/mock/prod_snapshot/chatgpt_sources.yaml` elenca le fonti ChatGPT da includere.

## Rigenerazione snapshot
1. Sincronizza dal core: `rsync -a --exclude 'mock' data/ data/derived/mock/prod_snapshot/` (eseguito dalla radice del repo).
2. Aggiorna manifest e checksum: `cd data/derived/mock/prod_snapshot && find . -type f -print0 | sort -z | xargs -0 sha256sum > ../manifest-prod_snapshot.sha256`.
3. Registra la versione: aggiornare `data/derived/mock/VERSION` con `last_sync` (ISO date) e note sull'origine.
4. Loggare l'esecuzione in `logs/agent_activity.md` indicando commit di partenza e differenze rilevate.

## Versione corrente
- Snapshot: `prod_snapshot`
- Tag versione: `data/derived/mock/VERSION` (last_sync=2025-11-30)
- Manifest checksum: `data/derived/mock/manifest-prod_snapshot.sha256`
