# Telemetria VC — Canvas operativo

## Eventi & Raccolta Dati
- Log turni catturano eventi `hit`, `miss`, `crit`, `heal`, `buff`, `debuff`, `objective_tick`, `tile_enter`, `LOS_gain`, `formation_time`, `chat_ping`, `surrender`, `tilt triggers`, `turn_time` per popolare il vettore VC.【F:docs/24-TELEMETRIA_VC.md†L1-L12】
- I dataset `session-metrics.yaml` per i playtest (es. Delta/Echo 2025-10-24) registrano `risk.weighted_index`, `overcap_guard_events` e cronologie di squadra per alimentare HUD e retro QA.【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】
- Gli export vengono sincronizzati in Drive con `scripts/driveSync.gs`, generando fogli `[VC Logs] session-metrics` e `[VC Logs] packs-delta` per analisi condivise.【F:docs/drive-sync.md†L1-L80】

## Indici VC & Normalizzazione
- EMA globale `ema_alpha = 0.3` con finestre per turno e pesi di fase (early/mid/late) guida la sensibilità degli alert.【F:data/core/telemetry.yaml†L1-L12】
- Indici principali:
  - **Aggro**: peso su attacchi iniziati, first blood, ingaggi ravvicinati, pressione uccisioni.【F:data/core/telemetry.yaml†L27-L28】
  - **Risk**: combina danni subiti, situazioni 1vX, tempo low HP, auto-cure negative e `overcap_guard_events` introdotti nel tuning 2025-10-24.【F:data/core/telemetry.yaml†L28-L29】
  - **Cohesion**: formazione, assist, azioni di supporto.【F:data/core/telemetry.yaml†L29-L30】
  - **Setup/Explore/Tilt**: copertura, trappole, nuovi tile, optionals, finestre EMA dedicate al tilt con smoothing 0.35.【F:data/core/telemetry.yaml†L30-L33】
- Normalizzazione `ema_capped_minmax` con floor 0.15, ceiling 0.75 e smoothing 0.2 evita spike eccessivi, fornendo input stabili alla UI TV.【F:data/core/telemetry.yaml†L17-L25】
- Target operativi per pick rate ruolo e spawn rarità mantengono equilibrio squadre e drop: vanguard 22%, harvester 10%, rarità R1 36% → R5 4%.【F:data/core/telemetry.yaml†L34-L48】

## Mapping Temperamentale
- Assi MBTI calcolati su coesione, entropy pattern, disciplina di copertura e bias support, proiettando la Forma del giocatore su coordinate `E_I`, `S_N`, `T_F`, `J_P`. Formule come `1 - 0.6*cohesion - 0.2*assists - 0.2*formation_time` esplicitano il contributo delle metriche.【F:data/core/telemetry.yaml†L49-L58】
- Temi Enneagram (Conquistatore, Coordinatore, Esploratore, Architetto, Stoico) si attivano quando gli indici superano soglie (es. `aggro>0.65 && risk>0.55`), offrendo prompt narrativi e suggerimenti di mutazioni/Nido.【F:data/core/telemetry.yaml†L58-L63】【F:appendici/D-CANVAS_ACCOPPIAMENTO.txt†L1-L69】

## Economie PE & Pacchetti
- `pe_economy` definisce mission_base (win/draw/loss), bonus stile, cap optional e progressione `pack_budget` (baseline 7 → elite 11) con streak bonus dedicati.【F:data/core/telemetry.yaml†L63-L78】
- I costi `pi_shop` (trait_T1 3 PE, ultimate_slot 6 PE, modulo_tattico 3 PE) e caps `cap_pt_max` allineano progressione Forma con le disponibilità calcolate dalla telemetria.【F:data/packs.yaml†L1-L8】

## Procedura Operativa (post 2025-10)
1. **Sync settimanale (martedì 15:00 CET)** — Importare log e note playtest in `docs/chatgpt_changes/sync-<AAAA-MM-GG>.md`, aggiornare `chatgpt_sync_status.md` se cambiano fonti.【F:docs/README.md†L13-L24】【F:docs/chatgpt_sync_status.md†L1-L40】
2. **Checklist** — Spuntare stato milestone in `docs/checklist/` e collegare log `logs/playtests/<data>-vc` per tracciare coverage QA.【F:docs/README.md†L15-L23】【F:docs/checklist/milestones.md†L1-L20】
3. **Roadmap & Canvas** — Riflettere gli aggiornamenti in `docs/piani/roadmap.md` e `docs/Canvas/feature-updates.md`, allegando highlight HUD in Drive (`docs/presentations/`).【F:docs/README.md†L23-L31】【F:docs/piani/roadmap.md†L1-L90】【F:docs/Canvas/feature-updates.md†L1-L40】
4. **Retro Support/QA** — Portare domande aperte in `docs/faq.md`, assegnare owner e stato per follow-up post-onboarding.【F:docs/README.md†L31-L33】【F:docs/faq.md†L1-L40】
5. **Riepilogo PR giornaliero** — Entro le 18:00 CET eseguire `python tools/py/daily_pr_report.py --repo <owner/repo> --date <YYYY-MM-DD>` o workflow `daily-pr-summary`, salvando l'output in `docs/chatgpt_changes/` e aggiornando changelog, roadmap, checklist e Canvas.【F:docs/README.md†L33-L38】【F:docs/tool_run_report.md†L1-L40】

## Revisioni Programmate
- Review telemetria settimanali (martedì 10:00 CET, giovedì 16:00 CET) e retro quindicinale coordinata da Design/Tech Lead con materiali raccolti entro le 18:00 CET nella cartella `telemetria/reports`. Tutte le sessioni sono registrate sul calendario `Evo-Tactics / VC Reviews` e l'owner pubblica riepilogo in `docs/tool_run_report.md` o ADR dedicati.【F:docs/24-TELEMETRIA_VC.md†L14-L29】
- KPI monitorati: tasso conversione NPG, durata scontri per bioma, attivazioni Protocollo di soccorso, StressWave medio per squadra, coesione aggregata (Delta/Echo).【F:appendici/C-CANVAS_NPG_BIOMI.txt†L83-L132】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L102】

## Stato Attuale
- Metodo `ema_capped_minmax` introdotto il 2025-10-24 riduce falsi positivi su squadre Bravo/Delta; monitorare smoothing 0.2 durante playtest successivi.【F:docs/Canvas/feature-updates.md†L11-L24】【F:data/core/telemetry.yaml†L17-L25】
- Dashboard VC aggiornata 2025-11-05 mostra risk medio 0.57 (Delta 0.59, Echo 0.54) e coesione 0.72/0.80, con timeline HUD e alert risk turno 11 da allegare al tag `v0.6.0-rc1`. Coordinare annunci Slack programmati 2025-11-07 16:00 CET con changelog RC e briefing Drive 18:00 CET.【F:docs/Canvas/feature-updates.md†L17-L27】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L88】【F:docs/changelog.md†L66-L79】【F:docs/piani/roadmap.md†L72-L85】
