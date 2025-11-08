# Trait Editor – Documentazione locale

> Questa cartella raccoglie una copia curata della documentazione trait mantenuta nel monorepo principale. Ogni file indica l'origine esatta per facilitarne la sincronizzazione.

## Riferimenti monorepo

I capitoli di riferimento restano pubblicati nel repository principale. Questo elenco riepiloga i file essenziali da monitorare:

- `docs/traits-manuale/README.md` – indice del manuale operativo dei trait e struttura dei capitoli.
- `docs/traits-manuale/01-introduzione.md` – contesto narrativo/dati e fonti di verità.
- `docs/traits-manuale/02-modello-dati.md` – specifica dei campi dello schema JSON.
- `docs/traits-manuale/03-tassonomia-famiglie.md` – classificazione funzionale e macro-famiglie.
- `docs/traits-manuale/04-collegamenti-cross-dataset.md` – mapping con specie, eventi, regole ambientali.
- `docs/traits-manuale/05-workflow-strumenti.md` – workflow operativo con checklist e comandi.
- `docs/traits-manuale/06-standalone-trait-editor.md` – guida dedicata al pacchetto standalone (fonte di questa cartella).
- `README_HOWTO_AUTHOR_TRAIT.md` – vademecum rapido per la redazione/aggiornamento dei trait.
- `docs/contributing/traits.md` – linee guida contributive estese (richiamate dalle checklist).
- `ops/handbook/mongodb.md` – note operative che includono i controlli sui dataset `traits` durante le validazioni dati.

Aggiorna questa sezione se emergono nuovi capitoli o workflow che impattano la manutenzione dei trait.

## Indice dei capitoli locali

1. [Manuale operativo (estratto)](manuale-operativo.md)
2. [Workflow & strumenti](workflow-strumenti.md)
3. [STANDALONE Trait Editor](standalone-trait-editor.md)
4. [Guida rapida all'editor standalone](quickstart-standalone.md)
5. [How-To authoring trait](howto-author-trait.md)

## Sincronizzazione

- Ogni file riporta all'inizio il percorso sorgente nel monorepo.
- Per applicare aggiornamenti, confronta il file locale con l'originale (`git diff docs/... Trait\ Editor/docs/...`).
- Dopo aver sincronizzato i contenuti, aggiorna la data di revisione nel front matter iniziale (se presente) o nel paragrafo introduttivo.
- Ricordati di aggiornare anche il capitolo principale del manuale (`docs/traits-manuale/06-standalone-trait-editor.md`) e il `Trait Editor/README.md` con il numero di versione o la data dell'ultima sincronizzazione.
