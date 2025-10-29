# Archivio Incoming — Registro decisioni agentiche

`AG-Orchestrator` utilizza questa tabella per registrare gli asset spostati in archivio o scartati con potenziale futuro. L'aggiornamento avviene durante il post-sync della "Incoming Review".

| Data | Percorso origine | Cartella archivio | Motivazione | Spunti/Follow-up | Agente owner |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | incoming/evo_tactics_unified_pack-v1.9.zip | incoming/archive/2024/05/ | Sostituito da v1.9.8 ma contiene hook interessanti | Riprendere parametri stamina per DLC survival | `AG-Core` |
| | | | | | |

## Note operative
- Organizzare l'archivio per anno/mese (`incoming/archive/YYYY/MM/`).
- Inserire eventuali asset derivati (documenti estratti) nella stessa cartella con README locale.
- Quando un asset viene recuperato dall'archivio, segnare la riga come **Ripreso** e linkare a issue/PR gestite dall'agente owner.
