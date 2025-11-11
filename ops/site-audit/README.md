# Site Audit Toolkit

Il pacchetto `ops/site-audit/` raccoglie gli script necessari per validare la
presenza online del portale Evo-Tactics.  Gli script possono essere eseguiti
singolarmente, ma sono stati integrati in una suite orchestrata (`run_suite.py`)
per l'uso locale e in CI.

## Esecuzione della suite

Per lanciare rapidamente tutti gli step con le dipendenze Python corrette è
disponibile lo script helper:

```bash
bash ops/site-audit/run.sh --base-url "https://evo.example.com" --verbose
```

Lo script crea un virtualenv locale in `ops/site-audit/.venv`, installa
automaticamente i requisiti (`requests`) e inoltra qualsiasi argomento extra a
`run_suite.py`.

```bash
python ops/site-audit/run_suite.py --base-url "https://evo.example.com" --verbose
```

Opzioni principali:

- `--base-url`: URL pubblico dal quale partire per i controlli remoti. Se
  omesso, i check che richiedono lo scraping del sito vengono ignorati.
- `--max-pages`, `--timeout`, `--concurrency`: parametri di tuning per lo
  spidering dei link.
- `--repo-root`: percorso radice del repository (default `.`).

L'esecuzione produce artefatti in `ops/site-audit/_out/` e aggiorna file di
supporto (`sitemap.xml`, `redirects.txt`, `public/structured-data.json`, ecc.).

Per comodità è possibile usare il target Makefile condiviso:

```bash
make audit SITE_BASE_URL="https://evo.example.com"
```

## Script inclusi

- `build_sitemap.py`: genera sitemap e robots a partire dalle mappe contenuto.
- `check_links.py`: crawler leggero per validare i link pubblici.
- `report_links.py`: sintetizza i risultati della scansione in Markdown.
- `generate_search_index.py`: crea l'indice JSON per la ricerca interna.
- `generate_structured_data.py`: produce i frammenti Schema.org da pubblicare.
- `build_redirects.py`: traduce `redirects_map.json` nei formati supportati.

La suite assicura l'esecuzione in sequenza, fermandosi in caso di errori e
segnalando gli step saltati a causa di configurazioni mancanti. Impostando la
variabile `SITE_BASE_URL` (o l'opzione `--base-url`) si abilitano i controlli
remoti, inclusa l'esecuzione del crawler `check_links.py` aggiornato per usare
`requests` con gestione automatica dei redirect e degli header.
