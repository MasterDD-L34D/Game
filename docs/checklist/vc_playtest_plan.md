# Playtest VC Mirati alla Telemetria

## Obiettivo
Coordinare tre sessioni di playtest focalizzate sugli indici VC definiti in `data/telemetry.yaml`, verificando che la raccolta dati rispetti finestre EMA, pesi e normalizzazioni attese.

## Setup strumentazione
- **Build client**: `client-r2821` con modulo telemetria `minmax_scenario` attivo.
- **Raccolta**: logging JSON per evento VC + snapshot YAML aggregato a fine missione.
- **Parametri EMA**: `alpha=0.3`, `windows.turn=true`, pesi di fase `early=0.25`, `mid=0.35`, `late=0.40`.
- **Debounce**: 300 ms per eventi ripetitivi, `idle_threshold=10s` per tagliare rumore AFK.

## Sessioni pianificate
| ID | Scenario | Focus VC | Player Setup | Obiettivo metrico |
| --- | --- | --- | --- | --- |
| Alpha | Skydock Siege - Tier 2 | Aggro + Risk | Squadra trinità (Sentinel/Vesper/Aurora) | Validare trigger Enneagram "Conquistatore" (aggro > 0.65, risk > 0.55). |
| Bravo | Skydock Siege - Tier 3 | Risk + Setup | Squadra difensiva (Bulwark/Cipher/Aurora) | Stress test delle finestre EMA in evacuazione, verifica risk < 0.60. |
| Charlie | Skydock Siege - Tier 3 (Co-op) | Cohesion + Setup | Squadra supporto (Sentinel/Cipher/Helix) | Confermare coesione > 0.75 e tilt < 0.50 durante coop prolungata. |

## Metriche raccolte
Ogni sessione deve salvare:
- Conteggi grezzi per ciascuna componente degli indici VC (ad es. `attacks_started`, `one_vs_many_engagements`).
- Valori normalizzati e combinati (`weighted_index`) per confronto immediato con le soglie telemetriche.
- Stato EMA per verifica delle finestre: numero eventi debounced, distribuzione per fase.
- Note qualitative: eventi che spiegano deviazioni, richieste di tuning.

## Output atteso
- File raw YAML per ogni sessione in `logs/playtests/<data>/` (vedi `logs/playtests/2025-02-15-vc/session-metrics.yaml`).
- Estratti CSV opzionali da importare nello Sheet `VC Tracking`.
- Annotazioni sullo stato milestone in `docs/checklist/milestones.md` e decisioni su bilanciamento in `docs/piani/roadmap.md`.
