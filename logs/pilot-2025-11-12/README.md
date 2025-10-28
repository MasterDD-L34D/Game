# Sessione pilota 2025-11-12 — Raccolta asset

Questa cartella centralizza log, media e feedback relativi alla sessione pilota del 12 novembre 2025.
Seguire la struttura sottostante per garantire tracciabilità con `docs/playtest/SESSION-2025-11-12.md` e con il piano `docs/playtest/pilot-session-2025-11-12.md`.

## Struttura cartella
- `telemetry/`
  - `damage.json`
  - `progression-metrics.csv`
  - `effects-trace.log`
- `media/`
  - Screenshot (`hud-*.png`, `event-*.png`) codificati in Base64 (`*.png.b64`)
  - Video (`event-<scenario>-<timestamp>.mp4`) codificati in Base64 (`*.mp4.b64`)
  - `checksums.sha256` per verificare l'integrità dopo la decodifica
- `feedback/`
  - Scansioni o note dei moduli completati tramite `docs/playtest/feedback-template.md`
- `evt-02/flags/`
  - Export JSON generato da `scripts/playtest/export_evt_flags.sh`
- `additional/`
  - Allegati extra (diagrammi, registrazioni audio, fogli di calcolo temporanei)

## Flusso di raccolta feedback
1. Distribuire il template `docs/playtest/feedback-template.md` a tutti i partecipanti e archiviare i moduli digitali in `docs/playtest/SESSION-2025-11-12/feedback/`.
2. Salvare scansioni/foto dei moduli in `feedback/` mantenendo il naming `feedback-<ruolo>-<iniziali>.pdf`.
3. Esportare i log telemetrici (`damage.json`, `progression-metrics.csv`, `effects-trace.log`) direttamente in `telemetry/`, verificando checksum e timestamp.
4. Per EVT-02 eseguire `scripts/playtest/export_evt_flags.sh` e collocare gli output JSON in `evt-02/flags/`.
5. Al termine della sessione, aggiornare `docs/playtest/SESSION-2025-11-12.md` collegando ogni voce della checklist al relativo file in questa cartella.

## Note operative
- Conservare una copia locale dei file grezzi prima di eventuali conversioni per reportistica.
- Indicare nella descrizione delle issue GitHub il percorso relativo dell'asset (es. `logs/pilot-2025-11-12/telemetry/damage.json`).
- Pulire la cartella da versioni duplicate una volta completata la revisione QA (entro 72h post-sessione).
