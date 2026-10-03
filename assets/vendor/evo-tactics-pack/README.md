# Runtime locali per Evo Tactics Pack

Questa cartella ospita le versioni approvate delle dipendenze runtime
utilizzate dal generatore statico:

- `chart.umd.min.js`
- `jszip.min.js`
- `html2pdf.bundle.min.js`

Durante la build il comando `npm run build:evo-tactics-pack` copia questi
file nella directory `dist/evo-tactics-pack/runtime/`. Se un asset non è
presente il builder tenterà il download dalla CDN ufficiale; in ambienti
isolati verrà ripiegato su uno stub compatibile, utile solo per test
manuali. Popola sempre questa cartella con le librerie originali prima di
un deploy pubblico.
