# Insight playtest VC — Novembre 2025

## Sintesi esecutiva
- **Trend rischio/cohesion**: gli ultimi retest di "Skydock Siege" (05/11) mostrano risk index medio 0.565 (-0.045 rispetto al picco Tier 4 del 24/10) e cohesion medio 0.76 (+0.04), confermando l'efficacia del tuning EMA e degli alert HUD smart.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L8-L91】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L8-L79】
- **Stabilizzazione alert HUD**: il tempo di permanenza sopra soglia risk è sceso da 2 turni medi (24/10) a 1.5 turni (05/11) con acknowledgment automatico PI entro 3 turni, riducendo il carico manuale del team bilanciamento.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L35-L64】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L8-L79】
- **Copertura QA**: la sessione QA finale (01/11) mantiene tilt <0.50 e zero eventi low cohesion, abilitando il passaggio a focus su smart feature (HUD + SquadSync) prima di estendere gli export automatizzati.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L1-L43】

## Metriche chiave (Fase 0)
| Metrica Fase 0 | 24/10 Delta | 24/10 Echo | 05/11 Delta | 05/11 Echo | Variazione | Osservazioni |
| --- | --- | --- | --- | --- | --- | --- |
| `risk.weighted_index` | 0.57 | 0.61 | 0.59 | 0.54 | ↓ medio -0.025 | Calo marcato in co-op grazie a cooldown drone supporto; singolo picco controllato su Delta. |
| `cohesion.weighted_index` | 0.68 | 0.76 | 0.72 | 0.80 | ↑ medio +0.04 | Formazioni più rapide (+3 turni) e +2 azioni di supporto su Echo. |
| `tilt.tilt_score` | 0.48 | 0.52 | 0.46 | 0.44 | ↓ medio -0.05 | Timer evacuazione ridotto a 6 turni mantiene tilt sotto 0.5. |
| `hud_alerts.duration_turns` | 2 (stimato) | 2 | 2 | 1 | ↓ medio -0.5 | Alert co-op rientra in 1 turno, solo Delta richiede follow-up PI. |

## Insight qualitativi
- **Tuning cooldown relay/scudi** (Delta, 05/11): riduce low HP window a 3 turni e mantiene tilt 0.46; confermata richiesta di mantenere settaggio nella build release.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L32-L91】
- **Drone di supporto** (Echo, 05/11): portare cooldown a 3 turni elimina necessità di ping manuale PI e stabilizza risk a 0.54 con ack HUD autonomo.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L52-L78】
- **Overcap guard events**: assenti nel retest 05/11 (contro 3-6 eventi del 24/10), confermando che l'hotfix EMA 0.2 ha funzionato e che la priorità smart feature può superare l'espansione export per questa ondata.【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L18-L73】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L8-L91】
- **QA coverage** (01/11): tutte le squadre mantengono cohesion ≥0.78 e solo un high risk event >0.60, abilitando il via libera per la milestone "Smart HUD & SquadSync".【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L9-L37】

## Raccomandazioni operative
1. **Priorità smart feature** — Consolidare ack HUD automatico e migliorare messaggi contestuali (focus VC) prima di investire nell'export bulk verso Drive, sfruttando il calo di overcap guard e i tilt stabilizzati.
2. **Export telemetria** — Limitare l'estensione export ai log già normalizzati (`session-metrics.yaml`) finché non si completa la checklist smart feature; pianificare un incremento successivo (milestone separata).
3. **Monitoraggio continuo** — Integrare nel prossimo playtest (settimana 47) un controllo puntuale su `risk.time_low_hp_turns` per assicurare che il drone supporto resti efficace con roster variati.
4. **Follow-up QA** — Mantenere retro settimanale con stakeholder analytics/QA e demo quindicinale focalizzata su HUD per mostrare riduzione alert duration.

## Raccolta feedback & workflow
- **Survey centralizzata:** tutte le sessioni novembre 2025 usano il modulo Google Form `https://forms.gle/vc-demo-feedback`. Inserire il link nella mail di follow-up entro 2 ore dalla demo, archiviando l'export CSV in `docs/playtest/tickets/feedback-survey.csv`.
- **Sintesi `INSIGHTS-*`:** ogni file `docs/playtest/INSIGHTS-<YYYY-MM>.md` deve includere un blocco `### Feedback utenti` con: punteggi medi (soddisfazione, chiarezza HUD, chiarezza SquadSync), top 3 citazioni, ticket aperti. Per novembre la sezione va aggiornata al martedì entro le 12:00 CET.
- **Instradamento ticket:** le risposte con punteggio HUD ≤3 generano issue `hud-feedback` assegnate al team UI Systems; quelle su SquadSync ≤3 creano ticket `analytics-squadsync`. Annotare gli ID nel CSV e cross-linkare nella sezione `### Feedback utenti`.
- **Calendario review:** importare il calendario `vc-demo-feedback` (evento ricorrente lunedì 17:30 CET) per discutere survey + log. Durante la review compilare la checklist `docs/playtest/feedback-template.md` e aggiornare roadmap.
