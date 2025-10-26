# Docs (indice)

Questi file sono scheletri collegati ai **Canvas** già creati in ChatGPT. Copia/incolla dal canvas per avere i contenuti completi.

- `DesignDoc-Overview.md` — visione, pilastri, sistema d20/Descent, job/trait di base (Canvas principale).
- `Telemetria-VC.md` — eventi/EMA/indici/formule, mapping MBTI/Ennea, privacy (Canvas: Telemetria).
- `PI-Pacchetti-Forme.md` — 16 Forme, 7 PI, pacchetti A/B/C, tabelle d20/d12 (Canvas B).
- `SistemaNPG-PF-Mutazioni.md` — NPG reattivi, PF, mutazioni T0/T1/T2, fusioni (Canvas C).
- `Mating-Reclutamento-Nido.md` — Attrazione, Affinità/Fiducia, standard di nido, eredità (Canvas D).

## Procedure post-ottobre 2025
Dal ciclo VC-2025-10 in avanti utilizziamo un flusso documentale condiviso con Support/QA e Telemetria.

1. **Sync settimanale (martedì, 15:00 CET)** — raccogli log telemetrici e note playtest in `docs/chatgpt_changes/` (`sync-<AAAAMMGG>.md`).
2. **Aggiornamento checklist** — segna in `docs/checklist/` lo stato milestone e collega la sessione Git (`logs/playtests/<data>-vc`).
3. **Allineamento roadmap** — aggiorna `docs/piani/roadmap.md` dopo ogni sync e ping il canale `#vc-docs` con il diff principale.
4. **Pubblicazione estratti** — inserisci highlight nel Canvas principale e allega screenshot HUD nel drive (`docs/presentations/`).
5. **Retro settimanale Support/QA** — importa le domande aperte in `docs/faq.md` e tagga l’owner nel file.
6. **Riepilogo PR giornaliero (nuovo)** — entro le 18:00 CET raccogli le PR merge del giorno (workflow `daily-pr-summary` oppure `python tools/py/daily_pr_report.py --repo <owner/repo> --date <YYYY-MM-DD>`), sintetizza in `docs/chatgpt_changes/`, aggiorna `docs/changelog.md`, roadmap, checklist e `docs/Canvas/feature-updates.md` con le novità rilevanti.

Seguendo questi step possiamo mantenere aggiornati i Canvas e i dataset di gioco senza perdere le decisioni successive al refactor CLI.

## Sottocartelle operative

- `Canvas/` — Note rapide estratte dai canvas principali, più callout su nuove feature e regole aggiornate.
- `piani/` — Roadmap sintetica e milestone evolutive, con riferimenti ai dataset YAML da aggiornare.
- `checklist/` — Tracker stato avanzamento con caselle di controllo per le milestone chiave.
- `chatgpt_changes/` — Diff e report generati automaticamente dagli snapshot giornalieri.
- `chatgpt_sync_status.md` — Log operativo delle sincronizzazioni.

Aggiorna queste sezioni quando importi nuovi estratti dai Canvas o modifichi i dataset di gioco.
