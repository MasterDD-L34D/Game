# Snapshot dataset mock

Questa cartella contiene snapshot dei dataset di produzione utilizzati come fallback locale per i deploy checks.
Ogni snapshot è organizzato per ambiente/sorgente (`prod_snapshot/`) e replica la struttura originale della directory `data/` al momento della copia.

Aggiornare la snapshot eseguendo una sincronizzazione (`rsync -a --exclude 'mock' data/ data/mock/prod_snapshot/`) e documentare eventuali differenze nei log QA.
