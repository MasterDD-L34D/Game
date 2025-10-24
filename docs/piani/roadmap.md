# Roadmap Operativa

## Milestone attive
1. **Bilanciare pacchetti PI tra Forme**  
 - Validare il bias `random_general_d20` rispetto alle nuove combinazioni `bias_d12` per evitare inflazione di PE.【F:data/packs.yaml†L5-L88】
  - Sincronizzare i costi `pi_shop` con la curva PE definita in `telemetry.pe_economy`.【F:data/packs.yaml†L1-L4】【F:data/telemetry.yaml†L23-L29】
  - Aggiornare il monitoraggio: `risk.weighted_index` a 0.63 per Bravo indica la necessità di ampliare gli slot difensivi nei pack Tier 3 verticali.【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L61-L77】
  - Inserire alert HUD dedicati nella dashboard Canvas per segnalare automaticamente il superamento della soglia 0.60 durante i roll PI.【F:docs/Canvas/feature-updates.md†L9-L20】
2. **Telemetria VC in game build**
   - Integrare le finestre EMA (`ema_alpha`, `windows`) nel client per raccogliere dati reali.【F:data/telemetry.yaml†L1-L8】
   - Mappare gli indici VC ai trigger Enneagram per generare feedback contestuali.【F:data/telemetry.yaml†L9-L22】
   - Risultati playtest 2025-02-15: Bravo eccede risk 0.60 ⇒ ritoccare finestra `minmax_scenario` e timer scudi; Alpha conferma soglia Conquistatore; Charlie validata coesione 0.78 con jitter EMA ridotto.【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L1-L125】
   - Prossimo step client: esporre pannello HUD con breakdown EMA per squadra e log raw esportabile (`.yaml`) a fine missione.
3. **Esperienze di Mating e Nido**
   - Estendere `compat_forme` alle restanti 14 forme e definire cross-formula per `base_scores`.【F:data/mating.yaml†L1-L12】
   - Prototipare ambienti interattivi per `dune_stalker` ed `echo_morph`, validando risorse e privacy.【F:data/mating.yaml†L13-L24】
4. **Missioni verticali e supporto live**
 - Preparare il playtest di "Skydock Siege" con obiettivi multilivello e timer di evacuazione.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
  - Collegare Reattori Aeon, filtro SquadSync e protocolli di soccorso alla pipeline telemetrica co-op.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
  - Applicare il nuovo layout HUD: grafici risk/cohesion sovrapposti e log esportabili in `.yaml` direttamente da Canvas per i vertical slice.【F:docs/Canvas/feature-updates.md†L9-L20】
  - Bilanciare i timer di evacuazione in funzione dei picchi `risk.time_low_hp_turns` registrati nelle squadre Bravo e Charlie, mantenendo l'obiettivo di tilt < 0.50.【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L61-L121】

## Prossimi passi
- Documentare esempi di encounter generati (CLI Python) e associarli a test di difficoltà per ciascun bioma.【F:data/biomes.yaml†L1-L13】
- Creare script di migrazione per esportare `telemetry` su Google Sheet via `scripts/driveSync.gs`.
- Aggiornare i canvas principali con screenshot e note del playtest VC. **Completato** tramite pannello HUD e metriche annotate nel Canvas principale.【F:docs/Canvas/feature-updates.md†L9-L20】
- Integrare esportazione client-side dei log VC (`session-metrics.yaml`) direttamente nella pipeline Drive una volta stabilizzato il tuning risk.
- Formalizzare la pipeline di archiviazione presentazioni in `docs/presentations/` collegando milestone e release.【F:docs/presentations/2025-02-vc-briefing.md†L1-L20】
