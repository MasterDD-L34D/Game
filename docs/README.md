# Docs (indice)

Questi file sono scheletri collegati ai **Canvas** già creati in ChatGPT. Copia/incolla dal canvas per avere i contenuti completi.

- `DesignDoc-Overview.md` — visione, pilastri, sistema d20/Descent, job/trait di base (Canvas principale).
- `Telemetria-VC.md` — eventi/EMA/indici/formule, mapping MBTI/Ennea, privacy (Canvas: Telemetria).
- `PI-Pacchetti-Forme.md` — 16 Forme, 7 PI, pacchetti A/B/C, tabelle d20/d12 (Canvas B).
- `SistemaNPG-PF-Mutazioni.md` — NPG reattivi, PF, mutazioni T0/T1/T2, fusioni (Canvas C).
- `Mating-Reclutamento-Nido.md` — Attrazione, Affinità/Fiducia, standard di nido, eredità (Canvas D).

## Procedure post-ottobre 2025
Dal ciclo VC-2025-10 in avanti utilizziamo un flusso documentale condiviso con Support/QA e Telemetria. Con l'estensione di novembre 2025 il refactor della CLI introduce anche un percorso di approvazione per i profili `playtest`, `telemetry` e `support`.

### Decisioni architetturali
- **ADR-XXX — Refactor CLI, determinismo e pipeline HUD**: `docs/adr/ADR-XXX-refactor-cli.md` raccoglie le motivazioni fornite dal team lead e formalizza le opzioni valutate, gli impatti sugli strumenti (`roll_pack`, `hud_alerts.ts`) e i follow-up richiesti.

1. **Sync settimanale (martedì, 15:00 CET)** — raccogli log telemetrici e note playtest in `docs/chatgpt_changes/` (`sync-<AAAAMMGG>.md`) e annota la versione CLI attiva (`game-cli version --json`).
2. **Aggiornamento checklist** — segna in `docs/checklist/` lo stato milestone, collega la sessione Git (`logs/playtests/<data>-vc`) e aggiungi il link al log CLI giornaliero (`logs/cli/<data>.log`).
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
