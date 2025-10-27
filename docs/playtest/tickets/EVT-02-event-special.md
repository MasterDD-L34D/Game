# Annotazioni ticket — EVT-02 "Alleanza inattesa"

## Contesto
Le incongruenze riportate derivano dalle revisioni narrative precedenti al playtest dedicato (ultimo controllo 2025-02-20) e dovranno essere tracciate nel tracker principale con etichetta `event-special` oltre alle tag funzionali rilevanti.

## Ticket da aprire
| ID provvisorio | Titolo | Descrizione sintetica | Stato | Etichette consigliate | Owner suggerito |
| --- | --- | --- | --- | --- | --- |
| EVT02-NAR-01 | Branch cooperativo richiama dialogo di tradimento | Dopo la scelta cooperativa, il nodo "Rinegoziazione forzata" viene attivato invece di "Accordo provvisorio" causando incoerenza narrativa e scelta duplicata. | Da aprire | `event-special`, `narrative-flow` | Narrative QA (A. Conti) |
| EVT02-NAR-02 | Flag reputazione non aggiorna esito supporto | Il flag `evt02_reputation_delta` resta a valore neutro anche dopo la consegna risorse, impedendo lo sblocco del supporto alleato nella missione successiva. | Da aprire | `event-special`, `progression-sync` | Writer Support (G. Parodi) |

## Azioni immediate
1. Creare ticket GitHub per ogni voce utilizzando il template "Encounter bug" e allegare log esportati con `scripts/playtest/export_evt_flags.sh`.
2. Collegare i ticket al report di sessione (`docs/playtest/SESSION-2025-11-12.md`) e aggiornare la sezione bug appena disponibili gli ID ufficiali.
3. Validare i fix nella sessione dedicata del 2025-03-05 e aggiornare `scenari-critici.md` in base all'esito.
