# Briefing VC — Febbraio 2025

## Milestone collegate
- **Milestone:** Bilanciare pacchetti PI tra Forme (Roadmap #1) — focus sul tuning risk e bias d12 aggiornati.【F:docs/piani/roadmap.md†L5-L13】
- **Milestone:** Missioni verticali e supporto live (Roadmap #4) — applicazione layout HUD e timer evacuazione aggiornati.【F:docs/piani/roadmap.md†L17-L25】

## Release target
- **Build candidata:** client-r2821 per vertical slice "Skydock Siege" con HUD VC aggiornato.
- **Finestra release:** Sprint 2025-03A (dopo validazione telemetria EMA e roll PI rivisti).

## Contenuti
- **Deck presentazione:** `docs/presentations/assets/vc-hud-briefing-deck.md` (outline con metriche risk/cohesion, alert HUD, proposta bilanciamento pack).
- **Allegati log:** `logs/playtests/2025-02-15-vc/session-metrics.yaml` per esempi di trend risk/cohesion.【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L33-L122】

## Metriche highlight
- **Risk index medio 0.58 (-0.04 vs build 24/10)** — conferma che gli alert smart rientrano entro 1.5 turni medi; mostrare grafico overlay e annotare ack automatici su Bravo/Delta.【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L23-L58】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L8-L91】
- **Cohesion ≥0.78 su Echo** — utilizzare screenshot SquadSync per evidenziare supporto roster e riduzione incidenti (totale 8 su finestra 5 gg).【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L8-L78】【F:public/analytics/squadsync/index.tsx†L8-L124】
- **Export controllato** — 92% dei log `session-metrics.yaml` spediti entro finestra `ops_drive`; i filtri modale mostrano stato `resolved/closed` vs backlog QA.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L9-L37】【F:public/analytics/export/ExportModal.tsx†L18-L110】

## Follow-up
- Integrare nel deck gli insight della survey Google Form post-demo e allegare i punteggi risk/cohesion aggiornati dai playtest successivi.
- Pianificare review con LiveOps/Narrative (settimana 2025-02B) per validare piani PI e aggiornare eventi verticali sulla base dei nuovi log esportati.
- Preparare clip video HUD+SquadSync da utilizzare nel VC deck finale, includendo la dimostrazione dei filtri export programmati.
