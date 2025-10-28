# Idea Intake — Sezione sito (GitHub Pages)

Questa cartella aggiunge **docs/ideas/** con un widget (JS) per inserire idee.

## Setup
1. Copia tutto nella **radice del repo** (mantieni i percorsi).
2. Apri `docs/ideas/index.html` e imposta:
   ```html
   <script>
     window.IDEA_WIDGET_CONFIG = {
       apiBase: "https://<backend>/",   // lascia vuoto per usare solo export .md
       apiToken: ""                     // opzionale
     };
   </script>
   ```
3. Pubblica GitHub Pages (branch `main`, cartella `/docs`).

## Backend API (Node)
- Installa le dipendenze del repository se non lo hai già fatto: `npm install`.
- Avvia il servizio Idea Engine locale: `npm run start:api` (porta predefinita `3333`).
- Il servizio usa un database persistente (`data/idea_engine.db`) basato su NeDB per catalogare tutte le idee.
- Endpoints principali:
  - `GET /api/health` per verificare lo stato del servizio.
  - `POST /api/ideas` salva una nuova idea e restituisce il piano Codex GPT.
  - `GET /api/ideas` e `GET /api/ideas/:id` per consultare l'archivio.
  - `GET /api/ideas/:id/report` rigenera il brief incrementale per GPT.

## Uso
- Apri la pagina **Idea Engine** dal Support Hub (`docs/ideas/index.html`) per utilizzare il form con lo stesso stile del
  sito pubblico.
- Con `apiBase` configurato verso il servizio Node, il tasto **Invia al backend** registra l'idea nel database e mostra il
  report "Codex GPT Integration Brief" completo di pulsanti per copia e download.
- Se non hai backend, clicca **Anteprima / Export .md**: scarica un file già formattato da mettere in `ideas/`.
- Il workflow `.github/workflows/idea-intake-index.yml` aggiorna `IDEAS_INDEX.md` ad ogni commit in `ideas/`.

## Campi del Reminder
IDEA: <titolo breve>
SOMMARIO: <2-4 righe secche>
CATEGORIA: vedi `config/idea_engine_taxonomy.json`
TAGS: #tag1 #tag2 #tag3
BIOMI: <lista ID da data/biomes.yaml>
ECOSISTEMI: <meta-nodi o pack collegati>
SPECIE: <slug specie da data/species.yaml>
TRATTI: <mutazioni/trait da data/traits/>
FUNZIONI_GIOCO: <telemetria_vc, mating_nido, progressione_pe…>
PRIORITÀ: P0 | P1 | P2 | P3
AZIONI_NEXT: - [ ] azione 1  - [ ] azione 2
LINK_DRIVE: <URL se esiste>
GITHUB: <repo/percorso o URL se esiste>
NOTE: <altro>

## Tassonomia categorie Idea Engine
- La lista ufficiale delle categorie è definita in [`config/idea_engine_taxonomy.json`](config/idea_engine_taxonomy.json) e viene caricata sia dal backend Node (`server/app.js`) sia dal widget (`docs/public/embed.js`).
- Quando aggiorni la tassonomia modifica il file JSON (mantieni la struttura `{ "categories": [] }`) e fai commit.
- Per la versione pubblicata su GitHub Pages imposta `window.IDEA_WIDGET_CONFIG.categoriesUrl` verso l'asset JSON servito (esempio: `https://raw.githubusercontent.com/<org>/<repo>/main/config/idea_engine_taxonomy.json`). In locale puoi lasciare il valore di default `../config/idea_engine_taxonomy.json`.
