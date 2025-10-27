# QA Telemetry & Segnalazioni — Schema condiviso

## 1. Fonti attuali

| Categoria | Pipeline / Cartella | Descrizione operativa | Campi principali disponibili | Lacune per reporting |
| --- | --- | --- | --- | --- |
| Telemetria gioco | `logs/playtests/<data>-vc/session-metrics.yaml` | Log per squadre (es. Delta/Echo) con build, scenario, roster e vettori VC. | `sessions[].{id, build, scenario, roster, telemetry_snapshot_turn, metrics.*.weighted_index, notes[]}`, `hud_alert_log[].{mission_id, session_id, turn, status, weighted_index, recipients}` | Manca owner assegnato al follow-up, severità dell'alert, link diretto alla cartella evidenze, stato della segnalazione. |
| Telemetria configurazione | `data/telemetry.yaml` | Parametri EMA, target pick rate, formule MBTI/Ennea e curve PE. | `telemetry.*`, `indices.*`, `telemetry_targets.*`, `mbti_axes.*`, `ennea_themes[]`, `pe_economy.*` | Nessun campo per cronologia modifiche né riferimenti a ticket; assenza di stato/owner per cambi richiesti. |
| Profilo CLI | `config/cli/telemetry.yaml` | Profilo automation `game-cli` (smoke validate datasets, roll pack). | `name`, `owner`, `description`, variabili d'ambiente, comandi smoke, contatti Slack. | Non traccia ultima esecuzione né ticket associati agli errori rilevati. |
| Sync fogli | `scripts/driveSync.gs` (+ guida `docs/drive-sync.md`) | Apps Script converte YAML → Google Sheets con trigger ogni 6h. | ID cartella (`1VCLogSheetsSyncHub2025Ops`), prefisso fogli `[VC Logs]`, stato trigger (`autoSync.everyHours`), log output (`session-metrics`, `packs-delta`). | Mancano registri automatici di esito run, owner del turno QA, puntamento a ticket in caso di fallimento. |
| Screenshot automatici | `tools/py/visual_regression.py`, `config/visual_baseline.json` | Script Playwright/WKHTML cattura `docs/index.html` e generator, salva baseline/diff. | Nome pagina, percorso output/diff, hash differenza, timestamp aggiornamento baseline, engine usato. | Non annota build/tester, severità delle differenze, link PR o ticket; diff archiviati localmente senza log centralizzato. |
| QA tracker manuale | `docs/playtest/SESSION-*.md`, template `docs/playtest/SESSION-template.md` | Report manuali playtest con tab bug/ticket, materiali archiviati. | Metadati sessione (data, facilitatore, scenari), tab bug con `ID issue`, `Titolo`, `Stato`, `Etichette`, `Link`; sezione materiali con percorsi log/screenshot. | Non impone severità prioritaria, owner obbligatorio per ogni issue, timestamp evento singolo, collegamento strutturato a log/screenshot (solo testo libero). |
| Support escalation | `docs/support/bug-template.md` | Template per ticket `#vc-ops` su Drive. | Campi obbligatori: titolo, data, build CLI, profilo, comando, log allegati, esito smoke test, impatto (`blocking/degraded/info`), azioni intraprese, owner escalation. | Assenza di campo timestamp evento, link a evidenze multimediali, stato corrente ticket oltre al canale `#vc-ops`. |
| Canali QA | FAQ `docs/faq.md`, profili CLI (`config/cli/*.yaml`) | QA usa Slack `#vc-telemetry`, `#support-ops`, tracker `docs/checklist/`, cartelle Drive `[VC Logs]` per fogli. | Canali chat documentati, riferimenti a checklist e tracker. | Non esiste mapping centrale canale → tipologia issue, mancano referenti aggiornati e SLA esplicitati. |

## 2. Gap rispetto alle esigenze di reporting

- **Owner/assignee**: presente solo nel template support (`owner escalation`), assente in log telemetria e report sessione. Serve un campo obbligatorio per ogni segnalazione per evitare follow-up pendenti.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L88】【F:docs/playtest/SESSION-template.md†L1-L40】【F:docs/support/bug-template.md†L1-L16】
- **Severità/Priorità**: i log VC non codificano severity; il template support usa solo tre livelli generici. Le sessioni playtest non chiedono severity esplicita. Necessario un enum condiviso (es. `critical`, `high`, `medium`, `low`).【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L45-L83】【F:docs/support/bug-template.md†L8-L13】
- **Timestamp evento**: i log registrano turni ma non data/ora; i template manuali riportano solo data sessione. Richiesto timestamp ISO o turno+data per correlazione automatica.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L61】【F:docs/playtest/SESSION-template.md†L1-L40】
- **Link evidenze**: i log YAML elencano note ma non URL; i template menzionano percorsi testuali. Occorre un campo strutturato per URL (log, screenshot, video).【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L34-L88】【F:docs/playtest/SESSION-template.md†L27-L34】
- **Stato segnalazione**: nessun dataset telemetria riporta `status`; i template manuali hanno colonna `Stato` ma non standardizzata (testo libero). Serve tassonomia condivisa (`open`, `triaged`, `in_progress`, `resolved`, `closed`).【F:docs/playtest/SESSION-template.md†L21-L28】
- **Fonte**: alcuni log implicano la fonte (es. `hud_alert_log`) ma non la esplicitano; i template support indicano profilo CLI ma non distinguono pipeline. Introdurre campo `source` con valori (`telemetry-log`, `drive-sync`, `visual-regression`, ecc.).【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L62-L83】【F:tools/py/visual_regression.py†L1-L120】

## 3. Campo minimo obbligatorio concordato (proposta)

| Campo | Descrizione | Motivazione |
| --- | --- | --- |
| `source` | Identifica pipeline o servizio che ha generato la segnalazione (`telemetry-session`, `drive-sync`, `visual-regression`, `playtest-report`, `support-escalation`). | Consente filtraggio e assegnazione rapida ai referenti specialistici.【F:config/cli/telemetry.yaml†L1-L18】【F:tools/py/visual_regression.py†L1-L120】 |
| `summary` | Descrizione sintetica (<140 char) del problema/evento. | Base per ticketing e notifiche Slack; evita duplicati. |
| `event_timestamp` | Data/ora ISO 8601 o turno+data normalizzato. | Permette correlare log, screenshot e alert automatizzati.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L83】 |
| `owner` | Persona o team responsabile del follow-up. | Garantisce accountability; allineato con richieste QA/Support.【F:docs/support/bug-template.md†L12-L16】 |
| `priority` | Enum (`critical`, `high`, `medium`, `low`). | Uniforma severity tra pipeline automatiche e manuali. |
| `status` | Enum (`open`, `triaged`, `in_progress`, `blocked`, `resolved`, `closed`). | Stato unificato rispetto ai tracker manuali esistenti.【F:docs/playtest/SESSION-template.md†L21-L28】 |
| `component_tag` | Identifica il modulo o la feature coinvolta (`hud`, `squadsync`, `drive-export`, `nido-experience`, ecc.). | Consente di incrociare rapidamente le segnalazioni con le aree di codice/feature attive e supporta report mirati.【F:docs/piani/roadmap.md†L26-L85】 |
| `roadmap_milestone` | Riferimento alla milestone della roadmap in formato `RM-<numero>` (es. `RM-1 Smart HUD & SquadSync`). | Abilita il collegamento diretto con gli obiettivi roadmap, facilitando la prioritizzazione e la comunicazione agli stakeholder.【F:docs/piani/roadmap.md†L26-L88】 |
| `evidence_links` | Lista URL/path verso log, screenshot, video. | Evita informazioni disperse in note libere; supporta audit.【F:docs/drive-sync.md†L41-L75】【F:tools/py/visual_regression.py†L1-L120】 |
| `detailed_description` | Campo testo lungo opzionale per note contestuali e metrica telemetria correlata. | Mantiene compatibilità con note esistenti (`notes[]`, session report).【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L32-L83】 |

## 4. Schema dati condiviso (v0.1)

Proposto formato JSON/YAML normalizzato da adottare in fogli Drive e tracker:

```yaml
- source: telemetry-session
  summary: "HUD risk-high persistente oltre 2 turni"
  event_timestamp: "2025-11-05T10:22:00Z"
  owner: "QA Lead"
  priority: high
  status: triaged
  component_tag: hud
  roadmap_milestone: "RM-1 Smart HUD & SquadSync"
  evidence_links:
    - drive://telemetry/reports/2025-11-05/hud_alert_delta.png
    - repo://logs/playtests/2025-11-05-vc/session-metrics.yaml#L1-L40
  detailed_description: >-
    Alert `risk-high` su Delta (turno 11→13). Ack automatico PI dopo 2 turni; verificare smoothing EMA.
- source: visual-regression
  summary: "Diff UI nav cluster generator"
  event_timestamp: "2025-11-06T07:15:00Z"
  owner: "Tools Dev"
  priority: medium
  status: open
  component_tag: visual-regression
  roadmap_milestone: "RM-3 Rilascio e comunicazione"
  evidence_links:
    - repo://logs/visual_runs/2025-11-06/generator/diff.png
    - repo://config/visual_baseline.json
  detailed_description: >-
    `visual_regression.py` (engine=playwright) segnala delta hash 0.12 sopra soglia 0.08.
```

### Workflow di validazione
1. **Raccolta** — Ogni pipeline produce un record conforme allo schema (es. script Python che converte `session-metrics.yaml`).
2. **Triage** — QA/DevOps filtrano per `source`, `component_tag` e milestone (`roadmap_milestone`) assegnando `owner` e `priority` entro 24h (stand-up QA martedì 10:00 CET, retro giovedì 16:00 CET).【F:docs/24-TELEMETRIA_VC.md†L13-L29】【F:docs/piani/roadmap.md†L26-L88】
3. **Aggiornamento stato** — Ogni variazione (`status`) deve essere notificata nel canale Slack corrispondente (`#vc-telemetry`, `#support-ops`) allegando link record/fogli e citando la milestone collegata per favorire l'allineamento roadmap.【F:config/cli/telemetry.yaml†L1-L18】【F:docs/piani/roadmap.md†L26-L88】【F:docs/faq.md†L9-L40】
4. **Archiviazione** — Script `driveSync.gs` sincronizza il foglio `[VC Logs] QA Tracker` con i record normalizzati; export settimanale archiviato in `telemetria/reports`. Mantenere colonne `component_tag` e `roadmap_milestone` per report e filtri condivisi.【F:docs/drive-sync.md†L41-L88】【F:docs/piani/roadmap.md†L26-L88】
5. **Revisione stakeholder** — Validazione schema in retro quindicinale Telemetria (Design/Tech/QA/DevOps); decisioni registrate in `docs/tool_run_report.md`.【F:docs/Telemetria-VC.md†L34-L58】【F:docs/tool_run_report.md†L1-L32】

### Prossimi passi
- Preparare script di trasformazione (`tools/py`) per generare i record schema da `session-metrics.yaml` e output visual regression.
- Aggiornare template Drive/Notion con i nuovi campi obbligatori e definire mapping canali Slack → `source`.
- Condividere il documento con referenti QA (V. Romano), Telemetria (D. Errani) e DevOps (owner Drive Sync) per approvazione; tracciare feedback in `docs/tool_run_report.md` prossimo stand-up.

## 5. Rituali di triage e review

| Rituale | Frequenza & orario | Partecipanti | Agenda sintetica | Deliverable |
| --- | --- | --- | --- | --- |
| **Standup triage roadmap/bug** | Giornaliero lavorativo · 09:30-09:45 CET | QA Lead, PM, rappresentante Tech/Support di turno | 1) Rassegna nuove segnalazioni e ticket con `status = open`.<br>2) Assegnazione o riassegnazione `owner`, verifica `component_tag` e `roadmap_milestone`.<br>3) Escalation urgente verso `#vc-ops` o stakeholder roadmap. | Board aggiornato con campi obbligatori, note rapide nel canale `#vc-telemetry`. |
| **Review roadmap & quality** | Settimanale · Martedì 16:30-17:15 CET (post retro telemetria) | PM, Lead Design, Analytics, QA, Support | 1) Stato milestone (`RM-*`) con focus su deliverable e blocker.<br>2) Verifica bug aperti per milestone, decisione `resolved`/`blocked` o riassegnazione.<br>3) Aggiornamento roadmap pubblico e note di comunicazione (Slack/Drive). | Roadmap aggiornata, elenco bug chiusi/riassegnati, messaggio riepilogo nel canale `#vc-docs`. |
| **Retro quindicinale estesa** | Venerdì settimana dispari · 15:00-16:00 CET | Design Council, Tech Lead, QA | Approfondimento metriche, revisione decisioni review settimanale, raccolta azioni di medio termine. | Decision log aggiornato in `docs/tool_run_report.md`, eventuali revisioni allo schema QA. |

### Applicazione operativa
- Il PM prepara entro le 09:15 CET il report delle nuove segnalazioni dal tracker con raggruppamento per `component_tag`/`roadmap_milestone`.
- Durante lo standup si aggiornano i ticket direttamente (campo `roadmap_milestone`) o si aprono sotto-task collegati se la segnalazione impatta più componenti.
- Dopo la review settimanale, il PM aggiorna `docs/piani/roadmap.md` e invia nota riassuntiva su `#vc-docs`, mentre QA chiude o riassegna i bug nel tracker.
