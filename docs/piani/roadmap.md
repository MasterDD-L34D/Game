# Roadmap Operativa

## Milestone attive
1. **Bilanciare pacchetti PI tra Forme**  
   - Validare il bias `random_general_d20` rispetto alle nuove combinazioni `bias_d12` per evitare inflazione di PE.【F:data/packs.yaml†L5-L88】
   - Sincronizzare i costi `pi_shop` con la curva PE definita in `telemetry.pe_economy`.【F:data/packs.yaml†L1-L4】【F:data/telemetry.yaml†L23-L29】
2. **Telemetria VC in game build**  
   - Integrare le finestre EMA (`ema_alpha`, `windows`) nel client per raccogliere dati reali.【F:data/telemetry.yaml†L1-L8】
   - Mappare gli indici VC ai trigger Enneagram per generare feedback contestuali.【F:data/telemetry.yaml†L9-L22】
3. **Esperienze di Mating e Nido**  
   - Estendere `compat_forme` alle restanti 14 forme e definire cross-formula per `base_scores`.【F:data/mating.yaml†L1-L12】
   - Prototipare ambienti interattivi per `dune_stalker` ed `echo_morph`, validando risorse e privacy.【F:data/mating.yaml†L13-L24】

## Prossimi passi
- Documentare esempi di encounter generati (CLI Python) e associarli a test di difficoltà per ciascun bioma.【F:data/biomes.yaml†L1-L13】
- Creare script di migrazione per esportare `telemetry` su Google Sheet via `scripts/driveSync.gs`.
- Aggiornare i canvas principali con screenshot e note del playtest VC.
