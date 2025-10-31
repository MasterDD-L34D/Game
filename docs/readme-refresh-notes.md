# Note revisione README principale

## 1. Componenti chiave del repository da coprire nel README
- **Dataset e contenuti statici**: cartella `data/` con YAML principali, `data/derived/` per report analitici, `data/external/` per fonti sincronizzate.
- **Pack ecosistemi**: `packs/evo_tactics_pack/` con dati, validator dedicati, report in `out/` e documentazione specifica.
- **Strumenti Python**: `tools/py/` con CLI unificata (`game_cli.py`), script legacy (`roll_pack.py`, `generate_encounter.py`), helper condivisi (`game_utils/`), requirements.
- **Strumenti TypeScript**: `tools/ts/` con CLI `roll_pack`, test Node e suite Playwright/Lighthouse.
- **Backend Idea Engine**: `server/` (Express + orchestrazione specie), `services/generation/` per orchestratore, validator runtime, builder specie.
- **Webapp di test**: `webapp/` (Vue 3 + Vite) con test Vitest, serve come dashboard/front-end.
- **Script e automazioni**: `scripts/` (report incoming, sync Drive, builder idea taxonomy), `services/publishing/`, workflow CI/CD in `.github/workflows/`.
- **Documentazione**: `docs/` con indice operativo (`00-INDEX.md`), pipeline, canvas, changelog Idea Engine, presentazioni.
- **Test e QA**: cartella `tests/` con suite Node (`tests/api`), Python (pytest), e test end-to-end/hud (`hud_alerts.spec.ts`).
- **Logs e report**: `logs/` e `reports/` con output di validazione.

## 2. Sezioni utili dell'attuale README da preservare/aggiornare
- **Descrizione iniziale e contesto**: mantenere la panoramica del progetto e dello "starter" ma aggiornarla in forma sintetica.
- **Showcase demo**: mantenere riferimenti alla demo pubblica ma spostare in sezione dedicata a presentazioni/materiali, includendo immagine preview e istruzioni di rigenerazione.
- **Struttura del repository**: mantenere ma aggiornare con albero riepilogativo più compatto.
- **Quick start CLI (Python/TypeScript)**: conservare istruzioni ma consolidarle nella sezione Setup/Usage.
- **Pipeline generazione orchestrata**: mantenere spiegazione dei componenti backend in un blocco dedicato a valle della descrizione API.
- **Aggiornamento pack e trait coverage**: ridurre in sezione "Dataset & Pack" con link principali e promemoria sui report di coverage e log QA.
- **Workflow CI & QA / Suite di test**: sintetizzare in sezione dedicata a QA.
- **Idea Engine updates**: estrarre elementi permanenti (feedback endpoint, modulo) e rimandare al changelog, riunendoli in una sezione archivio insieme agli highlight trait.
- **Checklist & tracker**: mantenere link indice/tracker, comprimere la sezione e ripristinare una barra di completamento + TODO essenziali per facilitare il passaggio di mano.
- **Pubblicazione GitHub & Drive**: mantenere indicazioni chiave come sezione "Distribuzione".
- **Licenza**: confermare MIT.

## 3. Elementi da snellire o spostare
- Checklist operative ripetitive → linkare ai file `docs/checklist/` invece di elenco completo nel README.
- Aggiornamenti datati (date specifiche 2025-11-16/2025-12-01) → sintetizzare come esempio storico oppure rimandare ai changelog.
- Barra di completamento e tabelle di piano modulare → mantenere nel README solo una barra sintetica; spostare tabelle dettagliate in `docs/00-INDEX.md`.
- Sezione "Sincronizzazione contenuti ChatGPT" → mantenerla ma comprimere in "Integrazioni esterne".
