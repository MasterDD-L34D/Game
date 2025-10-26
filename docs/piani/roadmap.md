# Roadmap Operativa

## Procedura post-ottobre 2025
- Sincronizza le milestone VC-2025-10+ con il report settimanale (`docs/chatgpt_changes/`).
- Chiudi o aggiorna le issue operative nel canale `#vc-docs` prima di spostare le attività in *Prossimi passi*.
- Ogni retro Support/QA deve produrre una nota in `docs/faq.md` con owner e stato di follow-up.

## Milestone attive
1. **Bilanciare pacchetti PI tra Forme**  
 - Validare il bias `random_general_d20` rispetto alle nuove combinazioni `bias_d12` per evitare inflazione di PE.【F:data/packs.yaml†L5-L88】
  - Sincronizzare i costi `pi_shop` con la curva PE definita in `telemetry.pe_economy` (aggiunti i valori mancanti per `cap_pt`, `guardia_situazionale`, `starter_bioma`, `sigillo_forma`).【F:data/packs.yaml†L1-L4】【F:data/telemetry.yaml†L23-L31】
  - Aggiornare il monitoraggio: `risk.weighted_index` resta sotto controllo (0.59) nel retest Delta, con alert HUD chiuso in due tick e notifiche PI archiviate in `hud_alert_log`.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L64】
  - Alert HUD attivo nel client (`hud.alert.risk-high`) con ack automatico PI entro tre turni e log condivisi su Canvas.【F:docs/hooks/ema-metrics.md†L21-L43】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L65-L89】
2. **Telemetria VC in game build**
   - Integrare le finestre EMA (`ema_alpha`, `windows`) nel client per raccogliere dati reali, documentando gli hook HUD/telemetria condivisi con il team client.【F:data/telemetry.yaml†L1-L8】【F:docs/hooks/ema-metrics.md†L1-L52】
   - Mappare gli indici VC ai trigger Enneagram per generare feedback contestuali.【F:data/telemetry.yaml†L9-L22】
   - Risultati playtest 2025-10-24: Delta rientra nel range sicuro grazie al nuovo smoothing EMA (0.2), mentre Echo sfiora ancora la soglia 0.61 durante Aeon Overclock → pianificare timer di guardia condivisa.【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L62】
   - Prossimo step client: esporre pannello HUD con breakdown EMA per squadra e log raw esportabile (`.yaml`) a fine missione, includendo il campo `overcap_guard_events`.
3. **Esperienze di Mating e Nido**
   - Estendere `compat_forme` alle restanti 14 forme e definire cross-formula per `base_scores`.【F:data/mating.yaml†L1-L12】
   - Prototipare ambienti interattivi per `dune_stalker` ed `echo_morph`, validando risorse e privacy.【F:data/mating.yaml†L13-L24】
4. **Missioni verticali e supporto live**
 - Preparare il playtest di "Skydock Siege" con obiettivi multilivello e timer di evacuazione.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
  - Collegare Reattori Aeon, filtro SquadSync e protocolli di soccorso alla pipeline telemetrica co-op.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
  - Applicare il nuovo layout HUD: grafici risk/cohesion sovrapposti e log esportabili in `.yaml` direttamente da Canvas per i vertical slice.【F:docs/Canvas/feature-updates.md†L9-L20】
  - Timer evacuazione a 6 turni e cooldown relay/support a 3 mantengono `time_low_hp_turns` (7 su Tier 3, 5 in co-op) e tilt < 0.50 nel retest 2025-11-05; aggiornare continuamente `data/missions/skydock_siege.yaml` con i nuovi parametri. 【F:data/missions/skydock_siege.yaml†L1-L71】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L98】

## Prossimi passi
- Documentare esempi di encounter generati (CLI Python) e associarli a test di difficoltà per ciascun bioma.【F:data/biomes.yaml†L1-L13】
- Collegare i log Delta/Echo alla pipeline Google Sheet dopo la stabilizzazione del nuovo metodo `ema_capped_minmax` per assicurare reporting condiviso.【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】【F:docs/drive-sync.md†L1-L52】
- Creare script di migrazione per esportare `telemetry` su Google Sheet via `scripts/driveSync.gs`.
- Aggiornare i canvas principali con screenshot e note del playtest VC. **Completato** tramite pannello HUD e metriche annotate nel Canvas principale.【F:docs/Canvas/feature-updates.md†L9-L20】
- Integrare esportazione client-side dei log VC (`session-metrics.yaml`) direttamente nella pipeline Drive una volta stabilizzato il tuning risk.
- Formalizzare la pipeline di archiviazione presentazioni in `docs/presentations/` collegando milestone e release.【F:docs/presentations/2025-02-vc-briefing.md†L1-L20】

## Comunicazioni release VC novembre 2025
- **Riunione cross-team (2025-11-06, 10:30 CET)** — Confermata sala VC Bridge + call Meet per telemetria/client/narrativa. Agenda: revisione metriche QA 2025-11-01, readiness tag `v0.6.0-rc1`, canali di annuncio e checklist supporto live.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L1-L45】
- **Canali di annuncio** — Preparare messaggio principale in `#vc-launch` (Slack) alle 16:00 CET del 2025-11-07 con link a changelog e Canvas aggiornato; replicare su Drive/Briefing entro le 18:00 con estratto metriche e TODO follow-up.【F:docs/changelog.md†L21-L33】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L45】
- **Timeline tag** — Dopo sign-off della riunione, creare il tag `v0.6.0-rc1`, allegare screenshot HUD aggiornati in Canvas e consegnare ai partner esterni entro il 2025-11-08.【F:docs/Canvas/feature-updates.md†L1-L60】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L45】
