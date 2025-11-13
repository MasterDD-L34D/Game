# Docs (indice)

Questi file sono scheletri collegati ai **Canvas** già creati in ChatGPT. Copia/incolla dal canvas per avere i contenuti completi.

- `DesignDoc-Overview.md` — visione, pilastri, sistema d20/Descent, job/trait di base (Canvas principale).
- `Telemetria-VC.md` — eventi/EMA/indici/formule, mapping MBTI/Ennea, privacy (Canvas: Telemetria).
- `PI-Pacchetti-Forme.md` — 16 Forme, 7 PI, pacchetti A/B/C, tabelle d20/d12 (Canvas B).
- `SistemaNPG-PF-Mutazioni.md` — NPG reattivi, PF, mutazioni T0/T1/T2, fusioni (Canvas C).
- `Mating-Reclutamento-Nido.md` — Attrazione, Affinità/Fiducia, standard di nido, eredità (Canvas D).
- `traits-manuale/` — guida operativa completa su schema, tassonomia e workflow trait (`docs/traits-manuale/README.md`).

## Evo-Tactics

### Stato import Evo-Tactics

- [Inventario bonifica incoming](../reports/evo/inventory_audit.md) — riepilogo dei duplicati archiviati e dei link di verifica.
- **Bonifica 19/12/2025 completata** — [nuovo archivio](../reports/evo/inventory_audit.md#bonifica-2025-12-19) che consolida backlog,
  cataloghi, workflow GitHub e script duplicati, mantenendo come fonte unica `incoming/scripts/` e i dataset `docs/` / `data/`.

- [Guida ai Tratti · Sommario e Piano Operativo](evo-tactics/guida-ai-tratti-1.md#evo-guida-ai-tratti-1) — standard specie/tratti v2, convenzioni di stile e strumenti QA.
- [Guida ai Tratti · Approfondimenti Operativi](evo-tactics/guida-ai-tratti-2.md#evo-guida-ai-tratti-2) — governance delle revisioni, roadmap di migrazione v2.1 e gate di qualità.
- [Guida ai Tratti · Scenario e Missioni](evo-tactics/guida-ai-tratti-3-evo-tactics.md#evo-guida-ai-tratti-3-evo-tactics) — applicazione in missione, sinergie tattiche e gestione delle varianti sul campo.
- [Guida Evo-Tactics per Game-Database](evo-tactics/guida-ai-tratti-3-database.md#evo-guida-ai-tratti-3-database) — import nel Game Database, mapping tassonomico e scripting di integrazione.
- [Piano di Integrazione V2](evo-tactics/integrazioni-v2.md#evo-integrazioni-v2) — coordinamento cross-team e tempistiche di roll-out del pacchetto Evo-Tactics.

## Aggiornamenti rapidi

- **Changelog** — la sintesi delle ultime release è integrata nel [README principale](../README.md#storico-aggiornamenti--archivio) e centralizzata in [`changelog.md`](changelog.md).
- **Tutorial multimediali** — consulta `tutorials/` per schede SVG e passaggi rapidi dedicati a CLI, Idea Engine e dashboard (`docs/tutorials/*.md`).
- **Feedback potenziato** — il modulo in `docs/public/embed.js` è attivo di default e rimanda al canale Slack `#feedback-enhancements` quando l'API non è configurata.

## Idea Engine in breve

- **Per iniziare** — segui il [tutorial Idea Engine](tutorials/idea-engine.md) per configurare widget, backend e percorso di approvazione.
- **Ultimi rilasci** — consulta il [changelog dedicato](ideas/changelog.md) per aggiornamenti di widget e API.
- **Raccogli feedback** — usa il [modulo espresso](https://forms.gle/evoTacticsIdeaFeedback) o la pagina Support Hub [Idea Engine](ideas/index.html) per convogliare note e follow-up.
- **Tassonomia ufficiale** — verifica categorie e slug in [`config/idea_engine_taxonomy.json`](../config/idea_engine_taxonomy.json) prima di inviare proposte al backend.

## Settori operativi

- **Flow** – orchestratore e validator (`services/generation/`, `tools/py`, `tools/ts`) sincronizzati con i dataset `data/core/`.
- **Atlas** – webapp Vite (`webapp/`) e pannelli statici (`docs/test-interface/`) basati su snapshot `data/derived/` e fallback `webapp/public/data/`.
- **Backend Idea Engine** – servizi Express (`server/`, `services/`) che espongono API consumate da Flow e Atlas e producono artefatti in `reports/`.
- **Dataset & pack** – fonte unica (`data/`, `packs/`, `reports/`) che alimenta gli altri settori; ogni modifica richiede la verifica incrociata dei workflow (`npm run test:api`, `npm run webapp:deploy`).

## Procedure post-ottobre 2025

Dal ciclo VC-2025-10 in avanti utilizziamo un flusso documentale condiviso con Support/QA e Telemetria. Con l'estensione di novembre 2025 il refactor della CLI introduce anche un percorso di approvazione per i profili `playtest`, `telemetry` e `support`.

### Decisioni architetturali

- **ADR-XXX — Refactor CLI, determinismo e pipeline HUD**: `docs/adr/ADR-XXX-refactor-cli.md` raccoglie le motivazioni fornite dal team lead e formalizza le opzioni valutate, gli impatti sugli strumenti (`roll_pack`, `hud_alerts.ts`) e i follow-up richiesti.

1. **Sync settimanale (martedì, 15:00 CET)** — raccogli log telemetrici e note playtest in `docs/chatgpt_changes/` (`sync-<AAAAMMGG>.md`) e annota la versione CLI attiva (`game-cli version --json`).
2. **Aggiornamento checklist** — segna in `docs/checklist/` lo stato milestone, collega la sessione Git (`logs/playtests/<data>-vc`) e aggiungi il link al log CLI giornaliero (es. `logs/cli/smoke-YYYYMMDDTHHMMSSZ.log` o `logs/cli/<slug>-YYYYMMDDTHHMMSSZ.log` generato con `--label`).
3. **Validazione profili CLI** — verifica che gli script profilati siano allineati alle configurazioni in `config/cli/` (commit hash, token rotazioni, flags `--telemetry-upload`) e registra eventuali differenze in `docs/chatgpt_sync_status.md`.
4. **Allineamento roadmap** — aggiorna `docs/piani/roadmap.md` dopo ogni sync, includendo gli highlight del refactor CLI e pingando il canale `#vc-docs` con il diff principale.
5. **Pubblicazione estratti** — inserisci highlight nel Canvas principale e allega screenshot HUD nel drive (`docs/presentations/`), citando la build CLI usata per la demo.
6. **Retro settimanale Support/QA** — importa le domande aperte in `docs/faq.md`, assegna owner/stato e collega i materiali onboarding o le playbook note.
7. **Riepilogo PR giornaliero** — entro le 18:00 CET raccogli le PR merge del giorno (workflow `daily-pr-summary` oppure `python tools/py/daily_pr_report.py --repo <owner/repo> --date <YYYY-MM-DD>`), sintetizza in `docs/chatgpt_changes/`, aggiorna `docs/changelog.md`, roadmap, checklist e `docs/Canvas/feature-updates.md` con le novità rilevanti.

Seguendo questi step possiamo mantenere aggiornati i Canvas e i dataset di gioco senza perdere le decisioni successive al refactor CLI e alle sue policy di rollout.

## Sottocartelle operative

- `Canvas/` — Note rapide estratte dai canvas principali, più callout su nuove feature e regole aggiornate.
- `piani/` — Roadmap sintetica e milestone evolutive, con riferimenti ai dataset YAML da aggiornare.
- `checklist/` — Tracker stato avanzamento con caselle di controllo per le milestone chiave.
- `chatgpt_changes/` — Diff e report generati automaticamente dagli snapshot giornalieri.
- `chatgpt_sync_status.md` — Log operativo delle sincronizzazioni.

Aggiorna queste sezioni quando importi nuovi estratti dai Canvas o modifichi i dataset di gioco.
