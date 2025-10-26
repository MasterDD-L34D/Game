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

## Uso
- Se `apiBase` è configurato verso il tuo backend Idea Intake (Node/Express), il form invia a `/api/ideas`.
- Se non hai backend, clicca **Anteprima / Export .md**: scarica un file già formattato da mettere in `ideas/`.
- Il workflow `.github/workflows/idea-intake-index.yml` aggiorna `IDEAS_INDEX.md` ad ogni commit in `ideas/`.

## Campi del Reminder
IDEA: <titolo breve>
SOMMARIO: <2-4 righe secche>
CATEGORIA: Narrativa | Meccaniche | Tooling | Arte | VTT | Repo | Docs | Personaggi | Divinità | Enneagramma | Sistema | Altro
TAGS: #tag1 #tag2 #tag3
MODULE: <es. NR04, Fangwood, Torneo Cremesi, Master DD core>
ENTITÀ: <PG/NPC/divinità/luoghi/oggetti separati da virgola>
PRIORITÀ: P0 | P1 | P2 | P3
AZIONI_NEXT: - [ ] azione 1  - [ ] azione 2
LINK_DRIVE: <URL se esiste>
GITHUB: <repo/percorso o URL se esiste>
NOTE: <altro>
